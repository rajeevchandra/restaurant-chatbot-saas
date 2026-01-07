import { z } from 'zod';

/**
 * Validation schemas for bot endpoints
 */

export const sendMessageSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
  body: z.object({
    sessionId: z.string().min(1),
    message: z.string().min(1).max(1000),
    channel: z.enum(['WEB', 'SMS', 'WHATSAPP']).optional().default('WEB'),
  }),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;

export const getSessionSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
    sessionId: z.string().min(1),
  }),
});

export type GetSessionInput = z.infer<typeof getSessionSchema>;
