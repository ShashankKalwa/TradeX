// Deterministic PRNG + random-walk generators.
// Deterministic per (symbol, kind) so charts and the ledger reconcile on reload.

export function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function hashString(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

// Box-Muller normal from a uniform generator
export function gauss(rand) {
  const u = Math.max(rand(), 1e-9)
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/**
 * Generate OHLC candles walking BACKWARD from `endPrice` so the series
 * always terminates exactly at the live price.
 * Returns ascending-by-time array [{ t, o, h, l, c, v }].
 */
export function candlesBackward({ seedKey, endPrice, count, stepMs, vol, drift = 0 }) {
  const rand = mulberry32(hashString(seedKey))
  const closes = [endPrice]
  for (let i = 1; i < count; i++) {
    const shock = gauss(rand) * vol
    const prev = closes[i - 1] * (1 - drift + shock)
    closes.push(Math.max(prev, 0.05))
  }
  closes.reverse() // ascending in time, last === endPrice
  const now = Date.now()
  const out = []
  for (let i = 0; i < count; i++) {
    const c = closes[i]
    const o = i === 0 ? c * (1 + gauss(rand) * vol * 0.4) : closes[i - 1]
    const spread = Math.abs(c - o) + c * vol * (0.3 + rand() * 0.7)
    const h = Math.max(o, c) + spread * rand() * 0.6
    const l = Math.max(Math.min(o, c) - spread * rand() * 0.6, 0.01)
    out.push({
      t: now - (count - 1 - i) * stepMs,
      o,
      h,
      l,
      c,
      v: Math.round(50000 * (0.4 + rand() * 1.6))
    })
  }
  return out
}

/** Simple sparkline path values: `count` closes ending at endPrice. */
export function sparkSeries({ seedKey, endPrice, count = 24, vol = 0.012, drift = 0 }) {
  return candlesBackward({ seedKey, endPrice, count, stepMs: 3600e3, vol, drift }).map((d) => d.c)
}
