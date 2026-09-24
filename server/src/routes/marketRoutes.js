const express = require('express');
const { param, query } = require('express-validator');

const marketController = require('../controllers/marketController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');


const router = express.Router();

router.use(protect);

// Static segments are declared before the parameterised ones so /quotes is not
// swallowed by /:symbol-style matches.
router.get('/stocks', marketController.listStocks);

router.get(
  '/quotes',
  validate([query('symbols').notEmpty().withMessage('At least one symbol is required')]),
  marketController.getQuotes
);

router.get(
  '/quote/:symbol',
  validate([param('symbol').trim().notEmpty().withMessage('Symbol is required').isLength({ max: 20 })]),
  marketController.getQuote
);

router.get(
  '/historical/:symbol',
  validate([
    param('symbol').trim().notEmpty().withMessage('Symbol is required').isLength({ max: 20 }),
    query('resolution').optional().isIn(['1', '5', '15', '60', 'D', 'W', 'M']).withMessage('Unsupported resolution')
  ]),
  marketController.getHistorical
);

module.exports = router;
