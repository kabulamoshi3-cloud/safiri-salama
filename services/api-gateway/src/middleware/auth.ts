import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createLogger } from '../utils/logger';

const logger = createLogger('auth-middleware');

export interface AuthRequest extends Request {
  user?: {
    id: string;
    type: 'passenger' | 'driver' | 'operator' | 'admin' | 'support_agent';
    phone: string;
    phone_number?: string;
  };
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip auth for public routes
    const publicPaths = ['/health', '/auth/login', '/auth/register'];
    if (publicPaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'No token provided'
      });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        error: 'INTERNAL_ERROR',
        message: 'Authentication not configured'
      });
    }

    const decoded = jwt.verify(token, secret) as {
      id: string;
      type: 'passenger' | 'driver' | 'operator' | 'admin';
      phone: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }
    
    logger.error('Auth middleware error:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Authentication failed'
    });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'UNAUTHORIZED',
        message: 'Authentication required'
      });
    }

    if (!allowedRoles.includes(req.user.type)) {
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
};
