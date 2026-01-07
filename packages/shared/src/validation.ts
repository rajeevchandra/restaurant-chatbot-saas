import { z } from 'zod';
import { OrderStatus, PaymentProvider, UserRole } from './types';

// ============ AUTH VALIDATION ============

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  restaurantName: z.string().min(2),
  restaurantSlug: z.string().min(2).regex(/^[a-z0-9-]+$/)
});

// ============ MENU VALIDATION ============

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  price: z.number().min(0),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const updateMenuItemSchema = z.object({
  categoryId: z.string().uuid().optional(),
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  price: z.number().min(0).optional(),
  imageUrl: z.string().url().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const createOptionSchema = z.object({
  menuItemId: z.string().uuid(),
  name: z.string().min(1).max(100),
  isRequired: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const updateOptionSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isRequired: z.boolean().optional(),
  allowMultiple: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const createOptionValueSchema = z.object({
  optionId: z.string().uuid(),
  name: z.string().min(1).max(100),
  priceModifier: z.number().optional(),
  displayOrder: z.number().int().min(0).optional()
});

export const updateOptionValueSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  priceModifier: z.number().optional(),
  displayOrder: z.number().int().min(0).optional()
});

// ============ ORDER VALIDATION ============

export const createOrderSchema = z.object({
  customerName: z.string().optional(),
  customerEmail: z.string().email().optional(),
  customerPhone: z.string().optional(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1),
    selectedOptions: z.record(z.array(z.string())).optional()
  })).min(1),
  notes: z.string().max(500).optional()
});

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus)
});

// ============ BOT VALIDATION ============

export const botMessageSchema = z.object({
  sessionId: z.string(),
  message: z.string().min(1).max(1000)
});

// ============ PAYMENT VALIDATION ============

export const createPaymentConfigSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  publicKey: z.string().optional(),
  secretKey: z.string(),
  webhookSecret: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const createPaymentIntentSchema = z.object({
  orderId: z.string().uuid(),
  returnUrl: z.string().url().optional()
});

// ============ USER VALIDATION ============

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  role: z.nativeEnum(UserRole)
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(2).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional()
});

// ============ INVENTORY VALIDATION ============

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0),
  lowStockThreshold: z.number().int().min(0).optional()
});

export const toggleSoldOutSchema = z.object({
  isSoldOut: z.boolean()
});
