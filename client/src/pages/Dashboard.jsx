import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon.jsx'

import { Paper, PaperHead, LivePrice, DeltaPct, Delta, Tag, Skeleton, EmptyState } from '../components/primitives.jsx'
import { Sparkline, ValueArea } from '../components/charts.jsx'
import { money, pct, signed, dateTime, qtyFmt } from '../lib/format.js'
import { valuate, valueHistory } from '../engine/ledger.js'
import { sparkSeries } from '../engine/random.js'
import { bySymbol } from '../data/universe.js'

export default function Dashboard() {
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const region = book.region
  const quotes = market.quotes
  const prevCloseOf = (sym) => quotes[sym]?.prevClose

  const view = useMemo(() => {
    if (book.status !== 'ready') return null
    const holdings = []
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
    for (const h of map.values()) if (h.qty > 0) holdings.push(h)
    return valuate(holdings, book.cash, quotes, prevCloseOf)
  }, [book.status, book.transactions, book.cash, market.lastTickAt, quotes])

  const history = useMemo(
    () => (view ? valueHistory(view.value, `tradex:vh:${region}`) : []),
    [view?.value, region]
  )

  const recentFills = useMemo(
    () => [...book.transactions].reverse().slice(0, 6),
    [book.transactions]
  )
  const pending = book.orders.filter((o) => o.status === 'PENDING')

  if (book.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-ink-secondary">
        <Icon name="warning" className="text-4xl text-sell-text mb-4" />
        <h2 className="text-lg font-semibold text-ink">Unable to load portfolio</h2>
        <p className="mt-2 text-sm max-w-md">We couldn't connect to the trading server. Please check your connection or try again later.</p>
        <button onClick={() => window.location.reload()} className="mt-6 px-4 py-2 bg-paper-100/10 hover:bg-paper-100/20 rounded-ticket text-sm text-ink transition-colors font-medium">
          Retry Connection
        </button>
      </div>
    )
  }

  if (book.status === 'loading' || book.status === 'idle' || !view) {
    return (
      <div className="grid lg:grid-cols-[1fr_340px] gap-5" aria-busy="true">
        <div className="space-y-5">
          <Paper className="p-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-14 w-64 mt-3" />
            <Skeleton className="h-40 w-full mt-6" />
          </Paper>
          <Paper className="p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </Paper>
        </div>
        <div className="space-y-5">
          <Skeleton className="h-48 rounded-ticket" />
          <Skeleton className="h-36 rounded-ticket" />
          <Skeleton className="h-40 rounded-ticket" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <div className="space-y-5 min-w-0">
        {/* ---------------- The blotter ---------------- */}
        <Paper className="overflow-hidden">
          <div className="px-5 sm:px-6 pt-6 pb-2">
            <div className="flex flex-wrap items-end gap-x-10 gap-y-4">
              <div>
                <div className="font-mono text-2xs tracking-[0.14em] text-ink-muted uppercase">
                  Portfolio value · {region === 'IN' ? 'NSE' : 'US'} desk
                </div>
                <div className="num figure-hero text-[clamp(2.6rem,6vw,4rem)] font-semibold leading-none mt-2 text-ink">
                  {money(view.value, region)}
                </div>
                <div className="flex items-center gap-3 mt-2.5">
                  <DeltaPct value={view.dayChangePct} className="!text-sm" />
                  <Delta value={view.dayChange} region={region} />
                  <span className="text-2xs text-ink-muted">today</span>
                </div>
              </div>
              <dl className="flex gap-8 ml-auto">
                <div>
                  <dt className="text-2xs text-ink-muted uppercase tracking-wider">Cash</dt>
                  <dd className="num text-sm font-semibold text-ink mt-1">{money(book.cash, region, { compact: true })}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-muted uppercase tracking-wider">Invested</dt>
                  <dd className="num text-sm font-semibold text-ink mt-1">{money(view.invested, region, { compact: true })}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-ink-muted uppercase tracking-wider">Positions</dt>
                  <dd className="num text-sm font-semibold text-ink mt-1">{view.rows.length}</dd>
                </div>
              </dl>
            </div>
            <div className="-mx-2 mt-4">
              <ValueArea points={history} height={180} />
            </div>
          </div>

          {/* Holdings — ruled ledger rows */}
          <div className="border-t border-rule/60">
            <div className="flex items-center justify-between px-5 sm:px-6 py-3">
              <h2 className="text-xs font-bold tracking-[0.12em] uppercase text-ink">Holdings</h2>
              <Link to="/portfolio" className="text-2xs font-semibold text-accent-text hover:underline underline-offset-2">
                Full portfolio →
              </Link>
            </div>
            {view.rows.length === 0 ? (
              <EmptyState
                icon="blotter"
                title="No open positions"
                body="Buy your first shares from Markets and they'll appear here on the blotter."
                action={
                  <Link to="/markets" className="text-xs font-semibold text-accent-text hover:underline underline-offset-2">
                    Browse markets →
                  </Link>
                }
              />
            ) : (
              <div className="overflow-x-auto ruled-rows pb-2">
                <table className="w-full text-left min-w-[680px]">
                  <thead>
                    <tr className="text-2xs text-ink-muted uppercase tracking-wider font-mono">
                      <th className="font-medium px-5 sm:px-6 py-2">Stock</th>
                      <th className="font-medium px-3 py-2 text-right">Qty</th>
                      <th className="font-medium px-3 py-2 text-right">Avg cost</th>
                      <th className="font-medium px-3 py-2 text-right">Last</th>
                      <th className="font-medium px-3 py-2 text-right hidden sm:table-cell">Value</th>
                      <th className="font-medium px-3 py-2 text-right">Day</th>
                      <th className="font-medium px-3 py-2 text-right hidden md:table-cell">P&amp;L</th>
                      <th className="font-medium px-5 py-2 text-right hidden lg:table-cell">90d</th>
                    </tr>
                  </thead>
                  <tbody>
                    {view.rows
                      .slice()
                      .sort((a, b) => b.value - a.value)
                      .map((h) => (
                        <tr key={h.symbol} className="group hover:bg-rule/12 transition-colors">
                          <td className="px-5 sm:px-6 py-2.5">
                            <Link to={`/stock/${h.symbol}`} className="block">
                              <div className="num text-xs font-semibold text-ink group-hover:text-accent-text transition-colors">{h.symbol}</div>
                              <div className="text-2xs text-ink-muted truncate max-w-[13rem]">{bySymbol(h.symbol)?.name}</div>
                            </Link>
                          </td>
                          <td className="num px-3 py-2.5 text-right text-xs text-ink-secondary">{qtyFmt(h.qty)}</td>
                          <td className="num px-3 py-2.5 text-right text-xs text-ink-secondary">{money(h.avg, region)}</td>
                          <td className="px-3 py-2.5 text-right text-xs">
                            <LivePrice quote={quotes[h.symbol]} region={region} className="text-ink" />
                          </td>
                          <td className="num px-3 py-2.5 text-right text-xs text-ink hidden sm:table-cell">{money(h.value, region)}</td>
                          <td className="px-3 py-2.5 text-right">
                            <DeltaPct value={h.dayChangePct} className="text-2xs" />
                          </td>
                          <td className="px-3 py-2.5 text-right hidden md:table-cell">
                            <div className={`num text-xs font-medium ${h.unrealized >= 0 ? 'text-buy-text' : 'text-sell-text'}`}>
                              {signed(h.unrealized, region)}
                            </div>
                            <div className="text-2xs text-ink-muted">{pct(h.unrealizedPct)}</div>
                          </td>
                          <td className="px-5 py-2.5 text-right hidden lg:table-cell">
                            <Sparkline values={sparkSeries({ seedKey: `${h.symbol}:spark`, endPrice: quotes[h.symbol]?.price || h.price, count: 24 })} up={h.unrealized >= 0} w={72} h={24} />
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </Paper>
      </div>

      {/* ---------------- Desk rail ---------------- */}
      <div className="space-y-5 min-w-0">
        <Paper>
          <PaperHead
            title="Working orders"
            sub={pending.length ? `Scheduler sweeps every 8s` : undefined}
            right={<Link to="/orders" className="text-2xs font-semibold text-accent-text hover:underline underline-offset-2">All →</Link>}
          />
          {pending.length === 0 ? (
            <div className="px-4 py-5 text-xs text-ink-secondary leading-relaxed">
              No working orders. File a limit or stop ticket and it rests here until the feed crosses
              your price.
            </div>
          ) : (
            <ul className="ruled-rows">
              {pending.slice(0, 4).map((o) => (
                <li key={o.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-warn-text animate-chase shrink-0" title="Awaiting sweep" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <Tag label={o.side} />
                      <span className="num text-xs font-semibold text-ink">{o.symbol}</span>
                      <span className="num text-2xs text-ink-secondary">×{o.qty}</span>
                    </div>
                    <div className="num text-2xs text-ink-muted mt-0.5">
                      {o.type} @ {o.type === 'LIMIT' ? o.limitPrice?.toFixed(2) : o.stopPrice?.toFixed(2)}
                    </div>
                  </div>
                  <span className="num text-2xs text-ink-muted shrink-0">{o.id}</span>
                </li>
              ))}
            </ul>
          )}
        </Paper>

        <Paper>
          <PaperHead
            title="Watchlist"
            right={<Link to="/watchlist" className="text-2xs font-semibold text-accent-text hover:underline underline-offset-2">Edit →</Link>}
          />
          {book.watchlist.length === 0 ? (
            <div className="px-4 py-5 text-xs text-ink-secondary">
              Nothing on the watch. Star stocks in Markets to track them here.
            </div>
          ) : (
            <ul className="ruled-rows max-h-[300px] overflow-auto">
              {book.watchlist.slice(0, 8).map((sym) => {
                const q = quotes[sym]
                if (!q) return null
                return (
                  <li key={sym}>
                    <Link to={`/stock/${sym}`} className="flex items-center gap-2 px-4 py-2 hover:bg-rule/12 transition-colors">
                      <span className="num text-xs font-semibold text-ink w-20 shrink-0 truncate">{sym}</span>
                      <LivePrice quote={q} region={region} className="ml-auto text-xs text-ink" />
                      <DeltaPct value={((q.price - q.prevClose) / q.prevClose) * 100} className="text-2xs w-16 text-right shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </Paper>

        <Paper>
          <PaperHead
            title="Recent fills"
            right={<Link to="/transactions" className="text-2xs font-semibold text-accent-text hover:underline underline-offset-2">Ledger →</Link>}
          />
          <ul className="ruled-rows">
            {recentFills.map((t) => (
              <li key={t.id} className="px-4 py-2.5 flex items-center gap-2.5">
                <Tag label={t.type} />
                <div className="min-w-0 flex-1">
                  <div className="num text-xs text-ink">
                    {t.symbol ? (
                      <>
                        {t.symbol} <span className="text-ink-muted">×{qtyFmt(t.qty)}</span> @ {t.price?.toFixed(2)}
                      </>
                    ) : (
                      t.note || t.type
                    )}
                  </div>
                  <div className="text-2xs text-ink-muted">{dateTime(t.ts)}</div>
                </div>
                {/* Cash direction, signed — the Tag beside it already names the side,
                    so the amount stays in ink rather than borrowing the price law. */}
                <span className="num text-2xs shrink-0 text-ink-secondary">
                  {t.type === 'CASH' || t.type === 'DIV' || t.type === 'SELL' ? '+' : '−'}
                  {money(t.value || 0, region, { compact: true }).replace('−', '')}
                </span>
              </li>
            ))}
          </ul>
        </Paper>
      </div>
    </div>
  )
}
