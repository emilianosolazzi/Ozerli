# TrustDesk

## Overview

TrustDesk is a verifiable support platform where every staff response is cryptographically signed and all messages are hash-chained for tamper evidence. Built for crypto-native teams and DAOs who need auditability, while remaining approachable for regular users.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Session**: express-session
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + Wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

### Identity Layer
- Email OTP authentication (6-digit code, 10 min expiry)
- SIWE (Sign-In with Ethereum) wallet authentication
- Multi-identity support (users can link both email and wallet)
- Session-based auth via express-session

### Ticket Engine
- UUID-based tickets with status: OPEN | IN_PROGRESS | RESOLVED | CLOSED
- Priority: LOW | NORMAL | HIGH | URGENT
- Hash-chained messages: each message stores `prevHash` and `messageHash` (SHA-256 of ticket+seq+sender+content+prevHash+timestamp)
- Staff messages are automatically signed using ED25519 server keypair

### Trust / Anti-Abuse
- Per-user `riskScore` (0-1) and `reputationScore` (0-1)
- Risk events table for audit trail of scoring events
- Staff can ban users and it's recorded in staff_actions audit log

## Database Schema

- `users` — canonical identity with reputation/risk scores
- `auth_identities` — linked email/wallet identities per user
- `email_otp` — OTP codes with expiry
- `siwe_nonces` — SIWE nonces with expiry
- `tickets` — support tickets
- `messages` — append-only hash-chained message log
- `message_signatures` — ED25519 signatures for staff messages
- `ticket_anchors` — optional on-chain hash checkpoints
- `risk_events` — anti-abuse telemetry
- `rate_limits` — per-user rate limit counters
- `staff_actions` — full audit log of staff operations

## Frontend Routes

- `/` — Landing page: login (email OTP + wallet) + feature showcase (dark mode, no broken unauth form)
- `/dashboard` — Staff dashboard: summary stats, activity feed, risk overview
- `/tickets` — Ticket list (user sees own, staff sees all), filterable by status/search
- `/tickets/:ticketId` — Ticket detail: full hash-chained message thread + lazy "Verify Chain" query
- `/users/:userId` — User profile (staff only): trust scores, risk events, ban button
- `/profile` — Current user's own identity and reputation
- `/audit` — Staff audit log of all actions

## Known Limitations / TODOs

- **SIWE auth**: Wallet login uses a random demo address + dummy signature (real EIP-4361 SIWE not fully wired)
- **Email OTP in dev**: OTP codes are printed to the API server console (not emailed)
- **ED25519 keypair**: Generated in-memory at server start — regenerates on restart (fine for demo)
- **Guest ticket submission**: Removed in favor of directing guests to sign in first

## API Endpoints

See `lib/api-spec/openapi.yaml` for the full OpenAPI contract.

Key endpoints:
- `GET /api/auth/session` — check current session
- `POST /api/auth/email/request-otp` — send OTP to email
- `POST /api/auth/email/verify-otp` — verify OTP and authenticate
- `GET /api/auth/wallet/nonce` — get SIWE nonce
- `POST /api/auth/wallet/verify` — verify SIWE signature
- `GET/POST /api/tickets` — list/create tickets
- `GET/PATCH /api/tickets/:id` — get/update ticket
- `POST /api/tickets/:id/messages` — send message (auto-signed if staff)
- `GET /api/tickets/:id/verify` — verify hash chain integrity
- `GET /api/dashboard/summary` — aggregate stats
- `GET /api/dashboard/activity` — recent activity feed
- `GET /api/dashboard/risk-overview` — anti-abuse overview
- `GET /api/staff/actions` — staff audit log

## Demo Accounts (seed data)

OTP is logged to server console during development. Test with:
- `staff@trustdesk.io` — staff account (full dashboard access)
- `alice@example.com` — normal user account (low risk)
- `bob@example.com` — medium risk user
