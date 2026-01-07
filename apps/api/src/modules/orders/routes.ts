import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { requireIdempotency, idempotency } from '../../middleware/idempotency';
import { createOrderSchema, updateOrderStatusSchema } from '@restaurant-saas/shared';
import { OrderController } from './order.controller';
import { z } from 'zod';

const router = Router();
const controller = new OrderController();

/**
 * @swagger
 * tags:
 *   name: Orders
 *   description: Order management endpoints (multi-tenant, authenticated)
 */

/**
 * Order routes with clean architecture
 * All routes are authenticated and tenant-scoped
 */

// Validation schemas
const cancelOrderSchema = z.object({
  reason: z.string().optional(),
});

/**
 * @swagger
 * /api/orders/stats:
 *   get:
 *     summary: Get order statistics
 *     description: Returns aggregated statistics for orders within a date range
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Start date for statistics (ISO 8601)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: End date for statistics (ISO 8601)
 *     responses:
 *       200:
 *         description: Order statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                           example: 150
 *                         completed:
 *                           type: number
 *                           example: 120
 *                         cancelled:
 *                           type: number
 *                           example: 10
 *                         revenue:
 *                           type: number
 *                           format: decimal
 *                           example: 4567.89
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// GET /api/orders/stats - must be before /:id route
router.get('/stats', authenticate, (req, res, next) => 
  controller.getOrderStats(req, res).catch(next)
);

/**
 * @swagger
 * /api/orders:
 *   get:
 *     summary: List orders
 *     description: Retrieve paginated list of orders with optional filters (tenant-scoped)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CREATED, PAYMENT_PENDING, PAID, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED]
 *         description: Filter by order status
 *       - in: query
 *         name: customerEmail
 *         schema:
 *           type: string
 *           format: email
 *         description: Filter by customer email
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders created after this date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Filter orders created before this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: number
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: number
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Orders retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/PaginatedResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// GET /api/orders
router.get('/', authenticate, (req, res, next) =>
  controller.listOrders(req, res).catch(next)
);

/**
 * @swagger
 * /api/orders/{id}:
 *   get:
 *     summary: Get order by ID
 *     description: Retrieve a single order by ID (tenant-scoped, validates ownership)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     responses:
 *       200:
 *         description: Order retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// GET /api/orders/:id
router.get('/:id', authenticate, (req, res, next) =>
  controller.getOrder(req, res).catch(next)
);

/**
 * @swagger
 * /api/orders:
 *   post:
 *     summary: Create new order
 *     description: Create a new order (requires idempotency key, validates menu items and prices)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateOrderRequest'
 *           example:
 *             customerName: John Doe
 *             customerEmail: john@example.com
 *             customerPhone: '+1234567890'
 *             deliveryAddress: 123 Main St, City, State 12345
 *             items:
 *               - menuItemId: 550e8400-e29b-41d4-a716-446655440000
 *                 quantity: 2
 *                 price: 12.99
 *                 options: { size: large, extras: [cheese, bacon] }
 *               - menuItemId: 660e8400-e29b-41d4-a716-446655440000
 *                 quantity: 1
 *                 price: 8.99
 *             notes: Extra napkins please
 *     responses:
 *       201:
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// POST /api/orders - requires idempotency key
router.post(
  '/',
  authenticate,
  requireIdempotency as any,
  validate(createOrderSchema),
  (req, res, next) => controller.createOrder(req, res).catch(next)
);

/**
 * @swagger
 * /api/orders/{id}/status:
 *   patch:
 *     summary: Update order status
 *     description: Update order status following state machine rules (requires OWNER/MANAGER/STAFF role, idempotent)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Order ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateOrderStatusRequest'
 *           example:
 *             status: ACCEPTED
 *     responses:
 *       200:
 *         description: Order status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       400:
 *         description: Invalid transition or validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               invalidTransition:
 *                 value:
 *                   error:
 *                     code: INVALID_TRANSITION
 *                     message: Cannot transition from COMPLETED to PREPARING
 *                     details: { from: COMPLETED, to: PREPARING }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// PATCH /api/orders/:id/status
router.patch(
  '/:id/status',
  authenticate,
  authorize('OWNER', 'MANAGER', 'STAFF'),
  validate(updateOrderStatusSchema),
  idempotency,
  (req, res, next) => controller.updateOrderStatus(req, res).catch(next)
);

/**
 * @swagger
 * /api/orders/{id}/cancel:
 *   post:
 *     summary: Cancel order
 *     description: Cancel an order (customers can only cancel CREATED/PAYMENT_PENDING/PAID orders, staff can cancel any non-terminal order)
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/RequestId'
 *       - $ref: '#/components/parameters/IdempotencyKey'
 *       - in: path
 *         name: id
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
 *               reason:
 *                 type: string
 *                 description: Optional cancellation reason
 *           example:
 *             reason: Customer changed their mind
 *     responses:
 *       200:
 *         description: Order cancelled successfully
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/SuccessResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       $ref: '#/components/schemas/Order'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         description: Customer cannot cancel order in current state
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               error:
 *                 code: FORBIDDEN
 *                 message: Customers cannot cancel orders in PREPARING status
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       429:
 *         $ref: '#/components/responses/RateLimitExceeded'
 */
// POST /api/orders/:id/cancel
router.post(
  '/:id/cancel',
  authenticate,
  validate(cancelOrderSchema),
  idempotency,
  (req, res, next) => controller.cancelOrder(req, res).catch(next)
);

export default router;
