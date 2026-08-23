const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  await c.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trip_id UUID NOT NULL,
      sender_id UUID NOT NULL,
      message TEXT NOT NULL,
      sent_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_chat_trip ON chat_messages(trip_id, sent_at)`);
  console.log('Created chat_messages table + index');
  await c.end();
}).catch(e => console.error(e.message));
