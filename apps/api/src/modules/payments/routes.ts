import { Router, Response } from 'express';
import prisma from '../../db/prisma';
import { authenticate, authorize, AuthRequest } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { createPaymentIntentSchema } from '@restaurant-saas/shared';
import { createPaymentAdapter } from './adapter';
import { encryptSecret, decryptSecret } from '../../utils/crypto';

const router = Router();

// Get payment config
router.get('/config', authenticate, async (req: AuthRequest, res: Response) => {
  const config = await prisma.restaurantPaymentConfig.findMany({
    where: { restaurantId: req.restaurantId, isActive: true },
    select: {
      id: true,
      provider: true,
      isActive: true,
      publicKey: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  res.json({ success: true, data: config });
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
