import { Router } from "express";
import bcrypt from "bcrypt";
import { notifyUser, inr } from "../lib/notify.js";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";

const router = Router();

function formatUser(u: any) {
  return {
    id: u.id, fullName: u.full_name, phone: u.phone, email: u.email,
    balance: parseFloat(u.balance || 0), referralCode: u.referral_code,
    status: u.status, kycStatus: u.kyc_status, createdAt: u.created_at,
    lastLogin: u.last_login, totalBets: parseInt(u.total_bets || 0),
    totalDeposits: parseFloat(u.total_deposits || 0), totalWithdrawals: parseFloat(u.total_withdrawals || 0)
  };
}

router.get("/admin/users", requireAdminAuth, async (req, res) => {
  const { search, status } = req.query;
  const page = Math.max(1, Math.floor(Number(req.query.page)) || 1);
  const limit = Math.min(100, Math.max(1, Math.floor(Number(req.query.limit)) || 20));
  const offset = (page - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;
  if (search) { conditions.push(`(u.full_name ILIKE $${paramIdx} OR u.phone ILIKE $${paramIdx})`); params.push(`%${search}%`); paramIdx++; }
  if (status) { conditions.push(`u.status = $${paramIdx}`); params.push(status); paramIdx++; }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const countRes = await pool.query(`SELECT COUNT(*) FROM users u ${where}`, params);
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.balance, u.referral_code, u.status, u.kyc_status, u.created_at, u.last_login,
     COUNT(b.id) as total_bets,
     COALESCE(SUM(CASE WHEN t.type='deposit' AND t.status='completed' THEN t.amount ELSE 0 END),0) as total_deposits,
     COALESCE(SUM(CASE WHEN t.type='withdrawal' AND t.status='completed' THEN t.amount ELSE 0 END),0) as total_withdrawals
     FROM users u LEFT JOIN bets b ON b.user_id = u.id LEFT JOIN transactions t ON t.user_id = u.id
     ${where} GROUP BY u.id ORDER BY u.created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx+1}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);
  res.json({ users: result.rows.map(formatUser), total, page: page, totalPages: Math.ceil(total / limit) });
});

router.get("/admin/users/:id", requireAdminAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT u.*, COUNT(DISTINCT b.id) as total_bets,
     COALESCE(SUM(CASE WHEN t.type='deposit' AND t.status='completed' THEN t.amount ELSE 0 END),0) as total_deposits,
     COALESCE(SUM(CASE WHEN t.type='withdrawal' AND t.status='completed' THEN t.amount ELSE 0 END),0) as total_withdrawals
     FROM users u LEFT JOIN bets b ON b.user_id = u.id LEFT JOIN transactions t ON t.user_id = u.id
     WHERE u.id = $1 GROUP BY u.id`,
    [req.params.id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: "User not found" }); return; }
  res.json(formatUser(result.rows[0]));
});

router.put("/admin/users/:id/status", requireAdminAuth, async (req, res) => {
  const { status } = req.body;
  const allowed = ["active", "blocked", "suspended"];
  if (!allowed.includes(status)) { res.status(400).json({ error: "Invalid status" }); return; }
  await pool.query("UPDATE users SET status = $1 WHERE id = $2", [status, req.params.id]);
  await pool.query("INSERT INTO activity_logs (admin_id, action, details) VALUES ($1, $2, $3)",
    [req.admin!.adminId, "user_status_change", JSON.stringify({ userId: req.params.id, status })]);
  await notifyUser(String(req.params.id), status === "active" ? "Account re-activated" : "Account restricted",
    status === "active" ? "Your account is active again. Welcome back!" : "Your account has been restricted. Please contact support.", "account");
  res.json({ message: `User ${status}`, success: true });
});

router.put("/admin/users/:id/password", requireAdminAuth, async (req, res) => {
  const { newPassword } = req.body;
  if (typeof newPassword !== "string" || newPassword.length < 8 || newPassword.length > 72) {
    res.status(400).json({ error: "Password must be 8 to 72 characters" }); return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  const r = await pool.query("UPDATE users SET password_hash = $1 WHERE id = $2", [hash, req.params.id]);
  if (r.rowCount === 0) { res.status(404).json({ error: "User not found" }); return; }
  await pool.query("INSERT INTO activity_logs (admin_id, action, details) VALUES ($1, $2, $3)",
    [req.admin!.adminId, "user_password_reset", JSON.stringify({ userId: req.params.id })]);
  await notifyUser(String(req.params.id), "Password changed", "Your password was reset by support. If you did not ask for this, contact us right away.", "account");
  res.json({ message: "Password reset", success: true });
});

router.put("/admin/users/:id/balance", requireAdminAuth, async (req, res) => {
  const amount = Number(req.body.amount);
  const reason = String(req.body.reason ?? "").slice(0, 300);
  if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1_000_000) {
    res.status(400).json({ error: "Enter a non-zero amount up to ₹10,00,000" }); return;
  }
  if (!reason.trim()) { res.status(400).json({ error: "A reason is required" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [amount, req.params.id]);
    await client.query(
      "INSERT INTO transactions (user_id, type, amount, status, admin_note) VALUES ($1, 'adjustment', $2, 'completed', $3)",
      [req.params.id, Math.abs(amount), reason]
    );
    await client.query("INSERT INTO activity_logs (admin_id, action, details) VALUES ($1, $2, $3)",
      [req.admin!.adminId, "balance_adjustment", JSON.stringify({ userId: req.params.id, amount, reason })]);
    await notifyUser(String(req.params.id), amount > 0 ? "Wallet credited" : "Wallet debited",
      `${inr(Math.abs(amount))} ${amount > 0 ? "added to" : "deducted from"} your wallet by admin. Reason: ${reason}`, "account", client);
    await client.query("COMMIT");
    res.json({ message: "Balance adjusted", success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed" });
  } finally {
    client.release();
  }
});

router.get("/admin/users/:id/activity", requireAdminAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, action, details, ip_address, created_at FROM activity_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50",
    [req.params.id]
  );
  res.json({ activities: result.rows.map((a: any) => ({ id: a.id, action: a.action, details: a.details, ipAddress: a.ip_address, createdAt: a.created_at })) });
});

router.get("/admin/users/:id/bets", requireAdminAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, m.name as market_name FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [req.params.id]
  );
  res.json({ bets: result.rows.map((b: any) => ({
    id: b.id, userId: b.user_id, marketId: b.market_id, marketName: b.market_name,
    gameType: b.game_type, numbers: b.numbers, totalAmount: parseFloat(b.total_amount),
    status: b.status, winAmount: parseFloat(b.win_amount || 0), createdAt: b.created_at
  })) });
});

export default router;
