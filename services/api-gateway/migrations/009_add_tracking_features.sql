-- Migration 009: Real-Time Tracking and Smart Mobility Features

-- ═══════════════════════════════════════════════
-- ROUTE TRACKING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trip_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  route_type VARCHAR(20) NOT NULL,
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  cost_tzs INTEGER NOT NULL,
  polyline TEXT NOT NULL,
  traffic_condition VARCHAR(20),
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_routes_trip_id ON trip_routes(trip_id);

-- ═══════════════════════════════════════════════
-- LOCATION HISTORY
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  recorded_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_location_history_trip_id ON location_history(trip_id);
CREATE INDEX IF NOT EXISTS idx_location_history_driver_id ON location_history(driver_id);

-- ═══════════════════════════════════════════════
-- EMERGENCY CONTACTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_user_id ON emergency_contacts(user_id);

-- ═══════════════════════════════════════════════
-- SOS ALERTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sos_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_trip_id ON sos_alerts(trip_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_status ON sos_alerts(status);

-- ═══════════════════════════════════════════════
-- TRIP SHARING
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trip_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id UUID NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  share_token VARCHAR(100) UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_shares_token ON trip_shares(share_token);

-- ═══════════════════════════════════════════════
-- TRAFFIC REPORTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS traffic_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
  reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  traffic_level VARCHAR(20) NOT NULL,
  description TEXT,
  is_verified BOOLEAN DEFAULT false,
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- PRICING RATES
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type VARCHAR(20) NOT NULL,
  base_rate_per_km DECIMAL(10, 2) NOT NULL,
  minimum_fare DECIMAL(10, 2) NOT NULL,
  per_minute_rate DECIMAL(10, 2) DEFAULT 0,
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO pricing_rates (vehicle_type, base_rate_per_km, minimum_fare, per_minute_rate) VALUES
  ('car',       1500, 3000, 50),
  ('bajaji',    1000, 2000, 30),
  ('boda-boda',  800, 1500, 25)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════
-- UPDATE TRIPS WITH TRACKING COLUMNS
-- ═══════════════════════════════════════════════

ALTER TABLE trips ADD COLUMN IF NOT EXISTS actual_distance_meters INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS traffic_delay_seconds INTEGER DEFAULT 0;
