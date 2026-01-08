import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodSchema } from 'zod';

export const validate = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Try to parse just the body first (for simple schemas)
      // If that fails, try the full request object
      let validationError: any = null;
      
      try {
        console.log('Validating body directly:', JSON.stringify(req.body));
        schema.parse(req.body);
        console.log('Body validation successful');
        return next();
      } catch (bodyError) {
        validationError = bodyError;
        console.log('Body validation failed, trying full request');
      }
      
      // Fallback to full request validation
      try {
        schema.parse({
          body: req.body,
          params: req.params,
          query: req.query,
        });
        console.log('Full request validation successful');
        next();
      } catch (fullError) {
        console.log('Full request validation also failed');
        // Throw the original body error as it's more likely correct
        throw validationError;
      }
    } catch (error) {
      next(error);
    }
  };
};
