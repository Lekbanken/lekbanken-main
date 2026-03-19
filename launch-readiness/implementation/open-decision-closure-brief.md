# Open Decision Closure Brief

> Created: 2026-03-19  
> Author: Claude (analysis agent)  
> Purpose: Unblock the three remaining Wave 1 strategic open items  
> Created: 2026-03-19  \n> Author: Claude (analysis agent)  \n> Purpose: Unblock the three remaining Wave 1 strategic open items  \n> Status: **DD-MFA-1 ✅ IMPLEMENTED (2026-03-19), DD-RACE-1 ✅ IMPLEMENTED (2026-03-19), DD-LEGACY-1 awaiting decision**

---

## Wave 1 Context

22 bugs closed. 1 item remains, blocked by an unresolved design decision:

| Decision | Blocks | Severity | Status |
|----------|--------|----------|--------|
| ~~DD-MFA-1~~ | ~~MFA-005~~ | ~~**P0**~~ | ✅ RESOLVED + IMPLEMENTED (2026-03-19) |
| ~~DD-RACE-1~~ | ~~BUG-020~~ (+ Wave 2: BUG-016, BUG-017) | ~~**P1**~~ | ✅ RESOLVED + IMPLEMENTED (2026-03-19) |
| DD-LEGACY-1 | BUG-022 | **P1** | Awaiting decision |

---

## 1. DD-MFA-1 — Trusted Device Tenant Scope

### Current schema truth

**Table `mfa_trusted_devices`:**
- `tenant_id uuid NOT NULL` — FK to `tenants(id) ON DELETE CASCADE`
- Composite unique: `(user_id, tenant_id, device_fingerprint)`
- Partial index: `idx_mfa_trusted_devices_user_tenant` on `(user_id, tenant_id) WHERE NOT is_revoked`

**Table `user_mfa`:**
- PK: `user_id` only (global per user — one enrollment record, not per-tenant)
- Has `tenant_id` column but not part of PK
- Enrollment is effectively global; device trust is intended to be tenant-scoped

### Current write path

**`lib/services/mfa/mfaDevices.server.ts` → `trustDevice()`:**
- Resolves `tenant_id` from user's primary tenant membership
- Upserts into `mfa_trusted_devices` on composite key `(user_id, tenant_id, device_fingerprint)`
- Uses `as unknown as SupabaseClient` type cast (bypasses TS safety)
- **Write path is correctly tenant-scoped** ✅

### Current verify/reset path

**`verifyTrustedDevice(userId, trustToken, deviceFingerprint)`:**
- Queries `.eq('user_id', userId).eq('trust_token_hash', tokenHash).eq('device_fingerprint', deviceFingerprint)`
- **No `.eq('tenant_id', ...)` filter** — matches devices across ALL tenants
- Called from `POST /api/accounts/auth/mfa/devices/verify` with 3 args (no tenant context)

**Admin reset** (`POST /api/admin/tenant/[tenantId]/mfa/users/[userId]/reset`):
- Device delete: `.eq('user_id', userId).eq('tenant_id', tenantId)` — **correctly scoped** (fixed in MFA-004)

**RLS policy `mfa_trusted_devices_owner`:**
- Users can read ALL their own devices across tenants (`user_id = auth.uid()`)
- RLS does NOT mitigate the verify bug — query runs as the user

### Attack scenario

1. User is member of Tenant A (MFA optional) and Tenant B (MFA enforced)
2. User trusts device in Tenant A
3. `verifyTrustedDevice()` finds Tenant A's device when verifying for Tenant B
4. MFA bypassed for Tenant B

### Recommended canonical model

**Tenant-scoped trust is canonical.**

Evidence is overwhelming — 4 out of 6 layers already implement tenant scoping:

| Layer | Current | Should be |
|-------|---------|-----------|
| Schema (table design) | Tenant-scoped ✅ | Tenant-scoped |
| Indexes | Tenant-scoped ✅ | Tenant-scoped |
| Write path | Tenant-scoped ✅ | Tenant-scoped |
| Verify path | **Global** ❌ | Tenant-scoped |
| Delete path (admin) | Tenant-scoped ✅ | Tenant-scoped |
| API surface (verify) | **Global** ❌ | Tenant-scoped |

### Safest implementation path

1. Add `tenantId: string` as required 4th parameter to `verifyTrustedDevice()`
2. Add `.eq('tenant_id', tenantId)` to the verify query
3. ~~Update verify route to accept `tenant_id` in request body and pass it through~~ → **HARDENED:** Route uses ONLY HMAC-signed cookie via `readTenantIdFromCookies()`. Client body is never trusted for tenant context.
4. **Key question:** Where does the MFA challenge flow obtain tenant context?
   - The login flow must have active tenant context before MFA challenge
   - The `lb_tenant` cookie is already set during login, so it's available for both route and middleware paths
   - If cookie is not set (e.g. first login), trust check is skipped (falls through to normal MFA)

**Files affected:**
| File | Change |
|------|--------|
| `lib/services/mfa/mfaDevices.server.ts` | Add `tenantId` param + `.eq('tenant_id', tenantId)` to verify query |
| `app/api/accounts/auth/mfa/devices/verify/route.ts` | Read tenant from signed cookie only (no body param) |
| `lib/auth/mfa-aal.ts` | Add `tenantId` to `checkMFAStatus` options + `checkTrustedDevice` filter |
| `proxy.ts` | Read signed tenant cookie before MFA check, pass to `checkMFAStatus` |

**Migration needed:** No (schema already has `tenant_id NOT NULL`).

### Exact consequence if left unresolved

**P0 cross-tenant authentication bypass.** Any multi-tenant user who trusts a device in a low-security tenant bypasses MFA in all high-security tenants. This is an exploitable tenant isolation breach at the authentication layer.

### Recommendation

**Decide: tenant-scoped.** Then implement — 2 files, ~10 lines of code. The only real question is how the MFA challenge flow passes tenant context to the verify endpoint. This needs a 5-minute trace of the login flow, not an architecture decision.

---

## 2. DD-RACE-1 — Atomic Reservation Pattern

### Exact race in seat assignment

**File:** `app/api/billing/tenants/[tenantId]/seats/route.ts` (POST handler)

```
Line 80–85:  SELECT count(*) FROM tenant_seat_assignments WHERE subscription_id = ? AND status NOT IN ('released','revoked')
Line 86–90:  IF count >= seats_purchased → return 400
Line 92–105: INSERT INTO tenant_seat_assignments (...)
```

Classic TOCTOU — two concurrent requests both read `count = N-1`, both pass the check, both insert. Result: N+1 seats assigned with limit N.

### The three RC-3 family members

| Bug | File | Race pattern |
|-----|------|-------------|
| BUG-020 | `billing/tenants/[tenantId]/seats/route.ts` | count seats → check limit → insert seat |
| BUG-016 | `participants/sessions/join/route.ts` | read `participant_count` → check `max_participants` → insert participant |
| BUG-017 | `lib/services/participants/session-service.ts` | read quota → check limit → increment (+ silent failure on constraint violation) |

All three follow the identical pattern: SELECT count → compare to limit → INSERT without atomicity.

### Best fix: Conditional INSERT via SQL function (RPC)

Three patterns considered:

| Pattern | Pros | Cons | Verdict |
|---------|------|------|---------|
| **Conditional INSERT (RPC)** | Single atomic operation; count + insert in one statement; no lock contention | Requires DB migration + RPC call-site change | **Recommended** ✅ |
| **FOR UPDATE row locking** | Standard PostgreSQL pattern | No "row to lock" for seat assignment — we're counting aggregate, not locking a single row; would need a separate lock record | Rejected — over-engineering |
| **Advisory locks** | Application-level control | Fragile if app crashes mid-lock; doesn't compose well; harder to test | Rejected — operational risk |

### Minimal safe database-side design

**One RPC per reservation domain.** Template:

```sql
CREATE OR REPLACE FUNCTION assign_seat_if_available(
  p_tenant_id uuid,
  p_user_id uuid,
  p_subscription_id uuid,
  p_billing_product_id uuid,
  p_name text,
  p_max_seats int
) RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO tenant_seat_assignments (tenant_id, user_id, subscription_id, billing_product_id, name, status)
  SELECT p_tenant_id, p_user_id, p_subscription_id, p_billing_product_id, p_name, 'active'
  WHERE (
    SELECT count(*)
    FROM tenant_seat_assignments
    WHERE subscription_id = p_subscription_id
      AND status NOT IN ('released', 'revoked')
  ) < p_max_seats
  RETURNING id INTO v_id;

  RETURN v_id; -- NULL if count >= max
END;
$$ LANGUAGE plpgsql;
```

**Why this works:** The INSERT...SELECT is a single statement. PostgreSQL executes the subquery and INSERT atomically within the same snapshot. If two concurrent calls race, the second one's INSERT produces 0 rows (the subquery now shows count = max).

**The unique constraint `(tenant_id, user_id, subscription_id)` provides defense-in-depth** — even if the race somehow produces a duplicate, the constraint rejects it.

### Whether similar races should reuse the same pattern

**Yes — one RPC per domain, same structural pattern:**

| Bug | RPC name | Domain |
|-----|----------|--------|
| BUG-020 | `assign_seat_if_available()` | Billing seats |
| BUG-016 | `join_session_if_available()` | Participant sessions |
| BUG-017 | `increment_quota_if_below_limit()` | Token quotas |

Each RPC encapsulates the domain's specific count + limit + insert logic. The pattern is the same (conditional INSERT), but the tables/columns differ. No need for a generic abstraction.

### Files likely affected

| File | Change |
|------|--------|
| `supabase/migrations/YYYYMMDD_seat_rpc.sql` | New migration: `assign_seat_if_available()` RPC |
| `app/api/billing/tenants/[tenantId]/seats/route.ts` | Replace count-then-insert with `supabase.rpc('assign_seat_if_available', {...})` |
| (Wave 2) Similar migrations for BUG-016 and BUG-017 | Same pattern, different tables |

**Migration needed:** Yes — new RPC function.

### Exact consequence if left unresolved

**P1 financial integrity issue.** Seat oversubscription means a tenant can have more active users than their subscription allows. At scale with concurrent admin actions (onboarding multiple members simultaneously), this is realistically triggerable. The unique constraint prevents duplicate user+subscription combos but does NOT prevent total count exceeding the limit.

### Recommendation

**Decide: conditional INSERT via RPC.** Implement for BUG-020 (Wave 1). Then apply same pattern for BUG-016 and BUG-017 in Wave 2. One migration, one call-site change per bug.

---

## 3. DD-LEGACY-1 — Legacy Billing Fallback

### Current state

**`app/api/games/utils.ts` → `getAllowedProductIds()`** resolves game access through TWO independent paths:

**Path 1 — Canonical (entitlement + seat):** ✅ Per-user seat enforcement
```
tenant_product_entitlements (tenant + product + status + validity dates)
  → tenant_entitlement_seat_assignments (per-user seat)
    → products (product_key match)
```

**Path 2 — Legacy (subscription fallback):** ⚠️ No per-user seat
```
tenant_subscriptions (tenant + billing_product + status)
  → billing_products (billing_product_key)
    → products (product_key match)
```

### What was already fixed (BUG-022 partial)

| Fix | Effect |
|-----|--------|
| `paused` subscriptions excluded | Paused tenants no longer get game access via legacy path |
| `if (!userId) return early` | Unauthenticated contexts don't hit legacy path |

### What remains open

The legacy path grants game access to **all admin/owner users** of a tenant with an active subscription — no per-user seat required. This is a weaker access model than the canonical entitlement+seat path.

**RLS on `tenant_subscriptions`** restricts reads to admin/owner role, which means:
- Regular members: can't see subscriptions → legacy path returns nothing → only canonical path applies ✅
- Admins/owners: can see subscriptions → legacy path grants access without seat ⚠️

**The bypass:** An admin/owner in a tenant with a legacy subscription gets access to games without holding a seat. In the canonical model, even admins need a seat assignment.

### Is this a temporary migration bridge or accepted runtime model?

**Evidence it's temporary:**
- Comment in code: `"Keep this until the billing domain is fully migrated away"`
- New cart/checkout flow writes to canonical `tenant_product_entitlements` + seat assignments
- No formal ADR accepting dual-path as permanent design

**Evidence it persists:**
- No data migration path exists to move legacy subscriptions to entitlements
- No inventory of which tenants have subscriptions but no entitlements
- The old `create-subscription` route still writes to `tenant_subscriptions` only

### Recommended decision

**Option B: Constrain + document → accept as known temporary state.**

Three options evaluated:

| Option | Description | Effort | Risk |
|--------|-------------|--------|------|
| A. Retire legacy fallback | Remove the legacy block entirely; migrate all subscription data to entitlements | High — data migration + audit of affected tenants | Breaking if any tenant lacks entitlements |
| **B. Constrain + document** | Accept current partial fix as sufficient for launch; write ADR; plan data migration for post-launch | **Low** | admin/owner-only bypass remains but is documented and bounded |
| C. Add seat check to legacy path | Require seat assignment even for legacy subscriptions | Medium — need to create seats for existing admin/owners | Could break admin access until seats created |

**Why Option B:**
1. The remaining bypass is admin/owner-only — regular members are already properly gated
2. RLS enforces the role boundary at DB level (not just app code)
3. `paused` exclusion already closed the most dangerous path
4. A data migration before launch adds risk; doing it post-launch with proper inventory is safer
5. The bypass is explicitly documented and bounded — it's a known risk, not a hidden one

**Concrete action for Option B:**
1. Add an ADR comment block at the top of the legacy fallback in `utils.ts`
2. Create a `post-launch-todo` item: "Audit tenants with `tenant_subscriptions` but no `tenant_product_entitlements` → create entitlements + seats → remove legacy block"
3. Close BUG-022 as **ACCEPTED RISK (bounded)** with the ADR reference

### Files likely affected

| File | Change |
|------|--------|
| `app/api/games/utils.ts` | Add formal ADR comment block to legacy fallback section |
| `launch-readiness/audits/post-launch-cluster-triage.md` | Update BUG-022 status to ACCEPTED RISK |

**Migration needed:** No (for Option B). Yes (for Option A — data migration).

### Exact consequence if left unresolved

**P1 access model inconsistency.** Tenant admins/owners with legacy subscriptions bypass per-user seat enforcement. This is bounded by:
- Only admin/owner roles (RLS-enforced)
- Only active/trial subscriptions (paused excluded)
- Only authenticated requests (userId guard)

Not an acute exploit, but a structural inconsistency that erodes the entitlement model over time if not documented.

### Recommendation

**Decide: constrain + document (Option B).** Close BUG-022 as accepted bounded risk. Plan data migration as a post-launch track. This avoids adding migration risk before launch while making the decision explicit.

---

## Summary: Recommended Decision Package

| Decision | Recommendation | Implementation effort | Migration |
|----------|---------------|----------------------|-----------|
| **DD-MFA-1** | Tenant-scoped ✅ | Small (2 files, ~10 lines) | No |
| **DD-RACE-1** | Conditional INSERT via RPC | Small-medium (1 migration + 1 call-site) | Yes (new RPC) |
| **DD-LEGACY-1** | Constrain + document (Option B) | Minimal (ADR comment + status update) | No |

### Suggested execution order after approval

1. **DD-MFA-1 → MFA-005** — P0, smallest fix, highest impact. Unblocks the last P0.
2. **DD-RACE-1 → BUG-020** — P1, requires migration but well-defined pattern.
3. **DD-LEGACY-1 → BUG-022** — P1, close as accepted risk with ADR.

After all three: Wave 1 would be **21 closed, 0 open.**
