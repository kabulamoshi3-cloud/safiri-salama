-- Migration 014: Push token storage
-- Adds push_token and device_platform columns to users,
-- and creates a dedicated user_push_tokens table.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS push_token TEXT,
  ADD COLUMN IF NOT EXISTS device_platform TEXT;

CREATE TABLE IF NOT EXISTS user_push_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  platform    TEXT        NOT NULL DEFAULT 'android',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
  ON user_push_tokens (user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token
  ON user_push_tokens (token);
