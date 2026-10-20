import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";
import { getNumberSetting } from "../lib/settings.js";

const router = Router();

function formatResult(r: any) {
  return {
    id: r.id, marketId: r.market_id, marketName: r.market_name, date: r.date,
    openNumber: r.open_number, closeNumber: r.close_number, jodiNumber: r.jodi_number,
    status: r.status, createdAt: r.created_at
  };
}

async function settleWinners(resultId: string, marketId: string, openNumber: string, closeNumber: string, jodiNumber: string) {
  const bets = await pool.query(
    "SELECT id, user_id, numbers, total_amount, game_type FROM bets WHERE market_id = $1 AND status = 'pending'",
    [marketId]
  );
  const [pSingle, pJodi, pPanna] = await Promise.all([
    getNumberSetting("payout_single"), getNumberSetting("payout_jodi"), getNumberSetting("payout_panna")]);
  for (const bet of bets.rows) {
    let won = false;
    let winAmt = 0;
    const lastDigit = (v: string) => (v ? v.slice(-1) : "");
    for (const n of bet.numbers) {
      const num = String(n.number);
      if (bet.game_type === "jantri" && (num === openNumber || num === closeNumber)) {
        won = true; winAmt += n.amount * pSingle;
      } else if (bet.game_type === "open" && num === openNumber) {
        won = true; winAmt += n.amount * pSingle;
      } else if (bet.game_type === "crossing" && num === jodiNumber) {
        won = true; winAmt += n.amount * pJodi;
      } else if (bet.game_type === "single" && num.length === 1 && (num === lastDigit(openNumber) || num === lastDigit(closeNumber))) {
        won = true; winAmt += n.amount * pSingle;
      } else if (bet.game_type === "jodi" && num.length === 2 && num === jodiNumber) {
        won = true; winAmt += n.amount * pJodi;
      } else if (bet.game_type === "panna" && num.length === 3 && (num === openNumber || num === closeNumber)) {
        won = true; winAmt += n.amount * pPanna;
      }
    }
    const status = won ? "won" : "lost";
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const settled = await client.query(
        "UPDATE bets SET status = $1, win_amount = $2, result_id = $3, settled_at = NOW() WHERE id = $4 AND status = 'pending' RETURNING id",
        [status, winAmt, resultId, bet.id]);
      if (settled.rows.length === 0) { await client.query("ROLLBACK"); continue; }
      if (won && winAmt > 0) {
        await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [winAmt, bet.user_id]);
        await client.query("INSERT INTO transactions (user_id, type, amount, status, method) VALUES ($1, 'win', $2, 'completed', 'wallet')",
          [bet.user_id, winAmt]);
      }
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  }
}

router.post("/admin/results", requireAdminAuth, async (req, res) => {
  const { marketId, date, openNumber, closeNumber, jodiNumber } = req.body;
  if (!marketId || !date) { res.status(400).json({ error: "marketId and date required" }); return; }
  try {
    const result = await pool.query(
      `INSERT INTO results (market_id, date, open_number, close_number, jodi_number, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6) RETURNING id, market_id, date, open_number, close_number, jodi_number, status, created_at`,
      [marketId, date, openNumber, closeNumber, jodiNumber, req.admin!.adminId]
    );
    const r = result.rows[0];
    if (openNumber || closeNumber) {
      settleWinners(r.id, marketId, openNumber || "", closeNumber || "", jodiNumber || "").catch(() => {});
    }
    const mName = await pool.query("SELECT name FROM markets WHERE id = $1", [marketId]);
    res.status(201).json(formatResult({ ...r, market_name: mName.rows[0]?.name }));
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to add result" });
  }
});

router.get("/admin/results", requireAdminAuth, async (req, res) => {
  const { marketId, date } = req.query;
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (marketId) { conditions.push(`r.market_id = $${idx++}`); params.push(marketId); }
  if (date) { conditions.push(`r.date = $${idx++}`); params.push(date); }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const result = await pool.query(
    `SELECT r.*, m.name as market_name FROM results r JOIN markets m ON r.market_id = m.id ${where} ORDER BY r.date DESC, r.created_at DESC`,
    params
  );
  res.json({ results: result.rows.map(formatResult) });
});

router.put("/admin/results/:id", requireAdminAuth, async (req, res) => {
  const { marketId, date, openNumber, closeNumber, jodiNumber } = req.body;
  const result = await pool.query(
    `UPDATE results SET market_id = COALESCE($1, market_id), date = COALESCE($2, date),
     open_number = COALESCE($3, open_number), close_number = COALESCE($4, close_number),
     jodi_number = COALESCE($5, jodi_number) WHERE id = $6 RETURNING *`,
    [marketId, date, openNumber, closeNumber, jodiNumber, req.params.id]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
  const mName = await pool.query("SELECT name FROM markets WHERE id = $1", [result.rows[0].market_id]);
  res.json(formatResult({ ...result.rows[0], market_name: mName.rows[0]?.name }));
});

router.delete("/admin/results/:id", requireAdminAuth, async (req, res) => {
  await pool.query("DELETE FROM results WHERE id = $1", [req.params.id]);
  res.json({ message: "Deleted", success: true });
});

export default router;
