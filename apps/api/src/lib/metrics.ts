import { Registry, Counter, Histogram } from 'prom-client';

/**
 * Prometheus metrics registry
 */
export const register = new Registry();

/**
 * HTTP request counter
 * Labels: method, route, status
 */
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status', 'restaurant_id'],
  registers: [register],
});

/**
 * HTTP request duration histogram
 * Buckets optimized for API response times
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latencies in seconds',
  labelNames: ['method', 'route', 'status', 'restaurant_id'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [register],
});

/**
 * Active connections gauge
 */
export const activeConnections = new Counter({
  name: 'http_active_connections',
  help: 'Number of active HTTP connections',
  registers: [register],
});

/**
 * Database query counter
 */
export const dbQueriesTotal = new Counter({
  name: 'db_queries_total',
  help: 'Total number of database queries',
  labelNames: ['operation', 'table', 'status'],
  registers: [register],
});

/**
 * Database query duration histogram
 */
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Database query latencies in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
  registers: [register],
});

/**
 * Error counter by type
 */
export const errorsTotal = new Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type', 'route', 'status'],
  registers: [register],
});

// Register default metrics (CPU, memory, event loop, etc.)
import { collectDefaultMetrics } from 'prom-client';
collectDefaultMetrics({ register, prefix: 'restaurant_api_' });
