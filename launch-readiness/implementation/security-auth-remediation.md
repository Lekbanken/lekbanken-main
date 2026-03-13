# Security & Auth Remediation

> **Date:** 2026-03-10  
> **Source:** `audits/security-auth-audit.md` — 17 findings (2 P0, 5 P1, 6 P2, 4 P3)  
> **Scope:** P0 fixes, first batch critical rate limiting, design decisions DD-1 through DD-4

---

## 1. P0 Remediations (Completed)

### SEC-001: Snapshots GET auth gap — ✅ FIXED

**Route:** `app/api/games/[gameId]/snapshots/route.ts`

**Problem:** GET handler used `createServiceRoleClient()` with no auth check. Anyone could list all snapshot metadata for any gameId.

**Fix applied:** Added `createServerRlsClient()` + `getUser()` check before the service role query. Pattern now matches POST handler in the same file:

```typescript
// Before (P0 risk):
const supabase = createServiceRoleClient();

// After (fixed):
const rlsClient = await createServerRlsClient();
const { data: { user } } = await rlsClient.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const supabase = createServiceRoleClient();
```

**Why service role is still used after auth:** The query fetches snapshot metadata columns that may not be covered by RLS select policies. Auth verifies the caller is a real user; service role executes the actual query. This is consistent with the POST handler pattern.

**Verified:** `tsc --noEmit` = 0 new errors.

---

### SEC-002a: Critical route rate-limiting coverage gap — ✅ FIXED

> Split from original SEC-002 per GPT Review #12. SEC-002b tracks remaining architectural weakness.

The 10 highest-risk routes (financial, GDPR, auth, storage) now have explicit rate limiting.

Added `applyRateLimit()` to 10 high-risk routes:

| Route | Tier | Rationale |
|-------|------|-----------|
| `checkout/start` | `strict` (5/min) | Financial — creates Stripe checkout sessions |
| `checkout/cart` | `strict` (5/min) | Financial — creates Stripe cart sessions |
| `gift/purchase` | `strict` (5/min) | Financial — initiates gift purchase |
| `billing/create-subscription` | `auth` (10/15min) | Creates recurring subscriptions |
| `gdpr/delete` | `auth` (10/15min) | Destructive — account deletion |
| `gdpr/export` | `auth` (10/15min) | Data export — prevents abuse |
| `media/upload` | `api` (100/min) | Storage abuse vector |
| `accounts/auth/mfa/recovery-codes` | `strict` (5/min) | Auth fallback — generation sensitive |
| `participants/progress/update` | `api` (100/min) | Game events — high frequency but needs cap |
| `participants/progress/unlock-achievement` | `api` (100/min) | Game events — prevent spam |

**Routes that already had rate limiting (not changed):**
- `accounts/auth/mfa/verify` — custom rate limit via `getRecentFailedAttempts`
- `accounts/auth/mfa/recovery-codes/verify` — custom rate limit via `getRecentFailedAttempts`
- `participants/sessions/join` — `applyRateLimitMiddleware(request, 'strict')`
- `participants/sessions/create` — `applyRateLimitMiddleware(request, 'api')`
- `accounts/auth/email/change` — wrapper `rateLimit: 'auth'`
- `accounts/auth/password/change` — wrapper `rateLimit: 'auth'`
- `play/heartbeat` — wrapper `rateLimit: 'api'`

**Parameter type changes:** `checkout/start`, `checkout/cart`, `gift/purchase` handler signatures changed from `Request` to `NextRequest`. `recovery-codes` handler changed from `POST()` to `POST(request: NextRequest)`.

**Runtime verification (GPT Review #9):** All three checkout/gift routes declare `export const runtime = 'nodejs'`. In Next.js 16 App Router, `NextRequest` is provided by the framework to all route handlers regardless of runtime — it is **not** edge-only. The `NextRequest` class extends the standard `Request` API, adding `.nextUrl`, `.cookies`, `.geo` etc. Using `NextRequest` in node runtime is the standard Next.js pattern and is safe. No cast workaround needed.

**Verified:** `tsc --noEmit` = 0 new errors.

---

### SEC-002b: Serverless rate limiter architecture weakness — ⬜ OPEN (P1)

> Split from original SEC-002 per GPT Review #12.

**What remains:**
- 265 routes still lack rate limiting (coverage: 7.7% = 21/275 non-wrapped + wrapped routes)
- In-memory `Map` limiter resets on cold starts — provides burst protection but not global throttling
- No per-route key scoping — all `strict` tier routes share the same IP counter
- Concurrent serverless instances each maintain independent counters (effective limit = N × tier limit)

**Why this is P1, not P0:** The 10 most critical routes (financial, GDPR, auth) ARE covered. The remaining risk is:
- Long-tail routes without rate limiting (most are behind auth, moderate risk)
- Limiter effectiveness in high-concurrency serverless (architectural, not an acute exploit)

**Resolution path:** DD-3 decided "explicit on sensitive routes, no blanket default." Full resolution requires either:
- External rate limiting (Vercel Edge Config, Upstash Redis) for global state
- Or expanding `applyRateLimit()` coverage to remaining sensitive routes in Phase 3

See Section 3 for detailed rate limiter architecture analysis.

---

## 2. Finding Status Updates

### SEC-006: `isSystemAdmin(null)` returns `true` — ❌ FALSE POSITIVE

**Actual code (line 17 of `lib/utils/tenantAuth.ts`):**
```typescript
if (!user) return false
```

The audit report incorrectly stated this returns `true` for null. It returns `false`. **Resolved — no code change needed.**

---

## 3. Verified Technical Analysis (GPT Review #9)

### Rate Limiter Architecture — `lib/utils/rate-limiter.ts`

**Implementation type:** In-memory `Map<string, RateLimitRecord>` (module-level singleton).

**Client ID derivation:**
```
x-forwarded-for (first IP) → x-real-ip → fallback '127.0.0.1'
```
This is correct for Vercel — `x-forwarded-for` is reliably set by Vercel's edge network. The first IP in the chain is the client's real IP.

**Scopes (tiers):**

| Tier | Limit | Window | Key pattern |
|------|-------|--------|-------------|
| `api` | 100 req | 1 min | `{clientIP}` |
| `auth` | 10 req | 15 min | `{clientIP}` |
| `strict` | 5 req | 1 min | `{clientIP}` |

The key is purely IP-based across all tiers. There is no per-route or per-tier scoping — a client hitting `checkout/start` and `checkout/cart` burns from the **same** `strict` counter since the key is just the IP. This means:
- A client can make 5 total `strict` requests/min across ALL strict-tier routes (more restrictive than intended)
- But this is actually a security benefit — it prevents splitting attacks across endpoints

**Serverless effectiveness analysis:**

| Scenario | Effective? | Why |
|----------|-----------|-----|
| Single burst from one client | ✅ Yes | Likely hits same instance within 1-min window |
| Sustained low-rate abuse | ⚠️ Partial | Cold starts create new Map instances, resetting counters |
| Distributed attack (multiple IPs) | ❌ No | IP-based; nothing to correlate |
| Brute force (rapid retries) | ✅ Yes | Burst pattern typically stays on same warm instance |
| Concurrent instances (high traffic) | ⚠️ Partial | Each instance has its own Map; effective limit = N × tier limit |

**Conclusion:** The in-memory limiter provides **burst protection** (its primary value) but not **global throttling**. For a pre-launch SaaS, this is acceptable. The critical financial routes (`checkout`, `gift`, `billing`) get burst protection — the most important scenario (scripted abuse hitting one endpoint rapidly).

**Auto-cleanup:** `setInterval` runs every 5 min to prune expired records. In serverless, this timer fires only while the instance is warm — it will not leak memory.

**Duplicate export:** `applyRateLimitMiddleware()` is identical to `applyRateLimit()`. One should be removed (cleanup task, P3).

---

## 4. Design Decisions

### DD-1: Canonical system admin check — ✅ DECIDED

**Decision: `deriveEffectiveGlobalRole()` via `getServerAuthContext()` is the Single Source of Truth.**

**Analysis:**

Two implementations exist:

| Check | Source | Fields checked |
|-------|--------|---------------|
| `tenantAuth.isSystemAdmin(user)` | `lib/utils/tenantAuth.ts` | `app_metadata.role`, `app_metadata.global_role`, `user_metadata.global_role` |
| `auth-guard requireSystemAdmin()` | → `getServerAuthContext()` → `deriveEffectiveGlobalRole()` | All above PLUS `profile.global_role` (users table), `profile.role` (legacy) |

The auth-guard path checks **5 locations** (verified in `lib/auth/role.ts`):

```
profile.global_role                              ← users table (DB source of truth)
  → user.app_metadata.role (mapped: admin → system_admin)  ← Supabase JWT
    → user.app_metadata.global_role              ← Supabase JWT
      → user.user_metadata.global_role           ← Supabase JWT
        → profile.role (mapped: admin → system_admin)     ← legacy column
          → null
```

`tenantAuth.isSystemAdmin()` only checks the middle 3 (JWT-based). It misses:
- `profile.global_role` — the DB column (most authoritative)
- `profile.role` — legacy fallback

**Risk of inconsistency:** A user with `profile.global_role = 'system_admin'` but no matching `app_metadata` passes auth-guard but FAILS tenantAuth check. This can happen during manual user provisioning via Supabase dashboard.

**Final decision:**
1. `deriveEffectiveGlobalRole()` in `lib/auth/role.ts` is canonical
2. `tenantAuth.isSystemAdmin()` is **deprecated** — all callers migrate to wrapper `auth: 'system_admin'`
3. 57 tenantAuth routes migrate in Phase 3: 46 → `auth: 'system_admin'`, 9 → `auth: { tenantRole: ['admin', 'owner'] }`, 2 mixed
4. `tenantAuth.ts` functions remain during transition, marked `@deprecated`

---

### DD-2: Participant token as wrapper auth mode — ✅ APPROVED IN PRINCIPLE

**Decision: Participant auth becomes a first-class standardized auth mode, with `x-participant-token` as canonical transport. Exact wrapper contract and migration design to be defined in Phase 3.**

**Current state (verified):** 14 routes use participant tokens. No centralized validation — each route re-implements the DB lookup.

| Pattern | Routes | Token source | Naming |
|---------|--------|-------------|--------|
| Header: `x-participant-token` | 8 routes (play/*, coach-diagrams/*, spatial-artifacts/*) | Header | Consistent |
| Body: `participantToken` (camelCase) | 1 route (participants/sessions/rejoin) | Request body | Legacy |
| Body: `participant_token` (snake_case) | 4 routes (progress/update, unlock-achievement, tokens/revoke, tokens/extend) | Request body | Inconsistent with above |
| Generator (not consumer) | 1 route (participants/sessions/join) | — creates token | N/A |

**Naming inconsistency:** Three different field names for the same concept (`x-participant-token`, `participantToken`, `participant_token`).

**Common validation pattern across ALL routes:**
```typescript
const token = /* extract from header or body */
if (!token) return 401
const { data } = await supabase
  .from('play_session_participants')
  .select('*')
  .eq('participant_token', token)
  .single()
if (!data) return 401
```

**What is decided:**
1. Participant auth will become a first-class `auth: 'participant'` mode in `apiHandler`
2. Canonical transport: `x-participant-token` header (8 routes already use it)
3. Body-based variants (`participantToken`, `participant_token`) are legacy

**What must be defined in Phase 3 before implementation:**
- Exact `ParticipantAuthContext` type shape (participant + session? activity? status?)
- Whether participant auth always requires session context
- Body-based token transition plan: deprecate or support long-term?
- How replay/abuse is limited (rate limiting tier for participant routes)
- How `RouteContext` accommodates both `AuthContext` and `ParticipantAuthContext`
- Expiry and status validation rules (centralized in `resolveParticipantAuth()`)

---

### DD-3: Rate limiting strategy — ✅ DECIDED (revised per GPT Review #9)

**Decision: No global default rate limit for all wrapped routes yet. Rate limiting must be explicit on sensitive routes. Revisit broader defaults after Tenant Isolation Audit.**

**Rationale for revision:** A blanket `rateLimit: 'api'` default mixes standardization with policy. Different route categories have fundamentally different needs — public GETs, admin routes, participant routes, and cron/webhooks should not share a single default.

**Current state (verified):**
- 21/287 routes have rate limiting (7.3%) after remediation batch
- Rate limiter is in-memory (`Map`) — per-instance in serverless
- Provides burst protection, not global throttling (see Section 3 analysis)
- Limiter key is IP-only, no per-route scoping — all `strict` routes share one counter per IP

**Policy: explicit rate limiting is required on these route categories:**

| Category | Required tier | Examples |
|----------|--------------|----------|
| Auth-sensitive | `auth` or `strict` | login, MFA, password change, recovery codes |
| Financial mutations | `strict` | checkout, billing, gift purchase |
| Participant-token routes | `api` or `strict` | progress/update, unlock-achievement |
| Public endpoints exposed to brute force | `api` | leaderboard (if rate-limited later) |
| Destructive/export operations | `auth` | GDPR delete, GDPR export |
| Upload/storage | `api` | media/upload |

**Not rate-limited:**
- `cron_or_admin` routes (cron jobs should not be throttled)
- Internal admin read-only routes (low abuse risk behind auth)

**Wrapper interface stays as-is:**
```typescript
interface RouteHandlerConfig {
  rateLimit?: RateLimitTier  // explicit, no default
}
```

**Long-term strategy:**

| Phase | Target | Approach |
|-------|--------|----------|
| Now | Immediate risk reduction | In-memory limiter on critical routes ✅ |
| Phase 3 | Wrap remaining sensitive routes | Explicit tier per route during migration |
| Post-Tenant Audit | Revisit defaults | Consider default for wrapped mutation routes only |
| Post-launch | Production-grade | Migrate to Upstash Redis or Vercel KV for cross-instance limiting |

---

### DD-4: Public leaderboard/sinks design intent — ✅ DECIDED (refined per GPT Review #9)

**Decision: Leaderboard and sinks are intentionally public for now. Leaderboard validates tenantId format (UUID). Privacy implications remain in scope for Tenant Isolation Audit.**

**Verified state:**
- `gamification/leaderboard` GET — now has UUID validation + intentionally-public comment ✅
- `gamification/sinks` GET — now has intentionally-public comment ✅

**Analysis:**
- Leaderboard data is designed for public-facing display (social proof on landing pages)
- Sinks/shop items are catalog data — no security impact from knowing available items
- Both are GET-only (read), no mutations
- Leaderboard returns display names and scores only, no PII

**Privacy sensitivity (flagged for Tenant Isolation Audit):**

UUID validation prevents junk input but does **not** prevent legitimate enumeration. Any anonymous user who knows a `tenantId` can query that tenant's leaderboard data. This is **public by design** but **privacy-sensitive**:
- Display names may be considered personal data under GDPR
- Cross-tenant exposure means one tenant's users can see another tenant's leaderboard
- Tenant Isolation Audit must explicitly verify whether this cross-tenant public exposure is acceptable

**Implemented:**
1. ✅ `// Intentionally public` comments added to both routes
2. ✅ UUID regex validation on leaderboard `tenantId`
3. No auth change needed for now

**Deferred to Tenant Isolation Audit:**
- Verify cross-tenant leaderboard exposure is product-acceptable
- Evaluate tenant-level "hide leaderboard" opt-out flag
- Assess whether display names constitute PII requiring consent

---

## 5. Summary of Changes Made

| File | Change | Type |
|------|--------|------|
| `app/api/games/[gameId]/snapshots/route.ts` | Added auth check to GET handler | P0 fix |
| `app/api/checkout/start/route.ts` | Added `strict` rate limiting | P0 fix |
| `app/api/checkout/cart/route.ts` | Added `strict` rate limiting | P0 fix |
| `app/api/gift/purchase/route.ts` | Added `strict` rate limiting | P0 fix |
| `app/api/billing/create-subscription/route.ts` | Added `auth` rate limiting | P0 fix |
| `app/api/gdpr/delete/route.ts` | Added `auth` rate limiting | P0 fix |
| `app/api/gdpr/export/route.ts` | Added `auth` rate limiting | P0 fix |
| `app/api/media/upload/route.ts` | Added `api` rate limiting | P0 fix |
| `app/api/accounts/auth/mfa/recovery-codes/route.ts` | Added `strict` rate limiting | P0 fix |
| `app/api/participants/progress/update/route.ts` | Added `api` rate limiting | P0 fix |
| `app/api/participants/progress/unlock-achievement/route.ts` | Added `api` rate limiting | P0 fix |
| `app/api/gamification/leaderboard/route.ts` | Added UUID validation + intentionally-public comment | DD-4 |
| `app/api/gamification/sinks/route.ts` | Added intentionally-public comment | DD-4 |
| `lib/api/route-handler.ts` | Removed unused `requireSessionHost` import | ESLint fix |
| `scripts/audit-route-scan.js` | Deleted (temporary audit tool) | Cleanup |

**TypeScript verification:** `tsc --noEmit` = 0 new errors (only pre-existing test file errors remain).

---

## 6. Updated Findings Status

| ID | Finding | Severity | Status |
|----|---------|----------|--------|
| SEC-001 | Snapshots GET service role without auth | P0 | ✅ **FIXED** |
| SEC-002a | Critical route rate-limiting coverage gap | P0 | ✅ **FIXED** (10 critical routes covered) |
| SEC-002b | Serverless in-memory limiter architecture weakness + long-tail coverage | P1 | ⬜ **Open** (265 routes remain, limiter resets on cold start) |
| SEC-003 | No first-class tenant-auth wrapper mode | P1 | 🟡 DD-1 proposed → Phase 3 |
| SEC-004 | Participant token auth is ad-hoc | P1 | 🟡 DD-2 proposed → Phase 3 |
| SEC-005 | 4 different error response formats | P1 | ⬜ Converges with wrapper adoption |
| SEC-006 | `isSystemAdmin(null)` returns `true` | P1 | ✅ **FALSE POSITIVE** — returns `false` |
| SEC-007 | Participant progress lacks rate limiting | P1 | ✅ **FIXED** |
| SEC-008 | game-reactions/batch no auth | P2 | ⬜ Verify RPC/RLS policy |
| SEC-009 | atlas/annotations GET in production | P2 | ⬜ Add NODE_ENV guard |
| SEC-010 | Session code as sole auth | P2 | ⬜ Verify entropy + add rate limiting |
| SEC-011 | RLS-only routes no server auth | P2 | ⬜ Phase 3+ |
| SEC-012 | Billing API key path | P2 | ⬜ Verify timing-safe comparison |
| SEC-013 | In-memory rate limiter in serverless | P2 | ⬜ Post-launch (Upstash/KV) |
| SEC-014 | Public leaderboard/sinks | P3 | ✅ DD-4: confirmed public, added UUID validation + comments |
| SEC-015 | admin/licenses/grant-personal unverified | P3 | ⬜ Verify during Tenant Audit |
| SEC-016 | Deprecated stub routes | P3 | ⬜ Post-launch cleanup |
| SEC-017 | Webhook auth (informational) | P3 | ✅ No action needed |

**Updated totals after remediation (post SEC-002 split — GPT Review #12):**

| Severity | Original | Fixed | False Positive | Remaining |
|----------|----------|-------|----------------|-----------|
| P0 | 2 | 2 (SEC-001 + SEC-002a) | 0 | **0** |
| P1 | 5 + 1 (SEC-002b from split) | 1 (SEC-007) | 1 (SEC-006) | 4 (SEC-002b + 3 systemic — Phase 3) |
| P2 | 6 | 0 | 0 | 6 (various) |
| P3 | 4 | 2 (SEC-014 DD-4, SEC-017) | 0 | 2 (SEC-015, SEC-016) |

> **Note:** SEC-002 was split into SEC-002a (P0, critical route coverage — ✅ FIXED) and SEC-002b (P1, serverless limiter architecture + long-tail coverage — ⬜ Open) per GPT Review #12.

---

## 7. Next Steps

1. **Tenant Isolation Audit** — ✅ **COMPLETED** (see `audits/tenant-isolation-audit.md` + `implementation/tenant-isolation-remediation.md`). TI-001 P0 fixed and code-verified. TI-004 recalibrated P1→P2. 4 additional public V1 API findings (TI-NEW-1a-d) documented.
2. **Phase 3 migration** — 57 tenantAuth routes → wrapper `auth: 'system_admin'` / `{ tenantRole }` (DD-1). Explicit `rateLimit` tier per sensitive route (DD-3). Includes SEC-002b long-tail coverage.
3. **DD-2 detailed design** — define exact `ParticipantAuthContext` shape, wrapper contract, and migration plan for 13 participant-token routes before implementing
4. **Revisit rate limiting defaults** — evaluate whether wrapped mutation routes should get a default tier (DD-3 evolution)
5. **External rate store** — evaluate Upstash Redis post-launch for cross-instance limiting (SEC-002b resolution path)
6. **Deprecate `tenantAuth.isSystemAdmin()`** — add `@deprecated` JSDoc during Phase 3 migration (DD-1)
