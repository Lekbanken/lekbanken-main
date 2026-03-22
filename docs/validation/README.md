# Validation Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Entry point for the validation document cluster. Most files here are bounded validation snapshots from December 2025 and should not be treated as current operating policy.

## Purpose

This folder collects targeted validation passes, reality checks, and inventory-style review documents.

Use it to understand what was verified at a specific point in time, not as a replacement for the repo's current canonical docs.

## Read order

1. `docs/DOCUMENTATION_STANDARD.md`
2. `launch-readiness/launch-control.md`
3. Current canonical docs for the relevant area
4. Files in this folder only when you need historical validation context

## Status map

### Frozen audits

- `REALITY_CHECK_2025-12-17.md` — targeted docs-vs-code reality check with dated findings and fixes
- `PRIORITY_VALIDATION_2025-12-17.md` — bounded high-priority validation pass for auth, migrations, and CSV contract

### Historical snapshots

- `API_VALIDATION_REPORT.md` — phase-based backend/frontend validation snapshot
- `BATCH_3_QUICK_REVIEW.md` — rapid review of previously validated domains
- `OPERATIONS_DOMAIN_GAP_PLAN.md` — earlier ops gap plan from before the current ops doc set matured

### Draft working material

- `COMPONENT_INVENTORY.md` — initial component inventory and sandbox-coverage working list

## Working rule

If a file in this folder conflicts with a current canonical doc, prefer the canonical doc and treat the validation file as historical evidence only.