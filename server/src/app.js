const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const swaggerUi = require('swagger-ui-express');
const mongoose = require('mongoose');

const { clientUrl, isProduction } = require('./config/env');
const swaggerDocument = require('./config/swagger');

const requestLogger = require('./middleware/requestLogger');
const sanitize = require('./middleware/sanitize');
const { generalLimiter } = require('./middleware/rateLimiter');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/errorHandler');

const routes = require('./routes');

/**
 * The HTTP application. Deliberately free of side effects: no database
 * connection, no cron, no socket server. Importing this module must never start
 * background work, so a test can mount it against an in-memory database.
 */
const app = express();

// Behind a load balancer (Render/Railway) the client IP arrives in a header;
// trusting the first hop keeps rate limiting per-client rather than per-proxy.
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(helmet());
app.use(cookieParser());
app.use(
  cors({
    // Credentials are allowed, so the origin can never be a wildcard.
    origin: isProduction ? clientUrl.split(',').map((o) => o.trim()) : true,
    credentials: true,
    exposedHeaders: ['X-Request-Id']
  })
);

app.use(express.json({ limit: '100kb' }));
app.use(requestLogger);
app.use(sanitize);
app.use(generalLimiter);

/**
 * @openapi
 * /health:
 *   get:
 *     summary: Liveness and Readiness probe
 *     tags: [Auth]
 *     responses:
 *       200: { description: Service and DB are up }
 *       503: { description: DB is unreachable }
 */
app.all('/', (req, res) => res.status(200).send('TradeX API is running'));

app.get('/health', async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Database not connected');
    }
    await mongoose.connection.db.admin().ping();
    
    res.json({
      success: true,
      data: {
        status: 'ok',
        uptimeSeconds: Math.round(process.uptime()),
        timestamp: new Date().toISOString()
      }
    });
  } catch (err) {
    res.status(503).json({
      success: false,
      error: { code: 503, message: 'Service Unavailable - Database unreachable' }
    });
  }
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { customSiteTitle: 'TradeX API' }));
app.get('/api/docs.json', (req, res) => res.json(swaggerDocument));

app.use('/api/v1', routes);

// Order matters: unmatched routes become a 404 in the shared envelope, and
// everything else — including async failures — lands in the error handler.
app.use(notFound);
app.use(errorHandler);

module.exports = app;
