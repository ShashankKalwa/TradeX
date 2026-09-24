const express = require('express');
const { body, param, query } = require('express-validator');

const adminController = require('../controllers/adminController');
const validate = require('../middleware/validate');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// RBAC is applied to the whole router: a non-admin never reaches a controller.
router.use(protect, authorize('admin'));

router.get('/stats', adminController.getSystemStats);

router.get(
  '/anomalies',
  validate([
    query('threshold').optional().isInt({ min: 1 }).withMessage('Threshold must be a positive integer'),
    query('windowHours').optional().isInt({ min: 1, max: 720 }).withMessage('windowHours must be between 1 and 720')
  ]),
  adminController.getAnomalies
);

router.get('/stocks', adminController.listStocks);

router.post(
  '/stocks',
  validate([
    body('symbol').trim().notEmpty().withMessage('Symbol is required').isLength({ max: 20 }),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('exchange').trim().notEmpty().withMessage('Exchange is required'),
    body('currentPrice').isFloat({ gt: 0 }).withMessage('currentPrice must be greater than zero'),
    body('sector').optional().trim().isLength({ max: 60 })
  ]),
  adminController.createStock
);

router.patch(
  '/stocks/:symbol',
  validate([
    param('symbol').trim().notEmpty(),
    body('currentPrice').optional().isFloat({ gt: 0 }).withMessage('currentPrice must be greater than zero'),
    body('name').optional().trim().notEmpty(),
    body('sector').optional().trim()
  ]),
  adminController.updateStock
);

// Delist rather than delete, so historical transactions keep resolving.
router.delete('/stocks/:symbol', validate([param('symbol').trim().notEmpty()]), adminController.delistStock);

router.get('/users', adminController.listUsers);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
