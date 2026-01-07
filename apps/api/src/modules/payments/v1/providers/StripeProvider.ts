import Stripe from 'stripe';
import { Payment, PaymentStatus } from '@prisma/client';
import { BasePaymentProvider } from './BaseProvider';
import {
  CheckoutSessionResult,
  WebhookVerificationResult,
  WebhookEventResult,
  RefundResult,
  CreateCheckoutSessionParams,
  WebhookRequest,
  StripeCredentials,
} from '../payments.types';
import logger from '../../../../lib/logger';

export class StripeProvider extends BasePaymentProvider {
  private stripe: Stripe;
  private webhookSecret?: string;

  constructor(restaurantId: string, credentials: StripeCredentials) {
    super(restaurantId);

    this.stripe = new Stripe(credentials.secretKey, {
      apiVersion: '2023-10-16',
      typescript: true,
    });

    this.webhookSecret = credentials.webhookSecret;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: params.currency.toLowerCase(),
              product_data: {
                name: `Order #${params.orderId.substring(0, 8)}`,
              },
              unit_amount: Math.round(params.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: params.successUrl,
        cancel_url: params.cancelUrl,
        customer_email: params.customerEmail,
        metadata: {
          orderId: params.orderId,
          restaurantId: this.restaurantId,
          ...params.metadata,
        },
      });

      logger.info({
        msg: 'Stripe checkout session created',
        restaurantId: this.restaurantId,
        orderId: params.orderId,
        sessionId: session.id,
      });

      return {
        checkoutUrl: session.url!,
        providerPaymentId: session.id,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create Stripe checkout session',
        restaurantId: this.restaurantId,
        orderId: params.orderId,
        error: error.message,
      });
      throw new Error(`Stripe checkout session creation failed: ${error.message}`);
    }
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookVerificationResult> {
    if (!this.webhookSecret) {
      return {
        isValid: false,
        error: 'Webhook secret not configured',
      };
    }

    const signature = req.headers['stripe-signature'];
    if (!signature || Array.isArray(signature)) {
      return {
        isValid: false,
        error: 'Missing stripe-signature header',
      };
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        req.rawBody,
        signature,
        this.webhookSecret
      );

      return {
        isValid: true,
        event,
      };
    } catch (error: any) {
      logger.warn({
        msg: 'Stripe webhook verification failed',
        error: error.message,
      });
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<WebhookEventResult> {
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          const orderId = session.metadata?.orderId;

          if (!orderId) {
            return {
              success: false,
              error: 'Missing orderId in session metadata',
            };
          }

          return {
            success: true,
            paymentId: session.id,
            orderId,
            status: PaymentStatus.COMPLETED,
          };
        }

        case 'charge.succeeded': {
          const charge = event.data.object as Stripe.Charge;
          return {
            success: true,
            paymentId: charge.id,
            status: PaymentStatus.COMPLETED,
          };
        }

        case 'charge.failed': {
          const charge = event.data.object as Stripe.Charge;
          return {
            success: true,
            paymentId: charge.id,
            status: PaymentStatus.FAILED,
          };
        }

        case 'charge.refunded': {
          const charge = event.data.object as Stripe.Charge;
          return {
            success: true,
            paymentId: charge.id,
            status: PaymentStatus.REFUNDED,
          };
        }

        default:
          logger.debug({
            msg: 'Unhandled Stripe webhook event type',
            eventType: event.type,
          });
          return {
            success: true, // Event received but not processed
          };
      }
    } catch (error: any) {
      logger.error({
        msg: 'Error handling Stripe webhook event',
        eventType: event.type,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async refund(payment: Payment, amount?: number): Promise<RefundResult> {
    if (!payment.providerPaymentId) {
      return {
        success: false,
        error: 'Missing provider payment ID',
      };
    }

    try {
      // First, retrieve the charge ID from the session
      let chargeId: string | null = null;

      // If providerPaymentId is a session ID, retrieve the charge
      if (payment.providerPaymentId.startsWith('cs_')) {
        const session = await this.stripe.checkout.sessions.retrieve(
          payment.providerPaymentId
        );
        chargeId = session.payment_intent as string;
      } else {
        chargeId = payment.providerPaymentId;
      }

      if (!chargeId) {
        return {
          success: false,
          error: 'Could not determine charge ID',
        };
      }

      const refundAmount = amount
        ? Math.round(amount * 100)
        : Math.round(Number(payment.amount) * 100);

      const refund = await this.stripe.refunds.create({
        payment_intent: chargeId,
        amount: refundAmount,
        metadata: {
          orderId: payment.orderId,
          restaurantId: this.restaurantId,
        },
      });

      logger.info({
        msg: 'Stripe refund created',
        restaurantId: this.restaurantId,
        paymentId: payment.id,
        refundId: refund.id,
        amount: refundAmount / 100,
      });

      return {
        success: true,
        refundId: refund.id,
        amount: refundAmount / 100,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create Stripe refund',
        restaurantId: this.restaurantId,
        paymentId: payment.id,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Test by retrieving account balance
      await this.stripe.balance.retrieve();
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
