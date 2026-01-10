import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPaymentIntentSchema } from '@restaurant-saas/shared';
import { createPaymentAdapter } from './adapter';
import { encryptSecret, decryptSecret } from '../../utils/crypto';

const router = Router();

/**
 * @swagger
 * /api/v1/admin/payments/config:
 *   get:
 *     summary: Get active payment configuration for the restaurant
 *     tags:
 *       - Payments
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Success. Returns active payment config(s).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       isActive:
 *                         type: boolean
 *                       publicKey:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// Get payment config
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    console.log('[PAYMENTS] /config handler START', {
      method: req.method,
      url: req.originalUrl,
      restaurantId: req.restaurantId,
      user: req.user,
      headers: req.headers
    });
    if (!req.restaurantId) {
      console.log('[PAYMENTS] /config missing restaurantId');
      return res.status(401).json({ success: false, error: 'Missing restaurantId in auth context' });
    }
    const query = {
      where: { restaurantId: req.restaurantId, isActive: true },
      select: {
        id: true,
        provider: true,
        isActive: true,
        publicKey: true,
        createdAt: true,
        updatedAt: true,
      },
    };
    console.log('[PAYMENTS] /config about to query prisma.restaurantPaymentConfig.findMany', { query });
    let config;
    try {
      config = await prisma.restaurantPaymentConfig.findMany(query);
      console.log('[PAYMENTS] /config prisma query RESULT', {
        count: Array.isArray(config) ? config.length : null,
        result: config
      });
    } catch (dbError) {
      console.error('[PAYMENTS] /config PRISMA ERROR', dbError);
      throw dbError;
    }
    res.json({ success: true, data: config });
    console.log('[PAYMENTS] /config RESPONSE SENT', { response: { success: true, data: config } });
  } catch (error) {
    console.error('[PAYMENTS] /config ROUTE ERROR:', error);
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Internal server error' });
      console.log('[PAYMENTS] /config ERROR RESPONSE SENT');
    } else {
      console.log('[PAYMENTS] /config HEADERS ALREADY SENT AFTER ERROR');
    }
  }
});

// Update payment config
router.put(
  '/config',
  authenticate,
  authorize('OWNER'),
  async (req: AuthRequest, res: Response) => {
    const { provider, publicKey, secretKey, webhookSecret, metadata } = req.body;

    // Encrypt the secretKey before storing
    const encryptedKey = encryptSecret(secretKey);

    const config = await prisma.restaurantPaymentConfig.upsert({
      where: {
        restaurantId_provider: {
          restaurantId: req.restaurantId!,
          provider,
        },
      },
      update: {
        publicKey,
        encryptedSecretKey: encryptedKey,
        webhookSecret,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      create: {
        restaurantId: req.restaurantId!,
        provider,
        publicKey,
        encryptedSecretKey: encryptedKey,
        webhookSecret,
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
    });

    res.json({
      success: true,
      data: {
        id: config.id,
        provider: config.provider,
        isActive: config.isActive,
      },
    });
  }
);

// Create payment intent
router.post(
  '/intent',
  authenticate,
  validate(createPaymentIntentSchema),
  async (req: AuthRequest, res: Response) => {
    const { orderId, returnUrl } = req.body;

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId: req.restaurantId },
      include: { payments: true },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get active payment config
    const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: { restaurantId: req.restaurantId, isActive: true },
    });

    if (!paymentConfig) {
      return res.status(400).json({ error: 'No payment provider configured' });
    }

    // Decrypt the secretKey
    const decryptedKey = decryptSecret(paymentConfig.encryptedSecretKey);

    const adapter = createPaymentAdapter(paymentConfig.provider, {
      secretKey: decryptedKey,
      webhookSecret: paymentConfig.webhookSecret || undefined,
    });

    const paymentIntent = await adapter.createPaymentIntent(
      Number(order.total) * 100, // Convert to cents
      'usd',
      { orderId, restaurantId: req.restaurantId },
      returnUrl
    );

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        restaurantId: req.restaurantId!,
        orderId,
        provider: paymentConfig.provider,
        providerPaymentId: paymentIntent.paymentIntentId,
        amount: order.total,
        currency: 'USD',
        status: 'PENDING',
        metadata: JSON.stringify({ returnUrl }),
      },
    });

    // Update order status
    await prisma.order.update({
      where: { id: orderId },
      data: { status: 'PAYMENT_PENDING' },
    });

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        paymentIntentId: paymentIntent.paymentIntentId,
        clientSecret: paymentIntent.clientSecret,
        checkoutUrl: paymentIntent.checkoutUrl,
      },
    });
  }
);

export default router;
