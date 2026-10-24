import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { createLogger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import routes from './routes';
import authRouter from './routes/auth';

dotenv.config();

const app = express();
const logger = createLogger('api-gateway');

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

// Logging
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(rateLimiter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Safiri Haraka API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/v1/auth',
      trips: '/api/v1/trips',
      drivers: '/api/v1/drivers',
      promo: '/api/v1/promo',
      referral: '/api/v1/referral',
      support: '/api/v1/support',
      food: '/api/v1/food'
    }
  });
});

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Auth routes (no auth middleware - these create the tokens!)
app.use('/api/v1/auth', authRouter);

// API routes with authentication
app.use('/api', authMiddleware, routes);

// Error handling
app.use(errorHandler);

// Export for Vercel serverless — do NOT call app.listen() here
export default app;
