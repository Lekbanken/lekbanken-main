# Gamification Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-22
- Last validated: 2026-03-21

> Entry point for the gamification documentation cluster. Check each linked file's own status before treating it as current implementation or operational guidance.

## Purpose

This folder mixes current operational references, stable governance documents, completed audits, and historical implementation/design material.

Use this index to avoid reading older design or migration summaries as if they were the current gamification source of truth.

## Read order

1. `launch-readiness/launch-control.md` for current program and launch state
2. `GAMIFICATION_DOMAIN.md`
3. `docs/JOURNEY_DOMAIN.md` and other canonical repo docs for current product/domain context
4. The active files in this folder listed below
5. Frozen audits and historical snapshots only when you need design history, migration history, or earlier decisions

## Current working set

### Active

- `GAMIFICATION_DOMAIN.md` — canonical domain reference for achievements, coins, streaks, progression, challenges, events, and leaderboards
- `GAMIFICATION_MASTER_PLAN.md` — roadmap and domain decision log
- `GAMIFICATION_MONITORING_ALERTS.md` — active monitoring guidance for the gamification subsystem
- `GAMIFICATION_RECONCILIATION_RUNBOOK.md` — operational recovery and investigation runbook for wallet vs ledger mismatches
- `ECONOMY_GOVERNANCE.md` — economy-critical governance rules and change constraints
- `ADMIN_DASHBOARD_DESIGN.md` — current admin dashboard design reference for shipped MVP monitoring features
- `ACHIEVEMENTS_ASSET_MODEL.md` — current asset registry and icon-model reference for achievements badge-builder flows
- `AWARD_BUILDER_EXPORT_SCHEMA_V1.md` — canonical export/import contract for award builder flows
- `BURN_FOUNDATION_DESIGN.md` — current burn-foundation design and infrastructure reference
- `LEADERBOARD_DESIGN.md` — current leaderboard behavior and anti-gaming reference

### Frozen audits

- `GAMIFICATION_JOURNEY_AUDIT.md` — shipped UI/interaction audit snapshot for the journey-driven gamification surface

### Historical snapshots

- `GAMIFICATION_COMPLETE_REPORT.md` — point-in-time v2 implementation summary
- `GAMIFICATION_V2_MIGRATION_SUMMARY.md` — migration-specific implementation record
- `GAMIFICATION_TRIGGER_REPORT.md` — design/report snapshot for a larger trigger taxonomy and earlier expansion planning

### Drafts

- `ACHIEVEMENTS_ADMIN_DESIGN.md` — draft design/spec for the achievements admin builder experience
- `BADGE_BUILDER_UX_GUIDE.md` — draft UX guidance for stacked badge layers and tinting
- `SOFTCAP_DESIGN.md` — implementation-ready design reference, but not documented here as a shipped feature
- `GAMIFICATION_TEST_PLAN.md` — planned test coverage and acceptance criteria, not an execution log

## Design-heavy docs

These are design/reference documents and should be read with care against current code and active docs:

- `ADMIN_DASHBOARD_DESIGN.md`
- `ACHIEVEMENTS_ADMIN_DESIGN.md`
- `ACHIEVEMENTS_ASSET_MODEL.md`
- `AWARD_BUILDER_EXPORT_SCHEMA_V1.md`
- `BADGE_BUILDER_UX_GUIDE.md`
- `BURN_FOUNDATION_DESIGN.md`
- `LEADERBOARD_DESIGN.md`
- `SOFTCAP_DESIGN.md`
- `GAMIFICATION_TEST_PLAN.md`
- `GAMIFICATION_TRIGGER_REPORT.md`

## Working rule

If a file in this folder conflicts with a current canonical repo doc or current code, prefer the canonical repo doc and then update the gamification file's status or note.