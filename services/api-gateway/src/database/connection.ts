/**
 * Database Connection Pool
 * PostgreSQL/CockroachDB connection management
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Pool is created lazily — safe when DATABASE_URL is not yet set
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Log connection events — do NOT call process.exit() on error; let Vercel handle it
pool.on('connect', () => {
  console.log('Database connected');
});

pool.on('error', (err) => {
  // Log but do not crash the serverless function
  console.error('Database pool error:', err.message);
});

export default pool;
