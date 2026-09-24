const User = require('../models/User');
const Stock = require('../models/Stock');
const Transaction = require('../models/Transaction');
const Portfolio = require('../models/Portfolio');
const AuditLog = require('../models/AuditLog');
const { Errors } = require('../utils/errors');
const { parsePagination, paginated } = require('../utils/pagination');
const { round2, roundQty } = require('../utils/money');
const audit = require('./auditService');

/**
 * Admin operations: platform analytics, stock CRUD, and anomaly flagging.
 */

const getSystemStats = async () => {
  const [users, activeUsers, transactions, stocks, volume] = await Promise.all([
    User.countDocuments(),
    // "Active" = traded in the last 7 days, not merely registered.
    Transaction.distinct('userId', { timestamp: { $gte: new Date(Date.now() - 7 * 86400e3) } }).then((ids) => ids.length),
    Transaction.countDocuments(),
    Stock.countDocuments({ isActive: { $ne: false } }),
    Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$grossValue' }, fees: { $sum: '$fee' } } }])
  ]);

  const mostTraded = await Transaction.aggregate([
    { $group: { _id: '$symbol', trades: { $sum: 1 }, volume: { $sum: '$grossValue' } } },
    { $sort: { trades: -1 } },
    { $limit: 10 },
    { $project: { _id: 0, symbol: '$_id', trades: 1, volume: { $round: ['$volume', 2] } } }
  ]);

  return {
    users,
    activeUsersLast7Days: activeUsers,
    transactions,
    stocks,
    totalVolume: round2(volume[0]?.total || 0),
    totalFees: round2(volume[0]?.fees || 0),
    mostTraded
  };
};

/**
 * Anomaly flagging: desks whose recent trade frequency is far above normal.
 * Flagged for human review — this never suspends anyone on its own.
 */
const getAnomalies = async ({ threshold, windowHours = 24, query = {} } = {}) => {
  const limit = Number(threshold) || Number(process.env.ANOMALY_TRADE_THRESHOLD) || 50;
  const since = new Date(Date.now() - windowHours * 3600e3);
  const { page, limit: pageSize, skip } = parsePagination(query, ['trades']);

  const pipeline = [
    { $match: { timestamp: { $gte: since } } },
    { $group: { _id: '$userId', trades: { $sum: 1 }, volume: { $sum: '$grossValue' }, symbols: { $addToSet: '$symbol' } } },
    { $match: { trades: { $gte: limit } } },
    { $sort: { trades: -1 } },
    {
      $facet: {
        rows: [
          { $skip: skip },
          { $limit: pageSize },
          {
            $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' }
          }
        ],
        total: [{ $count: 'count' }]
      }
    }
  ];

  const [result] = await Transaction.aggregate(pipeline);
  const total = result?.total?.[0]?.count || 0;

  const rows = (result?.rows || []).map((row) => ({
    userId: row._id,
    name: row.user?.[0]?.name || 'Unknown',
    email: row.user?.[0]?.email,
    trades: row.trades,
    volume: round2(row.volume),
    distinctSymbols: row.symbols.length
  }));

  return { items: rows, pagination: { page, limit: pageSize, total, pages: Math.ceil(total / pageSize) || 1 }, threshold: limit, windowHours };
};

const listStocks = async (query = {}) => {
  const { page, limit, skip, sort } = parsePagination(query, ['symbol', 'name', 'sector', 'currentPrice']);

  const filter = {};
  if (query.sector) filter.sector = query.sector;
  if (query.exchange) filter.exchange = query.exchange;
  if (query.search) filter.symbol = { $regex: `^${String(query.search).toUpperCase()}` };

  const [items, total] = await Promise.all([
    Stock.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Stock.countDocuments(filter)
  ]);

  return paginated(items, total, { page, limit });
};

const createStock = async (payload, actorId, ip) => {
  const { symbol, name, sector, exchange, currentPrice } = payload;

  const exists = await Stock.findOne({ symbol: String(symbol).toUpperCase() });
  if (exists) throw Errors.conflict(`${String(symbol).toUpperCase()} is already listed`, 'STOCK_EXISTS');

  const stock = await Stock.create({
    symbol: String(symbol).toUpperCase(),
    name,
    sector,
    exchange,
    currentPrice,
    isActive: true
  });

  await audit.record({ userId: actorId, action: audit.ACTIONS.STOCK_CREATED, metadata: { symbol: stock.symbol }, ip });
  return stock;
};

const updateStock = async (symbol, payload, actorId, ip) => {
  const updates = {};
  ['name', 'sector', 'exchange', 'currentPrice'].forEach((field) => {
    if (payload[field] !== undefined) updates[field] = payload[field];
  });

  const stock = await Stock.findOneAndUpdate(
    { symbol: String(symbol).toUpperCase() },
    { $set: { ...updates, lastUpdated: new Date() } },
    { new: true, runValidators: true }
  );

  if (!stock) throw Errors.notFound(`No stock listed as ${symbol}`, 'STOCK_NOT_FOUND');

  await audit.record({ userId: actorId, action: audit.ACTIONS.STOCK_UPDATED, metadata: { symbol: stock.symbol, updates }, ip });
  return stock;
};

/**
 * Delist rather than delete: transactions reference the symbol, and removing
 * the row would orphan history. A delisted stock is closed to new orders.
 */
const delistStock = async (symbol, actorId, ip) => {
  const stock = await Stock.findOneAndUpdate(
    { symbol: String(symbol).toUpperCase() },
    { $set: { isActive: false, delistedAt: new Date() } },
    { new: true }
  );

  if (!stock) throw Errors.notFound(`No stock listed as ${symbol}`, 'STOCK_NOT_FOUND');

  await audit.record({ userId: actorId, action: audit.ACTIONS.STOCK_DELISTED, metadata: { symbol: stock.symbol }, ip });
  return stock;
};

const listUsers = async (query = {}) => {
  const { page, limit, skip, sort } = parsePagination(query, ['name', 'email', 'createdAt']);
  const [users, total] = await Promise.all([
    User.find().select('name email role isVerified createdAt').sort(sort).skip(skip).limit(limit).lean(),
    User.countDocuments()
  ]);
  return paginated(users, total, { page, limit });
};

const getAuditLogs = async (query = {}) => {
  const { page, limit, skip, sort } = parsePagination(query, ['timestamp', 'action']);

  const filter = {};
  if (query.action) filter.action = query.action;
  if (query.userId) filter.userId = query.userId;

  const [logs, total] = await Promise.all([
    AuditLog.find(filter).sort(sort).skip(skip).limit(limit).populate('userId', 'name email').lean(),
    AuditLog.countDocuments(filter)
  ]);

  return paginated(logs, total, { page, limit });
};

/** Platform-wide holdings leaderboard by position count — a quick exposure read. */
const getTopHolders = async (symbol, limit = 10) =>
  Portfolio.find({ 'holdings.symbol': String(symbol).toUpperCase() })
    .select('userId holdings')
    .populate('userId', 'name')
    .lean()
    .then((portfolios) =>
      portfolios
        .map((p) => ({
          userId: p.userId?._id,
          name: p.userId?.name,
          quantity: roundQty(p.holdings.find((h) => h.symbol === String(symbol).toUpperCase())?.quantity || 0)
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit)
    );

module.exports = {
  getSystemStats,
  getAnomalies,
  listStocks,
  createStock,
  updateStock,
  delistStock,
  listUsers,
  getAuditLogs,
  getTopHolders
};
