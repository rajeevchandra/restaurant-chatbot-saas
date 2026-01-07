import { Response } from 'express';
import { AuthRequest } from '../../middleware/auth';
import { OrderService } from './order.service';
import { successResponse, paginatedResponse, createdResponse } from '../../lib/responses';
import { createRequestLogger } from '../../lib/logger';

/**
 * Orders controller - handles HTTP requests and responses
 * Thin layer that delegates to service
 */
export class OrderController {
  private service: OrderService;

  constructor() {
    this.service = new OrderService();
  }

  /**
   * GET /api/orders
   * List all orders with filters
   */
  async listOrders(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    
    const {
      status,
      customerEmail,
      startDate,
      endDate,
      page = '1',
      pageSize = '20',
    } = req.query;

    const filters = {
      status: status as string | undefined,
      customerEmail: customerEmail as string | undefined,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
    };

    const pageNum = parseInt(page as string);
    const pageSizeNum = parseInt(pageSize as string);

    logger.info({ msg: 'Listing orders', filters, page: pageNum, pageSize: pageSizeNum });

    const { orders, total } = await this.service.listOrders(
      req.restaurantId!,
      filters,
      pageNum,
      pageSizeNum
    );

    return paginatedResponse(res, orders, {
      page: pageNum,
      pageSize: pageSizeNum,
      total,
    });
  }

  /**
   * GET /api/orders/:id
   * Get single order
   */
  async getOrder(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    const { id } = req.params;

    logger.info({ msg: 'Getting order', orderId: id });

    const order = await this.service.getOrder(id, req.restaurantId!);

    return successResponse(res, order);
  }

  /**
   * POST /api/orders
   * Create new order
   */
  async createOrder(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    
    const { customerName, customerEmail, customerPhone, items, notes } = req.body;

    logger.info({
      msg: 'Creating order',
      customerName,
      itemCount: items?.length,
    });

    const order = await this.service.createOrder(
      {
        restaurantId: req.restaurantId!,
        customerName,
        customerEmail,
        customerPhone,
        items,
        notes,
      },
      String(req.id)
    );

    return createdResponse(res, order);
  }

  /**
   * PATCH /api/orders/:id/status
   * Update order status
   */
  async updateOrderStatus(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    const { id } = req.params;
    const { status } = req.body;

    logger.info({ msg: 'Updating order status', orderId: id, newStatus: status });

    const order = await this.service.updateOrderStatus(
      id,
      req.restaurantId!,
      status,
      String(req.id)
    );

    return successResponse(res, order);
  }

  /**
   * POST /api/orders/:id/cancel
   * Cancel order
   */
  async cancelOrder(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    const { id } = req.params;
    const { reason } = req.body;

    logger.info({ msg: 'Cancelling order', orderId: id, reason });

    const order = await this.service.cancelOrder(
      id,
      req.restaurantId!,
      reason,
      false, // Restaurant staff cancelling
      String(req.id)
    );

    return successResponse(res, order);
  }

  /**
   * GET /api/orders/stats
   * Get order statistics
   */
  async getOrderStats(req: AuthRequest, res: Response) {
    const logger = createRequestLogger(String(req.id), req.restaurantId);
    const { startDate, endDate } = req.query;

    logger.info({ msg: 'Getting order stats', startDate, endDate });

    const stats = await this.service.getOrderStats(
      req.restaurantId!,
      startDate ? new Date(startDate as string) : undefined,
      endDate ? new Date(endDate as string) : undefined
    );

    return successResponse(res, stats);
  }
}
