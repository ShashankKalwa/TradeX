import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { Paper, PaperHead, Tag, EmptyState, DeskHeading } from '../components/primitives.jsx'
import { money, dateTime, qtyFmt, dateLong } from '../lib/format.js'

/**
 * The ledger — append-only. There is no edit and no delete on this page by
 * design; corrections are future entries, never rewrites. Running cash is
 * recomputed from the entries below, so any figure on the desk can be
 * audited line by line against this page.
 */
export default function Ledger() {
  const book = useSelector((s) => s.book)
  const region = book.region
  const [type, setType] = useState('ALL')
  const [page, setPage] = useState(0)
  const PER = 15

  const entries = useMemo(() => {
    let list = [...book.transactions].reverse()
    if (type !== 'ALL') list = list.filter((t) => t.type === type)
    return list
  }, [book.transactions, type])

  // Running balance, newest-first, computed from the full list
  const balances = useMemo(() => {
    const asc = book.transactions
    let run = 0
    const m = new Map()
    for (const t of asc) {
      if (t.type === 'CASH' || t.type === 'DIV' || t.type === 'SELL') run += t.value - t.fee
      if (t.type === 'BUY') run -= t.value + t.fee
      m.set(t.id, run)
    }
    return m
  }, [book.transactions])

  const pages = Math.max(1, Math.ceil(entries.length / PER))
  const safePage = Math.min(page, pages - 1)
  const paged = entries.slice(safePage * PER, safePage * PER + PER)

  return (
    <div className="space-y-5">
      <DeskHeading right={<span className="num text-2xs text-paper-100/60 font-mono">APPEND-ONLY · {book.transactions.length} ENTRIES</span>}>
        Transaction Ledger
      </DeskHeading>

      <Paper className="overflow-hidden punch-holes">
        <PaperHead
          title={`Ledger · ${region === 'IN' ? 'NSE desk' : 'US desk'}`}
          sub="Every entry ever written, newest first. Cash re-derives from these lines."
          right={
            <div className="flex gap-1" role="group" aria-label="Filter by type">
              {['ALL', 'BUY', 'SELL', 'CASH', 'DIV'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setType(t)
                    setPage(0)
                  }}
                  aria-pressed={type === t}
                  className={`px-2 py-1 rounded-ticket text-2xs font-mono font-medium transition-colors ${
                    type === t ? 'bg-ink text-paper-50' : 'text-ink-secondary hover:text-ink border border-rule'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          }
        />

        {entries.length === 0 ? (
          <EmptyState icon="blotter" title="No entries" body="Switch the filter — or make your first trade to open the ledger." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[780px]">
              <thead>
                <tr className="border-b border-rule/60 text-2xs text-ink-muted uppercase tracking-wider font-mono">
                  <th className="font-medium px-6 py-2.5">Date</th>
                  <th className="font-medium px-3 py-2.5">Entry</th>
                  <th className="font-medium px-3 py-2.5">Type</th>
                  <th className="font-medium px-3 py-2.5">Stock</th>
                  <th className="font-medium px-3 py-2.5 text-right">Qty</th>
                  <th className="font-medium px-3 py-2.5 text-right">Price</th>
                  <th className="font-medium px-3 py-2.5 text-right">Debit</th>
                  <th className="font-medium px-3 py-2.5 text-right">Credit</th>
                  <th className="font-medium px-3 py-2.5 text-right">Fee</th>
                  <th className="font-medium px-6 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="ruled-rows">
                {paged.map((t) => {
                  const debit = t.type === 'BUY' ? t.value : null
                  const credit = t.type === 'SELL' || t.type === 'CASH' || t.type === 'DIV' ? t.value : null
                  return (
                    <tr key={t.id} className="hover:bg-rule/12 transition-colors">
                      <td className="px-6 py-2.5">
                        <div className="num text-2xs text-ink">{dateTime(t.ts)}</div>
                        <div className="num text-2xs text-ink-muted">{t.id}</div>
                      </td>
                      <td className="px-3 py-2.5 text-2xs text-ink-secondary italic max-w-[12rem] truncate" title={t.note}>
                        {t.note || '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <Tag label={t.type} />
                      </td>
                      <td className="px-3 py-2.5">
                        {t.symbol ? (
                          <Link to={`/stock/${t.symbol}`} className="num text-xs font-semibold text-ink hover:text-accent-text transition-colors">
                            {t.symbol}
                          </Link>
                        ) : (
                          <span className="text-2xs text-ink-muted">—</span>
                        )}
                      </td>
                      <td className="num px-3 py-2.5 text-right text-xs text-ink-secondary">{t.qty ? qtyFmt(t.qty) : '—'}</td>
                      <td className="num px-3 py-2.5 text-right text-xs text-ink-secondary">{t.price ? t.price.toFixed(2) : '—'}</td>
                      <td className="num px-3 py-2.5 text-right text-xs text-sell-text">{debit != null ? money(debit, region) : ''}</td>
                      <td className="num px-3 py-2.5 text-right text-xs text-buy-text">{credit != null ? money(credit, region) : ''}</td>
                      <td className="num px-3 py-2.5 text-right text-2xs text-ink-muted">{t.fee ? money(t.fee, region) : '—'}</td>
                      <td className="num px-6 py-2.5 text-right text-xs font-semibold text-ink">{money(balances.get(t.id) ?? 0, region)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-6 py-3 border-t border-rule/60">
          <span className="num text-2xs text-ink-muted">
            {dateLong(book.transactions[0]?.ts)} → {dateLong(book.transactions[book.transactions.length - 1]?.ts)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="text-2xs font-semibold px-2 py-1 rounded-ticket border border-rule text-ink-secondary hover:border-accent-text hover:text-accent-text transition-colors disabled:opacity-35"
            >
              ← Prev
            </button>
            <span className="num text-2xs text-ink-secondary px-1">
              {safePage + 1} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={safePage >= pages - 1}
              className="text-2xs font-semibold px-2 py-1 rounded-ticket border border-rule text-ink-secondary hover:border-accent-text hover:text-accent-text transition-colors disabled:opacity-35"
            >
              Next →
            </button>
          </div>
        </div>
      </Paper>
    </div>
  )
}
