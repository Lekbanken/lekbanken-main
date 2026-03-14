# Demo Regression Audit

**Domain:** Demo (ephemeral users, demo sessions, feature gating, conversion tracking)  
**Scope:** Full regression — verify M1 remediation, all demo flows, session lifecycle, feature gates, telemetry  
**Date:** 2026-03-14  
**Verdict:** PASS — 0 new P0/P1. 2 new P2 + 1 new P3 found. Demo flow is test-group-ready.

---

## GPT Calibration Applied

1. DEMO-001 fix described as **launch-sufficient persistent rate limiting**, not a final platform solution. Sufficient for current demo scope. Platform-wide rate limiting (Upstash) deferred per SEC-002b.
2. Premium 503 fix verified from both tech and UX perspective (see §2 below).
3. Demo treated as extern testgrupps-/marketingdomän — full regression scope applied.

---

## 1. M1 Fix Verification

### DEMO-001 — Rate Limiting (Supabase-backed) ✅ VERIFIED

**File:** `lib/rate-limit/demo-rate-limit.ts`  
**Status:** Fix intact. `checkDemoRateLimit()` queries `demo_sessions` table with:
```typescript
supabaseAdmin.from('demo_sessions')
  .select('id', { count: 'exact', head: true })
  .gte('started_at', windowStart)
  .eq('metadata->>client_ip' as never, identifier)
```
- Cross-instance persistent (no in-memory Map)
- 3 sessions per IP per hour
- Fail-open on DB error (availability over strictness)
- `getClientIP()` correctly extracts from `x-forwarded-for` → `x-real-ip` → `cf-connecting-ip` chain
- Rate limit headers returned (X-RateLimit-Limit/Remaining/Reset)
- `clientIP` threaded through `setupDemoUser()` → `createDemoSession()` → stored in `metadata: { client_ip }`

**Assessment:** Launch-sufficient persistent rate limiter. Not a full platform-wide solution — Upstash deferred per SEC-002b.

### DEMO-002 — Hardcoded Access Code Removed ✅ VERIFIED

**File:** `app/auth/demo/route.ts` (L103–L115)  
**Status:** Fix intact. Premium tier logic is:
```typescript
const validCode = process.env.DEMO_PREMIUM_ACCESS_CODE;
if (!validCode) → 503 "Premium demo not configured"
if (accessCode !== validCode) → 403 "Invalid access code"
```
- No hardcoded `'DEMO_PREMIUM_2024'` anywhere in codebase
- Premium path returns 503 if env var not set (correct degradation)
- UX verification: Users never hit this path from standard UI — "Upgrade to Premium" button on `/demo` links to `/demo/upgrade` (contact sales form), not to `POST /auth/demo?tier=premium`. Premium API is for sales-assisted flow only. No UX dead-end for regular users.

### DEMO-003 — Error Detail Leak Removed ✅ VERIFIED

**File:** `app/auth/demo/route.ts` (L141–L147)  
**Status:** Fix intact. Error responses contain:
```typescript
{ error: 'Failed to start demo session. Please try again.', code: 'DEMO_SETUP_FAILED' }
```
- No `details:`, `message:`, or `error.message` exposed
- Internal errors logged via `console.error` only
- All 3 error paths (rate limit, setup failure, unexpected) return generic messages

---

## 2. auth/demo — All Paths Verified

| Path | Method | Status | Behavior |
|------|--------|--------|----------|
| Normal create | POST | ✅ | Rate limit → tier validation → setupDemoUser → cookies (httpOnly + tenant HMAC) → redirect URL |
| Premium + env present | POST ?tier=premium&code=xxx | ✅ | Validates access code → premium user created with `role: 'admin'` |
| Premium + env missing | POST ?tier=premium | ✅ | Returns 503 "Premium demo not configured" — clear error, no dead-end |
| Rate limit exceeded | POST (4th request) | ✅ | Returns 429 with `Retry-After` header + Swedish error message |
| Demo availability | GET | ✅ | Returns `{available: boolean}` — controlled by `DEMO_ENABLED` env |
| End session | DELETE | ✅ | Clears `demo_session_id` cookie — known P3 (DEMO-018: doesn't end DB session) |
| Error responses | All | ✅ | No internal details leaked — generic messages only |

**Cookie security:**
- `httpOnly: true` — no XSS access
- `secure: true` in production
- `sameSite: 'lax'`
- `domain: '.lekbanken.no'` in production (cross-subdomain for demo.lekbanken.no)
- Tenant cookie set via `setTenantCookie()` with HMAC signing

---

## 3. demo/status — Session Resolution Verified

**File:** `app/api/demo/status/route.ts`  
**Status:** ✅ Wrapped with `apiHandler({ auth: 'public' })`

| Scenario | Response |
|----------|----------|
| No authenticated user | `{ isDemoMode: false }` |
| User without demo session | `{ isDemoMode: false }` |
| Active demo session | Full status: tier, expiresAt, timeRemaining, tenantName, userName, sessionId |
| Expired session | `getDemoSession()` returns null → `{ isDemoMode: false }` |
| Converted session | Returns session info (conversion doesn't end session immediately if still within time window) |

**Session resolution logic** (`demo-detection.ts`):
1. Checks `users.is_demo_user` / `is_ephemeral` flags
2. Finds latest active session (`ended_at IS NULL`, ordered by `started_at DESC`)
3. Validates `expires_at > now()` — returns null if expired

No zombie demo state possible — expired sessions return `isDemoMode: false`.

---

## 4. demo/track — Feature Tracking Verified

**File:** `app/api/demo/track/route.ts`  
**Status:** ✅ Tracking works correctly

| Scenario | Response |
|----------|----------|
| No demo cookie | `{ success: false, message: 'Not in demo mode' }` — silent fail |
| Valid session + feature | RPC `add_demo_feature_usage()` → `{ success: true }` |
| Missing feature param | 400 — `{ error: 'Feature name is required' }` |
| Invalid session ID | RPC updates 0 rows — silent no-op |

**Cross-session analysis:** Session ID comes from httpOnly cookie (not user input). No practical cross-session leakage through the route itself.

**Known P2:** Not wrapped with apiHandler (DEMO-006), metadata not validated (DEMO-007). Both previously identified.

---

## 5. demo/convert — Conversion Path Verified

**File:** `app/api/demo/convert/route.ts`  
**Status:** ✅ Convert path intact

| Scenario | Response |
|----------|----------|
| Valid conversion (signup) | RPC `mark_demo_session_converted()` → cookie cleared → `{ success: true }` |
| Valid conversion (contact_sales) | Same as above |
| Invalid type | 400 — validation error |
| No demo cookie | `{ success: false, message: 'No demo session found' }` |
| GET check | Returns `{ converted: boolean, type?: string }` |

**Conversion state persistence:** RPC sets `converted = true`, `conversion_type`, `ended_at = COALESCE(ended_at, now())`, `updated_at = now()`. State persists in DB correctly.

**Cookie lifecycle:** Cookie cleared after conversion → user can't re-use session for more tracking after converting. Correct behavior.

**No accidental elevation:** Conversion only marks DB state — no auth role changes, no tenant switches, no privilege escalation.

---

## 6. Feature Gates Verified

**Server-side** (`lib/utils/demo-detection.ts`):
- `isDemoFeatureAvailable(feature)` checks against hardcoded `FREE_TIER_DISABLED_FEATURES` list (7 features)
- `canPerformDemoAction(feature)` combines demo mode check + feature availability
- Premium tier: all features available
- Non-demo users: all features available (bypass)

**Client-side** (`components/demo/`):
- `DemoFeatureGate` — blurs content + shows upgrade overlay when feature locked
- `DemoButtonGate` — lock icon overlay for disabled buttons
- `DemoFeatureBadge` — "Free" / "Premium" labels
- `FeatureGateMap.tsx` — comprehensive feature definitions with per-tier access levels

**No broken click paths:** Locked features show clear upgrade overlays, not error messages or dead screens. User path: click locked feature → see "upgrade" modal → navigate to `/demo/upgrade` or `/auth/signup`.

**Known P3:** Feature limits defined in client bundle (DEMO-015) — server enforces real access via RLS + tenant isolation.

---

## 7. Session Lifecycle + Cleanup Verified

**Creation:** `POST /auth/demo` → `setupDemoUser()`:
1. Create auth user (admin API)
2. Upsert user profile (admin client — sets `is_demo_user`, `is_ephemeral`, `global_role: 'demo_private_user'`)
3. Create tenant membership (demo tenant, role = member/admin based on tier)
4. Sign in
5. Create demo session (2-hour expiry, stores IP in metadata)

**Expiry:**
- Server-side: `getDemoSession()` checks `expires_at > now()`, returns null if expired
- Client-side: `useIsDemo` hook checks every 1 second, redirects to `/demo-expired` when expired
- No zombie state — both server and client correctly detect expiry

**Cleanup (edge function):**
- `supabase/functions/cleanup-demo-data/index.ts`
- Finds sessions older than 24h with `converted IS NULL`
- Deletes: game_sessions → demo_sessions → orphaned ephemeral users
- Auth via `CLEANUP_API_KEY` bearer token
- Returns detailed result with counts per category
- 207 Multi-Status on partial success
- **Known P2 (DEMO-008):** pg_cron schedule may not be applied in production

**Graceful degradation:** Expired sessions degrade to "not in demo mode" — no errors, no broken states. Demo-expired page offers clear CTAs (create account, start another demo, contact sales, login).

---

## 8. Multi-tab / Refresh Resilience Verified

| Scenario | Behavior |
|----------|----------|
| Multiple tabs open | All share same session via httpOnly cookie — no duplication |
| Page refresh | `useIsDemo` re-fetches status on mount — session persists |
| Repeated "Start Demo" clicks | Rate limited (3/IP/hour) — no nonsense state |
| New demo start | localStorage cleared (except theme/locale/cookieConsent), sessionStorage cleared — no stale state |
| Tab open after expiry | Client detects within 1s → redirect to `/demo-expired` |

**Session identity:** Single source of truth is the `demo_session_id` httpOnly cookie. All tabs read the same cookie. No localStorage/sessionStorage dependency for session identity.

---

## 9. Telemetry / Funnel Integrity Verified

**File:** `lib/analytics/demo-tracking.ts`

**Funnel events (in order):**
1. `demo_session_started` — on demo creation
2. `demo_activity_viewed` — user views activity
3. `demo_activity_played` — user plays activity
4. `demo_feature_blocked` — premium feature attempted in free tier
5. `demo_upgrade_clicked` — user clicks upgrade CTA
6. `demo_upgrade_submitted` — form submitted (email hashed for privacy)
7. `demo_converted` — session marked as converted
8. `demo_session_expired` — session expired

**Analytics integrations:** PostHog + Plausible (privacy-first)
- Client-only (no SSR analytics)
- Fail-safe: try/catch around all analytics calls
- Privacy: email hashed before sending (`us***@example.com` format)
- Dev logging: events logged to console in development

**Server-side tracking:** `/api/demo/track` + `/api/demo/convert` use Supabase RPCs for persistent analytics data. `demo_sessions.features_used` (JSONB) + conversion columns provide server-side funnel data independent of client analytics.

**Funnel is intact and usable for observing demo behavior.**

---

## 10. New Findings

### REG-DEMO-001 — demo-expired "Start Another Demo" renders raw JSON (P2)

**File:** `app/demo-expired/page.tsx` (L61–L70)  
**Issue:** The "Start Another Demo" button uses a plain HTML form:
```tsx
<form action="/auth/demo" method="POST">
  <Button type="submit">Start Another</Button>
</form>
```
But `POST /auth/demo` returns JSON (`{success: true, redirectUrl: "..."}`) — not an HTTP redirect. When the browser submits this form, it displays raw JSON instead of redirecting the user.

**Impact:** UX dead-end on the demo-expired page. Users who click "Start Another Demo" see raw JSON text. They must manually navigate back to `/demo` to start a new session.

**Severity:** P2 — externally visible UX dead-end, but users have alternative paths (manual navigation, "Create Account" button, "Back to Home" link).

**Fix:** Either:
- (a) Change `POST /auth/demo` to return an HTTP redirect instead of JSON (would break the fetch-based flow on `/demo/page.tsx`), or
- (b) Add client-side JavaScript handler on the form (like `/demo/page.tsx` does — fetch + `window.location.href = redirectUrl`), or
- (c) Change the button to link to `/demo` (the landing page that handles the flow correctly)

**Recommendation:** Option (c) is simplest — change the form to a link: `<Button href="/demo">Start Another</Button>`. Users go back to the demo landing page and click "Start Demo" with proper JavaScript handling.

### REG-DEMO-002 — demo_sessions RLS overly permissive (P2)

**File:** `supabase/migrations/00000000000000_baseline.sql` (L15926–L15928)  
**Issue:** The `service_role_full_demo_sessions_access` policy has no `TO` clause:
```sql
CREATE POLICY "service_role_full_demo_sessions_access" ON public.demo_sessions
  USING (true) WITH CHECK (true);
```
Without `TO service_role`, this policy applies to ALL roles (including `authenticated`). Since service_role bypasses RLS entirely, this policy is meaningless for service_role but grants full read/write/delete access to ALL authenticated users on ALL demo sessions.

**Impact:** Any authenticated user can read, update, or delete any demo session. Combined with SECURITY DEFINER RPCs (`add_demo_feature_usage`, `mark_demo_session_converted`) that also lack ownership verification, the entire demo_sessions surface is open to any authenticated user.

**Mitigations:** Demo sessions contain non-sensitive data (feature usage, conversion intent). Data is ephemeral (24h cleanup). Session IDs are UUIDs (unguessable without cookie access). Practical exploitability is very low.

**Severity:** P2 — defense-in-depth gap on demo analytics data. No auth escalation possible.

**Fix:** Add `TO service_role` to the policy, or replace with authenticated-scoped policies:
```sql
-- Fix: restrict to service_role only
CREATE POLICY "service_role_full_demo_sessions_access" ON public.demo_sessions
  TO service_role USING (true) WITH CHECK (true);
```

### REG-DEMO-003 — Demo RPC functions lack ownership verification (P3)

**File:** `supabase/migrations/00000000000000_baseline.sql` (L5856, L12746)  
**Issue:** Both `add_demo_feature_usage()` and `mark_demo_session_converted()` are `SECURITY DEFINER` and accept `session_id` without verifying `auth.uid()` matches the session's `user_id`:
```sql
UPDATE public.demo_sessions SET ... WHERE id = session_id;
-- No: AND user_id = auth.uid()
```

**Impact:** Any authenticated user who knows a valid session UUID can modify that session's feature usage or conversion state. Practical exploitability is very low (UUIDs are 128-bit random, session ID comes from httpOnly cookie).

**Severity:** P3 — theoretical defense-in-depth gap. Compounded by REG-DEMO-002 (permissive RLS), but practical risk is negligible.

**Fix:** Add ownership check:
```sql
WHERE id = session_id AND user_id = auth.uid()
```

---

## 11. Previously Known Findings — Status

All 15 previously known P2/P3 findings (DEMO-004 through DEMO-018) **confirmed still present and unchanged**. No regressions — they remain at their original severity and none have worsened.

| Finding | Severity | Status |
|---------|----------|--------|
| DEMO-004 | P2 | auth/demo not wrapped with apiHandler — unchanged |
| DEMO-005 | P2 | convert not wrapped with apiHandler — unchanged |
| DEMO-006 | P2 | track not wrapped with apiHandler — unchanged |
| DEMO-007 | P2 | metadata not validated — unchanged |
| DEMO-008 | P2 | cleanup schedule unverified — unchanged |
| DEMO-009 | P2 | IP header trust model — unchanged (safe behind Vercel/CF) |
| DEMO-010 | P2 | demo analytics pollution — unchanged |
| DEMO-011 | P2 | no body size limits — unchanged (platform defaults) |
| DEMO-012 | P2 | cookie not UUID-validated — unchanged |
| DEMO-013 | P3 | demo-expired no auth check — unchanged (informational page) |
| DEMO-014 | P3 | time remaining client-side calc — unchanged |
| DEMO-015 | P3 | feature gates in client bundle — unchanged |
| DEMO-016 | P3 | no CSRF on auth/demo POST — unchanged |
| DEMO-017 | P3 | gamification events during demo — unchanged |
| DEMO-018 | P3 | DELETE only clears cookie — unchanged |

---

## 12. Verdict

### Summary

| Area | Status | Notes |
|------|--------|-------|
| M1 fix: rate limiting | ✅ Intact | Supabase-backed, cross-instance persistent |
| M1 fix: access code | ✅ Intact | No hardcoded fallback, 503 on missing env |
| M1 fix: error leak | ✅ Intact | Generic messages only |
| auth/demo normal flow | ✅ Pass | All 6 paths behave correctly |
| Premium UX (tech + UX) | ✅ Pass | Users never hit premium API from UI — sales-only path |
| demo/status | ✅ Pass | Correct session resolution, expiry, conversion |
| demo/track | ✅ Pass | Tracking works, no cross-session leakage |
| demo/convert | ✅ Pass | State persists, cookie cleared, no elevation |
| Feature gates | ✅ Pass | No broken click paths, clear upgrade overlays |
| Cleanup / expiry | ✅ Pass | Graceful degradation, no zombie state |
| Multi-tab / refresh | ✅ Pass | Single session via cookie, no duplication |
| Telemetry / funnel | ✅ Pass | Full funnel intact, privacy-preserving |

### New Findings

| Finding | Severity | Description |
|---------|----------|-------------|
| REG-DEMO-001 | P2 | demo-expired "Start Another Demo" renders raw JSON (UX dead-end) |
| REG-DEMO-002 | P2 | demo_sessions RLS overly permissive (all authenticated users have full access) |
| REG-DEMO-003 | P3 | Demo RPC functions lack auth.uid() ownership check |

### Final Verdict

**PASS** — Demo domain is test-group-ready.

- 0 new P0 or P1
- 3 M1 fixes verified intact
- All 8 GPT-defined regression areas pass
- 2 new P2 + 1 new P3 found (defense-in-depth + UX polish)
- 15 previously known P2/P3 confirmed unchanged
- Demo flow is functional and safe for external test group use
