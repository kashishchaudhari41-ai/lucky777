import { pool } from "@workspace/db";
import { logger } from "./logger";

// Idempotent schema upgrades, run on every API start so existing databases get new columns.
const STATEMENTS = [
  `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES admin_users(id)`,
  `ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64)`,
  `CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  target_users JSONB,
  target_market UUID,
  created_by UUID REFERENCES admin_users(id),
  sent_at TIMESTAMPTZ DEFAULT NOW()
)`,
  `ALTER TABLE user_notifications ADD COLUMN IF NOT EXISTS notification_id UUID`,
  `UPDATE transactions SET utr_number = UPPER(REGEXP_REPLACE(utr_number, '\\s', '', 'g'))
   WHERE type = 'deposit' AND utr_number IS NOT NULL AND utr_number !~ '-DUP-' AND utr_number <> UPPER(REGEXP_REPLACE(utr_number, '\\s', '', 'g'))`,
  // Remove duplicate UTRs: the earliest deposit keeps the UTR, later copies are renamed (kept for audit)
  // and, if still pending, rejected.
  `UPDATE transactions t SET
     status = CASE WHEN t.status = 'pending' THEN 'rejected' ELSE t.status END,
     admin_note = CASE WHEN t.status = 'pending' THEN 'Duplicate UTR' ELSE t.admin_note END,
     utr_number = t.utr_number || '-DUP-' || UPPER(SUBSTR(t.id::text, 1, 8))
   FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY utr_number ORDER BY created_at, id) AS rn
         FROM transactions WHERE type = 'deposit' AND utr_number IS NOT NULL) d
   WHERE t.id = d.id AND d.rn > 1`,
  `UPDATE app_settings SET value = '200' WHERE key = 'min_deposit' AND value = '100'`,
  `UPDATE app_settings SET value = '500' WHERE key = 'min_withdrawal' AND value = '100'`,
  `INSERT INTO app_settings (key, value) VALUES ('payout_single', '9'), ('payout_jodi', '90'), ('payout_panna', '140') ON CONFLICT (key) DO NOTHING`,
  `CREATE UNIQUE INDEX IF NOT EXISTS uq_transactions_deposit_utr
  ON transactions (utr_number) WHERE type = 'deposit' AND utr_number IS NOT NULL`,
];

export async function runMigrations() {
  for (const sql of STATEMENTS) {
    try {
      await pool.query(sql);
    } catch (err) {
      logger.error({ err, sql }, "Migration statement failed");
    }
  }
}
