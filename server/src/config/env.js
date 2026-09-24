const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';
const isTest = env === 'test';

/** Parse a numeric env var, falling back when unset/invalid. */
const num = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const config = {
  env,
  isTest,
  isProduction: env === 'production',
  port: num(process.env.PORT, 3000),
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',

  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/tradex?replicaSet=rs0',

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    // Opaque refresh tokens are random bytes stored hashed — they are not JWTs,
    // so there is deliberately no refresh secret to configure.
    refreshExpiresInDays: num(process.env.JWT_REFRESH_EXPIRES_IN_DAYS, 30)
  },

  trading: {
    startingCash: num(process.env.STARTING_CASH, 100000),
    // Simulated brokerage, charged per side. 0.05% mirrors a discount broker.
    feeRate: num(process.env.TRADE_FEE_RATE, 0.0005)
  },

  marketData: {
    // 'mock' needs no credentials and is the default so a clone runs immediately.
    provider: (process.env.MARKET_DATA_PROVIDER || 'auto').toLowerCase(),
    quoteTtlSeconds: num(process.env.QUOTE_CACHE_TTL_SECONDS, 5),
    candleTtlSeconds: num(process.env.CANDLE_CACHE_TTL_SECONDS, 300),
    // How long a stale price stays servable when every provider is down.
    staleTtlSeconds: num(process.env.STALE_PRICE_TTL_SECONDS, 86400),
    timeoutMs: num(process.env.MARKET_DATA_TIMEOUT_MS, 5000)
  },



  finnhub: {
    apiKey: process.env.FINNHUB_API_KEY
  },

  email: {
    host: process.env.SMTP_HOST,
    port: num(process.env.SMTP_PORT, 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM || 'TradeX <no-reply@tradex.local>'
  },

  rateLimit: {
    windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    authMax: num(process.env.RATE_LIMIT_AUTH_MAX, 20),
    tradeMax: num(process.env.RATE_LIMIT_TRADE_MAX, 60),
    generalMax: num(process.env.RATE_LIMIT_GENERAL_MAX, 300)
  },

  jobs: {
    // Disabled in tests so a suite that imports the app never starts cron.
    enabled: process.env.ENABLE_JOBS ? process.env.ENABLE_JOBS === 'true' : !isTest,
    orderResolveCron: process.env.ORDER_RESOLVE_CRON || '*/10 * * * * *',
    alertCheckCron: process.env.ALERT_CHECK_CRON || '*/30 * * * * *',
    leaderboardCron: process.env.LEADERBOARD_CRON || '*/5 * * * *'
  }
};

/**
 * Fail fast at boot rather than at the first request that needs a secret.
 * A missing signing key otherwise surfaces as a confusing 500 much later.
 */
const assertConfig = () => {
  const missing = [];
  if (!config.jwt.secret) missing.push('JWT_SECRET');
  if (!config.mongoUri) missing.push('MONGO_URI');

  if (config.isProduction) {
    if (config.jwt.secret && config.jwt.secret.length < 32) {
      missing.push('JWT_SECRET (must be at least 32 characters in production)');
    }
    if (!process.env.CLIENT_URL) missing.push('CLIENT_URL (required in production; CORS is not wildcarded)');
  }

  if (missing.length) {
    throw new Error(
      `Missing or invalid configuration: ${missing.join(', ')}. ` +
        'Copy .env.example to .env and fill these in.'
    );
  }
};

module.exports = { ...config, assertConfig };
