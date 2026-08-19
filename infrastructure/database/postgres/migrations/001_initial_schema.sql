-- =============================================================================
-- DalaSmart AI-Powered Mobility Platform
-- PostgreSQL Initial Schema Migration
-- Migration: 001_initial_schema.sql
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";   -- for geographic queries

-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE user_type AS ENUM ('passenger', 'driver', 'operator', 'admin');
CREATE TYPE user_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE trust_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
CREATE TYPE verification_status AS ENUM ('pending', 'verified', 'rejected');
CREATE TYPE vehicle_type AS ENUM ('daladala', 'brt', 'boda-boda');
CREATE TYPE vehicle_status AS ENUM ('active', 'inactive', 'maintenance');
CREATE TYPE transaction_type AS ENUM ('fare', 'topup', 'payout', 'refund', 'cashback');
CREATE TYPE transaction_status AS ENUM ('pending', 'completed', 'failed', 'disputed');
CREATE TYPE mobile_money_provider AS ENUM ('mpesa', 'airtel', 'tigo');
CREATE TYPE incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE incident_status AS ENUM ('open', 'under_review', 'resolved', 'escalated');
CREATE TYPE transport_mode AS ENUM ('daladala', 'brt', 'boda-boda', 'walk');
CREATE TYPE crowding_level AS ENUM ('green', 'orange', 'red', 'gray');
CREATE TYPE supported_language AS ENUM ('sw', 'en');
CREATE TYPE notification_target AS ENUM ('passenger', 'driver', 'operator', 'admin', 'all');
CREATE TYPE trip_frequency AS ENUM ('daily', 'weekdays', 'custom');

-- =============================================================================
-- USERS TABLE
-- Base user record shared across all platform roles.
-- Phone (E.164 format) is the primary identifier.
-- =============================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type                user_type       NOT NULL,
    phone               VARCHAR(20)     NOT NULL,   -- E.164 format e.g. +255712345678
    name                VARCHAR(255)    NOT NULL,
    language            supported_language NOT NULL DEFAULT 'sw',
    status              user_status     NOT NULL DEFAULT 'active',
    created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT users_phone_unique UNIQUE (phone),
    CONSTRAINT users_phone_e164   CHECK (phone ~ '^\+[1-9]\d{6,14}$')
);

CREATE INDEX idx_users_type     ON users (type);
CREATE INDEX idx_users_status   ON users (status);
CREATE INDEX idx_users_phone    ON users (phone);
CREATE INDEX idx_users_created  ON users (created_at);

-- =============================================================================
-- PASSENGER PROFILES TABLE
-- Extends users for passengers; stores loyalty tier, saved places/routes, etc.
-- =============================================================================

CREATE TABLE passenger_profiles (
    id                  UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    trust_points        INTEGER         NOT NULL DEFAULT 0 CHECK (trust_points >= 0),
    tier                trust_tier      NOT NULL DEFAULT 'bronze',
    -- saved_places, saved_routes, emergency_contacts stored as JSONB arrays
    -- (max 20 saved places, max 20 saved routes, max 5 emergency contacts)
    saved_places        JSONB           NOT NULL DEFAULT '[]'::JSONB,
    saved_routes        JSONB           NOT NULL DEFAULT '[]'::JSONB,
    favorite_routes     UUID[]          NOT NULL DEFAULT '{}',   -- max 10 route IDs
    emergency_contacts  JSONB           NOT NULL DEFAULT '[]'::JSONB,

    CONSTRAINT pp_saved_places_max    CHECK (jsonb_array_length(saved_places) <= 20),
    CONSTRAINT pp_saved_routes_max    CHECK (jsonb_array_length(saved_routes) <= 20),
    CONSTRAINT pp_favorite_routes_max CHECK (array_length(favorite_routes, 1) IS NULL
                                             OR array_length(favorite_routes, 1) <= 10),
    CONSTRAINT pp_emergency_max       CHECK (jsonb_array_length(emergency_contacts) <= 5)
);

CREATE INDEX idx_passenger_profiles_tier ON passenger_profiles (tier);

-- =============================================================================
-- DRIVER PROFILES TABLE
-- Extends users for drivers; stores license, DRT score, verification status.
-- =============================================================================

CREATE TABLE driver_profiles (
    id                      UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    license_number          VARCHAR(100)        NOT NULL,
    vehicle_id              UUID,               -- FK added after vehicles table
    operator_id             UUID                NOT NULL,   -- FK to users (operator)
    drt_score               NUMERIC(5,2)        NOT NULL DEFAULT 50.00
                                                CHECK (drt_score >= 0 AND drt_score <= 100),
    verification_status     verification_status NOT NULL DEFAULT 'pending',
    women_only_verified     BOOLEAN             NOT NULL DEFAULT FALSE,

    CONSTRAINT dp_license_unique UNIQUE (license_number)
);

CREATE INDEX idx_driver_profiles_operator       ON driver_profiles (operator_id);
CREATE INDEX idx_driver_profiles_vehicle        ON driver_profiles (vehicle_id);
CREATE INDEX idx_driver_profiles_drt_score      ON driver_profiles (drt_score);
CREATE INDEX idx_driver_profiles_verification   ON driver_profiles (verification_status);

-- =============================================================================
-- VEHICLES TABLE
-- Vehicles registered on the platform.
-- =============================================================================

CREATE TABLE vehicles (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operator_id                 UUID            NOT NULL REFERENCES users (id),
    registration_number         VARCHAR(50)     NOT NULL,
    type                        vehicle_type    NOT NULL,
    route_id                    UUID,           -- FK added after routes table
    status                      vehicle_status  NOT NULL DEFAULT 'active',
    insurance_expiry            DATE            NOT NULL,
    roadworthiness_expiry       DATE            NOT NULL,
    created_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT vehicles_reg_unique UNIQUE (registration_number)
);

CREATE INDEX idx_vehicles_operator  ON vehicles (operator_id);
CREATE INDEX idx_vehicles_status    ON vehicles (status);
CREATE INDEX idx_vehicles_type      ON vehicles (type);
CREATE INDEX idx_vehicles_route     ON vehicles (route_id);

-- Add deferred FK from driver_profiles to vehicles
ALTER TABLE driver_profiles
    ADD CONSTRAINT fk_driver_vehicle
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE SET NULL;

-- =============================================================================
-- STOPS TABLE
-- Transit stops on routes.
-- =============================================================================

CREATE TABLE stops (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(255)    NOT NULL,
    name_swahili            VARCHAR(255)    NOT NULL,
    latitude                NUMERIC(10,7)   NOT NULL,
    longitude               NUMERIC(10,7)   NOT NULL,
    accessibility_features  TEXT[]          NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT stops_lat_range  CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT stops_lng_range  CHECK (longitude BETWEEN -180 AND 180)
);

CREATE INDEX idx_stops_location ON stops USING GIST (
    ST_SetSRID(ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION), 4326)
);

-- =============================================================================
-- ROUTES TABLE
-- Transit routes operated on the platform.
-- =============================================================================

CREATE TABLE routes (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name                    VARCHAR(255)    NOT NULL,
    name_swahili            VARCHAR(255)    NOT NULL,
    type                    vehicle_type    NOT NULL,
    -- stops stored as ordered array of stop UUIDs
    stop_ids                UUID[]          NOT NULL DEFAULT '{}',
    -- polyline stored as ordered JSONB array of {latitude, longitude} objects
    polyline                JSONB           NOT NULL DEFAULT '[]'::JSONB,
    fare_table_id           UUID,           -- FK added after fare_tables
    safety_rating           NUMERIC(3,2)    NOT NULL DEFAULT 3.00
                                            CHECK (safety_rating >= 0 AND safety_rating <= 5),
    accessibility_features  TEXT[]          NOT NULL DEFAULT '{}',
    created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_routes_type            ON routes (type);
CREATE INDEX idx_routes_safety_rating   ON routes (safety_rating);
CREATE INDEX idx_routes_name            ON routes USING GIN (to_tsvector('english', name));

-- Add deferred FK from vehicles to routes
ALTER TABLE vehicles
    ADD CONSTRAINT fk_vehicle_route
    FOREIGN KEY (route_id) REFERENCES routes (id) ON DELETE SET NULL;

-- =============================================================================
-- FARE TABLES
-- Fare definitions per route (flat fare + optional per-segment overrides).
-- =============================================================================

CREATE TABLE fare_tables (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    route_id            UUID            NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    flat_fare_tzs       INTEGER         NOT NULL CHECK (flat_fare_tzs > 0),
    -- segment_fares: JSONB map of "fromStopId:toStopId" -> fare in TZS
    segment_fares       JSONB           NOT NULL DEFAULT '{}'::JSONB,
    effective_from      TIMESTAMPTZ     NOT NULL,
    effective_to        TIMESTAMPTZ,

    CONSTRAINT fare_tables_date_order CHECK (
        effective_to IS NULL OR effective_to > effective_from
    )
);

CREATE INDEX idx_fare_tables_route          ON fare_tables (route_id);
CREATE INDEX idx_fare_tables_effective_from ON fare_tables (effective_from);

-- Add FK from routes to fare_tables
ALTER TABLE routes
    ADD CONSTRAINT fk_route_fare_table
    FOREIGN KEY (fare_table_id) REFERENCES fare_tables (id) ON DELETE SET NULL;

-- =============================================================================
-- WALLETS TABLE
-- Passenger digital wallets. All amounts in Tanzanian Shillings (TZS).
-- =============================================================================

CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    balance_tzs     BIGINT          NOT NULL DEFAULT 0 CHECK (balance_tzs >= 0),
    currency        CHAR(3)         NOT NULL DEFAULT 'TZS',
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT wallets_user_unique  UNIQUE (user_id),
    CONSTRAINT wallets_currency     CHECK (currency = 'TZS')
);

CREATE INDEX idx_wallets_user ON wallets (user_id);

-- =============================================================================
-- TRANSACTIONS TABLE
-- Financial transactions recorded by the Payment Service.
-- =============================================================================

CREATE TABLE transactions (
    id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type                    transaction_type    NOT NULL,
    wallet_id               UUID                NOT NULL REFERENCES wallets (id),
    amount_tzs              BIGINT              NOT NULL CHECK (amount_tzs > 0),
    status                  transaction_status  NOT NULL DEFAULT 'pending',
    route_id                UUID                REFERENCES routes (id) ON DELETE SET NULL,
    vehicle_id              UUID                REFERENCES vehicles (id) ON DELETE SET NULL,
    mobile_money_provider   mobile_money_provider,
    mobile_money_ref        VARCHAR(100),
    created_at              TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    completed_at            TIMESTAMPTZ,

    CONSTRAINT txn_completed_after_created CHECK (
        completed_at IS NULL OR completed_at >= created_at
    ),
    CONSTRAINT txn_mobile_money_ref_requires_provider CHECK (
        mobile_money_ref IS NULL OR mobile_money_provider IS NOT NULL
    )
);

CREATE INDEX idx_transactions_wallet        ON transactions (wallet_id);
CREATE INDEX idx_transactions_status        ON transactions (status);
CREATE INDEX idx_transactions_type          ON transactions (type);
CREATE INDEX idx_transactions_created       ON transactions (created_at DESC);
CREATE INDEX idx_transactions_route         ON transactions (route_id);
CREATE INDEX idx_transactions_vehicle       ON transactions (vehicle_id);

-- =============================================================================
-- QR PAYMENT TOKENS TABLE
-- Single-use, HMAC-signed QR tokens. Valid for 5 minutes.
-- =============================================================================

CREATE TABLE qr_payment_tokens (
    token_id        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id    UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    route_id        UUID            NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
    amount_tzs      BIGINT          NOT NULL CHECK (amount_tzs > 0),
    hmac_signature  VARCHAR(64)     NOT NULL,   -- HMAC-SHA256 hex digest
    expires_at      TIMESTAMPTZ     NOT NULL,
    used            BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT qr_expires_after_created CHECK (expires_at > created_at)
);

CREATE INDEX idx_qr_tokens_passenger    ON qr_payment_tokens (passenger_id);
CREATE INDEX idx_qr_tokens_expires      ON qr_payment_tokens (expires_at);
CREATE INDEX idx_qr_tokens_used         ON qr_payment_tokens (used) WHERE used = FALSE;

-- =============================================================================
-- INCIDENT REPORTS TABLE
-- Safety and service incident reports submitted by passengers or drivers.
-- =============================================================================

CREATE TABLE incident_reports (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id         UUID                NOT NULL REFERENCES users (id),
    reporter_type       user_type           NOT NULL
                        CHECK (reporter_type IN ('passenger', 'driver')),
    vehicle_id          UUID                REFERENCES vehicles (id) ON DELETE SET NULL,
    driver_id           UUID                REFERENCES users (id) ON DELETE SET NULL,
    latitude            NUMERIC(10,7)       NOT NULL,
    longitude           NUMERIC(10,7)       NOT NULL,
    description         TEXT                NOT NULL,
    severity            incident_severity   NOT NULL,
    status              incident_status     NOT NULL DEFAULT 'open',
    -- attachments: JSONB array of Attachment objects
    -- combined size enforced at application layer (≤50 MB)
    attachments         JSONB               NOT NULL DEFAULT '[]'::JSONB,
    ai_confidence_score NUMERIC(4,3)        NOT NULL DEFAULT 0
                        CHECK (ai_confidence_score >= 0 AND ai_confidence_score <= 1),
    created_at          TIMESTAMPTZ         NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,

    CONSTRAINT ir_lat_range CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT ir_lng_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT ir_resolved_after_created CHECK (
        resolved_at IS NULL OR resolved_at >= created_at
    )
);

CREATE INDEX idx_incident_reports_reporter  ON incident_reports (reporter_id);
CREATE INDEX idx_incident_reports_severity  ON incident_reports (severity);
CREATE INDEX idx_incident_reports_status    ON incident_reports (status);
CREATE INDEX idx_incident_reports_vehicle   ON incident_reports (vehicle_id);
CREATE INDEX idx_incident_reports_driver    ON incident_reports (driver_id);
CREATE INDEX idx_incident_reports_created   ON incident_reports (created_at DESC);
CREATE INDEX idx_incident_reports_location  ON incident_reports USING GIST (
    ST_SetSRID(ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION), 4326)
);

-- =============================================================================
-- EMERGENCY EVENTS TABLE
-- Emergency events triggered by passengers or drivers pressing the emergency button.
-- =============================================================================

CREATE TABLE emergency_events (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    initiator_id        UUID            NOT NULL REFERENCES users (id),
    initiator_type      user_type       NOT NULL
                        CHECK (initiator_type IN ('passenger', 'driver')),
    vehicle_id          UUID            REFERENCES vehicles (id) ON DELETE SET NULL,
    latitude            NUMERIC(10,7)   NOT NULL,
    longitude           NUMERIC(10,7)   NOT NULL,
    audio_storage_key   TEXT,           -- S3-compatible object key for audio recording
    alerted_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    resolved_at         TIMESTAMPTZ,

    CONSTRAINT ee_lat_range CHECK (latitude  BETWEEN -90  AND 90),
    CONSTRAINT ee_lng_range CHECK (longitude BETWEEN -180 AND 180),
    CONSTRAINT ee_resolved_after_alerted CHECK (
        resolved_at IS NULL OR resolved_at >= alerted_at
    )
);

CREATE INDEX idx_emergency_events_initiator ON emergency_events (initiator_id);
CREATE INDEX idx_emergency_events_vehicle   ON emergency_events (vehicle_id);
CREATE INDEX idx_emergency_events_alerted   ON emergency_events (alerted_at DESC);
CREATE INDEX idx_emergency_events_location  ON emergency_events USING GIST (
    ST_SetSRID(ST_MakePoint(longitude::DOUBLE PRECISION, latitude::DOUBLE PRECISION), 4326)
);

-- =============================================================================
-- TRIP PLANS TABLE
-- Multi-modal trip plans generated by the Trip Planner Service.
-- =============================================================================

CREATE TABLE trip_plans (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id    UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    origin_lat      NUMERIC(10,7)   NOT NULL,
    origin_lng      NUMERIC(10,7)   NOT NULL,
    destination_lat NUMERIC(10,7)   NOT NULL,
    destination_lng NUMERIC(10,7)   NOT NULL,
    -- options: JSONB array of TripOption objects (at least 3 ranked options)
    options         JSONB           NOT NULL DEFAULT '[]'::JSONB,
    requested_at    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT tp_origin_lat_range      CHECK (origin_lat      BETWEEN -90  AND 90),
    CONSTRAINT tp_origin_lng_range      CHECK (origin_lng      BETWEEN -180 AND 180),
    CONSTRAINT tp_destination_lat_range CHECK (destination_lat BETWEEN -90  AND 90),
    CONSTRAINT tp_destination_lng_range CHECK (destination_lng BETWEEN -180 AND 180),
    CONSTRAINT tp_min_options           CHECK (jsonb_array_length(options) >= 3)
);

CREATE INDEX idx_trip_plans_passenger   ON trip_plans (passenger_id);
CREATE INDEX idx_trip_plans_requested   ON trip_plans (requested_at DESC);

-- =============================================================================
-- RECURRING TRIP SCHEDULES TABLE
-- Recurring trip schedules saved by passengers.
-- =============================================================================

CREATE TABLE recurring_trip_schedules (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    passenger_id    UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    trip_plan_id    UUID            NOT NULL REFERENCES trip_plans (id) ON DELETE CASCADE,
    frequency       trip_frequency  NOT NULL,
    -- custom_days: array of integers 0-6 (0=Sunday, 6=Saturday)
    custom_days     SMALLINT[]      DEFAULT NULL,
    departure_time  TIME            NOT NULL,   -- local time HH:MM
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

    CONSTRAINT rts_custom_days_required CHECK (
        frequency != 'custom' OR (custom_days IS NOT NULL AND array_length(custom_days, 1) > 0)
    )
);

CREATE INDEX idx_recurring_schedules_passenger  ON recurring_trip_schedules (passenger_id);
CREATE INDEX idx_recurring_schedules_active     ON recurring_trip_schedules (active) WHERE active = TRUE;

-- =============================================================================
-- DRT SCORE BREAKDOWNS TABLE
-- Stores the latest DRT score breakdown per driver.
-- =============================================================================

CREATE TABLE drt_score_breakdowns (
    id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    driver_id                   UUID            NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    composite_score             NUMERIC(5,2)    NOT NULL
                                CHECK (composite_score >= 0 AND composite_score <= 100),
    safety_rating               NUMERIC(5,2)    NOT NULL
                                CHECK (safety_rating >= 0 AND safety_rating <= 100),
    punctuality_rating          NUMERIC(5,2)    NOT NULL
                                CHECK (punctuality_rating >= 0 AND punctuality_rating <= 100),
    passenger_feedback_rating   NUMERIC(5,2)    NOT NULL
                                CHECK (passenger_feedback_rating >= 0 AND passenger_feedback_rating <= 100),
    calculated_at               TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_drt_score_driver       ON drt_score_breakdowns (driver_id);
CREATE INDEX idx_drt_score_calculated   ON drt_score_breakdowns (calculated_at DESC);

-- =============================================================================
-- AUDIT LOG TABLE
-- Immutable audit log of every administrative action.
-- No UPDATE or DELETE allowed (enforced via trigger below).
-- =============================================================================

CREATE TABLE audit_log (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id            UUID            NOT NULL REFERENCES users (id),
    action              VARCHAR(255)    NOT NULL,
    affected_account_id UUID            NOT NULL REFERENCES users (id),
    reason              TEXT            NOT NULL,
    timestamp           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_admin        ON audit_log (admin_id);
CREATE INDEX idx_audit_log_affected     ON audit_log (affected_account_id);
CREATE INDEX idx_audit_log_timestamp    ON audit_log (timestamp DESC);

-- Prevent UPDATE and DELETE on audit_log to ensure immutability
CREATE OR REPLACE FUNCTION audit_log_immutable()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'audit_log rows are immutable and cannot be modified or deleted';
END;
$$;

CREATE TRIGGER trg_audit_log_no_update
    BEFORE UPDATE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

CREATE TRIGGER trg_audit_log_no_delete
    BEFORE DELETE ON audit_log
    FOR EACH ROW EXECUTE FUNCTION audit_log_immutable();

-- =============================================================================
-- ANNOUNCEMENTS TABLE
-- Bilingual platform announcements requiring two-admin approval.
-- =============================================================================

CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title_en        VARCHAR(500)        NOT NULL,
    title_sw        VARCHAR(500)        NOT NULL,
    body_en         TEXT                NOT NULL,
    body_sw         TEXT                NOT NULL,
    target          notification_target NOT NULL,
    published_at    TIMESTAMPTZ,
    expires_at      TIMESTAMPTZ,
    -- approved_by: array of exactly 0 or 2 admin user UUIDs
    approved_by     UUID[]              NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ         NOT NULL DEFAULT NOW(),

    CONSTRAINT announcements_approved_by_count CHECK (
        array_length(approved_by, 1) IS NULL OR array_length(approved_by, 1) = 2
    ),
    CONSTRAINT announcements_expires_after_published CHECK (
        expires_at IS NULL OR published_at IS NULL OR expires_at > published_at
    )
);

CREATE INDEX idx_announcements_target       ON announcements (target);
CREATE INDEX idx_announcements_published    ON announcements (published_at);

-- =============================================================================
-- SAFETY TIPS TABLE
-- Bilingual safety tips displayed in the Passenger App.
-- =============================================================================

CREATE TABLE safety_tips (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_en      TEXT        NOT NULL,
    content_sw      TEXT        NOT NULL,
    schedule_tag    VARCHAR(100),
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_safety_tips_active ON safety_tips (active) WHERE active = TRUE;

-- =============================================================================
-- FAQ ENTRIES TABLE
-- Bilingual FAQ entries used as the AI chatbot knowledge base.
-- =============================================================================

CREATE TABLE faq_entries (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_en     TEXT        NOT NULL,
    question_sw     TEXT        NOT NULL,
    answer_en       TEXT        NOT NULL,
    answer_sw       TEXT        NOT NULL,
    category        VARCHAR(100) NOT NULL,
    active          BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_faq_entries_category   ON faq_entries (category);
CREATE INDEX idx_faq_entries_active     ON faq_entries (active) WHERE active = TRUE;
CREATE INDEX idx_faq_entries_search_en  ON faq_entries USING GIN (
    to_tsvector('english', question_en || ' ' || answer_en)
);

-- =============================================================================
-- UPDATED_AT TRIGGER FUNCTION
-- Automatically updates the updated_at column on row modification.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_vehicles_updated_at
    BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_stops_updated_at
    BEFORE UPDATE ON stops
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_routes_updated_at
    BEFORE UPDATE ON routes
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- ROW-LEVEL SECURITY (RLS) — enable on sensitive tables
-- Application roles should be granted appropriate policies.
-- =============================================================================

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallets              ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_payment_tokens    ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports     ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE users                  IS 'Base user record for all platform roles (passenger, driver, operator, admin).';
COMMENT ON TABLE passenger_profiles     IS 'Passenger-specific profile data extending users.';
COMMENT ON TABLE driver_profiles        IS 'Driver-specific profile data extending users.';
COMMENT ON TABLE vehicles               IS 'Vehicles registered on the DalaSmart platform.';
COMMENT ON TABLE stops                  IS 'Transit stops referenced by routes.';
COMMENT ON TABLE routes                 IS 'Transit routes operated on the platform.';
COMMENT ON TABLE fare_tables            IS 'Fare definitions per route with optional per-segment overrides.';
COMMENT ON TABLE wallets                IS 'Passenger digital wallets; all amounts in TZS.';
COMMENT ON TABLE transactions           IS 'Financial transactions recorded by the Payment Service.';
COMMENT ON TABLE qr_payment_tokens      IS 'Single-use HMAC-signed QR tokens valid for 5 minutes.';
COMMENT ON TABLE incident_reports       IS 'Safety and service incident reports with media attachments.';
COMMENT ON TABLE emergency_events       IS 'Emergency events triggered via the emergency button.';
COMMENT ON TABLE trip_plans             IS 'Multi-modal trip plans generated by the Trip Planner Service.';
COMMENT ON TABLE recurring_trip_schedules IS 'Recurring trip schedules saved by passengers.';
COMMENT ON TABLE drt_score_breakdowns   IS 'Driver Reputation and Trust Score breakdowns.';
COMMENT ON TABLE audit_log              IS 'Immutable audit log of all administrative actions.';
COMMENT ON TABLE announcements          IS 'Bilingual platform announcements requiring two-admin approval.';
COMMENT ON TABLE safety_tips            IS 'Bilingual safety tips displayed in the Passenger App.';
COMMENT ON TABLE faq_entries            IS 'Bilingual FAQ entries used as the AI chatbot knowledge base.';

-- =============================================================================
-- FARE CONFIGS TABLE (NEW from RoadPulse)
-- Dynamic fare pricing configuration per transport mode.
-- Allows admin to update fares without code changes.
-- =============================================================================

CREATE TABLE fare_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mode            transport_mode  UNIQUE NOT NULL,
    base_fare       NUMERIC(10,2)   NOT NULL DEFAULT 0,
    cost_per_km     NUMERIC(10,2)   NOT NULL DEFAULT 0,
    cost_per_min    NUMERIC(10,2)   NOT NULL DEFAULT 0,
    avg_speed_kmh   NUMERIC(5,2)    NOT NULL DEFAULT 30,
    currency        CHAR(3)         NOT NULL DEFAULT 'TZS',
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fc_base_fare_positive    CHECK (base_fare >= 0),
    CONSTRAINT fc_cost_per_km_positive  CHECK (cost_per_km >= 0),
    CONSTRAINT fc_cost_per_min_positive CHECK (cost_per_min >= 0),
    CONSTRAINT fc_avg_speed_positive    CHECK (avg_speed_kmh > 0),
    CONSTRAINT fc_currency              CHECK (currency = 'TZS')
);

CREATE INDEX idx_fare_configs_mode ON fare_configs (mode);

CREATE TRIGGER trg_fare_configs_updated_at
    BEFORE UPDATE ON fare_configs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMENT ON TABLE fare_configs IS 'Dynamic fare pricing configuration per transport mode for cost estimation.';

-- Seed fare configs with Dar es Salaam starting values
INSERT INTO fare_configs (mode, base_fare, cost_per_km, cost_per_min, avg_speed_kmh) VALUES
    ('daladala', 500,  60,  0,  25),
    ('brt',      800,  80,  0,  30),
    ('boda-boda', 0,  120, 0,  40),
    ('walk',      0,   0,  0,  5)
ON CONFLICT (mode) DO NOTHING;

-- =============================================================================
-- TRIP POINTS TABLE (NEW from RoadPulse)
-- GPS history for completed trips. Uses PostGIS for spatial queries.
-- Enables trip replay and route deviation analysis.
-- =============================================================================

CREATE TABLE trip_points (
    id              BIGSERIAL PRIMARY KEY,
    trip_id         UUID                REFERENCES trip_plans (id) ON DELETE CASCADE,
    vehicle_id      UUID                REFERENCES vehicles (id) ON DELETE SET NULL,
    location        GEOGRAPHY(POINT, 4326) NOT NULL,
    speed_kmh       NUMERIC(5,2)        CHECK (speed_kmh >= 0),
    heading         NUMERIC(5,2)        CHECK (heading >= 0 AND heading < 360),
    recorded_at     TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_trip_points_trip       ON trip_points (trip_id, recorded_at);
CREATE INDEX idx_trip_points_vehicle    ON trip_points (vehicle_id, recorded_at);
CREATE INDEX idx_trip_points_location   ON trip_points USING GIST (location);
CREATE INDEX idx_trip_points_recorded   ON trip_points (recorded_at DESC);

COMMENT ON TABLE trip_points IS 'GPS point history for trip replay and route analysis using PostGIS.';

-- =============================================================================
-- FARE CONFIG TIME MULTIPLIERS TABLE (NEW Enhancement)
-- Time-of-day and special event fare multipliers.
-- =============================================================================

CREATE TABLE fare_time_multipliers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(100)    NOT NULL,
    mode            transport_mode,
    multiplier      NUMERIC(4,2)    NOT NULL CHECK (multiplier > 0),
    start_time      TIME            NOT NULL,
    end_time        TIME            NOT NULL,
    days_of_week    SMALLINT[]      NOT NULL,
    active          BOOLEAN         NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    
    CONSTRAINT ftm_time_order CHECK (end_time > start_time),
    CONSTRAINT ftm_days_valid CHECK (
        array_length(days_of_week, 1) IS NULL OR 
        (SELECT bool_and(d >= 0 AND d <= 6) FROM unnest(days_of_week) AS d)
    )
);

CREATE INDEX idx_fare_time_multipliers_mode   ON fare_time_multipliers (mode);
CREATE INDEX idx_fare_time_multipliers_active ON fare_time_multipliers (active) WHERE active = TRUE;

COMMENT ON TABLE fare_time_multipliers IS 'Time-of-day and day-of-week fare multipliers (e.g., peak hour surge).';

-- Seed with common peak hour multipliers
INSERT INTO fare_time_multipliers (name, mode, multiplier, start_time, end_time, days_of_week) VALUES
    ('Morning Peak - All Modes', NULL, 1.25, '06:00', '09:00', ARRAY[1,2,3,4,5]),
    ('Evening Peak - All Modes', NULL, 1.25, '16:00', '19:00', ARRAY[1,2,3,4,5])
ON CONFLICT DO NOTHING;

-- =============================================================================
-- FARE CONFIG AUDIT TABLE
-- Track all changes to fare configurations for compliance.
-- =============================================================================

CREATE TABLE fare_config_audit (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fare_config_id  UUID            NOT NULL REFERENCES fare_configs (id) ON DELETE CASCADE,
    admin_id        UUID            NOT NULL REFERENCES users (id),
    action          VARCHAR(50)     NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    old_values      JSONB,
    new_values      JSONB           NOT NULL,
    timestamp       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fare_config_audit_config   ON fare_config_audit (fare_config_id);
CREATE INDEX idx_fare_config_audit_admin    ON fare_config_audit (admin_id);
CREATE INDEX idx_fare_config_audit_time     ON fare_config_audit (timestamp DESC);

COMMENT ON TABLE fare_config_audit IS 'Audit log for all fare configuration changes.';

-- =============================================================================
-- End of schema
-- =============================================================================
