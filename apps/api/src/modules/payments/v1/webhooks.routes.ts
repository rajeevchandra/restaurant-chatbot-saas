import { Router, Request, Response, NextFunction } from 'express';
import { PaymentsController } from './payments.controller';

const router = Router();
const controller = new PaymentsController();

// Middleware to parse raw body and store it for webhook verification
const webhookBodyHandler = (req: Request, res: Response, next: NextFunction) => {
  if (Buffer.isBuffer(req.body)) {
    // Store raw body for signature verification
    (req as any).rawBody = req.body.toString('utf8');
    // Parse to JSON for easier access
    try {
      req.body = JSON.parse((req as any).rawBody);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid JSON in webhook body' });
    }
  }
  next();
};

/**
 * @swagger
 * /api/v1/webhooks/stripe:
 *   post:
 *     summary: Stripe webhook handler
 *     description: Handles Stripe webhook events (payment completion, refunds, etc.). Verifies signature before processing.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook verification failed or processing error
 */
router.post('/stripe', webhookBodyHandler, controller.handleStripeWebhook.bind(controller));

/**
 * @swagger
 * /api/v1/webhooks/square:
 *   post:
 *     summary: Square webhook handler
 *     description: Handles Square webhook events (payment completion, refunds, etc.). Verifies signature before processing.
 *     tags: [Webhooks]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Webhook processed successfully
 *       400:
 *         description: Webhook verification failed or processing error
 */
router.post('/square', webhookBodyHandler, controller.handleSquareWebhook.bind(controller));

export default router;
