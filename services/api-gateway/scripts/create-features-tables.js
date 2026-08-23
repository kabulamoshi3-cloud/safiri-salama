const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  await c.query(`
    CREATE TABLE IF NOT EXISTS trip_waypoints (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id UUID NOT NULL,
      stop_order INTEGER NOT NULL,
      latitude DECIMAL(10,8) NOT NULL,
      longitude DECIMAL(11,8) NOT NULL,
      address TEXT,
      arrived_at TIMESTAMP
    )
  `);
  await c.query(`
    CREATE TABLE IF NOT EXISTS fare_splits (
      trip_id UUID PRIMARY KEY,
      initiator_id UUID NOT NULL,
      total_fare INTEGER NOT NULL,
      split_count INTEGER NOT NULL,
      per_person_amount INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await c.query(`
    CREATE TABLE IF NOT EXISTS fare_split_participants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id UUID NOT NULL,
      phone VARCHAR(20) NOT NULL,
      amount INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'pending'
    )
  `);
  console.log('Created trip_waypoints, fare_splits, fare_split_participants tables');
  await c.end();
}).catch(e => console.error(e.message));
