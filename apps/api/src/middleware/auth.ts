import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { UnauthorizedError, ForbiddenError } from '../lib/errors';
import { UserRole } from '@restaurant-saas/shared';
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
    console.log('AUTH MIDDLEWARE: START', {
      method: req.method,
      path: req.path,
      url: req.originalUrl,
      headers: req.headers
    });
    try {
      // Extract token from Authorization header
      const authHeader = req.headers.authorization;

      if (!authHeader) {
        console.warn('AUTH MIDDLEWARE: missing Authorization header');
        console.log('AUTH MIDDLEWARE: END (missing header)');
        return res.status(401).json({ error: 'Authorization header is required' });
      }

      if (!authHeader.startsWith('Bearer ')) {
        console.warn('AUTH MIDDLEWARE: Authorization header must start with Bearer');
        console.log('AUTH MIDDLEWARE: END (bad header)');
        return res.status(401).json({ error: 'Authorization header must start with "Bearer "' });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      if (!token) {
        console.warn('AUTH MIDDLEWARE: JWT token is required');
        console.log('AUTH MIDDLEWARE: END (missing token)');
        return res.status(401).json({ error: 'JWT token is required' });
      }

      // Verify JWT token
      let decoded: JWTPayload;
      try {
        decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          console.log('AUTH MIDDLEWARE: END (token expired)');
          throw new UnauthorizedError('Token has expired');
        }
        if (error instanceof jwt.JsonWebTokenError) {
          console.log('AUTH MIDDLEWARE: END (invalid token)');
          throw new UnauthorizedError('Invalid token');
        }
        console.log('AUTH MIDDLEWARE: END (other jwt error)');
        throw error;
      }

      // Validate payload structure
      if (!decoded.userId || !decoded.restaurantId || !decoded.role || !decoded.email) {
        console.log('AUTH MIDDLEWARE: END (invalid payload)');
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

      console.log('AUTH MIDDLEWARE: END (success)');
      next();
    } catch (error) {
      // Always send a response for known auth errors
      if (error instanceof UnauthorizedError) {
        console.log('AUTH MIDDLEWARE: END (UnauthorizedError)');
        return res.status(401).json({ error: error.message || 'Unauthorized' });
      }
      if (error instanceof ForbiddenError) {
        return res.status(403).json({ error: error.message || 'Forbidden' });
      }
      // Fallback: log and send 500
      console.error('AUTH MIDDLEWARE: unexpected error', error);
      return res.status(500).json({ error: 'Internal server error (auth)' });
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
