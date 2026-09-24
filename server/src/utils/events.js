const { EventEmitter } = require('events');

/**
 * App-wide event bus. Services stay free of transports: the trading engine
 * announces that a trade settled, and the socket layer (or anything else)
 * subscribes. This is what keeps `socket.io` out of the business logic.
 *
 * Events:
 *   'trade.executed'  { userId, transaction, portfolio }
 *   'alert.triggered' { userId, alert, price }
 */
const bus = new EventEmitter();
bus.setMaxListeners(50);

module.exports = bus;
