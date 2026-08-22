const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  const r = await c.query("SELECT column_name FROM information_schema.columns WHERE table_name='trips' ORDER BY ordinal_position");
  console.log('Trip columns:', r.rows.map(x => x.column_name).join(', '));
  await c.end();
}).catch(e => console.error(e.message));
