const marketDataProvider = require('../integrations/marketDataProvider');
const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');


/**
 * @openapi
 * tags:
 *   - name: Market
 *     description: Quotes, candles, and the tradable universe
 */

/**
 * @openapi
 * /market/stocks:
 *   get:
 *     summary: List the tradable universe
 *     tags: [Market]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: search, schema: { type: string }, description: Prefix match on symbol }
 *       - { in: query, name: sector, schema: { type: string } }
 *       - { in: query, name: exchange, schema: { type: string, example: NSE } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: sort, schema: { type: string, example: symbol } }
 *     responses:
 *       200: { description: Paginated stocks }
 */
const listStocks = asyncHandler(async (req, res) => {
  const data = await adminService.listStocks(req.query);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /market/quote/{symbol}:
 *   get:
 *     summary: Latest quote for a symbol
 *     description: "Served from a short-TTL cache. When every provider is down, the last known price is returned flagged stale rather than failing."
 *     tags: [Market]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: symbol, required: true, schema: { type: string, example: TCS } }
 *     responses:
 *       200: { description: Quote }
 *       503: { description: No price available, cached or live }
 */
const getQuote = asyncHandler(async (req, res) => {
  const quote = await marketDataProvider.getQuote(req.params.symbol);
  res.json({ success: true, data: quote });
});

/**
 * @openapi
 * /market/historical/{symbol}:
 *   get:
 *     summary: Historical candles
 *     tags: [Market]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: symbol, required: true, schema: { type: string } }
 *       - { in: query, name: resolution, schema: { type: string, enum: ['1','5','15','60','D','W','M'], default: D } }
 *       - { in: query, name: from, schema: { type: string, format: date-time } }
 *       - { in: query, name: to, schema: { type: string, format: date-time } }
 *     responses:
 *       200: { description: OHLCV candles, oldest first }
 *       503: { description: Candles unavailable from every provider }
 */
const getHistorical = asyncHandler(async (req, res) => {
  const { resolution = 'D', from, to } = req.query;
  const data = await marketDataProvider.getHistorical(req.params.symbol, { resolution, from, to });
  res.json({ success: true, data });
});

/**
 * @openapi
 * /market/quotes:
 *   get:
 *     summary: Quotes for several symbols at once
 *     description: "Symbols without an available price come back with a null price rather than failing the whole request."
 *     tags: [Market]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: symbols
 *         required: true
 *         schema: { type: string }
 *         description: Comma-separated symbols, up to 25
 *         example: RELIANCE,TCS,INFY
 *     responses:
 *       200: { description: Quote map }
 */
const getQuotes = asyncHandler(async (req, res) => {
  const symbols = String(req.query.symbols || '')
    .split(',')
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 25);

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      try {
        return await marketDataProvider.getQuote(symbol);
      } catch (err) {
        return { symbol, price: null, error: err.code || 'PRICE_UNAVAILABLE' };
      }
    })
  );

  res.json({ success: true, data: { quotes: results } });
});

module.exports = { listStocks, getQuote, getHistorical, getQuotes };
