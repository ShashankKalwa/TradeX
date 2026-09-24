import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

import { Paper, PaperHead, DeskHeading, Tag } from '../components/primitives.jsx'
import { seedLeaderboard, valuate, valueHistory } from '../engine/ledger.js'
import { pct } from '../lib/format.js'

const PERIODS = [
  { key: 'day', label: 'Daily' },
  { key: 'week', label: 'Weekly' },
  { key: 'all', label: 'All-time' }
]

export default function Leaderboard() {
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const session = useSelector((s) => s.session)
  const region = book.region
  const [period, setPeriod] = useState('all')

  const board = useMemo(() => {
    const seeded = seedLeaderboard(region).map((u) => ({ ...u, me: false }))
    let myRet = 0
    if (book.status === 'ready') {
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
      const view = valuate(holdings, book.cash, market.quotes, (s) => market.quotes[s]?.prevClose)
      const hist = valueHistory(view.value, `tradex:vh:${region}`)
      const startVal = book.transactions.find((t) => t.type === 'CASH')?.value || 1
      // period baselines from the value history
      const dayBase = hist[hist.length - 2]?.v || view.value
      const weekBase = hist[hist.length - 6]?.v || view.value
      myRet =
        period === 'day'
          ? (view.value / dayBase - 1) * 100
          : period === 'week'
            ? (view.value / weekBase - 1) * 100
            : (view.value / startVal - 1) * 100
    }
    const me = {
      name: session.user?.name || 'You',
      retAll: myRet,
      retWeek: myRet,
      retDay: myRet,
      trades: book.transactions.filter((t) => t.type === 'BUY' || t.type === 'SELL').length,
      me: true,
      value: book.cash
    }
    const key = period === 'day' ? 'retDay' : period === 'week' ? 'retWeek' : 'retAll'
    return [...seeded, me].sort((a, b) => b[key] - a[key])
  }, [region, period, book.status, book.transactions, book.cash, market.lastTickAt, session.user?.name])

  const key = period === 'day' ? 'retDay' : period === 'week' ? 'retWeek' : 'retAll'
  const myRank = board.findIndex((u) => u.me) + 1

  return (
    <div className="space-y-5">
      <DeskHeading
        right={
          <span className="num text-2xs text-paper-100/60 font-mono">
            YOUR RANK · #{myRank} of {board.length}
          </span>
        }
      >
        Leaderboard
      </DeskHeading>

      <div className="grid lg:grid-cols-[1fr_300px] gap-5 items-start">
        <Paper className="overflow-hidden">
          <PaperHead
            title="Returns by desk"
            sub={`Percent portfolio return · ${region === 'IN' ? 'NSE' : 'US'} desks`}
            right={
              <div className="flex gap-1 rounded-ticket bg-rule/20 p-0.5" role="group" aria-label="Period">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    aria-pressed={period === p.key}
                    className={`px-2.5 py-1 rounded-ticket text-2xs font-semibold transition-colors ${
                      period === p.key ? 'bg-paper-50 text-ink shadow-paper' : 'text-ink-secondary hover:text-ink'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            }
          />
          <ol className="ruled-rows">
            {board.map((u, i) => (
              <li
                key={u.name + i}
                className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 ${u.me ? 'bg-accent-mark/8' : 'hover:bg-rule/12'} transition-colors`}
              >
                <span
                  className={`num text-sm font-semibold w-7 text-right shrink-0 ${i === 0 ? 'text-warn-text' : i < 3 ? 'text-ink' : 'text-ink-muted'}`}
                  aria-label={`Rank ${i + 1}`}
                >
                  {i === 0 ? '1st' : i === 1 ? '2nd' : i === 2 ? '3rd' : i + 1}
                </span>
                <span className="text-xs font-medium text-ink min-w-0 truncate flex-1">
                  {u.name}
                  {u.me && <Tag label="YOU" className="ml-2" />}
                </span>
                <span className="num text-2xs text-ink-muted hidden sm:inline shrink-0">{u.trades} trades</span>
                <span className={`num text-xs font-semibold w-20 text-right shrink-0 ${u[key] >= 0 ? 'text-buy-text' : 'text-sell-text'}`}>
                  {pct(u[key])}
                </span>
              </li>
            ))}
          </ol>
        </Paper>

        <div className="space-y-5">
          <Paper>
            <PaperHead title="Season" sub="Seasons archive on reset" />
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-ink-secondary">Current season</span>
                <span className="num text-xs font-semibold text-ink">S1 · 2026</span>
              </div>
              <div className="border-t border-dashed border-rule-strong/60 pt-3 space-y-2.5">
                {['S0 · 2026 H1 — archived', 'S-1 · 2025 — archived'].map((s) => (
                  <div key={s} className="flex items-center justify-between text-2xs text-ink-muted">
                    <span>{s}</span>
                    <span className="font-mono">view →</span>
                  </div>
                ))}
              </div>
              <p className="text-2xs text-ink-muted leading-relaxed pt-1">
                Rankings use percent return on the desk's opening cash, so desks of any size compete
                evenly. Your return is computed live from your ledger; rivals are seeded demo desks.
              </p>
            </div>
          </Paper>
        </div>
      </div>
    </div>
  )
}
