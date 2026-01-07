import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { UserRole } from '@prisma/client';
import logger from '../lib/logger';

/**
 * JWT token payload structure
 */
interface JWTPayload {
  userId: string;
  restaurantId: string;
  role: UserRole;
  email: string;
}

/**
 * Request object with authenticated user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string;
    restaurantId: string;
    role: UserRole;
    email: string;
  };
}

/**
 * CRITICAL: Require authentication for protected routes
 * Extracts and verifies JWT token from Authorization header
 * 
 * Sets: req.user = { userId, restaurantId, role, email }
 * 
 * Usage: Apply to all admin routes and authenticated endpoints
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        throw new UnauthorizedError('Authorization header is required');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedError('Authorization header must start with "Bearer "');
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        throw new UnauthorizedError('JWT token is required');
      }

      // Verify JWT token
      let decoded: JWTPayload;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          throw new UnauthorizedError('Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
          throw new UnauthorizedError('Invalid token');
        }
        throw error;
      }

      // Validate payload structure
      if (!decoded.userId || !decoded.restaurantId || !decoded.role || !decoded.email) {
        throw new UnauthorizedError('Invalid token payload');
      }

      // Attach user to request
      req.user = {
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
        role: decoded.role,
        email: decoded.email,
      };

      // Legacy support (to be removed)
      req.userId = decoded.userId;
      req.restaurantId = decoded.restaurantId;
      req.userRole = decoded.role;

      logger.debug({
        requestId: req.id,
        userId: decoded.userId,
        restaurantId: decoded.restaurantId,
        role: decoded.role,
      }, 'User authenticated');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * CRITICAL: Role-Based Access Control (RBAC)
 * Restricts access based on user roles
 * 
 * Prerequisites: Must run AFTER requireAuth middleware
 * 
 * @param allowedRoles - Array of roles that can access the route
 * 
 * Usage:
 *   requireRole('OWNER', 'MANAGER') - Only owners and managers
 *   requireRole('OWNER') - Only owners
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Ensure user is authenticated
      if (!req.user) {
        throw new ForbiddenError('User not authenticated. Call requireAuth() before requireRole()');
      }

      const userRole = req.user.role;

      // Check if user's role is in allowed roles
      if (!allowedRoles.includes(userRole)) {
        logger.warn({
          requestId: req.id,
          userId: req.user.userId,
          userRole,
          allowedRoles,
          path: req.path,
        }, 'Access denied: insufficient permissions');

        throw new ForbiddenError(
          `Access denied. Required roles: ${allowedRoles.join(', ')}. Your role: ${userRole}`
        );
      }

      logger.debug({
        requestId: req.id,
        userId: req.user.userId,
        userRole,
        allowedRoles,
      }, 'Role authorization successful');

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Optional authentication - attaches user if token is present, but doesn't require it
 * Useful for public routes that have different behavior for authenticated users
 */
export function optionalAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;

      // If no auth header, continue without user
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return next();
      }

      const token = authHeader.substring(7);

      if (!token) {
        return next();
      }

      // Try to verify token, but don't fail if invalid
      try {
        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

        if (decoded.userId && decoded.restaurantId && decoded.role && decoded.email) {
          req.user = {
            userId: decoded.userId,
            restaurantId: decoded.restaurantId,
            role: decoded.role,
            email: decoded.email,
          };

          // Legacy support
          req.userId = decoded.userId;
          req.restaurantId = decoded.restaurantId;
          req.userRole = decoded.role;

          logger.debug({
            requestId: req.id,
            userId: decoded.userId,
          }, 'Optional auth: user authenticated');
        }
      } catch (error) {
        // Silently fail - this is optional auth
        logger.debug({
          requestId: req.id,
          error: error instanceof Error ? error.message : 'Unknown error',
        }, 'Optional auth: token invalid, continuing without user');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

// Legacy exports for backwards compatibility
export const authenticate = requireAuth;
export const authorize = requireRole;
