---
description: "Use when implementing pricing tiers, feature flags, entitlement checks, metering, or product copy. Defines Ozerli OSS versus paid boundaries, usage-based billing dimensions, and API/UI enforcement rules."
---
# OSS vs Paid Boundaries

Use these defaults unless the user explicitly changes pricing strategy.

## OSS v1 (must remain available)

- Ticket CRUD lifecycle and status transitions
- Email OTP and wallet identity flows
- Signed staff messages and message hash-chain verification
- Core audit trail and basic staff accountability

## Paid v1 (gated)

- Advanced analytics dashboards:
	- Median response time
	- Agent performance breakdowns
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
- Compliance and governance controls:
	- Compliance retention policies
	- SOC2-oriented operational logs
	- Exportable audit trails
	- Immutable event history tooling
- Usage-based metering and billing surfaces for paid plans

## Implementation Rules

- Enforce paid gating in API first, then mirror in UI.
- UI hiding alone is not enough; backend must deny unauthorized paid-only endpoints.
- Keep error responses explicit and actionable for locked features.
- Prefer a small feature-flag surface over scattered one-off checks.
- Meter billable usage server-side and expose auditable counters in API responses.
- Keep metric naming stable for billing dimensions: activeTickets, monthlyConversations, storageBytes, apiCalls, aiActions.

## Naming and Copy

- Use "Open Source" and "Paid" terminology consistently.
- Do not call OSS limitations "trial" unless a real trial exists.
- In UI lock states, describe business value (faster triage, analytics, SLA) instead of generic upsell text.
- Position paid capabilities as manager and operations tooling, not end-user chat add-ons.

## License Strategy

- OSS core license can be MIT (default) or Apache-2.0 based on project goals.
- Prefer Apache-2.0 when explicit patent grant language is required for enterprise adoption.
- Keep paid-only features and hosted controls outside the OSS core boundary.