const Watchlist = require('../models/Watchlist');
const marketDataProvider = require('../integrations/marketDataProvider');
const { Errors } = require('../utils/errors');
const audit = require('./auditService');
const logger = require('../config/logger');

/** Read a user's watchlist, with live quotes attached where available. */
const getWatchlist = async (userId) => {
  const watchlist = await Watchlist.findOne({ userId }).lean();
  const symbols = watchlist?.symbols || [];

  const quotes = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const quote = await marketDataProvider.getQuote(symbol);
        return { symbol, price: quote.price, changePercent: quote.changePercent, stale: quote.stale };
      } catch (err) {
        logger.warn(`Watchlist quote unavailable for ${symbol}: ${err.message}`);
        return { symbol, price: null, changePercent: null, stale: true };
      }
    })
  );

  return {
    symbols,
    quotes,
    alerts: watchlist?.alerts || []
  };
};

const addSymbol = async (userId, symbol) => {
  const normalized = String(symbol || '').toUpperCase();
  if (!normalized) throw Errors.badRequest('Symbol is required', 'SYMBOL_REQUIRED');

  // Upsert so a first-time add does not depend on registration having created a doc.
  const watchlist = await Watchlist.findOneAndUpdate(
    { userId },
    { $addToSet: { symbols: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return { symbols: watchlist.symbols, alerts: watchlist.alerts };
};

const removeSymbol = async (userId, symbol) => {
  const normalized = String(symbol || '').toUpperCase();
  const watchlist = await Watchlist.findOne({ userId });
  if (!watchlist) throw Errors.notFound('Watchlist not found', 'WATCHLIST_NOT_FOUND');

  if (!watchlist.symbols.includes(normalized)) {
    throw Errors.notFound(`${normalized} is not on your watchlist`, 'SYMBOL_NOT_WATCHED');
  }

  watchlist.symbols = watchlist.symbols.filter((s) => s !== normalized);
  await watchlist.save();

  return { symbols: watchlist.symbols, alerts: watchlist.alerts };
};

/**
 * Price-target alerts. The alert is only a rule — it is evaluated by the
 * scheduled job, which is the only thing that can mark it triggered.
 */
const createAlert = async (userId, { symbol, targetPrice, direction }) => {
  const normalized = String(symbol || '').toUpperCase();
  const target = Number(targetPrice);

  if (!normalized) throw Errors.badRequest('Symbol is required', 'SYMBOL_REQUIRED');
  if (!Number.isFinite(target) || target <= 0) throw Errors.badRequest('Target price must be greater than zero', 'INVALID_TARGET_PRICE');
  if (!['above', 'below'].includes(direction)) throw Errors.badRequest('Direction must be above or below', 'INVALID_ALERT_DIRECTION');

  const watchlist = await Watchlist.findOneAndUpdate(
    { userId },
    { $addToSet: { symbols: normalized } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const activeDuplicate = watchlist.alerts.find(
    (a) => a.symbol === normalized && a.direction === direction && a.targetPrice === target && a.status === 'active'
  );
  if (activeDuplicate) throw Errors.conflict('That alert already exists', 'ALERT_EXISTS');

  watchlist.alerts.push({ symbol: normalized, targetPrice: target, direction, status: 'active' });
  await watchlist.save();

  const alert = watchlist.alerts[watchlist.alerts.length - 1];
  await audit.record({
    userId,
    action: audit.ACTIONS.ALERT_CREATED,
    metadata: { alertId: alert._id, symbol: normalized, targetPrice: target, direction }
  });

  return alert;
};

const deleteAlert = async (userId, alertId) => {
  const watchlist = await Watchlist.findOne({ userId });
  if (!watchlist) throw Errors.notFound('Watchlist not found', 'WATCHLIST_NOT_FOUND');

  const alert = watchlist.alerts.id(alertId);
  if (!alert) throw Errors.notFound('Alert not found', 'ALERT_NOT_FOUND');

  alert.deleteOne();
  await watchlist.save();

  return { alerts: watchlist.alerts };
};

module.exports = { getWatchlist, addSymbol, removeSymbol, createAlert, deleteAlert };
