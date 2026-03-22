# Documentation Cleanup Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed audit of markdown sprawl and archive candidates across the repository. Treat this as the bounded audit snapshot behind the documentation cleanup work.

> **Date:** 2026-03-13  
> **Author:** Claude Opus 4.6 (automated analysis)  
> **Purpose:** Identify outdated, duplicated, and obsolete markdown files across the repository.  
> **Method:** File inventory via `Get-ChildItem`, header reading via `read_file`, category assignment based on content age, completion status, and reference chain analysis.

---

## Executive Summary

| Location | Files | Size | Status |
|----------|-------|------|--------|
| Root `/` | 70 .md | ~1.1 MB | 30 safe to archive, 30 additional archive candidates |
| `launch-readiness/` | 40 .md | ~750 KB | ✅ Canonical — all actively used |
| `docs/` | 262 .md | ~4.6 MB | ~150 are pre-launch domain docs, most outdated |
| **Total** | **397 .md** | **~6.5 MB** | ~180 archivable, ~50 need review |

**Core problem:** The repo accumulated markdown files across multiple AI-assisted development cycles. Each AI session generated execution briefs, implementation plans, audit reports, and prompts that were never cleaned up. The canonical launch-readiness documentation (40 files) is well-maintained, but root and docs/ contain significant debt.

> **⚠️ Verification requirement (GPT-calibrated):** No file should be deleted without first passing the **backlink/grep verification checklist:**
> 1. Not referenced from `README.md`, `PROJECT_CONTEXT.md`, launch-readiness docs, or `copilot-instructions.md`
> 2. Not imported/referenced from any script or config file
> 3. Not the current SSoT for any active domain
> 4. Clearly superseded by another file (named or identified)
> 5. Not an active work-in-progress document
>
> Files that fail any criterion must be reviewed before removal. Default action is **archive** (move to `docs/archive/`), not delete.

---

## Safe to Archive

These files have **no ongoing value** — they are completed execution briefs, one-time prompts, superseded versions, or exact duplicates. Recommended action: move to `docs/archive/` (or delete after passing the backlink/grep verification checklist above).

### Root-level (30 files)

| File | Reason | Size |
|------|--------|------|
| `BLOCK_1_EXECUTION_BRIEF.md` | Completed GameDetails execution brief | 13.3 KB |
| `BLOCK_1_VERIFICATION_CHECKLIST.md` | Completed checklist | 3.4 KB |
| `BLOCK_2_EXECUTION_BRIEF.md` | Completed execution brief | 14.9 KB |
| `BLOCK_3_EXECUTION_BRIEF.md` | Completed execution brief | 20.4 KB |
| `EXECUTE_MIGRATIONS_NOW.md` | One-time migration paste guide | 4.8 KB |
| `MIGRATIONS_QUICK_START.md` | One-time migration guide | 3.2 KB |
| `MIGRATION_MANUAL_GUIDE.md` | Hopelessly outdated (3/14 tracked) | 3.7 KB |
| `QUICK_SOLUTION.md` | One-time migration paste guide | 1.0 KB |
| `AUTOMATED_MIGRATION_OPTION_B.md` | One-time PowerShell migration script | 6.3 KB |
| `MEDIA_DOMAIN_COMPLETE.md` | Completed report (Dec 2024) | 12.7 KB |
| `MEDIA_DOMAIN_QUICKSTART.md` | One-time migration guide | 3.6 KB |
| `CLEANUP_MASTER_PROMPT.md` | One-shot AI prompt (Jan 2026) | 12.4 KB |
| `CODEX_TENANT_CONSOLIDATION_PROMPT.md` | One-shot AI prompt | 7.7 KB |
| `Journey_v2_Implementation_Prompt.md` | One-shot AI prompt | 9.4 KB |
| `Journey_v2_FinalReview.md` | Completed pre-implementation review | 18.0 KB |
| `GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md` | Superseded by v2.0 | 24.2 KB |
| `GAMEDETAILS_CONTEXT_AUDIT.v1.md` | Superseded by v2.0 | 28.5 KB |
| `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md` | Superseded by v2.0 | 18.1 KB |
| `IMPLEMENTATION_GUIDE.md` | **Exact duplicate** of `PLAY_IMPLEMENTATION_GUIDE_P0.md` | 7.8 KB |
| `GAMECARD_UNIFIED_IMPLEMENTATION.md` | Completed ("✅ KOMPLETT") | 32.6 KB |
| `ATLAS_EVOLUTION_IMPLEMENTATION.md` | Completed ("✅ Backlog-funktioner implementerade") | 29.9 KB |
| `PERSONAL_LICENSE_IMPLEMENTATION.md` | Completed ("✅ Klart") | 12.7 KB |
| `PLAY_MODE_UI_AUDIT.md` | Completed ("✅ IMPLEMENTERAD v2.7") | 43.4 KB |
| `PROJECT_COMPLETION_SUMMARY.md` | MVP completion report (Nov 2025) | 10.0 KB |
| `PROJECT_STATUSRAPPORT_PLAY_DEL6.md` | Ancient Play changelog (Dec 2025) | 4.4 KB |
| `commands.claude.md` | Inventory process artifact | 9.6 KB |
| `commands.md` | Inventory process artifact | 1.0 KB |
| `disputes.md` | Dual-agent QA dispute log | 9.4 KB |
| `summary.claude.md` | Superseded by `summary.md` | 8.3 KB |
| `ARTIFACT_UI_IMPLEMENTATION_BRIEF.md` | Completed execution brief | 23.3 KB |

**Total archivable from root: ~400 KB**

### docs/ — safe to archive after backlink/grep verification

Based on naming patterns and known completion status, the following categories in `docs/` are likely safe to archive (or delete after passing the verification checklist):

| Pattern | Count (est.) | Examples | Reason |
|---------|--------------|----------|--------|
| `IMPLEMENTATION_LOG_*.md` | 8 | `IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md` etc. | Completed implementation logs |
| `*_TODO.md` | 7 | `DOMAIN_GAMES_TODO.md`, `DESIGN_IMPLEMENTATION_TODO.md` | Old todo lists |
| `*_TEST_PLAN.md` files (pre-audit-program) | 6 | `ADMIN_USERS_TEST_PLAN.md`, `LEARNING_TEST_PLAN.md` | Superseded by launch-readiness audits |
| `TASK_*.md` | 2 | `TASK_9_LIVE_PROGRESS.md`, `TASK_11_12_TOKEN_SESSION_MANAGEMENT.md` | Completed tasks |
| `PHASE2_PREFLIGHT_*.md` | 1 | `PHASE2_PREFLIGHT_ADMIN_TENANT.md` | Completed preflight |
| `ARCH_ANALYSIS_*_PHASE0.md` | 4 | `ARCH_ANALYSIS_LEARNING_ADMIN_PHASE0.md` etc. | Completed architectural analyses |
| `*_PROMPT*.md` | 3 | `PERFORMANCE_ADVISOR_PROMPT.md`, `VERIFICATION_PROMPT.md`, `MASTERPROMPT_DEMO_IMPLEMENTATION.md` | One-shot AI prompts |
| `HANDOVER_2024-12-07.md` | 1 | — | Ancient handover doc |
| Validation reports | 4 | `PLATFORM_DOMAIN_VALIDATION_REPORT.md` etc. | Point-in-time validation |
| `*_CURRENT_STATE*.md` | 3 | `COOKIE_CONSENT_CURRENT_STATE.md`, `MFA_CURRENT_STATE_ANALYSIS.md`, `USER_PROFILE_CURRENT_STATE_ANALYSIS.md` | Outdated state snapshots |

**Estimated archivable from docs/: ~100-130 files**

### docs/ subdirectories — bulk assessable

| Subdirectory | Files | Assessment |
|--------------|-------|------------|
| `docs/prompts/` | 4 | **Safe to archive** — one-shot AI prompts |
| `docs/reports/` | 18 | **Mostly archivable** — point-in-time reports |
| `docs/validation/` | 6 | **Archive candidate** — validation artifacts |
| `docs/templates/` | 4 | **Keep** — reusable templates |
| `docs/ops/` | 6 | **Keep** — operational docs still relevant |
| `docs/legal/` | 2 | **Keep** — legal/GDPR docs |
| `docs/gdpr/` | 1 | **Keep** — DPA template |
| `docs/auth/` | 6 | **Needs review** — some may be superseded by launch audits |
| `docs/builder/` | 15 | **Needs review** — mix of active specs and old plans |
| `docs/gamification/` | 13 | **Needs review** — mix of shipped v2 docs and old plans |
| `docs/play/` | 3 | **Needs review** — verify against launch-readiness play-audit |
| `docs/admin/` | 4 | **Needs review** — verify against atlas-admin-audit |
| `docs/sandbox/` | 2 | **Needs review** — verify against atlas-admin-audit |
| `docs/toolkit/` | 6 | **Needs review** — tools/coach implementation docs |
| `docs/plans/` | 2 | **Needs review** — profile/product plans |
| `docs/examples/` | 1 | **Keep** — example data |
| `docs/import/` | 1 | **Keep** — import reference |
| `docs/qa/` | 1 | **Keep** — QA reference |

---

## Needs Update

These files are still relevant but contain **stale content**.

| File | Issue | Recommended action |
|------|-------|-------------------|
| `README.md` | Default `create-next-app` boilerplate | Rewrite to reflect Lekbanken: tech stack, setup instructions, env config |
| `i18n-audit.md` (root) | Audit data from last scan | Re-run `scripts/i18n-audit.mjs` and update |
| `LIBRARY_MASTER_IMPLEMENTATION.md` | Status says "IN PROGRESS" | Verify completion status; update or archive |
| `docs/ENVIRONMENT_VARIABLES.md` | May not reflect current env setup | Verify against `.env.local.example` |
| `docs/MIGRATIONS.md` | Migration guide | Verify against current 304-migration state |
| `docs/README.md` | docs/ index | Update to reflect current structure |
| `docs/DOCS_INDEX.md` | docs/ index | Redundant with `docs/README.md` — consolidate |
| `docs/I18N_GUIDE.md` | i18n guide | Verify against current next-intl setup |
| `docs/billing/STRIPE.md` | Stripe integration guide | Verify against billing-audit findings |
| `docs/AI_CODING_GUIDELINES.md` | AI coding conventions | Verify; may be superseded by `.github/copilot-instructions.md` |

---

## Canonical Docs — Do NOT delete

### Launch Readiness (SSoT for AI agents — 40 files)

All files in `launch-readiness/` are canonical and actively maintained:

| Category | Files | Purpose |
|----------|-------|---------|
| Control files | 5 | `launch-control.md`, `launch-readiness-*.md`, `launch-snapshot-2026-03.md` |
| Domain architecture | 3 | `play-architecture.md`, `sessions-architecture.md`, `scaling-analysis.md` |
| Incident playbook | 1 | `incident-playbook.md` |
| Domain audits | 23 | `audits/*.md` — one per audit |
| Implementation specs | 7 | `implementation/*.md` — remediation plans, DD specs |
| **This file** | 1 | `system-verification-2026.md` |

### Root-level canonical

| File | Purpose | Referenced by |
|------|---------|---------------|
| `PROJECT_CONTEXT.md` | Product context for AI agents | `copilot-instructions.md` |
| `planner-architecture.md` | Planner system design | `copilot-instructions.md` |
| `planner-audit.md` | Planner risk/status | `copilot-instructions.md` |
| `planner-implementation-plan.md` | Planner roadmap | `copilot-instructions.md` |
| `PLAY_UI_CONTRACT.md` | Enforced play UI contract | Guardrail tests (39j–39q) |
| `PARTICIPANT_PLAY_UI_LAWS.md` | Participant mobile layout contract | Code references |
| `play/signals/SIGNALS_SPEC.md` | Signals system architecture | Code implementation |

### Config/infrastructure (not markdown but related)

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | AI agent instructions |
| `eslint.config.mjs` | Linting config |
| `playwright.config.ts` | E2E test config |
| `vitest.config.ts` | Unit test config |
| `vercel.json` | Deployment config |
| `next.config.ts` | App config |

---

## Conflicting Docs

Files that describe the **same topic** with potentially conflicting information:

| Topic | Files | Conflict |
|-------|-------|----------|
| Docs index | `docs/README.md` + `docs/DOCS_INDEX.md` | Two index files |
| AI guidelines | `docs/AI_CODING_GUIDELINES.md` + `.github/copilot-instructions.md` | Potential divergence |
| Planner domain | `docs/PLANNER_DOMAIN.md` + root `planner-architecture.md` + `docs/PLANNER_TARGET_ARCHITECTURE.md` + `docs/PLANNER_REFACTOR_IMPLEMENTATION.md` + `docs/PLANNER_ANALYSIS_REPORT.md` + `docs/PLANNER_IA_RULES.md` + `docs/PLANNER_IMPROVEMENT_TODO.md` + `docs/PLANNER_INVENTORY_GAP_ANALYSIS.md` + `docs/PLANNER_UI_UPGRADE_PLAN.md` + `docs/admin/ADMIN_PLANNER_MASTER_IMPLEMENTATION.md` | **10 planner docs** across root + docs/ |
| Play domain | `docs/PLAY_DOMAIN.md` + root `PLAY_SYSTEM_DOCUMENTATION.md` + `launch-readiness/play-architecture.md` | 3+ play architecture docs |
| Auth system | `docs/AUTH_*.md` (4 files) + `launch-readiness/audits/security-auth-audit.md` | Pre-audit vs post-audit auth docs |
| Migration docs | root `MIGRATION_MANUAL_GUIDE.md` + `MIGRATIONS_QUICK_START.md` + `EXECUTE_MIGRATIONS_NOW.md` + `AUTOMATED_MIGRATION_OPTION_B.md` + `docs/MIGRATIONS.md` | **5 migration docs**, all different |
| Game builder | `docs/builder/*.md` (15 files) + `docs/GAME_BUILDER_*.md` (4 files) | 19 builder-related docs |
| Gamification/Journey | root Journey_v2_*.md (5 files) + root journey-activation-*.md (3 files) + `docs/gamification/*.md` (13 files) + root `GAMIFICATION_JOURNEY_AUDIT.md` | **22 gamification docs** |

---

## Recommended Cleanup Strategy

### Phase 1 — Quick wins (low risk, after verification)

1. **Create `docs/archive/` directory**
2. **Run backlink/grep verification** on 30 root-level archivable files (verify no active references)
3. **Move verified files to `docs/archive/`** — or delete after explicit confirmation
4. **Move `docs/prompts/`** → `docs/archive/prompts/` — 4 one-shot AI prompt files
5. **Move `docs/reports/`** → `docs/archive/reports/` — 18 point-in-time reports

**Impact:** -52 active files, ~500 KB moved out of active tree, reduces AI context noise significantly. All files remain accessible in archive for reference.

### Phase 2 — Consolidation (requires review)

1. **Merge `docs/DOCS_INDEX.md` into `docs/README.md`**
2. **Planner docs:** Keep only root `planner-architecture.md`, `planner-audit.md`, `planner-implementation-plan.md`. Archive all `docs/PLANNER_*.md`.
3. **Auth docs:** Archive `docs/AUTH_*.md` — superseded by `launch-readiness/audits/security-auth-audit.md`
4. **Migration docs:** Archive all root migration guides, update `docs/MIGRATIONS.md` as single source

### Phase 3 — Deep cleanup (requires domain knowledge)

1. **Review each `docs/` subdirectory** against launch-readiness audits
2. **Builder docs (19 files)** — consolidate into 2-3 canonical docs
3. **Gamification docs (22 files)** — consolidate into launch-readiness audit + architecture
4. **`docs/*_DOMAIN.md` files** — verify which are still accurate domain references

### Phase 4 — README and onboarding

1. **Rewrite `README.md`** — real project setup, env config, dev workflow
2. **Create `CONTRIBUTING.md`** — developer onboarding  
3. **Update `docs/README.md`** — accurate index of remaining docs

---

## Metrics After Full Cleanup (estimated)

| Metric | Before | After (estimated) |
|--------|--------|-------------------|
| Total .md files | 397 | ~120-150 |
| Total .md size | 6.5 MB | ~2.5 MB |
| Root .md files | 70 | ~12 |
| docs/ .md files | 262 | ~70-100 |
| launch-readiness/ | 40 | 42 (2 new files from this analysis) |
| Conflicting doc sets | 7+ | 0 |
