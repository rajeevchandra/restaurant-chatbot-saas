import { UserRole } from '@prisma/client';

/**
 * Tenant information attached to requests
 */
export interface TenantInfo {
  restaurantId: string;
  restaurantSlug?: string;
}

/**
 * Authenticated user information
 */
export interface AuthUser {
  userId: string;
  restaurantId: string;
  role: UserRole;
  email: string;
}

/**
 * Extended Express Request types for multi-tenant architecture
 */
declare global {
  namespace Express {
    interface Request {
      id: string; // Request ID from requestId middleware
      tenant?: TenantInfo; // Tenant information (restaurantId, slug)
      user?: AuthUser; // Authenticated user information
      
      // Legacy fields (to be migrated)
      userId?: string;
      restaurantId?: string;
      userRole?: UserRole;
    }
  }
}

export {};
