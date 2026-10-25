import { Router } from "express";
import { pool } from "@workspace/db";
import { notifyUser, inr } from "../lib/notify.js";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

function formatBet(b: any) {
  return {
    id: b.id, userId: b.user_id, marketId: b.market_id, marketName: b.market_name,
    gameType: b.game_type, numbers: b.numbers, totalAmount: parseFloat(b.total_amount),
    status: b.status, winAmount: parseFloat(b.win_amount || 0), createdAt: b.created_at, settledAt: b.settled_at
  };
}

router.post("/bets/place", requireAuth, async (req, res) => {
  const { marketId, gameType, numbers } = req.body;
  if (!marketId || !gameType || !numbers?.length) {
    res.status(400).json({ error: "marketId, gameType, numbers required" });
    return;
  }
  try {
    const market = await pool.query("SELECT id, is_betting_open, min_bet, max_bet FROM markets WHERE id = $1 AND status = 'active'", [marketId]);
    if (market.rows.length === 0) { res.status(404).json({ error: "Market not found" }); return; }
    if (!market.rows[0].is_betting_open) { res.status(400).json({ error: "Betting is closed for this market" }); return; }
    const minBet = parseFloat(market.rows[0].min_bet), maxBet = parseFloat(market.rows[0].max_bet);
    if (!Array.isArray(numbers) || numbers.some((n: any) =>
      typeof n?.number !== "string" || !n.number || !Number.isFinite(n.amount) || n.amount < minBet || n.amount > maxBet)) {
      res.status(400).json({ error: `Each bet needs a number and an amount between ₹${minBet} and ₹${maxBet}` }); return;
    }
    const totalAmount = numbers.reduce((sum: number, n: { amount: number }) => sum + n.amount, 0);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const debit = await client.query(
        "UPDATE users SET balance = balance - $1 WHERE id = $2 AND balance >= $1 RETURNING id", [totalAmount, req.user!.userId]);
      if (debit.rows.length === 0) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Insufficient balance" }); return;
      }
      const betRes = await client.query(
        `INSERT INTO bets (user_id, market_id, game_type, numbers, total_amount, status)
         VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING *`,
        [req.user!.userId, marketId, gameType, JSON.stringify(numbers), totalAmount]
      );
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, status, method) VALUES ($1, 'bet', $2, 'completed', 'wallet')`,
        [req.user!.userId, totalAmount]
      );
      const mk = await client.query("SELECT name FROM markets WHERE id = $1", [marketId]);
      await notifyUser(req.user!.userId, "Bet placed",
        `${inr(totalAmount)} on ${mk.rows[0]?.name ?? "market"} (${String(gameType).toUpperCase()}). Good luck!`, "bet", client);
      await client.query("COMMIT");
      const bet = betRes.rows[0];
      const mName = await pool.query("SELECT name FROM markets WHERE id = $1", [marketId]);
      res.status(201).json({ ...formatBet({ ...bet, market_name: mName.rows[0].name }) });
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to place bet" });
  }
});

router.get("/bets/my-bets", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, m.name as market_name FROM bets b JOIN markets m ON b.market_id = m.id
     WHERE b.user_id = $1 ORDER BY b.created_at DESC`,
    [req.user!.userId]
  );
  res.json({ bets: result.rows.map(formatBet) });
});

router.get("/bets/:id", requireAuth, async (req, res) => {
  const result = await pool.query(
    `SELECT b.*, m.name as market_name FROM bets b JOIN markets m ON b.market_id = m.id WHERE b.id = $1 AND b.user_id = $2`,
    [req.params.id, req.user!.userId]
  );
  if (result.rows.length === 0) { res.status(404).json({ error: "Bet not found" }); return; }
  res.json(formatBet(result.rows[0]));
});

router.delete("/bets/:id", requireAuth, async (req, res) => {
  const bet = await pool.query("SELECT * FROM bets WHERE id = $1 AND user_id = $2", [req.params.id, req.user!.userId]);
  if (bet.rows.length === 0) { res.status(404).json({ error: "Bet not found" }); return; }
  if (bet.rows[0].status !== "pending") { res.status(400).json({ error: "Can only cancel pending bets" }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cancelled = await client.query("UPDATE bets SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING id", [req.params.id]);
    if (cancelled.rows.length === 0) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Can only cancel pending bets" }); return;
    }
    await client.query("UPDATE users SET balance = balance + $1 WHERE id = $2", [bet.rows[0].total_amount, req.user!.userId]);
    await notifyUser(req.user!.userId, "Bet cancelled", `Your bet was cancelled and ${inr(bet.rows[0].total_amount)} was refunded.`, "bet", client);
    await client.query("COMMIT");
    res.json({ message: "Bet cancelled", success: true });
  } catch (e) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to cancel" });
  } finally {
    client.release();
  }
});

export default router;
