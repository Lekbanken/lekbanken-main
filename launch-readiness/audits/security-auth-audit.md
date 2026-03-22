# Security & Auth Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Closed cross-cutting security and auth audit from the launch-readiness cycle. Use `launch-readiness/launch-control.md` for the current program state and pair this with the remediation record or MFA follow-up artifacts for later execution state.

> **2026-03-22 verification note:** This file remains a frozen snapshot of the original findings. Current code still matches the expected follow-up state: SEC-001 and SEC-002a are implemented, SEC-002b remains a documented infrastructure decision, and the MFA follow-up audit is fully closed.

> **Audit #2** in launch-readiness queue  
> **Date:** 2026-03-10  
> **Scope:** Auth flows, auth guard patterns, tenant auth, participant tokens, rate limiting, error consistency, public route inventory  
> **Methodology:** `launch-readiness/audits/launch-readiness-audit-program.md` Section 3 format  
> **Data source:** Automated scan of all 287 API route files + manual deep-dive of 50+ routes

---

## Executive Summary

**287 API routes scanned. 60 classified as "public or unknown" by automated scan — deep-dive reduced actual unprotected to ~8 true concerns.** Most "public" routes use auth mechanisms the scanner couldn't detect (RLS client, `getAuthUser()`, `resolveParticipant()`, `resolveSessionViewer()`).

The critical systemic issues are:

1. **Rate limiting almost non-existent** — only 11/287 routes (3.8%) have rate limiting
2. **Inconsistent error response formats** — 4 different formats across 287 routes
3. **No first-class tenant-auth wrapper mode** — 57 routes use `tenantAuth.ts` outside the wrapper
4. **Participant token auth is ad-hoc** — 11 routes, no centralized middleware

**Overall auth posture: SOLID but UNSTANDARIZED.** Almost every route has *some* auth — but via 6+ different patterns. The wrapper (`apiHandler`) covers only 36 routes (12.5%).

### Findings by Severity

| Severity | Count |
|----------|-------|
| P0 — Launch blocker | 2 |
| P1 — Must fix before launch | 5 |
| P2 — Should fix, not blocker | 6 |
| P3 — Nice to have | 4 |
| **Total** | **17** |

---

## Auth Classification Table

| Auth Class | Routes | % | Description |
|------------|--------|---|-------------|
| `inline:getUser` | 98 | 34.1% | `supabase.auth.getUser()` or `getAuthUser()` inline |
| `public_or_unknown` | 60 | 20.9% | No detected auth (many have hidden auth — see below) |
| `tenantAuth:system_admin` | 46 | 16.0% | `isSystemAdmin()` from `tenantAuth.ts` |
| `wrapper:user` | 24 | 8.4% | `apiHandler({ auth: 'user' })` |
| `participant_token` | 11 | 3.8% | Bearer/body participant token |
| `wrapper:system_admin` | 10 | 3.5% | `apiHandler({ auth: 'system_admin' })` |
| `tenantAuth:tenant_admin` | 9 | 3.1% | `assertTenantAdminOrSystem()` tenant_admin check |
| `auth-guard:user` | 8 | 2.8% | `requireAuth()` direct |
| `auth-guard:session_host` | 5 | 1.7% | `requireSessionHost()` |
| `server_auth_context` | 5 | 1.7% | `getServerAuthContext()` with role checks |
| `auth-guard:system_admin` | 4 | 1.4% | `requireSystemAdmin()` direct |
| `auth-guard:cron_or_admin` | 2 | 0.7% | `requireCronOrAdmin()` |
| `tenantAuth:tenant_or_system` | 2 | 0.7% | `assertTenantAdminOrSystem()` mixed |
| `wrapper:public` | 2 | 0.7% | `apiHandler({ auth: 'public' })` |
| `webhook_or_cron` | 1 | 0.3% | Stripe webhook signature verification |
| **Total** | **287** | **100%** | |

### Verified Public Route Breakdown (60 routes)

After manual deep-dive of all 60 "public_or_unknown" routes:

| Category | Count | Examples |
|----------|-------|---------|
| **Actually authenticated** (scanner missed) | 32 | `checkout/cart` (getAuthUser), `gamification/achievements/*` (getUser), all `play/sessions/*` (resolveSessionViewer/resolveParticipant), `billing/usage/meters` (getAuthUser) |
| **RLS-protected** (no explicit auth, relies on DB) | 8 | `sessions`, `sessions/[id]`, `participants`, `participants/[id]`, `plans/[planId]/play` |
| **Intentionally public** (correct) | 12 | `public/v1/*` (4), `public/categories`, `public/pricing`, `geocode`, `health`, `play/heartbeat`, `play/join` (re-export), `play/rejoin` (re-export) |
| **Deprecated stubs** (return 410) | 3 | `participants/[id]/actions`, `sessions/[id]/actions`, `play/sessions/[id]/artifacts/snapshot` |
| **True concerns** (see findings) | 5 | `games/[gameId]/snapshots` GET, `game-reactions/batch`, `atlas/annotations` GET, `gamification/leaderboard`, `gamification/sinks` |

---

## Findings

### [SEC-001] Snapshots GET endpoint uses service role — no auth

- **Typ:** SEC
- **Severity:** P0 🔴
- **Fil(er):** `app/app/api/games/[gameId]/snapshots/route.ts` (GET handler)
- **Beskrivning:** The GET handler uses `createServiceRoleClient()` which bypasses RLS entirely. No `getUser()` call, no auth check. Any unauthenticated user can fetch all snapshots for any game by guessing/enumerating gameId UUIDs.
- **Bevis:** GET handler creates service role client directly, fetches `game_snapshots` with no user context. POST handler correctly uses RLS client + `getUser()` — inconsistency within same file.
- **Förslag:** Add `getAuthUser()` check, or switch to RLS client. If snapshots must be readable by participants without auth (e.g., during play), restrict to published games only.

---

### [SEC-002] Rate limiting covers only 3.8% of routes

- **Typ:** SEC
- **Severity:** P0 🔴
- **Fil(er):** All 287 route files; `lib/utils/rate-limiter.ts`
- **Beskrivning:** Only 11 of 287 routes have rate limiting. Critical mutation endpoints — checkout, billing, gdpr/delete, admin mutations, media upload, password/email change — are exposed to abuse. The in-memory rate limiter also resets on deployment (Vercel serverless), making it ineffective at scale.
- **Bevis:**
  - With rate limiting: 11 routes
  - Without rate limiting: 276 routes
  - Rate limiter uses in-memory store (`Map`) — resets per cold start, per-instance in serverless
- **Förslag:** 
  1. **Immediate (P0):** Add rate limiting to auth-sensitive routes: `accounts/auth/mfa/recovery-codes`, `accounts/auth/mfa/verify`, `billing/create-subscription`, `checkout/start`, `checkout/cart`, `gdpr/delete`, `gdpr/export`, `media/upload`
  2. **Near-term:** Migrate to external rate limiter (Vercel KV, Upstash Redis) for persistence across instances
  3. **Systematic:** Make rate limiting default-on in `apiHandler` wrapper with sensible defaults per auth level

---

### [SEC-003] No first-class tenant-auth mode in API wrapper

- **Typ:** ARCH
- **Severity:** P1 🟠
- **Fil(er):** `lib/utils/tenantAuth.ts`, `lib/api/route-handler.ts`, 57 route files
- **Beskrivning:** 57 routes use `isSystemAdmin()` / `assertTenantAdminOrSystem()` / `isTenantAdmin()` from `tenantAuth.ts` — completely outside the `apiHandler` wrapper. The wrapper supports `{ tenantRole }` via `auth-guard.ts`, but the 57 existing routes use a different utility with slightly different logic (e.g., `tenantAuth.isSystemAdmin()` checks 3 metadata locations vs auth-guard checking `effectiveGlobalRole`). This dual-path creates confusion and audit difficulty.
- **Bevis:** Scanner found 46 `tenantAuth:system_admin` + 9 `tenantAuth:tenant_admin` + 2 `tenantAuth:tenant_or_system` = 57 routes.
- **Förslag:** 
  1. Audit the behavioral difference between `tenantAuth.isSystemAdmin()` (checks `app_metadata.role`, `app_metadata.global_role`, `user_metadata.global_role`) and `auth-guard requireSystemAdmin()` (checks `effectiveGlobalRole`)
  2. Decide which is canonical
  3. Add a `tenantAuth` migration path to the wrapper (likely `auth: { tenantRole: ['admin', 'owner'] }` which already exists in route-handler)
  4. Migrate the 57 routes in Phase 3

---

### [SEC-004] Participant token auth is ad-hoc — no centralized validation

- **Typ:** AUTH
- **Severity:** P1 🟠
- **Fil(er):** 11 route files using participant tokens
- **Beskrivning:** Participant token routes use 3 different validation patterns:
  1. `x-participant-token` header + `session_code` query param (play/ready, play/me/role/reveal)
  2. `participantToken` in request body (participants/sessions/rejoin, participants/sessions/join)
  3. `participant_token` in request body (participants/progress/update, participants/progress/unlock-achievement)
  Token validation logic is duplicated across routes. No centralized middleware or wrapper mode.
- **Bevis:** Field name inconsistency: `x-participant-token` (header) vs `participantToken` (body) vs `participant_token` (body). Each route re-implements expiry + status checks.
- **Förslag:** 
  1. Create wrapper mode `auth: 'participant'` that extracts token from header (standardize on `x-participant-token`)
  2. Centralize validation: token lookup, expiry check, status check, session state check
  3. Migrate 11 routes to new mode

---

### [SEC-005] 4 different error response formats

- **Typ:** ARCH
- **Severity:** P1 🟠
- **Fil(er):** All 287 route files
- **Beskrivning:** Error responses use 4 different formats, making client-side error handling fragile:
  1. **wrapper** (36 routes): `{ error: string, requestId: string }` via `errorResponse()`
  2. **inline_json** (203 routes): `NextResponse.json({ error: '...' }, { status: N })` — inconsistent field names (`error`, `message`, `detail`)
  3. **standard** (48 routes): `errorResponse()` from `lib/api/errors.ts` but without wrapper — includes `requestId`
  4. **Mixed within routes**: Some routes use `{ error }` for 400s and `{ message }` for 500s
- **Bevis:** Error format summary: 203 `inline_json`, 48 `standard`, 36 `wrapper`.
- **Förslag:** As wrapper adoption grows, this converges naturally. Prioritize high-traffic routes (play, sessions, billing) for wrapper migration.

---

### ~~[SEC-006] `isSystemAdmin()` returns `true` for null user~~ ✅ **FALSE POSITIVE**

- **Typ:** AUTH  
- **Severity:** ~~P1~~ → N/A
- **Fil(er):** `lib/utils/tenantAuth.ts` (`isSystemAdmin` function)
- **Beskrivning:** ~~The `isSystemAdmin(user)` function returns `true` when user is `null` or `undefined`.~~ **VERIFIED: Line 17 reads `if (!user) return false` — the function correctly returns `false` for null/undefined.** This finding was a false positive in the initial audit.
- **Status:** Resolved — no code change needed.

---

### [SEC-007] Participant progress endpoints lack rate limiting

- **Typ:** SEC
- **Severity:** P1 🟠
- **Fil(er):** `app/app/api/participants/progress/update/route.ts`, `app/app/api/participants/progress/unlock-achievement/route.ts`
- **Beskrivning:** These endpoints accept participant tokens and allow progress updates / achievement unlocks. No rate limiting. A leaked or stolen token could be used to spam progress updates or trigger achievement unlock storms.
- **Bevis:** Both routes validate token expiry and participant status but have no request frequency limit. The token itself is the only guard.
- **Förslag:** Add `rateLimit: 'api'` or `rateLimit: 'strict'` to these endpoints.

---

### [SEC-008] game-reactions/batch — no auth, RLS passthrough

- **Typ:** AUTH
- **Severity:** P2 🟡
- **Fil(er):** `app/app/api/game-reactions/batch/route.ts`
- **Beskrivning:** POST endpoint accepts array of `gameIds`, returns reactions via RPC. Uses `createServerRlsClient()` but never calls `getUser()`. Unauthenticated requests pass through to RPC with null user context. If the RLS policy on `get_game_reactions_batch` allows public reads, this is fine. If not, it's a data leak.
- **Förslag:** Verify RPC/RLS policy. If reactions are intended to be public: add comment documenting intent. If not: add `getAuthUser()`.

---

### [SEC-009] atlas/annotations GET exposes internal data in production

- **Typ:** SEC
- **Severity:** P2 🟡
- **Fil(er):** `app/app/api/atlas/annotations/route.ts`
- **Beskrivning:** GET handler reads `.atlas/annotations.json` with no auth or environment check. POST handler is properly gated with `NODE_ENV === 'production'` guard. GET should have the same guard — Atlas is a development/debugging tool.
- **Förslag:** Add `if (process.env.NODE_ENV === 'production') return NextResponse.json({ error: 'Not available' }, { status: 403 })` to GET handler.

---

### [SEC-010] Session code as sole auth for board/session endpoints

- **Typ:** AUTH
- **Severity:** P2 🟡
- **Fil(er):** `app/app/api/play/board/[code]/route.ts`, `app/app/api/play/session/[code]/route.ts`
- **Beskrivning:** These endpoints accept a session code as the only form of authentication. Anyone with the code can view the full board state (artifacts, decisions, outcomes) and participant list. Session codes are typically 4-6 character alphanumeric strings shared on screen during events.
- **Bevis:** No `getUser()`, no token check — only the session code in the URL path.
- **Förslag:** 
  1. Verify session codes have sufficient entropy (6+ characters, alphanumeric = 2.1B combinations is acceptable)
  2. Add rate limiting to prevent brute-force enumeration
  3. Consider if expired/ended sessions should still be accessible via code

---

### [SEC-011] RLS-only routes have no explicit server-side auth

- **Typ:** AUTH
- **Severity:** P2 🟡
- **Fil(er):** `app/app/api/sessions/route.ts`, `app/app/api/sessions/[sessionId]/route.ts`, `app/app/api/participants/route.ts`, `app/app/api/participants/[participantId]/route.ts`, `app/app/api/plans/[planId]/play/route.ts`
- **Beskrivning:** 8 routes use `createServerRlsClient()` without explicitly calling `getUser()`. They rely entirely on Supabase RLS to filter data. While RLS provides defense-in-depth, these routes have no server-side auth check — meaning the request is always "successful" (200) but returns filtered data. An unauthenticated request gets empty results rather than a 401.
- **Förslag:** Add explicit `getUser()` check and return 401 for unauthenticated requests. RLS remains as defense-in-depth.

---

### [SEC-012] Billing usage POST accepts internal API key

- **Typ:** SEC
- **Severity:** P2 🟡
- **Fil(er):** `app/app/api/billing/usage/route.ts`, `app/app/api/billing/usage/aggregate/route.ts`
- **Beskrivning:** POST handlers accept `x-api-key` header compared against `INTERNAL_API_SECRET`. This is an acceptable pattern for service-to-service calls, but:
  1. No rate limiting on the API key path
  2. Key comparison is likely string equality (timing-safe comparison not verified)
  3. If the key leaks, any external caller can post billing usage data
- **Förslag:** Verify timing-safe comparison. Add rate limiting. Consider IP allowlisting for internal service calls.

---

### [SEC-013] In-memory rate limiter ineffective in serverless

- **Typ:** ARCH
- **Severity:** P2 🟡
- **Fil(er):** `lib/utils/rate-limiter.ts`
- **Beskrivning:** Rate limiter uses an in-memory `Map` for token tracking. In Vercel's serverless architecture:
  1. Each function invocation may run in a different instance → separate Maps
  2. Cold starts reset all counters
  3. Under load, many instances run in parallel → rate limit is per-instance, not per-user
  This means the 11 routes that DO have rate limiting may not be effectively rate-limited.
- **Förslag:** Migrate to Vercel KV, Upstash Redis, or Vercel Edge Config for persistent rate state. Alternatively, use Vercel's built-in rate limiting middleware.

---

### [SEC-014] gamification/leaderboard and gamification/sinks are fully public

- **Typ:** AUTH
- **Severity:** P3 🔵
- **Fil(er):** `app/app/api/gamification/leaderboard/route.ts`, `app/app/api/gamification/sinks/route.ts`
- **Beskrivning:** Leaderboard GET accepts `tenantId` query param with no validation. Anyone can enumerate any tenant's leaderboard data. Sinks GET lists available shop items without auth. These may be intentionally public for social features.
- **Förslag:** Confirm design intent. If public: document. If not: add tenant membership check.

---

### [SEC-015] admin/licenses/grant-personal classified as public

- **Typ:** AUTH
- **Severity:** P3 🔵
- **Fil(er):** `app/app/api/admin/licenses/grant-personal/route.ts`
- **Beskrivning:** Scanner classified this as `public_or_unknown`. Route needs manual verification — an admin route granting personal licenses should absolutely require `system_admin` auth.
- **Förslag:** Verify auth mechanism. If missing, add `apiHandler({ auth: 'system_admin' })`.

---

### [SEC-016] Deprecated stub routes still deployed

- **Typ:** ARCH
- **Severity:** P3 🔵
- **Fil(er):** `app/app/api/participants/[participantId]/actions/route.ts`, `app/app/api/sessions/[sessionId]/actions/route.ts`, `app/app/api/play/sessions/[id]/artifacts/snapshot/route.ts`
- **Beskrivning:** 3 routes return 410 Gone. They are placeholder stubs — 2-7 lines each. While harmless, they add to route count and surface area.
- **Förslag:** Remove after confirming no client code references them.

---

### [SEC-017] Webhook endpoint trusts Stripe signature — no additional auth

- **Typ:** SEC
- **Severity:** P3 🔵
- **Fil(er):** `app/app/api/billing/webhooks/stripe/route.ts`
- **Beskrivning:** Stripe webhook uses `stripe.webhooks.constructEvent()` for HMAC-SHA256 signature verification — this is the correct and recommended approach. No additional auth needed. Routing handler is 676 lines covering multiple event types.
- **Förslag:** No action needed. Signature verification is sufficient. Consider adding webhook-specific rate limiting as defense-in-depth.

---

## Design Decisions Required

These are not findings but architectural questions the audit surfaced. They should be answered before Phase 3 migration.

### DD-1: Canonical system admin check

Two implementations exist:
- `tenantAuth.isSystemAdmin(user)` — checks `app_metadata.role`, `app_metadata.global_role`, `user_metadata.global_role` (3 locations)
- `auth-guard requireSystemAdmin()` → `getServerAuthContext()` → `effectiveGlobalRole` (1 canonical field)

**Question:** Which is correct? Should the wrapper's auth-guard adopt all 3 checks from tenantAuth, or should tenantAuth callers migrate to the single `effectiveGlobalRole`?

### DD-2: Participant token as wrapper auth mode

**Question:** Should `apiHandler` support `auth: 'participant'` that extracts `x-participant-token` header, validates the token, and provides participant context to the handler? Or should participant routes remain special-purpose?

### DD-3: Default rate limiting in wrapper

**Question:** Should `apiHandler` have a default rate limit (e.g., `api: 100/min`) that applies unless explicitly opted out? This would fix SEC-002 for all wrapped routes instantly.

### DD-4: Public leaderboard/sinks design intent

**Question:** Are leaderboard and sinks intentionally public? If so, should they require at least a tenant membership check to prevent cross-tenant data access?

---

## Quick Wins

These can be fixed in < 30 minutes each:

| Finding | Fix | Time |
|---------|-----|------|
| SEC-001 | Add `getAuthUser()` to snapshots GET | 10 min |
| SEC-006 | Change `isSystemAdmin(null)` → return `false` | 5 min |
| SEC-009 | Add `NODE_ENV` guard to atlas/annotations GET | 5 min |
| SEC-015 | Verify + fix admin/licenses/grant-personal auth | 10 min |
| SEC-016 | Remove 3 deprecated stub routes | 10 min |

---

## Systemic Issues

These require architectural decisions and multi-file changes:

| Issue | Scope | Dependency |
|-------|-------|------------|
| Rate limiting coverage (SEC-002, SEC-013) | 276 routes | DD-3 + external rate store decision |
| Tenant auth standardization (SEC-003) | 57 routes | DD-1 |
| Participant token centralization (SEC-004) | 11 routes | DD-2 |
| Error format convergence (SEC-005) | 203 routes | Wrapper migration (in progress) |

---

## Test Gaps

| Area | Gap | Priority |
|------|-----|----------|
| Rate limiting | No tests for rate limiter behavior | P1 |
| Tenant auth | No tests verifying `isSystemAdmin(null)` behavior | P0 |
| Participant tokens | No tests for token expiry, replay, stolen token scenarios | P1 |
| Public routes | No tests verifying intentionally-public routes don't accidentally expose private data | P2 |
| Error responses | No API contract tests ensuring consistent error format | P2 |

---

## Recommendations

### Immediate (before next migration batch)

1. **Fix SEC-001** — snapshots GET auth gap
2. **Fix SEC-006** — `isSystemAdmin(null)` → return `false`
3. **Answer DD-1** — canonical system admin check
4. **Answer DD-2** — participant wrapper mode
5. **Answer DD-3** — default rate limiting

### Phase 3 migration (after design decisions)

1. Add `auth: { tenantRole }` migrations for 57 tenantAuth routes
2. Add `auth: 'participant'` migrations for 11 participant token routes
3. Make rate limiting default-on with sensible tiers
4. Converge error format through wrapper adoption

### Post-launch

1. Migrate to external rate limiter (Upstash/Vercel KV)
2. Add API contract tests for error format
3. Remove deprecated stub routes
4. Add monitoring for auth failures and rate limit hits
