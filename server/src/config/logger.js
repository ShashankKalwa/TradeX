const winston = require('winston');
const { env, isProduction, isTest } = require('./env');

/**
 * Structured logger. JSON in production so logs are queryable, human-readable
 * in development. Every line may carry a `requestId` (see requestLogger), which
 * is what makes a single failed request traceable end to end.
 */

// Between 'info' and 'warn': request access logs belong here so they can be
// filtered out of normal output without losing warnings and errors.
const levels = { error: 0, warn: 1, http: 2, info: 3, debug: 4 };

const devFormat = winston.format.printf(({ level, message, timestamp, requestId, stack, ...meta }) => {
  const rid = requestId ? ` [${String(requestId).slice(0, 8)}]` : '';
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${level}${rid}: ${message}${extra}${stack ? `\n${stack}` : ''}`;
});

const logger = winston.createLogger({
  levels,
  level: isTest ? 'error' : env === 'development' ? 'debug' : 'http',
  format: isProduction
    ? winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
        winston.format.errors({ stack: true }),
        winston.format.colorize(),
        devFormat
      ),
  transports: [new winston.transports.Console({ silent: isTest && !process.env.LOG_IN_TESTS })],
  exitOnError: false
});

module.exports = logger;
