import { Client, Environment } from 'square';
import { Payment, PaymentStatus } from '@prisma/client';
import crypto from 'crypto';
import { BasePaymentProvider } from './BaseProvider';
import {
  CheckoutSessionResult,
  WebhookVerificationResult,
  WebhookEventResult,
  RefundResult,
  CreateCheckoutSessionParams,
  WebhookRequest,
  SquareCredentials,
} from '../payments.types';
import logger from '../../../../lib/logger';

export class SquareProvider extends BasePaymentProvider {
  private client: Client;
  private locationId: string;
  private webhookSecret?: string;

  constructor(restaurantId: string, credentials: SquareCredentials) {
    super(restaurantId);

    this.client = new Client({
      accessToken: credentials.accessToken,
      environment: credentials.accessToken.startsWith('sandbox-')
        ? Environment.Sandbox
        : Environment.Production,
    });

    this.locationId = credentials.locationId;
    this.webhookSecret = credentials.webhookSecret;
  }

  async createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<CheckoutSessionResult> {
    try {
      const orderId = `order-${params.orderId.substring(0, 8)}-${Date.now()}`;
      const amountMoney = {
        amount: BigInt(Math.round(params.amount * 100)),
        currency: params.currency.toUpperCase(),
      };

      const response = await this.client.checkoutApi.createPaymentLink({
        idempotencyKey: crypto.randomUUID(),
        order: {
          locationId: this.locationId,
          lineItems: [
            {
              name: `Order #${params.orderId.substring(0, 8)}`,
              quantity: '1',
              basePriceMoney: amountMoney,
            },
          ],
          metadata: {
            orderId: params.orderId,
            restaurantId: this.restaurantId,
            ...params.metadata,
          },
        },
        checkoutOptions: {
          redirectUrl: params.successUrl,
          askForShippingAddress: false,
        },
        prePopulatedData: {
          buyerEmail: params.customerEmail,
        },
      });

      if (!response.result.paymentLink) {
        throw new Error('Square payment link creation failed: no payment link returned');
      }

      logger.info({
        msg: 'Square payment link created',
        restaurantId: this.restaurantId,
        orderId: params.orderId,
        paymentLinkId: response.result.paymentLink.id,
      });

      return {
        checkoutUrl: response.result.paymentLink.url!,
        providerPaymentId: response.result.paymentLink.id!,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create Square payment link',
        restaurantId: this.restaurantId,
        orderId: params.orderId,
        error: error.message,
      });
      throw new Error(`Square payment link creation failed: ${error.message}`);
    }
  }

  async verifyWebhook(req: WebhookRequest): Promise<WebhookVerificationResult> {
    if (!this.webhookSecret) {
      return {
        isValid: false,
        error: 'Webhook secret not configured',
      };
    }

    const signature = req.headers['x-square-signature'];
    if (!signature || Array.isArray(signature)) {
      return {
        isValid: false,
        error: 'Missing x-square-signature header',
      };
    }

    try {
      const requestBody =
        typeof req.rawBody === 'string' ? req.rawBody : req.rawBody.toString('utf8');

      // Square webhook signature verification
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(requestBody);
      const expectedSignature = hmac.digest('base64');

      if (signature !== expectedSignature) {
        return {
          isValid: false,
          error: 'Invalid signature',
        };
      }

      return {
        isValid: true,
        event: req.body,
      };
    } catch (error: any) {
      logger.warn({
        msg: 'Square webhook verification failed',
        error: error.message,
      });
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  async handleWebhookEvent(event: any): Promise<WebhookEventResult> {
    try {
      const eventType = event.type;

      switch (eventType) {
        case 'payment.created':
        case 'payment.updated': {
          const payment = event.data?.object?.payment;
          if (!payment) {
            return {
              success: false,
              error: 'Missing payment data in webhook',
            };
          }

          const orderId = payment.order_id;
          let status: PaymentStatus;

          switch (payment.status) {
            case 'COMPLETED':
              status = PaymentStatus.COMPLETED;
              break;
            case 'FAILED':
            case 'CANCELED':
              status = PaymentStatus.FAILED;
              break;
            case 'PENDING':
            default:
              status = PaymentStatus.PENDING;
              break;
          }

          return {
            success: true,
            paymentId: payment.id,
            orderId,
            status,
          };
        }

        case 'refund.created':
        case 'refund.updated': {
          const refund = event.data?.object?.refund;
          if (!refund) {
            return {
              success: false,
              error: 'Missing refund data in webhook',
            };
          }

          return {
            success: true,
            paymentId: refund.payment_id,
            status: refund.status === 'COMPLETED' ? PaymentStatus.REFUNDED : PaymentStatus.PENDING,
          };
        }

        default:
          logger.debug({
            msg: 'Unhandled Square webhook event type',
            eventType,
          });
          return {
            success: true, // Event received but not processed
          };
      }
    } catch (error: any) {
      logger.error({
        msg: 'Error handling Square webhook event',
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
      const refundAmount = amount ? amount : Number(payment.amount);

      const response = await this.client.refundsApi.refundPayment({
        idempotencyKey: crypto.randomUUID(),
        paymentId: payment.providerPaymentId,
        amountMoney: {
          amount: BigInt(Math.round(refundAmount * 100)),
          currency: payment.currency.toUpperCase(),
        },
        reason: 'Customer requested refund',
      });

      if (!response.result.refund) {
        return {
          success: false,
          error: 'Square refund creation failed',
        };
      }

      logger.info({
        msg: 'Square refund created',
        restaurantId: this.restaurantId,
        paymentId: payment.id,
        refundId: response.result.refund.id,
        amount: refundAmount,
      });

      return {
        success: true,
        refundId: response.result.refund.id,
        amount: refundAmount,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to create Square refund',
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
      // Test by retrieving locations
      await this.client.locationsApi.retrieveLocation(this.locationId);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
