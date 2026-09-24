/**
 * A single error type carrying an HTTP status and a stable machine-readable
 * code, so services can signal *what* went wrong without knowing about HTTP,
 * and controllers never have to string-match an error message.
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = undefined) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

const Errors = {
  badRequest: (message, code = 'BAD_REQUEST', details) => new AppError(message, 400, code, details),
  unauthorized: (message = 'Not authorized', code = 'UNAUTHORIZED') => new AppError(message, 401, code),
  forbidden: (message = 'Forbidden', code = 'FORBIDDEN') => new AppError(message, 403, code),
  notFound: (message = 'Not found', code = 'NOT_FOUND') => new AppError(message, 404, code),
  conflict: (message, code = 'CONFLICT') => new AppError(message, 409, code),

  // Trading-specific codes the client can branch on.
  insufficientFunds: (needed, available) =>
    new AppError(
      `Insufficient funds. This order needs ${needed.toFixed(2)} including fees; available ${available.toFixed(2)}.`,
      400,
      'INSUFFICIENT_FUNDS'
    ),
  insufficientHoldings: (symbol, held, requested) =>
    new AppError(
      `Insufficient shares. You hold ${held} of ${symbol}; tried to sell ${requested}.`,
      400,
      'INSUFFICIENT_HOLDINGS'
    ),
  portfolioNotFound: () => new AppError('Portfolio not found for this account', 404, 'PORTFOLIO_NOT_FOUND'),
  // Raised when optimistic locking detects a concurrent write to the portfolio.
  concurrentModification: () =>
    new AppError('Portfolio was modified by another request; please retry', 409, 'CONCURRENT_MODIFICATION'),
  priceUnavailable: (symbol) =>
    new AppError(`No market price available for ${symbol}`, 503, 'PRICE_UNAVAILABLE')
};

module.exports = { AppError, Errors };
