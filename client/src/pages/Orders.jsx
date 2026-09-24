import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

import { Paper, Tag, EmptyState, DeskHeading } from '../components/primitives.jsx'
import Icon from '../components/Icon.jsx'
import { dateTime } from '../lib/format.js'
import { cancelOrder } from '../app/bookSlice.js'

const LIFECYCLE = ['PENDING', 'TRIGGERED', 'FILLED', 'CANCELLED', 'REJECTED', 'EXPIRED']

export default function Orders() {
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const dispatch = useDispatch()
  const region = book.region
  const [tab, setTab] = useState('WORKING')

  const working = book.orders.filter((o) => o.status === 'PENDING')
  const resolved = book.orders.filter((o) => o.status !== 'PENDING').reverse()
  const list = tab === 'WORKING' ? working : resolved

  const onCancel = async (o) => {
    try {
      await dispatch(cancelOrder({ region, orderId: o.id })).unwrap()
      toast.success(`Cancelled ${o.id} — ${o.side} ${o.qty} ${o.symbol}`)
    } catch (e) {
      toast.error(e.message || 'Could not cancel that order.')
    }
  }

  const distance = (o) => {
    const q = market.quotes[o.symbol]
    if (!q) return null
    const target = o.type === 'LIMIT' ? o.limitPrice : o.stopPrice
    return ((Math.abs(q.price - target) / q.price) * 100).toFixed(2)
  }

  return (
    <div className="space-y-5">
      <DeskHeading
        right={
          <span className="num text-2xs text-paper-100/60 font-mono flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-warn-text animate-chase" aria-hidden />
            SCHEDULER SWEEPS EVERY 8S
          </span>
        }
      >
        Orders
      </DeskHeading>

      <div className="flex gap-1 rounded-ticket bg-desk-800 border border-desk-line p-1 w-max" role="group" aria-label="Order filter">
        {[
          ['WORKING', `Working (${working.length})`],
          ['RESOLVED', `Resolved (${resolved.length})`]
        ].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-pressed={tab === k}
            className={`px-3 py-1.5 rounded-ticket text-xs font-semibold transition-colors ${
              tab === k ? 'bg-paper-100 text-desk-900' : 'text-paper-100/55 hover:text-paper-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <Paper className="overflow-hidden">
        {/* Lifecycle legend — the order's discrete, recoverable states */}
        <div className="px-4 py-2.5 border-b border-rule/60 flex items-center gap-2 flex-wrap">
          <span className="text-2xs text-ink-muted uppercase tracking-wider font-mono mr-1">Lifecycle</span>
          {LIFECYCLE.map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <Icon name="arrowLeft" size={10} className="text-ink-muted rotate-180" />}
              <Tag label={s} />
            </span>
          ))}
        </div>

        {list.length === 0 ? (
          <EmptyState
            icon="ticket"
            title={tab === 'WORKING' ? 'No working orders' : 'No resolved orders yet'}
            body={
              tab === 'WORKING'
                ? 'Limit and stop tickets rest here until the live feed crosses your price — then the scheduler fills them automatically.'
                : 'Filled, cancelled and rejected tickets file here with their full state history.'
            }
            action={
              <Link to="/markets" className="text-xs font-semibold text-accent-text hover:underline underline-offset-2">
                File an order →
              </Link>
            }
          />
        ) : (
          <ul className="ruled-rows">
            {list.map((o) => {
              const q = market.quotes[o.symbol]
              const dist = distance(o)
              return (
                <li key={o.id} className="px-4 sm:px-5 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-2 hover:bg-rule/12 transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {o.status === 'PENDING' && <span className="w-1.5 h-1.5 rounded-full bg-warn-text animate-chase shrink-0" aria-hidden />}
                    <Tag label={o.side} />
                    <div className="min-w-0">
                      <Link to={`/stock/${o.symbol}`} className="num text-xs font-semibold text-ink hover:text-accent-text transition-colors">
                        {o.symbol}
                      </Link>
                      <div className="num text-2xs text-ink-muted">
                        {o.id} · {dateTime(o.createdAt)}
                      </div>
                    </div>
                  </div>

                  <div className="num text-xs text-ink">
                    {o.qty} <span className="text-ink-muted">sh</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <Tag label={o.type} className="!bg-transparent !text-ink-secondary !border-rule" />
                    {o.type === 'LIMIT' && <span className="num text-xs text-ink-secondary">@ {o.limitPrice?.toFixed(2)}</span>}
                    {o.type === 'STOP' && <span className="num text-xs text-ink-secondary">stop {o.stopPrice?.toFixed(2)}</span>}
                    {o.status === 'FILLED' && o.filledPrice != null && (
                      <span className="num text-xs font-medium text-ink">filled @ {o.filledPrice.toFixed(2)}</span>
                    )}
                  </div>

                  <div className="ml-auto flex items-center gap-3">
                    {o.status === 'PENDING' && q && dist != null && (
                      <span className="num text-2xs text-ink-muted" title="Distance from live price to your trigger">
                        {dist}% away
                      </span>
                    )}
                    <Tag label={o.status} />
                    {o.status === 'PENDING' && (
                      <button
                        onClick={() => onCancel(o)}
                        className="text-2xs font-semibold text-sell-text border border-sell-text/40 rounded-ticket px-2 py-1 hover:bg-sell-text/10 transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                  </div>

                  {o.note && (
                    <div className="w-full text-2xs text-ink-muted italic">“{o.note}”</div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </Paper>
    </div>
  )
}
