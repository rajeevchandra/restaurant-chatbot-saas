import { Router } from 'express';
import { ordersController } from './orders.controller';
import { optionalAuth } from '../../../middleware/auth';
import { resolveRestaurantBySlug, requireTenant } from '../../../middleware/tenant';
import { validate } from '../../../middleware/validate';
import rateLimit from 'express-rate-limit';
import {
  createOrderSchema,
  getPublicOrderSchema,
  cancelPublicOrderSchema,
} from './orders.validation';

const router = Router();

const publicOrderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Max 20 orders per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many orders created. Please try again later.',
});

const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/orders:
 *   post:
 *     summary: Create a new order
 *     description: |
 *       Create a new order with server-authoritative pricing.
 *       Supports idempotency via Idempotency-Key header to prevent duplicate orders.
 *     tags: [Public - Orders]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *         description: Restaurant slug
 *       - in: header
 *         name: Idempotency-Key
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Unique key to prevent duplicate orders (recommended)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               customerName:
 *                 type: string
 *                 maxLength: 200
 *               customerEmail:
 *                 type: string
 *                 format: email
 *               customerPhone:
 *                 type: string
 *                 pattern: ^\+?[1-9]\d{1,14}$
 *               items:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 50
 *                 items:
 *                   type: object
 *                   required:
 *                     - menuItemId
 *                     - quantity
 *                   properties:
 *                     menuItemId:
 *                       type: string
 *                       format: uuid
 *                     quantity:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 100
 *                     selectedOptions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           optionId:
 *                             type: string
 *                             format: uuid
 *                           valueIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: uuid
 *               notes:
 *                 type: string
 *                 maxLength: 1000
 *     responses:
 *       201:
 *         description: Order created successfully
 *       400:
 *         description: Validation error
 *       429:
 *         description: Rate limit exceeded
 */
router.post(
  '/:slug/orders',
  publicOrderLimiter,
  resolveRestaurantBySlug(),
  requireTenant(),
  optionalAuth(),
  validate(createOrderSchema),
  (req, res, next) => ordersController.createPublicOrder(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     tags: [Public - Orders]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Order details
 *       404:
 *         description: Order not found
 */
router.get(
  '/:slug/orders/:orderId',
  publicLimiter,
  resolveRestaurantBySlug(),
  requireTenant(),
  optionalAuth(),
  validate(getPublicOrderSchema),
  (req, res, next) => ordersController.getPublicOrder(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/public/restaurants/{slug}/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel order (customer)
 *     description: Customer can cancel order if status is CREATED, PAYMENT_PENDING, or PAID
 *     tags: [Public - Orders]
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               reason:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Order cancelled
 *       403:
 *         description: Cannot cancel order in current status
 *       404:
 *         description: Order not found
 */
router.post(
  '/:slug/orders/:orderId/cancel',
  publicLimiter,
  resolveRestaurantBySlug(),
  requireTenant(),
  optionalAuth(),
  validate(cancelPublicOrderSchema),
  (req, res, next) => ordersController.cancelPublicOrder(req, res).catch(next)
);

export default router;
