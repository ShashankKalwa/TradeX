const jwt = require('jsonwebtoken');

const User = require('../models/User');
const marketDataProvider = require('../integrations/marketDataProvider');
const { jwt: jwtConfig, isTest } = require('../config/env');
const logger = require('../config/logger');
const bus = require('../utils/events');

/**
 * Realtime layer.
 *
 * Auth happens once, on the handshake, using the same access token as REST —
 * an unauthenticated socket is closed rather than left open to subscribe.
 * Services never touch sockets: the trading engine emits on the event bus and
 * this module decides how that reaches a client.
 */

const TICK_INTERVAL_MS = Number(process.env.MARKET_DATA_POLL_INTERVAL_MS) || 15000;
const MAX_SUBSCRIPTIONS_PER_SOCKET = 25;

const initSockets = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.slice(7);
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, jwtConfig.secret);
      const user = await User.findById(decoded.id).select('_id name isSuspended');
      if (!user) return next(new Error('Authentication required'));
      if (user.isSuspended) return next(new Error('Account suspended'));

      socket.user = { id: String(user._id), name: user.name };
      return next();
    } catch (err) {
      return next(new Error('Authentication required'));
    }
  });

  // Symbols with at least one subscriber, and how many sockets want each.
  const subscriptions = new Map();

  const addSubscription = (symbol) => subscriptions.set(symbol, (subscriptions.get(symbol) || 0) + 1);
  const removeSubscription = (symbol) => {
    const next = (subscriptions.get(symbol) || 0) - 1;
    if (next <= 0) subscriptions.delete(symbol);
    else subscriptions.set(symbol, next);
  };

  io.on('connection', (socket) => {
    logger.debug(`Socket connected: ${socket.id} (user ${socket.user.id})`);

    // A personal room carries this user's private updates.
    socket.join(`user:${socket.user.id}`);

    socket.on('subscribe', (payload = {}) => {
      const symbols = (Array.isArray(payload) ? payload : [payload.symbol])
        .filter(Boolean)
        .map((s) => String(s).toUpperCase());

      const accepted = [];
      for (const symbol of symbols) {
        if (socket.data.subscriptions?.size >= MAX_SUBSCRIPTIONS_PER_SOCKET) break;
        socket.join(`tick:${symbol}`);
        socket.data.subscriptions = socket.data.subscriptions || new Set();
        if (!socket.data.subscriptions.has(symbol)) {
          socket.data.subscriptions.add(symbol);
          addSubscription(symbol);
          accepted.push(symbol);
        }
      }

      socket.emit('subscribed', { symbols: accepted });
    });

    socket.on('unsubscribe', (payload = {}) => {
      const symbols = (Array.isArray(payload) ? payload : [payload.symbol])
        .filter(Boolean)
        .map((s) => String(s).toUpperCase());

      symbols.forEach((symbol) => {
        socket.leave(`tick:${symbol}`);
        if (socket.data.subscriptions?.delete(symbol)) removeSubscription(symbol);
      });
    });

    socket.on('disconnect', () => {
      socket.data.subscriptions?.forEach((symbol) => removeSubscription(symbol));
      logger.debug(`Socket disconnected: ${socket.id}`);
    });
  });

  // Broadcast ticks for the union of subscribed symbols, deduplicated so two
  // clients watching RELIANCE cost one upstream quote per interval.
  const tickTimer = setInterval(async () => {
    if (!subscriptions.size) return;

    await Promise.all(
      [...subscriptions.keys()].map(async (symbol) => {
        try {
          const quote = await marketDataProvider.getQuote(symbol);
          io.to(`tick:${symbol}`).emit('price_update', quote);
        } catch (err) {
          logger.debug(`Tick skipped for ${symbol}: ${err.message}`);
        }
      })
    );
  }, TICK_INTERVAL_MS);

  if (typeof tickTimer.unref === 'function') tickTimer.unref();

  // A settled trade changes the user's cash and holdings, so their desk is
  // pushed the new state rather than left to poll for it.
  bus.on('trade.executed', ({ userId, transaction, portfolio }) => {
    io.to(`user:${userId}`).emit('portfolio_update', {
      transaction: {
        id: transaction._id,
        symbol: transaction.symbol,
        type: transaction.type,
        quantity: transaction.quantity,
        price: transaction.price,
        fee: transaction.fee,
        realizedPnl: transaction.realizedPnl,
        timestamp: transaction.timestamp
      },
      cashBalance: portfolio.cashBalance,
      holdings: portfolio.holdings
    });
  });

  bus.on('alert.triggered', ({ userId, alert }) => {
    io.to(`user:${userId}`).emit('alert_triggered', alert);
  });

  if (isTest) logger.debug('Socket layer initialised in test mode');

  return io;
};

module.exports = initSockets;
