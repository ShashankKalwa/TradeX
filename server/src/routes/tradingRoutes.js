const express = require('express');

const tradingController = require('../controllers/tradingController');
const validate = require('../middleware/validate');
const { protect, requireVerified } = require('../middleware/auth');
const { tradeLimiter } = require('../middleware/rateLimiter');
const { symbolRules, quantityRules, priceRules } = require('../validators/rules');
const { body, param } = require('express-validator');

const router = express.Router();

router.use(protect);

// Market and resting orders are rate limited together — they both move money.
router.post(
  '/market',
  tradeLimiter,
  requireVerified,
  validate([symbolRules(), body('side').isIn(['buy', 'sell']).withMessage('Side must be buy or sell'), quantityRules()]),
  tradingController.executeMarketOrder
);

router.post(
  '/orders',
  tradeLimiter,
  requireVerified,
  validate([
    symbolRules(),
    body('orderType').isIn(['limit', 'stop']).withMessage('Order type must be limit or stop'),
    body('direction').isIn(['buy', 'sell']).withMessage('Direction must be buy or sell'),
    priceRules('targetPrice'),
    quantityRules()
  ]),
  tradingController.placePendingOrder
);

router.get('/orders', tradingController.listOrders);

router.delete(
  '/orders/:id',
  tradeLimiter,
  validate([param('id').isMongoId().withMessage('Order id must be a valid identifier')]),
  tradingController.cancelOrder
);

router.get('/transactions', tradingController.listTransactions);

module.exports = router;
