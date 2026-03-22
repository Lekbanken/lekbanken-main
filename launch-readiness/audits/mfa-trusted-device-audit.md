# MFA & Trusted Device Audit

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-19
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Current targeted auth audit for MFA and trusted-device admin flows. All verified findings are now closed, so treat this as a remediation-complete reference alongside `launch-readiness/launch-control.md`.

> **Status:** VERIFIED — 5 findings (2 P0, 2 P1, 1 P2); all 5 findings closed after 2026-03-22 code verification  
> **Audit date:** 2026-03-18  
> **Auditor:** Claude (Codex discovery → Claude verification)  
> **Domain:** Auth / MFA / Trusted Devices  
> **Scope:** MFA admin listing, MFA admin reset, trusted device trust/verify/revoke  
> **Remediation plan:** `implementation/mfa-trusted-device-remediation.md`  

---

## Background

Codex identified 5 potential bugs (BUG-001 through BUG-005) in the MFA/trusted-device subsystem. This audit performs strict code-level verification against the actual database schema (from `types/supabase.ts` generated types and baseline migration) before classifying each finding.

### Root Cause

All 5 bugs share a common root cause: **`as unknown as SupabaseClient` type casts** used in all affected files bypass TypeScript's type checking on Supabase queries. The generated types in `types/supabase.ts` are correct — the application code simply doesn't use them.

**2026-03-22 note:** All 5 audited findings are now fixed. The admin listing route still contains a narrower `as unknown as MFAUserRow[]` cast, but that remaining type-safety debt is outside this audit's closed functional findings.

---

## Findings

### MFA-001 — `profiles` relation doesn't exist (P1)

- **File:** `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` L77
- **Code:** `.select('user_id, role, profiles!inner(email, display_name)')`
- **Expected:** A PostgREST-resolvable relation named `profiles` on `user_tenant_memberships`
- **Actual:** `user_tenant_memberships` has FKs to `users` (via `user_id`) and `tenants` (via `tenant_id`) only. No FK to `profiles` or `user_profiles`. No table, view, or alias called `profiles` exists in the database. `users` has `email` + `full_name` (no `display_name`). `user_profiles` has `display_name` (no `email`).
- **Impact:** PostgREST returns HTTP 400 — the **entire admin MFA users endpoint is non-functional**.
- **Fix:** Join `users` for `email`/`full_name`, and fetch `user_profiles` separately for `display_name`. Or create a DB view.

### MFA-002 — `is_active` column doesn't exist on `mfa_trusted_devices` (P1)

- **File:** `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` L113
- **Code:** `.eq('is_active', true)`
- **Expected:** A boolean column `is_active` on `mfa_trusted_devices`
- **Actual:** Table has `is_revoked` (boolean). No `is_active` column exists. Correct filter: `.eq('is_revoked', false)`.
- **Impact:** PostgREST returns HTTP 400. Code doesn't check for error on this query. Trusted device counts will always be 0 (null data, forEach skipped).

### MFA-003 — Status filter applied JS-side after DB pagination (P2, fixed 2026-03-22)

- **File:** `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` L91 + L184-196
- **Code:** `.range(offset, offset + pageSize - 1)` (L91) then `users.filter(u => u.mfa_status === statusFilter)` (L186)
- **Expected:** Status filter applied before pagination, so each page has `pageSize` matching results
- **Actual:** DB returns `pageSize` results, then JS filters by MFA status. Pages have inconsistent sizes, wrong total counts, and can miss records.
- **Impact:** Admin sees incomplete/inconsistent pagination when filtering by MFA status. No data loss or security impact — admin UX only.
- **Note:** For `status=all` (default), pagination works correctly.
- **Fix:** Since MFA status is computed from a join (`user_mfa`), the filter cannot be pushed to the initial query. Options: (a) fetch all matching users and paginate in JS, (b) use a DB function/view that includes computed status, (c) two-pass: first fetch all IDs with status, then paginate the filtered set.
- **2026-03-22 fix verification:** Implemented. The route now fetches all search-matching members, computes MFA status for the full set, applies the status filter, and slices the filtered list for pagination.

### MFA-004 — `user_mfa` update uses wrong field names; route returns success on failure (P0)

- **File:** `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` L102-117
- **Wrong fields (3 of 9):**
  - `is_enrolled: false` → **no such column** (table uses `enrolled_at` timestamp for enrollment state)
  - `last_verification_at: null` → should be **`last_verified_at`**
  - `grace_period_started_at: new Date().toISOString()` → should be **`grace_period_end`** (with calculated end date, not start)
- **PostgREST behavior:** Rejects entire update on any unknown column → **NONE of the correct fields get updated either**
- **Silent failure:** L116-117 catches the error, logs it, but continues and returns `{ success: true, factors_removed: N }`.
- **Split-brain state:** Supabase Auth MFA factors ARE deleted (via admin API, L88-97). But `user_mfa` row still shows user as enrolled. Admin thinks reset worked. User's MFA state in the application is stale — may prevent re-enrollment or cause incorrect status display.

### MFA-005 — Cross-tenant MFA bypass via trusted devices (P0)

- **Write path:** `trustDevice()` in `lib/services/mfa/mfaDevices.server.ts` L157 writes `tenant_id`, upserts on composite `(user_id, tenant_id, device_fingerprint)`.
- **Read path:** `verifyTrustedDevice()` in `lib/services/mfa/mfaDevices.server.ts` L191-199 queries `(user_id, trust_token_hash, device_fingerprint)` — **NO `tenant_id` filter**.
- **Delete path:** Admin reset in `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` L125 deletes `.eq('user_id', userId)` — **NO `tenant_id` filter**.
- **API surface:** `app/api/accounts/auth/mfa/devices/verify/route.ts` L37 calls `verifyTrustedDevice(user.id, body.trust_token, body.device_fingerprint)` — 3 args, no tenant context passed.
- **Attack scenario:** User is member of Tenant A (MFA optional) and Tenant B (MFA enforced). User trusts device in Tenant A → `verifyTrustedDevice` succeeds without tenant_id check → user bypasses MFA for Tenant B.
- **Admin reset collateral:** Admin in Tenant B resets user → `.delete().eq('user_id', userId)` deletes trusted devices across ALL tenants, including Tenant A.

---

## Severity Matrix

| Finding | Severity | Justification |
|---------|----------|---------------|
| MFA-001 | P1 | Entire endpoint non-functional — admin cannot view MFA users |
| MFA-002 | P1 | Sub-query non-functional — device counts always 0 |
| MFA-003 | P2 | Admin UX broken for filtered views — no security/data impact |
| MFA-004 | P0 | Silent data corruption — split-brain auth vs app state |
| MFA-005 | P0 | Tenant isolation breach — cross-tenant MFA bypass |

---

## Files Affected

| File | Lines | Findings |
|------|-------|----------|
| `app/api/admin/tenant/[tenantId]/mfa/users/route.ts` | 199 | MFA-001, MFA-002, MFA-003 |
| `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts` | 139 | MFA-004, MFA-005 (delete path) |
| `lib/services/mfa/mfaDevices.server.ts` | ~300 | MFA-005 (verify path) |
| `app/api/accounts/auth/mfa/devices/verify/route.ts` | 57 | MFA-005 (API surface) |

---

## Schema Reference

### `mfa_trusted_devices` (confirmed from generated types)

Key columns: `user_id`, `tenant_id` (required), `device_fingerprint`, `trust_token_hash`, `is_revoked` (boolean), `expires_at`, `trusted_at`, `last_used_at`

FKs: `mfa_trusted_devices_tenant_id_fkey → tenants.id`, `mfa_trusted_devices_user_id_fkey → users.id`

Unique constraint: `(user_id, tenant_id, device_fingerprint)` — confirmed by upsert `onConflict`

**No `is_active` column.** Active = `is_revoked = false AND expires_at > now()`.

### `user_mfa` (confirmed from generated types)

Key columns: `user_id` (isOneToOne), `tenant_id`, `enrolled_at`, `last_verified_at`, `grace_period_end`, `recovery_codes_hashed`, `recovery_codes_count`, `recovery_codes_used`, `recovery_codes_generated_at`

**No `is_enrolled`, `last_verification_at`, or `grace_period_started_at` columns.**

### `user_tenant_memberships` (confirmed from generated types)

FKs: `user_tenant_memberships_user_id_fkey → users.id`, `user_tenant_memberships_tenant_id_fkey → tenants.id`

**No FK to `profiles`, `user_profiles`, or any profile entity.**
