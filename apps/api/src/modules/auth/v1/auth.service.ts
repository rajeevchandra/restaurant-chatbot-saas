import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../../db/prisma';
import { UnauthorizedError, NotFoundError } from '../../../lib/errors';
import { config } from '../../../config';
import logger from '../../../lib/logger';
import type {
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  MeResponse,
  AccessTokenPayload,
  RefreshTokenPayload,
} from './auth.types';

const BCRYPT_ROUNDS = 12;

export class AuthService {
  /**
   * Login with restaurant slug, email, and password
   * Returns access token + sets refresh token cookie
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const { slug, email, password } = data;

    logger.debug({ slug, email }, 'Login attempt');

    // 1. Find restaurant by slug
    const restaurant = await prisma.restaurant.findUnique({
      where: { slug },
      select: { id: true, slug: true, isActive: true },
    });

    if (!restaurant) {
      logger.warn({ slug }, 'Login failed: restaurant not found');
      throw new NotFoundError('Restaurant not found');
    }

    if (!restaurant.isActive) {
      logger.warn({ slug, restaurantId: restaurant.id }, 'Login failed: restaurant inactive');
      throw new UnauthorizedError('Restaurant is not active');
    }

    // 2. Find user by email and restaurantId
    const user = await prisma.restaurantUser.findFirst({
      where: {
        email,
        restaurantId: restaurant.id,
      },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        role: true,
        restaurantId: true,
        tokenVersion: true,
      },
    });

    if (!user) {
      logger.warn({ email, restaurantId: restaurant.id }, 'Login failed: user not found');
      throw new UnauthorizedError('Invalid credentials');
    }

    // 3. Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      logger.warn({ userId: user.id, email }, 'Login failed: invalid password');
      throw new UnauthorizedError('Invalid credentials');
    }

    // 4. Generate tokens
    const accessToken = this.generateAccessToken({
      userId: user.id,
      restaurantId: user.restaurantId,
      role: user.role,
      email: user.email,
      type: 'access',
    });

    const refreshToken = this.generateRefreshToken({
      userId: user.id,
      restaurantId: user.restaurantId,
      type: 'refresh',
      tokenVersion: user.tokenVersion || 0,
    });

    logger.info({ userId: user.id, restaurantId: user.restaurantId, role: user.role }, 'Login successful');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        restaurantId: user.restaurantId,
        restaurantSlug: restaurant.slug,
      },
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refresh(refreshToken: string): Promise<RefreshResponse> {
    try {
      // Verify refresh token
      const payload = jwt.verify(
        refreshToken,
        config.jwt.refreshSecret
      ) as RefreshTokenPayload;

      if (payload.type !== 'refresh') {
        throw new UnauthorizedError('Invalid token type');
      }

      // Get user from database
      const user = await prisma.restaurantUser.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          restaurantId: true,
          tokenVersion: true,
        },
      });

      if (!user) {
        logger.warn({ userId: payload.userId }, 'Refresh failed: user not found');
        throw new UnauthorizedError('User not found');
      }

      // Check token version (for logout/revocation)
      if (payload.tokenVersion !== (user.tokenVersion || 0)) {
        logger.warn({ userId: user.id, tokenVersion: payload.tokenVersion }, 'Refresh failed: token revoked');
        throw new UnauthorizedError('Token has been revoked');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken({
        userId: user.id,
        restaurantId: user.restaurantId,
        role: user.role,
        email: user.email,
        type: 'access',
      });

      logger.debug({ userId: user.id }, 'Access token refreshed');

      return { accessToken };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        logger.warn('Refresh failed: token expired');
        throw new UnauthorizedError('Refresh token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        logger.warn('Refresh failed: invalid token');
        throw new UnauthorizedError('Invalid refresh token');
      }
      throw error;
    }
  }

  /**
   * Logout: Increment token version to invalidate all existing refresh tokens
   */
  async logout(userId: string): Promise<void> {
    await prisma.restaurantUser.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    logger.info({ userId }, 'User logged out - tokens invalidated');
  }

  /**
   * Get current user information
   */
  async me(userId: string): Promise<MeResponse> {
    const user = await prisma.restaurantUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        restaurantId: true,
        createdAt: true,
        restaurant: {
          select: {
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      restaurantId: user.restaurantId,
      restaurantSlug: user.restaurant.slug,
      createdAt: user.createdAt,
    };
  }

  /**
   * Hash password using bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Generate JWT access token (short-lived)
   */
  private generateAccessToken(payload: AccessTokenPayload): string {
    return jwt.sign(payload, config.jwt.secret as string, {
      expiresIn: config.jwt.accessTokenExpiry as string,
    } as jwt.SignOptions);
  }

  /**
   * Generate JWT refresh token (long-lived)
   */
  generateRefreshToken(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, config.jwt.refreshSecret as string, {
      expiresIn: config.jwt.refreshTokenExpiry as string,
    } as jwt.SignOptions);
  }
}

export const authService = new AuthService();
