import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import path from "path";
import { Readable } from "stream";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { rateLimit } from "./lib/rateLimit";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const adminPanelDist = path.resolve(__dirname, "../../../artifacts/admin-panel/dist/public");
const landingDir = path.resolve(__dirname, "../../../artifacts/landing");

// Fallback APK if the latest build cannot be looked up (see resolveApkUrl below).
const DEFAULT_APK_URL = "https://expo.dev/artifacts/eas/PUhTn0g9xidvfELacY7Mh82Q80CH1eeSaWBVwyhDTzw.apk";

const app: Express = express();

app.disable("x-powered-by");
app.set("trust proxy", 1); // Render sits behind a proxy; needed for the real client IP

app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// The mobile app and the admin panel call the API from the same origin / natively, so browsers
// from other sites get no CORS access unless CORS_ORIGINS (comma separated) is set.
const allowedOrigins = (process.env.CORS_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: allowedOrigins.length ? allowedOrigins : false }));

app.use(express.json({ limit: "3mb" })); // QR images are uploaded as data URLs
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// Brute-force protection
app.use("/api/auth/login", rateLimit({ windowMs: 15 * 60_000, max: 30, message: "Too many login attempts. Try again in 15 minutes." }));
app.use("/api/admin/auth/login", rateLimit({ windowMs: 15 * 60_000, max: 10, message: "Too many login attempts. Try again in 15 minutes." }));
app.use("/api/auth/register", rateLimit({ windowMs: 60 * 60_000, max: 10, message: "Too many sign-ups from this network. Try again later." }));
app.use("/api", rateLimit({ windowMs: 60_000, max: 1200, message: "Too many requests. Slow down." }));

app.use("/api", router);

// Stable public download address for the Android app: https://<host>/download
// Which APK to serve, newest first:
//  1. APK_URL (env) if set - pins a specific file
//  2. the latest finished Android build of the Expo project, looked up with EXPO_ACCESS_TOKEN
//  3. DEFAULT_APK_URL, the build that was current when this server was released
const EXPO_PROJECT_ID = process.env.EXPO_PROJECT_ID || "afd6453d-c6c2-4121-bb46-de7d5a656eef";
const EXPO_GRAPHQL_URL = process.env.EXPO_GRAPHQL_URL || "https://api.expo.dev/graphql";
let latestCache: { url: string; at: number } | null = null;

async function latestExpoApkUrl(): Promise<string | null> {
  if (!process.env.EXPO_ACCESS_TOKEN) return null;
  if (latestCache && Date.now() - latestCache.at < 5 * 60_000) return latestCache.url;
  const res = await fetch(EXPO_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` },
    body: JSON.stringify({
      query: `query($id: String!) { app { byId(appId: $id) {
        builds(limit: 10, offset: 0, platform: ANDROID, status: FINISHED) { id createdAt artifacts { buildUrl } } } } }`,
      variables: { id: EXPO_PROJECT_ID },
    }),
    signal: AbortSignal.timeout(8000),
  });
  const json: any = await res.json();
  const builds: any[] = json?.data?.app?.byId?.builds ?? [];
  const best = builds
    .filter((b) => typeof b?.artifacts?.buildUrl === "string" && b.artifacts.buildUrl.endsWith(".apk"))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  if (!best) return null;
  latestCache = { url: best.artifacts.buildUrl, at: Date.now() };
  return latestCache.url;
}

async function resolveApkUrl(): Promise<{ url: string; source: "pinned" | "expo-latest" | "fallback" }> {
  if (process.env.APK_URL) return { url: process.env.APK_URL, source: "pinned" };
  try {
    const latest = await latestExpoApkUrl();
    if (latest) return { url: latest, source: "expo-latest" };
  } catch (err) {
    logger.warn({ err }, "Could not look up latest Expo build; using fallback APK");
  }
  return { url: DEFAULT_APK_URL, source: "fallback" };
}

// Stable public download address for the Android app: https://<host>/download
// Streamed through this server so the file is always named Lucky777.apk with the Android package type.
app.get("/download", async (_req, res) => {
  const { url, source } = await resolveApkUrl();
  res.setHeader("X-Apk-Source", source); // pinned | expo-latest | fallback - handy to confirm the token works
  try {
    const upstream = await fetch(url, { redirect: "follow" });
    if (!upstream.ok || !upstream.body) throw new Error(`upstream ${upstream.status}`);
    res.setHeader("Content-Type", "application/vnd.android.package-archive");
    res.setHeader("Content-Disposition", 'attachment; filename="Lucky777.apk"');
    res.setHeader("Cache-Control", "no-cache");
    const len = upstream.headers.get("content-length");
    if (len) res.setHeader("Content-Length", len);
    Readable.fromWeb(upstream.body as any).pipe(res);
  } catch (err) {
    logger.error({ err }, "APK proxy failed, redirecting");
    res.redirect(302, url);
  }
});

// Admin panel lives under /admin (built with BASE_PATH=/admin/)
app.use("/admin", express.static(adminPanelDist));
app.get("/admin/{*path}", (_req, res) => {
  res.sendFile(path.join(adminPanelDist, "index.html"));
});

// Public landing page at /
app.use(express.static(landingDir));
app.get("/{*path}", (_req, res) => {
  res.status(404).sendFile(path.join(landingDir, "index.html"));
});

export default app;
