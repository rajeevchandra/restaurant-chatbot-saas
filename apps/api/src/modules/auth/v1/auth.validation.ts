import { z } from 'zod';

/**
 * Login validation schema
 */
export const loginSchema = z.object({
  body: z.object({
    slug: z.string()
      .min(1, 'Restaurant slug is required')
      .regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
    email: z.string()
      .email('Invalid email format')
      .toLowerCase(),
    password: z.string()
      .min(1, 'Password is required'),
  }),
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
