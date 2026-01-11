import { Prisma } from '@prisma/client';
import { UserRole } from '@restaurant-saas/shared';

/**
 * JWT Access Token Payload
 * Short-lived token (15 minutes) for API authentication
 */
export interface AccessTokenPayload {
  userId: string;
  restaurantId: string;
  role: UserRole;
  email: string;
  type: 'access';
}

/**
 * JWT Refresh Token Payload
 * Long-lived token (7 days) stored in httpOnly cookie
 */
export interface RefreshTokenPayload {
  userId: string;
  restaurantId: string;
  type: 'refresh';
  tokenVersion: number; // For token revocation
}

/**
 * Login Request Body
 */
export interface LoginRequest {
  slug: string;      // Restaurant slug
  email: string;
  password: string;
}

/**
 * Login Response
 */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    role: UserRole;
    restaurantId: string;
    restaurantSlug: string;
  };
}

/**
 * Refresh Token Response
 */
export interface RefreshResponse {
  accessToken: string;
}

/**
 * Me Response (Current User)
 */
export interface MeResponse {
  id: string;
  email: string;
  role: UserRole;
  restaurantId: string;
  restaurantSlug: string;
  createdAt: Date;
}
