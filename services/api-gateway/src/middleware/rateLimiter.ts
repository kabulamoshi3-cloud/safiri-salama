import rateLimit from 'express-rate-limit';

// Simple in-memory rate limiting (works on Vercel serverless — no Redis needed)
export const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 min default
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),

  keyGenerator: (req: any) => {
    if (req.user) {
      return `${req.user.type}:${req.user.id}`;
    }
    return req.ip || 'unknown';
  },

  handler: (_req, res) => {
    res.status(429).json({
      error: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
      retryAfter: res.getHeader('Retry-After')
    });
  },

  standardHeaders: true,
  legacyHeaders: false,

  skip: (req) => req.path === '/health'
});

// Stricter limiter for sensitive endpoints
export const strictRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many requests to this endpoint'
  }
});

// Auth-specific limiter — blocks brute-force login attempts
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    error: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Too many login attempts, please try again later'
  }
});
