const { Client } = require('pg');
const c = new Client({ connectionString: process.argv[2], ssl: { rejectUnauthorized: false } });
c.connect().then(async () => {
  await c.query(`
    CREATE TABLE IF NOT EXISTS driver_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL,
      document_type VARCHAR(30) NOT NULL,
      image_url TEXT NOT NULL,
      document_number VARCHAR(100),
      expiry_date DATE,
      status VARCHAR(20) DEFAULT 'pending',
      rejection_reason TEXT,
      uploaded_at TIMESTAMP DEFAULT NOW(),
      reviewed_at TIMESTAMP,
      reviewed_by UUID
    )
  `);
  await c.query(`CREATE INDEX IF NOT EXISTS idx_driver_docs_user ON driver_documents(user_id)`);
  console.log('Created driver_documents table + index');
  await c.end();
}).catch(e => console.error(e.message));
