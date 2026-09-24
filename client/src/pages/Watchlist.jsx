import { useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link } from 'react-router-dom'

import { Paper, PaperHead, LivePrice, DeltaPct, EmptyState, DeskHeading } from '../components/primitives.jsx'
import { Sparkline } from '../components/charts.jsx'
import Icon from '../components/Icon.jsx'

import { bySymbol } from '../data/universe.js'
import { sparkSeries } from '../engine/random.js'
import { toggleWatch } from '../app/bookSlice.js'

export default function Watchlist() {
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const dispatch = useDispatch()
  const region = book.region
  const quotes = market.quotes

  const rows = useMemo(
    () =>
      book.watchlist
        .map((sym) => ({ stock: bySymbol(sym), quote: quotes[sym] }))
        .filter((r) => r.stock && r.stock.region === region && r.quote),
    [book.watchlist, market.lastTickAt, quotes, region]
  )

  return (
    <div className="space-y-5">
      <DeskHeading right={<span className="num text-2xs text-paper-100/60 font-mono">{rows.length} NAMES</span>}>
        Watchlist
      </DeskHeading>

      <Paper className="overflow-hidden">
        <PaperHead title="Watching" sub="Starred names across the desk — price alerts fire from the scheduler" />
        {rows.length === 0 ? (
          <EmptyState
            icon="star"
            title="Nothing on the watch"
            body="Star stocks in Markets or on any quote page; they collect here with live prices and trend."
            action={
              <Link to="/markets" className="text-xs font-semibold text-accent-text hover:underline underline-offset-2">
                Browse markets →
              </Link>
            }
          />
        ) : (
          <ul className="ruled-rows">
            {rows.map(({ stock, quote }) => (
              <li key={stock.symbol} className="flex items-center gap-3 sm:gap-4 px-4 sm:px-5 py-3 hover:bg-rule/12 transition-colors group">
                <button
                  onClick={() => dispatch(toggleWatch({ region, symbol: stock.symbol }))}
                  className="text-warn-text shrink-0"
                  aria-label={`Remove ${stock.symbol} from watchlist`}
                >
                  <Icon name="star" size={16} />
                </button>
                <Link to={`/stock/${stock.symbol}`} className="min-w-0 flex-1">
                  <div className="num text-xs font-semibold text-ink group-hover:text-accent-text transition-colors">{stock.symbol}</div>
                  <div className="text-2xs text-ink-muted truncate max-w-[16rem]">{stock.name}</div>
                </Link>
                <Sparkline
                  values={sparkSeries({ seedKey: `${stock.symbol}:spark`, endPrice: quote.price, count: 24 })}
                  up={quote.price >= quote.prevClose}
                  w={72}
                  h={22}
                  className="hidden sm:block shrink-0"
                />
                <LivePrice quote={quote} region={region} className="text-xs text-ink ml-auto" />
                <DeltaPct value={((quote.price - quote.prevClose) / quote.prevClose) * 100} className="text-xs w-16 text-right shrink-0" />
                <span className="num text-2xs text-ink-secondary w-24 text-right hidden md:inline shrink-0 whitespace-nowrap">
                  {quote.dayLow.toFixed(0)}–{quote.dayHigh.toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Paper>
    </div>
  )
}
