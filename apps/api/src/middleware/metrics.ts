import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, httpRequestDuration } from '../lib/metrics';

/**
 * Middleware to collect Prometheus metrics for HTTP requests
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const startTime = Date.now();

  // Capture response finish event
  res.on('finish', () => {
    const duration = (Date.now() - startTime) / 1000; // Convert to seconds
    const route = getRoutePattern(req);
    const method = req.method;
    const status = res.statusCode.toString();
    const restaurantId = (req as any).restaurantId || 'none';

    // Increment request counter
    httpRequestsTotal.labels(method, route, status, restaurantId).inc();

    // Record request duration
    httpRequestDuration.labels(method, route, status, restaurantId).observe(duration);
  });

  next();
}

/**
 * Extracts route pattern from request (e.g., /api/v1/admin/menu/:id)
 */
function getRoutePattern(req: Request): string {
  // Try to get the route from Express route matching
  if (req.route?.path) {
    const basePath = req.baseUrl || '';
    return basePath + req.route.path;
  }

  // Fallback: sanitize path to avoid high cardinality
  const path = req.path || req.url;
  
  // Replace UUIDs with :id
  let sanitized = path.replace(
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
    ':id'
  );
  
  // Replace numeric IDs with :id
  sanitized = sanitized.replace(/\/\d+/g, '/:id');
  
  // Replace slugs (alphanumeric with hyphens) with :slug
  sanitized = sanitized.replace(/\/[a-z0-9-]+/gi, (match) => {
    // Keep known path segments
    const knownSegments = [
      'api',
      'v1',
      'admin',
      'public',
      'auth',
      'menu',
      'orders',
      'payments',
      'restaurants',
      'bot',
      'webhooks',
      'categories',
      'items',
      'options',
      'login',
      'logout',
      'refresh',
      'me',
      'config',
      'test',
      'status',
      'message',
      'session',
    ];
    
    const segment = match.substring(1); // Remove leading /
    if (knownSegments.includes(segment.toLowerCase())) {
      return match;
    }
    
    return '/:slug';
  });
  
  return sanitized || '/';
}
