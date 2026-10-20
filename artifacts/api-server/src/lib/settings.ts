import { pool } from "@workspace/db";

export const DEFAULTS = {
  min_deposit: 200,
  min_withdrawal: 500,
  payout_single: 9,
  payout_jodi: 90,
  payout_panna: 140,
} as const;

export async function getNumberSetting(key: keyof typeof DEFAULTS): Promise<number> {
  const r = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  const n = Number(r.rows[0]?.value);
  return Number.isFinite(n) && n > 0 ? n : DEFAULTS[key];
}
