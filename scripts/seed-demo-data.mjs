/**
 * Demo data seed script for Lucky777 - Satta Matka
 * Run from workspace root: node scripts/seed-demo-data.mjs
 *
 * Creates:
 *  - 2 admin users  (admin/Admin@123  and  ourempire/Ourempire@#000#@)
 *  - 5 markets
 *  - 1 UPI account
 *  - Default app settings
 *  - 3 demo users  (password: Test@1234)
 */

import { createRequire } from "module";
import { fileURLToPath } from "url";
import path from "path";

// Resolve pg and bcrypt from api-server's node_modules so this script
// works when run from the workspace root (where pg is NOT installed).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(
  path.join(__dirname, "../artifacts/api-server/package.json")
);

const pg = require("pg");
const bcrypt = require("bcrypt");
const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("❌  DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  const client = await pool.connect();
  try {
    console.log("🌱 Starting seed...\n");

    // ── Admin users ──────────────────────────────────────────────────────────
    const adminHash = await bcrypt.hash("Admin@123", 10);
    await client.query(
      `INSERT INTO admin_users (username, password_hash, role)
       VALUES ($1, $2, 'super_admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      ["admin", adminHash]
    );
    console.log("✅  Admin user   → username: admin | password: Admin@123");

    const empireHash = await bcrypt.hash("Ourempire@#000#@", 10);
    await client.query(
      `INSERT INTO admin_users (username, password_hash, role)
       VALUES ($1, $2, 'super_admin')
       ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash`,
      ["ourempire", empireHash]
    );
    console.log("✅  Admin user   → username: ourempire | password: Ourempire@#000#@");

    // ── Markets ──────────────────────────────────────────────────────────────
    const markets = [
      { name: "Milan Day",      open: "09:00", close: "11:00" },
      { name: "Kalyan",         open: "15:45", close: "17:45" },
      { name: "Milan Night",    open: "21:00", close: "23:00" },
      { name: "Rajdhani Day",   open: "13:00", close: "15:30" },
      { name: "Rajdhani Night", open: "20:45", close: "22:45" },
    ];

    for (const m of markets) {
      await client.query(
        `INSERT INTO markets (name, open_time, close_time, min_bet, max_bet, payout_ratio, status, is_betting_open)
         VALUES ($1, $2, $3, 10, 10000, 90, 'active', true)
         ON CONFLICT DO NOTHING`,
        [m.name, m.open, m.close]
      );
    }
    console.log(`✅  ${markets.length} markets created`);

    // ── UPI account ──────────────────────────────────────────────────────────
    await client.query(
      `INSERT INTO upi_accounts (upi_id, is_active)
       VALUES ('lucky777@paytm', true)
       ON CONFLICT DO NOTHING`
    );
    console.log("✅  UPI account  → lucky777@paytm");

    // ── App settings ─────────────────────────────────────────────────────────
    const settings = [
      ["app_name", "Lucky777"],
      ["whatsapp_number", "+91 9999999999"],
      ["telegram_link", "https://t.me/lucky777"],
      ["min_deposit", "100"],
      ["min_withdrawal", "100"],
      ["referral_commission", "5"],
      ["maintenance_mode", "false"],
      ["betting_lock_minutes", "30"],
    ];

    for (const [key, value] of settings) {
      await client.query(
        `INSERT INTO app_settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }
    console.log("✅  App settings seeded");

    // ── Demo users ────────────────────────────────────────────────────────────
    const userHash = await bcrypt.hash("Test@1234", 10);
    const demoUsers = [
      { name: "Rahul Sharma", phone: "9876543210", balance: 5000 },
      { name: "Priya Singh",  phone: "9812345678", balance: 2500 },
      { name: "Amit Kumar",   phone: "9898989898", balance: 1000 },
    ];

    for (const u of demoUsers) {
      const refCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await client.query(
        `INSERT INTO users (full_name, phone, password_hash, referral_code, balance, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (phone) DO NOTHING`,
        [u.name, u.phone, userHash, refCode, u.balance]
      );
    }
    console.log(`✅  ${demoUsers.length} demo users created (password: Test@1234)`);

    console.log("\n✨  Seed complete!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Admin Panel Login:");
    console.log("  username : admin       password : Admin@123");
    console.log("  username : ourempire   password : Ourempire@#000#@");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Demo App Login:");
    console.log("  phone    : 9876543210  password : Test@1234");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  } catch (err) {
    console.error("❌  Seed failed:", err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(() => process.exit(1));
