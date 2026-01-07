import { Router } from 'express';
import { authController } from './auth.controller';
import { validate } from '../../../middleware/validate';
import { loginSchema } from './auth.validation';
import { requireAuth } from '../../../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Rate limiter for auth endpoints
 * Stricter limits to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Login with restaurant slug, email, and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - slug
 *               - email
 *               - password
 *             properties:
 *               slug:
 *                 type: string
 *                 description: Restaurant slug
 *                 example: joes-pizza
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User email
 *                 example: owner@joespizza.com
 *               password:
 *                 type: string
 *                 format: password
 *                 description: User password
 *                 example: SecurePass123!
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token (store in memory, use in Authorization header)
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         email:
 *                           type: string
 *                         role:
 *                           type: string
 *                           enum: [OWNER, MANAGER, STAFF]
 *                         restaurantId:
 *                           type: string
 *                         restaurantSlug:
 *                           type: string
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *         headers:
 *           Set-Cookie:
 *             description: httpOnly refresh token cookie
 *             schema:
 *               type: string
 *               example: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800
 *       401:
 *         description: Invalid credentials or restaurant not found
 *       400:
 *         description: Validation error
 */
router.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  (req, res, next) => authController.login(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/auth/refresh:
 *   post:
 *     summary: Refresh access token using refresh token cookie
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       description: New JWT access token
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *       401:
 *         description: Invalid or expired refresh token
 */
router.post(
  '/refresh',
  (req, res, next) => authController.refresh(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Logout and invalidate refresh tokens
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: Logged out successfully
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *       401:
 *         description: Not authenticated
 */
router.post(
  '/logout',
  requireAuth(),
  (req, res, next) => authController.logout(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/auth/me:
 *   get:
 *     summary: Get current authenticated user information
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                       enum: [OWNER, MANAGER, STAFF]
 *                     restaurantId:
 *                       type: string
 *                     restaurantSlug:
 *                       type: string
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                 meta:
 *                   type: object
 *                   properties:
 *                     requestId:
 *                       type: string
 *       401:
 *         description: Not authenticated
 */
router.get(
  '/me',
  requireAuth(),
  (req, res, next) => authController.me(req, res).catch(next)
);

export default router;
