const { body } = require('express-validator');

const passwordRules = [
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[a-z]/)
    .withMessage('Password must contain a lowercase letter')
    .matches(/[A-Z]/)
    .withMessage('Password must contain an uppercase letter')
    .matches(/\d/)
    .withMessage('Password must contain a number')
];

const symbolRules = (field = 'symbol') =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage('Symbol is required')
    .isLength({ min: 1, max: 20 })
    .withMessage('Symbol must be 1-20 characters')
    .matches(/^[A-Za-z0-9&.-]+$/)
    .withMessage('Symbol contains unsupported characters');

const quantityRules = (field = 'quantity') =>
  body(field)
    .isFloat({ gt: 0 })
    .withMessage('Quantity must be greater than zero')
    .toFloat();

const priceRules = (field) =>
  body(field)
    .isFloat({ gt: 0 })
    .withMessage(`${field} must be greater than zero`)
    .toFloat();

module.exports = { passwordRules, symbolRules, quantityRules, priceRules };
