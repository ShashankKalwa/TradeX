const express = require('express');
const { query } = require('express-validator');

const leaderboardController = require('../controllers/leaderboardController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

const periodRule = query('period').optional().isIn(['daily', 'weekly', 'all_time']).withMessage('Unsupported period');

router.get('/', validate([periodRule]), leaderboardController.getLeaderboard);
router.get('/me', validate([periodRule]), leaderboardController.getMyRank);

module.exports = router;
