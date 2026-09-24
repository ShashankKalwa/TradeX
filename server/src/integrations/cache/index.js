const createMemoryCache = require('./memoryCache');
const logger = require('../../config/logger');
const { env } = require('../../config/env');

/**
 * Cache factory. The business logic only ever sees get/set/del, so swapping the
 * in-process cache for a shared Redis cache is a config change, not a refactor.
 *
 * Redis is optional: REDIS_URL is honoured only when the `redis` client is
 * actually installed, and an unavailable Redis degrades to memory rather than
 * taking the API down over a cache.
 */
const createCache = () => {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) return createMemoryCache();

  try {
    // Required lazily: the package is optional, and a missing module must not
    // break boot for deployments that intentionally run cache-less.
    // eslint-disable-next-line global-require
    const createRedisCache = require('./redisCache');
    logger.info('Using Redis cache adapter');
    return createRedisCache(redisUrl);
  } catch (err) {
    logger.warn(`REDIS_URL is set but the redis adapter is unavailable (${err.message}); using in-memory cache`);
    return createMemoryCache();
  }
};

let instance;

/** Shared cache instance (created on first use). */
const cache = () => {
  if (!instance) instance = createCache();
  return instance;
};

/** Replace the shared cache — used by tests to isolate state. */
const setCache = (next) => {
  instance = next;
};

module.exports = { cache, setCache, createMemoryCache, isTest: env === 'test' };
