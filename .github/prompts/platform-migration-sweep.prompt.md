---
description: "Run a full platform migration sweep: remove legacy platform-specific dependencies/config, rename legacy docs, and validate builds remain green."
name: "Platform Migration Sweep"
argument-hint: "Describe scope (full repo or target packages), deletion policy, and expected validation commands."
tools: [read, search, edit, execute, todo]
---
Execute a platform migration sweep for this repository.

Inputs:
- Scope: {{input:scope}}
- Policy: {{input:policy}}
- Validation command set: {{input:validation}}

Required behavior:
1. Find legacy platform-specific dependencies, runtime checks, platform files, and docs references in the requested scope.
2. Remove or rebrand them according to policy.
3. Avoid changes inside internal skill/tooling folders unless explicitly requested.
4. Keep functional equivalence where possible.
5. Run validation commands and report any breakages.

Required output:
- Summary of removed/replaced legacy platform items
- Files changed with rationale
- Validation command results
- Follow-up cleanup checklist