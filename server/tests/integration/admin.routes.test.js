const request = require('supertest');

const db = require('../helpers/db');
const { seedUniverse } = require('../helpers/fixtures');
const app = require('../../src/app');
const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const User = require('../../src/models/User');
const AuditLog = require('../../src/models/AuditLog');

/**
 * RBAC and the audit trail: admin routes must reject before reaching a
 * controller, and privileged actions must leave a record.
 */

const VALID_PASSWORD = 'Str0ngPassw0rd';
let adminToken;
let userToken;
let adminId;
let userId;

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

  const makeDesk = async (email) => {
    const registered = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Desk', email, password: VALID_PASSWORD });
    const { accessToken, verificationToken, user } = registered.body.data;
    await request(app).post('/api/v1/auth/verify-email').send({ token: verificationToken });
    return { token: accessToken, id: user.id };
  };

  const admin = await makeDesk('admin@example.com');
  const user = await makeDesk('user@example.com');

  // Registration always creates a plain user; promotion is an operator action.
  await User.updateOne({ _id: admin.id }, { $set: { role: 'admin' } });

  adminToken = admin.token;
  adminId = admin.id;
  userToken = user.token;
  userId = user.id;
});

afterEach(() => marketDataProvider.resetProvider());

const asAdmin = (req) => req.set('Authorization', `Bearer ${adminToken}`);
const asUser = (req) => req.set('Authorization', `Bearer ${userToken}`);

describe('admin routes are closed to non-admins', () => {
  it.each([
    ['GET', '/api/v1/admin/stats'],
    ['GET', '/api/v1/admin/anomalies'],
    ['GET', '/api/v1/admin/stocks'],
    ['GET', '/api/v1/admin/users'],
    ['GET', '/api/v1/admin/audit-logs']
  ])('%s %s returns 403 for a normal user', async (method, path) => {
    const res = await asUser(request(app)[method.toLowerCase()](path));

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN_ROLE');
  });

  it('rejects a non-admin before the controller runs', async () => {
    const res = await asUser(request(app).post('/api/v1/admin/stocks')).send({
      symbol: 'ZZZ',
      name: 'Should Not Exist',
      exchange: 'NSE',
      currentPrice: 10
    });

    expect(res.status).toBe(403);
    // The write must not have happened, even partially.
    const Stock = require('../../src/models/Stock');
    expect(await Stock.countDocuments({ symbol: 'ZZZ' })).toBe(0);
  });

  it('requires authentication before role, returning 401 for no token', async () => {
    const res = await request(app).get('/api/v1/admin/stats');
    expect(res.status).toBe(401);
  });
});

describe('stock administration', () => {
  it('creates, updates, and delists a stock, auditing each step', async () => {
    const created = await asAdmin(request(app).post('/api/v1/admin/stocks')).send({
      symbol: 'zomato',
      name: 'Eternal Ltd',
      sector: 'Consumer',
      exchange: 'NSE',
      currentPrice: 280.5
    });

    expect(created.status).toBe(201);
    expect(created.body.data.symbol).toBe('ZOMATO'); // normalised to uppercase

    const duplicate = await asAdmin(request(app).post('/api/v1/admin/stocks')).send({
      symbol: 'ZOMATO',
      name: 'Again',
      exchange: 'NSE',
      currentPrice: 1
    });
    expect(duplicate.status).toBe(409);

    const updated = await asAdmin(request(app).patch('/api/v1/admin/stocks/ZOMATO')).send({ currentPrice: 300 });
    expect(updated.status).toBe(200);
    expect(updated.body.data.currentPrice).toBe(300);

    const delisted = await asAdmin(request(app).delete('/api/v1/admin/stocks/ZOMATO'));
    expect(delisted.status).toBe(200);
    expect(delisted.body.data.isActive).toBe(false);

    const actions = (await AuditLog.find({}).lean()).map((log) => log.action);
    expect(actions).toEqual(expect.arrayContaining(['admin.stock_created', 'admin.stock_updated', 'admin.stock_delisted']));
  });

  it('rejects a non-positive price', async () => {
    const res = await asAdmin(request(app).post('/api/v1/admin/stocks')).send({
      symbol: 'BAD',
      name: 'Bad Ltd',
      exchange: 'NSE',
      currentPrice: 0
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('platform analytics', () => {
  it('summarises users, volume, and the most-traded symbols', async () => {
    await asUser(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 2 });

    const res = await asAdmin(request(app).get('/api/v1/admin/stats'));

    expect(res.status).toBe(200);
    expect(res.body.data.users).toBe(2);
    expect(res.body.data.transactions).toBe(1);
    expect(res.body.data.mostTraded[0]).toMatchObject({ symbol: 'AAA', trades: 1 });
    expect(res.body.data.totalVolume).toBe(200);
  });
});

describe('anomaly flagging', () => {
  it('flags a desk exceeding the trade-frequency threshold', async () => {
    await Promise.all(
      Array.from({ length: 6 }, () => asUser(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 1 }))
    );

    const res = await asAdmin(request(app).get('/api/v1/admin/anomalies?threshold=5&windowHours=24'));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].userId).toBe(userId);
    expect(res.body.data.items[0].trades).toBeGreaterThanOrEqual(6);
  });

  it('flags nobody when the threshold is not met', async () => {
    await asUser(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 1 });

    const res = await asAdmin(request(app).get('/api/v1/admin/anomalies?threshold=50'));

    expect(res.body.data.items).toHaveLength(0);
  });
});

describe('the audit trail', () => {
  it('records registrations, logins, and trades', async () => {
    await request(app).post('/api/v1/auth/login').send({ email: 'user@example.com', password: VALID_PASSWORD });
    await asUser(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 1 });

    const res = await asAdmin(request(app).get('/api/v1/admin/audit-logs?limit=50'));

    expect(res.status).toBe(200);
    const actions = res.body.data.items.map((log) => log.action);
    expect(actions).toEqual(
      expect.arrayContaining(['user.registered', 'user.email_verified', 'user.login', 'trade.executed'])
    );
    expect(res.body.data.pagination.total).toBeGreaterThanOrEqual(4);
  });

  it('exposes no way to modify or delete an audit entry', async () => {
    const log = await AuditLog.create({ userId: adminId, action: 'test.event', metadata: {} });

    const patch = await asAdmin(request(app).patch(`/api/v1/admin/audit-logs/${log._id}`)).send({ action: 'tampered' });
    const del = await asAdmin(request(app).delete(`/api/v1/admin/audit-logs/${log._id}`));

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);

    // The model refuses the write even if a route were ever added.
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      await expect(AuditLog.updateOne({ _id: log._id }, { $set: { action: 'tampered' } })).rejects.toThrow(/immutable/i);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
