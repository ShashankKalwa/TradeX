const leaderboardService = require('../services/leaderboardService');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @openapi
 * tags:
 *   - name: Leaderboard
 *     description: Materialised rankings by percentage return
 */

/**
 * @openapi
 * /leaderboard:
 *   get:
 *     summary: Ranked desks for a period
 *     description: Served from the materialised collection, which a scheduled job recomputes — never aggregated on request.
 *     tags: [Leaderboard]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - { in: query, name: period, schema: { type: string, enum: [daily, weekly, all_time], default: all_time } }
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *     responses:
 *       200: { description: Paginated rankings with the last computed timestamp }
 */
const getLeaderboard = asyncHandler(async (req, res) => {
  const data = await leaderboardService.getLeaderboard(req.query.period, req.query);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /leaderboard/me:
 *   get:
 *     summary: Your own rank
 *     tags: [Leaderboard]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Rank and return for this account }
 *       404: { description: No ranking computed for this account yet }
 */
const getMyRank = asyncHandler(async (req, res) => {
  const data = await leaderboardService.getMyRank(req.user._id, req.query.period);
  res.json({ success: true, data });
});

module.exports = { getLeaderboard, getMyRank };
