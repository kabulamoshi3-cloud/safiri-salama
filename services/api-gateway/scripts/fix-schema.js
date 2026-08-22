const { Client } = require('pg');

const DB_URL = process.argv[2] || process.env.DATABASE_URL;
const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  await client.connect();
  console.log('Connected to database\n');

  const migrations = [
    // Trip columns
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_latitude DECIMAL(10,8)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(11,8)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS pickup_address TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_latitude DECIMAL(10,8)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_longitude DECIMAL(11,8)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS dropoff_address TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_fare INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_distance INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS estimated_duration INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS final_fare INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30) DEFAULT 'cash'",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(100)",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancelled_by UUID",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS cancellation_reason TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_rating INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_review TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_rating INTEGER",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_review TEXT",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS passenger_id UUID",
    "ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_id UUID",
    // Driver columns
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_expiry DATE",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending'",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_latitude DECIMAL(10,8)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS current_longitude DECIMAL(11,8)",
    "ALTER TABLE drivers ADD COLUMN IF NOT EXISTS last_location_update TIMESTAMP",
    // Vehicle columns
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_number VARCHAR(100)",
    "ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS insurance_expiry DATE",
    // User columns
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 5.00",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_logout TIMESTAMP",
    // Indexes
    "CREATE INDEX IF NOT EXISTS idx_trips_passenger ON trips(passenger_id)",
    "CREATE INDEX IF NOT EXISTS idx_trips_driver ON trips(driver_id)",
    "CREATE INDEX IF NOT EXISTS idx_trips_status_pending ON trips(status) WHERE status = 'pending'",
    "CREATE INDEX IF NOT EXISTS idx_drivers_online ON drivers(is_online) WHERE is_online = true",
  ];

  let ok = 0, skip = 0;
  for (const sql of migrations) {
    try {
      await client.query(sql);
      ok++;
      console.log(`  OK  ${sql.substring(0, 70)}...`);
    } catch (e) {
      skip++;
      console.log(`  SKIP ${e.message.substring(0, 50)}`);
    }
  }

  console.log(`\nDone! OK: ${ok}, Skipped: ${skip}`);
  await client.end();
}

run().catch(e => { console.error('Error:', e.message); process.exit(1); });
