# Profile pages - intermittent infinite loading (Investigation log)

Status: **IMPLEMENTED - awaiting verification**  
Started: **2026-01-30**  
Owner: Codex (with Johan)

## Problem statement (observed)
Several pages under `"/app/profile/*"` intermittently get stuck in a **permanent loading/skeleton** state (no content, no actionable error UI). It may "fix itself" temporarily after refreshes, but later returns and then multiple profile sections stop loading at once.

Affected (from screenshots):
- `/app/profile/notifications`
- `/app/profile/preferences`
- `/app/profile/organizations`
- `/app/profile/activity`
- `/app/profile` (overview: "Prestationer" section spinner)

Related symptoms previously seen elsewhere (may be unrelated but worth tracking):
- `next-intl` runtime errors (`MISSING_MESSAGE`) and `useTranslations` missing provider context when a server render fails and React attempts a client fallback.

## Goals
1. Find the **root cause** of the stuck-loading behavior (not just "hide spinner").
2. Make the profile pages **stable** even under:
   - multiple memberships (organization + private license)
   - intermittent auth/session issues
   - slow/failed network/RLS errors
3. Add guardrails so failures surface as **actionable error UI/logs**, not infinite spinners.

## Hypotheses (to validate)
H1. **Client-side infinite fetch loop** due to unstable hook dependencies (e.g. recreating Supabase client per render, non-memoized callbacks, state updates triggering effects).

H2. **Unhandled error path leaves `loading=true` forever** (missing `finally`, early return inside `catch`, etc.).

H3. **A request hangs indefinitely** (Supabase fetch, server action, or browser network) and no timeout/abort exists → UI keeps waiting forever.

H4. **i18n error crashes part of the tree** and leaves surrounding UI in a loading/fallback state.

H5. **Multi-tenant membership edge-case** (org + private license) causes ambiguous queries (multi-row) or expensive lookups, and the UI doesn’t handle it.

H6. **Auth/session drift** (stale cookies/tokens or refresh issues) causes some calls to hang/retry, and profile routes are sensitive because they aggregate many calls.

H7. **Request storms / duplicated calls** (StrictMode, Fast Refresh, multiple server components calling auth context, overlapping server actions) increase the chance of hitting rate limits/timeouts and surfacing “hung” UI.

---

## Investigation notes (chronological)

### 2026-01-30 - Initial code entry points
- Profile routes exist under `app/app/profile/*` (App Router).
- Notable translation usage:
  - `components/app/SideNav.tsx` calls `useTranslations()` (no namespace).
  - `components/profile/ProfileNavigation.tsx` calls `useTranslations('app.profile')`.

### 2026-01-30 - Profile subpages are client-driven spinners (not route `loading.tsx`)
- There are **no** `loading.tsx` files under `app/app/profile/**`.
- The "blank/skeleton" states shown in screenshots match each page's own `isLoading` state.

### 2026-01-30 - Common loading pattern across profile subpages
Files:
- `app/app/profile/notifications/page.tsx`
- `app/app/profile/preferences/page.tsx`
- `app/app/profile/organizations/page.tsx`
- `app/app/profile/activity/page.tsx`

Pattern:
- Each page initializes `const [isLoading, setIsLoading] = useState(true)`.
- Each page has a `useEffect` that early-returns in several cases:
  - `if (authLoading) return;`
  - `if (!supabase) return;`

Risk:
- If hydration/effects don’t run, or Supabase client never becomes available, the UI can remain stuck in skeleton mode indefinitely.

### 2026-01-30 - Profile overview "Prestationer" spinner source
File: `features/profile/components/ProfileAchievementsShowcase.tsx`
- Spinner is driven by `isLoading` which only flips false in a `finally`.
- If `getUserAchievementProgress(userId)` never resolves (hung request), spinner can be permanent.

### 2026-01-30 - First mitigation + debugging aid
Guardrails added to prevent "infinite loading" and capture better evidence:
- Added `lib/utils/withTimeout.ts` (`withTimeout`, `TimeoutError`) to detect hung promises.
- Added "loading timeout" hints + retry buttons to profile subpages:
  - `app/app/profile/notifications/page.tsx`
  - `app/app/profile/preferences/page.tsx`
  - `app/app/profile/organizations/page.tsx`
  - `app/app/profile/activity/page.tsx`
- Added timeout + retry UI for achievements showcase:
  - `features/profile/components/ProfileAchievementsShowcase.tsx`
- Reduced DB load for preferences + organizations by avoiding full `getCompleteProfile`:
  - `lib/profile/profile-service.client.ts`: `getPreferences(userId)`, `getOrganizationMemberships(userId)`
- Added RPC timeouts in `hooks/useAppNotifications.ts` to avoid a stuck notification dropdown spinner.

### 2026-01-30 - User reproduction (concrete failure)
User console (local dev) shows:
- `[Profile/Notifications] loading timeout { authLoading:false, hasUser:true, hasSupabase:true, supabaseError:undefined, isInitializing:false }`
- `TimeoutError: Timed out after 10000ms: ProfileService.getNotificationSettings`

Interpretation:
- Auth is ready, browser Supabase client exists.
- The promise awaiting notification preferences **does not resolve within 10s** (network hang / server hang / RLS hang).
- This points to the underlying Supabase request being stuck (not just React state).

### 2026-01-31 - Added request abort + logging for Supabase fetch
To prevent "hung forever" requests and to identify which endpoint is slow:
- Added `lib/supabase/fetch-with-timeout.ts`
  - Wraps `fetch` with:
    - per-endpoint timeouts (`/rest/v1` etc)
    - abort via `AbortController`
    - dev-only start/done/timeout logs (URL + timing)
- Wired into Supabase clients:
  - `lib/supabase/client.ts` (browser): Supabase client `global.fetch` option uses `createFetchWithTimeout(fetch, ...)`
  - `lib/supabase/server.ts` (server): Supabase client `global.fetch` option uses `createFetchWithTimeout(fetch, ...)`

Expected behavior:
- If a Supabase request hangs (DB lock, network stall, etc.), it should abort and surface a clear error instead of spinning forever.
- Console in dev should show which URL is timing out.

### 2026-01-31 - Notification settings service robustness (multi-tenant safe)
In `lib/profile/profile-service.client.ts`:
- `getNotificationSettings` returns `{ settings, error }` so UI can show a non-blocking warning (and still render defaults).
- Queries use `tenant_id IS NULL` with ordering + `limit(1)` to avoid multi-row ambiguity for users with multiple tenants.
- `updateNotificationSettings` resolves or creates a "global" row (`tenant_id IS NULL`) instead of relying on a fragile `onConflict` target.

### 2026-01-31 - New evidence: request storms (no timeout, but lots of duplicates)
User captured logs with `[supabase fetch:*]` instrumentation:
- Many repeated **server** requests per navigation:
  - `/auth/v1/user` (200)
  - `/rest/v1/users?...` (200)
  - `/rest/v1/user_tenant_memberships?...` (200)
  - `/rest/v1/legal_documents?...` (200)
  - `/rest/v1/user_legal_acceptances?...` (200)
- Browser duplicated calls (2×) to:
  - `/rest/v1/rpc/get_user_notifications` (200)
  - achievements endpoints (200)

Interpretation:
- Even when nothing times out, we are doing **far more requests than necessary**.
- This increases the probability of intermittent "hung" UI (e.g. rate limiting, server action overlap, strict-mode double effects, token refresh).

### 2026-01-31 - Mitigation: collapse duplicate auth context + tenant loading
Changes applied:
- Server-side request caching:
  - `lib/supabase/server.ts`: cache `createServerRlsClient()` and `getAuthUser()` within a single request.
  - `lib/auth/server-context.ts`: cache `getServerAuthContext(pathname?)` within a single request.
- Client-side tenant loading dedupe:
  - `lib/context/TenantContext.tsx`: prevent overlapping `resolveCurrentTenant()` calls and ignore stale `userId` updates.

---

## What we need next from you (to pinpoint the root cause)
When the issue happens again:
1. Open DevTools Console and copy the *new* log lines from `[supabase fetch:*]` (they include the URL and timeout).
2. In DevTools Network:
   - filter for `supabase`, `rest`, `notification_preferences`, and/or your Supabase project host
   - click the slow request → screenshot the **Timing** tab
3. Tell us if it correlates with:
   - tenant switching
   - login/logout
   - only happening when you have both organization memberships + private tenant

## Fix strategy (once root cause is confirmed)
- If the hang is **DB lock / migration / long query**:
  - fix the specific query/policy/index, and add guards to prevent lock contention.
- If the hang is **auth refresh/session**:
  - fix cookie/session storage and add retries around `supabase.auth.getUser()` flows.
- If the hang is **server action**:
  - add server-side timeouts/abort + more specific error boundaries for profile routes.
- Keep "never infinite spinner" UX in place regardless.


### 2026-01-31 - Comprehensive fix implementation (request storms + infinite loading)

**Root cause map identified:**

| Call | Source 1 | Source 2 | Source 3 |
|------|----------|----------|----------|
| `/auth/v1/user` | `getServerAuthContext()` | `getPendingLegalDocuments()` | `getRequiredLegalDocuments()` |
| `/rest/v1/users` | `getServerAuthContext()` | `resolveCurrentTenant()` | - |
| `/rest/v1/user_tenant_memberships` | `getServerAuthContext()` | `resolveCurrentTenant()` (server action) | TenantContext (client) |
| `/rest/v1/legal_documents` | `getPendingLegalDocuments()` | Per-type queries | - |
| `rpc/get_user_notifications` | `useAppNotifications()` | StrictMode double-effect | - |

**Fixes implemented:**

#### 1. Server-side: Legal docs caching (TTL + per-request)
- Created `lib/legal/cached-legal.ts`:
  - `getRequiredLegalDocuments(locale)` -> cached 5 min via `unstable_cache`
  - Single query for ALL required types instead of N+1 per type
  - `getUserAcceptedDocTypes(userId)` -> per-request cached via `cache()`
  - `getPendingLegalDocuments()` -> combines both efficiently
- Updated `app/app/layout.tsx` to use cached version

#### 2. Client-side: Single-flight hook for profile queries
- Created `hooks/useProfileQuery.ts`:
  - Single-flight pattern (no duplicate concurrent requests)
  - AbortController cancellation on dependency change
  - State machine (`status: idle|loading|success|error|timeout`)
  - StrictMode-safe (ignores stale responses)
  - Built-in timeout detection
  - `retry()` function for recovery

#### 3. Profile pages refactored
- `app/app/profile/notifications/page.tsx` -> uses `useProfileQuery`
- `app/app/profile/preferences/page.tsx` -> uses `useProfileQuery`
- `app/app/profile/organizations/page.tsx` -> uses `useProfileQuery`
- `app/app/profile/activity/page.tsx` -> uses `useProfileQuery`
- All pages now have proper state machine (no stuck loading)
- All pages show retry button on timeout/error

#### 4. Notifications hook deduplication
- `hooks/useAppNotifications.ts`:
  - Added module-level single-flight tracking
  - StrictMode double-effect no longer causes 2x RPC calls
  - Generation tracking to ignore stale responses

---

## Expected reduction in requests

**Before (per navigation to /app/profile):**
- `/auth/v1/user`: 3+ times (layout, legal check, legal docs)
- `/rest/v1/users`: 2+ times
- `/rest/v1/user_tenant_memberships`: 3+ times
- `/rest/v1/legal_documents`: 2+ times (per type)
- Browser RPC calls: 2x due to StrictMode

**After:**
- `/auth/v1/user`: 1x (cached per request)
- `/rest/v1/users`: 1x (cached per request)
- `/rest/v1/user_tenant_memberships`: 1x (cached per request) + 1x client (if needed)
- `/rest/v1/legal_documents`: 0x on repeat navigation (5 min TTL cache), 1 query for all types
- Browser RPC calls: 1x (single-flight dedupe)

---

## Verification steps (to confirm fix)

1. Run the app in development mode: `npm run dev`
2. Navigate: `/app/profile` -> `/app/profile/notifications` -> `/app/profile/preferences` -> `/app/profile/activity`
3. Check DevTools Console for `[supabase fetch:*]` logs
4. Count unique requests per navigation

**Pass criteria:**
- `/auth/v1/user` appears max 1x per navigation
- `legal_documents` appears 0x on subsequent navigations (cached)
- Browser RPC calls appear 1x per intent (not 2x)
- No profile page can stay in loading state after 12s timeout

### 2026-01-31 - Follow-up fixes after refactor
- Fixed a correctness bug where some profile pages were using `useMemo` to perform state updates (side effects during render). Switched these to `useEffect`.
- Fixed `organizations/page.tsx` nullability (avoid reading `.length` or `.filter` on `memberships` when it's `null`).
- Fixed a runtime crash on `/app/profile/notifications`: `useProfileQuery` was using `JSON.stringify(deps)` and `deps` contained Supabase clients (circular references). Replaced this with a safe, identity-based deps key.
- Verified locally:
  - `npm run type-check` passes
  - `npx vitest run` passes
  - `npm run build` passes

### 2026-01-31 - Cleanup: remove redundant Profile sections
Observations:
- There are **two different notification surfaces**:
  - **Header bell** (`components/app/NotificationBell.tsx`) uses `hooks/useAppNotifications.ts` → RPC `get_user_notifications` (in-app notification feed).
  - **Profile notifications page** (`app/app/profile/notifications/page.tsx`) uses `lib/profile/profile-service.client.ts` → table `notification_preferences` (settings/preferences).
- Having both visible as “Notifikationer” is confusing and also increases the chance of hitting the problematic route during debugging.

Changes applied:
- Removed “Prestationer” / Achievements showcase from `/app/profile` (overview) to reduce request load and remove a non-essential spinner.
- Hid “Notifikationer” from the Profile navigation and overview quick links. The old `/app/profile/notifications` route now redirects to `/app/notifications` to avoid duplicate UX and eliminate a common failure entry point.

### 2026-01-31 - MFA: reduce duplicate work for profile/security pages
Changes applied:
- `app/api/accounts/auth/mfa/status/route.ts` no longer calls `getMFAStatus()` (which re-called `auth.getUser()` and `checkMFARequirement()`).
  - It now computes the minimal required fields using the current request’s Supabase client and a single requirement check.
- `/app/profile` now uses `useProfileQuery` for MFA status to avoid StrictMode double-fetch and to surface timeouts via the standardized state machine.
- `app/app/profile/security/SecuritySettingsClient.tsx` now syncs `factorId` from the status API response so disable/enroll flows remain functional after refetch.

### 2026-01-31 - MFA UI mismatch + trusted devices “stuck loading” (fixes)
Findings:
- `/app/profile` overview treated “no MFA status yet / fetch failed” as `mfaEnabled=false` → false-negative “MFA ej aktiverad”.
- `/app/profile/security` fetched MFA status + trusted devices via a single `Promise.all`. If one request hung, the Trusted Devices section could stay on “Laddar…” indefinitely.
- `useProfileQuery` single-flight logic had two stability gaps:
  - in-flight cache key ignored dependency changes (risk of reusing stale requests)
  - if a fetcher ignored the `AbortSignal`, the global in-flight promise could remain pending forever

Fixes applied:
- `hooks/useProfileQuery.ts`
  - in-flight cache key now includes a dependency key (`key::depsKey`)
  - all in-flight promises are wrapped with `withTimeout(...)` so they **always settle**, even if the underlying operation hangs
- `app/app/profile/page.tsx`
  - MFA indicator is now tri-state (loading/unknown/enabled/disabled) to avoid false negatives
  - “unknown” links to `/app/profile/security` (and surfaces error in tooltip)
- `app/app/profile/security/SecuritySettingsClient.tsx`
  - status and devices are fetched independently; devices failures no longer block status UI
  - Trusted Devices section shows explicit error + retry (instead of infinite loading)
  - `factorId` is derived from verified TOTP or Phone (whichever exists)
- `app/app/profile/security/page.tsx`
  - initial `hasMFA` / `factorId` now considers Phone factors too

---

## What’s still relevant for further debugging (keep this short + concrete)

### Current “moving parts” that can still cause intermittent issues
- **Server auth calls**: repeated `/auth/v1/user` is still the #1 “multiplier” that can cascade into slow/failed profile renders. Verify request counts on navigation.
- **Tenant membership fan-out**: profile routes (and layout) tend to trigger `user_tenant_memberships` + `users` + legal docs. Any overlap/duplication increases the probability of intermittent stalls.
- **MFA trusted devices**: data comes from `mfa_trusted_devices` filtered by `expires_at > now` and `is_revoked=false`. If the table is empty, never written to, blocked by RLS, or time-skewed, it will look like “no devices”.
- **Silent “empty on error” risk**: if any API/service returns an empty list on DB/RLS error (instead of throwing), UI can look “valid but empty” and hide the root cause.

### Concrete evidence to capture when something breaks
1. **Console**: copy only the lines that start with:
   - `[supabase fetch:server] timeout|done|start`
   - `[supabase fetch:browser] timeout|done|start`
2. **Network timing screenshots** (Timing tab):
   - `/api/accounts/auth/mfa/status`
   - `/api/accounts/auth/mfa/devices`
   - any request stuck in “Pending” (especially to the Supabase REST host)
3. **Does it correlate with**:
   - switching tenant (`/app/select-tenant`)
   - logging in/out
   - having both private tenant + org tenant(s)

### Practical theories (ranked; validate with the evidence above)
T1. **Remaining request duplication** (server + client) → occasional slowdowns/timeouts under load; the “hang” is often a symptom, not the cause.
T2. **Auth/session refresh edge-case** (stale cookies / token refresh) → intermittent 401s or retries that aren’t reflected in UI, especially in profile routes that aggregate multiple calls.
T3. **RLS/policy mismatch** on one of the newer tables (e.g. MFA/trusted devices, preferences, notifications) → queries appear to “work” locally sometimes, then fail/return empty depending on context.
T4. **Client-side StrictMode / Fast Refresh interactions** → double effects + cancellation timing issues can amplify “storm” behavior if any fetch path is not fully single-flight.

### Intentional UX cleanup (to reduce surface area during debugging)
- `/app/profile/notifications` now redirects to `/app/notifications` (single notifications surface).
- Achievements (“Prestationer”) were removed from `/app/profile` overview (non-essential + spinner risk).
