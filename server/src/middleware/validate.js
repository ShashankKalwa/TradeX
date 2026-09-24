const { validationResult } = require('express-validator');
const { Errors } = require('../utils/errors');

/**
 * Runs the express-validator chains declared on a route and rejects the request
 * with the same error envelope everything else uses. Keeps validation out of
 * controllers entirely — a controller should never see an invalid request.
 */
const validate = (chains = []) => {
  const middleware = [...chains];

  middleware.push((req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array().map(({ path, msg, value }) => ({ field: path, message: msg, value }));
    return next(Errors.badRequest(details[0].message, 'VALIDATION_ERROR', details));
  });

  return middleware;
};

module.exports = validate;
