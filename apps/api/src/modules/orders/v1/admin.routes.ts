import { Router } from 'express';
import { ordersController } from './orders.controller';
import { requireAuth, requireRole } from '../../../middleware/auth';
import { attachTenant, requireTenant } from '../../../middleware/tenant';
import { validate } from '../../../middleware/validate';
import rateLimit from 'express-rate-limit';
import {
  listOrdersSchema,
  updateOrderStatusSchema,
  cancelAdminOrderSchema,
} from './orders.validation';

const router = Router();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * @swagger
 * /api/v1/admin/orders:
 *   get:
 *     summary: List orders with filters
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [CREATED, PAYMENT_PENDING, PAID, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED]
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search by customer name, email, or phone
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders from this date (YYYY-MM-DD)
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter orders until this date (YYYY-MM-DD)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: pageSize
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 50
 *     responses:
 *       200:
 *         description: Paginated list of orders
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  validate(listOrdersSchema),
  (req, res, next) => ordersController.listOrders(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}:
 *   get:
 *     summary: Get order details
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
  '/:orderId',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  (req, res, next) => ordersController.getOrder(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}/status:
 *   put:
 *     summary: Update order status
 *     description: Update order status following the state machine rules
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [CREATED, PAYMENT_PENDING, PAID, ACCEPTED, PREPARING, READY, COMPLETED, CANCELLED]
 *               notes:
 *                 type: string
 *                 maxLength: 500
 *     responses:
 *       200:
 *         description: Order status updated
 *       400:
 *         description: Invalid status transition
 *       404:
 *         description: Order not found
 */
router.put(
  '/:orderId/status',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole('OWNER', 'MANAGER', 'STAFF'),
  validate(updateOrderStatusSchema),
  (req, res, next) => ordersController.updateOrderStatus(req, res).catch(next)
);

/**
 * @swagger
 * /api/v1/admin/orders/{orderId}/cancel:
 *   post:
 *     summary: Cancel order (staff)
 *     description: Staff can cancel order if status is not COMPLETED or CANCELLED
 *     tags: [Admin - Orders]
 *     security:
 *       - BearerAuth: []
 *     parameters:
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
  '/:orderId/cancel',
  apiLimiter,
  requireAuth(),
  attachTenant(),
  requireTenant(),
  requireRole('OWNER', 'MANAGER'),
  validate(cancelAdminOrderSchema),
  (req, res, next) => ordersController.cancelOrder(req, res).catch(next)
);

export default router;
