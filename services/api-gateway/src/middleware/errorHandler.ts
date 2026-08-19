import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger';

const logger = createLogger('error-handler');

export interface ApiError extends Error {
  statusCode?: number;
  code?: string;
  details?: any;
}

export const errorHandler = (
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  
  // Log error details
  logger.error('Request error:', {
    path: req.path,
    method: req.method,
    statusCode,
    errorCode,
    message: err.message,
    stack: err.stack,
    user: (req as any).user?.id
  });
  
  // Don't expose internal errors to clients
  const clientMessage = statusCode === 500
    ? 'An internal server error occurred'
    : err.message;
  
  res.status(statusCode).json({
    error: errorCode,
    message: clientMessage,
    ...(err.details && { details: err.details }),
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack
    })
  });
};

// Custom error classes
export class BadRequestError extends Error implements ApiError {
  statusCode = 400;
  code = 'BAD_REQUEST';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends Error implements ApiError {
  statusCode = 401;
  code = 'UNAUTHORIZED';
  
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error implements ApiError {
  statusCode = 403;
  code = 'FORBIDDEN';
  
  constructor(message: string = 'Access denied') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error implements ApiError {
  statusCode = 404;
  code = 'NOT_FOUND';
  
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error implements ApiError {
  statusCode = 409;
  code = 'CONFLICT';
  
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalError extends Error implements ApiError {
  statusCode = 500;
  code = 'INTERNAL_ERROR';
  
  constructor(message: string = 'Internal server error') {
    super(message);
    this.name = 'InternalError';
  }
}
