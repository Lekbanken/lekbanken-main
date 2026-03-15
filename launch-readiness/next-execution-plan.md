# Next Execution Plan

> **Date:** 2026-03-15  
> **Revised:** 2026-03-15 (post-GPT calibration)  
> **Author:** Claude Opus 4.6  
> **Based on:** `launch-program-state-analysis.md`, GPT feedback (2 rounds)  
> **Purpose:** Define the next execution cycle for the Lekbanken launch program.  
> **Governing principle:** **Observe Mode** — `launch-control.md` states that after v2.25 the system enters Observe Mode. No architectural changes or new implementation before real production traffic has been measured, unless there is a production incident, security vulnerability, or P0 bug. Optimization decisions must be based on measured traffic.

---

## Current Position

The launch program is **post-Phase 7** (launch verdict issued 2026-03-12). The system is in **Observe Mode**.

Phase status:
- Phase 0–4: ✅ Complete
- Phase 5: ✅ Complete in practice (16/16 regressions + 4 L2 audits) — tracking not updated
- Phase 6: 🟡 Audited but not executed
- Phase 2: 🟡 Formally skipped — ad-hoc tests exist but unverified
- Phase 7: ✅ READY verdict issued with 3 conditions

Remaining work is **verification and alignment**, not new implementation.

---

## Execution Cycle — 5 Steps

### Step 1 — SSoT Reconciliation

**Goal:** Align launch documents so they reflect actual program state. Remove contradictions that cause AI agent drift.

**What:**

| Document | Fix needed |
|----------|-----------|
| `launch-readiness-implementation-plan.md` | Mark Phase 5 as ✅ (not ⏭️ Deferred). Update 5.1–5.4 to reflect 16/16 regression + 4 L2 audits complete. Mark Phase 2 as 🟡 "Partial — ad-hoc coverage" (not ⏭️ Skipped). Fix Phase 1B sub-items (1B.1–1B.8) to reflect actual completion. |
| `launch-control.md` | Update wrapper coverage from 247/287 (86.1%) to 252/288 (87.5%). Reference `system-verification-2026.md` for canonical numbers. Add note about 4 Level 2 audits completing Phase 5 scope. |
| `launch-readiness-architecture.md` | §2: Update environment diagram (staging Supabase active, local Docker working). §6: Update "Okänt" to reference `launch-telemetry-pack.md`. |
| `next-phase-execution-plan.md` | Mark as historical context — Phase 1B is done. "Docker not installed" and ".env.local → prod" findings are resolved. |

**Why first:** Every subsequent step depends on agents having an accurate picture. Mischaracterized phases cause agents to re-plan work that's already done.

**Effort:** Low (document edits only).  
**Risk reduction:** Medium — eliminates AI context drift.

---

### Step 2 — Test Verification (Phase 2 — Targeted)

**Goal:** Verify that existing tests actually pass. Establish a baseline. Do NOT write a full test pyramid — verify what exists first.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 2.1 — Run `npx vitest run` and verify all 72 unit tests pass | P0 | May need fixture updates after audit-cycle code changes |
| 2.2 — Run local Supabase + RLS tests and verify they pass | P0 | `supabase db reset` → run RLS test files |
| 2.3 — Run Playwright E2E specs against local dev and document results | P1 | 12 specs exist — how many actually pass? Record baseline. |
| 2.4 — Fix broken tests (if any) | P1 | Don't write new tests — fix existing ones first |
| 2.5 — Verify CI catches failures | P1 | Push a deliberate type error on a branch, confirm CI rejects |

**Not in scope:** Writing new E2E smoke tests. That decision should wait until existing test results are known. If the existing 12 specs mostly pass, new smoke tests are unnecessary.

**Why second:** Tests provide a harder safety net than documentation changes. Test results are binary and irrefutable. A verified passing suite gives confidence for any subsequent changes — including documentation cleanup.

**Effort:** Medium (running tests, debugging failures, fixing fixtures).  
**Risk reduction:** High — establishes a proven regression safety net.

---

### Step 3 — Minimal Documentation Integrity Fixes

**Goal:** Fix the 3 dangerous inconsistencies identified in `launch-docs-integrity-audit.md`. Archive only the highest-confidence noise files. Do NOT execute a broad cleanup yet.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 3.1 — Fix the 3 dangerous inconsistencies (Phase 5 label, Phase 1B checkboxes, wrapper numbers) | P0 | Overlaps with Step 1 — verify these are actually fixed |
| 3.2 — Archive "safe to archive now" files only (~30 highest-confidence root files) | P1 | Exact duplicates, v1 superseded files, completed one-shot prompts. See `launch-docs-integrity-audit.md` addendum §10 for classification. |
| 3.3 — Verify backlinks before each batch move | P1 | 5-point checklist from `documentation-cleanup-audit.md` |
| 3.4 — Do NOT archive "probably archivable later" or "keep until verified" files | — | Wait until backlinks and agent workflows are confirmed through real usage |

**Why third:** Documentation cleanup is lower priority than test verification. Only the dangerous inconsistencies (which risk agent drift) are urgent. Broad cleanup waits until the system has been observed in production and agent workflows have been exercised against the remaining docs.

**Effort:** Low (limited file moves + verification).  
**Risk reduction:** Low-Medium — resolves the dangerous inconsistencies without risking semantic anchor loss.

---

### Step 4 — Observe Mode / Production Learning

**Goal:** Operate the launched system. Use the telemetry pack manually as designed. Collect real production data before making optimization decisions.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 4.1 — Run telemetry-pack signal queries manually against production (Week 1) | P1 | Per `launch-telemetry-pack.md` v1 design — manual daily checks against production DB |
| 4.2 — Document observed baselines | P1 | Record actual values for the 5 signals: session health, join funnel, realtime, economy, error pressure |
| 4.3 — Verify incident playbook readiness | P1 | Confirm kill-switches work, rollback procedures are understood, GDPR DSAR manual process is operational |
| 4.4 — Identify which signals actually need automation | P2 | Based on observed values — which signals change enough to warrant automated checks? |
| 4.5 — Decide on telemetry automation scope (if any) | P2 | Only after Week 1–2 of manual observation. May include `/api/system/signals` endpoint + Vercel cron, but **only if manual observation shows this is needed** |

**Why fourth, not earlier:** `launch-control.md` Observe Mode principle requires production traffic data before optimization. `launch-telemetry-pack.md` explicitly designs Week 1–3 as manual monitoring, with automation as Week 4+ work. Building signal endpoints and cron jobs before seeing real traffic data would produce automation tuned to guesses rather than measurements.

**Effort:** Low-Medium (manual queries, documentation).  
**Risk reduction:** High — real data replaces assumptions.

---

### Step 5 — Post-Launch Backlog Triage

**Goal:** Prioritize the remaining P2/P3 findings for the first post-launch development cycle. Informed by production observations from Step 4.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 5.1 — Group P2s by business impact | P1 | GDPR (6), Upload validation (3), Error leakage (3), Rate limiting (10), Input validation (15), other |
| 5.2 — Sequence first post-launch sprint | P1 | Informed by production observations — actual traffic patterns may reprioritize items |
| 5.3 — Decide SEC-002b (rate limiter architecture) | P2 | Only after traffic data shows whether in-memory limiter is sufficient |
| 5.4 — Decide broader docs cleanup scope | P2 | Based on agent experience during Steps 1–4 — which docs caused confusion? Which semantic anchors helped? |
| 5.5 — Decide telemetry automation implementation | P2 | Based on Step 4 observations — which signals need automation vs manual spot-checks? |

**Why last:** Backlog triage should be informed by production learning. Sequencing a sprint before seeing real usage patterns risks misallocation.

**Effort:** Low (analysis and documentation).  
**Risk reduction:** Low-Medium — ensures post-launch velocity is well-directed.

---

## Execution Sequence Rationale

```
Step 1 (SSoT fix)        ─ LOW effort ──► Removes agent drift
    │
    ▼
Step 2 (Test verify)     ─ MEDIUM effort ──► Establishes regression safety net
    │
    ▼
Step 3 (Minimal docs fix)─ LOW effort ──► Fixes dangerous inconsistencies only
    │
    ▼
Step 4 (Observe Mode)    ─ LOW-MED effort ──► Collects real production data
    │
    ▼
Step 5 (Backlog triage)  ─ LOW effort ──► Data-informed first sprint
```

Steps 1 and 3 can partially overlap (both involve SSoT document edits).  
Step 2 requires running the dev server and test runners.  
Step 4 requires production to be live with real users.  
Step 5 depends on Step 4 data.

---

## Observe Mode Alignment

This plan explicitly respects the Observe Mode principle from `launch-control.md`:

| Previous plan item | Observe Mode decision |
|---|---|
| Build `/api/system/signals` endpoint | **Deferred** — manual queries first. Automate only after production baselines are known. |
| Add Vercel cron for signal checks | **Deferred** — same reason. Cron tuning requires real threshold data. |
| Alert wiring via `error_tracking` | **Deferred** — alert thresholds need observed baselines, not guesses. |
| Archive 160 docs files | **Reduced to ~30** highest-confidence files. Broader cleanup after agent workflows are exercised. |
| New smoke tests for golden paths | **Deferred** — verify existing tests first. Decide on new tests after baseline is known. |

**The operating model for Weeks 1–3 is manual telemetry checks using the SQL queries in `launch-telemetry-pack.md`.** This matches the telemetry pack's own v1 design. Automation is a Week 4+ decision, triggered by observed need.

---

## What This Plan Does NOT Include

| Excluded | Why |
|----------|-----|
| New telemetry implementation | Observe Mode — manual monitoring first, automate after baselines |
| Broad documentation cleanup | Conservative approach — archive only ~30 highest-confidence files until backlinks verified |
| Additional Level 2 audits | 4 completed audits cover highest blast-radius blocks. Diminishing returns. |
| Full E2E test pyramid | Verify existing tests first. New tests only if existing coverage is insufficient. |
| Upstash rate limiter migration | Premature — in-memory limiter sufficient for initial traffic |
| GDPR self-service implementation | Manual DSAR covers legal requirement. Implement when volume justifies. |
| Wrapper migration of remaining 35 routes | Edge cases (webhooks, SSE, file streams). Self-resolving. |
| Enterprise isolation implementation | Design study done. No implementation until enterprise contract exists. |
| Product features | Post-launch, after Observe Mode validates current architecture. |

---

## Success Criteria

At the end of this execution cycle:

- [ ] SSoT documents accurately reflect program state (0 contradictions between launch docs)
- [ ] Existing unit tests verified passing (`vitest run` = green)
- [ ] Existing E2E tests verified and baseline documented (pass/fail per spec)
- [ ] CI confirmed to catch real failures
- [ ] ~30 highest-confidence noise files archived (exact duplicates, v1 files, one-shot prompts)
- [ ] 3 dangerous inconsistencies resolved
- [ ] Manual telemetry checks executed for Week 1 — baselines documented
- [ ] Incident playbook readiness confirmed
- [ ] Post-launch backlog triaged and sequenced (informed by production data)
- [ ] All changes committed and documented in `launch-control.md` changelog

---

*This plan is aligned with Observe Mode. No new implementation until production data justifies it. Implementation proceeds only after GPT review.*
