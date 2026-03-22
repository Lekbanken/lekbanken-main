# API Wrapper Pilot — Migration Report

## Metadata

> **Date:** 2026-03-10  
> **Last updated:** 2026-03-21  
> **Last validated:** 2026-03-21  
> **Status:** historical snapshot  
> **Execution status:** Complete  
> **Wrapper:** `lib/api/route-handler.ts` → `apiHandler()`  
> **TypeScript:** `npx tsc --noEmit` = **0 errors**  
> **Note:** Historical snapshot of the wrapper pilot that informed later migration work. Do not treat it as the current migration tracker.

---

## Migrated Routes

| # | Route | Pattern | Auth | Rate Limit | Input | Lines Before → After |
|---|-------|---------|------|------------|-------|---------------------|
| 1 | `app/api/accounts/whoami/route.ts` | Simple authenticated GET | `'user'` | — | — | 44 → 42 |
| 2 | `app/api/media/upload/confirm/route.ts` | POST + Zod validation | `'user'` | — | `confirmSchema` | 81 → 69 |
| 3 | `app/api/billing/analytics/route.ts` | System admin GET | `'system_admin'` | — | — | 155 → 143 |
| 4 | `app/api/health/route.ts` | Public (no auth) | `'public'` | — | — | 30 → 34 |
| 5 | `app/api/play/heartbeat/route.ts` | Rate-limited + custom auth | `'public'` | `'api'` | — | 62 → 62 |

---

## What Worked Well

### 1. Auth boilerplate elimination
Routes no longer need inline `supabase.auth.getUser()` + manual 401 responses. The wrapper handles this uniformly. The billing/analytics route removed its entire auth try-catch block (8 lines of boilerplate).

### 2. Validation boilerplate elimination
`media/upload/confirm` dropped 7 lines of manual `safeParse` + error handling. The `input` config option handles parsing, validation, and 400 error response with Zod `.flatten()` details automatically.

### 3. Consistent error format
Auth failures now return the standard `errorResponse()` format with `requestId` and `timestamp`, instead of ad-hoc `{ error: 'Unauthorized' }`. This makes debugging easier across all routes.

### 4. Rate limiting becomes declarative
`play/heartbeat` replaced 2 lines of imperative rate limiting (`const rate = ...; if (rate) return rate;`) with a single config option `rateLimit: 'api'`. The wrapper applies it before auth.

### 5. No behavior regressions
All routes produce identical functional behavior. The only visible difference is that error responses now include `requestId` and `timestamp` fields, which is an improvement.

---

## Edge Cases Discovered

### 1. `auth: AuthContext | null` requires `!` assertions
When using `auth: 'user'`, the handler knows `auth` is non-null, but TypeScript doesn't — the type is `AuthContext | null`. Handlers use `auth!.user!` to assert.

**Recommendation:** Consider overloaded signatures or a wrapper helper:
```typescript
// Option A: Separate functions for public vs authenticated
export const publicHandler = (config) => apiHandler({ ...config, auth: 'public' })
export const authHandler = (config) => apiHandler({ ...config, auth: 'user' })
// where authHandler's RouteContext has auth: AuthContext (non-null)
```
**Verdict:** Low priority. `!` assertions work and are safe since the wrapper guarantees auth for non-public routes. Can be improved post-pilot.

### 2. Participant-token routes use `auth: 'public'` + manual token auth
`play/heartbeat` authenticates via `x-participant-token` header, not Supabase user auth. The wrapper treats it as `auth: 'public'` and the handler does its own token validation. This is correct — participant routes are a legitimate "public with custom auth" pattern.

**Recommendation:** If many participant routes need migration, consider adding an `auth: 'participant_token'` level to the wrapper. For now, `auth: 'public'` works fine.

### 3. Handler-level error responses remain ad-hoc
The wrapper standardizes errors for auth failures, validation errors, and uncaught exceptions. But handlers can still return custom error shapes via `NextResponse.json(...)`. For example, health returns `{ status: 'error' }` on 503, not the standard envelope.

**Recommendation:** This is acceptable — handlers may need domain-specific error shapes. The key benefit is that the _boilerplate_ errors (auth, validation) are standardized. Handlers can progressively adopt `throw ApiError.notFound(...)` for their own error cases.

### 4. Routes needing RLS client still create their own
The wrapper's auth resolution creates an RLS client internally (via `getServerAuthContext`), but doesn't expose it. Routes that need to query the DB create their own `createServerRlsClient()`. This is fine — Next.js `cache()` deduplicates the client creation per request.

**Recommendation:** No change needed. Exposing the Supabase client from the wrapper would tightly couple it to Supabase, reducing portability. The current approach is clean.

### 5. `runtime` and `dynamic` exports preserved
Module-level exports like `export const runtime = 'nodejs'` and `export const dynamic = 'force-dynamic'` were preserved alongside `export const GET = apiHandler(...)`. No conflicts.

---

## Wrapper Adjustments Made

None. The wrapper worked as designed for all 5 route patterns without modification.

---

## Migration Strategy for Remaining Routes

Based on the pilot, the recommended migration order is:

### Phase 1 — High-value simplification (low risk)
Routes that gain the most from the wrapper (remove most boilerplate):
- Routes with inline `supabase.auth.getUser()` + manual 401 → `auth: 'user'`
- Routes with manual Zod safeParse + 400 handling → `auth: '...'` + `input: schema`
- Routes already using `requireSystemAdmin()` → `auth: 'system_admin'`

### Phase 2 — Rate-limited mutation routes (medium risk)
Apply `rateLimit` to billing, admin, and authoring routes that currently lack it:
- `app/api/billing/checkout/` — add `rateLimit: 'strict'`
- `app/api/admin/` mutation routes — add `rateLimit: 'api'`
- `app/api/games/builder/` — add `rateLimit: 'api'`

### Phase 3 — Complex routes (higher risk, bigger payoff)
- Routes with local `requireAuth()` copies → delete local copy, use wrapper
- Routes with custom tenant role checks → `auth: { tenantRole: [...] }`
- Conversation-card routes (already well-structured, easy to wrap)

### Phase 4 — Participant routes
- Use `auth: 'public'` + `rateLimit` pattern proven in heartbeat
- Apply to: `play/session`, `participants/sessions/join`, `play/board`

### What NOT to migrate
- Webhook endpoints (Stripe webhooks need raw body access)
- SSE/streaming endpoints (different response pattern)
- File upload endpoints with `formData()` (wrapper expects JSON body for `input`)

---

## Exit Criteria Verification

| Criteria | Status |
|----------|--------|
| `tsc --noEmit` passes | ✅ 0 errors |
| Error format is consistent (auth/validation) | ✅ All use `errorResponse()` |
| `requestId` comes with consistently | ✅ In all error responses |
| Auth behaves correctly | ✅ Same auth guards, same behavior |
| Rate limiting works where applicable | ✅ heartbeat uses `rateLimit: 'api'` |
| No route became more complicated | ✅ All routes same or simpler |

---

## Conclusion

The `apiHandler()` wrapper is production-ready. All 5 pilot patterns migrated successfully without any wrapper changes. The wrapper correctly composes auth, rate limiting, validation, and error formatting.

**Recommended next step:** Proceed with Phase 1 migration (high-value simplification routes), then Security & Auth Audit.
