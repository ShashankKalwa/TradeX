// Ad-hoc: boot the real server against an in-memory replica set and hit it.
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { seedUniverse } = require('../tests/helpers/fixtures');

(async () => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  process.env.MONGO_URI = replSet.getUri();
  process.env.NODE_ENV = 'development';
  process.env.PORT = '5055';
  process.env.JWT_SECRET = 'smoke-test-secret-long-enough-for-hs256-signing';
  process.env.CLIENT_URL = 'http://localhost:5173';
  process.env.MARKET_DATA_PROVIDER = 'mock';
  process.env.ENABLE_JOBS = 'false';
  process.env.STARTING_CASH = '100000';
  process.env.LOG_IN_TESTS = '';

  require('../src/index.js');

  // Wait for the server and DB to connect before seeding
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await wait(2500);

  await seedUniverse(['RELIANCE']);

  const base = 'http://127.0.0.1:5055';

  const call = async (method, path, { token, body, headers } = {}) => {
    const res = await fetch(base + path, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined
    });
    let json = null;
    try { json = await res.json(); } catch (e) { /* non-JSON */ }
    return { status: res.status, json, requestId: res.headers.get('x-request-id') };
  };

  const out = [];
  const check = (label, cond, detail) => { out.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${cond ? '' : ' -> ' + JSON.stringify(detail)}`); return cond; };

  const health = await call('GET', '/health');
  check('health 200 + envelope', health.status === 200 && health.json.success === true, health);
  check('correlation id header', Boolean(health.requestId), health.requestId);

  const reg = await call('POST', '/api/v1/auth/register', { body: { name: 'Smoke Desk', email: 'smoke@example.com', password: 'Str0ngPassw0rd' } });
  check('register 201', reg.status === 201, reg.json);
  const token = reg.json?.data?.accessToken;
  const vtoken = reg.json?.data?.verificationToken;

  const preVerify = await call('POST', '/api/v1/trade/market', { token, body: { symbol: 'RELIANCE', side: 'buy', quantity: 1 } });
  check('trade blocked before verification (403)', preVerify.status === 403, preVerify.json);

  const verify = await call('POST', '/api/v1/auth/verify-email', { body: { token: vtoken } });
  check('verify email 200', verify.status === 200 && verify.json.data.isVerified === true, verify.json);

  const quote = await call('GET', '/api/v1/market/quote/RELIANCE', { token });
  check('quote priced by mock provider', quote.status === 200 && typeof quote.json.data.price === 'number', quote.json);

  const buy = await call('POST', '/api/v1/trade/market', { token, body: { symbol: 'RELIANCE', side: 'buy', quantity: 5 }, headers: { 'Idempotency-Key': 'smoke-1' } });
  check('market buy 201', buy.status === 201 && buy.json.data.transaction.status === 'executed', buy.json);

  const replay = await call('POST', '/api/v1/trade/market', { token, body: { symbol: 'RELIANCE', side: 'buy', quantity: 5 }, headers: { 'Idempotency-Key': 'smoke-1' } });
  check('replay is idempotent', replay.status === 201 && replay.json.data.replayed === true, replay.json);

  const insufficient = await call('POST', '/api/v1/trade/market', { token, body: { symbol: 'RELIANCE', side: 'buy', quantity: 100000 } });
  check('insufficient funds 400 + code', insufficient.status === 400 && insufficient.json.error.code === 'INSUFFICIENT_FUNDS', insufficient.json);

  const portfolio = await call('GET', '/api/v1/portfolio', { token });
  check('portfolio values holdings', portfolio.status === 200 && portfolio.json.data.holdings.length === 1, portfolio.json);

  const ledger = await call('GET', '/api/v1/trade/transactions', { token });
  check('ledger has one entry (replay did not double-write)', ledger.json?.data?.pagination?.total === 1, ledger.json?.data?.pagination);

  const order = await call('POST', '/api/v1/trade/pending', { token, body: { symbol: 'RELIANCE', orderType: 'limit', direction: 'buy', targetPrice: 10, quantity: 1 } });
  check('resting order 201', order.status === 201 && order.json.data.status === 'pending', order.json);
  const cancelled = await call('DELETE', `/api/v1/trade/orders/${order.json?.data?._id}`, { token });
  check('cancel order 200', cancelled.status === 200 && cancelled.json.data.status === 'cancelled', cancelled.json);

  const stocks = await call('GET', '/api/v1/market/stocks', { token });
  check('stock universe list', stocks.status === 200 && Array.isArray(stocks.json.data.items), stocks.json);

  const adminBlocked = await call('GET', '/api/v1/admin/stats', { token });
  check('admin blocked for user (403)', adminBlocked.status === 403, adminBlocked.json);

  const docs = await call('GET', '/api/docs.json');
  check('openapi doc served', docs.status === 200 && docs.json.openapi === '3.0.3', docs.status);

  const notFound = await call('GET', '/api/v1/nope');
  check('404 envelope', notFound.status === 404 && notFound.json.error.code === 'ROUTE_NOT_FOUND', notFound.json);

  const refresh = await call('POST', '/api/v1/auth/refresh', { body: { refreshToken: reg.json?.data?.refreshToken } });
  check('refresh rotates', refresh.status === 200 && refresh.json.data.refreshToken !== reg.json.data.refreshToken, refresh.json);
  const replayRefresh = await call('POST', '/api/v1/auth/refresh', { body: { refreshToken: reg.json?.data?.refreshToken } });
  check('consumed refresh token rejected', replayRefresh.status === 401, replayRefresh.json);

  console.log('\n' + out.join('\n'));
  const failures = out.filter((l) => l.startsWith('FAIL')).length;
  console.log(`\n${out.length - failures}/${out.length} smoke checks passed`);

  await replSet.stop();
  process.exit(failures ? 1 : 0);
})();
