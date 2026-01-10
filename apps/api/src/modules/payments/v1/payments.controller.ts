import { Request, Response, NextFunction } from 'express';
import { PaymentsService } from './payments.service';
import { successResponse, createdResponse } from '../../../lib/responses';
import { getRestaurantId } from '../../../middleware/tenant';
import logger from '../../../lib/logger';
import {
  UpdatePaymentConfigInput,
  TestConnectionInput,
  CreatePaymentIntentInput,
} from './payments.validation';
import { PaymentProvider } from '@prisma/client';

const paymentsService = new PaymentsService();

export class PaymentsController {
  // ========================================
  // Admin Endpoints
  // ========================================

  async updatePaymentConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = getRestaurantId(req);
      const data: UpdatePaymentConfigInput = req.body;

      const config = await paymentsService.updatePaymentConfig(restaurantId, data);

      logger.info({
        msg: 'Payment config updated via API',
        restaurantId,
        provider: data.provider,
      });

      successResponse(res, config);
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }

  async getPaymentConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = getRestaurantId(req);
      const config = await paymentsService.getPaymentConfig(restaurantId);
      if (!config) {
        res.status(404).json({ error: 'Payment config not found' });
        return;
      }
      successResponse(res, config);
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }

  async testConnection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = getRestaurantId(req);
      const data: TestConnectionInput = req.body;

      const result = await paymentsService.testConnection(restaurantId, data);

      logger.info({
        msg: 'Payment connection tested',
        restaurantId,
        provider: data.provider,
        success: result.success,
      });

      successResponse(res, result);
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }

  // ========================================
  // Public Endpoints
  // ========================================

  async createPaymentIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const restaurantId = getRestaurantId(req);
      const { orderId } = req.params;
      const data: CreatePaymentIntentInput['body'] = req.body;

      const payment = await paymentsService.createPaymentIntent(restaurantId, orderId, {
        orderId,
        successUrl: data.successUrl,
        cancelUrl: data.cancelUrl,
      });

      logger.info({
        msg: 'Payment intent created via API',
        restaurantId,
        orderId,
        paymentId: payment.id,
      });

      createdResponse(res, payment);
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }

  // ========================================
  // Webhook Endpoints
  // ========================================

  async handleStripeWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.processWebhook(PaymentProvider.STRIPE, req);

      if (!result.success) {
        logger.warn({
          msg: 'Stripe webhook processing failed',
          error: result.error,
        });
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ received: true, eventId: result.eventId });
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }

  async handleSquareWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await paymentsService.processWebhook(PaymentProvider.SQUARE, req);

      if (!result.success) {
        logger.warn({
          msg: 'Square webhook processing failed',
          error: result.error,
        });
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({ received: true, eventId: result.eventId });
    } catch (error) {
        if (!res.headersSent) {
          next(error);
        }
    }
  }
}
