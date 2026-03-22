# MFA Stabilization Brief

## Metadata

> **Date:** 2026-03-18  
> **Last updated:** 2026-03-22  
> **Last validated:** 2026-03-22  
> **Status:** active  
> **Execution status:** COMPLETE — MFA-001/002/004/005 fixed by 2026-03-19; MFA-003 fixed on 2026-03-22  
> **Audit:** `audits/mfa-trusted-device-audit.md`  
> **Findings:** 5 (2 P0, 2 P1, 1 P2) — all verified against code + generated types + live DB schema  
> **Note:** Executed remediation record. Use `launch-control.md` for overall launch-program state and this file for MFA remediation specifics.

---

## 1. Verified Findings

| ID | Sev | Summary | Status |
|----|-----|---------|--------|
| MFA-004 | **P0** | `user_mfa` update uses 3 wrong field names; PostgREST rejects entire update; route returns `success: true` anyway → split-brain auth state | **✅ FIXED (2026-03-18)** |
| MFA-005 | **P0** | `verifyTrustedDevice()` missing `tenant_id` filter → cross-tenant MFA bypass; admin reset deletes across all tenants | **✅ FIXED (2026-03-19)** |
| MFA-001 | **P1** | `profiles!inner(email, display_name)` join — no `profiles` relation exists on `user_tenant_memberships` → entire endpoint returns 400 | **✅ FIXED (2026-03-19)** |
| MFA-002 | **P1** | `.eq('is_active', true)` — column is `is_revoked`, not `is_active` → trusted device count query returns 400 | **✅ FIXED (2026-03-19)** |
| MFA-003 | **P2** | Status filter applied JS-side after DB `.range()` pagination → inconsistent page sizes when filtering | **✅ FIXED (2026-03-22)** |

**Implemented summary (2026-03-22):**
- `trustDevice()` now requires explicit canonical `tenant_id`; fallback membership and placeholder-UUID resolution removed.
- MFA trust/verify routes read tenant context from the signed tenant cookie only.
- Admin MFA user listing now uses the real `users` relation and `is_revoked = false` for active-device counts.
- Admin MFA user listing now applies computed MFA-status filtering before pagination, so `users`, `total`, and `totalPages` stay correct for filtered views.

**Execution note (2026-03-22):** M3 is implemented in code. `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` no longer paginates before computed MFA-status filtering. The local `as unknown as MFAUserRow[]` cast remains as separate type-safety debt outside the closed audit findings.

---

## 2. Canonical Contract Decision: DD-MFA-1

### DD-MFA-1 — Trusted device scope: tenant-scoped or global? ✅ RESOLVED (2026-03-19)

**Question:** Is trusted-device MFA bypass scoped per tenant or global per user?

**Evidence from each layer:**

| Layer | What it does | Implies |
|-------|-------------|---------|
| **Schema** | `tenant_id NOT NULL`, FK to `tenants(id) ON DELETE CASCADE`, composite unique `(user_id, tenant_id, device_fingerprint)` | **Tenant-scoped** |
| **Indexes** | `idx_mfa_trusted_devices_user_tenant` on `(user_id, tenant_id) WHERE NOT is_revoked` | **Tenant-scoped** — optimized for tenant-filtered lookups |
| **Write path** (`trustDevice()`) | Resolves `tenant_id` from user's primary membership; upserts on `(user_id, tenant_id, device_fingerprint)` | **Tenant-scoped** |
| **Verify path** (`verifyTrustedDevice()`) | Queries `(user_id, trust_token_hash, device_fingerprint)` — no `tenant_id` | **Global** (bug) |
| **Delete path** (admin reset) | Deletes `.eq('user_id', userId)` — no `tenant_id` | **Global** (bug) |
| **API surface** (verify endpoint) | 3 args: `(user_id, trust_token, device_fingerprint)` — no tenant context | **Global** (bug) |

**RLS policy analysis:**

Single policy `mfa_trusted_devices_owner`:
```sql
-- USING (read/update/delete):
(user_id = auth.uid()) OR is_system_admin() OR has_tenant_role(tenant_id, ARRAY['owner', 'admin'])

-- WITH CHECK (insert/update):
(user_id = auth.uid()) OR is_system_admin()
```

- **SELECT/UPDATE/DELETE:** User can access own devices (all tenants). Tenant owners/admins can access devices in their tenant.
- **INSERT:** Only the user themselves or system admin can create devices.
- **The RLS policy does NOT restrict a user from reading their OWN devices across all tenants.** This is correct for a user managing their own devices, but it means the `verifyTrustedDevice()` query (which runs as the user via RLS client) CAN return a device from any tenant.
- **However,** tenant admins CAN only read/delete devices where `has_tenant_role(tenant_id, ...)` matches. This means the admin reset route (which also uses RLS client) would only be able to delete devices in tenants where the admin has `owner` or `admin` role. **But** since it filters only by `user_id` without `tenant_id`, it could still match devices the admin has access to in OTHER tenants they admin (multi-tenant admins).

**RLS mitigation verdict:**
- **MFA-005 verify path:** RLS does **NOT** mitigate. The verify query runs as the user, and users can read all their own devices across tenants. A device trusted in Tenant A will be found when verifying for Tenant B. **Fully exploitable at app layer.**
- **MFA-005 delete path (admin reset):** RLS **partially** mitigates. Admin can only delete devices in tenants where they have `owner`/`admin` role. But for a system admin, **NO mitigation** — `is_system_admin()` bypasses all tenant filtering.

**Decision:** **Tenant-scoped trust is the canonical model.**

Rationale:
1. Schema was explicitly designed with `tenant_id NOT NULL` and composite unique key
2. Write path already implements tenant-scoped trust
3. Each tenant independently controls its MFA policy (`tenant_mfa_policies`)
4. A device trusted in a low-security tenant MUST NOT bypass MFA in a high-security tenant

**Implication for verify endpoint:**
- The login/MFA challenge flow must provide `tenant_id` context
- Since Lekbanken is multi-tenant with tenant selection at login, the active tenant context should already be available in the auth flow
- Verify: where does the MFA challenge flow obtain tenant context?

---

## 3. Execute-Now Items (no decision dependency)

| Item | Finding | Can execute now? | Why |
|------|---------|------------------|-----|
| **M1a** — Fix `user_mfa` field names + error handling | MFA-004 | **DONE** | Closed 2026-03-18. |
| **M2a** — Fix `profiles` join | MFA-001 | **DONE** | Closed 2026-03-19. |
| **M2b** — Fix `is_active` column | MFA-002 | **DONE** | Closed 2026-03-19. |
| **M3** — Fix pagination logic | MFA-003 | **DONE — ✅ KLAR (2026-03-22)** | Route now computes MFA status for the full result set, applies `statusFilter`, then paginates the filtered list. |

## 4. Requires-Decision Items

| Item | Finding | Blocked on | Decision needed |
|------|---------|------------|-----------------|
| **M1b** — Add `tenant_id` to verify + scope admin delete | MFA-005 | **RESOLVED** | Closed 2026-03-19 via DD-MFA-1 and signed-cookie canonical tenant source. |

---

## 5. Exact Implementation Order

### Step 1: M1a — Fix `user_mfa` update (MFA-004) ← EXECUTE NOW

**File:** `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts`

**Changes:**
1. Remove `is_enrolled: false` — no such column; enrollment is tracked by `enrolled_at` timestamp
2. Change `last_verification_at: null` → `last_verified_at: null`
3. Change `grace_period_started_at: new Date().toISOString()` → `grace_period_end: null` (reset clears grace period; if policy requires re-enrollment with grace, compute from policy's `grace_period_days`)
4. Change error handling: if `clearError` is truthy, return `{ success: false, error: 'Failed to clear MFA record' }` with status 500 instead of continuing

**Migration needed:** No  
**Frontend changes needed:** No — response shape is unchanged (still `{ success, message, factors_removed, user_id }`; adding error case is additive)  
**Regression checks:**
- `npx tsc --noEmit` passes
- POST to `/api/admin/tenant/{tid}/mfa/users/{uid}/reset` with valid admin auth → returns `success: true` and `user_mfa` row is actually cleared
- POST with simulated DB error → returns `success: false` with 500

### Step 2: M2a + M2b — Fix dead queries (MFA-001, MFA-002) ← EXECUTE NOW

**File:** `app/api/admin/tenant/[tenantId]/mfa/users/route.ts`

**Changes (MFA-001):**
1. Replace `.select('user_id, role, profiles!inner(email, display_name)')` → `.select('user_id, role, users!inner(email, full_name)')`
   - PostgREST resolves `users` via FK `user_tenant_memberships_user_id_fkey → users.id`
   - `users` table has `email` (text) and `full_name` (text, nullable)
   - Map `full_name` to `display_name` in response for backward compatibility
2. Update `MFAUserRow` interface: `profiles` → `users`, `display_name` → `full_name`
3. Update `getProfile()` helper accordingly
4. Update search filter: `profiles.email.ilike` → `email.ilike` (on `users` relation)
5. Remove `as unknown as SupabaseClient` cast — use properly typed client

**Changes (MFA-002):**
1. Replace `.eq('is_active', true)` → `.eq('is_revoked', false)`
2. Add error check: `if (error) console.error(...)` on trusted devices query

**Migration needed:** No  
**Frontend changes needed:** No — response shape maps `full_name` → `display_name` so API contract is preserved  
**Regression checks:**
- `npx tsc --noEmit` passes
- GET to `/api/admin/tenant/{tid}/mfa/users` with valid admin auth → returns user list with email and display_name
- Trusted device counts > 0 for users with active (non-revoked, non-expired) devices

### Step 3: M3 — Fix pagination (MFA-003) ✅ EXECUTED (2026-03-22)

**File:** `app/api/admin/tenant/[tenantId]/mfa/users/route.ts`

**Changes:**
1. Remove `.range(offset, offset + pageSize - 1)` from initial query
2. Fetch ALL matching members (no pagination at DB level)
3. Compute MFA status for all users
4. Apply status filter
5. Slice the filtered array for pagination: `filteredUsers.slice(offset, offset + pageSize)`
6. Set `totalCount = filteredUsers.length` (always, regardless of filter)

**Migration needed:** No  
**Frontend changes needed:** No  
**Regression checks:**
- GET with `?status=enabled&page=1&pageSize=5` → returns exactly 5 (or fewer if < 5 match), correct `total` and `totalPages`
- GET with `?status=all` → same behavior as before (all users, correct pagination)

**Current status (2026-03-22):** Executed. The route fetches all search-matching members, computes MFA status for the full set, filters by `status`, then slices the filtered array for pagination.

### Step 4: M1b — Tenant-scope trusted device verification (MFA-005) ← AFTER DD-MFA-1

**Files:** `lib/services/mfa/mfaDevices.server.ts`, `app/api/accounts/auth/mfa/devices/verify/route.ts`, `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts`

**Changes (verify service):**
1. Add `tenantId: string` as 4th parameter to `verifyTrustedDevice()` (required, not optional — per canonical model)
2. Add `.eq('tenant_id', tenantId)` to the query

**Changes (verify endpoint):**
1. Accept `tenant_id` in request body (required field)
2. Validate it's a valid UUID
3. Pass to `verifyTrustedDevice()`

**Changes (admin reset):**
1. Change `.delete().eq('user_id', userId)` → `.delete().eq('user_id', userId).eq('tenant_id', tenantId)` (scope to current tenant only)

**Migration needed:** No  
**Frontend changes needed:** **YES** — MFA challenge/verify flow must pass `tenant_id` in the device verify request. Need to investigate where `tenant_id` is available in the MFA flow.  
**Regression checks:**
- Device trusted in Tenant A → verify for Tenant A succeeds
- Device trusted in Tenant A → verify for Tenant B fails
- Admin reset in Tenant B → only Tenant B devices deleted (Tenant A devices preserved)

---

## 6. Regression Plan (post all milestones)

| Check | Covers | Method |
|-------|--------|--------|
| `npx tsc --noEmit` | Type safety preserved for the touched route and MFA handlers | Automated |
| Admin MFA users list | MFA-001, MFA-002, MFA-003 | Manual: GET endpoint returns data, correct pagination, device counts |
| Admin MFA reset | MFA-004 | Manual: POST clears `user_mfa` row, returns failure on DB error |
| Trusted device verify | MFA-005 (after DD-MFA-1) | Manual: verify respects tenant scope |
| Admin reset scope | MFA-005 (after DD-MFA-1) | Manual: delete scoped to tenant |
| Existing MFA flows | No regression | Manual: MFA enrollment, verification, recovery codes still work |

---

## Files to Modify

| File | Step | Changes |
|------|------|---------|
| `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` | 1, 4 | Fix field names + error handling (Step 1), scope delete to tenant (Step 4) |
| `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` | 2, 3 | Fix join + column + pagination complete (2026-03-22) |
| `lib/services/mfa/mfaDevices.server.ts` | 4 | Add `tenant_id` to verify |
| `app/api/accounts/auth/mfa/devices/verify/route.ts` | 4 | Accept + pass `tenant_id` |
