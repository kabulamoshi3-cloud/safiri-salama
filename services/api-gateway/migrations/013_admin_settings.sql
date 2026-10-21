-- Admin Settings Migration
-- Adds verification_status guard and system_settings table

ALTER TABLE drivers ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) DEFAULT 'pending';

CREATE TABLE IF NOT EXISTS system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO system_settings (key, value) VALUES
  ('base_fare_tzs', '2000'),
  ('per_km_rate_tzs', '500'),
  ('per_minute_rate_tzs', '50'),
  ('min_fare_tzs', '3000'),
  ('driver_search_radius_km', '5'),
  ('trip_request_timeout_minutes', '2')
ON CONFLICT (key) DO NOTHING;
