import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAdminAuth } from "../middlewares/auth.js";
import { sendPush } from "../lib/push.js";

const router = Router();

router.post("/admin/notifications/send", requireAdminAuth, async (req, res) => {
  const { title, message, type, targetUsers, targetMarket } = req.body;
  if (!title || !message || !type) { res.status(400).json({ error: "title, message, type required" }); return; }
  try {
    const notif = await pool.query(
      `INSERT INTO notifications (title, message, type, target_users, target_market, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [title, message, type, targetUsers ? JSON.stringify(targetUsers) : null, targetMarket || null, req.admin!.adminId]
    );
    const notifId = notif.rows[0].id;

    // Send to target users
    let userIds: string[] = [];
    if (type === "all") {
      const all = await pool.query("SELECT id FROM users WHERE status = 'active'");
      userIds = all.rows.map((u: any) => u.id);
    } else if (type === "specific" && targetUsers?.length) {
      userIds = targetUsers;
    } else if (type === "market" && targetMarket) {
      const bettors = await pool.query("SELECT DISTINCT user_id FROM bets WHERE market_id = $1", [targetMarket]);
      userIds = bettors.rows.map((u: any) => u.user_id);
    }

    for (const uid of userIds) {
      await pool.query("INSERT INTO user_notifications (user_id, notification_id, title, message, type) VALUES ($1, $2, $3, $4, $5)",
        [uid, notifId, title, message, type]);
    }
    void sendPush(userIds, title, message, { type });
    res.json({ message: `Notification sent to ${userIds.length} users`, success: true });
  } catch (err) {
    req.log?.error(err);
    res.status(500).json({ error: "Failed to send" });
  }
});

router.get("/admin/notifications/history", requireAdminAuth, async (req, res) => {
  const result = await pool.query(
    "SELECT id, title, message, type, sent_at as created_at FROM notifications ORDER BY sent_at DESC LIMIT 50"
  );
  res.json({ notifications: result.rows.map((n: any) => ({
    id: n.id, title: n.title, message: n.message, type: n.type, isRead: true, createdAt: n.created_at
  })) });
});

export default router;
