import { Order, OrderItem, Prisma } from '@prisma/client';
import { BaseRepository } from '../../lib/BaseRepository';
import { NotFoundError } from '../../lib/errors';

export interface OrderWithRelations extends Order {
  items: OrderItem[];
  payments?: any[];
}

export interface CreateOrderData {
  restaurantId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    menuItemId: string;
    name: string;
    quantity: number;
    price: number;
    options?: any;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
}

export interface OrderFilters {
  status?: string;
  customerEmail?: string;
  startDate?: Date;
  endDate?: Date;
}

/**
 * Orders repository - handles all database operations for orders
 * All queries are scoped by restaurant_id for multi-tenant safety
 */
export class OrderRepository extends BaseRepository<Order> {
  /**
   * Find all orders for a restaurant with optional filters
   */
  async findAll(
    restaurantId: string,
    filters: OrderFilters = {},
    page = 1,
    pageSize = 20
  ): Promise<{ orders: OrderWithRelations[]; total: number }> {
    const where = this.addTenantScope({}, restaurantId);

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerEmail) {
      where.customerEmail = { contains: filters.customerEmail, mode: 'insensitive' };
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = filters.startDate;
      }
      if (filters.endDate) {
        where.createdAt.lte = filters.endDate;
      }
    }

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          items: true,
          payments: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { orders, total };
  }

  /**
   * Find order by ID with tenant validation
   */
  async findById(id: string, restaurantId: string): Promise<OrderWithRelations> {
    const order = await this.prisma.order.findFirst({
      where: this.addTenantScope({ id }, restaurantId),
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return order;
  }

  /**
   * Create new order with items
   */
  async create(data: CreateOrderData): Promise<OrderWithRelations> {
    const order = await this.prisma.order.create({
      data: {
        restaurantId: data.restaurantId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        subtotal: data.subtotal,
        tax: data.tax,
        total: data.total,
        notes: data.notes,
        status: 'CREATED',
        items: {
          create: data.items.map(item => ({
            menuItemId: item.menuItemId,
            menuItemName: item.name || 'Unknown Item',
            quantity: item.quantity,
            unitPrice: item.price,
            totalPrice: item.price * item.quantity,
            options: item.options,
          })),
        },
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order as OrderWithRelations;
  }

  /**
   * Update order status with tenant validation
   */
  async updateStatus(
    id: string,
    restaurantId: string,
    newStatus: string
  ): Promise<OrderWithRelations> {
    // Validate tenant first
    await this.validateTenant(restaurantId, id, 'order');

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: newStatus as any,
        updatedAt: new Date(),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order;
  }

  /**
   * Cancel order with tenant validation
   */
  async cancel(id: string, restaurantId: string, reason?: string): Promise<OrderWithRelations> {
    await this.validateTenant(restaurantId, id, 'order');

    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        notes: reason ? `Cancelled: ${reason}` : undefined,
        updatedAt: new Date(),
      },
      include: {
        items: true,
        payments: true,
      },
    });

    return order;
  }

  /**
   * Get order statistics for a restaurant
   */
  async getStats(restaurantId: string, startDate?: Date, endDate?: Date) {
    const where: any = { restaurantId };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [total, completed, cancelled, revenue] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { total: true },
      }),
    ]);

    return {
      total,
      completed,
      cancelled,
      revenue: revenue._sum.total || 0,
    };
  }
}
