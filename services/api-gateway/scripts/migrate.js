/**
 * Database migration runner
 * Runs all SQL files in migrations/ folder in order
 */
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('Usage: node migrate.js <DATABASE_URL>');
  process.exit(1);
}

async function run() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to CockroachDB...');
  await client.connect();
  console.log('Connected!\n');

  // Create migrations tracking table
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT NOW()
    )
  `);

  // Get already-applied migrations
  const applied = await client.query('SELECT filename FROM schema_migrations');
  const appliedSet = new Set(applied.rows.map(r => r.filename));

  // Get all SQL files sorted
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Found ${files.length} migration files\n`);

  let applied_count = 0;
  let skipped_count = 0;

  for (const file of files) {
    if (appliedSet.has(file)) {
      console.log(`  SKIP  ${file} (already applied)`);
      skipped_count++;
      continue;
    }

    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log(`  RUN   ${file}...`);

    try {
      await client.query(sql);
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [file]
      );
      console.log(`  OK    ${file}`);
      applied_count++;
    } catch (err) {
      console.error(`  FAIL  ${file}: ${err.message}`);
      // Continue on non-fatal errors (column already exists, etc.)
      if (err.message.includes('already exists') || err.message.includes('duplicate')) {
        console.log(`        (non-fatal — continuing)`);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file]
        );
      } else {
        console.error('\nFatal error, stopping.');
        await client.end();
        process.exit(1);
      }
    }
  }

  console.log(`\nDone! Applied: ${applied_count}, Skipped: ${skipped_count}`);
  await client.end();
}

run().catch(err => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
