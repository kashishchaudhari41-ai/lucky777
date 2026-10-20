-- ============================================================
-- Lucky777 - Satta Matka  |  Demo Seed Data
-- Run: psql "$DATABASE_URL" -f scripts/seed-demo-data.sql
--
-- Admin logins:  admin / Admin@123
--                ourempire / Ourempire@#000#@
-- App user:      9876543210 / Test@1234
-- ============================================================

-- ── Admin users ──────────────────────────────────────────────
INSERT INTO admin_users (username, password_hash, role)
VALUES
  ('admin',      '$2b$10$WzUClxxbo2E1w01bAfrZE.hu/UY83pYMS0azwZPMWvaGr7.glGTQq', 'super_admin'),
  ('ourempire',  '$2b$10$xvbcrwuEz2A6HrgasJ54Uuo6Wukv752G0sz2pDDn57CeK/jwvFZ06', 'super_admin')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- ── Markets ───────────────────────────────────────────────────
INSERT INTO markets (name, open_time, close_time, min_bet, max_bet, payout_ratio, status, is_betting_open)
VALUES
  ('Milan Day',      '09:00', '11:00', 10, 10000, 90, 'active', true),
  ('Kalyan',         '15:45', '17:45', 10, 10000, 90, 'active', true),
  ('Milan Night',    '21:00', '23:00', 10, 10000, 90, 'active', true),
  ('Rajdhani Day',   '13:00', '15:30', 10, 10000, 90, 'active', true),
  ('Rajdhani Night', '20:45', '22:45', 10, 10000, 90, 'active', true)
ON CONFLICT DO NOTHING;

-- ── UPI account ───────────────────────────────────────────────
INSERT INTO upi_accounts (upi_id, is_active)
VALUES ('lucky777@paytm', true)
ON CONFLICT DO NOTHING;

-- ── App settings ─────────────────────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('app_name',            'Lucky777'),
  ('whatsapp_number',     '+91 9999999999'),
  ('telegram_link',       'https://t.me/lucky777'),
  ('min_deposit',         '200'),
  ('min_withdrawal',      '500'),
  ('payout_single',       '9'),
  ('payout_jodi',         '90'),
  ('payout_panna',        '140'),
  ('referral_commission', '5'),
  ('maintenance_mode',    'false'),
  ('betting_lock_minutes','30')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- ── Demo users  (password: Test@1234) ─────────────────────────
INSERT INTO users (full_name, phone, password_hash, referral_code, balance, status)
VALUES
  ('Rahul Sharma', '9876543210', '$2b$10$NmnDIeROBJl8p6NNHmm7q.KAOqyA.LvNoAM4PrLf7jcbfRiD0oUiG', 'DEMO01', 5000, 'active'),
  ('Priya Singh',  '9812345678', '$2b$10$NmnDIeROBJl8p6NNHmm7q.KAOqyA.LvNoAM4PrLf7jcbfRiD0oUiG', 'DEMO02', 2500, 'active'),
  ('Amit Kumar',   '9898989898', '$2b$10$NmnDIeROBJl8p6NNHmm7q.KAOqyA.LvNoAM4PrLf7jcbfRiD0oUiG', 'DEMO03', 1000, 'active')
ON CONFLICT (phone) DO NOTHING;

-- ── Done ──────────────────────────────────────────────────────
SELECT 'Seed complete!' AS status,
       (SELECT count(*) FROM admin_users)  AS admin_users,
       (SELECT count(*) FROM markets)      AS markets,
       (SELECT count(*) FROM users)        AS demo_users;
