const { checkAlerts } = require('../../src/jobs/alertChecker');
const { resolvePendingOrders } = require('../../src/jobs/orderResolver');
const db = require('../helpers/db');
const { seedUniverse, createUserWithPortfolio } = require('../helpers/fixtures');
const Watchlist = require('../../src/models/Watchlist');
const Order = require('../../src/models/Order');
const marketDataProvider = require('../../src/integrations/marketDataProvider');

beforeAll(async () => await db.connect());
afterAll(async () => await db.close());
beforeEach(async () => {
  await db.clearDatabase();
  await seedUniverse();
  marketDataProvider.setProvider({
    name: 'fake',
    getQuote: async (symbol) => ({ price: 105, timestamp: Date.now() })
  });
});

test('alertChecker triggers active alerts', async () => {
  const { user } = await createUserWithPortfolio();
  await Watchlist.create({
    userId: user._id,
    symbols: ['AAPL'],
    alerts: [{ symbol: 'AAPL', targetPrice: 100, direction: 'above', status: 'active' }]
  });
  await checkAlerts();
  const w = await Watchlist.findOne({ userId: user._id });
  expect(w.alerts[0].status).toBe('triggered');
});

test('orderResolver fills pending limit orders', async () => {
  const { user, portfolio } = await createUserWithPortfolio(1000);
  const order = await Order.create({
    userId: user._id,
    symbol: 'AAPL',
    orderType: 'limit',
    direction: 'buy',
    targetPrice: 110,
    quantity: 1,
    status: 'pending'
  });
  await resolvePendingOrders();
  const o = await Order.findById(order._id);
  expect(o.status).toBe('filled');
  expect(o.filledPrice).toBe(105);
});
