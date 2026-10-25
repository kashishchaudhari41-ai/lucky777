import { pool } from "@workspace/db";

type Queryable = { query: (sql: string, params?: any[]) => Promise<any> };

export type NotifType = "deposit" | "withdrawal" | "bet" | "win" | "result" | "account" | "info";

export const inr = (n: number | string) => `₹${Number(n).toLocaleString("en-IN")}`;

// Adds an in-app notification for one player. Pass a transaction client to make it atomic with the
// action it describes; failures never break the action itself.
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
}
