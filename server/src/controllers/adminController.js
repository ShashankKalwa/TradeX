const adminService = require('../services/adminService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @openapi
 * tags:
 *   - name: Admin
 *     description: Platform analytics, stock management, and moderation. Admin role only.
 */

/**
 * @openapi
 * /admin/stats:
 *   get:
 *     summary: Platform analytics
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: User counts, traded volume, and the most-traded symbols }
 *       403: { description: Admin role required }
 */
const getSystemStats = asyncHandler(async (req, res) => {
  const data = await adminService.getSystemStats();
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/anomalies:
 *   get:
 *     summary: Desks trading far above a configurable frequency
 *     description: Flags accounts for review. It never suspends anyone on its own.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: threshold, schema: { type: integer, default: 50 }, description: Trades within the window }
 *       - { in: query, name: windowHours, schema: { type: integer, default: 24 } }
 *     responses:
 *       200: { description: Flagged accounts }
 */
const getAnomalies = asyncHandler(async (req, res) => {
  const data = await adminService.getAnomalies(req.query);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/stocks:
 *   get:
 *     summary: List stocks including delisted ones
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated stocks }
 */
const listStocks = asyncHandler(async (req, res) => {
  const data = await adminService.listStocks(req.query);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/stocks:
 *   post:
 *     summary: List a new stock
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [symbol, name, exchange, currentPrice]
 *             properties:
 *               symbol: { type: string, example: ZOMATO }
 *               name: { type: string, example: Eternal Ltd }
 *               sector: { type: string, example: Consumer }
 *               exchange: { type: string, example: NSE }
 *               currentPrice: { type: number, example: 280.5 }
 *     responses:
 *       201: { description: Stock created }
 *       409: { description: Symbol already listed }
 */
const createStock = asyncHandler(async (req, res) => {
  const data = await adminService.createStock(req.body, req.user._id, req.ip);
  res.status(201).json({ success: true, data });
});

/**
 * @openapi
 * /admin/stocks/{symbol}:
 *   patch:
 *     summary: Update a listed stock
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: symbol, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Stock updated }
 *       404: { description: Unknown symbol }
 */
const updateStock = asyncHandler(async (req, res) => {
  const data = await adminService.updateStock(req.params.symbol, req.body, req.user._id, req.ip);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/stocks/{symbol}:
 *   delete:
 *     summary: Delist a stock
 *     description: Delisting keeps the row so existing transactions still resolve their symbol.
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: path, name: symbol, required: true, schema: { type: string } }
 *     responses:
 *       200: { description: Stock delisted }
 *       404: { description: Unknown symbol }
 */
const delistStock = asyncHandler(async (req, res) => {
  const data = await adminService.delistStock(req.params.symbol, req.user._id, req.ip);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/users:
 *   get:
 *     summary: List accounts
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Paginated users }
 */
const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /admin/audit-logs:
 *   get:
 *     summary: Read the audit trail (append-only)
 *     tags: [Admin]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: action, schema: { type: string, example: trade.executed } }
 *       - { in: query, name: userId, schema: { type: string } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *     responses:
 *       200: { description: Paginated audit entries }
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const data = await adminService.getAuditLogs(req.query);
  res.json({ success: true, data });
});

module.exports = { getSystemStats, getAnomalies, listStocks, createStock, updateStock, delistStock, listUsers, getAuditLogs };
