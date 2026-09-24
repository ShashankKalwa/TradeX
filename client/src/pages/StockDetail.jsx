import { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useParams, Link, Navigate } from 'react-router-dom'

import { Paper, PaperHead, LivePrice, DeltaPct, Delta, Tag } from '../components/primitives.jsx'
import { PriceChart } from '../components/charts.jsx'
import OrderTicket from '../components/OrderTicket.jsx'
import Icon from '../components/Icon.jsx'
import { money, pct, signed, qtyFmt, dateTime } from '../lib/format.js'
import { bySymbol } from '../data/universe.js'
import { history as priceHistory } from '../engine/ledger.js'
import { toggleWatch } from '../app/bookSlice.js'

const RANGES = ['1D', '1W', '1M', '1Y', 'MAX']

export default function StockDetail() {
  const { symbol } = useParams()
  const dispatch = useDispatch()
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const region = book.region
  const quote = market.quotes[symbol]
  const stock = bySymbol(symbol)
  const [range, setRange] = useState('1M')
  const [mode, setMode] = useState('candle')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [symbol])

  const candles = useMemo(
    () => (quote ? priceHistory(symbol, range, quote.price) : []),
    [symbol, range, quote?.price && Math.round(quote.price * 50)] // re-anchor on meaningful moves
  )

  const chg = quote ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : 0
  const watched = book.watchlist.includes(symbol)

  const holding = useMemo(() => {
    const map = new Map()
    for (const t of book.transactions) {
      if ((t.type !== 'BUY' && t.type !== 'SELL') || t.symbol !== symbol) continue
      const h = map.get(symbol) || { qty: 0, cost: 0 }
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
      map.set(symbol, h)
    }
    return map.get(symbol)
  }, [book.transactions, symbol])

  const fills = useMemo(
    () => book.transactions.filter((t) => t.symbol === symbol).reverse().slice(0, 8),
    [book.transactions, symbol]
  )

  if (!stock || stock.region !== region) {
    return <Navigate to="/markets" replace />
  }

  return (
    <div className="grid lg:grid-cols-[1fr_340px] gap-5 items-start">
      <div className="space-y-5 min-w-0">
        {/* Quote head */}
        <Paper className="px-5 sm:px-6 py-5">
          <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="num text-xl font-bold text-ink tracking-tight">{symbol}</h1>
                <Tag label={stock.exchange} className="!bg-transparent !text-ink-secondary !border-rule" />
                <button
                  onClick={() => dispatch(toggleWatch({ region, symbol }))}
                  className={`transition-colors ${watched ? 'text-warn-text' : 'text-ink-muted hover:text-ink'}`}
                  aria-pressed={watched}
                  aria-label={watched ? 'Remove from watchlist' : 'Add to watchlist'}
                >
                  <Icon name="star" size={17} />
                </button>
              </div>
              <p className="text-xs text-ink-secondary mt-1">
                {stock.name} · <span className="text-ink-muted">{stock.sector}</span>
              </p>
              <div className="flex items-baseline gap-3 mt-3">
                <LivePrice quote={quote} region={region} className="text-2xl font-semibold text-ink" />
                <DeltaPct value={chg} className="!text-sm" />
                {quote && <Delta value={quote.price - quote.prevClose} region={region} className="!text-xs" />}
              </div>
            </div>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-3 ml-auto">
              {[
                ['Open', quote ? money(quote.dayOpen, region) : '—'],
                ['Prev close', quote ? money(quote.prevClose, region) : '—'],
                ['Day range', quote ? `${quote.dayLow.toFixed(2)}–${quote.dayHigh.toFixed(2)}` : '—'],
                ['Volume', quote ? qtyFmt(quote.volume) : '—']
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="text-2xs text-ink-muted uppercase tracking-wider">{k}</dt>
                  <dd className="num text-xs font-medium text-ink mt-1">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Paper>

        {/* Chart */}
        <Paper>
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-3.5 pb-2 border-b border-rule/60">
            <h2 className="text-sm font-semibold tracking-wide uppercase text-ink">Price</h2>
            <div className="flex items-center gap-2">
              <div className="flex rounded-ticket bg-rule/20 p-0.5" role="group" aria-label="Chart mode">
                {['candle', 'line'].map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    aria-pressed={mode === m}
                    className={`px-2 py-1 rounded-ticket text-2xs font-mono font-medium transition-colors ${mode === m ? 'bg-paper-50 text-ink shadow-paper' : 'text-ink-secondary hover:text-ink'}`}
                  >
                    {m.toUpperCase()}
                  </button>
                ))}
              </div>
              <div className="flex rounded-ticket bg-rule/20 p-0.5" role="group" aria-label="Range">
                {RANGES.map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    aria-pressed={range === r}
                    className={`px-2 py-1 rounded-ticket text-2xs font-mono font-medium transition-colors ${range === r ? 'bg-paper-50 text-ink shadow-paper' : 'text-ink-secondary hover:text-ink'}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-3 py-3">
            <PriceChart candles={candles} mode={mode} height={300} refPrice={quote?.prevClose} />
          </div>
        </Paper>

        {/* Your position + fills */}
        <Paper>
          <PaperHead title={`Your ${symbol}`} sub={holding ? 'Position on this name' : undefined} />
          {holding ? (
            <dl className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-rule/40 border-t border-rule/40">
              {(() => {
                const avg = holding.cost / holding.qty
                const price = quote?.price || 0
                const upnl = (price - avg) * holding.qty
                return [
                  ['Quantity', qtyFmt(holding.qty)],
                  ['Avg cost', money(avg, region)],
                  ['Market value', money(price * holding.qty, region)],
                  ['Unrealized P&L', `${signed(upnl, region)} (${pct((price / avg - 1) * 100)})`]
                ].map(([k, v], i) => (
                  <div key={k} className="px-4 py-3">
                    <dt className="text-2xs text-ink-muted uppercase tracking-wider">{k}</dt>
                    <dd className={`num text-xs font-semibold mt-1 ${i === 3 ? (upnl >= 0 ? 'text-buy-text' : 'text-sell-text') : 'text-ink'}`}>{v}</dd>
                  </div>
                ))
              })()}
            </dl>
          ) : (
            <div className="px-4 py-4 text-xs text-ink-secondary">No position. Your first fill on {symbol} will show here.</div>
          )}
          {fills.length > 0 && (
            <div className="border-t border-rule/60">
              <ul className="ruled-rows">
                {fills.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-4 py-2">
                    <Tag label={t.type} />
                    <span className="num text-xs text-ink">
                      {qtyFmt(t.qty)} @ {t.price?.toFixed(2)}
                    </span>
                    <span className="num text-2xs text-ink-muted ml-auto">{dateTime(t.ts)}</span>
                    <span className="num text-2xs text-ink-secondary">{t.id}</span>
                  </li>
                ))}
              </ul>
              <div className="px-4 py-2.5 border-t border-rule/50">
                <Link to="/transactions" className="text-2xs font-semibold text-accent-text hover:underline underline-offset-2">
                  Full ledger →
                </Link>
              </div>
            </div>
          )}
        </Paper>
      </div>

      {/* Order ticket rail */}
      <div className="lg:sticky lg:top-20">
        <OrderTicket symbol={symbol} heldQty={holding?.qty || 0} />
      </div>
    </div>
  )
}
