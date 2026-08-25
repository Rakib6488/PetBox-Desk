<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Petbox Desk

Petbox Desk is an omnichannel customer support workspace with agent inbox, email support, administration, reports and PostgreSQL-backed APIs.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

   This command builds the frontend and starts Petbox Desk on `http://0.0.0.0:10000/` (override with `HOST` and `PORT`).

## Production backend setup

The backend uses Node.js + TypeScript + Express, PostgreSQL, and REST APIs. Copy `.env.example` to `.env` and set `DATABASE_URL` and a long random `SESSION_SECRET`.

Initialize the database:

```bash
npm run db:init
npm run db:create-user -- support@example.com "Support Admin" admin "use-a-strong-password"
```

The role and password arguments are required in this command. Passwords must
be at least 8 characters; there is no default password.

The main protected endpoints are `/api/auth/*`, `/api/state`, `/api/conversations/:id`, `/api/email/*`, and `/api/whatsapp/*`. Authentication uses an HttpOnly session cookie; passwords are hashed with Node.js `scrypt`.

For Render, set `DATABASE_URL`, `SESSION_SECRET`, and `CLIENT_ORIGIN` in the service Environment Variables. The health-check path for the integrated service is `/api/health`; Render supplies the listening `PORT` automatically. `APP_URL` is also accepted as an additional Socket.IO origin.

The integrated root server is protected by the normal session cookie. The standalone WhatsApp server is intended only for trusted internal callers and requires `WHATSAPP_API_KEY`; do not expose it directly to browsers or the public internet.

On production startup, optional `ADMIN_*`, `SUPERVISOR_*`, `AGENT_*`, and `BI_*` environment variables automatically create or update the four workspace users. Keep the passwords in Render Environment Variables only; do not commit `.env`.

## Project structure

```text
server.ts                  # server bootstrap only
src/server/config.ts       # environment and service configuration
src/server/db.ts           # PostgreSQL pool and health check
src/server/auth.ts         # sessions and password hashing
src/server/routes/core.ts  # auth, state and conversation APIs
src/server/routes/email.ts # SMTP, IMAP and AI email APIs
src/services/apiClient.ts  # shared frontend HTTP client
src/features/auth/authApi.ts # frontend authentication API
src/features/app/storage.ts # frontend storage adapter
src/features/inbox/inboxApi.ts # inbox/conversation API
src/features/email/emailApi.ts # email API
src/components/auth/       # login UI
src/components/agent/      # inbox and agent UI
src/components/admin/      # admin UI
src/components/email/      # email UI
src/components/reports/    # reporting UI
database/schema.sql        # PostgreSQL schema
scripts/                   # database setup and user creation scripts
```
