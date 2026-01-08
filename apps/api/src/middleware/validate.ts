import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to parse just the body first (for simple schemas)
      // If that fails, try the full request object
      try {
        schema.parse(req.body);
      } catch {
        // Fallback to full request validation
        schema.parse({
          body: req.body,
          params: req.params,
          query: req.query,
        });
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      next(error);
    }
  };
};
