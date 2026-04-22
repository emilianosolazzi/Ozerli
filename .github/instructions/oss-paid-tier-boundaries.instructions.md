---
description: "Use when implementing pricing tiers, feature flags, entitlement checks, or product copy. Defines Ozerli OSS versus paid boundaries and enforcement rules for API and UI."
---
# OSS vs Paid Boundaries

Use these defaults unless the user explicitly changes pricing strategy.

## OSS v1 (must remain available)

- Ticket CRUD lifecycle and status transitions
- Email OTP and wallet identity flows
- Signed staff messages and message hash-chain verification
- Core audit trail and basic staff accountability

## Paid v1 (gated)

- Advanced analytics dashboard panels
- Anti-abuse/risk automation overview surfaces
- SLA workflow controls and premium operations tooling

## Implementation Rules

- Enforce paid gating in API first, then mirror in UI.
- UI hiding alone is not enough; backend must deny unauthorized paid-only endpoints.
- Keep error responses explicit and actionable for locked features.
- Prefer a small feature-flag surface over scattered one-off checks.

## Naming and Copy

- Use "Open Source" and "Paid" terminology consistently.
- Do not call OSS limitations "trial" unless a real trial exists.
- In UI lock states, describe business value (faster triage, analytics, SLA) instead of generic upsell text.