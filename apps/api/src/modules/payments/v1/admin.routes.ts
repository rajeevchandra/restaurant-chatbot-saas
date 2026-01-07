import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { requireAuth } from '../../../middleware/auth';
import { attachTenant, requireTenant } from '../../../middleware/tenant';
import { validate } from '../../../middleware/validate';
import {
  updatePaymentConfigSchema,
  testConnectionSchema,
} from './payments.validation';
import { apiLimiter } from '../../../middleware/rateLimiter';

const router = Router();
const controller = new PaymentsController();

/**
 * @swagger
 * /api/v1/admin/payments/config:
 *   put:
 *     summary: Update payment configuration (OWNER only)
 *     description: Configure or update payment provider credentials. Credentials are encrypted before storage. Only OWNER can modify payment settings.
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - credentials
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [STRIPE, SQUARE]
 *               credentials:
 *                 oneOf:
 *                   - type: object
 *                     description: Stripe credentials
 *                     properties:
 *                       secretKey:
 *                         type: string
 *                         description: Stripe secret key (starts with sk_)
 *                       publicKey:
 *                         type: string
 *                         description: Stripe public key (starts with pk_)
 *                       webhookSecret:
 *                         type: string
 *                         description: Stripe webhook signing secret (starts with whsec_)
 *                   - type: object
 *                     description: Square credentials
 *                     properties:
 *                       accessToken:
 *                         type: string
 *                         description: Square access token
 *                       locationId:
 *                         type: string
 *                         description: Square location ID
 *                       webhookSecret:
 *                         type: string
 *                         description: Square webhook signature key
 *               isActive:
 *                 type: boolean
 *                 default: true
 *               metadata:
 *                 type: object
 *                 description: Additional configuration metadata
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - OWNER role required
 */
router.put(
  '/config',
  apiLimiter,
  requireAuth,
  attachTenant,
  requireTenant,
  validate(updatePaymentConfigSchema),
  controller.updatePaymentConfig.bind(controller)
);

/**
 * @swagger
 * /api/v1/admin/payments/config:
 *   get:
 *     summary: Get payment configuration
 *     description: Retrieve current payment configuration. Returns provider info and connection status only (no credentials).
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuration retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   type: string
 *                   enum: [STRIPE, SQUARE]
 *                 isActive:
 *                   type: boolean
 *                 hasPublicKey:
 *                   type: boolean
 *                 hasSecretKey:
 *                   type: boolean
 *                 hasWebhookSecret:
 *                   type: boolean
 *                 connectionStatus:
 *                   type: string
 *                   enum: [connected, error, not_tested]
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/config',
  apiLimiter,
  requireAuth,
  attachTenant,
  requireTenant,
  controller.getPaymentConfig.bind(controller)
);

/**
 * @swagger
 * /api/v1/admin/payments/test:
 *   post:
 *     summary: Test payment provider connection (OWNER only)
 *     description: Test connectivity with payment provider using provided credentials (without saving).
 *     tags: [Admin - Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - credentials
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [STRIPE, SQUARE]
 *               credentials:
 *                 type: object
 *     responses:
 *       200:
 *         description: Connection test completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 error:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - OWNER role required
 */
router.post(
  '/config/test',
  apiLimiter,
  requireAuth,
  attachTenant,
  requireTenant,
  validate(testConnectionSchema),
  controller.testConnection.bind(controller)
);

export default router;
