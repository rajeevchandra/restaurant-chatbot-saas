import type { Request, Response } from 'express';
import { authService } from './auth.service';
import { successResponse, createdResponse } from '../../../lib/responses';
import logger from '../../../lib/logger';
import { config } from '../../../config';
import type { LoginInput } from './auth.validation';

const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';

export class AuthController {
  /**
   * POST /api/v1/auth/login
   * Login with restaurant slug, email, and password
   */
  async login(req: Request, res: Response): Promise<void> {
    const data = req.body as LoginInput;

    const requestLogger = logger.child({
      requestId: req.id,
      slug: data.slug,
      email: data.email,
    });

    requestLogger.info('Login request');

    const result = await authService.login(data);

    // Set httpOnly cookie with refresh token
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, result.refreshToken, {
      httpOnly: true,
      secure: config.cookie.secure, // true in production (HTTPS)
      sameSite: config.cookie.sameSite as 'strict' | 'lax' | 'none',
      maxAge: config.cookie.maxAge, // 7 days
      path: '/',
    });

    requestLogger.info({ userId: result.user.id, role: result.user.role }, 'Login successful');

    // Return access token in response body (client stores in memory)
    // Don't include refreshToken in response - it's httpOnly cookie
    successResponse(res, {
      accessToken: result.accessToken,
      user: result.user,
    });
  }

  /**
   * POST /api/v1/auth/refresh
   * Refresh access token using refresh token from cookie
   */
  async refresh(req: Request, res: Response): Promise<void> {
    const refreshToken = req.cookies[REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      logger.warn({ requestId: req.id }, 'Refresh failed: no refresh token cookie');
      res.status(401).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token not found',
          requestId: req.id,
        },
      });
      return;
    }

    const requestLogger = logger.child({ requestId: req.id });
    requestLogger.debug('Refresh token request');

    const result = await authService.refresh(refreshToken);

    requestLogger.debug('Access token refreshed');

    successResponse(res, result);
  }

  /**
   * POST /api/v1/auth/logout
   * Logout: Clear refresh token cookie and invalidate tokens
   */
  async logout(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      logger.warn({ requestId: req.id }, 'Logout failed: no user in request');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
          requestId: req.id,
        },
      });
      return;
    }

    const requestLogger = logger.child({ requestId: req.id, userId });
    requestLogger.info('Logout request');

    // Increment token version to invalidate all refresh tokens
    await authService.logout(userId);

    // Clear refresh token cookie
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: config.cookie.secure,
      sameSite: config.cookie.sameSite as 'strict' | 'lax' | 'none',
      path: '/',
    });

    requestLogger.info('Logout successful');

    successResponse(res, { message: 'Logged out successfully' });
  }

  /**
   * GET /api/v1/auth/me
   * Get current authenticated user information
   */
  async me(req: Request, res: Response): Promise<void> {
    const userId = req.user?.userId;

    if (!userId) {
      logger.warn({ requestId: req.id }, 'Get me failed: no user in request');
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Not authenticated',
          requestId: req.id,
        },
      });
      return;
    }

    const requestLogger = logger.child({ requestId: req.id, userId });
    requestLogger.debug('Get current user request');

    const user = await authService.me(userId);

    successResponse(res, user);
  }
}

export const authController = new AuthController();
