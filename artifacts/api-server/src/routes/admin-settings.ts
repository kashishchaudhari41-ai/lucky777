import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";
import { getNumberSetting } from "../lib/settings.js";

const router = Router();

async function getSetting(key: string, defaultVal: any) {
  const result = await pool.query("SELECT value FROM app_settings WHERE key = $1", [key]);
  if (result.rows.length === 0) return defaultVal;
  try { return JSON.parse(result.rows[0].value); } catch { return result.rows[0].value; }
}

async function setSetting(key: string, value: any) {
  const val = typeof value === "string" ? value : JSON.stringify(value);
  await pool.query(
    "INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()",
    [key, val]
  );
}

router.get("/admin/settings", requireAdminAuth, async (req, res) => {
  try {
    const [appName, whatsapp, telegram, minDep, minWith, referralComm, maintenance, lockMins, pSingle, pJodi, pPanna] = await Promise.all([
      getSetting("app_name", "Lucky777"),
      getSetting("whatsapp_number", "+91 9999999999"),
      getSetting("telegram_link", "https://t.me/lucky777"),
      getNumberSetting("min_deposit"),
      getNumberSetting("min_withdrawal"),
      getSetting("referral_commission", 5),
      getSetting("maintenance_mode", false),
      getSetting("betting_lock_minutes", 30),
      getNumberSetting("payout_single"), getNumberSetting("payout_jodi"), getNumberSetting("payout_panna")
    ]);
    res.json({ appName, whatsappNumber: whatsapp, telegramLink: telegram, minDeposit: minDep, minWithdrawal: minWith, referralCommission: referralComm, maintenanceMode: maintenance, bettingLockMinutes: lockMins, payoutSingle: pSingle, payoutJodi: pJodi, payoutPanna: pPanna });
  } catch (err) {
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/admin/settings", requireAdminAuth, async (req, res) => {
  const { appName, whatsappNumber, telegramLink, minDeposit, minWithdrawal, referralCommission, maintenanceMode, bettingLockMinutes, payoutSingle, payoutJodi, payoutPanna } = req.body;
  const positive = [minDeposit, minWithdrawal, payoutSingle, payoutJodi, payoutPanna];
  if (positive.some(v => v !== undefined && !(Number(v) > 0))) { res.status(400).json({ error: "Amounts and payout rates must be positive numbers" }); return; }
  try {
    const updates: [string, any][] = [
      ["app_name", appName], ["whatsapp_number", whatsappNumber], ["telegram_link", telegramLink],
      ["min_deposit", minDeposit], ["min_withdrawal", minWithdrawal], ["referral_commission", referralCommission],
      ["maintenance_mode", maintenanceMode], ["betting_lock_minutes", bettingLockMinutes],
      ["payout_single", payoutSingle], ["payout_jodi", payoutJodi], ["payout_panna", payoutPanna]
    ];
    for (const [key, val] of updates) {
      if (val !== undefined) await setSetting(key, val);
    }
    res.json({ message: "Settings updated", success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.get("/admin/settings/upi", requireAdminAuth, async (req, res) => {
  const result = await pool.query("SELECT * FROM upi_accounts ORDER BY created_at");
  res.json({ upiAccounts: result.rows.map((u: any) => ({
    id: u.id, upiId: u.upi_id, qrCodeUrl: u.qr_code_url, isActive: u.is_active, createdAt: u.created_at
  })) });
});

const UPI_RE = /^[\w.\-]{2,}@[A-Za-z][A-Za-z0-9.\-]{1,}$/;
// QR must be a PNG/JPEG/WEBP data URL (<= ~2MB) or an https link; anything else (svg, javascript:) is refused
function validQr(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (typeof v !== "string" || v.length > 2_800_000) return false;
  return /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v) || /^https:\/\/[^\s]+$/.test(v);
}

router.post("/admin/settings/upi", requireAdminAuth, async (req, res) => {
  const { upiId, qrCodeUrl, isActive } = req.body;
  if (!upiId) { res.status(400).json({ error: "upiId required" }); return; }
  if (!UPI_RE.test(String(upiId).trim())) { res.status(400).json({ error: "Enter a valid UPI ID (e.g. name@upi)" }); return; }
  if (!validQr(qrCodeUrl)) { res.status(400).json({ error: "QR must be a PNG/JPEG/WEBP image under 2 MB" }); return; }
  const result = await pool.query(
    "INSERT INTO upi_accounts (upi_id, qr_code_url, is_active) VALUES ($1, $2, $3) RETURNING *",
    [upiId, qrCodeUrl || null, isActive !== false]
  );
  const u = result.rows[0];
  res.status(201).json({ id: u.id, upiId: u.upi_id, qrCodeUrl: u.qr_code_url, isActive: u.is_active, createdAt: u.created_at });
});

router.put("/admin/settings/upi/:id", requireAdminAuth, async (req, res) => {
  const { upiId, qrCodeUrl, isActive } = req.body;
  if (upiId !== undefined && !UPI_RE.test(String(upiId).trim())) { res.status(400).json({ error: "Enter a valid UPI ID (e.g. name@upi)" }); return; }
  if (!validQr(qrCodeUrl)) { res.status(400).json({ error: "QR must be a PNG/JPEG/WEBP image under 2 MB" }); return; }
  await pool.query(
    "UPDATE upi_accounts SET upi_id = COALESCE($1, upi_id), qr_code_url = COALESCE($2, qr_code_url), is_active = COALESCE($3, is_active) WHERE id = $4",
    [upiId, qrCodeUrl, isActive, req.params.id]
  );
  res.json({ message: "Updated", success: true });
});

router.delete("/admin/settings/upi/:id", requireAdminAuth, async (req, res) => {
  await pool.query("DELETE FROM upi_accounts WHERE id = $1", [req.params.id]);
  res.json({ message: "Deleted", success: true });
});

export default router;
