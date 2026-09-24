const { computeLeaderboard } = require('../services/leaderboardService');

/**
 * Cron entry point. The ranking logic lives in the service so it can be
 * exercised directly by tests without waiting for a schedule.
 */
const runLeaderboardCompute = async () => computeLeaderboard();

module.exports = runLeaderboardCompute;
module.exports.computeLeaderboard = computeLeaderboard;
