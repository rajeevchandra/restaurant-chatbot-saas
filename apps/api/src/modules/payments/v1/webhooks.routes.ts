import { Router } from 'express';
import { PaymentsController } from './payments.controller';

const router = Router();
const controller = new PaymentsController();

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
router.post('/stripe', controller.handleStripeWebhook.bind(controller));

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
router.post('/square', controller.handleSquareWebhook.bind(controller));

export default router;
