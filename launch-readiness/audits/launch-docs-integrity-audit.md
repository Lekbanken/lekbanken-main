# Launch Documentation Integrity Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-15
- Last updated: 2026-03-23
- Last validated: 2026-03-23

> Closed audit of the launch-readiness documentation layer. Treat this as the bounded audit snapshot behind the ongoing documentation cleanup work.

> **Date:** 2026-03-15  
> **Author:** Claude Opus 4.6 (automated analysis)  
> **Purpose:** Audit the documentation layer itself. Identify obsolete, duplicated, and missing documentation. Determine which files are SSoT, which should be archived, and which are missing.  
> **Method:** File inventory, content analysis, cross-reference verification against `audits/documentation-cleanup-audit.md` (2026-03-13), codebase verification.

---

## 1. Documentation Inventory Summary

| Location | Total .md files | Active/SSoT | Archivable | Needs review |
|----------|----------------|-------------|------------|--------------|
| Root `/` | ~70 | ~35 | ~30 | ~5 |
| `launch-readiness/` | 25 | 25 | 0 | 0 |
| `launch-readiness/audits/` | 36 | 36 | 0 | 0 |
| `launch-readiness/implementation/` | 11 | 11 | 0 | 0 |
| `docs/` | ~261 | ~111 | ~130 | ~20 |
| `docs/ops/` | 7 | 7 | 0 | 0 |
| **Total** | **~398** | **~226** | **~160** | **~25** |

---

## 2. SSoT Document Map

### Tier 1 — Program Control (must remain accurate)

| Document | Location | Purpose | Status | Last verified accurate |
|----------|----------|---------|--------|----------------------|
| `launch-control.md` | `launch-readiness/` | Master program tracker | ✅ Current after 2026-03-23 final Tier 1 sync | 2026-03-23 |
| `launch-readiness-implementation-plan.md` | `launch-readiness/` | Phase roadmap | ✅ Current after 2026-03-23 baseline/docs sync | 2026-03-23 |
| `launch-readiness-audit-program.md` | `launch-readiness/audits/` | Audit methodology | ✅ Stable | 2026-03-14 (Level 2 methodology added) |
| `launch-readiness-architecture.md` | `launch-readiness/` | Environment/test/deploy strategy | ✅ Current after 2026-03-23 environment/ops sync | 2026-03-23 |
| `launch-snapshot-2026-03.md` | `launch-readiness/` | Frozen system state at launch | ✅ Intentionally frozen | 2026-03-12 |
| `launch-telemetry-pack.md` | `launch-readiness/` | Observability signals + alerts | ✅ Current | 2026-03-14 |

**Issues found:**

| Issue | Document | Detail | Severity |
|-------|----------|--------|----------|
| ~~Stale wrapper coverage~~ | `launch-control.md` | ✅ **Resolved 2026-03-23** — active launch-control status surfaces now align with the verified 253/288 file and 369/410 handler coverage baseline. | Closed |
| ~~Phase 5 labeled "Deferred"~~ | `implementation-plan.md` | ✅ **Resolved 2026-03-23** — plan now reflects completed regression phase. | Closed |
| ~~Phase 2 labeled "Skipped"~~ | `implementation-plan.md` | ✅ **Resolved 2026-03-23** — plan now describes verified baseline with systematic coverage still deferred. | Closed |
| ~~Phase 1B items unchecked~~ | `implementation-plan.md` | ✅ **Resolved 2026-03-15** — sub-items were already synced to the implemented sandbox track. | Closed |
| ~~Phase 7 gate criteria unchecked~~ | `implementation-plan.md` | ✅ **Reduced 2026-03-23** — verdict/checklist relationship is now explained explicitly and high-confidence checks are marked. | Closed |
| ~~§6 "Observability: Okänt"~~ | `architecture.md` | ✅ **Resolved 2026-03-23** — operations and telemetry references are explicit and current. | Closed |
| ~~§2 "dev pekar mot prod"~~ | `architecture.md` | ✅ **Resolved 2026-03-23** — architecture now states the verified environment model: local Docker for development, sandbox via preview env vars, explicit guarded prod pushes only. | Closed |

### Tier 2 — Domain Architecture (should be accurate)

| Document | Location | Purpose | Status |
|----------|----------|---------|--------|
| `play-architecture.md` | `launch-readiness/` | Play system architecture | ✅ Current |
| `sessions-architecture.md` | `launch-readiness/` | Sessions architecture | ✅ Current |
| `scaling-analysis.md` | `launch-readiness/audits/` | Bottleneck analysis + 90-day plan | ✅ Historical reference |
| `incident-playbook.md` | `launch-readiness/` | Incident response procedures | ✅ Current |
| `enterprise-isolation-architecture.md` | `launch-readiness/` | Enterprise isolation design study | ✅ Current (design-only) |
| `enterprise-isolation-audit.md` | `launch-readiness/` | Enterprise isolation readiness audit | ✅ Current (design-set audit) |
| `enterprise-isolation-implementation-plan.md` | `launch-readiness/` | Enterprise isolation future-readiness roadmap | ✅ Current (triggered by enterprise need) |
| `PROJECT_CONTEXT.md` | Root | Product overview | ✅ Current |
| `planner-architecture.md` | Root | Planner system design | ✅ Current (per copilot-instructions.md) |
| `planner-audit.md` | Root | Planner current status | ⚠️ Possibly duplicates `audits/planner-launch-audit.md` |
| `planner-implementation-plan.md` | Root | Planner roadmap | ✅ Current (per copilot-instructions.md) |

**Root planner docs note:** `copilot-instructions.md` designates root-level `planner-architecture.md`, `planner-audit.md`, and `planner-implementation-plan.md` as SSoT for Planner domain work. These are separate from the launch-readiness audit file (`audits/planner-launch-audit.md`). Both are valid — root docs are for Planner development, audit docs are for launch program.

**Launch root note:** Remaining root documents in `launch-readiness/` are no longer treated as generic overflow. After the March 2026 cleanup waves, the root is intentionally reserved for active control docs, stable architecture references, and still-live strategic workstreams such as `platform-operations-*` and `enterprise-isolation-*`. Historical verification snapshots and superseded execution records should continue to move into `audits/` or `implementation/` when safe.

### Tier 3 — Operational Docs (should exist and be current)

| Document | Location | Purpose | Status |
|----------|----------|---------|--------|
| `next-execution-plan.md` | `launch-readiness/` | Active post-launch execution roadmap | ✅ Current |
| `platform-operations-architecture.md` | `launch-readiness/` | Operations and environment topology study | ✅ Current (active workstream) |
| `platform-operations-audit.md` | `launch-readiness/` | Operational-readiness audit | ✅ Current |
| `platform-operations-implementation-plan.md` | `launch-readiness/` | Operations maturity roadmap | ✅ Current |
| `production-signals-dashboard.md` | `docs/ops/` | Signal query reference | ✅ Exists |
| `anomaly-detection-playbook.md` | `docs/ops/` | Alert response procedures | ✅ Exists |
| `day-1-operations-runbook.md` | `docs/ops/` | Unified launch-day operations entrypoint | ✅ Added 2026-03-23 |
| `first-deploy-runbook.md` | `docs/ops/` | First deploy procedures | ✅ Exists |
| `DEVELOPER_SETUP.md` | `docs/toolkit/developer-guide/` | Developer onboarding | ✅ Current (MFA section added 2026-03-15) |
| `ENVIRONMENT_VARIABLES.md` | `docs/` | Env var documentation | ✅ Verified against `.env.local.example` and `lib/config/env.ts` (2026-03-23) |
| `README.md` | Root | Project README | ✅ Current launch routing added 2026-03-22 |

---

## 3. Obsolete Files — Root Level

These 30 root-level files have been confirmed as safe to archive by both `documentation-cleanup-audit.md` (2026-03-13) and this audit. They are completed work products, superseded versions, one-shot prompts, or duplicates.

Migration guide filenames listed below were part of the original root-level audit set and now live under `docs/archive/` in the current repository layout.

| # | File | Type | Reason archivable | Size |
|---|------|------|--------------------|------|
| 1 | `BLOCK_1_EXECUTION_BRIEF.md` | Execution brief | ✅ Completed | 13 KB |
| 2 | `BLOCK_1_VERIFICATION_CHECKLIST.md` | Checklist | ✅ Completed | 3 KB |
| 3 | `BLOCK_2_EXECUTION_BRIEF.md` | Execution brief | ✅ Completed | 15 KB |
| 4 | `BLOCK_3_EXECUTION_BRIEF.md` | Execution brief | ✅ Completed | 20 KB |
| 5 | `EXECUTE_MIGRATIONS_NOW.md` | One-time guide | ✅ Completed | 5 KB |
| 6 | `MIGRATIONS_QUICK_START.md` | One-time guide | ✅ Completed | 3 KB |
| 7 | `MIGRATION_MANUAL_GUIDE.md` | Guide | Outdated (tracks 3/14 migrations) | 4 KB |
| 8 | `QUICK_SOLUTION.md` | One-time paste | ✅ Completed | 1 KB |
| 9 | `AUTOMATED_MIGRATION_OPTION_B.md` | PowerShell script | ✅ Completed | 6 KB |
| 10 | `MEDIA_DOMAIN_COMPLETE.md` | Completion report | ✅ Completed (Dec 2025) | 13 KB |
| 11 | `MEDIA_DOMAIN_QUICKSTART.md` | One-time guide | ✅ Completed | 4 KB |
| 12 | `CLEANUP_MASTER_PROMPT.md` | AI prompt | One-shot (Jan 2026) | 12 KB |
| 13 | `CODEX_TENANT_CONSOLIDATION_PROMPT.md` | AI prompt | One-shot | 8 KB |
| 14 | `Journey_v2_Implementation_Prompt.md` | AI prompt | One-shot | 9 KB |
| 15 | `Journey_v2_FinalReview.md` | Review | ✅ Completed | 18 KB |
| 16 | `GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md` | v1 file | Superseded by v2 | 25 KB |
| 17 | `GAMEDETAILS_CONTEXT_AUDIT.v1.md` | v1 file | Superseded by v2 | 29 KB |
| 18 | `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md` | v1 file | Superseded by v2 | 19 KB |
| 19 | `IMPLEMENTATION_GUIDE.md` | Duplicate | Exact duplicate of `PLAY_IMPLEMENTATION_GUIDE_P0.md` | 8 KB |
| 20 | `GAMECARD_UNIFIED_IMPLEMENTATION.md` | Implementation | ✅ Completed ("✅ KOMPLETT") | 33 KB |
| 21 | `ATLAS_EVOLUTION_IMPLEMENTATION.md` | Implementation | ✅ Completed | 30 KB |
| 22 | `PERSONAL_LICENSE_IMPLEMENTATION.md` | Implementation | ✅ Completed ("✅ Klart") | 13 KB |
| 23 | `PLAY_MODE_UI_AUDIT.md` | Audit | ✅ Completed ("✅ IMPLEMENTERAD v2.7") | 43 KB |
| 24 | `PROJECT_COMPLETION_SUMMARY.md` | Report | MVP completion (Nov 2025) | 10 KB |
| 25 | `PROJECT_STATUSRAPPORT_PLAY_DEL6.md` | Changelog | Ancient (Dec 2025) | 4 KB |
| 26 | `commands.claude.md` | Artifact | Inventory process artifact | 10 KB |
| 27 | `commands.md` | Artifact | Inventory process artifact | 1 KB |
| 28 | `disputes.md` | Artifact | Dual-agent QA dispute log | 10 KB |
| 29 | `summary.claude.md` | Artifact | Superseded by `summary.md` | 8 KB |
| 30 | `ARTIFACT_UI_IMPLEMENTATION_BRIEF.md` | Execution brief | ✅ Completed | 23 KB |

**Total archivable from root: ~410 KB across 30 files.**

---

## 4. Obsolete Files — docs/ Level

### Safe to archive (high confidence)

| Category | Files | Count | Combined size (est.) |
|----------|-------|-------|---------------------|
| `IMPLEMENTATION_LOG_*.md` | Achievement phases 1-4, learning phase 2, play artifacts, admin tenant proxy, admin tenant | 8 | ~100 KB |
| `*_TODO.md` | Games, planner, tenant, design, auth implementation, design consistency, security audit | 7 | ~50 KB |
| `*_TEST_PLAN.md` | Admin users, admin organisations, admin products, admin gamification, learning, custom domains | 6 | ~40 KB |
| `ARCH_ANALYSIS_*_PHASE0.md` | Learning admin, shop rewards, support tickets, translation | 4 | ~30 KB |
| `*_CURRENT_STATE*.md` | Cookie consent, MFA, user profile | 3 | ~25 KB |
| `TASK_*.md` | Task 9 live progress, Task 11/12 token session | 2 | ~15 KB |
| `PHASE2_PREFLIGHT_*.md` | Admin tenant | 1 | ~5 KB |
| `docs/prompts/` | All 4 files (one-shot AI prompts) | 4 | ~20 KB |
| `HANDOVER_2024-12-07.md` | Ancient handover | 1 | ~5 KB |
| Point-in-time reports | Various validation reports, current-state analyses | ~10 | ~80 KB |

**Total safe to archive from docs/: ~46 files, ~370 KB**

### Needs review before archiving

| File | Why review needed |
|------|------------------|
| `MFA_IMPLEMENTATION_PLAN.md` | May be active SSoT for MFA — check if referenced from code or copilot-instructions |
| `MFA_TECHNICAL_SPEC.md` | Same — verify if still authoritative |
| `MFA_SECURITY.md` | Same |
| `STRIPE.md` | May contain active integration notes |
| `content/I18N_GUIDE.md` | May be referenced by developers |
| `content/I18N_MIGRATION_PLAN.md` | May be active migration plan |
| `legal/archive/SVENSKA_KYRKAN_COMPLIANCE_AUDIT.md` | Business-critical — verify if still needed for kyrkan partnership |
| `legal/SVENSKA_KYRKAN_ONBOARDING.md` | Same |
| Various `*_DOMAIN.md` files (15+) | Domain docs — some may still be active architecture references |

---

## 5. Duplicate / Overlapping Documentation

| File A | File B | Overlap | Recommendation |
|--------|--------|---------|---------------|
| `IMPLEMENTATION_GUIDE.md` (root) | `PLAY_IMPLEMENTATION_GUIDE_P0.md` (root) | **Exact duplicate** | Archive `IMPLEMENTATION_GUIDE.md` |
| `GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md` | `GAMEDETAILS_CONTEXT_ARCHITECTURE.md` | v1 superseded by v2 | Archive v1 |
| `GAMEDETAILS_CONTEXT_AUDIT.v1.md` | `GAMEDETAILS_CONTEXT_AUDIT.md` | v1 superseded by v2 | Archive v1 |
| `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md` | `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md` | v1 superseded by v2 | Archive v1 |
| `summary.claude.md` | `summary.md` | Agent artifact superseded by final | Archive `.claude.md` |
| `GAMIFICATION_JOURNEY_AUDIT.md` (root) | `audits/journey-audit.md` (launch-readiness) | Old audit predates launch program | Archive root version |
| `PARTICIPANT_PLAY_AUDIT.md` (root) | `audits/play-audit.md` (launch-readiness) | Old audit predates launch program | Archive root version |
| `i18n-audit.md` (root, 504 KB!) | `audits/i18n-audit.md` (launch-readiness) | Root version is raw output; audit is GPT-calibrated | Archive root version |
| `planner-audit.md` (root) | `audits/planner-launch-audit.md` | Different scope (development vs launch) | **Keep both** — per copilot-instructions.md |
| `Journey_v2_*` files (6) | `audits/journey-audit.md` | v2 implementation docs | Review — may be archivable |
| `journey-activation-*` files (3) | Journey v2 files | Different scope? | Review — may overlap |
| `PLAY_SYSTEM_DOCUMENTATION.md` (root, 82 KB) | `play-architecture.md` (launch-readiness) | Root is comprehensive but may be outdated | Review — check if still referenced |
| Various `docs/*_DOMAIN.md` files (15+) | `audits/*.md` | Old domain docs vs launch audit docs | Most archivable — audits are now SSoT |

---

## 6. Missing Documentation

| Gap | Impact | Priority |
|-----|--------|----------|
| ~~No unified ops runbook~~ | ✅ **Resolved 2026-03-23** — `docs/ops/day-1-operations-runbook.md` now provides the missing top-level launch-day/first-week operations entry flow and links to deploy, signal, anomaly, and incident runbooks without inventing repo-invisible contact details. | Closed |
| ~~No deploy checklist~~ | ✅ **Resolved 2026-03-23** — `docs/ops/release-promotion-checklist.md` plus `docs/ops/first-deploy-runbook.md` now cover recurring promotion and first-deploy verification. | Closed |
| **No API reference** | 288 routes, no generated API docs. OpenAPI/Swagger not configured. | Low (post-launch) |
| **No architecture decision log** | ADRs scattered across launch-control.md §7 and various docs. No single `docs/adr/` directory. | Low |
| ~~No post-launch monitoring guide~~ | ✅ **Resolved 2026-03-23** — `docs/ops/production-signals-dashboard.md` defines daily/weekly review cadence and `docs/ops/anomaly-detection-playbook.md` documents escalation/triage. | Closed |
| ~~`README.md` outdated~~ | ✅ **Resolved 2026-03-23** — root README now routes to current launch, ops, database, and workflow entrypoints. | Closed |
| ~~`ENVIRONMENT_VARIABLES.md` unverified~~ | ✅ **Resolved 2026-03-23** — verified against `.env.local.example` and `lib/config/env.ts`; deployment identity and validation bypass rules are now documented. | Closed |

---

## 7. AI Memory Layer Assessment

### How markdown files function as AI memory

In Lekbanken, markdown files serve as AI agent memory. Each AI session reads these files to understand context, architecture, and decisions. This creates specific requirements:

1. **SSoT clarity** — agents must know which file is authoritative for which topic
2. **Low noise** — obsolete files pollute semantic search and cause agents to reference deleted components
3. **Freshness** — stale data causes agents to use wrong numbers, re-implement completed work, or miss decisions

### Current state

| Dimension | Score | Finding |
|-----------|-------|---------|
| SSoT clarity | 7/10 | `launch-readiness/` is well-organized. Root has 70 loose files with unclear authority. |
| Noise level | 3/10 | 397 markdown files. ~160 are archivable. Semantic search returns obsolete briefs and prompts. |
| Freshness | 8/10 | Core docs are current within days. Tier 1 launch drift is resolved; remaining gaps are lower-priority governance and archive noise. |
| Cross-referencing | 5/10 | Documents reference each other well within launch-readiness/. Root files rarely cross-reference. |
| Discoverability | 4/10 | No master index. `DOCS_INDEX.md` exists in docs/ but is likely outdated. |

### Recommendations for AI stability

1. **Archive 160+ obsolete files** — reduces semantic search noise by ~40%
2. **Fix SSoT document accuracy** — update stale numbers, phase labels, resolved findings
3. **Create `docs/DOCS_MAP.md`** — a brief map of what's where, for agent orientation (not a full index)
4. **Maintain `copilot-instructions.md`** — it's the primary agent onboarding file. Keep it accurate.

---

## 8. Files That Must Remain SSoT

These files are **never archivable** — they are the living memory of the system:

| File | Purpose | Update frequency |
|------|---------|-----------------|
| `launch-readiness/launch-control.md` | Master program tracker | Per change |
| `launch-readiness/launch-readiness-implementation-plan.md` | Phase roadmap | Per phase change |
| `launch-readiness/audits/launch-readiness-audit-program.md` | Audit methodology | Rarely (stable) |
| `launch-readiness/launch-readiness-architecture.md` | Environment/deploy strategy | Per env change |
| `launch-readiness/next-execution-plan.md` | Active post-launch roadmap | Per execution-cycle change |
| `launch-readiness/platform-operations-architecture.md` | Operations topology study | Per operating-model change |
| `launch-readiness/platform-operations-audit.md` | Operational readiness audit | Per ops gap or verification change |
| `launch-readiness/platform-operations-implementation-plan.md` | Operations roadmap | Per phase change |
| `launch-readiness/enterprise-isolation-architecture.md` | Enterprise topology design | On enterprise-model change |
| `launch-readiness/enterprise-isolation-audit.md` | Enterprise readiness audit | On enterprise-readiness reassessment |
| `launch-readiness/enterprise-isolation-implementation-plan.md` | Enterprise roadmap | On enterprise trigger or scope change |
| `launch-readiness/launch-snapshot-2026-03.md` | Frozen launch state | Never (frozen) |
| `launch-readiness/launch-telemetry-pack.md` | Observability signals | Per signal change |
| `launch-readiness/incident-playbook.md` | Incident response | Per incident |
| `launch-readiness/audits/scaling-analysis.md` | Bottleneck analysis | Per scaling change |
| `PROJECT_CONTEXT.md` | Product overview | Per product pivot |
| `.github/copilot-instructions.md` | Agent onboarding | Per convention change |
| `planner-architecture.md` | Planner design (root) | Per planner change |
| `planner-audit.md` | Planner status (root) | Per planner change |
| `planner-implementation-plan.md` | Planner roadmap (root) | Per planner change |
| `docs/toolkit/developer-guide/DEVELOPER_SETUP.md` | Dev onboarding | Per setup change |
| All 36 files in `launch-readiness/audits/` | Audit evidence | Rarely (reference) |
| All 11 files in `launch-readiness/implementation/` | Remediation evidence | Rarely (reference) |

---

## 9. Action Items

### Immediate (Step 1 of next-execution-plan.md)

- [ ] Fix wrapper coverage numbers in `launch-control.md` (247/287 → 252/288)
- [ ] Mark Phase 5 as ✅ in `implementation-plan.md`
- [ ] Mark Phase 2 as 🟡 "Partial" in `implementation-plan.md`
- [ ] Fix Phase 1B sub-items to reflect actual completion
- [ ] Update `launch-readiness-architecture.md` §6 (observability exists)

### Short-term (Step 2 of next-execution-plan.md)

- [ ] Create `docs/archive/` directory
- [ ] Move 30 root-level obsolete files to `docs/archive/`
- [ ] Move ~46 docs/ obsolete files to `docs/archive/`
- [ ] Verify backlinks before each batch (5-point checklist)
- [ ] Update `README.md` to reflect current dev setup

### Medium-term

- [ ] Review 25 files marked "needs review" (MFA docs, domain docs, kyrkan docs)
- [ ] Create `docs/DOCS_MAP.md` as agent orientation document
- [ ] Verify `ENVIRONMENT_VARIABLES.md` against current `.env.local.example`
- [ ] Consider consolidating root Journey/GameDetails docs if no longer actively referenced

---

## 10. Addendum — Tightened Archive Classification (post-GPT calibration)

> **Added:** 2026-03-15 (after GPT review round 2)  
> **Reason:** Original audit treated "archivable" as a single category. In an AI-agent-driven codebase, many markdown files function as semantic anchors. A more granular classification is required.

### Four-tier classification

| Tier | Meaning | Action |
|------|---------|--------|
| **A — Safe to archive now** | Definitively obsolete. No agent or developer references these. Completed one-shot work, exact duplicates, superseded versions. | Archive in Step 3 of `next-execution-plan.md` |
| **B — Probably archivable later** | Likely obsolete but not verified. Pattern-matched by naming convention, not content-read. May contain useful context. | Review individually after Observe Mode (Step 4-5). |
| **C — Keep until backlinks / agent workflows verified** | Redundant-but-useful. May function as semantic anchors for AI agents, or may be referenced by code or other docs. | Do NOT archive until agent workflows have been exercised against current doc set. |
| **D — Permanent SSoT** | Living memory of the system. Never archive. | Maintain accuracy. See §8. |

### Root-level files reclassified

Migration guide filenames in this reclassification table now resolve under `docs/archive/`; the filenames are retained here because this section records the original root-level audit result.

| # | File | Previous | Revised | Notes |
|---|------|----------|---------|-------|
| 1 | `BLOCK_1_EXECUTION_BRIEF.md` | Archivable | **A** | Completed brief |
| 2 | `BLOCK_1_VERIFICATION_CHECKLIST.md` | Archivable | **A** | Completed checklist |
| 3 | `BLOCK_2_EXECUTION_BRIEF.md` | Archivable | **A** | Completed brief |
| 4 | `BLOCK_3_EXECUTION_BRIEF.md` | Archivable | **A** | Completed brief |
| 5 | `EXECUTE_MIGRATIONS_NOW.md` | Archivable | **A** | One-time guide, done |
| 6 | `MIGRATIONS_QUICK_START.md` | Archivable | **A** | One-time guide, done |
| 7 | `MIGRATION_MANUAL_GUIDE.md` | Archivable | **A** | Outdated |
| 8 | `QUICK_SOLUTION.md` | Archivable | **A** | One-time paste |
| 9 | `AUTOMATED_MIGRATION_OPTION_B.md` | Archivable | **A** | Completed script |
| 10 | `CLEANUP_MASTER_PROMPT.md` | Archivable | **A** | One-shot AI prompt |
| 11 | `CODEX_TENANT_CONSOLIDATION_PROMPT.md` | Archivable | **A** | One-shot AI prompt |
| 12 | `Journey_v2_Implementation_Prompt.md` | Archivable | **A** | One-shot AI prompt |
| 13 | `GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md` | Archivable | **A** | Superseded by v2 |
| 14 | `GAMEDETAILS_CONTEXT_AUDIT.v1.md` | Archivable | **A** | Superseded by v2 |
| 15 | `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md` | Archivable | **A** | Superseded by v2 |
| 16 | `IMPLEMENTATION_GUIDE.md` | Archivable | **A** | Exact duplicate of P0 guide |
| 17 | `summary.claude.md` | Archivable | **A** | Superseded by `summary.md` |
| 18 | `commands.claude.md` | Archivable | **A** | Process artifact |
| 19 | `commands.md` | Archivable | **A** | Process artifact |
| 20 | `disputes.md` | Archivable | **A** | Process artifact |
| 21 | `PROJECT_STATUSRAPPORT_PLAY_DEL6.md` | Archivable | **A** | Ancient changelog |
| 22 | `MEDIA_DOMAIN_COMPLETE.md` | Archivable | **B** | Completed — but may contain useful media domain context |
| 23 | `MEDIA_DOMAIN_QUICKSTART.md` | Archivable | **A** | One-time guide |
| 24 | `Journey_v2_FinalReview.md` | Archivable | **B** | Completed review — may anchor Journey context |
| 25 | `GAMECARD_UNIFIED_IMPLEMENTATION.md` | Archivable | **C** | Completed ("✅ KOMPLETT") but large (33 KB). Verify no agent references before archiving. |
| 26 | `ATLAS_EVOLUTION_IMPLEMENTATION.md` | Archivable | **B** | Completed — may anchor Atlas context |
| 27 | `PERSONAL_LICENSE_IMPLEMENTATION.md` | Archivable | **B** | Completed ("✅ Klart") — verify no billing references |
| 28 | `PLAY_MODE_UI_AUDIT.md` | Archivable | **C** | Completed audit — but 43 KB of Play UI context. Verify no agent workflow uses. |
| 29 | `PROJECT_COMPLETION_SUMMARY.md` | Archivable | **B** | MVP completion report |
| 30 | `ARTIFACT_UI_IMPLEMENTATION_BRIEF.md` | Archivable | **A** | Completed brief |

**Summary:**
- **Tier A — Safe to archive now:** 22 files
- **Tier B — Probably archivable later:** 5 files
- **Tier C — Keep until verified:** 2 files
- **Tier D — Permanent SSoT:** 0 (these are listed in §8)

### docs/ files — tier classification

| Category | Tier | Count | Notes |
|----------|------|-------|-------|
| `IMPLEMENTATION_LOG_*.md` | **A** | 8 | Completed logs — no ongoing reference |
| `docs/prompts/` | **A** | 4 | One-shot AI prompts |
| `HANDOVER_2024-12-07.md` | **A** | 1 | Ancient |
| `*_TODO.md` | **B** | 7 | Probably obsolete — verify none are actively referenced |
| `*_TEST_PLAN.md` | **B** | 6 | Pre-launch test plans — verify no CI references |
| `ARCH_ANALYSIS_*_PHASE0.md` | **B** | 4 | Completed analyses — verify not referenced |
| `*_CURRENT_STATE*.md` | **B** | 3 | Point-in-time snapshots — verify no agent reads |
| `TASK_*.md` | **B** | 2 | Probably obsolete |
| `*_DOMAIN.md` files | **C** | ~15 | Domain docs — may be active architecture references for AI agents |
| `MFA_*.md` files | **C** | 3 | Recently created — likely still active SSoT |
| `STRIPE.md` | **C** | 1 | May contain active integration notes |
| `content/I18N_GUIDE.md` / `content/I18N_MIGRATION_PLAN.md` | **C** | 2 | May be referenced by developers |
| `SVENSKA_KYRKAN_*.md` | **C** | 2 | Business-critical — verify partnership status |

**docs/ summary:**
- **Tier A — Safe to archive now:** 13 files
- **Tier B — Probably archivable later:** 22 files
- **Tier C — Keep until verified:** ~23 files

### Grand total

| Tier | Root | docs/ | Total |
|------|------|-------|-------|
| **A — Safe to archive now** | 22 | 13 | **35** |
| **B — Probably archivable later** | 5 | 22 | **27** |
| **C — Keep until verified** | 2 | ~23 | **~25** |
| **D — Permanent SSoT** | (see §8) | (see §8) | **~65** |

**Only the 35 Tier A files should be archived in the immediate next step.** Tier B requires individual review after Observe Mode. Tier C must NOT be archived until agent workflows confirm they are not used as semantic anchors.

---

## 11. Execution Status — Tier A Batch 1 (2026-03-15)

> **Added:** 2026-03-15 (post-execution)  
> **Executed by:** Claude Opus 4.6 (Step 3 — Minimal Documentation Integrity Fixes)  
> **Calibrated by:** GPT (Step 3 approval + Step 3b follow-up)

### What was done

- **36 Tier A files archived** to `docs/archive/` (23 from root, 13 from `docs/`)
- **Total size archived:** ~352.5 KB
- **Empty directory removed:** `docs/prompts/` (all contents moved to archive)
- **Archive manifest created:** `docs/archive/ARCHIVE_MANIFEST.md` — records original path, reason, tier, and execution context for each file
- **Meta-index docs updated:** `docs/DOCS_INDEX.md` and `docs/INVENTORY.md` — stale entries marked as archived with `→ archive/` pointers

### What was NOT done (intentional)

- **Tier B files (5 root, ~22 docs/):** Not archived — require individual review after Observe Mode
- **Tier C files (2 root, ~23 docs/):** Not archived — must NOT be touched until agent workflows confirm they are not semantic anchors
- **Tier D (permanent SSoT):** Not touched — see §8

### Backlink verification

All 36 files passed the 5-point checklist before archiving:

1. ✅ Not referenced from README.md, PROJECT_CONTEXT.md, launch-readiness SSoT docs, or copilot-instructions.md
2. ✅ Not imported/referenced from any source code (.ts/.tsx/.js/.mjs)
3. ✅ Not current SSoT for any active domain
4. ✅ Clearly superseded, completed, or duplicated
5. ✅ Not active work-in-progress

### Post-archive verification

- `tsc --noEmit`: 0 errors
- No test suite breakage (markdown-only changes)

### Status update

~~*This audit is diagnostic. No files were modified or archived. All recommendations require backlink verification before execution.*~~

**This audit's Tier A recommendations have been executed.** Tier B/C remain as future work pending Observe Mode and agent workflow verification.

---

*Provenance for all archived files is maintained in `docs/archive/ARCHIVE_MANIFEST.md`.*
