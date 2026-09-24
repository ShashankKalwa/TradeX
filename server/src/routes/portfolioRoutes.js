const express = require('express');

const portfolioController = require('../controllers/portfolioController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', portfolioController.getPortfolio);
router.get('/history', portfolioController.getHistory);
router.get('/risk', portfolioController.getRisk);

module.exports = router;
