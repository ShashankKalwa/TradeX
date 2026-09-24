import { useMemo, useRef, useState, useEffect } from 'react'

// Charts are hand-drawn SVG on the paper surface, following one mark system:
// 2px lines with round joins, hairline solid grids, area fills as ~10% washes,
// end-markers >=8px with a 2px paper ring, crosshair + tooltip on lines.

const INK = '#241f1a'
const INK_MUTED = '#6f6552'
const GRID = 'rgba(169,154,120,0.35)'
const BUY_MARK = '#0a7d54'
const SELL_MARK = '#b04a37'
const LINE = '#1a5fa8'
const PAPER = '#ece4d4'

function pathFrom(points, w, h, min, max, pad = 2) {
  const span = max - min || 1
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w
      const y = pad + (1 - (p - min) / span) * (h - pad * 2)
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    })
    .join(' ')
}

// ---------------------------------------------------------------------------
// Sparkline — de-emphasis trend, no axes

export function Sparkline({ values, up, w = 96, h = 28, className = '' }) {
  const d = useMemo(() => {
    if (!values || values.length < 2) return null
    const min = Math.min(...values)
    const max = Math.max(...values)
    return pathFrom(values, w, h, min, max)
  }, [values, w, h])
  if (!d) return <span className="num text-ink-muted text-xs">—</span>
  const color = up ? BUY_MARK : SELL_MARK
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className={className} aria-hidden focusable="false">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Price chart — candles or line, crosshair + tooltip, hairline grid

export function PriceChart({ candles, mode = 'candle', height = 260, refPrice }) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(720)
  const [hover, setHover] = useState(null) // { i, x, y }

  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => setW(Math.max(320, es[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const padL = 8
  const padR = 64
  const padT = 10
  const padB = 22
  const iw = w - padL - padR
  const ih = height - padT - padB

  const { min, max } = useMemo(() => {
    if (!candles?.length) return { min: 0, max: 1 }
    const lows = candles.map((c) => c.l)
    const highs = candles.map((c) => c.h)
    let lo = Math.min(...lows)
    let hi = Math.max(...highs)
    if (refPrice) {
      lo = Math.min(lo, refPrice)
      hi = Math.max(hi, refPrice)
    }
    const m = (hi - lo) * 0.06 || 1
    return { min: lo - m, max: hi + m }
  }, [candles, refPrice])

  const y = (v) => padT + (1 - (v - min) / (max - min || 1)) * ih
  const x = (i) => padL + (i / Math.max(candles.length - 1, 1)) * iw
  const closes = candles?.map((c) => c.c) || []
  const last = closes[closes.length - 1]

  // 4 clean gridlines
  const ticks = useMemo(() => {
    const out = []
    for (let i = 0; i <= 4; i++) out.push(min + ((max - min) * i) / 4)
    return out
  }, [min, max])

  const fmtP = (v) => (v >= 1000 ? v.toFixed(0) : v.toFixed(2))

  const hoveredCandle = hover != null ? candles[hover.i] : null

  if (!candles?.length) {
    return (
      <div ref={wrapRef} className="w-full flex items-center justify-center text-xs text-ink-muted" style={{ height }}>
        Loading price history…
      </div>
    )
  }

  return (
    <div ref={wrapRef} className="relative w-full select-none" style={{ height }}>
      <svg
        width={w}
        height={height}
        role="img"
        aria-label={`Price chart, ${candles?.length || 0} bars, last ${fmtP(last)}`}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - rect.left
          const i = Math.round(((px - padL) / iw) * (candles.length - 1))
          if (i >= 0 && i < candles.length) {
            setHover({ i, x: x(i), y: y(candles[i].c) })
          }
        }}
        onPointerLeave={() => setHover(null)}
      >
        {/* grid */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={padL + iw} y1={y(t)} y2={y(t)} stroke={GRID} strokeWidth="1" />
            <text x={padL + iw + 8} y={y(t) + 3.5} fontSize="10" fill={INK_MUTED} fontFamily="'Spline Sans Mono', monospace">
              {fmtP(t)}
            </text>
          </g>
        ))}

        {/* previous close reference */}
        {refPrice != null && (
          <g>
            <line x1={padL} x2={padL + iw} y1={y(refPrice)} y2={y(refPrice)} stroke={INK_MUTED} strokeWidth="1" strokeDasharray="2 4" opacity="0.7" />
            <text x={padL + 2} y={y(refPrice) - 4} fontSize="9.5" fill={INK_MUTED} fontFamily="'Spline Sans Mono', monospace">
              prev close {fmtP(refPrice)}
            </text>
          </g>
        )}

        {mode === 'line' ? (
          <>
            <path d={`${pathFrom(closes, iw, ih, min, max, padT)} L${iw},${padT + ih} L0,${padT + ih} Z`} transform={`translate(${padL},0)`} fill={LINE} opacity="0.1" />
            <path d={pathFrom(closes, iw, ih, min, max, padT)} transform={`translate(${padL},0)`} fill="none" stroke={LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            <circle cx={padL + iw} cy={y(last)} r="4" fill={LINE} stroke={PAPER} strokeWidth="2" />
          </>
        ) : (
          candles.map((c, i) => {
            const up = c.c >= c.o
            const color = up ? BUY_MARK : SELL_MARK
            const bw = Math.max(Math.min((iw / candles.length) * 0.62, 10), 1.6)
            const cx = x(i)
            const yo = y(c.o)
            const yc = y(c.c)
            const top = Math.min(yo, yc)
            const bh = Math.max(Math.abs(yc - yo), 1)
            return (
              <g key={i}>
                <line x1={cx} x2={cx} y1={y(c.h)} y2={y(c.l)} stroke={color} strokeWidth="1" />
                <rect x={cx - bw / 2} y={top} width={bw} height={bh} fill={up ? PAPER : color} stroke={color} strokeWidth="1" />
              </g>
            )
          })
        )}

        {/* last price marker on the right rail */}
        <line x1={padL} x2={padL + iw} y1={y(last)} y2={y(last)} stroke={LINE} strokeWidth="1" opacity="0.35" />
        <rect x={padL + iw + 2} y={y(last) - 8} width={padR - 6} height="16" rx="2" fill={INK} />
        <text x={padL + iw + 6} y={y(last) + 3.5} fontSize="10" fill={PAPER} fontFamily="'Spline Sans Mono', monospace" fontWeight="600">
          {fmtP(last)}
        </text>

        {/* crosshair */}
        {hover && (
          <g>
            <line x1={hover.x} x2={hover.x} y1={padT} y2={padT + ih} stroke={INK_MUTED} strokeWidth="1" />
            <circle cx={hover.x} cy={hover.y} r="4" fill={INK} stroke={PAPER} strokeWidth="2" />
          </g>
        )}
      </svg>

      {/* tooltip */}
      {hoveredCandle && (
        <div
          className="absolute pointer-events-none z-10 num text-2xs bg-ink text-paper-50 rounded-ticket px-2 py-1.5 shadow-paper"
          style={{ left: Math.min(hover.x + 12, w - 150), top: 6 }}
        >
          <div className="text-ink-muted">{new Date(hoveredCandle.t).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false })}</div>
          <div>O {fmtP(hoveredCandle.o)} · H {fmtP(hoveredCandle.h)}</div>
          <div>L {fmtP(hoveredCandle.l)} · C <b>{fmtP(hoveredCandle.c)}</b></div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Portfolio value — area with a single accent, endpoint labeled

export function ValueArea({ points, height = 200 }) {
  const wrapRef = useRef(null)
  const [w, setW] = useState(600)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver((es) => setW(Math.max(280, es[0].contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const { d, area, min, max, first, last, lastPt } = useMemo(() => {
    if (!points?.length) return {}
    const vs = points.map((p) => p.v)
    const lo = Math.min(...vs)
    const hi = Math.max(...vs)
    const m = (hi - lo) * 0.08 || 1
    const min = lo - m
    const max = hi + m
    const pad = 6
    const pts = vs.map((v, i) => [
      (i / (points.length - 1)) * w,
      pad + (1 - (v - min) / (max - min)) * (height - 28 - pad * 2)
    ])
    const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')
    const area = `${d} L${w},${height - 28} L0,${height - 28} Z`
    return { d, area, min, max, first: vs[0], last: vs[vs.length - 1], lastPt: pts[pts.length - 1] }
  }, [points, w, height])

  if (!d) return null
  const up = last >= first
  const color = up ? BUY_MARK : SELL_MARK

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      <svg width={w} height={height} role="img" aria-label="Portfolio value over time">
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={w} y1={(height - 28) * f + 6} y2={(height - 28) * f + 6} stroke={GRID} strokeWidth="1" />
        ))}
        <path d={area} fill={color} opacity="0.1" />
        <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {lastPt && <circle cx={lastPt[0]} cy={lastPt[1]} r="4" fill={color} stroke={PAPER} strokeWidth="2" />}
        <text x="0" y={height - 8} fontSize="10" fill={INK_MUTED} fontFamily="'Spline Sans Mono', monospace">
          {new Date(points[0].t).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </text>
        <text x={w} y={height - 8} fontSize="10" fill={INK_MUTED} textAnchor="end" fontFamily="'Spline Sans Mono', monospace">
          {new Date(points[points.length - 1].t).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
        </text>
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sector allocation — horizontal magnitude bars, one hue

export function SectorBars({ weights, accent = LINE }) {
  const max = Math.max(...weights.map((s) => s.pct), 1)
  return (
    <ul className="space-y-2.5">
      {weights.map((s) => (
        <li key={s.sector}>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-xs font-medium text-ink">{s.sector}</span>
            <span className="num text-2xs text-ink-secondary">{s.pct.toFixed(1)}%</span>
          </div>
          <div className="h-2 rounded-ticket bg-rule/25 overflow-hidden" role="presentation">
            <div className="h-full rounded-ticket" style={{ width: `${(s.pct / max) * 100}%`, backgroundColor: accent, opacity: 0.75 }} />
          </div>
        </li>
      ))}
    </ul>
  )
}
