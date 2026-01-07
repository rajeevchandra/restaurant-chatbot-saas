import pino from 'pino';
import { config } from '../config';

/**
 * Structured logger with request tracking
 * Uses Pino for high-performance JSON logging
 */
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'restaurant-api',
    environment: config.nodeEnv,
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level: (label) => ({ level: label }),
  },
  // Pretty print in development
  transport: config.nodeEnv !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

/**
 * Creates a child logger with request context
 */
export function createRequestLogger(requestId: string, restaurantId?: string) {
  return logger.child({
    requestId,
    restaurantId,
  });
}

export default logger;
