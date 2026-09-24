const NodeCache = require('node-cache');

/**
 * In-memory TTL cache. Implements the same tiny surface as the Redis adapter,
 * so the two are interchangeable without touching callers:
 *   get(key), set(key, value, ttlSeconds), del(key), flush()
 *
 * `useClones: false` keeps object identity for read-heavy paths, and a
 * `checkperiod` of 0 disables the sweep timer in tests so Jest can exit cleanly.
 */
const createMemoryCache = ({ checkperiod = 60 } = {}) => {
  const store = new NodeCache({ stdTTL: 0, checkperiod, useClones: false });

  return {
    kind: 'memory',
    async get(key) {
      const hit = store.get(key);
      return hit === undefined ? null : hit;
    },
    async set(key, value, ttlSeconds) {
      store.set(key, value, ttlSeconds);
    },
    async del(key) {
      store.del(key);
    },
    async flush() {
      store.flushAll();
    }
  };
};

module.exports = createMemoryCache;
