# Notifications Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the notifications documentation cluster. Use this file to route between the stable notifications domain model and the active app-shell notifications triplet that now lives in this folder.

## Purpose

This cluster covers the in-app notifications domain, notification preferences, admin send flows, and the app-shell notification surfaces that consume the domain.

## Start here

1. `NOTIFICATIONS_DOMAIN.md`
2. `app-shell-notifications-architecture.md`
3. `app-shell-notifications-audit.md`
4. `app-shell-notifications-implementation-plan.md`
5. `app-shell-notifications-batch2-spec.md`

## Status map

### Active references

- `NOTIFICATIONS_DOMAIN.md` — stable domain responsibilities, schema, service layer, and UI boundaries
- `app-shell-notifications-architecture.md` — canonical app-shell component and routing architecture

### Active operational docs

- `app-shell-notifications-audit.md` — current app-shell + notification-surface audit
- `app-shell-notifications-implementation-plan.md` — current execution state and follow-up milestones
- `QA_APPSHELL_ANALYSIS.md` — QA checklist and improvement analysis for app-shell navigation, safe-area handling, and page-level UX consistency

### Draft / bounded next-step spec

- `app-shell-notifications-batch2-spec.md` — scheduled-path consolidation spec that remains not started

## Working rule

For product/domain boundaries, prefer `docs/notifications/NOTIFICATIONS_DOMAIN.md`. For app-shell runtime wiring and execution state, prefer the colocated `app-shell-notifications-*` triplet in this folder. If those disagree, verify current code and update the audit first.