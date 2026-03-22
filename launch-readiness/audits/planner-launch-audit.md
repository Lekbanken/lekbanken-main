# Planner System Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for the planner domain. Use `launch-readiness/launch-control.md` for current status and the paired regression or implementation records for the latest follow-up state.

> **Status:** Complete (GPT-calibrated) — all severities confirmed  
> **Date:** 2026-03-13  
> **Calibrated:** 2026-03-13 — GPT confirmed all severity classifications. Score: 9.5/10. Key insight endorsed: "Planner security is RLS-first, API checks are defense-in-depth."  
> **Auditor:** Claude  
> **Domain scope:** Plan CRUD, blocks, versioning, publishing, scheduling, notes, runs, run sessions, plan start, progress  
> **Routes audited:** 27 route files (~38 handlers), excluding session routes (covered by Sessions audit)  
> **RLS verification:** All 10 planner tables have per-operation RLS policies (verified in `20260305100000_tenant_rls_planner.sql`)

---

## GPT Calibration Answers

> **Q1: Ska PLAN-004/005/006 (block CRUD, start, schedules) vara P1 eller P2?**

**P1 bekräftat.** GPT: "Right now access appears to rely only on RLS → tenant boundary. But that does not prevent: tenant member editing another user's plan, editing a plan they should only view." Workflow breach, inte bara defense-in-depth. Korrekt modell: `canEditPlan(user, plan)` med roll-baserad logik (owner/admin/editor).

> **Q2: Är PLAN-002 tenant-boundary-bypass reell eller blockerad av RLS?**

**P1 bekräftat.** GPT: "You should never accept tenant ownership from client input. Correct pattern: owner_tenant_id = viewer.tenant_id." Samma princip gäller PLAN-007 och PLAN-008 — aldrig lita på klientens tenant_id.

> **Q3: Ska PLAN-003 (play GET utan auth) vara P1 eller designbeslut?**

**P1 bekräftat.** Wrappa i `apiHandler({ auth: 'public' })` för konsekvent error-format och logging, även om beteendet är funktionellt korrekt.

> **Q4: Är PLAN-009/010 (non-atomic publish/copy) launch-risk eller P2?**

**P2 bekräftat.** GPT: "Not a security problem but can cause inconsistent state." Sällan, manuellt fixbart, inte launch-blockerande.

> **Q5: Vilka 2–3 saker i Planner ger mest riskreduktion per timme?**

GPT-rekommenderad ordning: **M1 (wrapper), M2 (capability checks), M3 (tenant boundary).** GPT tillade: skapa delat capability-helper (canViewPlan, canEditPlan, canStartPlan, canSchedulePlan) FÖRE M2 så att logiken inte dupliceras över routes/schedules/runs/notes/blocks.

> **GPT Implementation Advice:**

Innan M2: skapa shared helper med `canViewPlan()`, `canEditPlan()`, `canStartPlan()`, `canSchedulePlan()` — undviker duplicering och gör M2 trivialt.

---

## 1. Findings Summary

| Severity | Count | Resolved | Finding IDs |
|----------|-------|----------|-------------|
| P0 — Launch blocker | 0 | 0 | — |
| P1 — Must fix before launch | 8 | 8 | ~~PLAN-001~~, ~~PLAN-002~~, ~~PLAN-003~~, ~~PLAN-004~~, ~~PLAN-005~~, ~~PLAN-006~~, ~~PLAN-007~~, ~~PLAN-008~~ |
| P2 — Should fix, not blocker | 6 | 0 | PLAN-009, PLAN-010, PLAN-011, PLAN-012, PLAN-013, PLAN-014 |
| P3 — Nice to have | 2 | 0 | PLAN-015, PLAN-016 |
| **Total** | **16** | **0** | |

### PRE-007 Resolution

> **PRE-007: Dual dynamic segments route conflict risk** — ✅ **RESOLVED**

Verified: `/app/planner/[planId]` (sharing) and `/app/planner/plan/[planId]` (wizard) coexist without conflict. Next.js App Router gives static segments (`plan/`, `plans/`, `calendar/`) deterministic priority over dynamic `[planId]`. No routing ambiguity exists.

---

## 2. Route Inventory

### ~~Unwrapped Routes~~ (0 routes — all wrapped in M1)

| Route | Methods | Auth | Issue | Status |
|-------|---------|------|-------|--------|
| `POST /api/plans` | POST | ~~Raw `getUser()`~~ → `auth: 'user'` | PLAN-001 | ✅ **FIXED (M1)** + tenant membership validation |
| `POST /api/plans/[planId]/visibility` | POST | ~~Raw `getUser()`~~ → `auth: 'user'` | PLAN-002 | ✅ **FIXED (M1)** + tenant membership validation |
| `GET /api/plans/[planId]/play` | GET | ~~None~~ → `auth: 'public'` | PLAN-003 | ✅ **FIXED (M1)** |

### Wrapped Routes (27 routes, ~38 handlers)

| Route | Methods | Auth | Capability Check | Validation | Issues |
|-------|---------|------|-----------------|------------|--------|
| `GET/PATCH/DELETE /api/plans/[planId]` | 3 | `user` | ✅ `requireCapability()` on PATCH/DELETE | `validatePlanPayload` | OK |
| `POST /api/plans/[planId]/blocks` | 1 | `user` | ✅ `requirePlanEditAccess()` | `validatePlanBlockPayload` | ~~PLAN-004~~ ✅ |
| `PATCH/DELETE /api/plans/[planId]/blocks/[blockId]` | 2 | `user` | ✅ `requirePlanEditAccess()` | `validatePlanBlockPayload` (PATCH) | ~~PLAN-004~~ ✅ |
| `POST /api/plans/[planId]/blocks/reorder` | 1 | `user` | ✅ `requirePlanEditAccess()` | Array validation | ~~PLAN-004~~ ✅ |
| `POST /api/plans/[planId]/publish` | 1 | `user` | ✅ `canPublish` | Empty-plan guard | PLAN-009 |
| `POST /api/plans/[planId]/status` | 1 | `user` | ✅ `requireCapability()` | `assertTransition()` | OK ✅ |
| `POST /api/plans/[planId]/copy` | 1 | `user` | ✅ Read cap + tenant membership | Manual visibility | ~~PLAN-008~~ ✅ |
| `GET /api/plans/[planId]/versions` | 1 | `user` | ⚠️ Implicit (RLS) | `normalizeId` | OK |
| `GET/POST /api/plans/[planId]/progress` | 2 | `user` | ❌ None | Block lookup validates | PLAN-014 |
| `POST /api/plans/[planId]/notes/private` | 1 | `user` | ❌ None | Content presence | PLAN-014 |
| `POST /api/plans/[planId]/notes/tenant` | 1 | `user` | ✅ `assertTenantMembership()` | Content + tenant_id | ~~PLAN-007~~ ✅ |
| `POST /api/plans/bulk` | 1 | `user` | ✅ Per-plan caps | Batch ≤50, action whitelist | OK |
| `POST /api/plans/search` | 1 | `user` | ✅ Returns caps | Clamp pageSize | OK |
| `GET/POST /api/plans/schedules` | 2 | `user` | ✅ `requirePlanEditAccess()` (POST) | Minimal | ~~PLAN-006~~ ✅ |
| `GET/PUT/DELETE /api/plans/schedules/[scheduleId]` | 3 | `user` | ✅ `requirePlanEditAccess()` (PUT/DELETE) | Minimal | ~~PLAN-006~~ ✅ |
| `POST /api/play/[planId]/start` | 1 | `user` | ✅ `requirePlanStartAccess()` | ID only | ~~PLAN-005~~ ✅ |
| `GET /api/play/runs/active` | 1 | `user` | ✅ `user_id` filter | Stale threshold | PLAN-011 |
| `GET /api/play/runs/dashboard` | 1 | `user` | ✅ `user_id` filter | Stale threshold | PLAN-011 |
| `GET /api/play/runs/[runId]` | 1 | `user` | ✅ `user_id` filter | Virtual run detection | OK |
| `GET/POST /api/play/runs/[runId]/progress` | 2 | `user` | ✅ `user_id` filter | Payload validation | OK |
| `POST /api/play/runs/[runId]/abandon` | 1 | `user` | ✅ `user_id` filter | State guard | OK ✅ |
| `POST /api/play/runs/[runId]/heartbeat` | 1 | `user` | ✅ `user_id` filter | Virtual skip | OK ✅ |
| `GET/POST /api/play/runs/[runId]/sessions` | 2 | `user` | ⚠️ GET OK, POST no cap | Step/game validation | PLAN-013 |
| `POST /api/play/runs/[runId]/sessions/end` | 1 | `user` | ✅ RLS + state guard | Step validation + 409 | OK ✅ |

### RLS Defense Summary

All 10 planner tables have per-operation policies (migration `20260305100000_tenant_rls_planner.sql`):

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| plans | ✅ Visibility-based | ✅ Owner + tenant member | ✅ Owner/admin | ✅ Owner/admin | Foundational gate |
| plan_blocks | ✅ Via plan | ✅ Plan owner | ✅ Plan owner | ✅ Plan owner | Cascade |
| plan_versions | ✅ Via plan | ✅ Plan owner/admin | — | — | Read-only after create |
| plan_version_blocks | ✅ Via version→plan | ✅ Via version | — | — | Cascade |
| plan_schedules | ✅ Via plan + creator | ✅ Creator + plan access | ✅ Creator/admin | ✅ Creator/admin | Fixed in MS5 |
| plan_notes_private | ✅ Owner only | ✅ Owner | ✅ Owner | ✅ Owner | User-scoped |
| plan_notes_tenant | ✅ Tenant + plan | ✅ Tenant + plan | ✅ Tenant + plan | ✅ Tenant admin | Fixed in MS5 |
| runs | ✅ User only/admin | ✅ User + version access | ✅ User only | — | Fixed in MS5 |
| run_sessions | ✅ Via run owner | ✅ Via run owner | ✅ Via run owner | ✅ Via run owner | Cascade via runs |
| plan_play_progress | ✅ User + plan access | ✅ User + plan access | ✅ User | — | User-scoped |

---

## 3. Findings Detail

### PLAN-001 — `plans/route.ts` POST not wrapped in apiHandler (P1) ✅ **FIXED (M1)**

**Category:** Security / Standardization  
**Location:** `app/api/plans/route.ts`

**Description:** Plan creation uses raw `supabase.auth.getUser()` instead of `apiHandler({ auth: 'user' })`. Bypasses standard error handling, structured logging, and response format pipeline.

**Fix applied:** Wrapped in `apiHandler({ auth: 'user' })`. Added tenant membership validation: if `body.owner_tenant_id` provided and user is not system_admin, verifies membership via `user_tenant_memberships` query → 403 if not a member. Business logic unchanged.

---

### PLAN-002 — Visibility route unwrapped + tenant boundary bypass potential (P1) ✅ **FIXED (M1)**

**Category:** Security / Authorization / Tenant Isolation  
**Location:** `app/api/plans/[planId]/visibility/route.ts`

**Description:** Visibility change route was unwrapped AND accepted `body.owner_tenant_id` which could reassign a plan to an arbitrary tenant.

**Fix applied:** Wrapped in `apiHandler({ auth: 'user' })`. Added tenant membership validation: if `targetTenant` (from body or plan fallback) differs from user's tenants and user is not system_admin, returns 403. Attack scenario blocked: user can no longer reassign plan to a tenant they don't belong to. Business logic unchanged.

---

### PLAN-003 — Play endpoint unwrapped, no explicit auth (P1) ✅ **FIXED (M1)**

**Category:** Security / Authentication  
**Location:** `app/api/plans/[planId]/play/route.ts`

**Description:** Plan play data endpoint had no explicit auth check and was not wrapped.

**Fix applied:** Wrapped in `apiHandler({ auth: 'public' })`. Preserves public access (RLS returns only visible plans for anonymous/authenticated users). Now has consistent error handling and structured logging. Business logic unchanged.

---

### PLAN-004 — Block CRUD mutations lack capability checks (P1) ✅ **FIXED (M2)**

**Category:** Security / Authorization — Defense-in-depth  
**Location:** `app/api/plans/[planId]/blocks/route.ts`, `app/api/plans/[planId]/blocks/[blockId]/route.ts`, `app/api/plans/[planId]/blocks/reorder/route.ts`

**Fix applied:** All 4 block mutation handlers (POST create, PATCH update, DELETE, POST reorder) now call `requirePlanEditAccess()` from the shared capability module (`lib/planner/require-plan-access.ts`). Checks `planner.plan.update` capability before mutation. Returns 404 if plan not found, 403 if capability denied.

---

### PLAN-005 — Plan start lacks capability check (P1) ✅ **FIXED (M2)**

**Category:** Security / Authorization — Defense-in-depth  
**Location:** `app/api/play/[planId]/start/route.ts`

**Fix applied:** Added `requirePlanStartAccess()` call before `getPlanSnapshot()`. Checks `play.run.start` capability — user must be able to read the plan to start a run. Returns 404/403 before expensive snapshot work begins.

---

### PLAN-006 — Schedules CRUD lacks access/capability checks (P1) ✅ **FIXED (M2)**

**Category:** Security / Authorization — Defense-in-depth  
**Location:** `app/api/plans/schedules/route.ts`, `app/api/plans/schedules/[scheduleId]/route.ts`

**Fix applied:** Three mutation handlers now call `requirePlanEditAccess()`: POST create (checks plan from body `planId`), PUT update (fetches schedule → resolves `plan_id` → checks plan), DELETE (same). GET routes remain RLS-only (correct — read access cascades via plan visibility). Validation gaps (date format) remain tracked as PLAN-012 (P2, post-launch).

---

### ~~PLAN-007 — Notes/tenant accepts arbitrary tenant_id (P1)~~ ✅ FIXED (M3)

**Fix applied:** Added `assertTenantMembership(supabase, user, tenantId)` call from shared `lib/planner/require-plan-access.ts` module after resolving tenant_id. Validates user has membership in the target tenant (system_admin bypass). Returns 403 `INVALID_TENANT` on denial. Defense-in-depth over existing RLS policy. Same pattern as `plans/route.ts` POST (M1).

---

### ~~PLAN-008 — Plan copy accepts arbitrary owner_tenant_id (P1)~~ ✅ FIXED (M3)

**Fix applied:** Added inline tenant membership validation using already-fetched `memberships` array: `memberships.some(m => m.tenant_id === targetTenantId)` with system_admin bypass. Returns 403 `INVALID_TENANT` on denial. Defense-in-depth over existing RLS INSERT policy. Additional issue (silent blocks failure) remains tracked as PLAN-010 (P2, post-launch).

---

### PLAN-009 — Publish is non-transactional (P2)

**Category:** Data Integrity  
**Location:** `app/api/plans/[planId]/publish/route.ts`

**Description:** Publish creates a version, copies blocks, and updates plan status in 3 separate DB calls. If blocks copy fails after version creation, inconsistent state results: version exists without blocks, plan may have `status: 'published'`.

**Code acknowledges:** `"In production, this should be a transaction"`

**Risk:** Low frequency (publish is admin action, low concurrency), but data corruption when it occurs requires manual fix.

**Fix:** Use Supabase RPC or transaction wrapper for atomic publish.

---

### PLAN-010 — Copy is non-transactional with silent partial failure (P2)

**Category:** Data Integrity / Error Handling  
**Location:** `app/api/plans/[planId]/copy/route.ts`

**Description:** Copy creates plan then inserts blocks in separate calls. If blocks insert fails, the plan exists without content. Error is logged but not returned to user.

**Fix:** Transaction wrapper or return warning to user (like Games GAME-009 pattern).

---

### PLAN-011 — Dashboard routes mask query errors as empty results (P2)

**Category:** Error Handling  
**Location:** `app/api/play/runs/active/route.ts`, `app/api/play/runs/dashboard/route.ts`

**Description:** Both routes return `[]` (empty array) when the database query fails, logging a warning but not surfacing the error. This masks real database failures and makes debugging difficult.

**Fix:** Return 500 on query error instead of empty results.

---

### PLAN-012 — Schedule endpoints lack date format validation (P2)

**Category:** Input Validation  
**Location:** `app/api/plans/schedules/route.ts`

**Description:** GET accepts `from` and `to` query parameters without format validation. POST accepts `scheduledDate` without format validation. Invalid dates could cause unexpected query behavior.

**Fix:** Add ISO 8601 date format validation.

---

### PLAN-013 — Run sessions POST has implicit tenant assignment (P2)

**Category:** Tenant Isolation  
**Location:** `app/api/play/runs/[runId]/sessions/route.ts`

**Description:** POST resolves tenant from request header or user's first membership without explicit validation. No capability check for session creation. If header tenant is wrong, session could be created in wrong tenant context.

**RLS mitigation:** `run_sessions` policies cascade via run ownership. The session is scoped to the run, which is scoped to the user.

**Fix:** Validate tenant matches run's plan tenant.

---

### PLAN-014 — Notes/private and progress lack plan access pre-check (P2)

**Category:** Security / Authorization — Defense-in-depth  
**Location:** `app/api/plans/[planId]/notes/private/route.ts`, `app/api/plans/[planId]/progress/route.ts`

**Description:** Both endpoints accept any planId without verifying user can access the plan. Notes/private uses `upsert` with `user_id` scoping. Progress uses `user_id` + plan_id.

**RLS mitigation:** Both tables have policies requiring `user_id = auth.uid()` + plan visibility. Provides real protection.

**Fix:** Add plan access pre-check for defense-in-depth and clear error messages.

---

### PLAN-015 — Most routes use custom validators instead of Zod (P3)

**Category:** Code Quality / Standardization  
**Location:** Multiple routes

**Description:** Most planner routes use `validatePlanPayload()` and `validatePlanBlockPayload()` (custom validators) instead of the Zod `input` parameter in apiHandler. This is functional but inconsistent with newer routes that use Zod.

**No immediate risk.** Custom validators work correctly. Zod migration is a post-launch improvement.

---

### PLAN-016 — Virtual run fallback masks snapshot errors (P3)

**Category:** Error Handling  
**Location:** `app/api/play/[planId]/start/route.ts`

**Description:** When database write fails during run creation, the endpoint falls back to returning a virtual (in-memory) run instead of reporting the error. This masks failures and bypasses audit/gamification tracking.

**Fix:** Log warning but consider returning error instead of silently degrading.

---

## 4. Suggested Milestones

### M1 — Wrapper Migration (PLAN-001, PLAN-002, PLAN-003) ✅ KLAR (2025-07-21)
- [x] Wrap 3 routes in `apiHandler`
- [x] Add tenant membership validation to PLAN-001 (`plans/route.ts` POST — validates `owner_tenant_id ∈ user.memberships`)
- [x] Add tenant membership validation to PLAN-002 (`visibility/route.ts` POST — validates `targetTenant ∈ user.memberships`)
- [x] PLAN-003 auth policy decided: `auth: 'public'` (preserves public access, RLS filters visibility)
- [x] `tsc --noEmit` = 0 errors

**Noteringar:** All 3 routes now use `apiHandler`. PLAN-001/002 gained tenant membership validation via `user_tenant_memberships` query (system_admin bypasses). PLAN-003 wrapped as `auth: 'public'` — business logic unchanged, now has consistent error handling and structured logging. Wrapper coverage: 243/287 files (84.7%), 355/408 handlers (87.0%).

### M2 — Capability Gates (PLAN-004, PLAN-005, PLAN-006) ✅ KLAR (2025-07-21)
- [x] Create shared capability module (`lib/planner/require-plan-access.ts`)
- [x] Add `requirePlanEditAccess()` to 4 block handlers (POST, PATCH, DELETE, reorder)
- [x] Add `requirePlanStartAccess()` to plan start route
- [x] Add `requirePlanEditAccess()` to 3 schedule mutation handlers (POST, PUT, DELETE)
- [x] `tsc --noEmit` = 0 errors

**Noteringar:** Created `lib/planner/require-plan-access.ts` as the domain’s shared capability helper (“single source of truth” per GPT directive). Exposes `requirePlanAccess(supabase, user, planId, capability)` plus convenience wrappers: `requirePlanEditAccess` (checks `planner.plan.update`), `requirePlanStartAccess` (checks `play.run.start`), `requirePlanReadAccess` (checks `planner.plan.read`). Internally fetches plan ownership fields + user profile + memberships → builds `CapabilityContext` → calls `requireCapability`. Schedule GET routes remain RLS-only (correct — no single plan to gate).

### M3 — Tenant Boundary (PLAN-007, PLAN-008) ✅ KLAR (2026-03-12)
- [x] Add `assertTenantMembership()` helper to shared capability module
- [x] Add tenant membership validation to notes/tenant (PLAN-007)
- [x] Add tenant membership validation to copy (PLAN-008)
- [x] `tsc --noEmit` = 0 errors

**Noteringar:** Added `assertTenantMembership(supabase, user, tenantId)` to `lib/planner/require-plan-access.ts` — validates `tenantId ∈ user.memberships` with system_admin bypass. Notes/tenant route uses the shared helper. Copy route uses inline check (memberships already fetched in capability context). Both follow the same pattern established in M1 (`plans/route.ts` POST). **Planner domain: 0 P1 remaining within launch scope.** M4/M5 deferred post-launch.

### M4 — Data Integrity (PLAN-009, PLAN-010, PLAN-011) — Post-launch
- Transaction wrapper for publish
- Transaction wrapper for copy (or warning pattern)
- Fix dashboard error masking

### M5 — Validation & Cleanup (PLAN-012, PLAN-013, PLAN-014, PLAN-015, PLAN-016) — Post-launch
- Date format validation on schedules
- Tenant validation on run sessions
- Plan access pre-checks
- Zod migration (long-term)

---

## 5. Cross-Reference

| Launch-control ID | Finding | Status |
|-------------------|---------|--------|
| PRE-007 | Dual dynamic segments | ✅ **RESOLVED** — no conflict |
| PLAN-001 | Plans POST unwrapped | ✅ **FIXED (M1)** — wrapped + tenant validation |
| PLAN-002 | Visibility POST unwrapped | ✅ **FIXED (M1)** — wrapped + tenant validation |
| PLAN-003 | Play GET unwrapped | ✅ **FIXED (M1)** — wrapped as `auth: 'public'` |
| PLAN-004 | Block CRUD no capability | ✅ **FIXED (M2)** — `requirePlanEditAccess()` on all 4 handlers |
| PLAN-005 | Plan start no capability | ✅ **FIXED (M2)** — `requirePlanStartAccess()` before snapshot |
| PLAN-006 | Schedules no capability | ✅ **FIXED (M2)** — `requirePlanEditAccess()` on create/update/delete |
| PLAN-007 | Notes/tenant arbitrary tenant_id | ✅ **FIXED (M3)** — `assertTenantMembership()` validates membership |
| PLAN-008 | Copy arbitrary owner_tenant_id | ✅ **FIXED (M3)** — inline membership check using fetched memberships |
| PLAN-009–016 | Remaining findings | ⬜ Pending (M4–M5, post-launch) |
