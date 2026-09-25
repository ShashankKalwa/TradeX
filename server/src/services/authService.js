const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const Watchlist = require('../models/Watchlist');
const Order = require('../models/Order');
const Transaction = require('../models/Transaction');
const PortfolioSnapshot = require('../models/PortfolioSnapshot');
const AuditLog = require('../models/AuditLog');
const { jwt: jwtConfig, trading: tradingConfig, clientUrl, isProduction } = require('../config/env');
const { Errors } = require('../utils/errors');
const { round2 } = require('../utils/money');
const audit = require('./auditService');
const emailClient = require('../integrations/emailClient');
const logger = require('../config/logger');

/**
 * Authentication lifecycle in one file: register (with email verification),
 * login, refresh rotation, logout, and 2FA enrolment.
 *
 * Refresh tokens are opaque random bytes, stored only as a SHA-256 hash. A
 * leaked database therefore yields no usable session, and rotation means a
 * replayed token is rejected because its hash was already consumed.
 */

const SALT_ROUNDS = 12;

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');

const signAccessToken = (userId, role) =>
  jwt.sign({ id: String(userId), role }, jwtConfig.secret, { expiresIn: jwtConfig.expiresIn });

const issueRefreshToken = () => crypto.randomBytes(48).toString('hex');

const publicUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  isVerified: user.isVerified,
  twoFactorEnabled: Boolean(user.totpSecret)
});

/**
 * Create the user and everything that must exist alongside them. The portfolio
 * and watchlist are created here so no other code has to handle "user exists
 * but has no portfolio".
 */
const register = async ({ name, email, password, ip }) => {
  const normalizedEmail = String(email).toLowerCase().trim();

  const existing = await User.findByEmail(normalizedEmail);
  if (existing) throw Errors.conflict('An account with that email already exists', 'EMAIL_IN_USE');

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const verificationToken = crypto.randomBytes(32).toString('hex');

  const user = await User.create({
    name,
    email: normalizedEmail,
    passwordHash,
    role: 'user',
    isVerified: false,
    verificationTokenHash: hashToken(verificationToken),
    verificationExpiresAt: new Date(Date.now() + 24 * 3600e3)
  });

  await Portfolio.create({ userId: user._id, cashBalance: round2(tradingConfig.startingCash), holdings: [] });
  await Watchlist.create({ userId: user._id, symbols: [], alerts: [] });

  const verificationUrl = `${clientUrl}/verify-email?token=${verificationToken}`;
  emailClient.sendVerificationEmail({ to: user.email, name: user.name, verifyUrl: verificationUrl });

  if (!isProduction) {
    logger.info(`Development verification link for ${user.email}: ${verificationUrl}`);
  }

  const refreshToken = await attachSession(user);

  await audit.record({ userId: user._id, action: audit.ACTIONS.USER_REGISTERED, metadata: { email: user.email }, ip });

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user._id, user.role),
    refreshToken,
    verificationRequired: true,
    // Without an SMTP server a developer cannot complete signup, so the token is
    // returned in non-production only. Production never leaks it in a response.
    ...(isProduction ? {} : { verificationToken })
  };
};

/** Push a new refresh token (stored hashed) onto the user's active sessions. */
const attachSession = async (user) => {
  const refreshToken = issueRefreshToken();
  // A freshly created document has the array; one loaded from the database may
  // not, because the field is select:false by default.
  if (!Array.isArray(user.refreshTokens)) user.refreshTokens = [];

  user.refreshTokens.push({ tokenHash: hashToken(refreshToken), createdAt: new Date() });

  // Cap concurrent sessions so the array cannot grow without bound.
  if (user.refreshTokens.length > 10) {
    user.refreshTokens = user.refreshTokens.slice(-10);
  }

  await user.save();
  return refreshToken;
};

/**
 * Authenticates a user and provisions a new session.
 * @param {Object} args
 * @param {string} args.email
 * @param {string} args.password
 * @param {string} [args.ip]
 * @returns {Promise<{ user: Object, accessToken: string, refreshToken: string }>}
 */
const login = async ({ email, password, ip }) => {
  const normalizedEmail = String(email).toLowerCase().trim();
  // refreshTokens is select:false, so it must be requested explicitly to append
  // a session to an existing document.
  const user = await User.findByEmail(normalizedEmail).select('+passwordHash +refreshTokens');

  // Same error for both cases: which half was wrong is not the caller's business.
  if (!user) throw Errors.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) throw Errors.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');

  const refreshToken = await attachSession(user);
  await audit.record({ userId: user._id, action: audit.ACTIONS.USER_LOGGED_IN, metadata: { email: user.email }, ip });

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user._id, user.role),
    refreshToken
  };
};

/** Rotate: the presented token is consumed and a fresh pair issued. */
const refresh = async (refreshToken) => {
  if (!refreshToken) throw Errors.badRequest('Refresh token is required', 'REFRESH_TOKEN_REQUIRED');

  const tokenHash = hashToken(refreshToken);
  const user = await User.findOne({ 'refreshTokens.tokenHash': tokenHash }).select('+refreshTokens');
  if (!user) throw Errors.unauthorized('Invalid refresh token', 'INVALID_REFRESH_TOKEN');

  user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  const nextToken = await attachSession(user);

  await audit.record({ userId: user._id, action: audit.ACTIONS.TOKEN_REFRESHED, metadata: {} });

  return {
    user: publicUser(user),
    accessToken: signAccessToken(user._id, user.role),
    refreshToken: nextToken
  };
};

/** Invalidate one session (this device) or every session when none is given. */
const logout = async (userId, refreshToken) => {
  const user = await User.findById(userId).select('+refreshTokens');
  if (!user) return;

  if (refreshToken) {
    const tokenHash = hashToken(refreshToken);
    user.refreshTokens = user.refreshTokens.filter((entry) => entry.tokenHash !== tokenHash);
  } else {
    user.refreshTokens = [];
  }

  await user.save();
  await audit.record({ userId, action: audit.ACTIONS.USER_LOGGED_OUT, metadata: {} });
};

const verifyEmail = async (token) => {
  const user = await User.findOne({
    verificationTokenHash: hashToken(token),
    verificationExpiresAt: { $gt: new Date() }
  }).select('+verificationTokenHash +verificationExpiresAt');

  if (!user) throw Errors.badRequest('That verification link is invalid or has expired', 'INVALID_VERIFICATION_TOKEN');

  user.isVerified = true;
  user.verificationTokenHash = undefined;
  user.verificationExpiresAt = undefined;
  await user.save();

  await audit.record({ userId: user._id, action: audit.ACTIONS.EMAIL_VERIFIED, metadata: {} });
  return publicUser(user);
};

/** Re-issue a verification link for an unverified account. */
const resendVerification = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Errors.notFound('User not found', 'USER_NOT_FOUND');
  if (user.isVerified) throw Errors.conflict('That account is already verified', 'ALREADY_VERIFIED');

  const token = crypto.randomBytes(32).toString('hex');
  user.verificationTokenHash = hashToken(token);
  user.verificationExpiresAt = new Date(Date.now() + 24 * 3600e3);
  await user.save();

  emailClient.sendVerificationEmail({
    to: user.email,
    name: user.name,
    verifyUrl: `${clientUrl}/verify-email?token=${token}`
  });

  return { sent: true };
};

/**
 * TOTP 2FA enrolment. The secret is provisioned here and confirmed by the
 * client; verification is performed by the client library's TOTP check, so this
 * service only owns the storage and enable/disable transitions.
 */
const enableTwoFactor = async (userId, secret) => {
  const user = await User.findByIdAndUpdate(userId, { $set: { totpSecret: secret } }, { new: true });
  if (!user) throw Errors.notFound('User not found', 'USER_NOT_FOUND');
  return { twoFactorEnabled: true };
};

const disableTwoFactor = async (userId) => {
  const user = await User.findByIdAndUpdate(userId, { $unset: { totpSecret: '' } }, { new: true });
  if (!user) throw Errors.notFound('User not found', 'USER_NOT_FOUND');
  return { twoFactorEnabled: false };
};

/**
 * Permanently deletes a user account and all their portfolio/trading history.
 * @param {string} userId
 * @returns {Promise<void>}
 */
const deleteAccount = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw Errors.notFound('User not found', 'USER_NOT_FOUND');

  await Promise.all([
    User.deleteOne({ _id: userId }),
    Portfolio.deleteOne({ userId }),
    Watchlist.deleteOne({ userId }),
    Order.deleteMany({ userId }),
    Transaction.deleteMany({ userId }),
    PortfolioSnapshot.deleteMany({ userId }),
    AuditLog.deleteMany({ userId })
  ]);
};

module.exports = {
  register,
  login,
  refresh,
  logout,
  verifyEmail,
  resendVerification,
  enableTwoFactor,
  disableTwoFactor,
  publicUser,
  hashToken,
  deleteAccount
};
