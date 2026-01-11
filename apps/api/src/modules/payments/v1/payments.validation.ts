import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { PaymentProvider } from '@restaurant-saas/shared';

/**
 * Validation schemas for payment endpoints
 */

// ========================================
// Provider-specific credential schemas
// ========================================

export const stripeCredentialsSchema = z.object({
  secretKey: z.string().min(1).startsWith('sk_'),
  publicKey: z.string().startsWith('pk_').optional(),
  webhookSecret: z.string().startsWith('whsec_').optional(),
});

export const squareCredentialsSchema = z.object({
  accessToken: z.string().min(1),
  locationId: z.string().min(1),
  webhookSecret: z.string().optional(),
});

export const paymentCredentialsSchema = z.union([
  stripeCredentialsSchema,
  squareCredentialsSchema,
]);

// ========================================
// Admin Endpoints
// ========================================

export const updatePaymentConfigSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  credentials: paymentCredentialsSchema,
  isActive: z.boolean().optional().default(true),
  metadata: z.record(z.any()).optional(),
});

export type UpdatePaymentConfigInput = z.infer<typeof updatePaymentConfigSchema>;

export const testConnectionSchema = z.object({
  provider: z.nativeEnum(PaymentProvider),
  credentials: paymentCredentialsSchema,
});

export type TestConnectionInput = z.infer<typeof testConnectionSchema>;

// ========================================
// Public Endpoints
// ========================================

export const createPaymentIntentSchema = z.object({
  body: z.object({
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
  params: z.object({
    slug: z.string().min(1),
    orderId: z.string().uuid(),
  }),
});

export type CreatePaymentIntentInput = z.infer<typeof createPaymentIntentSchema>;

// ========================================
// Webhook Endpoints
// ========================================

export const webhookParamsSchema = z.object({
  provider: z.enum(['stripe', 'square']),
});

export type WebhookParamsInput = z.infer<typeof webhookParamsSchema>;
