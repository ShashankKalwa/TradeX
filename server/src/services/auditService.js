const AuditLog = require('../models/AuditLog');
const logger = require('../config/logger');

/**
 * The single writer for the audit trail. Every account- or balance-affecting
 * action calls this, so audit coverage is one function to read rather than a
 * search for scattered writes — and a failure to audit never fails the
 * user-facing operation it describes.
 */
const record = async ({ userId = null, action, metadata = {}, ip = null }) => {
  try {
    await AuditLog.create({ userId, action, metadata, ip });
  } catch (err) {
    logger.error(`Audit write failed for ${action}: ${err.message}`);
  }
};

const ACTIONS = {
  USER_REGISTERED: 'user.registered',
  USER_LOGGED_IN: 'user.login',
  USER_LOGGED_OUT: 'user.logout',
  EMAIL_VERIFIED: 'user.email_verified',
  TOKEN_REFRESHED: 'user.token_refreshed',
  TRADE_EXECUTED: 'trade.executed',
  ORDER_PLACED: 'order.placed',
  ORDER_CANCELLED: 'order.cancelled',
  STOCK_CREATED: 'admin.stock_created',
  STOCK_UPDATED: 'admin.stock_updated',
  STOCK_DELISTED: 'admin.stock_delisted',
  ALERT_CREATED: 'alert.created',
  ALERT_TRIGGERED: 'alert.triggered'
};

module.exports = { record, ACTIONS };
