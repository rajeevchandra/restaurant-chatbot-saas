import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AppError } from '../lib/errors';

/**
 * Rate limiting configuration for different endpoint types
 */

// General API rate limit
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many requests, please try again later', 'RATE_LIMIT_EXCEEDED');
  },
});

// Strict rate limit for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 100 : 5, // More lenient in dev
  message: 'Too many authentication attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many authentication attempts', 'AUTH_RATE_LIMIT_EXCEEDED');
  },
});

// Permissive rate limit for public endpoints (bot/widget)
export const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: 'Too many requests, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Too many requests from this IP', 'PUBLIC_RATE_LIMIT_EXCEEDED');
  },
});

// Webhook rate limit (per webhook secret)
export const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Allow more for high-volume webhooks
  message: 'Webhook rate limit exceeded',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req: Request, res: Response) => {
    throw new AppError(429, 'Webhook rate limit exceeded', 'WEBHOOK_RATE_LIMIT_EXCEEDED');
  },
});
