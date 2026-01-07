import type { Request, Response } from 'express';
import { ordersService } from './orders.service';
import { successResponse, createdResponse } from '../../../lib/responses';
import { getRestaurantId } from '../../../middleware/tenant';
import logger from '../../../lib/logger';
import type {
  CreateOrderInput,
  CancelPublicOrderInput,
  ListOrdersQuery,
  UpdateOrderStatusInput,
  CancelAdminOrderInput,
} from './orders.validation';
import { OrderStatus } from '@prisma/client';

export class OrdersController {
  // ========================================
  // Public Endpoints
  // ========================================

  /**
   * POST /api/v1/public/restaurants/:slug/orders
   * Create a new order
   */
  async createPublicOrder(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const data = req.body as CreateOrderInput;
    const idempotencyKey = req.headers['idempotency-key'] as string | undefined;

    logger.info(
      {
        restaurantId,
        itemCount: data.items.length,
        idempotencyKey,
      },
      'Creating order'
    );

    const order = await ordersService.createOrder(restaurantId, data, idempotencyKey);
    createdResponse(res, order);
  }

  /**
   * GET /api/v1/public/restaurants/:slug/orders/:orderId
   * Get order by ID (public)
   */
  async getPublicOrder(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { orderId } = req.params;

    const order = await ordersService.getOrder(restaurantId, orderId);
    successResponse(res, order);
  }

  /**
   * POST /api/v1/public/restaurants/:slug/orders/:orderId/cancel
   * Cancel order (customer)
   */
  async cancelPublicOrder(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { orderId } = req.params;
    const { reason } = req.body as CancelPublicOrderInput;

    logger.info({ restaurantId, orderId, reason }, 'Customer cancelling order');

    const order = await ordersService.cancelOrder(
      restaurantId,
      orderId,
      false, // isStaff = false
      reason
    );
    successResponse(res, order);
  }

  // ========================================
  // Admin Endpoints
  // ========================================

  /**
   * GET /api/v1/admin/orders
   * List orders with filters
   */
  async listOrders(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const query = req.query as ListOrdersQuery;

    // Parse query parameters
    const filters = {
      status: query.status as OrderStatus | undefined,
      q: query.q,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      pageSize: query.pageSize ? parseInt(query.pageSize, 10) : undefined,
    };

    logger.info({ restaurantId, filters }, 'Listing orders');

    const result = await ordersService.listOrders(restaurantId, filters);
    successResponse(res, result);
  }

  /**
   * GET /api/v1/admin/orders/:orderId
   * Get order by ID (admin)
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { orderId } = req.params;

    const order = await ordersService.getOrder(restaurantId, orderId);
    successResponse(res, order);
  }

  /**
   * PUT /api/v1/admin/orders/:orderId/status
   * Update order status
   */
  async updateOrderStatus(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { orderId } = req.params;
    const { status, notes } = req.body as UpdateOrderStatusInput;

    logger.info(
      {
        restaurantId,
        orderId,
        newStatus: status,
      },
      'Updating order status'
    );

    const order = await ordersService.updateOrderStatus(
      restaurantId,
      orderId,
      status,
      notes
    );
    successResponse(res, order);
  }

  /**
   * POST /api/v1/admin/orders/:orderId/cancel
   * Cancel order (staff)
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    const restaurantId = getRestaurantId(req);
    const { orderId } = req.params;
    const { reason } = req.body as CancelAdminOrderInput;

    logger.info({ restaurantId, orderId, reason }, 'Staff cancelling order');

    const order = await ordersService.cancelOrder(
      restaurantId,
      orderId,
      true, // isStaff = true
      reason
    );
    successResponse(res, order);
  }
}

export const ordersController = new OrdersController();
