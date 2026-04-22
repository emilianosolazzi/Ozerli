# Ozerli

Ozerli is a verifiable, ticket-first support platform built for teams that need both speed and accountability. Staff replies can be cryptographically signed, ticket messages are hash-chained for tamper evidence, and operations stay focused on resolution throughput instead of chat noise.

## Why Ozerli

Ozerli is designed for support teams that want mainstream usability with stronger trust guarantees.

## Benefits At A Glance

- Faster triage: ticket-first workflows optimize ownership, status movement, and queue management.
- Stronger trust: signed staff replies and hash-chained message threads make tampering evident.
- Better accountability: staff actions are auditable, with explicit operational and moderation trails.
- Clear upgrade path: open-source core for essential support operations, paid tier for manager-grade analytics, automation, and compliance controls.

## Tier Model

### Open Source Tier

- Ticket lifecycle (create, assign, reply, resolve, close)
- Email OTP and wallet identity entry points
- Signed staff messages and message hash-chain verification
- Core staff auditability

### Paid Tier

- Advanced analytics:
	- Median response time
	- Agent performance dashboards
	- Issue category trends
	- Churn risk signals
- AI support automation:
	- Suggested responses
	- Duplicate ticket detection
	- Smart routing
	- Priority scoring
- SLA and workflow rules:
	- Escalation policies (for example: escalate after 30 minutes)
	- Department-based assignment
- Compliance and governance features:
	- Compliance retention controls
	- SOC2-oriented logs
	- Exportable audit trails
	- Immutable event history tooling

## Paid Service Model

Paid capabilities are intended for managers and operations owners who need optimization, governance, and reporting at scale.

### Usage-Based Billing Dimensions

- Active tickets
- Monthly conversations
- Storage
- API calls
- AI actions

## Monorepo Structure

- artifacts/api-server: Express API server and route logic
- artifacts/trustdesk: Ozerli web app (Vite + React)
- artifacts/mockup-sandbox: component/design sandbox
- lib/db: Drizzle schema and database package
- lib/api-spec: OpenAPI source and code generation config
- lib/api-client-react: generated React API client
- lib/api-zod: generated request/response validators
- docs: platform and migration documentation

## Tech Stack

- Node.js 24
- pnpm workspaces
- TypeScript 5.9
- Express 5
- PostgreSQL + Drizzle ORM
- React + Vite + Tailwind CSS
- Orval (OpenAPI client and schema code generation)

## Prerequisites

- Node.js 24+
- Corepack enabled (`corepack enable`)
- PostgreSQL database for API runtime

## Quick Start

### 1. Install dependencies

```bash
corepack pnpm install
```

### 2. Validate the workspace

```bash
corepack pnpm run typecheck
```

### 3. Build all packages

PowerShell:

```powershell
$env:PORT='20392'
$env:BASE_PATH='/'
corepack pnpm run build
```

Bash:

```bash
PORT=20392 BASE_PATH=/ corepack pnpm run build
```

## Run Services Locally

### API Server

Required environment variables:

- DATABASE_URL
- SESSION_SECRET
- PORT

PowerShell example:

```powershell
$env:DATABASE_URL='postgres://user:pass@localhost:5432/ozerli'
$env:SESSION_SECRET='replace-with-a-long-random-secret'
$env:PORT='8080'
$env:NODE_ENV='development'
corepack pnpm --filter @workspace/api-server run dev
```

### Web App (Ozerli)

Required environment variables:

- PORT
- BASE_PATH

PowerShell example:

```powershell
$env:PORT='20392'
$env:BASE_PATH='/'
corepack pnpm --filter @workspace/ozerli run dev
```

Note: the web app calls API routes using same-origin `/api/*` paths. If you run web and API on different origins locally, configure a reverse proxy so `/api` resolves to your API server.

## Configuration Reference

### API Environment Variables

- DATABASE_URL (required): PostgreSQL connection string
- SESSION_SECRET (required): session signing secret
- PORT (required): API listen port
- NODE_ENV (optional): defaults to development behavior when unset
- LOG_LEVEL (optional): pino log level, defaults to `info`
- OZERLI_TIER (optional): `oss` (default) or `paid`
- TRUSTDESK_TIER (legacy fallback): accepted for backwards compatibility

### Frontend Environment Variables

- PORT (required): Vite dev/build port binding
- BASE_PATH (required): base path for Vite output/routing
- VITE_OZERLI_TIER (optional): `oss` (default) or `paid` for UI tier behavior
- VITE_TRUSTDESK_TIER (legacy fallback): accepted for backwards compatibility
- VITE_DEMO_STAFF_EMAIL (optional): landing-page demo email label

## Core Commands

- Workspace typecheck: `corepack pnpm run typecheck`
- Workspace build: `corepack pnpm run build`
- Regenerate API clients and schemas: `corepack pnpm --filter @workspace/api-spec run codegen`
- Push DB schema (dev): `corepack pnpm --filter @workspace/db run push`
- API dev run: `corepack pnpm --filter @workspace/api-server run dev`
- Web dev run: `corepack pnpm --filter @workspace/ozerli run dev`
- Mockup sandbox dev run: `corepack pnpm --filter @workspace/mockup-sandbox run dev`

## Trust And Audit Model

- Message integrity: each ticket message includes hash-chain fields (`prevHash`, `messageHash`)
- Staff authenticity: staff responses can be signed and independently verified
- Operational transparency: staff actions and risk events are recorded for review

## Current Limitations

- Wallet auth currently uses demo SIWE verification scaffolding
- Email OTP is logged to server output in development
- ED25519 keypair is generated in memory and rotates on server restart
- Guest ticket submission is removed in favor of authenticated flows

## Contributing

1. Create a feature branch.
2. Keep changes focused and buildable.
3. Run typecheck and build before opening a pull request.
4. Include docs updates for behavior or configuration changes.

## License

Current OSS core license: MIT.

Alternative OSS core option under consideration: Apache-2.0 (recommended when explicit patent grant language is required).

## README Improvement Suggestions

- Add architecture diagrams for API/web/data flows.
- Add deployment playbooks for your target infrastructure.
- Add end-to-end local routing examples for same-origin API wiring.
- Add sample requests for key API endpoints.
