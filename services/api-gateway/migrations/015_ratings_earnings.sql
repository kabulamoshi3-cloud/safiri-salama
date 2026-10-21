-- Migration 015: Ratings + Driver Earnings
CREATE TABLE IF NOT EXISTS ratings (
  id         UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id    UUID     NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  rater_id   UUID     NOT NULL REFERENCES users(id),
  ratee_id   UUID     NOT NULL REFERENCES users(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (trip_id, rater_id)
);

CREATE INDEX IF NOT EXISTS idx_ratings_trip_id  ON ratings(trip_id);
CREATE INDEX IF NOT EXISTS idx_ratings_ratee_id ON ratings(ratee_id);

CREATE TABLE IF NOT EXISTS driver_earnings (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id         UUID    NOT NULL REFERENCES users(id),
  trip_id           UUID    NOT NULL UNIQUE REFERENCES trips(id),
  gross_amount      BIGINT  NOT NULL,
  commission_amount BIGINT  NOT NULL DEFAULT 0,
  net_amount        BIGINT  NOT NULL,
  payment_method    VARCHAR(20) NOT NULL DEFAULT 'cash',
  period_date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id
  ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_period
  ON driver_earnings(driver_id, period_date);
