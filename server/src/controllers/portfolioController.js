const portfolioService = require('../services/portfolioService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @openapi
 * tags:
 *   - name: Portfolio
 *     description: Valuation, performance history, and risk
 */

/**
 * @openapi
 * /portfolio:
 *   get:
 *     summary: Live valuation of cash and holdings
 *     tags: [Portfolio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Valuations, unrealized and realized P&L, and return }
 *       404: { description: No portfolio for this account }
 */
const getPortfolio = asyncHandler(async (req, res) => {
  const data = await portfolioService.getPortfolio(req.user._id);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /portfolio/history:
 *   get:
 *     summary: Daily portfolio value snapshots, oldest first
 *     tags: [Portfolio]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: days, schema: { type: integer, default: 90, maximum: 365 } }
 *     responses:
 *       200: { description: Snapshot series for charting }
 */
const getHistory = asyncHandler(async (req, res) => {
  const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 90));
  const data = await portfolioService.getHistory(req.user._id, { days });
  res.json({ success: true, data: { days, points: data } });
});

/**
 * @openapi
 * /portfolio/risk:
 *   get:
 *     summary: Concentration and volatility metrics
 *     description: Herfindahl sector concentration plus an annualized Sharpe-style ratio from the snapshot series.
 *     tags: [Portfolio]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Sector weights, concentration index, diversification score, Sharpe ratio }
 */
const getRisk = asyncHandler(async (req, res) => {
  const data = await portfolioService.getRiskMetrics(req.user._id);
  res.json({ success: true, data });
});

module.exports = { getPortfolio, getHistory, getRisk };
