# Docs inventory (exhaustive)

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Active exhaustive inventory of `docs/**/*.md`. This file is the sole authoritative classified registry for the docs tree.

Det här är en **exhaustive inventering** av alla `docs/**/*.md` i repo:t.

Syfte:
- Göra det lätt att se vad som är “core docs” vs historik/planer/rapporter.
- Vara enda auktoritativa filregistret för `docs/**/*.md`.
- Skapa en plats där vi kan sätta `Owner` + `Last validated` och minska drift.

Klassificering:
- **Type A**: Produktdokumentation (Source of Truth)
- **Type B**: Spec/Plan (historisk eller framtida)
- **Type C**: Rapport/Analys/Learnings (historik)
- **Type D**: TODO/Backlog (worklist)
- **Type E**: Mall/Template/Prompt (återanvändbar)
- **Type F**: Deprecated (ska inte användas)

Fält:
- **Status**: `active | draft | deprecated | frozen audit | historical snapshot`
- **Last validated**: `YYYY-MM-DD` (eller `-` om okänt)
- **Owner**: team/person (eller `-`)

> Obs: `DOCS_INDEX.md` är nu bara en entry map. Om du behöver registrera, klassificera eller ändra status för ett dokument ska du uppdatera denna fil.

---

## Inventory

| Doc | Type | Status | Last validated | Owner | Notes |
|---|---|---:|---:|---|---|
| [docs/gamification/ACHIEVEMENTS_ADMIN_DESIGN.md](gamification/ACHIEVEMENTS_ADMIN_DESIGN.md) | B | draft | 2025-12-03 | - | Design/spec |
| [docs/gamification/ACHIEVEMENTS_ASSET_MODEL.md](gamification/ACHIEVEMENTS_ASSET_MODEL.md) | A | draft | 2025-12-07 | - | Asset/datamodell |
| [docs/admin/ADMIN_REDESIGN_PLAN.md](admin/ADMIN_REDESIGN_PLAN.md) | B | draft | 2025-12-12 | - | Plan |
| [docs/admin/appshell.md](admin/appshell.md) | B | draft | 2025-12-17 | - | Admin shell architecture note |
| [docs/admin/GAME_PROMPTING_GUIDE.md](admin/GAME_PROMPTING_GUIDE.md) | B | draft | 2026-01-19 | - | Specialized builder prompting guide |
| [docs/admin/README.md](admin/README.md) | A | active | 2026-03-21 | - | Sub-index |
| [docs/admin/ADMIN_DESIGN_SYSTEM.md](admin/ADMIN_DESIGN_SYSTEM.md) | A | active | 2025-12-17 | - | Admin design system |
| [docs/admin/archive/ADMIN_AUDIT.md](admin/archive/ADMIN_AUDIT.md) | C | frozen audit | 2025-12-18 | - | Admin redesign audit snapshot |
| [docs/admin/archive/ADMIN_AUTH_AUDIT.md](admin/archive/ADMIN_AUTH_AUDIT.md) | C | frozen audit | 2026-01-03 | - | Admin auth and RBAC integrity audit |
| [docs/admin/ORGANISATION_CARD_SPECIFICATION.md](admin/ORGANISATION_CARD_SPECIFICATION.md) | B | draft | 2026-01-04 | System Admin Team | Organisation card specification |
| [docs/admin/ADMIN_GAMES_V2_ARCHITECTURE.md](admin/ADMIN_GAMES_V2_ARCHITECTURE.md) | A | active | 2026-01-08 | System Admin Team | Scalable admin games architecture |
| [docs/admin/ADMIN_GAME_BUILDER_V1.md](admin/ADMIN_GAME_BUILDER_V1.md) | A | active | 2025-12-17 | - | Game Builder (current) |
| [docs/admin/archive/ADMIN_GAMIFICATION_HUB_IA.md](admin/archive/ADMIN_GAMIFICATION_HUB_IA.md) | C | historical snapshot | 2026-01-04 | - | Gamification hub IA refactor snapshot |
| [docs/admin/test-plans/ADMIN_GAMIFICATION_TEST_PLAN.md](admin/test-plans/ADMIN_GAMIFICATION_TEST_PLAN.md) | B | draft | 2026-01-04 | - | Gamification hub test checklist |
| [docs/admin/ADMIN_IA_PROPOSAL.md](admin/ADMIN_IA_PROPOSAL.md) | B | draft | 2025-12-18 | - | Admin IA proposal |
| [docs/admin/ADMIN_MODEL_DECISION.md](admin/ADMIN_MODEL_DECISION.md) | A | active | 2026-01-10 | - | Canonical admin access model |
| [docs/admin/ADMIN_NAVIGATION_MASTER.md](admin/ADMIN_NAVIGATION_MASTER.md) | A | active | 2026-01-03 | - | Admin navigation facit |
| [docs/admin/archive/ADMIN_OVERVIEW_REPORT.md](admin/archive/ADMIN_OVERVIEW_REPORT.md) | C | historical snapshot | 2025-12-04 | - | Report/overview |
| [docs/admin/test-plans/ADMIN_ORGANISATIONS_TEST_PLAN.md](admin/test-plans/ADMIN_ORGANISATIONS_TEST_PLAN.md) | B | draft | 2026-01-04 | - | Organisations admin test checklist |
| [docs/admin/ADMIN_PLANNER_MASTER_IMPLEMENTATION.md](admin/ADMIN_PLANNER_MASTER_IMPLEMENTATION.md) | A | active | 2026-01-03 | - | Admin planner implementation reference |
| [docs/admin/archive/ADMIN_PRODUCTS_CONTENT_IA.md](admin/archive/ADMIN_PRODUCTS_CONTENT_IA.md) | C | historical snapshot | 2026-01-04 | - | Products/content IA refactor snapshot |
| [docs/admin/test-plans/ADMIN_PRODUCTS_TEST_PLAN.md](admin/test-plans/ADMIN_PRODUCTS_TEST_PLAN.md) | B | draft | 2026-01-04 | - | Products/content test checklist |
| [docs/admin/test-plans/ADMIN_USERS_TEST_PLAN.md](admin/test-plans/ADMIN_USERS_TEST_PLAN.md) | B | draft | 2026-01-04 | - | Users admin test checklist |
| [docs/ai/README.md](ai/README.md) | A | active | 2026-03-22 | - | Sub-index for AI domain and agent guardrails |
| [docs/ai/AI_CODING_GUIDELINES.md](ai/AI_CODING_GUIDELINES.md) | A | active | 2025-12-10 | - | Process/guidelines |
| [docs/ai/AI_DOMAIN.md](ai/AI_DOMAIN.md) | A | active | 2025-12-18 | - | Domain doc (feature-flag-first) |
| [docs/auth/ACCOUNTS_DOMAIN.md](auth/ACCOUNTS_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/ACCESSIBILITY_AUDIT.md](ACCESSIBILITY_AUDIT.md) | B | draft | 2025-12-28 | - | Accessibility checklist |
| [docs/auth/architecture.md](auth/architecture.md) | A | active | 2026-03-21 | - | Auth architecture |
| [docs/auth/debugging.md](auth/debugging.md) | A | active | 2026-03-21 | - | Runbook |
| [docs/auth/README.md](auth/README.md) | A | active | 2026-03-22 | - | Sub-index |
| [docs/auth/roles.md](auth/roles.md) | A | active | 2026-03-21 | - | RBAC/roles |
| [docs/auth/routes.md](auth/routes.md) | A | active | 2026-03-21 | - | Route protection |
| [docs/auth/tenant.md](auth/tenant.md) | A | active | 2026-03-21 | - | Tenant model |
| [docs/auth/AUTH_ARCHITECTURE_REDESIGN.md](auth/AUTH_ARCHITECTURE_REDESIGN.md) | B | draft | - | - | Spec/plan |
| [docs/auth/AUTH_DATABASE_SCHEMA.md](auth/AUTH_DATABASE_SCHEMA.md) | A | active | 2025-12-17 | - | DB schema reference |
| [docs/auth/AUTH_IMPLEMENTATION_TODO.md](auth/AUTH_IMPLEMENTATION_TODO.md) | D | draft | - | - | Backlog |
| [docs/auth/archive/AUTH_SYSTEM_ANALYSIS.md](auth/archive/AUTH_SYSTEM_ANALYSIS.md) | C | archived | 2025-12-17 | - | Historical analysis / change log |
| [docs/gamification/BADGE_BUILDER_UX_GUIDE.md](gamification/BADGE_BUILDER_UX_GUIDE.md) | B | draft | 2025-12-07 | - | UX/spec |
| [docs/browse/BROWSE_DOMAIN.md](browse/BROWSE_DOMAIN.md) | A | active | 2025-12-18 | - | Domain doc (repo-anchored) |
| [docs/browse/README.md](browse/README.md) | A | active | 2026-03-22 | - | Cluster entrypoint for browse domain docs |
| [docs/browse/archive/BROWSE_REWORK_NOTES.md](browse/archive/BROWSE_REWORK_NOTES.md) | C | historical snapshot | 2025-12-09 | - | Notes |
| [docs/builder/BUILDER_AUDIT.md](builder/BUILDER_AUDIT.md) | C | frozen audit | 2026-02-08 | - | Broad builder audit snapshot before V2 deepening |
| [docs/builder/BUILDER_EVENT_MODEL.md](builder/BUILDER_EVENT_MODEL.md) | A | active | 2026-02-08 | - | Builder state, reducer, and autosave pipeline reference |
| [docs/builder/BUILDER_IMPORT_COMPAT.md](builder/BUILDER_IMPORT_COMPAT.md) | A | active | 2026-02-08 | - | Builder import/export compatibility reference |
| [docs/builder/BUILDER_INVENTORY.md](builder/BUILDER_INVENTORY.md) | C | frozen audit | 2026-02-08 | - | File-by-file builder inventory snapshot |
| [docs/builder/BUILDER_METADATA_CONTRACT.md](builder/BUILDER_METADATA_CONTRACT.md) | C | frozen audit | 2026-02-08 | - | Evidence-based metadata contract map |
| [docs/builder/BUILDER_METADATA_CONTRACT_CANONICAL.md](builder/BUILDER_METADATA_CONTRACT_CANONICAL.md) | A | active | 2026-02-08 | - | Canonical metadata contract reference |
| [docs/builder/BUILDER_V2_AUDIT.md](builder/BUILDER_V2_AUDIT.md) | C | active audit | 2026-03-21 | - | Active Builder V2 pre-import hardening audit |
| [docs/builder/BUILDER_V2_AUDIT_VERIFICATION.md](builder/BUILDER_V2_AUDIT_VERIFICATION.md) | C | active audit | 2026-03-21 | - | Verification and evidence pack for Builder V2 audit |
| [docs/builder/BUILDER_WIRING_VALIDATION_PLAN.md](builder/BUILDER_WIRING_VALIDATION_PLAN.md) | B | active | 2026-02-08 | - | Builder wiring and validation plan |
| [docs/builder/IMPORT_ATOMICITY_PLAN.md](builder/IMPORT_ATOMICITY_PLAN.md) | B | active | 2026-02-08 | - | Import atomicity implementation plan |
| [docs/builder/IMPORT_METADATA_RISK_REPORT.md](builder/IMPORT_METADATA_RISK_REPORT.md) | C | historical snapshot | 2026-02-08 | - | Historical import metadata risk snapshot |
| [docs/builder/JSON_IMPORT_BLUEPRINT.md](builder/JSON_IMPORT_BLUEPRINT.md) | A | active | 2026-02-08 | - | Canonical JSON import specification |
| [docs/builder/README.md](builder/README.md) | A | active | 2026-03-21 | - | Builder documentation sub-index and status map |
| [docs/builder/SPRINT2_WIRING_PLAN.md](builder/SPRINT2_WIRING_PLAN.md) | B | historical snapshot | 2026-02-08 | - | Historical sprint wiring plan |
| [docs/builder/SPRINT3_CONSOLIDATION_PLAN.md](builder/SPRINT3_CONSOLIDATION_PLAN.md) | B | active | 2026-02-08 | - | Active sprint consolidation and contract plan |
| [docs/CATALYST_UI_KIT.md](CATALYST_UI_KIT.md) | A | draft | 2025-12-01 | - | Reference |
| [docs/CURRENCY_CONSISTENCY_REPORT.md](CURRENCY_CONSISTENCY_REPORT.md) | C | historical snapshot | 2026-01-14 | - | Terminology report |
| ~~docs/prompts/CHATGPT_GAME_CREATOR_PROMPT.md~~ | E | archived | 2026-03-15 | - | → `archive/CHATGPT_GAME_CREATOR_PROMPT.md` |
| [docs/billing/README.md](billing/README.md) | A | active | 2026-03-22 | - | Billing cluster entrypoint |
| [docs/billing/BILLING_LICENSING_DOMAIN.md](billing/BILLING_LICENSING_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/content/README.md](content/README.md) | A | active | 2026-03-22 | - | Content cluster entrypoint |
| [docs/content/CONTENT_MANAGEMENT_DOMAIN.md](content/CONTENT_MANAGEMENT_DOMAIN.md) | A | active | 2025-12-18 | - | Domain doc (repo-anchored) |
| [docs/CONVERSATION_CARDS_SYSTEM_FACIT.md](CONVERSATION_CARDS_SYSTEM_FACIT.md) | A | draft | 2026-01-03 | - | Conversation cards system facit/reference |
| [docs/import/CSV_IMPORT_FIELD_REFERENCE.md](import/CSV_IMPORT_FIELD_REFERENCE.md) | A | active | 2025-12-17 | - | Contract/reference |
| [docs/import/CSV_IMPORT_VERIFICATION_CHECKLIST.md](import/CSV_IMPORT_VERIFICATION_CHECKLIST.md) | A | active | 2025-12-26 | - | Verification checklist |
| [docs/database/DATA_MODEL_DOMAIN.md](database/DATA_MODEL_DOMAIN.md) | A | active | 2025-12-18 | - | Domain doc (repo-anchored) |
| [docs/database/README.md](database/README.md) | A | active | 2026-03-21 | - | Sub-index for database environment and security docs |
| [docs/database/environments.md](database/environments.md) | A | active | 2026-03-16 | - | Canonical database environment rules |
| [docs/database/environment-database-audit.md](database/environment-database-audit.md) | C | frozen audit | 2026-03-19 | - | Environment and database state audit snapshot |
| [docs/database/DATABASE_SECURITY_DOMAIN.md](database/DATABASE_SECURITY_DOMAIN.md) | A | active | 2026-01-08 | - | Security domain doc (Enterprise) |
| [docs/database/DATABASE_SECURITY_AUDIT.md](database/DATABASE_SECURITY_AUDIT.md) | C | frozen audit | - | Security/Auth | Security audit report (resolved) |
| [docs/database/migration-history.md](database/migration-history.md) | A | active | 2026-03-16 | - | Migration history normalization log |
| [docs/database/rls-audit-2025-03-17.md](database/rls-audit-2025-03-17.md) | C | frozen audit | 2026-03-17 | - | RLS security audit snapshot |
| [docs/consumer-data-contract-audit.md](consumer-data-contract-audit.md) | C | frozen audit | - | Data contracts | Consumer contract audit |
| [docs/CUSTOM_DOMAINS_TEST_PLAN.md](CUSTOM_DOMAINS_TEST_PLAN.md) | B | draft | 2026-01-03 | - | Validation plan |
| [docs/DEPENDENCY_AUDIT_2026-01-03.md](DEPENDENCY_AUDIT_2026-01-03.md) | C | frozen audit | 2026-01-03 | - | Dependency and Supabase call audit |
| [docs/demo/README.md](demo/README.md) | A | active | 2026-03-22 | - | Demo cluster entrypoint |
| [docs/demo/DEMO_SALES_GUIDE.md](demo/DEMO_SALES_GUIDE.md) | B | draft | 2026-01-13 | - | Internal sales guide for demo mode |
| [docs/demo/archive/demo_current_state.md](demo/archive/demo_current_state.md) | C | historical snapshot | - | Demo | Current-state report |
| [docs/demo/archive/demo_decisions_needed.md](demo/archive/demo_decisions_needed.md) | B | historical snapshot | - | Demo | Decision log |
| [docs/demo/archive/demo_implementation_plan.md](demo/archive/demo_implementation_plan.md) | B | historical snapshot | - | Demo | Implementation plan |
| [docs/demo/demo_technical_spec.md](demo/demo_technical_spec.md) | B | draft | - | Demo | Technical specification |
| [docs/archive/DESIGN_CONSISTENCY_TODO.md](archive/DESIGN_CONSISTENCY_TODO.md) | D | draft | 2025-11-30 | - | Backlog |
| [docs/archive/DESIGN_IMPLEMENTATION_TODO.md](archive/DESIGN_IMPLEMENTATION_TODO.md) | D | draft | 2025-11-30 | - | Backlog |
| [docs/DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) | A | active | 2026-03-22 | - | Canonical documentation map, registry model, and trust hierarchy |
| [docs/DOCUMENT_DATING_STANDARD.md](DOCUMENT_DATING_STANDARD.md) | A | active | 2026-03-21 | - | Rules for how Date, Last updated, and Last validated must be used |
| [docs/auth/archive/MFA_CURRENT_STATE_ANALYSIS.md](auth/archive/MFA_CURRENT_STATE_ANALYSIS.md) | C | historical snapshot | - | Security/Auth | Current-state report |
| [docs/auth/archive/MFA_IMPLEMENTATION_PLAN.md](auth/archive/MFA_IMPLEMENTATION_PLAN.md) | B | historical snapshot | - | Security/Auth | Implementation plan |
| [docs/auth/MFA_SECURITY.md](auth/MFA_SECURITY.md) | B | draft | - | Security/Auth | Security reference |
| [docs/auth/MFA_TECHNICAL_SPEC.md](auth/MFA_TECHNICAL_SPEC.md) | B | draft | - | Security/Auth | Technical specification |
| [docs/legal/DPA_TEMPLATE.md](legal/DPA_TEMPLATE.md) | A | draft | 2026-01-13 | - | Enterprise DPA template |
| [docs/legal/SLA.md](legal/SLA.md) | A | draft | 2026-01-13 | CTO | Enterprise service level agreement |
| [docs/legal/README.md](legal/README.md) | A | active | 2026-03-22 | - | Legal cluster entrypoint |
| [docs/legal/archive/LEGAL_IMPLEMENTATION_STATUS.md](legal/archive/LEGAL_IMPLEMENTATION_STATUS.md) | C | historical snapshot | 2026-01-11 | - | Legal system implementation status snapshot |
| [docs/legal/LEGAL_PHASE2_VALIDATION_PLAN.md](legal/LEGAL_PHASE2_VALIDATION_PLAN.md) | B | draft | 2026-01-11 | - | Validation plan |
| [docs/play/LEGENDARY_PLAY_ADVANCED_FEATURES.md](play/LEGENDARY_PLAY_ADVANCED_FEATURES.md) | B | draft | 2025-12-24 | - | Advanced play immersion UX specification |
| [docs/play/LEGENDARY_PLAY_IMPLEMENTATION_PLAN.md](play/LEGENDARY_PLAY_IMPLEMENTATION_PLAN.md) | B | historical snapshot | 2025-12-24 | - | Historical Legendary Play implementation plan |
| [docs/learning/README.md](learning/README.md) | A | active | 2026-03-22 | - | Sub-index for learning-domain drafts and test planning |
| [docs/learning/LEARNING_ADMIN_PHASE1_IMPLEMENTATION.md](learning/LEARNING_ADMIN_PHASE1_IMPLEMENTATION.md) | B | draft | 2026-01-10 | - | Implementation notes placeholder |
| [docs/learning/LEARNING_MODULE_IMPLEMENTATION.md](learning/LEARNING_MODULE_IMPLEMENTATION.md) | B | draft | 2026-01-04 | - | Implementation guide |
| [docs/learning/LEARNING_TEST_PLAN.md](learning/LEARNING_TEST_PLAN.md) | B | draft | 2026-01-04 | - | Test plan |
| [docs/billing/archive/LICENSING_SALES_EXECUTION_PLAN.md](billing/archive/LICENSING_SALES_EXECUTION_PLAN.md) | B | historical snapshot | 2026-01-21 | - | Licensing and product sales execution plan snapshot |
| [docs/planner/README.md](planner/README.md) | A | active | 2026-03-22 | - | Planner support-doc cluster entrypoint |
| [docs/planner/PLANNER_ANALYSIS_REPORT.md](planner/PLANNER_ANALYSIS_REPORT.md) | C | historical snapshot | - | Planner | Analysis report |
| [docs/planner/PLANNER_IA_RULES.md](planner/PLANNER_IA_RULES.md) | B | historical snapshot | - | Planner | IA rules snapshot |
| [docs/planner/PLANNER_IMPROVEMENT_TODO.md](planner/PLANNER_IMPROVEMENT_TODO.md) | D | historical snapshot | - | Planner | Completed worklist |
| [docs/planner/PLANNER_INVENTORY_GAP_ANALYSIS.md](planner/PLANNER_INVENTORY_GAP_ANALYSIS.md) | C | frozen audit | - | Planner | Inventory and gap audit |
| [docs/planner/PLANNER_REFACTOR_IMPLEMENTATION.md](planner/PLANNER_REFACTOR_IMPLEMENTATION.md) | B | historical snapshot | 2026-01-25 | - | Completed refactor plan |
| [docs/planner/PLANNER_TARGET_ARCHITECTURE.md](planner/PLANNER_TARGET_ARCHITECTURE.md) | B | historical snapshot | 2025-12-30 | - | Target architecture snapshot |
| [docs/planner/PLANNER_UI_UPGRADE_PLAN.md](planner/PLANNER_UI_UPGRADE_PLAN.md) | B | draft | 2026-01-25 | - | UI upgrade plan |
| [docs/play/play-structure-agent-risk.md](play/play-structure-agent-risk.md) | C | frozen audit | 2026-03-16 | - | Agent-risk guardrail for play-domain changes |
| [docs/play/play-structure-audit.md](play/play-structure-audit.md) | C | frozen audit | 2026-03-16 | - | Structural audit guardrail for the play domain |
| [docs/play/play-structure-canonical-map.md](play/play-structure-canonical-map.md) | C | frozen audit | 2026-03-16 | - | File classification map for play-related surfaces |
| [docs/play/play-structure-consolidation-plan.md](play/play-structure-consolidation-plan.md) | B | historical snapshot | 2026-03-16 | - | Historical consolidation/action plan for the play structure audit |
| [docs/play/PLAY_LOBBY_SOT.md](play/PLAY_LOBBY_SOT.md) | C | frozen audit | 2026-01-23 | - | Host lobby source-of-truth snapshot |
| [docs/profile/README.md](profile/README.md) | A | active | 2026-03-22 | - | Profile cluster entrypoint |
| [docs/profile/archive/PROFILE_AUDIT_2026-03-05.md](profile/archive/PROFILE_AUDIT_2026-03-05.md) | C | frozen audit | - | Profile | Audit snapshot |
| [docs/profile/archive/PROFILE_IMPLEMENTATION_PLAN.md](profile/archive/PROFILE_IMPLEMENTATION_PLAN.md) | B | historical snapshot | - | Profile | Completed implementation plan |
| [docs/gamification/SANDBOX_GAMIFICATION_REPORT.md](gamification/SANDBOX_GAMIFICATION_REPORT.md) | C | historical snapshot | 2026-01-03 | - | Gamification sandbox coverage snapshot |
| [docs/play/signals/README.md](play/signals/README.md) | A | active | 2026-03-22 | - | Sub-index for play signals docs |
| [docs/play/signals/SIGNALS_SPEC.md](play/signals/SIGNALS_SPEC.md) | B | draft | 2026-02-23 | - | Signals system architecture spec |
| [docs/STANDARDBILDER_AUDIT_REPORT.md](STANDARDBILDER_AUDIT_REPORT.md) | C | frozen audit | 2026-02-08 | - | Standard images audit report |
| [docs/TRANSLATION_ADMIN_ENTERPRISE_ANALYSIS.md](TRANSLATION_ADMIN_ENTERPRISE_ANALYSIS.md) | C | historical snapshot | 2026-01-11 | - | Enterprise translation and i18n architecture analysis |
| [docs/profile/archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md](profile/archive/USER_PROFILE_CURRENT_STATE_ANALYSIS.md) | C | historical snapshot | 2026-01-16 | - | User profile current-state analysis |
| [docs/TRIPLET_CREATION_CHECKLIST.md](TRIPLET_CREATION_CHECKLIST.md) | A | active | 2026-03-22 | - | Checklist for creating and registering a new canonical triplet |
| [docs/TRIPLET_WORKFLOW_STANDARD.md](TRIPLET_WORKFLOW_STANDARD.md) | A | active | 2026-03-22 | - | Mandatory lifecycle for architecture, audit, and implementation docs |
| [docs/DOCS_INDEX.md](DOCS_INDEX.md) | A | active | 2026-03-22 | - | Lightweight entry map, not a classified registry |
| [docs/INVENTORY.md](INVENTORY.md) | A | active | 2026-03-22 | - | Sole authoritative docs registry |
| [docs/DOCS_NAMING_CONVENTIONS.md](DOCS_NAMING_CONVENTIONS.md) | A | active | 2026-03-22 | - | Naming, placement, and cluster-first structure conventions |
| [docs/legal/archive/SVENSKA_KYRKAN_COMPLIANCE_AUDIT.md](legal/archive/SVENSKA_KYRKAN_COMPLIANCE_AUDIT.md) | C | frozen audit | - | Compliance | Enterprise compliance audit |
| [docs/legal/SVENSKA_KYRKAN_ONBOARDING.md](legal/SVENSKA_KYRKAN_ONBOARDING.md) | B | draft | 2026-01-13 | - | Onboarding guide |
| [docs/games/DOMAIN_GAMES_LEARNINGS.md](games/DOMAIN_GAMES_LEARNINGS.md) | C | draft | 2025-12-08 | - | Learnings |
| [docs/games/DOMAIN_GAMES_TODO.md](games/DOMAIN_GAMES_TODO.md) | D | draft | 2025-12-08 | - | Backlog |
| [docs/planner/DOMAIN_PLANNER_TODO.md](planner/DOMAIN_PLANNER_TODO.md) | D | draft | 2025-12-08 | - | Backlog |
| [docs/DOMAIN_PRODUCT_LEARNINGS.md](DOMAIN_PRODUCT_LEARNINGS.md) | C | draft | 2025-12-08 | - | Learnings |
| [docs/tenant/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md](tenant/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md) | C | draft | 2025-12-08 | - | Learnings |
| [docs/tenant/DOMAIN_TENANT_TODO.md](tenant/DOMAIN_TENANT_TODO.md) | D | draft | 2025-12-08 | - | Backlog |
| [docs/ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) | A | active | 2025-12-17 | - | Core reference |
| [docs/examples/README-legendary-play-example.md](examples/README-legendary-play-example.md) | B | draft | 2025-12-26 | - | Golden example for Legendary Play CSV imports |
| [docs/builder/GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md](builder/GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md) | B | historical snapshot | 2025-12-16 | - | Historical P2 implementation plan |
| [docs/builder/GAME_BUILDER_UI_SPEC.md](builder/GAME_BUILDER_UI_SPEC.md) | B | draft | 2025-12-16 | - | Builder UI specification |
| [docs/builder/GAME_CSV_IMPORT_EXPORT_PLAN.md](builder/GAME_CSV_IMPORT_EXPORT_PLAN.md) | B | historical snapshot | 2025-12-16 | - | Historical CSV import/export implementation plan |
| [docs/builder/GAME_BUILDER_IMPLEMENTATION_TRACKER.md](builder/GAME_BUILDER_IMPLEMENTATION_TRACKER.md) | B | historical snapshot | 2026-01-25 | - | Builder implementation tracker snapshot |
| [docs/builder/GAME_BUILDER_INVENTORY_AND_ROADMAP.md](builder/GAME_BUILDER_INVENTORY_AND_ROADMAP.md) | C | historical snapshot | 2026-01-25 | - | Builder inventory and roadmap snapshot |
| [docs/games/GAMES_DOMAIN.md](games/GAMES_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/games/README.md](games/README.md) | A | active | 2026-03-22 | - | Sub-index for games domain, GameDetails context work, and related snapshots |
| [docs/games/GAMEDETAILS_CONTEXT_ARCHITECTURE.md](games/GAMEDETAILS_CONTEXT_ARCHITECTURE.md) | A | active | 2026-03-10 | - | GameDetails context target architecture |
| [docs/games/GAMEDETAILS_CONTEXT_AUDIT.md](games/GAMEDETAILS_CONTEXT_AUDIT.md) | C | frozen audit | 2026-03-10 | - | Closed GameDetails context audit |
| [docs/games/GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md](games/GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md) | B | historical snapshot | 2026-03-10 | - | Security-focused implementation history for GameDetails context |
| [docs/games/GAMEDETAILS_IMPLEMENTATION_PLAN.md](games/GAMEDETAILS_IMPLEMENTATION_PLAN.md) | B | historical snapshot | 2026-01-30 | - | Earlier GameDetails and sandbox implementation history |
| [docs/games/GAMEDETAILS_SECTION_ANALYSIS.md](games/GAMEDETAILS_SECTION_ANALYSIS.md) | C | historical snapshot | 2026-01-30 | - | GameDetails section and data provenance analysis |
| [docs/games/GAME_INTEGRITY_REPORT.md](games/GAME_INTEGRITY_REPORT.md) | C | frozen audit | 2026-01-19 | - | End-to-end game logic consistency audit |
| [docs/gamification/ADMIN_DASHBOARD_DESIGN.md](gamification/ADMIN_DASHBOARD_DESIGN.md) | B | active | 2026-01-08 | - | Current admin dashboard design reference |
| [docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md](gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md) | A | active | 2026-01-01 | - | Canonical award builder export and import contract |
| [docs/gamification/BURN_FOUNDATION_DESIGN.md](gamification/BURN_FOUNDATION_DESIGN.md) | B | active | 2026-01-08 | - | Current burn-foundation design reference |
| [docs/gamification/ECONOMY_GOVERNANCE.md](gamification/ECONOMY_GOVERNANCE.md) | A | active | 2026-01-08 | - | Economy governance rules and constraints |
| [docs/gamification/GAMIFICATION_COMPLETE_REPORT.md](gamification/GAMIFICATION_COMPLETE_REPORT.md) | C | historical snapshot | 2026-01-08 | - | Point-in-time gamification v2 implementation summary |
| [docs/gamification/GAMIFICATION_JOURNEY_AUDIT.md](gamification/GAMIFICATION_JOURNEY_AUDIT.md) | C | frozen audit | 2026-02-13 | - | Journey-driven gamification UI audit snapshot |
| [docs/gamification/GAMIFICATION_MASTER_PLAN.md](gamification/GAMIFICATION_MASTER_PLAN.md) | B | active | 2026-01-01 | - | Active gamification master plan and decision log |
| [docs/gamification/GAMIFICATION_MONITORING_ALERTS.md](gamification/GAMIFICATION_MONITORING_ALERTS.md) | A | active | 2026-01-01 | - | Gamification monitoring and alert guidance |
| [docs/gamification/GAMIFICATION_RECONCILIATION_RUNBOOK.md](gamification/GAMIFICATION_RECONCILIATION_RUNBOOK.md) | A | active | 2026-01-01 | - | Wallet-versus-ledger reconciliation runbook |
| [docs/gamification/GAMIFICATION_TEST_PLAN.md](gamification/GAMIFICATION_TEST_PLAN.md) | B | draft | 2026-01-08 | - | Planned gamification test coverage |
| [docs/gamification/GAMIFICATION_TRIGGER_REPORT.md](gamification/GAMIFICATION_TRIGGER_REPORT.md) | C | historical snapshot | 2026-01-08 | - | Historical trigger taxonomy and expansion report |
| [docs/gamification/GAMIFICATION_V2_MIGRATION_SUMMARY.md](gamification/GAMIFICATION_V2_MIGRATION_SUMMARY.md) | C | historical snapshot | 2026-01-08 | - | Gamification v2 migration summary |
| [docs/gamification/LEADERBOARD_DESIGN.md](gamification/LEADERBOARD_DESIGN.md) | B | active | 2026-01-08 | - | Current leaderboard behavior and anti-gaming design |
| [docs/gamification/README.md](gamification/README.md) | A | active | 2026-03-21 | - | Gamification documentation sub-index and trust map |
| [docs/gamification/SOFTCAP_DESIGN.md](gamification/SOFTCAP_DESIGN.md) | B | draft | 2026-01-08 | - | Softcap design reference pending shipped status |
| [docs/import/README.md](import/README.md) | A | active | 2026-03-21 | - | Sub-index for bounded import validation audits and fail-fast verification history |
| [docs/import/PHASE_STEP_ARTIFACT_AUDIT_REPORT.md](import/PHASE_STEP_ARTIFACT_AUDIT_REPORT.md) | C | frozen audit | 2026-02-08 | - | Closed fail-fast audit for phase, step, role, and artifact validation coverage |
| [docs/gdpr/tenant-anonymization.md](gdpr/tenant-anonymization.md) | A | active | 2026-03-02 | - | Tenant anonymization source-of-truth |
| ~~docs/HANDOVER_2024-12-07.md~~ | C | archived | 2026-03-15 | - | → `archive/HANDOVER_2024-12-07.md` |
| [docs/media/README.md](media/README.md) | A | active | 2026-03-22 | - | Media cluster entrypoint |
| [docs/media/MEDIA_DOMAIN.md](media/MEDIA_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc |
| [docs/import/MANUAL_VERIFICATION_IMPORT_FIX.md](import/MANUAL_VERIFICATION_IMPORT_FIX.md) | B | draft | 2026-02-08 | - | Manual verification guide for import-fix scenarios |
| [docs/MIGRATIONS.md](MIGRATIONS.md) | A | active | 2025-12-17 | - | Core reference |
| [docs/marketing/MARKETING_DOMAIN.md](marketing/MARKETING_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/marketing/README.md](marketing/README.md) | A | active | 2026-03-22 | - | Cluster entrypoint for marketing domain docs |
| [docs/demo/archive/MASTERPROMPT_DEMO_IMPLEMENTATION.md](demo/archive/MASTERPROMPT_DEMO_IMPLEMENTATION.md) | E | historical snapshot | 2026-01-13 | - | Enterprise demo implementation prompt snapshot |
| [docs/NOTION.md](NOTION.md) | A | active | 2026-03-22 | - | Notion mirror rules and repo entrypoints |
| [docs/NOTION_SYNC_PLAN.md](NOTION_SYNC_PLAN.md) | A | active | 2026-03-21 | - | Notion sync strategy |
| [docs/NOTION_UPDATE_CHECKLIST.md](NOTION_UPDATE_CHECKLIST.md) | A | active | 2026-03-21 | - | Practical Notion update checklist |
| [docs/notion-ai/HUB_STRUCTURE_SOURCE.md](notion-ai/HUB_STRUCTURE_SOURCE.md) | A | active | 2026-03-21 | - | Source brief for Notion hub structure |
| [docs/notion-ai/PROMPT_NOTION_AI_WORKSPACE_SETUP.md](notion-ai/PROMPT_NOTION_AI_WORKSPACE_SETUP.md) | A | active | 2026-03-21 | - | Prompt for Notion AI workspace setup |
| [docs/notion-ai/README.md](notion-ai/README.md) | A | active | 2026-03-21 | - | Notion AI prompt pack usage |
| [docs/notion-ai/WORKSPACE_ENTRY_PAGE_SOURCE.md](notion-ai/WORKSPACE_ENTRY_PAGE_SOURCE.md) | A | active | 2026-03-21 | - | Source brief for workspace entry page |
| [docs/notifications/NOTIFICATIONS_DOMAIN.md](notifications/NOTIFICATIONS_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/notifications/README.md](notifications/README.md) | A | active | 2026-03-22 | - | Sub-index for notifications domain and app-shell triplet docs |
| [docs/notifications/app-shell-notifications-architecture.md](notifications/app-shell-notifications-architecture.md) | A | active | 2026-03-21 | - | App-shell notifications architecture |
| [docs/notifications/app-shell-notifications-audit.md](notifications/app-shell-notifications-audit.md) | C | active audit | 2026-03-21 | - | App-shell notifications audit |
| [docs/notifications/app-shell-notifications-batch2-spec.md](notifications/app-shell-notifications-batch2-spec.md) | B | active | 2026-03-21 | - | Scheduled-path consolidation spec |
| [docs/notifications/app-shell-notifications-implementation-plan.md](notifications/app-shell-notifications-implementation-plan.md) | B | active | 2026-03-21 | - | App-shell notifications implementation plan |
| [docs/ops/OPERATIONS_DOMAIN.md](ops/OPERATIONS_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/ops/alerting.md](ops/alerting.md) | A | active | 2025-12-11 | - | Alerting runbook |
| [docs/ops/anomaly-detection-playbook.md](ops/anomaly-detection-playbook.md) | A | active | 2026-03-14 | - | Launch anomaly detection and response playbook |
| [docs/ops/backup_dr.md](ops/backup_dr.md) | A | active | 2025-12-11 | - | Backup and disaster recovery runbook |
| [docs/ops/cicd_pipeline.md](ops/cicd_pipeline.md) | A | active | 2025-12-11 | - | CI/CD and rollback runbook |
| [docs/ops/first-deploy-runbook.md](ops/first-deploy-runbook.md) | A | active | 2026-03-14 | - | First production deploy runbook |
| [docs/ops/incident_response.md](ops/incident_response.md) | A | active | 2025-12-11 | - | Incident response runbook |
| [docs/ops/incidents.md](ops/incidents.md) | A | active | 2025-12-11 | - | Incident log template |
| [docs/ops/prod-migration-workflow.md](ops/prod-migration-workflow.md) | A | active | 2026-03-14 | - | Production migration workflow and rollback guidance |
| [docs/ops/production-signals-dashboard.md](ops/production-signals-dashboard.md) | A | active | 2026-03-14 | - | Operational signals dashboard and thresholds |
| [docs/ops/release-promotion-checklist.md](ops/release-promotion-checklist.md) | A | active | 2026-03-21 | - | Operational promotion checklist |
| [docs/ops/README.md](ops/README.md) | A | active | 2025-12-17 | - | Sub-index for operational runbooks and procedures |
| ~~docs/prompts/README.md~~ | A | archived | 2026-03-15 | - | → `archive/README.md` (prompts dir removed) |
| [docs/reports/README.md](reports/README.md) | A | draft | 2025-12-18 | - | Index for reports, audits, and historical snapshots |
| [docs/reports/ADMIN_ACCESS_INVESTIGATION_REPORT.md](reports/ADMIN_ACCESS_INVESTIGATION_REPORT.md) | C | historical snapshot | 2025-12-12 | - | Admin access investigation snapshot |
| [docs/reports/ADMIN_AUTH_INVESTIGATION_REPORT.md](reports/ADMIN_AUTH_INVESTIGATION_REPORT.md) | C | historical snapshot | 2025-12-02 | - | Admin authentication investigation snapshot |
| [docs/reports/ADMIN_FEATURE_AUDIT_REPORT.md](reports/ADMIN_FEATURE_AUDIT_REPORT.md) | C | historical snapshot | 2025-12-12 | - | Admin feature audit snapshot |
| [docs/reports/ADMIN_TECH_REVIEW.md](reports/ADMIN_TECH_REVIEW.md) | C | historical snapshot | 2025-12-04 | - | Admin technical review snapshot |
| [docs/reports/API_ROUTE_AUDIT.md](reports/API_ROUTE_AUDIT.md) | C | frozen audit | 2026-02-21 | - | API route security audit snapshot |
| [docs/reports/AUTHORIZATION_SYSTEM_REPORT.md](reports/AUTHORIZATION_SYSTEM_REPORT.md) | C | historical snapshot | 2025-12-02 | - | Authorization system analysis snapshot |
| [docs/reports/CLAUDE_OPUS_ANALYSIS_REPORT.md](reports/CLAUDE_OPUS_ANALYSIS_REPORT.md) | C | historical snapshot | 2025-11-30 | - | External deep-dive analysis snapshot |
| [docs/reports/COMPREHENSIVE_VALIDATION_REPORT.md](reports/COMPREHENSIVE_VALIDATION_REPORT.md) | C | historical snapshot | 2025-11-30 | - | MVP validation snapshot |
| [docs/reports/GOLDEN_PATH_QA_CHECKLIST.md](reports/GOLDEN_PATH_QA_CHECKLIST.md) | B | active | 2026-02-22 | - | Participant play QA checklist |
| [docs/reports/NAVIGATION_AUTH_FLOW_REPORT.md](reports/NAVIGATION_AUTH_FLOW_REPORT.md) | C | historical snapshot | 2025-12-12 | - | Navigation and auth flow snapshot |
| [docs/reports/PRODUCT_CARD_ANALYSIS.md](reports/PRODUCT_CARD_ANALYSIS.md) | C | historical snapshot | 2026-01-08 | - | Product card field inventory analysis |
| [docs/reports/PRODUCT_STRIPE_SYNC_IMPLEMENTATION.md](reports/PRODUCT_STRIPE_SYNC_IMPLEMENTATION.md) | B | historical snapshot | 2026-01-08 | - | Product Stripe sync implementation plan snapshot |
| [docs/reports/PRODUCT_STRIPE_SYNC_PLAN.md](reports/PRODUCT_STRIPE_SYNC_PLAN.md) | B | historical snapshot | 2026-01-08 | - | Product Stripe sync technical plan snapshot |
| [docs/reports/PRODUCT_SYNC_FIELD_ANALYSIS.md](reports/PRODUCT_SYNC_FIELD_ANALYSIS.md) | C | historical snapshot | 2026-01-08 | - | Product Stripe sync field analysis snapshot |
| [docs/reports/PROFILE_LOADING_FORENSIC_AUDIT.md](reports/PROFILE_LOADING_FORENSIC_AUDIT.md) | C | frozen audit | 2026-01-31 | - | Expanded forensic audit of intermittent profile loading issues |
| [docs/reports/PROFILE_LOADING_INVESTIGATION.md](reports/PROFILE_LOADING_INVESTIGATION.md) | C | historical snapshot | 2026-01-31 | - | Investigation log for intermittent profile loading |
| [docs/reports/STRIPE_COMPLETION_REPORT.md](reports/STRIPE_COMPLETION_REPORT.md) | C | historical snapshot | 2025-12-10 | - | Stripe integration completion snapshot |
| [docs/reports/STRIPE_INVENTORY_REPORT.md](reports/STRIPE_INVENTORY_REPORT.md) | C | historical snapshot | 2025-12-10 | - | Stripe integration inventory snapshot |
| [docs/reports/SYSTEM_STATUS_RISK_OVERVIEW.md](reports/SYSTEM_STATUS_RISK_OVERVIEW.md) | C | frozen audit | 2026-01-28 | - | Read-only architectural system status report |
| [docs/reports/TIMEOUT_DIAGNOSTIC_REPORT.md](reports/TIMEOUT_DIAGNOSTIC_REPORT.md) | C | frozen audit | 2026-02-20 | - | Systemwide timeout diagnostic report |
| [docs/reports/TYPE_MISMATCHES_ANALYSIS.md](reports/TYPE_MISMATCHES_ANALYSIS.md) | C | historical snapshot | 2025-12-10 | - | Type mismatches analysis snapshot |
| [docs/participants/PARTICIPANTS_DOMAIN.md](participants/PARTICIPANTS_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/participants/PARTICIPANTS_DOMAIN_ARCHITECTURE.md](participants/PARTICIPANTS_DOMAIN_ARCHITECTURE.md) | B | archived | 2025-12-17 | - | Historical architecture/spec (pseudo-schema) |
| [docs/participants/PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md](participants/PARTICIPANTS_DOMAIN_IMPLEMENTATION_REPORT.md) | C | archived | 2025-12-17 | - | Historical report (superseded by 2025-12-17 addendum) |
| [docs/participants/PARTICIPANTS_DOMAIN_MVP.md](participants/PARTICIPANTS_DOMAIN_MVP.md) | B | archived | 2025-12-17 | - | Historical MVP/spec snapshot |
| [docs/participants/README.md](participants/README.md) | A | active | 2026-03-22 | - | Cluster entrypoint for participants domain docs |
| [docs/admin/archive/PHASE2_PREFLIGHT_ADMIN_TENANT.md](admin/archive/PHASE2_PREFLIGHT_ADMIN_TENANT.md) | C | frozen audit | 2026-01-10 | - | Preflight validation for admin tenant architecture |
| [docs/platform/README.md](platform/README.md) | A | active | 2026-03-22 | - | Platform cluster entrypoint |
| [docs/platform/PLATFORM_DOMAIN.md](platform/PLATFORM_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc |
| [docs/platform/PLATFORM_DOMAIN_VALIDATION_REPORT.md](platform/PLATFORM_DOMAIN_VALIDATION_REPORT.md) | C | draft | 2025-12-10 | - | Validation report |
| [docs/billing/archive/PURCHASE_FLOW_IMPLEMENTATION.md](billing/archive/PURCHASE_FLOW_IMPLEMENTATION.md) | B | historical snapshot | 2026-01-27 | - | Purchase-flow implementation plan snapshot |
| [docs/billing/archive/PURCHASE_FLOW_STATUS_REPORT.md](billing/archive/PURCHASE_FLOW_STATUS_REPORT.md) | C | historical snapshot | 2026-01-27 | - | Purchase-flow status report snapshot |
| [docs/tenant/TENANT_MEMBERSHIP_CONSOLIDATION.md](tenant/TENANT_MEMBERSHIP_CONSOLIDATION.md) | C | historical snapshot | 2026-01-03 | - | Tenant-membership naming consolidation snapshot |
| [docs/tenant/README.md](tenant/README.md) | A | active | 2026-03-22 | - | Tenant cluster entrypoint |
| [docs/tenant/TENANT_DOMAIN.md](tenant/TENANT_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/builder/TESTPLAN_GAME_BUILDER_P0.md](builder/TESTPLAN_GAME_BUILDER_P0.md) | B | draft | 2025-12-17 | - | Testplan |
| [docs/play/PLAY_DOMAIN.md](play/PLAY_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/play/README.md](play/README.md) | A | active | 2026-03-22 | - | Sub-index for play contracts, audits, and reference docs |
| [docs/play/PARTICIPANT_PLAY_AUDIT.md](play/PARTICIPANT_PLAY_AUDIT.md) | C | active audit | 2026-03-21 | - | Participant play audit |
| [docs/play/PARTICIPANT_PLAY_UI_LAWS.md](play/PARTICIPANT_PLAY_UI_LAWS.md) | A | active | 2026-02-22 | - | Participant play UI contract laws |
| [docs/play/PLAY_IMPLEMENTATION_GUIDE_P0.md](play/PLAY_IMPLEMENTATION_GUIDE_P0.md) | B | historical snapshot | 2026-01-18 | - | P0 implementation guide snapshot |
| [docs/play/PLAY_MODE_UI_AUDIT.md](play/PLAY_MODE_UI_AUDIT.md) | C | active audit | 2026-03-21 | - | Play mode UI audit |
| [docs/play/PLAY_SYSTEM_DOCUMENTATION.md](play/PLAY_SYSTEM_DOCUMENTATION.md) | A | active | 2026-01-18 | - | Broad play system reference |
| [docs/play/PLAY_UI_CONTRACT.md](play/PLAY_UI_CONTRACT.md) | A | active | 2026-02-22 | - | Canonical play UI contract |
| [docs/play/PLAY_UI_WIRING_AUDIT_REPORT.md](play/PLAY_UI_WIRING_AUDIT_REPORT.md) | C | historical snapshot | 2026-02-09 | - | Play wiring audit snapshot |
| [docs/play/PLAY_UI_WIRING_AUDIT_REPORT_v2.md](play/PLAY_UI_WIRING_AUDIT_REPORT_v2.md) | C | active audit | 2026-03-21 | - | Active play wiring audit reference |
| [docs/play/TRIGGER_ENGINE_CONTRACT.md](play/TRIGGER_ENGINE_CONTRACT.md) | A | active | 2026-02-09 | - | Trigger engine contract |
| [docs/planner/PLANNER_DOMAIN.md](planner/PLANNER_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/gamification/GAMIFICATION_DOMAIN.md](gamification/GAMIFICATION_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/journey/README.md](journey/README.md) | A | active | 2026-03-22 | - | Journey cluster entrypoint |
| [docs/journey/JOURNEY_DOMAIN.md](journey/JOURNEY_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/journey/journey-activation-architecture.md](journey/journey-activation-architecture.md) | A | active | 2026-03-06 | - | Journey activation architecture |
| [docs/journey/journey-activation-audit.md](journey/journey-activation-audit.md) | C | active audit | 2026-03-06 | - | Journey activation audit |
| [docs/journey/journey-activation-implementation-plan.md](journey/journey-activation-implementation-plan.md) | B | active | 2026-03-06 | - | Journey activation implementation plan |
| [docs/import/JSON_IMPORT_FIELD_REFERENCE.md](import/JSON_IMPORT_FIELD_REFERENCE.md) | A | active | 2025-12-26 | - | Import field reference |
| [docs/import/JSON_IMPORT_VERIFICATION_CHECKLIST.md](import/JSON_IMPORT_VERIFICATION_CHECKLIST.md) | A | active | 2025-12-26 | - | Verification checklist |
| [docs/api/README.md](api/README.md) | A | active | 2026-03-22 | - | Sub-index for internal API and integration docs |
| [docs/api/API_INTEGRATION_DOMAIN.md](api/API_INTEGRATION_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (API surface + conventions) |
| [docs/play/PLAY_SESSIONS_UI_SPEC.md](play/PLAY_SESSIONS_UI_SPEC.md) | B | draft | 2025-12-16 | - | Spec |
| [docs/PERFORMANCE_ADVISOR_PROMPT.md](PERFORMANCE_ADVISOR_PROMPT.md) | E | active | 2026-01-08 | - | Prompt for Supabase Performance Advisor |
| [docs/plans/PRODUCT_CARD_UPGRADE_PLAN.md](plans/PRODUCT_CARD_UPGRADE_PLAN.md) | B | draft | 2026-01-08 | - | Product card upgrade plan |
| [docs/plans/PROFILE_RESILIENCE_IMPLEMENTATION.md](plans/PROFILE_RESILIENCE_IMPLEMENTATION.md) | B | historical snapshot | 2026-01-31 | - | Profile resilience implementation snapshot |
| [docs/PROJECT_EXECUTION_PLAN.md](PROJECT_EXECUTION_PLAN.md) | B | draft | 2025-12-10 | - | Plan |
| [docs/games/archive/PUZZLE_MODULES_INTEGRATION_STATUS.md](games/archive/PUZZLE_MODULES_INTEGRATION_STATUS.md) | C | historical snapshot | 2025-12-28 | - | Puzzle modules integration status snapshot |
| [docs/notifications/QA_APPSHELL_ANALYSIS.md](notifications/QA_APPSHELL_ANALYSIS.md) | C | draft | 2026-01-17 | - | AppShell QA and improvement analysis |
| [docs/qa/director-triggers.md](qa/director-triggers.md) | B | draft | 2026-02-23 | Play domain | Director Mode triggers QA plan |
| ~~docs/prompts/PROMPT_FOR_NEW_AI.md~~ | E | archived | 2026-03-15 | - | → `archive/PROMPT_FOR_NEW_AI.md` |
| [docs/README.md](README.md) | A | active | 2026-03-22 | - | Docs start and route into launch-readiness + archive entrypoints |
| [docs/sandbox/README.md](sandbox/README.md) | A | active | 2026-03-21 | - | Sub-index for sandbox-only implementation and planning docs |
| [docs/sandbox/SANDBOX_ARTIFACTS_IMPLEMENTATION.md](sandbox/SANDBOX_ARTIFACTS_IMPLEMENTATION.md) | A | active | 2025-12-29 | - | Sandbox artifacts implementation log |
| [docs/sandbox/SANDBOX_ATLAS_IMPLEMENTATION_PLAN.md](sandbox/SANDBOX_ATLAS_IMPLEMENTATION_PLAN.md) | B | draft | 2026-01-10 | - | Sandbox Atlas implementation plan |
| [docs/play/sessions/README.md](play/sessions/README.md) | A | active | 2026-03-22 | - | Sub-index for historical session cockpit docs within the play cluster |
| [docs/play/sessions/SESSION_COCKPIT_ARCHITECTURE.md](play/sessions/SESSION_COCKPIT_ARCHITECTURE.md) | C | historical snapshot | 2025-12-28 | - | Session cockpit architecture snapshot |
| [docs/play/sessions/SESSION_COCKPIT_MIGRATION.md](play/sessions/SESSION_COCKPIT_MIGRATION.md) | B | historical snapshot | 2025-12-28 | - | Session cockpit migration guide snapshot |
| [docs/SESSION_COMPLETION_REPORT.md](SESSION_COMPLETION_REPORT.md) | C | historical snapshot | 2025-12-11 | - | Completed session report snapshot |
| [docs/archive/SECURITY_AUDIT_TODO.md](archive/SECURITY_AUDIT_TODO.md) | D | ✅ done | 2026-01-08 | - | Security backlog (completed) |
| [docs/ops/SECURITY_AUDIT_PROMPT_V2.md](ops/SECURITY_AUDIT_PROMPT_V2.md) | E | active | 2026-01-08 | - | Verification queries for security audit |
| [docs/billing/STRIPE.md](billing/STRIPE.md) | A | active | 2025-12-17 | - | Billing reference |
| [docs/support/README.md](support/README.md) | A | active | 2026-03-22 | - | Sub-index for support domain docs |
| [docs/support/SUPPORT_DOMAIN.md](support/SUPPORT_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/TAILWIND_PLUS_COMPONENTS.md](TAILWIND_PLUS_COMPONENTS.md) | A | draft | 2025-11-30 | - | UI reference |
| [docs/TASK_11_12_TOKEN_SESSION_MANAGEMENT.md](TASK_11_12_TOKEN_SESSION_MANAGEMENT.md) | B | draft | 2025-12-11 | - | Task/spec |
| [docs/TASK_9_LIVE_PROGRESS.md](TASK_9_LIVE_PROGRESS.md) | B | draft | 2025-12-10 | - | Task/spec |
| [docs/toolkit/archive/TOOLKIT_ROADMAP.md](toolkit/archive/TOOLKIT_ROADMAP.md) | B | historical snapshot | 2025-12-28 | - | Toolkit roadmap snapshot |
| [docs/TOOLS_COACH_DIAGRAM_IMPLEMENTATION.md](TOOLS_COACH_DIAGRAM_IMPLEMENTATION.md) | B | draft | 2026-01-02 | - | Coach Diagram Builder implementation spec |
| [docs/TOOLS_MASTER_IMPLEMENTATION.md](TOOLS_MASTER_IMPLEMENTATION.md) | B | historical snapshot | 2026-01-02 | - | Toolbelt MVP implementation snapshot |
| [docs/TOOLS_TOOLBELT_SPEC_V1.md](TOOLS_TOOLBELT_SPEC_V1.md) | B | draft | 2026-01-02 | - | Toolbelt v1 UX specification |
| [docs/templates/COMPONENT_INVENTORY_TEMPLATE.md](templates/COMPONENT_INVENTORY_TEMPLATE.md) | E | draft | 2025-12-10 | - | Component inventory template |
| [docs/templates/DECISION_CRITERIA.md](templates/DECISION_CRITERIA.md) | E | draft | 2025-12-10 | - | Architecture and refactoring decision criteria template |
| [docs/templates/DOMAIN_VALIDATION_TEMPLATE.md](templates/DOMAIN_VALIDATION_TEMPLATE.md) | E | draft | 2025-12-10 | - | Domain validation report template |
| [docs/templates/TRIPLET_ARCHITECTURE_TEMPLATE.md](templates/TRIPLET_ARCHITECTURE_TEMPLATE.md) | E | active | 2026-03-21 | - | Template for new architecture docs in active triplets |
| [docs/templates/TRIPLET_AUDIT_TEMPLATE.md](templates/TRIPLET_AUDIT_TEMPLATE.md) | E | active | 2026-03-21 | - | Template for new audit docs in active triplets |
| [docs/templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md](templates/TRIPLET_IMPLEMENTATION_PLAN_TEMPLATE.md) | E | active | 2026-03-21 | - | Template for new implementation plans in active triplets |
| [docs/templates/VALIDATION_CHECKLIST.md](templates/VALIDATION_CHECKLIST.md) | E | draft | 2025-12-10 | - | Validation checklist template |
| [docs/content/TRANSLATION_ENGINE_DOMAIN.md](content/TRANSLATION_ENGINE_DOMAIN.md) | A | active | 2025-12-17 | - | Domain doc (repo-anchored) |
| [docs/content/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md](content/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md) | C | draft | 2025-12-11 | - | Validation report |
| [docs/TOOLING_MATRIX.md](TOOLING_MATRIX.md) | A | active | 2026-03-21 | - | Locked CLI vs MCP guidance |
| [docs/toolkit/README.md](toolkit/README.md) | A | active | 2025-12-28 | - | User-facing toolkit documentation hub |
| [docs/toolkit/api-reference/README.md](toolkit/api-reference/README.md) | A | draft | 2025-12-28 | - | Toolkit public API reference |
| [docs/toolkit/developer-guide/README.md](toolkit/developer-guide/README.md) | A | draft | 2025-12-28 | - | Toolkit developer integration guide |
| [docs/toolkit/getting-started/concepts.md](toolkit/getting-started/concepts.md) | A | draft | 2025-12-28 | - | Toolkit core concepts overview |
| [docs/toolkit/getting-started/README.md](toolkit/getting-started/README.md) | A | draft | 2025-12-28 | - | Toolkit onboarding quick start |
| [docs/toolkit/host-guide/README.md](toolkit/host-guide/README.md) | A | draft | 2025-12-28 | - | Toolkit host operations guide |
| [docs/TYPE_MANAGEMENT.md](TYPE_MANAGEMENT.md) | A | draft | 2025-12-10 | - | Core reference |
| [docs/demo/archive/VERIFICATION_PROMPT.md](demo/archive/VERIFICATION_PROMPT.md) | E | historical snapshot | 2026-01-13 | - | Demo sprint verification prompt snapshot |
| [docs/validation/README.md](validation/README.md) | A | active | 2026-03-21 | - | Sub-index for validation snapshots and working material |
| [docs/validation/API_VALIDATION_REPORT.md](validation/API_VALIDATION_REPORT.md) | C | historical snapshot | 2025-12-11 | - | Validation report |
| [docs/validation/BATCH_3_QUICK_REVIEW.md](validation/BATCH_3_QUICK_REVIEW.md) | C | historical snapshot | 2025-12-11 | - | Review |
| [docs/validation/COMPONENT_INVENTORY.md](validation/COMPONENT_INVENTORY.md) | C | draft | 2025-12-11 | Frontend | Inventory/report |
| [docs/validation/OPERATIONS_DOMAIN_GAP_PLAN.md](validation/OPERATIONS_DOMAIN_GAP_PLAN.md) | B | historical snapshot | 2025-12-11 | Ops/Platform | Plan |
| [docs/validation/PRIORITY_VALIDATION_2025-12-17.md](validation/PRIORITY_VALIDATION_2025-12-17.md) | C | frozen audit | 2025-12-17 | - | Working log |
| [docs/validation/REALITY_CHECK_2025-12-17.md](validation/REALITY_CHECK_2025-12-17.md) | C | frozen audit | 2025-12-17 | - | Findings + fixes |
| [docs/play/ARTIFACT_UI_CONTRACT.md](play/ARTIFACT_UI_CONTRACT.md) | B | draft | - | Play | Artifact contract draft |
| [docs/play/archive/ARTIFACTS_V2_IMPLEMENTATION.md](play/archive/ARTIFACTS_V2_IMPLEMENTATION.md) | C | historical snapshot | - | Play | Completed implementation record |
| [docs/play/ARTIFACT_COMPONENTS.md](play/ARTIFACT_COMPONENTS.md) | B | draft | - | Play | UI layout spec/backlog |
| [docs/play/ARTIFACT_MATRIX.md](play/ARTIFACT_MATRIX.md) | B | draft | - | Play | Coverage matrix/spec |
| [docs/admin/archive/ARCH_REALITY_CHECK_ADMIN_TENANT.md](admin/archive/ARCH_REALITY_CHECK_ADMIN_TENANT.md) | C | frozen audit | 2026-01-10 | - | Admin versus tenant access-control reality check |
| [docs/admin/archive/ARCH_ANALYSIS_LEARNING_ADMIN_PHASE0.md](admin/archive/ARCH_ANALYSIS_LEARNING_ADMIN_PHASE0.md) | C | historical snapshot | 2026-01-10 | - | Phase 0 analysis for learning admin architecture |
| [docs/admin/archive/ARCH_ANALYSIS_SHOP_REWARDS_PHASE0.md](admin/archive/ARCH_ANALYSIS_SHOP_REWARDS_PHASE0.md) | C | historical snapshot | 2026-01-10 | - | Phase 0 analysis for shop rewards admin architecture |
| [docs/admin/archive/ARCH_ANALYSIS_SUPPORT_TICKETS_PHASE0.md](admin/archive/ARCH_ANALYSIS_SUPPORT_TICKETS_PHASE0.md) | C | historical snapshot | 2026-01-11 | - | Phase 0 analysis for support and tickets admin architecture |
| [docs/admin/archive/ARCH_ANALYSIS_TRANSLATION_PHASE0.md](admin/archive/ARCH_ANALYSIS_TRANSLATION_PHASE0.md) | C | historical snapshot | 2026-01-11 | - | Phase 0 analysis for translation and i18n admin architecture |
| [docs/admin/archive/ARCH_VALIDATION_ADMIN_TENANT_PHASE2.md](admin/archive/ARCH_VALIDATION_ADMIN_TENANT_PHASE2.md) | C | frozen audit | 2026-01-10 | - | Phase 2 validation for admin and tenant separation |
| [docs/archive/ARCHIVE_MANIFEST.md](archive/ARCHIVE_MANIFEST.md) | A | active | 2026-03-15 | - | Provenance manifest for archived files |
| [docs/archive/ARTIFACT_UI_IMPLEMENTATION_BRIEF.md](archive/ARTIFACT_UI_IMPLEMENTATION_BRIEF.md) | B | archived | 2026-02-27 | - | Archived artifact UI execution brief |
| [docs/archive/ATLAS_EVOLUTION_IMPLEMENTATION.md](archive/ATLAS_EVOLUTION_IMPLEMENTATION.md) | B | archived | 2026-01-26 | - | Archived Atlas evolution implementation notes |
| [docs/archive/AUTOMATED_MIGRATION_OPTION_B.md](archive/AUTOMATED_MIGRATION_OPTION_B.md) | B | archived | 2025-11-30 | - | Archived automated migration option guide |
| [docs/archive/BLOCK_1_EXECUTION_BRIEF.md](archive/BLOCK_1_EXECUTION_BRIEF.md) | B | archived | 2026-03-10 | - | Archived Block 1 execution brief |
| [docs/archive/BLOCK_1_VERIFICATION_CHECKLIST.md](archive/BLOCK_1_VERIFICATION_CHECKLIST.md) | B | archived | 2026-03-10 | - | Archived Block 1 verification checklist |
| [docs/archive/BLOCK_2_EXECUTION_BRIEF.md](archive/BLOCK_2_EXECUTION_BRIEF.md) | B | archived | 2026-03-10 | - | Archived Block 2 execution brief |
| [docs/archive/BLOCK_3_EXECUTION_BRIEF.md](archive/BLOCK_3_EXECUTION_BRIEF.md) | B | archived | 2026-03-10 | - | Archived Block 3 execution brief |
| [docs/archive/BROWSE_SCALING_IMPLEMENTATION_PLAN.md](archive/BROWSE_SCALING_IMPLEMENTATION_PLAN.md) | B | archived | 2026-01-30 | - | Archived browse scaling implementation plan |
| [docs/archive/CHATGPT_GAME_CREATOR_PROMPT.md](archive/CHATGPT_GAME_CREATOR_PROMPT.md) | E | archived | 2025-12-10 | - | Archived one-shot game creator prompt |
| [docs/archive/CLAUDE_OPUS_DEEP_DIVE_PROMPT.md](archive/CLAUDE_OPUS_DEEP_DIVE_PROMPT.md) | E | archived | 2025-11-30 | - | Archived deep-dive prompt |
| [docs/archive/CLEANUP_MASTER_PROMPT.md](archive/CLEANUP_MASTER_PROMPT.md) | E | archived | 2026-01-28 | - | Archived cleanup orchestration prompt |
| [docs/archive/CODEX_TENANT_CONSOLIDATION_PROMPT.md](archive/CODEX_TENANT_CONSOLIDATION_PROMPT.md) | E | archived | 2026-01-03 | - | Archived tenant consolidation prompt |
| [docs/archive/commands.claude.md](archive/commands.claude.md) | E | archived | 2026-01-17 | - | Archived Claude process command artifact |
| [docs/archive/commands.md](archive/commands.md) | E | archived | 2026-01-17 | - | Archived process command artifact |
| [docs/archive/disputes.md](archive/disputes.md) | E | archived | 2026-01-17 | - | Archived dual-agent dispute tracking artifact |
| [docs/archive/EXECUTE_MIGRATIONS_NOW.md](archive/EXECUTE_MIGRATIONS_NOW.md) | B | archived | 2025-11-29 | - | Archived one-time migration execution guide |
| [docs/archive/GAMECARD_UNIFIED_IMPLEMENTATION.md](archive/GAMECARD_UNIFIED_IMPLEMENTATION.md) | B | archived | 2026-01-30 | - | Archived unified game card implementation notes |
| [docs/archive/GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md](archive/GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md) | B | archived | 2026-03-13 | - | Superseded GameDetails context architecture v1 |
| [docs/archive/GAMEDETAILS_CONTEXT_AUDIT.v1.md](archive/GAMEDETAILS_CONTEXT_AUDIT.v1.md) | C | archived | 2026-03-13 | - | Superseded GameDetails context audit v1 |
| [docs/archive/GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md](archive/GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md) | B | archived | 2026-03-13 | - | Superseded GameDetails context implementation plan v1 |
| [docs/archive/HANDOVER_2024-12-07.md](archive/HANDOVER_2024-12-07.md) | C | archived | 2025-12-08 | - | Archived December 2024 handover snapshot |
| [docs/archive/IMPLEMENTATION_GUIDE.md](archive/IMPLEMENTATION_GUIDE.md) | B | archived | 2025-12-10 | - | Archived duplicate implementation guide |
| [docs/archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md](archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md) | C | archived | 2026-01-10 | - | Archived achievements admin phase 1 log |
| [docs/archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md](archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md) | C | archived | 2026-01-10 | - | Archived achievements phase 2 tenant log |
| [docs/archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE3_PARTICIPANT.md](archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE3_PARTICIPANT.md) | C | archived | 2026-01-10 | - | Archived achievements phase 3 participant log |
| [docs/archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_HARDENING.md](archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_HARDENING.md) | C | archived | 2026-01-10 | - | Archived achievements phase 4 hardening log |
| [docs/archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_INTEGRATION.md](archive/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_INTEGRATION.md) | C | archived | 2026-01-10 | - | Archived achievements phase 4 integration log |
| [docs/archive/IMPLEMENTATION_LOG_ADMIN_TENANT_PROXY_FIX.md](archive/IMPLEMENTATION_LOG_ADMIN_TENANT_PROXY_FIX.md) | C | archived | 2026-01-10 | - | Archived admin tenant proxy fix log |
| [docs/archive/IMPLEMENTATION_LOG_LEARNING_PHASE2.md](archive/IMPLEMENTATION_LOG_LEARNING_PHASE2.md) | C | archived | 2026-01-10 | - | Archived learning phase 2 implementation log |
| [docs/archive/IMPLEMENTATION_LOG_PLAY_ARTIFACTS.md](archive/IMPLEMENTATION_LOG_PLAY_ARTIFACTS.md) | C | archived | 2025-12-30 | - | Archived play artifacts implementation log |
| [docs/archive/Journey_v2_Architecture.md](archive/Journey_v2_Architecture.md) | B | archived | 2026-03-06 | - | Archived Journey v2 architecture draft |
| [docs/archive/Journey_v2_Audit.md](archive/Journey_v2_Audit.md) | C | archived | 2026-03-06 | - | Archived Journey v2 audit snapshot |
| [docs/archive/Journey_v2_CHANGELOG.md](archive/Journey_v2_CHANGELOG.md) | C | archived | 2026-03-06 | - | Archived Journey v2 changelog |
| [docs/archive/Journey_v2_FinalReview.md](archive/Journey_v2_FinalReview.md) | C | archived | 2026-03-06 | - | Archived Journey v2 final review |
| [docs/archive/Journey_v2_Implementation_Prompt.md](archive/Journey_v2_Implementation_Prompt.md) | E | archived | 2026-03-06 | - | Archived Journey v2 implementation prompt |
| [docs/archive/Journey_v2_ImplementationPlan.md](archive/Journey_v2_ImplementationPlan.md) | B | archived | 2026-03-06 | - | Archived Journey v2 implementation plan |
| [docs/archive/LIBRARY_MASTER_IMPLEMENTATION.md](archive/LIBRARY_MASTER_IMPLEMENTATION.md) | B | archived | 2026-01-01 | - | Archived library master implementation plan |
| [docs/archive/MEDIA_DOMAIN_COMPLETE.md](archive/MEDIA_DOMAIN_COMPLETE.md) | B | archived | 2025-12-10 | - | Archived media domain completion notes |
| [docs/archive/MEDIA_DOMAIN_QUICKSTART.md](archive/MEDIA_DOMAIN_QUICKSTART.md) | B | archived | 2025-12-10 | - | Archived media domain quickstart |
| [docs/archive/MIGRATION_MANUAL_GUIDE.md](archive/MIGRATION_MANUAL_GUIDE.md) | B | archived | 2025-11-30 | - | Archived manual migration guide |
| [docs/archive/MIGRATIONS_QUICK_START.md](archive/MIGRATIONS_QUICK_START.md) | B | archived | 2025-11-29 | - | Archived migrations quick start |
| [docs/archive/notifications-architecture.md](archive/notifications-architecture.md) | B | archived | 2026-03-16 | - | Archived notifications architecture draft |
| [docs/archive/notifications-e2e-audit.md](archive/notifications-e2e-audit.md) | C | archived | 2026-03-16 | - | Archived notifications end-to-end audit |
| [docs/archive/notifications-implementation-plan.md](archive/notifications-implementation-plan.md) | B | archived | 2026-03-16 | - | Archived notifications implementation plan |
| [docs/archive/PERSONAL_LICENSE_IMPLEMENTATION.md](archive/PERSONAL_LICENSE_IMPLEMENTATION.md) | B | archived | 2026-01-30 | - | Archived personal license implementation notes |
| [docs/archive/PROJECT_COMPLETION_SUMMARY.md](archive/PROJECT_COMPLETION_SUMMARY.md) | C | archived | 2025-11-30 | - | Archived project completion summary |
| [docs/archive/PROJECT_STATUSRAPPORT_PLAY_DEL6.md](archive/PROJECT_STATUSRAPPORT_PLAY_DEL6.md) | C | archived | 2025-12-20 | - | Archived play status report snapshot |
| [docs/archive/PROMPT_FOR_NEW_AI.md](archive/PROMPT_FOR_NEW_AI.md) | E | archived | 2025-12-08 | - | Archived new-AI onboarding prompt |
| [docs/archive/QUICK_SOLUTION.md](archive/QUICK_SOLUTION.md) | B | archived | 2025-11-30 | - | Archived quick migration solution note |
| [docs/archive/README.md](archive/README.md) | A | active | 2025-12-18 | - | Archive sub-index and handling rules |
| [docs/archive/summary.claude.md](archive/summary.claude.md) | E | archived | 2026-01-17 | - | Archived Claude-generated process summary |
| [docs/archive/summary.md](archive/summary.md) | C | archived | 2026-01-17 | - | Archived inventory process summary |
| [docs/legal/archive/COOKIE_CONSENT_CURRENT_STATE.md](legal/archive/COOKIE_CONSENT_CURRENT_STATE.md) | C | historical snapshot | 2026-01-15 | - | Cookie consent current-state analysis |
| [docs/DEVELOPER_SETUP.md](DEVELOPER_SETUP.md) | A | active | 2026-03-15 | - | Developer setup and environment model |
| [docs/I18N_GUIDE.md](I18N_GUIDE.md) | A | active | 2026-03-21 | Frontend | Internationalization guide |
| [docs/I18N_MIGRATION_PLAN.md](I18N_MIGRATION_PLAN.md) | B | historical snapshot | 2026-01-11 | - | i18n migration status snapshot |
| [docs/VS_CODE_WORKFLOW.md](VS_CODE_WORKFLOW.md) | A | active | 2026-03-21 | Workflow | Session workflow |
