const mongoose = require('mongoose');

const db = require('../helpers/db');
const { createUserWithPortfolio, createStocks } = require('../helpers/fixtures');

const { cache } = require('../../src/integrations/cache');
const marketDataProvider = require('../../src/integrations/marketDataProvider');
const tradingEngineService = require('../../src/services/tradingEngineService');
const portfolioService = require('../../src/services/portfolioService');
const leaderboardService = require('../../src/services/leaderboardService');
const snapshotService = require('../../src/services/snapshotService');
const User = require('../../src/models/User');
const Leaderboard = require('../../src/models/Leaderboard');
const Portfolio = require('../../src/models/Portfolio');

/** Valuation, risk metrics, and the materialised leaderboard. */

let prices;

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await db.disconnect();
});

beforeEach(async () => {
  await db.clearDatabase();
  prices = { AAA: 100, BBB: 200, CCC: 50, DDD: 50 };

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
    getHistorical: async () => ({ candles: [] }),
    supportsStreaming: () => false
  });
  await cache().flush();

  await createStocks([
    { symbol: 'AAA', name: 'Alpha Ltd', sector: 'Technology' },
    { symbol: 'BBB', name: 'Beta Ltd', sector: 'Financials' },
    { symbol: 'CCC', name: 'Gamma Ltd', sector: 'Technology' },
    { symbol: 'DDD', name: 'Delta Ltd', sector: 'Energy' }
  ]);
});

afterEach(() => marketDataProvider.resetProvider());

describe('portfolio valuation', () => {
  it('values cash plus holdings at the live price', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10); // 1000 + 0.50

    const portfolio = await portfolioService.getPortfolio(user._id);

    expect(portfolio.cashBalance).toBe(8999.5);
    expect(portfolio.holdingsValue).toBe(1000);
    expect(portfolio.totalValue).toBe(9999.5);
    expect(portfolio.holdings[0]).toMatchObject({ symbol: 'AAA', sector: 'Technology', quantity: 10, value: 1000 });
  });

  it('falls back to cost basis, flagged, when a holding cannot be priced', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    // Make AAA unpricable, then clear the cache so the outage is visible.
    delete prices.AAA;
    await cache().flush();

    const portfolio = await portfolioService.getPortfolio(user._id);

    // The holding is reported at cost rather than dropped, which would
    // silently understate the desk.
    expect(portfolio.holdings).toHaveLength(1);
    expect(portfolio.holdings[0].price).toBe(100);
    expect(portfolio.holdings[0].priceStale).toBe(true);
    expect(portfolio.holdingsValue).toBe(1000);
  });

  it('reports return against the configured opening balance', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 100);

    prices.AAA = 150;
    await cache().flush();

    const portfolio = await portfolioService.getPortfolio(user._id);

    // 100 shares bought at 100, now worth 150: +5000 on 100000, less the entry fee.
    expect(portfolio.returnPercent).toBeCloseTo(4.99, 1);
    expect(portfolio.unrealizedPnl).toBe(5000);
  });

  it('surfaces realized P&L from closed trades', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    prices.AAA = 120;
    await cache().flush();
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'sell', 10);

    const portfolio = await portfolioService.getPortfolio(user._id);
    expect(portfolio.realizedPnl).toBeGreaterThan(0);
    expect(portfolio.holdings).toHaveLength(0);
  });

  it('404s for an account with no portfolio', async () => {
    const user = await User.create({ name: 'Ghost', email: 'ghost@example.com', passwordHash: 'x' });

    await expect(portfolioService.getPortfolio(user._id)).rejects.toMatchObject({ code: 'PORTFOLIO_NOT_FOUND' });
  });
});

describe('risk metrics', () => {
  it('reports a single-sector book as concentrated', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 10);

    const risk = await portfolioService.getRiskMetrics(user._id);

    expect(risk.concentrationIndex).toBe(1); // one sector holds everything
    expect(risk.diversificationScore).toBe(0);
    expect(risk.riskLevel).toBe('concentrated');
  });

  it('computes the Herfindahl index across two unequal sectors', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 25); // Technology, 2500
    await tradingEngineService.executeMarketOrder(user._id, 'BBB', 'buy', 25); // Financials, 5000

    const risk = await portfolioService.getRiskMetrics(user._id);

    expect(risk.sectorWeights).toHaveLength(2);
    expect(risk.sectorWeights[0].sector).toBe('Financials'); // largest first
    // HHI = (2/3)^2 + (1/3)^2 = 0.5556 — still concentrated: two sectors cannot
    // be called diversified however the weight is split.
    expect(risk.concentrationIndex).toBeCloseTo(0.56, 2);
    expect(risk.riskLevel).toBe('concentrated');
  });

  it('reports an evenly spread three-sector book as moderate', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    await tradingEngineService.executeMarketOrder(user._id, 'AAA', 'buy', 20); // Technology, 2000
    await tradingEngineService.executeMarketOrder(user._id, 'BBB', 'buy', 10); // Financials, 2000
    await tradingEngineService.executeMarketOrder(user._id, 'DDD', 'buy', 40); // Energy, 2000

    const risk = await portfolioService.getRiskMetrics(user._id);

    // HHI = 3 * (1/3)^2 = 0.333
    expect(risk.concentrationIndex).toBeCloseTo(0.33, 2);
    expect(risk.riskLevel).toBe('moderate');
    expect(risk.sectorWeights).toHaveLength(3);
  });

  it('returns a zero Sharpe ratio when there is no history to measure', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const risk = await portfolioService.getRiskMetrics(user._id);

    expect(risk.sharpeRatio).toBe(0);
    expect(risk.observations).toBe(0);
  });
});

describe('snapshots and history', () => {
  it('records one snapshot per day, updating the same row', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    await portfolioService.captureSnapshot(user._id);
    await portfolioService.captureSnapshot(user._id);

    const history = await portfolioService.getHistory(user._id, { days: 30 });
    expect(history).toHaveLength(1);
    expect(history[0].totalValue).toBe(10000);
  });

  it('returns snapshots oldest first for charting', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });

    const yesterday = new Date(Date.now() - 86400e3);
    await snapshotService.recordSnapshot({ userId: user._id, totalValue: 9000, cashBalance: 9000, holdingsValue: 0, date: yesterday });
    await snapshotService.recordSnapshot({ userId: user._id, totalValue: 10000, cashBalance: 10000, holdingsValue: 0 });

    const history = await portfolioService.getHistory(user._id, { days: 30 });
    expect(history.map((h) => h.totalValue)).toEqual([9000, 10000]);
  });
});

describe('leaderboard materialisation', () => {
  it('ranks desks by return and writes all three periods', async () => {
    const { user: winner } = await createUserWithPortfolio({ cashBalance: 100000, email: 'winner@example.com' });
    const { user: loser } = await createUserWithPortfolio({ cashBalance: 100000, email: 'loser@example.com' });
    const { user: flat } = await createUserWithPortfolio({ cashBalance: 100000, email: 'flat@example.com' });

    await tradingEngineService.executeMarketOrder(winner._id, 'BBB', 'buy', 100); // 200 -> 400 = +100%
    await tradingEngineService.executeMarketOrder(loser._id, 'CCC', 'buy', 100); // 50 -> 10 = -80%
    void flat;

    prices.BBB = 400;
    prices.CCC = 10;
    await cache().flush();

    const summary = await leaderboardService.computeLeaderboard();
    expect(summary.desks).toBe(3);

    const allTime = await leaderboardService.getLeaderboard('all_time');
    expect(allTime.items[0].name).toBe('Test Desk');
    expect(allTime.items[0].rank).toBe(1);
    // The winner must outrank the loser.
    const winnerRow = allTime.items.find((r) => String(r.userId) === String(winner._id));
    const loserRow = allTime.items.find((r) => String(r.userId) === String(loser._id));
    expect(winnerRow.rank).toBeLessThan(loserRow.rank);

    const daily = await Leaderboard.countDocuments({ period: 'daily' });
    expect(daily).toBe(3);
    expect(await Leaderboard.countDocuments({ period: 'weekly' })).toBe(3);
  });

  it('serves the materialised board rather than aggregating on request', async () => {
    await createUserWithPortfolio({ cashBalance: 100000 });
    await leaderboardService.computeLeaderboard();

    const board = await leaderboardService.getLeaderboard('all_time');

    expect(board.computedAt).toBeInstanceOf(Date);
    expect(board.items).toHaveLength(1);
  });

  it('recomputes without duplicating rows', async () => {
    await createUserWithPortfolio({ cashBalance: 100000 });

    await leaderboardService.computeLeaderboard();
    await leaderboardService.computeLeaderboard();

    expect(await Leaderboard.countDocuments({ period: 'all_time' })).toBe(1);
  });

  it('reports a desk’s own rank', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await leaderboardService.computeLeaderboard();

    const mine = await leaderboardService.getMyRank(user._id, 'all_time');
    expect(mine).toMatchObject({ rank: 1, total: 1 });
  });

  it('returns null for a desk that has never been ranked', async () => {
    const user = await User.create({ name: 'Unranked', email: 'unranked@example.com', passwordHash: 'x' });
    await Portfolio.create({ userId: user._id, cashBalance: 0 });

    expect(await leaderboardService.getMyRank(user._id)).toBeNull();
  });

  it('paginates the board', async () => {
    for (let i = 0; i < 3; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await createUserWithPortfolio({ cashBalance: 100000, email: `desk${i}@example.com` });
    }
    await leaderboardService.computeLeaderboard();

    const page = await leaderboardService.getLeaderboard('all_time', { limit: '2', page: '2' });

    expect(page.items).toHaveLength(1);
    expect(page.pagination).toMatchObject({ page: 2, limit: 2, total: 3, pages: 2 });
  });
});

describe('leaderboard snapshots', () => {
  it('captures a portfolio value per desk while computing', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    await leaderboardService.computeLeaderboard();

    const history = await snapshotService.getHistory(user._id, { days: 1 });
    expect(history).toHaveLength(1);
    expect(history[0].totalValue).toBe(100000);
  });

  it('skips a portfolio whose documents are inconsistent rather than failing the run', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 100000 });
    // A portfolio pointing at a deleted user is the realistic corrupt case.
    await User.deleteOne({ _id: user._id });

    const summary = await leaderboardService.computeLeaderboard();
    expect(summary.desks).toBe(0);
  });
});

describe('ObjectId handling', () => {
  it('accepts a string user id', async () => {
    const { user } = await createUserWithPortfolio({ cashBalance: 10000 });
    const portfolio = await portfolioService.getPortfolio(String(user._id));

    expect(portfolio.cashBalance).toBe(10000);
    expect(mongoose.isValidObjectId(user._id)).toBe(true);
  });
});
