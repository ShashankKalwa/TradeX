const Watchlist = require('../models/Watchlist');
const User = require('../models/User');
const marketDataProvider = require('../integrations/marketDataProvider');
const emailClient = require('../integrations/emailClient');
const audit = require('../services/auditService');
const bus = require('../utils/events');
const logger = require('../config/logger');

/**
 * Evaluate price-target alerts. A triggered alert notifies by email and by a
 * realtime event, then stays in the list marked `triggered` — it is a record of
 * something that happened, not a subscription that silently disappears.
 */
const checkAlerts = async () => {
  let triggered = 0;

  try {
    const watchlists = await Watchlist.find({ 'alerts.status': 'active' }).limit(500);

    for (const watchlist of watchlists) {
      const active = watchlist.alerts.filter((alert) => alert.status === 'active');
      if (!active.length) continue;

      const user = await User.findById(watchlist.userId).select('email name').lean();

      for (const alert of active) {
        let price;
        try {
          const quote = await marketDataProvider.getQuote(alert.symbol);
          price = quote.price;
        } catch (err) {
          logger.warn(`Alert check skipped for ${alert.symbol}: ${err.message}`);
          continue;
        }

        const hit = alert.direction === 'above' ? price >= alert.targetPrice : price <= alert.targetPrice;
        if (!hit) continue;

        alert.status = 'triggered';
        alert.triggeredAt = new Date();
        alert.triggeredPrice = price;
        triggered += 1;

        // Notify after the state change is durable, so a mail failure cannot
        // leave an alert that never fires again.
        if (user?.email) {
          await emailClient.sendPriceAlert({
            to: user.email,
            symbol: alert.symbol,
            targetPrice: alert.targetPrice,
            direction: alert.direction,
            price
          });
        }

        bus.emit('alert.triggered', { userId: watchlist.userId, alert: { symbol: alert.symbol, targetPrice: alert.targetPrice, direction: alert.direction, price } });

        await audit.record({
          userId: watchlist.userId,
          action: audit.ACTIONS.ALERT_TRIGGERED,
          metadata: { symbol: alert.symbol, targetPrice: alert.targetPrice, direction: alert.direction, price }
        });
      }

      if (triggered) await watchlist.save();
    }

    if (triggered) logger.info(`Alert checker: ${triggered} alert(s) triggered`);
  } catch (err) {
    logger.error(`Alert checker cycle failed: ${err.message}`);
  }

  return { triggered };
};

module.exports = checkAlerts;
