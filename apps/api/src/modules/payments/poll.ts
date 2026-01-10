import { Request, Response, Router } from 'express';
import prisma from '../../db/prisma';
import Stripe from 'stripe';
import { decrypt } from '../../utils/crypto';

const router = Router();

/**
 * Poll payment status endpoint
 * Called by widget after opening payment link to check if payment completed
 * This is a fallback for when webhooks are not working reliably
 */
router.post('/poll/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;

    // Check if polling is enabled
    const pollingEnabled = process.env.ENABLE_PAYMENT_POLLING === 'true';
    if (!pollingEnabled) {
      return res.status(403).json({ 
        error: 'Payment polling is disabled. Use webhooks instead.' 
      });
    }

    console.log(`🔄 Polling payment status for order: ${orderId}`);

    // Find the order with its payment
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true }
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (!order.payment) {
      return res.status(404).json({ error: 'No payment associated with order' });
    }

    // If already paid, return success
    if (order.status === 'PAID') {
      console.log(`✅ Order ${orderId} already marked as PAID`);
      return res.json({ 
        status: 'PAID',
        message: 'Payment already confirmed',
        order: { id: order.id, status: order.status }
      });
    }

    // Only poll if payment is still pending
    if (order.payment.status !== 'PENDING') {
      return res.json({
        status: order.payment.status,
        message: 'Payment not pending',
        order: { id: order.id, status: order.status }
      });
    }

    const payment = order.payment;

    // Get restaurant payment config
    const paymentConfig = await prisma.restaurantPaymentConfig.findFirst({
      where: { 
        restaurantId: order.restaurantId,
        provider: payment.provider
      }
    });

    if (!paymentConfig || !paymentConfig.encryptedSecretKey) {
      console.log(`❌ No payment config found for restaurant ${order.restaurantId}`);
      return res.status(500).json({ error: 'Payment configuration not found' });
    }

    // Decrypt the secret key
    const secretKey = decrypt(
      paymentConfig.encryptedSecretKey,
      process.env.PAYMENT_CONFIG_ENC_KEY!
    );

    if (payment.provider === 'STRIPE') {
      const stripe = new Stripe(secretKey, {
        apiVersion: '2025-12-15.clover'
      });

      console.log(`🔍 Checking Stripe session: ${payment.providerPaymentId}`);

      // Retrieve the checkout session from Stripe
      const session = await stripe.checkout.sessions.retrieve(payment.providerPaymentId);

      console.log(`📊 Stripe session status: ${session.status}, payment_status: ${session.payment_status}`);

      // Check if payment was completed
      if (session.payment_status === 'paid' && session.status === 'complete') {
        console.log(`✅ Payment confirmed for order ${orderId}, updating database...`);

        // Update payment and order in a transaction
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { 
              status: 'COMPLETED',
              completedAt: new Date()
            }
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { 
              status: 'PAID',
              updatedAt: new Date()
            }
          })
        ]);

        console.log(`✅ Order ${orderId} updated to PAID`);

        return res.json({
          status: 'PAID',
          message: 'Payment confirmed',
          order: { id: orderId, status: 'PAID' }
        });
      } else if (session.status === 'expired') {
        // Session expired without payment
        await prisma.$transaction([
          prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'FAILED' }
          }),
          prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' }
          })
        ]);

        return res.json({
          status: 'FAILED',
          message: 'Payment session expired',
          order: { id: orderId, status: 'FAILED' }
        });
      } else {
        // Still pending
        console.log(`⏳ Payment still pending for order ${orderId}`);
        return res.json({
          status: 'PENDING',
          message: 'Payment not yet completed',
          order: { id: orderId, status: order.status }
        });
      }
    } else {
      // Other payment providers can be added here
      return res.status(400).json({ 
        error: `Polling not supported for provider: ${payment.provider}` 
      });
    }

  } catch (error: any) {
    console.error('❌ Error polling payment:', error);
    return res.status(500).json({ 
      error: 'Failed to poll payment status',
      details: error.message 
    });
  }
});

export default router;
