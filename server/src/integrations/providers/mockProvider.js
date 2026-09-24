const { round2 } = require('../../utils/money');

/**
 * Development provider. Needs no credentials, so a fresh clone boots and trades
 * immediately — the default when no broker/API key is configured.
 *
 * Prices are derived from the symbol (stable base) plus a persistent per-symbol
 * random walk, so a symbol keeps a coherent price across calls and still moves
 * between them, the way a live feed would.
 */
const state = new Map();

const hashSymbol = (symbol) => {
  let hash = 2166136261;
  for (let i = 0; i < symbol.length; i += 1) {
    hash ^= symbol.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};

const basePriceFor = (symbol) => round2(50 + hashSymbol(symbol) * 950);

const priceFor = (symbol) => {
  const existing = state.get(symbol);
  if (existing) return existing.price;

  const base = basePriceFor(symbol);
  const price = round2(base * (0.97 + Math.random() * 0.06));
  state.set(symbol, { price, prevClose: base });
  return price;
};

const getQuote = async (symbol) => {
  const previous = priceFor(symbol);
  // Mean-reverting walk around the symbol's base, so prices wander without drifting away.
  const base = basePriceFor(symbol);
  const drift = (base - previous) * 0.02;
  const shock = (Math.random() - 0.5) * base * 0.004;
  const price = round2(Math.max(1, previous + drift + shock));

  const entry = state.get(symbol);
  entry.price = price;

  const { prevClose } = entry;
  return {
    symbol,
    price,
    prevClose: round2(prevClose),
    change: round2(price - prevClose),
    changePercent: round2(((price - prevClose) / prevClose) * 100),
    currency: 'INR',
    exchange: 'NSE',
    source: 'mock',
    stale: false,
    timestamp: Date.now()
  };
};

/** Deterministic candles walking backward from the current price. */
const getHistorical = async (symbol, { from, to, resolution = 'D' } = {}) => {
  const current = priceFor(symbol);
  const stepMs = { '1': 60e3, '5': 5 * 60e3, '15': 15 * 60e3, '60': 3600e3, D: 86400e3 }[resolution] || 86400e3;
  const start = from ? new Date(from).getTime() : Date.now() - 89 * stepMs;
  const end = to ? new Date(to).getTime() : Date.now();
  const count = Math.max(1, Math.min(500, Math.round((end - start) / stepMs) + 1));

  const candles = [];
  let close = current;
  for (let i = count - 1; i >= 0; i -= 1) {
    const open = round2(close * (1 + (Math.random() - 0.5) * 0.01));
    const high = round2(Math.max(open, close) * (1 + Math.random() * 0.008));
    const low = round2(Math.min(open, close) * (1 - Math.random() * 0.008));
    candles.unshift({
      timestamp: end - i * stepMs,
      open,
      high,
      low,
      close,
      volume: Math.round(100000 + Math.random() * 900000)
    });
    close = open;
  }

  return { symbol, resolution, source: 'mock', candles };
};

/** The mock feed has no push channel; the socket layer polls getQuote instead. */
const supportsStreaming = () => false;
const subscribeTicks = async () => {
  throw new Error('The mock provider does not support streaming');
};

module.exports = { name: 'mock', getQuote, getHistorical, subscribeTicks, supportsStreaming };
