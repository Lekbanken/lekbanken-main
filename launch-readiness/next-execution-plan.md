# Next Execution Plan

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-15
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Active roadmap for the current post-launch execution cycle. `launch-control.md` remains the authoritative tracker for overall launch-program status.

> **Date:** 2026-03-15  
> **Last updated:** 2026-03-22  
> **Last validated:** 2026-03-22  
> **Status:** active  
> **Revision baseline:** 2026-03-15 (post-GPT calibration)  
> **Author:** Claude Opus 4.6  
> **Based on:** `launch-program-state-analysis.md`, GPT feedback (2 rounds)  
> **Purpose:** Define the next execution cycle for the Lekbanken launch program.  
> **Governing principle:** **Observe Mode** — `launch-control.md` states that after v2.25 the system enters Observe Mode. No architectural changes or new implementation before real production traffic has been measured, unless there is a production incident, security vulnerability, or P0 bug. Optimization decisions must be based on measured traffic.  
> **Note:** Active roadmap for the current post-launch execution cycle. `launch-control.md` remains the authoritative tracker for overall launch-program status.

---

## Current Position

The launch program is **post-Phase 7** (launch verdict issued 2026-03-12). The system is in **Observe Mode**.

Phase status:
- Phase 0–4: ✅ Complete
- Phase 5: ✅ Complete and reflected in current launch docs
- Phase 6: 🟡 Partially executed — truth-sync done, broader cleanup still deferred
- Phase 2: 🟡 Formal execution skipped — ad-hoc tests exist; unit baseline verified and local RLS baseline partially verified on 2026-03-22
- Phase 7: ✅ READY verdict issued with 3 conditions

Remaining work is **final Step 1 closure, observe-mode operation, and selective post-launch cleanup** — not new feature implementation.

---

## Execution Cycle — 5 Steps

### Step 1 — Targeted Test Verification

**Goal:** Verify that the existing test assets actually pass and establish a baseline that future post-launch work can trust.

**What:**

| Task | Priority | Notes |
|----------|-----------|
| 1.1 — Run `npx vitest run` and verify all unit tests pass | P0 | ✅ Verified 2026-03-22: 78 files passed, 2 skipped; 1805 tests passed, 48 skipped |
| 1.2 — Run local Supabase + RLS tests and verify they pass | P0 | 🟡 Partially verified 2026-03-22: `supabase start` + `npm run db:reset` green; `tests/rls/demo-policies.test.sql` and `supabase/tests/test_tenant_rls_isolation.sql` pass locally; `tests/rls/game-reactions-policies.test.sql` remains a SQL Editor manual script requiring authenticated user context |
| 1.3 — Run Playwright E2E specs against local dev and document results | P1 | ✅ Verified 2026-03-22: latest full run is **60 passed / 43 skipped / 0 failed**. The remaining 43 are intentionally skipped clusters, not active failures. |
| 1.4 — Fix broken tests if failures are deterministic and in scope | P1 | ✅ Completed 2026-03-22: fixed deterministic local auth/setup drift, stale profile route assertions, localhost auth-rate-limit collisions, demo local seed mismatch (`DEMO_TENANT_ID` drift in `supabase/seed.sql`), planner setup/navigation drift, share-link route handling, and tenant-admin full-suite timeout behavior. |
| 1.5 — Verify CI still rejects failures | P1 | CI verification surface confirmed 2026-03-22: `.github/workflows/validate.yml`, `unit-tests.yml`, `typecheck.yml`, `rls-tests.yml`, `i18n-audit.yml`, `baseline-check.yml`. Existing failure-gate evidence is documented; no synthetic failure run performed in this cycle. |

**Why first:** The major SSoT contradictions have now been cleaned up across launch-control, implementation indexes, audits indexes, and docs entrypoints. The next highest-value uncertainty is whether the existing test assets still hold.

**Effort:** Medium.  
**Risk reduction:** High — establishes a real regression safety net.

---

### Step 2 — Residual SSoT Cleanup

**Goal:** Close the smaller remaining status/document drifts without reopening broad documentation cleanup.

**What:**

| Document | Fix needed |
|------|----------|-------|
| `launch-program-state-analysis.md` | Keep residual drift notes aligned with the now-updated implementation and audit indexes |
| `implementation/next-phase-execution-plan.md` | Keep it clearly historical; do not let it re-enter active planning |
| `launch-readiness-architecture.md` | Verify remaining environment/observability notes only if they still conflict with launch-control |

**Not in scope:** Broad archive work or a new documentation restructuring pass.

**Why second:** Most high-risk SSoT drift is already fixed. What remains should be cleaned up opportunistically after the test baseline is known.

**Effort:** Low.  
**Risk reduction:** Medium.

**Status update (2026-03-22):** The high-risk residual drift in `launch-program-state-analysis.md`, `launch-readiness-architecture.md`, and `implementation/next-phase-execution-plan.md` has been cleaned up. Step 2 is now effectively complete for this execution cycle; only broader Phase 6 cleanup remains deferred.

---

### Step 3 — Observe Mode / Production Learning

**Goal:** Operate the launched system as designed and collect real production data before making optimization decisions.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 3.1 — Run telemetry-pack signal queries manually against production | P1 | Follow `launch-telemetry-pack.md` v1 design |
| 3.2 — Document observed baselines | P1 | Session health, join funnel, realtime, economy, error pressure |
| 3.3 — Verify incident playbook readiness | P1 | Kill-switches, rollback, DSAR manual process |
| 3.4 — Identify which signals actually justify automation | P2 | Only after real observation |
| 3.5 — Decide telemetry automation scope if warranted | P2 | Avoid premature endpoint/cron work |

**Why third:** Observe Mode is now the real operational posture. Production learning should happen before backlog reprioritization.

**Effort:** Low-Medium.  
**Risk reduction:** High.

**Current status (2026-03-22):** First production baseline pass executed. Observed result so far is `healthy but idle`: `/api/health` returned `ok` on the live production deployment and confirmed `deployTarget=prod`, `appEnv=production`, `supabaseProjectRef=qohhnufxididbmzqnjwg`. Read-only SQL checks for S1-S4 plus `error_tracking` for S5 all returned zero activity in the last 24h and no recorded anomaly pressure. `/api/readiness` and `/api/system/metrics` remain app-authenticated surfaces, so deeper readiness details and API latency still require a real `system_admin` session during a later pass.

#### Step 3a — Week 1 Manual Run Order

Use this exact sequence for the first observe-mode pass:

1. Run the five signal queries from `launch-telemetry-pack.md` and `docs/ops/production-signals-dashboard.md`.
2. Record the raw baseline values for S1-S5 in a dated ops note or directly in `launch-control.md` changelog if the pass is brief.
3. Check `/api/readiness` and `/api/health` before interpreting anomalies.
4. If any threshold is crossed, follow `docs/ops/anomaly-detection-playbook.md` in alert order (A, B, C).
5. Only after at least one real observation window: decide whether any signal justifies automation, cron, or dashboard work.

**Week 1 output:** one documented baseline pass, one confirmation that the incident playbook is usable, and zero architecture changes unless a real incident or P0 appears.

**Week 1 output status (2026-03-22):** Baseline pass 1 documented with zero observed production traffic, no alert thresholds crossed, and no evidence of infrastructure breakage. One remaining gap for a richer pass is authenticated access to `/api/readiness` and `/api/system/metrics` as a real `system_admin`.

---

### Step 4 — Post-Launch Backlog Triage

**Goal:** Prioritize the remaining deferred work based on observed production behavior and the verified test baseline.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 4.1 — Group P2/P3 findings by business impact | P1 | GDPR, input validation, rate limiting, operational risk |
| 4.2 — Sequence the first post-launch sprint | P1 | Use production observations and test baseline |
| 4.3 — Decide SEC-002b timing | P2 | Only after traffic data shows in-memory limits are insufficient |
| 4.4 — Decide broader docs cleanup scope | P2 | Based on real agent usage after the truth-sync pass |

**Why fourth:** Backlog order should be informed by actual runtime behavior, not pre-launch assumptions.

**Effort:** Low.  
**Risk reduction:** Medium.

**Current status (2026-03-22):** Step 4 is now sharpened by the first production baseline, but not fully “actionable” in the sense of starting a post-launch sprint. The observed system state is still `healthy but idle`, which means there is not yet enough runtime evidence to justify telemetry automation, distributed rate limiting, performance work, or backlog reprioritization based on production pressure.

**Current Step 4 decision (2026-03-22):**

- Do **not** start telemetry automation, cron-based signal collection, or a new observability implementation batch yet.
- Do **not** start SEC-002b / Upstash-style rate limiter infrastructure work yet.
- Treat `audits/step5-backlog-triage-deliverable.md` as a historical shortlist, not as an auto-approved sprint.
- If work must continue before real traffic exists, constrain it to config correctness and operator clarity items only, especially canonical host, Supabase auth redirect URLs, and Stripe webhook host verification.
- Re-open Step 4 for true prioritization only when one of these triggers occurs: first non-zero production traffic, first alert threshold crossing, or an owner decision that forces host/config cleanup regardless of traffic.

---

### Step 5 — Limited Documentation Cleanup

**Goal:** Archive only the highest-confidence documentation noise after backlinks and workflow usage have been confirmed.

**What:**

| Task | Priority | Notes |
|------|----------|-------|
| 5.1 — Archive only highest-confidence files | P1 | Exact duplicates, superseded prompts, one-shot briefs |
| 5.2 — Verify backlinks before each batch move | P1 | Follow the conservative archive checklist |
| 5.3 — Do not archive uncertain semantic anchors | — | Preserve anything still referenced by current workflows |

**Why last:** Documentation cleanup has the lowest immediate operational value once the major truth surfaces are accurate.

**Effort:** Low (analysis and documentation).  
**Risk reduction:** Low-Medium.

---

## Execution Sequence Rationale

```
Step 1 (Test verify)     ─ MEDIUM effort ──► Establishes regression baseline
    │
    ▼
Step 2 (Residual SSoT)   ─ LOW effort ──► Removes remaining documentation drift
    │
    ▼
Step 3 (Observe mode)    ─ LOW-MED effort ──► Collects real production data
    │
    ▼
Step 4 (Backlog triage)  ─ LOW effort ──► Data-informed sprint sequencing
    │
    ▼
Step 5 (Docs cleanup)    ─ LOW effort ──► Reduces noise without risking anchors
```

Steps 1 and 2 can partially overlap when a test run exposes stale planning assumptions.  
Step 3 requires production to be live with real users.  
Step 4 depends on Step 3 observations.  
Step 5 should remain intentionally conservative.

---

## Observe Mode Alignment

This plan explicitly respects the Observe Mode principle from `launch-control.md`:

| Previous plan item | Observe Mode decision |
|---|---|
| Build `/api/system/signals` endpoint | **Deferred** — manual queries first. Automate only after production baselines are known. |
| Add Vercel cron for signal checks | **Deferred** — same reason. Cron tuning requires real threshold data. |
| Alert wiring via `error_tracking` | **Deferred** — alert thresholds need observed baselines, not guesses. |
| Archive 160 docs files | **Reduced to ~30** highest-confidence files, and only after the current truth-sync pass plus real workflow usage. |
| New smoke tests for golden paths | **Deferred** — verify existing tests first. Decide on new tests only if the current baseline is insufficient. |

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

- [ ] Existing unit and RLS tests verified against the current codebase
- [x] Existing E2E specs run and baseline documented (`npx playwright test` = 60 passed, 43 skipped, 0 failed on 2026-03-22)
- [x] Residual launch-doc contradictions reduced to zero or explicitly deferred
- [x] Existing unit tests verified passing (`vitest run` = green)
- [ ] Local RLS baseline verified against active harnesses and manual scripts triaged
- [x] Existing E2E tests verified and baseline documented (current baseline: 60 passed, 43 skipped, 0 failed; skipped tests remain intentionally excluded)
- [ ] CI confirmed to catch real failures (workflow surface verified; no synthetic failure test run in this cycle)
- [ ] ~30 highest-confidence noise files archived (exact duplicates, v1 files, one-shot prompts)
- [ ] Only conservative archive moves executed
- [x] Manual telemetry checks executed for Week 1 — first baseline pass documented (`healthy but idle`, 2026-03-22)
- [ ] Incident playbook readiness confirmed
- [ ] Post-launch backlog triaged and sequenced (informed by production data)
- [ ] All changes committed and documented in `launch-control.md` changelog

---

*This plan is aligned with Observe Mode. No new implementation until production data justifies it. Implementation proceeds only after GPT review.*
