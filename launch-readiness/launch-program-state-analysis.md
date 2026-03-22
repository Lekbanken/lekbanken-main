# Launch Program — State Analysis

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-15
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Active integrity-check document for launch-readiness status alignment. Use together with `launch-control.md`, not instead of it.

> **Date:** 2026-03-15  
> **Last updated:** 2026-03-22  
> **Last validated:** 2026-03-22  
> **Status:** active  
> **Author:** Claude Opus 4.6 (automated deep analysis)  
> **Purpose:** Verify actual program state against declared status. Identify inconsistencies, missing phases, and the correct next execution step.  
> **Method:** Cross-reference of 6 launch documents against codebase verification, CI workflows, test inventory, and file system state.  
> **Note:** Active integrity-check document for launch-readiness status alignment. Use together with `launch-control.md`, not instead of it.

---

## 1. Actual Program Phase State

### Declared vs Verified Status

| Phase | Declared Status | Verified Status | Evidence Level | Notes |
|-------|----------------|-----------------|----------------|-------|
| 0 — Audit Operating Model | ✅ Complete | ✅ **Verified** | Verified in docs | 4 launch docs exist, methodology sound, taxonomy used consistently across 23 audits |
| 1A — Architecture Audit | ✅ Complete | ✅ **Verified** | Verified in code | `apiHandler` wrapper exists at `lib/api/route-handler.ts`, 253/288 routes wrapped (87.8%), 4 cross-cutting audits done |
| 1B — Sandbox Strategy | ✅ Config done | ✅ **Verified** | Verified in docs + code | ADR-005 decided, staging Supabase exists (`vmpdejhgpsrfulimsoqn`), `supabase/config.toml` exists, local Supabase works. Implementation-plan levers now reflect the decided sandbox strategy. |
| 2 — Test Foundation | ⏭️ Skipped | ⚠️ **Partially verified** | Verified in code + local runtime | 261 test files exist (72 unit + 12 E2E + RLS tests). CI runs 7 checks on PR. Playwright config is real, not skeleton. Local full-suite baseline was re-verified on 2026-03-22: 60 passed, 43 skipped, 0 failed. Correct label now: "baseline verified, systematic coverage still deferred" |
| 3 — Domain Audits | ✅ Complete | ✅ **Verified** | Verified in docs | 23/23 audit files exist in `launch-readiness/audits/`, all substantial (100-600+ lines). 36 audit files total including regressions and L2 audits |
| 4 — Remediation | ✅ Complete | ✅ **Verified** | Verified in code + docs | 13/13 P0 resolved, 0 actionable P1 remaining, 2 non-actionable follow-ups (SEC-002b, SYS-001). Launch-scope remediation records now read as executed or intentionally deferred history. |
| 5 — Regression Audits | ⏭️ Deferred | ⚠️ **Actually done informally** | Verified in docs | 7 regression audit files exist: `play-regression-audit.md`, `sessions-regression-audit.md`, `games-regression-audit.md`, `planner-regression-audit.md`, `journey-gamification-regression-audit.md`, `demo-regression-audit.md`, `batch-regression-tier2-tier3.md`. 16/16 domains passed. Phase 5 is effectively complete. |
| 6 — Documentation Refresh | ⏭️ Deferred | ⚠️ **Partially started** | Verified in docs | `audits/documentation-cleanup-audit.md` exists with full inventory (397 files, 180 archivable identified). Work was started but not executed. |
| 7 — Release Readiness Gate | ✅ READY | ⚠️ **Conditionally verified** | Verified in docs | Launch verdict issued 2026-03-12, conditions documented. However, several gate criteria items remain unchecked in the implementation plan. |

### Key Finding: Phase 5 is mis-labeled

The implementation plan declares Phase 5 (Regression Audits) as "⏭️ Deferred" with tasks 5.1–5.4 showing ⬜. **This contradicts reality:** 7 regression audit files exist and were executed during 2026-03-14. All 16 domains passed regression. `launch-control.md` shows "Regression: 16/16 ✅" in §2.

**Impact:** The implementation plan is out of sync with launch-control.md. An AI agent reading only the implementation plan would incorrectly conclude that regression audits haven't been done.

### Key Finding: Phase 2 is mis-characterized

"Skipped" implies no tests exist. In reality:
- 72 unit test files (Vitest)
- 12 E2E spec files (Playwright) covering login, game builder, planner, sessions, accessibility
- 2 RLS test files
- CI runs ESLint, typecheck, unit tests, integration tests, and i18n validation on every PR
- CI runs RLS tests when migrations change
- CI runs baseline schema counts when migrations change

What was "skipped" is a *systematic test strategy* with coverage targets and critical-path verification. Existing tests are ad-hoc but real.

---

## 2. Program Inconsistencies

### 2.1 Implementation Plan vs Launch Control Drift

| Area | `launch-readiness-implementation-plan.md` | `launch-control.md` | Inconsistency |
|------|------------------------------------------|---------------------|---------------|
| Phase 5 status | ⬜ "Deferred" (5.1–5.4 unchecked) | "Regression: 16/16 ✅" | **Contradictory** — plan says not done, control says done |
| Phase 1B items | Mixed completed/partial state (1B.1–1B.8) | "✅ IMPLEMENTERAT (2026-03-13)" in plan header | **Reduced drift** — implementation plan now reflects the decided sandbox track, with only seed-data work still partial |
| Phase 7 gate criteria | 25+ items unchecked | "✅ READY" verdict issued | **Inconsistent** — verdict given without completing stated criteria |
| Phase 4 gate: `validate:i18n` | ⬜ Unchecked | — | i18n validation runs in CI but not formally verified against gate criteria |
| Phase 4 gate: "Alla tester passerar" | ⬜ Unchecked | — | Tests run in CI but gate isn't formally checked |
| Wrapper coverage | "247/287 (86.1%)" throughout | Actual: 253/288 (87.8%), 369/410 handlers (90.0%) | **Stale numbers** — older state-analysis references lagged behind the current launch-control baseline |

### 2.2 Snapshot vs Current State

| Metric | Snapshot (2026-03-12) | Verified (2026-03-15) | Delta |
|--------|----------------------|----------------------|-------|
| API route files | 287 | 288 | +1 (readiness route) |
| Wrapped files | 247 (86.1%) | 253 (87.8%) | +6 |
| Wrapped handlers | 360 (88.2%) | 369 (90.0%) | +9 |
| Migrations | 307 | 310+ | +3 (MFA/RLS fixes this session) |
| Level 2 audits | Not mentioned | 4 completed (L2-1 through L2-4) | New capability |

> **Source:** `audits/system-verification-2026.md` documented drift to 250/288 on 2026-03-13. Current session added 2+ more wrappers. Level 2 audits were added to `launch-control.md` §5 but not to the snapshot.

### 2.3 Documentation Layer Inconsistencies

| Document | Issue |
|----------|-------|
| `launch-readiness-architecture.md` | §6 "Observability" says "Okänt — behöver utredas" but telemetry pack exists and observability audit was done |
| `launch-snapshot-2026-03.md` | Frozen by design, but should reference `audits/system-verification-2026.md` for current numbers |
| Root `planner-audit.md` | Still exists at root — duplicates/predates `audits/planner-launch-audit.md` |
| Root `planner-architecture.md` | Root-level — may conflict with `copilot-instructions.md` SSoT expectations (which references root docs as current) |
| `implementation/next-phase-execution-plan.md` | Historical snapshot preserved intentionally. It now includes an explicit superseded-facts warning, so it should not be treated as a current planning source. |

### 2.4 Level 2 Audits — Undocumented in Implementation Plan

`launch-control.md` §5 documents 4 completed Level 2 building-block audits (L2-1 through L2-4). These are NOT tracked in `launch-readiness-implementation-plan.md` at all — they only appear in the control document. The audit program document (§7) defines the methodology but has no tracking checklist.

---

## 3. Risk Assessment — Post-Audit Stability

### Resolved Risks (confirmed)

| Risk | Resolution | Confidence |
|------|-----------|------------|
| 0 P0 blockers | All 13 resolved via code fix or kill-switch | **High** — verified in code |
| 0 actionable P1 | 45/47 original P1s resolved; 2 non-actionable with documented mitigations remain | **High** |
| GDPR exposed | Kill-switched; manual DSAR active | **Medium** — legal compliance under manual process |
| Cross-tenant data leak | TI-001 fixed, all tenant tables audited for RLS | **High** |
| Play state corruption | State machine consolidated, atomic RPCs, session guards | **High** |

### Active Risks (unresolved)

| Risk | Severity | Current Mitigation | Impact |
|------|----------|-------------------|--------|
| **In-memory rate limiter** (SEC-002b) | P1 | Per-instance limiter works; multi-instance bypass requires coordinated regional attack | **Medium** — functional but not production-grade at scale |
| **Wrapper convergence at 87.8%** (SYS-001) | P1 | Remaining ~35 routes are webhooks, SSE, file streams, and other special cases deferred to domain handling | **Low** — edge cases, self-resolving |
| **No systematic E2E coverage policy** | — | 12 specs exist and the local Playwright baseline is verified (60 passed / 43 skipped / 0 failed), but coverage remains selective and skip-heavy | **Medium** — refactors still lack a broad automated regression safety net |
| **GDPR self-service disabled** | P1 (kill-switched) | Manual DSAR via privacy@lekbanken.se, 30-day SLA | **Medium** — legal risk if volume increases |
| **Translation gaps** | P2 | en: 932 missing, no: 1,419 missing. Fallback to Swedish works. | **Low** — no blank strings, Swedish complete |
| **203 remaining P2/P3 findings** | P2/P3 | Tracked in post-launch backlog | **Low** — no security or data integrity items |
| **MFA recovery code format** | Fixed | New codes use correct 12-char format; any old 10-char codes are invalid | **Low** — edge case for pre-fix enrollments |

### Risk Summary

The system is **launch-ready from a security and data integrity perspective**. The highest remaining risks are operational:
1. Rate limiter architecture (single-instance)
2. No automated E2E regression safety net
3. Manual-only operational monitoring in Observe Mode
4. GDPR self-service remains intentionally kill-switched

None of these block launch, but all should be addressed in the first post-launch cycle.

---

## 4. Operational Readiness Assessment

### Telemetry

| Aspect | Status | Evidence |
|--------|--------|----------|
| Signal definitions (5) | ✅ Defined | `launch-telemetry-pack.md` — session health, join funnel, realtime, economy, error pressure |
| Alert definitions (3) | ✅ Defined | Join degradation, reward anomaly, realtime instability |
| Data sources exist | ✅ Verified | `participant_sessions`, `participant_activity_log`, `coin_transactions`, `error_tracking` — all real tables |
| Metrics endpoint | ✅ Exists | `/api/system/metrics` — returns error rates, latency, active users |
| Readiness endpoint | ✅ Exists | `/api/readiness` — checks DB, Stripe, Auth, Encryption, Rate limiter |
| Health endpoint | ✅ Exists | `/api/health` — binary DB ping |
| **Automated alerting** | ❌ **Not implemented** | Signals and alerts are defined as SQL queries but NOT automated. Week 1–3 plan is manual queries. |
| **Dashboard** | ❌ **Not implemented** | `production-signals-dashboard.md` describes desired state but no dashboard exists. Signal queries exist only in the telemetry pack document. |
| **Monitoring integration** | ❌ **Not implemented** | No Grafana, DataDog, or similar. No webhook/cron for alert checks. |

### Operational Verdict

The system is **observable but not monitored**. All data exists in the database. Query patterns are defined. Endpoints exist. But there is:
- No automated signal collection
- No dashboard
- No alert automation
- No on-call integration

This means **Week 1 operations are entirely manual**: someone must run SQL queries against production to check health. This is acceptable for a soft launch with known early users, but insufficient for a commercial SaaS launch.

---

## 5. Current Phase Determination

Based on verified evidence:

```
Actual current position in the launch program:

Phase 0  ✅  (methodology established)
Phase 1A ✅  (architecture audit + wrapper migration)
Phase 1B ✅  (sandbox strategy implemented — staging DB, local Supabase, env isolation)
Phase 2  🟡  (deferred — tests exist but no systematic coverage plan)
Phase 3  ✅  (23/23 domain + cross-cutting audits complete, all GPT-calibrated)
Phase 4  ✅  (all P0/P1 resolved or mitigated)
Phase 5  ✅  (16/16 domain regressions passed + 4 Level 2 building-block audits)
Phase 6  🟡  (audit done — inventory of 397 files, 180 archivable identified — but cleanup not executed)
Phase 7  ✅  (launch verdict READY issued with 3 conditions)

═══════════════════════════════════════
The program is POST-LAUNCH PHASE.
Phase 3+4+5 are all complete.
Phase 2 and 6 are the only incomplete phases.
═══════════════════════════════════════
```

### What the program should declare

The implementation plan still has a few meaningful gaps, but the major phase-state contradictions are now reduced. The main remaining issues are residual secondary-doc drift, lack of a systematic coverage policy for the existing test assets, and the still-deferred bulk documentation cleanup.

---

## 6. Recommended Path Forward

### Priority Order

| # | Phase/Action | Why this order | Effort | Risk reduction |
|---|-------------|----------------|--------|----------------|
| 1 | **Selective SSoT Sync** | The primary launch docs are now aligned, but secondary documents still describe already-resolved uncertainty around environment isolation and the test baseline. | Low | High |
| 2 | **Phase 6 — Documentation Cleanup** | Conservative cleanup still helps AI stability by reducing stale references and markdown noise after the launch baseline truth-sync. | Low | Medium |
| 3 | **Observability automation** | Turn manual signal queries into automated cron checks. Minimal: one Vercel cron that runs the 5 signal SQL queries and logs to `error_tracking`. | Medium | High |
| 4 | **Post-launch P2 backlog triage** | 203 remaining findings need business prioritization. GDPR self-service (6 items) is the highest-value cluster. | Medium | Medium |
| 5 | **Phase 2 — Test Foundation (systematic coverage)** | The baseline is now proven locally, so the remaining work is broader coverage policy, skip reduction, and keeping critical-path flows deterministic over time. | Medium | Medium |

### What NOT to do next

- **Do NOT start Level 2 audits beyond the 4 already completed** — diminishing returns. The 4 completed audits (auth/capability, planner publish, demo gates, session authoring) cover the highest blast-radius building blocks.
- **Do NOT refactor unwrapped routes (SYS-001)** — self-resolving, remaining routes are edge cases.
- **Do NOT implement Upstash rate limiter** — premature optimization. In-memory limiter is sufficient for projected initial traffic (~600 peak concurrent clients).
- **Do NOT build GDPR self-service yet** — manual DSAR process covers the legal requirement. Prioritize only after real user volume demonstrates need.

---

## 7. Program Health Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| **Audit completeness** | 10/10 | 23+4 audits, all GPT-calibrated, all with regression pass |
| **Remediation completeness** | 9/10 | 0 P0, 0 actionable P1. Remaining follow-ups are non-actionable infra/convergence or deferred post-launch work. |
| **Documentation accuracy** | 7/10 | Primary launch docs are aligned and the most misleading secondary drift is cleaned up, but some historical records still preserve older evidence and the gate checklist remains partially unsynchronized. |
| **Test coverage** | 6/10 | Tests exist and the current local E2E baseline is verified, but coverage is still selective and not yet managed as a systematic regression program. |
| **Overall** | **7.0/10** | Launch-ready but not operationally mature. Main risks are documentation noise, manual-only monitoring, and incomplete systematic coverage. |
| **Operational readiness** | 5/10 | Telemetry defined but not automated. Manual monitoring only. No dashboards or alerts. |
| **AI agent stability** | 5/10 | 397 markdown files cause context pollution. 180 archivable. SSoT documents are correct but hard to find among noise. |

---

*This analysis is diagnostic only. No implementation actions taken. All findings are evidence-based — sources cited per finding.*
