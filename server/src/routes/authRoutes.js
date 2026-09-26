const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const { passwordRules } = require('../validators/rules');

const router = express.Router();

router.post(
  '/register',
  authLimiter,
  validate([
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 80 }),
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    ...passwordRules
  ]),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate([
    body('email').isEmail().withMessage('A valid email is required').normalizeEmail({ gmail_remove_dots: false }),
    body('password').notEmpty().withMessage('Password is required')
  ]),
  authController.login
);

// Rate limited like login: a refresh token is a credential.
router.post('/refresh', authLimiter, validate([body('refreshToken').notEmpty().withMessage('Refresh token is required')]), authController.refresh);

router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.me);
router.delete('/me', protect, authController.deleteAccount);

router.post('/verify-email', validate([body('token').notEmpty().withMessage('Verification token is required')]), authController.verifyEmail);
router.post('/resend-verification', protect, authLimiter, authController.resendVerification);

router.post('/2fa/enable', protect, validate([body('secret').notEmpty().withMessage('TOTP secret is required')]), authController.enableTwoFactor);
router.post('/2fa/disable', protect, authController.disableTwoFactor);

module.exports = router;
