# Lucky777 – Deployment Guide (Render + Neon)

## Architecture (and your "API gateway")
You do **not** need a separate API gateway (AWS API Gateway, Kong, etc.). One Express service is the gateway:

```
Mobile app ──┐
             ├──► https://<your-service>.onrender.com ──► Express (artifacts/api-server)
Admin panel ─┘         /api/*  → REST API  (auth, bets, markets, wallet, admin-*)
                       /*      → admin panel static files
                                   │
                                   ▼
                          Neon PostgreSQL (DATABASE_URL)
```
Render provides HTTPS and the public URL; that URL is the only "gateway" the apps need. Health check: `GET /api/healthz`.

## Step 1 – Database (Neon)
1. Create a project at https://neon.tech and copy the connection string (`postgres://...?sslmode=require`).
2. Load schema and seed once from your computer:
   ```bash
   psql "<connection-string>" -f scripts/create-schema.sql
   psql "<connection-string>" -f scripts/seed-demo-data.sql
   ```
3. Immediately change the seeded admin passwords (see `scripts/seed-demo-data.sql`) or skip the seed and create your own admin.

## Step 2 – Backend + Admin panel on Render
1. Push this repo to GitHub.
2. Render → New → **Blueprint** → select the repo. It reads `render.yaml` (builds admin panel + API, starts `artifacts/api-server/dist/index.mjs`).
3. Set environment variables:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `JWT_SECRET` | long random string (`openssl rand -hex 32`) – required in production |
   | `NODE_ENV` | `production` (preset) |
4. Deploy. Check `https://<service>.onrender.com/api/healthz`, then open `https://<service>.onrender.com/` for the admin panel.
5. Free plan sleeps after inactivity (first request is slow). Use a paid plan, or ping `/api/healthz` every 10 min, for a real launch.

## Step 3 – Mobile app (Android APK)
1. In `artifacts/mobile/eas.json` set `EXPO_PUBLIC_DOMAIN` (both profiles) to your Render host **without** `https://`, e.g. `lucky777.onrender.com`.
2. Build:
   ```bash
   npm i -g eas-cli
   eas login
   cd artifacts/mobile
   eas build -p android --profile preview     # APK for sharing
   eas build -p android --profile production  # AAB for Play Store
   ```
3. Install the APK and log in.

## Custom domain (optional)
Render → service → Settings → Custom Domains → add `api.yourdomain.com`, create the CNAME it shows, then use that host as `EXPO_PUBLIC_DOMAIN` and rebuild the app.

## Production checklist
- [ ] `JWT_SECRET` set to a strong unique value
- [ ] Seed/demo passwords changed
- [ ] `cors()` in `artifacts/api-server/src/app.ts` is open to all origins; restrict to your domain if you want
- [ ] Neon backups enabled
- [ ] `EXPO_PUBLIC_DOMAIN` points to the final host before building the APK
