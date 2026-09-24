const request = require('supertest');

const db = require('../helpers/db');
const { seedUniverse } = require('../helpers/fixtures');
const app = require('../../src/app');
const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const User = require('../../src/models/User');
const Portfolio = require('../../src/models/Portfolio');
const Transaction = require('../../src/models/Transaction');

/**
 * The guarantee this whole system exists to provide, asserted at the HTTP layer
 * where a real client's double-submit and refresh-spam actually arrive.
 *
 * Runnable repeatedly by design: every assertion is an invariant (cash is never
 * overspent, the ledger reconciles) rather than a count that depends on timing.
 */

const VALID_PASSWORD = 'Str0ngPassw0rd';

/** Local copy of the engine's rounding, so assertions compare like with like. */
const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

let desk;

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clearDatabase();
  await seedUniverse();

  marketDataProvider.setProvider({
    name: 'fake',
    getQuote: async (symbol) => ({ symbol, price: 100, prevClose: 100, source: 'fake', stale: false, timestamp: Date.now() }),
    getHistorical: async () => ({ candles: [] }),
    supportsStreaming: () => false
  });
  await cache().flush();

  const registered = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Racer', email: 'racer@example.com', password: VALID_PASSWORD });

  const { accessToken, verificationToken, user } = registered.body.data;
  await request(app).post('/api/v1/auth/verify-email').send({ token: verificationToken });

  desk = { token: accessToken, userId: user.id };
});

afterEach(() => marketDataProvider.resetProvider());

const buy = (quantity, extra = {}) =>
  request(app)
    .post('/api/v1/trade/market')
    .set('Authorization', `Bearer ${desk.token}`)
    .send({ symbol: 'AAA', side: 'buy', quantity, ...extra });

const sell = (quantity) =>
  request(app).post('/api/v1/trade/market').set('Authorization', `Bearer ${desk.token}`).send({ symbol: 'AAA', side: 'sell', quantity });

const setCash = (amount) => Portfolio.updateOne({ userId: desk.userId }, { $set: { cashBalance: amount } });

describe('concurrent market orders', () => {
  it('never lets simultaneous buys overspend the balance', async () => {
    // 1000 affords 9 shares at 100 (900 + 0.45 fee) and never 10 (1000 + 0.50).
    await setCash(1000);

    const responses = await Promise.all(Array.from({ length: 8 }, () => buy(10)));

    const succeeded = responses.filter((r) => r.status === 201);
    const rejected = responses.filter((r) => r.status === 400);

    expect(succeeded.length + rejected.length).toBe(8);
    expect(rejected.every((r) => r.body.error.code === 'INSUFFICIENT_FUNDS')).toBe(true);

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    const held = portfolio.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    // The invariant: every successful fill is paid for, and cash never goes negative.
    expect(portfolio.cashBalance).toBeGreaterThanOrEqual(0);
    expect(round2(portfolio.cashBalance + quantity * 100 * (1 + 0.0005))).toBeCloseTo(1000, 1);
    expect(quantity).toBe(succeeded.length * 10);
    expect(await Transaction.countDocuments({ userId: desk.userId })).toBe(succeeded.length);
  });

  it('serialises 20 concurrent buys so the ledger reconciles exactly', async () => {
    await setCash(5000);

    const responses = await Promise.all(Array.from({ length: 20 }, () => buy(5)));
    const succeeded = responses.filter((r) => r.status === 201).length;

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    const held = portfolio.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    expect(quantity).toBe(succeeded * 5);
    // Cash spent plus the cost of what is held must equal the opening balance.
    expect(round2(portfolio.cashBalance + quantity * 100 + quantity * 100 * 0.0005)).toBeCloseTo(5000, 1);
    expect(await Transaction.countDocuments({ userId: desk.userId, status: 'executed' })).toBe(succeeded);
  });

  it('never sells more shares than are held', async () => {
    await setCash(10000);
    await buy(10);

    const responses = await Promise.all(Array.from({ length: 10 }, () => sell(3)));

    const succeeded = responses.filter((r) => r.status === 201).length;

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    const held = portfolio.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    expect(succeeded).toBeLessThanOrEqual(3); // at most 9 of the 10 held
    expect(quantity).toBe(10 - succeeded * 3);
    expect(quantity).toBeGreaterThanOrEqual(0);
  });

  it('keeps a mixed burst of buys and sells internally consistent', async () => {
    await setCash(10000);
    await buy(20);

    const responses = await Promise.all([buy(5), sell(5), buy(5), sell(5), buy(5), sell(5)]);

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    const held = portfolio.holdings.find((h) => h.symbol === 'AAA');
    const quantity = held ? held.quantity : 0;

    // Every accepted order is reflected in the holding.
    const buys = responses.filter((r) => r.status === 201 && r.body.data.transaction.type === 'buy').length;
    const sells = responses.filter((r) => r.status === 201 && r.body.data.transaction.type === 'sell').length;

    expect(quantity).toBe(20 + buys * 5 - sells * 5);
    expect(portfolio.cashBalance).toBeGreaterThanOrEqual(0);
    // The setup buy is a transaction too, so it is counted alongside the burst.
    expect(await Transaction.countDocuments({ userId: desk.userId })).toBe(1 + buys + sells);
  });
});

describe('idempotent retries under load', () => {
  it('executes one trade when the same key is submitted ten times at once', async () => {
    await setCash(10000);

    // A client double-tapping submit, or a retry storm, sends the same key.
    const responses = await Promise.all(Array.from({ length: 10 }, () => buy(5).set('Idempotency-Key', 'same-key')));

    const ok = responses.filter((r) => r.status === 201);
    expect(ok.length).toBe(10); // all succeed, because a replay is a success

    const ids = new Set(ok.map((r) => r.body.data.transaction._id));
    expect(ids.size).toBe(1); // but they all refer to one fill

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    expect(portfolio.holdings[0].quantity).toBe(5);
    expect(await Transaction.countDocuments({ userId: desk.userId })).toBe(1);
  });

  it('treats distinct keys as distinct trades', async () => {
    await setCash(10000);

    await Promise.all([
      buy(1).set('Idempotency-Key', 'key-a'),
      buy(1).set('Idempotency-Key', 'key-b'),
      buy(1).set('Idempotency-Key', 'key-c')
    ]);

    const portfolio = await Portfolio.findOne({ userId: desk.userId });
    expect(portfolio.holdings[0].quantity).toBe(3);
  });
});

describe('suspended accounts', () => {
  it('loses access immediately, without waiting for the token to expire', async () => {
    await setCash(10000);
    expect((await buy(1)).status).toBe(201);

    await User.updateOne({ _id: desk.userId }, { $set: { isSuspended: true } });

    const blocked = await buy(1);
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });
});

describe('ledger integrity', () => {
  it('keeps the running balance column consistent with the transactions', async () => {
    await setCash(10000);
    await buy(10);
    await sell(4);
    await buy(2);

    const entries = await Transaction.find({ userId: desk.userId }).sort({ timestamp: 1 }).lean();
    const portfolio = await Portfolio.findOne({ userId: desk.userId });

    let running = 10000;
    entries.forEach((entry) => {
      running =
        entry.type === 'buy'
          ? round2(running - entry.grossValue - entry.fee)
          : round2(running + entry.grossValue - entry.fee);
      expect(entry.cashBalanceAfter).toBe(running);
    });

    expect(running).toBe(portfolio.cashBalance);
  });
});
