import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatTx(t: any) {
  return {
    id: t.id, userId: t.user_id, type: t.type, amount: parseFloat(t.amount),
    status: t.status, method: t.method, utrNumber: t.utr_number,
    screenshotUrl: t.screenshot_url, adminNote: t.admin_note,
    bankDetails: t.bank_details, createdAt: t.created_at, processedAt: t.processed_at
  };
}

router.post("/wallet/add-money-request", requireAuth, async (req, res) => {
  const { amount, utrNumber, screenshotUrl } = req.body;
  if (!amount || amount < 100) { res.status(400).json({ error: "Minimum deposit ₹100" }); return; }
  if (!utrNumber) { res.status(400).json({ error: "UTR number required" }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO transactions (user_id, type, amount, status, method, utr_number, screenshot_url)
       VALUES ($1, 'deposit', $2, 'pending', 'upi', $3, $4) RETURNING *`,
      [req.user!.userId, amount, utrNumber, screenshotUrl || null]
    );
    res.status(201).json(formatTx(result.rows[0]));
  } catch (err) {
    res.status(500).json({ error: "Failed to submit request" });
  }
});

router.post("/wallet/withdrawal-request", requireAuth, async (req, res) => {
  const { amount, method, bankAccountNumber, ifscCode, accountHolderName, upiId } = req.body;
  if (!amount || amount < 100) { res.status(400).json({ error: "Minimum withdrawal ₹100" }); return; }
  const userBal = await pool.query("SELECT balance FROM users WHERE id = $1", [req.user!.userId]);
  if (parseFloat(userBal.rows[0].balance) < amount) {
    res.status(400).json({ error: "Insufficient balance" }); return;
  }
  try {
    const bankDetails = method === "bank"
      ? { accountNumber: bankAccountNumber, ifscCode, accountHolderName }
      : { upiId };
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("UPDATE users SET balance = balance - $1 WHERE id = $2", [amount, req.user!.userId]);
      const result = await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, method, bank_details)
         VALUES ($1, 'withdrawal', $2, 'pending', $3, $4) RETURNING *`,
        [req.user!.userId, amount, method, JSON.stringify(bankDetails)]
      );
      await client.query("COMMIT");
      res.status(201).json(formatTx(result.rows[0]));
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    res.status(500).json({ error: "Failed to submit withdrawal" });
  }
});

router.get("/wallet/history", requireAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM transactions WHERE user_id = $1 ORDER BY created_at DESC",
    [req.user!.userId]
  );
  res.json({ transactions: result.rows.map(formatTx) });
});

router.get("/wallet/upi-details", requireAuth, async (req, res) => {
  const result = await pool.query("SELECT upi_id, qr_code_url FROM upi_accounts WHERE is_active = true ORDER BY RANDOM() LIMIT 1");
  if (result.rows.length === 0) {
    res.json({ upiId: "lucky777@upi", qrCodeUrl: null });
    return;
  }
  res.json({ upiId: result.rows[0].upi_id, qrCodeUrl: result.rows[0].qr_code_url });
});

export default router;
