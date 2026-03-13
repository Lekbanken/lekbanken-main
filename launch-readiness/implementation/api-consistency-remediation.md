# API Consistency Remediation Plan

> **Date:** 2026-03-10  
> **Source:** `audits/api-consistency-audit.md` — 14 findings (0 P0, 4 P1, 7 P2, 3 P3)  
> **Scope:** P1 fixes, P2 fixes, wrapper migration batches, verification strategy  
> **Goal:** Turn audit findings into actionable batches grouped by root cause and risk

---

## 1. P1 Fixes

### APC-006: `consent/log` — unauthenticated POST + service role + no rate limiting

**Route:** `app/api/consent/log/route.ts` (99 lines, 1 method: POST)

**Problem:** Zero authentication, `createServiceRoleClient()` always used, no rate limiting, no Zod schema. Writes to `cookie_consent_audit` and `anonymous_cookie_consents`. Manual field validation only. Returns `{ success: true }` even on internal errors.

**Root cause:** Endpoint is designed for anonymous GDPR consent — users who haven't logged in yet. Auth would defeat the purpose. But it's completely unprotected.

**Fix — 3 steps:**

1. **Add rate limiting** (`strict` tier — 5 req/min per IP):
   ```typescript
   import { applyRateLimit } from '@/lib/utils/rate-limiter'
   // At top of handler:
   const rateLimitResponse = applyRateLimit(request, 'strict')
   if (rateLimitResponse) return rateLimitResponse
   ```

2. **Add Zod schema** to replace manual field validation:
   ```typescript
   const consentLogSchema = z.object({
     consentId: z.string().uuid(),
     eventType: z.enum(['granted', 'updated', 'revoked', 'expired']),
     newState: z.object({
       necessary: z.boolean().optional(),
       functional: z.boolean().optional(),
       analytics: z.boolean().optional(),
       marketing: z.boolean().optional(),
     }),
     consentVersion: z.string().min(1).max(20),
     userId: z.string().uuid().nullable().optional(),
     previousState: z.record(z.boolean()).nullable().optional(),
     userAgent: z.string().max(500).nullable().optional(),
     pageUrl: z.string().url().max(2000).nullable().optional(),
     referrer: z.string().max(2000).nullable().optional(),
     locale: z.string().max(10).nullable().optional(),
     dntEnabled: z.boolean().optional(),
     gpcEnabled: z.boolean().optional(),
   })
   ```

3. **Migrate to `apiHandler`** with `auth: 'public'` + `rateLimit: 'strict'` + `input: consentLogSchema`:
   ```typescript
   export const POST = apiHandler({
     auth: 'public',
     rateLimit: 'strict',
     input: consentLogSchema,
     handler: async ({ body, req }) => {
       // body is validated — use directly
       // Keep createServiceRoleClient — anonymous users can't use RLS client
     },
   })
   ```

**Risks:** None — adding protection to an unprotected endpoint.  
**Design decisions:** None needed.  
**Success criteria:** Route returns 429 on burst, rejects malformed payloads with 400, continues to log consent for legitimate callers.

---

### APC-003 / APC-011: `sessions/route.ts` — service role admin fallback

**Route:** `app/api/sessions/route.ts` (73 lines, 1 method: GET)

**Problem:** Line 23: `const client = supabaseAdmin ?? supabase`. Because `supabaseAdmin` is a Proxy object (always truthy), this **always** uses service role. The RLS client on line 18 is never used. No explicit auth check. Client-side JavaScript tenant filtering after fetching 100 rows — all session data from all tenants is loaded into memory.

**Root cause:** `supabaseAdmin` was imported as a convenience alias but the `??` fallback pattern creates an unconditional service role bypass. The Proxy never returns falsy.

**Fix — 2 options:**

**Option A (recommended): Convert to wrapper with explicit auth**
```typescript
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const supabase = await createServerRlsClient()
    const cookieStore = await cookies()
    const activeTenantId = await readTenantIdFromCookies(cookieStore)
    const { searchParams } = new URL(req.url)
    const tenantId = searchParams.get('tenantId') || activeTenantId || null

    // Use RLS client only — no service role
    let query = supabase
      .from('participant_sessions')
      .select(`id, display_name, tenant_id, participant_count, started_at, status, host_user_id, tenant:tenants!participant_sessions_tenant_id_fkey(name)`)
      .order('created_at', { ascending: false })
      .limit(100)

    // Apply tenant filter in SQL, not JavaScript
    if (tenantId) {
      query = query.eq('tenant_id', tenantId)
    }

    const { data, error } = await query
    // ... mapping logic unchanged
  },
})
```

**Option B (minimal): Remove supabaseAdmin import**
```typescript
// Delete: import { supabaseAdmin } from '@/lib/supabase/server'
// Change: const client = supabaseAdmin ?? supabase
// To:     const client = supabase
```

**Additional fix:** Move tenant filtering from JavaScript to SQL (`query.eq('tenant_id', tenantId)`) to prevent 100-row cross-tenant data loading.

**Risks:** If any client relies on admin-level session listing (all tenants), it breaks. Verify no admin UI depends on this route before fixing — admin panels should have their own `admin/sessions` route.  
**Design decisions:** None — this is a security fix, not a product change.  
**Success criteria:** Route only returns sessions visible via RLS to the authenticated user. No supabaseAdmin import. Tenant filter applied in SQL.

---

### APC-001: 4 different error response formats coexist

**Scope:** All 287 routes (systemic)

**Problem:** 266 routes use `{ error: msg }`, 2 use `{ message: msg }`, 5 throw. The `errorResponse()` helper from `lib/api/errors.ts` produces `{ error, code?, requestId }` but only the wrapper uses it. Zero routes call `errorResponse()` directly.

**Root cause:** The wrapper (`apiHandler`) was built after 251 routes existed. No migration has been done on error format yet.

**Fix:** This converges automatically with wrapper adoption. No separate remediation needed — each migration batch standardizes the error format for migrated routes. Document the canonical shape as the target:

```typescript
// Canonical error shape (produced by errorResponse()):
{
  error: string,       // Human-readable message
  code?: string,       // Machine-readable code (e.g., 'VALIDATION_ERROR')
  requestId: string,   // Trace ID
  details?: unknown    // Validation details (Zod flatten)
}
```

**Immediate action:** Fix the 2 `{ message: msg }` routes in next available batch:
- `app/api/admin/award-builder/seed-test-badges/route.ts`
- `app/api/billing/usage/aggregate/route.ts`

**Risks:** Client code that parses `error.message` instead of `error.error` will break for those 2 routes. Check frontend callers first.  
**Design decisions:** None — error shape already decided by wrapper implementation.  
**Success criteria:** No new routes use `{ message }` format. Wrapper-migrated routes automatically use canonical shape.

---

## 2. P2 Fixes

### APC-002: 13 RLS-only routes — defense-in-depth gap

**Action:** Add `getUser()` check to medium-sensitivity routes during wrapper migration. Low-sensitivity routes (billing/products, toolbelt collections) can remain RLS-only but should be documented as intentional with a code comment.

**Priority routes for auth addition:**
- `sessions/route.ts` — covered by APC-003 fix above
- `participants/route.ts` — medium sensitivity
- `participants/[participantId]/route.ts` — medium sensitivity
- `sessions/[sessionId]/route.ts` — medium sensitivity

**Deferred (low sensitivity, RLS sufficient):**
- `game-reactions/batch`, `billing/products`, `plans/[planId]/play`, `media/fallback`, `toolbelt/conversation-cards/*`, `tenants/invitations/[token]`

---

### APC-004: ~158 mutation routes without input validation

**Action:** Not a separate task. Wrapper migration adds `input` schema support. Prioritize validation for:
1. Financial routes (billing, checkout, subscription)
2. GDPR routes (gdpr/delete, gdpr/export, consent)
3. Admin operations (admin/*, system/*)
4. User-facing mutations that accept free-text (games/builder, media/upload)

Already tracked: each batch below notes which routes need Zod schemas.

---

### APC-005: 7.3% rate-limiting coverage

**Action:** Already tracked as SEC-002b. Each migration batch adds `rateLimit` tier to appropriate routes. See batch definitions below.

---

### APC-007: `billing/usage/aggregate` — x-api-key auth

**Action:** Keep as special-case. Verify timing-safe comparison for API key check. Document as intentional non-wrapper route.

---

### APC-008 / APC-009 / APC-010: tenantAuth, participant-token, hidden auth

**Action:** Blocked on DD-1 (tenantAuth mapping) and DD-2 (participant auth mode) finalization. Tracked as Batch 4 and Batch 5 below.

---

### APC-013: Multi-method routes with asymmetric auth

**Action:** Resolves with TI-004 and wrapper migration. The wrapper enforces auth per `apiHandler()` call, so multi-method files with different auth automatically get explicit per-method config.

---

## 3. Wrapper Migration Batches

> Split per GPT feedback: "Easy mechanical" vs "Easy but regression-sensitive"
> **Revised after Batch 1 deep-dive:** Routes re-classified based on code inspection.

### Batch 1: Easy Mechanical (7 routes) ✅ KLAR (2026-03-10)

> **Execution slice — implementation-ready.**

#### Routes removed from original Batch 1 (moved to Batch 2)

| Route | Reason |
|-------|--------|
| `games/builder` (POST) | 486 lines, multi-table transaction, TI-001 fix site, complex media resolution. Not mechanical. |
| `admin/gamification/seed-rules` | Multi-method (GET + POST) — was misclassified as single-method. |
| `admin/licenses/grant-personal` | Imports `requireSystemAdmin` from **`@/lib/auth/requireSystemAdmin`** (old pattern, returns `NextResponse \| void` not throw). 5-step transaction with financial implications. |

#### Final Batch 1 route list

| # | Route Path | Method | Lines | Wrapper Config |
|---|-----------|--------|-------|----------------|
| 1 | `app/api/system/metrics/route.ts` | GET | 157 | `auth: 'system_admin'` |
| 2 | `app/api/participants/tokens/cleanup/route.ts` | POST | 114 | `auth: 'cron_or_admin'` |
| 3 | `app/api/participants/tokens/revoke/route.ts` | POST | 91 | `auth: 'user'` (+ inline `requireSessionHost`) |
| 4 | `app/api/participants/tokens/extend/route.ts` | POST | 106 | `auth: 'user'` (+ inline `requireSessionHost`) |
| 5 | `app/api/participants/sessions/[sessionId]/restore/route.ts` | POST | 81 | `auth: 'user'` (+ inline `requireSessionHost`) |
| 6 | `app/api/participants/sessions/[sessionId]/archive/route.ts` | POST | 84 | `auth: 'user'` (+ inline `requireSessionHost`) |
| 7 | `app/api/consent/log/route.ts` | POST | 101 | `auth: 'public'`, `rateLimit: 'strict'`, `input: consentLogSchema` |

---

#### Route 1: `system/metrics` — GET

**Current auth:** `requireSystemAdmin()` from `@/lib/api/auth-guard` (standard throw-on-fail pattern).
**Current client:** Raw `createClient(supabaseUrl, supabaseKey)` using env vars directly. NOT `createServiceRoleClient()`.
**Input schema:** None needed (GET, no body).
**Rate limiting:** None (admin-only, low abuse risk).

**Target wrapper config:**
```typescript
export const GET = apiHandler({
  auth: 'system_admin',
  handler: async ({ req }) => {
    // Keep raw createClient() — this route uses direct env vars for metrics queries
    // Move all 5 helper functions + SystemMetrics type unchanged
    // Remove manual AuthError catch — wrapper handles it
  },
})
```

**Expected code changes:**
1. Add `import { apiHandler } from '@/lib/api/route-handler'`
2. Remove `import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'`
3. Remove `await requireSystemAdmin()` line
4. Remove outer `try/catch` that handles `AuthError` — wrapper does this
5. Keep inner Supabase error handling (500 responses)
6. Wrap in `apiHandler({ auth: 'system_admin', handler })`
7. Keep `export const dynamic = 'force-dynamic'`

**Regression notes:** None. Pure mechanical. The raw `createClient()` usage is unusual but stays inside the handler — wrapper doesn't touch it.

---

#### Route 2: `participants/tokens/cleanup` — POST

**Current auth:** `requireCronOrAdmin()` from `@/lib/api/auth-guard`.
**Current client:** `createServiceRoleClient()`.
**Input schema:** None needed (no request body — cron job trigger).
**Rate limiting:** None (cron/admin-only).

**Target wrapper config:**
```typescript
export const POST = apiHandler({
  auth: 'cron_or_admin',
  handler: async () => {
    // Business logic unchanged — disconnect expired participants, archive old sessions
    // Remove manual AuthError catch — wrapper handles it
  },
})
```

**Expected code changes:**
1. Add `import { apiHandler } from '@/lib/api/route-handler'`
2. Remove `import { requireCronOrAdmin, AuthError } from '@/lib/api/auth-guard'`
3. Remove `await requireCronOrAdmin()` line
4. Remove outer `AuthError` catch
5. Wrap in `apiHandler({ auth: 'cron_or_admin', handler })`

**Regression notes:** None. The `cron_or_admin` wrapper mode normalizes the return value — `{ via: 'cron' }` maps to `auth: null`, `{ via: 'admin' }` maps to the admin's AuthContext. This route doesn't use the auth context, so both paths are safe.

---

#### Route 3: `participants/tokens/revoke` — POST

**Current auth:** Reads request body → DB lookup → `requireSessionHost(participant.session_id)`.
**Current client:** `createServiceRoleClient()`.
**Input schema:** None exists. **Do not add one** — the body validation is interleaved with DB lookups (need participant_token or participant_id, then session_id is derived from DB). Zod can't validate DB-dependent constraints.
**Rate limiting:** None.

**Target wrapper config:**
```typescript
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const body = await req.json()
    // Keep existing validation + requireSessionHost(participant.session_id) inline
    // Business logic unchanged
  },
})
```

**Why `auth: 'user'` and not `auth: { sessionHost }`:** The sessionHost auth mode in the wrapper is a deferred interface that falls back to `requireAuth()`. The actual session ownership check happens AFTER a DB lookup to find the participant's session_id. Since `requireSessionHost()` internally calls `requireAuth()`, using `auth: 'user'` (which calls `requireAuth()`) + inline `requireSessionHost()` results in a double `requireAuth()` call. This is harmless — `requireAuth()` is idempotent (reads cookies, no side effects).

**Expected code changes:**
1. Add `import { apiHandler } from '@/lib/api/route-handler'`
2. Keep `import { requireSessionHost, AuthError } from '@/lib/api/auth-guard'` (still needed inline)
3. Remove outer `AuthError` catch — wrapper handles `AuthError` thrown by `requireSessionHost()`
4. Wrap in `apiHandler({ auth: 'user', handler })`
5. Move `await request.json()` to handler body (wrapper doesn't parse it since no `input` schema)

**Regression notes:** Double `requireAuth()` call (once by wrapper, once inside `requireSessionHost()`). Both are read-only cookie/JWT checks — no side effects. Auth behavior is identical: 401 if not logged in, 403 if not session host.

---

#### Route 4: `participants/tokens/extend` — POST

**Current auth:** Same pattern as revoke — body → DB lookup → `requireSessionHost(participant.session_id)`.
**Current client:** `createServiceRoleClient()`.
**Input schema:** None. Same reason as revoke — validation depends on DB state.
**Rate limiting:** None.

**Target wrapper config:** Same as Route 3 (`auth: 'user'` + inline `requireSessionHost()`).

**Expected code changes:** Same pattern as Route 3.

**Regression notes:** Same as Route 3. Additionally imports `REJECTED_PARTICIPANT_STATUSES` from `@/lib/api/play-auth` — keep unchanged.

---

#### Route 5: `participants/sessions/[sessionId]/restore` — POST

**Current auth:** `requireSessionHost(sessionId)` where sessionId comes from URL params.
**Current client:** `createServiceRoleClient()`.
**Input schema:** None (no request body — sessionId from URL).
**Rate limiting:** None.

**Target wrapper config:**
```typescript
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ params }) => {
    const { sessionId } = params
    await requireSessionHost(sessionId)
    // Business logic unchanged — restore archived session
  },
})
```

**Expected code changes:**
1. Add `import { apiHandler } from '@/lib/api/route-handler'`
2. Keep `import { requireSessionHost, AuthError } from '@/lib/api/auth-guard'` (still needed inline)
3. Remove `{ params }` from function signature — wrapper resolves params via `segmentData`
4. Remove outer `AuthError` catch
5. Remove `const { sessionId } = await params` — use `params.sessionId` from wrapper context
6. Wrap in `apiHandler({ auth: 'user', handler })`

**Regression notes:** Same double `requireAuth()` pattern as Routes 3-4. Here sessionId comes from URL params (wrapper resolves these), so the flow is cleaner.

---

#### Route 6: `participants/sessions/[sessionId]/archive` — POST

**Current auth:** Same as restore — `requireSessionHost(sessionId)` from URL params.
**Current client:** `createServiceRoleClient()`.
**Input schema:** None.
**Rate limiting:** None.

**Target wrapper config:** Same as Route 5.

**Expected code changes:** Same pattern as Route 5.

**Regression notes:** Same as Route 5.

---

#### Route 7: `consent/log` — POST (APC-006 P1 fix)

**Current auth:** None (public endpoint).
**Current client:** `createServiceRoleClient()` — always. Cast to `any` for untyped tables.
**Input schema:** **Must be created.** No existing Zod schema. The `ConsentAuditEvent` TypeScript interface exists at `lib/consent/types.ts` — use as reference.
**Rate limiting:** **Must be added** — `strict` tier (5 req/min per IP).

**Target wrapper config:**
```typescript
import { z } from 'zod'
import { apiHandler } from '@/lib/api/route-handler'

const cookieConsentStateSchema = z.object({
  necessary: z.boolean(),
  functional: z.boolean(),
  analytics: z.boolean(),
  marketing: z.boolean(),
})

const consentLogSchema = z.object({
  consentId: z.string().min(1).max(100),
  eventType: z.enum(['granted', 'updated', 'withdrawn', 'expired', 'reprompted']),
  newState: cookieConsentStateSchema,
  consentVersion: z.string().min(1).max(20),
  userId: z.string().uuid().optional(),
  previousState: cookieConsentStateSchema.optional(),
  locale: z.string().max(10),
  dntEnabled: z.boolean(),
  gpcEnabled: z.boolean(),
  pageUrl: z.string().max(2000),
  referrer: z.string().max(2000),
  userAgent: z.string().max(500),
})

export const POST = apiHandler({
  auth: 'public',
  rateLimit: 'strict',
  input: consentLogSchema,
  handler: async ({ body, req }) => {
    // body is validated ConsentAuditEvent shape
    // IP extraction from x-forwarded-for stays in handler
    // Keep createServiceRoleClient() — anonymous users don't have RLS sessions
    // Keep dual-insert logic (cookie_consent_audit + anonymous_cookie_consents)
    // Keep non-blocking error handling (log errors, return success)
    return NextResponse.json({ success: true })
  },
})

export const dynamic = 'force-dynamic'
```

**Schema notes:**
- `eventType` enum matches `ConsentAuditEvent['eventType']`: `'granted' | 'updated' | 'withdrawn' | 'expired' | 'reprompted'`. The original code's manual check only required `'eventType'` to be truthy; the schema enforces valid enum values.
- `newState` uses exact `CookieConsentState` shape (4 booleans). Original handler used `?? false` defaults — Zod makes all 4 required, matching the TS interface.
- `userId` is optional (anonymous consent). When provided, must be valid UUID.
- `consentId` is a string, not UUID — consent IDs may be generated client-side with non-UUID format.
- Max lengths prevent abuse: `pageUrl` 2000, `referrer` 2000, `userAgent` 500, `consentVersion` 20.

**Expected code changes:**
1. Add `import { z } from 'zod'` and `import { apiHandler } from '@/lib/api/route-handler'`
2. Remove `import type { ConsentAuditEvent } from '@/lib/consent/types'` (Zod schema replaces TS type for validation)
3. Add `consentLogSchema` at top of file
4. Replace `export async function POST(request: NextRequest)` with `export const POST = apiHandler({...})`
5. Remove manual field validation (`if (!event.consentId || ...`) — Zod handles this
6. Remove manual `await request.json()` — wrapper does this via `input` schema
7. Remove outer try/catch — wrapper handles errors (but keep inner non-blocking error handling for DB operations)
8. Keep `export const dynamic = 'force-dynamic'`

**Regression notes:**
- **New 429 responses:** Frontend consent code (`lib/consent/cookie-consent-manager.ts`) must handle rate limit responses gracefully. Since consent logging is non-critical (the current code returns `{ success: true }` even on errors), the frontend likely doesn't check the response. Verify this.
- **New 400 responses:** Malformed consent events that were previously accepted silently will now be rejected. This is desired behavior.
- **Error shape change:** Current errors return `{ error: 'Missing required fields' }` or `{ success: true }`. Wrapper errors return `{ error: string, code?: string, requestId: string }`. Frontend consent code likely ignores error responses entirely.

---

#### Batch 1 Verification Checklist

**Pre-implementation:**
- [ ] Verify no admin UI depends on `system/metrics` error shapes
- [ ] Verify `cookie-consent-manager.ts` doesn't check `consent/log` response body for error handling
- [ ] Confirm `REJECTED_PARTICIPANT_STATUSES` import in `extend` route is from `@/lib/api/play-auth`

**Post-implementation (per route):**
- [ ] `npx tsc --noEmit` = 0 new errors
- [ ] `npx next lint` = no new warnings in modified files
- [ ] Each route: valid request → same response shape as before (200/201)
- [ ] Each route: no auth → 401 (except consent/log which should accept)
- [ ] Each route: error responses now include `requestId` field (additive, non-breaking)

**Post-implementation (batch-level):**
- [ ] `system/metrics`: GET with system_admin → returns `SystemMetrics` object
- [ ] `participants/tokens/cleanup`: POST with cron secret → returns `{ success, disconnected_participants, archived_sessions, cleaned_at }`
- [ ] `participants/tokens/revoke`: POST with session host auth → returns `{ success, participant, revoked_at, message }`
- [ ] `participants/tokens/extend`: POST with session host auth → returns `{ success, participant, new_expiry, message }`
- [ ] `participants/sessions/[id]/restore`: POST with session host auth → returns `{ success, session, restored_status, message }`
- [ ] `participants/sessions/[id]/archive`: POST with session host auth → returns `{ success, session, archived_at, message }`
- [ ] `consent/log`: POST with no auth + valid body → returns `{ success: true }`
- [ ] `consent/log`: POST with no auth + invalid body → returns 400 with `{ error, code: 'VALIDATION_ERROR', requestId }`
- [ ] `consent/log`: POST burst (6+ in 1 min) → returns 429

**Expected gains:**
- Wrapper coverage: 36 → 43 = **15.0%** (+2.5%)
- APC-006 P1 resolved (consent/log rate limiting + validation)
- `cron_or_admin` wrapper mode validated in production
- `requireSessionHost` inline pattern established for 4 routes (pending full sessionHost wrapper support in Phase 3)

**Design decisions needed:** None.

#### Batch 1 Exit Criteria

All of the following must be true before Batch 1 is marked complete:

- [x] All 7 routes migrated to `apiHandler()` wrapper
- [x] No behavior changes except: (a) standardized error shape with `requestId`, (b) `consent/log` now validates input + rate-limits
- [x] `npx tsc --noEmit` — 0 new type errors
- [x] No auth regressions in the 4 sessionHost routes (revoke, extend, restore, archive)
- [x] `consent/log` accepts the same payload shape as before (field names unchanged) or documents breaking change explicitly
- [x] `consent/log` rejects malformed payloads with 400 (new behavior, intended)
- [x] `consent/log` returns 429 on burst (new behavior, intended)

✅ **BATCH 1 COMPLETE (2026-03-10)** — Post-implementation verification passed (2026-03-11)

**Noteringar:**
- All 7 routes migrated with 0 new type errors (`tsc --noEmit` confirmed — only pre-existing test errors in `tests/gamification/step7-behavioral.test.ts` remain)
- Removed unused `AuthError` imports from all routes, removed unused `logger` import from `system/metrics`
- Removed unnecessary `NextRequest` type imports from `revoke` and `extend` routes (wrapper provides typed `req`)
- `consent/log` Zod schema matches `ConsentAuditEvent` interface exactly — `locale`, `dntEnabled`, `gpcEnabled`, `pageUrl`, `referrer`, `userAgent` are all required (matching the TS interface)
- SessionHost routes use `auth: 'user'` + inline `requireSessionHost()` as documented — double `requireAuth()` call is idempotent
- Wrapper coverage: 36 → 43 = **15.0%**

**Post-implementation verification (GPT Review #16):**

1. **`consent/log` payload compatibility — VERIFIED SAFE.** Only one caller exists: `lib/consent/cookie-consent-manager.ts` line 411 (`logConsentEvent` function). It constructs a `ConsentAuditEvent` object where all 6 questioned fields are always populated: `locale` from `StoredCookieConsent.locale` (required string), `dntEnabled`/`gpcEnabled` from `StoredCookieConsent` (required booleans), `pageUrl` from `window.location.href`, `referrer` from `document.referrer || ''`, `userAgent` from `navigator.userAgent`. No other callers exist in the codebase. The caller uses fire-and-forget (`fetch().catch(() => {})`) and never inspects the response — so 400/429 responses cause zero UX impact.

2. **`tokens/cleanup` cron_or_admin behavior — VERIFIED IDENTICAL.** Old: `requireCronOrAdmin()` returns `{ via: 'cron' }` or `{ via: 'admin', ...ctx }`, route ignores return value, uses `createServiceRoleClient()` only. New: wrapper calls same `requireCronOrAdmin()`, normalizes to `auth: null` (cron) or `auth: AuthContext` (admin), handler never accesses `auth`, uses `createServiceRoleClient()` only. Business logic path is identical for both invocation modes. Only difference: error responses now include `requestId` (additive, non-breaking).

---

### Batch 2: Easy but Regression-Sensitive (9 routes)

**Why grouped:** These use auth-guard functions directly and are structurally wrapper-ready, but have characteristics that increase regression risk: multi-method exports, service role with complex business logic, financial data handling, multi-step transactions, or non-standard auth imports.

**Includes 3 routes moved from Batch 1 after code inspection.**

#### Batch 2 Preflight (2026-03-11)

Three open questions were resolved before implementation:

**Q1: `sessions/route.ts` — auth intent + supabaseAdmin removal**

Code inspection confirms:
- **No auth at all** — any HTTP client can call `GET /api/sessions` and get all sessions
- `const client = supabaseAdmin ?? supabase` — since `supabaseAdmin` is always-truthy Proxy, this **unconditionally** uses service role, bypassing all RLS
- Sole caller: `SessionsPage` (admin page at `/admin/sessions`, `/admin/tenant/[tenantId]/sessions`), which checks `can('admin.participants.list')` client-side only

RLS policies on `participant_sessions`:
1. "Hosts can view their own sessions" → `auth.uid() = host_user_id`
2. "System admins can view all sessions" → `is_system_admin()`
3. "Public can view active sessions by code" → `status = 'active'`

**Verdict:** Cannot simply remove `supabaseAdmin` and switch to RLS client. RLS has no policy for "tenant admin sees all sessions in their tenant" — a tenant admin who is NOT a session host would only see active sessions, breaking the admin view. Two options:

- **(A) Add RLS policy** — `CREATE POLICY "Tenant admins can view tenant sessions"` → full APC-003/011 resolution but requires migration + policy review
- **(B) Add `auth: 'user'` + keep service role** → fixes the zero-auth vulnerability, keeps existing data behavior, but APC-003/011 stays partially open

**Decision: Option B.** Wrap with `auth: 'user'`, keep `createServiceRoleClient()` (replace deprecated `supabaseAdmin` Proxy). This is a **partial P1 fix** — closes the authentication gap (zero auth → requires user). Full service-role elimination is a separate task requiring an RLS migration and is out of scope for Batch 2. APC-003/APC-011 status updated to "partially resolved → auth gap closed, service role cleanup deferred to RLS migration."

**Q2: `admin/licenses/grant-personal` — old vs new requireSystemAdmin**

| | Old (`@/lib/auth/requireSystemAdmin`) | New (`@/lib/api/auth-guard`) |
|---|---|---|
| **Purpose** | Page guard for server components | Route handler guard |
| **On failure** | Calls `redirect()` (throws `NEXT_REDIRECT`) | Throws `AuthError` |
| **On success** | Returns `AuthContext` | Returns `AuthContext` |
| **Auth check** | `effectiveGlobalRole !== 'system_admin'` | Same |

Current route code is **broken by design**: it calls the page guard (`redirect()`) inside a route handler, then checks `if (adminCheck instanceof NextResponse)` — which is dead code since `requireSystemAdmin()` never returns `NextResponse`. It "works" only because Next.js catches the `NEXT_REDIRECT` error thrown by `redirect()`.

**Decision: SAFE to migrate.** Switch to `apiHandler({ auth: 'system_admin' })`. Semantically identical auth check, proper error handling (JSON 403 instead of redirect), dead code removed. **No semantic drift.**

**Q3: Conversation-cards (3 routes) — hybrid auth pattern**

All three routes use the same pattern:
1. `requireAuth()` → get context
2. Check `ctx.effectiveGlobalRole === 'system_admin'` → set `isSystemAdmin` flag
3. Global-scope resources → system admin only
4. Tenant-scope resources → `requireTenantRole(['owner', 'admin'], tenantId)`
5. System admins bypass tenant role check

apiHandler's `auth: { tenantRole }` calls `requireTenantRole()` **unconditionally** — confirmed at `auth-guard.ts:54-55`, there is **no system admin bypass** in `requireTenantRole()`. This means:
- System admins not in the tenant → blocked with 403
- Data-dependent tenantId (from resource, not request) → can't pass to wrapper config

These routes already use proper `requireAuth()` + `AuthError` catches + consistent `jsonError()` format. Minimal wrapper benefit, high semantic drift risk.

**Decision: DEFER to Phase 3+.** Requires apiHandler enhancement to support conditional `systemAdmin | tenantRole` auth with data-dependent tenantId. Filed as future work.

#### Final Batch 2 Route List

| # | Route | Methods | Risk Factor | Wrapper Config |
|---|-------|---------|-------------|----------------|
| 1 | `sessions/route.ts` (partial P1 fix) | GET | Zero auth, keep service role (replaces deprecated Proxy) | `auth: 'user'` |
| 2 | `billing/quotes` | GET, POST | Multi-method, financial data, Zod | `auth: 'system_admin'` × 2 |
| 3 | `billing/quotes/[id]` | GET, PATCH, DELETE | Multi-method, financial data, Zod | `auth: 'system_admin'` × 3 |
| 4 | `admin/licenses/grant-personal` | POST | 5-step transaction, old import fixed | `auth: 'system_admin'` |
| 5 | `gamification/burn` | POST | Financial (balance accounting), idempotency key | `auth: 'cron_or_admin'` |
| 6 | `games/builder` (POST) | POST | 486 lines, multi-table transaction, TI-001 fix site | `auth: 'user'` |
| 7 | `games/builder/[id]` | GET, PUT | 2-method route, 800 lines, service role, TI-001 fix site | `auth: 'user'` × 2 |
| 8 | `admin/gamification/seed-rules` | GET, POST | Multi-method, 3 modes | `auth: 'system_admin'` × 2 |
| 9 | `participants/sessions/[sessionId]` | GET, DELETE | GET intentionally public (join flow), DELETE requires host | GET: `auth: 'public'`, DELETE: `auth: 'user'` + inline `requireSessionHost` |

**Q4 (GPT Review #18): `participants/sessions/[sessionId]` GET PII check**

Verified safe. The handler uses `select('*')` via service role but maps to a **whitelist of 10 fields** in the response:
`id`, `sessionCode`, `displayName`, `description`, `status`, `participantCount`, `maxParticipants` (from settings), `expiresAt`, `createdAt`, `endedAt`.

Sensitive columns fetched but **never exposed**: `host_user_id`, `tenant_id`, `plan_id`, `game_id`, `settings` (full), `archived_at`, `paused_at`.
No joins. No participant names or emails. This is the **participant join flow** (enter session code → see session info).

**Routes removed from Batch 2 (3 → deferred to Phase 3+):**

| Route | Reason |
|-------|--------|
| `admin/toolbelt/conversation-cards/collections/[collectionId]` | Hybrid auth: system admin bypass + conditional tenant role. apiHandler lacks `systemAdmin \| tenantRole` mode. |
| `admin/toolbelt/conversation-cards/collections` | Same hybrid auth pattern. |
| `admin/toolbelt/conversation-cards/cards/[cardId]` | Same hybrid auth pattern. |

**Why routes 4, 6, 8 were moved from Batch 1:**
- **#4 `admin/licenses/grant-personal`:** Was using page guard (`redirect()`-based) in route handler — preflight confirmed safe to switch to auth-guard (see Q2 above).
- **#6 `games/builder`:** 486 lines with multi-table inserts (game → purposes → cover → steps → materials → artifacts → variants → tools), `resolveMediaRefsToGameMediaIds()` helper, and is the TI-001 fix site. Not mechanical.
- **#8 `admin/gamification/seed-rules`:** Exports both GET and POST with different response shapes and 3 modes (missing/all/reset). Multi-method routes require separate `apiHandler()` calls.

**Expected gains:**
- Wrapper coverage: 43 → 52 = **18.1%** (+3.1%)
- APC-003/011 partially resolved (auth gap closed on sessions/route.ts)
- Multi-method wrapper pattern validated for future batches
- Financial routes (billing/quotes) get consistent error format + requestId tracing
- grant-personal broken page-guard usage fixed

**Risks:**
- `sessions/route.ts` — service role retained (existing behavior). Replacing `supabaseAdmin` with `createServiceRoleClient()` is a non-behavioral refactor.
- `billing/quotes` — financial data; verify no external systems depend on current error shapes.
- `games/builder/[id]` — 4 methods in one file; each gets its own `apiHandler()` call. Verify TI-001 fix (tenant scoping) is preserved.
- `participants/sessions/[sessionId]` GET — intentionally public for join flow (session code → session info). Wrapping with `auth: 'public'` preserves this.

**Success criteria:**
- `tsc --noEmit` = 0 new errors
- `sessions/route.ts` requires auth (no longer callable without authentication)
- `grant-personal` returns JSON 403 instead of redirect on auth failure
- Quote endpoints return identical data for valid requests
- Builder CRUD operations work end-to-end
- `participants/sessions/[sessionId]` GET works without auth (join flow), DELETE requires session host

#### Batch 2 Implementation (2026-03-12) ✅ KLAR

**All 9 routes migrated to `apiHandler()` wrapper.** `tsc --noEmit` = 0 new errors (21 pre-existing in `step7-behavioral.test.ts` unchanged).

**Corrections discovered during implementation:**
- `billing/quotes/[id]` exports GET + PATCH + **DELETE** (3 methods, not 2 as listed)
- `games/builder/[id]` exports GET + **PUT** only (2 methods, not 4 as listed)
- Route table above updated to reflect actual exports

**Changes per route:**

| # | Route | Changes Applied |
|---|-------|----------------|
| 1 | `sessions/route.ts` | `apiHandler({ auth: 'user' })`. Replaced `supabaseAdmin ?? supabase` with `createServiceRoleClient()`. Removed `createServerRlsClient` import. |
| 2 | `billing/quotes/route.ts` | GET + POST → 2× `apiHandler({ auth: 'system_admin' })`. POST uses `input: createQuoteSchema`. Replaced `supabaseAdmin` → `createServiceRoleClient()`. Removed manual auth try/catch. |
| 3 | `billing/quotes/[id]/route.ts` | GET + PATCH + DELETE → 3× `apiHandler({ auth: 'system_admin' })`. PATCH uses `input: updateQuoteSchema`. Replaced `supabaseAdmin` → `createServiceRoleClient()`. |
| 4 | `admin/licenses/grant-personal/route.ts` | `apiHandler({ auth: 'system_admin' })`. **Bugfix:** removed broken page-guard import (`@/lib/auth/requireSystemAdmin` → calls `redirect()`). Removed dead `instanceof NextResponse` check. |
| 5 | `gamification/burn/route.ts` | `apiHandler({ auth: 'cron_or_admin' })`. Kept manual validation inline (branching on sinkId). |
| 6 | `games/builder/route.ts` | `apiHandler({ auth: 'user' })`. Auth context passed as `auth` param. TI-001 inline checks preserved. |
| 7 | `games/builder/[id]/route.ts` | GET + PUT → 2× `apiHandler({ auth: 'user' })`. `dynamic`/`revalidate` exports preserved. TI-001 inline checks preserved. |
| 8 | `admin/gamification/seed-rules/route.ts` | GET + POST → 2× `apiHandler({ auth: 'system_admin' })`. Inline POST body destructuring kept. |
| 9 | `participants/sessions/[sessionId]/route.ts` | GET → `apiHandler({ auth: 'public' })` with comment "Intentionally public: participant join flow." DELETE → `apiHandler({ auth: { sessionHost } })` + inline `requireSessionHost(sessionId)`. |

**Coverage update:** 43 → 52 routes = **18.1%** (+3.1%)

**Exit criteria verification:**
- [x] `tsc --noEmit` = 0 new errors
- [x] sessions/route.ts now requires `auth: 'user'` (was zero auth)
- [x] grant-personal returns proper JSON 403 (was calling `redirect()`)
- [x] Financial routes (quotes) use consistent error format with requestId
- [x] Builder TI-001 tenant validation preserved
- [x] participants/sessions GET is public, DELETE requires session host

---

### Batch 3: Inline `getUser()` — Mechanical Subset (82 routes: 29 + 27 + 26)

**Why grouped:** The largest pool. These use inline `supabase.auth.getUser()` which maps directly to `auth: 'user'`. Split into three sub-batches:

- **3A:** Simple single/multi-method, same core pattern (29 routes) ✅ KLAR
- **3B-1:** Single-method, no Zod/rate-limit (27 routes) ✅ KLAR
- **3B-2:** Multi-method or has Zod/rate-limit (26 routes) — NEXT

#### Batch 3A Implementation (2026-03-13) ✅ KLAR

**29 route files migrated** (originally miscounted as 28 — the 9 sub-groups sum to 29). `tsc --noEmit` = 0 errors.

**Scope:** accounts/ (7), billing/ (3), gamification/ (3), gdpr/ (2), journey/ (3), media/ (3), participants/ (2), plans/ (3), play/ (3).

**Excluded (11 routes):** 3 optional-auth (`browse/filters`, `games/featured`, `games/search`), 7 admin-check, 1 demo.

**Patterns used:**
- `auth!.user!.id` → `userId` for most routes
- `const user = auth!.user!` then `user.id` → `userId` for routes needing full User object (`deriveEffectiveGlobalRole` in plans/bulk, plans/search; `user_metadata` in gamification/route)
- `applyRateLimit(request, 'xxx')` / `applyRateLimitMiddleware(request, 'xxx')` → `rateLimit: 'xxx'` in wrapper config
- `createServerRlsClient` preserved where needed for DB queries or `signOut()`
- Multi-method files (gdpr/delete POST+DELETE, media/templates GET+POST, plans/schedules GET+POST, play/sessions GET+POST) each get separate `apiHandler()` calls

**Coverage update:** 52 → 81 routes = **28.2%** (+10.1%)

> **Metrics correction (2026-03-13):** Previous session reported 52→66 (23.0%). This was undercounted — PowerShell `Select-String` with bracket-path globbing missed 15 dynamic-segment routes (e.g., `billing/dunning/[id]/cancel`, `admin/cosmetics/[id]/rules`) already in the 52 base. Verified via recursive `Get-ChildItem` scan: true total is **81 apiHandler files out of 287**.

**Revised Batch 3 remaining estimates (post-3A):**
- inline:getUser remaining: 69 routes (was 98, −29 in 3A)
- After strict GPT triage: **55 migratable** in 3B, 13 excluded (5 optional-auth, 8 admin/multi-role patterns)
- 1 deferred (coach-diagrams/svg: dual-auth DD-2 pattern)

#### Batch 3B Scope (2026-03-13)

**Selection criteria** (per GPT recommendation):
```
has supabase.auth.getUser()
AND not apiHandler
AND not tenantAuth / isSystemAdmin / assertTenantAdmin / is_system_admin / has_tenant_role
AND not optional-auth behavior (browse/filters, games/featured, games/search, demo/status, games/[gameId]/related)
AND not admin-pattern (app_metadata role checks in admin/ or games/publish)
AND not dual-auth (user OR participant-token: coach-diagrams/svg, spatial-artifacts/svg)
```

**3B-1: Single-method, no rate limit, no Zod (27 routes)** ✅ KLAR (2026-03-13)

**Noteringar:** All 27 routes migrated to `apiHandler({ auth: 'user' })`. Coverage 81→108 (37.6%). Billing routes: refactored `requireUser()` and `userTenantRole()` helpers to accept userId directly instead of redundantly calling `getUser()`. Virtual run bypass in play/abandon and play/heartbeat preserved after auth. `tsc --noEmit` = 0 errors.

| Domain | Routes |
|--------|--------|
| billing/tenants/ | `[tenantId]/invoices/stripe` (P), `[tenantId]/seats/[seatId]` (A), `[tenantId]/stripe-customer` (P) |
| media/ | `templates/[templateId]` (D) |
| participants/ | `[participantId]/role` (P), `sessions/[sessionId]/analytics` (G), `sessions/[sessionId]/control` (A), `sessions/[sessionId]/export` (G) |
| plans/ | `[planId]/blocks` (P), `[planId]/blocks/reorder` (P), `[planId]/copy` (P), `[planId]/notes/private` (P), `[planId]/notes/tenant` (P), `[planId]/publish` (P), `[planId]/status` (P), `[planId]/versions` (G) |
| play/ | `[planId]/start` (P), `runs/[runId]` (G), `runs/[runId]/abandon` (P), `runs/[runId]/heartbeat` (P), `runs/[runId]/sessions/end` (P), `sessions/[id]/artifacts/state` (A), `sessions/[id]/command` (P), `sessions/[id]/decisions/[decisionId]` (A), `sessions/[id]/participants` (G), `sessions/[id]/participants/[participantId]` (A), `sessions/[id]/puzzles/progress` (G) |

**3B-2: Multi-method or has Zod/rate limit (26 routes)**

Triaged into two sub-batches based on regression risk (2025-07-17):

**3B-2a: Mechanical (16 routes)** ✅ KLAR (2025-07-17) — Auth maps cleanly to wrapper levels, business logic unchanged in handler body.

**Noteringar:**
- Wave 1 (10 routes): billing (6), media, plans/progress, signals, time-bank
- Wave 2 (6 routes): sessions/[id], runs/progress, decisions, outcome, roles, puzzles/props
- `resolveSessionViewer` routes → `auth: 'public'` + inline auth (signals POST, decisions GET, outcome GET, roles GET)
- Host-only routes → `auth: 'user'` with `userId = auth!.user!.id`
- Removed all `jsonError` helpers, `requireUser()`, unused `createServerRlsClient` imports
- `tsc --noEmit` = 0 errors after both waves

| Domain | Routes | Notes |
|--------|--------|-------|
| billing/tenants/ | `[tenantId]/invoices` (GP), `[tenantId]/invoices/[invoiceId]` (GP), `[tenantId]/invoices/[invoiceId]/payments` (GP), `[tenantId]/invoices/[invoiceId]/payments/[paymentId]` (GP), `[tenantId]/seats` (GP), `[tenantId]/subscription` (GPA) | Proven `requireUser()+userTenantRole()` pattern from 3B-1 |
| media/ | `[mediaId]` (GAD+ZOD) | 98 lines, LOW. Split auth: GET=public, PATCH/DELETE=user. Zod exists. |
| plans/ | `[planId]/progress` (GP) | 119 lines, simple `getUser()` → user, upsert |
| play/ | `sessions/[id]` (GA), `runs/[runId]/progress` (GP), `sessions/[id]/decisions` (GP), `sessions/[id]/outcome` (GPU), `sessions/[id]/roles` (GPA), `sessions/[id]/puzzles/props` (GA), `sessions/[id]/signals` (GP+ZOD), `sessions/[id]/time-bank` (GP+ZOD) | Host/viewer auth per method; Zod + rate-limit handled by wrapper where present |

**3B-2b: Regression-sensitive (10 routes)** — Complex auth, state machines, capability systems, atomic RPCs, or very high business logic that needs extra review.

| Domain | Route | Lines | Risk Factor |
|--------|-------|-------|-------------|
| learning/ | `courses/[courseId]/submit` (GP) | 177 | Quiz scoring + conditional reward RPC |
| plans/ | `[planId]` (GAD) | 280 | **VERY HIGH** — full capability system in all 3 methods |
| plans/ | `[planId]/blocks/[blockId]` (PD) | 207 | Reordering algorithm, deep 3-level nested query |
| plans/ | `schedules/[scheduleId]` (GUD) | 262 | 3 methods, N+2 queries, 47-line code duplication |
| play/ | `runs/[runId]/sessions` (GP) | 198 | Service role, multi-step creation, idempotency guard |
| play/ | `sessions/[id]/artifacts` (GP) | 582 | **HIGHEST** — multi-table, auto-reveal, role filtering, metadata sanitization |
| play/ | `sessions/[id]/assignments` (GPD) | 410 | 3 methods, batch ops, count recalculation |
| play/ | `sessions/[id]/secrets` (GP) | 215 | State machine, pre-condition validation for unlock/relock |
| play/ | `sessions/[id]/state` (GA) | 167 | 7-action state machine, dual auth (host + system_admin fallback), public GET |
| play/ | `sessions/[id]/triggers` (GPA) | 260 | Idempotency keys, atomic RPC `fire_trigger_v2_safe`, deprecated POST (410) |

**Excluded from 3B (13 routes):**
- 5 optional-auth: `browse/filters`, `demo/status`, `games/featured`, `games/search`, `games/[gameId]/related`
- 8 admin/multi-role patterns: `admin/games/{bulk,search}`, `admin/gamification/{dashboard,refund,rules,sinks}`, `billing/promo-codes`, `games/[gameId]/publish`
- 2 dual-auth (DD-2): `coach-diagrams/[diagramId]/svg`, `spatial-artifacts/[artifactId]/svg`

**3C: Removed** — ~~service role routes~~ folded into 3B where applicable; service role stays inside handler.

**3D: Removed** — ~~multi-method~~ folded into 3B-2.

**Risks:**
- Volume creates risk of regressions in multi-method routes. Mitigate with per-route smoke checks.
- Multi-method routes (3B-2) need careful per-method wrapper configuration.
- Service role usage stays inside handler — no wrapper-level changes needed.

**Design decisions needed:** None — all use `auth: 'user'` wrapper mode.

**Success criteria per sub-batch:**
- `tsc --noEmit` = 0 new errors after each sub-batch
- Spot-check 3 routes per sub-batch in the browser
- Error responses use canonical `{ error, requestId }` shape

---

### Batch 4: tenantAuth Migration (52 routes) — DD-1 FINALIZED ✅

> **Full details:** `implementation/dd1-execution-plan.md`

**Why grouped:** All use the legacy `tenantAuth` utility (`isSystemAdmin`, `isTenantAdmin`, `assertTenantAdminOrSystem`). DD-1 decided: `deriveEffectiveGlobalRole()` is canonical, `tenantAuth.isSystemAdmin()` deprecated.

**Infrastructure change:** `requireTenantRole()` in `auth-guard.ts` enhanced with system_admin bypass ✅ — adds `if (ctx.effectiveGlobalRole === 'system_admin') return { ...ctx, activeTenantRole: 'admin' }` matching `requireSessionHost` precedent.

**Route classification (52 routes → 4 groups):**

| Group | Count | Pattern | Wrapper Auth | Risk |
|-------|-------|---------|-------------|------|
| **A: Pure system_admin** | 15 | `isSystemAdmin` sole gate | `auth: 'system_admin'` | LOW |
| **A-mixed** | 3 | Mixed public/user + system_admin per method | Split `apiHandler` per method | LOW |
| **B: assertTenantAdminOrSystem** | 9 | Only `assertTenantAdminOrSystem` | `auth: 'user'` + inline `requireTenantRole` | ✅ KLAR |
| **C: Hybrid** | 21 | Both `isSystemAdmin` + tenant role checks | `{ tenantRole }` with scoping preserved in handler | HIGH |
| **D: Anomalous** | 4 | Broken/unusual auth (zero-auth GET, soft enforcement) | Fix first, then migrate | HIGH |

**Execution order:**

| Sub-batch | Routes | Prerequisite | Expected Coverage |
|-----------|--------|-------------|------------------|
| 4a: Pure system_admin | 18 | None | 134 → 152 = **53.0%** ✅ KLAR |
| 4b: assertTenantAdminOrSystem | 9 | `requireTenantRole` enhancement | 152 → 161 = **56.1%** ✅ KLAR |
| 4c: Hybrid (3 waves) | 21 | 4b verified | 161 → 182 = **63.4%** |
| 4d: Anomalous | 4 | Individual investigation | 182 → 186 = **64.8%** |

**Key risk:** tenantId resolution mismatch. Legacy routes get tenantId from query params/body. Wrapper resolves from param → `x-tenant-id` header → `ctx.activeTenant` → first membership. Per-route verification required in 4b/4c.

**Success criteria:**
- All 52 routes use wrapper with appropriate auth level
- `tenantAuth` imports removed from all migrated API route files
- `tenantAuth.ts` only imported by 12 server action files
- Admin panel operations work end-to-end
- APC-008 resolved

---

### Batch 5: Participant-Token Routes (14 routes) — BLOCKED on DD-2

**Why grouped:** Custom `participant_token` auth flow not yet supported by wrapper.

**Prerequisite:** DD-2 must define:
1. `auth: 'participant'` wrapper mode contract
2. How participant context is passed to handler (via `ctx.auth` or separate field)
3. Token validation logic location (wrapper or handler)

**Routes by sub-type:**

| Sub-type | Count | Routes |
|----------|-------|--------|
| Pure participant token | 9 | progress/update, progress/unlock-achievement, sessions/join, sessions/rejoin, play/heartbeat, play/me, play/me/role, play/me/role/reveal, play/ready |
| Mixed participant + user | 1 | play/sessions/[id]/game |
| Host-managed participant ops | 4 | tokens/extend, tokens/revoke, tokens/cleanup, sessions/[sessionId] |

**Expected gains:**
- Wrapper coverage: 223 → 233 = **81.2%** (10 done in 6a+6b+6c+6d: 233/287 = 81.2%)
- APC-009 resolved
- Play domain gets consistent auth pattern
- **DD-2 implementation complete**

---

## 4. Routes to Keep as Special-Cases

These routes should **NOT** be migrated to `apiHandler()` until their domains are stable:

| Route Group | Count | Reason | Revisit When |
|-------------|-------|--------|-------------|
| `resolveSessionViewer` play routes | 7 | Complex session viewer auth, play domain unstable | After Play Runtime audit (#6) |
| `getAuthUser` billing routes | 9 | Custom billing utility, Stripe integration | After Billing audit (#10) |
| Cookie-based demo routes | 2 | `demo_session_id` cookie auth, demo flow | After demo flow stabilization |
| `billing/usage/aggregate` | 1 | x-api-key auth, non-standard | Keep as-is, add timing-safe comparison |
| `games/[gameId]/publish` | 1 | Custom `app_metadata.role` check | After Games audit (#7) |
| `purposes/[purposeId]` | 1 | Local `requireSystemAdmin()` definition (returns boolean) | After refactoring to use auth-guard |
| Stripe webhooks | 1 | Signature verification, raw body | Never — Stripe controls the auth contract |

**Total special-cases: ~22 routes**

---

## 5. Routes to Remove

| Route | Status | Action |
|-------|--------|--------|
| `participants/[participantId]/actions` | 410 Gone | Delete after verifying no callers |
| `sessions/[sessionId]/actions` | 410 Gone | Delete after verifying no callers |
| `play/sessions/[id]/artifacts/snapshot` | 410 Gone | Delete after verifying no callers |

**Verification method:** Search frontend code and external integrations for these route paths. If no references, delete.

---

## 6. Verification Strategy

### Per-Batch Verification Checklist

For each migration batch:

- [ ] **TypeScript:** `npx tsc --noEmit` = 0 new errors
- [ ] **Lint:** `npx next lint` = no new warnings in migrated files
- [ ] **Smoke test:** Hit each migrated endpoint with valid auth → verify 200/201
- [ ] **Auth test:** Hit each migrated endpoint without auth → verify 401
- [ ] **Error shape:** Verify response matches `{ error, code?, requestId }` on 4xx/5xx
- [ ] **Rate limiting:** For routes with `rateLimit`, verify 429 on burst
- [ ] **Validation:** For routes with `input`, verify 400 on invalid payload
- [ ] **Regression:** Compare response body shape before/after for 3+ valid requests per route

### Automated Verification (future)

After Batch 1 + 2 are proven manually, create a test harness:
```bash
# Pseudocode — actual implementation deferred to Test Foundation phase
for route in migrated_routes:
  assert_401(route, no_auth)
  assert_200(route, valid_auth, valid_body)
  assert_400(route, valid_auth, invalid_body)  # if input schema
  assert_429(route, burst_10x)                 # if rateLimit
```

---

## 7. Regression Risk Notes

### High-Risk Routes (extra verification needed)

| Route | Risk | Mitigation |
|-------|------|-----------|
| `sessions/route.ts` | Removing supabaseAdmin changes query results | Verify RLS policies on `participant_sessions` table |
| `billing/quotes/*` | Financial data, external Stripe references | Cross-check with Stripe dashboard after migration |
| `games/builder/[id]` | 4 HTTP methods, TI-001 fix site | Verify tenant scoping preserved in each method |
| `admin/licenses/grant-personal` | 5-step transaction chain | End-to-end test: create license → verify all 5 DB rows |
| `consent/log` | New rate limiting may block legitimate consent | Set `strict` tier (5/min per IP) — sufficient for consent popups |

### Routes Where Migration Should NOT Change Behavior

The wrapper should be a transparent refactor for most routes. Watch for:

1. **Error shape changes** — old: `{ error: msg }`, new: `{ error: msg, requestId: uuid }`. Clients parsing the error JSON must tolerate the extra `requestId` field.
2. **Auth error status codes** — old routes may return 403 where the wrapper returns 401. Verify per route.
3. **Zod error details** — moving from manual validation to Zod changes error message format. The wrapper returns `{ error: 'Invalid payload', code: 'VALIDATION_ERROR', details: {...} }`.

---

## 8. Recommended Execution Order

```
Batch 1: Easy Mechanical (7 routes)                  ✅ KLAR — 15.0%
  ↓
Batch 2: Easy Regression-Sensitive (9 routes)        ✅ KLAR — 18.1%
  ↓ APC-003/006/011 P1s resolved
  ↓
Batch 3A: Inline getUser — simplest (29 routes)      ✅ KLAR — 28.2%
  ↓
Batch 3B-1: Inline getUser — single-method (27 routes)  ✅ KLAR — 37.6%
  ↓
Batch 3B-2a: Inline getUser — mechanical multi-method/Zod (16 routes)  ✅ KLAR (2025-07-17)
  ↓
Batch 3B-2b: Inline getUser — regression-sensitive (10 routes)  ✅ KLAR — 46.7%
  ↓ ~46% wrapper coverage after 3B-2
  ↓
DD-1 finalization                                     ✅ KLAR (2025-07-18)
  ↓ dd1-execution-plan.md written, 52 routes classified into 4 groups
  ↓
Batch 4a: Pure system_admin (18 routes)              ✅ KLAR (2025-07-18)
  ↓ ~53% coverage
  ↓
Batch 4b: assertTenantAdminOrSystem (9 routes)       ✅ KLAR (2025-06-28)
  ↓ ~56% coverage
  ↓
Batch 4c: Hybrid routes (21 routes, 4 waves)        4c-1 ✅ KLAR (2025-06-28) — 8 routes, 14 handlers
                                                     4c-2 ✅ KLAR (2025-06-28) — 4 routes, 8 handlers
                                                     4c-3 ✅ KLAR (2025-06-28) — 6 routes, 9 handlers
  ↓
Batch 4c-3: Hybrid dual-path global/scoped (6 routes) ✅ KLAR (2025-06-28)
  ↓
Batch 4c-4: Hybrid + anomalous (7 routes)            ✅ KLAR (2025-07-08) — tenantAuth = 0
  ↓ 64.8% coverage (186/287)
  ↓
--- PHASE 5: POST-BATCH-4 CONSOLIDATION ---
  ↓
Batch 5a: isSystemAdmin local (19 routes)            ✅ KLAR (2025-07-22)
  ↓ 71.4% coverage (205/287)
  ↓
Batch 5b: RPC:is_system_admin (9 routes)             ✅ KLAR (2025-07-22)
  ↓ 74.6% coverage (214/287)
  ↓
Batch 5c: resolveSessionViewer (3 routes)            ✅ KLAR (2026-03-11)
  ↓ 75.6% coverage (217/287)
  ↓
Batch 5d: inline:getUser stragglers (6 routes)       ✅ KLAR (2026-03-11)
  ↓ 77.7% coverage (223/287)
  ↓
DD-2 finalization                                    ✅ KLAR (2026-03-11)
  ↓
Batch 6: participant-token (10 routes)               ✅ KLAR — 6a+6b+6c+6d complete
  ↓ 81.2% coverage (233/287) after 6d
  ↓ ~82% coverage target after 6c–6d
  ↓
Batch 7: Mixed/public/special-case (47 routes)       ⬜ Per domain audit
  ↓ ~85-90% final coverage
```

**After Batch 2:** All 4 APC P1 findings are resolved (APC-001 systemic via wrapper, APC-003/011 sessions fix, APC-006 consent/log).

**After Batch 3B-2:** The API surface is consistent enough that domain audits can skip auth/validation/error-format checking for wrapped routes.

**After Batch 4:** Admin panel and tenant management have uniform auth patterns.

---

## 9. What Later Audits Become Easier After This

| Batch Completed | Audits Simplified |
|----------------|-------------------|
| **Batch 1-2** (P1 fixes) | Abuse & Privacy (#21) — consent/log abuse vector resolved. Sessions & Participants (#8) — sessions admin fallback removed. |
| **Batch 3A+3B** (getUser routes) | Every domain audit for domains covered by Batch 3 can skip error format, auth/validation checking for migrated routes. |
| **Batch 4** (tenantAuth) | Games (#7), Atlas & Admin (#11) — uniform admin auth means audit only checks business logic. |
| **Batch 5** (participant-token) | Play Runtime (#6), Sessions & Participants (#8) — participant auth is consistent. |
| **All batches** | Performance (#19) — requestId tracing enables per-route latency analysis. Observability (#13) — consistent error format enables structured log parsing. |

---

## 10. Summary

| Batch | Routes | Coverage After | Status | P1s Resolved |
|-------|--------|---------------|--------|----------|
| 1 — Easy Mechanical | 7 | 15.0% | ✅ KLAR | APC-006 |
| 2 — Regression-Sensitive | 9 | 18.1% | ✅ KLAR | APC-003, APC-011 |
| 3A — Inline getUser (simple) | 29 | 28.2% | ✅ KLAR | — |
| 3B-1 — Inline getUser (single-method) | 27 | 37.6% | ✅ KLAR | — |
| 3B-2a — Inline getUser (mechanical multi-method) | 16 | 43.2% | ✅ KLAR (2025-07-17) | — |
| 3B-2b — Inline getUser (regression-sensitive) | 10 | 46.7% | ✅ KLAR | — |
| DD-1 — tenantAuth triage | — | — | ✅ KLAR (2025-07-18) | — |
| 4a — Pure system_admin | 18 | 53.0% | ✅ KLAR (2025-07-18) | — |
| 4b — assertTenantAdminOrSystem | 9 | 56.1% | ✅ KLAR (2025-06-28) | — |
| 4c-1 — Hybrid: path-param tenantId | 8 | 58.9% | ✅ KLAR (2025-06-28) | — |
| 4c-2 — Hybrid: membership bypass | 4 | 60.3% | ✅ KLAR (2025-06-28) | — |
| 4c-3 — Hybrid: dual-path global/scoped | 6 | — | ✅ KLAR (2025-06-28) | — |
| 4c-4 — Hybrid + anomalous | 7 | 64.8% | ✅ KLAR (2025-07-08) | — |
| 5a — `isSystemAdmin` local | 19 | 71.4% | ✅ KLAR (2025-07-22) | — |
| 5b — `RPC:is_system_admin` | 9 | 74.6% | ✅ KLAR (2025-07-22) | — |
| 5c — `resolveSessionViewer` | 3 | 75.6% | ✅ KLAR (2026-03-11) | — |
| 5d — `inline:getUser` stragglers | 6 | 77.7% | ✅ KLAR (2026-03-11) | — |
| 6 — Participant-token | 10 | 81.2% (6d) | ✅ KLAR | APC-009 |
| 7 — Mixed/public/special-case | 47 | — | Per domain audit | — |
| Remove | 3 | — | Caller verification | APC-012 |

> **Coverage note:** Previous per-batch “Coverage After” percentages (15.0%…53.0%) were rolling-sum estimates. Canonical coverage is code-scanned (`.NET ReadAllText`): **229/287 files (79.8%)**, **338/408 handlers (82.8%)**. See `launch-control.md` for methodology.

**APC-001 (error format):** Resolved progressively — each batch converges more routes to canonical shape.

**Immediate next step:** Batch 7 — 47 mixed/public/special-case routes. Addressed per domain audit. Next major focus: Play Runtime audit (#6) + Sessions/Participants audit.

**Batch 6b notes:** 2 files migrated, 2 handlers wrapped. **Transport fix:** `participant_token` removed from request body — now via `x-participant-token` header (DD-2 standard). Client hooks updated: `useParticipantProgress.ts`, `useAchievementUnlock.ts` (both send token in header, body contains only business fields). Routes: participants/progress/update (POST), participants/progress/unlock-achievement (POST). Per-route verification:

| Route | Previous Auth | New Config | Behavior Diffs | Bug Fixes |
|-------|--------------|------------|----------------|----------|
| progress/update | Body `participant_token` → inline lookup + manual status/expiry check. Rate limit: `'api'` (100/min). | `auth: 'participant'` | **Token transport: body→header.** Rate limit: 100→60/min (auto participant tier). Error model: DD-2 standard (401/403). Body validation: `participant_token` no longer required. | Missing try/catch (now via wrapper). Inline auth removed. |
| progress/unlock-achievement | Body `participant_token` → inline lookup + manual status/expiry check. Rate limit: `'api'` (100/min). | `auth: 'participant'` | **Token transport: body→header.** Rate limit: 100→60/min (auto participant tier). Error model: DD-2 standard (401/403). Body validation: `participant_token` no longer required. | Missing try/catch (now via wrapper). Inline auth removed. |

Verification: response shapes bit-identical for both routes. Idempotent achievement unlock check preserved. Progress upsert logic (started_at/completed_at transitions) preserved. Broadcast + activity log payloads use wrapper-resolved participant context. No legacy body-token paths remain. Hooks have zero external consumers (grep-verified). `tsc --noEmit` = 0 errors.

**Batch 6c notes:** 2 files migrated, 2 handlers wrapped. Lifecycle routes (token creation / reconnection) — both stay `auth:'public'` per DD-2. Routes: participants/sessions/join (POST), participants/sessions/rejoin (POST). Re-export aliases (`play/join` → `participants/sessions/join`, `play/rejoin` → `participants/sessions/rejoin`) unchanged — named `POST` export preserved. No client-side changes needed. Per-route verification:

| Route | Previous Auth | New Config | Behavior Diffs | Bug Fixes |
|-------|--------------|------------|----------------|----------|
| sessions/join | None (public). Rate limit: `applyRateLimitMiddleware(request, 'strict')` (5/min). Manual try/catch + `errorTracker.api()`. | `auth: 'public'`, `rateLimit: 'strict'` | Validation errors: `NextResponse.json 400` → `throw ApiError.badRequest()` (caught by wrapper → same 400 shape with requestId). Rate limit: same tier, now via wrapper. | try/catch removed (wrapper handles). `errorTracker.api()` removed (wrapper error chain). `await` on sync `createServiceRoleClient()` removed. |
| sessions/rejoin | None (public). **NO rate limiting.** Manual try/catch + `console.error`. Token in body (stays in body — reconnection flow). | `auth: 'public'`, `rateLimit: 'api'` | **Rate limiting added** (was NONE → 100/min). Invalid token: **404→401** (DD-2 enumeration protection). Validation errors: `NextResponse.json 400` → `throw ApiError.badRequest()`. | **Missing rate limiting fixed** (DD-2 identified brute-force risk). **404→401 for invalid token** (prevents token enumeration). `await` on sync `createServiceRoleClient()` removed. try/catch removed (wrapper handles). |

Verification: response shapes bit-identical for both routes. Session lifecycle gating preserved (join: draft→403, locked→403, ended→410, only allows lobby/active/paused; rejoin: blocked/kicked→403, ended→410, expired→401). Join participant creation logic unchanged (token generation, approval gating, activity log, broadcast). Rejoin activation logic unchanged (`shouldActivate = !requireApproval && status !== 'idle'`). Token stays in body for rejoin (reconnection flow — not a header migration). `tsc --noEmit` = 0 errors.

**Batch 6d notes:** 2 files migrated, 2 handlers wrapped. Mixed-auth SVG asset routes — both use `auth:'public'` with complex inline dual-auth logic retained (user → always allowed via RLS client; participant → multi-table chain verification). Routes: coach-diagrams/[diagramId]/svg (GET), spatial-artifacts/[artifactId]/svg (GET). No rate limiting added (DD-2 doesn't specify for asset-serving routes). `export const dynamic = 'force-dynamic'` preserved on both. Per-route verification:

| Route | Previous Auth | New Config | Behavior Diffs | Bug Fixes |
|-------|--------------|------------|----------------|----------|
| coach-diagrams/[diagramId]/svg | Inline dual-auth: authenticated user → allowed (RLS client `getUser()`); participant → verify game references diagram via `game_steps.media_ref` → `game_media.media_id` chain. No try/catch. No rate limiting. | `auth: 'public'` | Error handling: unhandled throws → wrapper catches (adds requestId). `_req` → `req`, params from `ctx.params`. All inline dual-auth logic preserved exactly. SVG rendering (spatial adapter + legacy) preserved. | No bugs found — route was already well-written. Wrapper adds error handling (previously any throw → unhandled 500). |
| spatial-artifacts/[artifactId]/svg | Inline 3-tier auth: user → allowed, participant → multi-table chain via (A) media chain or (B) game_artifacts with variant visibility (public/role_private/leader_only), anonymous → 401. No try/catch. No rate limiting. | `auth: 'public'` | Error handling: unhandled throws → wrapper catches (adds requestId). `_req` → `req`, params from `ctx.params`. All inline 3-tier auth logic preserved exactly. Role-based variant visibility (`_sessionRoleId` remapping) preserved. | No bugs found. Wrapper adds error handling. |

Verification: participant enumeration protection preserved — coach-diagrams uses uniform 401 for all participant auth failures, spatial-artifacts uses uniform 403 (prevents artifact-ID enumeration). Not-found: 403 for participants, 404 for authenticated users on spatial-artifacts. Complex role-based variant visibility logic (leader_only → deny, public → allow, role_private → check session role assignments) preserved bit-identical. SVG rendering logic untouched on both routes. `createServiceRoleClient()` correctly called without `await` (sync). `createServerRlsClient()` correctly called with `await` (async). `tsc --noEmit` = 0 errors. **Batch 6 COMPLETE (10/10 routes). DD-2 fully realized in code.**

**Batch 6a notes:** 4 files migrated, 4 handlers wrapped. First `auth: 'participant'` routes in the codebase. Infrastructure added: `resolveParticipantAuth()` in route-handler.ts (DD-2 error model: 401 missing/invalid/expired, 403 blocked/kicked, no 404), `'participant'` rate limit tier (60 req/min, auto-applied) in rate-limiter.ts, `expiresAt` field added to `ResolvedParticipant` in play-auth.ts. Routes: play/me (GET), play/me/role (GET), play/me/role/reveal (POST), play/ready (POST). Per-route verification:

| Route | Previous Auth | New Config | Behavior Diffs | Bug Fixes |
|-------|--------------|------------|----------------|----------|
| play/me | Inline: extract token → `resolveParticipant()` → manual status/expiry check | `auth: 'participant'` | Error codes: invalid token 404→401 (DD-2). Rate limiting added. Session mismatch check moved to handler. | Missing try/catch (now via wrapper). `await` on sync `createServiceRoleClient()` removed. |
| play/me/role | Inline: extract token → `resolveParticipant()` → manual status/expiry check | `auth: 'participant'` | Error codes: invalid token 404→401 (DD-2). Rate limiting added. | Manual try/catch removed (wrapper handles). `await` on sync function removed. |
| play/me/role/reveal | Inline: extract token → `resolveParticipant()` → manual status/expiry check | `auth: 'participant'` | Error codes: invalid token 404→401 (DD-2). Rate limiting added. | Manual try/catch removed (wrapper handles). `await` on sync function removed. |
| play/ready | Inline: extract token → `resolveParticipant()` → **NO expiry check** | `auth: 'participant'` | Error codes: invalid token 404→401 (DD-2). Rate limiting added. **Expiry check now enforced** (was missing). | Missing expiry check fixed (DD-2 identified bug). Missing try/catch fixed. `await` on sync function removed. |

Verification: all 4 routes produce bit-identical response shapes. Security tripwire (FORBIDDEN_ROLE_KEYS) in play/me/role preserved. Idempotent reveal check in play/me/role/reveal preserved. Session status gating (lobby/active) in play/ready preserved. `tsc --noEmit` = 0 errors.

**Batch 5d notes:** 6 files migrated, 6 handlers wrapped. All `inline:getUser` straggler routes now wrapped. Routes: browse/filters (GET), games/featured (GET), games/search (POST), demo/status (GET), games/[gameId]/publish (POST), games/[gameId]/related (GET). Optional-auth routes use `auth: 'public'` + inline `createServerRlsClient()` + `supabase.auth.getUser()`. Publish route uses `auth: 'user'` + inline `app_metadata.role` check for admin/owner (cannot use `auth: 'system_admin'` — `owner` role not mapped by `deriveEffectiveGlobalRole`). Fixes: redundant double `getUser()` in search eliminated, try/catch removed from demo/status (wrapper handles). Phase 5 complete (5a–5d: 37 files, 60 handlers).

**Batch 5c notes:** 3 files migrated, 4 handlers wrapped. All remaining `resolveSessionViewer` routes now use `apiHandler({ auth: 'public' })` + inline viewer resolver. Routes: chat (GET+POST), conversation-cards/collections/[collectionId] (GET), decisions/[decisionId]/results (GET). Removed all `jsonError` helpers. `request` → `req`, `await params` → `params`. All business logic (visibility filtering, tenant scope check, step unlock gating, vote counting) bit-identical.

**Batch 5a notes:** 19 files migrated (original estimate 20 — `admin/games/[gameId]` doesn't exist; actual routes were `admin/games/bulk` + `admin/games/search`). 33 handlers wrapped. Sub-batches: conversation cards (6), MFA (4), Stripe admin (2), Prices (2), Purposes (2), Leaderboard (1), Games (2). Eliminated all local `isSystemAdmin()` functions from migrated files. Auth patterns replaced: local `isSystemAdmin()` → `auth: 'system_admin'`, `getServerAuthContext('/admin')` → `auth: 'user'`, RPC `is_system_admin` + `has_tenant_role` → `requireTenantRole()`, `app_metadata.role` check → `auth: 'system_admin'`.

**Batch 5b notes:** 9 files migrated, 17 handlers wrapped. All `rpc('is_system_admin')` calls eliminated from API routes (zero remaining, grep-verified). Groups: (A) Pure system_admin — promo-codes, refund, sinks, meters. (B) Tiered auth — rules, dashboard use `requireTenantRole(['owner', 'admin'], tenantId)`. (C) dual-auth — usage/aggregate routes preserve API-key auth via `auth: 'public'` + inline check. (D) Bonus — scheduled-jobs migrated from `getServerAuthContext()` pattern. Also eliminated all `rpc('has_tenant_role')` calls (replaced by `requireTenantRole`).
