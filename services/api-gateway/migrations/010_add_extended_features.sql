-- Migration: Extended Platform Features
-- Shop Delivery, In-App Advertising, Money Transfer, Insurance, University Marketplace
-- Run: psql dalasmart_db < migrations/010_add_extended_features.sql

-- ============================================================================
-- SHOP & GROCERY DELIVERY
-- ============================================================================

CREATE TABLE IF NOT EXISTS shops (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID REFERENCES users(id) ON DELETE SET NULL,
  name                VARCHAR(150) NOT NULL,
  description         TEXT,
  category            VARCHAR(50) NOT NULL DEFAULT 'other',
  address             TEXT NOT NULL,
  latitude            DECIMAL(10,7),
  longitude           DECIMAL(10,7),
  logo_url            TEXT,
  delivery_fee        INTEGER NOT NULL DEFAULT 500,
  min_order_amount    INTEGER NOT NULL DEFAULT 1000,
  delivery_time_min   INTEGER NOT NULL DEFAULT 15,
  delivery_time_max   INTEGER NOT NULL DEFAULT 45,
  is_open             BOOLEAN NOT NULL DEFAULT true,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_university_vendor BOOLEAN NOT NULL DEFAULT false,
  university_name     VARCHAR(150),
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shops_category     ON shops(category);
CREATE INDEX IF NOT EXISTS idx_shops_university   ON shops(is_university_vendor);
CREATE INDEX IF NOT EXISTS idx_shops_location     ON shops(latitude, longitude);

CREATE TABLE IF NOT EXISTS shop_products (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  price           INTEGER NOT NULL,
  image_url       TEXT,
  category        VARCHAR(80),
  stock_quantity  INTEGER NOT NULL DEFAULT 0,
  weight_kg       DECIMAL(5,2),
  available       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_products_shop ON shop_products(shop_id);

CREATE TABLE IF NOT EXISTS shop_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     VARCHAR(30) UNIQUE NOT NULL,
  user_id          UUID NOT NULL REFERENCES users(id),
  shop_id          UUID NOT NULL REFERENCES shops(id),
  driver_id        UUID REFERENCES users(id),
  items            JSONB NOT NULL DEFAULT '[]',
  subtotal         INTEGER NOT NULL,
  delivery_fee     INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_lat     DECIMAL(10,7),
  delivery_lng     DECIMAL(10,7),
  notes            TEXT,
  payment_method   VARCHAR(30) DEFAULT 'wallet',
  status           VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','picking','in_transit','delivered','cancelled')),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shop_orders_user   ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_shop   ON shop_orders(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);

CREATE TABLE IF NOT EXISTS shop_ratings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    UUID NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id),
  order_id   UUID NOT NULL REFERENCES shop_orders(id),
  rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review     TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, order_id)
);

-- ============================================================================
-- IN-APP ADVERTISING
-- ============================================================================

CREATE TABLE IF NOT EXISTS ad_campaigns (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                VARCHAR(100) NOT NULL,
  description          TEXT,
  image_url            TEXT NOT NULL,
  cta_text             VARCHAR(50) DEFAULT 'Learn More',
  cta_url              TEXT NOT NULL,
  placement            VARCHAR(30) NOT NULL DEFAULT 'home_banner'
                       CHECK (placement IN ('home_banner','trip_complete','map_overlay','feed_card','push_promo')),
  target_audience      VARCHAR(20) DEFAULT 'all'
                       CHECK (target_audience IN ('all','passengers','drivers','students','corporate')),
  budget_tzs           INTEGER NOT NULL,
  cost_per_click       INTEGER NOT NULL DEFAULT 200,
  cost_per_impression  INTEGER NOT NULL DEFAULT 10,
  total_impressions    INTEGER NOT NULL DEFAULT 0,
  total_clicks         INTEGER NOT NULL DEFAULT 0,
  total_spent          INTEGER NOT NULL DEFAULT 0,
  start_date           TIMESTAMP NOT NULL,
  end_date             TIMESTAMP NOT NULL,
  status               VARCHAR(20) NOT NULL DEFAULT 'pending_review'
                       CHECK (status IN ('draft','pending_review','active','paused','completed','rejected')),
  created_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status    ON ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_placement ON ad_campaigns(placement);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates     ON ad_campaigns(start_date, end_date);

CREATE TABLE IF NOT EXISTS ad_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id      UUID NOT NULL REFERENCES ad_campaigns(id) ON DELETE CASCADE,
  event_type VARCHAR(15) NOT NULL CHECK (event_type IN ('impression','click')),
  user_id    UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad_id ON ad_events(ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_date  ON ad_events(created_at);

-- ============================================================================
-- MONEY TRANSFER
-- ============================================================================

CREATE TABLE IF NOT EXISTS money_transfers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference       VARCHAR(30) UNIQUE NOT NULL,
  sender_id       UUID REFERENCES users(id),
  recipient_id    UUID REFERENCES users(id),
  amount          INTEGER NOT NULL,
  fee             INTEGER NOT NULL DEFAULT 0,
  transfer_type   VARCHAR(20) NOT NULL
                  CHECK (transfer_type IN ('wallet_to_wallet','wallet_to_mobile','mobile_to_wallet','bill_payment')),
  mobile_provider VARCHAR(20),
  mobile_number   VARCHAR(20),
  note            TEXT,
  status          VARCHAR(15) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','processing','completed','failed','reversed')),
  created_at      TIMESTAMP DEFAULT NOW(),
  completed_at    TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_money_transfers_sender    ON money_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_money_transfers_recipient ON money_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_money_transfers_status    ON money_transfers(status);
CREATE INDEX IF NOT EXISTS idx_money_transfers_date      ON money_transfers(created_at);

-- ============================================================================
-- INSURANCE
-- ============================================================================

CREATE TABLE IF NOT EXISTS insurance_policies (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_number             VARCHAR(30) UNIQUE NOT NULL,
  user_id                   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_type                 VARCHAR(25) NOT NULL
                            CHECK (plan_type IN ('trip_cover','monthly_passenger','driver_vehicle','health_basic','health_premium')),
  premium_paid              INTEGER NOT NULL DEFAULT 0,
  beneficiary_name          VARCHAR(100),
  beneficiary_phone         VARCHAR(20),
  beneficiary_relationship  VARCHAR(50),
  expires_at                TIMESTAMP,
  status                    VARCHAR(10) NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active','expired','cancelled')),
  created_at                TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_policies_user   ON insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON insurance_policies(status);

CREATE TABLE IF NOT EXISTS insurance_claims (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  claim_number          VARCHAR(30) UNIQUE NOT NULL,
  policy_id             UUID NOT NULL REFERENCES insurance_policies(id),
  user_id               UUID NOT NULL REFERENCES users(id),
  trip_id               UUID REFERENCES trips(id),
  incident_type         VARCHAR(50) NOT NULL,
  incident_description  TEXT NOT NULL,
  incident_date         DATE NOT NULL,
  claim_amount          INTEGER NOT NULL,
  approved_amount       INTEGER,
  supporting_documents  JSONB DEFAULT '[]',
  status                VARCHAR(15) NOT NULL DEFAULT 'submitted'
                        CHECK (status IN ('submitted','under_review','approved','rejected','paid')),
  reviewer_notes        TEXT,
  created_at            TIMESTAMP DEFAULT NOW(),
  updated_at            TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_insurance_claims_user   ON insurance_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);

-- ============================================================================
-- UNIVERSITY MARKETPLACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS university_listings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                VARCHAR(150) NOT NULL,
  description          TEXT,
  category             VARCHAR(30) NOT NULL DEFAULT 'other',
  price                INTEGER NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1,
  images               JSONB DEFAULT '[]',
  condition            VARCHAR(10) DEFAULT 'new'
                       CHECK (condition IN ('new','like_new','good','fair')),
  delivery_type        VARCHAR(20) DEFAULT 'pickup_only'
                       CHECK (delivery_type IN ('pickup_only','campus_delivery','dalasmart_delivery')),
  pickup_location      TEXT,
  campus_delivery_fee  INTEGER DEFAULT 0,
  is_negotiable        BOOLEAN DEFAULT false,
  is_featured          BOOLEAN DEFAULT false,
  tags                 JSONB DEFAULT '[]',
  status               VARCHAR(10) NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','sold','paused','removed')),
  created_at           TIMESTAMP DEFAULT NOW(),
  updated_at           TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uni_listings_seller   ON university_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_uni_listings_category ON university_listings(category);
CREATE INDEX IF NOT EXISTS idx_uni_listings_status   ON university_listings(status);

CREATE TABLE IF NOT EXISTS university_orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     VARCHAR(30) UNIQUE NOT NULL,
  buyer_id         UUID NOT NULL REFERENCES users(id),
  seller_id        UUID NOT NULL REFERENCES users(id),
  listing_id       UUID NOT NULL REFERENCES university_listings(id),
  quantity         INTEGER NOT NULL DEFAULT 1,
  unit_price       INTEGER NOT NULL,
  delivery_fee     INTEGER NOT NULL DEFAULT 0,
  total            INTEGER NOT NULL,
  delivery_type    VARCHAR(20),
  delivery_address TEXT,
  note             TEXT,
  status           VARCHAR(15) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','confirmed','dispatched','completed','cancelled','disputed')),
  created_at       TIMESTAMP DEFAULT NOW(),
  updated_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_uni_orders_buyer  ON university_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_uni_orders_seller ON university_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_uni_orders_status ON university_orders(status);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Sample shop categories for demo
INSERT INTO shops (name, description, category, address, latitude, longitude, delivery_fee, min_order_amount, is_university_vendor, university_name, owner_id)
SELECT
  'UDSM Campus Store', 'Your one-stop shop on campus', 'stationary',
  'University of Dar es Salaam, Mlimani', -6.7726, 39.2343, 300, 500,
  true, 'University of Dar es Salaam', id
FROM users WHERE user_type = 'admin' LIMIT 1
ON CONFLICT DO NOTHING;

-- Enable per-trip insurance opt-in (all active policies with trip_cover are auto-checked at booking)
COMMENT ON TABLE insurance_policies IS 'trip_cover policies are auto-applied at trip checkout if user has opted in';

-- ============================================================================
COMMENT ON TABLE shops               IS 'Shop & Grocery Delivery — all vendor types including campus';
COMMENT ON TABLE ad_campaigns        IS 'In-App Advertising — business ad campaigns';
COMMENT ON TABLE money_transfers     IS 'Money Transfer — P2P, mobile money, bill payments';
COMMENT ON TABLE insurance_policies  IS 'Insurance — trip, health, driver vehicle cover';
COMMENT ON TABLE university_listings IS 'University Marketplace — student vendor listings';
