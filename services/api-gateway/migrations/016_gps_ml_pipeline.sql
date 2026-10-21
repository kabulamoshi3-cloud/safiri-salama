-- Migration 016: GPS / ML Traffic Pipeline
-- Creates: gps_observations, road_segments, segment_speed_observations,
--          ml_model_versions, traffic_predictions_cache
-- Seeds:   12 Dar es Salaam road segments

-- ═══════════════════════════════════════════════
-- GPS OBSERVATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS gps_observations (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id        UUID         NOT NULL,
  trip_id          UUID,
  lat              DOUBLE PRECISION NOT NULL,
  lng              DOUBLE PRECISION NOT NULL,
  speed_kmh        DOUBLE PRECISION,
  heading          DOUBLE PRECISION,
  accuracy_m       DOUBLE PRECISION,
  obs_timestamp    TIMESTAMPTZ  NOT NULL,
  is_valid         BOOLEAN      NOT NULL DEFAULT false,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gps_obs_driver    ON gps_observations(driver_id);
CREATE INDEX IF NOT EXISTS idx_gps_obs_trip      ON gps_observations(trip_id);
CREATE INDEX IF NOT EXISTS idx_gps_obs_timestamp ON gps_observations(obs_timestamp);
CREATE INDEX IF NOT EXISTS idx_gps_obs_valid     ON gps_observations(is_valid);

-- ═══════════════════════════════════════════════
-- ROAD SEGMENTS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS road_segments (
  id          TEXT         PRIMARY KEY,
  road_name   TEXT         NOT NULL,
  lat_start   DOUBLE PRECISION NOT NULL,
  lng_start   DOUBLE PRECISION NOT NULL,
  lat_end     DOUBLE PRECISION NOT NULL,
  lng_end     DOUBLE PRECISION NOT NULL,
  length_m    INTEGER,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- Seed: 12 Dar es Salaam road segments
INSERT INTO road_segments (id, road_name, lat_start, lng_start, lat_end, lng_end, length_m) VALUES
  ('nyerere-n-001', 'Julius K. Nyerere Road (N)', -6.8100, 39.2750, -6.8020, 39.2720, 948),
  ('nyerere-s-001', 'Julius K. Nyerere Road (S)', -6.8235, 39.2695, -6.8150, 39.2730, 1020),
  ('morogoro-001',  'Morogoro Road (1)',           -6.8250, 39.2700, -6.8150, 39.2550, 1990),
  ('morogoro-002',  'Morogoro Road (2)',           -6.8150, 39.2550, -6.8050, 39.2450, 1565),
  ('sam-nujoma-001','Sam Nujoma Road',             -6.8150, 39.2650, -6.8050, 39.2820, 2180),
  ('bagamoyo-001',  'Bagamoyo Road',               -6.7750, 39.2400, -6.7600, 39.2250, 2345),
  ('ali-mwinyi-001','Ali Hassan Mwinyi Road',      -6.8120, 39.2680, -6.8020, 39.2750, 1350),
  ('mandela-001',   'Nelson Mandela Road',         -6.7600, 39.2350, -6.7450, 39.2550, 2760),
  ('kilwa-001',     'Kilwa Road',                  -6.8500, 39.2700, -6.8350, 39.2850, 2345),
  ('pugu-001',      'Pugu Road',                   -6.8700, 39.2500, -6.8550, 39.2650, 2345),
  ('bibi-titi-001', 'Bibi Titi Mohammed Road',     -6.8180, 39.2750, -6.8120, 39.2700,  865),
  ('kivukoni-001',  'Kivukoni Road',               -6.8230, 39.2850, -6.8180, 39.2800,  782)
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════
-- SEGMENT SPEED OBSERVATIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS segment_speed_observations (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id         TEXT         NOT NULL,
  day_of_week        INTEGER      NOT NULL,
  hour_of_day        INTEGER      NOT NULL,
  observed_speed_kmh DOUBLE PRECISION NOT NULL,
  trip_id            UUID,
  observed_at        TIMESTAMPTZ  NOT NULL,
  created_at         TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seg_speed_segment ON segment_speed_observations(segment_id);
CREATE INDEX IF NOT EXISTS idx_seg_speed_window  ON segment_speed_observations(day_of_week, hour_of_day);

-- ═══════════════════════════════════════════════
-- ML MODEL VERSIONS
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ml_model_versions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  model_type       TEXT,
  version          TEXT,
  training_samples INTEGER,
  accuracy_mae     DOUBLE PRECISION,
  trained_at       TIMESTAMPTZ,
  is_active        BOOLEAN,
  notes            TEXT
);

-- ═══════════════════════════════════════════════
-- TRAFFIC PREDICTIONS CACHE
-- ═══════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS traffic_predictions_cache (
  id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  segment_id          TEXT,
  predicted_for       TIMESTAMPTZ,
  predicted_speed_kmh DOUBLE PRECISION,
  confidence          DOUBLE PRECISION,
  model_version_id    UUID,
  model_type          TEXT,
  expires_at          TIMESTAMPTZ  NOT NULL,
  created_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_traffic_cache_segment ON traffic_predictions_cache(segment_id, predicted_for);
