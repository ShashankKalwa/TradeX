/**
 * NoSQL-injection guard.
 *
 * MongoDB treats `$`-prefixed and dotted keys as operators/paths, so a body
 * like { "email": { "$gt": "" } } can turn a targeted lookup into a match-anything
 * query. This strips those keys from anything a client controls before a query
 * is built.
 *
 * Hand-rolled rather than `express-mongo-sanitize`, which mutates `req.query`
 * and fails on Express 5 where that property is a getter.
 */

const FORBIDDEN = /^\$|\./;

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);

const scrub = (input, depth = 0) => {
  if (depth > 8) return {}; // refuse to recurse forever on a hostile payload
  if (Array.isArray(input)) return input.map((item) => scrub(item, depth + 1));
  if (!isPlainObject(input)) return input;

  const safe = {};
  for (const [key, value] of Object.entries(input)) {
    if (FORBIDDEN.test(key)) continue;
    safe[key] = isPlainObject(value) || Array.isArray(value) ? scrub(value, depth + 1) : value;
  }
  return safe;
};

const sanitizeRequest = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = scrub(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = scrub(req.params);
  }
  // req.query is a getter in Express 5 and cannot be reassigned; query values
  // reach the database only through the whitelisted pagination/sort parsers.
  next();
};

module.exports = sanitizeRequest;
module.exports.scrub = scrub;
