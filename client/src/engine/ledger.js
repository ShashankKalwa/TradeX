// The ledger is the single source of truth. Cash, holdings, average price,
// realized and unrealized P&L are all DERIVED from the append-only transaction
// list — the same contract the real backend's Mongo transactions enforce.

import { STOCKS, bySymbol, FEE_RATE, START_CASH } from '../data/universe.js'
import { mulberry32, hashString, gauss, candlesBackward } from './random.js'

let txSeq = 1
let orderSeq = 1

export function nextTxId() {
  return `TX-${String(txSeq++).padStart(6, '0')}`
}
export function nextOrderId() {
  return `ORD-${String(orderSeq++).padStart(5, '0')}`
}

export function emptyBook(region) {
  return {
    region,
    cash: 0,
    transactions: [],
    orders: [],
    watchlist: []
  }
}

// ---------------------------------------------------------------------------
// Derivations — every number on screen comes from here
// ---------------------------------------------------------------------------

export function deriveCash(transactions) {
  return transactions.reduce((acc, t) => {
    if (t.type === 'CASH') return acc + t.value
    if (t.type === 'BUY') return acc - t.value - t.fee
    if (t.type === 'SELL') return acc + t.value - t.fee
    if (t.type === 'DIV') return acc + t.value
    return acc
  }, 0)
}

export function deriveHoldings(transactions) {
  const map = new Map()
  for (const t of transactions) {
    if (t.type !== 'BUY' && t.type !== 'SELL') continue
    const h = map.get(t.symbol) || { symbol: t.symbol, qty: 0, cost: 0 }
    if (t.type === 'BUY') {
      h.qty += t.qty
      h.cost += t.value // value = qty * price, excl. fee
    } else {
      const avg = h.qty > 0 ? h.cost / h.qty : 0
      h.qty -= t.qty
      h.cost -= avg * t.qty
      if (h.qty < 1e-9) {
        h.qty = 0
        h.cost = 0
      }
    }
    map.set(t.symbol, h)
  }
  return [...map.values()].filter((h) => h.qty > 0)
}

export function deriveRealized(transactions) {
  const map = new Map()
  let realized = 0
  for (const t of transactions) {
    if (t.type === 'BUY') {
      const h = map.get(t.symbol) || { qty: 0, cost: 0 }
      h.qty += t.qty
      h.cost += t.value
      map.set(t.symbol, h)
    } else if (t.type === 'SELL') {
      const h = map.get(t.symbol) || { qty: 0, cost: 0 }
      const avg = h.qty > 0 ? h.cost / h.qty : 0
      realized += (t.value / t.qty - avg) * t.qty - t.fee
      h.qty -= t.qty
      h.cost -= avg * t.qty
      map.set(t.symbol, h)
    } else if (t.type === 'DIV') {
      realized += t.value
    }
  }
  return realized
}

/** Portfolio value, day change, and per-holding P&L against live quotes. */
export function valuate(holdings, cash, quotes, prevCloseOf) {
  let value = cash
  let prevValue = cash
  const rows = holdings.map((h) => {
    const q = quotes[h.symbol]
    const price = q ? q.price : 0
    const prev = prevCloseOf ? prevCloseOf(h.symbol) : price
    const avg = h.cost / h.qty
    return {
      ...h,
      avg,
      price,
      value: price * h.qty,
      prevValue: prev * h.qty,
      unrealized: (price - avg) * h.qty,
      unrealizedPct: avg > 0 ? (price / avg - 1) * 100 : 0,
      dayChange: (price - prev) * h.qty,
      dayChangePct: prev > 0 ? (price / prev - 1) * 100 : 0
    }
  })
  for (const r of rows) {
    value += r.value
    prevValue += r.prevValue
  }
  return {
    rows,
    value,
    invested: value - cash,
    prevValue,
    dayChange: value - prevValue,
    dayChangePct: prevValue > 0 ? (value / prevValue - 1) * 100 : 0
  }
}

export function sectorWeights(rows) {
  const bySector = new Map()
  for (const r of rows) {
    const sector = bySymbol(r.symbol)?.sector || 'Other'
    bySector.set(sector, (bySector.get(sector) || 0) + r.value)
  }
  const total = [...bySector.values()].reduce((a, b) => a + b, 0) || 1
  return [...bySector.entries()]
    .map(([sector, value]) => ({ sector, value, pct: (value / total) * 100 }))
    .sort((a, b) => b.value - a.value)
}

/** Herfindahl-style concentration: 0 = perfectly spread, 1 = single position. */
export function concentration(weights) {
  return weights.reduce((acc, w) => acc + (w.pct / 100) ** 2, 0)
}

/** Naive annualized Sharpe-style ratio from daily portfolio value history. */
export function sharpe(history) {
  if (history.length < 3) return 0
  const rets = []
  for (let i = 1; i < history.length; i++) {
    if (history[i - 1].v > 0) rets.push(history[i].v / history[i - 1].v - 1)
  }
  const n = rets.length
  const mean = rets.reduce((a, b) => a + b, 0) / n
  const variance = rets.reduce((a, b) => a + (b - mean) ** 2, 0) / Math.max(n - 1, 1)
  const sd = Math.sqrt(variance)
  return sd > 0 ? (mean / sd) * Math.sqrt(252) : 0
}

// ---------------------------------------------------------------------------
// Seed — realistic demo history, reconciled to the rupee
// ---------------------------------------------------------------------------

export function seedBook(region = 'IN') {
  const rand = mulberry32(hashString('tradex:seed:' + region))
  const txs = []
  const universe = STOCKS.filter((s) => s.region === region)
  const cash0 = START_CASH[region]

  const days = 90
  const now = Date.now()
  const dayMs = 86400e3

  txs.push({
    id: nextTxId(),
    ts: now - days * dayMs,
    type: 'CASH',
    symbol: null,
    qty: 0,
    price: 0,
    value: cash0,
    fee: 0,
    note: 'Opening virtual funds'
  })

  // Buy 6–8 names across the first weeks; trade around them later.
  const picks = shuffle(universe.slice(), rand).slice(0, 7)
  const qtyFor = (price) => Math.max(1, Math.round((cash0 * 0.11) / price))

  picks.forEach((s, i) => {
    const entryDay = days - 70 + i * 4 + Math.floor(rand() * 3)
    const entryPrice = round2(s.base * (0.86 + rand() * 0.18))
    const qty = qtyFor(entryPrice)
    txs.push({
      id: nextTxId(),
      ts: now - entryDay * dayMs,
      type: 'BUY',
      symbol: s.symbol,
      qty,
      price: entryPrice,
      value: round2(qty * entryPrice),
      fee: round2(qty * entryPrice * FEE_RATE),
      note: 'Opening position'
    })
    // Trim or add around two of them
    if (rand() > 0.45) {
      const exitDay = entryDay - (5 + Math.floor(rand() * 25))
      if (exitDay > 2) {
        const exitPrice = round2(entryPrice * (0.92 + rand() * 0.3))
        const sellQty = Math.max(1, Math.floor(qty * (0.3 + rand() * 0.5)))
        txs.push({
          id: nextTxId(),
          ts: now - exitDay * dayMs,
          type: 'SELL',
          symbol: s.symbol,
          qty: sellQty,
          price: exitPrice,
          value: round2(sellQty * exitPrice),
          fee: round2(sellQty * exitPrice * FEE_RATE),
          note: 'Partial exit'
        })
      }
    }
  })

  // One dividend credit for flavour
  const divStock = picks[0]
  txs.push({
    id: nextTxId(),
    ts: now - 11 * dayMs,
    type: 'DIV',
    symbol: divStock.symbol,
    qty: 0,
    price: 0,
    value: round2(cash0 * 0.002),
    fee: 0,
    note: 'Dividend credit'
  })

  txs.sort((a, b) => a.ts - b.ts)

  // Two pending working orders
  const orders = []
  const lim = universe[1 + Math.floor(rand() * 6)]
  const limPrice = round2(lim.base * 0.95)
  orders.push({
    id: nextOrderId(),
    createdAt: now - 2 * dayMs,
    symbol: lim.symbol,
    side: 'BUY',
    type: 'LIMIT',
    qty: Math.max(1, Math.round((cash0 * 0.06) / limPrice)),
    limitPrice: limPrice,
    status: 'PENDING',
    note: 'Buy dip'
  })
  const stopSym = picks[2] || universe[3]
  const stopPrice = round2(stopSym.base * 0.9)
  orders.push({
    id: nextOrderId(),
    createdAt: now - 5 * dayMs,
    symbol: stopSym.symbol,
    side: 'SELL',
    type: 'STOP',
    qty: 2,
    stopPrice,
    status: 'PENDING',
    note: 'Protective stop'
  })

  const watchlist = shuffle(universe.slice(), rand).slice(0, 9).map((s) => s.symbol)

  return {
    region,
    transactions: txs,
    orders,
    watchlist,
    cash: deriveCash(txs) // reconciles with the ledger by construction
  }
}

/** Daily portfolio value snapshots (90d) ending at the current value. */
export function valueHistory(endValue, seedKey = 'tradex:vh') {
  const rand = mulberry32(hashString(seedKey))
  const n = 90
  const vals = [endValue]
  for (let i = 1; i < n; i++) {
    vals.push(vals[i - 1] / (1 + gauss(rand) * 0.011 + 0.0012))
  }
  vals.reverse()
  const now = Date.now()
  return vals.map((v, i) => ({ t: now - (n - 1 - i) * 86400e3, v: round2(v) }))
}

/** Deterministic per-symbol candle history for a range. */
export function history(symbol, range, endPrice) {
  const cfg = {
    '1D': { count: 78, stepMs: 5 * 60e3, vol: 0.0022, drift: 0 },
    '1W': { count: 65, stepMs: 30 * 60e3, vol: 0.0035, drift: 0.0004 },
    '1M': { count: 66, stepMs: 6 * 3600e3, vol: 0.005, drift: 0.0008 },
    '1Y': { count: 250, stepMs: 86400e3, vol: 0.014, drift: 0.0011 },
    MAX: { count: 500, stepMs: 86400e3, vol: 0.016, drift: 0.0006 }
  }[range]
  return candlesBackward({ seedKey: `${symbol}:${range}`, endPrice, ...cfg })
}

function round2(x) {
  return Math.round(x * 100) / 100
}

function shuffle(arr, rand) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ---------------------------------------------------------------------------
// Leaderboard — seeded desks, live return for the demo user
// ---------------------------------------------------------------------------

export function seedLeaderboard(region = 'IN') {
  const rand = mulberry32(hashString('tradex:lb:' + region))
  const names = [
    'K. Iyer', 'A. Bhatt', 'R. Sikri', 'M. Vaidyanathan', 'S. Dastoor',
    'N. Chengannur', 'P. Wagh', 'T. Menon', 'V. Rathi', 'D. Kapadia',
    'H. Sondhi', 'G. Bhalla'
  ]
  return names.map((name) => ({
    name,
    retAll: round2((rand() - 0.32) * 46),
    retWeek: round2((rand() - 0.42) * 12),
    retDay: round2((rand() - 0.48) * 4.5),
    trades: 40 + Math.floor(rand() * 300)
  }))
}
