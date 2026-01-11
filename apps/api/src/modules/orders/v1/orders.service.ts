import { Prisma } from '@prisma/client';
import { OrderStatus } from '@restaurant-saas/shared';
import prisma from '../../../db/prisma';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../lib/errors';
import logger from '../../../lib/logger';
import { paymentsService } from '../../payments/v1/payments.service';
import {
  CreateOrderDTO,
  OrderDTO,
  OrderSummaryDTO,
  PaginatedOrders,
  ListOrdersFilters,
  MenuItemPricing,
  OrderCalculation,
  CalculatedOrderItem,
  OrderValidationResult,
  SelectedOption,
} from './orders.types';
import {
  isValidTransition,
  canCustomerCancel,
  canStaffCancel,
} from './stateMachine';

export class OrdersService {
  /**
   * Create a new order with server-authoritative pricing
   */
  async createOrder(
    restaurantId: string,
    data: CreateOrderDTO,
    idempotencyKey?: string
  ): Promise<OrderDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    // Check for duplicate order using idempotency key
    if (idempotencyKey) {
      const existingOrder = await prisma.order.findFirst({
        where: {
          restaurantId,
          notes: { contains: `IDEMPOTENCY:${idempotencyKey}` },
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Within last 24 hours
        },
        include: { items: true },
      });

      if (existingOrder) {
        logger.info({ orderId: existingOrder.id, idempotencyKey }, 'Returning existing order (idempotency)');
        return this.mapOrderToDTO(existingOrder);
      }
    }

    // Fetch menu items with pricing and options
    const menuItemsWithPricing = await this.fetchMenuItemsPricing(
      restaurantId,
      data.items.map((item) => item.menuItemId)
    );

    // Validate items and options
    const validation = this.validateOrder(data.items, menuItemsWithPricing);
    if (!validation.isValid) {
      throw new ValidationError('Order validation failed', validation.errors);
    }

    // Calculate server-authoritative pricing
    const calculation = this.calculateOrderPricing(data.items, menuItemsWithPricing);

    // Create order with items
    const order = await prisma.order.create({
      data: {
        restaurantId,
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        status: 'CREATED',
        subtotal: calculation.subtotal,
        tax: calculation.tax,
        total: calculation.total,
        notes: idempotencyKey
          ? `${data.notes || ''}\nIDEMPOTENCY:${idempotencyKey}`.trim()
          : data.notes,
        items: {
          create: calculation.items.map((item) => ({
            menuItemId: item.menuItemId,
            menuItemName: item.menuItemName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            selectedOptions: item.selectedOptions
              ? JSON.stringify(item.selectedOptions)
              : null,
          })),
        },
      },
      include: { items: true },
    });

    logger.info(
      {
        orderId: order.id,
        restaurantId,
        total: calculation.total,
        itemCount: calculation.items.length,
      },
      'Order created'
    );

    // Try to create payment intent for the order
    try {
      const paymentIntent = await paymentsService.createPaymentIntent(
        restaurantId,
        order.id,
        {
          orderId: order.id
        }
      );

      logger.info({ orderId: order.id, paymentIntentId: paymentIntent.id }, 'Payment intent created');

      // Update order status to PAYMENT_PENDING
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'PAYMENT_PENDING' },
      });

      // Add checkoutUrl to the order DTO
      const orderDTO = this.mapOrderToDTO(order);
      return {
        ...orderDTO,
        status: 'PAYMENT_PENDING' as OrderStatus,
        checkoutUrl: paymentIntent.checkoutUrl,
      };
    } catch (error: any) {
      logger.error(
        { 
          orderId: order.id, 
          error: error.message,
          stack: error.stack,
          errorName: error.name,
          errorDetails: error
        }, 
        'Payment intent creation failed - order created without payment link'
      );
      
      // If payment config doesn't exist, mark order as needing manual payment
      // and return without checkoutUrl
      return this.mapOrderToDTO(order);
    }
  }

  /**
   * Get order by ID
   */
  async getOrder(restaurantId: string, orderId: string): Promise<OrderDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    return this.mapOrderToDTO(order);
  }

  /**
   * List orders with filters and pagination
   */
  async listOrders(
    restaurantId: string,
    filters: ListOrdersFilters
  ): Promise<PaginatedOrders> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const page = filters.page || 1;
    const pageSize = Math.min(filters.pageSize || 50, 100);
    const skip = (page - 1) * pageSize;

    // Build where clause
    const where = {
      restaurantId,
      ...(filters.status && { status: filters.status }),
      ...(filters.dateFrom && { createdAt: { gte: filters.dateFrom } }),
      ...(filters.dateTo && { createdAt: { lte: filters.dateTo } }),
      ...(filters.q && {
        OR: [
          { customerName: { contains: filters.q, mode: 'insensitive' } },
          { customerEmail: { contains: filters.q, mode: 'insensitive' } },
          { customerPhone: { contains: filters.q } },
        ],
      }),
    };

    // Get total count and orders
    const [total, orders] = await Promise.all([
      prisma.order.count({ where }),
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const items: OrderSummaryDTO[] = (orders as any[]).map((order: any) => ({
      id: order.id,
      customerName: order.customerName || undefined,
      status: order.status,
      total: order.total.toNumber(),
      itemCount: order.items.length,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Update order status (staff only)
   */
  async updateOrderStatus(
    restaurantId: string,
    orderId: string,
    newStatus: OrderStatus,
    notes?: string
  ): Promise<OrderDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if transition is valid
    if (!isValidTransition(order.status, newStatus)) {
      throw new ValidationError(
        `Invalid status transition from ${order.status} to ${newStatus}`
      );
    }

    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        notes: notes || order.notes,
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    logger.info(
      {
        orderId,
        restaurantId,
        from: order.status,
        to: newStatus,
      },
      'Order status updated'
    );

    return this.mapOrderToDTO(updatedOrder);
  }

  /**
   * Cancel order (customer or staff)
   */
  async cancelOrder(
    restaurantId: string,
    orderId: string,
    isStaff: boolean,
    reason?: string
  ): Promise<OrderDTO> {
    if (!restaurantId) {
      throw new ValidationError('Restaurant ID is required');
    }

    const order = await prisma.order.findFirst({
      where: { id: orderId, restaurantId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    // Check if already cancelled or completed
    if (order.status === 'CANCELLED') {
      throw new ValidationError('Order is already cancelled');
    }
    if (order.status === 'COMPLETED') {
      throw new ValidationError('Cannot cancel a completed order');
    }

    // Check cancellation permissions
    const canCancel = isStaff
      ? canStaffCancel(order.status)
      : canCustomerCancel(order.status);

    if (!canCancel) {
      const actor = isStaff ? 'Staff' : 'Customer';
      throw new ForbiddenError(
        `${actor} cannot cancel order in ${order.status} status`
      );
    }

    // Cancel the order
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        notes: reason
          ? `${order.notes || ''}\nCANCELLATION REASON: ${reason}`.trim()
          : order.notes,
        updatedAt: new Date(),
      },
      include: { items: true },
    });

    logger.info(
      {
        orderId,
        restaurantId,
        isStaff,
        reason,
        previousStatus: order.status,
      },
      'Order cancelled'
    );

    return this.mapOrderToDTO(updatedOrder);
  }

  // ========================================
  // Private Helper Methods
  // ========================================

  /**
   * Fetch menu items with pricing and options
   */
  private async fetchMenuItemsPricing(
    restaurantId: string,
    menuItemIds: string[]
  ): Promise<Map<string, MenuItemPricing>> {
    const menuItems = await prisma.menuItem.findMany({
      where: {
        id: { in: menuItemIds },
        restaurantId,
      },
      include: {
        options: {
          include: {
            values: {
              where: { isAvailable: true },
              orderBy: { displayOrder: 'asc' },
            },
          },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    const pricingMap = new Map<string, MenuItemPricing>();

    menuItems.forEach((item: any) => {
      pricingMap.set(item.id, {
        id: item.id,
        name: item.name,
        basePrice: item.price.toNumber(),
        isAvailable: item.isAvailable,
        options: item.options.map((opt: any) => ({
          id: opt.id,
          name: opt.name,
          isRequired: opt.isRequired,
          minSelections: opt.isRequired ? 1 : 0,
          maxSelections: opt.allowMultiple ? 10 : 1,
          values: opt.values.map((val: any) => ({
            id: val.id,
            value: val.value,
            priceModifier: val.priceModifier.toNumber(),
            isAvailable: val.isAvailable,
          })),
        })),
      });
    });

    return pricingMap;
  }

  /**
   * Validate order items and options
   */
  private validateOrder(
    items: CreateOrderDTO['items'],
    menuItemsMap: Map<string, MenuItemPricing>
  ): OrderValidationResult {
    const errors: Array<{ field: string; message: string }> = [];

    items.forEach((item, index) => {
      const menuItem = menuItemsMap.get(item.menuItemId);

      if (!menuItem) {
        errors.push({
          field: `items[${index}].menuItemId`,
          message: `Menu item ${item.menuItemId} not found`,
        });
        return;
      }

      if (!menuItem.isAvailable) {
        errors.push({
          field: `items[${index}].menuItemId`,
          message: `Menu item ${menuItem.name} is not available`,
        });
      }

      // Validate required options
      menuItem.options.forEach((option) => {
        if (option.isRequired) {
          const selectedOption = item.selectedOptions?.find(
            (so) => so.optionId === option.id
          );

          if (!selectedOption) {
            errors.push({
              field: `items[${index}].selectedOptions`,
              message: `Required option "${option.name}" is missing`,
            });
          } else {
            // Validate selection counts
            const selectionCount = selectedOption.valueIds.length;

            if (selectionCount < option.minSelections) {
              errors.push({
                field: `items[${index}].selectedOptions`,
                message: `Option "${option.name}" requires at least ${option.minSelections} selections`,
              });
            }

            if (selectionCount > option.maxSelections) {
              errors.push({
                field: `items[${index}].selectedOptions`,
                message: `Option "${option.name}" allows maximum ${option.maxSelections} selections`,
              });
            }

            // Validate value IDs exist
            const validValueIds = new Set(option.values.map((v) => v.id));
            selectedOption.valueIds.forEach((valueId) => {
              if (!validValueIds.has(valueId)) {
                errors.push({
                  field: `items[${index}].selectedOptions`,
                  message: `Invalid value ID ${valueId} for option "${option.name}"`,
                });
              }
            });
          }
        }
      });
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate server-authoritative pricing
   */
  private calculateOrderPricing(
    items: CreateOrderDTO['items'],
    menuItemsMap: Map<string, MenuItemPricing>
  ): OrderCalculation {
    const calculatedItems: CalculatedOrderItem[] = [];
    let subtotal = 0;

    items.forEach((item) => {
      const menuItem = menuItemsMap.get(item.menuItemId);
      if (!menuItem) return; // Already validated

      let unitPrice = menuItem.basePrice;

      // Add option modifiers
      if (item.selectedOptions) {
        item.selectedOptions.forEach((selectedOption) => {
          const option = menuItem.options.find(
            (o) => o.id === selectedOption.optionId
          );
          if (option) {
            selectedOption.valueIds.forEach((valueId) => {
              const value = option.values.find((v) => v.id === valueId);
              if (value) {
                unitPrice += value.priceModifier;
              }
            });
          }
        });
      }

      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      calculatedItems.push({
        menuItemId: item.menuItemId,
        menuItemName: menuItem.name,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
        selectedOptions: item.selectedOptions,
      });
    });

    // Calculate tax (10% for now - could be configurable per restaurant)
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    return {
      items: calculatedItems,
      subtotal,
      tax,
      total,
    };
  }

  /**
   * Map database order to DTO
   */
  private mapOrderToDTO(order: any): OrderDTO {
    return {
      id: order.id,
      restaurantId: order.restaurantId,
      customerName: order.customerName || undefined,
      customerEmail: order.customerEmail || undefined,
      customerPhone: order.customerPhone || undefined,
      status: order.status,
      subtotal: order.subtotal.toNumber(),
      tax: order.tax.toNumber(),
      total: order.total.toNumber(),
      notes: order.notes || undefined,
      items: order.items.map((item: any) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        menuItemName: item.menuItemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toNumber(),
        totalPrice: item.totalPrice.toNumber(),
        selectedOptions: item.selectedOptions
          ? JSON.parse(item.selectedOptions)
          : undefined,
      })),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}

export const ordersService = new OrdersService();
