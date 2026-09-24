import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Link } from 'react-router-dom'

import { Paper, LivePrice, DeltaPct, Tag, EmptyState, DeskHeading } from '../components/primitives.jsx'
import { Sparkline } from '../components/charts.jsx'
import Icon from '../components/Icon.jsx'

import { STOCKS } from '../data/universe.js'
import { sparkSeries } from '../engine/random.js'
import { toggleWatch } from '../app/bookSlice.js'
import { useDispatch } from 'react-redux'

export default function Markets() {
  const dispatch = useDispatch()
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const region = book.region
  const quotes = market.quotes

  const [q, setQ] = useState('')
  const [sector, setSector] = useState('All')
  const [sort, setSort] = useState('symbol')
  const [dir, setDir] = useState(1)
  const [page, setPage] = useState(0)
  const PER = 12

  const universe = useMemo(() => STOCKS.filter((s) => s.region === region), [region])
  const sectors = useMemo(
    () => ['All', ...new Set(universe.map((s) => s.sector))].sort((a, b) => (a === 'All' ? -1 : b === 'All' ? 1 : a.localeCompare(b))),
    [universe]
  )

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase()
    let list = universe
      .filter((s) => sector === 'All' || s.sector === sector)
      .filter((s) => !term || s.symbol.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
      .map((s) => {
        const quote = quotes[s.symbol]
        const chg = quote ? ((quote.price - quote.prevClose) / quote.prevClose) * 100 : 0
        return { ...s, quote, chg, value: s.base * 14.2e6 }
      })
    list.sort((a, b) => {
      let va, vb
      if (sort === 'symbol') {
        return dir * a.symbol.localeCompare(b.symbol)
      }
      if (sort === 'price') {
        va = a.quote?.price ?? 0
        vb = b.quote?.price ?? 0
      } else if (sort === 'change') {
        va = a.chg
        vb = b.chg
      } else {
        va = a.value
        vb = b.value
      }
      return dir * (va - vb)
    })
    return list
  }, [universe, q, sector, sort, dir, market.lastTickAt, quotes])

  const pages = Math.max(1, Math.ceil(rows.length / PER))
  const safePage = Math.min(page, pages - 1)
  const paged = rows.slice(safePage * PER, safePage * PER + PER)

  const toggleSort = (k) => {
    if (sort === k) setDir((d) => -d)
    else {
      setSort(k)
      setDir(k === 'symbol' ? 1 : -1)
    }
  }

  return (
    <div>
      <DeskHeading right={<span className="num text-2xs text-paper-100/60 font-mono">{rows.length} LISTED · {region === 'IN' ? 'NSE' : 'US FEED'}</span>}>
        Markets
      </DeskHeading>

      {/* Filters — one row above the data */}
      <div className="flex flex-wrap gap-2 mb-4">
        <label className="relative">
          <span className="sr-only">Search stocks</span>
          <Icon name="search" size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
          <input
            className="field !w-56 pl-8"
            placeholder="Search symbol or company…"
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(0)
            }}
          />
        </label>
        <select
          className="field !w-40"
          value={sector}
          onChange={(e) => {
            setSector(e.target.value)
            setPage(0)
          }}
          aria-label="Filter by sector"
        >
          {sectors.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <Paper className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[720px]">
            <thead>
              <tr className="border-b border-rule/60 text-2xs text-ink-muted uppercase tracking-wider font-mono">
                <th className="font-medium px-4 py-2.5 w-8">
                  <span className="sr-only">Watch</span>
                </th>
                <th>
                  <button onClick={() => toggleSort('symbol')} className="font-medium px-3 py-2.5 hover:text-ink transition-colors">
                    Stock {sort === 'symbol' && (dir > 0 ? '↑' : '↓')}
                  </button>
                </th>
                <th className="font-medium px-3 py-2.5">Sector</th>
                <th className="font-medium px-3 py-2.5 text-right">
                  <button onClick={() => toggleSort('price')} className="font-medium hover:text-ink transition-colors">
                    Last {sort === 'price' && (dir > 0 ? '↑' : '↓')}
                  </button>
                </th>
                <th className="font-medium px-3 py-2.5 text-right">
                  <button onClick={() => toggleSort('change')} className="font-medium hover:text-ink transition-colors">
                    Day {sort === 'change' && (dir > 0 ? '↑' : '↓')}
                  </button>
                </th>
                <th className="font-medium px-3 py-2.5 text-right hidden md:table-cell">Day range</th>
                <th className="font-medium px-4 py-2.5 text-right hidden lg:table-cell">Trend</th>
              </tr>
            </thead>
            <tbody className="ruled-rows">
              {paged.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState icon="search" title="No matches" body={`Nothing matches “${q}”${sector !== 'All' ? ` in ${sector}` : ''}. Clear the search or try another sector.`} />
                  </td>
                </tr>
              )}
              {paged.map((s) => (
                <tr key={s.symbol} className="group hover:bg-rule/12 transition-colors">
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => dispatch(toggleWatch({ region, symbol: s.symbol }))}
                      className={`transition-colors ${book.watchlist.includes(s.symbol) ? 'text-warn-text' : 'text-ink-muted hover:text-ink'}`}
                      aria-label={book.watchlist.includes(s.symbol) ? `Remove ${s.symbol} from watchlist` : `Add ${s.symbol} to watchlist`}
                      aria-pressed={book.watchlist.includes(s.symbol)}
                    >
                      <Icon name="star" size={16} />
                    </button>
                  </td>
                  <td className="px-3 py-2.5">
                    <Link to={`/stock/${s.symbol}`}>
                      <div className="num text-xs font-semibold text-ink group-hover:text-accent-text transition-colors">{s.symbol}</div>
                      <div className="text-2xs text-ink-muted truncate max-w-[14rem]">{s.name}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <Tag label={s.sector} className="!bg-transparent !text-ink-secondary !border-rule" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <LivePrice quote={s.quote} region={region} className="text-xs text-ink" />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <DeltaPct value={s.chg} className="text-xs" />
                  </td>
                  <td className="num px-3 py-2.5 text-right text-2xs text-ink-secondary hidden md:table-cell">
                    {s.quote ? `${s.quote.dayLow.toFixed(2)} – ${s.quote.dayHigh.toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right hidden lg:table-cell">
                    <Sparkline
                      values={sparkSeries({ seedKey: `${s.symbol}:spark`, endPrice: s.quote?.price || s.base, count: 24 })}
                      up={s.chg >= 0}
                      w={72}
                      h={22}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-rule/60">
          <span className="num text-2xs text-ink-muted">
            {rows.length === 0 ? '0' : safePage * PER + 1}–{Math.min((safePage + 1) * PER, rows.length)} of {rows.length}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="p-1.5 rounded-ticket border border-rule text-ink-secondary hover:border-accent-text hover:text-accent-text transition-colors disabled:opacity-35 disabled:hover:border-rule disabled:hover:text-ink-secondary"
              aria-label="Previous page"
            >
              <Icon name="arrowLeft" size={14} />
            </button>
            <span className="num text-2xs text-ink-secondary self-center px-1.5">
              {safePage + 1} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
              disabled={safePage >= pages - 1}
              className="p-1.5 rounded-ticket border border-rule text-ink-secondary hover:border-accent-text hover:text-accent-text transition-colors disabled:opacity-35 disabled:hover:border-rule disabled:hover:text-ink-secondary"
              aria-label="Next page"
            >
              <Icon name="arrowLeft" size={14} className="rotate-180" />
            </button>
          </div>
        </div>
      </Paper>
    </div>
  )
}
