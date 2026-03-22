# Archive Manifest

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-15
- Last updated: 2026-03-22
- Last validated: -

> Active provenance manifest for archived files. Use it to trace original location, archival reason, and move context for low-trust historical documents.

**Purpose:** Provenance record for archived files. Tracks original path, reason, tier classification, and execution context.

---

## Batch 1 — Tier A (Step 3, 2026-03-15)

**Executed by:** Claude Opus 4.6 (Step 3 — Minimal Documentation Integrity Fixes)  
**Authorized by:** GPT calibration loop (Step 3 approval)  
**Backlink verification:** 5-point checklist passed for all files (README.md, PROJECT_CONTEXT.md, copilot-instructions.md, source code, SSoT docs — no blocking references found)  
**Post-move verification:** `tsc --noEmit` = 0 errors  

### Root → docs/archive/ (23 files)

| # | File | Original path | Reason | Tier |
|---|------|---------------|--------|------|
| 1 | BLOCK_1_EXECUTION_BRIEF.md | `/BLOCK_1_EXECUTION_BRIEF.md` | Completed GameDetails execution brief | A |
| 2 | BLOCK_1_VERIFICATION_CHECKLIST.md | `/BLOCK_1_VERIFICATION_CHECKLIST.md` | Completed checklist | A |
| 3 | BLOCK_2_EXECUTION_BRIEF.md | `/BLOCK_2_EXECUTION_BRIEF.md` | Completed execution brief | A |
| 4 | BLOCK_3_EXECUTION_BRIEF.md | `/BLOCK_3_EXECUTION_BRIEF.md` | Completed execution brief | A |
| 5 | EXECUTE_MIGRATIONS_NOW.md | `/EXECUTE_MIGRATIONS_NOW.md` | One-time migration guide, done | A |
| 6 | MIGRATIONS_QUICK_START.md | `/MIGRATIONS_QUICK_START.md` | One-time migration guide, done | A |
| 7 | MIGRATION_MANUAL_GUIDE.md | `/MIGRATION_MANUAL_GUIDE.md` | Outdated (tracked 3/14 migrations) | A |
| 8 | QUICK_SOLUTION.md | `/QUICK_SOLUTION.md` | One-time migration paste | A |
| 9 | AUTOMATED_MIGRATION_OPTION_B.md | `/AUTOMATED_MIGRATION_OPTION_B.md` | Completed PowerShell migration script | A |
| 10 | CLEANUP_MASTER_PROMPT.md | `/CLEANUP_MASTER_PROMPT.md` | One-shot AI prompt (Jan 2026) | A |
| 11 | CODEX_TENANT_CONSOLIDATION_PROMPT.md | `/CODEX_TENANT_CONSOLIDATION_PROMPT.md` | One-shot AI prompt | A |
| 12 | Journey_v2_Implementation_Prompt.md | `/Journey_v2_Implementation_Prompt.md` | One-shot AI prompt | A |
| 13 | GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md | `/GAMEDETAILS_CONTEXT_ARCHITECTURE.v1.md` | Superseded by v2 | A |
| 14 | GAMEDETAILS_CONTEXT_AUDIT.v1.md | `/GAMEDETAILS_CONTEXT_AUDIT.v1.md` | Superseded by v2 | A |
| 15 | GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md | `/GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.v1.md` | Superseded by v2 | A |
| 16 | IMPLEMENTATION_GUIDE.md | `/IMPLEMENTATION_GUIDE.md` | Exact duplicate of `PLAY_IMPLEMENTATION_GUIDE_P0.md` | A |
| 17 | summary.claude.md | `/summary.claude.md` | Superseded by `summary.md` | A |
| 18 | commands.claude.md | `/commands.claude.md` | Inventory process artifact | A |
| 19 | commands.md | `/commands.md` | Inventory process artifact | A |
| 20 | disputes.md | `/disputes.md` | Dual-agent QA process artifact | A |
| 21 | PROJECT_STATUSRAPPORT_PLAY_DEL6.md | `/PROJECT_STATUSRAPPORT_PLAY_DEL6.md` | Ancient changelog (Dec 2025) | A |
| 22 | MEDIA_DOMAIN_QUICKSTART.md | `/MEDIA_DOMAIN_QUICKSTART.md` | One-time migration guide, done | A |
| 23 | ARTIFACT_UI_IMPLEMENTATION_BRIEF.md | `/ARTIFACT_UI_IMPLEMENTATION_BRIEF.md` | Completed execution brief | A |

### docs/ → docs/archive/ (13 files)

| # | File | Original path | Reason | Tier |
|---|------|---------------|--------|------|
| 24 | IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md | `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md` | Completed implementation log | A |
| 25 | IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md | `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE2_TENANT.md` | Completed implementation log | A |
| 26 | IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE3_PARTICIPANT.md | `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE3_PARTICIPANT.md` | Completed implementation log | A |
| 27 | IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_HARDENING.md | `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_HARDENING.md` | Completed implementation log | A |
| 28 | IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_INTEGRATION.md | `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE4_INTEGRATION.md` | Completed implementation log | A |
| 29 | IMPLEMENTATION_LOG_ADMIN_TENANT_PROXY_FIX.md | `docs/IMPLEMENTATION_LOG_ADMIN_TENANT_PROXY_FIX.md` | Completed implementation log | A |
| 30 | IMPLEMENTATION_LOG_LEARNING_PHASE2.md | `docs/IMPLEMENTATION_LOG_LEARNING_PHASE2.md` | Completed implementation log | A |
| 31 | IMPLEMENTATION_LOG_PLAY_ARTIFACTS.md | `docs/IMPLEMENTATION_LOG_PLAY_ARTIFACTS.md` | Completed implementation log | A |
| 32 | CHATGPT_GAME_CREATOR_PROMPT.md | `docs/prompts/CHATGPT_GAME_CREATOR_PROMPT.md` | One-shot AI prompt | A |
| 33 | CLAUDE_OPUS_DEEP_DIVE_PROMPT.md | `docs/prompts/CLAUDE_OPUS_DEEP_DIVE_PROMPT.md` | One-shot AI prompt | A |
| 34 | PROMPT_FOR_NEW_AI.md | `docs/prompts/PROMPT_FOR_NEW_AI.md` | One-shot AI prompt | A |
| 35 | README.md | `docs/prompts/README.md` | Index for archived prompts directory | A |
| 36 | HANDOVER_2024-12-07.md | `docs/HANDOVER_2024-12-07.md` | Ancient handover (Dec 2024) | A |

---

**Total:** 36 files, ~352.5 KB  
**Empty directory removed:** `docs/prompts/` (all contents archived)  
**Tier B/C files:** Intentionally not archived — require individual review after Observe Mode

## Batch 2 — Root Backlog Archival (2026-03-22)

**Executed by:** GitHub Copilot  
**Move type:** docs/ -> docs/archive/  
**Post-move verification:** `npm run verify:quick` = passed

### docs/ → docs/archive/ (3 files)

| # | File | Original path | Reason | Tier |
|---|------|---------------|--------|------|
| 37 | DESIGN_CONSISTENCY_TODO.md | `docs/DESIGN_CONSISTENCY_TODO.md` | Completed design-token backlog snapshot | D |
| 38 | DESIGN_IMPLEMENTATION_TODO.md | `docs/DESIGN_IMPLEMENTATION_TODO.md` | Historical design implementation backlog | D |
| 39 | SECURITY_AUDIT_TODO.md | `docs/SECURITY_AUDIT_TODO.md` | Completed security backlog snapshot | D |
