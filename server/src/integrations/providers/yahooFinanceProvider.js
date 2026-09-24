const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance();
const logger = require('../../config/logger');

// The provider boundary: we append .NS for Indian stocks so the frontend can just use "RELIANCE".
const US_STOCKS = new Set(['AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN']);
const toYahooSymbol = (symbol) => {
  const upper = String(symbol).toUpperCase();
  if (upper.includes('.')) return upper;
  if (US_STOCKS.has(upper)) return upper;
  return `${upper}.NS`;
};

const getQuote = async (symbol) => {
  const query = toYahooSymbol(symbol);
  try {
    const data = await yahooFinance.quote(query);
    if (!data || !data.regularMarketPrice) {
      const err = new Error(`No quote available for ${symbol}`);
      err.code = 'SYMBOL_NOT_FOUND';
      throw err;
    }
    return {
      symbol,
      price: data.regularMarketPrice,
      prevClose: data.regularMarketPreviousClose,
      change: data.regularMarketChange,
      changePercent: data.regularMarketChangePercent,
      currency: data.currency,
      exchange: data.exchange,
      source: 'yahoo-finance2',
      stale: false,
      timestamp: Date.now()
    };
  } catch (err) {
    logger.error(`Yahoo Finance quote failed for ${symbol}: ${err.message}`);
    throw err;
  }
};

const RESOLUTION_MAP = { '1': '1m', '5': '5m', '15': '15m', '60': '60m', D: '1d', W: '1wk', M: '1mo' };

const getHistorical = async (symbol, { from, to, resolution = 'D' } = {}) => {
  const query = toYahooSymbol(symbol);
  const period1 = from ? new Date(from) : new Date(Date.now() - 90 * 86400 * 1000);
  const period2 = to ? new Date(to) : new Date();
  const interval = RESOLUTION_MAP[resolution] || '1d';

  try {
    const data = await yahooFinance.historical(query, { period1, period2, interval });
    const candles = data.map((c) => ({
      timestamp: c.date.getTime(),
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume
    }));
    return { symbol, resolution, source: 'yahoo-finance2', candles };
  } catch (err) {
    logger.error(`Yahoo Finance historical failed for ${symbol}: ${err.message}`);
    throw err;
  }
};

const supportsStreaming = () => false;
const subscribeTicks = async () => {
  throw new Error('The Yahoo Finance adapter does not implement streaming');
};

module.exports = { name: 'yahoo', getQuote, getHistorical, subscribeTicks, supportsStreaming };
