const express = require('express');

const authRoutes = require('./authRoutes');
const tradingRoutes = require('./tradingRoutes');
const portfolioRoutes = require('./portfolioRoutes');
const marketRoutes = require('./marketRoutes');
const watchlistRoutes = require('./watchlistRoutes');
const leaderboardRoutes = require('./leaderboardRoutes');
const adminRoutes = require('./adminRoutes');

/**
 * API v1 surface. Mounting every resource here (rather than in app.js) keeps
 * the version prefix and the resource list in one readable place.
 */
const router = express.Router();

router.use('/auth', authRoutes);
router.use('/trade', tradingRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/market', marketRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/leaderboard', leaderboardRoutes);
router.use('/admin', adminRoutes);

module.exports = router;
