import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";

const router = Router();

function formatBet(b: any) {
  return {
    id: b.id, userId: b.user_id, marketId: b.market_id, marketName: b.market_name,
    gameType: b.game_type, numbers: b.numbers, totalAmount: parseFloat(b.total_amount),
    status: b.status, winAmount: parseFloat(b.win_amount || 0), createdAt: b.created_at
  };
}

router.get("/admin/bets", requireAdminAuth, async (req, res) => {
  const { market, status, date, page = 1 } = req.query;
  const limit = 20;
  const offset = (Math.max(1, Math.floor(Number(page)) || 1) - 1) * limit;
  const conditions: string[] = [];
  const params: any[] = [];
  let idx = 1;
  if (market) { conditions.push(`b.market_id = $${idx++}`); params.push(market); }
  if (status) { conditions.push(`b.status = $${idx++}`); params.push(status); }
  if (date) { conditions.push(`DATE(b.created_at) = $${idx++}`); params.push(date); }
  const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
  const countRes = await pool.query(`SELECT COUNT(*) FROM bets b ${where}`, params);
  params.push(limit, offset);
  const result = await pool.query(
    `SELECT b.*, m.name as market_name FROM bets b JOIN markets m ON b.market_id = m.id ${where} ORDER BY b.created_at DESC LIMIT $${idx} OFFSET $${idx+1}`,
    params
  );
  const total = parseInt(countRes.rows[0].count);
  res.json({ bets: result.rows.map(formatBet), total, page: Number(page), totalPages: Math.ceil(total / limit) });
});

router.put("/admin/bets/:id/cancel", requireAdminAuth, async (req, res) => {
  const bet = await pool.query("SELECT * FROM bets WHERE id = $1", [req.params.id]);
  if (bet.rows.length === 0) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.rows[0].status !== "pending") { res.status(400).json({ error: "Can only cancel pending bets" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("UPDATE bets SET status = 'cancelled' WHERE id = $1", [req.params.id]);
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [bet.rows[0].total_amount, bet.rows[0].user_id]);
    await client.query("COMMIT");
    res.json({ message: "Bet cancelled", success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed" });
  } finally {
    client.release();
  }
});

router.get("/admin/bets/analytics/numbers", requireAdminAuth, async (req, res) => {
  const { marketId, date } = req.query;
  let where = "";
  const params: any[] = [];
  let idx = 1;
  if (marketId) { where += ` AND market_id = $${idx++}`; params.push(marketId); }
  if (date) { where += ` AND DATE(created_at) = $${idx++}`; params.push(date); }

  // Aggregate betting numbers from JSONB
  const result = await pool.query(
    `SELECT elem->>'number' as number, COUNT(*) as total_bets, SUM((elem->>'amount')::numeric) as total_amount
     FROM bets, jsonb_array_elements(numbers) as elem
     WHERE status != 'cancelled' ${where}
     GROUP BY number ORDER BY total_amount DESC`,
    params
  );
  const rows = result.rows.map((r: any) => ({ number: r.number, totalBets: parseInt(r.total_bets), totalAmount: parseFloat(r.total_amount) }));
  res.json({
    topNumbers: rows.slice(0, 10),
    leastNumbers: [...rows].reverse().slice(0, 10),
    heatmap: rows.slice(0, 100).map((r: any) => ({ number: r.number, amount: r.totalAmount }))
  });
});

router.get("/admin/bets/analytics/markets", requireAdminAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT b.market_id, m.name as market_name, COUNT(b.id) as total_bets, SUM(b.total_amount) as total_amount
     FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.status != 'cancelled'
     GROUP BY b.market_id, m.name ORDER BY total_amount DESC`
  );
  res.json({ data: result.rows.map((r: any) => ({
    marketId: r.market_id, marketName: r.market_name,
    totalBets: parseInt(r.total_bets), totalAmount: parseFloat(r.total_amount)
  })) });
});

export default router;
