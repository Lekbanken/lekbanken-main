# Docs index (inventory)

Det här är en första **inventering** av dokumentationen. Målet är att göra varje dokument lätt att klassificera och validera.

För en **exhaustive lista** av alla `docs/**/*.md`, se [INVENTORY.md](INVENTORY.md).

Fält:
- Type: (A) Produktdokumentation | (B) Spec/Plan | (C) Rapport/analys | (D) TODO/Backlog | (E) Mall | (F) Deprecated
- Status: active | draft | deprecated
- Last validated: YYYY-MM-DD
- Owner: team/person

## Top-level docs

| Doc | Type | Status | Last validated | Owner |
|---|---|---:|---:|---|
| README.md | A | draft | 2025-12-17 | - |
| NOTION.md | A | active | 2025-12-17 | - |
| MIGRATIONS.md | A | active | 2025-12-17 | - |
| ENVIRONMENT_VARIABLES.md | A | active | 2025-12-17 | - |
| AUTH_SYSTEM_ANALYSIS.md | C | archived | 2025-12-17 | - |
| AUTH_DATABASE_SCHEMA.md | A | active | 2025-12-17 | - |
| AUTH_ARCHITECTURE_REDESIGN.md | B | draft | - | - |
| AUTH_IMPLEMENTATION_TODO.md | D | draft | - | - |
| ADMIN_OVERVIEW_REPORT.md | C | draft | - | - |
| ADMIN_DESIGN_SYSTEM.md | A | active | 2025-12-17 | - |
| ADMIN_GAME_BUILDER_V1.md | A | active | 2025-12-17 | - |
| GAME_BUILDER_UI_SPEC.md | B | draft | - | - |
| GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md | B | draft | - | - |
| TESTPLAN_GAME_BUILDER_P0.md | B | draft | - | - |
| GAME_CSV_IMPORT_EXPORT_PLAN.md | B | draft | - | - |
| CSV_IMPORT_FIELD_REFERENCE.md | A | active | 2025-12-17 | - |
| MEDIA_DOMAIN.md | A | active | 2025-12-17 | - |
| PLATFORM_DOMAIN.md | A | active | 2025-12-17 | - |
| PLATFORM_DOMAIN_VALIDATION_REPORT.md | C | draft | - | - |
| PARTICIPANTS_DOMAIN.md | A | active | 2025-12-17 | - |
| TENANT_DOMAIN.md | A | active | 2025-12-17 | - |
| BILLING_LICENSING_DOMAIN.md | A | active | 2025-12-17 | - |
| ACCOUNTS_DOMAIN.md | A | active | 2025-12-17 | - |
| GAMES_DOMAIN.md | A | active | 2025-12-17 | - |
| OPERATIONS_DOMAIN.md | A | active | 2025-12-17 | - |
| TRANSLATION_ENGINE_DOMAIN.md | A | active | 2025-12-17 | - |
| PARTICIPANTS_DOMAIN_ARCHITECTURE.md | B | archived | 2025-12-17 | - |
| PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md | C | archived | 2025-12-17 | - |
| PARTICIPANTS_DOMAIN_MVP.md | B | archived | 2025-12-17 | - |
| PLAY_SESSIONS_UI_SPEC.md | B | draft | - | - |
| STRIPE.md | A | active | 2025-12-17 | - |
| TYPE_MANAGEMENT.md | A | draft | - | - |
| VS_CODE_WORKFLOW.md | A | draft | - | - |
| PROJECT_EXECUTION_PLAN.md | B | draft | - | - |
| PROMPT_FOR_NEW_AI.md | E | draft | - | - |
| HANDOVER_2024-12-07.md | C | draft | - | - |

## Sub-index

- auth/: se auth/README.md
- ops/: se ops/README.md
- admin/: se admin/README.md
- templates/: se templates/*
- validation/: se validation/* (start: `validation/REALITY_CHECK_2025-12-17.md`)

## Nästa validering (rekommenderad ordning)

1) Auth/RBAC (docs/auth/*)
2) DB/migrations + typegen (MIGRATIONS.md)
3) Game Builder + CSV import/export (CSV_IMPORT_FIELD_REFERENCE.md + GAME_* docs)
4) Ops/runbooks (docs/ops)
