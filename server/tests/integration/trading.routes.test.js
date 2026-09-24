const request = require('supertest');

const db = require('../helpers/db');
const app = require('../../src/app');
const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const Stock = require('../../src/models/Stock');
const Portfolio = require('../../src/models/Portfolio');

/**
 * Trading over HTTP: auth, order placement, the ledger, and the endpoints a
 * client actually reads to render a desk.
 */

const VALID_PASSWORD = 'Str0ngPassw0rd';
let prices;

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clearDatabase();
  prices = { AAA: 100, BBB: 250 };

  marketDataProvider.setProvider({
    name: 'fake',
    getQuote: async (symbol) => {
      const price = prices[symbol];
      if (price === undefined) {
        const err = new Error('no price');
        err.code = 'SYMBOL_NOT_FOUND';
        throw err;
      }
      return { symbol, price, prevClose: price, changePercent: 0, source: 'fake', stale: false, timestamp: Date.now() };
    },
    getHistorical: async () => ({ symbol: 'AAA', resolution: 'D', candles: [{ timestamp: Date.now(), open: 1, high: 2, low: 0.5, close: 1.5, volume: 10 }] }),
    supportsStreaming: () => false
  });
  await cache().flush();

  await Stock.insertMany([
    { symbol: 'AAA', name: 'Alpha Ltd', sector: 'Technology', exchange: 'NSE', currentPrice: 100 },
    { symbol: 'BBB', name: 'Beta Ltd', sector: 'Financials', exchange: 'NSE', currentPrice: 250 }
  ]);
});

afterEach(() => marketDataProvider.resetProvider());

/** A verified account with a live token — the precondition for trading. */
const createAuthedDesk = async (email = 'trader@example.com') => {
  const registered = await request(app)
    .post('/api/v1/auth/register')
    .send({ name: 'Trader', email, password: VALID_PASSWORD });

  const { accessToken, verificationToken, user } = registered.body.data;
  await request(app).post('/api/v1/auth/verify-email').send({ token: verificationToken });

  return { token: accessToken, userId: user.id, auth: (req) => req.set('Authorization', `Bearer ${accessToken}`) };
};

describe('POST /api/v1/trade/market', () => {
  it('fills a buy and returns the updated desk state', async () => {
    const { token, auth } = await createAuthedDesk();

    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 10 });

    expect(res.status).toBe(201);
    expect(res.body.data.transaction).toMatchObject({ symbol: 'AAA', type: 'buy', quantity: 10, price: 100 });
    expect(res.body.data.cashBalance).toBe(98999.5);
    expect(res.body.data.holdings).toHaveLength(1);
    expect(res.body.data.replayed).toBe(false);
    expect(token).toBeTruthy();
  });

  it('rejects a buy beyond the cash balance with a typed 400', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 100000 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_FUNDS');
    expect(res.body.error.message).toMatch(/available/);
  });

  it('rejects a sell with no holdings', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'sell', quantity: 1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INSUFFICIENT_HOLDINGS');
  });

  it('returns the original fill when the same Idempotency-Key is reused', async () => {
    const { auth } = await createAuthedDesk();

    const first = await auth(request(app).post('/api/v1/trade/market'))
      .set('Idempotency-Key', 'key-123')
      .send({ symbol: 'AAA', side: 'buy', quantity: 5 });

    const second = await auth(request(app).post('/api/v1/trade/market'))
      .set('Idempotency-Key', 'key-123')
      .send({ symbol: 'AAA', side: 'buy', quantity: 5 });

    expect(first.status).toBe(201);
    expect(second.status).toBe(201);
    expect(second.body.data.replayed).toBe(true);
    expect(second.body.data.transaction._id).toBe(first.body.data.transaction._id);

    const portfolio = await Portfolio.findOne({ userId: first.body.data.transaction.userId });
    expect(portfolio.holdings[0].quantity).toBe(5); // traded once, not twice
  });

  it('rejects malformed input before it reaches the engine', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'hold', quantity: -1 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('reports an unpricable symbol as 503, not 500', async () => {
    const { auth } = await createAuthedDesk();
    // Listed (so the request passes the tradable check) but with no price
    // available from any provider — the degraded-feed case.
    await Stock.create({ symbol: 'GHOST', name: 'Ghost Ltd', exchange: 'NSE', currentPrice: 10 });

    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'GHOST', side: 'buy', quantity: 1 });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('PRICE_UNAVAILABLE');
  });

  it('requires authentication', async () => {
    const res = await request(app).post('/api/v1/trade/market').send({ symbol: 'AAA', side: 'buy', quantity: 1 });
    expect(res.status).toBe(401);
  });
});

describe('portfolio reflects the ledger', () => {
  it('values holdings at the live price and reports P&L', async () => {
    const { auth } = await createAuthedDesk();
    await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 10 });

    prices.AAA = 120;
    await cache().flush();

    const res = await auth(request(app).get('/api/v1/portfolio'));

    expect(res.status).toBe(200);
    expect(res.body.data.holdings[0]).toMatchObject({ symbol: 'AAA', quantity: 10, avgCostBasis: 100, price: 120 });
    expect(res.body.data.holdings[0].unrealizedPnl).toBe(200);
    expect(res.body.data.unrealizedPnl).toBe(200);
    // Cash after the buy plus the marked-up holdings value.
    expect(res.body.data.totalValue).toBe(98999.5 + 1200);
  });

  it('records a snapshot-backed history endpoint', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).get('/api/v1/portfolio/history?days=30'));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data.points)).toBe(true);
  });

  it('reports concentration and a Sharpe-style ratio', async () => {
    const { auth } = await createAuthedDesk();
    await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 10 });

    const res = await auth(request(app).get('/api/v1/portfolio/risk'));

    expect(res.status).toBe(200);
    expect(res.body.data.sectorWeights[0].sector).toBe('Technology');
    expect(res.body.data.riskLevel).toBe('concentrated'); // a single sector
    expect(res.body.data).toHaveProperty('sharpeRatio');
  });
});

describe('the transaction ledger endpoint', () => {
  it('returns entries newest first with pagination metadata', async () => {
    const { auth } = await createAuthedDesk();
    await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 1 });
    await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'BBB', side: 'buy', quantity: 1 });

    const res = await auth(request(app).get('/api/v1/trade/transactions?limit=1&page=1'));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.items[0].symbol).toBe('BBB');
    expect(res.body.data.pagination).toMatchObject({ page: 1, limit: 1, total: 2, pages: 2 });
    expect(res.body.data.immutable).toBe(true);
  });

  it('exposes no route that could update or delete a ledger entry', async () => {
    const { auth } = await createAuthedDesk();
    const res = await auth(request(app).post('/api/v1/trade/market')).send({ symbol: 'AAA', side: 'buy', quantity: 1 });
    const id = res.body.data.transaction._id;

    const patch = await auth(request(app).patch(`/api/v1/trade/transactions/${id}`)).send({ price: 1 });
    const del = await auth(request(app).delete(`/api/v1/trade/transactions/${id}`));

    expect(patch.status).toBe(404);
    expect(del.status).toBe(404);
  });
});

describe('resting orders over HTTP', () => {
  it('places, lists, and cancels a limit order', async () => {
    const { auth } = await createAuthedDesk();

    const placed = await auth(request(app).post('/api/v1/trade/orders')).send({
      symbol: 'AAA',
      orderType: 'limit',
      direction: 'buy',
      targetPrice: 90,
      quantity: 5
    });
    expect(placed.status).toBe(201);
    expect(placed.body.data.status).toBe('pending');

    const listed = await auth(request(app).get('/api/v1/trade/orders?status=pending'));
    expect(listed.body.data.items).toHaveLength(1);

    const cancelled = await auth(request(app).delete(`/api/v1/trade/orders/${placed.body.data._id}`));
    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.status).toBe('cancelled');

    const afterCancel = await auth(request(app).get('/api/v1/trade/orders?status=pending'));
    expect(afterCancel.body.data.items).toHaveLength(0);
  });
});

describe('market endpoints', () => {
  it('lists the tradable universe with pagination', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).get('/api/v1/market/stocks?limit=1'));

    expect(res.status).toBe(200);
    expect(res.body.data.items).toHaveLength(1);
    expect(res.body.data.pagination.total).toBe(2);
  });

  it('returns a quote and a candle series', async () => {
    const { auth } = await createAuthedDesk();

    const quote = await auth(request(app).get('/api/v1/market/quote/AAA'));
    expect(quote.body.data.price).toBe(100);

    const candles = await auth(request(app).get('/api/v1/market/historical/AAA?resolution=D'));
    expect(candles.status).toBe(200);
    expect(candles.body.data.candles.length).toBeGreaterThan(0);
  });

  it('degrades per symbol on a batch quote instead of failing the request', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).get('/api/v1/market/quotes?symbols=AAA,GHOST'));

    expect(res.status).toBe(200);
    expect(res.body.data.quotes).toHaveLength(2);
    expect(res.body.data.quotes[0].price).toBe(100);
    expect(res.body.data.quotes[1].price).toBeNull();
  });
});

describe('watchlist and alerts', () => {
  it('adds, lists, and removes a symbol', async () => {
    const { auth } = await createAuthedDesk();

    await auth(request(app).post('/api/v1/watchlist')).send({ symbol: 'AAA' });
    const listed = await auth(request(app).get('/api/v1/watchlist'));
    expect(listed.body.data.symbols).toContain('AAA');
    expect(listed.body.data.quotes[0].price).toBe(100);

    await auth(request(app).delete('/api/v1/watchlist/AAA'));
    const after = await auth(request(app).get('/api/v1/watchlist'));
    expect(after.body.data.symbols).not.toContain('AAA');
  });

  it('creates and deletes a price alert', async () => {
    const { auth } = await createAuthedDesk();

    const created = await auth(request(app).post('/api/v1/watchlist/alerts')).send({ symbol: 'AAA', targetPrice: 120, direction: 'above' });
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('active');

    const duplicate = await auth(request(app).post('/api/v1/watchlist/alerts')).send({ symbol: 'AAA', targetPrice: 120, direction: 'above' });
    expect(duplicate.status).toBe(409);

    const removed = await auth(request(app).delete(`/api/v1/watchlist/alerts/${created.body.data._id}`));
    expect(removed.body.data.alerts).toHaveLength(0);
  });
});

describe('error envelope and 404s', () => {
  it('uses one shape for an unknown route', async () => {
    const res = await request(app).get('/api/v1/nope');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: { code: 'ROUTE_NOT_FOUND', message: expect.stringContaining('No route matches') }
    });
  });

  it('maps a malformed identifier to 400 rather than 500', async () => {
    const { auth } = await createAuthedDesk();

    const res = await auth(request(app).delete('/api/v1/trade/orders/not-an-id'));

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('echoes a correlation id on every response', async () => {
    const res = await request(app).get('/health');
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('serves the health probe and the OpenAPI document', async () => {
    const health = await request(app).get('/health');
    expect(health.status).toBe(200);
    expect(health.body.data.status).toBe('ok');

    const docs = await request(app).get('/api/docs.json');
    expect(docs.status).toBe(200);
    expect(docs.body.openapi).toBe('3.0.3');
    expect(Object.keys(docs.body.paths).length).toBeGreaterThan(10);
  });
});
