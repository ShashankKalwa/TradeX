const axios = require('axios');
const { finnhub, marketData } = require('../../config/env');
const logger = require('../../config/logger');

/**
 * Secondary provider (same interface as the FYERS provider). Used when FYERS
 * auth fails, or when no broker account is configured at all.
 *
 * Unlike FYERS, this needs only a free API key — so it is the realistic
 * fallback for a deployment without a demat account.
 */
const client = axios.create({
  baseURL: 'https://finnhub.io/api/v1',
  timeout: marketData.timeoutMs
});

const assertConfigured = () => {
  if (!finnhub.apiKey) {
    const err = new Error('FINNHUB_API_KEY is not configured');
    err.code = 'PROVIDER_NOT_CONFIGURED';
    throw err;
  }
};

const getQuote = async (symbol) => {
  assertConfigured();

  const { data } = await client.get('/quote', { params: { symbol, token: finnhub.apiKey } });

  // Finnhub signals "unknown symbol" with an all-zero payload rather than a 404.
  if (!data || (data.c === 0 && data.pc === 0)) {
    const err = new Error(`No quote available for ${symbol}`);
    err.code = 'SYMBOL_NOT_FOUND';
    throw err;
  }

  logger.debug(`Finnhub quote for ${symbol}: ${data.c}`);
  return {
    symbol,
    price: data.c,
    prevClose: data.pc,
    change: data.d,
    changePercent: data.dp,
    currency: 'USD',
    exchange: 'US',
    source: 'finnhub',
    stale: false,
    timestamp: Date.now()
  };
};

const RESOLUTION_MAP = { '1': '1', '5': '5', '15': '15', '60': '60', D: 'D', W: 'W', M: 'M' };

const getHistorical = async (symbol, { from, to, resolution = 'D' } = {}) => {
  assertConfigured();

  const now = Math.floor(Date.now() / 1000);
  const { data } = await client.get('/stock/candle', {
    params: {
      symbol,
      resolution: RESOLUTION_MAP[resolution] || 'D',
      from: from ? Math.floor(new Date(from).getTime() / 1000) : now - 90 * 86400,
      to: to ? Math.floor(new Date(to).getTime() / 1000) : now,
      token: finnhub.apiKey
    }
  });

  if (!data || data.s === 'no_data') {
    return { symbol, resolution, source: 'finnhub', candles: [] };
  }

  const candles = data.t.map((timestamp, i) => ({
    timestamp: timestamp * 1000,
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close: data.c[i],
    volume: data.v[i]
  }));

  return { symbol, resolution, source: 'finnhub', candles };
};

const supportsStreaming = () => false; // needs a websocket client; polling is used instead
const subscribeTicks = async () => {
  throw new Error('The Finnhub adapter does not implement streaming');
};

module.exports = { name: 'finnhub', getQuote, getHistorical, subscribeTicks, supportsStreaming };
