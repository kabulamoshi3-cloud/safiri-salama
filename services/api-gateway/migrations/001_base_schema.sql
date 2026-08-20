-- Base schema: core tables required before feature migrations

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('passenger', 'driver', 'operator', 'admin', 'support_agent')),
  status VARCHAR(20) DEFAULT 'active',
  language VARCHAR(5) DEFAULT 'sw',
  referred_by UUID,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  license_number VARCHAR(100),
  status VARCHAR(20) DEFAULT 'offline',
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  plate_number VARCHAR(20) UNIQUE NOT NULL,
  make VARCHAR(100),
  model VARCHAR(100),
  year INTEGER,
  color VARCHAR(50),
  vehicle_type VARCHAR(20) DEFAULT 'car' CHECK (vehicle_type IN ('car', 'bajaji', 'boda-boda')),
  seats INTEGER DEFAULT 4,
  has_helmet BOOLEAN DEFAULT false,
  is_three_wheeler BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS passengers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(255),
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID REFERENCES passengers(id),
  driver_id UUID REFERENCES drivers(id),
  pickup_location TEXT,
  pickup_lat DECIMAL(10,8),
  pickup_lng DECIMAL(11,8),
  dropoff_location TEXT,
  dropoff_lat DECIMAL(10,8),
  dropoff_lng DECIMAL(11,8),
  status VARCHAR(30) DEFAULT 'requested',
  fare INTEGER,
  distance_meters INTEGER,
  duration_seconds INTEGER,
  vehicle_type VARCHAR(20) DEFAULT 'car',
  payment_method VARCHAR(30) DEFAULT 'cash',
  rating INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_trips_passenger_id ON trips(passenger_id);
CREATE INDEX IF NOT EXISTS idx_trips_driver_id ON trips(driver_id);
CREATE INDEX IF NOT EXISTS idx_trips_status ON trips(status);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
