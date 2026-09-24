/**
 * Wraps an async route handler so a rejected promise reaches Express's error
 * middleware instead of becoming an unhandled rejection. Removes the
 * try/catch/next boilerplate that otherwise repeats in every controller.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = asyncHandler;
