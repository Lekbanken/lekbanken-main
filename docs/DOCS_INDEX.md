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
| BROWSE_DOMAIN.md | A | active | 2025-12-18 | - |
| CONTENT_MANAGEMENT_DOMAIN.md | A | active | 2025-12-18 | - |
| DATA_MODEL_DOMAIN.md | A | active | 2025-12-18 | - |
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
| PLAY_DOMAIN.md | A | active | 2025-12-17 | - |
| PLANNER_DOMAIN.md | A | active | 2025-12-17 | - |
| GAMIFICATION_DOMAIN.md | A | active | 2025-12-17 | - |
| JOURNEY_DOMAIN.md | A | active | 2025-12-17 | - |
| MARKETING_DOMAIN.md | A | active | 2025-12-17 | - |
| SUPPORT_DOMAIN.md | A | active | 2025-12-17 | - |
| NOTIFICATIONS_DOMAIN.md | A | active | 2025-12-17 | - |
| API_INTEGRATION_DOMAIN.md | A | active | 2025-12-17 | - |
| AI_DOMAIN.md | A | active | 2025-12-18 | - |
| DATABASE_SECURITY_DOMAIN.md | A | active | 2026-01-08 | - |
| DATABASE_SECURITY_AUDIT.md | C | active | 2026-01-08 | - |
| SECURITY_AUDIT_TODO.md | D | ✅ done | 2026-01-08 | - |
| PERFORMANCE_ADVISOR_PROMPT.md | E | active | 2026-01-08 | - |
| PARTICIPANTS_DOMAIN_ARCHITECTURE.md | B | archived | 2025-12-17 | - |
| PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md | C | archived | 2025-12-17 | - |
| PARTICIPANTS_DOMAIN_MVP.md | B | archived | 2025-12-17 | - |
| PLAY_SESSIONS_UI_SPEC.md | B | draft | - | - |
| STRIPE.md | A | active | 2025-12-17 | - |
| TYPE_MANAGEMENT.md | A | draft | - | - |
| VS_CODE_WORKFLOW.md | A | draft | - | - |
| PROJECT_EXECUTION_PLAN.md | B | draft | - | - |
| prompts/PROMPT_FOR_NEW_AI.md | E | draft | - | - |
| HANDOVER_2024-12-07.md | C | draft | - | - |
| DOCS_NAMING_CONVENTIONS.md | A | draft | 2025-12-18 | - |

## Sub-index

- auth/: se auth/README.md
- ops/: se ops/README.md
- admin/: se admin/README.md
- sandbox/: se sandbox/SANDBOX_ARTIFACTS_IMPLEMENTATION.md
- security/: DATABASE_SECURITY_DOMAIN.md + SECURITY_AUDIT_TODO.md + DATABASE_SECURITY_AUDIT.md
- templates/: se templates/*
- validation/: se validation/* (start: `validation/REALITY_CHECK_2025-12-17.md`)
- reports/: se reports/README.md
- prompts/: se prompts/README.md

## Nästa validering (rekommenderad ordning)

1) ~~Auth/RBAC (docs/auth/*)~~ ✅ Done
2) DB/migrations + typegen (MIGRATIONS.md)
3) ~~Security hardening (DATABASE_SECURITY_DOMAIN.md)~~ ✅ Done (2026-01-08)
4) Game Builder + CSV import/export (CSV_IMPORT_FIELD_REFERENCE.md + GAME_* docs)
5) Ops/runbooks (docs/ops)
