import { Request, Response, NextFunction } from 'express';
import prisma from '../db/prisma';
import { NotFoundError, ForbiddenError } from '../lib/errors';
import logger from '../lib/logger';

/**
 * Extended request type for tenant middleware
 */
export interface TenantRequest extends Request {
  restaurantId?: string;
  tenant?: {
    restaurantId: string;
  };
}

/**
 * CRITICAL: Attach tenant information to request
 * Used by admin routes - extracts restaurantId from authenticated user
 * 
 * Prerequisites: Must run AFTER requireAuth middleware
 * Sets: req.tenant = { restaurantId }
 */
export function attachTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ForbiddenError('User not authenticated. Call requireAuth() before attachTenant()');
      }

      // Extract restaurantId from authenticated user
      const restaurantId = req.user.restaurantId;

      if (!restaurantId) {
        throw new ForbiddenError('User does not have an associated restaurant');
      }

      // Attach tenant info to request
      req.tenant = {
        restaurantId,
      };

      logger.debug({
        requestId: req.id,
        userId: req.user.userId,
        restaurantId,
      }, 'Tenant attached from user session');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * CRITICAL: Resolve restaurant by slug for public routes
 * Used by public routes - extracts slug from URL parameter and resolves to restaurantId
 * 
 * Prerequisites: Route must have :slug parameter
 * Sets: req.tenant = { restaurantId, restaurantSlug }
 * 
 * Example: /api/v1/public/:slug/menu
 */
export function resolveRestaurantBySlug() {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const slug = req.params.slug;

      if (!slug) {
        throw new NotFoundError('Restaurant slug is required in URL');
      }

      // Query database for restaurant
      const restaurant = await prisma.restaurant.findUnique({
        where: { slug },
        select: {
          id: true,
          slug: true,
          isActive: true,
        },
      });

      if (!restaurant) {
        throw new NotFoundError(`Restaurant with slug "${slug}" not found`);
      }

      if (!restaurant.isActive) {
        throw new ForbiddenError('Restaurant is not active');
      }

      // Attach tenant info to request
      req.tenant = {
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
      };

      logger.debug({
        requestId: req.id,
        restaurantId: restaurant.id,
        restaurantSlug: restaurant.slug,
      }, 'Tenant resolved from slug');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * CRITICAL: Guard middleware that validates tenant is attached
 * Use this in repositories or services to ensure restaurantId is always present
 * 
 * Throws error if req.tenant is not set
 */
export function requireTenant() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenant?.restaurantId) {
      logger.error({
        requestId: req.id,
        path: req.path,
        method: req.method,
      }, 'SECURITY: Request missing tenant information');

      throw new ForbiddenError(
        'Tenant information missing. This is a server configuration error. ' +
        'Ensure attachTenant() or resolveRestaurantBySlug() middleware is applied.'
      );
    }

    next();
  };
}

/**
 * Helper function to extract restaurantId from request
 * Use this in controllers to safely get restaurantId
 * 
 * Throws error if restaurantId is not present (fail-fast)
 */
export function getRestaurantId(req: Request): string {
  const restaurantId = req.tenant?.restaurantId;

  if (!restaurantId) {
    logger.error({
      requestId: req.id,
      path: req.path,
      method: req.method,
      hasTenant: !!req.tenant,
      hasUser: !!req.user,
    }, 'SECURITY: Attempted to access restaurantId without tenant');

    throw new ForbiddenError(
      'Restaurant ID not available. This indicates a configuration error in the route middleware chain.'
    );
  }

  return restaurantId;
}

/**
 * Helper function to get full tenant info from request
 */
export function getTenant(req: Request) {
  if (!req.tenant) {
    throw new ForbiddenError('Tenant information not available');
  }

  return req.tenant;
}

// Legacy export for backwards compatibility
export const resolvePublicTenant = resolveRestaurantBySlug();
