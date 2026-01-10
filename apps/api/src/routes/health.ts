import { Router, Request, Response } from 'express';
import prisma from '../db/prisma';

const router = Router();

/**
 * Health check endpoint
 * Returns service health status
 */
router.get('/health', async (req: Request, res: Response) => {
  const healthCheck = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    status: 'ok',
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      database: 'checking',
    },
  };

  try {
    // Check database connection
    await prisma.$queryRaw`SELECT 1`;
    healthCheck.checks.database = 'healthy';
  } catch (error) {
    healthCheck.checks.database = 'unhealthy';
    healthCheck.status = 'degraded';
  }

  const statusCode = healthCheck.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(healthCheck);
});

/**
 * Readiness check - for Kubernetes/load balancers
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Database not ready' });
  }
});

/**
 * Liveness check - for Kubernetes
 */
router.get('/live', (req: Request, res: Response) => {
  res.status(200).json({ alive: true });
});

export default router;
