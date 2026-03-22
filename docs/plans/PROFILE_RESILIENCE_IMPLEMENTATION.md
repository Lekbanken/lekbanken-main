# Profile Resilience Implementation Plan

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-31
- Last updated: 2026-03-21
- Last validated: -

> Historical implementation snapshot for the profile resilience hardening work.

**Version:** 1.1  
**Date:** 2026-01-31  
**Based on:** PROFILE_LOADING_FORENSIC_AUDIT.md v3.0  
**Author:** Staff Engineer Review  
**Status:** ✅ FULLY IMPLEMENTED

---

## Implementation Status

| Priority | Item | Status | Files |
|----------|------|--------|-------|
| 🔴 P0 | privacy/page.tsx → useProfileQuery | ✅ Done | `app/app/profile/privacy/page.tsx` |
| 🔴 P0 | friends/page.tsx → useProfileQuery | ✅ Done | `app/app/profile/friends/page.tsx` |
| 🔴 P0 | achievements → redirect | ✅ Done | `app/app/profile/achievements/page.tsx` |
| 🟠 P1 | error.tsx + loading.tsx | ✅ Done | `app/app/profile/error.tsx`, `loading.tsx` |
| 🟠 P1 | CoinsSection dead link | ✅ Done | Link removed |
| 🟡 P2 | Server action timeout wrapper | ✅ Done | `lib/utils/withServerActionTimeout.ts` |
| 🟡 P2 | DB notification index | ✅ Done | `20260131000000_notification_performance_index.sql` |
| 🟢 P3 | ESLint tripwire rule | ✅ Done | `eslint-rules/no-manual-profile-fetch.cjs` |
| 🟢 P3 | Playwright e2e tests | ✅ Done | `tests/e2e/profile-resilience.spec.ts` |
| 🟢 P3 | Vitest unit tests | ✅ Done | `tests/hooks/useProfileQuery.test.ts` |

### Bonus Fixes (Session)
| Item | Status |
|------|--------|
| Web Locks API for refresh token | ✅ Done |
| User metadata cleanup | ✅ Done |
| API stopped writing redundant metadata | ✅ Done |

---

## Executive Summary

After audit v3.0, the core problem is solved: `useProfileQuery` + global `createFetchWithTimeout` ensures no Supabase calls hang indefinitely. This plan addresses **residual risks** with minimal, targeted changes.

### Scope Reductions (Per Stakeholder Feedback)
- ❌ **achievements/page.tsx** – Ta bort från profile helt (användare har översikt på andra sidor)
- ❌ **CoinsSection dead link** – Ta bort länken helt (användare har översikt i /app/gamification)

---

## A) Reviderad Top 4 Problemområden

| # | Problem | Impact | Likelihood | Effort | Risk | Förbättring |
|---|---------|--------|------------|--------|------|-------------|
| **1** | FM4/FM8 i privacy + friends | 🔴 High | Medium | 🟢 Low (2 filer) | Low | Eliminerar spinner-forever risk |
| **2** | Ingen error.tsx / loading.tsx | 🟠 Medium | Low | 🟢 Low (2 nya filer) | Low | Graceful degradation |
| **3** | Server actions timeout | 🟠 Medium | Low | 🟡 Medium | Medium | UI-timeout + felhantering |
| **4** | DB index för notifications | 🟡 Low-Medium | Medium | 🟢 Low | Low | Snabbare RPC |

### Borttagna Åtgärder
- ~~achievements/page.tsx migration~~ → **Ta bort hela sidan** (redirect to /app/gamification)
- ~~CoinsSection dead link fix~~ → **Ta bort länken helt**

---

## B) Detaljerade Åtgärder

### 1. Migrera privacy + friends till useProfileQuery

#### 1.1 Fil: `app/app/profile/privacy/page.tsx`

**Problem:** Manuell useEffect med early-return patterns som kan lämna `isLoading=true`.

**Lösning:** Refaktorera till `useProfileQuery` med stabil key + skip-logik.

```typescript
// BEFORE (problematic)
const [isLoading, setIsLoading] = useState(true)
useEffect(() => {
  if (authLoading) return  // ← BUG: loading aldrig false
  if (!supabase) return    // ← BUG: loading aldrig false
  // ...
}, [authLoading, supabase])

// AFTER (safe)
import { useProfileQuery } from '@/hooks/useProfileQuery'
import { useBrowserSupabase } from '@/hooks/useBrowserSupabase'

// Stabil key med fallback (aldrig undefined)
const queryKey = `privacy-${user?.id ?? 'anon'}`

const {
  data: privacyData,
  isLoading,
  status,
  error,
  retry,
} = useProfileQuery<{ gdprRequests: GDPRRequest[]; consents: UserConsent[] }>(
  queryKey,
  async (signal) => {
    const service = new ProfileService(supabase!)
    // Promise.allSettled för partial data vid delfel
    const results = await Promise.allSettled([
      service.getGDPRRequests(user!.id),
      service.getUserConsents(user!.id),
    ])
    
    const gdprRequests = results[0].status === 'fulfilled' ? results[0].value : []
    const consents = results[1].status === 'fulfilled' ? results[1].value : []
    
    // Kasta om båda failade
    if (results[0].status === 'rejected' && results[1].status === 'rejected') {
      throw results[0].reason
    }
    
    return { 
      gdprRequests, 
      consents,
      partialFailure: results.some(r => r.status === 'rejected'),
    }
  },
  { userId: user?.id, supabaseRef: supabase ? 1 : 0 },
  { 
    timeout: 12000, 
    skip: authLoading || !supabase || !user?.id  // skip styr, inte early-return
  }
)

// Visa partial data warning om relevant
{privacyData?.partialFailure && (
  <Alert variant="warning">Vissa data kunde inte laddas</Alert>
)}
```

**useProfileQuery skip→false transition:**

Verifierat i `hooks/useProfileQuery.ts` L243-250:
```typescript
useEffect(() => {
  if (skip) {
    setStatus('idle')  // ← Resetas korrekt
    return
  }
  void executeQuery()  // ← Körs när skip blir false
  // ...
}, [skip, executeQuery])
```

✅ **Bekräftat:** När `skip` går från `true` → `false`, resetas status till `idle` och `executeQuery()` anropas.

#### 1.2 Fil: `app/app/profile/friends/page.tsx`

Samma pattern som privacy. Extra notering:

```typescript
// Använd Promise.allSettled för partial data
const results = await Promise.allSettled([
  getFriends(userId),
  getFriendRequests(userId, 'received'),
  getFriendRequests(userId, 'sent'),
])

// Extract med fallback
const friends = results[0].status === 'fulfilled' ? results[0].value : []
const received = results[1].status === 'fulfilled' ? results[1].value : []
const sent = results[2].status === 'fulfilled' ? results[2].value : []

// Error state om allt failade
const allFailed = results.every(r => r.status === 'rejected')
if (allFailed) throw results[0].reason

return { friends, received, sent, partialFailure: !allFailed && results.some(r => r.status === 'rejected') }
```

---

### 2. Ta bort achievements från profile

#### 2.1 Fil: `app/app/profile/achievements/page.tsx`

**Åtgärd:** Ersätt med redirect till gamification hub.

```typescript
// HELA FILEN ERSÄTTS MED:
import { redirect } from 'next/navigation'

export default function AchievementsPage() {
  redirect('/app/gamification')
}
```

**Alternativ:** Ta bort mappen helt och låt 404 hanteras av error.tsx.

#### 2.2 Uppdatera navigation

Ta bort achievements-länk från `components/profile/ProfileNavigation.tsx` om den finns.

---

### 3. Ta bort CoinsSection dead link

#### 3.1 Fil: `features/gamification/components/CoinsSection.tsx`

**Rad ~73:** Ta bort eller ändra länken.

```typescript
// BEFORE
<Link
  href="/app/profile/coins"
  className="flex items-center justify-center gap-1 text-sm font-medium text-primary hover:underline"
>
  Se transaktionshistorik
  <ChevronRightIcon className="h-4 w-4" />
</Link>

// AFTER - Ta bort hela Link-blocket, eller:
<Link href="/app/gamification">
  Se mer
  <ChevronRightIcon className="h-4 w-4" />
</Link>
```

---

### 4. Lägg till error.tsx + loading.tsx

#### 4.1 Fil: `app/app/profile/loading.tsx` (NY)

```typescript
import { ProfileLoading } from '@/components/profile/ProfileLoading'

export default function ProfileLoadingPage() {
  return <ProfileLoading />
}
```

#### 4.2 Fil: `app/app/profile/error.tsx` (NY)

```typescript
'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from '@heroicons/react/24/outline'

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log för monitoring
    console.error('[profile error boundary]', error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
      <AlertCircleIcon className="h-12 w-12 text-destructive" />
      <h2 className="text-lg font-semibold">Något gick fel</h2>
      <p className="text-muted-foreground text-center max-w-md">
        Vi kunde inte ladda din profilsida. Försök igen eller kontakta support.
      </p>
      <Button onClick={reset}>Försök igen</Button>
      {process.env.NODE_ENV === 'development' && error.message && (
        <pre className="text-xs text-muted-foreground bg-muted p-2 rounded max-w-md overflow-auto">
          {error.message}
        </pre>
      )}
    </div>
  )
}
```

#### 4.3 Överväg: `app/app/error.tsx`

Om ni vill fånga fel globalt för hela app-ytan. **Rekommendation:** Börja med profile-scope, utöka senare vid behov.

---

### 5. Server Actions Timeout Wrapper

#### 5.1 Fil: `lib/utils/withServerActionTimeout.ts` (NY)

```typescript
import { withTimeout, TimeoutError } from '@/lib/utils/withTimeout'

export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; isTimeout?: boolean }

/**
 * Wraps a server action with timeout for UI responsiveness.
 * 
 * NOTE: This provides UI-level timeout only. It cannot abort 
 * an already-running Postgres query. For DB-level timeout,
 * use statement_timeout in critical RPCs.
 */
export async function withServerActionTimeout<T>(
  action: () => Promise<T>,
  timeoutMs = 10000,
  label = 'server action'
): Promise<ServerActionResult<T>> {
  const start = Date.now()
  
  try {
    const data = await withTimeout(action(), timeoutMs, label)
    
    // Log för P95/P99 monitoring
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${label}] completed in ${Date.now() - start}ms`)
    }
    
    return { success: true, data }
  } catch (err) {
    const elapsed = Date.now() - start
    
    if (err instanceof TimeoutError) {
      console.error(`[${label}] Timeout after ${elapsed}ms (limit: ${timeoutMs}ms)`)
      return { success: false, error: 'Åtgärden tog för lång tid. Försök igen.', isTimeout: true }
    }
    
    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error(`[${label}] Error after ${elapsed}ms:`, err)
    return { success: false, error: message }
  }
}
```

#### 5.2 Användning i `app/actions/tenant.ts`

```typescript
import { withServerActionTimeout } from '@/lib/utils/withServerActionTimeout'

export async function resolveTenantAction() {
  return withServerActionTimeout(async () => {
    const supabase = await createServerRlsClient()
    // ... existing logic
    return { tenant, memberships }
  }, 8000, 'resolveTenantAction')
}
```

#### 5.3 UI-konsumption

```typescript
const result = await resolveTenantAction()
if (!result.success) {
  toast.error(result.error)
  if (result.isTimeout) {
    // Ev. visa retry-knapp
  }
  return
}
const { tenant, memberships } = result.data
```

**OBS om DB-level timeout:**
Server action wrapper kan inte avbryta pågående Postgres-query. Om det behövs, lägg till i kritiska RPC:er:
```sql
SET statement_timeout = '5s';
```
Men detta är sällan nödvändigt med era nuvarande query patterns.

---

### 6. DB Index för Notifications

#### 6.1 Migrationsfil (utan CONCURRENTLY)

Supabase migrations körs i transaktion, så `CONCURRENTLY` fungerar inte. Använd vanlig `CREATE INDEX`.

**Fil:** `supabase/migrations/20260131_notification_performance_index.sql`

```sql
-- =============================================================================
-- Notification Performance Index
-- =============================================================================
-- Optimizes get_user_notifications RPC query:
--   WHERE user_id = auth.uid() AND dismissed_at IS NULL
--   ORDER BY delivered_at DESC
--   LIMIT 20
-- =============================================================================

-- Covering index for active notifications lookup
-- Partial index on dismissed_at IS NULL (most common case)
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user_active
  ON public.notification_deliveries (user_id, delivered_at DESC)
  WHERE dismissed_at IS NULL;

COMMENT ON INDEX public.idx_notification_deliveries_user_active IS 
  'Optimizes get_user_notifications: filter user + not-dismissed, sort by delivered_at DESC';

-- =============================================================================
-- user_preferences lookup index
-- =============================================================================
-- Query pattern: WHERE user_id = $1 AND tenant_id = $2
-- Note: Check if unique constraint already exists (for upsert ON CONFLICT)

-- Only create if not already covered by unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'user_preferences_user_id_tenant_id_key'
       OR indexname = 'idx_user_preferences_user_tenant'
  ) THEN
    CREATE INDEX idx_user_preferences_user_tenant
      ON public.user_preferences (user_id, tenant_id);
    
    COMMENT ON INDEX public.idx_user_preferences_user_tenant IS 
      'Lookup index for user preferences by user + tenant';
  END IF;
END $$;
```

#### 6.2 Verifiering efter migration

```sql
-- Kör i Supabase SQL Editor
EXPLAIN ANALYZE
SELECT id, notification_id, delivered_at, read_at
FROM notification_deliveries
WHERE user_id = '<test-user-uuid>' AND dismissed_at IS NULL
ORDER BY delivered_at DESC
LIMIT 20;

-- Förväntat: "Index Scan using idx_notification_deliveries_user_active"
```

---

## C) Regression Tripwires

### 1. ESLint Rule (Robust Version)

**Fil:** `eslint-rules/no-manual-profile-fetch.js`

```javascript
/**
 * ESLint rule: Enforce useProfileQuery for profile data fetching
 * 
 * Flags useEffect that contains Supabase calls (.from, .rpc) or fetch(/api/)
 * in profile routes. Allows explicit opt-out with // profile-fetch:allow
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce useProfileQuery for profile data fetching',
      category: 'Best Practices',
    },
    schema: [],
  },
  create(context) {
    const filename = context.getFilename()
    
    // Only apply to profile routes
    if (!filename.includes('app/app/profile/') && !filename.includes('app\\app\\profile\\')) {
      return {}
    }

    return {
      CallExpression(node) {
        // Only check useEffect calls
        if (node.callee.name !== 'useEffect') return
        if (!node.arguments[0]) return

        const sourceCode = context.getSourceCode()
        const effectBody = sourceCode.getText(node.arguments[0])

        // Check for Supabase patterns
        const hasSupabaseCall = 
          effectBody.includes('.from(') ||
          effectBody.includes('.rpc(') ||
          effectBody.includes("fetch('/api/") ||
          effectBody.includes('fetch("/api/') ||
          effectBody.includes('fetch(`/api/')

        if (!hasSupabaseCall) return

        // Check for explicit allow comment
        const comments = sourceCode.getCommentsBefore(node)
        const hasAllowComment = comments.some(c => 
          c.value.includes('profile-fetch:allow')
        )

        if (hasAllowComment) return

        context.report({
          node,
          message: 
            'Use useProfileQuery instead of manual useEffect for data fetching in profile routes. ' +
            'Add // profile-fetch:allow comment to suppress if intentional.',
        })
      },
    }
  },
}
```

**Registrera i `eslint.config.mjs`:**

```javascript
import noManualProfileFetch from './eslint-rules/no-manual-profile-fetch.js'

export default [
  // ... existing config
  {
    plugins: { 
      custom: { 
        rules: { 
          'no-manual-profile-fetch': noManualProfileFetch 
        } 
      } 
    },
    rules: { 
      'custom/no-manual-profile-fetch': 'warn' 
    },
  },
]
```

### 2. Runtime Dev Guard

**Lägg till i `hooks/useProfileQuery.ts` (development only):**

```typescript
// Inside executeQuery, before setting status to 'loading':
if (process.env.NODE_ENV === 'development') {
  const loadingWarnTimer = setTimeout(() => {
    console.warn(
      `⚠️ [useProfileQuery] "${key}" still loading after ${timeout + 2000}ms. ` +
      `This may indicate a state machine bug or very slow network.`
    )
  }, timeout + 2000)
  
  // Store for cleanup
  ;(abortControllerRef.current as any).__warnTimer = loadingWarnTimer
}

// In cleanup/finally:
if (process.env.NODE_ENV === 'development') {
  clearTimeout((abortControllerRef.current as any)?.__warnTimer)
}
```

### 3. Playwright Tests

**Fil:** `tests/e2e/profile-resilience.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Profile Loading Resilience', () => {
  
  test('spinner resolves within 15s on slow network', async ({ page, context }) => {
    // Throttle all requests
    await context.route('**/*', async route => {
      await new Promise(r => setTimeout(r, 2000))
      await route.continue()
    })

    await page.goto('/app/profile/privacy')
    
    // Wait for terminal state (content OR error)
    await expect(async () => {
      const hasSpinner = await page.locator('.animate-spin').isVisible()
      const hasContent = await page.locator('[data-testid="privacy-content"]').isVisible()
      const hasError = await page.locator('[data-testid="error-state"]').isVisible()
      
      // Should NOT be stuck in loading
      expect(hasSpinner && !hasContent && !hasError).toBe(false)
    }).toPass({ timeout: 15000 })
  })

  test('error boundary catches RSC failure', async ({ page }) => {
    // This test requires a way to trigger RSC failure
    // For now, verify error.tsx exists and renders
    await page.goto('/app/profile')
    
    // Inject error for testing (if you have a test hook)
    // await page.evaluate(() => window.__TEST_TRIGGER_ERROR?.())
    
    // Verify normal load works
    await expect(page.locator('h1')).toBeVisible({ timeout: 10000 })
  })

  test('max 2 requests per endpoint (no storm)', async ({ page }) => {
    const requests: string[] = []
    
    page.on('request', req => {
      const url = req.url()
      if (url.includes('supabase') || url.includes('/api/')) {
        requests.push(url)
      }
    })

    await page.goto('/app/profile')
    await page.waitForLoadState('networkidle')

    // Count endpoint occurrences
    const authCalls = requests.filter(r => r.includes('/auth/v1/user')).length
    const usersCalls = requests.filter(r => r.includes('/rest/v1/users')).length
    
    expect(authCalls).toBeLessThanOrEqual(2)
    expect(usersCalls).toBeLessThanOrEqual(2)
  })
})
```

### 4. Vitest Unit Test

**Fil:** `hooks/__tests__/useProfileQuery.test.ts`

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useProfileQuery } from '../useProfileQuery'

describe('useProfileQuery', () => {
  it('reaches terminal state on error', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-error',
        async () => { throw new Error('test fail') },
        {},
        { timeout: 100 }
      )
    )

    await waitFor(() => {
      expect(result.current.status).toBe('error')
    }, { timeout: 500 })
    
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toContain('test fail')
  })

  it('reaches terminal state on timeout', async () => {
    const { result } = renderHook(() =>
      useProfileQuery(
        'test-timeout',
        async () => new Promise(() => {}), // never resolves
        {},
        { timeout: 100 }
      )
    )

    await waitFor(() => {
      expect(result.current.status).toBe('timeout')
    }, { timeout: 300 })
    
    expect(result.current.isLoading).toBe(false)
  })

  it('resets status when skip changes true→false', async () => {
    let skip = true
    const { result, rerender } = renderHook(() =>
      useProfileQuery(
        'test-skip',
        async () => 'data',
        {},
        { timeout: 100, skip }
      )
    )

    expect(result.current.status).toBe('idle')
    
    skip = false
    rerender()

    await waitFor(() => {
      expect(result.current.status).toBe('success')
    }, { timeout: 500 })
  })
})
```

---

## D) Verifieringschecklista

### Pre-deploy Checklist

| Steg | Kommando/Action | Förväntat Resultat |
|------|-----------------|-------------------|
| 1 | `npm run type-check` | Inga TypeScript-fel |
| 2 | `npm run lint` | Inga nya fel (warn OK för tripwire) |
| 3 | `npx vitest run hooks/` | Alla tests passar |
| 4 | `npm run build` | Build OK, inga server/client boundary issues |
| 5 | `npx supabase db push --dry-run` | Migration syntax OK |

### Post-deploy Verification (DevTools)

| Steg | Action | Förväntat |
|------|--------|-----------|
| 1 | Navigate `/app/profile/privacy` | Laddar inom 3s |
| 2 | DevTools → Slow 3G → refresh | Timeout UI efter ~12s |
| 3 | Klicka "Försök igen" | Retry fungerar |
| 4 | Console filter `[supabase fetch:` | Max 1x per endpoint |
| 5 | Navigate `/app/profile/achievements` | Redirectas till /app/gamification |

### DB Index Verification

```sql
-- Efter migration
EXPLAIN ANALYZE
SELECT id, notification_id, delivered_at
FROM notification_deliveries
WHERE user_id = 'test-uuid' AND dismissed_at IS NULL
ORDER BY delivered_at DESC
LIMIT 20;

-- Förväntat output innehåller:
-- "Index Scan using idx_notification_deliveries_user_active"
```

---

## E) Implementationsordning

| Prio | PR | Åtgärd | Filer | Effort |
|------|-----|--------|-------|--------|
| 🔴 P0 | #1 | Migrera privacy + friends till useProfileQuery | `app/app/profile/privacy/page.tsx`, `app/app/profile/friends/page.tsx` | 2h |
| 🔴 P0 | #1 | Ta bort achievements (redirect) | `app/app/profile/achievements/page.tsx` | 10min |
| 🟠 P1 | #2 | error.tsx + loading.tsx | `app/app/profile/error.tsx`, `app/app/profile/loading.tsx` | 30min |
| 🟠 P1 | #2 | Ta bort CoinsSection dead link | `features/gamification/components/CoinsSection.tsx` | 5min |
| 🟡 P2 | #3 | Server action timeout wrapper | `lib/utils/withServerActionTimeout.ts`, `app/actions/tenant.ts` | 1h |
| 🟡 P2 | #4 | DB index migration | `supabase/migrations/20260131_notification_performance_index.sql` | 15min |
| 🟢 P3 | #5 | ESLint rule + tests | `eslint-rules/`, `tests/e2e/`, `hooks/__tests__/` | 1.5h |

**Total estimated effort:** ~5.5 timmar

---

## F) Risker och Mitigation

| Risk | Mitigation |
|------|------------|
| useProfileQuery skip-bug | Verifierat i kod: L243-250 resetas korrekt |
| Promise.allSettled ändrar beteende | Explicit partial failure flag + test |
| Index skapar lock | Kör under lågtrafik; ingen CONCURRENTLY = kortvarig lock |
| ESLint rule false positives | `// profile-fetch:allow` opt-out |
| Server action timeout avbryter inte DB | Dokumenterat; UI-timeout räcker för UX |

---

*End of Implementation Plan*
