# Ozerli Platform Overview

## Overview

Ozerli is a verifiable support platform where staff responses are cryptographically signed and ticket messages are hash-chained for tamper evidence. It is designed for high-efficiency support operations across crypto-native and mainstream teams.

## Product Positioning

- Ozerli is ticket-first, not chat-first.
- The product optimizes for triage speed, accountability, and resolution throughput.
- Crypto verification is available but optional for mainstream user flows.

## Tier Model

### Open Source Tier

- Ticket lifecycle: create, assign, reply, resolve, close
- Email OTP and wallet identity entry points
- Signed staff responses and message hash-chain verification
- Core staff auditability and accountability logs

### Paid Tier

- Advanced analytics dashboards:
	- Median response time
	- Agent performance
	- Issue category trends
	- Churn risk signals
- AI support automation:
	- Suggested responses
	- Duplicate ticket detection
	- Smart routing
	- Priority scoring
- SLA workflow tooling and premium operator controls:
	- Escalate-after rules (for example 30 minutes)
	- Department-based assignment
- Compliance and governance controls:
	- Compliance retention policies
	- SOC2-oriented logs
	- Exportable audit trails
	- Immutable event history tooling

## Commercial Model

Paid capabilities are designed for managers and operations owners.

Usage-based billing dimensions:

- Active tickets
- Monthly conversations
- Storage
- API calls
- AI actions

## Open Source Core Licensing

- Current OSS core license posture: MIT.
- Apache-2.0 is acceptable when patent grant language is needed for enterprise adoption.

## Stack

- Monorepo tool: pnpm workspaces
- Node.js version: 24
- Package manager: pnpm
- TypeScript version: 5.9
- API framework: Express 5
- Database: PostgreSQL + Drizzle ORM
- Session: express-session
- Validation: Zod (zod/v4), drizzle-zod
- API codegen: Orval from OpenAPI
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS + Wouter

## Key Commands

- `pnpm run typecheck` full typecheck across all packages
- `pnpm run build` typecheck plus build all packages
- `pnpm --filter @workspace/api-spec run codegen` regenerate API hooks and Zod schemas
- `pnpm --filter @workspace/db run push` push DB schema changes (dev)
- `pnpm --filter @workspace/api-server run dev` run API server locally

## Tier Configuration

- API tier flag: `OZERLI_TIER=paid` (legacy `TRUSTDESK_TIER` is still accepted)
- Frontend tier flag: `VITE_OZERLI_TIER=paid` (legacy `VITE_TRUSTDESK_TIER` is still accepted)

## Core Architecture

### Identity Layer

- Email OTP authentication with 10 minute expiry
- SIWE wallet authentication
- Multi-identity linking per user
- Session-based auth via express-session

### Ticket Engine

- UUID tickets with OPEN, IN_PROGRESS, RESOLVED, CLOSED states
- LOW, NORMAL, HIGH, URGENT priority bands
- Hash-chain fields per message: prevHash and messageHash
- Automatic ED25519 signature generation for staff replies

### Trust and Abuse Controls

- Per-user riskScore and reputationScore
- Risk events for telemetry and investigations
- Staff moderation and full action logging

## Frontend Routes

- `/` landing and authentication
- `/dashboard` staff dashboard
- `/tickets` ticket list
- `/tickets/:ticketId` ticket detail and verification
- `/users/:userId` staff-only user view
- `/profile` current user profile
- `/audit` staff action audit log

## Current Limitations

- Wallet auth currently uses demo SIWE verification scaffolding
- Email OTP is logged to server in development
- ED25519 keypair is in-memory and regenerated on restart
- Guest ticket submission is removed in favor of authenticated flows