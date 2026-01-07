import { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors';
import { createRequestLogger } from '../lib/logger';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { errorsTotal } from '../lib/metrics';
import { config } from '../config';

/**
 * Central error handler that returns consistent error responses
 * Error schema: { error: { code, message, details?, requestId } }
 * 
 * Handles:
 * - AppError (custom application errors)
 * - ZodError (validation errors)
 * - Prisma errors (database errors)
 * - JWT errors (authentication errors)
 * - Unexpected errors (500)
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const requestId = (req as any).id || 'unknown';
  const logger = createRequestLogger(requestId, (req as any).restaurantId);

  // Don't handle if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  // Handle custom AppError
  if (err instanceof AppError) {
    logger.warn({
      msg: 'Application error',
      error: err.toJSON(),
      path: req.path,
      method: req.method,
    });

    // Record error metric
    errorsTotal.labels('AppError', req.path, err.statusCode.toString()).inc();

    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    logger.warn({
      msg: 'Validation error',
      errors: err.errors,
      path: req.path,
      method: req.method,
    });

    // Record error metric
    errorsTotal.labels('ZodError', req.path, '400').inc();

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.errors.map((e) => ({
          path: e.path.join('.'),
          message: e.message,
        })),
        requestId,
      },
    });
  }

  // Handle Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    logger.error({
      msg: 'Database error',
      code: err.code,
      meta: err.meta,
      path: req.path,
      method: req.method,
    });

    // Unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'A record with this value already exists',
          details: { fields: err.meta?.target },
          requestId,
        },
      });
    }

    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Resource not found',
          requestId,
        },
      });
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: {
          code: 'INVALID_REFERENCE',
          message: 'Referenced resource does not exist',
          requestId,
        },
      });
    }
  }

  // Handle Prisma validation errors
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error({
      msg: 'Prisma validation error',
      error: err.message,
      path: req.path,
      method: req.method,
    });

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid data provided',
        requestId,
      },
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn({
      msg: 'JWT error',
      name: err.name,
      message: err.message,
      path: req.path,
    });

    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid or expired authentication token',
        requestId,
      },
    });
  }

  // Log unexpected errors with full stack trace
  logger.error({
    msg: 'Unexpected error',
    error: {
      name: err.name,
      message: err.message,
      stack: config.nodeEnv !== 'production' ? err.stack : undefined,
    },
    path: req.path,
    method: req.method,
    body: req.body,
  });

  // Record error metric
  errorsTotal.labels('UnexpectedError', req.path, '500').inc();

  // Don't leak error details in production
  const isDevelopment = config.nodeEnv === 'development';
  
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: isDevelopment ? {
        message: err.message,
        stack: err.stack,
      } : undefined,
      requestId,
    },
  });
}
