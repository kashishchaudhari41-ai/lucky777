# Lucky777 - Satta Matka

A complete Satta Matka betting platform with Android mobile app, admin panel, and REST API backend.

## Run & Operate

- API server runs automatically on port 8080 via workflow
- Admin panel runs automatically on port 5173 via workflow
- Mobile app (Expo) runs automatically via workflow
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string (already set)

## Credentials

- Admin panel login: created by you (the demo seed accounts are for local testing only)
- Admin panel URL: preview pane at `/` (served by API server)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 (artifacts/api-server) — serves on /api
- DB: PostgreSQL (Neon) — raw SQL via pg Pool
- Mobile: Expo + React Native (artifacts/mobile)
- Admin Panel: Vite + React + Tailwind + shadcn/ui (artifacts/admin-panel)
- API client: Orval-generated hooks in lib/api-client-react

## Where things live

- `artifacts/api-server/src/routes/` — all API route handlers (auth, bets, markets, wallet, admin-*)
- `artifacts/mobile/app/` — Expo Router screens
- `artifacts/mobile/context/AuthContext.tsx` — mobile auth state + token storage
- `artifacts/admin-panel/src/pages/` — admin panel pages
- `artifacts/admin-panel/src/components/layout/admin-layout.tsx` — sidebar layout
- `lib/api-client-react/` — generated React Query hooks used by both admin and mobile
- Database tables: users, markets, bets, results, transactions, upi_accounts, app_settings, admin_users, notifications, user_notifications, activity_logs

## Architecture decisions

- API uses raw SQL (pg Pool) rather than Drizzle ORM queries — avoids schema file mismatch issues
- Admin panel sets auth token in localStorage and passes via `setAuthTokenGetter` in App.tsx
- Mobile app sets API base URL from `EXPO_PUBLIC_DOMAIN` env var
- Bet types supported: jantri, open, crossing, no-to-no, single, jodi, panna
- Markets are seeded with 5 standard Satta Matka markets (Milan Day, Kalyan, Milan Night, Rajdhani Day, Rajdhani Night)
- Run `psql "$DATABASE_URL" -f scripts/create-schema.sql` to recreate all tables from scratch
- Run `node scripts/seed-demo-data.mjs` (from api-server directory) to add demo data

## Product

- Users register with phone + password, get a referral code
- Users can place bets on markets (Jantri / Open / Crossing / No-To-No game types)
- Users can deposit via UPI and withdraw to bank/UPI
- Admin can manage users, markets, results, deposits/withdrawals, send notifications
- Results declared by admin automatically settle winning bets and credit winnings

## User preferences

- Color palette: Deep Forest Green (#1a4718), Forest Green (#48723e), Sage Green (#83a561), Light Lime (#bfdb81), Pale Yellow (#eae69e) on near-black background
- Build APK using Expo in Replit shell: `cd artifacts/mobile && npx expo build:android` or `eas build -p android`

## Gotchas

- Database tables were created with raw SQL (not drizzle push) — the lib/db/src/schema/index.ts is intentionally empty
- Admin token stored in localStorage as "adminToken"; user token in AsyncStorage as "lucky777_token"
- Always run `pnpm install --no-frozen-lockfile` after adding new packages
- The API server must be running before admin panel API calls work
- bets.game_type CHECK constraint includes: jantri, open, crossing, no-to-no, single, jodi, panna
- transactions.method column allows NULL (for admin adjustments)

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
