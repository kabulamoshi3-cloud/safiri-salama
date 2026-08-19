-- =============================================================================
-- DalaSmart AI-Powered Mobility Platform
-- TimescaleDB Migration: vehicle_positions hypertable
-- Migration: 001_vehicle_positions.sql
--
-- This migration must run AFTER the PostgreSQL initial schema migration
-- (001_initial_schema.sql) because it references the vehicles table via
-- a logical foreign key (enforced at application layer, not DB level, to
-- avoid TimescaleDB hypertable FK limitations).
-- =============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- =============================================================================
-- VEHICLE POSITIONS TABLE
-- Stores every GPS position sample published by Driver Apps.
-- High write throughput — designed as a TimescaleDB hypertable partitioned
-- by time (timestamp) with a chunk interval of 1 day.
--
-- Matches the VehiclePosition interface in @dalasmart/shared-types.
-- =============================================================================

CREATE TABLE IF NOT EXISTS vehicle_positions (
    vehicle_id          UUID            NOT NULL,
    -- timestamp is the primary time dimension for the hypertable
    "timestamp"         TIMESTAMPTZ     NOT NULL,
    latitude            NUMERIC(10,7)   NOT NULL,
    longitude           NUMERIC(10,7)   NOT NULL,
    speed_kmh           NUMERIC(6,2)    NOT NULL DEFAULT 0
                        CHECK (speed_kmh >= 0),
    heading_degrees     SMALLINT        NOT NULL DEFAULT 0
                        CHECK (heading_degrees >= 0 AND heading_degrees <= 359),
    crowding_level      crowding_level  NOT NULL DEFAULT 'gray',
    seated_count        SMALLINT        NOT NULL DEFAULT 0 CHECK (seated_count >= 0),
    standing_count      SMALLINT        NOT NULL DEFAULT 0 CHECK (standing_count >= 0),
    is_full             BOOLEAN         NOT NULL DEFAULT FALSE,
    driver_online       BOOLEAN         NOT NULL DEFAULT TRUE,

    CONSTRAINT vp_lat_range CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT vp_lng_range CHECK (longitude BETWEEN -180 AND 180),

    -- Composite primary key required by TimescaleDB (time + partition key)
    PRIMARY KEY (vehicle_id, "timestamp")
);

-- =============================================================================
-- CONVERT TO HYPERTABLE
-- Partition by timestamp with 1-day chunks.
-- This is appropriate for the expected write rate (~1 row per vehicle per 15 s).
-- With ~500 vehicles that is ~2,880 rows/vehicle/day = ~1.44M rows/day total.
-- =============================================================================

SELECT create_hypertable(
    'vehicle_positions',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists       => TRUE
);

-- =============================================================================
-- SPACE PARTITIONING (optional second dimension)
-- Partition by vehicle_id hash into 4 partitions to spread I/O across disks.
-- Enable only if running TimescaleDB on multi-disk storage.
-- =============================================================================

-- SELECT add_dimension('vehicle_positions', 'vehicle_id', number_partitions => 4);

-- =============================================================================
-- INDEXES
-- TimescaleDB automatically creates a time-based index on the partitioning
-- column. Additional indexes below support common query patterns.
-- =============================================================================

-- Latest position per vehicle (used by SSE live feed and Operator Dashboard)
CREATE INDEX IF NOT EXISTS idx_vp_vehicle_time
    ON vehicle_positions (vehicle_id, "timestamp" DESC);

-- Geospatial queries (safety heatmap, trip deviation, geofence evaluation)
-- Using a functional index on a PostGIS point constructed from lat/lng.
-- Requires PostGIS extension (loaded in 001_initial_schema.sql).
CREATE INDEX IF NOT EXISTS idx_vp_location
    ON vehicle_positions USING GIST (
        ST_SetSRID(
            ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION),
            4326
        )
    );

-- Crowding level filter (used by Crowding Predictor and Passenger App map)
CREATE INDEX IF NOT EXISTS idx_vp_crowding
    ON vehicle_positions (crowding_level, "timestamp" DESC);

-- Speed filter (used by speed alert detection in Fleet Tracker)
CREATE INDEX IF NOT EXISTS idx_vp_speed
    ON vehicle_positions (vehicle_id, speed_kmh, "timestamp" DESC);

-- =============================================================================
-- CONTINUOUS AGGREGATE: latest_vehicle_positions
-- Materialised view of the most recent position per vehicle, refreshed every
-- 15 seconds. Used by the SSE live feed to avoid full table scans.
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS latest_vehicle_positions
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    last(latitude,        "timestamp") AS latitude,
    last(longitude,       "timestamp") AS longitude,
    last(speed_kmh,       "timestamp") AS speed_kmh,
    last(heading_degrees, "timestamp") AS heading_degrees,
    last(crowding_level,  "timestamp") AS crowding_level,
    last(seated_count,    "timestamp") AS seated_count,
    last(standing_count,  "timestamp") AS standing_count,
    last(is_full,         "timestamp") AS is_full,
    last(driver_online,   "timestamp") AS driver_online,
    max("timestamp")                   AS last_seen_at,
    time_bucket('15 seconds', "timestamp") AS bucket
FROM vehicle_positions
GROUP BY vehicle_id, bucket
WITH NO DATA;

-- Refresh policy: keep the aggregate up to date within 15 seconds
SELECT add_continuous_aggregate_policy(
    'latest_vehicle_positions',
    start_offset    => INTERVAL '1 minute',
    end_offset      => INTERVAL '15 seconds',
    schedule_interval => INTERVAL '15 seconds',
    if_not_exists   => TRUE
);

-- =============================================================================
-- CONTINUOUS AGGREGATE: hourly_vehicle_stats
-- Hourly rollup of vehicle activity for analytics and AI model training.
-- =============================================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_vehicle_stats
WITH (timescaledb.continuous) AS
SELECT
    vehicle_id,
    time_bucket('1 hour', "timestamp")  AS hour,
    COUNT(*)                            AS sample_count,
    AVG(speed_kmh)                      AS avg_speed_kmh,
    MAX(speed_kmh)                      AS max_speed_kmh,
    AVG(seated_count)                   AS avg_seated,
    AVG(standing_count)                 AS avg_standing,
    -- Crowding distribution
    COUNT(*) FILTER (WHERE crowding_level = 'green')  AS green_samples,
    COUNT(*) FILTER (WHERE crowding_level = 'orange') AS orange_samples,
    COUNT(*) FILTER (WHERE crowding_level = 'red')    AS red_samples,
    COUNT(*) FILTER (WHERE crowding_level = 'gray')   AS gray_samples
FROM vehicle_positions
GROUP BY vehicle_id, hour
WITH NO DATA;

SELECT add_continuous_aggregate_policy(
    'hourly_vehicle_stats',
    start_offset      => INTERVAL '2 hours',
    end_offset        => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists     => TRUE
);

-- =============================================================================
-- DATA RETENTION POLICY
-- Raw GPS positions are retained for 30 days (required for GPS playback,
-- Requirement 14.4). Hourly aggregates are retained for 2 years for
-- AI model training and analytics.
-- =============================================================================

SELECT add_retention_policy(
    'vehicle_positions',
    INTERVAL '30 days',
    if_not_exists => TRUE
);

SELECT add_retention_policy(
    'hourly_vehicle_stats',
    INTERVAL '730 days',
    if_not_exists => TRUE
);

-- =============================================================================
-- COMPRESSION POLICY
-- Compress chunks older than 7 days to reduce storage footprint.
-- Compressed chunks are still queryable via TimescaleDB decompression.
-- =============================================================================

ALTER TABLE vehicle_positions SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'vehicle_id',
    timescaledb.compress_orderby   = '"timestamp" DESC'
);

SELECT add_compression_policy(
    'vehicle_positions',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE vehicle_positions IS
    'TimescaleDB hypertable storing GPS position samples from Driver Apps. '
    'Partitioned by timestamp (1-day chunks). Compressed after 7 days. '
    'Retained for 30 days (raw) and 2 years (hourly aggregates).';

COMMENT ON MATERIALIZED VIEW latest_vehicle_positions IS
    'Continuous aggregate of the most recent GPS position per vehicle, '
    'refreshed every 15 seconds. Used by the SSE live feed.';

COMMENT ON MATERIALIZED VIEW hourly_vehicle_stats IS
    'Hourly rollup of vehicle activity for analytics and AI model training. '
    'Retained for 2 years.';
