const db = require('../helpers/db');
const { createUserWithPortfolio, seedUniverse } = require('../helpers/fixtures');

const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const resolvePendingOrders = require('../../src/jobs/orderResolver');
const tradingEngineService = require('../../src/services/tradingEngineService');
const Order = require('../../src/models/Order');
const Transaction = require('../../src/models/Transaction');

/** The resolver decides when a resting order becomes a trade. */
describe('order resolver — trigger conditions', () => {
  const { shouldTrigger } = resolvePendingOrders;

  it.each([
    ['limit buy triggers at or below target', { orderType: 'limit', direction: 'buy', targetPrice: 100 }, 99, true],
    ['limit buy does not trigger above target', { orderType: 'limit', direction: 'buy', targetPrice: 100 }, 101, false],
    ['limit buy triggers exactly at target', { orderType: 'limit', direction: 'buy', targetPrice: 100 }, 100, true],
    ['limit sell triggers at or above target', { orderType: 'limit', direction: 'sell', targetPrice: 100 }, 101, true],
    ['limit sell does not trigger below target', { orderType: 'limit', direction: 'sell', targetPrice: 100 }, 99, false],
    ['stop sell triggers at or below target', { orderType: 'stop', direction: 'sell', targetPrice: 100 }, 99, true],
    ['stop sell does not trigger above target', { orderType: 'stop', direction: 'sell', targetPrice: 100 }, 101, false],
    ['stop buy triggers at or above target', { orderType: 'stop', direction: 'buy', targetPrice: 100 }, 101, true],
    ['stop buy does not trigger below target', { orderType: 'stop', direction: 'buy', targetPrice: 100 }, 99, false]
  ])('%s', (_label, order, price, expected) => {
    expect(shouldTrigger(order, price)).toBe(expected);
  });
});

describe('order resolver — execution', () => {
  let prices;

  beforeAll(async () => {
    await db.connect();
  });

  afterAll(async () => {
    await db.disconnect();
  });

  beforeEach(async () => {
     await db.clearDatabase();
  await seedUniverse();
    prices = { AAA: 100 };
    marketDataProvider.setProvider({
      name: 'fake',
      getQuote: async (symbol) => {
        if (prices[symbol] === undefined) {
          const err = new Error('no price');
          err.code = 'SYMBOL_NOT_FOUND';
          throw err;
        }
        return { symbol, price: prices[symbol], prevClose: prices[symbol], source: 'fake', stale: false, timestamp: Date.now() };
      },
      getHistorical: async () => ({ candles: [] }),
      supportsStreaming: () => false
    });
    await cache().flush();
  });

  afterEach(() => marketDataProvider.resetProvider());

  it('fills a resting buy once the price crosses its limit', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 95, 5);

    // Price is above the limit: nothing should happen yet.
    let summary = await resolvePendingOrders();
    expect(summary.filled).toBe(0);

    prices.AAA = 90;
    await cache().flush();

    summary = await resolvePendingOrders();
    expect(summary.filled).toBe(1);
    expect(await Transaction.countDocuments({ userId: user._id })).toBe(1);

    const order = await Order.findOne({ userId: user._id });
    expect(order.status).toBe('filled');
    expect(order.filledPrice).toBe(90);
  });

  it('leaves a resting order pending while its condition is unmet', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 50, 5);

    const summary = await resolvePendingOrders();

    expect(summary.filled).toBe(0);
    expect(summary.claimed).toBe(0);
    expect((await Order.findOne({ userId: user._id })).status).toBe('pending');
  });

  it('cancels a triggered order the account can no longer afford', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100 });
    await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 200, 5);

    prices.AAA = 150;
    await cache().flush();

    const summary = await resolvePendingOrders();

    expect(summary.cancelled).toBe(1);
    expect((await Order.findOne({ userId: user._id })).status).toBe('cancelled');
    expect(await Transaction.countDocuments({ userId: user._id })).toBe(0);
  });

  it('does not fill the same order twice across consecutive cycles', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 3);

    const first = await resolvePendingOrders();
    const second = await resolvePendingOrders();

    expect(first.filled).toBe(1);
    expect(second.filled).toBe(0);
    expect(await Transaction.countDocuments({ userId: user._id })).toBe(1);
  });

  it('skips orders whose symbol cannot be priced, leaving them pending', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 1);
    await Order.updateOne({ userId: user._id }, { $set: { symbol: 'GONE' } });

    const summary = await resolvePendingOrders();

    expect(summary.filled).toBe(0);
    expect((await Order.findOne({ userId: user._id })).status).toBe('pending');
  });

  it('reports orders stranded in processing', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 1);
    await Order.updateOne(
      { _id: order._id },
      { $set: { status: 'processing', processingAt: new Date(Date.now() - 60 * 60e3) } }
    );

    expect(await resolvePendingOrders.reportStuckOrders(15)).toBe(1);
  });
});
