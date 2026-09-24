import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { toast } from 'react-toastify'
import { logout, setSkipVerification, refreshUser } from '../app/sessionSlice.js'
import { setRegion, refreshBook } from '../app/bookSlice.js'
import { resendVerification } from '../services/api.js'
import { marketStatus } from '../engine/market.js'
import { STOCKS, bySymbol } from '../data/universe.js'
import Icon from './Icon.jsx'
import Mark from './Mark.jsx'
import { LivePrice, DeltaPct } from './primitives.jsx'
import { REGION_LABEL, money } from '../lib/format.js'

const NAV = [
  { to: '/', label: 'Blotter', icon: 'blotter', end: true },
  { to: '/markets', label: 'Markets', icon: 'markets' },
  { to: '/portfolio', label: 'Portfolio', icon: 'stock' },
  { to: '/orders', label: 'Orders', icon: 'ticket' },
  { to: '/transactions', label: 'Ledger', icon: 'ledger' },
  { to: '/watchlist', label: 'Watchlist', icon: 'star' },
  { to: '/leaderboard', label: 'Leaderboard', icon: 'trophy' }
]

export default function AppShell({ children }) {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const session = useSelector((s) => s.session)
  const book = useSelector((s) => s.book)
  const market = useSelector((s) => s.market)
  const region = book.region
  const status = marketStatus(region)
  const [searchOpen, setSearchOpen] = useState(false)

  const universe = useMemo(() => STOCKS.filter((s) => s.region === region), [region])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TickerTape quotes={market.quotes} region={region} />
      <div className="flex flex-1 min-h-0">
        {/* ---------- Desk edge ---------- */}
        <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-desk-line bg-desk-950/60 overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-5 pt-6 pb-5 group">
            <Mark />
            <div>
              <div className="font-bold text-paper-50 tracking-tight text-[17px] leading-none">TradeX</div>
              <div className="font-mono text-2xs text-paper-100/60 mt-1 tracking-wider">VIRTUAL DESK</div>
            </div>
          </Link>
          <nav className="px-3 space-y-0.5 flex-1" aria-label="Primary">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  `desk-tab flex items-center gap-3 px-3 py-2 rounded-ticket text-sm font-medium ${
                    isActive ? 'bg-paper-100/10 text-paper-50 shadow-inset-line' : 'text-paper-100/55'
                  }`
                }
              >
                <Icon name={n.icon} />
                {n.label}
                {n.to === '/orders' && book.orders.filter((o) => o.status === 'PENDING').length > 0 && (
                  <span className="ml-auto num text-2xs bg-warn-mark/20 text-paper-100 border border-warn-mark/40 rounded-full px-1.5">
                    {book.orders.filter((o) => o.status === 'PENDING').length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="p-3 border-t border-desk-line">
            <button
              onClick={() => setSearchOpen(true)}
              className="desk-tab w-full flex items-center gap-3 px-3 py-2 rounded-ticket text-sm text-paper-100/55"
            >
              <Icon name="search" />
              Search
              <kbd className="ml-auto font-mono text-2xs text-paper-100/60 border border-desk-line rounded px-1.5 py-0.5">Ctrl K</kbd>
            </button>
          </div>
          <div className="px-5 py-4 border-t border-desk-line">
            <div className="text-2xs text-paper-100/60 font-mono tracking-wider">AVAILABLE CASH</div>
            <div className="num text-paper-50 text-sm mt-1">{money(book.cash, region, { compact: true })}</div>
            {!session.user?.isVerified && (
              <div className="mt-4">
                <button
                  onClick={() => dispatch(setSkipVerification(false))}
                  className="w-full desk-tab flex items-center justify-center gap-2 px-3 py-2 rounded-ticket text-xs font-medium text-warn-text bg-warn-mark/5 hover:bg-warn-mark/10 border border-warn-mark/20 transition-colors"
                  title="Complete verification"
                >
                  <Icon name="mail" size={14} />
                  Verification needed
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mt-4">
              <div className="min-w-0">
                <div className="text-sm text-paper-100/80 truncate max-w-[9rem]">{session.user?.name}</div>
                <div className="text-2xs text-paper-100/60 truncate max-w-[9rem]">{session.user?.email}</div>
              </div>
              <button
                onClick={() => {
                  dispatch(logout())
                  navigate('/login')
                }}
                className="desk-tab p-2 rounded-ticket text-paper-100/65 hover:text-paper-100"
                title="Sign out"
                aria-label="Sign out"
              >
                <Icon name="logout" />
              </button>
            </div>
          </div>
        </aside>

        {/* ---------- Stage ---------- */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          <header className="sticky top-0 z-30 bg-desk-900/90 backdrop-blur border-b border-desk-line">
            <div className="flex items-center gap-3 px-4 sm:px-6 h-14">
              <Link to="/" className="md:hidden flex items-center gap-2">
                <Mark size={26} />
                <span className="font-bold text-paper-50">TradeX</span>
              </Link>
              <StatusLamp status={status} region={region} feed={market.feedStatus} />
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <RegionToggle
                  region={region}
                  onChange={(r) => {
                    dispatch(setRegion(r))
                    dispatch(refreshBook())
                    toast.info(r === 'IN' ? 'Switched to NSE · ₹' : 'Switched to US · $')
                  }}
                />
              </div>
            </div>
            {/* Mobile nav */}
            <nav className="md:hidden flex overflow-x-auto border-t border-desk-line px-2 py-1.5 gap-1" aria-label="Primary mobile">
              {NAV.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) =>
                    `shrink-0 px-3 py-1.5 rounded-ticket text-xs font-medium whitespace-nowrap ${
                      isActive ? 'bg-paper-100/10 text-paper-50' : 'text-paper-100/55'
                    }`
                  }
                >
                  {n.label}
                </NavLink>
              ))}
            </nav>
          </header>
          <main className="flex-1 px-4 sm:px-6 py-6 max-w-[1400px] w-full mx-auto">{children}</main>
          <footer className="px-6 py-4 text-2xs text-paper-100/55 font-mono tracking-wide">
            TRADEX · VIRTUAL FUNDS ONLY — NO REAL MONEY · DEMO FEED SIMULATES MARKET DATA
          </footer>
        </div>
      </div>

      {/* Mobile bottom nav */}
      <VerificationModal session={session} />
      <SearchPalette
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        universe={universe}
        quotes={market.quotes}
        region={region}
      />
    </div>
  )
}

function StatusLamp({ status, region, feed }) {
  const map = {
    OPEN: { c: 'bg-buy-mark', label: 'MARKET OPEN' },
    PRE_OPEN: { c: 'bg-warn-mark', label: 'PRE-OPEN' },
    CLOSED: { c: 'bg-sell-mark', label: 'MARKET CLOSED' }
  }
  const s = map[status]
  return (
    <div className="flex items-center gap-2 font-mono text-2xs tracking-wider text-paper-100/60">
      <span className={`w-2 h-2 rounded-full ${s.c} ${status !== 'CLOSED' ? 'animate-chase' : ''}`} aria-hidden />
      {region === 'IN' ? 'NSE' : 'US'} · {s.label}
      <span className="text-paper-100/60 hidden sm:inline">· FEED {feed === 'live' ? 'LIVE' : 'DEGRADED'}</span>
    </div>
  )
}

function RegionToggle({ region, onChange }) {
  return (
    <div className="flex rounded-ticket border border-desk-line overflow-hidden font-mono text-2xs" role="group" aria-label="Market region">
      {['IN', 'US'].map((r) => (
        <button
          key={r}
          onClick={() => onChange(r)}
          className={`px-2.5 py-1.5 transition-colors ${region === r ? 'bg-paper-100 text-desk-900 font-semibold' : 'text-paper-100/65 hover:text-paper-100'}`}
          aria-pressed={region === r}
        >
          {REGION_LABEL[r]}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Ticker tape — the exchange's quotation board, always running

export function TickerTape({ quotes, region }) {
  const items = useMemo(() => {
    return Object.values(quotes)
      .filter((q) => bySymbol(q.symbol)?.region === region)
      .sort((a, b) => a.symbol.localeCompare(b.symbol))
  }, [quotes, region])

  if (!items.length) return <div className="h-9 bg-desk-950 border-b border-desk-line" />

  const Row = ({ ariaHidden }) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((q) => (
        <Link
          key={q.symbol}
          to={`/stock/${q.symbol}`}
          className="flex items-center gap-2 px-4 py-2 hover:bg-paper-100/5 transition-colors"
          tabIndex={ariaHidden ? -1 : 0}
        >
          <span className="font-mono text-2xs tracking-wider text-paper-100/70">{q.symbol}</span>
          <span className="num text-2xs text-paper-50">{q.price.toFixed(2)}</span>
          <DeltaPct value={((q.price - q.prevClose) / q.prevClose) * 100} className="text-2xs" />
        </Link>
      ))}
    </div>
  )

  return (
    <div
      className="h-9 bg-desk-950 border-b border-desk-line overflow-hidden flex items-center tape-mask"
      role="marquee"
      aria-label="Live quotes"
    >
      <div className="flex animate-marquee w-max">
        <Row />
        <Row ariaHidden />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Search palette

function SearchPalette({ open, onClose, universe, quotes, region }) {
  const [q, setQ] = useState('')
  const inputRef = useRef(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()

  useEffect(() => {
    if (open) {
      setQ('')
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    if (open) window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const term = q.trim().toLowerCase()
  const results = universe
    .filter((s) => !term || s.symbol.toLowerCase().includes(term) || s.name.toLowerCase().includes(term))
    .slice(0, 8)

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] bg-desk-950/70 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Search stocks">
      <div className="paper rounded-ticket shadow-paper-lift w-[min(92vw,560px)] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-rule/60">
          <Icon name="search" className="text-ink-muted" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search symbol or company…"
            className="flex-1 bg-transparent outline-none text-sm text-ink placeholder:text-ink-muted"
          />
          <kbd className="font-mono text-2xs text-ink-muted border border-rule rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <ul className="max-h-[46vh] overflow-auto ruled-rows">
          {results.length === 0 && <li className="px-4 py-6 text-sm text-ink-secondary text-center">No matches for “{q}”.</li>}
          {results.map((s) => {
            const quote = quotes[s.symbol]
            return (
              <li key={s.symbol}>
                <button
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-rule/12 transition-colors text-left"
                  onClick={() => {
                    navigate(`/stock/${s.symbol}`)
                    onClose()
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-xs font-medium text-ink">{s.symbol}</div>
                    <div className="text-2xs text-ink-secondary truncate">{s.name}</div>
                  </div>
                  {quote && (
                    <>
                      <LivePrice quote={quote} region={region} className="text-xs" />
                      <DeltaPct value={((quote.price - quote.prevClose) / quote.prevClose) * 100} className="text-2xs w-14 text-right" />
                    </>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
function VerificationModal({ session }) {
  const dispatch = useDispatch()
  const [sending, setSending] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  if (!session.user || session.user.isVerified || session.skippedVerification) return null

  const handleResend = async () => {
    setSending(true)
    try {
      await resendVerification()
      toast.success('Verification email sent! Check your inbox.')
    } catch (err) {
      toast.error(err.message || 'Failed to send email.')
    } finally {
      setSending(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await dispatch(refreshUser()).unwrap()
    } catch (err) {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-desk-950/90 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="paper rounded-ticket shadow-paper-lift max-w-md w-full border border-warn-mark/30 overflow-hidden">
        <div className="bg-warn-mark/10 p-5 text-center border-b border-rule/60">
          <div className="w-12 h-12 bg-warn-mark/20 text-warn-text rounded-full flex items-center justify-center mx-auto mb-3">
            <Icon name="mail" size={24} />
          </div>
          <h2 className="text-lg font-bold text-ink">Verify your email</h2>
          <p className="text-sm text-ink-secondary mt-1">
            We sent a verification link to <strong className="text-ink">{session.user.email}</strong>
          </p>
        </div>
        
        <div className="p-5 space-y-4">
          <p className="text-sm text-ink-secondary text-center leading-relaxed">
            You must verify your email address before you can place trades or access secure features.
          </p>
          
          <div className="space-y-2 pt-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-full desk-tab bg-buy-text text-paper-50 font-bold py-2.5 rounded-ticket shadow-paper hover:shadow-paper-lift transition-all disabled:opacity-70"
            >
              {refreshing ? 'Checking...' : 'I have verified my email'}
            </button>
            <button
              onClick={handleResend}
              disabled={sending}
              className="w-full desk-tab bg-transparent border border-rule text-ink-secondary hover:text-ink hover:border-rule-strong font-semibold py-2.5 rounded-ticket transition-all disabled:opacity-70"
            >
              {sending ? 'Sending...' : 'Resend verification email'}
            </button>
          </div>
          
          <div className="border-t border-rule/60 pt-4 mt-2">
            <button
              onClick={() => dispatch(setSkipVerification(true))}
              className="w-full text-center text-xs text-ink-muted hover:text-ink-secondary transition-colors underline decoration-rule hover:decoration-ink-secondary underline-offset-4"
            >
              Skip for now and explore the app
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
