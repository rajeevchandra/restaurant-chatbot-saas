import pinoHttp from 'pino-http';
import logger from '../lib/logger';
import { Request, Response } from 'express';

/**
 * Pino HTTP middleware for structured request/response logging
 * Automatically logs all HTTP requests with timing, status codes, and errors
 */
export const httpLogger = pinoHttp({
  logger,
  
  // Generate request ID from header or existing req.id
  genReqId: (req) => (req as any).id,
  
  // Custom log level based on response status
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    if (res.statusCode >= 300) return 'info';
    return 'info';
  },
  
  // Custom success message
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed`;
  },
  
  // Custom error message
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} failed: ${err.message}`;
  },
  
  // Customize what gets logged
  customAttributeKeys: {
    req: 'request',
    res: 'response',
    err: 'error',
    responseTime: 'duration',
  },
  
  // Add custom properties to log
  customProps: (req: Request, res: Response) => {
    const authReq = req as any;
    return {
      restaurantId: authReq.restaurantId,
      userId: authReq.userId,
      userRole: authReq.userRole,
    };
  },
  
  // Serialize request
  serializers: {
    req: (req) => ({
      id: (req as any).id,
      method: req.method,
      url: req.url,
      path: req.raw?.url,
      query: (req as any).query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        'content-type': res.headers?.['content-type'],
      },
    }),
    err: (err) => ({
      type: err.type,
      message: err.message,
      stack: err.stack,
      code: (err as any).code,
      statusCode: (err as any).statusCode,
    }),
  },
  
  // Redact sensitive data
  redact: {
    paths: [
      'request.headers.authorization',
      'request.headers.cookie',
      'request.body.password',
      'request.body.token',
    ],
    censor: '[REDACTED]',
  },
});
