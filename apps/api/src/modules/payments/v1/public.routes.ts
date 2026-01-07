import { Router } from 'express';
import { PaymentsController } from './payments.controller';
import { resolveRestaurantBySlug, requireTenant } from '../../../middleware/tenant';
import { optionalAuth } from '../../../middleware/auth';
import { validate } from '../../../middleware/validate';
import { createPaymentIntentSchema } from './payments.validation';
import { publicLimiter } from '../../../middleware/rateLimiter';

const router = Router();
const controller = new PaymentsController();

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/orders/{orderId}/pay:
 *   post:
 *     summary: Create payment intent for order
 *     description: Initiates checkout session with payment provider. Returns checkoutUrl where customer should be redirected.
 *     tags: [Public - Payments]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant slug
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               successUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect after successful payment
 *               cancelUrl:
 *                 type: string
 *                 format: uri
 *                 description: URL to redirect if payment cancelled
 *     responses:
 *       201:
 *         description: Payment intent created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 orderId:
 *                   type: string
 *                 provider:
 *                   type: string
 *                   enum: [STRIPE, SQUARE]
 *                 amount:
 *                   type: number
 *                 currency:
 *                   type: string
 *                 status:
 *                   type: string
 *                 checkoutUrl:
 *                   type: string
 *                   format: uri
 *                   description: URL to redirect customer for payment
 *       400:
 *         description: Invalid request or order not payable
 *       404:
 *         description: Order not found
 */
router.post(
  '/:slug/orders/:orderId/pay',
  publicLimiter,
  resolveRestaurantBySlug,
  requireTenant,
  optionalAuth,
  validate(createPaymentIntentSchema),
  controller.createPaymentIntent.bind(controller)
);

export default router;
