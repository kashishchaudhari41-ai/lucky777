-- Lucky777 - Satta Matka Complete Database Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(20) UNIQUE NOT NULL,
  email VARCHAR(200),
  password_hash TEXT NOT NULL,
  referral_code VARCHAR(20) UNIQUE,
  referred_by UUID REFERENCES users(id),
  balance DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active',
  kyc_status VARCHAR(20) DEFAULT 'pending',
  bank_account_number VARCHAR(50),
  ifsc_code VARCHAR(20),
  account_holder_name VARCHAR(200),
  upi_id VARCHAR(100),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Markets table
CREATE TABLE IF NOT EXISTS markets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  open_time TIME NOT NULL,
  close_time TIME NOT NULL,
  min_bet DECIMAL(10,2) DEFAULT 10,
  max_bet DECIMAL(10,2) DEFAULT 10000,
  payout_ratio DECIMAL(5,2) DEFAULT 90,
  status VARCHAR(20) DEFAULT 'active',
  is_betting_open BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Results table
CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  market_id UUID REFERENCES markets(id),
  date DATE NOT NULL,
  open_number VARCHAR(10),
  close_number VARCHAR(10),
  jodi_number VARCHAR(10),
  status VARCHAR(20) DEFAULT 'completed',
  created_by UUID REFERENCES admin_users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  market_id UUID REFERENCES markets(id),
  game_type VARCHAR(50) NOT NULL,
  numbers JSONB NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  win_amount DECIMAL(12,2) DEFAULT 0,
  result_id UUID REFERENCES results(id),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  type VARCHAR(30) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  method VARCHAR(50),
  utr_number VARCHAR(100),
  screenshot_url TEXT,
  admin_note TEXT,
  bank_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- UPI accounts table
CREATE TABLE IF NOT EXISTS upi_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  upi_id VARCHAR(200) NOT NULL,
  qr_code_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- App settings table
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  admin_id UUID REFERENCES admin_users(id),
  action VARCHAR(200),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User notifications table
CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_market_id ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_results_market_id ON results(market_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON user_notifications(user_id);

-- Columns / tables the API uses that older schema versions lacked (idempotent)
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES admin_users(id);
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  target_users JSONB,
  target_market UUID,
  created_by UUID REFERENCES admin_users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS notification_id UUID;

-- A UPI transaction ID (UTR) can be submitted only once, ever
CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_deposit_utr
  ON transactions (utr_number) WHERE type = 'deposit' AND utr_number IS NOT NULL;
