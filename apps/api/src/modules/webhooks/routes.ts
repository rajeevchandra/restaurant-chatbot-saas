import { Router, Request, Response } from 'express';
import prisma from '../../db/prisma';
import { createPaymentAdapter } from '../payments/adapter';
import { decryptSecret } from '../../utils/crypto';
import { isValidTransition } from '../orders/stateMachine';

const router = Router();

// Idempotency check middleware
async function checkIdempotency(webhookEventId: string, provider: string) {
  const existing = await prisma.webhookEvent.findUnique({
    where: {
      provider_providerEventId: {
        provider,
        providerEventId: webhookEventId,
      },
    },
  });

  return existing !== null;
}

async function recordWebhookEvent(
  provider: string,
  providerEventId: string,
  eventType: string,
  payload: any,
  status: string
) {
  await prisma.webhookEvent.create({
    data: {
      provider,
      providerEventId,
      eventType,
      payload: JSON.stringify(payload),
      status,
    },
  });
}

// Stripe webhook
router.post('/stripe', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Get raw body for signature verification
    const payload = (req as any).rawBody || JSON.stringify(req.body);

    // Extract session ID from event to find associated payment
    const tempEvent = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const sessionId = tempEvent.data?.object?.id || tempEvent.data?.object?.payment_intent;

    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID in webhook' });
    }

    // Find payment to get restaurant and config
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: sessionId,
        provider: 'STRIPE',
      },
      include: { order: true },
    });

    if (!payment) {
      console.log('Payment not found for webhook event');
      return res.json({ received: true });
    }

    // Check idempotency
    const eventId = tempEvent.id;
    if (await checkIdempotency(eventId, 'STRIPE')) {
      console.log(`Duplicate webhook event ${eventId}, skipping`);
      return res.json({ received: true });
    }

    // Get payment config for webhook secret
    const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: {
        restaurantId: payment.restaurantId,
        provider: 'STRIPE',
        isActive: true,
      },
    });

    if (!paymentConfig || !paymentConfig.webhookSecret) {
      console.log('No webhook secret configured for restaurant');
      await recordWebhookEvent('STRIPE', eventId, tempEvent.type, tempEvent, 'NO_CONFIG');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const decryptedKey = decryptSecret(paymentConfig.encryptedSecretKey);
    const adapter = createPaymentAdapter('STRIPE', {
      secretKey: decryptedKey,
      webhookSecret: paymentConfig.webhookSecret,
    });

    let event;
    try {
      event = adapter.verifyWebhook(payload, signature);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      await recordWebhookEvent('STRIPE', eventId, tempEvent.type, tempEvent, 'VERIFICATION_FAILED');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    // Process webhook
    const processed = await adapter.processWebhook(event);

    // Record webhook event
    await recordWebhookEvent('STRIPE', eventId, event.type, event, 'PROCESSING');

    // Update payment and order status
    if (processed.status === 'succeeded') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        // Validate state transition
        if (isValidTransition(payment.order.status, 'PAID')) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'PAID' },
          });
        }
      });

      await recordWebhookEvent('STRIPE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'failed') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        // Cancel order if payment failed
        if (isValidTransition(payment.order.status, 'CANCELLED')) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'CANCELLED' },
          });
        }
      });

      await recordWebhookEvent('STRIPE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'refunded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await recordWebhookEvent('STRIPE', eventId, event.type, event, 'COMPLETED');
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Square webhook
router.post('/square', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-square-signature'] as string;
    if (!signature) {
      return res.status(400).json({ error: 'Missing x-square-signature header' });
    }

    // Get raw body for signature verification
    const payload = (req as any).rawBody || JSON.stringify(req.body);

    const tempEvent = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const paymentId = tempEvent.data?.object?.payment?.id || tempEvent.data?.id;

    if (!paymentId) {
      return res.status(400).json({ error: 'Missing payment ID in webhook' });
    }

    // Find payment
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: paymentId,
        provider: 'SQUARE',
      },
      include: { order: true },
    });

    if (!payment) {
      console.log('Payment not found for webhook event');
      return res.json({ received: true });
    }

    // Check idempotency
    const eventId = tempEvent.event_id || tempEvent.id;
    if (await checkIdempotency(eventId, 'SQUARE')) {
      console.log(`Duplicate webhook event ${eventId}, skipping`);
      return res.json({ received: true });
    }

    // Get payment config for webhook secret
    const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: {
        restaurantId: payment.restaurantId,
        provider: 'SQUARE',
        isActive: true,
      },
    });

    if (!paymentConfig || !paymentConfig.webhookSecret) {
      console.log('No webhook secret configured for restaurant');
      await recordWebhookEvent('SQUARE', eventId, tempEvent.type, tempEvent, 'NO_CONFIG');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const decryptedKey = decryptSecret(paymentConfig.encryptedSecretKey);
    const adapter = createPaymentAdapter('SQUARE', {
      secretKey: decryptedKey,
      webhookSecret: paymentConfig.webhookSecret,
    });

    let event;
    try {
      event = adapter.verifyWebhook(payload, signature);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      await recordWebhookEvent('SQUARE', eventId, tempEvent.type, tempEvent, 'VERIFICATION_FAILED');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    // Process webhook
    const processed = await adapter.processWebhook(event);

    // Record webhook event
    await recordWebhookEvent('SQUARE', eventId, event.type, event, 'PROCESSING');

    // Update payment and order status
    if (processed.status === 'succeeded') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        if (isValidTransition(payment.order.status, 'PAID')) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'PAID' },
          });
        }
      });

      await recordWebhookEvent('SQUARE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'failed') {
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        if (isValidTransition(payment.order.status, 'CANCELLED')) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: 'CANCELLED' },
          });
        }
      });

      await recordWebhookEvent('SQUARE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'refunded') {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'REFUNDED' },
      });

      await recordWebhookEvent('SQUARE', eventId, event.type, event, 'COMPLETED');
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;
