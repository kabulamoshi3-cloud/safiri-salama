-- Migration 011: Full Payment System
-- Run: psql dalasmart_db < migrations/011_payments.sql

-- ============================================================================
-- WALLETS
-- ============================================================================
CREATE TABLE IF NOT EXISTS wallets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  balance    BIGINT NOT NULL DEFAULT 0,   -- stored in TZS (no decimals)
  currency   VARCHAR(5) NOT NULL DEFAULT 'TZS',
  is_locked  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets(user_id);

-- ============================================================================
-- TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference        VARCHAR(40) UNIQUE NOT NULL,
  user_id          UUID NOT NULL REFERENCES users(id),
  context          VARCHAR(20) DEFAULT 'ride',   -- ride | food | shop | market | topup | transfer | bill
  context_id       UUID,                          -- trip_id / order_id / etc.
  amount           BIGINT NOT NULL,
  type             VARCHAR(10) NOT NULL CHECK (type IN ('debit','credit')),
  method           VARCHAR(20) NOT NULL,          -- wallet | mobile_money | cash | qr_code | refund
  provider         VARCHAR(20),                   -- mpesa | airtel_money | tigo_pesa | halotel | wallet | cash
  phone_number     VARCHAR(20),                   -- normalised phone used for STK push
  phone_source     VARCHAR(20) DEFAULT 'registered', -- 'registered' | 'user_provided'
  status           VARCHAR(25) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','pending_confirmation','processing','completed','failed','expired','reversed')),
  provider_txn_id  VARCHAR(80),                   -- provider's own transaction ID
  failure_reason   TEXT,
  description      TEXT,
  refunded         BOOLEAN NOT NULL DEFAULT false,
  refund_reference VARCHAR(40),
  refund_reason    TEXT,
  expires_at       TIMESTAMP,
  completed_at     TIMESTAMP,
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user      ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_reference ON transactions(reference);
CREATE INDEX IF NOT EXISTS idx_transactions_status    ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_context   ON transactions(context, context_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date      ON transactions(created_at);

-- ============================================================================
-- QR PAYMENT TOKENS
-- ============================================================================
CREATE TABLE IF NOT EXISTS qr_payment_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token        VARCHAR(64) UNIQUE NOT NULL,
  reference    VARCHAR(40) NOT NULL,
  driver_id    UUID NOT NULL REFERENCES users(id),
  route_id     UUID,
  amount       BIGINT NOT NULL,
  vehicle_type VARCHAR(20) DEFAULT 'daladala',
  status       VARCHAR(10) NOT NULL DEFAULT 'active' CHECK (status IN ('active','used','expired')),
  used_by      UUID REFERENCES users(id),
  used_at      TIMESTAMP,
  expires_at   TIMESTAMP NOT NULL,
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qr_tokens_token     ON qr_payment_tokens(token);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_driver    ON qr_payment_tokens(driver_id);
CREATE INDEX IF NOT EXISTS idx_qr_tokens_status    ON qr_payment_tokens(status);

-- ============================================================================
-- Extend trips table with payment fields
-- ============================================================================
ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS payment_status  VARCHAR(10) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id  VARCHAR(40),
  ADD COLUMN IF NOT EXISTS estimated_fare  BIGINT,
  ADD COLUMN IF NOT EXISTS final_fare      BIGINT,
  ADD COLUMN IF NOT EXISTS discount_amount BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pickup_address  TEXT,
  ADD COLUMN IF NOT EXISTS dropoff_address TEXT,
  ADD COLUMN IF NOT EXISTS pickup_latitude  DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS pickup_longitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS dropoff_latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS dropoff_longitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS accepted_at     TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_at    TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cancelled_by    UUID,
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
  ADD COLUMN IF NOT EXISTS passenger_rating SMALLINT,
  ADD COLUMN IF NOT EXISTS passenger_review TEXT,
  ADD COLUMN IF NOT EXISTS driver_rating   SMALLINT,
  ADD COLUMN IF NOT EXISTS driver_review   TEXT;

-- Add payment_status to food & shop orders
ALTER TABLE food_orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(40);

ALTER TABLE shop_orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(40);

-- ============================================================================
-- PATCH: university_orders payment columns (missed in 010)
-- ============================================================================
ALTER TABLE university_orders
  ADD COLUMN IF NOT EXISTS payment_status VARCHAR(10) DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS transaction_id  VARCHAR(40);

-- ============================================================================
-- PAYMENT SPLITS
-- Stores per-transaction breakdown: payee portion + platform fee portion.
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_splits (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_ref VARCHAR(40) NOT NULL REFERENCES transactions(reference),
  payee_id        UUID REFERENCES users(id),
  payee_type      VARCHAR(16) NOT NULL,   -- driver | vendor | seller | platform
  amount          BIGINT NOT NULL,
  status          VARCHAR(16) NOT NULL DEFAULT 'pending',  -- pending | paid
  paid_at         TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_splits_tx        ON payment_splits(transaction_ref);
CREATE INDEX IF NOT EXISTS idx_payment_splits_payee     ON payment_splits(payee_id);
CREATE INDEX IF NOT EXISTS idx_payment_splits_status    ON payment_splits(status);

-- Widen context CHECK to include transfer and bill contexts (idempotent)
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_context_check;

-- ============================================================================
-- SEED: Create wallets for existing users
-- ============================================================================
INSERT INTO wallets (user_id, balance, currency)
SELECT id, 0, 'TZS' FROM users
ON CONFLICT (user_id) DO NOTHING;

COMMENT ON TABLE wallets         IS 'One wallet per user, balance in TZS';
COMMENT ON TABLE transactions    IS 'Full audit trail of all payments';
COMMENT ON TABLE qr_payment_tokens IS 'Short-lived QR codes for bus fare payments';
COMMENT ON TABLE payment_splits  IS 'Per-transaction payout breakdown: payee share + platform fee';
