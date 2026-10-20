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
