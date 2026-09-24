import { useEffect, useRef, useState } from 'react'
import { pct, signed } from '../lib/format.js'
import Icon from './Icon.jsx'

// ---------------------------------------------------------------------------
// Figures

function moneySafe(v, region, compact, dp) {
  if (v == null || Number.isNaN(v)) return '—'
  const locale = region === 'IN' ? 'en-IN' : 'en-US'
  const cur = region === 'IN' ? 'INR' : 'USD'
  if (compact) {
    return new Intl.NumberFormat(locale, { style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 2 }).format(v)
  }
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: cur,
    minimumFractionDigits: dp ?? 2,
    maximumFractionDigits: dp ?? 2
  }).format(v)
}

/** Signed delta with direction color. Color never carries the meaning alone — the sign does. */
export function Delta({ value, region, className = '' }) {
  const up = value >= 0
  const color = value === 0 ? 'text-ink-secondary' : up ? 'text-buy-text' : 'text-sell-text'
  const arrow = value === 0 ? '' : up ? '▲' : '▼'
  return (
    <span className={`num text-2xs sm:text-xs font-medium ${color} ${className}`} title={`${pct(value)} vs previous close`}>
      {arrow && <span className="mr-0.5 text-[0.7em]" aria-hidden>{arrow}</span>}
      {signed(value, region)}
    </span>
  )
}

export function DeltaPct({ value, className = '' }) {
  const up = value >= 0
  const color = value === 0 ? 'text-ink-secondary' : up ? 'text-buy-text' : 'text-sell-text'
  return (
    <span className={`num text-xs font-medium ${color} ${className}`}>
      {up ? '+' : '−'}
      {Math.abs(value).toFixed(2)}%
    </span>
  )
}

// ---------------------------------------------------------------------------
// Live price — flashes green/red on each tick (the market breathing)

export function LivePrice({ quote, region, className = '' }) {
  const prev = useRef(quote?.price)
  const [flash, setFlash] = useState('')
  useEffect(() => {
    if (!quote) return
    if (prev.current != null && quote.price !== prev.current) {
      setFlash(quote.price > prev.current ? 'animate-flash-up' : 'animate-flash-down')
      const t = setTimeout(() => setFlash(''), 950)
      prev.current = quote.price
      return () => clearTimeout(t)
    }
    prev.current = quote.price
  }, [quote?.price])
  return (
    <span className={`num inline-block rounded px-1 -mx-1 ${flash} ${className}`}>
      {moneySafe(quote?.price, region)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Status vocabulary

const STATUS_STYLE = {
  PENDING: 'bg-warn-text/10 text-warn-text border-warn-text/40',
  TRIGGERED: 'bg-accent-text/10 text-accent-text border-accent-text/40',
  FILLED: 'bg-buy-text/10 text-buy-text border-buy-text/40',
  CANCELLED: 'bg-ink-muted/15 text-ink-secondary border-ink-muted/40',
  REJECTED: 'bg-sell-text/10 text-sell-text border-sell-text/40',
  EXPIRED: 'bg-ink-muted/15 text-ink-secondary border-ink-muted/40',
  BUY: 'bg-buy-text/10 text-buy-text border-buy-text/40',
  SELL: 'bg-sell-text/10 text-sell-text border-sell-text/40',
  CASH: 'bg-ink-muted/15 text-ink-secondary border-ink-muted/40',
  DIV: 'bg-buy-text/10 text-buy-text border-buy-text/40'
}

// An unrecognised label renders in plain ink so a missing style is visible as a
// gap rather than masquerading as a real state.
const UNKNOWN_STYLE = 'bg-transparent text-ink-secondary border-rule-strong'

export function Tag({ label, className = '' }) {
  const style = STATUS_STYLE[label] || UNKNOWN_STYLE
  return (
    <span className={`inline-block border rounded-ticket px-1.5 py-px font-mono text-2xs font-medium tracking-wide ${style} ${className}`}>
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Structure

export function Paper({ as: Tag_ = 'section', className = '', ticket = false, children, ...rest }) {
  return (
    <Tag_ className={`paper ${ticket ? 'paper-ticket' : ''} rounded-ticket shadow-paper ${className}`} {...rest}>
      {children}
    </Tag_>
  )
}

export function PaperHead({ title, right, sub }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 pt-3.5 pb-3 border-b border-rule/60">
      <div>
        <h2 className="text-sm font-semibold tracking-wide uppercase text-ink">{title}</h2>
        {sub && <p className="text-2xs text-ink-muted mt-0.5">{sub}</p>}
      </div>
      {right && <div className="flex items-center gap-2 shrink-0">{right}</div>}
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton-row rounded-ticket ${className}`} aria-hidden />
}

/** Empty states teach the interface. `icon` names an authored icon, never a glyph. */
export function EmptyState({ icon = 'blotter', title, body, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      <div className="w-12 h-12 rounded-full border-2 border-dashed border-rule-strong/70 flex items-center justify-center text-ink-muted mb-3">
        <Icon name={icon} size={20} />
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {body && <p className="text-xs text-ink-secondary mt-1 max-w-[42ch]">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/** Section heading on the desk chrome (dark) side */
export function DeskHeading({ children, right }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-4">
      <h1 className="text-lg font-bold text-paper-100 tracking-tight">{children}</h1>
      {right}
    </div>
  )
}
