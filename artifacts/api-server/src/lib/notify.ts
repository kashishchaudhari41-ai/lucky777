import { pool } from "@workspace/db";
import { sendPush } from "./push";

type Queryable = { query: (sql: string, params?: any[]) => Promise<any> };

export type NotifType = "deposit" | "withdrawal" | "bet" | "win" | "result" | "account" | "info";

export const inr = (n: number | string) => `₹${Number(n).toLocaleString("en-IN")}`;

// Adds an in-app notification for one player and pushes it to their phone. Pass a transaction
// client to make the in-app record atomic with the action it describes; failures never break
// the action itself. The push is sent right away (fire-and-forget).
export async function notifyUser(
  userId: string,
  title: string,
  message: string,
  type: NotifType = "info",
  db: Queryable = pool,
) {
  try {
    await db.query(
      "INSERT INTO user_notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)",
      [userId, title, message, type],
    );
  } catch {
    // ignore: a missed notification must not fail a deposit/bet/withdrawal
  }
  // Inside a DB transaction, wait a moment so the push doesn't go out before the COMMIT
  const delay = db === pool ? 0 : 1500;
  setTimeout(() => void sendPush([userId], title, message, { type }), delay);
}
