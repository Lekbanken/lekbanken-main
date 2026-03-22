# Admin docs

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-21
- Last validated: -

> Entry point for the admin documentation cluster. This area mixes active admin references, redesign plans, draft IA material, and older audit/report snapshots.

## Purpose

Use this index to distinguish current admin design references from older audits and earlier redesign analysis.

## Read order

1. Current code and route/layout wiring under `app/admin/**`, `components/admin/**`, and `features/admin/**`
2. `../ADMIN_MODEL_DECISION.md` for the canonical system-vs-tenant access model
3. Active references and plans listed below
4. Frozen audits and historical snapshots only when you need earlier validation context

## Status map

### Active

- `../ADMIN_MODEL_DECISION.md` — canonical access-model decision for system admin vs tenant admin
- `../ADMIN_NAVIGATION_MASTER.md` — current facit for admin menu grouping and redirects
- `../ADMIN_DESIGN_SYSTEM.md` — active design-system reference for shared admin patterns
- `../ADMIN_GAME_BUILDER_V1.md` — active builder/admin reference for the games admin surface
- `../ADMIN_GAMES_V2_ARCHITECTURE.md` — active architecture reference for the scalable games admin surface
- `../ADMIN_PLANNER_MASTER_IMPLEMENTATION.md` — active implementation reference for the admin planner surface

### Drafts and active plans

- `ADMIN_REDESIGN_PLAN.md` — approved redesign implementation plan for `/admin`
- `../ADMIN_IA_PROPOSAL.md` — IA proposal for system/tenant navigation and route grouping
- `appshell.md` — app-shell architecture note that should be revalidated against current shell wiring
- `GAME_PROMPTING_GUIDE.md` — specialized builder/game prompting guide tied to a specific integrity-report baseline

### Historical snapshots

- `../ADMIN_PRODUCTS_CONTENT_IA.md` — completed IA refactor snapshot for products/content regrouping
- `../ADMIN_GAMIFICATION_HUB_IA.md` — completed IA refactor snapshot for the gamification hub regrouping

### Narrow test plans

- `../ADMIN_USERS_TEST_PLAN.md` — manual verification checklist for the `/admin/users` refactor
- `../ADMIN_PRODUCTS_TEST_PLAN.md` — manual verification checklist for the products/content hub work
- `../ADMIN_ORGANISATIONS_TEST_PLAN.md` — manual verification checklist for `/admin/organisations`
- `../ADMIN_GAMIFICATION_TEST_PLAN.md` — manual verification checklist for the gamification hub rollout

### Frozen audits

- `../ADMIN_AUDIT.md` — broad admin structure and access audit snapshot
- `../ADMIN_AUTH_AUDIT.md` — auth and RBAC integrity audit snapshot
- `../ADMIN_OVERVIEW_REPORT.md` — earlier production-readiness overview for the admin area

## Files in this folder

- `ADMIN_REDESIGN_PLAN.md`
- `appshell.md`
- `GAME_PROMPTING_GUIDE.md`

## Related top-level admin docs

- `../ADMIN_AUDIT.md`
- `../ADMIN_AUTH_AUDIT.md`
- `../ADMIN_OVERVIEW_REPORT.md`
- `../ADMIN_MODEL_DECISION.md`
- `../ADMIN_NAVIGATION_MASTER.md`
- `../ADMIN_IA_PROPOSAL.md`
- `../ADMIN_DESIGN_SYSTEM.md`
- `../ADMIN_GAME_BUILDER_V1.md`
- `../ADMIN_GAMES_V2_ARCHITECTURE.md`
- `../ADMIN_PLANNER_MASTER_IMPLEMENTATION.md`
- `../ADMIN_PRODUCTS_CONTENT_IA.md`
- `../ADMIN_GAMIFICATION_HUB_IA.md`
- `../ADMIN_USERS_TEST_PLAN.md`
- `../ADMIN_PRODUCTS_TEST_PLAN.md`
- `../ADMIN_ORGANISATIONS_TEST_PLAN.md`
- `../ADMIN_GAMIFICATION_TEST_PLAN.md`

Validering (checklista):
- UI “masterplan” ska matcha nuvarande komponentstruktur
- Admin-flöden ska länka till relevanta routes och features/
