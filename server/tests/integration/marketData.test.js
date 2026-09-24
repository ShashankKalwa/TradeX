const { getQuote, setProvider, resetProvider } = require('../../src/integrations/marketDataProvider');
const { cache } = require('../../src/integrations/cache');

beforeEach(() => {
  cache().flushAll();
});
afterEach(() => {
  resetProvider();
});

test('market data degradation serves stale price on failure', async () => {
  // First, succeed
  setProvider({
    name: 'success',
    getQuote: async () => ({ price: 100 })
  });
  const q1 = await getQuote('AAPL');
  expect(q1.price).toBe(100);
  expect(q1.stale).toBe(false);

  // Now, clear cache of the primary key but keep the stale key, simulating expiration
  cache().del('quote:AAPL');

  // Now, fail
  setProvider({
    name: 'fail',
    getQuote: async () => { throw new Error('network down'); }
  });
  const q2 = await getQuote('AAPL');
  expect(q2.price).toBe(100);
  expect(q2.stale).toBe(true);
});
