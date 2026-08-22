const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  // Check trips table constraints
  const r = await c.query(`
    SELECT tc.constraint_name, tc.constraint_type, kcu.column_name, 
           ccu.table_name AS foreign_table
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'trips' AND tc.constraint_type = 'FOREIGN KEY'
  `);
  console.log('Foreign keys on trips:');
  r.rows.forEach(x => console.log(`  ${x.column_name} -> ${x.foreign_table}`));
  
  // Try inserting a trip directly to see the error
  try {
    await c.query(`INSERT INTO trips (passenger_id, pickup_latitude, pickup_longitude, pickup_address, dropoff_latitude, dropoff_longitude, dropoff_address, vehicle_type, estimated_fare, status) VALUES ('042ab48d-a72d-4d01-b966-67acbd747ec2', -6.79, 39.20, 'Test', -6.75, 39.23, 'Test2', 'car', 5000, 'pending')`);
    console.log('\nDirect INSERT: OK');
  } catch (e) {
    console.log('\nDirect INSERT FAILED:', e.message);
  }
  await c.end();
}).catch(e => console.error(e.message));
