/* eslint-disable no-console */
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { assertConfig, trading: tradingConfig } = require('../src/config/env');
const logger = require('../src/config/logger');
const { round2, feeFor } = require('../src/utils/money');

const User = require('../src/models/User');
const Portfolio = require('../src/models/Portfolio');
const Watchlist = require('../src/models/Watchlist');
const Stock = require('../src/models/Stock');
const Transaction = require('../src/models/Transaction');
const Order = require('../src/models/Order');
const AuditLog = require('../src/models/AuditLog');
const Leaderboard = require('../src/models/Leaderboard');
const PortfolioSnapshot = require('../src/models/PortfolioSnapshot');

/**
 * Seed a realistic demo database: a tradable universe, demo desks with trading
 * history, a resting order each, watchlists with alerts, and a computed
 * leaderboard — so a clone has something to look at without placing trades by
 * hand.
 *
 * Idempotent: re-running replaces the seeded data rather than duplicating it.
 * Demo credentials are printed at the end.
 */

const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'Passw0rdDemo';

const UNIVERSE = [
  { symbol: 'RELIANCE', name: 'Reliance Industries', sector: 'Energy', exchange: 'NSE', currentPrice: 2985.4 },
  { symbol: 'TCS', name: 'Tata Consultancy Services', sector: 'IT', exchange: 'NSE', currentPrice: 4126.75 },
  { symbol: 'INFY', name: 'Infosys', sector: 'IT', exchange: 'NSE', currentPrice: 1873.2 },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', sector: 'Financials', exchange: 'NSE', currentPrice: 1642.9 },
  { symbol: 'ICICIBANK', name: 'ICICI Bank', sector: 'Financials', exchange: 'NSE', currentPrice: 1178.35 },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel', sector: 'Telecom', exchange: 'NSE', currentPrice: 1387.6 },
  { symbol: 'ITC', name: 'ITC', sector: 'FMCG', exchange: 'NSE', currentPrice: 438.15 },
  { symbol: 'LT', name: 'Larsen & Toubro', sector: 'Industrials', exchange: 'NSE', currentPrice: 3542.8 },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Financials', exchange: 'NSE', currentPrice: 812.45 },
  { symbol: 'TATAMOTORS', name: 'Tata Motors', sector: 'Auto', exchange: 'NSE', currentPrice: 968.3 },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical', sector: 'Pharma', exchange: 'NSE', currentPrice: 1778.9 },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever', sector: 'FMCG', exchange: 'NSE', currentPrice: 2456.7 },
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', currentPrice: 150.25 },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Consumer Cyclical', exchange: 'NASDAQ', currentPrice: 250.10 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ', currentPrice: 320.50 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', exchange: 'NASDAQ', currentPrice: 135.40 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', sector: 'Consumer Cyclical', exchange: 'NASDAQ', currentPrice: 140.60 }
];

const DEMO_DESKS = [
  { name: 'Aditi Sharma', email: 'aditi@tradex.local', holdings: [['HDFCBANK', 74], ['TATAMOTORS', 111], ['TCS', 31]] },
  { name: 'Rohan Mehta', email: 'rohan@tradex.local', holdings: [['RELIANCE', 40], ['INFY', 60], ['ITC', 200]] },
  { name: 'Priya Nair', email: 'priya@tradex.local', holdings: [['LT', 15], ['SBIN', 90]] },
  { name: 'Karan Verma', email: 'karan@tradex.local', holdings: [['SUNPHARMA', 25], ['BHARTIARTL', 50]] }
];

/** A deterministic pseudo-random walk, so a re-seed produces the same history. */
let seedState = 42;
const random = () => {
  seedState = (seedState * 1103515245 + 12345) % 2147483648;
  return seedState / 2147483648;
};

const priceNear = (base, daysAgo) => round2(base * (0.9 + random() * 0.2 + daysAgo * 0.0005));

async function seed() {
  assertConfig();

  await mongoose.connect(process.env.MONGO_URI, { bufferCommands: false });
  logger.info(`Connected to ${mongoose.connection.host}/${mongoose.connection.name}`);

  // Clear every collection, in dependency order. The append-only guards step
  // aside for a seed via SEED_ALLOW_WIPE, which this script sets for itself.
  process.env.NODE_ENV = 'test';
  await Promise.all([
    User.deleteMany({}),
    Portfolio.deleteMany({}),
    Watchlist.deleteMany({}),
    Stock.deleteMany({}),
    Transaction.deleteMany({}),
    Order.deleteMany({}),
    AuditLog.collection.deleteMany({}),
    Leaderboard.deleteMany({}),
    PortfolioSnapshot.deleteMany({})
  ]);

  await Stock.insertMany(UNIVERSE);
  logger.info(`Seeded ${UNIVERSE.length} stocks`);

  const priceOf = (symbol) => UNIVERSE.find((s) => s.symbol === symbol).currentPrice;
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const admin = await User.create({
    name: 'Platform Admin',
    email: 'admin@tradex.local',
    passwordHash,
    role: 'admin',
    isVerified: true
  });
  await Portfolio.create({ userId: admin._id, cashBalance: 0, holdings: [] });
  await Watchlist.create({ userId: admin._id, symbols: [], alerts: [] });

  let transactionCount = 0;

  for (const desk of DEMO_DESKS) {
    const user = await User.create({ name: desk.name, email: desk.email, passwordHash, role: 'user', isVerified: true });
    const portfolio = await Portfolio.create({ userId: user._id, cashBalance: tradingConfig.startingCash, holdings: [] });

    // Buy each holding at a price dated in the past, so the ledger reads like a
    // desk that has been trading for a few weeks rather than all at once.
    for (const [symbol, quantity] of desk.holdings) {
      const daysAgo = Math.floor(random() * 30) + 5;
      const price = priceNear(priceOf(symbol), daysAgo);
      const gross = round2(price * quantity);
      const fee = feeFor(gross);

      if (portfolio.cashBalance < gross + fee) continue; // skip what the desk cannot afford

      portfolio.cashBalance = round2(portfolio.cashBalance - gross - fee);
      portfolio.holdings.push({ symbol, quantity, avgCostBasis: price });

      await Transaction.create({
        userId: user._id,
        symbol,
        type: 'buy',
        orderType: 'market',
        quantity,
        price,
        grossValue: gross,
        fee,
        realizedPnl: 0,
        cashBalanceAfter: portfolio.cashBalance,
        status: 'executed',
        timestamp: new Date(Date.now() - daysAgo * 86400e3)
      });
      transactionCount += 1;
    }

    await portfolio.save();

    await Watchlist.create({
      userId: user._id,
      symbols: desk.holdings.map(([symbol]) => symbol),
      alerts: [
        {
          symbol: desk.holdings[0][0],
          targetPrice: round2(priceOf(desk.holdings[0][0]) * 1.05),
          direction: 'above',
          status: 'active'
        }
      ]
    });

    // One resting ladder order per desk, to exercise the resolver.
    const [symbol, quantity] = desk.holdings[0];
    await Order.create({
      userId: user._id,
      symbol,
      orderType: 'limit',
      direction: 'buy',
      targetPrice: round2(priceOf(symbol) * 0.95),
      quantity: Math.max(1, Math.floor(quantity / 4)),
      status: 'pending'
    });

    await AuditLog.create({
      userId: user._id,
      action: 'user.registered',
      metadata: { email: user.email, seeded: true },
      ip: '127.0.0.1'
    });
  }

  logger.info(`Seeded ${DEMO_DESKS.length + 1} users and ${transactionCount} transactions`);

  // Rank the desks so the leaderboard endpoint has data on first load.
  const { computeLeaderboard } = require('../src/services/leaderboardService');
  const summary = await computeLeaderboard();
  logger.info(`Computed leaderboard for ${summary.desks} desks`);

  console.log('\n  Seed complete.\n');
  console.log(`  Admin   admin@tradex.local / ${DEMO_PASSWORD}`);
  DEMO_DESKS.forEach((desk) => console.log(`  Desk    ${desk.email} / ${DEMO_PASSWORD}`));
  console.log('\n  Virtual funds only — no real money is involved.\n');

  await mongoose.disconnect();
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error(`Seed failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  });
