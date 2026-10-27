// Run: node infrastructure/database/postgres/seeds/seed-admin.js
// Set DATABASE_URL env var first
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const password = process.env.ADMIN_PASSWORD || 'Admin@1234';
  const hash = await bcrypt.hash(password, 10);
  
  const result = await pool.query(`
    INSERT INTO users (phone, password_hash, name, user_type, status, created_at, updated_at)
    VALUES ($1, $2, $3, 'admin', 'active', NOW(), NOW())
    ON CONFLICT (phone) DO UPDATE SET password_hash = $2, user_type = 'admin', status = 'active'
    RETURNING id, phone, name, user_type
  `, [process.env.ADMIN_PHONE || '+255700000000', hash, process.env.ADMIN_NAME || 'Super Admin']);
  
  console.log('Admin created:', result.rows[0]);
  await pool.end();
}

seedAdmin().catch(console.error);
