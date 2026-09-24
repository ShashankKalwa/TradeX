const express = require('express');
const { body, param } = require('express-validator');

const watchlistController = require('../controllers/watchlistController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { symbolRules, priceRules } = require('../validators/rules');

const router = express.Router();

router.use(protect);

router.get('/', watchlistController.getWatchlist);

router.post('/', validate([symbolRules()]), watchlistController.addSymbol);

// Alerts are declared before the bare /:symbol route, so "alerts" is never read
// as a symbol name.
router.post(
  '/alerts',
  validate([
    symbolRules(),
    priceRules('targetPrice'),
    body('direction').isIn(['above', 'below']).withMessage('Direction must be above or below')
  ]),
  watchlistController.createAlert
);

router.delete('/alerts/:id', validate([param('id').isMongoId().withMessage('Alert id must be a valid identifier')]), watchlistController.deleteAlert);

router.delete('/:symbol', validate([param('symbol').trim().notEmpty().isLength({ max: 20 })]), watchlistController.removeSymbol);

module.exports = router;
