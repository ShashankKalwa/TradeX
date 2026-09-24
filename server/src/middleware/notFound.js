const { Errors } = require('../utils/errors');

/** Anything that fell through the router is a 404 in the shared error shape. */
const notFound = (req, res, next) => next(Errors.notFound(`No route matches ${req.method} ${req.originalUrl}`, 'ROUTE_NOT_FOUND'));

module.exports = notFound;
