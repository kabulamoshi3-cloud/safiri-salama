-- Run this once to create the initial admin account
-- Change the values before running in production
-- Password below is bcrypt hash of 'Admin@1234' (change immediately after first login)
INSERT INTO users (phone, password_hash, name, user_type, status, created_at, updated_at)
VALUES (
  '+255700000000',
  '$2b$10$YourBcryptHashHere',
  'Super Admin',
  'admin',
  'active',
  NOW(),
  NOW()
) ON CONFLICT (phone) DO NOTHING;
