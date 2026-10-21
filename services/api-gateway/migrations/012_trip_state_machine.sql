-- Migration 012: Trip State Machine
-- Run: node scripts/migrate.js $DATABASE_URL
--
-- State machine transitions:
--   REQUESTED  → ACCEPTED      (driver accepts)
--   REQUESTED  → CANCELLED     (passenger or driver)
--   ACCEPTED   → DRIVER_ARRIVING (driver en route)
--   ACCEPTED   → CANCELLED     (passenger or driver)
--   DRIVER_ARRIVING → ARRIVED  (driver at pickup)
--   DRIVER_ARRIVING → CANCELLED (driver only)
--   ARRIVED    → IN_PROGRESS   (driver starts trip)
--   ARRIVED    → CANCELLED     (driver only — intentional; covers driver no-show
--                                scenarios where the passenger does not board.
--                                Requires a cancellation_reason in the API.)
--   IN_PROGRESS → COMPLETED    (driver completes trip)
--   COMPLETED  → (terminal)
--   CANCELLED  → (terminal)

-- ============================================================================
-- TRIP STATE LOGS
-- Audit trail of every state transition for a trip.
-- ============================================================================
CREATE TABLE IF NOT EXISTS trip_state_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id     UUID NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_state  VARCHAR(30),
  to_state    VARCHAR(30) NOT NULL,
  actor_id    UUID NOT NULL,
  actor_type  VARCHAR(20) NOT NULL,
  note        TEXT,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_state_logs_trip_id    ON trip_state_logs(trip_id);
CREATE INDEX IF NOT EXISTS idx_trip_state_logs_created_at ON trip_state_logs(created_at);

-- ============================================================================
-- Extend trips table with state machine columns
-- ============================================================================
ALTER TABLE trips ADD COLUMN IF NOT EXISTS arrived_at         TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS driver_arriving_at TIMESTAMP;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS started_at         TIMESTAMP;

-- Normalise existing 'pending' rows to 'REQUESTED' (safe, additive)
UPDATE trips SET status = 'REQUESTED' WHERE status = 'pending';

-- Prevent a passenger from having more than one active trip at a time.
-- The partial index only covers rows in active statuses, so it is a no-op
-- for terminal (COMPLETED, CANCELLED) rows and allows historical records.
CREATE UNIQUE INDEX IF NOT EXISTS trips_one_active_per_passenger
  ON trips (passenger_id)
  WHERE status IN ('REQUESTED','ACCEPTED','DRIVER_ARRIVING','ARRIVED','IN_PROGRESS');

COMMENT ON TABLE trip_state_logs IS 'Audit log of every trip state transition; used by the polling endpoint';
