# Lucky777 – Setup Guide

Monorepo (pnpm workspaces): Express API, React admin panel, Expo mobile app, shared libs.

| Path | What |
|---|---|
| `artifacts/api-server` | Express 5 REST API (`/api`), PostgreSQL via `pg` |
| `artifacts/admin-panel` | Vite + React + Tailwind admin panel |
| `artifacts/mobile` | Expo / React Native player app |
| `lib/db`, `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` | DB, OpenAPI spec and generated clients |
| `scripts` | `create-schema.sql`, `seed-demo-data.sql/.mjs` |

## 1. Prerequisites
- Node.js 20+ (24 recommended)
- pnpm 10: `npm i -g pnpm@10`
- A PostgreSQL database (local, or free on [neon.tech](https://neon.tech))

## 2. Install
```bash
pnpm install --ignore-scripts
```
- `--ignore-scripts` is needed on Windows (the root `preinstall` uses `sh`).
- `pnpm-workspace.yaml` excludes Windows native binaries (it was made for Replit/Linux). On Windows, delete the lines containing `win32-x64` before installing (esbuild, rollup, lightningcss, tailwind oxide), then install again.
- After install, run `pnpm rebuild bcrypt` if bcrypt fails to load.

## 3. Database
```bash
export DATABASE_URL="postgres://user:pass@host:5432/dbname"   # PowerShell: $env:DATABASE_URL="..."
psql "$DATABASE_URL" -f scripts/create-schema.sql
psql "$DATABASE_URL" -f scripts/seed-demo-data.sql
```
Seed logins: admin panel `admin` / `Admin@123` (also `ourempire` / `Ourempire@#000#@`); demo app user phone `9876543210` / `Test@1234`. **Change these before going live.**

## 4. Run the API (port 8080)
```bash
export DATABASE_URL=... JWT_SECRET=<long-random-string> PORT=8080
pnpm --filter @workspace/api-server run build
pnpm --filter @workspace/api-server run start
```
`JWT_SECRET` is mandatory when `NODE_ENV=production`.

## 5. Run the admin panel (port 5173)
```bash
# bash
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/admin-panel run dev
# PowerShell
$env:PORT=5173; $env:BASE_PATH="/"; pnpm --filter @workspace/admin-panel run dev
```
(In Git Bash, `BASE_PATH=/` gets mangled; use PowerShell.) Open http://localhost:5173.

## 6. Run the mobile app
```bash
cd artifacts/mobile
EXPO_PUBLIC_DOMAIN=<your-api-host> pnpm exec expo start
```
`EXPO_PUBLIC_DOMAIN` is the host (no scheme) serving the API; see `eas.json`. Scan the QR code with Expo Go, or press `w` for web.
APK build: `eas build -p android --profile preview` (needs an Expo account; edit the domain in `eas.json`).

## 7. Checks
```bash
pnpm run typecheck      # libs + all apps
pnpm run build          # typecheck + builds
```

## 8. Deploy on Render
`render.yaml` builds the admin panel and API into one web service. Set env vars `DATABASE_URL` and `JWT_SECRET` in the Render dashboard.
