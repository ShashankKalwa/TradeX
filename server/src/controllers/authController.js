const authService = require('../services/authService');
const asyncHandler = require('../utils/asyncHandler');
const { isProduction } = require('../config/env');

const setTokenCookies = (res, accessToken, refreshToken) => {
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
  };
  
  // Access token: typically short-lived (e.g. 15m)
  res.cookie('accessToken', accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000 // 15 minutes
  });
  
  // Refresh token: longer-lived (e.g. 7d)
  res.cookie('refreshToken', refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });
};

const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken');
};

/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Registration, sessions, and email verification
 */

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: Create an account and a funded virtual portfolio
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Aditi Sharma }
 *               email: { type: string, format: email, example: aditi@example.com }
 *               password: { type: string, minLength: 8, example: Str0ngPassw0rd }
 *     responses:
 *       201: { description: Account created; returns tokens in cookies and the public user }
 *       409: { description: Email already registered }
 *       400: { description: Validation failed }
 */
const register = asyncHandler(async (req, res) => {
  const data = await authService.register({ ...req.body, ip: req.ip });
  setTokenCookies(res, data.accessToken, data.refreshToken);
  
  // Don't leak tokens in the JSON response
  // delete data.accessToken; // Kept for frontend Bearer auth
  delete data.refreshToken;
  
  res.status(201).json({ success: true, data });
});

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: Exchange credentials for an access and refresh token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200: { description: Authenticated }
 *       401: { description: Invalid credentials }
 *       429: { description: Too many attempts }
 */
const login = asyncHandler(async (req, res) => {
  const data = await authService.login({ ...req.body, ip: req.ip });
  setTokenCookies(res, data.accessToken, data.refreshToken);
  
  // delete data.accessToken; // Kept for frontend Bearer auth
  delete data.refreshToken;
  
  res.json({ success: true, data });
});

/**
 * @openapi
 * /auth/refresh:
 *   post:
 *     summary: Rotate a refresh token into a new token pair
 *     tags: [Auth]
 *     responses:
 *       200: { description: New token pair }
 *       401: { description: Refresh token is invalid or already used }
 */
const refresh = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  const data = await authService.refresh(incomingRefreshToken);
  setTokenCookies(res, data.accessToken, data.refreshToken);
  
  // delete data.accessToken; // Kept for frontend Bearer auth
  delete data.refreshToken;
  
  res.json({ success: true, data });
});

/**
 * @openapi
 * /auth/logout:
 *   post:
 *     summary: Invalidate the current session
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
const logout = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;
  await authService.logout(req.user._id, incomingRefreshToken);
  clearTokenCookies(res);
  res.json({ success: true, data: { message: 'Logged out' } });
});

/**
 * @openapi
 * /auth/me:
 *   get:
 *     summary: The authenticated user
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Current user }
 */
const me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: authService.publicUser(req.user) });
});

/**
 * @openapi
 * /auth/verify-email:
 *   post:
 *     summary: Confirm an email address with the token from the verification link
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token]
 *             properties:
 *               token: { type: string }
 *     responses:
 *       200: { description: Email verified }
 *       400: { description: Token invalid or expired }
 */
const verifyEmail = asyncHandler(async (req, res) => {
  const data = await authService.verifyEmail(req.body.token);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /auth/resend-verification:
 *   post:
 *     summary: Send a fresh verification link
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Link sent }
 *       409: { description: Already verified }
 */
const resendVerification = asyncHandler(async (req, res) => {
  const data = await authService.resendVerification(req.user._id);
  res.json({ success: true, data });
});

const enableTwoFactor = asyncHandler(async (req, res) => {
  const data = await authService.enableTwoFactor(req.user._id, req.body.secret);
  res.json({ success: true, data });
});

const disableTwoFactor = asyncHandler(async (req, res) => {
  const data = await authService.disableTwoFactor(req.user._id);
  res.json({ success: true, data });
});

/**
 * @openapi
 * /auth/me:
 *   delete:
 *     summary: Delete the authenticated user account and all associated data
 *     tags: [Auth]
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200: { description: Account deleted }
 */
const deleteAccount = asyncHandler(async (req, res) => {
  await authService.deleteAccount(req.user._id);
  clearTokenCookies(res);
  res.json({ success: true, data: { message: 'Account deleted' } });
});

module.exports = {
  register,
  login,
  refresh,
  logout,
  me,
  deleteAccount,
  verifyEmail,
  resendVerification,
  enableTwoFactor,
  disableTwoFactor
};
