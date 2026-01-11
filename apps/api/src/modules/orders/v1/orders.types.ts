export { OrderDTO, OrderItemDTO, SelectedOption, OrderSummaryDTO, PaginatedOrders, OrderWithItems } from '@restaurant-saas/shared';
import { Prisma } from '@prisma/client';
import { OrderStatus, Order, OrderItem, OrderDTO, OrderItemDTO, SelectedOption, OrderSummaryDTO, PaginatedOrders, OrderWithItems } from '@restaurant-saas/shared';

/**
 * Order DTOs and Types
 */

// ========================================
// Request DTOs
// ========================================

export interface CreateOrderItemDTO {
  menuItemId: string;
  quantity: number;
  selectedOptions?: SelectedOption[];
}


export interface CreateOrderDTO {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items: CreateOrderItemDTO[];
  notes?: string;
  idempotencyKey?: string; // For duplicate prevention
}

export interface UpdateOrderStatusDTO {
  status: OrderStatus;
  notes?: string;
}

export interface CancelOrderDTO {
  reason?: string;
}

export interface ListOrdersFilters {
  status?: OrderStatus;
  q?: string; // Search by customer name/email/phone
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

// Response DTOs and DB types now imported from shared

// ========================================
// Pricing Calculation Types
// ========================================

export interface MenuItemPricing {
  id: string;
  name: string;
  basePrice: number;
  isAvailable: boolean;
  options: MenuItemOptionPricing[];
}

export interface MenuItemOptionPricing {
  id: string;
  name: string;
  isRequired: boolean;
  minSelections: number;
  maxSelections: number;
  values: OptionValuePricing[];
}

export interface OptionValuePricing {
  id: string;
  value: string;
  priceModifier: number;
  isAvailable: boolean;
}

export interface CalculatedOrderItem {
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: SelectedOption[];
}

export interface OrderCalculation {
  items: CalculatedOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

// ========================================
// Validation Error Types
// ========================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface OrderValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}
