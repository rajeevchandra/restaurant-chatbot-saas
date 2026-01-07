import { z } from 'zod';
import { OrderStatus } from '@prisma/client';

/**
 * Validation Schemas for Orders Module
 */

// ========================================
// Shared Schemas
// ========================================

const selectedOptionSchema = z.object({
  optionId: z.string().uuid('Invalid option ID'),
  valueIds: z.array(z.string().uuid('Invalid value ID')).min(1, 'At least one value must be selected'),
});

const createOrderItemSchema = z.object({
  menuItemId: z.string().uuid('Invalid menu item ID'),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(100, 'Quantity cannot exceed 100'),
  selectedOptions: z.array(selectedOptionSchema).optional(),
});

// ========================================
// Public Endpoints
// ========================================

export const createOrderSchema = z.object({
  params: z.object({
    slug: z.string()
      .min(1, 'Restaurant slug is required')
      .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  }),
  body: z.object({
    customerName: z.string()
      .min(1, 'Customer name is required')
      .max(200, 'Customer name must be less than 200 characters')
      .optional(),
    customerEmail: z.string()
      .email('Invalid email format')
      .optional(),
    customerPhone: z.string()
      .regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format')
      .optional(),
    items: z.array(createOrderItemSchema)
      .min(1, 'At least one item is required')
      .max(50, 'Cannot exceed 50 items per order'),
    notes: z.string()
      .max(1000, 'Notes must be less than 1000 characters')
      .optional(),
  }),
});

export const getPublicOrderSchema = z.object({
  params: z.object({
    slug: z.string()
      .min(1, 'Restaurant slug is required')
      .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    orderId: z.string().uuid('Invalid order ID'),
  }),
});

export const cancelPublicOrderSchema = z.object({
  params: z.object({
    slug: z.string()
      .min(1, 'Restaurant slug is required')
      .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    reason: z.string()
      .max(500, 'Reason must be less than 500 characters')
      .optional(),
  }),
});

// ========================================
// Admin Endpoints
// ========================================

export const listOrdersSchema = z.object({
  query: z.object({
    status: z.enum([
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ]).optional(),
    q: z.string()
      .max(200, 'Search query must be less than 200 characters')
      .optional(),
    dateFrom: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional(),
    dateTo: z.string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
      .optional(),
    page: z.string()
      .regex(/^\d+$/, 'Page must be a positive integer')
      .optional(),
    pageSize: z.string()
      .regex(/^\d+$/, 'Page size must be a positive integer')
      .optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    status: z.enum([
      'CREATED',
      'PAYMENT_PENDING',
      'PAID',
      'ACCEPTED',
      'PREPARING',
      'READY',
      'COMPLETED',
      'CANCELLED',
    ]),
    notes: z.string()
      .max(500, 'Notes must be less than 500 characters')
      .optional(),
  }),
});

export const cancelAdminOrderSchema = z.object({
  params: z.object({
    orderId: z.string().uuid('Invalid order ID'),
  }),
  body: z.object({
    reason: z.string()
      .max(500, 'Reason must be less than 500 characters')
      .optional(),
  }),
});

// ========================================
// Type Exports
// ========================================

export type CreateOrderInput = z.infer<typeof createOrderSchema>['body'];
export type GetPublicOrderParams = z.infer<typeof getPublicOrderSchema>['params'];
export type CancelPublicOrderInput = z.infer<typeof cancelPublicOrderSchema>['body'];
export type CancelPublicOrderParams = z.infer<typeof cancelPublicOrderSchema>['params'];
export type ListOrdersQuery = z.infer<typeof listOrdersSchema>['query'];
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>['body'];
export type UpdateOrderStatusParams = z.infer<typeof updateOrderStatusSchema>['params'];
export type CancelAdminOrderInput = z.infer<typeof cancelAdminOrderSchema>['body'];
export type CancelAdminOrderParams = z.infer<typeof cancelAdminOrderSchema>['params'];
