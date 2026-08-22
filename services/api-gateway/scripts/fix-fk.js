const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  // Drop restrictive foreign keys that reference passengers/drivers tables
  // The API uses users.id directly for both passenger_id and driver_id
  const drops = [
    "ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_passenger_id_fkey",
    "ALTER TABLE trips DROP CONSTRAINT IF EXISTS trips_driver_id_fkey",
  ];
  
  for (const sql of drops) {
    try { await c.query(sql); console.log('OK:', sql); }
    catch (e) { console.log('SKIP:', e.message.substring(0, 50)); }
  }

  // Verify with test insert
  try {
    const r = await c.query(`INSERT INTO trips (passenger_id, pickup_latitude, pickup_longitude, pickup_address, dropoff_latitude, dropoff_longitude, dropoff_address, vehicle_type, estimated_fare, estimated_distance, estimated_duration, payment_method, status) VALUES ('042ab48d-a72d-4d01-b966-67acbd747ec2', -6.79, 39.20, 'Kariakoo Market', -6.75, 39.23, 'Masaki', 'car', 8500, 6200, 15, 'cash', 'pending') RETURNING id`);
    console.log('\nTest INSERT: OK! Trip ID:', r.rows[0].id);
  } catch (e) {
    console.log('\nTest INSERT failed:', e.message);
  }

  await c.end();
}).catch(e => console.error(e.message));
