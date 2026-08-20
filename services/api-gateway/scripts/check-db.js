const { Client } = require('pg');

const DB_URL = process.argv[2];
const client = new Client({
  connectionString: DB_URL,
  ssl: { rejectUnauthorized: false }
});

client.connect()
  .then(async () => {
    const r = await client.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name"
    );
    if (r.rows.length === 0) {
      console.log('No tables yet — migrations still running or not started');
    } else {
      console.log('Tables created:', r.rows.map(x => x.table_name).join(', '));
    }
    await client.end();
  })
  .catch(e => console.error('Connection error:', e.message));
