const Order = require('../models/Order');
const tradingEngineService = require('../services/tradingEngineService');
const marketDataProvider = require('../integrations/marketDataProvider');
const logger = require('../config/logger');

/** Does the live price satisfy this order's trigger condition? */
const shouldTrigger = (order, price) => {
  const { orderType, direction, targetPrice } = order;

  if (orderType === 'limit') {
    // A limit buy fills at or below target; a limit sell at or above.
    return direction === 'buy' ? price <= targetPrice : price >= targetPrice;
  }
  // A stop is the inverse: it arms when the market moves against the position.
  return direction === 'buy' ? price >= targetPrice : price <= targetPrice;
};

/**
 * Fill resting orders whose price condition now holds.
 *
 * Each order is claimed (pending -> processing) before anything else happens.
 * The claim is the lock: if a previous cycle crashed mid-fill, the order is
 * left in `processing` and will not be executed a second time by a later cycle.
 */
const resolvePendingOrders = async () => {
  let claimed = 0;
  let filled = 0;
  let cancelled = 0;

  try {
    const pending = await Order.find({ status: 'pending' }).sort({ createdAt: 1 }).limit(200).lean();

    for (const candidate of pending) {
      let price;
      try {
        const quote = await marketDataProvider.getQuote(candidate.symbol);
        price = quote.price;
      } catch (err) {
        logger.warn(`Order ${candidate._id} left pending: no price for ${candidate.symbol}`);
        continue;
      }

      if (!shouldTrigger(candidate, price)) continue;

      const order = await tradingEngineService.claimPendingOrder(candidate._id);
      if (!order) continue; // another cycle claimed it first
      claimed += 1;

      const result = await tradingEngineService.fillPendingOrder(order);
      if (result.status === 'filled') filled += 1;
      if (result.status === 'cancelled') cancelled += 1;
    }

    if (claimed) logger.info(`Order resolver: ${claimed} claimed, ${filled} filled, ${cancelled} cancelled`);
  } catch (err) {
    logger.error(`Order resolver cycle failed: ${err.message}`);
  }

  return { claimed, filled, cancelled };
};

/**
 * Orders left in `processing` by a crash cannot self-heal, so surface them
 * rather than silently ignoring the state — an operator can then decide.
 */
const reportStuckOrders = async (olderThanMinutes = 15) => {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60e3);
  const stuck = await Order.countDocuments({ status: 'processing', processingAt: { $lt: cutoff } });
  if (stuck) logger.warn(`${stuck} order(s) stuck in processing for over ${olderThanMinutes} minutes`);
  return stuck;
};

module.exports = resolvePendingOrders;
module.exports.shouldTrigger = shouldTrigger;
module.exports.reportStuckOrders = reportStuckOrders;
