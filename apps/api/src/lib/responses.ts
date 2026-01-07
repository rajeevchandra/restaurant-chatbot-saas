import { Response } from 'express';

/**
 * Standard API response types
 */

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    requestId?: string;
    timestamp?: string;
  };
}

/**
 * Helper functions for consistent response formatting
 */

export function successResponse<T>(res: Response, data: T, statusCode = 200): Response {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      requestId: String(res.req.id || ''),
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
}

export function paginatedResponse<T>(
  res: Response,
  data: T[],
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  },
  statusCode = 200
): Response {
  const response: PaginatedResponse<T> = {
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
    },
    meta: {
      requestId: String(res.req.id || ''),
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(statusCode).json(response);
}

export function createdResponse<T>(res: Response, data: T): Response {
  return successResponse(res, data, 201);
}

export function noContentResponse(res: Response): Response {
  return res.status(204).send();
}
