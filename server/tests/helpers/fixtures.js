const User = require('../../src/models/User');
const Portfolio = require('../../src/models/Portfolio');
const Watchlist = require('../../src/models/Watchlist');
const Stock = require('../../src/models/Stock');
const { round2 } = require('../../src/utils/money');
const { trading: tradingConfig } = require('../../src/config/env');

/**
 * A deterministic market-data provider.
 *
 * Every unit test pins prices through this rather than letting the real mock
 * provider random-walk: an assertion about a balance is only meaningful if the
 * execution price is known. This is the seam that made the original suite
 * unrunnable — it asserted 150 against a provider returning ~136.
 */
const createFakeProvider = (prices = {}) => {
  const calls = [];

  const provider = {
    name: 'fake',
    getQuote: jest.fn(async (symbol) => {
      calls.push(symbol);
      const entry = prices[symbol];
      if (entry === undefined) {
        const err = new Error(`No fake price configured for ${symbol}`);
        err.code = 'SYMBOL_NOT_FOUND';
        throw err;
      }
      if (entry instanceof Error) throw entry;

      const price = typeof entry === 'number' ? entry : entry.price;
      return {
        symbol,
        price,
        prevClose: typeof entry === 'object' && entry.prevClose ? entry.prevClose : price,
        changePercent: 0,
        source: 'fake',
        stale: false,
        timestamp: Date.now()
      };
    }),
    getHistorical: jest.fn(async (symbol) => ({ symbol, resolution: 'D', source: 'fake', candles: [] })),
    supportsStreaming: () => false,
    subscribeTicks: jest.fn()
  };

  return { provider, calls };
};

/** Create a user with a funded portfolio, as registration would. */
const createUserWithPortfolio = async ({ cashBalance = tradingConfig.startingCash, email, isVerified = true } = {}) => {
  const user = await User.create({
    name: 'Test Desk',
    email: email || `desk-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`,
    passwordHash: 'hashed-in-fixture',
    isVerified
  });

  const portfolio = await Portfolio.create({ userId: user._id, cashBalance, holdings: [] });
  await Watchlist.create({ userId: user._id, symbols: [], alerts: [] });

  return { user, portfolio };
};

/** Seed the tradable universe so sector lookups resolve. */
const createStocks = async (entries) => {
  const docs = entries.map(({ symbol, name = `${symbol} Ltd`, sector = 'Technology', exchange = 'NSE', currentPrice = 100 }) => ({
    symbol,
    name,
    sector,
    exchange,
    currentPrice
  }));
  await Stock.insertMany(docs);
  return docs;
};

/**
 * List the symbols a suite intends to trade. The engine refuses unlisted
 * instruments, so every suite that trades needs a universe to trade in.
 */
const seedUniverse = (symbols = ['AAA', 'BBB', 'CCC', 'DDD']) =>
  createStocks(symbols.map((symbol) => ({ symbol })));

const reloadPortfolio = (userId) => Portfolio.findOne({ userId });

/** Expected cost of a buy, fees included — mirrors the engine's arithmetic. */
const buyCost = (price, quantity, feeRate = tradingConfig.feeRate) => {
  const gross = round2(price * quantity);
  return round2(gross + round2(gross * feeRate));
};

module.exports = { createFakeProvider, createUserWithPortfolio, createStocks, seedUniverse, reloadPortfolio, buyCost };
