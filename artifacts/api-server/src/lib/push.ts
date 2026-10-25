import { pool } from "@workspace/db";
import { logger } from "./logger";

const EXPO_PUSH_URL = process.env.EXPO_PUSH_URL || "https://exp.host/--/api/v2/push/send";
const CHUNK = 100; // Expo accepts up to 100 messages per request

type PushMessage = { to: string; title: string; body: string; sound: "default"; channelId: string; priority: "high"; data: Record<string, unknown> };

async function sendChunk(messages: PushMessage[]) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (process.env.EXPO_ACCESS_TOKEN) headers.Authorization = `Bearer ${process.env.EXPO_ACCESS_TOKEN}`;
  const res = await fetch(EXPO_PUSH_URL, { method: "POST", headers, body: JSON.stringify(messages) });
  if (!res.ok) {
    logger.warn({ status: res.status }, "Expo push request failed");
    return;
  }
  const json = (await res.json()) as { data?: { status: string; details?: { error?: string } }[] };
  // Drop tokens that Expo says no longer exist (app uninstalled / permission revoked)
  const dead: string[] = [];
  (json.data ?? []).forEach((ticket, i) => {
    if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") dead.push(messages[i].to);
  });
  if (dead.length) await pool.query("DELETE FROM push_tokens WHERE token = ANY($1::text[])", [dead]);
}

// Fire-and-forget push to every registered phone of the given users. Never throws.
export async function sendPush(userIds: string[], title: string, body: string, data: Record<string, unknown> = {}) {
  try {
    if (userIds.length === 0) return;
    const rows = await pool.query("SELECT token FROM push_tokens WHERE user_id = ANY($1::uuid[])", [userIds]);
    const messages: PushMessage[] = rows.rows
      .map((r: any) => r.token as string)
      .filter((t) => /^(Exponent|Expo)PushToken\[.+\]$/.test(t))
      .map((to) => ({ to, title, body, sound: "default", channelId: "default", priority: "high", data }));
    for (let i = 0; i < messages.length; i += CHUNK) {
      await sendChunk(messages.slice(i, i + CHUNK));
    }
  } catch (err) {
    logger.warn({ err }, "Push send failed");
  }
}
