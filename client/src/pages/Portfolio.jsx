import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { Paper, PaperHead, Tag, EmptyState, DeskHeading, LivePrice } from '../components/primitives.jsx'
import { ValueArea, SectorBars } from '../components/charts.jsx'
import { money, pct, signed, qtyFmt } from '../lib/format.js'
import { valuate, valueHistory, sectorWeights, concentration, sharpe, deriveRealized } from '../engine/ledger.js'
import { bySymbol } from '../data/universe.js'

function riskLabel(hhi) {
  if (hhi < 0.2) return { label: 'SPREAD', tone: 'text-buy-text', note: 'Well diversified across sectors' }
  if (hhi < 0.35) return { label: 'MODERATE', tone: 'text-warn-text', note: 'Meaningful sector concentration' }
  return { label: 'CONCENTRATED', tone: 'text-sell-text', note: 'One or two sectors dominate the book' }
}

export default function Portfolio() {
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const region = book.region
  const quotes = market.quotes

  const view = useMemo(() => {
    if (book.status !== 'ready') return null
    const map = new Map()
    for (const t of book.transactions) {
      if (t.type !== 'BUY' && t.type !== 'SELL') continue
      const h = map.get(t.symbol) || { symbol: t.symbol, qty: 0, cost: 0 }
      if (t.type === 'BUY') {
        h.qty += t.qty
        h.cost += t.value
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
    const holdings = [...map.values()].filter((h) => h.qty > 0)
    return valuate(holdings, book.cash, quotes, (sym) => quotes[sym]?.prevClose)
  }, [book.status, book.transactions, book.cash, market.lastTickAt, quotes])

  const realized = useMemo(() => (book.status === 'ready' ? deriveRealized(book.transactions) : 0), [book.transactions, book.status])
  const history = useMemo(() => (view ? valueHistory(view.value, `tradex:vh:${region}`) : []), [view?.value, region])
  const weights = useMemo(() => (view ? sectorWeights(view.rows) : []), [view])
  const hhi = useMemo(() => concentration(weights), [weights])
  const sr = useMemo(() => sharpe(history), [history])

  if (!view) {
    return (
      <div className="grid lg:grid-cols-3 gap-5" aria-busy="true">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-72 rounded-ticket skeleton-row" />
        ))}
      </div>
    )
  }

  const risk = riskLabel(hhi)

  return (
    <div className="space-y-5">
      <DeskHeading right={<span className="num text-2xs text-paper-100/60 font-mono">RECONCILED AGAINST {book.transactions.length} LEDGER ENTRIES</span>}>
        Portfolio
      </DeskHeading>

      {/* Summary strip — one paper, ruled */}
      <Paper className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-rule/40">
        {[
          { k: 'Total value', v: money(view.value, region), cls: 'text-ink' },
          { k: 'Day change', v: `${signed(view.dayChange, region)}`, sub: pct(view.dayChangePct), cls: view.dayChange >= 0 ? 'text-buy-text' : 'text-sell-text' },
          { k: 'Unrealized P&L', v: signed(view.rows.reduce((a, r) => a + r.unrealized, 0), region), sub: 'open positions', cls: view.rows.reduce((a, r) => a + r.unrealized, 0) >= 0 ? 'text-buy-text' : 'text-sell-text' },
          { k: 'Realized P&L', v: signed(realized, region), sub: 'closed trades + dividends', cls: realized >= 0 ? 'text-buy-text' : 'text-sell-text' },
          { k: 'Cash', v: money(book.cash, region), sub: `${qtyFmt(view.rows.length)} positions`, cls: 'text-ink' }
        ].map((s) => (
          <div key={s.k} className="px-5 py-4">
            <div className="text-2xs text-ink-muted uppercase tracking-wider">{s.k}</div>
            <div className={`num text-sm font-semibold mt-1.5 ${s.cls}`}>{s.v}</div>
            {s.sub && <div className="text-2xs text-ink-muted mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </Paper>

      <div className="grid lg:grid-cols-[1.6fr_1fr] gap-5 items-start">
        {/* Performance */}
        <Paper>
          <PaperHead title="Performance" sub="Daily portfolio value · 90 days" />
          <div className="px-4 py-4">
            <ValueArea points={history} height={220} />
          </div>
        </Paper>

        {/* Risk */}
        <Paper>
          <PaperHead title="Risk" sub="Concentration & volatility" />
          <div className="p-4 space-y-5">
            <div>
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-ink-secondary">Sector concentration</span>
                <span className={`num text-xs font-bold tracking-wider ${risk.tone}`}>{risk.label}</span>
              </div>
              <div className="h-2 rounded-ticket bg-rule/25 mt-2 overflow-hidden" role="presentation">
                <div
                  className={`h-full rounded-ticket ${hhi < 0.2 ? 'bg-buy-text' : hhi < 0.35 ? 'bg-warn-text' : 'bg-sell-text'}`}
                  style={{ width: `${Math.min(hhi * 100, 100)}%` }}
                />
              </div>
              <p className="text-2xs text-ink-muted mt-2 leading-relaxed">
                {risk.note} · HHI {hhi.toFixed(2)} across {weights.length} sectors
              </p>
            </div>
            <div className="border-t border-dashed border-rule-strong/60 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-xs text-ink-secondary">Sharpe-style ratio</span>
                <span className={`num text-sm font-semibold ${sr >= 1 ? 'text-buy-text' : sr >= 0 ? 'text-ink' : 'text-sell-text'}`}>
                  {sr.toFixed(2)}
                </span>
              </div>
              <p className="text-2xs text-ink-muted mt-2 leading-relaxed">
                Return per unit of volatility, annualized from daily value history. &gt;1 is strong
                for a single-name book.
              </p>
            </div>
            <div className="border-t border-dashed border-rule-strong/60 pt-4">
              <span className="text-xs text-ink-secondary">Allocation</span>
              <div className="mt-3">
                <SectorBars weights={weights} />
              </div>
            </div>
          </div>
        </Paper>
      </div>

      {/* Positions detail */}
      <Paper>
        <PaperHead title="Positions" sub="Weighted-average cost basis" />
        {view.rows.length === 0 ? (
          <EmptyState icon="blotter" title="No open positions" body="Fill a buy ticket from any stock page to open your first position." />
        ) : (
          <div className="overflow-x-auto ruled-rows">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="text-2xs text-ink-muted uppercase tracking-wider font-mono">
                  <th className="font-medium px-5 py-2.5">Stock</th>
                  <th className="font-medium px-3 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-3 py-2.5 text-right">Avg cost</th>
                  <th className="font-medium px-3 py-2.5 text-right">Last</th>
                  <th className="font-medium px-3 py-2.5 text-right">Value</th>
                  <th className="font-medium px-3 py-2.5 text-right">Weight</th>
                  <th className="font-medium px-3 py-2.5 text-right">Unrealized</th>
                  <th className="font-medium px-5 py-2.5 text-right">Sector</th>
                </tr>
              </thead>
              <tbody>
                {view.rows
                  .slice()
                  .sort((a, b) => b.value - a.value)
                  .map((h) => (
                    <tr key={h.symbol} className="group hover:bg-rule/12 transition-colors">
                      <td className="px-5 py-3">
                        <Link to={`/stock/${h.symbol}`}>
                          <div className="num text-xs font-semibold text-ink group-hover:text-accent-text transition-colors">{h.symbol}</div>
                          <div className="text-2xs text-ink-muted">{bySymbol(h.symbol)?.name}</div>
                        </Link>
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-ink-secondary">{qtyFmt(h.qty)}</td>
                      <td className="num px-3 py-3 text-right text-xs text-ink-secondary">{money(h.avg, region)}</td>
                      <td className="px-3 py-3 text-right text-xs">
                        <LivePrice quote={quotes[h.symbol]} region={region} className="text-ink" />
                      </td>
                      <td className="num px-3 py-3 text-right text-xs text-ink">{money(h.value, region)}</td>
                      <td className="num px-3 py-3 text-right text-2xs text-ink-secondary">{((h.value / view.invested) * 100 || 0).toFixed(1)}%</td>
                      <td className="px-3 py-3 text-right">
                        <div className={`num text-xs font-medium ${h.unrealized >= 0 ? 'text-buy-text' : 'text-sell-text'}`}>{signed(h.unrealized, region)}</div>
                        <div className="text-2xs text-ink-muted">{pct(h.unrealizedPct)}</div>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Tag label={bySymbol(h.symbol)?.sector || '—'} className="!bg-transparent !text-ink-secondary !border-rule" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Paper>
    </div>
  )
}
