"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleSoldOutSchema = exports.updateInventorySchema = exports.updateUserSchema = exports.createUserSchema = exports.createPaymentIntentSchema = exports.createPaymentConfigSchema = exports.botMessageSchema = exports.updateOrderStatusSchema = exports.createOrderSchema = exports.updateOptionValueSchema = exports.createOptionValueSchema = exports.updateOptionSchema = exports.createOptionSchema = exports.updateMenuItemSchema = exports.createMenuItemSchema = exports.updateCategorySchema = exports.createCategorySchema = exports.registerSchema = exports.loginSchema = void 0;
const zod_1 = require("zod");
const types_1 = require("./types");
// ============ AUTH VALIDATION ============
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6)
});
exports.registerSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(2),
    restaurantName: zod_1.z.string().min(2),
    restaurantSlug: zod_1.z.string().min(2).regex(/^[a-z0-9-]+$/)
});
// ============ MENU VALIDATION ============
exports.createCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    description: zod_1.z.string().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.updateCategorySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    description: zod_1.z.string().optional(),
    isActive: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.createMenuItemSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(200),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0),
    imageUrl: zod_1.z.string().url().optional(),
    isAvailable: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.updateMenuItemSchema = zod_1.z.object({
    categoryId: zod_1.z.string().uuid().optional(),
    name: zod_1.z.string().min(1).max(200).optional(),
    description: zod_1.z.string().optional(),
    price: zod_1.z.number().min(0).optional(),
    imageUrl: zod_1.z.string().url().optional(),
    isAvailable: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.createOptionSchema = zod_1.z.object({
    menuItemId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    isRequired: zod_1.z.boolean().optional(),
    allowMultiple: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.updateOptionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    isRequired: zod_1.z.boolean().optional(),
    allowMultiple: zod_1.z.boolean().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.createOptionValueSchema = zod_1.z.object({
    optionId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(100),
    priceModifier: zod_1.z.number().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
exports.updateOptionValueSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    priceModifier: zod_1.z.number().optional(),
    displayOrder: zod_1.z.number().int().min(0).optional()
});
// ============ ORDER VALIDATION ============
exports.createOrderSchema = zod_1.z.object({
    customerName: zod_1.z.string().optional(),
    customerEmail: zod_1.z.string().email().optional(),
    customerPhone: zod_1.z.string().optional(),
    items: zod_1.z.array(zod_1.z.object({
        menuItemId: zod_1.z.string().uuid(),
        quantity: zod_1.z.number().int().min(1),
        selectedOptions: zod_1.z.record(zod_1.z.array(zod_1.z.string())).optional()
    })).min(1),
    notes: zod_1.z.string().max(500).optional()
});
exports.updateOrderStatusSchema = zod_1.z.object({
    status: zod_1.z.nativeEnum(types_1.OrderStatus)
});
// ============ BOT VALIDATION ============
exports.botMessageSchema = zod_1.z.object({
    sessionId: zod_1.z.string(),
    message: zod_1.z.string().min(1).max(1000)
});
// ============ PAYMENT VALIDATION ============
exports.createPaymentConfigSchema = zod_1.z.object({
    provider: zod_1.z.nativeEnum(types_1.PaymentProvider),
    publicKey: zod_1.z.string().optional(),
    secretKey: zod_1.z.string(),
    webhookSecret: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.createPaymentIntentSchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
    returnUrl: zod_1.z.string().url().optional()
});
// ============ USER VALIDATION ============
exports.createUserSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8),
    name: zod_1.z.string().min(2),
    role: zod_1.z.nativeEnum(types_1.UserRole)
});
exports.updateUserSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    name: zod_1.z.string().min(2).optional(),
    role: zod_1.z.nativeEnum(types_1.UserRole).optional(),
    isActive: zod_1.z.boolean().optional()
});
// ============ INVENTORY VALIDATION ============
exports.updateInventorySchema = zod_1.z.object({
    quantity: zod_1.z.number().int().min(0),
    lowStockThreshold: zod_1.z.number().int().min(0).optional()
});
exports.toggleSoldOutSchema = zod_1.z.object({
    isSoldOut: zod_1.z.boolean()
});
