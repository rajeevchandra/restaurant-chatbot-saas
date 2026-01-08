import express, { Request, Response, Router } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import 'express-async-errors';
import { config } from './config';
import { swaggerSpec } from './config/swagger';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import { httpLogger } from './middleware/pinoHttp';
import { zodErrorFormatter } from './middleware/zodErrorFormatter';
import { apiLimiter, authLimiter, publicLimiter, webhookLimiter } from './middleware/rateLimiter';
import { metricsMiddleware } from './middleware/metrics';
import { requestTiming } from './middleware/timing';
import logger from './lib/logger';

// Import routes
import authRoutes from './modules/auth/routes';
import restaurantRoutes from './modules/restaurants/routes';
import menuRoutes from './modules/menu/routes';
import inventoryRoutes from './modules/inventory/routes';
import orderRoutes from './modules/orders/routes';
import paymentRoutes from './modules/payments/routes';
import webhookRoutes from './modules/webhooks/routes';
import botRoutesLegacy from './modules/bot/routes';
import metricsRoutes from './routes/metrics';

const app = express();

// ========================================
// SECURITY & BASIC MIDDLEWARE
// ========================================

// Security headers with helmet
app.use(helmet());

// Request ID tracking (must be before logging)
app.use(requestId);

// Request timing middleware
app.use(requestTiming);

// Metrics collection middleware
app.use(metricsMiddleware);

// Structured request/response logging with Pino
app.use(httpLogger);

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: config.cors.credentials,
}));

// Cookie parser with secret
app.use(cookieParser(config.cookie.secret));

// ========================================
// BODY PARSING
// ========================================

// Special handling for webhook routes - they need raw body for signature verification
// Must be defined BEFORE general JSON parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/webhooks/square', express.raw({ type: 'application/json' }));
app.use('/api/v1/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use('/api/v1/webhooks/square', express.raw({ type: 'application/json' }));

// General JSON body parser for all other routes
app.use(express.json({ limit: config.bodyLimit }));
app.use(express.urlencoded({ extended: true, limit: config.bodyLimit }));

// ========================================
// API DOCUMENTATION
// ========================================

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'Restaurant SaaS API Documentation',
  customCss: '.swagger-ui .topbar { display: none }',
}));

// ========================================
// HEALTH CHECK ENDPOINTS
// ========================================

/**
 * Basic health check - returns OK if server is running
 * GET /health
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    version: '1.0.0',
  });
});

/**
 * Prometheus metrics endpoint
 * GET /metrics
 */
app.use('/metrics', metricsRoutes);

/**
 * Readiness check - validates database connectivity
 * GET /ready
 */
app.get('/ready', async (req: Request, res: Response) => {
  try {
    // Check database connection
    const prisma = (await import('./db/prisma')).default;
    await prisma.$queryRaw`SELECT 1`;
    
    res.json({
      status: 'ready',
      checks: {
        database: 'ok',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error({ err: error }, 'Readiness check failed');
    
    res.status(503).json({
      status: 'not_ready',
      checks: {
        database: 'failed',
      },
      timestamp: new Date().toISOString(),
    });
  }
});

// ========================================
// API ROUTES - V1
// ========================================

// Import v1 route modules
import authV1Routes from './modules/auth/v1/routes';
import adminMenuRoutes from './modules/menu/v1/admin.routes';
import publicMenuRoutes from './modules/menu/v1/public.routes';
import adminOrderRoutes from './modules/orders/v1/admin.routes';
import publicOrderRoutes from './modules/orders/v1/public.routes';
import adminPaymentRoutes from './modules/payments/v1/admin.routes';
import publicPaymentRoutes from './modules/payments/v1/public.routes';
import webhooksRoutes from './modules/payments/v1/webhooks.routes';
import botRoutes from './modules/bot/v1/routes';

/**
 * Auth routes - public authentication endpoints
 */
app.use('/api/v1/auth', authV1Routes);

/**
 * Admin routes - protected with authentication and authorization
 * Examples: user management, system settings, analytics, reports
 * 
 * Middleware chain: requireAuth() -> attachTenant() -> requireTenant() -> requireRole()
 */
app.use('/api/v1/admin/menu', adminMenuRoutes);
app.use('/api/v1/admin/orders', adminOrderRoutes);
app.use('/api/v1/admin/payments', adminPaymentRoutes);
/**
 * Public routes - accessible without authentication
 * Examples: chatbot interface, menu browsing, order tracking
 * 
 * Middleware chain: resolveRestaurantBySlug() -> requireTenant() -> optionalAuth()
 * URL pattern: /api/v1/public/restaurants/:slug/resource
 */
const publicV1Router = Router();
publicV1Router.use('/restaurants', publicMenuRoutes);
publicV1Router.use('/restaurants', publicOrderRoutes);
publicV1Router.use('/restaurants', publicPaymentRoutes);
publicV1Router.use('/restaurants', botRoutes);
app.use('/api/v1/public', publicV1Router);

/**
 * Webhook routes - signature verification required
 * Examples: payment provider webhooks (Stripe, Square)
 */
app.use('/api/v1/webhooks', webhooksRoutes);

// ========================================
// API ROUTES - LEGACY (to be migrated)
// ========================================

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/restaurant', apiLimiter, restaurantRoutes);
app.use('/api/menu', apiLimiter, menuRoutes);
app.use('/api/inventory', apiLimiter, inventoryRoutes);
app.use('/api/orders', apiLimiter, orderRoutes);
app.use('/api/payments', apiLimiter, paymentRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/public', publicLimiter, botRoutesLegacy);

// ========================================
// ERROR HANDLING
// ========================================

// 404 handler - must be after all routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`,
      requestId: (req as any).id,
    },
  });
});

// Zod error formatter middleware
app.use(zodErrorFormatter);

// Central error handler (must be last)
app.use(errorHandler);

export default app;
