# Tenant Isolation Audit

> **Date:** 2026-03-10
> **Auditor:** Claude (automated)
> **Scope:** All API routes, services, and database policies related to tenant boundary enforcement
> **Method:** Route scan → RLS policy verification → deep-dive on risk areas → cross-referencing auth patterns
> **Prerequisite:** Security & Auth Audit (`security-auth-audit.md`) completed with DD-1 through DD-4 decided

---

## Executive Summary

Lekbanken's tenant isolation is **architecturally sound** but has **critical implementation gaps** where service-role clients bypass the RLS layer that normally protects tenant boundaries.

**RLS foundation is solid:** 90+ tables have RLS enabled. The `get_user_tenant_ids()` and `is_tenant_member()` helper functions are `SECURITY DEFINER` with correctly locked `search_path` and restricted `GRANT` (authenticated only, revoked from public). The dominant policy pattern `tenant_id = ANY(get_user_tenant_ids())` is consistent and correct.

**The risk is in the application layer:** Several routes use `createServiceRoleClient()` (which bypasses RLS entirely) without adequately verifying that the caller belongs to the target tenant.

### Findings Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Critical** | 1 | Games builder: full cross-tenant CRUD via service role |
| **P1 — High** | 3 | Public leaderboard PII exposure, content service trust pattern, tenant GET routes defense-in-depth |
| **P2 — Medium** | 3 | Consent log forgery, enterprise quote abuse, policy role specificity |
| **P3 — Low/Info** | 3 | x-tenant-id header surface, duplicate service export, membership visibility |

---

## Tenant Architecture Overview

### Resolution Chain

```
Frontend: useTenant() → TenantProvider
  → resolveCurrentTenant() server action
    → resolveTenant(pathname, cookies, memberships)
      1. Path: /app/t/[tenantId]
      2. Cookie: signed lb_tenant
      3. Primary membership (is_primary = true)
      4. Single membership (auto-select)
      5. No tenant → /app/no-access
```

All selections validated against user's memberships (loaded via RLS).

### Auth Infrastructure

| Layer | Mechanism | Tenant enforcement |
|-------|-----------|-------------------|
| Database | RLS policies on 90+ tables | `tenant_id = ANY(get_user_tenant_ids())` |
| RLS helpers | `get_user_tenant_ids()`, `is_tenant_member()`, `has_tenant_role()` | `SECURITY DEFINER`, granted to `authenticated` only |
| Route wrapper | `apiHandler({ auth: { tenantRole: [...] } })` | `requireTenantRole()` → validates against `ctx.memberships` |
| Legacy routes | `assertTenantAdminOrSystem(tenantId, user)` | `isSystemAdmin()` || `isTenantAdmin()` via RLS query |
| Service role | `createServiceRoleClient()` | **⚠️ Bypasses all RLS — app must enforce boundaries** |

### Key Tables

| Table | RLS SELECT policy | Role restriction |
|-------|-------------------|-----------------|
| `tenant_settings` | `is_system_admin() OR tenant_id = ANY(get_user_tenant_ids())` | `TO public` (but helpers revoked from public) |
| `tenant_branding` | Same as settings | Same |
| `user_tenant_memberships` | Own memberships + same-tenant members + system admin | `TO authenticated` ✅ |
| `games` | Own tenant + global published (no tenant) | `TO authenticated` for most ops |
| `tenants` | `is_system_admin() OR id = ANY(get_user_tenant_ids())` | — |

---

## Findings

### TI-001: Games builder — full cross-tenant CRUD via service role ⛔ P0 — ✅ FIXED

> **Remediation status:** ✅ Fixed and code-verified (2026-03-11). Tenant membership validation added to POST/GET/PUT handlers. Targeted regression: 4 cases verified by code inspection. See `implementation/tenant-isolation-remediation.md` §1.

**Routes:**
- `app/api/games/builder/route.ts` (POST — create game)
- `app/api/games/builder/[id]/route.ts` (GET — read game, PUT — update game)

**Problem:** All three handlers call `requireAuth()` (user-level only) and then use `createServiceRoleClient()` for all database operations. The `owner_tenant_id` field comes **directly from the request body** with no validation against the user's memberships.

**Impact:** Any authenticated user can:
1. **Create games assigned to any tenant** — POST accepts arbitrary `owner_tenant_id`
2. **Read any game by ID** — GET bypasses RLS via service role
3. **Modify any game** — PUT bypasses RLS, no ownership check

**Evidence (builder/route.ts):**
```typescript
// Line 195-196: Auth = user only, then service role
await requireAuth();
const supabase = createServiceRoleClient();

// Line 211: owner_tenant_id from untrusted input
owner_tenant_id: core.owner_tenant_id ?? null,
```

The RLS policies on `games` (INSERT: `owner_tenant_id = ANY(get_user_tenant_ids()) AND has_tenant_role(...)`) would prevent this — but service role **bypasses RLS entirely**.

**Remediation:**
- Validate `owner_tenant_id` against user's memberships before using service role
- OR switch to `createServerRlsClient()` and rely on RLS policies
- Require editor/admin/owner role for game operations (consistent with RLS policy)

---

### TI-002: Leaderboard exposes PII cross-tenant ⚠️ P1

**Route:** `app/api/gamification/leaderboard/route.ts` — intentionally public (DD-4)

**Problem:** The leaderboard service (`gamification-leaderboard.server.ts`) queries the `users` table for `full_name`, `avatar_url`, and `email`. The `displayName` falls back to a masked email format (`jo***@example.com`). Full `user_id` UUIDs are returned. The service uses `createServiceRoleClient()` to query `gamification_daily_earnings`, bypassing RLS.

**Data exposed per leaderboard entry:**
- `userId` — full UUID (links to auth.users)
- `displayName` — `full_name` or masked email (first 2 chars + domain visible)
- `avatarUrl` — media URL
- `value`, `rank`, `level`

**Impact:** Anyone with a `tenantId` UUID can enumerate users in that tenant: their names, masked emails, avatar URLs, and user IDs. Combined with other public endpoints, this enables user profiling.

**Remediation options:**
1. Replace `userId` with an opaque rank ID (not the auth UUID)
2. Never expose masked email — use only `full_name` or a generic "Anonymous"
3. Consider requiring at least a participant token for leaderboard access
4. Evaluate tenant-level "hide leaderboard" opt-out

**Note:** DD-4 confirmed this as intentionally public. Privacy risk must be accepted or mitigated by product decision.

---

### TI-003: Content service trusts caller-provided tenantId ⚠️ P1

**File:** `lib/services/contentService.ts`

**Problem:** All functions accept `tenantId` as a parameter and filter by `.eq('tenant_id', tenantId)`. None validate that the caller has membership in the target tenant. The service uses the **browser Supabase client** (`@/lib/supabase/client`), so RLS is the only protection.

**Higher-risk functions:** `updateContentItem(id, updates)` and `deleteContentItem(id)` don't even filter by `tenant_id` — they operate on any row by primary key. `addGameToCollection`, `removeGameFromCollection`, `getCollectionItems` similarly lack tenant filtering.

**Mitigating factor:** Browser client means RLS applies (user's JWT determines accessible rows). But if this service is ever called server-side without proper session context, tenant boundaries collapse.

**Remediation:**
- Document that contentService.ts is a **client-only** service (browser context required)
- Add tenant filtering to `updateContentItem`, `deleteContentItem`, `getCollectionItems`
- Long-term: consider moving to server-side service with explicit auth context passing

---

### TI-004: Tenant GET routes rely solely on RLS (defense-in-depth gap) ⚠️ P2 (recalibrated)

> **Recalibration (GPT Review #12):** Downgraded P1→P2. RLS is the primary enforcement layer and is correctly configured. The defense-in-depth gap is real but low-risk given verified RLS policies. Deferred to wrapper migration (Phase 3).

**Routes:**
- `GET /api/tenants/[tenantId]/settings` — no app-level auth
- `GET /api/tenants/[tenantId]/branding` — no app-level auth
- `GET /api/tenants/[tenantId]/members` — no app-level auth

**Problem:** These GET handlers use `createServerRlsClient()` with no auth check. RLS policies correctly restrict access to own-tenant data. However:
- PATCH/POST/DELETE on the same routes DO have `isSystemAdmin || isTenantAdmin` checks
- The asymmetry means GET is protected by a single layer (RLS) while mutations have two layers
- If RLS policy is ever misconfigured, GET exposes tenant data without any app-level fallback

**RLS verification:**
- `tenant_settings` SELECT: `is_system_admin() OR tenant_id = ANY(get_user_tenant_ids())` ✅
- `tenant_branding` SELECT: same ✅
- `user_tenant_memberships` SELECT: `TO authenticated` + own/same-tenant + system admin ✅

**Note:** Policies on `tenant_settings` and `tenant_branding` are `TO public` (not explicitly `TO authenticated`), but `get_user_tenant_ids()` is revoked from the `public` role, so `anon` calls would error. This is **functionally safe** but relies on the helper function grant being correct — a defense-in-depth violation.

**Remediation:**
- Add `getUser()` auth check to GET handlers (simple, low-risk)
- Optionally add explicit `TO authenticated` to the DB policies (migration task)

---

### TI-005: Consent log can be forged 🟡 P2

**Route:** `app/api/consent/log/route.ts`

**Problem:** Public endpoint (by design — consent must work for anonymous visitors). Uses `createServiceRoleClient()`. The `userId` field comes from the client body with no server-side verification. An attacker can:
1. Forge consent events for any `userId`
2. Spam the audit log (no rate limiting)
3. Pollute consent state (GDPR compliance risk)

**Mitigating factor:** This is not a tenant isolation issue directly. However, forged consent logs undermine the GDPR audit trail.

**Remediation:**
- Add `strict` rate limiting
- Validate `userId` against auth session when available (fall back to anonymous for truly unauthenticated)
- Add integrity checks (e.g., HMAC or signed consent token)

---

### TI-006: Enterprise quote — public write with service role, no rate limit 🟡 P2

**Route:** `app/api/enterprise/quote/route.ts`

**Problem:** Public endpoint using `supabaseAdmin` (service role). Writes `company_name`, `contact_name`, `email`, `phone`, `team_size`, `message` to `enterprise_quote_requests`. No rate limiting.

**Not a tenant isolation issue.** This is a standard lead-generation form. But:
- PII (name, email, phone) is written without consent logging
- No rate limit allows DB flooding with fake leads
- Service role for a public endpoint is unnecessarily powerful

**Remediation:**
- Add `strict` rate limiting
- Consider using `createServerRlsClient()` with a permissive INSERT policy instead of service role

---

### TI-007: RLS policies missing explicit role restriction 🟡 P2

**Affected tables:** `tenant_settings`, `tenant_branding`, `games` (INSERT/UPDATE/DELETE)

**Problem:** Some RLS policies use the default `TO public` role rather than explicitly specifying `TO authenticated`. They are functionally safe because the helper functions (`get_user_tenant_ids()`, `has_tenant_role()`) are revoked from the `public` (anon) role — so anon calls to these functions error out.

**Risk:** If the helper functions were ever re-granted to `public` (e.g., during a migration fix), these policies would become wide open to unauthenticated access. This is a defense-in-depth gap.

**Remediation:** Add `TO authenticated` to these policies in a future migration.

---

### TI-008: x-tenant-id header is client-settable 📋 P3

**Location:** `lib/api/auth-guard.ts` — `requireTenantRole()` fallback chain

**Problem:** The `x-tenant-id` header is one fallback source for tenant resolution. A client can send any value.

**Mitigating factor:** `requireTenantRole()` always validates the resolved tenantId against `ctx.memberships.find(m => m.tenant_id === resolvedTenantId)`. Memberships are loaded via RLS (only the user's own). The header cannot elevate privileges.

**Conclusion:** **Safe but unnecessary attack surface.** The header allows a user to select which of their own tenants to operate on (equivalent to the cookie), not to access tenants they don't belong to.

**Remediation:** P3 — consider removing header fallback and relying on cookie/path only.

---

### TI-009: Duplicate rate limiter export 📋 P3

**File:** `lib/utils/rate-limiter.ts`

**Problem:** `applyRateLimitMiddleware()` is identical to `applyRateLimit()`. Both are exported.

**Remediation:** Remove one. Trivial cleanup task.

---

### TI-010: All tenant members can see each other's membership records 📋 P3

**Table:** `user_tenant_memberships` — SELECT policy

**Policy:** Any authenticated user with a membership in a tenant can see ALL other members in that tenant (user_id, role, status, is_primary).

**Assessment:** This is **intentional** for team features (showing team members in the admin panel). However, in large organizations, this means any `viewer` role user can enumerate all org members.

**Remediation:** No change needed for launch. Future: consider restricting to admin/owner for full member listings.

---

## Cross-Tenant Data Flow Summary

### Service Role Routes — Tenant Boundary Verification

| Route | Service Role | Tenant Validated? | Verdict |
|-------|-------------|-------------------|---------|
| `games/builder` POST | ✅ | ❌ No membership check | ⛔ **CRITICAL** |
| `games/builder/[id]` GET/PUT | ✅ | ❌ No ownership check | ⛔ **CRITICAL** |
| `games/csv-import` POST | ✅ | ✅ `assertTenantAdminOrSystem` | ✅ Safe |
| `games/csv-export` GET | ✅ | ✅ `assertTenantAdminOrSystem` | ✅ Safe |
| `checkout/start` POST | ✅ | ✅ Validates membership role | ✅ Safe |
| `checkout/cart` POST | ✅ | ✅ Validates membership | ✅ Safe |
| `billing/portal` POST | ✅ | ✅ Validates membership | ✅ Safe |
| `billing/analytics` GET | ✅ | ✅ `system_admin` gate | ✅ Safe |
| `billing/webhooks/stripe` POST | ✅ | ✅ Stripe signature verification | ✅ Safe |
| `enterprise/quote` POST | ✅ | N/A (public form) | 🟡 Acceptable |
| `consent/log` POST | ✅ | N/A (public consent) | 🟡 Needs hardening |
| `admin/mfa/[tenantId]/*` | ✅ (reset only) | ✅ Membership validated | ✅ Safe |
| `games/[gameId]/snapshots` GET | ✅ | ✅ Auth check (SEC-001 fixed) | ✅ Safe |
| `gamification/leaderboard` GET | ✅ (period queries) | ❌ Public by design (DD-4) | 🟡 **Accepted risk** |

### RLS-Only Routes — Defense-in-Depth Assessment

| Route | RLS Client | App-Level Auth? | Risk |
|-------|-----------|----------------|------|
| `GET /tenants/[tenantId]/settings` | ✅ | ❌ | 🟡 Single-layer defense |
| `GET /tenants/[tenantId]/branding` | ✅ | ❌ | 🟡 Single-layer defense |
| `GET /tenants/[tenantId]/members` | ✅ | ❌ | 🟡 Single-layer defense |
| `PATCH /tenants/[tenantId]/settings` | ✅ | ✅ `isSystemAdmin \|\| isTenantAdmin` | ✅ Two-layer |
| All other tenant PATCH/POST/DELETE | ✅ | ✅ Various auth checks | ✅ Two-layer |

---

## Remediation Priority

| Priority | Finding | Effort | Impact |
|----------|---------|--------|--------|
| ~~Immediate (P0)~~ | TI-001: Games builder tenant bypass | Medium | ✅ **FIXED** — tenant membership validation added |
| **High (P1)** | TI-002: Leaderboard PII exposure | Medium | User enumeration via public endpoint |
| **High (P1)** | TI-003: Content service client-side trust | Low | Document + add tenant filtering to mutations |
| **Medium (P2)** | TI-004: Add auth to tenant GET routes | Low | Defense-in-depth — recalibrated P1→P2, deferred to Phase 3 |
| **Medium (P2)** | TI-005: Consent log hardening | Low | Rate limit + userId validation |
| **Medium (P2)** | TI-006: Enterprise quote rate limiting | Low | Add strict rate limit |
| **Medium (P2)** | TI-007: Add TO authenticated to policies | Low | Defense-in-depth migration |
| **Low (P3)** | TI-008, TI-009, TI-010 | Trivial | Cleanup tasks |

---

## Connection to Security & Auth Audit

| Security Audit Finding | Tenant Isolation Overlap |
|------------------------|-------------------------|
| SEC-001 (snapshots auth) | ✅ Fixed — now has auth before service role |
| SEC-003 (tenant-auth wrapper mode) | DD-1 decided: `deriveEffectiveGlobalRole()` canonical, `tenantAuth.isSystemAdmin()` deprecated |
| SEC-004 (participant token auth) | DD-2 approved in principle. Not a tenant isolation issue |
| SEC-011 (RLS-only routes) | TI-004 confirms 3 specific routes need app-level auth |
| SEC-013 (in-memory rate limiter) | DD-3 revised: explicit rate limiting, no blanket default |
| SEC-014 (public leaderboard) | TI-002 deepens this: PII exposure via user IDs + masked emails |
| DD-4 (leaderboard privacy) | TI-002 confirms privacy-sensitive. Cross-tenant exposure is product decision |

---

## Remediation Status (Post-Audit)

> Updated after remediation work and GPT Reviews #10–#13.

| Finding | Original | Current Status | Notes |
|---------|----------|----------------|-------|
| TI-001 | P0 | ✅ **FIXED** (code-verified) | Tenant membership validation added to POST/GET/PUT. See `implementation/tenant-isolation-remediation.md` §1 |
| TI-002 | P1 | ✅ **FIXED** (2026-03-14) | Alt A: display_name + avatar only. userId (UUID) and maskEmail removed from leaderboard API. |
| TI-003 | P1 | ⬜ Open | Content service client-side trust — service layer review |
| TI-004 | P1 → P2 | ⬜ Deferred | Recalibrated per GPT Review #12. Batch with Phase 3 wrapper migration |
| TI-005 | P2 | ⬜ Open | Consent log rate limiting |
| TI-006 | P2 | ⬜ Open | Enterprise quote rate limiting |
| TI-007 | P2 | ⬜ Open | Add TO authenticated to policies |
| TI-008–010 | P3 | ⬜ Open | Cleanup tasks |
| TI-NEW-1a | P2 | ⬜ Open | Public V1 sessions list — API key deferred |
| TI-NEW-1b | P3 | ⬜ Open | Public V1 games list — API key deferred |
| TI-NEW-1c | **P1** | ✅ **FIXED** (2026-03-14) | Alt A: participant_count only. include_participants param removed from public endpoint. |
| TI-NEW-1d | P2 | ⬜ Open | Public V1 game detail — API key deferred |

---

## Next Steps

1. ~~**Fix TI-001 (P0)**~~ — ✅ Fixed and code-verified
2. ~~**Product decision on TI-NEW-1c**~~ — ✅ Fixed (Alt A: participant_count only)
3. ~~**Product decision on TI-002**~~ — ✅ Fixed (Alt A: display_name + avatar only)
4. **Document TI-003** — Mark contentService.ts as client-only
5. **Add rate limiting** — TI-005 (consent/log) + TI-006 (enterprise/quote)
6. **Phase 3 migration** — Continue wrapper adoption, resolves SEC-003/SEC-005, includes TI-004
