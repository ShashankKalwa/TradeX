const swaggerJsdoc = require('swagger-jsdoc');
const { port } = require('./env');

/**
 * OpenAPI document, generated from the JSDoc annotations on the controllers —
 * the docs are written next to the handler they describe, so a route and its
 * documentation move together.
 */
const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'TradeX API',
      version: '1.0.0',
      description:
        'Virtual stock trading API. **Virtual funds only** — no real money, no brokerage, ' +
        'and no order ever reaches an exchange. All monetary values are in the desk currency ' +
        '(INR for NSE symbols).\n\n' +
        'Every response uses one envelope: `{ success: true, data }` or ' +
        '`{ success: false, error: { code, message } }`.',
      license: { name: 'MIT' }
    },
    servers: [{ url: `http://localhost:${port}`, description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INSUFFICIENT_FUNDS' },
                message: { type: 'string', example: 'Insufficient funds. This order needs 1500.75 including fees; available 900.00.' }
              }
            }
          }
        }
      }
    },
    tags: [
      { name: 'Auth' },
      { name: 'Trading' },
      { name: 'Portfolio' },
      { name: 'Market' },
      { name: 'Watchlist' },
      { name: 'Leaderboard' },
      { name: 'Admin' }
    ]
  },
  apis: ['./src/routes/*.js', './src/controllers/*.js']
};

module.exports = swaggerJsdoc(options);
