const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const Stock = require('../models/Stock');
const marketDataProvider = require('../integrations/marketDataProvider');
const { Errors } = require('../utils/errors');
const { round2 } = require('../utils/money');
const { trading: tradingConfig } = require('../config/env');
const snapshotService = require('./snapshotService');
const logger = require('../config/logger');

/**
 * Portfolio reads: valuation, history, and risk. All of it is derived from the
 * ledger plus live quotes — nothing here stores a balance, so the figures
 * cannot drift from the transactions that produced them.
 */

/** Sector lookup for every symbol at once, so a valuation is not N queries. */
const sectorMap = async (symbols) => {
  if (!symbols.length) return new Map();
  const stocks = await Stock.find({ symbol: { $in: symbols } }).select('symbol sector').lean();
  return new Map(stocks.map((s) => [s.symbol, s.sector || 'Unclassified']));
};

/** Quote every holding concurrently, degrading per-symbol rather than all-or-nothing. */
const valueHoldings = async (holdings) => {
  const settled = await Promise.all(
    holdings.map(async (holding) => {
      try {
        const quote = await marketDataProvider.getQuote(holding.symbol);
        return { holding, quote, priced: true };
      } catch (err) {
        logger.warn(`Valuation fell back to cost basis for ${holding.symbol}: ${err.message}`);
        return { holding, quote: null, priced: false };
      }
    })
  );

  const sectors = await sectorMap(holdings.map((h) => h.symbol));
  let holdingsValue = 0;
  let costBasis = 0;

  const rows = settled.map(({ holding, quote, priced }) => {
    // An unpriced holding is valued at cost, and flagged, rather than dropped —
    // silently omitting it would understate the portfolio.
    const price = priced ? quote.price : holding.avgCostBasis;
    const value = round2(price * holding.quantity);
    const cost = round2(holding.avgCostBasis * holding.quantity);
    const unrealized = round2(value - cost);

    holdingsValue += value;
    costBasis += cost;

    return {
      symbol: holding.symbol,
      quantity: holding.quantity,
      avgCostBasis: holding.avgCostBasis,
      sector: sectors.get(holding.symbol) || 'Unclassified',
      price,
      priceStale: priced ? Boolean(quote.stale) : true,
      value,
      costBasis: cost,
      unrealizedPnl: unrealized,
      unrealizedPnlPercent: cost > 0 ? round2((unrealized / cost) * 100) : 0
    };
  });

  return { rows, holdingsValue: round2(holdingsValue), costBasis: round2(costBasis) };
};

const getPortfolio = async (userId) => {
  const portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) throw Errors.portfolioNotFound();

  const { rows, holdingsValue, costBasis } = await valueHoldings(portfolio.holdings);
  const totalValue = round2(portfolio.cashBalance + holdingsValue);

  const realized = await Transaction.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(String(userId)), type: 'sell' } },
    { $group: { _id: null, total: { $sum: '$realizedPnl' } } }
  ]);

  return {
    cashBalance: round2(portfolio.cashBalance),
    holdingsValue,
    totalValue,
    costBasis,
    unrealizedPnl: round2(holdingsValue - costBasis),
    realizedPnl: round2(realized[0]?.total || 0),
    // Return against the configured opening balance, so the figure is stable
    // even for a desk that has since deposited or withdrawn nothing.
    returnPercent: tradingConfig.startingCash
      ? round2(((totalValue - tradingConfig.startingCash) / tradingConfig.startingCash) * 100)
      : 0,
    holdings: rows,
    updatedAt: portfolio.updatedAt
  };
};

const getHistory = async (userId, options) => snapshotService.getHistory(userId, options);

/**
 * Risk metrics.
 * - Concentration: Herfindahl index over sector weights (0 spread, 1 single sector).
 * - Sharpe-style ratio: annualised mean daily return over its standard deviation,
 *   computed from stored snapshots.
 */
const getRiskMetrics = async (userId) => {
  const portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) throw Errors.portfolioNotFound();

  const { rows, holdingsValue } = await valueHoldings(portfolio.holdings);

  const bySector = new Map();
  rows.forEach((row) => {
    bySector.set(row.sector, round2((bySector.get(row.sector) || 0) + row.value));
  });

  const weights = [...bySector.entries()]
    .map(([sector, value]) => ({ sector, value, percent: holdingsValue > 0 ? round2((value / holdingsValue) * 100) : 0 }))
    .sort((a, b) => b.value - a.value);

  const concentration = weights.reduce((sum, w) => sum + (w.percent / 100) ** 2, 0);

  const snapshots = await snapshotService.getHistory(userId, { days: 365 });
  const returns = [];
  for (let i = 1; i < snapshots.length; i += 1) {
    const previous = snapshots[i - 1].totalValue;
    if (previous > 0) returns.push(snapshots[i].totalValue / previous - 1);
  }

  let sharpeRatio = 0;
  if (returns.length >= 2) {
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + (b - mean) ** 2, 0) / (returns.length - 1);
    const deviation = Math.sqrt(variance);
    sharpeRatio = deviation > 0 ? round2((mean / deviation) * Math.sqrt(252)) : 0;
  }

  return {
    concentrationIndex: round2(concentration),
    diversificationScore: round2((1 - concentration) * 100),
    riskLevel: concentration < 0.2 ? 'diversified' : concentration < 0.4 ? 'moderate' : 'concentrated',
    sectorWeights: weights,
    sharpeRatio,
    observations: returns.length
  };
};

/** The daily snapshot used by the history chart and the leaderboard job. */
const captureSnapshot = async (userId) => {
  const portfolio = await Portfolio.findOne({ userId });
  if (!portfolio) return null;

  const { holdingsValue } = await valueHoldings(portfolio.holdings);
  return snapshotService.recordSnapshot({
    userId,
    cashBalance: round2(portfolio.cashBalance),
    holdingsValue,
    totalValue: round2(portfolio.cashBalance + holdingsValue)
  });
};

module.exports = { getPortfolio, getHistory, getRiskMetrics, captureSnapshot, valueHoldings };
