import prisma from '../../../db/prisma';
import { Prisma } from '@prisma/client';
import { PaymentStatus, PaymentProvider, Payment } from '@restaurant-saas/shared';
import {
  UpdatePaymentConfigDTO,
  PaymentConfigDTO,
  TestConnectionDTO,
  CreatePaymentIntentDTO,
  PaymentDTO,
  DecryptedPaymentConfig,
  PaymentCredentials,
} from './payments.types';
import { encryptPaymentCredentials, decryptPaymentCredentials } from './encryption';
import { PaymentProviderFactory } from './providers/PaymentProviderFactory';
import { AppError } from '../../../lib/errors';
import logger from '../../../lib/logger';

export class PaymentsService {
  // ========================================
  // Payment Config Management
  // ========================================

  async updatePaymentConfig(
    restaurantId: string,
    data: UpdatePaymentConfigDTO
  ): Promise<PaymentConfigDTO> {
    try {
      // Encrypt credentials
      const encryptedCredentials = encryptPaymentCredentials(
        JSON.stringify(data.credentials)
      );

      // Upsert config
      const config = await prisma.restaurantPaymentConfig.upsert({
        where: {
          restaurantId_provider: {
            restaurantId,
            provider: data.provider,
          },
        },
        create: {
          restaurantId,
          provider: data.provider,
          isActive: data.isActive ?? true,
          publicKey: this.extractPublicKey(data.credentials),
          encryptedSecretKey: encryptedCredentials,
          webhookSecret: this.extractWebhookSecret(data.credentials),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
        update: {
          isActive: data.isActive ?? true,
          publicKey: this.extractPublicKey(data.credentials),
          encryptedSecretKey: encryptedCredentials,
          webhookSecret: this.extractWebhookSecret(data.credentials),
          metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        },
      });

      logger.info({
        msg: 'Payment config updated',
        restaurantId,
        provider: data.provider,
        configId: config.id,
      });

      return this.toPaymentConfigDTO(config);
    } catch (error: any) {
      logger.error({
        msg: 'Failed to update payment config',
        restaurantId,
        provider: data.provider,
        error: error.message,
      });
      throw new Error(`Failed to update payment config: ${error.message}`);
    }
  }

  async getPaymentConfig(restaurantId: string): Promise<PaymentConfigDTO | null> {
    const config = await prisma.restaurantPaymentConfig.findFirst({
      where: { restaurantId, isActive: true },
    });

    if (!config) {
      return null;
    }

    return this.toPaymentConfigDTO(config);
  }

  async getDecryptedPaymentConfig(
    restaurantId: string
  ): Promise<DecryptedPaymentConfig | null> {
    const config = await prisma.restaurantPaymentConfig.findFirst({
      where: { restaurantId, isActive: true },
    });

    if (!config) {
      return null;
    }

    try {
      const decryptedCredentials = decryptPaymentCredentials(config.encryptedSecretKey);
      const credentials = JSON.parse(decryptedCredentials) as PaymentCredentials;

      return {
        id: config.id,
        restaurantId: config.restaurantId,
        provider: config.provider,
        isActive: config.isActive,
        credentials,
        webhookSecret: config.webhookSecret ?? undefined,
        metadata: config.metadata ? JSON.parse(config.metadata) : undefined,
      };
    } catch (error: any) {
      logger.error({
        msg: 'Failed to decrypt payment config',
        restaurantId,
        configId: config.id,
        error: error.message,
      });
      throw new Error('Failed to decrypt payment credentials');
    }
  }

  async testConnection(
    restaurantId: string,
    data: TestConnectionDTO
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const provider = PaymentProviderFactory.createProviderForTesting(
        data.provider,
        data.credentials,
        restaurantId
      );

      const result = await provider.testConnection();

      logger.info({
        msg: 'Payment connection test completed',
        restaurantId,
        provider: data.provider,
        success: result.success,
      });

      return result;
    } catch (error: any) {
      logger.error({
        msg: 'Payment connection test failed',
        restaurantId,
        provider: data.provider,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ========================================
  // Payment Intent Creation
  // ========================================

  async createPaymentIntent(
    restaurantId: string,
    orderId: string,
    data: CreatePaymentIntentDTO
  ): Promise<PaymentDTO> {
    // 1. Get order and validate
    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
    });

    if (!order) {
      throw new AppError(404, 'Order not found');
    }

    if (order.status === 'PAID' || order.status === 'COMPLETED') {
      throw new AppError(400, 'Order has already been paid');
    }

    if (order.status === 'CANCELLED') {
      throw new AppError(400, 'Cannot pay for cancelled order');
    }

    // 2. Get payment config
    const config = await this.getDecryptedPaymentConfig(restaurantId);
    if (!config) {
      throw new AppError(400, 'Payment provider not configured for this restaurant');
    }

    // DEBUG logging
    logger.debug({ 
      configProvider: config.provider, 
      providerType: typeof config.provider,
      hasCredentials: !!config.credentials,
      restaurantId: config.restaurantId 
    }, 'Payment config before factory');

    // 3. Create provider
    const provider = PaymentProviderFactory.createProvider(config);
    
    // DEBUG: Check if provider was created
    logger.debug({ 
      providerCreated: !!provider, 
      providerType: provider?.constructor?.name 
    }, 'Provider after factory');

    // 4. Create checkout session
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    const checkoutResult = await provider.createCheckoutSession({
      orderId: order.id,
      amount: Number(order.total),
      currency: restaurant?.currency ?? 'USD',
      customerEmail: order.customerEmail ?? undefined,
      customerName: order.customerName ?? undefined,
      successUrl: data.successUrl ?? `${process.env.FRONTEND_URL}/order/${order.id}/success`,
      cancelUrl: data.cancelUrl ?? `${process.env.FRONTEND_URL}/order/${order.id}`,
      metadata: {
        restaurantId,
      },
    });

    // 5. Create payment record
    const payment = await prisma.payment.create({
      data: {
        restaurantId,
        orderId: order.id,
        provider: config.provider,
        providerPaymentId: checkoutResult.providerPaymentId,
        amount: order.total,
        currency: restaurant?.currency ?? 'USD',
        status: PaymentStatus.PENDING,
        metadata: JSON.stringify({
          checkoutUrl: checkoutResult.checkoutUrl,
        }),
      },
    });

    // 6. Update order status to PAYMENT_PENDING
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAYMENT_PENDING' },
    });

    logger.info({
      msg: 'Payment intent created',
      restaurantId,
      orderId,
      paymentId: payment.id,
      provider: config.provider,
    });

    return this.toPaymentDTO(payment, checkoutResult.checkoutUrl);
  }

  // ========================================
  // Webhook Processing
  // ========================================

  async processWebhook(
    provider: PaymentProvider,
    req: any
  ): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
      // 1. Check for idempotency (duplicate event)
      const providerEventId = this.extractEventId(provider, req.body);
      if (providerEventId) {
        const existingEvent = await prisma.webhookEvent.findUnique({
          where: {
            provider_providerEventId: {
              provider: provider.toLowerCase(),
              providerEventId,
            },
          },
        });

        if (existingEvent && existingEvent.status === 'COMPLETED') {
          logger.debug({
            msg: 'Webhook event already processed',
            provider,
            eventId: providerEventId,
          });
          return { success: true, eventId: providerEventId };
        }
      }

      // 2. Create webhook event record
      const webhookEvent = await prisma.webhookEvent.create({
        data: {
          provider: provider.toLowerCase(),
          providerEventId: providerEventId ?? `unknown-${Date.now()}`,
          eventType: req.body.type || req.body.event_type || 'unknown',
          payload: JSON.stringify(req.body),
          status: 'PROCESSING',
        },
      });

      // 3. Find payment config for verification
      // Extract restaurantId from webhook metadata if possible
      const restaurantId = this.extractRestaurantId(req.body);
      if (!restaurantId) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'NO_CONFIG' },
        });
        return {
          success: false,
          error: 'Could not determine restaurant from webhook',
        };
      }

      const config = await this.getDecryptedPaymentConfig(restaurantId);
      if (!config) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'NO_CONFIG' },
        });
        return {
          success: false,
          error: 'Payment config not found',
        };
      }

      // 4. Create provider and verify webhook
      const paymentProvider = PaymentProviderFactory.createProvider(config);
      const verificationResult = await paymentProvider.verifyWebhook({
        body: req.body,
        headers: req.headers,
        rawBody: req.rawBody || JSON.stringify(req.body),
      });

      if (!verificationResult.isValid) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'VERIFICATION_FAILED' },
        });
        logger.warn({
          msg: 'Webhook verification failed',
          provider,
          eventId: providerEventId,
          error: verificationResult.error,
        });
        return {
          success: false,
          error: verificationResult.error,
        };
      }

      // 5. Handle the event
      const result = await paymentProvider.handleWebhookEvent(verificationResult.event);

      if (!result.success) {
        await prisma.webhookEvent.update({
          where: { id: webhookEvent.id },
          data: { status: 'PROCESSING' }, // Keep as PROCESSING for retry
        });
        return {
          success: false,
          error: result.error,
        };
      }

      // 6. Update payment and order status
      if (result.paymentId && result.status) {
        await this.updatePaymentStatus(
          restaurantId,
          result.paymentId,
          result.status,
          result.orderId
        );
      }

      // 7. Mark webhook as completed
      await prisma.webhookEvent.update({
        where: { id: webhookEvent.id },
        data: { status: 'COMPLETED' },
      });

      logger.info({
        msg: 'Webhook processed successfully',
        provider,
        eventId: providerEventId,
        paymentId: result.paymentId,
        status: result.status,
      });

      return { success: true, eventId: providerEventId ?? undefined };
    } catch (error: any) {
      logger.error({
        msg: 'Webhook processing failed',
        provider,
        error: error.message,
      });
      return {
        success: false,
        error: error.message,
      };
    }
  }

  private async updatePaymentStatus(
    restaurantId: string,
    providerPaymentId: string,
    status: PaymentStatus,
    orderId?: string
  ): Promise<void> {
    // Find payment by provider payment ID
    const payment = await prisma.payment.findFirst({
      where: {
        restaurantId,
        providerPaymentId,
      },
    });

    if (!payment) {
      logger.warn({
        msg: 'Payment not found for webhook',
        restaurantId,
        providerPaymentId,
      });
      return;
    }

    // Update payment status
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status },
    });

    // Update order status based on payment status
    if (status === PaymentStatus.COMPLETED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'PAID' },
      });
      logger.info({
        msg: 'Order marked as PAID',
        orderId: payment.orderId,
        paymentId: payment.id,
      });
    } else if (status === PaymentStatus.FAILED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CANCELLED' },
      });
      logger.info({
        msg: 'Order marked as CANCELLED due to payment failure',
        orderId: payment.orderId,
        paymentId: payment.id,
      });
    } else if (status === PaymentStatus.REFUNDED) {
      await prisma.order.update({
        where: { id: payment.orderId },
        data: { status: 'CANCELLED' },
      });
      logger.info({
        msg: 'Order marked as CANCELLED due to refund',
        orderId: payment.orderId,
        paymentId: payment.id,
      });
    }
  }

  // ========================================
  // Helpers
  // ========================================

  private extractPublicKey(credentials: PaymentCredentials): string | null {
    if ('publicKey' in credentials && credentials.publicKey) {
      return credentials.publicKey;
    }
    return null;
  }

  private extractWebhookSecret(credentials: PaymentCredentials): string | null {
    if ('webhookSecret' in credentials && credentials.webhookSecret) {
      return credentials.webhookSecret;
    }
    return null;
  }

  private extractEventId(provider: PaymentProvider, body: any): string | null {
    switch (provider) {
      case PaymentProvider.STRIPE:
        return body.id;
      case PaymentProvider.SQUARE:
        return body.event_id;
      default:
        return null;
    }
  }

  private extractRestaurantId(body: any): string | null {
    // Try to extract from various possible locations
    if (body.data?.object?.metadata?.restaurantId) {
      return body.data.object.metadata.restaurantId;
    }
    if (body.metadata?.restaurantId) {
      return body.metadata.restaurantId;
    }
    if (body.data?.object?.order?.metadata?.restaurantId) {
      return body.data.object.order.metadata.restaurantId;
    }
    return null;
  }

  private toPaymentConfigDTO(
    config: any
  ): PaymentConfigDTO {
    return {
      id: config.id,
      provider: config.provider,
      isActive: config.isActive,
      hasPublicKey: !!config.publicKey,
      hasSecretKey: !!config.encryptedSecretKey,
      hasWebhookSecret: !!config.webhookSecret,
      metadata: config.metadata ? JSON.parse(config.metadata) : undefined,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private toPaymentDTO(payment: Payment, checkoutUrl?: string): PaymentDTO {
    const metadata = payment.metadata ? JSON.parse(payment.metadata) : {};

    return {
      id: payment.id,
      orderId: payment.orderId,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId ?? undefined,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status,
      checkoutUrl: checkoutUrl ?? metadata.checkoutUrl,
      metadata,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}

export const paymentsService = new PaymentsService();
