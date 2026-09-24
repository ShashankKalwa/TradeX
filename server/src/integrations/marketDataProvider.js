const { cache } = require('./cache');
const { marketData, env } = require('../config/env');
const logger = require('../config/logger');
const { Errors } = require('../utils/errors');
const mockProvider = require('./providers/mockProvider');
const yahooFinanceProvider = require('./providers/yahooFinanceProvider');
const finnhubProvider = require('./providers/finnhubProvider');

/**
 * The market-data boundary. Callers ask for a quote and never learn which
 * provider answered, whether it came from cache, or whether the feed is down.
 *
 * Order of resolution for a quote:
 *   1. fresh cache hit                      -> returned as-is
 *   2. primary provider, then fallback      -> cached and returned
 *   3. last-known price for that symbol     -> returned with stale: true
 *   4. nothing at all                       -> 503 PRICE_UNAVAILABLE
 *
 * Step 3 is the important one: an outage in an external feed must degrade to
 * "this price is old", never to a 500 that makes the whole desk unusable.
 */

let overrideProvider = null;

/** Tests (and future providers) can pin the provider rather than hit the network. */
const setProvider = (provider) => {
  overrideProvider = provider;
};
const resetProvider = () => {
  overrideProvider = null;
};

const quoteCacheKey = (symbol) => `quote:${symbol}`;
const staleCacheKey = (symbol) => `stale:quote:${symbol}`;
const candleCacheKey = (symbol, resolution, from, to) => `candles:${symbol}:${resolution}:${from || ''}:${to || ''}`;

/** Which providers to try, in order, for this deployment. */
const providerChain = () => {
  if (overrideProvider) return [overrideProvider];

  const { provider } = marketData;

  if (provider === 'mock') return [mockProvider];
  if (provider === 'yahoo') return [yahooFinanceProvider, mockProvider];
  if (provider === 'finnhub') return [finnhubProvider, mockProvider];

  // auto: use whatever is actually configured, always with the offline mock as a last resort.
  return [yahooFinanceProvider, finnhubProvider, mockProvider];
};

/** Provider names, in the order they would be tried — surfaced on /health. */
const describeProviders = () => providerChain().map((p) => p.name);

const getQuote = async (symbol) => {
  const normalized = String(symbol || '').toUpperCase();
  if (!normalized) throw Errors.badRequest('Symbol is required', 'SYMBOL_REQUIRED');

  const store = cache();

  const fresh = await store.get(quoteCacheKey(normalized));
  if (fresh) return fresh;

  let lastError;
  for (const provider of providerChain()) {
    try {
      const quote = await provider.getQuote(normalized);
      if (!quote || !Number.isFinite(quote.price)) throw new Error('provider returned no price');

      const enriched = { ...quote, symbol: normalized, stale: false };
      await store.set(quoteCacheKey(normalized), enriched, marketData.quoteTtlSeconds);
      // Keep a longer-lived copy purely so an outage has something to serve.
      await store.set(staleCacheKey(normalized), enriched, marketData.staleTtlSeconds);
      return enriched;
    } catch (err) {
      lastError = err;
      logger.warn(`Market provider ${provider.name} failed for ${normalized}: ${err.message}`);
    }
  }

  const stale = await store.get(staleCacheKey(normalized));
  if (stale) {
    logger.warn(`Serving stale price for ${normalized} (all providers failed)`);
    return { ...stale, stale: true, staleSince: stale.timestamp };
  }

  logger.error(`No price available for ${normalized}: ${lastError ? lastError.message : 'no providers configured'}`);
  throw Errors.priceUnavailable(normalized);
};

const getHistorical = async (symbol, options = {}) => {
  const normalized = String(symbol || '').toUpperCase();
  const { resolution = 'D', from, to } = options;
  const store = cache();
  const key = candleCacheKey(normalized, resolution, from, to);

  const cached = await store.get(key);
  if (cached) return cached;

  for (const provider of providerChain()) {
    try {
      const result = await provider.getHistorical(normalized, options);
      if (result && Array.isArray(result.candles) && result.candles.length) {
        await store.set(key, result, marketData.candleTtlSeconds);
        return result;
      }
    } catch (err) {
      logger.warn(`Historical fetch failed via ${provider.name} for ${normalized}: ${err.message}`);
    }
  }

  throw Errors.priceUnavailable(normalized);
};

/**
 * Tick subscription for the socket layer. Providers with a real push feed
 * (none configured today) are used directly; otherwise the caller polls
 * getQuote on an interval, which keeps the socket layer provider-agnostic.
 */
const supportsStreaming = () => providerChain().some((p) => p.supportsStreaming && p.supportsStreaming());

const subscribeTicks = async (symbols, onTick) => {
  const provider = providerChain().find((p) => p.supportsStreaming && p.supportsStreaming());
  if (!provider) throw new Error('No streaming provider is configured');
  return provider.subscribeTicks(symbols, onTick);
};

module.exports = {
  getQuote,
  getHistorical,
  subscribeTicks,
  supportsStreaming,
  describeProviders,
  setProvider,
  resetProvider,
  isMockOnly: () => env !== 'production' && providerChain().length === 1 && providerChain()[0].name === 'mock'
};
