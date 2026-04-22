# Ozerli Replatforming Checklist

## Goal

Remove legacy platform-specific runtime/build coupling while keeping the monorepo stable and deployable on standard infrastructure.

## Completed In This Pass

- Removed legacy platform Vite plugins from frontend configs
- Removed legacy platform plugin dependencies from frontend package manifests
- Removed legacy platform package catalog entries and exclusions from workspace config
- Replaced legacy platform tagged UI comments with product-native comments
- Removed top-level legacy platform config files
- Replaced legacy platform overview notes with product-native docs

## Remaining Cleanup Sweep

- Evaluate whether `.local/` skill/tooling references should remain internal-only
- Regenerate lockfile and verify no legacy platform package remains in dependency graph
- Search the repo for residual product-facing legacy platform mentions
- Confirm CI/deploy scripts are provider-agnostic

## Validation Checklist

- `pnpm install` succeeds
- `pnpm run typecheck` succeeds
- `pnpm --filter @workspace/ozerli run build` succeeds
- `pnpm --filter @workspace/mockup-sandbox run build` succeeds
- Local app preview works for staff and non-staff flows

## Rollout Checklist

- Ensure environment variables are documented outside legacy platform conventions
- Update onboarding docs to reference current local/dev workflow
- Add release note entry for migration and tier-gating introduction