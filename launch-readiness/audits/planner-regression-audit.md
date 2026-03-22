# Planner Regression Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Closed regression audit for the planner domain after the launch-readiness remediation milestones. Use `launch-readiness/launch-control.md` for current program status and the original planner audit plus implementation records for upstream context.

**Domain:** Planner (plans, blocks, versions, schedules, notes, progress)  
**Scope:** Verify M1-M3 remediations intact + scan for new gaps  
**Date:** 2026-03-14  
**Verdict:** ✅ PASS — No P0/P1 regressions. 2 new findings (1 P2, 1 P3) on post-audit routes.

---

## Executive Summary

The original Planner audit (`planner-launch-audit.md`) identified 16 findings. Milestones M1-M3 resolved all 8 P1 findings. This regression audit verifies those fixes remain intact and scans for new gaps introduced by 5 routes added after the original audit.

**Regression result:** All M1-M3 remediations verified intact. Two new findings on routes added post-audit.

---

## Verification Areas

### 1. M1 — Wrapper Migration (PLAN-001, PLAN-002, PLAN-003) ✅ INTACT

| Route | Auth Level | Tenant Validation | Status |
|-------|-----------|-------------------|--------|
| `plans/route.ts` POST | `auth: 'user'` | Inline membership query (L37-44) | ✅ |
| `plans/[planId]/visibility/route.ts` POST | `auth: 'user'` | Inline membership query (L46-56) | ✅ |
| `plans/[planId]/play/route.ts` GET | `auth: 'public'` | N/A (public read) | ✅ |

### 2. M2 — Capability Gates (PLAN-004, PLAN-005, PLAN-006) ✅ INTACT

| Route | Handler | Capability Check | Status |
|-------|---------|------------------|--------|
| `blocks/route.ts` | POST | `requirePlanEditAccess()` (L20) | ✅ |
| `blocks/[blockId]/route.ts` | PATCH | `requirePlanEditAccess()` (L16) | ✅ |
| `blocks/[blockId]/route.ts` | DELETE | `requirePlanEditAccess()` (L196) | ✅ |
| `blocks/reorder/route.ts` | POST | `requirePlanEditAccess()` (L25) | ✅ |
| `play/[planId]/start/route.ts` | POST | `requirePlanStartAccess()` (L44) | ✅ |
| `schedules/route.ts` | POST | `requirePlanEditAccess()` (L72) | ✅ |
| `schedules/[scheduleId]/route.ts` | PUT | `requirePlanEditAccess()` (L66) | ✅ |
| `schedules/[scheduleId]/route.ts` | DELETE | `requirePlanEditAccess()` (L145) | ✅ |

Shared module `lib/planner/require-plan-access.ts` exports all 4 functions:
- `requirePlanEditAccess()` (L86-95)
- `requirePlanStartAccess()` (L99-107)
- `requirePlanReadAccess()` (L111-119)
- `assertTenantMembership()` (L124-160)

### 3. M3 — Tenant Boundary (PLAN-007, PLAN-008) ✅ INTACT

| Route | Method | Status |
|-------|--------|--------|
| `notes/tenant/route.ts` | `assertTenantMembership()` helper (L33) | ✅ |
| `copy/route.ts` | Inline membership check (L79-89) | ✅ |

### 4. Route Coverage — Full Scan ✅ NO UNWRAPPED ROUTES

**Current inventory:** 19 route files (18 under `plans/` + 1 planner-adjacent `play/[planId]/start/`).

All 19 import and use `apiHandler` from `@/lib/api/route-handler`.

**5 new routes added since original audit:**

| Route | Handlers | Auth | Capability Checks | Verdict |
|-------|----------|------|-------------------|---------|
| `plans/bulk/route.ts` | POST | `user` | ✅ Per-plan `derivePlanCapabilities()` | ✅ Secure |
| `plans/search/route.ts` | POST | `user` | ✅ Per-plan `derivePlanCapabilities()` | ✅ Secure |
| `plans/[planId]/publish/route.ts` | POST | `user` | ✅ `capabilities.canPublish` | ⚠️ P3 (REG-PLAN-002) |
| `plans/[planId]/progress/route.ts` | GET, POST | `user` | ❌ None | ⚠️ P2 (REG-PLAN-001) |
| `plans/[planId]/versions/route.ts` | GET | `user` | ✅ Plan query via RLS | ✅ Secure |

### 5. RLS — Baseline Tables ✅ ALL ENABLED

7 planner tables in baseline confirmed with `ENABLE ROW LEVEL SECURITY`:
plans, plan_blocks, plan_versions, plan_version_blocks, plan_notes_private, plan_notes_tenant, plan_play_progress.

---

## New Findings

### REG-PLAN-001 — Progress route missing plan access check (P2)

**File:** `app/api/plans/[planId]/progress/route.ts`  
**Handlers:** GET, POST  
**Issue:** Neither handler validates that the user can access the plan. RLS on `plan_play_progress` only checks `user_id = auth.uid()`, not plan visibility.  
**Attack:** Authenticated user can create/read progress on any plan_id (even inaccessible plans) if they know the UUID.  
**Mitigations:** Self-referential data only (tied to user's own user_id). UUID is unguessable. No plan content exposed.  
**Fix:** Add plan access check (query `plans` table via RLS or call `requirePlanReadAccess()`) before accessing progress.  
**Severity:** P2 — Defense-in-depth gap, not a data exposure vulnerability.

### REG-PLAN-002 — Publish route globalRole derivation inconsistency (P3)

**File:** `app/api/plans/[planId]/publish/route.ts`  
**Handler:** POST (L68)  
**Issue:** Uses `user.app_metadata?.global_role` instead of `deriveEffectiveGlobalRole(profile, user)`. All other planner routes use the helper.  
**Impact:** System admin whose role exists only in profile.global_role (not app_metadata) could be wrongly denied. Edge case with no security impact for normal users.  
**Fix:** Import `deriveEffectiveGlobalRole` from `@/lib/auth/role` and use it for consistency.  
**Severity:** P3 — Code consistency, not a security vulnerability.

---

## Deferred Findings (From Original Audit)

The following M4/M5 findings remain deferred post-launch as documented in the original audit:
- PLAN-009-016 (P2/P3): Zod validation, Realtime channels, gamification, edge-function patterns

---

## Cross-Reference

| Original Finding | M# | Status |
|-----------------|-----|--------|
| PLAN-001 | M1 | ✅ Verified intact |
| PLAN-002 | M1 | ✅ Verified intact |
| PLAN-003 | M1 | ✅ Verified intact |
| PLAN-004 | M2 | ✅ Verified intact |
| PLAN-005 | M2 | ✅ Verified intact |
| PLAN-006 | M2 | ✅ Verified intact |
| PLAN-007 | M3 | ✅ Verified intact |
| PLAN-008 | M3 | ✅ Verified intact |
| PLAN-009–016 | M4/M5 | Deferred (unchanged) |
| **REG-PLAN-001** | — | **NEW** P2 (progress route) |
| **REG-PLAN-002** | — | **NEW** P3 (publish route) |
