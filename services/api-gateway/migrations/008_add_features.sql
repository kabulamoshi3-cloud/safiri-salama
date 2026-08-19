-- Migration: Add missing DalaSmart features
-- Promo codes, referrals, driver incentives, subscriptions, support, corporate, food delivery

-- ============================================================================
-- PROMO CODE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS promo_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  discount_fixed INTEGER DEFAULT 0,
  max_uses INTEGER DEFAULT 999999,
  current_uses INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  one_per_user BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  promo_code_id UUID NOT NULL REFERENCES promo_codes(id),
  trip_id UUID REFERENCES trips(id),
  discount_amount INTEGER,
  redeemed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_redemptions_user_id ON redemptions(user_id);
CREATE INDEX idx_redemptions_promo_code_id ON redemptions(promo_code_id);

-- ============================================================================
-- REFERRAL PROGRAM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS referral_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referral_code VARCHAR(20) UNIQUE NOT NULL,
  total_referrals INTEGER DEFAULT 0,
  total_bonus_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id),
  referred_user_id UUID NOT NULL REFERENCES users(id),
  referral_code VARCHAR(20),
  referrer_bonus INTEGER DEFAULT 2500,
  referee_bonus INTEGER DEFAULT 5000,
  referrer_bonus_paid BOOLEAN DEFAULT false,
  referee_bonus_used BOOLEAN DEFAULT false,
  bonus_paid_date TIMESTAMP,
  first_ride_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX idx_referrals_referred_user_id ON referrals(referred_user_id);

-- ============================================================================
-- WALLET CREDITS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS wallet_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  reason VARCHAR(255),
  valid_until TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_wallet_credits_user_id ON wallet_credits(user_id);

-- ============================================================================
-- DRIVER INCENTIVE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS driver_incentives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  trip_id UUID REFERENCES trips(id),
  incentive_type VARCHAR(50) NOT NULL, -- trip_bonus, rating_bonus, streak_bonus, surge_bonus, distance_bonus, speed_bonus
  amount INTEGER NOT NULL,
  reason VARCHAR(255),
  earned_date TIMESTAMP DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'pending' -- pending, paid
);

CREATE TABLE IF NOT EXISTS driver_targets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers(id),
  target_type VARCHAR(50) NOT NULL, -- daily_trips, weekly_trips, rating, completion_rate
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  bonus_amount INTEGER NOT NULL,
  period_start TIMESTAMP DEFAULT NOW(),
  period_end TIMESTAMP,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_driver_incentives_driver_id ON driver_incentives(driver_id);
CREATE INDEX idx_driver_targets_driver_id ON driver_targets(driver_id);

-- ============================================================================
-- SUBSCRIPTION TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  discount_percentage INTEGER DEFAULT 0,
  features TEXT[] DEFAULT ARRAY['10% discount on all rides', 'Priority support', 'Monthly bonus credit'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id),
  status VARCHAR(20) DEFAULT 'active', -- active, cancelled, expired
  started_at TIMESTAMP DEFAULT NOW(),
  renews_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  payment_method_id VARCHAR(255),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  subscription_id UUID NOT NULL REFERENCES user_subscriptions(id),
  amount INTEGER,
  transaction_type VARCHAR(50), -- subscription_start, subscription_renewal, subscription_upgrade, subscription_cancelled
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX idx_subscription_transactions_user_id ON subscription_transactions(user_id);

-- ============================================================================
-- SUPPORT SYSTEM TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS support_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100),
  phone_number VARCHAR(20),
  status VARCHAR(20) DEFAULT 'available', -- available, busy, offline
  department VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50), -- general, payment, safety, driver, technical
  priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
  status VARCHAR(20) DEFAULT 'open', -- open, in_progress, resolved, closed
  assigned_to UUID REFERENCES support_agents(id),
  trip_id UUID REFERENCES trips(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id),
  sender_id UUID,
  sender_type VARCHAR(20), -- user, agent
  message TEXT NOT NULL,
  attachment_url VARCHAR(255),
  sent_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_support_tickets_user_id ON support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_messages_ticket_id ON support_messages(ticket_id);

-- ============================================================================
-- CORPORATE ACCOUNTS TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS corporate_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name VARCHAR(255) NOT NULL,
  company_registration VARCHAR(100) UNIQUE NOT NULL,
  admin_id UUID NOT NULL REFERENCES users(id),
  phone_number VARCHAR(20),
  email VARCHAR(100),
  address TEXT,
  monthly_budget INTEGER NOT NULL,
  current_spend INTEGER DEFAULT 0,
  discount_rate INTEGER DEFAULT 15, -- percentage discount
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS corporate_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_id UUID NOT NULL REFERENCES corporate_accounts(id),
  employee_id UUID NOT NULL REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, suspended
  added_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_allowances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  corporate_id UUID NOT NULL REFERENCES corporate_accounts(id),
  employee_id UUID NOT NULL REFERENCES users(id),
  monthly_allowance INTEGER NOT NULL,
  spent_this_month INTEGER DEFAULT 0,
  reset_date TIMESTAMP, -- when allowance resets
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_corporate_accounts_admin_id ON corporate_accounts(admin_id);
CREATE INDEX idx_corporate_employees_corporate_id ON corporate_employees(corporate_id);
CREATE INDEX idx_employee_allowances_employee_id ON employee_allowances(employee_id);

-- ============================================================================
-- FOOD DELIVERY TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  logo_url VARCHAR(255),
  delivery_fee INTEGER DEFAULT 0,
  delivery_time_min INTEGER DEFAULT 30,
  delivery_time_max INTEGER DEFAULT 45,
  is_open BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  image_url VARCHAR(255),
  category VARCHAR(100),
  available BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS food_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  driver_id UUID REFERENCES drivers(id),
  items JSONB NOT NULL,
  subtotal INTEGER NOT NULL,
  delivery_fee INTEGER NOT NULL,
  total INTEGER NOT NULL,
  delivery_address TEXT NOT NULL,
  special_instructions TEXT,
  status VARCHAR(50) DEFAULT 'pending', -- pending, confirmed, preparing, ready, delivering, delivered, cancelled, rated
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS food_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES food_orders(id),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  food_rating INTEGER CHECK (food_rating >= 1 AND food_rating <= 5),
  delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_food_orders_user_id ON food_orders(user_id);
CREATE INDEX idx_food_orders_restaurant_id ON food_orders(restaurant_id);
CREATE INDEX idx_menu_items_restaurant_id ON menu_items(restaurant_id);
CREATE INDEX idx_food_ratings_restaurant_id ON food_ratings(restaurant_id);

-- ============================================================================
-- UPDATE TRIPS TABLE TO SUPPORT NEW FEATURES
-- ============================================================================

ALTER TABLE trips ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES promo_codes(id);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;
ALTER TABLE trips ADD COLUMN IF NOT EXISTS corporate_id UUID REFERENCES corporate_accounts(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES users(id);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default subscription plans
INSERT INTO subscription_plans (name, description, price_monthly, price_annual, discount_percentage, features)
VALUES 
  ('DalaSmart Plus', '10% discount on all rides + premium support', 10000, 100000, 10, ARRAY['10% discount on all rides', 'Priority support', 'Sh2,000 monthly bonus credit', 'No surge pricing']),
  ('DalaSmart Pro', '15% discount + exclusive offers', 20000, 200000, 15, ARRAY['15% discount on all rides', 'VIP support', 'Sh5,000 monthly bonus', 'Priority booking', 'Exclusive promos']),
  ('DalaSmart Business', 'Corporate bulk discount', 100000, 1000000, 20, ARRAY['20% discount on all corporate trips', 'Dedicated account manager', 'Custom employee allowances', 'Monthly billing', 'API access'])
ON CONFLICT DO NOTHING;

-- Insert default promo codes
INSERT INTO promo_codes (code, description, discount_percentage, max_uses, valid_until, is_active)
VALUES
  ('WELCOME2024', 'Welcome to DalaSmart - 30% off first 3 rides', 30, 10000, NOW() + INTERVAL '90 days', true),
  ('HOLIDAY50', 'Holiday special - 50% off', 50, 5000, NOW() + INTERVAL '30 days', true),
  ('REFER10', 'Referral bonus - 10% off', 10, 999999, NOW() + INTERVAL '365 days', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
