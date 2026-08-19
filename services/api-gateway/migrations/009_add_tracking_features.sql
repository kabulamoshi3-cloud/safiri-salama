-- Migration 009: Add Real-Time Tracking and Smart Mobility Features
-- Adds vehicle types (bajaji, boda-boda), route tracking, and safety features

-- ═══════════════════════════════════════════════════════════
-- VEHICLE TYPES
-- ═══════════════════════════════════════════════════════════

-- Add vehicle_type to vehicles table
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'car' CHECK (vehicle_type IN ('car', 'bajaji', 'boda-boda'));

-- Add vehicle-specific fields
ALTER TABLE vehicles
ADD COLUMN IF NOT EXISTS seats INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS has_helmet BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_three_wheeler BOOLEAN DEFAULT false;

COMMENT ON COLUMN vehicles.vehicle_type IS 'Type of vehicle: car, bajaji (3-wheeler), or boda-boda (motorcycle)';
COMMENT ON COLUMN vehicles.seats IS 'Number of passenger seats available';
COMMENT ON COLUMN vehicles.has_helmet IS 'For boda-boda: helmet availability';
COMMENT ON COLUMN vehicles.is_three_wheeler IS 'Indicates if vehicle is a 3-wheeler bajaji';

-- ═══════════════════════════════════════════════════════════
-- ROUTE TRACKING
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trip_routes (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  route_type VARCHAR(20) NOT NULL CHECK (route_type IN ('fastest', 'shortest', 'cheapest', 'alternative')),
  distance_meters INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL,
  duration_in_traffic_seconds INTEGER,
  cost_tzs INTEGER NOT NULL,
  polyline TEXT NOT NULL,
  traffic_condition VARCHAR(20) CHECK (traffic_condition IN ('light', 'moderate', 'heavy')),
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trip_routes_trip_id ON trip_routes(trip_id);
CREATE INDEX idx_trip_routes_selected ON trip_routes(trip_id, is_selected);

COMMENT ON TABLE trip_routes IS 'Stores route options calculated for trips';

-- ═══════════════════════════════════════════════════════════
-- LOCATION TRACKING
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS location_history (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  driver_id INTEGER NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  heading DECIMAL(5, 2),
  speed DECIMAL(5, 2),
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_location_history_trip_id ON location_history(trip_id, timestamp);
CREATE INDEX idx_location_history_driver_id ON location_history(driver_id, timestamp);

COMMENT ON TABLE location_history IS 'Historical GPS tracking data for trips';

-- ═══════════════════════════════════════════════════════════
-- EMERGENCY CONTACTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_contacts_user_id ON emergency_contacts(user_id);

COMMENT ON TABLE emergency_contacts IS 'Emergency contacts for passenger safety';

-- ═══════════════════════════════════════════════════════════
-- SOS ALERTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sos_alerts (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('passenger', 'driver')),
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(10, 2),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'cancelled')),
  responded_by INTEGER REFERENCES users(id),
  resolved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sos_alerts_trip_id ON sos_alerts(trip_id);
CREATE INDEX idx_sos_alerts_status ON sos_alerts(status, created_at);
CREATE INDEX idx_sos_alerts_user_id ON sos_alerts(user_id);

COMMENT ON TABLE sos_alerts IS 'Emergency SOS alerts triggered during trips';

-- ═══════════════════════════════════════════════════════════
-- TRIP SHARING
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS trip_shares (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  passenger_id INTEGER NOT NULL REFERENCES passengers(id) ON DELETE CASCADE,
  share_token VARCHAR(100) UNIQUE NOT NULL,
  shared_with_phones TEXT[], -- Array of phone numbers
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_trip_shares_trip_id ON trip_shares(trip_id);
CREATE INDEX idx_trip_shares_token ON trip_shares(share_token);
CREATE INDEX idx_trip_shares_active ON trip_shares(is_active, expires_at);

COMMENT ON TABLE trip_shares IS 'Live trip sharing links for safety';

-- ═══════════════════════════════════════════════════════════
-- TRAFFIC REPORTS
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS traffic_reports (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER REFERENCES trips(id) ON DELETE SET NULL,
  reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  traffic_level VARCHAR(20) NOT NULL CHECK (traffic_level IN ('light', 'moderate', 'heavy', 'jam')),
  description TEXT,
  is_verified BOOLEAN DEFAULT false,
  verified_by INTEGER REFERENCES users(id),
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_traffic_reports_location ON traffic_reports(latitude, longitude);
CREATE INDEX idx_traffic_reports_active ON traffic_reports(is_verified, expires_at);

COMMENT ON TABLE traffic_reports IS 'User-reported traffic conditions';

-- ═══════════════════════════════════════════════════════════
-- PRICING RATES BY VEHICLE TYPE
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS pricing_rates (
  id SERIAL PRIMARY KEY,
  vehicle_type VARCHAR(20) NOT NULL CHECK (vehicle_type IN ('car', 'bajaji', 'boda-boda')),
  base_rate_per_km DECIMAL(10, 2) NOT NULL,
  minimum_fare DECIMAL(10, 2) NOT NULL,
  per_minute_rate DECIMAL(10, 2) DEFAULT 0,
  surge_multiplier DECIMAL(3, 2) DEFAULT 1.0,
  traffic_multiplier_light DECIMAL(3, 2) DEFAULT 1.0,
  traffic_multiplier_moderate DECIMAL(3, 2) DEFAULT 1.15,
  traffic_multiplier_heavy DECIMAL(3, 2) DEFAULT 1.3,
  is_active BOOLEAN DEFAULT true,
  effective_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  effective_to TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_pricing_rates_vehicle_type ON pricing_rates(vehicle_type, is_active);
CREATE INDEX idx_pricing_rates_effective ON pricing_rates(effective_from, effective_to);

COMMENT ON TABLE pricing_rates IS 'Dynamic pricing rates for different vehicle types';

-- Insert default pricing rates
INSERT INTO pricing_rates (vehicle_type, base_rate_per_km, minimum_fare, per_minute_rate) VALUES
  ('car', 1500, 3000, 50),
  ('bajaji', 1000, 2000, 30),
  ('boda-boda', 800, 1500, 25)
ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════
-- UPDATE TRIPS TABLE
-- ═══════════════════════════════════════════════════════════

-- Add vehicle type to trips
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20) DEFAULT 'car' CHECK (vehicle_type IN ('car', 'bajaji', 'boda-boda'));

-- Add route tracking fields
ALTER TABLE trips
ADD COLUMN IF NOT EXISTS selected_route_id INTEGER REFERENCES trip_routes(id),
ADD COLUMN IF NOT EXISTS actual_distance_meters INTEGER,
ADD COLUMN IF NOT EXISTS actual_duration_seconds INTEGER,
ADD COLUMN IF NOT EXISTS traffic_delay_seconds INTEGER DEFAULT 0;

COMMENT ON COLUMN trips.vehicle_type IS 'Type of vehicle requested/assigned';
COMMENT ON COLUMN trips.actual_distance_meters IS 'Actual distance traveled (from GPS)';
COMMENT ON COLUMN trips.actual_duration_seconds IS 'Actual trip duration';
COMMENT ON COLUMN trips.traffic_delay_seconds IS 'Additional time due to traffic';

-- ═══════════════════════════════════════════════════════════
-- TRIGGERS FOR UPDATED_AT
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_emergency_contacts_updated_at
  BEFORE UPDATE ON emergency_contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ═══════════════════════════════════════════════════════════
-- VIEWS FOR ANALYTICS
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW vehicle_type_statistics AS
SELECT
  vehicle_type,
  COUNT(*) as total_trips,
  AVG(fare) as avg_fare,
  AVG(actual_distance_meters) as avg_distance,
  AVG(actual_duration_seconds) as avg_duration,
  AVG(traffic_delay_seconds) as avg_traffic_delay,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_trips
FROM trips
WHERE vehicle_type IS NOT NULL
GROUP BY vehicle_type;

COMMENT ON VIEW vehicle_type_statistics IS 'Performance statistics by vehicle type';

CREATE OR REPLACE VIEW active_sos_alerts_view AS
SELECT
  sa.*,
  t.pickup_location,
  t.dropoff_location,
  u.name as user_name,
  u.phone as user_phone,
  d.name as driver_name,
  d.phone as driver_phone
FROM sos_alerts sa
JOIN trips t ON sa.trip_id = t.id
JOIN users u ON sa.user_id = u.id
LEFT JOIN drivers d ON t.driver_id = d.id
WHERE sa.status = 'active'
ORDER BY sa.created_at DESC;

COMMENT ON VIEW active_sos_alerts_view IS 'Active SOS alerts with trip and user details';
