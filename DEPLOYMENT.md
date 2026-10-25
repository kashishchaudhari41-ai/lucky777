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

## Build from GitHub (automatic)
- **API + admin panel:** Render watches the GitHub repo. Every push to `main` redeploys automatically (Render → New → Blueprint → pick this repo).
- **Checks:** `.github/workflows/ci.yml` runs typecheck and builds on every push / pull request.
- **Android APK:** GitHub → Actions → **Build Android APK** → Run workflow, enter your API host (e.g. `lucky777.onrender.com`). The run prints the APK download link.
  - One-time: create a free Expo account, run `eas init` in `artifacts/mobile` (this replaces the old `projectId` in `app.json` with yours), commit it, and add your Expo access token as the repository secret `EXPO_TOKEN`.

## Site layout
| Address | What |
|---|---|
| `/` | Public landing page with the **Download APK** button (`artifacts/landing`) |
| `/download` | Streams the APK as `Lucky777.apk`. Serves your **newest finished Android build automatically** (needs `EXPO_ACCESS_TOKEN` on Render); `APK_URL` pins a specific file instead |
| `/admin/` | Admin panel (phone friendly). Not indexed by search engines |
| `/api/*` | REST API |

**Automatic latest APK:** on Render add `EXPO_ACCESS_TOKEN` (expo.dev → Account settings → Access tokens). The server then looks up the newest finished Android build every 5 minutes, so the landing page always downloads the app you built last, with no redeploy. Without the token it serves the build that was current at release time.
Expo deletes build files after about 30 days, so rebuild at least monthly (or keep a copy of the APK and pin it with `APK_URL`).

## Security notes
- Password reset by phone is disabled (there is no SMS provider to verify the owner). Reset a player's password from the admin API `PUT /api/admin/users/:id/password`.
- Login, register and API calls are rate limited per IP; blocked users lose access immediately.
- Cross-site browser access (CORS) is off unless you set `CORS_ORIGINS`.
- Change the seeded admin password, keep `JWT_SECRET` long and secret, and rotate any credential that has been pasted into chat or email.

## Push notifications (Android)
The server sends a push whenever a player gets an in-app notification (deposit approved, bet won, withdrawal paid, admin broadcast...). The app registers its phone token after login and removes it on logout. Android needs a free Firebase project to deliver pushes:

1. https://console.firebase.google.com → **Add project** (e.g. Lucky777) → add an **Android app** with package name `com.lucky777.app` → download **google-services.json**.
2. Firebase → Project settings → **Service accounts** → **Generate new private key** (a JSON file).
3. Give the key to Expo: `cd artifacts/mobile && npx eas-cli credentials` → Android → *preview* → *Google Service Account* → *Manage your Google Service Account Key for Push Notifications (FCM V1)* → upload the JSON.
4. Store google-services.json as an EAS file secret (it is git-ignored on purpose):
   ```bash
   npx eas-cli env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --scope project --visibility sensitive --environment preview --environment production
   ```
5. Rebuild the APK (`npx eas-cli build -p android --profile preview`). Players must tap **Allow** on the notification permission prompt.

Optional: set `EXPO_ACCESS_TOKEN` on Render (expo.dev → Access tokens) to enable Expo's enhanced push security.
