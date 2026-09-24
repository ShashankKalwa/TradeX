// Mock service layer — the same surface the real Express API will expose.
// Components never touch the engine directly; swapping this module for axios
// calls is the entire migration.

import { getQuote } from '../engine/market.js'
import {
  seedBook,
  deriveCash,
  deriveHoldings,
  nextTxId,
  nextOrderId
} from '../engine/ledger.js'
import { bySymbol, FEE_RATE } from '../data/universe.js'

const LATENCY = [120, 380]
const books = new Map() // region -> book (session-persistent)
const processedKeys = new Set() // idempotency guard

const sleep = () =>
  new Promise((r) => setTimeout(r, LATENCY[0] + Math.random() * (LATENCY[1] - LATENCY[0])))

function book(region) {
  if (!books.has(region)) books.set(region, seedBook(region))
  return books.get(region)
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function login({ email, password }) {
  await sleep()
  if (!email || !password) throw new Error('Enter your email and password to sign in.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')
  const name = email
    .split('@')[0]
    .replace(/[._-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
  return {
    user: { name, email },
    token: 'mock.' + btoa(email).replace(/=/g, '') + '.' + Date.now().toString(36)
  }
}

export async function register({ name, email, password }) {
  await sleep()
  if (!name || !email || !password) throw new Error('All fields are required to open a desk.')
  if (password.length < 6) throw new Error('Password must be at least 6 characters.')
  return {
    user: { name, email },
    token: 'mock.' + btoa(email).replace(/=/g, '') + '.' + Date.now().toString(36)
  }
}

// ---------------------------------------------------------------------------
// Book / portfolio
// ---------------------------------------------------------------------------

export async function fetchBook(region) {
  await sleep()
  const b = book(region)
  return JSON.parse(JSON.stringify(b))
}

/** Append a fill to the ledger (the ONLY writer). */
function appendFill(b, { symbol, side, qty, price, orderId, note }) {
  const value = round2(qty * price)
  const fee = round2(value * FEE_RATE)
  b.transactions.push({
    id: nextTxId(),
    ts: Date.now(),
    type: side,
    symbol,
    qty,
    price,
    value,
    fee,
    note: note || ''
  })
  b.cash = deriveCash(b.transactions) // re-derive: the ledger is truth
  return { value, fee }
}

/**
 * Place an order. Market orders fill at the live price; limit/stop orders
 * rest in the pending queue until the scheduler sweep fills or cancels them.
 * Validation mirrors the backend: insufficient funds and insufficient shares
 * are rejected BEFORE any ledger write; the idempotency key prevents
 * duplicate trades on retry.
 */
export async function placeOrder({ region, symbol, side, type, qty, limitPrice, stopPrice, idempotencyKey, note }) {
  await sleep()
  if (idempotencyKey && processedKeys.has(idempotencyKey)) {
    return { duplicate: true }
  }
  const b = book(region)
  const q = getQuote(symbol)
  const qtyN = Math.floor(Number(qty))

  if (!bySymbol(symbol)) throw new Error(`Unknown symbol ${symbol}.`)
  if (!qtyN || qtyN < 1) throw new Error('Quantity must be at least 1 share.')
  if (type === 'LIMIT' && !(Number(limitPrice) > 0)) throw new Error('A limit order needs a limit price.')
  if (type === 'STOP' && !(Number(stopPrice) > 0)) throw new Error('A stop order needs a stop price.')

  const holdings = deriveHoldings(b.transactions)
  const held = holdings.find((h) => h.symbol === symbol)

  if (type === 'MARKET') {
    const price = q.price
    const value = qtyN * price
    if (side === 'BUY' && value * (1 + FEE_RATE) > b.cash) {
      throw new Error(
        `Insufficient funds. Order needs ${(value * (1 + FEE_RATE)).toFixed(2)} including fees; available ${b.cash.toFixed(2)}.`
      )
    }
    if (side === 'SELL' && (!held || held.qty < qtyN)) {
      throw new Error(
        `Insufficient shares. You hold ${held ? held.qty : 0} of ${symbol}; tried to sell ${qtyN}.`
      )
    }
    const fill = appendFill(b, { symbol, side, qty: qtyN, price, note })
    if (idempotencyKey) processedKeys.add(idempotencyKey)
    const order = {
      id: nextOrderId(),
      createdAt: Date.now(),
      symbol,
      side,
      type,
      qty: qtyN,
      filledPrice: price,
      status: 'FILLED',
      resolvedAt: Date.now(),
      note
    }
    b.orders.push(order)
    return {
      status: 'FILLED',
      order,
      fill
    }
  }

  // Resting order — reserves checked on the sweep, not now (documented behavior)
  const order = {
    id: nextOrderId(),
    createdAt: Date.now(),
    symbol,
    side,
    type,
    qty: qtyN,
    limitPrice: limitPrice ? Number(limitPrice) : undefined,
    stopPrice: stopPrice ? Number(stopPrice) : undefined,
    status: 'PENDING',
    note
  }
  b.orders.push(order)
  if (idempotencyKey) processedKeys.add(idempotencyKey)
  return { status: 'PENDING', order }
}

export async function cancelOrder(region, orderId) {
  await sleep()
  const b = book(region)
  const o = b.orders.find((x) => x.id === orderId && x.status === 'PENDING')
  if (!o) throw new Error('Order not found or already resolved.')
  o.status = 'CANCELLED'
  o.resolvedAt = Date.now()
  return { order: o }
}

/**
 * The scheduler sweep (node-cron on the backend): evaluates pending limit and
 * stop orders against live prices and fills the ones whose condition holds.
 * Returns the fills so the client can toast them as confirmation slips.
 */
export async function sweepOrders(region) {
  const b = book(region)
  if (!b) return { fills: [], cancels: [] }
  const fills = []
  for (const o of b.orders) {
    if (o.status !== 'PENDING') continue
    const q = getQuote(o.symbol)
    if (!q) continue
    let trigger = false
    let fillPrice = q.price
    if (o.type === 'LIMIT') {
      if (o.side === 'BUY' && q.price <= o.limitPrice) {
        trigger = true
        fillPrice = Math.min(o.limitPrice, q.price)
      }
      if (o.side === 'SELL' && q.price >= o.limitPrice) {
        trigger = true
        fillPrice = Math.max(o.limitPrice, q.price)
      }
    }
    if (o.type === 'STOP') {
      if (o.side === 'SELL' && q.price <= o.stopPrice) {
        trigger = true
        fillPrice = q.price
      }
      if (o.side === 'BUY' && q.price >= o.stopPrice) {
        trigger = true
        fillPrice = q.price
      }
    }
    if (!trigger) continue
    // Re-validate before writing
    const holdings = deriveHoldings(b.transactions)
    const held = holdings.find((h) => h.symbol === o.symbol)
    if (o.side === 'BUY' && o.qty * fillPrice * (1 + FEE_RATE) > b.cash) continue // rests; will retry next sweep
    if (o.side === 'SELL' && (!held || held.qty < o.qty)) {
      o.status = 'REJECTED'
      o.resolvedAt = Date.now()
      continue
    }
    appendFill(b, { symbol: o.symbol, side: o.side, qty: o.qty, price: fillPrice, orderId: o.id, note: 'Order triggered' })
    o.status = 'FILLED'
    o.filledPrice = fillPrice
    o.resolvedAt = Date.now()
    fills.push(o)
  }
  return { fills }
}

export async function toggleWatch(region, symbol) {
  await sleep()
  const b = book(region)
  const i = b.watchlist.indexOf(symbol)
  if (i >= 0) b.watchlist.splice(i, 1)
  else b.watchlist.push(symbol)
  return { watchlist: [...b.watchlist] }
}

function round2(x) {
  return Math.round(x * 100) / 100
}
