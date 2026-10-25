import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../middlewares/auth.js";

const router = Router();

const TOKEN_RE = /^(Exponent|Expo)PushToken\[[A-Za-z0-9_\-]{10,}\]$/;

// The app calls this after login with its Expo push token so we can reach the phone.
router.post("/user/push-token", requireAuth, async (req, res) => {
  const token = String(req.body.token ?? "");
  const platform = String(req.body.platform ?? "android").slice(0, 20);
  if (!TOKEN_RE.test(token)) { res.status(400).json({ error: "Invalid push token" }); return; }
  // A phone belongs to whoever logged in last: re-assign the token if another account used it before
  await pool.query(
    `INSERT INTO push_tokens (user_id, token, platform) VALUES ($1, $2, $3)
     ON CONFLICT (token) DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
    [req.user!.userId, token, platform]
  );
  res.json({ success: true });
});

// Called on logout so the next person on this phone doesn't receive this player's alerts.
router.delete("/user/push-token", requireAuth, async (req, res) => {
  const token = String(req.body?.token ?? "");
  await pool.query("DELETE FROM push_tokens WHERE user_id = $1 AND token = $2", [req.user!.userId, token]);
  res.json({ success: true });
});

export default router;
