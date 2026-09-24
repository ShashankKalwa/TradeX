const request = require('supertest');

const db = require('../helpers/db');
const { seedUniverse } = require('../helpers/fixtures');
const app = require('../../src/app');
const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const User = require('../../src/models/User');
const Portfolio = require('../../src/models/Portfolio');
const AuditLog = require('../../src/models/AuditLog');

/**
 * The documented end-to-end journey over real HTTP:
 * register -> verify -> login -> trade -> portfolio reflects the trade.
 */

const VALID_PASSWORD = 'Str0ngPassw0rd';

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
});

afterEach(() => marketDataProvider.resetProvider());

const registerUser = async (overrides = {}) => {
  const payload = { name: 'Aditi Sharma', email: 'aditi@example.com', password: VALID_PASSWORD, ...overrides };
  const response = await request(app).post('/api/v1/auth/register').send(payload);
  return response;
};

describe('POST /api/v1/auth/register', () => {
  it('creates the account, funds the portfolio, and issues tokens', async () => {
    const res = await registerUser();

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toMatchObject({ name: 'Aditi Sharma', email: 'aditi@example.com', role: 'user' });
    expect(res.body.data.accessToken).toBeTruthy();
    expect(res.body.data.refreshToken).toBeTruthy();
    // The password must never appear in a response, in any form.
    expect(JSON.stringify(res.body)).not.toContain(VALID_PASSWORD);
    expect(res.body.data.user.passwordHash).toBeUndefined();

    const portfolio = await Portfolio.findOne({ userId: res.body.data.user.id });
    expect(portfolio.cashBalance).toBe(100000);
    expect(portfolio.holdings).toHaveLength(0);
  });

  it('writes an audit entry for the registration', async () => {
    await registerUser();
    expect(await AuditLog.countDocuments({ action: 'user.registered' })).toBe(1);
  });

  it('stores the password as a bcrypt hash, never in plaintext', async () => {
    await registerUser();
    const user = await User.findOne({ email: 'aditi@example.com' }).select('+passwordHash');
    expect(user.passwordHash).toBeDefined();
    expect(user.passwordHash).not.toBe(VALID_PASSWORD);
    expect(user.passwordHash.startsWith('$2')).toBe(true);
  });

  it('rejects a duplicate email with 409', async () => {
    await registerUser();
    const res = await registerUser();

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it.each([
    ['a weak password', { password: 'short' }],
    ['a password with no number', { password: 'NoNumbersHere' }],
    ['an invalid email', { email: 'not-an-email' }],
    ['a missing name', { name: '' }]
  ])('rejects %s with a validation error', async (_label, overrides) => {
    const res = await registerUser(overrides);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/v1/auth/verify-email', () => {
  it('activates the account using the issued token', async () => {
    const registered = await registerUser();
    const { verificationToken } = registered.body.data;

    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: verificationToken });

    expect(res.status).toBe(200);
    expect(res.body.data.isVerified).toBe(true);

    const user = await User.findOne({ email: 'aditi@example.com' });
    expect(user.isVerified).toBe(true);
  });

  it('rejects an unknown token', async () => {
    const res = await request(app).post('/api/v1/auth/verify-email').send({ token: 'nonsense' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_VERIFICATION_TOKEN');
  });
});

describe('POST /api/v1/auth/login', () => {
  it('returns tokens for correct credentials', async () => {
    await registerUser();

    const res = await request(app).post('/api/v1/auth/login').send({ email: 'aditi@example.com', password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBeTruthy();
  });

  it('gives the same generic error for a wrong password and an unknown email', async () => {
    await registerUser();

    const wrongPassword = await request(app).post('/api/v1/auth/login').send({ email: 'aditi@example.com', password: 'Wr0ngPassw0rd' });
    const unknownEmail = await request(app).post('/api/v1/auth/login').send({ email: 'nobody@example.com', password: VALID_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    // Identical messages: which half failed is not disclosed to the caller.
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });
});

describe('POST /api/v1/auth/refresh — rotation', () => {
  it('issues a new pair and invalidates the token that was presented', async () => {
    const registered = await registerUser();
    const original = registered.body.data.refreshToken;

    const refreshed = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    expect(refreshed.status).toBe(200);
    expect(refreshed.body.data.refreshToken).not.toBe(original);

    // Replaying the consumed token must fail — that is what rotation buys.
    const replay = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: original });
    expect(replay.status).toBe(401);
    expect(replay.body.error.code).toBe('INVALID_REFRESH_TOKEN');
  });

  it('stores refresh tokens only as hashes', async () => {
    const registered = await registerUser();
    const rawToken = registered.body.data.refreshToken;

    const user = await User.findOne({ email: 'aditi@example.com' }).select('+refreshTokens');
    expect(user.refreshTokens).toHaveLength(1);
    expect(user.refreshTokens[0].tokenHash).not.toBe(rawToken);
    expect(user.refreshTokens[0].tokenHash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('GET /api/v1/auth/me', () => {
  it('returns the caller and rejects a missing token', async () => {
    const registered = await registerUser();
    const token = registered.body.data.accessToken;

    const authed = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(authed.status).toBe(200);
    expect(authed.body.data.email).toBe('aditi@example.com');

    const anonymous = await request(app).get('/api/v1/auth/me');
    expect(anonymous.status).toBe(401);
    expect(anonymous.body.error.code).toBe('NO_TOKEN');
  });

  it('rejects a token signed with the wrong secret', async () => {
    const jwt = require('jsonwebtoken');
    const forged = jwt.sign({ id: '507f1f77bcf86cd799439011', role: 'admin' }, 'not-the-real-secret');

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${forged}`);

    expect(res.status).toBe(401);
  });
});

describe('account lifecycle across requests', () => {
  it('rejects trading before the email is verified, and allows it after', async () => {
    const registered = await registerUser();
    const token = registered.body.data.accessToken;
    const { verificationToken } = registered.body.data;

    const blocked = await request(app)
      .post('/api/v1/trade/market')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'AAA', side: 'buy', quantity: 1 });

    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe('EMAIL_NOT_VERIFIED');

    await request(app).post('/api/v1/auth/verify-email').send({ token: verificationToken });

    const allowed = await request(app)
      .post('/api/v1/trade/market')
      .set('Authorization', `Bearer ${token}`)
      .send({ symbol: 'AAA', side: 'buy', quantity: 1 });

    expect(allowed.status).toBe(201);
  });

  it('invalidates every session on logout', async () => {
    const registered = await registerUser();
    const { accessToken, refreshToken } = registered.body.data;

    const logout = await request(app).post('/api/v1/auth/logout').set('Authorization', `Bearer ${accessToken}`).send({ refreshToken });
    expect(logout.status).toBe(200);

    const afterLogout = await request(app).post('/api/v1/auth/refresh').send({ refreshToken });
    expect(afterLogout.status).toBe(401);
  });
});
