import { OrderRepository, CreateOrderData, OrderFilters, OrderWithRelations } from './order.repository';
import { isValidTransition, canCustomerCancel } from './stateMachine';
import { InvalidTransitionError, ValidationError, ForbiddenError } from '../../lib/errors';
import { createRequestLogger } from '../../lib/logger';
import prisma from '../../db/prisma';

/**
 * Orders service - contains business logic for order operations
 * Enforces order state machine and business rules
 */
export class OrderService {
  private repository: OrderRepository;

  constructor() {
    this.repository = new OrderRepository();
  }

  /**
   * List orders with filters and pagination
   */
  async listOrders(
    restaurantId: string,
    filters: OrderFilters = {},
    page = 1,
    pageSize = 20
  ) {
    return this.repository.findAll(restaurantId, filters, page, pageSize);
  }

  /**
   * Get order by ID
   */
  async getOrder(id: string, restaurantId: string): Promise<OrderWithRelations> {
    return this.repository.findById(id, restaurantId);
  }

  /**
   * Create new order with validation
   */
  async createOrder(
    data: Omit<CreateOrderData, 'subtotal' | 'tax' | 'total'>,
    requestId: string
  ): Promise<OrderWithRelations> {
    const logger = createRequestLogger(requestId, data.restaurantId);

    // Validate menu items exist and belong to restaurant
    const menuItemIds = data.items.map((item) => item.menuItemId);
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId: data.restaurantId,
        isAvailable: true,
      },
    });

    if (menuItems.length !== menuItemIds.length) {
      throw new ValidationError('Some menu items are not available or do not exist');
    }

    // Validate prices match
    for (const orderItem of data.items) {
      const menuItem = menuItems.find((mi) => mi.id === orderItem.menuItemId);
      if (!menuItem) {
        throw new ValidationError(`Menu item ${orderItem.menuItemId} not found`);
      }

      // Price validation (allow small variance for options)
      const menuPrice = Number(menuItem.price);
      if (Math.abs(orderItem.price - menuPrice) > menuPrice * 0.5) {
        throw new ValidationError(
          `Price mismatch for item ${menuItem.name}. Expected around ${menuPrice}, got ${orderItem.price}`
        );
      }
    }

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.08; // 8% tax - should come from restaurant settings
    const total = subtotal + tax;

    // Enrich items with menu item names
    const enrichedItems = data.items.map(item => {
      const menuItem = menuItems.find(mi => mi.id === item.menuItemId);
      return {
        ...item,
        name: menuItem?.name || 'Unknown Item',
      };
    });

    const orderData: CreateOrderData = {
      ...data,
      items: enrichedItems,
      subtotal,
      tax,
      total,
    };

    const order = await this.repository.create(orderData);

    logger.info({
      msg: 'Order created',
      orderId: order.id,
      total: order.total,
      itemCount: order.items.length,
    });

    return order;
  }

  /**
   * Update order status with state machine validation
   */
  async updateOrderStatus(
    id: string,
    restaurantId: string,
    newStatus: string,
    requestId: string
  ): Promise<OrderWithRelations> {
    const logger = createRequestLogger(requestId, restaurantId);

    // Get current order
    const order = await this.repository.findById(id, restaurantId);

    // Validate transition
    if (!isValidTransition(order.status as any, newStatus as any)) {
      logger.warn({
        msg: 'Invalid order status transition attempted',
        orderId: id,
        from: order.status,
        to: newStatus,
      });

      throw new InvalidTransitionError(order.status, newStatus);
    }

    const updatedOrder = await this.repository.updateStatus(id, restaurantId, newStatus);

    logger.info({
      msg: 'Order status updated',
      orderId: id,
      from: order.status,
      to: newStatus,
    });

    return updatedOrder;
  }

  /**
   * Cancel order with validation
   */
  async cancelOrder(
    id: string,
    restaurantId: string,
    reason: string | undefined,
    isCustomer: boolean,
    requestId: string
  ): Promise<OrderWithRelations> {
    const logger = createRequestLogger(requestId, restaurantId);

    const order = await this.repository.findById(id, restaurantId);

    // Check if customer can cancel
    if (isCustomer && !canCustomerCancel(order.status as any)) {
      logger.warn({
        msg: 'Customer attempted to cancel order in non-cancellable state',
        orderId: id,
        status: order.status,
      });

      throw new ForbiddenError(
        `Orders in ${order.status} status cannot be cancelled by customer. Please contact the restaurant.`
      );
    }

    const cancelledOrder = await this.repository.cancel(id, restaurantId, reason);

    logger.info({
      msg: 'Order cancelled',
      orderId: id,
      reason,
      byCustomer: isCustomer,
    });

    return cancelledOrder;
  }

  /**
   * Get order statistics
   */
  async getOrderStats(restaurantId: string, startDate?: Date, endDate?: Date) {
    return this.repository.getStats(restaurantId, startDate, endDate);
  }
}
