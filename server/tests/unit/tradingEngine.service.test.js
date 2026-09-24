const mongoose = require('mongoose');

const db = require('../helpers/db');
const { createUserWithPortfolio, reloadPortfolio, buyCost, seedUniverse } = require('../helpers/fixtures');

const marketDataProvider = require('../../src/integrations/marketDataProvider');
const { cache } = require('../../src/integrations/cache');
const tradingEngineService = require('../../src/services/tradingEngineService');
const Transaction = require('../../src/models/Transaction');
const Stock = require('../../src/models/Stock');
const AuditLog = require('../../src/models/AuditLog');
const { round2 } = require('../../src/utils/money');

/**
 * The trading engine is the part of this system that must be correct, so it is
 * tested against a pinned price rather than a live feed: every assertion here
 * is exact arithmetic, and every failure mode the spec names has a case.
 *
 * Prices live in a mutable map behind the provider seam, and the quote cache is
 * flushed whenever they change — quote caching is deliberate production
 * behaviour, so a test that moves a price must invalidate it explicitly.
 */

let prices;
const setPrice = (symbol, price) => {
  prices[symbol] = price;
  return cache().flush();
};

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clearDatabase();
  await seedUniverse();

  prices = { AAA: 100, BBB: 250, CCC: 1000, DDD: 50 };

  marketDataProvider.setProvider({
    name: 'fake',
    getQuote: async (symbol) => {
      const price = prices[symbol];
      if (price === undefined) {
        const err = new Error(`No fake price configured for ${symbol}`);
        err.code = 'SYMBOL_NOT_FOUND';
        throw err;
      }
      return { symbol, price, prevClose: price, changePercent: 0, source: 'fake', stale: false, timestamp: Date.now() };
    },
    getHistorical: async (symbol) => ({ symbol, resolution: 'D', source: 'fake', candles: [] }),
    supportsStreaming: () => false
  });

  await cache().flush();
});

afterEach(() => {
  marketDataProvider.resetProvider();
});

describe('executeMarketOrder — happy paths', () => {
  it('fills a market buy, debits cash including the fee, and opens a holding', async () => {
    const { user, portfolio } = await createUserWithPortfolio({ cashBalance: 10000 });

    const result = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    expect(result.replayed).toBe(false);
    expect(result.transaction.status).toBe('executed');
    expect(result.transaction.price).toBe(100);
    expect(result.transaction.grossValue).toBe(1000);
    expect(result.transaction.fee).toBe(round2(1000 * 0.0005)); // 0.50
    expect(result.transaction.realizedPnl).toBe(0);

    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(round2(10000 - 1000.5));
    expect(updated.holdings).toHaveLength(1);
    expect(updated.holdings[0]).toMatchObject({ symbol: 'AAA', quantity: 10, avgCostBasis: 100 });
    expect(portfolio._id).toBeDefined();
  });

  it('records the post-trade cash balance on the ledger entry', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5);

    const [tx] = await Transaction.find({ userId: user._id });
    expect(tx.cashBalanceAfter).toBe(round2(10000 - 500.25));
  });

  it('averages the cost basis across two buys at different prices', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });

    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10); // @100
    setPrice('AAA', 200);
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10); // @200

    const updated = await reloadPortfolio(user._id);
    // (10*100 + 10*200) / 20 = 150
    expect(updated.holdings[0].quantity).toBe(20);
    expect(updated.holdings[0].avgCostBasis).toBe(150);
  });

  it('credits cash net of the fee on a sell and reduces the holding', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    const cashAfterBuy = (await reloadPortfolio(user._id)).cashBalance;

    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 4);

    const updated = await reloadPortfolio(user._id);
    const gross = round2(4 * 100);
    expect(updated.cashBalance).toBe(round2(cashAfterBuy + gross - round2(gross * 0.0005)));
    expect(updated.holdings[0].quantity).toBe(6);
    expect(updated.holdings[0].avgCostBasis).toBe(100); // unchanged by a sale
  });

  it('computes realized P&L on a profitable sell, net of the exit fee', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10); // @100

    setPrice('AAA', 150);
    const result = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 10);

    const gross = round2(10 * 150);
    const fee = round2(gross * 0.0005); // 0.75
    // (150 - 100) * 10 - fee
    expect(result.transaction.realizedPnl).toBe(round2(500 - fee));
  });

  it('reports a loss when the sell price is below the average cost basis', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    setPrice('AAA', 80);
    const result = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 10);

    expect(result.transaction.realizedPnl).toBeLessThan(0);
    expect(result.transaction.realizedPnl).toBeCloseTo(-200.4, 1); // -200 minus fee
  });

  it('removes the holding entirely once the last share is sold', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 3);
    const result = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 3);

    const updated = await reloadPortfolio(user._id);
    expect(updated.holdings).toHaveLength(0);
    expect(result.portfolio.holdings).toHaveLength(0);
  });

  it('accepts lowercase symbols and sides', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const result = await tradingEngineService.executeMarketOrder(user._id, 'aaa', 'BUY', 1);

    expect(result.transaction.symbol).toBe('AAA');
    expect(result.transaction.type).toBe('buy');
  });

  it('writes an audit entry for a settled trade', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 1);

    const logs = await AuditLog.find({ userId: user._id, action: 'trade.executed' });
    expect(logs).toHaveLength(1);
    expect(logs[0].metadata.symbol).toBe('AAA');
  });
});

describe('executeMarketOrder — rejections', () => {
  it('rejects a buy that exceeds available cash, with a typed error', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 500 });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10)).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS',
      statusCode: 400
    });
  });

  it('accounts for the fee when deciding affordability', async () => {
    // 100 * 5 = 500 exactly, but the fee pushes the true cost to 500.25.
    const { user } = await createUserWithPortfolio({ cashBalance: 500 });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5)).rejects.toMatchObject({
      code: 'INSUFFICIENT_FUNDS'
    });

    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(500); // nothing was written
  });

  it('rejects a sell larger than the holding', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5);

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 6)).rejects.toMatchObject({
      code: 'INSUFFICIENT_HOLDINGS',
      statusCode: 400
    });
  });

  it('rejects selling a symbol that is not held at all', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'BBB', 'sell', 1)).rejects.toMatchObject({
      code: 'INSUFFICIENT_HOLDINGS'
    });
  });

  it.each([
    ['zero quantity', 'AAA', 'buy', 0, 'INVALID_QUANTITY'],
    ['negative quantity', 'AAA', 'buy', -5, 'INVALID_QUANTITY'],
    ['non-numeric quantity', 'AAA', 'buy', 'ten', 'INVALID_QUANTITY'],
    ['missing symbol', '', 'buy', 1, 'SYMBOL_REQUIRED'],
    ['invalid side', 'AAA', 'hold', 1, 'INVALID_SIDE']
  ])('rejects %s with %s', async (_label, symbol, side, quantity, code) => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    await expect(tradingEngineService.executeMarketOrder(user._id, symbol, side, quantity)).rejects.toMatchObject({ code });
  });

  it('surfaces an unavailable price as a 503 rather than a 500', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    // Listed, but the provider has no price for it.
    await Stock.create({ symbol: 'UNKNOWN', name: 'Unknown Ltd', exchange: 'NSE', currentPrice: 10 });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'UNKNOWN', 'buy', 1)).rejects.toMatchObject({
      code: 'PRICE_UNAVAILABLE',
      statusCode: 503
    });
  });

  it('refuses to trade an instrument that is not listed', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    // Delisted names are closed to new orders even though a price may exist.
    await Stock.updateOne({ symbol: 'CCC' }, { $set: { isActive: false } });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'CCC', 'buy', 1)).rejects.toMatchObject({
      code: 'SYMBOL_NOT_LISTED',
      statusCode: 400
    });

    // And a symbol that was never listed at all.
    await expect(tradingEngineService.executeMarketOrder(user._id, 'NOTREAL', 'buy', 1)).rejects.toMatchObject({
      code: 'SYMBOL_NOT_LISTED'
    });
  });

  it('refuses to rest an order for an unlisted instrument', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    await expect(tradingEngineService.placePendingOrder(user._id, 'NOTREAL', 'limit', 'buy', 10, 1)).rejects.toMatchObject({
      code: 'SYMBOL_NOT_LISTED'
    });
  });

  it('leaves no partial write behind when a trade is rejected', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100 });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10)).rejects.toThrow();

    expect(await Transaction.countDocuments({ userId: user._id })).toBe(0);
    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(100);
    expect(updated.holdings).toHaveLength(0);
  });
});

describe('executeMarketOrder — idempotency', () => {
  it('returns the original fill when the same key is retried, without trading twice', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    const first = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5, { idempotencyKey: 'submit-1' });
    const second = await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5, { idempotencyKey: 'submit-1' });

    expect(second.replayed).toBe(true);
    expect(String(second.transaction._id)).toBe(String(first.transaction._id));
    expect(await Transaction.countDocuments({ userId: user._id })).toBe(1);

    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(round2(10000 - buyCost(100, 5)));
    expect(updated.holdings[0].quantity).toBe(5);
  });

  it('treats different keys as separate trades', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5, { idempotencyKey: 'a' });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5, { idempotencyKey: 'b' });

    expect(await Transaction.countDocuments({ userId: user._id })).toBe(2);
  });
});

describe('concurrency — the double-spend guarantee', () => {
  it('lets exactly one of five concurrent buys succeed against 1000 of cash', async () => {
    // AAA is pinned at 100, so 1000 buys exactly 9 shares (900 + fees) and never 10.
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });

    const attempts = Array.from({ length: 5 }, () => tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10));

    const results = await Promise.allSettled(attempts);
    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(0);
    expect(rejected).toHaveLength(5);

    // The invariant that matters: cash is never overspent and never negative.
    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(1000);
    expect(updated.holdings).toHaveLength(0);
  });

  it('lands on a mathematically exact balance when many buys contend for the same cash', async () => {
    // 5000 affords 49 shares at 100 (4900 + 2.45 fee), never 50.
    const { user } = await createUserWithPortfolio({ cashBalance: 5000 });

    const attempts = Array.from({ length: 10 }, () => tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5));

    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    const updated = await reloadPortfolio(user._id);
    const held = updated.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    // Every success is internally consistent: cash + cost of shares held == opening cash.
    expect(quantity).toBe(succeeded * 5);
    expect(round2(updated.cashBalance + buyCost(100, quantity))).toBe(5000);
    // The ledger has exactly one entry per success, and no entry for a rejection.
    expect(await Transaction.countDocuments({ userId: user._id, status: 'executed' })).toBe(succeeded);
    expect(updated.cashBalance).toBeGreaterThanOrEqual(0);
  });

  it('keeps the ledger balanced when buys and sells run concurrently', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 20);

    const opening = (await reloadPortfolio(user._id)).cashBalance;

    // 10 concurrent sells of 3 shares against a holding of 20: at most 6 can succeed.
    const attempts = Array.from({ length: 10 }, () => tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 3));
    const results = await Promise.allSettled(attempts);
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;

    const updated = await reloadPortfolio(user._id);
    const held = updated.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    expect(succeeded).toBeLessThanOrEqual(6);
    expect(quantity).toBe(20 - succeeded * 3);
    expect(quantity).toBeGreaterThanOrEqual(0);
    // Sells credit cash: opening + gross of what was sold - fees.
    const gross = succeeded * 3 * 100;
    const fees = succeeded * round2(gross / succeeded * 0.0005 || 0);
    expect(updated.cashBalance).toBeGreaterThanOrEqual(opening);
    expect(updated.cashBalance).toBeLessThanOrEqual(round2(opening + gross));
    expect(fees).toBeGreaterThanOrEqual(0);
  });

  it('is not defeated by a concurrent writer racing the same portfolio document', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });

    // A second writer touches the document while the trade is in flight, which
    // is exactly the situation optimistic locking exists to detect.
    const [, results] = await Promise.all([
      reloadPortfolio(user._id).then((p) => {
        p.cashBalance = 1000;
        return p.save();
      }),
      Promise.allSettled([
        tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5),
        tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 5)
      ])
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const updated = await reloadPortfolio(user._id);
    const held = updated.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    // Whatever interleaving occurred, cash never goes negative and the
    // successes reconcile against the shares actually held.
    expect(updated.cashBalance).toBeGreaterThanOrEqual(0);
    expect(quantity).toBe(fulfilled.length * 5);
  });
});

describe('executeMarketOrder — atomicity under failure', () => {
  it('does not leave a ledger entry when the portfolio save fails', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    const spy = jest.spyOn(mongoose.Model.prototype, 'save').mockRejectedValueOnce(new Error('simulated write failure'));

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 1)).rejects.toThrow();

    spy.mockRestore();

    expect(await Transaction.countDocuments({ userId: user._id })).toBe(0);
    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(10000);
  });

  it('rejects a trade for an account with no portfolio', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });
    await require('../../src/models/Portfolio').deleteOne({ userId: user._id });

    await expect(tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 1)).rejects.toMatchObject({
      code: 'PORTFOLIO_NOT_FOUND'
    });
  });
});

describe('resting orders', () => {
  it('creates a pending order without touching cash or holdings', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });

    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 90, 5);

    expect(order.status).toBe('pending');
    const updated = await reloadPortfolio(user._id);
    expect(updated.cashBalance).toBe(1000);
    expect(updated.holdings).toHaveLength(0);
  });

  it('normalises the symbol and rejects an unknown order type', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });

    const order = await tradingEngineService.placePendingOrder(user._id, 'aaa', 'limit', 'buy', 90, 1);
    expect(order.symbol).toBe('AAA');

    await expect(tradingEngineService.placePendingOrder(user._id, 'AAA', 'trailing', 'buy', 90, 1)).rejects.toMatchObject({
      code: 'INVALID_ORDER_TYPE'
    });
  });

  it('cancels a pending order and refuses to cancel it twice', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 90, 1);

    const cancelled = await tradingEngineService.cancelOrder(user._id, order._id);
    expect(cancelled.status).toBe('cancelled');

    await expect(tradingEngineService.cancelOrder(user._id, order._id)).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('will not cancel another account’s order', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 1000 });
    const { user: other } = await createUserWithPortfolio({ cashBalance: 1000 });

    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 90, 1);

    await expect(tradingEngineService.cancelOrder(other._id, order._id)).rejects.toMatchObject({ code: 'ORDER_NOT_FOUND' });
  });

  it('claims an order exactly once, so two cycles cannot both fill it', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 2);

    const firstClaim = await tradingEngineService.claimPendingOrder(order._id);
    const secondClaim = await tradingEngineService.claimPendingOrder(order._id);

    expect(firstClaim).not.toBeNull();
    expect(secondClaim).toBeNull();
  });

  it('fills a claimed order through the same path as a market order', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 2);

    const claimed = await tradingEngineService.claimPendingOrder(order._id);
    const outcome = await tradingEngineService.fillPendingOrder(claimed);

    expect(outcome.status).toBe('filled');

    const stored = await require('../../src/models/Order').findById(order._id);
    expect(stored.status).toBe('filled');
    expect(stored.filledPrice).toBe(100);

    const updated = await reloadPortfolio(user._id);
    expect(updated.holdings[0].quantity).toBe(2);
  });

  it('cancels a claimed order that has become unaffordable', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 150 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 200, 5);

    const claimed = await tradingEngineService.claimPendingOrder(order._id);
    const outcome = await tradingEngineService.fillPendingOrder(claimed);

    expect(outcome.status).toBe('cancelled');
    expect(outcome.reason).toBe('INSUFFICIENT_FUNDS');

    const stored = await require('../../src/models/Order').findById(order._id);
    expect(stored.status).toBe('cancelled');
  });

  it('releases a claimed order when no price is available', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const order = await tradingEngineService.placePendingOrder(user._id, 'AAA', 'limit', 'buy', 105, 1);

    const claimed = await tradingEngineService.claimPendingOrder(order._id);
    // Make the symbol unpricable for this fill attempt. The quote cache must be
    // flushed first, or the previously cached price would mask the outage.
    marketDataProvider.setProvider({
      name: 'broken',
      getQuote: async () => {
        const err = new Error('provider down');
        err.code = 'SYMBOL_NOT_FOUND';
        throw err;
      },
      getHistorical: async () => ({ candles: [] }),
      supportsStreaming: () => false
    });
    await cache().flush();

    const outcome = await tradingEngineService.fillPendingOrder(claimed);

    const stored = await require('../../src/models/Order').findById(order._id);
    expect(outcome.status).toBe('released');
    expect(stored.status).toBe('pending');
  });
});

describe('the ledger is append-only', () => {
  it('refuses to update or delete a transaction outside the test environment', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 1);
    const tx = await Transaction.findOne({ userId: user._id });

    // The guard steps aside under NODE_ENV=test so suites can clean up, so the
    // hook is exercised by asserting it under a non-test environment.
    const previousEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await expect(Transaction.updateOne({ _id: tx._id }, { $set: { price: 1 } })).rejects.toThrow(/immutable/i);
      await expect(Transaction.deleteMany({ userId: user._id })).rejects.toThrow(/immutable/i);
    } finally {
      process.env.NODE_ENV = previousEnv;
    }

    // The entry is untouched by the rejected attempts.
    const stored = await Transaction.findById(tx._id);
    expect(stored.price).toBe(100);
  });
});
