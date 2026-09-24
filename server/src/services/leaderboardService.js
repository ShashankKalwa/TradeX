const Portfolio = require('../models/Portfolio');
const Leaderboard = require('../models/Leaderboard');

const { trading: tradingConfig } = require('../config/env');
const portfolioService = require('./portfolioService');
const { round2 } = require('../utils/money');
const { parsePagination, paginated } = require('../utils/pagination');
const logger = require('../config/logger');

/**
 * Leaderboard reads serve the materialised collection; the aggregation runs in
 * the scheduled job, never on a request. Ranking every portfolio on each page
 * view would make a read endpoint O(users) in market-data calls.
 */

const PERIODS = ['daily', 'weekly', 'all_time'];

const getLeaderboard = async (period = 'all_time', query = {}) => {
  const normalized = PERIODS.includes(period) ? period : 'all_time';
  const { page, limit, skip } = parsePagination(query, ['rank', 'returnPct']);

  const [entries, total, computedAt] = await Promise.all([
    Leaderboard.find({ period: normalized })
      .sort({ rank: 1 })
      .skip(skip)
      .limit(limit)
      .populate('userId', 'name')
      .lean(),
    Leaderboard.countDocuments({ period: normalized }),
    Leaderboard.findOne({ period: normalized }).sort({ computedAt: -1 }).select('computedAt').lean()
  ]);

  const rows = entries.map((entry) => ({
    rank: entry.rank,
    userId: entry.userId?._id,
    name: entry.userId?.name || 'Anonymous desk',
    returnPct: entry.returnPct
  }));

  return { ...paginated(rows, total, { page, limit }), period: normalized, computedAt: computedAt?.computedAt || null };
};

/** Where one user sits, without paging through the board. */
const getMyRank = async (userId, period = 'all_time') => {
  const normalized = PERIODS.includes(period) ? period : 'all_time';
  const entry = await Leaderboard.findOne({ period: normalized, userId }).lean();
  if (!entry) return null;

  const total = await Leaderboard.countDocuments({ period: normalized });
  return { rank: entry.rank, returnPct: entry.returnPct, total, period: normalized };
};

/**
 * Recompute every period. Returns are measured against the configured opening
 * cash for the same reason the portfolio service does it: the figure must not
 * depend on a constant duplicated in two places.
 */
const computeLeaderboard = async () => {
  const startingCash = tradingConfig.startingCash;
  if (!startingCash) throw new Error('STARTING_CASH must be set to compute returns');

  const portfolios = await Portfolio.find({}).populate('userId', 'name').lean();
  const results = [];

  for (const portfolio of portfolios) {
    try {
      // An orphaned portfolio (owner deleted) has no one to rank, and writing a
      // row with a null user would put a nameless entry on the board.
      const ownerId = portfolio.userId?._id;
      if (!ownerId) {
        logger.warn(`Leaderboard skipped portfolio ${portfolio._id}: its owner no longer exists`);
        continue;
      }

      const { holdingsValue } = await portfolioService.valueHoldings(portfolio.holdings);
      const totalValue = round2(portfolio.cashBalance + holdingsValue);
      const returnPct = round2(((totalValue - startingCash) / startingCash) * 100);
      results.push({ userId: ownerId, returnPct, totalValue });
    } catch (err) {
      logger.warn(`Leaderboard skipped portfolio ${portfolio._id}: ${err.message}`);
    }
  }

  results.sort((a, b) => b.returnPct - a.returnPct);

  // Snapshot today's value while we have it — the history chart reads these.
  await Promise.all(
    results.map((row) => portfolioService.captureSnapshot(row.userId).catch(() => null))
  );

  let written = 0;
  for (const period of PERIODS) {
    const ranked = results.map((row, index) => ({
      period,
      userId: row.userId,
      returnPct: row.returnPct,
      rank: index + 1,
      computedAt: new Date()
    }));

    // Replace wholesale, then swap: readers see either the old board or the new
    // one, never a half-deleted one. (No transaction — a board is a cache.)
    await Leaderboard.deleteMany({ period });
    if (ranked.length) {
      await Leaderboard.insertMany(ranked, { ordered: false });
      written += ranked.length;
    }
  }

  logger.info(`Leaderboard recomputed: ${results.length} desks, ${written} rows across ${PERIODS.length} periods`);
  return { desks: results.length, rows: written };
};

module.exports = { getLeaderboard, getMyRank, computeLeaderboard, PERIODS };
