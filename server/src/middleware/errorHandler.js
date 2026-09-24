const logger = require('../config/logger');
const { AppError } = require('../utils/errors');
const { isProduction } = require('../config/env');

/**
 * Maps every failure onto one response shape:
 *   { success: false, error: { code, message, details? } }
 *
 * Driver and validation errors are translated here so a bad ObjectId is a 400
 * rather than a 500, and a duplicate key is a 409 rather than an opaque crash.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof AppError)) {
    if (error.name === 'ValidationError') {
      const details = Object.values(error.errors || {}).map((e) => ({ field: e.path, message: e.message }));
      error = new AppError('Validation failed', 400, 'VALIDATION_ERROR', details);
    } else if (error.name === 'CastError') {
      error = new AppError(`Invalid value for ${error.path}`, 400, 'INVALID_IDENTIFIER');
    } else if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {}).join(', ') || 'field';
      error = new AppError(`That ${field} is already in use`, 409, 'DUPLICATE_KEY');
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      error = new AppError('Not authorized to access this route', 401, 'INVALID_TOKEN');
    } else if (error.name === 'VersionError') {
      error = new AppError('The record changed while this request was in flight; please retry', 409, 'CONCURRENT_MODIFICATION');
    } else {
      error = new AppError(err.message || 'Internal Server Error', err.statusCode || 500, 'INTERNAL_ERROR');
    }
  }

  const statusCode = error.statusCode || 500;

  logger.error(`${error.name}: ${error.message}`, {
    requestId: req.id,
    code: error.code,
    status: statusCode,
    method: req.method,
    path: req.originalUrl,
    userId: req.user ? String(req.user._id) : undefined
  });
  if (statusCode >= 500) logger.error(error.stack);

  const body = {
    success: false,
    error: {
      code: error.code || statusCode,
      message: statusCode >= 500 && isProduction ? 'Internal Server Error' : error.message
    }
  };
  if (error.details) body.error.details = error.details;

  res.status(statusCode).json(body);
};

module.exports = errorHandler;
