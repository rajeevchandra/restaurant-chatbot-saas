import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../db/prisma';
import { createPaymentAdapter } from '../payments/adapter';
import { decryptPaymentCredentials } from '../payments/v1/encryption';
import { isValidTransition } from '../orders/stateMachine';
import { OrderStatus, PaymentProvider } from '@restaurant-saas/shared';

const router = Router();

// Middleware to handle raw body from express.raw() for webhook signature verification
const webhookBodyHandler = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔧 WEBHOOK BODY HANDLER RUNNING');
  console.log('=== WEBHOOK BODY HANDLER ===');
  console.log('Body is Buffer:', Buffer.isBuffer(req.body));
  console.log('Body type:', typeof req.body);
  console.log('Has rawBody already:', !!(req as any).rawBody);
  
  if (Buffer.isBuffer(req.body)) {
    // Store raw body for signature verification
    (req as any).rawBody = req.body.toString('utf8');
    console.log('Converted Buffer to rawBody string, length:', (req as any).rawBody.length);
    // Parse to JSON for easier access
    try {
      req.body = JSON.parse((req as any).rawBody);
      console.log('Parsed body to JSON successfully');
    } catch (error) {
      console.error('ERROR: Invalid JSON in webhook body', error);
      return res.status(400).json({ error: 'Invalid JSON in webhook body' });
    }
  } else if (typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    // Body is already parsed JSON (shouldn't happen with express.raw but just in case)
    console.log('Body is already JSON object');
    (req as any).rawBody = JSON.stringify(req.body);
  }
  
  console.log('=== WEBHOOK BODY HANDLER COMPLETE ===');
  next();
};

// Apply webhook body handler to all webhook routes
router.use(webhookBodyHandler);

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
/**
 * @swagger
 * /api/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook endpoint
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Bad request
 *       500:
 *         description: Webhook processing failed
 */
router.post('/stripe', async (req: Request, res: Response) => {
  console.log('\n🔔 STRIPE WEBHOOK ROUTE HIT\n');
  try {
    const signature = req.headers['stripe-signature'] as string;
    if (!signature) {
      console.error('❌ Missing stripe-signature header');
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    // Get raw body for signature verification
    const payload = (req as any).rawBody || JSON.stringify(req.body);
    if (!payload) {
      console.error('❌ Missing payload/rawBody');
      return res.status(400).json({ error: 'Missing request body' });
    }
    // Extract session ID or payment intent ID from event to find associated payment
    const tempEvent = typeof payload === 'string' ? JSON.parse(payload) : payload;
    
    // Only process checkout.session.completed events (ignore payment_intent events)
    // Payment intent events don't have the checkout session ID we store in our DB
    if (tempEvent.type !== 'checkout.session.completed') {
      console.log('ℹ️  Ignoring event type:', tempEvent.type, '(only processing checkout.session.completed)');
      return res.json({ received: true });
    }
    
    const providerId = tempEvent.data?.object?.id;

    if (!providerId) {
      console.error('❌ Missing checkout session ID in webhook event:', tempEvent.type);
      return res.status(400).json({ error: 'Missing checkout session ID in webhook' });
    }

    console.log('✅ Webhook received:', tempEvent.type, 'Session ID:', providerId);
    // Find payment by checkout session ID
    const payment = await prisma.payment.findFirst({
      where: {
        providerPaymentId: providerId,
        provider: 'STRIPE',
      },
      include: { order: true },
    });

    if (!payment) {
      console.log('⚠️  Payment not found for checkout session:', providerId);
      return res.json({ received: true });
    }

    console.log('✅ Found payment:', payment.id, 'Order:', payment.orderId);

    // Check idempotency
    const eventId = tempEvent.id;
    if (await checkIdempotency(eventId, 'STRIPE')) {
      console.log('⚠️  Duplicate webhook event, skipping');
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
      console.error('❌ No webhook secret configured for restaurant');
      await recordWebhookEvent('STRIPE', eventId, tempEvent.type, tempEvent, 'NO_CONFIG');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const decryptedKey = decryptPaymentCredentials(paymentConfig.encryptedSecretKey);
    const adapter = createPaymentAdapter(PaymentProvider.STRIPE, {
      secretKey: decryptedKey,
      webhookSecret: paymentConfig.webhookSecret,
    });

    let event;
    try {
      event = adapter.verifyWebhook(payload, signature);
      console.log('✅ Signature verified');
    } catch (err) {
      console.error('❌ Webhook verification failed:', err);
      await recordWebhookEvent('STRIPE', eventId, tempEvent.type, tempEvent, 'VERIFICATION_FAILED');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    // Process webhook
    const processed = await adapter.processWebhook(event);
    console.log('📊 Processed webhook result:', JSON.stringify(processed, null, 2));

    // Record webhook event
    await recordWebhookEvent('STRIPE', eventId, event.type, event, 'PROCESSING');

    // Update payment and order status
    if (processed.status === 'succeeded') {
      console.log('💰 Payment succeeded! Updating order to PAID...');
      await prisma.$transaction(async (tx: any) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        // Validate state transition
        if (isValidTransition(payment.order.status, OrderStatus.PAID)) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          });
          console.log('✅ Order updated to PAID successfully!');
        } else {
          console.log('⚠️  Cannot transition order from', payment.order.status, 'to PAID');
        }
      });

      await recordWebhookEvent('STRIPE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'failed') {
      console.log('❌ Payment failed! Cancelling order...');
      await prisma.$transaction(async (tx: any) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        // Cancel order if payment failed
        if (isValidTransition(payment.order.status, OrderStatus.CANCELLED)) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.CANCELLED },
          });
        }
      });
        provider: PaymentProvider.SQUARE,
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
    console.error('❌ Stripe webhook error:', error);
    console.error('Error details:', error instanceof Error ? error.message : String(error));
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

        provider: PaymentProvider.SQUARE,
/**
 * @swagger
 * /api/webhooks/square:
 *   post:
 *     summary: Square webhook endpoint
 *     tags:
 *       - Webhooks
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook received
 *       400:
 *         description: Bad request
 *       500:
 *         description: Webhook processing failed
 */
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
    if (await checkIdempotency(eventId, PaymentProvider.SQUARE)) {
      console.log(`Duplicate webhook event ${eventId}, skipping`);
      return res.json({ received: true });
    }

    // Get payment config for webhook secret
    const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: {
        restaurantId: payment.restaurantId,
        provider: PaymentProvider.SQUARE,
        isActive: true,
      },
    });

    if (!paymentConfig || !paymentConfig.webhookSecret) {
      console.log('No webhook secret configured for restaurant');
      await recordWebhookEvent(PaymentProvider.SQUARE, eventId, tempEvent.type, tempEvent, 'NO_CONFIG');
      return res.status(400).json({ error: 'Webhook secret not configured' });
    }

    // Verify webhook signature
    const decryptedKey = decryptPaymentCredentials(paymentConfig.encryptedSecretKey);
    const adapter = createPaymentAdapter(PaymentProvider.SQUARE, {
      secretKey: decryptedKey,
      webhookSecret: paymentConfig.webhookSecret,
    });

    let event;
    try {
      event = adapter.verifyWebhook(payload, signature);
    } catch (err) {
      console.error('Webhook verification failed:', err);
      await recordWebhookEvent(PaymentProvider.SQUARE, eventId, tempEvent.type, tempEvent, 'VERIFICATION_FAILED');
      return res.status(400).json({ error: 'Webhook verification failed' });
    }

    // Process webhook
    const processed = await adapter.processWebhook(event);

    // Record webhook event
    await recordWebhookEvent(PaymentProvider.SQUARE, eventId, event.type, event, 'PROCESSING');

    // Update payment and order status
    if (processed.status === 'succeeded') {
      await prisma.$transaction(async (tx: any) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'COMPLETED' },
        });

        if (isValidTransition(payment.order.status, OrderStatus.PAID)) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.PAID },
          });
        }
      });

      await recordWebhookEvent('SQUARE', eventId, event.type, event, 'COMPLETED');
    } else if (processed.status === 'failed') {
      await prisma.$transaction(async (tx: any) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'FAILED' },
        });

        if (isValidTransition(payment.order.status, OrderStatus.CANCELLED)) {
          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: OrderStatus.CANCELLED },
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
