---
name: Our Empire workflow setup
description: How to start the API server and admin panel locally
---

## API Server Workflow
Command: `PORT=8080 pnpm --filter @workspace/api-server run dev`
Port: 8080
The workflow also serves the built admin panel as static files from `artifacts/admin-panel/dist/public/`.

**Why:** The api-server/src/index.ts throws if PORT is not set. The workflow must include PORT=8080 explicitly.

## Admin Panel
Must be built first with: `PORT=5173 BASE_PATH=/ pnpm --filter @workspace/admin-panel run build`
The vite.config.ts requires both PORT and BASE_PATH at build time.
After build, the API server serves it at `/`.

## Database
Schema SQL file: `scripts/create-schema.sql` — run with `psql "$DATABASE_URL" -f scripts/create-schema.sql`
Seed script: `scripts/seed-demo-data.mjs` — requires pg/bcrypt; run from api-server dir context.
Or use psql directly with bcrypt hashes for admin users.

## Credentials (seeded)
- Admin / demo logins: see scripts/seed-demo-data.sql (local testing only)
