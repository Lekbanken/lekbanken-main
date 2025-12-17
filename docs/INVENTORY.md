# Docs inventory (exhaustive)

Det här är en **exhaustive inventering** av alla `docs/**/*.md` i repo:t.

Syfte:
- Göra det lätt att se vad som är “core docs” vs historik/planer/rapporter.
- Skapa en plats där vi kan sätta `Owner` + `Last validated` och minska drift.

Klassificering:
- **Type A**: Produktdokumentation (Source of Truth)
- **Type B**: Spec/Plan (historisk eller framtida)
- **Type C**: Rapport/Analys/Learnings (historik)
- **Type D**: TODO/Backlog (worklist)
- **Type E**: Mall/Template/Prompt (återanvändbar)
- **Type F**: Deprecated (ska inte användas)

Fält:
- **Status**: `active | draft | deprecated`
- **Last validated**: `YYYY-MM-DD` (eller `-` om okänt)
- **Owner**: team/person (eller `-`)

> Obs: Klassificering och status här är en startpunkt. När ett dokument uppdateras i en PR: fyll i `Owner` och sätt `Last validated`.

---

## Inventory

| Doc | Type | Status | Last validated | Owner | Notes |
|---|---|---:|---:|---|---|
| [docs/ACHIEVEMENTS_ADMIN_DESIGN.md](ACHIEVEMENTS_ADMIN_DESIGN.md) | B | draft | - | - | Design/spec |
| [docs/ACHIEVEMENTS_ASSET_MODEL.md](ACHIEVEMENTS_ASSET_MODEL.md) | A | draft | - | - | Asset/datamodell |
| [docs/admin/ADMIN_REDESIGN_PLAN.md](admin/ADMIN_REDESIGN_PLAN.md) | B | draft | - | - | Plan |
| [docs/admin/README.md](admin/README.md) | A | draft | - | - | Sub-index |
| [docs/ADMIN_DESIGN_SYSTEM.md](ADMIN_DESIGN_SYSTEM.md) | A | active | 2025-12-17 | - | Admin design system |
| [docs/ADMIN_GAME_BUILDER_V1.md](ADMIN_GAME_BUILDER_V1.md) | A | active | 2025-12-17 | - | Game Builder (current) |
| [docs/ADMIN_OVERVIEW_REPORT.md](ADMIN_OVERVIEW_REPORT.md) | C | draft | - | - | Report/overview |
| [docs/AI_CODING_GUIDELINES.md](AI_CODING_GUIDELINES.md) | A | draft | - | - | Process/guidelines |
| [docs/auth/architecture.md](auth/architecture.md) | A | active | 2025-12-17 | - | Auth architecture |
| [docs/auth/debugging.md](auth/debugging.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/auth/README.md](auth/README.md) | A | active | 2025-12-17 | - | Sub-index |
| [docs/auth/roles.md](auth/roles.md) | A | active | 2025-12-17 | - | RBAC/roles |
| [docs/auth/routes.md](auth/routes.md) | A | active | 2025-12-17 | - | Route protection |
| [docs/auth/tenant.md](auth/tenant.md) | A | active | 2025-12-17 | - | Tenant model |
| [docs/AUTH_ARCHITECTURE_REDESIGN.md](AUTH_ARCHITECTURE_REDESIGN.md) | B | draft | - | - | Spec/plan |
| [docs/AUTH_DATABASE_SCHEMA.md](AUTH_DATABASE_SCHEMA.md) | A | active | 2025-12-17 | - | DB schema reference |
| [docs/AUTH_IMPLEMENTATION_TODO.md](AUTH_IMPLEMENTATION_TODO.md) | D | draft | - | - | Backlog |
| [docs/AUTH_SYSTEM_ANALYSIS.md](AUTH_SYSTEM_ANALYSIS.md) | C | archived | 2025-12-17 | - | Historical analysis / change log |
| [docs/BADGE_BUILDER_UX_GUIDE.md](BADGE_BUILDER_UX_GUIDE.md) | B | draft | - | - | UX/spec |
| [docs/BROWSE_REWORK_NOTES.md](BROWSE_REWORK_NOTES.md) | C | draft | - | - | Notes |
| [docs/CATALYST_UI_KIT.md](CATALYST_UI_KIT.md) | A | draft | - | - | Reference |
| [docs/CHATGPT_GAME_CREATOR_PROMPT.md](CHATGPT_GAME_CREATOR_PROMPT.md) | E | draft | - | - | Prompt |
| [docs/BILLING_LICENSING_DOMAIN.md](BILLING_LICENSING_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/CSV_IMPORT_FIELD_REFERENCE.md](CSV_IMPORT_FIELD_REFERENCE.md) | A | active | 2025-12-17 | - | Contract/reference |
| [docs/DESIGN_CONSISTENCY_TODO.md](DESIGN_CONSISTENCY_TODO.md) | D | draft | - | - | Backlog |
| [docs/DESIGN_IMPLEMENTATION_TODO.md](DESIGN_IMPLEMENTATION_TODO.md) | D | draft | - | - | Backlog |
| [docs/DOCS_INDEX.md](DOCS_INDEX.md) | A | draft | 2025-12-17 | - | Curated index |
| [docs/DOMAIN_GAMES_LEARNINGS.md](DOMAIN_GAMES_LEARNINGS.md) | C | draft | - | - | Learnings |
| [docs/DOMAIN_GAMES_TODO.md](DOMAIN_GAMES_TODO.md) | D | draft | - | - | Backlog |
| [docs/DOMAIN_PLANNER_TODO.md](DOMAIN_PLANNER_TODO.md) | D | draft | - | - | Backlog |
| [docs/DOMAIN_PRODUCT_LEARNINGS.md](DOMAIN_PRODUCT_LEARNINGS.md) | C | draft | - | - | Learnings |
| [docs/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md](DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md) | C | draft | - | - | Learnings |
| [docs/DOMAIN_TENANT_TODO.md](DOMAIN_TENANT_TODO.md) | D | draft | - | - | Backlog |
| [docs/ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | A | active | 2025-12-17 | - | Core reference |
| [docs/GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md](GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md) | B | draft | - | - | Plan |
| [docs/GAME_BUILDER_UI_SPEC.md](GAME_BUILDER_UI_SPEC.md) | B | draft | - | - | Spec |
| [docs/GAME_CSV_IMPORT_EXPORT_PLAN.md](GAME_CSV_IMPORT_EXPORT_PLAN.md) | B | draft | - | - | Plan |
| [docs/HANDOVER_2024-12-07.md](HANDOVER_2024-12-07.md) | C | draft | - | - | Handover |
| [docs/MEDIA_DOMAIN.md](MEDIA_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc |
| [docs/MIGRATIONS.md](MIGRATIONS.md) | A | active | 2025-12-17 | - | Core reference |
| [docs/NOTION.md](NOTION.md) | A | active | 2025-12-17 | - | Notion mirror rules |
| [docs/ops/alerting.md](ops/alerting.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/ops/backup_dr.md](ops/backup_dr.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/ops/cicd_pipeline.md](ops/cicd_pipeline.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/ops/incident_response.md](ops/incident_response.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/ops/incidents.md](ops/incidents.md) | A | active | 2025-12-17 | - | Runbook |
| [docs/ops/README.md](ops/README.md) | A | active | 2025-12-17 | - | Sub-index |
| [docs/PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/PARTICIPANTS_DOMAIN_ARCHITECTURE.md](PARTICIPANTS_DOMAIN_ARCHITECTURE.md) | B | archived | 2025-12-17 | - | Historical architecture/spec (pseudo-schema) |
| [docs/PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md](PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md) | C | archived | 2025-12-17 | - | Historical report (superseded by 2025-12-17 addendum) |
| [docs/PARTICIPANTS_DOMAIN_MVP.md](PARTICIPANTS_DOMAIN_MVP.md) | B | archived | 2025-12-17 | - | Historical MVP/spec snapshot |
| [docs/PLATFORM_DOMAIN.md](PLATFORM_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc |
| [docs/PLATFORM_DOMAIN_VALIDATION_REPORT.md](PLATFORM_DOMAIN_VALIDATION_REPORT.md) | C | draft | - | - | Validation report |
| [docs/TENANT_DOMAIN.md](TENANT_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/TESTPLAN_GAME_BUILDER_P0.md](TESTPLAN_GAME_BUILDER_P0.md) | B | draft | 2025-12-17 | - | Testplan |
| [docs/PLAY_SESSIONS_UI_SPEC.md](PLAY_SESSIONS_UI_SPEC.md) | B | draft | - | - | Spec |
| [docs/PROJECT_EXECUTION_PLAN.md](PROJECT_EXECUTION_PLAN.md) | B | draft | - | - | Plan |
| [docs/PROMPT_FOR_NEW_AI.md](PROMPT_FOR_NEW_AI.md) | E | draft | - | - | Prompt/template |
| [docs/README.md](README.md) | A | draft | 2025-12-17 | - | Docs start |
| [docs/SESSION_COMPLETION_REPORT.md](SESSION_COMPLETION_REPORT.md) | C | draft | - | - | Report |
| [docs/STRIPE.md](STRIPE.md) | A | active | 2025-12-17 | - | Billing reference |
| [docs/TAILWIND_PLUS_COMPONENTS.md](TAILWIND_PLUS_COMPONENTS.md) | A | draft | - | - | UI reference |
| [docs/TASK_11_12_TOKEN_SESSION_MANAGEMENT.md](TASK_11_12_TOKEN_SESSION_MANAGEMENT.md) | B | draft | - | - | Task/spec |
| [docs/TASK_9_LIVE_PROGRESS.md](TASK_9_LIVE_PROGRESS.md) | B | draft | - | - | Task/spec |
| [docs/templates/COMPONENT_INVENTORY_TEMPLATE.md](templates/COMPONENT_INVENTORY_TEMPLATE.md) | E | draft | - | - | Template |
| [docs/templates/DECISION_CRITERIA.md](templates/DECISION_CRITERIA.md) | E | draft | - | - | Template |
| [docs/templates/DOMAIN_VALIDATION_TEMPLATE.md](templates/DOMAIN_VALIDATION_TEMPLATE.md) | E | draft | - | - | Template |
| [docs/templates/VALIDATION_CHECKLIST.md](templates/VALIDATION_CHECKLIST.md) | E | draft | - | - | Template |
| [docs/TESTPLAN_GAME_BUILDER_P0.md](TESTPLAN_GAME_BUILDER_P0.md) | B | draft | - | - | Test plan |
| [docs/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md](TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md) | C | draft | - | - | Validation report |
| [docs/TYPE_MANAGEMENT.md](TYPE_MANAGEMENT.md) | A | draft | - | - | Core reference |
| [docs/validation/API_VALIDATION_REPORT.md](validation/API_VALIDATION_REPORT.md) | C | draft | - | - | Validation report |
| [docs/validation/BATCH_3_QUICK_REVIEW.md](validation/BATCH_3_QUICK_REVIEW.md) | C | draft | - | - | Review |
| [docs/validation/COMPONENT_INVENTORY.md](validation/COMPONENT_INVENTORY.md) | C | draft | - | - | Inventory/report |
| [docs/validation/OPERATIONS_DOMAIN_GAP_PLAN.md](validation/OPERATIONS_DOMAIN_GAP_PLAN.md) | B | draft | - | - | Plan |
| [docs/validation/PRIORITY_VALIDATION_2025-12-17.md](validation/PRIORITY_VALIDATION_2025-12-17.md) | C | draft | 2025-12-17 | - | Working log |
| [docs/validation/REALITY_CHECK_2025-12-17.md](validation/REALITY_CHECK_2025-12-17.md) | C | active | 2025-12-17 | - | Findings + fixes |
| [docs/VS_CODE_WORKFLOW.md](VS_CODE_WORKFLOW.md) | A | draft | - | - | Workflow |
