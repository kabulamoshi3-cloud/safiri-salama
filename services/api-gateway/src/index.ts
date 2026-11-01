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
const rawOrigins = process.env.CORS_ORIGIN || '*';
const allowedOrigins = rawOrigins === '*' ? '*' : rawOrigins.split(',').map(o => o.trim());

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
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
    name: 'SafiriHaraka API',
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

// One-time migration endpoint — protected by SETUP_SECRET env var
app.post('/run-migrations', async (req, res) => {
  const secret = process.env.SETUP_SECRET;
  if (!secret || req.headers['x-setup-secret'] !== secret) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    const { Client } = await import('pg');
    const { readFileSync, readdirSync } = await import('fs');
    const { join } = await import('path');
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    const migrationsDir = join(process.cwd(), 'migrations');
    let files: string[] = [];
    try { files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort(); } catch { }
    const applied: string[] = [];
    const errors: string[] = [];
    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM _migrations WHERE filename=$1', [file]);
      if (rows.length > 0) { applied.push(`SKIP: ${file}`); continue; }
      try {
        const sql = readFileSync(join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query('INSERT INTO _migrations(filename) VALUES($1)', [file]);
        applied.push(`OK: ${file}`);
      } catch (e: any) { errors.push(`ERR ${file}: ${e.message}`); }
    }
    await client.end();
    return res.json({ success: errors.length === 0, applied, errors });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// API routes with authentication
app.use('/api', authMiddleware, routes);

// Error handling
app.use(errorHandler);

// Export for Vercel serverless — do NOT call app.listen() here
export default app;
