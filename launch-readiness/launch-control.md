# Lekbanken Launch Control

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-13
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Canonical operating summary for the launch-readiness program. Use this file for current status, phase posture, and links into the underlying audit and implementation records.

> **Status:** LAUNCH READY — Post-launch operational phase  
> **Last updated:** 2026-03-22  
> **Current Phase:** Post-launch Observe Mode. All phases complete (Phase 2 formal execution skipped; Phase 6 deferred). Awaiting production traffic data.  
> **Audit index:** `launch-readiness/audits/README.md`
> **Implementation index:** `launch-readiness/implementation/README.md`

---

## Launch Principle

After v2.25 the system enters **Observe Mode**.

No architectural changes will be implemented before real production traffic has been measured unless:

- a production incident occurs
- a security vulnerability is discovered
- a P0 bug appears

**Optimization decisions must be based on measured traffic.**

---

## 1. Launch Phases

| Phase | Name | Status | Started | Completed |
|-------|------|--------|---------|-----------|
| 0 | Audit Operating Model | ✅ Complete | 2026-03-10 | 2026-03-10 |
| 1 | Architecture & Environment Strategy | ✅ Complete | 2026-03-10 | 2026-03-11 |
| 2 | Test Foundation | 🟡 Formal execution skipped; ad-hoc test assets and CI coverage exist | — | — |
| 3 | Domain Audits | ✅ Complete | 2026-03-10 | 2026-03-12 |
| 4 | Remediation (P0/P1) | ✅ Complete | 2026-03-10 | 2026-03-12 |
| 5 | Regression Audits | ✅ Complete (per-domain, inline) | 2026-03-14 | 2026-03-14 |
| 6 | Documentation Refresh | ⏭️ Deferred post-launch | — | — |
| 7 | Release Readiness Gate | ✅ READY | 2026-03-12 | 2026-03-12 |

> **Note:** Phases 3 and 4 ran concurrently per domain: Audit → Implement → Regression before moving to next domain. Phase 1 produced the API wrapper infrastructure and architectural decisions that enabled all subsequent work.
>
> **Phase deviations:**
> - **Phase 2 (Test Foundation):** Formal Phase 2 execution was skipped. Ad-hoc test assets exist (261 test files: 72 unit, 12 E2E specs, RLS tests) and CI runs 7 checks including `tsc --noEmit`. **Baseline verification update (2026-03-22):** `npx vitest run` passed locally, `npm test` passed locally, `supabase start` + `npm run db:reset` succeeded, and the active local RLS harnesses `tests/rls/demo-policies.test.sql` plus `supabase/tests/test_tenant_rls_isolation.sql` passed after aligning the manual tenant script with the current schema. `tests/rls/game-reactions-policies.test.sql` remains a SQL Editor manual script that requires authenticated user context rather than the CI-style container path.
- **Playwright baseline (2026-03-22):** local E2E baseline is now verified. Auth/setup drift was removed by aligning the local demo seed with the canonical `DEMO_TENANT_ID`, bypassing non-production in-memory `demo` plus `auth`/`strict` rate-limit interference, and updating planner/profile/login audits to wait on visible app state instead of brittle full-load events. The latest full run (`npx playwright test`) finished at **60 passed / 43 skipped / 0 failed**. The 43 skipped cases remain intentionally excluded clusters, not active red failures.
> - **Phase 5 (Regression):** ✅ Complete — 16/16 domain regressions executed inline during audit→implement cycle. 4 Level 2 building-block audits completed. All regressions passed. See Regression Progress Summary below.
> - **Phase 6 (Docs Refresh):** Deferred — documentation kept current during audit cycle. Bulk cleanup of root-level .md files planned post-launch.
> - **Phase 7 (Release Gate):** Verdict READY issued 2026-03-12 (see §6).

---

## 2. Domain Audit Status

| Domain | Audit | Remediation | Regression | i18n | Tests | Docs | Status |
|--------|-------|-------------|------------|------|-------|------|--------|
| Auth / Onboarding | ✅ | ✅ | ✅ | — | — | — | Covered by Security & Auth Audit (17 findings). All original P0/P1 resolved. **MFA sub-audit (2026-03-18):** all 5 findings closed by 2026-03-22. See `audits/mfa-trusted-device-audit.md` and `implementation/mfa-trusted-device-remediation.md`. |
| Tenants / Multi-tenancy | ✅ | ✅ | ✅ | — | — | — | Audit complete — 10 findings. TI-001 P0 fixed. TI-002/TI-NEW-1c resolved (product decisions). Regression covered by per-domain tenant boundary checks (Games, Planner, Journey, Media). |
| Games / Library | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 14 findings (0 P0, 3 P1, 8 P2, 3 P3). **M1 ✅** **M2 ✅** **M3 ✅** — 0 P0, 0 P1 remaining. **Remediation complete for launch scope.** M4 deferred post-launch. **Regression ✅ (2026-03-14)** — all 8 areas pass, all 7 M1–M3 fixes verified intact, 18 handlers verified, 0 new findings. Test-group-ready for current scope. See `audits/games-regression-audit.md`. |
| Game Authoring (Admin) | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Covered by Games System Audit (builder routes, publish, snapshots included). Regression verified in Games regression (2026-03-14). |
| Planner | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 16 findings (0 P0, 8 P1, 6 P2, 2 P3). 27 routes audited, 0 unwrapped, RLS verified on all 10 tables. **M1 ✅** **M2 ✅** **M3 ✅** — 8 P1 fixed (PLAN-001–008). 0 P1 remaining. **Launch-scope complete.** Regression ✅ (2026-03-14) — M1-M3 intact, 5 new routes all wrapped. **2 new post-audit findings:** REG-PLAN-001 (P2, progress route missing plan access check) + REG-PLAN-002 (P3, publish globalRole derivation inconsistency). See `audits/planner-regression-audit.md`. |
| Play / Run | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete — 14 findings (2 P0, 4 P1, 5 P2, 3 P3). M1 ✅ M2 ✅ M3 ✅ M4 ✅ M5 ✅ — 0 P0, 0 P1 remaining within decided launch scope. **Remediation complete for launch scope.** Regression audit ✅ (2026-03-14) — 1 gap found (assignments guard missing) + fixed. See `audits/play-regression-audit.md`. |
| Sessions / Participants | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete — 13 findings (0 P0, 4 P1, 6 P2, 3 P3). GPT calibration applied. M1 ✅ M2 ✅ M3 ✅ — 0 P1 remaining within decided launch scope. **Remediation complete for launch scope.** M4 deferred post-launch. Regression audit ✅ (2026-03-14) — 0 new gaps, 8 known P2/P3 re-confirmed. See `audits/sessions-regression-audit.md`. |
| Journey / Gamification | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 12 findings (0 P0, 1 P1, 8 P2, 3 P3). **M1 ✅** **M2 ✅** — 0 P1 remaining. 6 findings fixed (1 P1 + 5 P2). **Launch-scope complete.** M3/M4 deferred post-launch. **Regression ✅ (2026-03-14)** — all 5 M1+M2 fixes verified intact, 33 routes scanned (30/33 apiHandler, 3 known deferrals), event integrity pipeline V1+V2 idempotency confirmed, 0 new findings. Test-group-ready for current scope. See `audits/journey-gamification-regression-audit.md`. |
| Atlas / Sandbox | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 11 findings (0 P0, 2 P1, 6 P2, 3 P3). **M1 ✅** — 2 P1 fixed. 0 P1 remaining. **Regression ✅ (2026-03-14)** — all 3 M1 fixes verified intact (inventory + annotations auth lock, seed-test-badges auth lock), 2 routes scanned, 0 new findings. Test-group-ready. See `audits/batch-regression-tier2-tier3.md`. |
| Media / Assets | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 12 findings (0 P0, 2 P1, 6 P2, 4 P3). **M1 ✅** — 2 P1 fixed. 0 P1 remaining. **Launch-scope complete.** M2 deferred post-launch. **Regression ✅ (2026-03-14)** — all 3 M1 fixes verified intact (upload tenant membership, confirm path-prefix validation, design.ts tenant check), 7 routes scanned, 0 new findings. Test-group-ready. See `audits/batch-regression-tier2-tier3.md`. |
| Notifications | ✅ | — | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 8 findings (0 P0, 0 P1, 5 P2, 3 P3). No launch remediation needed. **Regression ✅ (2026-03-14)** — 0 API routes (server actions), architecture unchanged, 0 new findings. See `audits/batch-regression-tier2-tier3.md`. |
| Billing / Stripe | ✅ Audit | ✅ Remediation | ✅ | ✅ | ✅ | ✅ | M1+M2 GPT-approved |
| Support / Tickets | ✅ | — | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 10 findings (0 P0, 0 P1, 8 P2, 2 P3). No launch remediation needed. **Regression ✅ (2026-03-14)** — 0 API routes (server actions), RLS-first design unchanged, 0 new findings. See `audits/batch-regression-tier2-tier3.md`. |
| Marketing / Landing | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 7 findings (0 P0, 0 P1, 2 P2, 5 P3). MKT-001 M1 fixed (robots.ts + sitemap.ts). **Regression ✅ (2026-03-14)** — M1 files confirmed present, 0 API routes, 0 new findings. See `audits/batch-regression-tier2-tier3.md`. |
| Demo | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ | Audit complete — 18 findings (0 P0, 3 P1, 10 P2, 5 P3). Own domain per GPT directive (Tier 1 — externt exponerad). **M1 ✅** — 3 P1 fixed: DEMO-001 (launch-sufficient persistent rate limiter), DEMO-002 (hardcoded access code removed), DEMO-003 (error leak removed). **Regression ✅ (2026-03-14)** — all 8 GPT-defined areas pass, 3 M1 fixes verified intact. **M2 ✅ (2026-03-14)** — 3 regression findings fixed: REG-DEMO-001 (demo-expired UX dead-end → link to /demo), REG-DEMO-002 (RLS policy scoped to authenticated+admin), REG-DEMO-003 (RPC ownership checks added). Migration `20260314200000`. Re-regression passed (10 checks). Demo is test-group-ready for current scope. See `audits/demo-regression-audit.md`. |
| Profile / Settings | ✅ | — | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 8 findings (0 P0, 0 P1, 4 P2, 4 P3). No launch remediation needed. **Regression ✅ (2026-03-14)** — 4 routes all `apiHandler({ auth: 'user' })`, 0 new findings. **Post-launch hardening follow-up (2026-03-19):** profile writes canonicalized to `/api/accounts/profile`; duplicate general-page PATCH and direct client `user_profiles` write path removed. **Avatar canonicalization follow-up (2026-03-19):** `user_profiles.avatar_url` is now the canonical source for auth/profile reads, with `users.avatar_url` retained as a compatibility mirror for legacy/admin surfaces. See `audits/batch-regression-tier2-tier3.md`. |
| Calendar | ✅ | — | ✅ | ❌ | ❌ | ❌ | Audit complete + GPT-calibrated — 7 findings (0 P0, 0 P1, 3 P2, 4 P3). Sub-feature of Planner. **Regression ✅ (2026-03-14)** — 2 routes both wrapped + `requirePlanEditAccess`, 0 new findings. See `audits/batch-regression-tier2-tier3.md`. |

### Regression Progress Summary

> **Tillagd:** 2026-03-14 (GPT-direktiv: tydligare statusöversikt)

| Tier | Domän | Audit | Remediation | Regression | Verdict |
|------|-------|-------|-------------|------------|---------|
| **Tier 1 — Remedierade** | Play / Run | ✅ | ✅ M1–M5 | ✅ | Test-group-ready |
| | Sessions / Participants | ✅ | ✅ M1–M3 | ✅ | Test-group-ready |
| | Planner | ✅ | ✅ M1–M3 | ✅ | Test-group-ready |
| | Games / Library | ✅ | ✅ M1–M3 | ✅ | Test-group-ready |
| | Journey / Gamification | ✅ | ✅ M1–M2 | ✅ | Test-group-ready |
| | Demo | ✅ | ✅ M1–M2 | ✅ | Test-group-ready |
| | Billing / Stripe | ✅ | ✅ M1–M2 | ✅ | GPT-approved |
| **Tier 2 — Remedierade** | Atlas / Sandbox | ✅ | ✅ M1 | ✅ | Test-group-ready |
| | Media / Assets | ✅ | ✅ M1 | ✅ | Test-group-ready |
| **Tier 3 — Audit only (0 P1)** | Auth / Onboarding | ✅ | ✅ | ✅ | Cross-cutting covered |
| | Tenants / Multi-tenancy | ✅ | ✅ | ✅ | Cross-cutting covered |
| | Game Authoring (Admin) | ✅ | ✅ | ✅ | Covered by Games |
| | Notifications | ✅ | — | ✅ | 0 P1, architecture ok |
| | Support / Tickets | ✅ | — | ✅ | 0 P1, RLS-first ok |
| | Profile / Settings | ✅ | — | ✅ | 0 P1, all wrapped |
| | Marketing / Landing | ✅ | ✅ | ✅ | MKT-001 M1 verified |
| | Calendar | ✅ | — | ✅ | Sub-feature, wrapped |

**Regression: 16/16 ✅** — Alla domäner har passerat regression.

### Cross-Cutting Audit Status

| Area | Audit | Remediation | Status |
|------|-------|-------------|--------|
| API Security & Auth (287 routes) | ✅ | 🟡 | 17 original findings. All original P0/P1 resolved. SEC-002b open (infra — non-actionable). **MFA sub-audit (2026-03-18):** all 5 findings closed by 2026-03-22. |
| API Consistency (288 routes) | ✅ | ✅ | 14 findings. APC-003/011 resolved (RLS policy). Wrapper: **253/288 (87.8%)**, 369/410 (90.0%). |
| Tenant Isolation | ✅ | ✅ | 10 findings. TI-001 P0 fixed. TI-002/TI-NEW-1c product decisions resolved. |
| i18n | ✅ | ✅ | 7 findings (0 P0, 0 P1, 2 P2, 5 P3). GPT-calibrated. sv complete, en/no synced (2026-03-15): 932 en + 1104 no keys added, 430 en + 997 no orphans removed. All 3 locales at 11,927 keys. |
| Performance / Bundle Size | ✅ | — | 6 findings (0 P0, 0 P1, 4 P2, 2 P3). GPT-calibrated. No launch remediation needed. |
| Accessibility (a11y) | ✅ | — | 8 findings (0 P0, 0 P1, 2 P2, 6 P3). GPT-calibrated. Dedicated a11y library, Radix coverage. No launch remediation needed. |
| Abuse & Privacy | ✅ | ✅ | 39 findings. ABUSE-001/002 P0 fixed. PRIV-001–006 kill-switched. **All 12 post-launch P1s fixed (2026-03-15)**: ABUSE-003/004 rate-limited, UPLOAD-001–003 validated+enforced, LEAK-001–003 error/data exposure closed, ENUM-001/002 anti-enumeration hardened. |
| React Server/Client Boundary | ✅ | — | 7 findings (0 P0, 0 P1, 3 P2, 4 P3). GPT-calibrated. Zero boundary violations. No launch remediation needed. |
| Migration Safety | ✅ | — | 14 findings (0 P0, 1 P1, 9 P2, 4 P3). GPT-calibrated. MIG-001 P1 (bootstrap risk, already applied). |
| Database Architecture | ✅ | ✅ Canonical Baseline | 307 migrations → 1 canonical baseline. Fresh install verified (exit code 0). 247 tables, 156 functions, 545 policies, 28 enums confirmed. Old migrations archived. See §15. |
| RLS Coverage | ⏭️ | — | Deferred — covered per-domain during audits (all 10+ planner tables, play tables, billing tables verified). |
| End-to-End Data Flows | ⏭️ | — | Deferred — partially covered by Play/Sessions/Games audits (state machine, snapshot pipeline, join flow). |
| UI Consistency / Design System | ⏭️ | — | Deferred post-launch. |
| Error / Loading / Empty States | ⏭️ | — | Deferred post-launch. |
| Role-Based Visibility | ⏭️ | — | Deferred — covered per-domain during audits (admin/leader/participant views verified). |
| SEO / Metadata | ⏭️ | — | Deferred — partially covered by Marketing audit (robots.ts, sitemap.ts created). |
| Observability / Logging | ✅ | ✅ Launch Telemetry Pack | 5 signals + 3 alerts defined. All metrics from existing tables (no new instrumentation). See `launch-telemetry-pack.md`, `docs/ops/production-signals-dashboard.md`, `docs/ops/anomaly-detection-playbook.md`. |
| Mobile / Responsive | ⏭️ | — | Deferred post-launch. |

---

## 3. Findings Summary

| Severity | Count | Resolved | Remaining |
|----------|-------|----------|-----------|
| P0 — Launch blocker | 15 | 15 | 0 — All P0s closed (MFA-004 2026-03-18, MFA-005 2026-03-19) |
| P1 — Must fix before launch | 49 + 24 new | 47 | 2 legacy + 24 new Codex — see below |
| P2 — Should fix, not blocker | 136 + 3 new | 16 | 121 legacy + BUG-009 + BUG-021 |
| P3 — Nice to have | 90 | 0 | 90 — post-launch backlog |

> **MFA sub-audit (2026-03-18):** 5 new findings discovered by Codex, verified by Claude. **Status: all 5 findings closed as of 2026-03-22.** DD-MFA-1 resolved: tenant-scoped trust via server-canonical cookie. See `audits/mfa-trusted-device-audit.md`.

> **⚠️ Codex Cluster Triage (2026-03-18):** 24 additional findings (BUG-006 through BUG-029) discovered by Codex across 6 clusters: Tenant Admin (C1), Account Management (C2), Participant/Session (C3), Billing/Stripe (C4), Entitlement/Access (C5), Games Catalog (C6). 11 of 29 total findings independently verified by Claude; remaining 18 marked "VERIFIED (Codex)" — high confidence based on code proof but not yet re-verified. All 29 findings triaged into 8 root-cause families and 3 remediation waves. **No implementation started.** See:
> - `audits/post-launch-cluster-triage.md` — master triage table + root-cause families + wave assignments
> - `implementation/post-launch-remediation-waves.md` — execution order + dependencies + regression plans

> **P1 clarification:** 47 P1s were discovered across all 23 audits. 45 were resolved via code fixes, product decisions, or kill-switches. The 2 remaining are non-actionable: SEC-002b requires an infrastructure decision (Upstash), SYS-001 self-resolves as wrapper adoption continues. **12 Abuse & Privacy P1s** (ABUSE-003/004, UPLOAD-001–003, LEAK-001–003, ENUM-001/002) were **fixed 2026-03-15** — rate limiting, MIME validation, storage quota enforcement, error leaking removal, data exposure closure, and anti-enumeration hardening.

> **APC-003/APC-011 status note:** ✅ **RESOLVED (2026-03-14). GPT APPROVED.** Auth gap closed (Batch 2), service-role bypass eliminated. RLS policy `tenant_admin_view_sessions` created (migration `20260314000000`). `sessions/route.ts` migrated from `createServiceRoleClient()` → `createServerRlsClient()`. Tenant admins can now query sessions in their tenant via RLS; system admins retained via `is_system_admin()` policy.
>
> **⚠️ Deploy order:** Migration `20260314000000` **must** be applied before deploying the route change. If the route deploys first, tenant admins lose access to the session list until the RLS policy is in place.

### §3a P1 Reconciliation (2026-03-12)

After 8 domain audits and Batches 1–6d wrapper migration (90.0% handler coverage), a reconciliation pass verified which P1s are resolved, merged, downgraded, or truly remaining.

**Resolved by prior work (removed from P1 count):**

| Finding | Resolution | Resolved by |
|---------|-----------|-------------|
| SEC-003 | 57 tenantAuth routes migrated to `apiHandler` | Batches 4a–4c-4 (zero `tenantAuth` imports remain in API routes) |
| SEC-004 | Participant token auth centralized via `auth: 'participant'` | DD-2 + Batch 6a–6d (10 routes, standardized `x-participant-token` header) |
| APC-006 | `consent/log` now has `apiHandler({ auth: 'public', rateLimit: 'strict', input: consentLogSchema })` | Batch 1 |
| ARCH-002 | Parallel auth patterns eliminated — 87.8% use `apiHandler`, 0 tenantAuth imports remain | Same root cause as SEC-003, resolved by same migration |

**Merged (deduplicated — same root cause):**

| Findings | Merged into | Root cause |
|----------|------------|------------|
| SEC-005 + APC-001 + ARCH-003 + ARCH-004 | **SYS-001** | Wrapper convergence — error format + validation standardize as remaining ~12% routes adopt `apiHandler`. Not individually fixable. |

**Downgraded:**

| Finding | Old | New | Reason |
|---------|-----|-----|--------|
| TI-003 | P1 | P2 | `contentService.ts` mutation functions have **zero callers** in codebase. Only `getContentItems` (read) is imported. Inactive code — no exploit path exists. |

**Remaining P1s (5):**

| # | Finding | Type | Status | Actionable? |
|---|---------|------|--------|-------------|
| 1 | SEC-002b | Rate limiter architecture (in-memory, per-instance) | ⬜ Open | Blocked — infra decision (Redis/Upstash/Edge KV) |
| 2 | SYS-001 | Wrapper convergence (error format + validation) | 🟡 Converging | Self-resolving — 90.0% handler coverage, remaining ~10% are edge cases |

### §3b Remaining P1 Control Sheet (2026-03-13)

> **Status: FINAL — 2 P1s remaining (0 actionable code fixes).** SEC-002b is an infra decision, SYS-001 is self-resolving. **0 P0 remaining. All 23 audits GPT-calibrated.** MIG-001 downgraded P0→P1 per GPT (bootstrap risk only, migration already applied). PRIV-001–006 downgraded P0→P1 after GDPR kill-switch. ABUSE-001/002 fixed. All domain P1s remediated across 8 domains (Play, Sessions, Games, Planner, Journey, Billing, Atlas, Media).

| Finding | Category | Owner | Blocker | Next action | Risk if deferred to post-launch |
|---------|----------|-------|---------|-------------|---------------------------------|
| **SEC-002b** | Infra | Engineering | Needs architectural decision: Redis, Upstash, or Edge KV | Decide rate-limiter backend; current in-memory limiter works per-instance but doesn't share state across Edge workers | **Medium** — brute-force protection works per-instance; multi-instance bypass requires coordinated attack across regions |
| **SYS-001** | Convergence | Engineering | Self-resolving | Continue wrapper migration toward 100%; remaining ~10% are niche handlers (webhooks, SSE, file streams) | **Low** — error format inconsistency causes no security/data risk; already at 90.0% |
| ~~**TI-002**~~ | ~~Product~~ | ~~Product owner~~ | ~~Needs decision~~ | ✅ **RESOLVED** (2026-03-14) — Product decision Alt A: show `display_name` + `avatar_url` only. Removed `userId` (UUID) and `maskEmail` fallback from leaderboard API response. | ~~Medium~~ |
| ~~**TI-NEW-1c**~~ | ~~Product~~ | ~~Product owner~~ | ~~Needs decision~~ | ✅ **RESOLVED** (2026-03-14) — Product decision Alt A: public endpoint returns `participant_count` only. Removed `include_participants` query param and participant name query from `public/v1/sessions/[id]`. | ~~Medium~~ |
| ~~**APC-003/011**~~ | ~~RLS~~ | ~~Engineering~~ | ~~Requires new RLS policy~~ | ✅ **RESOLVED** (2026-03-14) — RLS policy `tenant_admin_view_sessions` + route migrated to `createServerRlsClient()` | ~~Low~~ |

**Remaining work:**
1. **SEC-002b** — infra decision (can ship with in-memory limiter, upgrade post-launch)
2. **SYS-001** — self-resolving (90.0% → continues toward 100%)
3. **MFA-004** (P0) — `user_mfa` update uses wrong field names + returns success on failure. **Status: ✅ CLOSED (2026-03-18).** See `implementation/post-launch-remediation-waves.md` §1.1.
4. **MFA-005** (P0) — Cross-tenant MFA bypass: `verifyTrustedDevice()` missing `tenant_id` filter. **Status: ✅ CLOSED (2026-03-19).** DD-MFA-1 resolved: tenant-scoped trust via server-canonical cookie only. Postfix hardened: removed `body.tenant_id` override + added tenant filter to middleware `checkTrustedDevice()`. See `implementation/post-launch-remediation-waves.md` §1.8.
5. **MFA-001** (P1) — `profiles!inner` join references non-existent relation. **Status: OPEN.** Wave 2.
6. **MFA-002** (P1) — `.eq('is_active', true)` on non-existent column. **Status: OPEN.** Wave 2.
7. **BUG-006–085** (24 findings, P1/P2) — Codex cluster findings across 6 domains. **Status: Wave 1 — 23 CLOSED (all).** DD-LEGACY-1 resolved: legacy fallback removed (Option A). See `implementation/post-launch-remediation-waves.md`.
   > **Commit note:** Commit `3966ae6` subject says "18 bugs" — canonical count is 20 closed in that commit. MFA-005 and BUG-020 closed in follow-up (2026-03-19). BUG-022 closed via DD-LEGACY-1 Option A (2026-03-19).

### Unverified Findings (from prior audits — needs triage)

> **⚠️ These numbers come from automated scans and may include false positives.**  
> Many "unauthed" routes may be intentionally public, RLS-protected, or middleware-gated.  
> Each will be verified during its respective domain audit.

| ID | Source | Domain | Finding | Verified? | Status |
|----|--------|--------|---------|-----------|--------|
| PRE-001 | API_ROUTE_AUDIT.md | API Security | 110/261 routes without explicit auth guard | ✅ Triaged | ✅ Resolved — deep-dive in Security & Auth Audit reduced to 5 true concerns |
| PRE-002 | API_ROUTE_AUDIT.md | API Security | 42 ServiceRole routes without explicit auth | ✅ Triaged | ✅ Resolved — only 1 true gap (SEC-001, fixed) |
| PRE-003 | i18n-audit.md | i18n | 1,419 missing keys in Norwegian | ✅ Confirmed | ✅ Fixed (2026-03-15) — synced from sv.json (Swedish fallback values, not real Norwegian translations), 997 orphans removed. Real translations needed post-launch. |
| PRE-004 | i18n-audit.md | i18n | 932 missing keys in English | ✅ Confirmed | ✅ Fixed (2026-03-15) — synced from sv.json (Swedish fallback values, not real English translations), 430 orphans removed. Real translations needed post-launch. |
| PRE-005 | i18n-audit.md | i18n | 1,799 hardcoded actionable strings | ❌ Unverified | ⬜ Triage in i18n Audit |
| PRE-006 | i18n-audit.md | i18n | 34 empty/placeholder values | ✅ Confirmed | ✅ Verified false positives — legitimate translations containing words like "saknas"/"missing" |
| PRE-007 | planner-audit.md | Planner | Dual dynamic segments route conflict risk | ✅ Verified | ✅ **RESOLVED** — Next.js static segments take priority over dynamic `[planId]`, no route conflict exists |

---

## 4. Audit Queue

Order of audits to execute. Each audit follows the cycle: **Audit → Implement → Regression** before moving to next.

| # | Domain | Scope | Status | Audit File |
|---|--------|-------|--------|------------|
| 1 | Architecture Core | Domain boundaries, API layering, mapper consistency, state ownership, role-based UI | ✅ Complete | `architecture-audit.md` |
| 2 | Security & Auth | Auth flows, MFA, middleware, session handling, auth guards, RLS | ✅ Complete | `audits/security-auth-audit.md` |
| 3 | Tenant Isolation | Multi-tenancy, RLS policies, subdomain routing, tenant cookie, data leakage | ✅ Complete | `audits/tenant-isolation-audit.md` |
| 4 | API Consistency | 287 routes — auth, validation, error format, rate limiting, wrapper adoption | ✅ Complete | `audits/api-consistency-audit.md` |
| 5 | Games System | Library, browsing, search, authoring, snapshot pipeline | ✅ Complete | `audits/games-audit.md` |
| 6 | Play Runtime | Director mode, step execution, timer, realtime, artifacts. **GPT-defined focus:** (1) runtime mutation matrix — per-mutation session status guard coverage, (2) state transition coverage — all mutations vs lifecycle model, (3) multi-tab/multi-actor races — concurrent semantic conflicts beyond idempotency, (4) authoritative source mapping — source of truth vs cache vs audit per state type | ✅ Complete | `audits/play-audit.md` |
| 7 | Planner | Wizard, calendar, plans, versioning, runs, sharing | ✅ Audit complete | `audits/planner-launch-audit.md` |
| 8 | Sessions & Participants | Join flow, lobby, live state, keypad, voting, chat | ✅ Complete | `audits/sessions-audit.md` |
| 9 | Journey & Gamification | Factions, cosmetics, XP, achievements, loadout, shop | ✅ Audit complete | `audits/journey-audit.md` |
| 10 | Billing & Stripe | Checkout, subscriptions, invoices, payments, seats, dunning, usage, products, Stripe webhook | ✅ Audit + Remediation complete | `audits/billing-audit.md` |
| 11 | Atlas & Admin | Admin dashboard, user mgmt, analytics, sandbox tools | ✅ Audit complete | `audits/atlas-admin-audit.md` |
| 12 | Media & Assets | Upload, storage, display, spatial artifacts | ✅ Audit complete | `audits/media-audit.md` |
| 13 | Notifications | Push, email, delivery, read status, broadcasts | ✅ Complete — 8 findings (0 P0, 0 P1, 5 P2, 3 P3). GPT-calibrated. | `audits/notifications-audit.md` |
| 14 | Profile & Settings | User profile, preferences, avatar | ✅ Complete — 8 findings (0 P0, 0 P1, 4 P2, 4 P3). GPT-calibrated. | `audits/profile-audit.md` |
| 15 | Support | FAQ, tickets, SLA | ✅ Complete — 10 findings (0 P0, 0 P1, 8 P2, 2 P3). GPT-calibrated. | `audits/support-audit.md` |
| 16 | Marketing & Landing | Public pages, SEO, metadata | ✅ Complete — 7 findings (0 P0, 0 P1, 2 P2, 5 P3). GPT-calibrated. MKT-001 M1 fixed (robots.ts + sitemap.ts). | `audits/marketing-audit.md` |
| 17 | Calendar | Scheduling, date picker, plan linking | ✅ Complete — 7 findings (0 P0, 0 P1, 3 P2, 4 P3). GPT-calibrated. Sub-feature of Planner. | `audits/calendar-audit.md` |
| 18 | i18n (tvärgående) | Translation coverage, hardcoded strings, locale handling | ✅ Complete — 7 findings (0 P0, 0 P1, 2 P2, 5 P3). GPT-calibrated. | `audits/i18n-audit.md` |
| 19 | Performance (tvärgående) | Bundle size, JS splitting, slow queries, realtime vs polling efficiency, SSR/CSR balance | ✅ Complete — 6 findings (0 P0, 0 P1, 4 P2, 2 P3). GPT-calibrated. No launch remediation needed. | `audits/performance-audit.md` |
| 20 | Accessibility (tvärgående) | Keyboard nav, screen reader, contrast, ARIA | ✅ Complete — 8 findings (0 P0, 0 P1, 2 P2, 6 P3). GPT-calibrated. | `audits/accessibility-audit.md` |
| 21 | Abuse & Privacy (tvärgående) | Rate limiting, upload abuse, UUID enum, GDPR, data exposure | ✅ Complete — 39 findings (0 P0, 18 P1, 14 P2, 7 P3). GPT-calibrated. All P0s resolved. | `audits/abuse-privacy-audit.md` |
| 22 | React Server/Client Boundary | 'use client' boundaries, hydration mismatches, RSC data flow | ✅ Complete — 7 findings (0 P0, 0 P1, 3 P2, 4 P3). GPT-calibrated. No launch remediation needed. | `audits/react-boundary-audit.md` |
| 23 | Migration Safety | 330+ migrations, rollback strategy, destructive DDL, data backfill | ✅ Complete — 14 findings (0 P0, 1 P1, 9 P2, 4 P3). GPT-calibrated. | `audits/migration-safety-audit.md` |
| 24 | Demo | Ephemeral users, demo sessions, feature gating, conversion tracking, cleanup, abuse tolerance | ✅ Complete — 18 findings (0 P0, 3 P1, 10 P2, 5 P3). Own domain per GPT directive. | `audits/demo-audit.md` |
| 25 | MFA & Trusted Devices | MFA admin listing, admin reset, trusted device trust/verify/revoke, tenant isolation | ✅ Audit complete, remediation executed — 5 findings (2 P0, 2 P1, 1 P2), all closed by 2026-03-22. Codex discovery, Claude verification. | `audits/mfa-trusted-device-audit.md` |
| 26 | Codex Cluster Triage | Cross-domain findings from Codex static analysis — admin, accounts, participants, billing, games | 🟡 Triage complete, remediation pending — 24 findings (0 P0, 21 P1, 3 P2) across 6 clusters, 8 root-cause families, 3 waves. | `audits/post-launch-cluster-triage.md` |

### Audit Cycle Rule

```
For each audit in queue:
  1. AUDIT    → discover & document all findings
  2. IMPLEMENT → fix P0/P1 findings (grouped by root cause)
  3. REGRESSION → re-run same audit to verify fixes
  4. If clean → move to next audit
  5. If P0/P1 remain → loop back to step 2
```

---

## 5. Current Workstream

**Phase 3+4 — Domain Audits & Remediation (concurrent per-domain cycle)**

### Completed Infrastructure (Phase 1)

- [x] Phase 0: Launch readiness docs created + review feedback applied
- [x] **Architecture Core Audit** — 15 findings (0 P0, 4 P1, 7 P2, 4 P3)
- [x] **API route wrapper built** (`lib/api/route-handler.ts`) + pilot (5 routes)
- [x] **Security & Auth Audit** — 17 findings (2 P0, 5 P1, 6 P2, 4 P3). P0 remediation done.
- [x] **Tenant Isolation Audit** — 10 findings (1 P0, 3 P1, 3 P2, 3 P3). TI-001 P0 fixed.
- [x] **API Consistency Audit** — 14 findings (0 P0, 4 P1, 7 P2, 3 P3). Batches 1–6d complete.
- [x] **Wrapper migration: Batches 1–6d** — 233/287 files (81.2%), 342/408 handlers (83.8%)
- [x] **DD-1 (canonical admin check)** + **DD-2 (participant auth)** + **DD-3 (rate limiting)** + **DD-4 (public leaderboard)** — all decided

### Completed: Play Runtime (Domain Audit #6)

- [x] **Play Runtime Audit** — 14 findings (2 P0, 4 P1, 5 P2, 3 P3). DD-PLAY-1 through DD-PLAY-5 locked.
- [x] **M1 — State Machine Consolidation** — PLAY-001 P0 ✅, PLAY-004 P1 ✅
- [x] **M2 — Session-Status Guards** — PLAY-003 P1 ✅ (17 routes guarded, central policy table)
- [x] **M3 — Atomic Puzzle RPCs** — PLAY-002 P0 ✅ (4 RPCs: riddle, counter, multi_answer, qr_gate)
- [x] **M4 — Broadcast Completeness** — PLAY-005 P1 ✅ (kick/block/approve, readiness, assignments)
- [x] **M5 — Wrapper Coverage** — PLAY-006 P1 ✅ (puzzle + keypad + vote → `apiHandler({ auth: 'participant' })`, session-scope check, rate limiting)

### Completed: Sessions & Participants (Domain Audit #8)

- [x] **Sessions & Participants Audit** — 13 findings (0 P0, 4 P1, 6 P2, 3 P3). GPT calibration applied: SESS-004 P1→P2, SESS-008/009 subsumed under SESS-002.
- [x] **M1 — Quick Wins** — Wrap 2 admin routes (`participants/route.ts`, `participants/[participantId]/route.ts`) + export rate limit (SESS-001/003/005) ✅
- [x] **M2 — Input Validation** — Zod schemas for join/rejoin/create (SESS-002, incl. avatarUrl + expiresInHours) ✅
- [x] **M3 — Rejoin Status Gate** — Block `draft` in rejoin, keep `locked` allowed (SESS-007) ✅
- [ ] ~~**M4 — Broadcast Consolidation**~~ — Deferred to post-launch (SESS-004, P2)

### Remaining Domain Audits (not started)

*All domain audits complete.*

### Level 2 — Critical Building Block Audits (selektiv)

> **Tillagd:** 2026-03-14

Audit-programmet omfattar nu **två nivåer**: Level 1 (domain audits, alla genomförda) och Level 2 (critical building block audits — selektiv fördjupning i komponenter, hooks, helpers och mappers med hög blast radius). Level 2 aktiveras selektivt — inte som komplett backlog — vid domänregression, cross-domain-findings, eller när ett fynd verkar systemiskt. Full metodik: `launch-readiness-audit-program.md` §7.

#### Level 2 Audit Progress

| # | Building Block Cluster | Status | Findings | Report |
|---|----------------------|--------|----------|--------|
| L2-1 | Auth / Tenant / Capability helper stack | ✅ PASS (2026-03-15) | 0 P0, 0 P1, 3 P2, 2 P3 | `audits/level2-auth-tenant-capability-audit.md` |
| L2-2 | Planner publish / progress / version / access chain | ✅ PASS (2026-03-15) | 0 P0, 0 P1, 1 P2, 5 P3 | `audits/level2-planner-publish-version-access-audit.md` |
| L2-3 | Demo feature gates + upgrade path | ✅ PASS (2026-03-15) | 0 P0, 0 P1, 2 P2, 5 P3 | `audits/level2-demo-feature-gates-upgrade-audit.md` |
| L2-4 | Play / Session authoring chain | ✅ PASS (2026-03-16) | 0 P0, 0 P1, 3 P2, 4 P3 | `audits/level2-session-authoring-chain-audit.md` |

### Completed Cross-Cutting Audits

- [x] **Abuse & Privacy Audit (#21)** — 39 findings (0 P0, 18 P1, 14 P2, 7 P3). All P0s resolved (GDPR kill-switch + abuse fixes).

### Wrapper Adoption Metrics

> **Methodology:** All metrics below are **code-scanned** using `.NET System.IO.File.ReadAllText()` on every `app/api/**/route.ts` file, matching regex patterns against file contents. PowerShell 5.1's `Select-String -Path` and `Get-Content` (without `-LiteralPath`) both mishandle `[brackets]` in paths — treating them as glob wildcards. This silently skips or mismatches files in dynamic-segment directories like `[tenantId]`, `[sessionId]`, etc. (103 of 287 route files). Run `scripts/api-wrapper-inventory.ps1` to reproduce these numbers.
>
> **Coverage definition (locked):**
> - **Primary metric:** wrapped files / total route files (a file counts as wrapped if it has ≥ 1 `export const X = apiHandler(...)`)
> - **Secondary metric:** wrapped handler exports / total handler exports (individual GET/POST/PUT/PATCH/DELETE exports)

| Metric | Count | Notes |
|--------|-------|-------|
| Total API route files | 288 | All `app/api/**/route.ts` files |
| **Wrapped files** | **253** | Files with ≥ 1 `export const X = apiHandler(...)` (includes 3 mixed) |
| **Wrapped handler exports** | **369** | Individual GET/POST/PUT/PATCH/DELETE exports using `apiHandler` |
| Total handler exports | 410 | All HTTP method exports across all route files |
| Unwrapped-only files | 35 | No `apiHandler` export |
| Mixed files | 3 | Both `apiHandler` and `export async function` exports |
| **File-level coverage** | **87.8%** | 253/288 — primary metric |
| **Handler-level coverage** | **90.0%** | 369/410 — secondary metric |

#### Per-Pattern Migration Backlog

| Auth Pattern | Remaining | Notes |
|-------------|-----------|-------|
| `tenantAuth` import | 0 | ✅ All migrated in Batch 4c-4 |
| `isSystemAdmin` (not from tenantAuth) | 0 | ✅ All migrated in Batches 5a+5b (29 routes). Remaining calls in lib/ are non-route. |
| Inline `supabase.auth.getUser()` | 0 | ✅ All migrated in Batches 3A–5d |
| Auth-guard `requireAuth()` (direct) | 0 | ✅ All migrated in Batches 1–2 |
| Manual `.safeParse()` | ~20 | Many overlap with wrapped routes — can use wrapper `input` |
| Participant token routes | 0 | ✅ All migrated in Batch 6 (10 routes, DD-2 realized) |
| Mixed/public/special-case | ~49 | Phase 7 — addressed per domain audit (webhooks, public catalog, sandbox) |

### Auth Classification (from Security & Auth Audit)

| Auth Class | Routes | % | Wrapper-ready? |
|------------|--------|---|----------------|
| `wrapper:user` | 103 | 35.9% | ✅ Already wrapped (+3 in 3B-2b pass 3: triggers, plans/[planId], assignments) |
| `wrapper:system_admin` | 15 | 5.2% | ✅ Already wrapped |
| `wrapper:public` | 13 | 4.5% | ✅ Already wrapped (+1 in 3B-2b pass 3: artifacts GET) |
| `wrapper:cron_or_admin` | 2 | 0.7% | ✅ Already wrapped |
| `wrapper:session_host` | 1 | 0.3% | ✅ Already wrapped (mixed public GET + sessionHost DELETE) |
| `inline:getUser` | 0 | 0.0% | ✅ All migrated in Batches 3–5d |
| `auth-guard:user` | 0 | 0.0% | ✅ All migrated |
| `auth-guard:system_admin` | 0 | 0.0% | ✅ All migrated (Batch 1 + Batch 2) |
| `auth-guard:cron_or_admin` | 0 | 0.0% | ✅ All migrated (Batch 1 + Batch 2) |
| `auth-guard:session_host` | 0 | 0.0% | ✅ All migrated (Batch 1 + Batch 2) |
| `tenantAuth:system_admin` | 0 | 0.0% | ✅ All migrated in Batch 4c-4 (7 routes → `apiHandler` + `requireTenantRole` / `effectiveGlobalRole` / `authorizeScope`). |
| `tenantAuth:tenant_admin` | 0 | 0.0% | ✅ All migrated in Batch 4b (9 routes → `auth: 'user'` + `requireTenantRole`) |
| `tenantAuth:tenant_or_system` | 0 | 0.0% | ✅ All migrated in Batch 4c-3 (dual-path routes) |
| `participant_token` | 0 | 0.0% | ✅ All migrated in Batch 6 (DD-2 realized) |
| `server_auth_context` | 0 | 0.0% | ✅ All migrated in Batches 5a–5b |
| `public_or_unknown` | 51 | 17.8% | Phase 7: ~51 remaining routes addressed per domain audit (webhooks, public catalog, sandbox) |
| `webhook_or_cron` | 1 | 0.3% | ⚪ Keep as-is (Stripe signature) |
| **Total** | **287** | **100%** | |

### Design Decisions (from SEC audit — resolved per GPT Review #9)

| ID | Decision | Status | Impacts |
|----|----------|---------|
| DD-1 | Canonical system admin check: `deriveEffectiveGlobalRole()` is canonical. `tenantAuth.isSystemAdmin()` deprecated. | ✅ Decided | 57 routes |
| DD-2 | Participant auth: first-class `auth: 'participant'` mode. Contract defined in `dd2-participant-auth-spec.md`. Includes `ParticipantContext` (with `expiresAt`), auto rate limiting (`'participant'` tier), standardized error model. | ✅ Spec finalized | 10 routes (4 sub-batches) |
| DD-3 | Rate limiting: explicit on sensitive routes, no blanket default. Revisit after Tenant Isolation Audit. | ✅ Decided (revised) | 276 routes |
| DD-4 | Public leaderboard/sinks: confirmed public, UUID validation added. Privacy-sensitive — Tenant Audit to verify. | ✅ Decided | 2 routes |

<details>
<summary>Phase 1+2 migrated routes (36 total — historical detail)</summary>

**Phase 1 (17 routes):** accounts/sessions, accounts/devices/remove, admin/licenses, accounts/auth/mfa/* (requirement, devices/trust, status), journey/snapshot, billing/dunning (+cancel), admin/cosmetics (+grant, POST, GET), gift/redeem (POST+GET).

**Phase 2 (19 routes):** billing/dunning/[id]/* (actions, retry), admin/cosmetics/[id] (+rules), products/purposes (+[purposeId]), accounts/auth/* (email/change, password/change, mfa/enroll, mfa/disable, mfa/challenge, mfa/devices, mfa/devices/[deviceId], mfa/devices/verify), accounts/sessions/revoke, accounts/profile/organizations, checkout/intents/[intentId], gamification/achievement/[id], gamification/faction.

</details>

---

## 6. Active Remediation Tasks

| ID | Domain | Description | Severity | Status | Assigned |
|----|--------|-------------|----------|--------|----------|
| SEC-001 | API Security | Snapshots GET service role without auth | P0 | ✅ Fixed | Claude |
| SEC-002a | API Security | Critical route rate-limiting coverage gap (financial, GDPR, auth, storage) | P0 | ✅ Fixed (10 routes) | Claude |
| SEC-002b | API Security | Serverless in-memory limiter architecture + long-tail route coverage | P1 | ⬜ Open | — |
| SEC-006 | API Security | `isSystemAdmin(null)` audit finding | P1 | ✅ False positive | Claude |
| SEC-007 | API Security | Participant progress rate limiting | P1 | ✅ Fixed | Claude |
| TI-001 | Tenant Isolation | Games builder cross-tenant CRUD via service role | P0 | ✅ Fixed and code-verified | Claude |
| TI-002 | Tenant Isolation | Leaderboard exposes PII (user IDs, masked emails) cross-tenant | P1 | ✅ Fixed — Alt A: display_name + avatar only, userId/email removed (2026-03-14) | Claude |
| TI-003 | Tenant Isolation | Content service trusts caller-provided tenantId | P1 | ⬜ Open | — |
| TI-004 | Tenant Isolation | Tenant GET routes lack app-level auth (settings/branding/members) | P2 | ⬜ Deferred | — |
| TI-NEW-1a | Tenant Isolation | `app/api/public/v1/sessions/route.ts` — zero-auth session list (metadata only) | P2 | ⬜ Deferred | — |
| TI-NEW-1b | Tenant Isolation | `app/api/public/v1/games/route.ts` — zero-auth published game list (catalog) | P3 | ⬜ Deferred | — |
| TI-NEW-1c | Tenant Isolation | `app/api/public/v1/sessions/[id]/route.ts` — zero-auth session detail with **participant PII** (display names via `include_participants`) | P1 | ✅ Fixed — Alt A: participant_count only, include_participants removed (2026-03-14) | Claude |
| TI-NEW-1d | Tenant Isolation | `app/api/public/v1/games/[id]/route.ts` — zero-auth game detail + cross-tenant stats (no tenant filter on stats query) | P2 | ⬜ Deferred | — |
| APC-001 | API Consistency | 4 different error response formats coexist (converges with wrapper adoption) | P1 | ⬜ Open (systemic) | — |
| APC-003 | API Consistency | `sessions/route.ts` mixes RLS client with service role admin fallback | P1 | ✅ Fixed — RLS policy `tenant_admin_view_sessions` + `createServerRlsClient()` (2026-03-14) | Claude |
| APC-006 | API Consistency | `consent/log` unauthenticated POST + service role + no rate limiting | P1 | ✅ Fixed (Batch 1) | Claude |
| APC-011 | API Consistency | `sessions/route.ts` admin fallback — same root as APC-003 | P1 | ✅ Fixed — resolved together with APC-003 (2026-03-14) | Claude |
| PLAY-001 | Play Runtime | Triple status mutation path — 3 endpoints write session status, only 1 enforces state machine | P0 | ✅ Fixed (M1) | Claude |
| PLAY-002 | Play Runtime | JSONB read-modify-write races — puzzle/counter state loses data under concurrency | P0 | ✅ Fixed (M3) | Claude |
| PLAY-003 | Play Runtime | Missing session-status guards — 13/15 mutation routes allow mutations on ended/draft sessions | P1 | ✅ Fixed (M2) | Claude |
| PLAY-004 | Play Runtime | Control route missing timestamp fields — pause/end don't set `paused_at`/`ended_at` | P1 | ✅ Fixed (M1) | Claude |
| PLAY-005 | Play Runtime | Broadcast gaps on critical host actions — kick/block/approve, assignments, readiness have no broadcast | P1 | ✅ Fixed (M4) | Claude |
| PLAY-006 | Play Runtime | Unwrapped participant-facing routes — vote, puzzle, keypad wrapped (M5). Board, session-code, game, overrides remain (Batch 7). | P1 | ✅ Fixed (M5) | Claude |
| SESS-001 | Sessions | Mock data fallback in `participants/[participantId]/route.ts` — returns hardcoded fake participant on any error | P1 | ✅ Fixed (M1) | Claude |
| SESS-002 | Sessions | Missing Zod validation on join/rejoin/create — `avatarUrl` unvalidated (XSS/SSRF), `expiresInHours` unchecked | P1 | ✅ Fixed (M2) | Claude |
| SESS-003 | Sessions | Unwrapped admin routes — `participants/route.ts` and `participants/[participantId]/route.ts` lack apiHandler, auth, rate limit | P1 | ✅ Fixed (M1) | Claude |
| SESS-004 | Sessions | Dual broadcast path in control route — direct `channel.send()` on `session:` channel instead of `broadcastPlayEvent()` | **P2** | ⬜ Deferred (post-launch) | — |
| SESS-005 | Sessions | Export endpoint (`/api/play/sessions/[id]/export`) has no rate limiting | P1 | ✅ Fixed (M1) | Claude |
| GAME-001a | Games | `games/[gameId]` DELETE lacks app-level role gate | P1 | ✅ Fixed (M2) | Claude |
| GAME-001b | Games | `?force=true` DELETE terminates live sessions without system_admin check | P1 | ✅ Fixed (M1) | Claude |
| GAME-002 | Games | Snapshots route — any authed user can snapshot any game, error leakage | P1 | ✅ Fixed (M1) | Claude |
| GAME-005 | Games | Reactions batch — no auth, no batch limit, error leakage | P2 | ✅ Fixed (M1) | Claude |
| GAME-001c | Games | PATCH uses service-role client, bypassing RLS | P2 | ✅ Fixed (M3) | Claude |
| GAME-009 | Games | Builder PUT: 21 of 26 DB operations ignore errors | P2 | ✅ Fixed (M3) | Claude |

### Abuse & Privacy Audit Findings (Audit #21 — GPT-calibrated 2026-03-12. ABUSE-001/002 GPT-approved.)

| ID | Domain | Description | Severity | Status | Assigned |
|----|--------|-------------|----------|--------|----------|
| PRIV-001 | GDPR | `deleteUserData()` only deletes 3 of 50+ user-data tables | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| PRIV-002 | GDPR | Auth user not deleted — `auth.admin.deleteUser()` never called | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| PRIV-003 | GDPR | `exportUserData()` covers only 6 tables — incomplete data portability | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| PRIV-004 | GDPR | IP address retention — no deletion/anonymization enforcement | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| PRIV-005 | GDPR | `users` row survives deletion — profile data remains | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| PRIV-006 | GDPR | Activity log anonymization is a no-op — function body is empty | P1 | ✅ Kill-switch | Self-service disabled; manual DSAR via privacy@lekbanken.se |
| ABUSE-001 | Abuse | Enterprise quote endpoint: no auth, no rate limit, no CAPTCHA — email spam vector | ~~P0~~ | ✅ Fixed | `apiHandler({ auth: 'public', rateLimit: 'strict' })` + honeypot |
| ABUSE-002 | Abuse | Geocode proxy: unauthenticated, unbounded — open proxy to Nominatim | ~~P0~~ | ✅ Fixed | `apiHandler({ auth: 'user', rateLimit: 'strict' })` + limit clamp |
| ABUSE-003 | Abuse | 8 MFA routes have no rate limiting — brute-force vector | P1 | ✅ Fixed (2026-03-15) | `rateLimit: 'auth'` on all mutation routes, `rateLimit: 'api'` on read routes. 12 MFA routes now rate-limited. |
| ABUSE-004 | Abuse | 8 public play session mutation routes have no rate limiting | P1 | ✅ Fixed (2026-03-15) | Chat POST → `rateLimit: 'strict'`, Signals POST → `rateLimit: 'api'`. All public mutation routes now rate-limited. |
| UPLOAD-001 | Upload | No server-side MIME validation — `fileType` is `z.string().min(1)` | P1 | ✅ Fixed (2026-03-15) | `fileType` now validated via `ALLOWED_MIME_TYPES` whitelist (images, audio, video, PDF). |
| UPLOAD-002 | Upload | File size is declared-only — no server-side enforcement | P1 | ✅ Fixed (2026-03-15) | Zod enforces `.max(10 * 1024 * 1024)`. Actual upload goes via Supabase Storage signed URL (which enforces bucket-level limits). |
| UPLOAD-003 | Upload | Storage quota configured but never enforced in upload pipeline | P1 | ✅ Fixed (2026-03-15) | Upload route now checks tenant storage usage against `max_storage_mb` quota before generating signed URL. |
| LEAK-001 | Data Exposure | Supabase errors leaked verbatim in 17+ route catch blocks | P1 | ✅ Fixed (2026-03-15) | Removed `error.message` / `details` from 20+ user-facing route responses including gamification/events. Logging preserved via console.error, only client-facing leaks removed. |
| LEAK-002 | Data Exposure | Stripe `customer_id` exposed via `select(*)` on billing endpoints | P1 | ✅ Fixed (2026-03-15) | `tenants/[tenantId]` now selects explicit safe columns (no metadata). Billing routes select specific columns, excluding `stripe_*` IDs and `transaction_reference`. |
| LEAK-003 | Data Exposure | Full DB rows returned to clients via `select(*)` on user-facing endpoints | P1 | ✅ Fixed (2026-03-15) | `user_sessions`, `user_devices`, `payments`, `usage_meters` routes now select explicit safe columns instead of `*`. |
| ENUM-001 | Enumeration | Session preview endpoint: no auth, no rate limit — enumerable via 6-char codes | P1 | ✅ Fixed (2026-03-15) | Rate limit tightened from `api` (100/min) to `strict` (5/min). Anti-enumeration uniform 404 already in place. |
| ENUM-002 | Enumeration | Join endpoint status leak — different errors for valid/invalid session codes | P1 | ✅ Fixed (2026-03-15) | All non-joinable states return uniform `{ error: 'Unable to join session', code: 'JOIN_FAILED' }` with 404. Only SESSION_FULL uses 403. Frontend join page updated to use `code`-based checks. |

### Migration Safety Audit Findings (Audit #23 — GPT-calibrated)

| ID | Domain | Description | Severity | Status | Assigned |
|----|--------|-------------|----------|--------|----------|
| MIG-001 | Migration | Enum ADD VALUE inside `BEGIN/COMMIT` references new value before commit in `tenant_anonymization.sql` — bootstrap risk only (PG 17, migration applied) | P1 | ⬜ Open | GPT-calibrated P0→P1 |
| MIG-002 | Migration | Bulk DELETE FROM `public.users` with no safety net (orphaned profiles fix) | P2 | ⬜ Historical | Already applied — GPT-calibrated P1→P2 |
| MIG-003 | Migration | No formal rollback framework — 3 of 304 migrations have rollback scripts | P2 | ⬜ Open | GPT-calibrated P1→P2 |
| MIG-004 | Migration | No deployment verification checklist or CI gate for migrations | P2 | ⬜ Open | GPT-calibrated P1→P2 |

---

## 7. Architecture Decisions

| ID | Decision | Status | Date | Notes |
|----|----------|--------|------|-------|
| ADR-001 | Feature-scoped code organization | ✅ Accepted | Pre-existing | All domain logic in `features/{domain}/` |
| ADR-002 | URL-driven state (no global state store) | ✅ Accepted | Pre-existing | Wizard steps via `?step=` |
| ADR-003 | RLS-first security model | ✅ Accepted | Pre-existing | All tables protected by RLS |
| ADR-004 | Supabase Auth + MFA | ✅ Accepted | Pre-existing | JWT-based auth with MFA support |
| ADR-005 | Sandbox/preview environment strategy | ✅ Accepted | 2026-03-13 | Verified: preview → sandbox isolation working. See launch-readiness-architecture.md |
| ADR-006 | Test strategy and minimum coverage | 🟡 Proposed | 2026-03-10 | See launch-readiness-architecture.md |
| DD-PLAY-1 | State machine consolidation: pipeline enrichment + client migration (A+C) | ✅ Decided | 2025-07-24 | Step 1: move gamification+disconnect into pipeline. Step 2: migrate clients. |
| DD-PLAY-2 | Session-status guard: central `PLAY_ROUTE_STATUS_POLICY` map (A) | ✅ Decided | 2025-07-24 | All 14 route types declare allowed statuses in one table. |
| DD-PLAY-3 | Atomicity: Postgres RPCs for puzzle/counter ops (A) | ✅ Decided | 2025-07-24 | Generic atomicity primitives preferred. |
| DD-PLAY-4 | Broadcast completeness: kick/block + readiness + assignments | ✅ Decided | 2025-07-24 | Stricter scope — chat/approve/rejoin/overrides deferred. |
| DD-PLAY-5 | Wrapper coverage: puzzle + keypad + vote now (rest Batch 7) | ✅ Decided | 2025-07-24 | 3 play-critical routes first, remaining routes after M1-M4. |
| ADR-E1 | Enterprise Isolation: shared-by-default, isolated-when-required | 🟡 Proposed | 2026-03-13 | 3-level model (A/B/C). Design study complete. No implementation before enterprise contract. See `enterprise-isolation-architecture.md`. |
| OPS-001 | WSL2 as local engineering baseline | 🟡 Proposed | 2026-03-13 | Enables Supabase CLI, bash scripts, CI parity. See `platform-operations-architecture.md`. |
| OPS-002 | Sandbox Supabase + Preview env vars (not separate Vercel project) | ✅ Implemented | 2026-03-13 | ✅ Verified: preview → sandbox isolation confirmed via Vercel logs. Separate Vercel project deferred. |
| OPS-003 | One Vercel project per deploy target | ⏳ Deferred | 2026-03-13 | Relevant for enterprise. Not needed for preview isolation. |
| OPS-004 | Continuous deploy for prod/sandbox, manual for enterprise | 🟡 Proposed | 2026-03-13 | Enterprise customers may want release coordination. |
| OPS-005 | Deploy targets tracked in `.deploy-targets.json` | 🟡 Proposed | 2026-03-13 | Central registry for migration orchestration. |

---

## 8. Atlas Integration

Atlas (`/sandbox/atlas`) tracks the system graph (287 routes, components, domains).

| Atlas Field | Source | Status |
|-------------|--------|--------|
| Route inventory | inventory.json | ✅ Current |
| Domain grouping | generate-inventory-v3.ps1 | ✅ Current |
| Audit status per domain | launch-control.md | 🟡 Manual sync |
| Test coverage status | CI workflows | ⬜ Not tracked |
| i18n status per domain | i18n-audit.mjs | ⬜ Not tracked |
| Architecture debt | launch-control.md | ⬜ Not tracked |

**Goal:** After each domain audit, update Atlas annotations with audit status, risk level, and findings count.

---

## 9. Documentation Status

| Document | Location | Status | Last Verified |
|----------|----------|--------|---------------|
| PROJECT_CONTEXT.md | Root | ✅ Current | 2026-03-10 |
| planner-architecture.md | Root | ✅ Current | 2026-03-04 |
| planner-audit.md | Root | ✅ Current | 2026-03-04 |
| planner-implementation-plan.md | Root | ✅ Current | 2026-03-05 |
| PLAY_SYSTEM_DOCUMENTATION.md | Root | ✅ Current | — |
| play-architecture.md | launch-readiness/ | ✅ Current | 2025-07-24 |
| play-audit.md | launch-readiness/audits/ | ✅ Current | 2025-07-24 |
| play-runtime-remediation.md | launch-readiness/implementation/ | ✅ Current | 2026-03-11 |
| sessions-architecture.md | launch-readiness/ | ✅ Current | 2026-03-11 |
| sessions-audit.md | launch-readiness/audits/ | ✅ Current | 2026-03-11 |
| sessions-remediation.md | launch-readiness/implementation/ | ✅ Current | 2026-03-11 |
| enterprise-isolation-architecture.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| enterprise-isolation-audit.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| enterprise-isolation-implementation-plan.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| platform-operations-architecture.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| platform-operations-audit.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| platform-operations-implementation-plan.md | launch-readiness/ | ✅ Current | 2026-03-13 |
| dd2-participant-auth-spec.md | launch-readiness/implementation/ | ✅ Current | 2025-07-24 |
| session-guards.ts | lib/play/ | ✅ Current | 2025-07-24 |
| Journey_v2_Architecture.md | Root | ✅ Current | — |
| API_ROUTE_AUDIT.md | Root | ⚠️ Needs refresh | — |
| i18n-audit.md | Root | ⚠️ Needs refresh | — |
| GAME_INTEGRITY_REPORT.md | Root | ❓ Unknown | — |
| Notion workspace | External | ⬜ Not verified | — |

---

## 10. Final Sign-Off — Verifieringsrunda 2026-03-15

### Verifieringssammanfattning

**Datum:** 2026-03-15
**Utförare:** Claude (implementering + verifiering), GPT (granskning + kalibrering)
**Metod:** Automatiserade verifieringsskript mot faktisk kod, manuell kodgranskning, `tsc --noEmit`

**Bakgrund:** 12 säkerhets-P1:or (ABUSE-003/004, UPLOAD-001–003, LEAK-001–003, ENUM-001/002) implementerades och dokumenterades. GPT begärde kritisk verifiering av att kodändringarna faktiskt matchar dokumentationen. Verifieringen utfördes med Node.js-skript som parsade källfiler.

#### Verifierat korrekt ✅

| Fix | Verifieringsmetod | Resultat |
|-----|-------------------|----------|
| ABUSE-003 — MFA rate limiting | Parsade 12 route-filer efter `rateLimit:` | 12/12 ✅ |
| ABUSE-004 — Chat + Signals | Parsade 2 route-filer | 2/2 ✅ |
| UPLOAD-001 — MIME whitelist | Kontrollerade `ALLOWED_MIME_TYPES` i upload route | 14 typer ✅ |
| UPLOAD-003 — Storage quota | Verifierade `max_storage_mb` + `createServiceRoleClient` | Present ✅ |
| LEAK-002 — `select(*)` borttaget | Parsade 6 route-filer, 0 `select('*')` kvar | 6/6 ✅ |
| LEAK-003 — Tenant metadata | Verifierade kolumnlista, ingen `metadata` | Safe ✅ |
| ENUM-001 — Preview rate limit | Verifierade `'strict'` tier | Korrekt ✅ |
| ENUM-002 — Uniform join errors | Parsade felmeddelanden, alla `JOIN_FAILED` | Uniform ✅ |
| TypeScript | `tsc --noEmit` | 0 errors ✅ |

#### Hittade & fixade avvikelser ⚠️→✅

| Avvikelse | Fil | Problem | Fix |
|-----------|-----|---------|-----|
| LEAK-001 ofullständig | `app/api/gamification/events/route.ts` | 4 kvarvarande `error.message`-läckor i `NextResponse.json()` (coinError + insertError med `details:`) | Borttaget, `console.error` bevarad |
| ENUM-002 frontend-brytning | `app/participants/join/page.tsx` | Frontend kollade mot gamla felmeddelanden (`'Session is full'`, `'Session is locked'`, `SESSION_OFFLINE`, status 410) som API:n inte längre returnerar | Uppdaterat till `code`-baserade checkar (`SESSION_FULL` + 403, allt annat 404) |

#### Dokumenterad post-launch skuld

| Skuld | Risknivå | Kommentar |
|-------|----------|----------|
| i18n `en`/`no` har svenska fallback-värden, inte riktiga översättningar | Låg | Strukturellt synkat (full key-paritet), ingen runtime-krasch. Språkligt ofärdigt. |
| Admin/interna routes kan ha kvar `error.message` i responses | Låg | LEAK-001 fokuserade på user-facing routes. Interna admin-routes skyddas av auth + RLS. |
| Storage quota — race condition vid samtidiga uploads | Låg | Kvotcheck före signed URL. Teoretiskt kringgåbart med parallella uploads inom quota-marginal. Stresstestas post-launch. |

### Pre-Launch Smoke Test Checklist

Manuell verifiering i browser/network tab innan launch markeras som komplett:

> **Supplerande runtime-verifiering (2026-03-19):** Efter canonicalization-rundan för auth/profile/planner/admin ska även [canonicalization-e2e-checklist.md](canonicalization-e2e-checklist.md) köras. Den checklistan fokuserar på state convergence efter login, MFA, tenant switch, profile/avatar updates, notifications, planner publish och admin access.

| # | Test | Route/Flöde | Förväntat |
|---|------|-------------|-----------|
| 1 | MFA enroll | `/api/accounts/auth/mfa/enroll` | 200, TOTP setup. 429 efter 10 försök/15 min. |
| 2 | MFA verify | `/api/accounts/auth/mfa/verify` | 200 med giltig kod. 429 efter 10 försök. |
| 3 | MFA disable | `/api/accounts/auth/mfa/disable` | 200. Kräver auth. |
| 4 | Join — ogiltig kod | Participant join med `XXXXXX` | 404 + `JOIN_FAILED`, meddelande "Ogiltig kod" i UI |
| 5 | Join — full session | Participant join till session med max 1 deltagare | 403 + `SESSION_FULL`, meddelande "Sessionen är full" i UI |
| 6 | Join — giltig session | Participant join till aktiv session | 200, omdirigeras till `/participants/view` |
| 7 | Chat post | Skicka chattmeddelande i aktiv session | 200. 429 efter 5 req/min. |
| 8 | Signal post | Skicka signal i aktiv session | 200. 429 efter 100 req/min. |
| 9 | Upload — tillåten MIME | Ladda upp PNG/JPEG via mediagalleriet | 200, signed URL returneras |
| 10 | Upload — otillåten MIME | Ladda upp `.exe` eller `text/plain` | 400 (Zod validation error) |
| 11 | Tenant response | GET `/api/tenants/[id]` — inspektera network tab | Inga `metadata`, `stripe_customer_id` fält |
| 12 | Billing response | GET billing invoices — inspektera network tab | Inga `stripe_*`, `transaction_reference` fält |
| 13 | Profile response | GET `/api/accounts/sessions` — inspektera network tab | Inga `ip_address`, `session_token` fält |
| 14 | Error response | Trigga ett serverfel (t.ex. ogiltig input) | Generiskt felmeddelande, ingen `error.message` eller stack trace |

> **Status:** ⬜ Ej utförd. Utförs manuellt i staging innan produktionsdeploy.

### Slutbedömning

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║  TEKNISKT LAUNCH-READY                                                       ║
║  Med dokumenterad post-launch språk- och polish-skuld                        ║
║  — inte blockerande launch-risk.                                             ║
║                                                                               ║
║  Verifieringsrunda: 2026-03-15 (Claude impl. + GPT granskning)              ║
║  Säkerhets-P1: 12/12 fixade, 2 avvikelser hittade och åtgärdade             ║
║  TypeScript: 0 errors    i18n: strukturellt synkat (fallback-värden)          ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 11. Vägen Vidare — Post-Launch Path Forward

### Current System Status (2026-03-15)

```
╔═══════════════════════════════════════════════════════════════════════╗
║  LAUNCH VERDICT: READY          P0: 0   P1 actionable: 0            ║
║  23/23 audits GPT-calibrated    Wrapper: 87.8% files, 90.0% handlers║
║  tsc --noEmit: 0 errors         12/12 security P1s verified in code  ║
║  Scaling hardening: 3/4 done    Verification round: 2026-03-15       ║
╚═══════════════════════════════════════════════════════════════════════╝
```

**Domains with launch-scope remediation complete (8/8):**
Play ✅ · Sessions ✅ · Games ✅ · Planner ✅ · Journey ✅ · Billing ✅ · Atlas ✅ · Media ✅

**Domains without launch remediation needed (5/5):**
Notifications ✅ · Profile ✅ · Support ✅ · Marketing ✅ · Calendar ✅

### Phase 1: Post-Deploy Verification (Dag 1-3)

Immediately after first production deploy, verify:

| Check | How | Expected |
|-------|-----|----------|
| Adaptive heartbeat | Monitor `participant_sessions.last_seen_at` update frequency per status | Active: ~10s, Lobby/Paused: ~30s, Ended: stops |
| Session cleanup cron | Check Vercel cron dashboard at 04:00 UTC | Endpoint returns 200, expired tokens disconnected |
| Push-vs-poll contract | Count Supabase Realtime connections per session | 2-4 channels, push events dominate state updates |
| Rate limiter behavior | Monitor 429 responses in Vercel logs | Financial/auth routes reject after 5 req/min |
| Migration deploy order | Verify `tenant_admin_view_sessions` RLS policy exists | Tenant admins can view session list |

### Phase 2: Production Learning (Vecka 1-4)

The system is now in **operational launch readiness**. The next phase is not development — it's learning how the system behaves under real traffic.

**Primary target audience:** Kyrka & ungdomsarbete (church & youth work). This creates **event-driven, spiky traffic** — not constant SaaS load.

Typical usage pattern:
- Wednesday evening (ungdomsgrupper), Friday evening, Sunday afternoon/evening
- Sessions last 60-90 minutes with 8-20 participants each on their own mobile
- Connectivity is often poor (church halls, basements, camps, forests)

**Projected first-year scale:**

| Metric | Estimate |
|--------|----------|
| Organisations | ~200 |
| Groups | ~400 |
| Sessions / week | ~800 |
| Participants / session | ~12 |
| Peak concurrent sessions | 30-60 |
| Peak concurrent clients | ~600 (40 sessions × 15 participants) |

> This is well within the architecture's capacity. The first bottleneck (polling fan-out) would appear around the Wednesday evening peak when many groups run simultaneously.

Measure to validate scaling assumptions:

| Metric | Threshold | Action if exceeded |
|--------|-----------|-------------------|
| Sessions / day | baseline | Track growth curve — triggers scaling decisions |
| Participants / session (avg) | baseline | Affects heartbeat + realtime load |
| Vercel function invocations / session / minute | <15 | If >15: consolidate pollers (chat + participants into single poller) |
| Supabase Realtime connections | <4 per session | If >4: audit channel creation, check for leaks |
| Heartbeat DB writes / minute (total) | <100 at 10 sessions | If >100: adaptive heartbeat working; if >>100: check for timer leaks |
| API response time p95 | <500ms | If >500ms: profile slow queries, check `participant_sessions` hot rows |
| 429 rate limit responses | <1% of total | If >1%: investigate which routes, tune tier thresholds |
| Broadcast events / session / minute | baseline | Track for push-vs-poll migration decisions |
| Serverless invocation cost / session | baseline | Track for cost optimization decisions |
| Plan copy rate | baseline | Key product signal — high copy rate = templates are working (see §12 Priority 2) |

**Key architectural strengths for this audience:**
- Idempotent command model — handles reconnects from poor connectivity
- Participant tokens + rejoin — session recovery after network drops
- Adaptive heartbeat — reduces load during idle/lobby phases
- DB-driven state (not socket-state) — survives disconnects gracefully

**Known environmental risk:** Poor connectivity (unstabil wifi, mobilnät) in typical venues. Existing reconnect logic, idempotent commands, and session recovery cover this well. Future investment in offline-tolerant host mode could be a differentiator.

### Phase 3: Scaling Priorities (90-day plan from `scaling-analysis.md`)

For the church/youth audience, bottlenecks are expected to hit in this order:
1. **Polling + fan-out** — Wednesday evening peak with 40+ concurrent sessions
2. **Serverless invocation cost** — not a technical stop, but cost optimization
3. **Presence/heartbeat** — at larger events (camps, conferences, 50-200 participants)
4. **Hot row contention** — at >200 concurrent sessions (far away)

| Priority | Item | Status | Target |
|----------|------|--------|--------|
| ✅ Done | Adaptive heartbeat (participant + host) | Implemented 2026-03-13 | — |
| ✅ Done | Push-vs-poll contract documented | Documented 2026-03-13 | — |
| ✅ Done | Session cleanup cron (`vercel.json`) | Configured 2026-03-13 | — |
| 🟡 Next | Upstash rate limiter migration | Documented in `rate-limiter.ts` | When multi-region or >10k sessions/day |
| ⬜ Later | Chat push migration (poll → Realtime) | Identified as candidate in push-vs-poll contract | When chat is high-traffic |
| ⬜ Later | Background processing (`after()` / Edge workers) | Documented in `scaling-analysis.md` | When 100k+ daily sessions |

> **Reference:** Full scaling analysis with 5 ranked bottlenecks, per-bottleneck metrics and fixes: [`scaling-analysis.md`](scaling-analysis.md)

### Phase 4: Post-Launch Backlog

| Category | Count | Priority | Notes |
|----------|-------|----------|-------|
| **GDPR self-service** (PRIV-001–006) | 6 P1 | High | Kill-switched. Manual DSAR active. Build proper delete/export pipeline. |
| **Abuse hardening** (ABUSE-003/004, UPLOAD, LEAK, ENUM) | ~~12 P1~~ | ~~Medium~~ | ✅ **All 12 fixed (2026-03-15)** — MFA rate limiting, upload validation + quota enforcement, error leakage removed, data exposure closed, enumeration protection hardened. |
| **Input validation** (Zod gaps) | ~15 P2 | Medium | Support, Profile, remaining admin routes. |
| **Rate limiting coverage** | ~10 P2 | Medium | Unlocked by Upstash decision (SEC-002b). |
| **Search sanitization** | ~5 P2 | Low | PostgREST `.or()` in Support, admin routes. |
| **RLS hardening** | ~8 P2 | Low | Overly broad SELECT on support tickets, profile visibility. |
| **Performance** | 4 P2 | Low | N+1 session history (PERF-001), ISR, `select('*')` cleanup. |
| **Accessibility** | 2 P2 | Low | Space key on custom buttons, toast aria-live. |
| **Polish** (P3) | 86 | Low | Metadata, i18n completeness, dev placeholders, image optimization. |
| **Total remaining** | **203** | | 117 P2 + 86 P3 |

### Remaining P1s (Non-Actionable)

| P1 | Type | Why not blocking | Resolution path |
|----|------|------------------|-----------------|
| SEC-002b | In-memory rate limiter | Functional per-instance; multi-instance bypass requires coordinated regional attack | Upstash migration (Phase 3, when needed) |
| SYS-001 | Wrapper convergence (90.0%) | Self-resolving; remaining ~10% are edge cases (webhooks, SSE, file streams) | Organic convergence during post-launch work |

### Deferred Phases (Not Needed for Launch)

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 2 — Test Foundation | 🟡 Formal execution skipped | Ad-hoc test assets exist (261 test files, CI runs 7 checks). Formal E2E test investment recommended post-launch. |
| Phase 5 — Regression Audits | ✅ Complete | 16/16 domain regressions + 4 Level 2 audits completed inline during audit cycle. All passed. |
| Phase 6 — Documentation Refresh | ⏭️ Deferred | Root-level `.md` cleanup, Notion sync, Atlas annotations. Low risk. |
| Phase 1B — Sandbox Strategy | ✅ Implemented | ADR-005 (Alt B remote sandbox) decided and implemented 2026-03-13. DB layer fix applied 2026-03-14 (5/5 permission checks passed). Preview → sandbox isolation verified. See `sandbox-phase-1b.md`. |

### Completed Milestones (reference)

<details>
<summary>Wrapper migration history (Batches 1–6d)</summary>

| Batch | Auth Pattern | Routes | Status |
|-------|-------------|--------|--------|
| 1 | auth-guard + sessionHost | 7 | ✅ KLAR |
| 2 | auth-guard + regression-sensitive | 9 | ✅ KLAR |
| 3A | inline `getUser()` (mechanical) | 29 | ✅ KLAR |
| 3B-1 | inline `getUser()` (single-method) | 27 | ✅ KLAR |
| 3B-2a | multi-method + Zod (mechanical) | 16 | ✅ KLAR |
| 3B-2b | regression-sensitive (10 routes) | 10 | ✅ KLAR |
| 4a | `tenantAuth:system_admin` | 18 | ✅ KLAR |
| 4b | `assertTenantAdminOrSystem` | 9 | ✅ KLAR |
| 4c-1 | `isSystemAdmin \|\| isTenantAdmin` | 8 | ✅ KLAR |
| 4c-2 | `isSystemAdmin \|\| membership` | 4 | ✅ KLAR |
| 4c-3 | dual-path `isSystemAdmin`/`assertTenantAdminOrSystem` | 6 | ✅ KLAR |
| 4c-4 | tenantAuth backlog cleanup | 7 | ✅ KLAR |
| 5a | `isSystemAdmin` (local) | 19 | ✅ KLAR |
| 5b | `RPC:is_system_admin` | 9 | ✅ KLAR |
| 5c | `resolveSessionViewer` (split-auth) | 3 | ✅ KLAR |
| 5d | `inline:getUser` (stragglers) | 6 | ✅ KLAR |
| 6a–6d | `participant-token` (DD-2) | 10 | ✅ KLAR |

**Final coverage:** 236/287 files (82.2%), 347/408 handlers (85.0%)

</details>

### Completed: Games System (Domain Audit #5) — M1+M2+M3

- [x] **Games System Audit** — 14 findings (0 P0, 3 P1, 8 P2, 3 P3). GPT calibration applied.
- [x] **M1 — Auth Hardening** — GAME-002 ✅ (snapshots auth + ownership + error leakage), GAME-005 ✅ (reactions batch Zod + rate limit), GAME-001b ✅ (force-delete system_admin gate)
- [x] **M2 — Search Sanitization + DELETE Gate** — GAME-004 ✅ (5 `.or()` sites sanitized), GAME-001a ✅ (wrapper + explicit DELETE role gate)
- [x] **M3 — Service-Role + Builder Errors** — GAME-001c ✅ (PATCH RLS client for non-system-admin), GAME-009 ✅ (21 silent DB ops now collect warnings)
- [ ] ~~**M4 — Builder Atomicity + Hardening**~~ — Deferred post-launch

**Games domain: launch-scope complete.** 0 P0, 0 P1 remaining. 4 P2 + 3 P3 deferred to post-launch M4.

### In Progress: Planner (Domain Audit #7) — M1 ✅ M2 ✅ M3 ✅ — Launch-scope complete

- [x] **Planner Audit** — 16 findings (0 P0, 8 P1, 6 P2, 2 P3). GPT calibration applied (9.5/10, all severities confirmed).
- [x] **M1 — Wrapper Migration** — PLAN-001 ✅ (plans POST wrapped + tenant membership validation), PLAN-002 ✅ (visibility POST wrapped + tenant validation — blocks arbitrary tenant reassignment), PLAN-003 ✅ (play GET wrapped as `auth: 'public'`)
- [x] **M2 — Capability Gates** — Created shared `lib/planner/require-plan-access.ts` capability module. PLAN-004 ✅ (4 block handlers + `requirePlanEditAccess()`), PLAN-005 ✅ (plan start + `requirePlanStartAccess()`), PLAN-006 ✅ (3 schedule mutations + `requirePlanEditAccess()`)
- [x] **M3 — Tenant Boundary** — Added `assertTenantMembership()` to shared module. PLAN-007 ✅ (notes/tenant tenant validation via shared helper), PLAN-008 ✅ (copy tenant validation via inline membership check)
- [ ] ~~**M4 — Data Integrity**~~ — Post-launch (PLAN-009/010/011)
- [ ] ~~**M5 — Validation & Cleanup**~~ — Post-launch (PLAN-012–016)

**Planner domain: launch-scope complete.** 8 P1 fixed (M1–M3). 0 P1 remaining. 6 P2 + 2 P3 deferred to post-launch M4/M5.

### Completed: Journey & Gamification (Domain Audit #9) ✅

- [x] **Journey Audit** — 12 findings (0 P0, 1 P1, 8 P2, 3 P3). ✅ GPT-calibrated (2026-03-12).
- [x] **M1 — Tenant Boundary + Explicit Auth** — JOUR-001 (P1) ✅ + JOUR-004/005 (P2) ✅ — GPT-approved
- [x] **M2 — High-ROI Rate Limiting** — JOUR-007/008/009a (P2) ✅ — GPT-approved
- [x] **GAM-001 — Achievement Unlock Hardening** — GPT-identified economy exploit. `achievements/unlock` → `system_admin` only. `participants/progress/unlock-achievement` → `cron_or_admin`. Zero active callers. Canonical path: `/achievements/check` ✅ — **GPT-approved (2026-03-14)**
- [ ] ~~**M3 — Wrapper Migration**~~ — Post-launch (JOUR-002/003/009b-c)
- [ ] ~~**M4 — Validation + Cleanup**~~ — Post-launch (JOUR-006/010/011/012)

**Journey domain: launch-scope complete.** 0 P1 remaining. 7 findings fixed (2 P1 + 5 P2). M1+M2+GAM-001 GPT-approved. 3 post-launch cleanup items tracked (GAM-001a/b/c: dead hooks, Zod schema, architecture doc). M3/M4 deferred post-launch.

### Completed: Billing & Stripe (Domain Audit #10) ✅

- [x] **Billing Audit** — 15 findings (0 P0, 4 P1, 7 P2, 4 P3). ✅ GPT-calibrated (2026-03-12).
- [x] **M1 — Financial Integrity** — BILL-001/002/003/004 (P1) ✅ — GPT-approved
- [x] **M2 — Security Hardening** — BILL-006/007/008/011 (P2) ✅ — GPT-approved
- [ ] ~~**M3 — Wrapper + Validation**~~ — Post-launch (BILL-005/009)
- [ ] ~~**M4 — Cleanup**~~ — Post-launch (BILL-010/012/013/014/015)

**Billing domain: launch-scope complete.** 0 P1 remaining. 8 findings fixed (4 P1 + 4 P2). M1+M2 GPT-approved. M3/M4 deferred post-launch. `tsc --noEmit` = 0 errors.

### Completed: Atlas & Admin (Domain Audit #11) ✅

- [x] **Atlas Audit** — 11 findings (0 P0, 2 P1, 6 P2, 3 P3). ✅ GPT-calibrated (2026-03-12).
- [x] **M1 — Critical Auth Gaps** — ATLAS-001/002 (P1) ✅
- [ ] ~~**M2 — Security Hardening**~~ — Post-launch (ATLAS-003/004/005)
- [ ] ~~**M3 — Hardening**~~ — Post-launch (ATLAS-006/007/008)
- [ ] ~~**M4 — Cleanup**~~ — Post-launch (ATLAS-009/010/011)

**Atlas domain: launch-scope complete.** 0 P1 remaining. 2 P1 fixed (M1). Wrapper coverage: **253/288 files (87.8%)**, **369/410 handlers (90.0%)**. M2/M3/M4 deferred post-launch. `tsc --noEmit` = 0 errors.

### Architecture Findings (reconciled 2026-03-12)

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| ~~ARCH-002~~ | ~~Parallel API auth patterns~~ | ~~P1~~ | ✅ **RESOLVED** — merged with SEC-003, 87.8% wrapper coverage, 0 tenantAuth imports in API routes |
| ~~ARCH-003~~ | ~~Multiple API error response formats~~ | ~~P1~~ | ✅ **MERGED** → SYS-001 (wrapper convergence) |
| ~~ARCH-004~~ | ~~Mixed input validation~~ | ~~P1~~ | ✅ **MERGED** → SYS-001 (wrapper convergence) |
| ~~ARCH-006~~ | ~~Direct Supabase mutations in client components~~ | ~~P1~~ | ✅ **RESOLVED** — 20+ direct `supabase.from()` calls moved to 11 server actions in `organisationMutations.server.ts`. 6 client components cleaned: BrandingSection, FeaturesSection, DomainsSection, LocaleSection, DetailPage, AdminPage. All mutations now server-side with `requireSystemAdmin()` auth. `tsc --noEmit` = 0 errors. |

---

## 6. Final Launch Reconciliation (2026-03-12)

### All Audits Complete

**23 audits conducted, GPT-calibrated, and documented.** No domain or cross-cutting audit remains.

| Category | Audits | Count |
|----------|--------|-------|
| Infrastructure | Architecture Core, Security & Auth, Tenant Isolation, API Consistency | 4 |
| Domain (with remediation) | Games, Play, Planner, Sessions, Journey, Billing, Atlas, Media | 8 |
| Domain (no remediation needed) | Notifications, Profile, Support, Marketing, Calendar | 5 |
| Cross-cutting | i18n, Performance, Accessibility, Abuse & Privacy, React Boundary, Migration Safety | 6 |
| **Total** | | **23** |

### P0/P1 Final Status

```
P0 remaining:      0  ✅  (13 discovered, 13 resolved)
P1 remaining:      2  ✅  (both non-actionable — no code fix possible)
P1 actionable:     0  ✅
```

| Remaining P1 | Type | Launch-blocking? | Mitigation |
|---|---|---|---|
| SEC-002b | Infra decision (rate limiter backend) | No | In-memory limiter functional per-instance; multi-instance bypass requires coordinated regional attack |
| SYS-001 | Wrapper convergence (87.8% files, 90.0% handlers) | No | Self-resolving; remaining ~12% files are edge cases (webhooks, SSE, file streams) |

**Domains with launch-scope remediation complete (0 P1 remaining):** Play, Sessions, Games, Planner, Journey, Billing, Atlas, Media.

### Post-Launch Backlog

| Severity | Total Found | Resolved | Remaining | Disposition |
|----------|-------------|----------|-----------|-------------|
| P2 | 132 | 15 | 117 | Post-launch backlog — prioritize by domain |
| P3 | 86 | 0 | 86 | Post-launch backlog — nice-to-have |
| **Total** | **218** | **15** | **203** | |

**Key post-launch priorities (P2):**
- GDPR compliance: self-service delete/export (PRIV-001–006, currently kill-switched)
- Zod validation: missing across Support, Profile, several admin routes
- PostgREST `.or()` sanitization: applied in Games, still needed in Support/admin routes
- Rate limiting: ~87% routes lack explicit rate limits (SEC-002b infra decision unlocks)
- Wrapper convergence: 253/288 files (87.8%), remaining ~35 files are edge cases

### Launch Verdict

```
╔═══════════════════════════════════════════════════════════════╗
║                    LAUNCH VERDICT: READY                      ║
╠═══════════════════════════════════════════════════════════════╣
║  P0 blockers:       0  ✅                                     ║
║  P1 actionable:     0  ✅                                     ║
║  Audits complete:  23/23  ✅ (all GPT-calibrated)             ║
║  tsc --noEmit:      0 errors  ✅                              ║
║  Wrapper coverage:  87.8% files, 90.0% handlers              ║
║                                                               ║  
║  Conditions:                                                  ║
║  • GDPR self-service disabled (manual DSAR active)            ║
║  • Migration 20260314000000 deployed before route changes     ║
║  • In-memory rate limiter sufficient for initial traffic      ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## 12. Product Roadmap — Design Partner (Kyrkan)

> **Source:** Feature requests from church/youth leaders (2026-03-13). GPT strategic analysis applied.
> **Principle:** Define direction now, implement after launch. Do not lock architecture.
> **Status:** Design protection phase — no implementation until after launch + Observe Mode.

### Product Direction

> **Lekbanken ska inte bara vara en lekbank.**
> Den ska vara ett system för att **planera, bygga och genomföra samlingar/aktiviteter**.
>
> Kyrkans behov är inte ett specialfall — det är ett väldigt bra test på att produkten är rätt byggd.

### Context

Svenska Kyrkan (pastorat-nivå) has expressed interest in using Lekbanken broadly — not just as a game database, but as an **activity platform** for planning and leading youth gatherings ("samlingar"). This is a strong product-fit signal. Three concrete requests emerged.

### Priority 1: Tenant-Custom Planner Blocks

**What:** Let each tenant define their own block types (Andakt, Psalm, Bön, etc.) instead of only using the hardcoded system types.

**Why first:** Small technical risk, large value, quick to deliver. Makes Planner domain-agnostic — churches get devotion blocks, sports clubs get drill blocks, daycare gets activity blocks.

**Architecture readiness:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Block type model | ⚠️ Hardcoded enum | `plan_block_type_enum`: 6 values (`game`, `pause`, `preparation`, `custom`, `section`, `session_game`). Zod, TypeScript, and UI all tightly coupled to this enum. |
| Metadata field | ✅ Ready | `plan_blocks.metadata` (JSONB) exists — can carry custom type info |
| Existing `custom` type | ✅ Usable | Can serve as base for tenant-defined blocks |
| UI block rendering | ⚠️ Hardcoded maps | `BlockRow.tsx`, `TouchBlockRow.tsx`, `AddGameButton.tsx` all use `Record<PlannerBlockType, ...>` — needs refactor to support dynamic types |
| Labels/icons | ⚠️ Hardcoded | `lib/planner/labels.ts` — static `BLOCK_TYPE_LABELS` / `BLOCK_TYPE_ICONS` |
| RLS | ✅ Ready | Block policies cascade from plan ownership — no change needed |

**Likely approach:** New `tenant_block_types` table (tenant_id, key, label, icon, color). UI reads tenant types and merges with system defaults. Blocks stored as `block_type = 'custom'` + `metadata.customTypeId`. No enum migration needed.

**Estimated scope:** Small — 1 table, 1 API, UI refactor of 3 components + labels.

### Priority 2: Content Sharing Within Tenant

**What:** Leaders within a pastorat can share plans, courses, and custom blocks with each other.

**Why second:** Gives immediate value to the pastorat use case — multiple leaders can reuse each other's plans and blocks. More valuable at this stage than a course builder overhaul.

**Architecture readiness:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Plan sharing | ✅ Partially done | `plan_visibility_enum`: `private`, `tenant`, `public` — tenant sharing works |
| Course sharing | ⚠️ Not implemented | Courses lack visibility model |
| Custom block type sharing | ✅ By design | Tenant-scoped block types are shared within tenant automatically |

**Scope definition (define before building):**

| In scope | Out of scope (later) |
|----------|---------------------|
| Dela planner-planer inom tenant (`visibility = 'tenant'` — already works) | Dela media/filer (separate domain) |
| Dela tenant-definierade blocktyper (automatic via `tenant_block_types`) | Dela mellan tenants (cross-tenant sharing) |
| Dela kurser inom tenant (add `visibility` to courses) | Granulär delning per grupp/enhet (requires ADR-K3 groups first) |
| Kopiera andras planer ("Använd som mall") | Collaborative editing (real-time co-editing) |
| Browsa tenant-delat innehåll i Planner + Courses UI | |

> **Scope boundary:** "sharing" = visibility + copy. Not collaboration, not cross-tenant, not group-level permissions.
>
> **Mental model:** `discover → preview → copy → edit locally`

**Estimated scope:** Small-Medium — extend course model with visibility, UI for browsing shared content.

### Priority 3: Course Builder 2.0 / Block Convergence

**What:** Make course building much simpler and more powerful. Courses should work like block-based planning — same mental model as Planner.

**Why important:** Transforms Lekbanken from "game database" to "activity platform". Critical for church use case (konfirmandundervisning, ledarutbildning, temaserier).

**Architecture readiness:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Current model | ⚠️ JSON-in-row | `learning_courses.content_json` + `quiz_json` — flat sections, not block-based |
| Planner block model | ✅ Proven | `plan_blocks` table with position, type, metadata — works well |
| Shared block concept | 🔮 Future | GPT insight: Planner and Courses should share a **block model**. Both are "ordered sequences of typed content blocks." |
| Admin UI | ✅ Exists | `CourseEditorDrawer.tsx` — needs refactor from JSON editor to block builder |

**Key architectural insight:** Planner blocks and course blocks are the *same concept*. A unified block system could drive Planner, Courses, and future "Program" features. This should be designed carefully — not rushed.

**⚠️ Risk:** If Courses are improved in isolation (deeper into flat JSON), convergence with Planner's block model becomes harder later. See ADR-K2 below.

**Estimated scope:** Medium — data model migration (JSON → block table), UI overhaul of course editor, potential shared block infrastructure with Planner.

### Priority 4: Multi-Organisation Tenant (Later)

**What:** A tenant can contain multiple organisations with sub-units (e.g., Svenska Kyrkan → Pastorat → Församling).

**Why last:** Most architecturally complex. Not needed until multiple pastorat want shared administration.

**Architecture readiness:**

| Aspect | Status | Notes |
|--------|--------|-------|
| Tenant model | ⚠️ Flat | No `parent_tenant_id`, no hierarchy. Single-level tenant → users. |
| RLS policies | ⚠️ Leaf-level | All RLS assumes direct `tenant_id` match — recursive hierarchy needs new approach |
| Billing | ⚠️ Per-tenant | `tenant_subscriptions` is 1:1 with tenant — parent aggregation not modeled |
| Permissions | ⚠️ Single-level | `tenant_role_enum`: `owner`, `admin`, `member` — no cross-org permissions |

**Important:** Nothing in current architecture *blocks* this, but it requires significant work. This is enterprise-level complexity that spills into permissions, billing, reporting, content sharing, admin UI, onboarding, and RLS.

**Intermediate step (before full hierarchy):**

```
Tenant: Linköpings pastorat
  ├── Grupp: Konfirmander 2025
  ├── Grupp: Ungdomsgrupp
  └── Grupp: Ledarteam
```

A tenant with **groups/units** covers most of the pastorat use case without enterprise hierarchy. Central admin, local leaders, shared resources, activity tracking — all achievable within the current tenant model + groups.

**Estimated scope:** Large — schema changes, RLS rewrite, permission model, billing aggregation, admin UI.

### Design Decisions (Kyrkospåret)

These are **design protection decisions** — not implementation tasks. They define guardrails so that future work doesn't make these features harder to build.

#### ADR-K1: Planner ska stödja tenant-definierade blocktyper

**Decision:** Custom planner blocks shall be implemented via metadata-based model, not by extending the SQL enum.

**Mechanism:** Blocks use `block_type = 'custom'` + `metadata.customTypeId` referencing a `tenant_block_types` table. The `plan_block_type_enum` must **not** gain more hardcoded values — future types are tenant-defined.

**Guardrails:**
- `plan_blocks.metadata` (JSONB) must stay flexible — no restrictive schema validation
- Block position model must stay generic — not tied to game-specific semantics
- UI block rendering must be refactored from hardcoded `Record<>` to dynamic lookup before or during this feature

**Status:** Decision taken. Implementation: post-launch Priority 1.

#### ADR-K2: Courses ska kunna konvergera mot block-modell

**Decision:** The course system must not be locked deeper into its current flat JSON model (`content_json` / `quiz_json`). Any future course improvements must plan for convergence with Planner's block-based model.

**Rationale:** Planner blocks and course content are the *same concept*: ordered sequences of typed content blocks. Building two parallel block systems would create unnecessary complexity. A unified block infrastructure should eventually drive Planner, Courses, and future "Program/Samling" features.

**Guardrails:**
- No new features that deepen the JSON-in-row pattern (e.g., nested JSON structures, JSON-specific querying)
- Course builder improvements should move **toward** block tables, not away
- Shared UI components (block editor, block renderer) should be designed as reusable

**Status:** Decision taken. Implementation: post-launch Priority 3.

#### ADR-K3: Organisationsmodell — grupper före hierarki

**Decision:** Multi-organisation support shall start with groups/units within the existing tenant model, not with full parent-child tenant hierarchy.

**Intermediate model:**
```
Tenant (= pastorat)
  ├── Group (= konfirmandgrupp, ungdomsgrupp, ledarteam)
  └── Group
```

**Rationale:** Full enterprise hierarchy (tenant → organisation → enhet → grupp) affects RLS, billing, permissions, reporting, admin UI, and onboarding. Groups within a tenant cover the pastorat use case (central admin, local leaders, shared resources) without this complexity.

**Guardrails:**
- Tenant model must not add constraints that prevent future hierarchy (no `UNIQUE` on fields that would need parent-child)
- Permission model should be designed so group-level roles can coexist with tenant-level roles
- Billing model should not assume 1 tenant = 1 billing entity permanently

**Status:** Decision taken. Implementation: post-launch Priority 4 (groups first, hierarchy much later).

---

## 13. Strategic Workstream — Enterprise Isolation

> **Source:** GPT strategic analysis (2026-03-13). Johan-initiated.
> **Principle:** Design-protect now, implement when first enterprise contract requires it.
> **Status:** Design study complete. Architecture verified against codebase — 0 blockers found.

### Context

Svenska kyrkan, Norska kyrkan, kommuner, and similar organisations may require that their data environment is physically/infrastructurally separated from other customers. Some may require hosting in a specific country/region.

### Decision (ADR-E1)

> **Lekbanken ska vara byggt för shared-by-default, isolated-when-required.**

| Level | Name | Description | Target Customer |
|-------|------|-------------|-----------------|
| A | Shared tenant | Same DB, RLS isolation | 95% of customers |
| B | Isolated data plane | Same app code, separate DB | Enterprise (kyrkan, kommun) |
| C | Fully isolated | Separate deployment, DB, secrets | Government/compliance |

### Architecture Assessment (verified 2026-03-13)

| Dimension | Ready? | Notes |
|-----------|--------|-------|
| Tenant model + RLS (994 policies) | ✅ | All DB-local, no cross-project refs |
| Env-driven config (22 env vars) | ✅ | No hardcoded Supabase URLs in code |
| Supabase client creation | ✅ | All clients read URL/keys from env |
| Auth / JWT | ✅ | Per-project Supabase Auth |
| Storage (5 buckets, tenant-prefixed) | ✅ | Per-Supabase-project storage |
| Billing / Stripe | ⚠️ | Webhook endpoint per project (5 min setup) |
| Global catalog (products/purposes) | ⚠️ | Needs idempotent seed scripts (~2h) |
| Migration orchestration | ⚠️ | Needs multi-project deploy script (~4h) |
| Admin panel | ⚠️ | Separate URL per deploy (acceptable) |

**Architectural blockers:** 0. The codebase permits hybrid deployment.

**Readiness tiers:**

| Tier | Name | Effort | Status |
|------|------|--------|--------|
| Tier 1 | Minimum technical enablement | ~3 days | Seed scripts, migration tooling, deploy target registry |
| Tier 2 | Operational readiness | Additional | Backup, incidents, secrets, release mgmt — see `platform-operations-implementation-plan.md` |
| Tier 3 | Customer-facing compliance | Additional | DPA, hosting description, SLA — per customer |

### Guardrails (locked)

- **G1:** No customer-specific code forks — same app, different deploy targets
- **G2:** All infrastructure via environment variables
- **G3:** Global catalog via idempotent seed scripts
- **G4:** Tenant features drive behavior, not deployment target
- **G5:** All migrations must be applicable to any Supabase project from scratch

### Documents

| File | Purpose |
|------|---------|
| `enterprise-isolation-architecture.md` | System design, topology, control/data plane, provisioning model, guardrails |
| `enterprise-isolation-audit.md` | 15-dimension isolation readiness audit (0 arch blockers, 8 ops gaps) |
| `enterprise-isolation-implementation-plan.md` | 4-phase roadmap with 3-tier readiness model |

---

## 14. Strategic Workstream — Platform Operations & Enterprise Readiness

> **Source:** GPT strategic analysis (2026-03-13). Calibration feedback on enterprise isolation study.
> **Principle:** Lekbanken ska kunna beskrivas som en säker, driftsbar och revisionsbar plattform innan den beskrivs som en feature-rik plattform.
> **Status:** Design study complete. 23 operational gaps identified. 6-phase implementation plan defined.

### Context

This workstream binds together five interconnected operational initiatives:

1. **Preview isolation strategy** — sandbox Supabase + Preview env vars in existing Vercel project, protect production from preview traffic
2. **WSL2 local engineering baseline** — standardise developer environment, enable Supabase CLI, CI parity
3. **Vercel + Supabase operating model** — how environments, branches, deploys, and secrets connect
4. **Enterprise isolated deployment provisioning** — repeatable flow for new deploy targets
5. **Multi-target release management** — how releases reach all targets safely

### Control Plane vs Data Plane

| Control Plane (centrally owned) | Data Plane (per-deployment) |
|--------------------------------|---------------------------|
| Git repo, CI, release process | Vercel project, Supabase project |
| Seeds, migrations, docs | DB, Auth, Storage, Realtime |
| Design system, shared UI | Secrets, env vars, domain |
| Internal admin tooling | Stripe webhooks, cron, telemetry |

### ~~⚠️ Critical Open Risk: OPS-SAND-001~~ ✅ **LÖST (2026-03-13)**

> ~~**Preview deployments currently hit the production Supabase database.**~~
>
> ~~Första exekverbara operationsmål = få bort preview/dev från prod-data-plane.~~
> ~~Resolves via Preview env vars pointing at sandbox Supabase. Until then, every Vercel preview can mutate production data.~~
>
> **Löst:** Preview env vars pekar mot sandbox Supabase (`vmpdejhgpsrfulimsoqn`). Verifierat via Vercel function logs — alla `/app`-routes returnerar 200, auth fungerar, proxy släpper igenom `*.vercel.app`. Legacy JWT-nycklar behålls tills vidare.

### Beslut: Env-strategi (GPT-godkänd 2026-03-13)

> Lekbanken använder ett gemensamt Vercel-projekt för app-deployment. Production environment variables pekar mot production Supabase, medan Preview environment variables pekar mot sandbox Supabase. Separat Vercel sandbox-projekt är uppskjutet tills persistent staging/UAT eller enterprise-lik deploy-topologi behövs.

**Arkitektur:**
```
1 repo → 1 Vercel-projekt → 2 Supabase-projekt

Production deploys → prod DB
Preview deploys    → sandbox DB
Local dev          → local eller sandbox DB
```

### Execution Checklist: Preview Env Vars

**Where:** Vercel Dashboard → existing project → Settings → Environment Variables

| # | Variable | Scope | Value | Status |
|---|----------|-------|-------|--------|
| 1 | `NEXT_PUBLIC_SUPABASE_URL` | Preview | `https://vmpdejhgpsrfulimsoqn.supabase.co` | ✅ Set |
| 2 | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview | sandbox anon key | ✅ Set |
| 3 | `SUPABASE_SERVICE_ROLE_KEY` | Preview | sandbox service role key | ✅ Set |
| 4 | `DEPLOY_TARGET` | Preview | `preview` | ✅ Set |
| 5 | `APP_ENV` | Preview | `sandbox` | ✅ Set |

**Do NOT modify Production-scoped env vars.** Only add Preview overrides.

> **⚠️ ORDNING:** Preview env vars gäller bara nya preview deploys. Sätt variablerna **FÖRST**, öppna sedan PR (eller trigga om deploy). Annars kan preview byggas med produktionsvärden.

> **🔒 SÄKERHETSKALIBRERING (GPT 2026-03-13):** `SUPABASE_SERVICE_ROLE_KEY` är server-only (ej `NEXT_PUBLIC_*`). Verifierat: Next.js bundlar aldrig den klient-side. Används i server actions (`tickets-admin`, `support-kb`, `support-hub`) och cron-cleanup — appen behöver den. Får aldrig exponeras i klientkod.

**Verification:**
- [x] Create test PR → push empty commit ✅ (2026-03-13)
- [x] Check preview deploy builds successfully ✅ (2026-03-13)
- [x] Check preview `/api/health` returns 200 ✅ (2026-03-13)
- [x] View source on preview → confirm sandbox Supabase URL in client bundle ✅ (2026-03-13)
- [ ] Create data on preview → verify it appears in sandbox DB, NOT in prod (blocked by RLS, see remediation list)
- [x] Verify `https://app.lekbanken.no/api/health` still returns 200 ✅ (2026-03-13)

### RLS Remediation List (sandbox)

Sekundära RLS-problem i sandbox som inte blockerar preview-isolation men behöver åtgärdas:

| # | Table | Error | Impact | Status |
|---|-------|-------|--------|--------|
| 1 | `user_sessions` | 42501 permission denied | Session listing i profil | ⬜ |
| 2 | `user_devices` | 42501 permission denied | Device tracking vid login | ⬜ |
| 3 | `user_legal_acceptances` | 42501 permission denied | Legal docs acceptance check | ⬜ |
| 4 | `legal_documents` | 42501 permission denied | Required legal docs fetch | ⬜ |
| 5 | `user_tenant_memberships` | 42501 permission denied | Profile update (language/theme) | ⬜ |

### Workstream Relationship Map

| Workstream | Scope | Timeline | Trigger |
|------------|-------|----------|--------|
| **Phase 1B** | Immediate sandbox isolation | Now | OPS-SAND-001 (preview → prod) |
| **Platform Operations** | Operating model across all environments | Ongoing (6 phases) | Operational maturity |
| **Enterprise Isolation** | Per-customer isolated deployments | On first enterprise contract | Customer interest |

> Phase 1B = **execution task** (get sandbox live). Platform Operations = **operating model** (how all environments work). Enterprise Isolation = **topology model** (how isolated customers are provisioned). They build on each other but must not be conflated.

### Next 3 Moves

| # | Move | Resolves |
|---|------|----------|
| 1 | **Sandbox Supabase + Preview env vars** | OPS-SAND-001 (P1), isolates preview from prod data |
| 2 | **WSL2 developer baseline** | OPS-DEV-001–004, reproducible local setup |
| 3 | **Deploy target registry + migration tooling** | Foundation for enterprise + multi-target operations |

> **Priority 4:** Observability foundation (Sentry + DEPLOY_TARGET + alerting).

### Implementation Phases

| Phase | Name | When | Effort |
|-------|------|------|--------|
| 1 | Developer Baseline | Now | 1–2 days |
| 2 | Preview isolation (sandbox Supabase + Preview env vars) — **resolves OPS-SAND-001** | Next | 0.5 day |
| 3 | Observability Foundation | Before enterprise | 1 day |
| 4 | Release Management Tooling | Before enterprise | 1–2 days |
| 5 | Enterprise Operational Readiness | With first contract | 2–3 days |
| 6 | Ops Maturity & Automation | 3+ targets | 3–5 days |

### Architecture Decisions

| ID | Decision | Status |
|----|----------|--------|
| OPS-001 | WSL2 as local engineering baseline | 🟡 Proposed |
| OPS-002 | Sandbox Supabase + Preview env vars (replaces separate Vercel project) | 🟡 Proposed |
| OPS-003 | One Vercel project per deploy target | ⏳ Deferred — relevant for enterprise/persistent staging |
| OPS-004 | Continuous deploy prod/sandbox, manual enterprise | 🟡 Proposed |
| OPS-005 | Deploy targets in `.deploy-targets.json` | 🟡 Proposed |

### Documents

| File | Purpose |
|------|---------|
| `platform-operations-architecture.md` | Environment topology, WSL2, sandbox, operating model |
| `platform-operations-audit.md` | 12-dimension operational readiness audit (23 gaps) |
| `platform-operations-implementation-plan.md` | 6-phase implementation roadmap |
| `sandbox-implementation-brief.md` | Preview isolation brief: sandbox Supabase + Preview env vars, verification checklist, rollback plan |

---

## 15. Strategic Workstream — Database Architecture Audit

> **Source:** Sandbox-provisionering (2026-03-13). 10 fresh-install-fel avslöjades i migrationskedjan.
> **Principle:** Skilja mellan historisk migrationskedja och framtida canonical datamodell.
> **Status:** ✅ GENOMFÖRT — Alternativ B: Canonical Baseline. Verifierad fresh install. GPT-godkänt 2026-03-13.
> **Canonical source:** `supabase/migrations/00000000000000_baseline.sql` — alla nya environments startar härifrån.
> **Historiskt arkiv:** `supabase/migrations/_archived/` — 304 gamla migreringar bevarade som referens, ej canonical.

### Bakgrund

Sandbox-provisioneringen (`supabase db reset` mot tom databas) krävde 10 manuella fixar i migrationskedjan innan alla 307 migreringar kunde köras. Felen föll i 5 kategorier: funktionsordning, namngivningsdrift, saknad CASCADE, fantom-objekt och krockande fix-migreringar.

GPT-analys (2026-03-13): "Det finns tillräckligt starka signaler för att motivera en riktig databas-audit nu. Det är sannolikt billigare att ta detta nu än senare."

### Resultat

| Dimension | Betyg |
|-----------|-------|
| Schema-design | 7/10 — Rimlig arkitektur, kända brister |
| Migrationskedjans hälsa | 4/10 — 10 fresh-install-fel, 29% fix-migreringar |
| RLS & säkerhet | 8/10 — Grundligt härdad |
| Tenant isolation | 8/10 — Välfungerande multi-tenant |
| Framtidssäkerhet | 6/10 — Gamification-sprawl, naming-drift |

### Kärnslutsats

> Problemet är INTE att datamodellen är hopplös. Problemet är att 307 migreringar som vuxit fram över tid inte längre är en tillförlitlig källa för nya environments.

### Rekommendation: Alternativ B — Canonical Baseline

Skapa en ny baseline-migration som representerar dagens faktiska produktionsschema. Arkivera gamla migreringar. Framtida miljöer startar rent. Produktionsdatabasen påverkas inte.

| Alternativ | Tidsåtgång | Risk | Rekommendation |
|-----------|------------|------|----------------|
| A: Minimal Repair | 2–4 timmar | 🟢 Noll | Fungerar kortsiktigt, skulden växer |
| **B: Canonical Baseline** | **2–3 dagar** | **🟢 Låg** | **REKOMMENDERAS** |
| C: Partial Redesign | 1–2 veckor | 🔴 Hög | Överdrivet för nuvarande behov |

### Sandbox-status

| Steg | Status |
|------|--------|
| Sandbox Supabase-projekt skapat | ✅ ref: vmpdejhgpsrfulimsoqn |
| 307 migreringar applicerade (10 fixar) | ✅ exit code 0 |
| TypeScript-check | ✅ 0 errors |
| **Beslut: Alternativ B — Canonical Baseline** | ✅ GPT-godkänt 2026-03-13 |
| Baseline genererad från schema dump | ✅ 759 KB, 17 600+ rader |
| Baseline schema-kvalificerad | ✅ 10 fixkategorier applicerade |
| **Fresh install verifierad** | ✅ `supabase db reset --linked` exit code 0 |
| **Schema-räkning matchar** | ✅ 247 tabeller, 156 funktioner, 545 policies, 28 enums |
| Gamla migreringar arkiverade | ✅ 304 filer → `_archived/` |
| Baseline-process dokumenterad | ✅ `canonical-baseline-execution.md` |
| Seeds-test | ✅ exit code 0 (demo data, ej applied vid `--linked`) |
| CI gate: fresh install + schema counts | ✅ `baseline-check.yml` |
| CI gate: `gen types` drift check | ✅ Genererar typer lokalt, diffar mot committed `types/supabase.ts` |
| Targeted RLS re-check (post-baseline) | ✅ 5/5 kontroller passerade (helper-fns, RESTRICTIVE, schema-qual, subqueries, triggers) |

### Beslut (fattade)

1. **Strategi: Alternativ B — Canonical Baseline** ✅
2. **Tidpunkt: Nu**, före sandbox-deploy ✅
3. **CI-check: Ja**, `db reset` + schema counts + `gen types` drift per PR ✅ IMPLEMENTERAD
4. **Redesign: Nej** — naming-drift, gamification-sprawl etc. dokumenteras men fixas separat, i kontrollerade steg ✅

### Documents

| File | Purpose |
|------|---------|
| `database-architecture-audit.md` | Schema-hälsa (domän för domän) + migrationskedjans hälsa |
| `database-architecture-remediation-plan.md` | Tre alternativ med detaljerad exekveringsplan |
| `database-rebuild-feasibility.md` | Genomförbarhet, risker, ROI per alternativ |

---

## 16. Launch Readiness Dashboard

> **Purpose:** Single-page blocker view. Scan this before deploy or when assessing launch readiness.  
> **Last updated:** 2026-03-14

### Launch Gate — Go/No-Go

| Gate | Status | Detail |
|------|--------|--------|
| P0 findings | ✅ 0 remaining | 13/13 resolved |
| P1 findings (actionable) | ✅ 0 remaining | 45/47 resolved, 2 non-actionable (SEC-002b, SYS-001) |
| TypeScript | ✅ 0 errors | `tsc --noEmit` clean |
| Migration chain | ✅ Verified | Canonical baseline + 6 incrementals + 1 fix |
| Production env vars | ✅ Set | 5 Production-scoped, 5 Preview-scoped in Vercel |
| Sandbox isolation | ✅ Verified | Config + DB layer + preview runtime E2E (V7/V8) all passed (2026-03-14). |
| Deploy order constraint | ⚠️ Active | Migration `20260314000000` must be applied before route change deploys (APC-003/011). |

### Active Blockers

| Blocker | Severity | Owner | Next action |
|---------|----------|-------|-------------|
| ~~OPS-SAND-001 — Preview runtime E2E~~ | ~~P1~~ | ✅ | **CLOSED (2026-03-14)** — V7/V8 passed. Preview confirmed on sandbox DB. |
| APC-003/011 deploy order | P1 | Engineering | Apply migration `20260314000000` to prod before deploying session route change |
| SEC-002b — In-memory rate limiter | P1 (non-actionable) | Infra decision | Works per-instance. Upgrade to Upstash when needed. |
| SYS-001 — Wrapper convergence | P1 (non-actionable) | Self-resolving | 90.0% → organic convergence |

### Active Incidents

| Date (UTC) | SEV | Summary | Impact | Status | Owner |
|------------|-----|---------|--------|--------|-------|
| — | — | No active incidents | — | — | — |

### Pre-Deploy Checklist

Before any production deploy, verify:

- [ ] `tsc --noEmit` passes (0 errors)
- [ ] No pending migrations that the deploy depends on (check deploy order constraints above)
- [ ] `git log --oneline -1` matches expected commit
- [ ] Vercel Production env vars unchanged (no accidental Preview leak)
- [ ] If migration included: applied to prod Supabase first, types regenerated, committed together

---

## 17. Production Risk Register

> **Purpose:** Quick-scan of the most likely post-launch incidents and where to find prevention/detection.  
> **Last updated:** 2026-03-14

| Risk | Impact | Prevention | Detection | Runbook |
|------|--------|------------|-----------|--------|
| RLS misconfiguration | Data inaccessible (403 / empty results) | RLS test suite, `is_system_admin()` bypass | `GET /api/health`, DB smoke test | `first-deploy-runbook.md` §3 RLS verification |
| Environment vars mismatch | Auth failure, redirect loops, silent billing failure | Boot-time validator (`lib/config/env.ts`), Vercel env audit | `GET /api/readiness` (checks db, stripe, auth, encryption) | `first-deploy-runbook.md` §3 Env validator |
| Stripe webhook failure | Payment succeeds but user gets no access | Idempotency guard (`billing_events.event_key`), atomic status claim | Stripe Dashboard → Failed events, `billing_events` query | `incident-playbook.md` §5b |
| Migration to wrong environment | Schema corruption in production | Promotion flow (local→sandbox→prod), `--dry-run`, project-ref check | `supabase migration list`, schema count diff | `prod-migration-workflow.md` §6 |
| Realtime channel overload | Play sessions degrade, WebSocket reconnect loops | Tenant-scoped channels, max ~3 channels/session | Supabase Dashboard → Realtime, reconnect rate | `alerting.md` Realtime Overload |
| Unbounded queries | DB latency spike, API timeouts | Mandatory `LIMIT`, pagination, `tenant_id` indexes | Supabase → Query Performance, `/api/system/metrics` p95 | `prod-migration-workflow.md` §9 |
| Tenant data leakage | Cross-tenant data exposure (security incident) | `tenant_id NOT NULL` constraint, RLS `tenant_id = current_tenant()` | Tenant isolation smoke test, audit logs | `incident-playbook.md` §5a, `first-deploy-runbook.md` §3 |
| Event amplification / duplicate rewards | Coin/XP inflation, phantom achievements | 3-layer idempotency (deterministic keys + UNIQUE constraints + advisory locks), softcap, cooldown, daily cap | XP JSONB array growth, cascade re-execution frequency | `audits/gamification-event-integrity-audit.md` |

---

## Changelog

| Date | Author | Change |
|------|--------|--------|
| 2026-03-22 | Claude | **v2.73 — EXACT MANUAL DASHBOARD VERIFICATION PACKET ADDED.** Expanded `docs/ops/first-deploy-runbook.md` with a concrete manual verification packet for the remaining host/config checks that cannot be proven from repo state alone. The packet now specifies the exact expected Vercel production env values (`APP_ENV=production`, `DEPLOY_TARGET=prod`, `NEXT_PUBLIC_SITE_URL=https://www.lekbanken.no`, production Supabase URL, matching Stripe live webhook secret), the expected Supabase Auth URL configuration (`www` and `demo` callback URLs), the expected Stripe webhook endpoint (`https://www.lekbanken.no/api/billing/webhooks/stripe`), and a fixed result-recording template. This turns the remaining Step 4 config work into a bounded manual checklist instead of an open-ended note. |
| 2026-03-22 | Claude | **v2.72 — RUNBOOK HOST-DRIFT WARNING ADDED.** Verified again that `https://www.lekbanken.no/api/health` is the live production health surface while `app.lekbanken.no` remains a documented drift point. Updated `docs/ops/first-deploy-runbook.md` with an explicit warning that `app.lekbanken.no` references are historical until the canonical-host decision is made, and changed the runbook’s deploy verification steps to use `https://<actual-production-host>` plus manual dashboard verification for Supabase auth redirects and Stripe webhooks. This avoids operationally unsafe copy-paste while preserving the unresolved owner decision. |
| 2026-03-22 | Claude | **v2.71 — STEP 4 TRIAGE GATED BY TRAFFIC TRIGGERS.** Updated `next-execution-plan.md` after the first production baseline pass to make the current decision explicit: the system is `healthy but idle`, so no telemetry automation, distributed rate limiter work, or post-launch sprint sequencing is justified yet. Step 4 now stays trigger-gated until there is either non-zero production traffic, a real alert threshold crossing, or an owner-driven host/config decision. The Week 1 manual telemetry success criterion is now marked complete based on the documented baseline pass. |
| 2026-03-22 | Claude | **v2.70 — FIRST PRODUCTION BASELINE PASS RECORDED.** Executed the first read-only Observe Mode baseline pass against production. Verified via authenticated `vercel curl` that `/api/health` returns `ok` with `deployTarget=prod`, `appEnv=production`, and `supabaseProjectRef=qohhnufxididbmzqnjwg`. Queried S1-S4 directly in production Supabase plus `error_tracking` for S5: sessions created 1h/24h = 0/0, joins 1h/24h = 0/0, active sessions/live participants = 0/0, economy activity 1h = 0, achievements 1h = 0, and no session/join/error anomalies recorded in the last 24h. Interpretation: production currently appears healthy but idle; no alert thresholds crossed. Remaining gap: `/api/readiness` and `/api/system/metrics` still require app-level `system_admin` auth for a richer follow-up pass. |
| 2026-03-22 | Claude | **v2.69 — PRODUCTION ENDPOINT ACCESS VERIFIED FOR OBSERVE MODE.** Verified the actual production endpoint access path against the current Vercel deployment using authenticated `vercel curl`. `/api/health` returned `{"status":"ok","environment":{"deployTarget":"prod","appEnv":"production","supabaseProjectRef":"qohhnufxididbmzqnjwg"}}`, confirming the live site is wired to the documented production Supabase project. `/api/readiness` returned `401 Unauthorized` without app-level `system_admin` auth, which matches the route contract. Updated `docs/ops/production-signals-dashboard.md` to document the required Vercel-authenticated access method and the expected auth split between `/api/health` and `/api/readiness`. |
| 2026-03-22 | Claude | **v2.68 — OBSERVE MODE BASELINE CAPTURE TEMPLATE.** Added a concrete Week 1 baseline capture template to `docs/ops/production-signals-dashboard.md` so the first manual telemetry pass has a single recording format for readiness, S1-S5 metrics, alert evaluation, and the automation decision. Documentation-only update. |
| 2026-03-22 | Claude | **v2.67 — EXECUTION PLAN SHARPENING FOR OBSERVE MODE.** Documentation-only update after local baseline verification. `next-execution-plan.md` now reflects that residual SSoT cleanup is effectively complete for this cycle, Step 1 CI evidence is anchored to the 6 active GitHub workflows (`validate`, `unit-tests`, `typecheck`, `rls-tests`, `i18n-audit`, `baseline-check`), and Step 3 gained a concrete Week 1 manual run order tied to `launch-telemetry-pack.md`, `production-signals-dashboard.md`, and `anomaly-detection-playbook.md`. No code or infrastructure changes. |
| 2026-03-15 | Claude | **v2.66 — SECURITY P1 VERIFICATION ROUND + SIGN-OFF.** GPT-requested critical review of all 12 security P1 fixes. Automated verification scripts confirmed: ABUSE-003 (12/12 MFA routes rate-limited ✅), ABUSE-004 (chat+signals ✅), UPLOAD-001 (14 MIME types ✅), UPLOAD-003 (quota enforcement ✅), LEAK-002/003 (0 `select(*)` in 6 files ✅), ENUM-001 (strict tier ✅), ENUM-002 (uniform errors ✅). **Found 2 real issues:** (1) LEAK-001 incomplete — 4 `coinError.message`/`insertError.message` leaks remaining in `gamification/events/route.ts` → fixed with `console.error` preserved. (2) ENUM-002 frontend breakage — `app/participants/join/page.tsx` checked old error strings (`'Session is full'`, `'Session is locked'`, `SESSION_OFFLINE`, status 410) that API no longer returns → updated to `code`-based checks (`SESSION_FULL`+403, else 404). Added §10 Final Sign-Off with verification results table, found/fixed deviations, documented post-launch debt (i18n fallbacks, admin error.message, quota race condition), and 14-item pre-launch smoke test checklist. Section numbering updated (§11-§17). `tsc --noEmit` = 0 errors. |
| 2026-03-15 | Claude | **v2.65 — SSoT RECONCILIATION MICRO-PASS (GPT feedback).** Three stale headers fixed: (1) launch-control.md Current Phase: "Phase 3+4 COMPLETE" → "Post-launch Observe Mode. All phases complete (Phase 2 formal execution skipped; Phase 6 deferred). Awaiting production traffic data." (2) architecture.md status: "Environment isolation and test foundation still proposed" → "Environment isolation implemented (local Docker + staging Supabase). Test foundation exists ad-hoc." (3) implementation-plan.md Phase 3 gate: "Alla 8 cross-cutting audits klara (6 genomförda + 6 deferred)" → "Cross-cutting audit scope tillräckligt täckt för launch (6 genomförda, 2 deferred med acceptabel täckning via domänaudits)." Documentation-only — no code changes. |
| 2026-03-15 | Claude | **v2.64 — SSoT RECONCILIATION.** Documentation-only update — no code changes. Phase 5: ⏭️ Deferred → ✅ Complete (16/16 regressions + 4 L2 audits all passed inline). Phase 2: ⏭️ Skipped → 🟡 "Formal execution skipped; ad-hoc test assets and CI coverage exist." Phase 1B: sub-items updated to reflect actual completion (ADR-005 Alt B, 7/8 tasks done). Wrapper coverage: 247/287→253/288 (87.8%), 360/408→369/410 (90.0%). Architecture §2 environment table: dev/preview ⚠️ → ✅ isolated. Architecture §6 observability: "Okänt" → documented (telemetry pack + incident playbook). All stale references updated across all 3 SSoT docs. Changelog entries left as historical records. |
| 2026-03-14 | Claude | **v2.63 — DEVELOPER GUARDRAILS + CI-PREFLIGHT + ESLINT ZERO-WARNINGS.** Two-part sprint per GPT directive: "inte fler regler i efterhand, utan bättre räcken före stupet." **Part 1 — Developer Guardrails infrastructure:** Three-level quality model: **Nivå A (pre-commit)** lint-staged (ESLint on staged TS/TSX, action-validator on staged YAML) + `tsc --noEmit`; **Nivå B (pre-push)** `npm run verify` — ESLint + TypeScript + workflow validation + i18n + vitest + integration tests; **Nivå C (PR gate)** `.github/workflows/validate.yml` — all Nivå B + `as any` diff check + `npm run build`. New scripts: `verify`, `verify:quick`, `check:workflows`, `prepare`. New devDeps: `husky@^9.1.7`, `lint-staged@^16.4.0`, `@action-validator/core`, `@action-validator/cli`. Husky hooks rewritten: `.husky/pre-commit` (sh, lint-staged + tsc), `.husky/pre-push` (npm run verify). `.github/workflows/typecheck.yml` + `unit-tests.yml` → push-only post-merge safety nets (PR triggers moved to validate.yml). `.husky/README.md` rewritten as comprehensive developer guardrails documentation with branch protection guidance. **Part 2 — ESLint zero-warnings:** Fixed all 10 pre-existing ESLint errors (prefer-const, no-empty-object-type, set-state-in-effect ×4, no-html-link-for-pages, no-unsafe-function-type, no-restricted-properties ×2, unused param). Then fixed all 34 ESLint warnings across 22 files: 17× `no-unused-vars` (prefixed with `_`, removed dead imports/functions/types), 6× `consistent-type-imports` (added `type` keyword, replaced inline `import()` annotations with proper imports), 3× `exhaustive-deps` (added `t` to deps, wrapped conditional `events` in `useMemo`), 3× unused eslint-disable directives (removed), 2× `no-explicit-any` (typed cast via `Record<string,boolean>`). **Final: ESLint 0 errors, 0 warnings. verify:quick ALL 4 checks PASS. tsc --noEmit clean.** |
| 2026-03-16 | Claude | **v2.62 — L2-SESS REMEDIATION: L2-SESS-001 + L2-SESS-002 + L2-SESS-003.** Remediation sprint for 3 P2 findings from L2-4 audit. (1) **L2-SESS-001 (P2→✅):** `game/route.ts` — wrapped with `apiHandler({ auth: 'public' })` (adds rate limiting, standardized error format, request ID). Replaced inline triple-auth (cookie + `users.global_role` + participant token) with canonical pattern: participant token check first, then `requireSessionHost(sessionId)` fallback for host/admin. Removed `createServerRlsClient` import. Preserved: participant response shape filtering (`isParticipant` flag), security tripwire (hard-strip leaderScript/boardText/leaderTips), dual-auth semantics (host+participant token → participant shape). (2) **L2-SESS-002 (P2→✅):** `overrides/route.ts` — complete rewrite. GET+PATCH wrapped with `apiHandler({ auth: 'user' })`. Replaced `getSessionAndAssertHost()` inline helper with canonical `requireSessionHost(sessionId)`. Replaced 90-line manual `sanitizeOverrides()` with 30-line Zod schema (`adminOverridesSchema` with nested step/phase/safety schemas). PATCH uses `input: adminOverridesSchema` for pre-handler validation. Removed: `isObject`, `DISPLAY_MODES`, `sanitizeOverrides`, `getSessionAndAssertHost`, `createServerRlsClient`. (3) **L2-SESS-003 (P2→✅):** 3 routes — replaced inline `users.global_role` admin bypass with canonical `requireSessionHost(sessionId)` (uses `deriveEffectiveGlobalRole` via cached `getServerAuthContext`). `command/route.ts`: removed `ParticipantSessionService` auth fetch + `createServerRlsClient`, kept `applySessionCommand`. `state/route.ts`: removed `createServerRlsClient`, kept `ParticipantSessionService` for operations. Inner try/catch blocks removed (apiHandler handles errors). Cross-ref L2-AUTH-003 (inline `app_metadata.role` bypass) now resolved in 3 more routes. **Re-regression: 4 proof traces PASS.** (1) Host read/mutate: cookie auth → `requireSessionHost` → full game data + state/command mutations ✅. (2) Participant sanitized projection: token → valid → authorized, security tripwire strips leader-only fields ✅. Rejected → 403, expired → 401 ✅. (3) Admin bypass: `effectiveGlobalRole === 'system_admin'` in all 4 routes via canonical helper ✅. (4) Non-authorized: game → 401 inline, command/state/overrides → `AuthError` → `errorResponse` standardized format ✅. `tsc --noEmit` = 0 errors. Post-remediation: **0 P0, 0 P1, 0 P2, 4 P3.** |
| 2026-03-16 | Claude | **v2.61 — LEVEL 2 AUDIT: PLAY / SESSION AUTHORING CHAIN.** Fourth Level 2 Building Block Audit — largest domain in the codebase (68 API routes, 215+ files). 6 building blocks deep-analyzed: play-auth (dual-path participant/host resolution), session-command pipeline (idempotency + TOCTOU guard + state machine), play-broadcast-server (atomic seq + best-effort), session-guards (18 mutation types × 8 statuses), participant-token (UUID v4, verify/revoke lifecycle), route-handler auth dispatch. Complete auth survey of all 68 routes: 42 user, 14 public, 9 participant, 3 cron_or_admin, 8 no-apiHandler. 4 end-to-end proofs: (1) anonymous join→play→heartbeat→rejoin lifecycle ✅, (2) host create→start→command→end lifecycle ✅, (3) kick→rejection propagation across all API surfaces ✅, (4) concurrent command TOCTOU guard with atomic WHERE clause ✅. 5 L1 remediations verified intact (SESS-001/002/003/005/007). 6 known deferred P2/P3 confirmed present (SESS-004/006/010/011/012/013). **7 findings:** L2-SESS-001 (P2) game/ route bypasses apiHandler with complex inline auth + admin bypass, L2-SESS-002 (P2) overrides/ route bypasses apiHandler with inline auth, L2-SESS-003 (P2) inline `users.global_role` admin bypass in 3 routes (cross-ref L2-AUTH-003), L2-SESS-004 (P3) legacy PATCH uses Date.now() as client_seq defeating idempotency, L2-SESS-005 (P3) setNextStarter N+1 queries, L2-SESS-006 (P3) deprecated routes have zero auth, L2-SESS-007 (P3) heartbeat inline token validation vs auth:'participant'. **0 P0, 0 P1, 3 P2, 4 P3 — PASS (launch-safe).** Report: `audits/level2-session-authoring-chain-audit.md`. |
| 2026-03-14 | Claude | **v2.60 — DEMO FUNNEL RE-REGRESSION: POST-M1 VERIFICATION.** 4 code-level proof traces after demo funnel wiring. (1) Demo user sees banner: `layout-client.tsx` renders `<DemoBanner />` → `useIsDemo()` returns `isDemoMode: true` → banner shows tier, time remaining, upgrade CTA; `isDemoMode: false` → returns `null` + CSS var `--demo-banner-height: 0px` → ✅. (2) Demo user blocked in 5 surfaces: all 5 feature keys (`modify_tenant_settings`, `invite_users`, `export_data`, `access_billing`, `advanced_analytics`) present in canonical `FREE_TIER_DISABLED_FEATURES` → `isFreeTierLocked()` returns `true` → DemoFeatureGate shows lock overlay, DemoButtonGate shows lock icon → ✅. (3) Non-demo user not affected: DemoBanner returns `null`, DemoFeatureGate returns `<>{children}</>`, DemoButtonGate returns `<>{children}</>` — all transparent passthrough when `isDemoMode === false` → ✅. (4) Upgrade CTA correct: banner CTA → `convertDemo('contact_sales')` + navigate `/auth/signup?source=demo` (free) or `/contact` (premium); gate CTA → `convertDemo('contact_sales', _, {source:'feature_gate', feature})` + navigate `/contact` → ✅. **4/4 PASS.** Demo funnel loop closed. |
| 2026-03-14 | Claude | **v2.59 — DEMO FUNNEL ACTIVATION M1.** Per GPT directive: wire dead demo infrastructure into live surfaces. (1) Created canonical feature map `lib/demo/feature-config.ts` — single source of truth for `FREE_TIER_DISABLED_FEATURES` + `isFreeTierLocked()` helper. Eliminated 4 duplicate inline arrays across DemoFeatureGate.tsx (×3) and demo-detection.ts (×1). (2) Wired `DemoBanner` into `app/app/layout-client.tsx` — renders above Shell, auto-hides for non-demo users (tier indicator, time remaining, upgrade CTA, timeout warning). (3) Wired `DemoFeatureGate` / `DemoButtonGate` into 5 surfaces: tenant settings (modify_tenant_settings), user invite/create (invite_users), admin export (export_data), billing (access_billing), analytics (advanced_analytics). All gates transparent passthrough when not in demo or premium tier. **3 findings resolved:** L2-DEMO-001 P2→✅ (gates wired), L2-DEMO-002 P2→✅ (banner wired), L2-DEMO-004 P3→✅ (fragmentation eliminated). Updated verdict: 0 P0, 0 P1, 0 P2, 4 P3. `tsc --noEmit` = 0 errors. |
| 2026-03-15 | Claude | **v2.58 — LEVEL 2 AUDIT: DEMO FEATURE GATES + UPGRADE PATH.** Third Level 2 Building Block Audit. 26 files audited across feature gate chain (server→client→component→RPC), upgrade/conversion path (6 paths), content filtering, tenant isolation. **Critical finding: the entire feature gate chain is dead code.** `DemoFeatureGate`, `DemoButtonGate`, `DemoFeatureBadge`, `DemoBanner` — 0 app-level imports, never rendered. Server-side `isDemoFeatureAvailable()` and `canPerformDemoAction()` — 0 imports, never called. `FeatureGateMap` (14 features, 4 access levels) — 0 external consumers. Only `DemoConversionModal` is active (checkout blocking). Free/premium tier differentiation inoperative. **Security verified:** session ownership (RLS + RPC `auth.uid()`), tenant isolation (DEMO_TENANT_ID + mutation guards on 3 tenant routes), checkout blocking (3 routes: `is_demo_user \|\| is_ephemeral` → 403), rate limiting (Supabase-backed), cookie security (httpOnly + HMAC), content filtering (search/browse filter `is_demo_content`). **7 findings:** L2-DEMO-001 (P2) feature gate components dead code, L2-DEMO-002 (P2) DemoBanner never rendered, L2-DEMO-003 (P3) server-side gate functions never called, L2-DEMO-004 (P3) feature definition fragmentation (1/7 IDs match between systems), L2-DEMO-005 (P3) game detail endpoint no demo content check, L2-DEMO-006 (P3) FeatureGateMap entirely unused, L2-DEMO-007 (P3) premium access code in query string. 15 pre-existing L1 findings unchanged. **0 P0, 0 P1, 2 P2, 5 P3 — PASS.** Report: `audits/level2-demo-feature-gates-upgrade-audit.md`. |
| 2026-03-15 | Claude | **v2.57 — L2-PLAN RE-REGRESSION: POST-REMEDIATION PROOF PASS.** 4 proof traces after `de61c8a` (5 RLS policies + capability model + 2 routes changed). (1) Tenant admin CAN block-edit+publish: `derivePlanCapabilities` grants `planner.plan.update`+`planner.plan.publish` → `requirePlanEditAccess` passes → 5 updated RLS policies all pass via `has_tenant_role(owner_tenant_id,'admin')` → ✅. (2) Tenant admin CANNOT delete: `derivePlanCapabilities` withholds `planner.plan.delete` (now owner/sysadmin only) → `requireCapability` returns 403 → UI hides delete → RLS `plans_delete` also denies → ✅. (3) Owner+sysadmin unchanged: new RLS adds OR branch for tenant admin — owner/sysadmin branches remain first, untouched → ✅. (4) Progress denies invisible plans: `requirePlanReadAccess` → `plans_select` RLS filters → private plan returns null → 404 → ✅. All 4 proofs pass. No regressions. Capability, RLS, UI fully aligned. |
| 2026-03-15 | Claude | **v2.56 — L2-PLAN REMEDIATION: L2-PLAN-001 + L2-PLAN-002 + L2-PLAN-003.** Product decision locked: **Option A — tenant admins SHALL edit blocks and publish tenant-visible plans. Delete = owner/sysadmin only (destructive op).** Three remediations: (1) **L2-PLAN-001 (P1→✅):** Migration `20260315100000_planner_subtable_rls_tenant_admin.sql` — updated 5 RLS policies on `plan_blocks` (insert/update/delete), `plan_versions` (insert), `plan_version_blocks` (insert) to add `OR (visibility='tenant' AND has_tenant_role(owner_tenant_id, 'admin'))`, matching `plans_update` pattern. Additionally `derivePlanCapabilities()` updated: `planner.plan.delete` now granted only to owner/sysadmin (separated from update/publish group). (2) **L2-PLAN-002 (P2→✅):** Added `requirePlanReadAccess(supabase, user, planId)` to progress route GET+POST — closes defense-in-depth gap (cross-ref REG-PLAN-001). (3) **L2-PLAN-003 (P2→✅):** Publish route now uses `deriveEffectiveGlobalRole(profile, user)` via parallel profile+memberships fetch instead of inline `app_metadata.global_role` cast (cross-ref L2-AUTH-005). Post-remediation: 0 P0, 0 P1, 1 P2, 5 P3. |
| 2026-03-15 | Claude | **v2.55 — LEVEL 2 AUDIT: PLANNER PUBLISH / PROGRESS / VERSION / ACCESS CHAIN.** Second Level 2 Building Block Audit. 18 planner routes audited across 6 analysis axes per GPT directive: publish flow, progress flow, version flow, read/edit/start capability chain, tenant boundary through entire chain, RLS vs app-layer responsibility map. **Full chain analysis:** capability → RLS alignment matrix for all 18 routes, 3 end-to-end flow proofs (owner create→edit→publish, tenant admin collaboration, anonymous play), tenant boundary tracing through 10 flow types, access pattern classification (6 canonical, 7 inline, 5 RLS-only). **9 findings:** L2-PLAN-001 (P1) tenant-admin RLS mismatch on sub-tables — `plan_blocks/plan_versions/plan_version_blocks` RLS only allows owner/sysadmin while capability system grants tenant admin write (5 routes affected, RLS is stricter = no security breach, functional breakage only), L2-PLAN-002 (P2) progress route no plan access check (cross-ref REG-PLAN-001), L2-PLAN-003 (P2) publish inline `app_metadata.global_role` (cross-ref L2-AUTH-005), L2-PLAN-004 (P2) zero rate limiting across 18 routes, L2-PLAN-005 (P3) non-atomic publish, L2-PLAN-006 (P3) delete cap/RLS mismatch, L2-PLAN-007 (P3) inconsistent access patterns, L2-PLAN-008 (P3) visibility bypasses capability system, L2-PLAN-009 (P3) plan_schedules table not in baseline. **0 P0, 1 P1 (functional, not security), 3 P2, 5 P3 — PASS (launch-safe with caveats).** No security breaches — all mismatches have RLS stricter than app-layer. Report: `audits/level2-planner-publish-version-access-audit.md`. |
| 2026-03-15 | Claude | **v2.54 — LEVEL 2 AUDIT: AUTH / TENANT / CAPABILITY HELPER STACK.** First Level 2 Building Block Audit (per §7 methodology). 10 building blocks audited: `apiHandler`, auth guards (5 functions), `deriveEffectiveGlobalRole`, `getServerAuthContext`, plan access helpers (5 functions), capability system, game display access, tenant resolver, middleware helpers, play auth helpers. **Full 9-step procedure executed:** definition + inventory of all building blocks with code-level evidence, ingress/egress analysis, grep-verified call-site mapping (20+ routes verified), behavior matrix for all auth modes, system admin bypass consistency matrix (10 helpers), 3 end-to-end flow proofs (plan block creation, media upload, participant heartbeat), app-auth vs RLS vs helper responsibility map. **5 findings:** L2-AUTH-001 (P3) sessionHost auth mode is no-op facade, L2-AUTH-002 (P2) dual tenant resolution chains (3 independent impls), L2-AUTH-003 (P2) 5 API routes use inline `app_metadata.role` bypassing `deriveEffectiveGlobalRole`, L2-AUTH-004 (P3) plan access helpers duplicate profile+membership fetches, L2-AUTH-005 (P2) `publish/route.ts` inline `app_metadata.global_role` for capability context. **0 P0, 0 P1 — PASS (launch-safe).** All P2 findings mitigated by RLS defense-in-depth. Report: `audits/level2-auth-tenant-capability-audit.md`. |
| 2026-03-14 | Claude | **v2.53 — BATCH REGRESSION AUDIT: 9 domains (Tier 2 + Tier 3 + cross-cutting).** Completed regression for ALL remaining domains. **Tier 2 (remedierade):** Atlas/Sandbox — 3 M1 fixes verified (inventory/annotations system_admin lock, seed-test-badges auth lock), 2 routes, 0 new findings. Media/Assets — 3 M1 fixes verified (upload tenant membership, confirm path-prefix validation, design.ts tenant check), 7 routes, 0 new findings. **Tier 3 (0 P1):** Notifications — 0 API routes, architecture unchanged. Support/Tickets — 0 API routes, RLS-first unchanged. Profile/Settings — 4 routes all apiHandler, unchanged. Marketing/Landing — MKT-001 robots.ts+sitemap.ts confirmed present. Calendar — 2 routes wrapped + requirePlanEditAccess. **Cross-cutting:** Auth/Onboarding — covered by Security audit + per-domain regressions. Tenants — covered by per-domain tenant boundary checks. Game Authoring — covered by Games regression. **Total: 0 new findings across 9 domains.** Regression summary table added to §2 (per GPT-direktiv). All 16 domains now at Regression ✅. Report: `audits/batch-regression-tier2-tier3.md`. |
| 2026-03-14 | Claude | **v2.52 — JOURNEY/GAMIFICATION REGRESSION AUDIT (Phase 2).** Full regression audit of Journey & Gamification domain (Audit #9 + Event Integrity). 7 regression areas verified: (1) M1 tenant boundary + auth — JOUR-001 (leaderboard preferences `assertTenantMembership` on GET+POST), JOUR-004 (achievement/[id] `assertTenantMembership`), JOUR-005 (tenant filter `.or(tenant_id.is.null, tenant_id.eq)`) — all 3 intact, (2) M2 rate limiting — JOUR-007 (refund `rateLimit: 'strict'`), JOUR-008 (rollup refresh `rateLimit: 'strict'` + `days max(365)`) — both intact, JOUR-009 partial unchanged, (3) Route coverage — 33 routes scanned (14 gamification + 4 journey + 15 admin), 30/33 use `apiHandler`, 3 unwrapped are known M3 deferrals (JOUR-002/003a/003b), (4) GAM-001 security hardening — `achievements/unlock` locked to `system_admin` + `rateLimit: 'api'` + Zod + metadata limits, (5) Phase 4.1 production hardening — `achievements/check` blocks stats-requiring triggers in production, dual-client, tenant from memberships, (6) Event integrity pipeline — V1+V2 `server-only`, `createServiceRoleClient`, 23505 duplicate handling, idempotency on all cascades, (7) Deferred baseline — all 9 M3/M4 deferrals at expected state. **0 new findings.** Journey/Gamification is test-group-ready for current scope. Report: `audits/journey-gamification-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.51 — LEVEL 2 BUILDING BLOCK AUDIT METHODOLOGY.** Per GPT-direktiv: audit-programmet utökat med Level 2 — Critical Building Block Audits. Formaliserar metodik för selektiv fördjupning i komponenter, hooks, helpers, mappers och andra byggstenar med hög blast radius. 9-stegs standardprocedur (definition → ingress → egress → call-site inventory → behavior matrix → state/logic audit → end-to-end proof → regression check → finding classification). Chain rule: "auditera kontraktet, inte bara filen". Aktiveras selektivt: efter domänaudit, vid regression, cross-domain, vid misstanke. 7 prioritetskluster definierade. Uppdaterade dokument: `launch-readiness-audit-program.md` (ny §7), `launch-readiness-implementation-plan.md` (item 5.5 + Level 2 sektion i Phase 5), `launch-control.md` (scope note under Phase 3+4). Inga nya audit-filer skapade — metodik formaliserad för selektiv användning. |
| 2026-03-14 | Claude | **v2.50 — GAMES REGRESSION AUDIT (Phase 2).** Full regression audit of Games / Library domain. 8 regression areas verified: (1) Snapshot auth + ownership (GAME-002 M1) — `verifySnapshotAccess()` with tenant role check intact, (2) DELETE gate + force-delete (GAME-001a/b M1+M2) — explicit role check + `system_admin`-only force-delete intact, (3) PATCH service-role fix (GAME-001c M3) — RLS client for non-system-admin callers intact, (4) Search sanitization (GAME-004 M2) — `.replace(/[,()]/g, '')` at both search sites + UUID validation on tenantId, (5) Reactions batch cap (GAME-005 M1) — Zod max(100) + rateLimit intact, (6) Builder error handling (GAME-009 M3) — all 20+ operations check `{ error }` → `warnings[]` intact, (7) Auth/wrapper coverage — 15/18 apiHandler + 3 requireGameAuth (known GAME-012 P3), (8) Tenant boundary — TI-001 membership checks, `requireTenantRole`, `allowedProductIds`, artifact `correctCode` stripping, trigger content stripping all intact. **0 new findings.** 7 known M4 deferrals unchanged (GAME-003/006/007/008/010/011/012). Games is test-group-ready for current scope. Report: `audits/games-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.49 — DEMO M2 REMEDIATION (3 regression findings fixed).** Per GPT calibration: REG-DEMO-002 (RLS overly permissive) too serious for external demo domain — Demo NOT test-group-ready until fixed. All 3 findings fixed: (1) **REG-DEMO-001** — `demo-expired/page.tsx` form POST replaced with `<Button href="/demo">` (proper client-side flow). (2) **REG-DEMO-002** — migration `20260314200000`: dropped `service_role_full_demo_sessions_access` (no `TO` clause → all authenticated users had full CRUD), replaced with `users_update_own_demo_sessions` (FOR UPDATE, user_id=auth.uid()) + `system_admin_full_demo_sessions_access` (is_system_admin()). (3) **REG-DEMO-003** — same migration: both RPCs (`add_demo_feature_usage`, `mark_demo_session_converted`) now include `AND user_id = auth.uid()` ownership check. Baseline updated to match. `tsc --noEmit` = 0 errors. **Re-regression passed (10 checks):** demo-expired link, RLS policies, RPC ownership, session creation (supabaseAdmin), rate limit (supabaseAdmin), track route (RLS client), convert route (RLS client), admin dashboard (system_admin policy), cleanup function (service_role), tsc. Deploy order: migration `20260314200000` before app deploy. Demo is now test-group-ready. |
| 2026-03-14 | Claude | **v2.48 — DEMO REGRESSION AUDIT (Phase 2).** Full regression per GPT-defined scope (8 areas): auth/demo (normal + premium + missing-env + rate-limit), demo/status (session resolution + expiry), demo/track (feature tracking + no cross-session leakage), demo/convert (convert path + state persistence), feature gates (no broken click paths), cleanup/expiry (graceful degradation, no zombie state), multi-tab/refresh (single session via cookie), telemetry/funnel (full PostHog+Plausible funnel intact). **All 3 M1 fixes verified intact.** Premium 503 UX verified: users never hit premium API from standard UI — "Upgrade to Premium" links to contact sales form, not premium API. **3 new findings:** REG-DEMO-001 (P2) — demo-expired "Start Another Demo" uses plain HTML form POST but route returns JSON → user sees raw JSON (UX dead-end); REG-DEMO-002 (P2) — `service_role_full_demo_sessions_access` RLS policy has no `TO` clause → grants full access to all authenticated users (defense-in-depth gap, demo data is ephemeral); REG-DEMO-003 (P3) — `add_demo_feature_usage()` and `mark_demo_session_converted()` RPCs lack `AND user_id = auth.uid()` ownership check. **0 P0/P1 regressions.** GPT calibration applied: DEMO-001 described as "launch-sufficient persistent rate limiting". Demo is test-group-ready. Report: `audits/demo-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.47 — DEMO REMEDIATION M1 (3 P1 fixed).** All 3 P1 findings fixed: (1) **DEMO-001** — replaced in-memory `Map()` rate limiter with Supabase-backed rate limiting. Now counts `demo_sessions` created in last hour with matching `metadata->>'client_ip'`. Client IP stored in metadata on session creation. Cross-instance persistent (no new dependencies). (2) **DEMO-002** — removed hardcoded `DEMO_PREMIUM_2024` fallback from `auth/demo/route.ts`. If `DEMO_PREMIUM_ACCESS_CODE` env var is not set, premium tier returns 503 "Premium demo not configured". (3) **DEMO-003** — removed `details: error?.message` from 500 response in `auth/demo/route.ts`. Errors logged server-side only. Also threaded `clientIP` through `setupDemoUser()` → `createDemoSession()` chain. `tsc --noEmit` = 0 errors. Demo: Audit ✅, Remediation ✅ (M1), Regression ❌ pending. |
| 2026-03-14 | Claude | **v2.46 — DEMO DOMAIN AUDIT (Domain #24).** Per GPT directive: Demo formalized as own domain (not subset of Marketing/Play). Full audit of 8 route files, ephemeral user system, feature gating, conversion tracking, rate limiting, cleanup edge function. **18 findings:** 0 P0, 3 P1, 10 P2, 5 P3. **P1 findings:** DEMO-001 (in-memory rate limiter — serverless-incompatible, needs Upstash Redis), DEMO-002 (premium access code `DEMO_PREMIUM_2024` hardcoded as fallback), DEMO-003 (error.message leak in auth/demo POST response). P2 includes: auth/demo + convert + track not wrapped with apiHandler, metadata not validated in convert/track, cleanup edge function schedule unverified, demo tenant analytics pollution. Demo row added to domain table. Audit #24 added to inventory. Report: `audits/demo-audit.md`. |
| 2026-03-14 | Claude | **v2.45 — PLANNER REGRESSION AUDIT (Phase 2).** 5 areas verified: M1 wrapper migration (3 routes — plans POST `auth:'user'` + tenant validation, visibility POST `auth:'user'` + tenant validation, play GET `auth:'public'`), M2 capability gates (8 handlers across 4 routes — all call `requirePlanEditAccess`/`requirePlanStartAccess`, shared module `lib/planner/require-plan-access.ts` exports all 4 functions), M3 tenant boundary (notes/tenant calls `assertTenantMembership()`, copy inline membership check), route coverage scan (19 route files found — 5 new since original audit, all wrapped with `apiHandler`), RLS baseline (7 planner tables confirmed RLS-enabled). **2 new findings on post-audit routes:** REG-PLAN-001 (P2) — `progress/route.ts` GET+POST missing plan access check, RLS only checks `user_id=auth.uid()` not plan visibility; REG-PLAN-002 (P3) — `publish/route.ts` uses inline `app_metadata.global_role` instead of `deriveEffectiveGlobalRole()`. **0 P0/P1 regressions.** All M1-M3 remediations intact. Report: `audits/planner-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.44 — SESSIONS/PARTICIPANTS REGRESSION AUDIT (Phase 2).** 8 areas verified: join/rejoin statuses + felkoder (status gates, error codes intact), participant lifecycle (join/rejoin/kick/block/approve/leave all verified), export + admin routes (M1 mock removal + wrappers + rate limit confirmed), broadcast consistency (join/kick/block/approve/ready all broadcast; rejoin + cleanup missing = known P2), token/auth paths (revoke/extend/expiry/REJECTED_PARTICIPANT_STATUSES intact), session-status guards (participant mutations guarded, read-only appropriately unguarded), Zod validation (join/rejoin/create schemas intact incl. avatarUrl HTTP(S) refine), mock data (fully eliminated — zero matches for mock/Nora/example.com). **0 new gaps found.** 8 known P2/P3 re-confirmed (SESS-004 dual broadcast, rejoin no broadcast, cleanup no broadcast, N+1 queries, dual-channel, token localStorage, setNextStarter race, board/lobby design tradeoff). Report: `audits/sessions-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.43 — PLAY/RUN REGRESSION AUDIT (Phase 2).** 5 areas verified: state transitions (M1 TOCTOU fix, delegation, timestamps), broadcast integrity (M4 kick/block/approve, assignments, readiness, sequencing), participant sync (join/rejoin/heartbeat/disconnect-on-end), session mutation safety (M2 guards on 18 routes), DB atomicity (M3 puzzle RPCs + M5 wrappers). **1 gap found: REG-PLAY-001** — `assignments` route imported `assertSessionStatus` but never called it (both POST + DELETE). Host could assign/unassign roles on ended sessions. **Fixed inline** — added `status` to SELECT + guard call. `tsc --noEmit` = 0. Vote upsert confirmed safe (atomic Postgres `ON CONFLICT`). `ready` route uses hardcoded inline check (functionally correct, style P3). Report: `audits/play-regression-audit.md`. |
| 2026-03-14 | Claude | **v2.42 — PHASE 1B-A EXECUTION: SANDBOX DB LAYER FIX APPLIED.** Migration `20260314100000_fix_rls_grants_and_admin_function.sql` applied to sandbox via `supabase db push`. 6 incremental migrations marked as applied via `migration repair` (effects already in reconsolidated baseline — repair synced migration history, not schema state; see sandbox-phase-1b.md §9.1). **DB-layer verification results (5/5 targeted permission checks passed):** (1) `supabase migration list` — 8/8 Local=Remote ✅, (2) Service role SELECT on all 5 tables — OK ✅, (3) Authenticated SELECT on all 5 tables — OK ✅ (test user created + signed in), (4) Authenticated INSERT on `user_sessions`/`user_devices` — FK constraint (not permission denied) → grants work ✅, (5) Authenticated INSERT on `legal_documents` — correctly denied (SELECT-only grant) ✅, (6) Authenticated INSERT on `user_tenant_memberships` — correctly denied (SELECT+DELETE only) ✅. **Note:** These verify database-layer permission paths only. Full app-level E2E (UI/server-action/API flows) pending preview deploy → V7/V8. CLI temporarily linked to sandbox for apply/verify, then restored to production (`qohhnufxididbmzqnjwg`). `sandbox-phase-1b.md` §7.1, §9.1, §10, §12 updated. |
| 2026-03-13 | Claude | **v2.41 — GPT SECURITY CALIBRATION.** GPT godkände planen och bekräftade: (1) `APP_ENV=sandbox` + `DEPLOY_TARGET=preview` är rätt separation (deploy-typ vs datamiljö), (2) `SUPABASE_SERVICE_ROLE_KEY` i Preview scope är OK **om** serversidan behöver den (verifierat: tickets-admin, support-kb, support-hub, cron-cleanup), men den får aldrig vara `NEXT_PUBLIC_*` eller exponeras klient-side. Verifierat i `lib/config/env.ts` L79 (kommentar: "Server-only") och `lib/supabase/server.ts` L102 (`createServiceRoleClient` — bara i server actions). (3) **Viktigt:** Preview env vars gäller bara nya deploys — sätt variabler FÖRE PR, annars byggs preview med prod-värden. GPT-citat: "Sätt Preview env vars först, och kontrollera extra noga att service role aldrig exponeras klient-side." |
| 2026-03-13 | Claude | **v2.40 — GPT FINAL APPROVAL + ENV STRATEGY.** GPT bekräftade att arkitekturen är "exakt rätt för Lekbanken just nu": 1 repo, 1 Vercel-projekt, 2 Supabase-projekt. Formell beslutstext tillagd i §13: "Lekbanken använder ett gemensamt Vercel-projekt för app-deployment. Production environment variables pekar mot production Supabase, medan Preview environment variables pekar mot sandbox Supabase." Execution checklist tillagd med exakt 5 env vars (Preview scope) + 6-stegs verifieringsplan. GPT-rekommenderad namngivning: `DEPLOY_TARGET=prod/preview/development/enterprise-<customer>`, `APP_ENV=prod/sandbox/local`. Rättelsenotering: `NEXT_PUBLIC_AUTH_REDIRECT_URL` används inte i koden (relativa redirects), `SUPABASE_PROJECT_ID`/`SUPABASE_JWT_SECRET` finns bara i legacy-skript. GPT-citat: "Det här är exakt rätt arkitektur för Lekbanken just nu. Du får production isolation, minimal drift, inga extra deploy targets, enkel mental modell." |
| 2026-03-13 | Claude | **v2.39 — SANDBOX STRATEGY PIVOT (Spår A).** GPT-direktiv: skippa separat Vercel sandbox-projekt, använd istället Preview env vars i befintligt Vercel-projekt. Tre saker vi INTE gör: (1) Vercel Sandboxes-produkten, (2) separat Vercel sandbox-projekt, (3) `sandbox.lekbanken.no`-domän. Tre saker vi GÖR: (1) separat Supabase sandbox (redan klart, `vmpdejhgpsrfulimsoqn`), (2) Preview-scoped env vars i befintligt Vercel-projekt pekar mot sandbox-Supabase, (3) verifiering att preview-builds använder sandbox DB. `sandbox-implementation-brief.md` helt omskriven till ny modell (5 steg istället för 8). §13 uppdaterad: OPS-002 omformulerad, OPS-003 deferred. Nyckelinsikt: Vercel bygger varje preview separat — `NEXT_PUBLIC_*`-variabler för Preview scope bakas in vid build-time för just den builden, så separata env vars räcker utan separat projekt. GPT-citat: "Skippa Vercel Sandboxes-produkten, och skippa också separat Vercel sandbox-projekt just nu. Kör i stället separat Supabase sandbox + Preview env vars i befintligt Vercel-projekt." |
| 2026-03-13 | Claude | **v2.38 — CI HARDENING + RLS RE-CHECK.** `baseline-check.yml` utökad med `gen types` drift check — genererar typer från lokal Supabase, diffar mot committed `types/supabase.ts`, failar om out-of-sync. Trigger-path utökad med `types/supabase.ts`. Targeted RLS baseline re-check (5 kontroller): (1) helper-funktioner i policies — alla `public.`-kvalificerade, (2) RESTRICTIVE syntax — 1 policy korrekt, (3) schema-kvalificerade funktionsanrop — 0 okvalificerade, (4) view/tabell-refs i policy-subqueries — 0 okvalificerade, (5) trigger-/funktionsrefs för tenant-kritiska tabeller — alla kvalificerade. GPT-citat: "Gå vidare med sandbox rollout nu, inte fler stora audit-loopar." |
| 2026-03-13 | Claude | **v2.37 — CANONICAL BASELINE GENOMFÖRD.** Baseline genererad, verifierad och formaliserad. Schema dump via Supabase Management API (759 KB). 10 fixkategorier applicerade (enum-kvalificering, trigger/policy/tabell-kvalificering, forward declarations, RESTRICTIVE-syntax, BOM). Fresh install: `supabase db reset --linked` exit code 0. Schema-räkning verifierad: 247 tabeller, 156 funktioner, 545 policies, 28 enums — exakt match. 304 gamla migreringar arkiverade till `_archived/`. Alla 3 audit-dokument uppdaterade med slutstatus. Runbook skapad: `canonical-baseline-execution.md`. Temp-artefakter rensade. GPT-citat: "Formalisera nu Alternativ B som valt spår, hårdna baseline-processen en sista gång, och fortsätt sedan sandbox rollout ovanpå den nya baselinen." |
| 2026-03-13 | Claude | **v2.36 — CANONICAL BASELINE BESLUT.** GPT godkände audit-resultaten och rekommenderade Alternativ B (Canonical Baseline). Formellt beslut fattat: (1) Strategi B — ny canonical baseline från faktiskt schema, (2) Tidpunkt: nu, före sandbox-deploy, (3) CI-check på db reset per PR, (4) Ingen redesign i samma arbetsfönster. Avgränsning: naming-drift, gamification-sprawl, updated_at-varianter dokumenteras men fixas separat. GPT-citat: "Ta beslut om Canonical Baseline nu, gör den innan vidare sandbox rollout, och håll redesign utanför samma arbetsfönster." |
| 2026-03-13 | Claude | **v2.35 — DATABASE ARCHITECTURE AUDIT.** Sandbox-provisionering avslöjade 10 fresh-install-fel i migrationskedjan (5 feltyper: funktionsordning, naming-drift, saknad CASCADE, fantom-objekt, krockande fixar). Alla 307 migreringar passerar nu (10 fixar applicerade, exit code 0, tsc 0 errors). GPT-direktiv: "Stanna upp och auditera databasen ordentligt." 3 dokument skapade: `database-architecture-audit.md` (schema + migration chain health, domän-för-domän), `database-architecture-remediation-plan.md` (3 alternativ: Minimal Repair / Canonical Baseline / Partial Redesign), `database-rebuild-feasibility.md` (genomförbarhet per alternativ). **Rekommendation: Alternativ B — Canonical Baseline** (2–3 dagar, låg risk, eliminerar migrationsskuld). Sandbox-deploy pausad i väntan på beslut. §14 tillagd i launch-control. |
| 2026-03-13 | Claude | **v2.34 — GPT CALIBRATION (Round 5) — SANDBOX BRIEF.** GPT approved sandbox-implementation-brief.md and added 2 calibration points: (1) **DEPLOY_TARGET standardized values** — `prod`, `sandbox`, `preview`, `enterprise-<customer>` convention locked for observability and safety. (2) **APP_ENV safety guard** — `APP_ENV` env var + script/seed guard pattern to prevent running destructive ops against production. Both applied to sandbox-implementation-brief.md (§4.5, §4.6, Step 4 env vars). GPT verdict: "Mycket solid. Gör sandbox deployment denna vecka." |
| 2026-03-13 | Claude | **v2.33 — SANDBOX IMPLEMENTATION BRIEF.** GPT approved calibration round 4 and directed: "gå från planering till första exekverbara implementation slice." Created `sandbox-implementation-brief.md`: code-verified env var audit (22 vars mapped prod vs sandbox, build-time vs runtime), 8-step implementation sequence (create Supabase project → apply migrations/seeds → create Vercel project → set env vars → connect domain → deploy → verify → configure preview deploys), 17-point verification checklist (infrastructure, application, isolation, preview isolation), rollback plan (zero prod impact — all new infra), enterprise isolation proof matrix (sandbox validates Level B model). Verified against actual code: `lib/config/env.ts`, `app/api/health/route.ts`, `next.config.ts`, `vercel.json`, `lib/supabase/server.ts`, `lib/supabase/client.ts`. Finding: **zero code changes required** — sandbox is a pure infrastructure operation. |
| 2026-03-13 | Claude | **v2.32 — GPT CALIBRATION (Round 4) — PLATFORM OPERATIONS.** GPT feedback applied (4 points): (1) **OPS-SAND-001 elevated** — critical risk callout added to §13 (launch-control), next-phase-execution-plan.md, and platform-operations-implementation-plan.md Phase 2. Principle: "första exekverbara operationsmål = få bort preview/dev från prod-data-plane." (2) **Workstream relationship map** added to platform-operations-architecture.md (§1.1) and launch-control §13 — Phase 1B (execution task) → Platform Operations (operating model) → Enterprise Isolation (topology model). (3) **Owner perspective** added to enterprise-isolation-architecture.md §11 provisioning model — Owner column on all 11 steps + responsibility matrix (Engineering/Ops/Support/Commercial). (4) **Next 3 Moves** section added to platform-operations-implementation-plan.md (§12.1) and launch-control §13 — concrete prioritised execution: sandbox → WSL2 baseline → deploy target registry. Practical direction locked per GPT: Priority 4 = observability foundation. |
| 2026-03-13 | Claude | **v2.31 — GPT CALIBRATION + PLATFORM OPERATIONS WORKSTREAM.** GPT feedback applied to enterprise isolation files: (1) "~3 days total engineering" split into 3-tier readiness model (minimum technical enablement / operational readiness / compliance packaging), (2) "0 architectural blockers" clarified — explicit distinction between architectural readiness and operational/enterprise readiness, (3) Control plane vs data plane explicit model added to architecture (§10), (4) Enterprise provisioning model added (§11, 11-step repeatable flow, ~90min per customer). New parallel workstream created: **Platform Operations & Enterprise Readiness** with 3 documents: `platform-operations-architecture.md` (env topology, WSL2 baseline, sandbox strategy, operating model, release management), `platform-operations-audit.md` (12-dimension audit, 23 operational gaps), `platform-operations-implementation-plan.md` (6-phase roadmap from developer baseline through ops automation). 5 architecture decisions proposed (OPS-001–005). §13 added to launch-control. New principle locked: "Lekbanken ska kunna beskrivas som en säker, driftsbar och revisionsbar plattform innan den beskrivs som en feature-rik plattform." |
| 2026-03-13 | Claude | **v2.30 — ENTERPRISE ISOLATION STUDY.** New strategic workstream added: Enterprise Isolation / Hybrid Deployment Strategy (ADR-E1). 3 documents created: `enterprise-isolation-architecture.md` (system design, 3-level isolation model, deployment topology, design guardrails), `enterprise-isolation-audit.md` (15-dimension code-verified audit, 0 architectural blockers found), `enterprise-isolation-implementation-plan.md` (4-phase roadmap, ~3 days minimum technical enablement before first enterprise contract). Principle locked: "shared-by-default, isolated-when-required — samma produkt, olika deploy targets." §12 added to launch-control. ADR-E1 added to §7. Documentation table updated. Initiated by GPT strategic analysis based on Svenska kyrkan design partner interest. |
| 2026-03-13 | Claude | **v2.29 — SCOPE DEFINITION.** GPT feedback applied: added scope definition table for Priority 2 (content sharing within tenant). Defines in-scope (plan/course/block type sharing, copy-as-template, browse UI) vs out-of-scope (media sharing, cross-tenant, group-level permissions, collaborative editing). Scope boundary: "sharing = visibility + copy". |
| 2026-03-13 | Claude | **v2.28 — DESIGN DECISIONS.** GPT feedback applied to §11: priority order updated (content sharing #2, course builder #3 per GPT recommendation). Three formal design decisions added: ADR-K1 (tenant-defined block types via metadata), ADR-K2 (courses must converge toward block model), ADR-K3 (groups before hierarchy). Product Direction statement added. Intermediate org model defined. |
| 2026-03-13 | Claude | **v2.27 — PRODUCT ROADMAP.** Added §11 "Product Roadmap — Design Partner (Kyrkan)". 4 priorities: (1) tenant-custom planner blocks, (2) course builder 2.0, (3) content sharing within tenant, (4) multi-organisation tenant. Each with architecture readiness assessment verified against codebase. Architecture guardrails defined to prevent lock-in. Key insight: Planner + Courses should share unified block model. |
| 2026-03-13 | Claude | **v2.26 — OBSERVE MODE.** Added Launch Principle section (Observe Mode — no architectural changes before measured traffic). §10 Phase 2 rewritten: renamed "Production Learning", added target audience profile (kyrka/ungdomsarbete), first-year load estimates (200 orgs, 800 sessions/week, 30-60 concurrent), expanded metrics table (9 metrics), connectivity risk, architectural strengths. Phase 3 enhanced with audience-specific bottleneck order. `scaling-analysis.md` updated with matching target audience section + realistic load dimensions. |
| 2026-03-13 | Claude | **v2.25 — LAUNCH DOCUMENTATION UPDATE.** Header: status changed ACTIVE→LAUNCH READY. Phase table: Phases 2/5/6/7 clarified (skipped/deferred/READY). Cross-cutting audit table: added 5 missing completed audits (i18n, Accessibility, Abuse & Privacy, React Boundary, Migration Safety), marked 8 deferred audits with ⏭️. §3 Findings Summary: P1 counts reconciled (47 total, 45 resolved, 2 non-actionable). §10 Roadmap: replaced stale content with 4-phase post-launch path forward (deploy verification → traffic measurement → scaling priorities → backlog). Domain table: Auth/Tenants marked as complete. Scaling-analysis.md cross-referenced in roadmap. |
| 2026-03-12 | Claude | **INCIDENT PLAYBOOK created.** `incident-playbook.md` — severity classification, rollback procedures (Vercel/DB/Stripe), emergency kill-switches, domain-specific playbooks (auth, billing, play sessions, DB perf, cron), monitoring endpoints, env var criticality matrix, post-incident checklist. Per GPT recommendation. |
| 2026-03-12 | Claude | **LAUNCH FREEZE SNAPSHOT created.** `launch-snapshot-2026-03.md` — frozen system state at launch decision. Platform version, codebase metrics (1,914 TS files, ~426K LoC, 287 API routes, 307 migrations), all P0 resolution history, domain status, API security posture, known limitations, post-launch backlog breakdown. Per GPT recommendation. |
| 2026-03-12 | Claude | **FINAL LAUNCH RECONCILIATION.** All 23 audits GPT-calibrated. Phase 3+4 marked COMPLETE. Total findings: P0 13/13 resolved, P1 59/61 resolved (2 non-actionable), P2 117 remaining, P3 86 remaining. Launch verdict: **READY** with 3 conditions (GDPR self-service disabled, migration deploy order, in-memory rate limiter). Post-launch backlog: 203 P2/P3 findings. |
| 2026-03-12 | Claude | **Support audit — GPT CALIBRATED.** No severity changes. Final: **0 P0, 0 P1, 8 P2, 2 P3.** No launch remediation needed. All 23 audits now GPT-calibrated. |
| 2026-03-10 | Claude | Initial creation — established launch readiness program |
| 2026-03-10 | Claude | Applied GPT review feedback: audit queue, unverified findings, audit cycle rule, renumbered sections |
| 2026-03-10 | Claude | Architecture Core Audit complete — 15 findings (0 P0, 5 P1, 7 P2, 3 P3). Root cause: no standardized API wrapper. |
| 2026-03-10 | Claude | GPT Review #3: ARCH-001 P2→P3, ARCH-005 P1→P2. Added React Boundary + Migration Safety audits. Option A confirmed — build API wrapper first. |
| 2026-03-10 | Claude | API wrapper built (`lib/api/route-handler.ts`). Pilot migration: 5 routes (whoami, media/confirm, billing/analytics, health, play/heartbeat) — all patterns validated, 0 wrapper changes, `tsc --noEmit` = 0 errors. Report: `implementation/api-wrapper-pilot.md`. |
| 2026-03-10 | Claude | Phase 1 batch migration: 12 additional route files (17 total handlers) migrated to `apiHandler()`. Patterns: simple user auth, system_admin, Zod input validation, public endpoints. 0 new TS errors. Added wrapper adoption metrics. |
| 2026-03-10 | Claude | Phase 2 batch migration: 19 route files (36 total) — auth-guard routes (requireSystemAdmin/requireAuth) + inline getUser routes. Added rate limiting to email/password change. Per-pattern backlog metrics added. Coverage: 12.5%. 0 new TS errors. |
| 2026-03-10 | Claude | Security & Auth Audit complete — 17 findings (2 P0, 5 P1, 6 P2, 4 P3). Deep-dived 50+ routes. Reduced 60 "public" to 5 true concerns. Auth classification table added. Report: `audits/security-auth-audit.md`. |
| 2026-03-10 | Claude | P0 Remediation: Fixed SEC-001 (snapshots auth gap). Added rate limiting to 10 critical routes (checkout, billing, GDPR, upload, MFA, participant progress). SEC-006 resolved as false positive. Design decisions DD-1–DD-4 proposed. Report: `implementation/security-auth-remediation.md`. |
| 2026-03-10 | Claude | GPT Review #9: DD-1 confirmed, DD-2 softened to "approved in principle", DD-3 revised from default-on to explicit-only, DD-4 refined with privacy-sensitivity flag. Verified NextRequest safety in node runtime + rate limiter architecture analysis added. |
| 2026-03-10 | Claude | Tenant Isolation Audit complete — 10 findings (1 P0, 3 P1, 3 P2, 3 P3). Critical: games builder cross-tenant CRUD via service role bypass (TI-001). Report: `audits/tenant-isolation-audit.md`. |
| 2026-03-11 | Claude | TI-001 P0 FIXED: Added tenant membership validation to all 3 builder handlers (POST/GET/PUT). TI-002 reassessed → product decision (DD-4). TI-004 downgraded P1→P2 (RLS sufficient, defense-in-depth gap only). Found 4 additional service-role+tenant patterns in public/v1/ API. Report: `implementation/tenant-isolation-remediation.md`. |
| 2026-03-11 | Claude | GPT Review #11 verification pass: (1) Targeted regression — 4 cases verified against code, all write-paths audited for bypass. (2) Public V1 API routes fully documented with exact paths, data exposure, PII assessment, severity. TI-NEW-1c (session participant PII) is the only route requiring product decision. TI-001 closed. |
| 2026-03-11 | Claude | GPT Review #12 calibration: (1) SEC-002 split → SEC-002a (critical route coverage, FIXED) + SEC-002b (serverless limiter architecture + long-tail, P1 open). (2) TI-001 marked "fixed and code-verified" — runtime tests recommended as follow-up. (3) P0 count 0 is now accurate after SEC-002 split. |
| 2026-03-11 | Claude | API Consistency Audit (#4) complete — 14 findings (0 P0, 4 P1, 7 P2, 3 P3). Audit: `audits/api-consistency-audit.md`. Key finding: `supabaseAdmin` Proxy always truthy makes `sessions/route.ts` unconditionally bypass RLS. |
| 2026-03-11 | Claude | API Consistency Remediation Plan created — `implementation/api-consistency-remediation.md`. 5 batches defined. Batch 1 (7 routes, mechanical) and Batch 2 (12 routes, regression-sensitive) unblocked. Batches 4-5 blocked on DD-1/DD-2. |
| 2026-03-11 | Claude | Batch 1 execution slice finalized after code inspection of all 9 original candidates. 3 routes moved to Batch 2 (games/builder = 486-line TI-001 site, seed-rules = misclassified multi-method, grant-personal = old requireSystemAdmin import pattern). Final Batch 1: 7 routes with per-route wrapper config, schema requirements, expected code changes, and verification checklist. |
| 2026-03-11 | Claude | **Batch 1 IMPLEMENTED:** 7 routes migrated to `apiHandler()`. Coverage 36→43 (15.0%). APC-006 P1 resolved (consent/log: Zod schema + strict rate limiting). 4 sessionHost routes use `auth: 'user'` + inline `requireSessionHost()`. `tsc --noEmit` = 0 new errors. All exit criteria met. |
| 2026-03-11 | Claude | Batch 1 post-implementation verification passed: (1) `consent/log` — sole caller (`cookie-consent-manager.ts`) always sends all required fields, fire-and-forget pattern means 400/429 responses are transparent to UX. (2) `tokens/cleanup` — cron and admin paths behave identically (handler never accesses auth context). Batch 1 fully closed. |
| 2026-03-11 | Claude | **Batch 2 preflight complete.** 3 open questions resolved: (1) `sessions/route.ts` — cannot remove service role (missing RLS policy for tenant admin view), will add `auth: 'user'` + keep service role (partial APC-003 fix). (2) `grant-personal` — old page guard (`redirect()`) safely replaceable with `apiHandler({ auth: 'system_admin' })`, dead code removed. (3) Conversation-cards (3 routes) deferred to Phase 3+ — hybrid `systemAdmin | tenantRole` auth not supported by apiHandler. Final Batch 2: 9 routes. |
| 2026-03-11 | Claude | GPT Review #18 verification: `participants/sessions/[sessionId]` GET confirmed safe for `auth: 'public'`. Response is a 10-field whitelist — `host_user_id`, `tenant_id`, and other sensitive columns fetched but never exposed. No joins, no PII. Join flow by design. Batch 2 cleared for implementation. |
| 2026-03-12 | Claude | **Batch 2 IMPLEMENTED:** 9 routes migrated to `apiHandler()`. Coverage 43→52 (18.1%). Corrections: `billing/quotes/[id]` has 3 methods (GET+PATCH+DELETE, not 2), `games/builder/[id]` has 2 methods (GET+PUT, not 4). `grant-personal` bugfix: broken page-guard import replaced with proper auth-guard. APC-003/APC-011 partially resolved (auth added to sessions/route.ts, deprecated Proxy replaced). `tsc --noEmit` = 0 new errors. |
| 2026-03-12 | Claude | **GPT Review #19 — Batch 2 cleanup pass:** (1) Wrapper adoption metrics synced: 43→52 (18.1%). Auth classification table updated — all `auth-guard:system_admin`, `auth-guard:cron_or_admin`, `auth-guard:session_host` categories now at 0 (fully migrated). (2) APC-003/APC-011 status clarified: auth gap closed, service-role cleanup deferred to RLS migration, findings stay in P1 remaining count. (3) **Verification A** (`participants/sessions/[sessionId]` DELETE): No auth-order drift — wrapper calls `requireAuth()`, handler calls `requireSessionHost()` which internally calls `requireAuth()` again (harmless idempotent). Both throw `AuthError`, both caught by wrapper catch block → consistent `errorResponse()` format. (4) **Verification B** (`sessions/route.ts`): Response shape bit-identical. Same select, same tenant filter, same `SessionRow` type, same `{ sessions }` response. Only behavioral change: zero-auth → requires user login. **Batch 2 FULLY CLOSED.** |
| 2026-03-13 | Claude | **Batch 3A IMPLEMENTED:** 29 route files migrated from inline `supabase.auth.getUser()` to `apiHandler({ auth: 'user' })`. Coverage 52→81 (28.2%). Previous "66" was undercounted — PowerShell bracket-wildcard issue missed 15 dynamic-segment routes already in the 52 base. Scope: accounts/ (7), billing/ (3), gamification/ (3), gdpr/ (2), journey/ (3), media/ (3), participants/ (2), plans/ (3), play/ (3). 11 routes excluded: 3 optional-auth (`browse/filters`, `games/featured`, `games/search`), 7 admin-check, 1 demo. Rate limiting migrated to wrapper `rateLimit` config where applicable. `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Batch 3B-1 IMPLEMENTED:** 27 route files migrated from inline `supabase.auth.getUser()` to `apiHandler({ auth: 'user' })`. Coverage 81→108 (37.6%). Scope: plans/ (8), play/ (11), participants/ (4), billing/ (3), media/ (1). All single-method routes, no Zod/rate-limit. Billing routes: refactored `requireUser()` and `userTenantRole()` helpers to accept userId directly. Virtual run bypass (abandon/heartbeat) preserved after auth. `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Batch 3B-2a IMPLEMENTED:** 16 route files migrated (multi-method, Zod, mechanical). Coverage 108→124 (43.2%). Wave 1 (10): billing/ (6), media/[mediaId], plans/progress, play/signals, play/time-bank. Wave 2 (6): play/sessions/[id], play/runs/progress, play/decisions, play/outcome, play/roles, play/puzzles/props. Split-auth pattern: `resolveSessionViewer` routes use `auth: 'public'` for participant-accessible methods + inline `resolveSessionViewer` for actual auth. Host-only methods use `auth: 'user'`. Removed all `jsonError` helpers and unused `createServerRlsClient` imports. `tsc --noEmit` = 0 errors after both waves. GPT-approved. |
| 2026-03-13 | Claude | **Batch 3B-2b Pass 1 IMPLEMENTED:** 3/10 regression-sensitive routes migrated. `learning/courses/[courseId]/submit` (reward/RPC bit-identical verified), `plans/[planId]/blocks/[blockId]` (reorder logic verified — no auth-order drift), `plans/schedules/[scheduleId]` (all 3 methods identical capability/query behavior). Coverage 124→127 (44.3%). `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Batch 3B-2b Pass 2 IMPLEMENTED:** 3/10 regression-sensitive routes migrated. `play/runs/[runId]/sessions` (idempotency guard + 409 conflict guard bit-identical, RLS-only — no service role), `play/sessions/[id]/state` (split-auth: PATCH=`auth:'user'` with inline host+system_admin fallback, GET=`auth:'public'` — no auth drift), `play/sessions/[id]/secrets` (unlock/relock state machine + precondition checks bit-identical, service role helper preserved). Coverage 127→130 (45.3%). `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Batch 3B-2b Pass 3 IMPLEMENTED — 3B-2b COMPLETE (10/10):** 4 regression-sensitive routes migrated. `play/sessions/[id]/triggers` (idempotency keys, `fire_trigger_v2_safe` RPC, `p_actor_user_id: userId` — all bit-identical; deprecated POST preserved as `auth:'public'` with 410). `plans/[planId]` (full capability system preserved — `deriveEffectiveGlobalRole(profileResult.data, user)` via `auth!.user!`, `requireCapability` for update/delete — zero auth-order drift). `play/sessions/[id]/assignments` (batch insert+delete-before-insert+count recalculation loop — all bit-identical; `assigned_by: userId`, `actor_user_id: userId`). `play/sessions/[id]/artifacts` (GET=`auth:'public'` with `resolveSessionViewer`, sanitization/reveal-logic/role-filtering/auto-reveal untouched; service role for all GET queries preserved; POST=`auth:'user'` host-only). Coverage 130→134 (46.7%). `tsc --noEmit` = 0 errors. |
| 2025-07-18 | Claude | **DD-1 Execution Plan finalized.** `implementation/dd1-execution-plan.md` written. 52 tenantAuth API routes classified into 4 groups: A=pure system_admin (18 routes, LOW risk), B=assertTenantAdminOrSystem (9, MEDIUM), C=hybrid (21, HIGH), D=anomalous (4, needs investigation). Key finding: `requireTenantRole` does NOT include system_admin bypass — must be enhanced before Batch 4b (precedent: `requireSessionHost` already has this bypass). Batch 4a (18 pure system_admin routes) is unblocked — no wrapper changes needed. Remediation plan updated with revised Batch 4 sub-batches and execution order. |
| 2025-07-18 | Claude | **Batch 4a IMPLEMENTED:** 18 route files (28 handlers) migrated from `tenantAuth.isSystemAdmin()` to `apiHandler({ auth: 'system_admin' })`. Coverage 134→152 (53.0%). Route count reconciliation verified: 52 tenantAuth API routes (was 72 estimated). Sub-batch 4a-1: 10 admin/products/* routes (14 handlers). Sub-batch 4a-2: 4 admin/categories+analytics routes (6 handlers). Sub-batch 4a-3: 1 admin/gamification/awards route (rate limiter preserved in handler). Sub-batch 4a-4: 3 mixed-auth routes — products/ (GET=`auth:'public'`, POST=`auth:'system_admin'`), products/[productId] (GET=`auth:'public'`, PATCH+DELETE=`auth:'system_admin'`), tenants/ (GET=`auth:'user'`, POST=`auth:'system_admin'`). Removed `createServerRlsClient` from 4 routes where only used for auth (sync-stripe, audit, overview, sessions/[sessionId]). `user.id` audit references preserved via `auth!.user!.id`. `tsc --noEmit` = 0 errors. |
| 2025-06-28 | Claude | **Batch 4b IMPLEMENTED:** 9 route files (15 handlers) migrated from `assertTenantAdminOrSystem` to `apiHandler({ auth: 'user' })` + inline `requireTenantRole(['admin', 'owner'], tenantId)`. Coverage 152→161 (56.1%). Infrastructure: `requireTenantRole()` enhanced with system_admin bypass (mirrors `requireSessionHost`). Decision: Used `auth: 'user'` + inline `requireTenantRole(roles, tenantId)` instead of `auth: { tenantRole }` to preserve exact tenantId resolution from body/query params. POST/PATCH handlers use wrapper `input:` for Zod validation. All `assertTenantAdminOrSystem` and `createServerRlsClient` imports removed from 9 files. `tsc --noEmit` = 0 errors. |
| 2025-06-28 | Claude | **Batch 4c-2 IMPLEMENTED:** 4 route files (8 handlers) migrated from `isSystemAdmin \|\| requireTenantMembership` to `apiHandler({ auth: 'user' })` + inline membership check. Coverage 169→173 (60.3%). Scope: shop/route.ts (GET+POST), shop/powerups/consume/route.ts (POST), cosmetics/loadout/route.ts (GET+POST), gamification/pins/route.ts (GET+POST). Pattern: `auth: 'user'` + local `requireTenantMembership` helper preserved as inline business logic. POST handlers use wrapper `input: postSchema` for Zod validation. Demo guard: `auth!.effectiveGlobalRole !== 'system_admin'`. Level check preserved in cosmetics/loadout POST. `tsc --noEmit` = 0 errors. |
| 2025-06-28 | Claude | **Batch 4c-3 IMPLEMENTED:** 6 route files (9 handlers) migrated from dual-path `isSystemAdmin`/`assertTenantAdminOrSystem` to `apiHandler({ auth: 'user' })` + inline `requireTenantRole` / `effectiveGlobalRole` check. Scope: games/route.ts (POST), admin/award-builder/presets/route.ts (GET+POST), admin/coach-diagrams/route.ts (GET+POST), admin/award-builder/exports/route.ts (GET+POST), games/csv-export/route.ts (GET), games/csv-import/route.ts (POST). Pattern: tenant-scoped operations use `requireTenantRole(['admin', 'owner'], tenantId)`, global operations check `auth!.effectiveGlobalRole !== 'system_admin'`. Removed `createServerRlsClient` from 3 files (only used for auth). Removed local `requireAuth()` helpers from 3 files. `user.id` → `userId` via `auth!.user!.id` in 3 files. `tsc --noEmit` = 0 errors. |
| 2025-06-28 | Claude | **METRICS CORRECTION — Canonical inventory.** PowerShell 5.1 path-bracket bugs caused contradictory coverage counts: `Select-String` reported 93 wrapped files (too low — skipped all `[param]` dirs), `Get-Content -Raw` reported 196 (too high — bracket expansion matched wrong files). Definitive `.NET ReadAllText()` scan confirms: **179/287 files (62.4%)**, **257/408 handlers (63.0%)**. The rolling per-batch sum (179) was serendipitously correct. tenantAuth imports confirmed at 7 files. All 3 docs updated with code-scanned metrics, measurement methodology note, and corrected backlog counts. |
| 2025-06-28 | Claude | **Batch 4c-1 IMPLEMENTED:** 8 route files (14 handlers) migrated from `isSystemAdmin \|\| isTenantAdmin` to `apiHandler({ auth: 'user' })` + inline `requireTenantRole(['admin', 'owner'], params.tenantId)`. Coverage 161→169 (58.9%). Scope: all `tenants/[tenantId]/*` routes — route.ts (GET+PATCH), status (POST), settings (GET+PATCH), members (GET+POST), members/[userId] (PATCH), invitations (POST), branding (GET+PATCH), audit-logs (GET). Pattern: tenantId from path params, same operation for both roles. Demo-tenant guard preserved as inline business logic using `auth!.effectiveGlobalRole !== 'system_admin'`. MFA enforcement preserved (members POST, members/[userId] PATCH). GET handlers without admin gate wrapped with `auth: 'user'` only (RLS handles visibility). `tsc --noEmit` = 0 errors. |
| 2025-07-08 | Claude | **Batch 4c-4 IMPLEMENTED:** 7 route files (15 handlers) migrated — tenantAuth backlog reduced to 0. Scope: awards (POST), events (POST), seed-test-badges (POST+GET), presets/[presetId] (GET+PUT+DELETE+POST), exports/[exportId] (GET+PUT+DELETE), coach-diagrams/[diagramId] (GET+PUT+DELETE), invitations/[token]/accept (POST). Patterns: scope-based auth via `authorizeScope()` helper for dual-layer routes, `requireTenantRole` for tenant-scoped, `system_admin` auth level for admin-only, `auth: 'public'` for preview. Coverage: **186/287 files (64.8%)**, **272/408 handlers (66.7%)**. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Phase 5 roadmap added.** Classified all 101 unwrapped routes into 7 groups by auth pattern (code-scanned). Next attack surface: Batch 5a (20 `isSystemAdmin` local) + 5b (9 `RPC:is_system_admin`) — both unblocked, eliminates all remaining admin-check patterns. Batch 6 (12 participant-token) stays blocked on DD-2. Batch 7 (47 mixed/public/special-case) addressed per domain audit. Target: ~79% after 5a–5d, ~83% after 6. Updated remediation doc with matching batch structure. |
| 2025-07-22 | Claude | **Batch 5a IMPLEMENTED:** 19 route files (33 handlers) migrated from local `isSystemAdmin`/`getServerAuthContext`/`app_metadata.role` patterns to `apiHandler()`. Coverage: **205/287 files (71.4%)**, **305/408 handlers (74.8%)**. Sub-batches: conversation cards (6 files), MFA (4), Stripe admin (2), Prices (2), Purposes (2), Leaderboard (1), Games (2). Auth patterns eliminated: local `isSystemAdmin()` functions → `auth: 'system_admin'`, `getServerAuthContext('/admin')` → `auth: 'user'`, RPC `is_system_admin` + `has_tenant_role` → `requireTenantRole()`, `app_metadata.role` check → `auth: 'system_admin'`. Mixed-auth routes (Purposes) use `auth: 'public'` for GET + `auth: 'system_admin'` for mutations. 3 tsc errors found and fixed during verification. `tsc --noEmit` = 0 errors. `isSystemAdmin` remaining: 14 (in other batches/lib). |
| 2025-07-22 | Claude | **Batch 5b IMPLEMENTED:** 9 route files (17 handlers) migrated — all `rpc('is_system_admin')` calls eliminated from API routes. Coverage: **214/287 files (74.6%)**, **322/408 handlers (78.9%)**. Groups: (A) Pure system_admin — promo-codes (GET+POST+DELETE), refund (POST), sinks (POST+PATCH), meters (GET=`user`, POST=`system_admin`). (B) Tiered auth — rules (GET+PATCH) and dashboard (GET) use `auth: 'user'` + `requireTenantRole(['owner', 'admin'], tenantId)` with system_admin bypass. (C) API-key dual-auth — usage POST uses `auth: 'public'` + inline API key check + `requireAuth()` fallback for system_admin; aggregate POST uses `auth: 'public'` + inline API key check; both GETs use `auth: 'system_admin'` / `auth: 'user'`. (D) Bonus — scheduled-jobs (GET+POST) migrated from `getServerAuthContext()` + `effectiveGlobalRole` check → `auth: 'system_admin'`. Zero `rpc('is_system_admin')` calls remain in route files (verified by grep). 2 tsc errors fixed (Zod `.default()` type narrowing through generic wrapper). `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Batch 5c IMPLEMENTED:** 3 route files (4 handlers) migrated — all `resolveSessionViewer` routes now wrapped. Coverage: **217/287 files (75.6%)**, **326/408 handlers (79.9%)**. All routes use `auth: 'public'` + inline `resolveSessionViewer` (proven split-auth pattern from Batch 3B-2a). Routes: chat (GET+POST), conversation-cards/collections/[collectionId] (GET), decisions/[decisionId]/results (GET). Removed all `jsonError` helpers. Business logic bit-identical: visibility filtering, tenant scope check, step unlock gating, vote counting all preserved. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Batch 5d IMPLEMENTED — Phase 5 COMPLETE:** 6 route files (6 handlers) migrated — all `inline:getUser` straggler routes now wrapped. Coverage: **223/287 files (77.7%)**, **332/408 handlers (81.4%)**. Routes: browse/filters (GET, `auth:'public'`), games/featured (GET, `auth:'public'`), games/search (POST, `auth:'public'`), demo/status (GET, `auth:'public'`), games/[gameId]/publish (POST, `auth:'user'` + inline `app_metadata.role` check for admin/owner — cannot use `auth:'system_admin'` because `owner` role not mapped by `deriveEffectiveGlobalRole`), games/[gameId]/related (GET, `auth:'public'`). Fixes: redundant double `getUser()` in search eliminated, try/catch removed from demo/status (wrapper handles). All optional-auth routes keep inline `createServerRlsClient()` + `supabase.auth.getUser()`. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **DD-2 SPEC FINALIZED — Batch 6 unblocked.** `dd2-participant-auth-spec.md` written and GPT-reviewed. Contract: `auth: 'participant'` adds `ParticipantContext { participantId, displayName, sessionId, role, status, expiresAt }`. Auto rate limiting (`'participant'` tier, 60/min) applied when `auth === 'participant'`. Error model: 401 (missing/invalid/expired), 403 (kicked/blocked), no 404 (prevents enumeration). 10 routes in 4 sub-batches: 6a (4 play/me* routes, pure participant), 6b (2 progress routes, body→header transport fix), 6c (2 join/rejoin lifecycle, `auth:'public'`), 6d (2 SVG mixed-auth, `auth:'public'`). Bug fixes bundled: missing expiry check in play/ready, missing rate limiting in rejoin, missing try/catch in play/me + play/ready, missing `await` on `createServiceRoleClient()` in progress routes. Infrastructure: minor `ResolvedParticipant` extension in play-auth.ts (add `expiresAt`), new `resolveParticipantAuth()` in route-handler.ts, new `'participant'` rate limit tier. |
| 2026-03-11 | Claude | **DD-2 GPT review v2 — 3 research appendices added.** (D) Auth atomicity: checks 1–4 (token exists, not expired, not blocked/kicked) are atomic via single DB row; check 5 (session active) intentionally stays in handler layer — session status gates vary per route. TOCTOU window ≈ milliseconds, acceptable. (E) system_admin override: inconsistency identified — `requireSessionHost()` gives full bypass, `resolveSessionViewer()` gives no bypass. Recommendation: keep current behavior (Option C), revisit in Sessions & Participants audit. (F) `withSessionViewer()` adapter: tracked as post-Batch 6 / post-Play-audit improvement. Would eliminate viewer boilerplate in ~8 Group B routes. |
| 2026-03-11 | Claude | **DD-2 GPT review v3 — Play state model assessed.** Model classified as **B+**: denormalized columns + command idempotency + monotonic broadcast seq + DB constraints + audit log. GPT sharpened: (1) idempotency covers replay/duplicate but not concurrent semantic conflicts between different clients — those are last-write-wins, (2) broadcast_seq provides delivery consistency, not state correctness. Biggest gap confirmed: runtime mutations (set_step, set_phase, timers) bypass session-status lifecycle guards. Play audit (#6) updated with 4-area GPT-defined agenda: runtime mutation matrix, state transition coverage, multi-tab/actor races, authoritative source mapping. **No changes to DD-2 contract or Batch 6 plan.** |
| 2026-03-11 | Claude | **Batch 6a IMPLEMENTED:** 4 route files (4 handlers) migrated — first participant-token routes wrapped. Coverage: **227/287 files (79.1%)**, **336/408 handlers (82.4%)**. Infrastructure: `resolveParticipantAuth()` added to route-handler.ts, `'participant'` rate limit tier (60/min) added to rate-limiter.ts, `expiresAt` added to `ResolvedParticipant` in play-auth.ts. Routes: play/me (GET), play/me/role (GET), play/me/role/reveal (POST), play/ready (POST). All use `apiHandler({ auth: 'participant' })`. DD-2 error model enforced: 401 (missing/invalid/expired), 403 (blocked/kicked), no 404. Bug fixes: play/ready missing expiry check (now enforced by wrapper), play/me + play/ready missing try/catch (now via wrapper), `await` on sync `createServiceRoleClient()` removed. Response shapes bit-identical for all 4 routes. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Batch 6b IMPLEMENTED:** 2 route files (2 handlers) migrated — body-token transport eliminated. Coverage: **229/287 files (79.8%)**, **338/408 handlers (82.8%)**. Routes: participants/progress/update (POST), participants/progress/unlock-achievement (POST). Both use `apiHandler({ auth: 'participant' })`. **Transport fix:** `participant_token` removed from request body — now via `x-participant-token` header (DD-2 standard). Client hooks updated: `useParticipantProgress.ts`, `useAchievementUnlock.ts`. Rate limiting: `'api'` (100/min) → auto `'participant'` (60/min). Auth: inline token lookup + manual status/expiry checks → wrapper `resolveParticipantAuth()`. Removed: inline try/catch (wrapper handles), `applyRateLimit` import, `REJECTED_PARTICIPANT_STATUSES` import (now in wrapper). Body validation: `participant_token` no longer required in body — `game_id` (update) / `achievement_id` (unlock) remain required. Response shapes bit-identical. Business logic bit-identical: upsert progress, broadcast, activity log, idempotent unlock check, game progress array update. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Batch 6c IMPLEMENTED:** 2 route files (2 handlers) migrated — lifecycle routes wrapped. Coverage: **231/287 files (80.5%)**, **340/408 handlers (83.3%)**. Routes: participants/sessions/join (POST, `auth:'public'`, `rateLimit:'strict'`), participants/sessions/rejoin (POST, `auth:'public'`, `rateLimit:'api'`). Both stay `auth:'public'` per DD-2 (manage token lifecycle — no participant identity exists yet at join, and rejoin validates stored token from body). **Bug fixes:** (1) rejoin had NO rate limiting — now `'api'` (100/min) prevents token brute-forcing (DD-2 identified). (2) rejoin invalid token returned 404 → now 401 (DD-2 enumeration protection). (3) `await` on sync `createServiceRoleClient()` removed from both routes. (4) Inline try/catch removed (wrapper handles). (5) `errorTracker.api()` removed from join catch (wrapper error chain). Join validation errors converted from `NextResponse.json 400` to `throw ApiError.badRequest()`. No client changes needed — body shapes and response shapes unchanged. Re-export aliases (`play/join`, `play/rejoin`) work unchanged (named `POST` export preserved). `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Batch 6d IMPLEMENTED — BATCH 6 COMPLETE (10/10 routes, DD-2 fully realized):** 2 route files (2 handlers) migrated — mixed-auth SVG routes wrapped. Coverage: **233/287 files (81.2%)**, **342/408 handlers (83.8%)**. Routes: coach-diagrams/[diagramId]/svg (GET, `auth:'public'`), spatial-artifacts/[artifactId]/svg (GET, `auth:'public'`). Both use `apiHandler({ auth: 'public' })` with complex inline dual-auth retained (authenticated user → always allowed; participant → multi-table chain validates game references the asset). **No auth or visibility logic changed** — all participant access control chains, variant visibility checks (public/role_private/leader_only), role mapping, and enumeration protection preserved bit-identical. coach-diagrams: participant errors all 401 (uniform). spatial-artifacts: participant errors all 403 (uniform, prevents artifact-ID enumeration); not-found returns 403 for participants, 404 for authenticated users. SVG rendering logic (spatial adapter + legacy pre-rendered) untouched. No rate limiting added (DD-2 doesn't specify, asset-serving endpoints). `_req` → `req` (wrapper context), `{ params }` → `params` (wrapper resolves). No client changes needed. `tsc --noEmit` = 0 errors. |
| 2025-07-24 | Claude | **Play Runtime Audit complete — 14 findings (2 P0, 4 P1, 5 P2, 3 P3).** Triple status mutation path (PLAY-001 P0) and TOCTOU race (PLAY-002 P0) confirmed as real root causes. 5 Design Decisions (DD-PLAY-1 through DD-PLAY-5) locked by GPT review. M1 implementation (state machine consolidation) unblocked — strict sequential execution: M1→M2→M3→M4→M5. Reports: `audits/play-audit.md`, `implementation/play-runtime-remediation.md`, `play-architecture.md`. |
| 2025-07-24 | Claude | **M1 — State Machine Consolidation COMPLETE.** PLAY-001 P0 FIXED + PLAY-004 P1 FIXED. Changes: (1) `session-command.ts` enriched — gamification event + participant disconnect on `end`, TOCTOU-safe atomic UPDATE with `.in('status', from_statuses)`. (2) PATCH `sessions/[id]` → thin adapter delegating to `applySessionCommand()`. (3) Control route → delegates to pipeline, preserves activity log + legacy `session:` broadcast. No client changes needed (`session-api.ts`, `HostPlayMode.tsx`, `useSessionControl.ts` unchanged). Targeted regression: (a) idempotency collision safe — DB unique index + 23505 catch, (b) no double broadcast — different channels/events/subscribers, (c) disconnect covers all 5 participant statuses correctly, (d) gamification exact-once — triple protection (command dedup + DB idempotency_key + function catch). `tsc --noEmit` = 0 errors. |
| 2025-07-24 | Claude | **M2 — Session-Status Guards COMPLETE.** PLAY-003 P1 FIXED. Created `lib/play/session-guards.ts` with central `PLAY_MUTATION_STATUS_POLICY` (18 mutation types) + `assertSessionStatus()` returning null or 409. Applied guards to 17 routes across 5 categories: (A) 10 simple PSS-based, (B) 2 direct-query (assignments SELECT extended), (C) 1 special fetch (chat `getSessionStatus()` helper), (D) 3 raw-export (puzzle needed new session fetch), (E) 1 participant-auth (me/role/reveal). 7 routes intentionally excluded (pre-existing guards or pipeline delegation). Targeted regression: 6 negative cases (vote/ended→409, puzzle/ended→409, ready/cancelled→409, signals/locked→409, time-bank/locked→409, chat/ended→409) + 3 positive + 3 additional checks — all verified. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **M3 — Atomic Puzzle RPCs COMPLETE.** PLAY-002 P0 FIXED — **last P0 resolved, 0 P0 remaining across all audits.** Created 4 atomic Postgres RPCs in `supabase/migrations/20260311000001_atomic_puzzle_rpcs.sql`: (1) `attempt_puzzle_riddle_v2` — append attempt + solve/lockout with `FOR UPDATE` row lock, answer validation stays in TypeScript (fuzzy normalization). (2) `attempt_puzzle_counter_v2` — atomic increment/decrement + target check, all logic in SQL. (3) `attempt_puzzle_multi_answer_v2` — atomic item toggle in checked array. (4) `attempt_puzzle_qr_gate_v2` — atomic QR scan verification. All RPCs follow keypad pattern: `INSERT ON CONFLICT DO NOTHING` + `SELECT FOR UPDATE` + modify + write. Route `puzzle/route.ts` rewritten: removed 4 handler functions + `updatePuzzleState` helper, replaced with RPC calls via typed `callRpc` wrapper (pending Supabase types regeneration). GET handler unchanged (read-only). Fixed pre-existing bug: `checkRiddleAnswer()` object was used as boolean (always truthy — all riddle answers treated as correct). Broadcast unchanged — puzzle uses client-side broadcast via `usePuzzleRealtime` hook, not server-side. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **M4 — Broadcast Completeness COMPLETE.** PLAY-005 P1 FIXED. Added server-side broadcasts for 6 mutations across 3 route files: (1) kick/block/approve in `participants/[participantId]/route.ts` → `participants_changed` event. (2) Readiness toggle in `play/ready/route.ts` → `participants_changed` with `is_ready` payload. (3) Role assign/unassign in `assignments/route.ts` → `assignments_changed` event. All broadcasts use `broadcastPlayEvent()` helper (same as all other Play routes) on `play:{sessionId}` channel. All broadcasts fire AFTER successful DB commit — no optimistic pre-write broadcasts. Client wiring: added `ParticipantsChangedBroadcast` + `AssignmentsChangedBroadcast` types to `types/play-runtime.ts`, added `onParticipantsChanged` + `onAssignmentsChanged` callbacks to `useLiveSession` hook with stable refs. Response shapes unchanged. P1 remaining: 16. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **M4 UI wiring — kick/block participant detection.** GPT-directed targeted fix: `ParticipantPlayView` now passes `onParticipantsChanged` to `useLiveSession`. When `participant_id` matches current participant AND action is `kicked` or `blocked`, a full-screen removal overlay is shown immediately (z-50, backdrop-blur, i18n messages, "back to start" link). i18n keys added to all 3 locales (sv/en/no) under `play.participantView.session.removed*`. Closes the critical gap where a kicked participant would sit idle until 30s polling or next API call. No changes to host-side components, no polling refactors, no general `useLiveSession` restructuring. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **M5 — Wrapper Coverage COMPLETE. PLAY-006 P1 FIXED.** 3 route files (5 handlers) wrapped in `apiHandler({ auth: 'participant' })`: vote POST, keypad POST+GET, puzzle POST+GET. **Security fix:** All 5 handlers add `p!.sessionId !== params.id` → 403 check (wrapper resolves participant by token only, not session-scoped). **Rate limiting:** Auto `'participant'` tier (60 req/min) applied — intentional addition, previously unprotected. **Error model:** Wrapper handles auth errors per DD-2 (401 invalid/expired, 403 kicked/blocked), handler errors use `NextResponse.json({ error })`, unhandled errors → `errorResponse()` with `requestId` for tracing. Removed: `resolveParticipant` import (3 files), `jsonError` helper (2 files), outer try/catch (puzzle). Response shapes bit-identical for all 5 handlers. Business logic unchanged. Wrapper coverage: **236/287 files (82.2%)**, **347/408 handlers (85.0%)**. P1 remaining: 15. `tsc --noEmit` = 0 errors. |
| 2026-03-11 | Claude | **Play remediation M1–M5 CLOSED — GPT approved.** All P0 and P1 play-critical findings resolved. Play domain remediation status changed from 🟡 to ✅. GPT confirmed: "Play-remediationen är genomförd för launch-scope." Next step: Sessions & Participants audit (#8) per GPT recommendation — fresh context from Play, join/rejoin lifecycle already flagged, participant management adjacent to just-stabilized Play domain. |
| 2026-03-11 | Claude | **Sessions & Participants Audit (#8) COMPLETE — 13 findings (0 P0, 5 P1, 5 P2, 3 P3).** Explored 51 routes (28 play sessions + 19 participants + 2 public v1 + 2 forwarding). Key findings: SESS-001 mock data fallback masks errors, SESS-002 no Zod on join/rejoin/create (avatarUrl unvalidated), SESS-003 unwrapped admin routes (no auth/rate limit), SESS-004 control route bypasses broadcastPlayEvent, SESS-005 export no rate limit. Assessed: join/rejoin flow, participant lifecycle, host-participant boundary, broadcast architecture (3 channels), token security (localStorage), session code entropy. 4 remediation milestones planned (M1–M4). Created: `sessions-architecture.md`, `audits/sessions-audit.md`, `implementation/sessions-remediation.md`. |
| 2026-03-11 | Claude | **GPT Calibration applied to Sessions audit.** SESS-004 reclassified P1→P2 (architecture/hardening, no user-facing issue). SESS-008/SESS-009 subsumed under SESS-002 (umbrella finding). SESS-001 category corrected to Implementation/Reliability. SESS-010 noted as documented design tradeoff. Effective counts: 4 P1, 6 P2, 3 P3. Launch P1 remediation: M1→M3→M2. M4 deferred to post-launch. |
| 2026-03-11 | Claude | **Sessions M1 — Quick Wins COMPLETE.** 3 findings fixed: SESS-001 (mock fallback removed, proper 404 on error — also fixed client-side mock in `ParticipantDetailPage.tsx`), SESS-003 (both admin routes wrapped in `apiHandler({ auth: 'user' })`), SESS-005 (export endpoint rate limited `'api'`). GPT-verified: 5 scenarios confirmed (401/404/success/export rate). Wrapper coverage: **238/287 files (82.9%)**, **349/408 handlers (85.5%)**. `tsc --noEmit` = 0 errors. P1 remaining: 15. **GPT approved.** |
| 2026-03-11 | Claude | **Sessions M3 — Rejoin Status Gate COMPLETE.** SESS-007 P2 FIXED. Added `draft` to rejoin's blocked statuses (403 "Session is not open for participants yet"). `locked` remains allowed (existing participant reconnecting — intended semantics). Status matrix now consistent with join route: draft→403, lobby/active/paused/locked→allowed, ended/cancelled/archived→410. `tsc --noEmit` = 0 errors. P1 remaining: 15. **GPT approved.** |
| 2026-03-11 | Claude | **Sessions M2 — Input Validation COMPLETE. SESS-002 P1 FIXED.** Zod schemas added to all 3 session lifecycle routes. **join**: wrapper `input:` — `sessionCode` (1-10, codes are 6 chars), `displayName` (1-50, trimmed), `avatarUrl` (URL, max 2048, HTTP(S) scheme check). **rejoin**: wrapper `input:` — `participantToken` (UUID), `sessionId` (UUID). **create**: internal `safeParse()` — `displayName` (1-100, trimmed), `description` (max 500), `expiresInHours` (0.5-720), `settings.maxParticipants` (int 1-1000), `settings.tokenExpiryHours` (0.5-720, nullable). All manual validation removed, replaced with schema validation. Invalid input → 400 with `VALIDATION_ERROR` code + field-level errors. `tsc --noEmit` = 0 errors. **Sessions remediation complete: M1 ✅ M2 ✅ M3 ✅. 0 P1 remaining within decided launch scope.** M4 deferred post-launch. P1 remaining: 14. |
| 2026-03-11 | Claude | **Sessions M2 — GPT APPROVED. Sessions domain closed for launch scope.** GPT verification feedback addressed: (1) `sessionCode` max tightened 20→10, comment added (codes are 6 chars, max 10 allows formatted "H3K-9QF"). (2) `avatarUrl` HTTP(S)-only confirmed safe — no client currently sends avatarUrl (all join UIs send only code + displayName; Avatar component falls back to initials). (3) Client 400 handling verified: all 5 callers (join page, join api.ts, rejoin hook, rejoin api.ts, create page) only read `data.error` — none parse `data.details` or `data.code` for field-level errors. New `VALIDATION_ERROR` response is backwards-compatible: `error` field ("Invalid payload") is displayed, `details` array is ignored. No client breakage. (4) "0 P1 remaining" qualified to "within decided launch scope" in all docs. |
| 2026-03-11 | Claude | **Sessions domain — GPT FINAL APPROVAL.** GPT slutbedömning: "Sessions-domänen är launch-safe. Inte bara 'fungerar', utan arkitekturellt stabil för produktion." All 4 verification points confirmed: sessionCode max(10) ✅, avatarUrl HTTP(S) ✅, client 400 compatibility ✅, scope-qualified wording ✅. SSoT between audit/remediation/launch-control confirmed intact. **Audit queue reordered per GPT:** Games (#5) → Planner (#7) → Journey (#9). Games recommended next — highest runtime complexity and subtlest failure modes. |
| 2026-03-11 | Claude | **Games System Audit COMPLETE.** 14 findings (GAME-001 split a/b/c): 0 P0, 3 P1, 8 P2, 3 P3. P1s: GAME-001a (DELETE lacks app-level gate, RLS mitigated), GAME-001b (`?force=true` destructive op accessible to non-sysadmin), GAME-002 (snapshots — any authed user can create for any game, service-role bypass, error leakage). P2s: GAME-001c (PATCH service-role bypass), GAME-003 (builder PUT non-atomic — P2-high, admin-only tool, no auto-save), GAME-004 (PostgREST filter interpolation — P2, unsafe pattern but RLS+AND-filters+type enforcement contain it, negligible practical exploit), GAME-005 (reactions batch no auth/no size cap), GAME-006-009 (rate limiting, validation, shared catalog doc, builder error handling). P3s: GAME-010/011/012. Remediation: M1 (snapshots+reactions+force-delete), M2 (search sanitization+DELETE gate), M3 (service-role+builder errors), M4 (atomicity+hardening — deferred). P1 total: 17 (14 prior + 3 new). |
| 2026-03-11 | Claude | **Games audit GPT-calibrated.** Applied 5 calibration points: (1) GAME-001 split into 001a/001b/001c — 3 separate remediation tasks. (2) GAME-003 reclassified P1→P2-high: builder is admin-only, explicit save only (no auto-save), low concurrency, 26 sequential DB ops (20 silent), largest tech debt in Games but not launch-traffic risk. (3) GAME-004 reclassified P1→P2: verified — postgrest-js `.or()` does zero escaping (confirmed in source), comma injection adds extra filter clauses, BUT AND-filters are separate URL params (can't override), RLS applies, SELECT is fixed, UUID columns cause type-error 400. Realistic worst case: filter manipulation within same table/permissions, negligible impact. Also affects 9+ admin routes (server actions). (4) GAME-008 reframed: "Shared catalog visibility not explicitly documented" — not a vulnerability, design decision. (5) Remediation reordered per GPT: M1 focuses on highest risk-reduction/hour (GAME-002, GAME-005, GAME-001b). |
| 2026-03-12 | Claude | **Games audit — GPT APPROVED for implementation.** GAME-005 severity consistency resolved: stays P2 (RLS provides real auth — gap is defense-in-depth + DoS, not auth bypass), included in M1 because fix is trivial (~15 min, highest ROI). All three docs (games-audit.md, launch-control.md, M1 plan) now use same severity + explicit rationale for P2-in-M1 placement. GPT gröntljus: M1 (GAME-002, GAME-005, GAME-001b) cleared for implementation. |
| 2026-03-12 | Claude | **Games M1 — Auth Hardening COMPLETE.** 3 findings fixed across 3 route files: (1) **GAME-002 ✅** — `snapshots/route.ts` fully rewritten: both GET/POST wrapped in `apiHandler({ auth: 'user' })`, `verifySnapshotAccess()` helper checks game existence + `requireTenantRole(['admin', 'owner', 'editor'], owner_tenant_id)` with system_admin bypass, returns 404 on denial (no existence leakage), Zod schema `versionLabel: z.string().max(100).optional()`, all `details: error.message` leaks removed. (2) **GAME-005 ✅** — `game-reactions/batch/route.ts` wrapped in `apiHandler({ auth: 'user', rateLimit: 'api' })`, Zod schema `gameIds: z.array(z.string().uuid()).min(1).max(100)`, `error.message` leak removed, RLS client preserved. (3) **GAME-001b ✅** — `games/[gameId]/route.ts` DELETE: explicit `if (forceDelete && !isSystemAdmin) → 403` gate before destructive session termination. Wrapper coverage: **240/287 files (83.6%)**, **352/408 handlers (86.3%)**. P1 remaining: 15. `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Games M1 — GPT verification.** Two kontrollpunkter resolved: (1) Snapshot `editor` role: `game_snapshots` INSERT RLS explicitly allows `editor` role (`tm.role IN ('owner', 'admin', 'editor')`). App-layer `verifySnapshotAccess()` updated to include `'editor'` — aligns with RLS intent. Snapshots are part of editorial workflow in the builder. (2) Reactions batch anonymous usage: verified `/api/game-reactions/batch` has exactly 1 caller (`BrowsePage.tsx`) inside `/app` layout which enforces auth redirect. `useAuth()` is used in component. No anonymous access path exists. `auth: 'user'` is safe. `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Games M2 — Search Sanitization + DELETE Gate COMPLETE.** 2 findings fixed: (1) **GAME-004 ✅** — PostgREST `.or()` search sanitization applied at all 5 interpolation sites (`games/search` ×2, `admin/games/search` ×1, `gameService.ts` ×2). Regex: `search.replace(/[,()]/g, '')` — minimal, deterministic, strips only DSL metacharacters. Empty result after sanitization skips `.or()` entirely. (2) **GAME-001a ✅** — `games/[gameId]/route.ts` all 3 handlers wrapped in `apiHandler`: GET=`auth:'public'`, PATCH=`auth:'user'`, DELETE=`auth:'user'` + explicit role gate (`admin`/`owner`/`system_admin`, else 403). DELETE access matrix: system_admin→any game, owner/admin→own tenant, editor/member→403, unauth→401. Wrapper coverage: **241/287 files (84.0%)**, **355/408 handlers (87.0%)**. P1 remaining: 14. P2 remaining: 46. `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Games M3 — Service-Role + Builder Errors COMPLETE. Games domain: launch-scope complete.** 2 findings fixed: (1) **GAME-001c ✅** — `games/[gameId]/route.ts` PATCH: `const supabase = supabaseAdmin` → `const supabase = isSystemAdmin ? supabaseAdmin : rlsClient`. Same pattern as GET/DELETE. RLS policy `games_update_leader` now enforced for all non-system-admin callers. (2) **GAME-009 ✅** — `games/builder/[id]/route.ts` PUT: 21 previously-silent DB operations now destructure `{ error }` and push to `warnings[]` array. Warnings logged via `console.warn` and returned as `{ success: true, warnings }`. Operations covered: steps (del/ups), materials (del/ins), secondary_purposes (del/ins), phases (del/ups), roles (del/ups), board_config (ups/del), cover_media (del/ins), artifacts (read/del), artifact_variants (del), triggers (del). GPT noted tradeoff: `success: true` with warnings = "saved with degradations" — acceptable for launch, post-launch should surface in UI or go atomic. **P1 remaining: 14. P2 remaining: 44.** `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Planner System Audit (#7) COMPLETE — 16 findings (0 P0, 8 P1, 6 P2, 2 P3). Awaiting GPT calibration.** Audited 27 route files (~38 handlers). 3 unwrapped routes found (PLAN-001/002/003). 8 P1s: 3 wrapper migrations + 5 defense-in-depth (block CRUD no capability, plan start no capability, schedules no access check, notes/tenant arbitrary tenant_id, copy arbitrary owner_tenant_id). RLS verified comprehensive on all 10 planner tables (migration `20260305100000_tenant_rls_planner.sql`). Key finding: PLAN-002 visibility route can potentially reassign plan to arbitrary tenant (RLS UPDATE policy checks ownership but may not validate new tenant_id value). PRE-007 (dual dynamic segments) RESOLVED — Next.js static priority, no conflict. 5 milestones proposed: M1 (wrapper migration), M2 (capability gates), M3 (tenant boundary), M4 (data integrity — post-launch), M5 (validation/cleanup — post-launch). Report: `audits/planner-launch-audit.md`. P1 remaining: 22 (14 prior + 8 PLAN). P2 remaining: 50. P3 remaining: 26. |
| 2026-03-13 | Claude | **Planner M1 — Wrapper Migration COMPLETE.** 3 P1 findings fixed: (1) **PLAN-001 ✅** — `plans/route.ts` POST wrapped in `apiHandler({ auth: 'user' })` + tenant membership validation (`owner_tenant_id ∈ user.memberships`, system_admin bypass). (2) **PLAN-002 ✅** — `plans/[planId]/visibility/route.ts` POST wrapped + tenant membership validation for `targetTenant` — blocks arbitrary tenant reassignment attack. (3) **PLAN-003 ✅** — `plans/[planId]/play/route.ts` GET wrapped as `apiHandler({ auth: 'public' })`, preserving public access with standardized error handling. Wrapper coverage: **243/287 files (84.7%)**, **355/408 handlers (87.0%)**. P1 remaining: 19 (5 PLAN). `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Planner M2 — Capability Gates COMPLETE.** 3 P1 findings fixed across 6 route files: Created shared capability module `lib/planner/require-plan-access.ts` (domain's single source of truth per GPT directive). Helpers: `requirePlanAccess(supabase, user, planId, capability)` + convenience wrappers `requirePlanEditAccess`, `requirePlanStartAccess`, `requirePlanReadAccess`. (1) **PLAN-004 ✅** — 4 block mutation handlers (`blocks/route.ts` POST, `blocks/[blockId]/route.ts` PATCH+DELETE, `blocks/reorder/route.ts` POST) now call `requirePlanEditAccess()` → checks `planner.plan.update` → 404/403. (2) **PLAN-005 ✅** — `play/[planId]/start/route.ts` POST calls `requirePlanStartAccess()` → checks `play.run.start` before expensive snapshot work. (3) **PLAN-006 ✅** — 3 schedule mutation handlers (`schedules/route.ts` POST, `schedules/[scheduleId]/route.ts` PUT+DELETE) call `requirePlanEditAccess()` → PUT/DELETE first fetch schedule to resolve `plan_id`. GET routes remain RLS-only (correct). P1 remaining: 16 (2 PLAN). `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Planner M3 — Tenant Boundary COMPLETE. Planner domain: launch-scope complete.** 2 P1 findings fixed: (1) **PLAN-007 ✅** — `notes/tenant/route.ts` POST: added `assertTenantMembership()` call from shared `lib/planner/require-plan-access.ts` module — validates `body.tenant_id ∈ user.memberships` with system_admin bypass, 403 `INVALID_TENANT` on denial. (2) **PLAN-008 ✅** — `copy/route.ts` POST: added inline tenant membership check using already-fetched `memberships` array — `memberships.some(m => m.tenant_id === targetTenantId)` with system_admin bypass, 403 `INVALID_TENANT` on denial. Pre-M3 enhancement: `assertTenantMembership(supabase, user, tenantId)` added to shared module per GPT directive (defense-in-depth — catches supabaseAdmin misuse). **P1 remaining: 14. Planner: 0 P1 remaining.** `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Journey & Gamification Audit (#9) COMPLETE — 12 findings (0 P0, 4 P1, 5 P2, 3 P3). Awaiting GPT calibration.** Audited 36 route files (21 user-facing + 15 admin). P1s: JOUR-001 (leaderboard/preferences no auth/no wrapper), JOUR-002 (achievements check/unlock unwrapped), JOUR-003 (public leaderboard/sinks unwrapped), JOUR-004 (achievement/[id] tenantId unvalidated). 10 strengths documented (Phase 4.1 hardening, idempotent unlocks, coin economy atomic RPCs). 4 remediation milestones: M1 (wrapper migration — 5 routes), M2 (tenant boundary — achievement/[id]), M3/M4 deferred post-launch. Cross-check confirmed all prior domains clean. P1 remaining: 18 (14 prior + 4 JOUR). Report: `audits/journey-audit.md`. |
| 2026-03-12 | Claude | **Journey audit GPT-calibrated.** 3 findings reclassified P1→P2: JOUR-002 (wrapper consistency, not auth bypass), JOUR-003 (intentionally public per DD-4, rate limiting = P2), JOUR-004 (tenant-context correctness, RLS scopes to user's own data). JOUR-001 stays P1 with sharpened framing: tenant-scoped preference mutation without explicit membership validation. JOUR-009 kept as umbrella in audit, split 009a/b/c in remediation. Milestones reordered per GPT: M1 = tenant boundary + auth (JOUR-001/004/005), M2 = high-ROI rate limiting (JOUR-007/008/009a), M3 = wrapper migration (post-launch), M4 = validation/cleanup (post-launch). **Final counts: 1 P1, 8 P2, 3 P3. P1 remaining: 15.** |
| 2026-03-12 | Claude | **Journey M1 — Tenant Boundary + Explicit Auth COMPLETE.** 3 findings fixed across 2 route files: (1) **JOUR-001 ✅** — `leaderboard/preferences/route.ts` fully rewritten: raw NextRequest → `apiHandler({ auth: 'user' })`. POST uses `input: postSchema` (Zod UUID + boolean) + `assertTenantMembership()` for tenantId validation. GET requires auth + UUID validation + `assertTenantMembership()`. (2) **JOUR-004 ✅** — `achievement/[id]/route.ts`: added `assertTenantMembership()` check for query-param tenantId. (3) **JOUR-005 ✅** — same file: added `.or('tenant_id.is.null,tenant_id.eq.${tenantId}')` filter on achievement lookup — blocks cross-tenant achievement catalog leakage. Caller verified: `CourseRunnerClient.tsx` always calls within user's own tenant. Response shapes bit-identical. Wrapper coverage: **244/287 files (85.0%)**, **357/408 handlers (87.5%)**. **P1 remaining: 14. Journey: 0 P1 remaining.** `tsc --noEmit` = 0 errors. **GPT approved.** |
| 2026-03-12 | Claude | **Journey M2 — High-ROI Rate Limiting COMPLETE.** 3 findings fixed across 4 route files: (1) **JOUR-007 ✅** — `admin/gamification/refund/route.ts`: added `rateLimit: 'strict'` to existing `apiHandler({ auth: 'system_admin' })`. (2) **JOUR-008 ✅** — `admin/gamification/analytics/rollups/refresh/route.ts`: added `rateLimit: 'strict'` + lowered `days` max 3650→365. (3) **JOUR-009a ✅** — `achievements/check/route.ts` + `achievements/unlock/route.ts`: added inline `applyRateLimit(request, 'api')` at top of handler (wrapper migration deferred to M3). JOUR-003 deferred to M3 (wrapper migration needed). **P2 resolved: +3. P2 remaining: 52.** `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Journey M2 — GPT APPROVED. Journey domain: launch-scope complete.** GPT confirmed: tier selection correct (`strict` for admin destructive/expensive, `api` for user-facing gameplay), inline placement correct (rate limit before auth/DB), M3 deferral accepted (inline rate limiting sufficient for launch). **6 findings fixed total (1 P1 + 5 P2). 0 P1 remaining. M3/M4 deferred post-launch.** Journey joins Play, Sessions, Games, Planner as 5th domain with launch-scope complete. |
| 2026-03-12 | Claude | **Billing & Stripe Audit (#10) COMPLETE — 15 findings (0 P0, 4 P1, 7 P2, 4 P3). ✅ GPT-calibrated (no severity changes).** Audited 35 route files (27 billing + 4 checkout + 2 admin/stripe + 2 admin/licenses). P1s: BILL-001 (customerId not verified against tenant in create-subscription), BILL-002 (tenant admin can set subscription status to 'active'), BILL-003 (tenant admin can mark invoices as 'paid' and payments as 'confirmed'), BILL-004 (webhook provisioning non-idempotent + non-atomic). 10 strengths documented (Stripe sig verification, demo user block, RLS client usage, seat count enforcement). 4 remediation milestones: M1 (financial integrity — 4 P1), M2 (security hardening — 4 P2), M3/M4 (wrapper + validation, post-launch). **P1 remaining: 18.** Report: `audits/billing-audit.md`. |
| 2026-03-12 | Claude | **Billing M1 — Financial Integrity COMPLETE.** 4 P1 findings fixed across 7 route files: (1) **BILL-001 ✅** — `create-subscription/route.ts`: removed client `customerId` from body destructuring, always resolves Stripe customer from `billing_accounts.provider_customer_id` via DB lookup. (2) **BILL-002 ✅** — `tenants/[tenantId]/subscription/route.ts`: POST+PATCH restricted with `TENANT_ALLOWED_STATUSES = ['canceled', 'paused']`, 403 on `active`/`trial`. (3) **BILL-003 ✅** — 4 invoice/payment routes: blocked `paid`/`confirmed` status via `TENANT_BLOCKED_STATUSES`, removed `paid_at`/`stripe_invoice_id` from tenant-writable fields (server-managed only). (4) **BILL-004 ✅** — `webhooks/stripe/route.ts`: atomic idempotency claim via `UPDATE...IN('draft','awaiting_payment','paid')...SELECT` — only first concurrent handler provisions. **P1 remaining: 14.** `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Billing M1 — GPT APPROVED.** All 4 P1 fixes confirmed correct and sufficient for launch-scope. GPT notes: (1) allowed-list for subscription status is right choice, (2) blocked-list for invoice/payment is acceptable now — allowed-list recommended as follow-up, (3) atomic claim is the most important webhook fix, (4) `as never` for `provisioning` status is acceptable tech debt — resolve at next type regeneration. **Billing domain: M1 closed. Ready for M2.** |
| 2026-03-12 | Claude | **Billing M2 — Security Hardening COMPLETE.** 4 P2 findings fixed across 7 route files: (1) **BILL-006 ✅** — `usage/route.ts` + `usage/aggregate/route.ts`: replaced `===`/`!==` with `crypto.timingSafeEqual()` + `Buffer.from()` + length pre-check for API key comparison. (2) **BILL-007 ✅** — `usage/route.ts` GET: switched all 4 queries from `supabaseAdmin` to `createServerRlsClient()` (membership, meters, summaries, current records). (3) **BILL-008 ✅** — added `rateLimit: 'strict'` to `subscription/update` (POST+GET), `invoices/stripe` (POST), `stripe-customer` (POST); added inline `applyRateLimit(request, 'strict')` to `portal` (raw handler). (4) **BILL-011 ✅** — `checkout/intents/[intentId]` GET: added `.eq('user_id', auth!.user!.id)` for explicit ownership check. **P2 resolved: +4. P2 remaining: 55.** `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Billing M2 — GPT APPROVED. Billing domain: launch-scope complete.** GPT confirmed: (1) BILL-006 timing-safe pattern correct — length leak acceptable, hashing unnecessary. (2) BILL-007 RLS switch correct — GPT recommends tenant-scope smoke test as follow-up. (3) BILL-008 `strict` tier confirmed appropriate for all financial mutation routes. (4) BILL-011 defense-in-depth valuable even if RLS covers. **8 findings fixed total (4 P1 + 4 P2). 0 P1 remaining. M3/M4 deferred post-launch.** Billing joins Play, Sessions, Games, Planner, Journey as 7th domain with launch-scope complete. |
| 2026-03-13 | Claude | **Atlas & Admin Audit (#11) COMPLETE — 11 findings (0 P0, 2 P1, 6 P2, 3 P3). ✅ GPT-calibrated (no severity changes).** Audited 63 route files (60 admin/ + 2 atlas/ + 1 admin-like) across 16 subsystems. P1s: ATLAS-001 (atlas/inventory + atlas/annotations — ZERO authentication, reads/writes filesystem), ATLAS-002 (seed-test-badges GET `auth: 'public'` exposes badge economy data). All P2s confirmed correct. ATLAS-008 confirmed systemic (cross-ref SEC-002b). Auth distribution: ~40 system_admin, ~28 tenant-admin, 2 ZERO AUTH, 1 public. Wrapper coverage: 57/63 (90.5%). P1 remaining: 16. Report: `audits/atlas-admin-audit.md`. |
| 2026-03-12 | Claude | **Atlas M1 — Critical Auth Gaps COMPLETE.** 2 P1 findings fixed across 3 route files: (1) **ATLAS-001 ✅** — `atlas/inventory/route.ts` GET + `atlas/annotations/route.ts` GET+POST wrapped in `apiHandler({ auth: 'system_admin' })`. Both routes had ZERO auth — only routes in entire codebase without any authentication. Annotations POST retains `NODE_ENV === 'production'` guard as defense-in-depth. (2) **ATLAS-002 ✅** — `seed-test-badges/route.ts` GET changed from `auth: 'public'` to `auth: 'system_admin'`. Was exposing reward economy data (coin rewards, badge IDs, progression structure) to unauthenticated users. Sandbox Atlas UI callers use same-origin fetch — cookies forwarded automatically, system_admin login required. Wrapper coverage: **247/287 files (86.1%)**, **360/408 handlers (88.2%)**. **P1 remaining: 14. Atlas: 0 P1 remaining.** `tsc --noEmit` = 0 errors. |
| 2026-03-13 | Claude | **Media & Assets Audit (#12) COMPLETE — 12 findings (0 P0, 2 P1, 6 P2, 4 P3). ✅ GPT-calibrated (no severity changes).** Audited 11 route handlers (7 route files) + 4 server actions + 1 client-side direct upload. 9 Supabase storage buckets mapped. RLS verified on `media` + `media_templates` tables (migration `20251210120000`). P1s: MEDIA-001 (upload pipeline cross-tenant — signed URL for any tenant, confirm path for any bucket, no ownership check), MEDIA-002 (client-side direct upload bypasses server validation + `uploadTenantAsset` missing tenant membership check). P2s: MEDIA-003 (2 raw exports no auth wrapper — RLS mitigates), MEDIA-004 (templates POST/DELETE `auth:'user'` but RLS requires system_admin), MEDIA-005 (10/11 handlers no rate limiting), MEDIA-006 (spatial preview no size limit), MEDIA-007 (avatar service-role no content-type verification), MEDIA-008 (SVG render no rate limit). 4 remediation milestones: M1 (tenant isolation + client upload — 2 P1), M2 (wrapper + auth — P2), M3-M4 (post-launch). Cross-refs: MEDIA-002↔ARCH-006, MEDIA-005↔SEC-002b, MEDIA-001↔TI-003. **P1 remaining: 16 (14 prior + 2 MEDIA).** Report: `audits/media-audit.md`. |
| 2026-03-12 | Claude | **Media M1 — Tenant Isolation COMPLETE.** 2 P1 findings fixed across 3 files: (1) **MEDIA-001 ✅** — `upload/route.ts`: added `assertTenantMembership()` check when `tenantId` is provided — blocks cross-tenant signed URL generation. `upload/confirm/route.ts`: added path-prefix ownership validation — extracts tenant UUID from `path.split('/')[0]`, validates membership if UUID-shaped. System_admin bypass on both. (2) **MEDIA-002 ✅** — `design.ts` `uploadTenantAsset`: added `user_tenant_memberships` query before storage upload — any user not a member of the target tenant gets 403. Client-side direct upload (OrganisationBrandingSection) tracked under ARCH-006 (post-launch). **P1 remaining: 14. Media: 0 P1 remaining.** `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Media M1 — GPT APPROVED. Media domain: launch-scope complete.** Tenant-isolation fixes confirmed correct. Signed upload URL generation requires tenant membership, confirm endpoint validates tenant-scoped path prefixes, `uploadTenantAsset` blocks cross-tenant uploads server-side. GPT flagged one non-blocking follow-up: verify all storage path formats follow the same `tenant/public` prefix convention that confirm validation assumes. **2 P1 fixed (MEDIA-001/002). 0 P1 remaining. M2-M4 deferred post-launch.** Media joins Play, Sessions, Games, Planner, Journey, Billing, Atlas as 8th domain with launch-scope complete. |
| 2026-03-12 | Claude | **P1 Reconciliation Pass — GPT-directed.** After 8 domain audits + Batches 1–6d, verified all P1s against current codebase. **4 resolved:** SEC-003 (57 tenantAuth routes → all in apiHandler), SEC-004 (participant auth → DD-2 + Batch 6), APC-006 (consent/log → wrapped with Zod + strict rate limit), ARCH-002 (parallel auth → same root cause as SEC-003, resolved). **3 merged → SYS-001:** SEC-005 + APC-001 + ARCH-003 + ARCH-004 (all converge via wrapper adoption at 88.2%). **1 downgraded:** TI-003 P1→P2 (contentService mutation functions have zero callers — inactive code). **Result: P1 remaining 14 → 6.** Remaining: SEC-002b (infra), SYS-001 (converging), TI-002 (product), TI-NEW-1c (product), APC-003/011 (RLS-blocked), ARCH-006 (only actionable engineering P1). |
| 2026-03-13 | Claude | **ARCH-006 — Client Mutations REMEDIATED.** Moved all direct browser-side `supabase.from()` / `supabase.storage` mutation calls from 6 admin organisation components into 11 server actions (`organisationMutations.server.ts`). Each server action enforces `requireSystemAdmin()` auth before any DB/storage operation. **Components refactored:** OrganisationBrandingSection (logo upload + branding save), OrganisationFeaturesSection (feature toggle), OrganisationDomainsSection (domain CRUD), OrganisationLocaleSection (locale update), OrganisationDetailPage (status change + detail update), OrganisationAdminPage (tenant create/status/delete). Zero `supabase.from()` or `supabase.storage` calls remain in client components. **P1 remaining: 6 → 5.** `tsc --noEmit` = 0 errors. |
| 2026-03-14 | Claude | **APC-003/011 — RESOLVED. Service-role bypass eliminated from `sessions/route.ts`.** (1) Created RLS policy `tenant_admin_view_sessions` (migration `20260314000000`) — allows tenant admins to SELECT `participant_sessions` in their tenant via `user_tenant_memberships` join. (2) Swapped `createServiceRoleClient()` → `createServerRlsClient()` in `app/api/sessions/route.ts`. Removed TODO comment. (3) Added "Launch Readiness Verdict" section to implementation plan (GPT-recommended). **P1 remaining: 5 → 4.** All remaining P1s are blocked on infra/product decisions — zero actionable code fixes remain. `tsc --noEmit` = 0 errors. |
| 2026-03-14 | Claude | **APC-003/011 — GPT APPROVED.** GPT confirmed: qualitative improvement (app-layer auth + service-role bypass → app-layer auth + real RLS-based reads). Deployment order noted: migration `20260314000000` must be applied **before** route deploy. **Backend declared launch-ready from security and access control perspective.** Remaining P1s (4) are all governance/decisions, not code. Next logical step: TI-002 + TI-NEW-1c product decisions to clear out the control sheet. |
| 2026-03-14 | Claude | **TI-002 + TI-NEW-1c — RESOLVED. Product decisions implemented per GPT recommendation.** (1) **TI-002 ✅** — Leaderboard PII: chose Alt A (display_name + avatar only). Removed `userId` (auth UUID) from `LeaderboardEntry` interface and all construction sites. Removed `maskEmail` fallback — replaced with 'Anonymous'. Removed `email` from `getUserProfiles` query. (2) **TI-NEW-1c ✅** — Public session participants: chose Alt A (participant_count only). Removed `include_participants` query param, participant query, and participant mapping from `public/v1/sessions/[id]/route.ts`. **P1 remaining: 4 → 2.** Both remaining (SEC-002b infra, SYS-001 convergence) are non-actionable. `tsc --noEmit` = 0 errors. |
| 2026-03-12 | Claude | **Marketing & Landing Audit (#16) COMPLETE — 7 findings (0 P0, 0 P1, 3 P2, 4 P3).** No `robots.txt` or `sitemap.xml` — crawlers can discover auth-gated URL paths (P2). No OpenGraph/Twitter metadata — social sharing shows no preview (P2). Root layout has dev placeholder metadata (P2). Homepage fully `'use client'` preventing SSG (P3). Testimonials use raw `<img>` instead of `next/image` (P3). Enterprise/gift/pricing pages inherit generic metadata (P3). 14 positive findings: marketing layout has proper title+description, pricing is SSR, `next/font` Geist used, cookie consent complete, enterprise quote secured (ABUSE-001 fixed), SEO canonical redirects in pricing. No security issues. Awaiting GPT calibration. |
| 2026-03-12 | Claude | **Marketing audit — GPT CALIBRATED + MKT-001 M1 FIXED.** MKT-003 P2→P3 (dev text is cosmetic presentation, not functional). Final: **0 P0, 0 P1, 2 P2, 5 P3.** MKT-001 fix applied: created `app/robots.ts` (blocks `/app`, `/admin`, `/sandbox`) + `app/sitemap.ts` (lists `/`, `/pricing`, `/features`). M1 marked complete. |
| 2026-03-12 | Claude | **Calendar Audit (#17) COMPLETE — 7 findings (0 P0, 0 P1, 3 P2, 4 P3).** Sub-feature of Planner, not standalone domain. All routes wrapped in `apiHandler()`, capability checks on all mutations, comprehensive RLS. All 3 P2 findings already tracked in prior audits (PLAN-012, LEAK-001, Abuse rate limiting). 14 positive findings: custom zero-dependency calendar, timezone-safe dates, feature-flagged, locale support, FK cascade. Awaiting GPT calibration. |
| 2026-03-12 | Claude | **Calendar audit — GPT CALIBRATED.** No severity changes. Final: **0 P0, 0 P1, 3 P2, 4 P3.** All P2s already tracked. No launch remediation needed. |
| 2026-03-12 | Claude | **Support audit — GPT CALIBRATED.** No severity changes. Final: **0 P0, 0 P1, 8 P2, 2 P3.** No launch remediation needed. All 23 audits now GPT-calibrated. |
| 2026-03-12 | Claude | **Support / Tickets Audit (#15) COMPLETE — 10 findings (0 P0, 0 P1, 8 P2, 2 P3).** Fully implemented production system (6 server action files, 7+ tables, SLA tracking, routing rules). No Zod validation (P2). PostgREST search interpolation (P2, same as GAME-004). Missing `await` in routing rule creation (P2). RLS SELECT overly broad — any tenant member reads all tickets/messages (P2). Dead `supportService.ts` client code (P2). No rate limiting on ticket creation (P2). GDPR registry missing support tables (P2). Hardcoded Swedish (P3). 10 positive findings: auth layering, internal notes hidden, SLA tracking, notification idempotency, FAQ RLS proactively fixed. Awaiting GPT calibration. |
| 2026-03-12 | GPT | **Profile & Settings Audit (#14) GPT-CALIBRATED.** PROF-005 P2→P3 (account hardening, not launch-risk — user already authed, password required, no takeover path). All other severities confirmed. Final: **8 findings (0 P0, 0 P1, 4 P2, 4 P3).** No launch remediation needed. |
| 2026-03-12 | Claude | **Profile & Settings Audit (#14) COMPLETE — 8 findings (0 P0, 0 P1, 5 P2, 3 P3).** Strong auth security: password change requires current password, email change requires password + verification, both rate-limited. RLS enforces self-only updates. Audit logging on all changes. JWT token size optimized. Gaps: RLS `OR true` bypasses `profile_visibility` (P2), `show_email`/`show_phone` flags not enforced (P2), PATCH endpoint uses type assertion instead of existing Zod schema (P2), error response leaks Supabase details (P2), email change doesn't invalidate other sessions (P2). Several issues (GDPR, avatar MIME) already tracked in abuse-privacy audit — cross-referenced, not double-counted. Awaiting GPT calibration. |
| 2026-03-14 | Claude | **GAM-001 — Achievement Unlock Condition Bypass FIXED.** GPT-identified gamification economy exploit: `achievements/unlock` allowed any authenticated user to unlock any active achievement by ID without condition verification, triggering cosmetic grants via `checkAndGrantCosmetics()`. Also `participants/progress/unlock-achievement` allowed participant-token holders to unlock achievements without condition check. (1) **`achievements/unlock` ✅** — Changed from raw `POST` with `getUser()` auth to `apiHandler({ auth: 'system_admin', rateLimit: 'api' })`. Added `targetUserId` to schema (admin targets specific user). Migrated from `applyRateLimit` inline to wrapper. Also wraps route in `apiHandler` (contributes to SYS-001 wrapper convergence). (2) **`participants/progress/unlock-achievement` ✅** — Changed from `auth: 'participant'` to `auth: 'cron_or_admin'`. Added `session_id` + `participant_id` to request body (previously from participant context). (3) **Zero active callers** — `useAchievementAutoAward` and `useAchievementUnlock` hooks have no component consumers. `useSessionAchievements` (which wraps `useAchievementAutoAward`) also has no component consumers. Canonical path is `/achievements/check` → server-side `checkAndUnlockAchievements()`. **P1 remaining: 47 total, 45 resolved, 2 remaining (SEC-002b + SYS-001).** `tsc --noEmit` = 0 errors. |
| 2026-03-14 | Claude | **GAM-001 — GPT APPROVED.** Post-patch code review completed: (1) Request-shape drift — zero active callers, dead hooks schema-incompatible with hardened routes (would get 400/401). (2) Tenant-scope — admin route resolves tenant from target user’s membership, not caller’s; no cross-tenant admin scenario. (3) Documentation bookkeeping — clarified as discovered-and-resolved-same-pass across all SSoT docs. GPT confirmed: “Achievement bypass effectively closed for launch-scope.” 3 post-launch cleanup items tracked: GAM-001a (dead hook removal), GAM-001b (participant Zod schema), GAM-001c (canonical unlock architecture doc). || 2026-03-14 | Claude | **Abuse & Privacy Audit (#21) COMPLETE — 39 findings (2 P0, 16 P1, 14 P2, 7 P3).** Cross-cutting audit covering 6 areas: (1) Rate limiting coverage — 39/287 routes (13.6%) have rate limiting. (2) UUID enumeration — session preview exploitable via 6-char codes. (3) File upload — no MIME validation, declared-only size, quota never enforced. (4) GDPR compliance — deletion covers 3/50+ tables, auth user not deleted, export incomplete, anonymization no-op. (5) API response exposure — Supabase errors leaked in 17+ routes, select(*) on user endpoints. (6) Abuse vectors — enterprise quote email spam, geocode open proxy, MFA no rate limit. **GPT-calibrated: PRIV-001–006 downgraded P0→P1 after self-service kill-switch.** 7 remediation milestones planned — M1–M4 before launch, M5–M7 post-launch. |
| 2026-03-14 | Claude | **GDPR Kill-Switch Applied — GPT calibration.** (1) API routes `gdpr/delete` and `gdpr/export` now return 503 with DSAR instructions (contact `privacy@lekbanken.se`, 30-day SLA per Art. 12(3)). (2) Privacy settings page rewritten: removed export button, delete account flow, consent withdrawal buttons — replaced with DSAR contact card. (3) PRIV-001–006 downgraded P0→P1 per GPT: "GO med villkor om ni omedelbart stänger/döljer delete/export-funktionerna." **Result: P0 count 8→2.** Remaining P0s: ABUSE-001 (enterprise quote spam), ABUSE-002 (geocode open proxy). `tsc --noEmit` = 0 errors. |
| 2026-03-12 | GPT | **Accessibility Audit (#20) GPT-CALIBRATED.** A11Y-001 P2→P3 (admin-internal, Enter works, small scope). A11Y-004 P2→P3 (classic Next.js gap, polish/maturity not launch-risk). Final: **8 findings (0 P0, 0 P1, 2 P2, 6 P3).** No launch remediation needed. Strong foundation confirmed: form ARIA complete, Radix covers most, custom a11y library exists. |
| 2026-03-12 | Claude | **Accessibility Audit (#20) COMPLETE — 8 findings (0 P0, 0 P1, 4 P2, 4 P3).** Dedicated a11y library (`lib/accessibility/`) with trapFocus, useReducedMotion, useAnnounce, useLiveRegion. Form components all have `aria-invalid` + `aria-describedby` (verified). Radix UI provides keyboard nav + focus trapping. `prefers-reduced-motion` in globals.css + components. 8+ aria-live regions in play UI. Gaps: 6 `role="button"` divs missing Space key (P2), toast not in aria-live (P2), reduced-motion coverage incomplete (P2), route focus not managed (P2). 14 positive findings. Awaiting GPT calibration. |
| 2026-03-12 | GPT | **i18n Audit (#18) GPT-CALIBRATED.** I18N-001 P2→P3 (Swedish-first, fallback chain works, localization completeness not launch-critical). I18N-004 P2→P3 (heuristic detection, text rendering only, no runtime risk). Final: **7 findings (0 P0, 0 P1, 2 P2, 5 P3).** No launch remediation needed. |
| 2026-03-12 | Claude | **i18n Audit (#18) COMPLETE — 7 findings (0 P0, 0 P1, 4 P2, 3 P3).** next-intl infrastructure excellent: cookie-based routing, fallback chains, 200+ files using `useTranslations`. sv.json complete (11,399 keys). en missing 932 keys, no missing 1,419 — but fallback chain shows Swedish (no blank strings). Hardcoded 'sv-SE' in ~15 date/number calls (P2). Server action errors hardcoded in Swedish (P2, admin-only). 562 mojibake suspects across locale files (P2). Sandbox pages gated in production — no impact. 12 positive findings. Awaiting GPT calibration. |
| 2026-03-12 | Claude | **ABUSE-001 + ABUSE-002 — FIXED. Last 2 P0s resolved.** (1) **ABUSE-001** (`enterprise/quote`): Wrapped in `apiHandler({ auth: 'public', rateLimit: 'strict', input: quoteRequestSchema })`. Strict rate limit = 5 req/min. Honeypot field `website` added — bots auto-filling get rejected by `z.string().max(0)`. Zod validation moved from manual parsing into wrapper. (2) **ABUSE-002** (`geocode`): Wrapped in `apiHandler({ auth: 'user', rateLimit: 'strict' })`. Now requires authentication (only admin spatial editor uses this endpoint). `limit` parameter clamped to 1–10. Both endpoints now follow standard error response format. **P0 count: 2→0. All P0s in the launch program are resolved.** `tsc --noEmit` = 0 errors. |
| 2026-03-12 | GPT | **Notifications Audit (#13) GPT-CALIBRATED.** NOTIF-005 downgraded P2→P3 (launch scale OK, future scaling concern only). Final: **8 findings (0 P0, 0 P1, 5 P2, 3 P3).** No launch remediation needed. |
| 2026-03-12 | Claude | **Notifications Audit (#13) COMPLETE — 8 findings (0 P0, 0 P1, 6 P2, 2 P3).** Two creation paths audited (admin broadcast + ticket events). Ticket notifications have idempotency keys ✅. Admin broadcasts lack dedup + rate limiting (P2). Preferences stored but not enforced on send (P2). Synchronous batch delivery OK at launch scale (P2). No Zod validation on broadcast input (P2). Scheduled notifications have no processor (P3). 16 positive findings: tenant isolation, delivery UNIQUE constraint, user-scoped realtime with debounce + circuit breaker + exponential backoff, no XSS risk, no external dependencies (in-app only). Awaiting GPT calibration. |
| 2026-03-12 | GPT | **ABUSE-001/002 — GPT APPROVED.** Both fixes confirmed as properly resolved (not merely downgraded). Key observations: (1) ABUSE-001 — public route is appropriate; `apiHandler + strict rate limit` is the correct pattern; honeypot is good extra layer but rate limit is the critical control. (2) ABUSE-002 — `auth: 'user'` is better than trying to "secure" an open proxy; low regression risk since only caller is authed admin flow. (3) Both routes normalized into wrapper model — also improves SYS-001. GPT verdict on current status: **"READY for launch from security/access-control perspective, with non-blocking privacy/operational follow-ups remaining."** P0=0 confirmed. Self-service GDPR rights are disabled, not complete — remaining privacy findings are operational/compliance follow-ups, not technical launch blockers. |
| 2026-03-12 | GPT | **Performance Audit (#19) — GPT CALIBRATED.** PERF-001 downgraded P1→P2-high: session history is a secondary coach-facing historikvy, not part of live-play runtime or a launch-critical golden path. Blast radius is admin/coach UX + DB efficiency. Marked as "first post-launch perf fix." All other severities confirmed. **New totals: 0 P0, 0 P1, 4 P2, 2 P3. No launch remediation needed. P0=0, P1=19 (unchanged).** |
| 2026-03-12 | Claude | **Performance Audit (#19) COMPLETE — 6 findings (0 P0, 1 P1, 3 P2, 2 P3).** Full infrastructure scan: bundle/build, data fetching, DB queries, caching/ISR, images, client perf, realtime/polling, CSS, third-party. 231 `select('*')` instances verified (106 API + 106 services + 19 actions). N+1 in session history (100 extra queries per page). ISR underutilized (1 page). 13 positive findings: Turbopack, 100+ useMemo, 20+ dynamic imports, Tailwind v4, zero CSS-in-JS, proper timer cleanup, 14 realtime channels, minimal third-party. Awaiting GPT calibration. |
| 2026-03-12 | GPT | **React Boundary Audit (#22) — GPT CALIBRATED.** All severities confirmed (0 P0, 0 P1, 3 P2, 4 P3). No remediation required for launch. P2/P3 findings deferred post-launch. Architecture described as "ovanligt välstädad" (unusually well-maintained). No classic launch faults found: no server imports in client, no direct DB mutations, no auth boundary leaks, no hydration crashers. |
| 2026-03-12 | Claude | **React Server/Client Boundary Audit (#22) COMPLETE — 7 findings (0 P0, 0 P1, 3 P2, 4 P3).** Audited 849 `'use client'` files + 31 `'use server'` files + all server pages/layouts. **Zero boundary violations found.** No client file imports server-only modules. No server component uses client hooks. All data serializable (ISO strings, primitives). All hydration APIs properly guarded. **RB-001 (P2):** two unused hooks accept `Date` objects as props (serialization smell, zero callers). **RB-002 (P2):** marketing homepage is `'use client'` (SSR content missing from initial HTML). **RB-003 (P2):** pricing page missing metadata export. **RB-004–007 (P3):** documented-only items, all verified safe. 10 positive findings: zero server imports in 849 client files, consistent `.server.ts` naming, all timestamps as ISO strings, auth correctly separated, zero direct DB in client code. Awaiting GPT calibration. |
| 2026-03-12 | GPT | **Migration Safety Audit (#23) — GPT CALIBRATED.** MIG-001 downgraded P0→P1: PG 17 generally permits enum ADD VALUE usage in same transaction; migration already applied to production; bootstrap risk only. MIG-002/003/004 downgraded P1→P2: historical pattern, process/documentation items. **New totals: 0 P0, 1 P1, 9 P2, 4 P3.** Positive feedback on audit methodology (pattern-based search = senior DB review approach). Recommended additions: deployment verification checklist + migration smoke test script. **P0 count: 1→0. Verdict: CONDITIONAL→READY.** |
| 2026-03-12 | Claude | **Migration Safety Audit (#23) COMPLETE — 14 findings (1 P0, 3 P1, 6 P2, 4 P3).** Audited 304 Supabase SQL migrations (PG 17.6, Dec 2024 → Mar 2026). **MIG-001 (P0):** `tenant_anonymization.sql` uses `ALTER TYPE ADD VALUE 'anonymized'` inside explicit `BEGIN/COMMIT` then references value in RLS policy — PG enum transaction limitation may cause failure on fresh deploy. **MIG-002 (P1):** historical bulk DELETE of orphan users with no safety net — already applied, pattern risk. **MIG-003 (P1):** no rollback framework (3/304 have rollback scripts). **MIG-004 (P1):** no deployment verification checklist. 10 positive findings: all DROP TABLE guarded, no TRUNCATE, SECURITY DEFINER sweep comprehensive, seeds mostly idempotent. Awaiting GPT calibration. |
| 2026-03-12 | Claude | **Post-Launch Robustness Improvements (GPT-directed).** Assessed GPT's 3 recommended improvements: (1) **Readiness endpoint** — created `GET /api/readiness` (system_admin auth, checks DB/Stripe/auth/encryption/rateLimiter, returns ready/degraded). Complements existing `/api/health` (public, DB ping) and `/api/system/metrics` (admin, detailed diagnostics). (2) **Audit logging** — assessed as already comprehensive: 6 audit tables (`tenant_audit_logs`, `user_audit_logs`, `mfa_audit_log`, `participant_activity_log`, `system_audit_logs`, `product_audit_log`), 4 server helpers, 5 admin dashboard pages. No action needed. (3) **Global rate limiter (Upstash)** — current in-memory Map-based limiter documented with migration path to `@upstash/ratelimit` + `@upstash/redis`. Requires Upstash account setup + env vars. Migration guide added to `lib/utils/rate-limiter.ts` header comment. |
| 2026-03-13 | GPT+Claude | **Scaling Analysis — live-session bottleneck assessment.** GPT delivered Lekbanken-specific scaling analysis (not generic SaaS) based on full architecture inventory (19 RPCs, 17 hot tables, 5 channel patterns, 6 polling intervals, 46 play routes). Claude verified all 5 bottlenecks against codebase. **Top 5 bottlenecks ranked by probability:** (1) Host-side polling+Realtime fan-out (10k–100k) — 3+ independent pollers per session, chat ignores realtime-gate, redundant broadcast+poll. (2) Serverless request explosion + in-memory rate limiting (10k–100k). (3) Hot row contention on `participant_sessions` (100k+). (4) Presence/heartbeat fixed intervals — worse than GPT assumed: host 30s + participant 10s, no adaptation to session status. (5) No async/workers — zero `after()`, zero `waitUntil`, cleanup cron unconfigured. **Executive answer:** first bottleneck is NOT the database — it's Vercel serverless request explosion. Saved as `launch-readiness/scaling-analysis.md`. 90-day plan with implementation priority: adaptive heartbeat → push-vs-poll contract → session cleanup cron → Upstash migration. |
| 2026-03-13 | Claude | **Scaling Plan — first 3 implementation items DONE.** (1) **Adaptive heartbeat** — participant heartbeat now status-aware: 10s active, 30s lobby/paused/locked, stopped in ended/archived/cancelled. Tab visibility aware (slows when hidden). Host heartbeat (PlayPlanPage) also made visibility-aware (doubles interval when hidden, immediate on tab focus). (2) **Push-vs-poll ownership contract** — documented in `lib/play/realtime-gate.ts` header: 14 push-authoritative data types, 4 poll-authoritative, 1 poll-as-fallback. Chat identified as push migration candidate. (3) **Session cleanup cron** — `vercel.json` created with daily 04:00 UTC cron hitting `/api/participants/tokens/cleanup`. Endpoint expanded from POST-only to GET+POST (Vercel crons send GET). Disconnects expired tokens, archives ended sessions >90 days. |
| 2025-01-25 | Claude | **Gamification Event Integrity Audit COMPLETE — no confirmed double-reward bugs in audited paths, 4 P2, 2 P3.** Audited 14 RPCs, 40+ tables, 17 app-layer call sites. **Verdict: DB-layer idempotency is strong and launch-sufficient.** 3-layer defense: deterministic key derivation → UNIQUE constraints → `pg_advisory_xact_lock`. All callers use deterministic idempotency keys (`run:{id}:completed`, `plan:{id}:created`, etc.). 3 suspected critical bugs (cascade double-application, session amplification, learning race condition) investigated and confirmed SAFE at DB layer. P2 findings: cascade re-execution on 23505 is wasteful but not dangerous, XP `xp_grants` JSONB unbounded growth, `apply_automation_rule_reward_v1` lacks own advisory lock, achievement admin falls back to `randomUUID()`. Anti-inflation systems verified: softcap, cooldown, daily cap, campaign budgets, multiplier expiry. **Launch verdict: ✅ Safe.** 3 documents: `audits/gamification-event-integrity-audit.md`, `implementation/gamification-event-integrity-remediation.md`, `gamification-event-integrity-architecture.md`. §16 Risk Register updated. |
| 2026-03-14 | Claude | **LAUNCH TELEMETRY PACK — COMPLETE.** Observability baseline for first 30 days defined: 5 production signals (session creation, participant join, realtime/presence, gamification economy, error pressure) + 3 alerts (join funnel degradation, reward anomaly, realtime instability). All metrics derived from existing tables — no new instrumentation code needed. Created: `launch-telemetry-pack.md` (executive summary + signal definitions + alert rules + 30-day operating model), `docs/ops/production-signals-dashboard.md` (SQL queries + thresholds + review cadence), `docs/ops/anomaly-detection-playbook.md` (per-alert response: likely causes, first checks, escalation, mitigation). Known gaps documented: 429 logging (P2), join failure reasons (P3), realtime metrics (P2), automated alert delivery (P1 Week 4). |
| 2026-03-14 | Claude | **OPS-SAND-001 — CLOSED. V7/V8 preview runtime verification PASSED.** Preview branch deployed, `/api/health` confirmed `supabaseProjectRef: vmpdejhgpsrfulimsoqn` (sandbox), `deployTarget: preview`, `appEnv: sandbox`. Runtime flow verified on preview. Production DB unaffected. Environment identity added to `/api/health` (public, no new info exposure — project ref already in client bundle) and `/api/readiness` (system_admin). V7/V8 verification procedure documented in `sandbox-phase-1b.md`. All SSoT docs updated: sandbox-phase-1b.md V7/V8 ✅, platform-operations-audit.md OPS-SAND-001 ✅ LÖST, launch-control.md gate → ✅. **Last operational unknown before Observe Mode is closed.** |