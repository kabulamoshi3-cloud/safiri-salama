-- Migration 015: Trip ratings and driver earnings
-- Ratings: both passenger rates driver AND driver rates passenger after each trip
-- Earnings: tracks driver payout per trip (80% net after 20% platform fee)

CREATE TABLE IF NOT EXISTS trip_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID NOT NULL REFERENCES trips(id),
  rater_id UUID NOT NULL REFERENCES users(id),
  ratee_id UUID NOT NULL REFERENCES users(id),
  role TEXT NOT NULL CHECK (role IN ('passenger_rates_driver', 'driver_rates_passenger')),
  stars INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, rater_id) -- prevent rating the same trip twice
);

CREATE TABLE IF NOT EXISTS driver_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES users(id),
  trip_id UUID NOT NULL REFERENCES trips(id) UNIQUE, -- one earnings record per trip
  gross_amount INTEGER NOT NULL,    -- full fare in TZS
  platform_fee INTEGER NOT NULL,    -- 20% to DalaSmart
  net_amount INTEGER NOT NULL,      -- 80% to driver
  paid_at TIMESTAMPTZ,              -- NULL = pending payout
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ratings_trip    ON trip_ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee   ON trip_ratings(ratee_id);
CREATE INDEX IF NOT EXISTS idx_ratings_rater   ON trip_ratings(rater_id);
CREATE INDEX IF NOT EXISTS idx_earnings_driver ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_earnings_trip   ON driver_earnings(trip_id);
