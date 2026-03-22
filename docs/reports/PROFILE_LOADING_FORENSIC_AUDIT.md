# Profile Loading – Forensic End-to-End Audit (Expanded)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-01-31
- Last updated: 2026-03-21
- Last validated: -

> Fryst forensic audit-snapshot för profile loading-problemen. Läs som incident- och analysunderlag, inte som verifierad nutidsstatus utan ny kontroll mot koden.

**Status:** Complete (v3.0 – GPT feedback addressed)  
**Date:** 2026-01-31  
**Author:** Copilot (forensic audit mode)  
**Scope:** `/app/profile/**` routes, **global mounts** (AppShell/layout/providers/header/nav), all shared dependencies

---

## Table of Contents

| Section | Description |
|---------|-------------|
| 0. Index of Evidence | File map + evidence index |
| 1. Executive Summary | TL;DR findings and status |
| 2. Inventory: Profile Routes | Complete route/folder inventory |
| 3. Inventory: Global Mounts | AppShell, nav, header, providers + **mount effects analysis** |
| 4. End-to-End Request Topology | 6-hop dependency chains |
| 5. Per-Route Deep Trace | Including **"Betrodda enheter" forensic trace** |
| 6. Failure Mode Matrix | FM1-FM13 comprehensive catalogue |
| 7. Request-Storm Map | Endpoint → call site mapping + **per-route request budget** |
| 8. Supabase + Auth + Tenant Audit | Client caching, timeout coverage |
| 9. next-intl / i18n Boundary | **Error boundary analysis**, crash-path vs missing-key |
| 10. DB/RLS Touchpoints | Tables, **verified RLS policies**, index analysis |
| 11. Request Storms & Dedupe | Deduplication mechanisms audit |
| 12. Code Quality Findings | Patterns and remaining debt |
| 13. Gaps + Capture Checklist | Missing evidence, repro matrix |
| Appendix A | Extended dependency graphs |
| Appendix B | Timeline of changes |
| Appendix C | Glossary |
| Appendix D | Duplicate/legacy component map |
| Appendix E | Orphan routes & dead links **(verified reachability)** |
| Appendix F | RPC & server action inventory **(timeout correction)** |
| Appendix G | Summary for future audits |
| Addendum | **GPT Feedback Verification Checklist** |

---

## Critique of Previous Audit

The original audit correctly identified 7 root causes and documented the `useProfileQuery` pattern, but had significant blind spots:

| Gap | Why It Matters |
|-----|----------------|
| **AppShell/header/nav not traced** | Shared components mount on EVERY profile navigation; if they hang, ALL profile routes fail simultaneously |
| **Provider stack not inventoried** | `AuthProvider`, `TenantProvider`, `PreferencesProvider`, `CartProvider` all run effects on mount |
| **No folder/route inventory** | Can't identify orphan routes, dead redirects, or "duplicate UX" surfaces (e.g., notifications settings vs bell) |
| **Trusted devices spinner not traced** | Concrete failure visible in screenshots was not traced to specific code path |
| **Dependency depth < 2 hops** | Missed chains like UI → hook → service → supabase → fetch wrapper → endpoint → RLS → DB index |
| **UI generation inconsistency not analyzed** | Different styling across profile subpages suggests parallel implementations |

The expanded audit below addresses all these gaps.

---

## 0. Index of Evidence (Expanded)

| File | Lines | Evidence Category |
|------|-------|-------------------|
| [hooks/useProfileQuery.ts](../../../hooks/useProfileQuery.ts) | 1-269 | Single-flight hook, state machine, timeout wrapper |
| [lib/supabase/server.ts](../../../lib/supabase/server.ts) | 1-100 | Server RLS client, React cache(), getAuthUser() |
| [lib/supabase/client.ts](../../../lib/supabase/client.ts) | 1-93 | Browser client singleton, cookie handling |
| [lib/supabase/fetch-with-timeout.ts](../../../lib/supabase/fetch-with-timeout.ts) | 1-160 | Fetch wrapper with per-endpoint timeouts |
| [lib/auth/server-context.ts](../../../lib/auth/server-context.ts) | 1-69 | getServerAuthContext() with cache() |
| [lib/context/TenantContext.tsx](../../../lib/context/TenantContext.tsx) | 1-265 | TenantProvider, loadTenants, single-flight ref |
| [lib/supabase/auth.tsx](../../../lib/supabase/auth.tsx) | 1-414 | AuthProvider, client-side state, ensureProfile() |
| [lib/legal/cached-legal.ts](../../../lib/legal/cached-legal.ts) | 1-157 | unstable_cache TTL for legal docs |
| [lib/utils/withTimeout.ts](../../../lib/utils/withTimeout.ts) | 1-30 | TimeoutError class, withTimeout() helper |
| [hooks/useAppNotifications.ts](../../../hooks/useAppNotifications.ts) | 1-282 | Notifications hook with single-flight |
| [app/app/layout.tsx](../../../app/app/layout.tsx) | 1-42 | AppShell server component |
| [app/app/layout-client.tsx](../../../app/app/layout-client.tsx) | 1-61 | AppShellContent client wrapper |
| [app/layout.tsx](../../../app/layout.tsx) | 1-75 | Root layout, NextIntlClientProvider |
| [app/providers.tsx](../../../app/providers.tsx) | 1-45 | Client providers stack |
| [app/server-providers.tsx](../../../app/server-providers.tsx) | 1-16 | Server auth context hydration |
| [app/app/profile/layout.tsx](../../../app/app/profile/layout.tsx) | 1-46 | Profile layout (server, no loading.tsx) |
| [app/app/profile/page.tsx](../../../app/app/profile/page.tsx) | 1-251 | Profile overview |
| [app/app/profile/notifications/page.tsx](../../../app/app/profile/notifications/page.tsx) | 1-7 | Redirect to /app/notifications |
| [app/app/profile/preferences/page.tsx](../../../app/app/profile/preferences/page.tsx) | 1-579 | Preferences with useProfileQuery |
| [app/app/profile/organizations/page.tsx](../../../app/app/profile/organizations/page.tsx) | 1-398 | Organizations with useProfileQuery |
| [app/app/profile/activity/page.tsx](../../../app/app/profile/activity/page.tsx) | 1-450+ | Activity with useProfileQuery |
| [app/app/profile/security/page.tsx](../../../app/app/profile/security/page.tsx) | 1-59 | Security (server component) |
| [app/app/profile/general/page.tsx](../../../app/app/profile/general/page.tsx) | 1-382 | General settings |
| [app/app/profile/account/page.tsx](../../../app/app/profile/account/page.tsx) | 1-461 | Account settings |
| [app/app/profile/privacy/page.tsx](../../../app/app/profile/privacy/page.tsx) | 1-525 | Privacy & GDPR |
| [app/app/profile/achievements/page.tsx](../../../app/app/profile/achievements/page.tsx) | 1-236 | Achievements |
| [app/app/profile/friends/page.tsx](../../../app/app/profile/friends/page.tsx) | 1-340 | Friends list |
| [hooks/useBrowserSupabase.ts](../../../hooks/useBrowserSupabase.ts) | 1-31 | Browser client hook |
| [lib/profile/profile-service.client.ts](../../../lib/profile/profile-service.client.ts) | 1-576 | ProfileService class |
| **Global Mounts (NEW)** | | |
| [components/app/AppShell.tsx](../../../components/app/AppShell.tsx) | 1-26 | Layout shell wrapping all content |
| [components/app/SideNav.tsx](../../../components/app/SideNav.tsx) | 1-117 | Desktop sidebar with `useAuth()` |
| [components/app/BottomNav.tsx](../../../components/app/BottomNav.tsx) | 1-172 | Mobile nav with `useAuth()` |
| [components/app/NotificationBell.tsx](../../../components/app/NotificationBell.tsx) | 1-296 | Bell using `useAppNotifications()` |
| [components/app/ProfileModal.tsx](../../../components/app/ProfileModal.tsx) | 1-147 | Profile quick-access modal |
| [app/app/components/app-topbar.tsx](../../../app/app/components/app-topbar.tsx) | 1-113 | Topbar with NotificationBell |
| [lib/context/PreferencesContext.tsx](../../../lib/context/PreferencesContext.tsx) | 1-290 | Theme/language provider with DB sync |
| [components/profile/ProfileNavigation.tsx](../../../components/profile/ProfileNavigation.tsx) | 1-200 | Profile sidebar navigation |
| [app/app/profile/security/SecuritySettingsClient.tsx](../../../app/app/profile/security/SecuritySettingsClient.tsx) | 1-452 | **Trusted devices "Laddar…" source** |
| [features/profile/components/ProfileAchievementsShowcase.tsx](../../../features/profile/components/ProfileAchievementsShowcase.tsx) | 1-213 | Achievements showcase component |

---

## 1. Executive Summary

### 1.1 Problem Statement

Profile pages under `/app/profile/**` exhibited **intermittent infinite loading states** where:
- Skeleton/spinner UI persisted indefinitely
- No error UI was shown to users
- Multiple sections could fail simultaneously
- Issue self-resolved with page refreshes but recurred

### 1.2 Root Causes Identified

| # | Root Cause | Severity | Status |
|---|------------|----------|--------|
| RC1 | **Request storms** – 3+ duplicate `/auth/v1/user` calls per navigation | High | ✅ Fixed |
| RC2 | **No request timeouts** – hung Supabase fetches blocked indefinitely | Critical | ✅ Fixed |
| RC3 | **StrictMode double-effects** – browser RPC calls fired 2× | Medium | ✅ Fixed |
| RC4 | **Early returns leaving isLoading=true** – error paths didn't flip loading state | Critical | ✅ Fixed |
| RC5 | **Legal docs N+1 queries** – per-type database hits | Medium | ✅ Fixed |
| RC6 | **useMemo side effects** – state updates during render | High | ✅ Fixed |
| RC7 | **Circular JSON.stringify** – crashed on Supabase client in deps | High | ✅ Fixed |

### 1.3 Fixes Implemented

1. **Server-side request caching** via React `cache()` for auth context, RLS client
2. **Legal docs TTL cache** via `unstable_cache` (5 min) with single query for all types
3. **Single-flight `useProfileQuery` hook** with:
   - State machine (`idle|loading|success|error|timeout`)
   - AbortController for cancellation
   - `withTimeout` wrapper ensuring promises always settle
   - Safe dependency key generation (WeakMap for objects)
4. **Fetch wrapper** (`createFetchWithTimeout`) for all Supabase clients
5. **Notifications hook dedupe** with generation tracking

### 1.4 Residual Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| DB lock causes 15s+ query | Low | Medium | Fetch timeout surfaces error + retry |
| Auth token refresh race | Low | Low | Generation tracking ignores stale responses |
| New page bypasses useProfileQuery | Medium | High | Document pattern, add lint rule |
| Supabase outage | Low | High | Timeout + error UI + retry |

---

## 2. Inventory: Profile Routes & Folders

### 2.1 Complete Route/Folder Inventory

| Route | File | Server/Client | Data Fetching | Loading State | Error Handling | Links In Nav? | Status |
|-------|------|---------------|---------------|---------------|----------------|---------------|--------|
| `/app/profile` | `page.tsx` | Client | `useAuth()`, `useProfileQuery` (MFA) | `useProfileQuery` state machine | Error/timeout UI | Yes (SideNav, BottomNav, ProfileModal) | ✅ Active |
| `/app/profile/general` | `general/page.tsx` | Client | `useAuth()` only | `isLoading` from `useAuth` | Basic catch | Yes (ProfileNavigation) | ⚠️ No timeout |
| `/app/profile/account` | `account/page.tsx` | Client | `useAuth()` only | Manual `useState` | Manual catch | Yes (ProfileNavigation) | ⚠️ No timeout |
| `/app/profile/security` | `security/page.tsx` | **Server** | `supabase.auth.mfa.listFactors()` | Server renders, client handles rest | Redirect on no user | Yes (ProfileNavigation) | ⚠️ Mixed |
| `/app/profile/security` (client) | `SecuritySettingsClient.tsx` | Client | `useProfileQuery` ×2 (status + devices) | State machine | Error + retry UI | - | ✅ Fixed |
| `/app/profile/privacy` | `privacy/page.tsx` | Client | Manual `useEffect` + `ProfileService` | `useState(isLoading)` | Manual catch | Yes (ProfileNavigation) | ⚠️ FM4 risk |
| `/app/profile/preferences` | `preferences/page.tsx` | Client | `useProfileQuery` | State machine | Error/timeout + retry | Yes (ProfileNavigation) | ✅ Fixed |
| `/app/profile/organizations` | `organizations/page.tsx` | Client | `useProfileQuery` | State machine | Error/timeout + retry | Yes (ProfileNavigation) | ✅ Fixed |
| `/app/profile/activity` | `activity/page.tsx` | Client | `useProfileQuery` | State machine | Error/timeout + retry | Yes (ProfileNavigation) | ✅ Fixed |
| `/app/profile/notifications` | `notifications/page.tsx` | Client | **Redirect only** | - | - | **Removed from nav** | 🔄 Redirect to /app/notifications |
| `/app/profile/achievements` | `achievements/page.tsx` | Client | Manual `useEffect` + service | `useState(isLoading)` | Manual catch | No (link from overview removed) | ⚠️ FM4 risk |
| `/app/profile/friends` | `friends/page.tsx` | Client | Manual `useEffect` + service | `useState(isLoading)` | Manual catch | No | ⚠️ FM4 risk |
| `/app/profile/edit` | `edit/page.tsx` | Client | `useAuth()` only | Manual state | Basic catch | No (back link from general) | ⚠️ Minimal |
| `/app/profile/coins` | **DOES NOT EXIST** | - | - | - | - | Link in CoinsSection exists | ❌ Dead link |

### 2.2 Orphan / Dead Routes

| Route | Issue | Evidence |
|-------|-------|----------|
| `/app/profile/coins` | Folder does not exist but links point to it | `features/gamification/components/CoinsSection.tsx:73` links to it |
| `/app/profile/notifications` | Now redirect-only (7 lines) | Cleaned up to reduce attack surface |

### 2.3 Duplicate UX Concerns

| Concern | Location 1 | Location 2 | Risk |
|---------|------------|------------|------|
| **Notifications** | `NotificationBell` (header) → in-app feed | `/app/profile/notifications` → settings | Confusion; now mitigated by redirect |
| **MFA Status** | `/app/profile` overview card | `/app/profile/security` | Duplicate fetch if both visible; mitigated by `useProfileQuery` cache key |
| **Theme/Language** | `/app/profile/preferences` | `PreferencesContext` (global) | Same data but different save paths |

### 2.4 No `loading.tsx` / `error.tsx`

**Finding:** No Suspense boundaries under `app/app/profile/**`. All loading states are component-level `useState`.

**Impact:** If a server component fails during RSC render, React may attempt client fallback without proper error UI.

---

## 3. Inventory: Global Mounts (Layout/AppShell/Header/Nav/Providers)

### 3.1 Provider Stack (Outer → Inner)

```
<html lang={locale}>                                  ← getLocale() (server)
  <NextIntlClientProvider messages={messages}>        ← getMessages() (server, file read)
    <ServerProviders>                                 ← getServerAuthContext() (server fetch)
      <Providers                                      ← Client boundary
        initialUser={...}                             ← Hydrated from server
        initialProfile={...}
        initialMemberships={...}
      >
        <AuthProvider>                                ← Client state + onAuthStateChange listener
          <PreferencesProvider>                       ← localStorage + DB sync on user change
            <CartProvider>                            ← Cart state (no DB on mount)
              <TenantProvider>                        ← app/app/layout.tsx level
                <CartProvider>                        ← layout-client.tsx wraps again
                  <ToastProvider>
                    <AppShell header={<AppTopbar/>}>
                      <SideNav/>                      ← calls useAuth()
                      <BottomNav/>                    ← calls useAuth()
                      {children}
```

### 3.2 Global Mounts That Fetch on Navigation

| Component | Hook/Service | Fetch Triggered | When |
|-----------|--------------|-----------------|------|
| `SideNav` | `useAuth()` | None (reads context) | Every render |
| `BottomNav` | `useAuth()` | None (reads context) | Every render |
| `NotificationBell` | `useAppNotifications()` | `rpc/get_user_notifications` | Mount |
| `TenantProvider` | `resolveCurrentTenant()` (server action) | `/rest/v1/tenants`, `/rest/v1/memberships` | User change only (hydrated) |
| `PreferencesProvider` | `supabase.from('user_preferences')` | Upsert on preference change | Not on mount |
| `AuthProvider` | `supabase.auth.getUser()` | Only if NOT hydrated from server | Mount without hydration |

### 3.2.1 Provider Stack – Mount Effects Analysis (DETAILED)

**Requested clarification: What EXACTLY runs on mount for each provider?**

#### AuthProvider (`lib/supabase/auth.tsx`)

| useEffect | Trigger | Async Call | Early Return Patterns | Can Leave UI Pending? |
|-----------|---------|------------|----------------------|----------------------|
| `initAuth()` (L166-182) | Mount, only if `initialUser === undefined` | `supabase.auth.getUser()`, `fetchProfile()`, `fetchMemberships()` | ✅ If server hydrated, effect returns early | ⚠️ Yes if not hydrated: `isLoading=true` until all promises resolve |
| `onAuthStateChange` (L184-240) | Auth events | `supabase.auth.getUser()` on SIGNED_IN | Skips `INITIAL_SESSION` event | ❌ No (doesn't affect initial loading) |

**Key code path ([lib/supabase/auth.tsx#L166-182](../../../lib/supabase/auth.tsx#L166-L182)):**
```typescript
useEffect(() => {
  // Skip client init if server provided initial data (including null)
  if (initialUser !== undefined) {    // ← EARLY RETURN if hydrated
    setIsLoading(false)
    return
  }

  const initAuth = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser()  // ← ASYNC
      if (authUser) {
        setUser(authUser)
        await Promise.all([fetchProfile(authUser), fetchMemberships(authUser)])  // ← ASYNC
      }
    } finally {
      setIsLoading(false)  // ← ALWAYS runs
    }
  }
  void initAuth()
}, [])
```

**Verdict:** 
- ✅ Has early return for server hydration
- ✅ Has `finally` block that always clears loading
- ⚠️ If not hydrated AND `getUser()` hangs, `isLoading` stays true (but browser client has timeout)

#### PreferencesProvider (`lib/context/PreferencesContext.tsx`)

| useEffect | Trigger | Async Call | Early Return Patterns | Can Leave UI Pending? |
|-----------|---------|------------|----------------------|----------------------|
| Hydrate from localStorage (L75-93) | Mount | None (sync) | None | ❌ No |
| System theme listener (L102-114) | `theme` change | None | None | ❌ No |
| Apply theme (L117-123) | `theme` change | None | Skips if not initialized | ❌ No |
| Apply language (L126-134) | `language` change | None | Skips if not initialized | ❌ No |
| Adopt profile values (L144-158) | `userProfile` change | None | Returns early if !userProfile | ❌ No |

**syncUserPreferences (`lib/context/PreferencesContext.tsx#L184-201`):**
```typescript
const syncUserPreferences = useCallback(async (updates) => {
  if (!user || !tenantId || isDemoUser) return  // ← EARLY RETURN
  try {
    await supabase
      .from('user_preferences')
      .upsert({ tenant_id, user_id, ...updates })  // ← NO TIMEOUT WRAPPER
  } catch (err) { ... }
}, [])
```

**Verdict:**
- ✅ All mount effects are synchronous (localStorage reads)
- ✅ `syncUserPreferences` only called on user ACTION (setTheme, setLanguage)
- ⚠️ `syncUserPreferences` has no timeout wrapper, but it's not on mount path
- ❌ Cannot cause "hydrate mismatch" stall – localStorage is sync

#### TenantProvider (`lib/context/TenantContext.tsx`)

| useEffect | Trigger | Async Call | Early Return Patterns | Can Leave UI Pending? |
|-----------|---------|------------|----------------------|----------------------|
| `loadTenants()` (L142-156) | `userId` change | `resolveTenantAction()` server action | Reuses in-flight promise (single-flight) | ⚠️ If server action hangs, `isLoading=true` |

**Key code path ([lib/context/TenantContext.tsx#L99-112](../../../lib/context/TenantContext.tsx#L99-L112)):**
```typescript
const loadTenantsInFlightRef = useRef<{ userId: string; promise: Promise<void> } | null>(null)

const loadTenants = useCallback(async () => {
  const inFlight = loadTenantsInFlightRef.current
  if (inFlight?.userId === userId) {
    return inFlight.promise  // ← SINGLE-FLIGHT: reuse existing request
  }
  // ...
})
```

**Verdict:**
- ✅ Server hydrates initial tenant (no client fetch on mount if hydrated)
- ✅ Single-flight prevents duplicate requests
- ⚠️ If user changes, `loadTenants()` runs – no explicit timeout on server action
- ⚠️ Route changes do NOT trigger refetch (tenant is stable per session)

#### CartProvider (`lib/cart/CartContext.tsx`)

| useEffect | Trigger | Async Call | Can Leave UI Pending? |
|-----------|---------|------------|-----------------------|
| None on mount | - | - | ❌ No |

**Verdict:** ✅ Cart only fetches on user action. No mount-time async.

### 3.3 AppShell / Topbar / Navigation Flow

```
app/app/layout.tsx (Server)
  │
  ├─► getServerAuthContext() ─────────────────► /auth/v1/user, /rest/v1/users, /rest/v1/memberships
  ├─► getPendingLegalDocuments() ─────────────► cached or /rest/v1/legal_documents
  │
  └─► <TenantProvider initialTenant={...}>     ← NO client fetch if hydrated
        │
        └─► app/app/layout-client.tsx (Client)
              │
              ├─► useTenant() ─────────────────► reads context (no fetch)
              │
              └─► <AppShell header={<AppTopbar/>}>
                    │
                    ├─► <SideNav/> ────────────► useAuth() (context read)
                    ├─► <BottomNav/> ──────────► useAuth() (context read)
                    └─► <AppTopbar>
                          └─► <NotificationBell/> ► useAppNotifications() ► rpc/get_user_notifications
```

### 3.4 NotificationBell Deep Trace

```
NotificationBell (mount)
  │
  └─► useAppNotifications(20)
        │
        ├─► Check: typeof window !== 'undefined'
        │     └─► If SSR: supabase = null → return early (no fetch)
        │
        ├─► createBrowserClient() [singleton]
        │     │
        │     └─► global.fetch = createFetchWithTimeout(fetch) ← ✅ HAS TIMEOUT
        │
        ├─► Check: inFlightFetch !== null
        │     └─► If in-flight: reuse promise (single-flight)
        │
        ├─► fetchGeneration++
        │
        └─► Execute:
              withTimeout(                              ← ✅ DOUBLE TIMEOUT (hook-level)
                supabase.rpc('get_user_notifications', { p_limit: 20 }),
                12000,                                  ← 12s timeout
                'rpc:get_user_notifications'
              )
```

### 3.5 NotificationBell Timeout Coverage – CLARIFICATION

**Previous audit stated conflicting information. Here is definitive evidence:**

| Layer | Has Timeout? | Evidence |
|-------|--------------|----------|
| **Layer 1: Browser client `global.fetch`** | ✅ YES | [lib/supabase/client.ts#L67](../../../lib/supabase/client.ts#L67): `fetch: createFetchWithTimeout(fetch, { logPrefix: '[supabase fetch:browser]' })` |
| **Layer 2: useAppNotifications hook** | ✅ YES | [hooks/useAppNotifications.ts#L129-132](../../../hooks/useAppNotifications.ts#L129-L132): `await withTimeout(supabase.rpc(...), 12000, 'rpc:get_user_notifications')` |

**Conclusion:** NotificationBell has **dual timeout protection**:
1. The browser Supabase client uses `createFetchWithTimeout` for ALL requests (default 10s for RPC)
2. The `useAppNotifications` hook additionally wraps the RPC call in `withTimeout(12s)`

**Observable behavior when `rpc/get_user_notifications` hangs:**
```
Console: [supabase fetch:browser] start { method: 'POST', url: '.../rpc/get_user_notifications', timeoutMs: 10000 }
Console: [supabase fetch:browser] timeout { method: 'POST', url: '.../rpc/get_user_notifications', timeoutMs: 10000 }
Console: [useAppNotifications] Error: TimeoutError: Timed out after 10000ms
```

**Correction to Appendix F:** The table incorrectly stated "⚠️ No" for `get_user_notifications` timeout. This is **WRONG**. The RPC IS wrapped at both client and hook level.

---

### 3.6 Global Mount Risk Summary

| Component | Can Cause "All Dies"? | Why/Why Not |
|-----------|----------------------|-------------|
| `SideNav` | ❌ No | Only reads `useAuth()` context (no fetch) |
| `BottomNav` | ❌ No | Only reads `useAuth()` context (no fetch) |
| `NotificationBell` | ⚠️ Low risk | Has timeout; error sets `error` state but UI may not show explicit error in dropdown |
| `AppTopbar` | ❌ No | Just layout wrapper |
| `TenantProvider` | ⚠️ Low risk | Server-hydrated; client re-fetch only on user change |
| `PreferencesProvider` | ⚠️ Low risk | Only syncs on preference *change*, not on mount |
| `AuthProvider` | ⚠️ Low risk | Server-hydrated; `initAuth()` only runs if `initialUser === undefined` |

---

## 4. End-to-End Request Topology (Extended)

### 4.1 Full Server-Side Request Flow (SSR)

```
Browser requests /app/profile/*
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│ app/layout.tsx (Root)                                       │
│  ├─ getLocale() ──────────────────────────────────────────► │ i18n (headers)
│  ├─ getMessages() ────────────────────────────────────────► │ i18n (file read)
│  └─ NextIntlClientProvider wraps children                   │
│         │                                                   │
│         ▼                                                   │
│ app/server-providers.tsx                                    │
│  └─ getServerAuthContext('/app')                            │
│       ├─ createServerRlsClient() ◄─ cache() ◄─ REUSED      │
│       ├─ supabase.auth.getUser() ─────────────────────────► │ /auth/v1/user (1×)
│       ├─ supabase.from('users').select() ─────────────────► │ /rest/v1/users
│       ├─ supabase.from('user_tenant_memberships').select()► │ /rest/v1/memberships
│       └─ resolveTenant() (no extra query, uses cached)      │
│         │                                                   │
│         ▼                                                   │
│ app/app/layout.tsx                                          │
│  ├─ getServerAuthContext() ◄─── REUSED (same request)      │
│  ├─ getPendingLegalDocuments(userId, locale)               │
│  │    ├─ getRequiredLegalDocuments(locale)                 │
│  │    │    └─ unstable_cache(5 min) ──────────────────────► │ /rest/v1/legal_documents (0× if cached)
│  │    └─ getUserAcceptedDocTypes(userId) ◄─ cache()        │
│  │         └─ supabase.from('user_legal_acceptances')─────► │ /rest/v1/user_legal_acceptances
│  └─ TenantProvider (hydrated with server data)              │
│         │                                                   │
│         ▼                                                   │
│ app/app/profile/layout.tsx (Server)                         │
│  └─ generateMetadata() ───────────────────────────────────► │ getTranslations() (no DB)
│         │                                                   │
│         ▼                                                   │
│ app/app/profile/*/page.tsx (Client Component)               │
│  └─ Hydrates with server state, client effects start        │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Client-Side Request Flow (After Hydration)

```
┌─────────────────────────────────────────────────────────────┐
│ Client Component Mounts                                     │
│                                                             │
│ Providers already hydrated:                                 │
│  ├─ AuthProvider (user, profile, memberships from server)   │
│  ├─ TenantProvider (currentTenant from server)              │
│  └─ NextIntlClientProvider (messages from server)           │
│                                                             │
│ Profile Page Effects:                                       │
│  └─ useProfileQuery('preferences-{userId}', fetcher, deps)  │
│       ├─ Check skip conditions (authLoading, !supabase)     │
│       ├─ Check inFlightRequests Map (single-flight)         │
│       │    └─ If in-flight: reuse promise                   │
│       ├─ Create AbortController                             │
│       ├─ Wrap fetcher with withTimeout(15s)                 │
│       └─ Execute:                                           │
│            supabase.from('user_preferences').select() ─────►│ /rest/v1/user_preferences
│                                                             │
│ Notifications Bell (AppTopbar):                             │
│  └─ useAppNotifications(20)                                 │
│       ├─ Check inFlightFetch (module-level single-flight)   │
│       └─ Execute:                                           │
│            supabase.rpc('get_user_notifications') ─────────►│ /rest/v1/rpc/get_user_notifications
└─────────────────────────────────────────────────────────────┘
```

### 4.3 Request Count Summary (per Navigation to /app/profile)

| Endpoint | Before Fix | After Fix | Mechanism |
|----------|------------|-----------|-----------|
| `/auth/v1/user` | 3+ | 1 | React `cache()` |
| `/rest/v1/users` | 2+ | 1 | `cache()` in getServerAuthContext |
| `/rest/v1/user_tenant_memberships` | 3+ | 1 server + 0-1 client | Server hydration |
| `/rest/v1/legal_documents` | 2-4 | 0 (cached) | `unstable_cache` TTL |
| `/rest/v1/user_legal_acceptances` | 2 | 1 | `cache()` |
| Browser RPC calls | 2× per hook | 1× | Single-flight |

---

## 5. Per-Route Deep Trace

### 5.1 `/app/profile/security` – "Betrodda enheter" Spinner FORENSIC TRACE

This is the **concrete failure case** visible in screenshots. **Full forensic evidence below.**

#### 5.1.1 Server Component Entry Point

**File:** [app/app/profile/security/page.tsx](../../../app/app/profile/security/page.tsx)

```typescript
// Line 22-23: Get user from server
const { data: { user } } = await supabase.auth.getUser();

// Line 55: Pass userEmail as prop to client component
<SecuritySettingsClient 
  hasMFA={hasTOTP || hasPhone}
  factorId={totpFactor?.id ?? phoneFactor?.id}
  userEmail={user.email}   // ← userEmail IS GUARANTEED if we reach this line (redirect on !user)
/>
```

**Verdict:** `userEmail` is **guaranteed to be defined** when `SecuritySettingsClient` renders, because the server component redirects to `/` if `!user`.

#### 5.1.2 Client Component Skip Conditions

**File:** [app/app/profile/security/SecuritySettingsClient.tsx](../../../app/app/profile/security/SecuritySettingsClient.tsx)

```typescript
// Lines 50-51: Cache keys include userEmail
const statusFetchKey = useMemo(() => `mfa-security-status-${userEmail || 'unknown'}`, [userEmail])
const devicesFetchKey = useMemo(() => `mfa-security-devices-${userEmail || 'unknown'}`, [userEmail])

// Lines 55-102: MFA status query
const { ... } = useProfileQuery<{ status: MFAStatus; factorId?: string }>(
  statusFetchKey,
  async (signal) => { ... },
  { userEmail },
  { timeout: 12000, skip: !userEmail }  // ← SKIP CONDITION: !userEmail
)

// Lines 104-122: Devices query (Betrodda enheter)
const { ... } = useProfileQuery<{ devices: MFATrustedDevice[] }>(
  devicesFetchKey,
  async (signal) => { ... },
  { userEmail },
  { timeout: 12000, skip: !userEmail }  // ← SKIP CONDITION: !userEmail
)
```

**Skip Condition Analysis:**
- Skip expression: `skip: !userEmail`
- `userEmail` is passed as prop from server component
- `userEmail` type: `string | undefined` (optional prop)
- **BUT** server component only renders this if `user.email` exists (Supabase always provides email for authenticated users)

**Verdict:** Skip condition `!userEmail` should **never be true** in normal flow because:
1. Server redirects if no user
2. Supabase users always have email
3. `user.email` is passed directly as prop

#### 5.1.3 Exact useProfileQuery Keys

| Query | Cache Key (exact) | Dependencies |
|-------|-------------------|--------------|
| MFA Status | `mfa-security-status-{email}` | `{ userEmail }` |
| Trusted Devices | `mfa-security-devices-{email}` | `{ userEmail }` |

Example: `mfa-security-devices-user@example.com`

#### 5.1.4 Timeout Configuration

Both queries use:
```typescript
{ timeout: 12000, skip: !userEmail }
```

**Expected behavior:**
- If `/api/accounts/auth/mfa/devices` takes >12s → `TimeoutError` thrown
- `isLoadingDevices` becomes `false`
- `devicesError` is set to timeout message
- UI shows error card with "Försök igen" (Retry) button

#### 5.1.5 "Laddar…" Stuck – Possible Root Causes

| Hypothesis | Can Occur? | Evidence | Likelihood |
|------------|------------|----------|------------|
| **H1:** `userEmail` is undefined | ❌ No | Server guarantees `user.email` before rendering client component | Eliminated |
| **H2:** Timeout doesn't trigger | ❌ No | `useProfileQuery` uses `withTimeout()` which always settles | Eliminated |
| **H3:** Screenshot captured during 0-12s window | ⚠️ Possible | No timestamp on screenshot | **Likely** |
| **H4:** `useProfileQuery` bug (loading never flips) | ❌ No | State machine has `finally` block that always sets status | Eliminated |
| **H5:** Fast navigation cancelled request | ⚠️ Possible | AbortController aborts on unmount | Low (would show empty, not stuck) |

#### 5.1.6 Required Verification Steps

To definitively diagnose the "Betrodda enheter" spinner:

| Step | Action | Expected Result |
|------|--------|-----------------|
| 1 | Enable DevTools → Network → Slow 3G | Simulate slow network |
| 2 | Navigate to `/app/profile/security` | Page loads, devices section shows "Laddar…" |
| 3 | Wait 12 seconds | Spinner should change to error UI |
| 4 | Check Console for `TimeoutError` | Should see: `TimeoutError: Timed out after 12000ms: useProfileQuery(mfa-security-devices-...)` |
| 5 | Click "Försök igen" | Should retry the fetch |

**If spinner persists after 12s:** File a bug with console output + network waterfall.

#### 5.1.7 API Route Chain

```
SecuritySettingsClient (Trusted Devices)
  │
  └─► useProfileQuery('mfa-security-devices-user@example.com', fetcher, { userEmail }, { timeout: 12000 })
        │
        └─► fetcher: fetch('/api/accounts/auth/mfa/devices', { credentials: 'include', signal })
              │
              └─► API Route Handler: app/api/accounts/auth/mfa/devices/route.ts
                    │
                    ├─► createServerRlsClient()           ← cache() per request
                    ├─► supabase.auth.getUser()           ← validates JWT
                    │     └─► /auth/v1/user
                    │
                    └─► supabase.from('mfa_trusted_devices').select()
                          │
                          └─► /rest/v1/mfa_trusted_devices?user_id=eq.{uid}
                                │
                                └─► RLS Policy: mfa_trusted_devices_owner
                                      │
                                      └─► USING (user_id = (SELECT auth.uid()) OR ...)
                                            │
                                            └─► Index: idx_mfa_trusted_devices_user (user_id)
```

### 5.2 `/app/profile/privacy` – No useProfileQuery (Risk)

```
privacy/page.tsx
  │
  ├─► useAuth() ──────────────────────────────────────► reads context
  ├─► useBrowserSupabase() ───────────────────────────► returns singleton
  │
  └─► useEffect(() => loadPrivacyData())
        │
        ├─► if (authLoading) return ──────────────────► ⚠️ Can leave isLoading=true if authLoading never settles
        ├─► if (supabaseError) { setIsLoading(false); return }
        ├─► if (!supabase) return ────────────────────► ⚠️ Can leave isLoading=true if supabase is slow
        ├─► if (!user?.id) { setIsLoading(false); return }
        │
        └─► ProfileService.getGDPRRequests(userId) ───► /rest/v1/gdpr_requests
            ProfileService.getUserConsents(userId) ───► /rest/v1/user_consents
              │
              └─► finally { setIsLoading(false) } ────► ✅ OK if try/finally is correct
```

**Risk:** If `supabase` remains null for a long time (SSR bailout), the page sits on loading skeleton indefinitely.

### 5.3 `/app/profile/achievements` – No useProfileQuery (Risk)

```
achievements/page.tsx
  │
  ├─► useAuth() ──────────────────────────────────────► reads context
  │
  └─► useEffect(() => loadAchievements())
        │
        ├─► if (authLoading) return ──────────────────► ⚠️ Early return, loading stays true
        ├─► if (!userId) { setIsLoading(false); return }
        │
        └─► getUserAchievementProgress(userId) ───────► (service function)
              │
              └─► supabase.from('achievements')... ──► /rest/v1/achievements
                    │
                    └─► supabase.from('user_achievements') ► /rest/v1/user_achievements
                          │
                          └─► RLS: user_id = auth.uid() OR unlocked = true
```

**Risk:** Same early-return pattern. If `authLoading` is true for extended period, page shows skeleton.

### 5.4 `/app/profile/friends` – No useProfileQuery + eslint-disable

```
friends/page.tsx
  │
  ├─► /* eslint-disable react-hooks/set-state-in-effect */ ← ⚠️ Signals problematic patterns
  │
  ├─► useAuth() ──────────────────────────────────────► reads context
  │
  └─► useEffect(() => loadData())
        │
        ├─► if (authLoading) return ──────────────────► ⚠️ Early return
        ├─► if (!userId) { setIsLoading(false); return }
        │
        └─► Promise.all([
              getFriends(userId),
              getFriendRequests(userId, 'received'),
              getFriendRequests(userId, 'sent'),
            ])
              │
              └─► supabase.from('friendships')... ────► /rest/v1/friendships
                    │
                    └─► supabase.from('users').select().in('id', friendIds)
                          │
                          └─► /rest/v1/users?id=in.(...)
```

**Risks:**
1. Same early-return issue
2. `eslint-disable` suggests the code has side-effect issues the author couldn't resolve
3. `Promise.all` – if one query hangs, all block

---

## 6. "Spinner Forever" Failure Mode Matrix (Extended)

### 6.1 Comprehensive Failure Mode Catalogue

| ID | Failure Mode | Root Cause | Affected Files | Can Still Occur? | Mitigation |
|----|--------------|------------|----------------|------------------|------------|
| FM1 | `authLoading` never becomes false | AuthProvider initialization race | All profile pages | ❌ No (server hydration) | Server hydrates initial state |
| FM2 | `supabase` client null indefinitely | Browser SSR check fails | Pages using `useBrowserSupabase()` | ⚠️ Low risk | `createBrowserClient()` singleton |
| FM3 | Supabase fetch hangs (network/DB) | No timeout on fetch | All Supabase calls | ❌ No | `createFetchWithTimeout` with AbortController |
| FM4 | Error caught but loading not cleared | `catch` without `finally` | privacy, achievements, friends | ⚠️ Yes | Need `useProfileQuery` migration |
| FM5 | StrictMode double-fetch races | Cleanup not aborting in-flight | Client hooks | ❌ No | Generation tracking + abort |
| FM6 | JSON.stringify circular reference | Supabase client in deps | `useProfileQuery` | ❌ No | `depToKey()` with WeakMap |
| FM7 | useMemo performs setState | Side effect during render | Refactored pages | ❌ No | Moved to useEffect |
| FM8 | Early return before setting loading=false | `if (!x) return` without state update | privacy, achievements, friends | ⚠️ Yes | Add state update before return |
| FM9 | Promise.all with one hanging query | All queries block on slowest | friends, privacy, activity | ⚠️ Partial | Activity uses useProfileQuery |
| FM10 | API route re-authenticates slowly | Extra round-trip to auth server | security (MFA status/devices) | ⚠️ Low | Cached per-request on server |
| FM11 | RLS policy returns empty (not error) | UI shows loading, no data, no error | notification_preferences, user_preferences | ⚠️ Low | Service returns fallback defaults |
| FM12 | i18n render crash leaves subtree stuck | Missing translation key crashes | All pages with `useTranslations()` | ⚠️ Partial | Provider at root; missing key = inline fallback |
| FM13 | Global mount (NotificationBell) hangs | `get_user_notifications` slow | NotificationBell in header | ⚠️ Low | Has timeout; no explicit error UI in bell |

### 6.2 State Machine Guarantees

The `useProfileQuery` hook implements a strict state machine:

```
┌───────┐
│ idle  │◄─────── skip=true OR initial mount before effect
└───┬───┘
    │ skip=false, effect runs
    ▼
┌─────────┐
│ loading │◄─────── executeQuery() called
└────┬────┘
     │
     ├─── success ────► ┌─────────┐
     │                  │ success │ data set, error null
     │                  └─────────┘
     │
     ├─── error ──────► ┌───────┐
     │                  │ error │ error set, data preserved
     │                  └───────┘
     │
     └─── timeout ────► ┌─────────┐
                        │ timeout │ TimeoutError surfaced
                        └─────────┘
```

**Invariant:** Every code path through `executeQuery()` MUST set status to a terminal state (`success|error|timeout`) before returning.

### 6.3 Evidence: Timeout Wrapper Ensures Settlement

From [hooks/useProfileQuery.ts#L186](../../../hooks/useProfileQuery.ts#L186):

```typescript
// Wrap the fetch with timeout to ensure it always settles
const promise = withTimeout(fetchPromise, timeout, `useProfileQuery(${key})`).catch((err) => {
  if (err instanceof TimeoutError) {
    throw err // Re-throw to be caught by outer try/catch
  }
  throw err
})
```

This guarantees that even if the underlying fetcher ignores AbortSignal, the promise will reject after `timeout` ms.

---

## 7. Request-Storm Map (Endpoint → Call Sites)

### 7.0 Per-Route Request Budget (Aggregated)

**Purpose:** Answer "When I navigate to X, what is the total request count and which are global vs route-specific?"

#### `/app/profile/security` – Full Request Budget

| Category | Endpoint | Source | Cached? | Count |
|----------|----------|--------|---------|-------|
| **Global (Layout)** | `/auth/v1/user` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/users` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/user_tenant_memberships` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/legal_documents` | getPendingLegalDocuments() | ✅ 5min TTL | 0* |
| **Global (Layout)** | `/rest/v1/user_legal_acceptances` | getPendingLegalDocuments() | ✅ `cache()` | 1 |
| **Global (Bell)** | `rpc/get_user_notifications` | NotificationBell | ✅ Single-flight | 1 |
| **Route (Server)** | `/auth/v1/user` | security/page.tsx | ✅ `cache()` | 0** |
| **Route (Server)** | `/auth/v1/user` (mfa.listFactors) | security/page.tsx | ❌ No | 1 |
| **Route (Client)** | `/api/accounts/auth/mfa/status` | SecuritySettingsClient | ✅ `useProfileQuery` | 1 |
| **Route (Client)** | `/api/accounts/auth/mfa/devices` | SecuritySettingsClient | ✅ `useProfileQuery` | 1 |
| | | | **TOTAL** | **8** |

\* Cached after first load (5 min TTL)
\** Reuses cached client from layout

#### `/app/profile` (Overview) – Full Request Budget

| Category | Endpoint | Source | Cached? | Count |
|----------|----------|--------|---------|-------|
| **Global (Layout)** | `/auth/v1/user` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/users` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/user_tenant_memberships` | getServerAuthContext() | ✅ `cache()` | 1 |
| **Global (Layout)** | `/rest/v1/legal_documents` | getPendingLegalDocuments() | ✅ 5min TTL | 0* |
| **Global (Layout)** | `/rest/v1/user_legal_acceptances` | getPendingLegalDocuments() | ✅ `cache()` | 1 |
| **Global (Bell)** | `rpc/get_user_notifications` | NotificationBell | ✅ Single-flight | 1 |
| **Route (Client)** | `/api/accounts/auth/mfa/status` | profile/page.tsx | ✅ `useProfileQuery` | 1 |
| | | | **TOTAL** | **6** |

#### Request Distribution Summary

| Route | Global Mounts | Route-Specific | Total | "All Dies" Risk |
|-------|---------------|----------------|-------|-----------------|
| `/app/profile` | 5 | 1 | 6 | Low (all have timeout) |
| `/app/profile/security` | 5 | 3 | 8 | Low (all have timeout) |
| `/app/profile/preferences` | 5 | 1 | 6 | Low |
| `/app/profile/organizations` | 5 | 1 | 6 | Low |
| `/app/profile/privacy` | 5 | 2 | 7 | ⚠️ Medium (manual useEffect) |
| `/app/profile/friends` | 5 | 3 | 8 | ⚠️ Medium (Promise.all, manual useEffect) |

**Key Insight:** If global mounts (5 requests) all timeout simultaneously, user sees "all dies" effect. This is mitigated by:
1. Server-side `cache()` means most are deduplicated
2. All have timeout wrappers
3. `unstable_cache` for legal docs means 0 requests after first load

### 7.1 Endpoint to Call Site Matrix

| Endpoint | Call Site 1 | Call Site 2 | Call Site 3 | Call Site 4 | Dedupe? |
|----------|-------------|-------------|-------------|-------------|---------|
| `/auth/v1/user` | `getServerAuthContext()` | `AuthProvider.initAuth()` | API routes (MFA) | `supabase.auth.getUser()` (any) | ✅ Server: `cache()` |
| `/rest/v1/users` | `getServerAuthContext()` | `AuthProvider.ensureProfile()` | - | - | ✅ Server: `cache()` |
| `/rest/v1/user_tenant_memberships` | `getServerAuthContext()` | `TenantContext.loadTenants()` | - | - | ✅ Server + client single-flight |
| `/rest/v1/legal_documents` | `getRequiredLegalDocuments()` | - | - | - | ✅ `unstable_cache` 5 min |
| `/rest/v1/user_legal_acceptances` | `getUserAcceptedDocTypes()` | - | - | - | ✅ `cache()` |
| `/rest/v1/user_preferences` | `PreferencesContext.syncUserPreferences()` | `ProfileService.getPreferences()` | - | - | ⚠️ Different paths |
| `/rest/v1/notification_preferences` | `ProfileService.getNotificationSettings()` | - | - | - | ✅ Single path |
| `rpc/get_user_notifications` | `useAppNotifications()` | - | - | - | ✅ Single-flight |
| `/api/accounts/auth/mfa/status` | `SecuritySettingsClient` | `/app/profile` (overview MFA) | - | - | ✅ `useProfileQuery` cache key |
| `/api/accounts/auth/mfa/devices` | `SecuritySettingsClient` | - | - | - | ✅ `useProfileQuery` |

### 7.2 StrictMode / Fast Refresh Duplication

**React StrictMode:** Double-invokes effects in development.

**Before fix:** Each `useEffect` that called Supabase would fire 2× per mount, resulting in duplicate network calls.

**After fix:** 
- `useProfileQuery`: Uses module-level `inFlightRequests` Map + generation counter
- `useAppNotifications`: Uses module-level `inFlightFetch` + `fetchGeneration`
- Server-side: `cache()` is per-request, no duplication

**Fast Refresh:** Re-runs effects when file changes in dev.

**Risk:** Module-level Maps persist across Fast Refresh, which is correct behavior. However, if the fetcher function signature changes, the old cached promise may have wrong behavior. This is acceptable for dev-only.

### 7.3 Paths That May Bypass Timeout (CORRECTED)

**IMPORTANT CORRECTION:** The browser Supabase client (`lib/supabase/client.ts`) uses `createFetchWithTimeout` for ALL requests globally. This means every `.from()`, `.rpc()`, and `.auth.*` call goes through the timeout wrapper.

| Path | Hook-Level Timeout? | Client-Level Timeout? | Effective Coverage |
|------|---------------------|----------------------|-------------------|
| `ProfileService.*` via `useProfileQuery` | ✅ Yes (withTimeout) | ✅ Yes | Double protection |
| `ProfileService.*` via manual `useEffect` | ❌ No | ✅ Yes | Single layer |
| `PreferencesContext.syncUserPreferences()` | ❌ No | ✅ Yes | Single layer |
| `AuthProvider.updateProfile()` | ❌ No | ✅ Yes | Single layer |
| `getFriends()`, `getFriendRequests()` | ❌ No | ✅ Yes | Single layer |
| `getUserAchievementProgress()` | ⚠️ Partial | ✅ Yes | Mixed |
| `useAppNotifications` RPC | ✅ Yes (12s) | ✅ Yes | Double protection |

**Verdict:** No Supabase calls can hang indefinitely due to global `createFetchWithTimeout`. The risk is only that some paths have single-layer protection instead of double.

---

## 8. Supabase + Auth + Tenant Robustness Audit (Extended)

### 8.1 Server-Side Client Caching

**File:** [lib/supabase/server.ts](../../../lib/supabase/server.ts)

```typescript
// Line 30-34: Cache within single RSC/server-action request
const createServerRlsClientCached = cache(async () => {
  const cookieStore = await cookies()
  // ... client creation
})
```

**Verdict:** ✅ Correctly scoped to request lifetime via React `cache()`.

### 8.2 Browser Client Singleton

**File:** [lib/supabase/client.ts](../../../lib/supabase/client.ts)

```typescript
// Line 76-82: Singleton pattern
let browserClient: SupabaseClient<Database> | null = null

export function createBrowserClient() {
  if (typeof window === 'undefined') {
    throw new Error('createBrowserClient must be called in the browser')
  }
  if (!browserClient) {
    browserClient = instantiateBrowserClient()
  }
  return browserClient
}
```

**Verdict:** ✅ Single instance across entire client lifecycle.

### 8.3 Auth State Hydration

**File:** [app/server-providers.tsx](../../../app/server-providers.tsx)

```typescript
export default async function ServerProviders({ children }) {
  const authContext = await getServerAuthContext()
  return (
    <Providers
      initialUser={authContext.user}
      initialProfile={authContext.profile}
      initialMemberships={authContext.memberships}
    >
```

**Verdict:** ✅ Server fetches auth once, hydrates client providers.

### 8.4 Tenant Context Single-Flight

**File:** [lib/context/TenantContext.tsx#L99-112](../../../lib/context/TenantContext.tsx#L99-L112)

```typescript
const loadTenantsInFlightRef = useRef<{ userId: string; promise: Promise<void> } | null>(null)

const loadTenants = useCallback(async () => {
  const inFlight = loadTenantsInFlightRef.current
  if (inFlight?.userId === userId) {
    return inFlight.promise // Reuse existing request
  }
  // ...
})
```

**Verdict:** ✅ Prevents duplicate concurrent tenant resolution.

### 8.5 Auth Event Handling

**File:** [lib/supabase/auth.tsx#L188-199](../../../lib/supabase/auth.tsx#L188-L199)

```typescript
if (event === 'INITIAL_SESSION') return // Skip duplicate init

if (event === 'SIGNED_OUT') {
  // Clear cookies, state, redirect
}

if (event === 'SIGNED_IN' && session?.user) {
  const { data: { user: authUser } } = await supabase.auth.getUser() // Validate
  // ...
}
```

**Verdict:** ✅ Uses `getUser()` for validation (not trusting session from cookies).

### 8.6 Multi-Tenant Edge Cases

**Concern:** Users with both organization memberships AND personal tenant.

**Mitigation:**
- `getServerAuthContext()` calls `resolveTenant()` which deterministically selects:
  1. Tenant from cookie (`lb_tenant`)
  2. Primary tenant from memberships
  3. First active tenant

**Evidence in:** [lib/auth/server-context.ts#L55-61](../../../lib/auth/server-context.ts#L55-L61)

**Verdict:** ✅ Deterministic resolution, no ambiguous multi-row queries.

---

## 9. next-intl / i18n Boundary Audit (EXPANDED)

### 9.1 Provider Hierarchy

```
<html lang={locale}>                    ◄── Server: getLocale()
  <NextIntlClientProvider messages={messages}>  ◄── Server: getMessages()
    <ServerProviders>
      <Providers>                        ◄── Client wrapper
        <AuthProvider>
          <PreferencesProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </PreferencesProvider>
        </AuthProvider>
      </Providers>
    </ServerProviders>
  </NextIntlClientProvider>
</html>
```

### 9.2 Profile Pages Translation Usage

| Page | Hook Call | Evidence |
|------|-----------|----------|
| /app/profile/page.tsx | `useTranslations('app.profile')` | Line 3-4 |
| /app/profile/preferences/page.tsx | `useTranslations('app.profile')` | Line 7 |
| /app/profile/organizations/page.tsx | `useTranslations('app.profile')` | Line 4 |
| /app/profile/activity/page.tsx | `useTranslations('app.profile')` | Line 6 |
| /app/profile/general/page.tsx | `useTranslations('app.profile')` | Line 4 |
| /app/profile/account/page.tsx | `useTranslations('app.profile')` | Line 4 |
| /app/profile/privacy/page.tsx | `useTranslations('app.profile')` | Line 4 |

### 9.3 MISSING_MESSAGE Risk – Distinguishing Error Classes

**Class 1: Missing Translation Key (Benign)**
- Symptom: `MISSING_MESSAGE: Could not resolve 'app.profile.xxx'`
- Cause: Key not in message files
- Impact: Fallback text shown, no crash
- Fix: Add translation key

**Class 2: Provider Context Missing (Critical)**
- Symptom: `Error: [next-intl] No messages were found for locale 'xx'.` or `useTranslations` throws
- Cause: `NextIntlClientProvider` not wrapping component (e.g., after RSC error fallback)
- Impact: Component crashes, no UI rendered
- Fix: Ensure error boundaries don't skip provider

### 9.4 Error Boundary Analysis for Profile Routes

**Question:** Does an `error.tsx` exist that could catch RSC failures and skip i18n provider?

| Path | error.tsx Exists? | Risk |
|------|-------------------|------|
| `app/error.tsx` | ❌ No | Medium |
| `app/app/error.tsx` | ❌ No | Medium |
| `app/app/profile/error.tsx` | ❌ No | Medium |
| `app/demo/error.tsx` | ✅ Yes | Demo-specific |

**Verdict:** No error.tsx files exist in the profile route hierarchy. This means:
1. RSC errors bubble up to Next.js default error handling
2. Client errors are not caught by React error boundaries
3. **No risk of error boundary skipping i18n provider** (because there is no error boundary)

However, this also means:
- ⚠️ Unhandled errors cause full page crash with Next.js default error UI
- ⚠️ No graceful degradation for profile routes

### 9.5 Next.js App Router RSC Failure Behavior

**Scenario:** Root layout RSC fails (e.g., `getServerAuthContext()` throws)

**Behavior in this repo:**
1. `app/layout.tsx` is server component
2. If `getServerAuthContext()` throws, entire page fails
3. Next.js shows default error page (no `error.tsx` to catch it)
4. `NextIntlClientProvider` never mounts
5. Client components inside would crash if they called `useTranslations()`

**Mitigation in place:**
- `getServerAuthContext()` catches errors internally and returns partial data
- `getPendingLegalDocuments()` returns empty array on error
- Layout is designed to not throw

### 9.6 SideNav useTranslations Usage

**From original investigation:** SideNav was mentioned as using `useTranslations()` without namespace.

**Current state verified:**

```typescript
// components/app/SideNav.tsx - Line 8
import { useTranslations } from 'next-intl'

// Line 26
const t = useTranslations('app.nav')  // ← HAS NAMESPACE
```

**Verdict:** ✅ SideNav uses namespace correctly. No issue.

### 9.7 Locale-Dependent Data Fetching

**File:** [lib/legal/cached-legal.ts#L27-34](../../../lib/legal/cached-legal.ts#L27-L34)

```typescript
function buildLocaleCandidates(locale: Locale): Locale[] {
  const candidates = [locale, ...(fallbackLocales[locale] ?? [])]
  if (!candidates.includes(defaultLocale)) {
    candidates.push(defaultLocale)
  }
  return Array.from(new Set(candidates))
}
```

**Verdict:** ✅ Graceful fallback chain for legal docs localization.

---

## 10. DB/RLS Touchpoints Relevant to Profile

### 10.1 Tables Touched by Profile Routes

| Table | Route(s) | Query Type | RLS Policy | Risk |
|-------|----------|------------|------------|------|
| `users` | All (via auth context) | SELECT by id | `user_id = auth.uid()` | ❌ Low |
| `user_profiles` | general, preferences | SELECT/UPDATE | `user_id = auth.uid()` | ❌ Low |
| `user_preferences` | preferences | SELECT/UPSERT | `user_id = auth.uid() AND tenant_id` | ⚠️ Multi-tenant |
| `user_tenant_memberships` | organizations, auth context | SELECT | `user_id = auth.uid()` | ❌ Low |
| `tenants` | organizations | SELECT (via join) | Via membership join | ❌ Low |
| `notification_preferences` | (redirected away) | SELECT/UPSERT | `user_id = auth.uid()` | ⚠️ tenant_id IS NULL edge case |
| `notification_deliveries` | NotificationBell | SELECT via RPC | `user_id = auth.uid()` | ❌ Low |
| `legal_documents` | layout (cached) | SELECT | Public read | ❌ Low |
| `user_legal_acceptances` | layout | SELECT | `user_id = auth.uid()` | ❌ Low |
| `mfa_trusted_devices` | security | SELECT | `user_id = auth.uid()` | ❌ Low |
| `gdpr_requests` | privacy | SELECT/INSERT | `user_id = auth.uid()` | ❌ Low |
| `user_consents` | privacy | SELECT | `user_id = auth.uid()` | ❌ Low |
| `achievements` | achievements | SELECT | Public read | ❌ Low |
| `user_achievements` | achievements | SELECT | `user_id = auth.uid()` | ❌ Low |
| `friendships` | friends | SELECT | `user_id_1 OR user_id_2 = auth.uid()` | ❌ Low |
| `friend_requests` | friends | SELECT | `sender_id OR receiver_id = auth.uid()` | ❌ Low |
| `activity_logs` | activity | SELECT | `user_id = auth.uid()` | ❌ Low |
| `user_sessions` | activity | SELECT | `user_id = auth.uid()` | ❌ Low |

### 10.2 Verified RLS Policy Definitions (Critical Tables)

#### mfa_trusted_devices

**Source:** [supabase/migrations/20260113200000_mfa_enterprise_foundation.sql#L164-171](../../../supabase/migrations/20260113200000_mfa_enterprise_foundation.sql#L164-L171)

```sql
CREATE POLICY mfa_trusted_devices_owner ON public.mfa_trusted_devices
  FOR ALL TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin()
    OR public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
    OR public.is_system_admin()
  );
```

**Indexes:**
- `idx_mfa_trusted_devices_user` ON `(user_id)` ✅
- `idx_mfa_trusted_devices_tenant` ON `(tenant_id)` ✅
- `idx_mfa_trusted_devices_user_tenant` ON `(user_id, tenant_id)` ✅

**Query pattern:** `SELECT * FROM mfa_trusted_devices WHERE user_id = $1`
**Index hit:** ✅ Uses `idx_mfa_trusted_devices_user`

#### user_preferences

**Source:** [supabase/migrations/20260108000019_auth_uid_initplan_batch2.sql#L322-323](../../../supabase/migrations/20260108000019_auth_uid_initplan_batch2.sql#L322-L323)

```sql
CREATE POLICY "user_preferences_select" ON public.user_preferences 
  FOR SELECT TO authenticated 
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "user_preferences_update" ON public.user_preferences 
  FOR UPDATE TO authenticated 
  USING (user_id = (SELECT auth.uid())) 
  WITH CHECK (user_id = (SELECT auth.uid()));
```

**Query pattern:** `SELECT * FROM user_preferences WHERE user_id = $1 AND tenant_id = $2`
**Risk:** If no index on `(user_id, tenant_id)`, may be slow for users with many tenants.

#### user_tenant_memberships

**Source:** [supabase/migrations/20260108000021_consolidate_permissive_final.sql#L113-121](../../../supabase/migrations/20260108000021_consolidate_permissive_final.sql#L113-L121)

```sql
CREATE POLICY "user_tenant_memberships_select" ON public.user_tenant_memberships
  FOR SELECT TO authenticated
  USING (
    -- Own memberships
    user_id = (SELECT auth.uid())
    -- System admin sees all
    OR is_system_admin()
    -- Tenant members can see each other (for team features)
    OR tenant_id = ANY(get_user_tenant_ids())
  );
```

**Note:** Uses `get_user_tenant_ids()` function which may have performance implications for users in many tenants.

### 10.3 get_user_notifications RPC Analysis

**Source:** [supabase/migrations/20260130100000_notification_deliveries.sql#L285-320](../../../supabase/migrations/20260130100000_notification_deliveries.sql#L285-L320)

```sql
CREATE OR REPLACE FUNCTION public.get_user_notifications(p_limit INTEGER DEFAULT 20)
RETURNS TABLE (...)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    nd.id, nd.notification_id, nd.delivered_at, nd.read_at, nd.dismissed_at,
    n.title, n.message, n.type, n.category, n.action_url, n.action_label
  FROM notification_deliveries nd
  JOIN notifications n ON n.id = nd.notification_id
  WHERE nd.user_id = auth.uid()
    AND nd.dismissed_at IS NULL
  ORDER BY nd.delivered_at DESC
  LIMIT p_limit;
$$;
```

**Query Analysis:**
- **JOIN:** `notification_deliveries` ↔ `notifications` on `notification_id`
- **Filter:** `user_id = auth.uid()` AND `dismissed_at IS NULL`
- **ORDER BY:** `delivered_at DESC`
- **LIMIT:** 20 (default)

**Required Indexes:**
- `notification_deliveries(user_id, dismissed_at, delivered_at DESC)` – composite for filter + sort
- `notifications(id)` – PK, already indexed

**Potential Slow Query Risk:** If user has thousands of notification deliveries over time, the `ORDER BY delivered_at DESC` without proper index could cause sequential scan.

### 10.4 Multi-Tenant Edge Cases

**Problem:** Users with multiple tenants (org + personal license) can have multiple rows in `user_preferences`.

**Query pattern:** 
```sql
SELECT * FROM user_preferences 
WHERE user_id = $1 AND tenant_id = $2
```

**Risk:** If `tenant_id` is null or wrong, query returns wrong/empty data.

**Mitigation:** `ProfileService.getPreferences()` queries with current tenant context.

### 10.5 Empty vs Error Handling

| Query Result | UI Behavior | Risk |
|--------------|-------------|------|
| 0 rows | Shows "no data" or defaults | ❌ Low |
| Error (RLS denied) | Error bubbles up | ⚠️ Should show error UI |
| Timeout | Timeout error thrown | ✅ Handled |
| DB lock | Query hangs → timeout | ✅ Handled |

---

## 11. Request Storms & Dedupe Audit (Original Section 6)

From [PROFILE_LOADING_INVESTIGATION.md#L156-167](../../../docs/reports/PROFILE_LOADING_INVESTIGATION.md#L156-L167):

```
User captured logs with [supabase fetch:*] instrumentation:
- Many repeated server requests per navigation:
  - /auth/v1/user (200) ×3+
  - /rest/v1/users?... (200) ×2+
  - /rest/v1/user_tenant_memberships?... (200) ×3+
  - /rest/v1/legal_documents?... (200) ×2+ (per type)
- Browser duplicated calls (2×) to:
  - /rest/v1/rpc/get_user_notifications (200)
```

### 11.2 Dedupe Mechanisms Implemented

| Mechanism | Scope | File | Lines |
|-----------|-------|------|-------|
| React `cache()` | Per-request (server) | lib/supabase/server.ts | 30-34 |
| React `cache()` | Per-request (server) | lib/auth/server-context.ts | 15-18 |
| `unstable_cache` | TTL 5 min (cross-request) | lib/legal/cached-legal.ts | 81-87 |
| Module-level Map | Per-tab (client) | hooks/useProfileQuery.ts | 56-61 |
| Module-level ref | Per-tab (client) | hooks/useAppNotifications.ts | 83-84 |
| useRef in-flight | Per-component (client) | lib/context/TenantContext.tsx | 99-100 |

### 11.3 Single-Flight Pattern (useProfileQuery)

**File:** [hooks/useProfileQuery.ts#L56-63](../../../hooks/useProfileQuery.ts#L56-L63)

```typescript
// Module-level cache for in-flight requests (survives re-renders, StrictMode-safe)
const inFlightRequests = new Map<
  string,
  { promise: Promise<unknown>; depsKey: string }
>()
```

**Key Generation:** [hooks/useProfileQuery.ts#L65-85](../../../hooks/useProfileQuery.ts#L65-L85)

```typescript
// Safe serialization that handles circular refs (Supabase clients)
const objectIdMap = new WeakMap<object, number>()
let nextObjectId = 1

function depToKey(value: unknown): string {
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  if (typeof value !== 'object') {
    return typeof value === 'function' ? `fn:${value.name || 'anon'}` : String(value)
  }
  // Use stable object identity instead of JSON.stringify
  let id = objectIdMap.get(value)
  if (!id) {
    id = nextObjectId++
    objectIdMap.set(value, id)
  }
  return `obj:${id}`
}
```

**Verdict:** ✅ Handles Supabase client objects without circular reference crashes.

### 11.4 StrictMode Safety

**Concern:** React StrictMode double-invokes effects in development.

**Mitigations:**
1. **Generation tracking:** Each effect run increments `requestGeneration.current`, stale responses are ignored
2. **AbortController:** Cleanup function aborts previous request
3. **In-flight reuse:** Second effect invocation reuses the same promise

**Evidence:** [hooks/useProfileQuery.ts#L168-175](../../../hooks/useProfileQuery.ts#L168-L175)

```typescript
// Increment generation to invalidate any in-flight requests from previous renders
requestGeneration.current += 1
const generation = requestGeneration.current
// ...
// Only update if this is still the current generation
if (requestGeneration.current === generation) {
  setData(result)
```

---

## 12. Code Quality Findings

### 12.1 Patterns Observed

| Pattern | Status | Notes |
|---------|--------|-------|
| State machine for async | ✅ Adopted | `useProfileQuery` uses `status` enum |
| Single-flight deduplication | ✅ Adopted | Module-level Map + WeakMap |
| Timeout with AbortController | ✅ Adopted | All Supabase fetches wrapped |
| Server→client hydration | ✅ Adopted | Auth, tenant, i18n |
| Error boundaries | ⚠️ Partial | No React error boundary for profile routes |
| Retry with backoff | ⚠️ Manual | User must click retry button |

### 12.2 Remaining Technical Debt

| Item | Priority | Recommendation |
|------|----------|----------------|
| No `loading.tsx` for `/app/profile/*` | Low | Consider adding for instant loading UI |
| Manual retry only | Low | Consider auto-retry with exponential backoff |
| No error boundary | Medium | Add `error.tsx` for profile routes |
| Privacy/Achievements/Friends pages not using useProfileQuery | Medium | Migrate for consistency |
| `eslint-disable react-hooks/set-state-in-effect` in friends/page.tsx | Low | Refactor to remove warning |

### 12.3 Pages Not Yet Using useProfileQuery

| Page | Current Pattern | Risk |
|------|-----------------|------|
| /app/profile/privacy/page.tsx | Manual useEffect + useState | FM4 possible |
| /app/profile/achievements/page.tsx | Manual useEffect + useState | FM4 possible |
| /app/profile/friends/page.tsx | Manual useEffect + useState | FM4 possible |
| /app/profile/general/page.tsx | Uses `isLoading` from `useAuth()` only | Lower risk |
| /app/profile/account/page.tsx | Uses `useAuth()` + manual operations | Lower risk |

---

## 13. Gaps in Current Evidence + Capture Checklist

### 13.1 Missing Evidence

| Gap | How to Capture |
|-----|----------------|
| Actual request counts post-fix | DevTools Network + Console during navigation |
| "Betrodda enheter" repro steps | Slow 3G + navigate to /app/profile/security |
| Which query hangs during failure | Console `[supabase fetch:*]` logs with timing |
| RLS policy evaluation time | Supabase Dashboard → Logs → Query execution time |
| Multi-tenant user behavior | Test with user who has org + personal license |
| Demo user behavior | Test with demo account (no DB persistence) |

### 13.2 Minimal Repro Matrix

| Scenario | Steps | What to Observe |
|----------|-------|------------------|
| Normal load | Navigate /app → /app/profile | All sections load within 2s |
| Slow network | Throttle to Slow 3G, navigate | Timeout message after 10-12s |
| Offline | Go offline, navigate | Error UI + retry button |
| StrictMode | Dev mode, navigate | Console shows 1x RPC per intent |
| Fast back-forward | Click 5 pages quickly | No stuck spinners |
| Background tab | Navigate, switch tabs 60s, return | Page still functional |

### 13.3 Console Lines to Watch For

```
[supabase fetch:*] start { method, url, timeoutMs }   ← Request started
[supabase fetch:*] done { method, url, status, elapsedMs }  ← Request completed
[supabase fetch:*] timeout { method, url, timeoutMs }  ← Request timed out
TimeoutError: Timed out after Xms: ...  ← Promise rejected
```

### 13.4 Automated Verification

```bash
# Type check
npm run type-check

# Unit tests
npx vitest run

# Build (catches server/client boundary issues)
npm run build
```

### 13.5 Manual Verification Steps

#### Step 1: Request Count Verification

1. Open DevTools → Console
2. Enable verbose logging (ensure `NODE_ENV=development`)
3. Navigate: `/` → `/app` → `/app/profile`
4. Count `[supabase fetch:*]` log lines

**Expected:**
- `/auth/v1/user`: 1× per navigation
- `/rest/v1/legal_documents`: 0× (cached after first load)
- `/rest/v1/rpc/get_user_notifications`: 1× (not 2×)

#### Step 2: Timeout Behavior

1. Simulate slow network (DevTools → Network → Slow 3G)
2. Navigate to `/app/profile/preferences`
3. Wait 10-15 seconds

**Expected:**
- After ~10s: Timeout message appears with retry button
- Console shows: `TimeoutError: Timed out after 10000ms`

#### Step 3: Error Recovery

1. Disconnect network (DevTools → Network → Offline)
2. Navigate to `/app/profile/organizations`
3. Wait for error state
4. Reconnect network
5. Click "Försök igen" (Retry)

**Expected:**
- Error UI shown with retry button
- After retry: Data loads successfully

#### Step 4: StrictMode Validation (Development Only)

1. Ensure React StrictMode is enabled (default in Next.js dev)
2. Navigate to `/app/profile`
3. Check console for duplicate RPC calls

**Expected:**
- `rpc/get_user_notifications` appears 1× in logs (not 2×)
- No "stale state" warnings

### 13.6 Regression Test Scenarios

| Scenario | Steps | Expected Outcome |
|----------|-------|------------------|
| Fast navigation | Click 5 profile subpages quickly | No stuck spinners, no console errors |
| Tab backgrounding | Navigate to profile, switch tabs 30s, return | Page remains functional |
| Auth session refresh | Wait for session expiry, interact | Graceful re-auth or redirect |
| Multi-tenant switch | Switch tenant via selector on profile page | Data reloads for new tenant |
| Network blip | Disconnect/reconnect during load | Error UI → Retry → Success |

### 13.7 Monitoring Recommendations

1. **Supabase Dashboard:** Monitor query execution times for `user_preferences`, `user_tenant_memberships`
2. **Error Tracking:** Set up alerts for `TimeoutError` in production logs
3. **RUM (Real User Monitoring):** Track profile page load times (P50, P95, P99)

---

## Appendix A: File Dependency Graph (Extended)

### A.1 Global Mount Dependency Chain

```
app/layout.tsx
  └─► NextIntlClientProvider
        └─► app/server-providers.tsx
              └─► lib/auth/server-context.ts
              │     └─► lib/supabase/server.ts
              │           └─► lib/supabase/fetch-with-timeout.ts
              │     └─► lib/tenant/resolver.ts
              │
              └─► app/providers.tsx
                    └─► lib/supabase/auth.tsx
                    │     └─► lib/supabase/client.ts
                    │           └─► lib/supabase/fetch-with-timeout.ts
                    │     └─► lib/auth/role.ts
                    │
                    └─► lib/context/PreferencesContext.tsx
                    │     └─► lib/supabase/client.ts
                    │     └─► lib/i18n/config.ts
                    │
                    └─► lib/cart/CartContext.tsx
```

### A.2 App Layout Dependency Chain

```
app/app/layout.tsx (Server)
  └─► lib/auth/server-context.ts (cached, reused from root)
  └─► lib/legal/cached-legal.ts
  │     └─► next/cache unstable_cache
  │     └─► lib/supabase/server.ts
  │
  └─► lib/context/TenantContext.tsx
        └─► app/actions/tenant.ts (server action)
              └─► lib/tenant/resolver.ts
                    └─► lib/supabase/server.ts
```

### A.3 Profile Page Dependency Chain (Example: /app/profile/organizations)

```
app/app/profile/organizations/page.tsx (Client)
  │
  ├─► hooks/useProfileQuery.ts
  │     └─► lib/utils/withTimeout.ts
  │
  ├─► hooks/useBrowserSupabase.ts
  │     └─► lib/supabase/client.ts
  │           └─► lib/supabase/fetch-with-timeout.ts
  │                 └─► lib/utils/withTimeout.ts (TimeoutError class)
  │
  ├─► lib/supabase/auth.tsx (useAuth hook)
  │     └─► React Context (no fetch on read)
  │
  └─► lib/profile/profile-service.client.ts
        └─► supabase.from('user_tenant_memberships')
              └─► /rest/v1/user_tenant_memberships
                    └─► RLS: user_id = auth.uid()
                          └─► DB: user_tenant_memberships table
                                └─► JOIN tenants table
```

### A.4 Security Page 6-Hop Trace

```
/app/profile/security (User Click)
  │
  └─► RSC: security/page.tsx
        │
        └─► createServerRlsClient()
              │
              └─► supabase.auth.getUser()
                    │
                    └─► fetch('/auth/v1/user')
                          │
                          └─► Supabase Auth Server
                                │
                                └─► validates JWT
                                      │
                                      └─► returns user + factors
```

```
SecuritySettingsClient (Trusted Devices)
  │
  └─► useProfileQuery('mfa-security-devices-...')
        │
        └─► fetcher: fetch('/api/accounts/auth/mfa/devices')
              │
              └─► API Route Handler
                    │
                    └─► createServerRlsClient()
                          │
                          └─► supabase.from('mfa_trusted_devices').select()
                                │
                                └─► fetch('/rest/v1/mfa_trusted_devices?...')
                                      │
                                      └─► PostgREST
                                            │
                                            └─► RLS: user_id = auth.uid()
                                                  │
                                                  └─► DB query + index scan
```

---

## Appendix B: Timeline of Changes

| Date | Change | Files Modified |
|------|--------|----------------|
| 2026-01-30 | Initial timeout + retry UI | profile/*/page.tsx, withTimeout.ts |
| 2026-01-31 | fetch-with-timeout wrapper | lib/supabase/fetch-with-timeout.ts |
| 2026-01-31 | Server-side cache() | lib/supabase/server.ts, lib/auth/server-context.ts |
| 2026-01-31 | Legal docs TTL cache | lib/legal/cached-legal.ts |
| 2026-01-31 | useProfileQuery hook | hooks/useProfileQuery.ts |
| 2026-01-31 | Profile pages refactor | activity, preferences, organizations, notifications |
| 2026-01-31 | Notifications hook dedupe | hooks/useAppNotifications.ts |
| 2026-01-31 | MFA status via useProfileQuery | app/app/profile/page.tsx |
| 2026-01-31 | Safe depToKey (WeakMap) | hooks/useProfileQuery.ts |

---

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| **Single-flight** | Pattern ensuring only one request is in-flight for a given key at a time |
| **State machine** | Explicit status enum (`idle\|loading\|success\|error\|timeout`) instead of boolean flags |
| **Generation tracking** | Counter incremented on each effect run to detect stale responses |
| **TTL cache** | Time-to-live cache that expires after a duration (e.g., 5 minutes) |
| **RLS** | Row-Level Security in Supabase/PostgreSQL |
| **StrictMode** | React development mode that double-invokes effects to catch side-effect bugs |

---

## Appendix D: Duplicate / Legacy Component Map

### D.1 Profile-Related Components by Location

| Component | Location | Usage | Gen | Notes |
|-----------|----------|-------|-----|-------|
| `ProfilePage` | features/profile/ProfilePage.tsx | Demo/sandbox? | Gen-1 | Full-page component, inline spinner |
| `ProfileHeader` | features/profile/components/ProfileHeader.tsx | Public profile views | Gen-1 | Reusable |
| `ProfileNavigation` | components/profile/ProfileNavigation.tsx | Profile sidebar | Gen-2 | Uses shadcn |
| `ProfileModal` | components/app/ProfileModal.tsx | Quick actions popup | Gen-2 | Uses shadcn Dialog |
| `ProfileMenu` | components/navigation/ProfileMenu.tsx | Header dropdown | Gen-2 | Uses shadcn |
| `ProfileAchievementsShowcase` | features/profile/components/... | Profile badge showcase | Gen-1 | Standalone |

### D.2 UI Generation Classification

| Generation | Characteristics | Example Patterns |
|------------|-----------------|------------------|
| **Gen-1** | Inline Tailwind spinner: `animate-spin rounded-full border-4` | ProfilePage.tsx, AppDashboardPage.tsx |
| **Gen-1** | Manual inline SVG spinner | PlanHeaderBar.tsx, ActionBar.tsx |
| **Gen-2** | Lucide `Loader2` icon with `animate-spin` | Most app/ routes |
| **Gen-2** | Heroicons `ArrowPathIcon` with `animate-spin` | play/ components |
| **Gen-3** | `Alert variant="info"` with "Laddar…" text | privacy/page.tsx |
| **Gen-3** | `ProfileLoading` skeleton component | useProfileQuery consumers |

### D.3 Loading Indicator Variants Found

| Variant | Border Width | Color | Size | Files Using |
|---------|--------------|-------|------|-------------|
| `border-4 border-primary border-t-transparent` | 4px | Primary | h-8 w-8 | ProfilePage, AppDashboardPage |
| `border-2 border-amber-500 border-t-transparent` | 2px | Amber | h-6 w-6 | ProfileAchievementsShowcase |
| `border-2 border-primary border-t-transparent` | 2px | Primary | h-5 w-5 | AchievementHistory |
| `border-b-2 border-blue-600` | 2px | Blue | h-8 w-8 | SessionHistoryViewer |
| `border-2 border-current border-t-transparent` | 2px | Current | h-3/h-4 w-3/w-4 | SessionCockpit |
| Lucide `Loader2` | N/A | N/A | h-4 w-4 | Many modern components |
| Heroicons `ArrowPathIcon` | N/A | N/A | h-4-8 w-4-8 | play/ feature |

### D.4 Visual Inconsistency Risk Assessment

| Inconsistency | Impact | Priority |
|---------------|--------|----------|
| 5+ different spinner colors (primary, amber, blue, current, muted) | Low | P3 - cosmetic |
| 3+ different spinner sizes (h-3 to h-8) | Low | P3 - cosmetic |
| Mix of inline spinners vs component-based | Medium | P2 - maintainability |
| Some spinners have indefinite timeout risk | High | P1 - UX |

**Recommendation for Future Work:** Consolidate to single `<Spinner size="sm\|md\|lg" />` component.

---

## Appendix E: Orphan Routes & Dead Links (VERIFIED)

### E.1 Dead Route: `/app/profile/coins`

**Source of Link:** [features/gamification/components/CoinsSection.tsx#L73](../../../features/gamification/components/CoinsSection.tsx#L73)

```typescript
<Link
  href="/app/profile/coins"
  className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
>
  Se transaktionshistorik
  <ChevronRightIcon className="h-4 w-4" />
</Link>
```

**Folder Exists?** ❌ No - `/app/app/profile/coins/` directory does not exist.

**Impact:** Clicking "Se transaktionshistorik" link results in 404.

### E.1.1 CoinsSection Reachability Analysis

| Question | Answer | Evidence |
|----------|--------|----------|
| **Is CoinsSection rendered in profile?** | ❌ No | Not imported in any `app/app/profile/**` file |
| **Where IS CoinsSection rendered?** | `/app/gamification` only | [features/gamification/GamificationPage.tsx#L145](../../../features/gamification/GamificationPage.tsx#L145): `<CoinsSection summary={data.coins} />` |
| **Is dead link reachable in UI?** | ✅ Yes | User navigates to `/app/gamification` → CoinsSection renders → "Se transaktionshistorik" link is clickable |
| **How many users affected?** | All users visiting gamification hub | GamificationPage is main entry point for rewards |

**Verdict:** Dead link IS reachable but NOT in profile area. Affects `/app/gamification` route.

### E.2 Deprecated Folder – Active Import Check

**Command executed:**
```powershell
Get-ChildItem -Recurse -Include *.tsx,*.ts | Select-String -Pattern "from.*deprecated/" | Select-Object Path,LineNumber,Line
```

**Result:** **0 matches** ✅

**Verdict:** No active imports from `deprecated/` folder. Safe to ignore for this audit.

### E.3 Redirect Chains

| Old Route | Redirects To | Method | Verified? |
|-----------|--------------|--------|-----------|
| `/app/profile` (exact) | `/app/profile/general` | `redirect()` in page.tsx | ✅ Yes |
| `/app/profile/notifications` | `/app?tab=notifications` | `redirect()` in page.tsx | ✅ Yes |
| `/app/profile/coins` | **(404)** | **Broken – no page.tsx** | ❌ Broken |

### E.4 Other Dead Links in Navigation Components

**Checked files:**
- [components/profile/ProfileNavigation.tsx](../../../components/profile/ProfileNavigation.tsx) – ✅ No dead links found
- [components/app/ProfileModal.tsx](../../../components/app/ProfileModal.tsx) – ✅ No dead links found

**All navigation links verified to have corresponding page.tsx files.**

---

## Appendix F: RPC & Server Action Inventory (CORRECTED)

### F.1 RPCs Called from Profile Area

| RPC Name | Caller | Timeout Wrapped? | Evidence |
|----------|--------|------------------|----------|
| `get_user_notifications` | useAppNotifications.ts | ✅ **YES** (CORRECTED) | Hook wraps with `withTimeout(12s)` + browser client uses `createFetchWithTimeout` |
| `mark_notification_read` | useAppNotifications.ts | ✅ **YES** | Hook wraps with `withTimeout(12s)` at [L189](../../../hooks/useAppNotifications.ts#L189) |
| `mark_notifications_read` | useAppNotifications.ts | ✅ **YES** | Hook wraps with `withTimeout(12s)` |
| `dismiss_notification` | useAppNotifications.ts | ✅ **YES** | Hook wraps with `withTimeout(12s)` |
| N/A (direct table queries) | Most profile routes | ✅ Yes | Via `createFetchWithTimeout` in browser client |

**CORRECTION:** Previous version of this table incorrectly stated `get_user_notifications` had no timeout. This was **wrong**. The hook explicitly wraps the RPC call with `withTimeout(12000, 'rpc:get_user_notifications')` at [hooks/useAppNotifications.ts#L129-132](../../../hooks/useAppNotifications.ts#L129-L132).

### F.2 Server Actions Called from Profile Area

| Action | File | Called From | Timeout? |
|--------|------|-------------|----------|
| `resolveTenantAction` | app/actions/tenant.ts | TenantContext.tsx | ⚠️ No explicit timeout (server action) |
| `submitGdprRequest` | (inline in privacy page) | privacy/page.tsx | ⚠️ No explicit timeout |
| `logout` | features/profile/components/LogoutButton.tsx | ProfileNavigation | N/A (client-side) |

### F.3 Paths That Bypass Timeout (UPDATED)

| Path | Has Timeout? | Risk | Notes |
|------|--------------|------|-------|
| `ProfileService.*` via `useProfileQuery` | ✅ Yes | Low | Hook wraps with `withTimeout` |
| `ProfileService.*` via manual `useEffect` | ⚠️ Indirect | Medium | Browser client has `createFetchWithTimeout` |
| `PreferencesContext.syncUserPreferences()` | ⚠️ Indirect | Low | Browser client timeout applies, but no hook-level timeout |
| `AuthProvider.updateProfile()` | ⚠️ Indirect | Low | Calls fetch → browser client timeout applies |
| Server actions (resolveTenantAction) | ❌ No | Low | Next.js server actions have no built-in timeout |

---

## Appendix G: Summary for Future Audits

### G.1 Key Files to Monitor

1. **[hooks/useProfileQuery.ts](../../../hooks/useProfileQuery.ts)** - Single-flight + timeout wrapper
2. **[lib/supabase/fetch-with-timeout.ts](../../../lib/supabase/fetch-with-timeout.ts)** - Global fetch interceptor
3. **[lib/supabase/auth.tsx](../../../lib/supabase/auth.tsx)** - AuthProvider + useAuth hook
4. **[lib/context/PreferencesContext.tsx](../../../lib/context/PreferencesContext.tsx)** - Theme/language sync
5. **[app/app/profile/security/SecuritySettingsClient.tsx](../../../app/app/profile/security/SecuritySettingsClient.tsx)** - MFA + Trusted Devices

### G.2 Regression Test Scenarios

| Scenario | Expected | Risk If Broken |
|----------|----------|----------------|
| Navigate /app → /app/profile with Slow 3G | Timeout message within 12s | Infinite spinner |
| Click "Betrodda enheter" refresh | Shows devices or error | Stuck spinner |
| Open profile, go offline, click retry | Error UI + retry works | Crash or hang |
| Fast back-forward 5 times | No stuck spinners | Memory leak / zombie requests |
| Multi-tenant user switches org | Profile reloads with new context | Stale data shown |

---

*End of Forensic Audit Report*
*Document Version: 3.0*
*Last Updated: 2026-01-31*

---

## Addendum: GPT Feedback Verification Checklist

**Date:** 2026-01-31
**Purpose:** Track resolution of specific gaps identified in GPT review of v2.0

| # | GPT Feedback Item | Status | Evidence Location |
|---|-------------------|--------|-------------------|
| 1 | **Timeout coverage contradiction for NotificationBell** | ✅ RESOLVED | §3.5 clarifies dual timeout: hook-level `withTimeout(12s)` + browser client `createFetchWithTimeout`. Appendix F corrected. |
| 2 | **Trusted Devices "Laddar…" forensic trace** | ✅ RESOLVED | §5.1.1-5.1.7 now includes exact skip condition (`!userEmail`), cache key format, timeout config (12s), and hypothesis elimination matrix. |
| 3 | **Provider stack mount effects analysis** | ✅ RESOLVED | §3.2.1 added with per-provider breakdown of useEffect triggers, async calls, early return patterns, and loading flags. |
| 4 | **i18n crash-path vs missing-key distinction** | ✅ RESOLVED | §9.3-9.6 now distinguishes error classes, verifies no error.tsx in profile routes, confirms SideNav uses namespace correctly. |
| 5 | **DB/RLS actual policy definitions** | ✅ RESOLVED | §10.2-10.3 now includes verified SQL for `mfa_trusted_devices`, `user_preferences`, `user_tenant_memberships`, and `get_user_notifications` RPC query analysis. |
| 6 | **Orphan/duplicate reachability** | ✅ RESOLVED | Appendix E.1.1 confirms CoinsSection is NOT in profile area (rendered in `/app/gamification`), dead link IS reachable. Deprecated folder grep shows 0 active imports. |
| 7 | **Per-route request budget** | ✅ RESOLVED | §7.0 added with detailed request counts for `/app/profile/security` (8 req) and `/app/profile` (6 req), categorized by global vs route-specific. |
| 8 | **Remaining verification tasks** | ✅ DOCUMENTED | §13 contains repro matrix, console lines to watch, and manual verification steps. |

### Outstanding Items Requiring Runtime Verification

| Item | Why Can't Be Verified Statically | Suggested Approach |
|------|----------------------------------|-------------------|
| Actual request counts post-fix | Needs browser DevTools | Run dev server, navigate, count `[supabase fetch:*]` logs |
| "Betrodda enheter" stuck for >12s | Needs slow network + timing | Throttle to Slow 3G, navigate to security, time the spinner |
| Multi-tenant user edge cases | Needs test account with org + personal | Create test user with multiple tenants |
| Demo user localStorage-only behavior | Needs demo session | Test with demo account |
| RLS policy execution time | Needs Supabase dashboard | Check query performance in Supabase Logs |
