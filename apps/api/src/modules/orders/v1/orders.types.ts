import { OrderStatus, Order, OrderItem, Prisma } from '@prisma/client';

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

export interface SelectedOption {
  optionId: string;
  valueIds: string[]; // Array of selected value IDs
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

// ========================================
// Response DTOs
// ========================================

export interface OrderItemDTO {
  id: string;
  menuItemId: string;
  menuItemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  selectedOptions?: SelectedOption[];
}

export interface OrderDTO {
  id: string;
  restaurantId: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: OrderItemDTO[];
  checkoutUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderSummaryDTO {
  id: string;
  customerName?: string;
  status: OrderStatus;
  total: number;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedOrders {
  items: OrderSummaryDTO[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ========================================
// Database Types with Relations
// ========================================

export type OrderWithItems = Order & {
  items: OrderItem[];
};

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
