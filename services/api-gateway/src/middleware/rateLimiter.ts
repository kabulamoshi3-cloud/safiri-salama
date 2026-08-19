import rateLimit from 'express-rate-limit';
import { createClient } from 'redis';
import { createLogger } from '../utils/logger';

const logger = createLogger('rate-limiter');

// Redis client for distributed rate limiting
let redisClient: ReturnType<typeof createClient> | null = null;

const initRedis = async () => {
  if (redisClient) return redisClient;
  
  try {
    redisClient = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
      password: process.env.REDIS_PASSWORD || undefined
    });
    
    redisClient.on('error', (err) => logger.error('Redis Client Error', err));
    await redisClient.connect();
    logger.info('Redis connected for rate limiting');
    return redisClient;
  } catch (error) {
    logger.warn('Redis not available, falling back to memory store', error);
    return null;
  }
};

// Initialize Redis connection
initRedis();

// Rate limiting configuration by user type
const RATE_LIMITS = {
  passenger: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // requests per window
  },
  driver: {
    windowMs: 15 * 60 * 1000,
    max: 200 // drivers need more for GPS updates
  },
  operator: {
    windowMs: 15 * 60 * 1000,
    max: 500 // operators query lots of data
  },
  admin: {
    windowMs: 15 * 60 * 1000,
    max: 1000 // admins need high limits
  },
  default: {
    windowMs: 15 * 60 * 1000,
    max: 50 // unauthenticated/unknown users
  }
};

export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  
  // Dynamic limit based on user type
  keyGenerator: (req: any) => {
    if (req.user) {
      return `${req.user.type}:${req.user.id}`;
    }
    return req.ip || 'unknown';
  },
  
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for ${req.ip}`);
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  },
  
  standardHeaders: true,
  legacyHeaders: false,
  
  // Use Redis if available, otherwise memory
  store: redisClient ? undefined : undefined, // TODO: Implement Redis store
  
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health';
  }
});

// Endpoint-specific rate limiters
export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 10, // 10 requests
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests to this endpoint'
  }
});

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Only 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts, please try again later'
  }
});
