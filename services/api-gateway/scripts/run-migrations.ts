#!/usr/bin/env ts-node
/**
 * Database Migration Runner
 * Runs all pending SQL migrations in order
 */

import { Client } from 'pg';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

interface Migration {
  filename: string;
  version: number;
  sql: string;
}

async function runMigrations() {
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL must be set before applying database migrations');
  }
  const client = new Client({ connectionString: DATABASE_URL });
  
  try {
    await client.connect();
    console.log('✓ Connected to database');

    // Create migrations tracking table
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✓ Migration tracking table ready');

    // Get executed migrations
    const { rows: executed } = await client.query(
      'SELECT version FROM schema_migrations ORDER BY version'
    );
    const executedVersions = new Set(executed.map((r) => r.version));
    console.log(`✓ Found ${executedVersions.size} previously executed migrations`);

    // Scan migration files
    const migrationsDir = join(__dirname, '../migrations');
    const files = readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    const migrations: Migration[] = files.map((filename) => {
      const match = filename.match(/^(\d+)_/);
      const version = match ? parseInt(match[1], 10) : 0;
      const sql = readFileSync(join(migrationsDir, filename), 'utf-8');
      return { filename, version, sql };
    });

    const pending = migrations.filter((m) => !executedVersions.has(m.version));

    if (pending.length === 0) {
      console.log('✓ No pending migrations. Database is up to date.');
      return;
    }

    console.log(`\n→ Running ${pending.length} pending migration(s)...\n`);

    for (const migration of pending) {
      console.log(`  [${migration.version}] ${migration.filename}`);
      
      try {
        await client.query('BEGIN');
        await client.query(migration.sql);
        await client.query(
          'INSERT INTO schema_migrations (version, filename) VALUES ($1, $2)',
          [migration.version, migration.filename]
        );
        await client.query('COMMIT');
        console.log(`  ✓ Applied successfully\n`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ✗ Failed to apply migration ${migration.filename}:`);
        console.error(`    ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      }
    }

    console.log('✓ All migrations applied successfully!');
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
