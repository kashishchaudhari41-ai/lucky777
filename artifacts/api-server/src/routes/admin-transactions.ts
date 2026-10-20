import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";

const router = Router();

function formatTx(t: any) {
  return {
    id: t.id, userId: t.user_id, userName: t.user_name, type: t.type,
    amount: parseFloat(t.amount), status: t.status, method: t.method,
    utrNumber: t.utr_number, screenshotUrl: t.screenshot_url, adminNote: t.admin_note,
    bankDetails: t.bank_details, createdAt: t.created_at, processedAt: t.processed_at
  };
}

router.get("/admin/transactions/deposits", requireAdminAuth, async (req, res) => {
  const { status, page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;
  const conditions = ["t.type = 'deposit'"];
  const params: any[] = [];
  let idx = 1;
  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  const where = "WHERE " + conditions.join(" AND ");
  const countRes = await pool.query(`SELECT COUNT(*) FROM transactions t ${where}`, params);
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT t.*, u.full_name as user_name FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);
  res.json({ transactions: result.rows.map(formatTx), total, page: Number(page), totalPages: Math.ceil(total / limit) });
});

router.get("/admin/transactions/withdrawals", requireAdminAuth, async (req, res) => {
  const { status, page = 1 } = req.query;
  const limit = 20;
  const offset = (Number(page) - 1) * limit;
  const conditions = ["t.type = 'withdrawal'"];
  const params: any[] = [];
  let idx = 1;
  if (status) { conditions.push(`t.status = $${idx++}`); params.push(status); }
  const where = "WHERE " + conditions.join(" AND ");
  const countRes = await pool.query(`SELECT COUNT(*) FROM transactions t ${where}`, params);
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT t.*, u.full_name as user_name FROM transactions t JOIN users u ON t.user_id = u.id ${where} ORDER BY t.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);
  res.json({ transactions: result.rows.map(formatTx), total, page: Number(page), totalPages: Math.ceil(total / limit) });
});

router.put("/admin/transactions/deposits/:id/approve", requireAdminAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Only a still-pending deposit can be approved, so double-clicks can't credit twice
    const upd = await client.query(
      `UPDATE transactions SET status = 'completed', processed_at = NOW(), processed_by = $1
       WHERE id = $2 AND type = 'deposit' AND status = 'pending' RETURNING user_id, amount`,
      [req.admin!.adminId, req.params.id]);
    if (upd.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Deposit not found or already processed" }); return;
    }
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [upd.rows[0].amount, upd.rows[0].user_id]);
    await client.query("COMMIT");
    res.json({ message: "Deposit approved", success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed" });
  } finally {
    client.release();
  }
});

router.put("/admin/transactions/deposits/:id/reject", requireAdminAuth, async (req, res) => {
  const { reason } = req.body;
  const upd = await pool.query(
    "UPDATE transactions SET status = 'rejected', admin_note = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3 AND type = 'deposit' AND status = 'pending'",
    [reason, req.admin!.adminId, req.params.id]
  );
  if (upd.rowCount === 0) { res.status(400).json({ error: "Deposit not found or already processed" }); return; }
  res.json({ message: "Deposit rejected", success: true });
});

router.put("/admin/transactions/withdrawals/:id/complete", requireAdminAuth, async (req, res) => {
  const upd = await pool.query(
    "UPDATE transactions SET status = 'completed', processed_at = NOW(), processed_by = $1 WHERE id = $2 AND type = 'withdrawal' AND status = 'pending'",
    [req.admin!.adminId, req.params.id]
  );
  if (upd.rowCount === 0) { res.status(400).json({ error: "Withdrawal not found or already processed" }); return; }
  res.json({ message: "Withdrawal completed", success: true });
});

router.put("/admin/transactions/withdrawals/:id/reject", requireAdminAuth, async (req, res) => {
  const { reason } = req.body;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Guarded on 'pending' so a withdrawal can be refunded at most once
    const upd = await client.query(
      "UPDATE transactions SET status = 'rejected', admin_note = $1, processed_at = NOW(), processed_by = $2 WHERE id = $3 AND type = 'withdrawal' AND status = 'pending' RETURNING user_id, amount",
      [reason, req.admin!.adminId, req.params.id]);
    if (upd.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Withdrawal not found or already processed" }); return;
    }
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [upd.rows[0].amount, upd.rows[0].user_id]);
    await client.query("COMMIT");
    res.json({ message: "Withdrawal rejected, amount refunded", success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed" });
  } finally {
    client.release();
  }
});

export default router;
