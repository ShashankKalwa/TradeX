const rateLimit = require('express-rate-limit');
const { rateLimit: limits, isTest } = require('../config/env');

/**
 * Rate limiters, applied per-route rather than globally: auth and trade
 * endpoints get their own budgets so a burst of quote reads cannot exhaust the
 * allowance that protects credential stuffing.
 */
const envelope = (message) => ({
  success: false,
  error: { code: 429, message }
});

const build = ({ windowMs, max, message }) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: envelope(message),
    // A test suite legitimately fires hundreds of requests at one app instance.
    skip: () => isTest
  });

const generalLimiter = build({
  windowMs: limits.windowMs,
  max: limits.generalMax,
  message: 'Too many requests. Please slow down.'
});

const authLimiter = build({
  windowMs: limits.windowMs,
  max: limits.authMax,
  message: 'Too many authentication attempts. Please try again later.'
});

const tradeLimiter = build({
  windowMs: limits.windowMs,
  max: limits.tradeMax,
  message: 'Too many trade requests. Please wait before placing another order.'
});

module.exports = { generalLimiter, authLimiter, tradeLimiter };
