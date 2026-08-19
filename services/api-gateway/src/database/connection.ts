/**
 * Database Connection Pool
 * PostgreSQL/CockroachDB connection management
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection
pool.on('connect', () => {
  console.log('Database connected successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected database error:', err);
  process.exit(-1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await pool.end();
  console.log('Database pool closed');
  process.exit(0);
});

export default pool;
