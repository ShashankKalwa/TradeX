const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const User = require('../models/User');
const { Errors } = require('../utils/errors');

/**
 * Authentication and authorisation.
 *
 * `protect` verifies the access token and loads the current user, so a
 * suspended or deleted account loses access immediately rather than at token
 * expiry. `authorize` is the RBAC gate and is applied per route — a forbidden
 * request never reaches a controller.
 */
const protect = async (req, res, next) => {
  try {
    let token;
    
    // Check cookies first
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } else {
      // Fallback to Bearer token for automated API clients (like Swagger)
      const header = req.headers.authorization || '';
      if (header.startsWith('Bearer ')) {
        token = header.slice(7);
      }
    }
    
    if (!token) {
      throw Errors.unauthorized('Not authorized to access this route', 'NO_TOKEN');
    }

    const decoded = jwt.verify(token, jwtConfig.secret);

    const user = await User.findById(decoded.id);
    if (!user) throw Errors.unauthorized('The account for this token no longer exists', 'USER_NOT_FOUND');
    if (user.isSuspended) throw Errors.forbidden('This account is suspended', 'ACCOUNT_SUSPENDED');

    // Role is read from the database, never trusted from the token payload — a
    // revoked admin must lose admin access on the next request.
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/** Guard routes that change money behind a verified email address. */
const requireVerified = (req, res, next) => {
  if (!req.user.isVerified) {
    return next(Errors.forbidden('Verify your email address before trading', 'EMAIL_NOT_VERIFIED'));
  }
  next();
};

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) return next(Errors.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(Errors.forbidden(`Role ${req.user.role} is not authorized to access this route`, 'FORBIDDEN_ROLE'));
    }
    next();
  };

module.exports = { protect, authorize, requireVerified };
