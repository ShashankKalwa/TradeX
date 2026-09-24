// Formatting: Indian quotes group in lakh/crore, US quotes in K/M.

const fmt = (region) =>
  new Intl.NumberFormat(region === 'IN' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: region === 'IN' ? 'INR' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })

const fmtCompact = (region) =>
  new Intl.NumberFormat(region === 'IN' ? 'en-IN' : 'en-US', {
    style: 'currency',
    currency: region === 'IN' ? 'INR' : 'USD',
    notation: 'compact',
    maximumFractionDigits: 2
  })

export function money(v, region, { compact = false } = {}) {
  if (v == null || Number.isNaN(v)) return '—'
  return (compact ? fmtCompact(region) : fmt(region)).format(v)
}

export function num(v, dp = 2) {
  if (v == null || Number.isNaN(v)) return '—'
  return new Intl.NumberFormat('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }).format(v)
}

export function pct(v, dp = 2) {
  if (v == null || Number.isNaN(v)) return '—'
  return `${v >= 0 ? '+' : ''}${v.toFixed(dp)}%`
}

export function signed(v, region) {
  if (v == null || Number.isNaN(v)) return '—'
  const s = fmt(region).format(Math.abs(v))
  return `${v < 0 ? '−' : '+'}${s}`
}

export function dateShort(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })
}

export function dateLong(ts) {
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function timeShort(ts) {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function dateTime(ts) {
  return `${dateShort(ts)} · ${timeShort(ts)}`
}

export function qtyFmt(q) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(q)
}

export const REGION_LABEL = { IN: 'NSE · ₹', US: 'US · $' }
