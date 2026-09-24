const watchlistService = require('../services/watchlistService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @openapi
 * tags:
 *   - name: Watchlist
 *     description: Tracked symbols and price-target alerts
 */

/**
 * @openapi
 * /watchlist:
 *   get:
 *     summary: Your watchlist with live quotes
 *     tags: [Watchlist]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Symbols, quotes, and alerts }
 */
const getWatchlist = asyncHandler(async (req, res) => {
  const data = await watchlistService.getWatchlist(req.user._id);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /watchlist:
 *   post:
 *     summary: Add a symbol
 *     tags: [Watchlist]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol]
 *             properties:
 *               symbol: { type: string, example: HDFCBANK }
 *     responses:
 *       200: { description: Updated watchlist }
 */
const addSymbol = asyncHandler(async (req, res) => {
  const data = await watchlistService.addSymbol(req.user._id, req.body.symbol);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /watchlist/{symbol}:
 *   delete:
 *     summary: Remove a symbol
 *     tags: [Watchlist]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: symbol, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Updated watchlist }
 *       404: { description: Symbol is not on the watchlist }
 */
const removeSymbol = asyncHandler(async (req, res) => {
  const data = await watchlistService.removeSymbol(req.user._id, req.params.symbol);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /watchlist/alerts:
 *   post:
 *     summary: Create a price-target alert
 *     description: The alert is a rule; the scheduled checker evaluates it and notifies by email and realtime event.
 *     tags: [Watchlist]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, targetPrice, direction]
 *             properties:
 *               symbol: { type: string, example: TCS }
 *               targetPrice: { type: number, example: 4500 }
 *               direction: { type: string, enum: [above, below] }
 *     responses:
 *       201: { description: Alert created }
 *       409: { description: An identical active alert already exists }
 */
const createAlert = asyncHandler(async (req, res) => {
  const data = await watchlistService.createAlert(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

/**
 * @openapi
 * /watchlist/alerts/{id}:
 *   delete:
 *     summary: Delete an alert
 *     tags: [Watchlist]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Remaining alerts }
 *       404: { description: Alert not found }
 */
const deleteAlert = asyncHandler(async (req, res) => {
  const data = await watchlistService.deleteAlert(req.user._id, req.params.id);
  res.json({ success: true, data });
});

module.exports = { getWatchlist, addSymbol, removeSymbol, createAlert, deleteAlert };
