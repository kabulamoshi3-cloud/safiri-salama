/**
 * Database Connection Pool
 * Provides a shared PostgreSQL connection pool for all routes
 */

import { Pool, PoolClient, QueryResult } from 'pg';
import * as dotenv from 'dotenv';
import { createLogger } from '../utils/logger';

dotenv.config();

const logger = createLogger('database');

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/skyrex';

// Create connection pool
const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 20, // maximum number of clients
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Log pool events
pool.on('connect', () => {
  logger.info('New database client connected');
});

pool.on('error', (err) => {
  logger.error('Unexpected database pool error:', err);
});

/**
 * Execute a query with automatic error handling
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    logger.debug(`Executed query in ${duration}ms`, { text, rows: res.rowCount });
    return res;
  } catch (error) {
    logger.error('Database query error:', { text, error });
    throw error;
  }
};

/**
 * Get a client from the pool for transactions
 */
export const getClient = async (): Promise<PoolClient> => {
  return await pool.connect();
};

/**
 * Close all connections (for graceful shutdown)
 */
export const close = async (): Promise<void> => {
  await pool.end();
  logger.info('Database pool closed');
};

/**
 * Export as default for convenience
 */
export const database = {
  query,
  getClient,
  close,
  pool,
};

export default database;
