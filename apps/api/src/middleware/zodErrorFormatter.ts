import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

/**
 * Formats Zod validation errors into a consistent error response
 * This middleware catches ZodErrors and transforms them before the main error handler
 */
export function zodErrorFormatter(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof ZodError) {
    // Transform Zod errors into our standard format
    const formattedErrors = err.errors.map((error) => ({
      path: error.path.join('.'),
      message: error.message,
      code: error.code,
    }));

    return res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formattedErrors,
        requestId: (req as any).id,
      },
    });
  }

  // Pass to next error handler if not a ZodError
  next(err);
}
