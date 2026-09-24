const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Request logging with correlation.
 *
 * Every request gets an id — reused from an inbound `X-Request-Id` when a proxy
 * or the client supplies one, otherwise generated — which is echoed in the
 * response header and attached to the log line, so one user-visible failure can
 * be traced through every log entry it produced.
 */
const requestLogger = (req, res, next) => {
  req.id = req.headers['x-request-id'] || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);

  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'http';

    logger.log(level, `${req.method} ${req.originalUrl} ${res.statusCode} ${durationMs.toFixed(1)}ms`, {
      requestId: req.id,
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      userId: req.user ? String(req.user._id) : undefined,
      ip: req.ip
    });
  });

  next();
};

module.exports = requestLogger;
