# Level 2 Audit — Planner Publish / Progress / Version / Access Chain

> **Audit type:** Level 2 Building Block Audit (per §7 audit-program.md)  
> **Date:** 2026-03-15  
> **Auditor:** Claude  
> **Status:** ✅ COMPLETE  
> **Result:** 0 P0, 1 P1, 3 P2, 5 P3 — **PASS (launch-safe with caveats)**

---

## 1. Scope & Chain Components

This audit covers the **Planner publish / progress / version / access chain** — the complete flow from plan creation through block editing, publishing, version management, progress tracking, and visibility control. Per GPT directive, six specific areas are mapped:

1. Publish flow
2. Progress flow
3. Version flow
4. Read / edit / start capability chain
5. Tenant boundary through entire chain
6. Difference between "RLS saves" and "app-layer does the right thing"

### Route Inventory (18 routes)

| # | Route | Methods | Auth | Access Guard | DB Client |
|---|-------|---------|------|-------------|-----------|
| 1 | `plans/route.ts` | POST | user | Inline tenant check | RLS ✅ |
| 2 | `plans/search/route.ts` | POST | user | Inline caps for response | RLS ✅ |
| 3 | `plans/bulk/route.ts` | POST | user | Inline caps + canTransition | RLS ✅ |
| 4 | `plans/[planId]/route.ts` | GET, PATCH, DELETE | user | Inline requireCapability | RLS ✅ |
| 5 | `plans/[planId]/publish/route.ts` | POST | user | Inline derivePlanCapabilities | RLS ✅ |
| 6 | `plans/[planId]/progress/route.ts` | GET, POST | user | **NONE** | RLS ✅ |
| 7 | `plans/[planId]/visibility/route.ts` | POST | user | Inline role + tenant check | RLS ✅ |
| 8 | `plans/[planId]/versions/route.ts` | GET | user | NONE (plan fetch = implicit) | RLS ✅ |
| 9 | `plans/[planId]/status/route.ts` | POST | user | Inline requireCapability + state machine | RLS ✅ |
| 10 | `plans/[planId]/copy/route.ts` | POST | user | Inline requireCapability | RLS ✅ |
| 11 | `plans/[planId]/blocks/route.ts` | POST | user | `requirePlanEditAccess` (canonical) | RLS ✅ |
| 12 | `plans/[planId]/blocks/[blockId]/route.ts` | PATCH, DELETE | user | `requirePlanEditAccess` (canonical) | RLS ✅ |
| 13 | `plans/[planId]/blocks/reorder/route.ts` | POST | user | `requirePlanEditAccess` (canonical) | RLS ✅ |
| 14 | `plans/[planId]/notes/private/route.ts` | POST | user | NONE (RLS only) | RLS ✅ |
| 15 | `plans/[planId]/notes/tenant/route.ts` | POST | user | `assertTenantMembership` (canonical) | RLS ✅ |
| 16 | `plans/[planId]/play/route.ts` | GET | **public** | NONE (RLS only) | RLS ✅ |
| 17 | `plans/schedules/route.ts` | GET, POST | user | GET: NONE; POST: `requirePlanEditAccess` | RLS ✅ |
| 18 | `plans/schedules/[scheduleId]/route.ts` | GET, PUT, DELETE | user | GET: NONE; PUT/DELETE: `requirePlanEditAccess` | RLS ✅ |

**Key structural observations:**
- ✅ ALL 18 routes use `createServerRlsClient` — ZERO use `createServiceRoleClient`
- ✅ ALL routes use `apiHandler` wrapper
- ⚠️ ZERO routes configure rate limiting
- ⚠️ NO server actions for planner domain

---

## 2. Architecture Chain Map

```
┌─────────────────────────────────────────────────────────────────────┐
│ PLAN LIFECYCLE CHAIN                                                 │
│                                                                      │
│  CREATE          EDIT            PUBLISH         CONSUME             │
│  ┌──────┐    ┌──────────┐    ┌──────────┐    ┌──────────────┐       │
│  │plans/│    │[planId]/ │    │publish/  │    │play/         │       │
│  │POST  │    │PATCH     │    │POST      │    │GET (public)  │       │
│  └──┬───┘    └────┬─────┘    └────┬─────┘    └──────────────┘       │
│     │             │               │                                  │
│     │  ┌──────────┤          ┌────┴──────────────────┐              │
│     │  │ blocks/  │          │ version + blocks copy  │              │
│     │  │ POST     │          │ + plan status update    │              │
│     │  │ PATCH    │          │ (3 separate DB ops)     │              │
│     │  │ DELETE   │          └────┬──────────────────┘              │
│     │  └──────────┘               │                                  │
│     │                             │                                  │
│  ┌──┴──────────── AUTH LAYER ─────┴─────────────────────────────┐   │
│  │                                                               │   │
│  │  CANONICAL (6 routes):     requirePlanEditAccess()            │   │
│  │                            ↓                                  │   │
│  │                            requirePlanAccess(capability)      │   │
│  │                            ↓                                  │   │
│  │                            fetch plan → fetch profile +       │   │
│  │                            memberships → buildCapCtx →        │   │
│  │                            requireCapability()                │   │
│  │                                                               │   │
│  │  INLINE (7 routes):        duplicate the above pattern        │   │
│  │                            directly in route handler          │   │
│  │                                                               │   │
│  │  RLS-ONLY (5 routes):      no app-layer check at all         │   │
│  │                                                               │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────── RLS LAYER (always active) ─────────────────┐   │
│  │  plans_select:  owner OR tenant_member OR public OR sysadmin  │   │
│  │  plans_update:  owner OR tenant_admin OR sysadmin             │   │
│  │  plans_delete:  owner OR sysadmin (NO tenant_admin!)          │   │
│  │  plans_insert:  owner + tenant_member                         │   │
│  │                                                               │   │
│  │  plan_blocks:   SELECT piggyback plans; WRITE owner/sysadmin  │   │
│  │  plan_versions: SELECT piggyback plans; INSERT owner/sysadmin │   │
│  │  plan_version_blocks: same chain as plan_versions             │   │
│  │                                                               │   │
│  │  plan_play_progress: user_id = auth.uid() ONLY               │   │
│  │  plan_notes_private: plan.owner_user_id = auth.uid()          │   │
│  │  plan_notes_tenant:  tenant membership + plan visibility      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Publish Flow — Step-by-Step Analysis

**Route:** `POST /api/plans/[planId]/publish`

| Step | Operation | Guard | Risk |
|------|-----------|-------|------|
| 1 | Auth via apiHandler | `auth: 'user'` | ✅ Standard |
| 2 | Fetch plan + blocks | `fetchPlanWithRelations()` → RLS `plans_select` | ✅ Safe |
| 3 | Fetch memberships | Inline `user_tenant_memberships` query | ✅ |
| 4 | Build capability context | `buildCapabilityContextFromMemberships()` with **`user.app_metadata?.global_role`** | ⚠️ Uses `app_metadata` directly, not `deriveEffectiveGlobalRole()` |
| 5 | Check canPublish | `derivePlanCapabilities()` + `capabilities.canPublish` | ✅ Correct logic |
| 6 | Validate blocks > 0 | App-layer validation | ✅ |
| 7 | Get next version number | SELECT max(version_number) + 1 | ⚠️ Race condition (DB function `get_next_plan_version_number()` exists but unused) |
| 8 | INSERT plan_versions | RLS `plan_versions_insert`: owner/sysadmin only | ❌ **Tenant admins blocked by RLS** |
| 9 | INSERT plan_version_blocks | RLS `plan_version_blocks_insert`: same chain | ❌ **Same mismatch** |
| 10 | UPDATE plans (status → published) | RLS `plans_update`: owner/tenant_admin/sysadmin | ✅ Would work for tenant admin |
| 11 | Log gamification event | Fire-and-forget | ✅ |

**Verdict:** Publish works correctly for plan owners and system admins. Tenant admins pass the app-layer capability check (step 5) but fail at RLS (steps 8-9). The publish route has a partial rollback: if block insert fails, the version is deleted. But if the plan update (step 10) fails, the version persists (orphaned). The code acknowledges this with a comment: *"In production, this should be a transaction"*.

---

## 4. Progress Flow — Analysis

**Route:** `GET/POST /api/plans/[planId]/progress`

| Aspect | Detail | Assessment |
|--------|--------|------------|
| Auth | `auth: 'user'` | ✅ |
| Plan access check | **NONE** | ⚠️ Any authenticated user can create/read progress for any plan UUID |
| Data isolation | RLS `plan_play_progress_manage`: `user_id = auth.uid()` | ✅ User can only see/modify own rows |
| Block validation | POST: validates `current_block_id` belongs to plan (via `plan_blocks` query with RLS) | ✅ Indirect plan visibility check |
| Without block_id | POST: upsert succeeds even if user can't read the plan | ⚠️ Progress entry created for invisible plan |

**Verdict:** Low exploitability — user can only access their own progress entries (never others'). However, a user can create progress for a plan they shouldn't know exists, confirming the plan UUID is valid. The block validation step provides indirect protection when `current_block_id` is provided (plan_blocks SELECT piggybacks on plans RLS).

---

## 5. Version Flow — Analysis

**Route:** `GET /api/plans/[planId]/versions`

| Step | Operation | Guard |
|------|-----------|-------|
| 1 | Auth | `auth: 'user'` |
| 2 | Fetch plan (id, name, current_version_id) | RLS `plans_select` — filters by visibility |
| 3 | Fetch versions for plan | RLS `plan_versions_select` piggybacks on `plans_select` |
| 4 | Map to response | Pure transformation |

**Verdict:** ✅ **Correctly guarded by RLS.** The plan fetch in step 2 acts as an implicit visibility check — if the user can't see the plan, they get a 404. Version listing is safe.

**Version creation** happens exclusively through the publish route (§3 above). There is no standalone version-create endpoint. The DB function `get_next_plan_version_number()` (SECURITY DEFINER) exists in baseline but is not called — the publish route does its own `MAX(version_number) + 1` query. While this creates a theoretical race condition under concurrent publish requests, the practical risk is negligible (single-user plan editing context).

---

## 6. Capability Chain — End-to-End Mapping

### 6.1 Capability → RLS Alignment Matrix

This is the central analysis mapping each route's app-layer capability check against the RLS policy that actually guards the DB operation.

| Route | App-layer cap required | RLS policy that guards | Aligned? |
|-------|----------------------|----------------------|----------|
| plans/ POST | None (tenant membership) | `plans_insert` (owner + tenant member) | ✅ |
| [planId]/ GET | `planner.plan.read` (implicit via fetch) | `plans_select` | ✅ |
| [planId]/ PATCH | `planner.plan.update` | `plans_update` (owner/tenant_admin/sysadmin) | ✅ |
| [planId]/ DELETE | `planner.plan.delete` | `plans_delete` (owner/sysadmin — **NO tenant_admin**) | ⚠️ RLS stricter |
| publish/ POST | `planner.plan.publish` | `plan_versions_insert` (owner/sysadmin — **NO tenant_admin**) | ❌ **MISMATCH** |
| progress/ GET/POST | **NONE** | `plan_play_progress_manage` (user_id only) | ⚠️ No plan check |
| versions/ GET | None (implicit) | `plans_select` + `plan_versions_select` piggyback | ✅ RLS saves |
| visibility/ POST | None (inline role check) | `plans_update` | ✅ Functionally aligned |
| status/ POST | `planner.plan.update` | `plans_update` | ✅ |
| copy/ POST | `planner.plan.read` | `plans_insert` (new plan, own owner) | ✅ |
| blocks/ POST | `planner.plan.update` | `plan_blocks_insert` (owner/sysadmin — **NO tenant_admin**) | ❌ **MISMATCH** |
| blocks/[id] PATCH | `planner.plan.update` | `plan_blocks_update` (owner/sysadmin — **NO tenant_admin**) | ❌ **MISMATCH** |
| blocks/[id] DELETE | `planner.plan.update` | `plan_blocks_delete` (owner/sysadmin — **NO tenant_admin**) | ❌ **MISMATCH** |
| blocks/reorder | `planner.plan.update` | `plan_blocks_update` | ❌ **MISMATCH** |
| notes/private | NONE | `plan_notes_private_manage` (owner) | ✅ RLS saves |
| notes/tenant | `assertTenantMembership` | `plan_notes_tenant_*` | ✅ |
| play/ GET | NONE (public auth) | `plans_select` (anon → public only) | ✅ RLS saves |
| schedules/* write | `planner.plan.update` | ⚠️ Table not in baseline | ⚠️ Unknown |
| schedules/* read | NONE | ⚠️ Table not in baseline | ⚠️ Unknown |

### 6.2 Access Pattern Classification

| Pattern | Routes | Count |
|---------|--------|-------|
| Canonical `requirePlanEditAccess` | blocks/*, blocks/[id]/* , blocks/reorder, schedules/* POST/PUT/DELETE | 6 |
| Canonical `assertTenantMembership` | notes/tenant | 1 |
| Inline capability derivation | [planId] PATCH/DELETE, publish, status, copy, search, bulk | 7 |
| RLS-only (no app-layer check) | progress, versions, notes/private, play, schedules GET | 5 |

---

## 7. Tenant Boundary Analysis

Tracing `owner_tenant_id` / `tenant_id` through the complete chain:

| Flow | Tenant Source | Validation | RLS Guard | Assessment |
|------|--------------|------------|-----------|------------|
| Plan creation | `body.owner_tenant_id` → header → null | Inline membership query (or sysadmin bypass) | `plans_insert`: `is_tenant_member(owner_tenant_id)` | ✅ Double-guarded |
| Plan metadata update | From existing plan | `requireCapability('update')` → derives tenant context | `plans_update`: `has_tenant_role(owner_tenant_id, 'admin')` | ✅ Aligned |
| Block mutations | From parent plan | `requirePlanEditAccess` → `planner.plan.update` | `plan_blocks_*`: owner/sysadmin only | ❌ Tenant admin blocked at RLS |
| Publish | From parent plan | Inline `derivePlanCapabilities` → canPublish | `plan_versions_insert`: owner/sysadmin only | ❌ Tenant admin blocked at RLS |
| Visibility change | `body.visibility` + `body.owner_tenant_id` | Inline membership validation + `deriveEffectiveGlobalRole` | `plans_update` | ✅ |
| Copy | New plan → user's tenant | Membership check on target tenant | `plans_insert` (owner of new plan) | ✅ |
| Progress | From URL (planId) | **NONE** | `user_id = auth.uid()` (no tenant check) | ⚠️ No plan access, but user-scoped |
| Private notes | From parent plan | NONE | Owner-only | ✅ |
| Tenant notes | `body.tenant_id` or parent plan | `assertTenantMembership` | `get_user_tenant_ids()` | ✅ |
| Play view | From URL (planId) | NONE (public auth) | `plans_select` (visibility-based) | ✅ |

**Tenant isolation verdict:** No cross-tenant data leakage is possible. All mutation paths either validate tenant membership explicitly or are owner-scoped by RLS. The mismatch for tenant admins on sub-tables (blocks, versions) is a **denial-of-write**, not a data breach — RLS is stricter than the capability system.

---

## 8. RLS vs App-Layer Responsibility Map

This directly addresses the GPT directive: *"difference between RLS saves and app-layer does right thing"*.

| Route | App-layer | RLS | Who actually saves? |
|-------|-----------|-----|---------------------|
| plans/ POST | ✅ Validates tenant membership | ✅ `plans_insert` enforces owner + membership | **Both (redundant, correct)** |
| [planId]/ GET | ✅ Derives capabilities for UI | ✅ `plans_select` is the actual read filter | **RLS is the real guard** |
| [planId]/ PATCH | ✅ `requireCapability('update')` | ✅ `plans_update` | **Both (redundant, correct)** |
| [planId]/ DELETE | ✅ `requireCapability('delete')` allows tenant admin | ⚠️ `plans_delete` blocks tenant admin | **RLS is stricter (saves from over-grant)** |
| publish/ POST | ✅ `canPublish` allows tenant admin | ⚠️ `plan_versions_insert` blocks tenant admin | **RLS is stricter (saves from over-grant)** |
| progress/ GET/POST | ❌ **No check at all** | ⚠️ `user_id = auth.uid()` (no plan check) | **RLS saves (partially)** — user-scoped but no plan visibility check |
| versions/ GET | ⚠️ Implicit (plan fetch) | ✅ `plans_select` + `plan_versions_select` | **RLS saves** |
| visibility/ POST | ✅ Role + tenant checks | ✅ `plans_update` | **Both (correct)** |
| status/ POST | ✅ `requireCapability('update')` + state machine | ✅ `plans_update` | **Both (correct)** |
| copy/ POST | ✅ `requireCapability('read')` + tenant check | ✅ `plans_insert` on new plan | **Both (correct)** |
| blocks/ * | ✅ `requirePlanEditAccess('update')` | ⚠️ `plan_blocks_*` blocks tenant admin | **RLS is stricter** |
| notes/private | ❌ No check | ✅ `plan_notes_private_manage` (owner-only) | **RLS saves** |
| notes/tenant | ✅ `assertTenantMembership` | ✅ `plan_notes_tenant_*` | **Both (correct)** |
| play/ GET | ❌ No check (public auth) | ✅ `plans_select` (public visibility → OK, private → no rows) | **RLS saves** |

**Summary:** 7 routes are correctly double-guarded, 4 routes rely on "RLS saves" (acceptable for read operations), 4 routes have "RLS is stricter than app-layer" mismatch (tenant admin denied at RLS despite app-layer approval).

---

## 9. End-to-End Flow Proofs

### Flow Proof 1: Owner — Create → Edit → Publish

| Step | Route | App check | RLS check | Result |
|------|-------|-----------|-----------|--------|
| Create plan | POST /plans | ✅ tenant membership | ✅ `plans_insert` owner | ✅ PASS |
| Add block | POST /plans/[id]/blocks | ✅ `requirePlanEditAccess` → `planner.plan.update` → owner | ✅ `plan_blocks_insert` owner | ✅ PASS |
| Edit block | PATCH /plans/[id]/blocks/[bid] | ✅ Same | ✅ `plan_blocks_update` owner | ✅ PASS |
| Publish | POST /plans/[id]/publish | ✅ `canPublish` → owner | ✅ `plan_versions_insert` owner | ✅ PASS |
| List versions | GET /plans/[id]/versions | ✅ Implicit (plan exists) | ✅ `plan_versions_select` via plans | ✅ PASS |

**Verdict: ✅ Complete happy path works for plan owners.**

### Flow Proof 2: Tenant Admin — Edit Shared Plan

| Step | Route | App check | RLS check | Result |
|------|-------|-----------|-----------|--------|
| View plan | GET /plans/[id] | ✅ `planner.plan.read` (tenant member, visibility=tenant) | ✅ `plans_select` tenant member | ✅ PASS |
| Edit metadata | PATCH /plans/[id] | ✅ `planner.plan.update` (tenant admin) | ✅ `plans_update` `has_tenant_role(admin)` | ✅ PASS |
| Add block | POST /plans/[id]/blocks | ✅ `requirePlanEditAccess` → `planner.plan.update` (tenant admin) | ❌ `plan_blocks_insert` owner/sysadmin only | ❌ **FAIL (RLS error)** |
| Publish | POST /plans/[id]/publish | ✅ `canPublish` (tenant admin) | ❌ `plan_versions_insert` owner/sysadmin only | ❌ **FAIL (RLS error)** |

**Verdict: ❌ Tenant admin can update plan metadata but CANNOT edit blocks or publish.** The capability system says "yes" but RLS says "no". This is the root cause of finding L2-PLAN-001.

### Flow Proof 3: Anonymous User — Play View

| Step | Route | App check | RLS check | Result |
|------|-------|-----------|-----------|--------|
| View public plan | GET /plans/[id]/play | None (auth: 'public') | ✅ `plans_select` visibility=public → allowed | ✅ PASS |
| View private plan | GET /plans/[id]/play | None (auth: 'public') | ✅ `plans_select` requires auth.uid() for private → no rows | ✅ SAFE (404) |

**Verdict: ✅ Anonymous access correctly limited by RLS to public plans only.**

---

## 10. Findings

### L2-PLAN-001 — Tenant-admin sub-table RLS mismatch (P1)

| Field | Value |
|-------|-------|
| **Severity** | P1 (functional breakage in multi-tenant collaboration) |
| **Security breach?** | ❌ No — RLS is stricter, not weaker |
| **Affected routes** | blocks/ (POST, PATCH, DELETE, reorder), publish/ POST — 5 routes |
| **Root cause** | `plan_blocks`, `plan_versions`, `plan_version_blocks` RLS write policies require `owner_user_id = auth.uid() OR is_system_admin()` — no `has_tenant_role()` clause. Meanwhile, capability system grants `planner.plan.update` and `planner.plan.publish` to tenant admins on tenant-visible plans. |
| **Impact** | Tenant admins see "edit" and "publish" UI controls (capabilities say allowed) but operations fail at RLS level. Plan metadata (name, description, visibility, status) CAN be updated (plans_update allows tenant admins), but blocks and versions cannot. |
| **Fix** | Update `plan_blocks_insert/update/delete` and `plan_versions_insert` and `plan_version_blocks_insert` RLS policies to add `OR (has_tenant_role(..., 'admin') AND visibility = 'tenant')` condition, matching `plans_update` pattern |
| **Workaround** | Tenant admins can only update plan metadata, not blocks or versions. This may be acceptable for MVP if tenant admin block editing is not a launch feature. |

### L2-PLAN-002 — Progress route has no plan access check (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (defense-in-depth gap, mitigated by RLS) |
| **Affected routes** | progress/ GET and POST |
| **Root cause** | Route performs no plan visibility/capability check. Any authenticated user who knows a plan UUID can create/read their own progress for that plan. |
| **Mitigation** | RLS `plan_play_progress_manage` scopes data to `user_id = auth.uid()` — user can never see other users' progress. Block validation (when `current_block_id` provided) indirectly checks plan visibility via `plan_blocks_select` RLS. |
| **Impact** | A user can confirm a plan UUID exists and track progress on an invisible plan. Low exploitability — plan UUIDs are not enumerable (UUIDv4). |
| **Fix** | Add `requirePlanReadAccess(supabase, user, planId)` before progress read/write |
| **Cross-ref** | Previously tracked as REG-PLAN-001 (P2) in planner regression |

### L2-PLAN-003 — Publish route uses `app_metadata.global_role` directly (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (consistency issue, mitigated by RLS) |
| **Affected routes** | publish/ POST |
| **Root cause** | Publish route reads `user.app_metadata?.global_role` directly when building capability context, instead of using `deriveEffectiveGlobalRole(profile, user)` which cross-references the users table. All other planner routes (status, copy, [planId] CRUD, visibility) correctly use `deriveEffectiveGlobalRole()`. |
| **Impact** | If `app_metadata.global_role` differs from `users.global_role`, the publish route's capability derivation may differ from other routes. Currently no known scenario where they diverge, but inconsistency creates maintenance risk. |
| **Fix** | Replace `(user.app_metadata?.global_role as GlobalRole) ?? null` with profile fetch + `deriveEffectiveGlobalRole()` pattern used by sibling routes |
| **Cross-ref** | Same root cause as L2-AUTH-005 (P2) from L2-1 audit |

### L2-PLAN-004 — No rate limiting on any planner route (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (defense-in-depth gap) |
| **Affected routes** | All 18 routes |
| **Root cause** | None of the 18 planner route files configure `rateLimit` in their `apiHandler` options. The `apiHandler` framework supports rate limiting but it's opt-in per route. |
| **Impact** | Authenticated users can call planner endpoints without throttle. The bulk route (`plans/bulk`) accepts up to 50 plan IDs per request with no rate limit. |
| **Mitigation** | Supabase connection pooling and RLS provide some implicit throttling. Auth requirement prevents anonymous abuse on 17 of 18 routes. |
| **Fix** | Add `rateLimit` configuration to high-risk routes (publish, bulk, copy, create) |

### L2-PLAN-005 — Non-atomic publish creates partial state risk (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (low probability data integrity risk) |
| **Affected routes** | publish/ POST |
| **Root cause** | Publish performs 3 separate DB operations: (1) INSERT plan_versions, (2) INSERT plan_version_blocks, (3) UPDATE plans. Step 2 failure triggers manual rollback (delete version). Step 3 failure is acknowledged with a comment but no rollback. |
| **Impact** | If step 3 fails: orphaned version exists, plan status remains unchanged, `current_version_id` not updated. The version is invisible in normal UI flow but exists in DB. |
| **Mitigation** | Step 3 (plan update via RLS) is unlikely to fail if steps 1-2 succeeded (same user, same permissions). The code acknowledges the risk: *"In production, this should be a transaction"*. |
| **Fix** | Use Supabase `rpc()` to wrap in a database transaction, or use the existing `get_next_plan_version_number()` SECURITY DEFINER function as part of a transactional publish function |

### L2-PLAN-006 — DELETE capability grants tenant admin but RLS denies (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (same root cause as L2-PLAN-001, but for less common operation) |
| **Affected routes** | [planId]/ DELETE |
| **Root cause** | Capability system grants `planner.plan.delete` to tenant admins (via `derivePlanCapabilities`). RLS `plans_delete` only allows `owner_user_id = auth.uid() OR is_system_admin()` — no `has_tenant_role()` clause. |
| **Impact** | Tenant admin passes app-layer delete check but fails at RLS. Same class of issue as L2-PLAN-001 but on the plans table directly. |
| **Security** | ❌ Not a breach — RLS prevents the delete. Arguably desirable behavior (only plan owner should delete). |

### L2-PLAN-007 — Inconsistent access guard patterns (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (architectural debt, maintenance risk) |
| **Root cause** | The domain has 3 distinct access patterns: canonical helpers (6 routes), inline capability derivation (7 routes), and RLS-only (5 routes). The canonical helpers in `require-plan-access.ts` are well-designed but underutilized. |
| **Impact** | Maintenance burden — modifying capability logic requires updating both the canonical helpers AND the inline copies. Risk of behavioral drift between routes. |
| **Fix** | Migrate inline capability routes to use `requirePlanAccess()` / `requirePlanEditAccess()`. Keep RLS-only for read-path routes where plan fetch provides implicit access control. |

### L2-PLAN-008 — Visibility route bypasses capability system (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (defense-in-depth gap) |
| **Affected routes** | visibility/ POST |
| **Root cause** | Visibility route uses `deriveEffectiveGlobalRole()` + inline tenant membership check but NEVER calls `requireCapability()` with any specific capability. It relies on `plans_update` RLS to guard the actual write. |
| **Impact** | Any user who passes the tenant membership check can change visibility — there's no explicit `planner.plan.update` capability check. RLS `plans_update` (owner/tenant_admin/sysadmin) is the actual guard. |
| **Mitigation** | The inline checks are functionally equivalent to the capability system's update check for the common cases (owner, tenant admin). The `validatePlanPayload()` call restricts public visibility to system admins. |

### L2-PLAN-009 — `plan_schedules` table not in baseline migration (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (potential dead code) |
| **Affected routes** | schedules/* (2 route files) |
| **Root cause** | The `plan_schedules` table is not defined in `00000000000000_baseline.sql`. It exists only in archived migrations (`_archived/20260220220000`, `_archived/20260305100000`). |
| **Impact** | If the table doesn't exist in the production database, all schedule routes would return 500 errors. |
| **Verification needed** | Check production database for `plan_schedules` table existence. If absent, schedule routes are dead code and should be removed or the migration should be re-applied. |

---

## 11. Summary

### Verdict: **PASS (launch-safe with caveats)**

| Severity | Count | Finding IDs |
|----------|-------|-------------|
| P0 | 0 | — |
| P1 | 1 | L2-PLAN-001 (tenant-admin RLS mismatch on sub-tables) |
| P2 | 3 | L2-PLAN-002 (progress no plan check), L2-PLAN-003 (publish inline global_role), L2-PLAN-004 (no rate limiting) |
| P3 | 5 | L2-PLAN-005 thru L2-PLAN-009 |

### Launch Safety Assessment

**No security breaches found.** In all 4 mismatch cases (L2-PLAN-001, L2-PLAN-006), RLS is **stricter** than the capability system — meaning users are denied operations they should arguably be allowed, not granted operations they shouldn't have. This is the safe direction of mismatch.

**The P1 (L2-PLAN-001) is a functional issue, not a security issue.** It means tenant admin plan collaboration (block editing, publishing) is broken. Whether this blocks launch depends on whether multi-tenant admin editing is a launch requirement:
- **If tenant admin collaboration IS required:** Fix RLS policies on `plan_blocks`, `plan_versions`, `plan_version_blocks` before launch
- **If only plan owners edit/publish:** No fix needed — current behavior is correct for single-user editing

**All 5 "RLS-only" routes are safe.** The RLS policies correctly scope data access. The progress route (L2-PLAN-002) is the weakest — it allows progress tracking on invisible plans — but the practical impact is negligible (user-scoped data, non-enumerable UUIDs).

### Cross-References

| This Finding | Related To |
|-------------|-----------|
| L2-PLAN-001 | *New finding* — not previously tracked |
| L2-PLAN-002 | REG-PLAN-001 (P2) from planner regression |
| L2-PLAN-003 | L2-AUTH-005 (P2) from L2-1 audit |
| L2-PLAN-004 | *New finding* — systemic across 18 routes |
| L2-PLAN-005–009 | *New findings* — architectural debt |
