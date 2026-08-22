const { Client } = require('pg');
const client = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  const migrations = [
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by UUID",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_rating INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_review TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_rating INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_review TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,8)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11,8)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.00",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
    "CREATE INDEX IF NOT EXISTS idx_trips_status_pending ON trips(status) WHERE status = 'pending'",
    "CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = true",
  ];

  for (const sql of migrations) {
    try { await client.query(sql); console.log('OK:', sql.substring(0, 50)); }
    catch (e) { console.log('SKIP:', e.message.substring(0, 40)); }
  }
  console.log('\nDone!');
  await client.end();
}
run().catch(e => console.error(e.message));
