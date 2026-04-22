# Ozerli — Deployment & Operations

Verifiable support layer. OSS tier is MIT-licensed; paid capabilities live behind
a tier gate. This document covers required environment, HTTP surface, and the
production-readiness baseline implemented in the M-tier hardening pass.

---

## 1. Required environment

| Variable              | Required | Notes                                                                 |
| --------------------- | -------- | --------------------------------------------------------------------- |
| `NODE_ENV`            | yes      | `development` \| `test` \| `production`                               |
| `PORT`                | yes      | integer 1–65535                                                       |
| `DATABASE_URL`        | yes      | Postgres connection string                                            |
| `SESSION_SECRET`      | yes      | ≥ 32 chars in production                                              |
| `SIGNING_KEY_SECRET`  | prod     | KEK for the ED25519 signing key (AES-256-GCM)                         |
| `CORS_ORIGIN`         | prod     | Comma-separated allow-list (e.g. `https://app.ozerli.com`)            |
| `OZERLI_TIER`         | no       | `oss` (default) or `paid`                                             |
| `TRUST_PROXY`         | no       | Hop count for `trust proxy`, default `1`                              |
| `DB_POOL_MAX`         | no       | Default `20`                                                          |

Config is validated once at startup (`src/lib/config.ts`); the process fails
fast on any missing/invalid value.

---

## 2. HTTP surface (summary)

All routes are mounted under `/api`.

### Auth (`/api/auth/*`)
- `GET  /auth/session`
- `POST /auth/email/request-otp`
- `POST /auth/email/verify-otp`
- `GET  /auth/wallet/nonce`
- `POST /auth/wallet/verify`
- `POST /auth/logout`

### Tickets (`/api/tickets/*`)
- `GET    /tickets`
- `POST   /tickets`
- `GET    /tickets/:id`
- `POST   /tickets/:id/reply`
- `PATCH  /tickets/:id`

### Users (`/api/users/*`)
- `GET    /users/me`
- `PATCH  /users/me`

### Dashboard (`/api/dashboard/*`)
- `GET /dashboard/summary`

### Health
- `GET /api/healthz` — pings the DB (`SELECT 1`, 2s timeout). Returns 503 on failure.

### Paid (`/api/paid/*`) — behind `requireStaff` + `paidTierGate`
- Analytics, SLA workflows, AI triage, compliance, automation.

---

## 3. Security posture

- **helmet** baseline headers (CSP left to frontend origin).
- **CORS** explicit allow-list in production; rejects unlisted origins.
- **Session cookie**: `httpOnly`, `sameSite=lax`, `secure` in prod, 7-day TTL.
- **Session store**: `connect-pg-simple` (table `session`, auto-created).
- **Trust proxy**: enabled — correct client IP + secure cookie behind LB.
- **OTP**: never logged in production; dev log is gated on `NODE_ENV`.
- **Signing key**: ED25519 private key AES-256-GCM encrypted at rest with KEK
  derived from `SIGNING_KEY_SECRET` (falls back to `SESSION_SECRET` in dev).
- **Global error handler**: strips internals; returns `{ "error": "internal_error" }`.
- **CSRF**: not yet enforced — see §6.

---

## 4. Database

- Drizzle ORM + `pg.Pool` (max 20, 2s connect, 30s idle).
- `pool.on('error')` logs transient idle-client errors without crashing.
- Migrations: `drizzle.config.ts` in `lib/db/`.

---

## 5. Process lifecycle

- `SIGTERM` / `SIGINT` → close HTTP server → `pool.end()` → exit.
- 10 s hard-kill fallback (`unref`'d timer).
- `unhandledRejection` logged; `uncaughtException` logged and exits.

---

## 6. Known gaps (follow-up)

- **CSRF** — not yet enforced. Session-cookie auth + browser form posts need
  double-submit-cookie or `csrf-sync`. Requires coordinated change to
  `lib/api-client-react/src/custom-fetch.ts`.
- **Rate limiting** — `rate_limits` table exists in schema but is unused.
- **Structured audit export** — paid tier surfaces compliance data; no
  scheduled offload yet.
- **OpenTelemetry** — only pino logs today.

---

## 7. Build & run

```powershell
corepack pnpm install
corepack pnpm -F @workspace/api-server run build
corepack pnpm -F @workspace/api-server run start
```

Frontend (Vite): `corepack pnpm -F trustdesk dev` → http://localhost:5173

---

## 8. Production readiness — M-tier status

| ID  | Item                                    | Status |
| --- | --------------------------------------- | ------ |
| M1  | Persistent session store (pg)           | ✅     |
| M2  | `trust proxy`                           | ✅     |
| M3  | SIGTERM + uncaught handlers             | ✅     |
| M4  | CORS allow-list                         | ✅     |
| M5  | pg pool tuning                          | ✅     |
| M6  | `/healthz` DB ping                      | ✅     |
| M7  | CSRF                                    | ⏳     |
| M8  | Env validation module                   | ✅     |
| M9  | Gate dev OTP log                        | ✅     |
