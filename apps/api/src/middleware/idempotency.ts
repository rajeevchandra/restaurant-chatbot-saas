import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import prisma from '../db/prisma';
import { createRequestLogger } from '../lib/logger';

interface AuthRequest extends Request {
  id: string;
  restaurantId?: string;
  userId?: string;
}

interface IdempotencyRecord {
  key: string;
  restaurantId: string;
  statusCode: number;
  response: any;
  createdAt: Date;
}

/**
 * In-memory store for idempotency keys (use Redis in production)
 * Maps idempotency key to response
 */
const idempotencyStore = new Map<string, IdempotencyRecord>();

// Clean up old entries every hour
setInterval(() => {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  for (const [key, record] of idempotencyStore.entries()) {
    if (record.createdAt < oneHourAgo) {
      idempotencyStore.delete(key);
    }
  }
}, 60 * 60 * 1000);

/**
 * Idempotency middleware for POST/PUT/PATCH requests
 * Prevents duplicate operations by caching responses based on idempotency key
 * 
 * Client should send X-Idempotency-Key header with unique value (UUID recommended)
 * Same key returns cached response within 24 hours
 */
export function idempotency(req: Request, res: Response, next: NextFunction) {
  // Only apply to mutating methods
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    return next();
  }

  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  
  // Idempotency key is optional but recommended
  if (!idempotencyKey) {
    return next();
  }

  const logger = createRequestLogger((req as any).id, (req as any).restaurantId);

  // Validate key format (should be UUID or similar)
  if (!/^[a-zA-Z0-9\-_]{8,128}$/.test(idempotencyKey)) {
    throw new AppError(
      400,
      'Invalid idempotency key format. Use UUID or alphanumeric string (8-128 chars)',
      'INVALID_IDEMPOTENCY_KEY'
    );
  }

  // Create composite key with restaurant ID for multi-tenancy
  const compositeKey = `${(req as any).restaurantId}:${idempotencyKey}`;

  // Check if we've seen this key before
  const cached = idempotencyStore.get(compositeKey);
  
  if (cached) {
    logger.info({
      msg: 'Returning cached response for idempotent request',
      idempotencyKey,
      restaurantId: (req as any).restaurantId,
    });

    // Return cached response
    return res.status(cached.statusCode).json(cached.response);
  }

  // Capture response to cache it
  const originalJson = res.json.bind(res);
  const originalStatus = res.status.bind(res);
  
  let statusCode = 200;
  
  res.status = function (code: number) {
    statusCode = code;
    return originalStatus(code);
  };

  res.json = function (body: any) {
    // Only cache successful responses (2xx)
    if (statusCode >= 200 && statusCode < 300) {
      idempotencyStore.set(compositeKey, {
        key: idempotencyKey,
        restaurantId: req.restaurantId!,
        statusCode,
        response: body,
        createdAt: new Date(),
      });

      logger.info({
        msg: 'Cached response for idempotent request',
        idempotencyKey,
        restaurantId: (req as any).restaurantId,
        statusCode,
      });
    }

    return originalJson(body);
  };

  next();
}

/**
 * Required idempotency middleware - throws error if key is missing
 * Use for critical operations like order creation and payments
 */
export function requireIdempotency(req: AuthRequest, res: Response, next: NextFunction) {
  const idempotencyKey = req.headers['x-idempotency-key'] as string;
  
  if (!idempotencyKey) {
    throw new AppError(
      400,
      'Idempotency key is required for this operation. Include X-Idempotency-Key header',
      'IDEMPOTENCY_KEY_REQUIRED'
    );
  }

  // Continue to regular idempotency middleware
  idempotency(req, res, next);
}
