const mongoose = require('mongoose');
const Portfolio = require('../models/Portfolio');
const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const Stock = require('../models/Stock');
const marketDataProvider = require('../integrations/marketDataProvider');
const { Errors } = require('../utils/errors');
const { round2, roundQty, feeFor, newAverageCost, realizedPnl } = require('../utils/money');
const { trading: tradingConfig } = require('../config/env');
const audit = require('./auditService');
const bus = require('../utils/events');
const logger = require('../config/logger');

const MAX_ATTEMPTS = 5;

const isTransient = (err) =>
  typeof err.hasErrorLabel === 'function' ? err.hasErrorLabel('TransientTransactionError') : false;

/**
 * Run `work` inside a Mongo transaction, retrying the whole unit when the
 * database reports a write conflict or when optimistic locking rejects our
 * write because another request touched the portfolio first.
 *
 * Retrying the *whole* unit (re-read included) is what makes the balance check
 * meaningful: a retry must see the committed state, not the snapshot that was
 * already proven stale.
 */
const withTransactionRetry = async (work) => {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await work(session);
      });
      return result;
    } catch (err) {
      lastError = err;
      // A duplicate idempotency key is a definite answer, not a transient fault:
      // the caller handles it by returning the transaction that already exists.
      const duplicateKey = err && err.code === 11000;
      const retriable = !duplicateKey && (err.name === 'VersionError' || err.name === 'MongoServerError' || isTransient(err));
      if (!retriable || attempt === MAX_ATTEMPTS) throw err;
      // Small randomised backoff so contending writers do not re-collide in lockstep.
      await new Promise((resolve) => setTimeout(resolve, 5 * attempt + Math.random() * 20));
    } finally {
      await session.endSession();
    }
  }

  throw lastError;
};

/** The Stock collection IS the tradable universe: delisted names are closed to new orders. */
const assertTradable = async (symbol) => {
  const listed = await Stock.exists({ symbol, isActive: true });
  if (!listed) {
    throw Errors.badRequest(`${symbol} is not a listed instrument`, 'SYMBOL_NOT_LISTED');
  }
};

/** Read the portfolio, or fail with a typed 404. */
const loadPortfolio = async (userId, session) => {
  const portfolio = await Portfolio.findOne({ userId }).session(session ?? null);
  if (!portfolio) throw Errors.portfolioNotFound();
  return portfolio;
};

/**
 * Apply a fill to a portfolio document in memory. Pure function of its inputs —
 * all balance and holdings arithmetic lives here and nowhere else.
 */
const applyFill = (portfolio, { symbol, side, quantity, price }) => {
  const gross = round2(price * quantity);
  const fee = feeFor(gross);
  const holding = portfolio.holdings.find((h) => h.symbol === symbol);
  let realized = 0;

  if (side === 'buy') {
    const totalCost = round2(gross + fee);
    if (portfolio.cashBalance < totalCost) {
      throw Errors.insufficientFunds(totalCost, portfolio.cashBalance);
    }

    portfolio.cashBalance = round2(portfolio.cashBalance - totalCost);

    if (holding) {
      holding.avgCostBasis = newAverageCost(holding.quantity, holding.avgCostBasis, quantity, price);
      holding.quantity = roundQty(holding.quantity + quantity);
    } else {
      portfolio.holdings.push({ symbol, quantity: roundQty(quantity), avgCostBasis: round2(price) });
    }
  } else {
    if (!holding || holding.quantity < quantity) {
      throw Errors.insufficientHoldings(symbol, holding ? holding.quantity : 0, quantity);
    }

    // Charged against the average cost basis, net of the exit fee.
    realized = realizedPnl(quantity, price, holding.avgCostBasis, fee);

    portfolio.cashBalance = round2(portfolio.cashBalance + gross - fee);
    holding.quantity = roundQty(holding.quantity - quantity);
    if (holding.quantity <= 0) {
      portfolio.holdings = portfolio.holdings.filter((h) => h.symbol !== symbol);
    }
  }

  return { gross, fee, realized };
};

/**
 * Append the fill to the ledger. Throws a duplicate-key error if this
 * idempotency key was already used, which the caller treats as "already done".
 */
const appendTransaction = async (session, { userId, symbol, side, orderType, quantity, price, gross, fee, realized, cashBalanceAfter, idempotencyKey }) => {
  const [transaction] = await Transaction.create(
    [
      {
        userId,
        symbol,
        type: side,
        orderType,
        quantity,
        price,
        grossValue: gross,
        fee,
        realizedPnl: realized,
        cashBalanceAfter,
        status: 'executed',
        idempotencyKey: idempotencyKey || undefined
      }
    ],
    { session }
  );
  return transaction;
};

/**
 * Execute a market order: validate, write the fill and the ledger entry, and
 * commit them together or not at all.
 *
 * @param {string} userId
 * @param {string} symbol
 * @param {'buy'|'sell'} side
 * @param {number} quantity
 * @param {{ idempotencyKey?: string, orderType?: 'market'|'limit'|'stop', orderId?: string }} options
 */
const executeMarketOrder = async (userId, symbol, side, quantity, options = {}) => {
  const { idempotencyKey, orderType = 'market', orderId = null } = options;

  const normalizedSymbol = String(symbol || '').toUpperCase();
  const normalizedSide = String(side || '').toLowerCase();
  const qty = Number(quantity);

  if (!normalizedSymbol) throw Errors.badRequest('Symbol is required', 'SYMBOL_REQUIRED');
  if (!['buy', 'sell'].includes(normalizedSide)) throw Errors.badRequest('Side must be buy or sell', 'INVALID_SIDE');
  if (!Number.isFinite(qty) || qty <= 0) throw Errors.badRequest('Quantity must be greater than zero', 'INVALID_QUANTITY');

  // Replay protection: a retried request returns the original fill untouched.
  // The portfolio is loaded too, so the caller's response shape is identical to
  // a fresh execution rather than a half-populated one.
  if (idempotencyKey) {
    const existing = await Transaction.findOne({ userId, idempotencyKey });
    if (existing) {
      const portfolio = await loadPortfolio(userId);
      return { transaction: existing, portfolio, replayed: true };
    }
  }

  await assertTradable(normalizedSymbol);

  // Price is locked here, outside the transaction: it is the execution price,
  // and holding a transaction open across a network call would be wasteful.
  const quote = await marketDataProvider.getQuote(normalizedSymbol);
  if (!quote || !Number.isFinite(quote.price)) throw Errors.priceUnavailable(normalizedSymbol);
  const price = quote.price;

  try {
    const { transaction, portfolio } = await withTransactionRetry(async (session) => {
      const portfolioDoc = await loadPortfolio(userId, session);
      const { gross, fee, realized } = applyFill(portfolioDoc, {
        symbol: normalizedSymbol,
        side: normalizedSide,
        quantity: qty,
        price
      });

      await portfolioDoc.save({ session });

      const tx = await appendTransaction(session, {
        userId,
        symbol: normalizedSymbol,
        side: normalizedSide,
        orderType,
        quantity: qty,
        price,
        gross,
        fee,
        realized,
        cashBalanceAfter: portfolioDoc.cashBalance,
        idempotencyKey
      });

      return { transaction: tx, portfolio: portfolioDoc };
    });

    if (orderId) {
      // The resolver claims orders as `processing`, so both states are accepted
      // here — a market order placed directly is still `pending`.
      await Order.updateOne(
        { _id: orderId, status: { $in: ['pending', 'processing'] } },
        { $set: { status: 'filled', filledAt: new Date(), filledPrice: price } }
      );
    }

    bus.emit('trade.executed', { userId, transaction, portfolio });
    await audit.record({
      userId,
      action: audit.ACTIONS.TRADE_EXECUTED,
      metadata: {
        symbol: normalizedSymbol,
        side: normalizedSide,
        quantity: qty,
        price,
        fee: transaction.fee,
        realizedPnl: transaction.realizedPnl,
        transactionId: transaction._id
      }
    });

    return { transaction, portfolio, replayed: false };
  } catch (err) {
    // Lost the idempotency race: another identical request committed first.
    if (err && err.code === 11000 && idempotencyKey) {
      const existing = await Transaction.findOne({ userId, idempotencyKey });
      if (existing) {
        const portfolio = await loadPortfolio(userId);
        return { transaction: existing, portfolio, replayed: true };
      }
    }
    throw err;
  }
};

/**
 * Place a resting limit or stop order. Reserves nothing: funds and holdings are
 * validated when the order actually fills, through the same path as a market
 * order, so a resting order can never leave a portfolio inconsistent.
 */
const placePendingOrder = async (userId, symbol, orderType, direction, targetPrice, quantity, options = {}) => {
  const normalizedType = String(orderType || '').toLowerCase();
  const normalizedDirection = String(direction || '').toLowerCase();
  const normalizedSymbol = String(symbol || '').toUpperCase();
  const qty = Number(quantity);
  const target = Number(targetPrice);

  if (!['limit', 'stop'].includes(normalizedType)) throw Errors.badRequest('Order type must be limit or stop', 'INVALID_ORDER_TYPE');
  if (!['buy', 'sell'].includes(normalizedDirection)) throw Errors.badRequest('Direction must be buy or sell', 'INVALID_DIRECTION');
  if (!Number.isFinite(qty) || qty <= 0) throw Errors.badRequest('Quantity must be greater than zero', 'INVALID_QUANTITY');
  if (!Number.isFinite(target) || target <= 0) throw Errors.badRequest('Target price must be greater than zero', 'INVALID_TARGET_PRICE');

  await assertTradable(normalizedSymbol);

  const order = await Order.create({
    userId,
    symbol: normalizedSymbol,
    orderType: normalizedType,
    direction: normalizedDirection,
    targetPrice: round2(target),
    quantity: qty,
    status: 'pending',
    idempotencyKey: options.idempotencyKey || undefined
  });

  await audit.record({
    userId,
    action: audit.ACTIONS.ORDER_PLACED,
    metadata: { orderId: order._id, symbol: normalizedSymbol, orderType: normalizedType, direction: normalizedDirection, targetPrice: target, quantity: qty }
  });

  return order;
};

/** Cancel a resting order. Only pending orders can be cancelled. */
const cancelOrder = async (userId, orderId) => {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, userId, status: 'pending' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { new: true }
  );

  if (!order) throw Errors.notFound('No pending order with that id', 'ORDER_NOT_FOUND');

  await audit.record({
    userId,
    action: audit.ACTIONS.ORDER_CANCELLED,
    metadata: { orderId: order._id, symbol: order.symbol }
  });

  return order;
};

/**
 * Claim a pending order for execution. The status transition is the lock: only
 * one worker can move pending -> processing, so a slow or crashed cycle can
 * never execute the same order twice.
 */
const claimPendingOrder = async (orderId) =>
  Order.findOneAndUpdate(
    { _id: orderId, status: 'pending' },
    { $set: { status: 'processing', processingAt: new Date() } },
    { new: true }
  );

/** Return a claimed order to the queue after a recoverable failure. */
const releaseOrder = async (orderId, reason) => {
  await Order.updateOne({ _id: orderId, status: 'processing' }, { $set: { status: 'pending', lastError: reason } });
};

/**
 * Fill a claimed order through the market-order path. On a permanent failure
 * (no funds, no shares) the order is cancelled rather than retried forever.
 */
const fillPendingOrder = async (order) => {
  try {
    const { transaction } = await executeMarketOrder(order.userId, order.symbol, order.direction, order.quantity, {
      orderType: order.orderType,
      orderId: order._id
    });
    return { status: 'filled', transaction };
  } catch (err) {
    const permanent = ['INSUFFICIENT_FUNDS', 'INSUFFICIENT_HOLDINGS'].includes(err.code);
    if (permanent) {
      await Order.updateOne({ _id: order._id, status: 'processing' }, { $set: { status: 'cancelled', cancelReason: err.code, cancelledAt: new Date() } });
      logger.info(`Order ${order._id} cancelled: ${err.code}`);
      return { status: 'cancelled', reason: err.code };
    }

    if (err.code === 'PRICE_UNAVAILABLE') {
      await releaseOrder(order._id, err.code);
      return { status: 'released', reason: err.code };
    }

    await releaseOrder(order._id, err.message);
    throw err;
  }
};

module.exports = {
  executeMarketOrder,
  placePendingOrder,
  cancelOrder,
  claimPendingOrder,
  releaseOrder,
  fillPendingOrder,
  applyFill,
  withTransactionRetry,
  startingCash: tradingConfig.startingCash
};
