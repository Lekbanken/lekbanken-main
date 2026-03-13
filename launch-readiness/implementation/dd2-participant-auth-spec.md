# DD-2 Specification: `auth: 'participant'` Wrapper Mode

> **Date:** 2025-07-19  
> **Prerequisite for:** Batch 6 (participant-token routes, 10 files)  
> **Depends on:** Phase 5 complete ✅, `resolveSessionViewer` / `resolveParticipant` infrastructure stable  
> **Goal:** Define how the `apiHandler` wrapper resolves participant-token auth, what the handler contract looks like, and exactly which routes migrate in Batch 6

---

## Table of Contents

1. [Background & Motivation](#1-background--motivation)
2. [The `auth: 'participant'` Contract](#2-the-auth-participant-contract)
3. [Relationship to `auth: 'public'` + `resolveSessionViewer`](#3-relationship-to-auth-public--resolvesessionviewer)
4. [Mixed Auth Mode (User OR Participant)](#4-mixed-auth-mode-user-or-participant)
5. [Error Model](#5-error-model)
6. [Parameters & Context Resolution](#6-parameters--context-resolution)
7. [Batch 6 Route Selection & Sub-batches](#7-batch-6-route-selection--sub-batches)
8. [Infrastructure Changes](#8-infrastructure-changes)
9. [Transport Standardization](#9-transport-standardization)
10. [Security Invariants](#10-security-invariants)

---

## 1. Background & Motivation

The wrapper (`lib/api/route-handler.ts`) currently supports six auth levels:

```typescript
type AuthLevel =
  | 'public'          // No auth required
  | 'user'            // Supabase cookie auth
  | 'system_admin'    // User auth + system_admin role check
  | { tenantRole }    // User auth + tenant role check
  | { sessionHost }   // User auth + session ownership (reserved, falls back to requireAuth)
  | 'cron_or_admin'   // Cron secret header OR system_admin
```

**None of these cover participant-token auth.** Participants are anonymous users who authenticate via a UUID token stored in `x-participant-token` header — they have no Supabase session, no cookie, no RLS context.

Currently, 10 participant-token routes use inline manual auth with 3 inconsistent transport patterns, inconsistent error messages, and at least 2 security gaps (missing expiry check in `play/ready`, missing rate limiting in `sessions/rejoin`).

### What DD-2 delivers

A new `auth: 'participant'` auth level that:
- Extracts the participant token from a canonical location
- Validates it against the DB (status + expiry)
- Injects a typed `ParticipantContext` into the handler (including `expiresAt` for telemetry)
- Applies default rate limiting (`'participant'` tier) unless overridden
- Standardizes error responses
- Eliminates ~120 lines of repeated inline auth code across 6 routes

---

## 2. The `auth: 'participant'` Contract

### 2.1 New Type Additions

```typescript
// In route-handler.ts

interface ParticipantContext {
  participantId: string
  displayName: string
  sessionId: string
  role: string       // 'player' | custom role
  status: string     // 'active' | 'idle' | etc.
  expiresAt: string | null  // ISO timestamp — token_expires_at from DB
}

// Extended RouteContext
interface RouteContext<TInput = undefined> {
  req: NextRequest
  auth: AuthContext | null
  /** Resolved participant — only present when auth is 'participant' */
  participant: ParticipantContext | null
  body: TInput
  params: Record<string, string>
  requestId: string
}
```

### 2.2 AuthLevel Extension

```typescript
type AuthLevel =
  | 'public'
  | 'user'
  | 'system_admin'
  | { tenantRole: TenantRole[]; tenantId?: string }
  | { sessionHost: (params: Record<string, string>) => string }
  | 'cron_or_admin'
  | 'participant'     // ← NEW
```

### 2.3 What the Handler Receives

When `auth: 'participant'` is used:

| Field | Value | Guarantee |
|-------|-------|-----------|
| `ctx.participant` | `ParticipantContext` | **Non-null** — wrapper rejects before handler if invalid. Includes `expiresAt` for telemetry/debugging. |
| `ctx.auth` | `null` | Always null — participants have no Supabase session |
| `ctx.req` | `NextRequest` | Standard request object |
| `ctx.body` | `TInput` | If `input` schema provided, validated body |
| `ctx.params` | Route params | From Next.js dynamic segments |
| `ctx.requestId` | `string` | Trace ID |

### 2.4 Handler Usage Example

```typescript
export const GET = apiHandler({
  auth: 'participant',
  handler: async ({ participant, params, requestId }) => {
    // participant is guaranteed non-null here
    const { participantId, sessionId, role } = participant!
    
    const supabase = await createServiceRoleClient()
    // ... business logic using participantId & sessionId ...
    
    return NextResponse.json({ data })
  },
})
```

---

## 3. Relationship to `auth: 'public'` + `resolveSessionViewer`

### The Dual-Auth Pattern (Group B)

8 routes already use `apiHandler({ auth: 'public' })` with inline `resolveSessionViewer()`:

- `play/sessions/[id]/chat` (GET, POST)
- `play/sessions/[id]/decisions` (GET)
- `play/sessions/[id]/decisions/results` (GET)
- `play/sessions/[id]/artifacts` (GET)
- `play/sessions/[id]/signals` (GET, POST)
- `play/sessions/[id]/outcome` (GET)
- `play/sessions/[id]/conversation-cards/collections` (GET)
- `play/sessions/[id]/heartbeat` (POST)

These routes accept **either** a host user (cookie auth) **or** a participant (token auth). The `resolveSessionViewer` function returns a discriminated union:

```typescript
type Viewer =
  | { type: 'host'; userId: string }
  | { type: 'participant'; participantId: string; participantName: string }
```

**Decision: `auth: 'public'` + inline `resolveSessionViewer` stays for dual-auth routes.**

Rationale:
1. The wrapper can't know which auth path will succeed until runtime
2. The handler needs the `Viewer` discriminated union to branch on `type`
3. These routes are already wrapped and working — no migration needed
4. Creating a hypothetical `auth: 'session_viewer'` mode would only save 2 lines per handler and add complexity to the wrapper

### When to Use Each

| Pattern | When | Example |
|---------|------|---------|
| `auth: 'participant'` | Route **only** accepts participant tokens | `play/me`, `play/ready` |
| `auth: 'public'` + `resolveSessionViewer()` | Route accepts **both** host and participant | `play/sessions/[id]/chat` |
| `auth: 'public'` (no viewer) | Route creates tokens or needs no auth | `participants/sessions/join` |
| `auth: 'user'` | Route only for authenticated users | Standard API routes |

---

## 4. Mixed Auth Mode (User OR Participant)

Two routes accept both a **fully authenticated user** (RLS cookie) and a **participant** (token header):

| Route | Behavior |
|-------|----------|
| `coach-diagrams/[diagramId]/svg` | Authenticated user → always allowed. Participant → must verify game references diagram via `game_steps.media_ref` → `game_media.media_id` chain |
| `spatial-artifacts/[artifactId]/svg` | Authenticated user → always allowed. Participant → must verify artifact accessibility via media chain OR `game_artifacts` + role-based variant visibility |

### Decision: Keep as `auth: 'public'` with inline dual check

These routes have complex authorization logic unique to SVG rendering:
- Participant auth requires multi-table traversal (participants → sessions → game_steps → game_media)
- The spatial-artifacts route has role-based variant visibility checks
- Only 2 routes — not worth a new auth mode

**Migration plan:** Wrap with `apiHandler({ auth: 'public' })` and keep the inline dual-auth logic. Fix consistency issues (use `REJECTED_PARTICIPANT_STATUSES` consistently, add uniform error responses).

---

## 5. Error Model

### 5.1 Standardized Error Responses for `auth: 'participant'`

The wrapper will throw `AuthError` (caught by the existing error handler) for participant auth failures:

| Condition | HTTP Status | Error Code | Message |
|-----------|-------------|------------|---------|
| Token header missing | 401 | `MISSING_TOKEN` | `Participant token required` |
| Token not found in DB | 401 | `INVALID_TOKEN` | `Invalid participant token` |
| Participant status is `blocked` or `kicked` | 403 | `PARTICIPANT_REJECTED` | `Access denied` |
| Token expired (`token_expires_at < now`) | 401 | `TOKEN_EXPIRED` | `Participant token expired` |

### 5.2 Security Considerations

- **All failures for invalid/missing tokens return 401** — not 404. This prevents token enumeration.
- **Blocked/kicked returns 403** — the token is valid but the participant has been removed. Using 403 (not 401) tells the client "your credentials are valid but your access is revoked" which enables proper UX (show "removed" message, not "re-login").
- **No distinction between "token not in DB" and "token missing"** at the HTTP level — both are 401. The error code differentiates for client-side UX.
- **Session-not-found is NOT a wrapper concern** — session validation happens inline in the handler. The wrapper only validates participant existence + status + expiry.

### 5.3 Error Consistency Fix

Current routes have inconsistent error messages for the same conditions:

| Condition | Current (varies) | DD-2 Standard |
|-----------|-------------------|---------------|
| Missing token | "Missing participant token or session_code" / (no check) | 401 `Participant token required` |
| Invalid token | "Participant not found" / "Invalid participant token" | 401 `Invalid participant token` |
| Blocked/kicked | "Not authorized" / "Participant is blocked or kicked" | 403 `Access denied` |
| Expired | "Token expired" / (missing in play/ready!) | 401 `Participant token expired` |

---

## 6. Parameters & Context Resolution

### 6.1 Session Resolution: Inline, Not in Wrapper

The `play/me/*` routes use `session_code` (query param) to find the session. The `participants/progress/*` routes have no session scoping at all (token-only lookup). The `participants/sessions/rejoin` route uses `sessionId` from body.

**Decision: Session resolution stays inline.** The wrapper resolves the participant identity; the handler resolves the session context.

Rationale:
1. Session lookup varies: query param `session_code` (4 routes), body field (2 routes), no session (2 routes)
2. `session_code` requires normalization via `normalizeSessionCode()` — this is business logic, not auth
3. The `resolveParticipant` function already handles optional `sessionId` scoping — routes can call it with or without
4. Mixing session resolution into the wrapper would couple auth to routing, making the wrapper harder to reason about

### 6.2 What the Wrapper Resolves vs What Stays Inline

| Concern | Resolved by | Where |
|---------|-------------|-------|
| Token extraction (header) | **Wrapper** | `resolveAuth()` in route-handler.ts |
| Token validation (DB lookup) | **Wrapper** | Via `resolveParticipant()` from play-auth.ts |
| Status check (blocked/kicked) | **Wrapper** | Via `isParticipantValid()` |
| Expiry check | **Wrapper** | Via `isParticipantValid()` |
| Token metadata (`expiresAt`) | **Wrapper** | Injected into `ParticipantContext` for telemetry/debugging |
| Session lookup (session_code) | **Handler** | Inline in each route's handler |
| Session status gates (lobby/active) | **Handler** | Business logic |
| Rate limiting | **Wrapper** | Auto-applied `'participant'` tier when `auth === 'participant'` (overridable) |
| Body validation | **Wrapper** | Via existing `input` Zod schema |
| Error handling / try-catch | **Wrapper** | Via existing error handler |

### 6.3 Impact on `resolveParticipant`

The wrapper will call `resolveParticipant(request)` **without** a `sessionId` parameter — the function already supports this. The returned `ResolvedParticipant` includes `sessionId` which the handler can use.

For routes that need session-scoped validation (play/me/*), the handler will:
1. Get `participant.sessionId` from `ctx.participant`
2. Look up the session by code → verify `session.id === participant.sessionId`

This is an additional inline check but it's a business rule (session code validation), not an auth concern.

---

## 7. Batch 6 Route Selection & Sub-batches

### 7.1 Route Inventory (10 files, 10 handlers)

| # | Route | Method | Sub-batch | Auth Mode | Notes |
|---|-------|--------|-----------|-----------|-------|
| 1 | `play/me` | GET | 6a | `'participant'` | Header token + query `session_code` |
| 2 | `play/me/role` | GET | 6a | `'participant'` | Header token + query `session_code` |
| 3 | `play/me/role/reveal` | POST | 6a | `'participant'` | Header token + query `session_code` |
| 4 | `play/ready` | POST | 6a | `'participant'` | Header token + query `session_code`. **Bug fix: add missing expiry check** |
| 5 | `participants/progress/update` | POST | 6b | `'participant'` | Body token → standardize to header. Rate limited. |
| 6 | `participants/progress/unlock-achievement` | POST | 6b | `'participant'` | Body token → standardize to header. Rate limited. |
| 7 | `participants/sessions/join` | POST | 6c | `'public'` | **Creates** token — can't use `'participant'`. Rate limited (strict). |
| 8 | `participants/sessions/rejoin` | POST | 6c | `'public'` | Validates existing token inline (body). **Bug fix: add rate limiting.** |
| 9 | `coach-diagrams/[diagramId]/svg` | GET | 6d | `'public'` | Mixed auth (user OR participant). Complex inline authz. |
| 10 | `spatial-artifacts/[artifactId]/svg` | GET | 6d | `'public'` | Mixed auth (user OR participant). Complex inline authz. |

### 7.2 Sub-batch Breakdown

#### Batch 6a: Pure Participant Routes (4 files, 4 handlers)

Routes: `play/me`, `play/me/role`, `play/me/role/reveal`, `play/ready`

All follow the same pattern:
- Extract `x-participant-token` from header → **wrapper handles**
- Extract `session_code` from query → **handler keeps inline**
- Look up session by code → validate participant belongs to session → **handler keeps inline**
- Status + expiry check → **wrapper handles**

**Migration template:**
```typescript
// Before: ~40 lines of inline auth per route
// After:
export const GET = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant }) => {
    const url = new URL(req.url)
    const sessionCode = url.searchParams.get('session_code')
    if (!sessionCode) {
      return NextResponse.json({ error: 'Missing session_code' }, { status: 400 })
    }
    // ... session lookup + business logic ...
  },
})
```

**Bug fix included:** `play/ready` currently has no token expiry check. The wrapper will enforce it automatically.

#### Batch 6b: Body-Token Routes → Header Standardization (2 files, 2 handlers)

Routes: `participants/progress/update`, `participants/progress/unlock-achievement`

Current behavior: token is in the JSON body as `participant_token` (snake_case).

**Decision: Standardize to header `x-participant-token`.**

Rationale:
1. Tokens are credentials — they should not be in the request body (OWASP guideline)
2. All other participant routes use the header pattern
3. The wrapper expects header extraction — body extraction would require a special case
4. Client-side change is minimal: move token from body to header

**Client migration required:** These routes' callers must move `participant_token` from body to `x-participant-token` header. This is a **breaking change** and must be coordinated with the client code.

**Migration approach:**
1. First: update client code to send token in header (keep body `participant_token` for backward compat)
2. Then: migrate route to `auth: 'participant'` (wrapper reads header; handler stops reading body token)
3. Finally: remove body `participant_token` from client code

#### Batch 6c: Token Lifecycle Routes (2 files, 2 handlers)

Routes: `participants/sessions/join`, `participants/sessions/rejoin`

**These routes do NOT get `auth: 'participant'`** — they manage the token lifecycle itself:

- **Join** creates a new participant + token. No token exists yet → `auth: 'public'`, rate limit: `'strict'`
- **Rejoin** validates a stored token from the body. It could theoretically use `auth: 'participant'` but the token is in the body (camelCase `participantToken`) not the header, and the route returns the token back to the client (reconnection flow).

**Migration plan:**
- `join`: Wrap with `apiHandler({ auth: 'public', rateLimit: 'strict', input: joinSchema })`. Move validation to Zod schema. Keep session lookup + token creation inline.
- `rejoin`: Wrap with `apiHandler({ auth: 'public', rateLimit: 'api', input: rejoinSchema })`. **Bug fix: add rate limiting** (currently has none — vulnerable to token brute-forcing). Keep token validation inline (reads from body, not header).

#### Batch 6d: Mixed-Auth SVG Routes (2 files, 2 handlers)

Routes: `coach-diagrams/[diagramId]/svg`, `spatial-artifacts/[artifactId]/svg`

These routes have complex dual-auth (user OR participant) with multi-table authorization chains. They use:
- `createServerRlsClient()` + `getUser()` for user path
- Manual `x-participant-token` + service-role lookup for participant path

**Migration plan:** Wrap with `apiHandler({ auth: 'public' })`. Keep all inline dual-auth logic. Main value: error handling, request ID tracing, consistent response format.

### 7.3 Execution Order

```
6a (4 routes) → infrastructure must be ready
6b (2 routes) → requires client-side token transport change
6c (2 routes) → independent, Zod schemas needed
6d (2 routes) → independent, mostly structural wrap
```

**6a must go first** — it validates that `auth: 'participant'` works in production on the simplest routes before tackling the more complex ones.

---

## 8. Infrastructure Changes

### 8.1 Changes to `lib/api/route-handler.ts`

**1. Import `resolveParticipant` from play-auth.ts:**
```typescript
import { resolveParticipant, type ResolvedParticipant } from '@/lib/api/play-auth'
```

**2. Extend `AuthLevel`:**
```typescript
type AuthLevel =
  | 'public'
  | 'user'
  | 'system_admin'
  | { tenantRole: TenantRole[]; tenantId?: string }
  | { sessionHost: (params: Record<string, string>) => string }
  | 'cron_or_admin'
  | 'participant'     // NEW
```

**3. Add `participant` field to `RouteContext`:**
```typescript
interface RouteContext<TInput = undefined> {
  req: NextRequest
  auth: AuthContext | null
  participant: ParticipantContext | null   // NEW
  body: TInput
  params: Record<string, string>
  requestId: string
}
```

**4. Extend `resolveAuth` function** (or add parallel resolver):

Option A — extend `resolveAuth` to return a union:
```typescript
// Rejected — resolveAuth returns AuthContext, not ParticipantContext
```

Option B — **separate participant resolution** (preferred):
```typescript
// In the main handler flow, before calling handler:
let participant: ParticipantContext | null = null
if (config.auth === 'participant') {
  const resolved = await resolveParticipantAuth(req)
  participant = resolved
}
```

**Why Option B:** `resolveAuth` returns `AuthContext` (Supabase user context). Participant auth has a completely different shape — mixing them into one function would require a type union that breaks the handler's type guarantees. Keeping them separate maintains type safety.

**5. Wire into handler execution:**
```typescript
// Inside apiHandler's return function:

// 1. Rate limiting — auto-apply 'participant' tier for participant auth
if (config.rateLimit) {
  const rateLimitResponse = applyRateLimit(req, config.rateLimit)
  if (rateLimitResponse) return rateLimitResponse
} else if (config.auth === 'participant') {
  // Default rate limiting for participant routes (overridable via explicit rateLimit)
  const rateLimitResponse = applyRateLimit(req, 'participant')
  if (rateLimitResponse) return rateLimitResponse
}

// 2. Authentication & authorization
let auth: AuthContext | null = null
let participant: ParticipantContext | null = null

if (config.auth === 'participant') {
  participant = await resolveParticipantAuth(req)
  // auth stays null — participants have no Supabase session
} else {
  auth = await resolveAuth(config.auth)
}

// 3-5. Input validation, params, execute handler
return await config.handler({
  req,
  auth,
  participant,
  body: body as TInput,
  params,
  requestId,
})
```

### 8.2 Default Rate Limiting for Participant Routes

**Problem:** Participant routes are the largest external attack surface. An unauthenticated user who obtains (or guesses) a token can call endpoints at high frequency. Current state: 4 of 10 routes have no rate limiting at all.

**Solution:** When `auth === 'participant'`, the wrapper **auto-applies** rate limiting using a `'participant'` tier unless the route explicitly sets `rateLimit` to a different value.

```typescript
// Auto rate limiting logic (in apiHandler):
const effectiveRateLimit = config.rateLimit
  ?? (config.auth === 'participant' ? 'participant' : undefined)

if (effectiveRateLimit) {
  const rateLimitResponse = applyRateLimit(req, effectiveRateLimit)
  if (rateLimitResponse) return rateLimitResponse
}
```

**New rate limit tier:**

```typescript
// In lib/utils/rate-limiter.ts — add 'participant' tier
export const RATE_LIMITS = {
  // ... existing tiers ...
  participant: { windowMs: 60_000, maxRequests: 60 },  // 60 req/min per IP
} as const
```

**Override behavior:**
- `auth: 'participant'` with no `rateLimit` → auto `'participant'` (60/min)
- `auth: 'participant', rateLimit: 'api'` → uses `'api'` tier instead
- `auth: 'participant', rateLimit: 'strict'` → uses `'strict'` tier instead

This is a **default, not a mandate** — routes can always opt into a different tier.

**Impact on Batch 6:**

| Route | Current Rate Limit | After Migration |
|-------|-------------------|-----------------|
| `play/me` | ❌ none | ✅ auto `'participant'` (60/min) |
| `play/me/role` | ❌ none | ✅ auto `'participant'` (60/min) |
| `play/me/role/reveal` | ❌ none | ✅ auto `'participant'` (60/min) |
| `play/ready` | ❌ none | ✅ auto `'participant'` (60/min) |
| `progress/update` | `'api'` | `'api'` (explicit override) |
| `unlock-achievement` | `'api'` | `'api'` (explicit override) |
| `sessions/join` | `'strict'` | `'strict'` (explicit, `auth: 'public'`) |
| `sessions/rejoin` | ❌ none | `'api'` (explicit, `auth: 'public'`) |

### 8.2 New Function: `resolveParticipantAuth`

```typescript
async function resolveParticipantAuth(req: NextRequest): Promise<ParticipantContext> {
  const resolved = await resolveParticipantWithExpiry(req)
  if (!resolved) {
    // resolveParticipantWithExpiry returns null for: missing token, invalid token,
    // blocked/kicked status, expired token
    // We throw a generic 401 — the function already logged the specific reason
    throw new AuthError('Unauthorized', 401)
  }
  return {
    participantId: resolved.participantId,
    displayName: resolved.displayName,
    sessionId: resolved.sessionId,
    role: resolved.role,
    status: resolved.status,
    expiresAt: resolved.expiresAt,
  }
}
```

> **Note:** The current `resolveParticipant` returns `null` for all failure cases without distinguishing. To provide granular error codes (§5.1), we would need to modify `resolveParticipant` or create a variant that throws. **Recommendation:** Start with the simple `null → 401` approach. Add granular error codes later if UX requires it (client can already distinguish "no token stored" from "API returned 401" locally).

### 8.3 Minor Change to `play-auth.ts`

The existing `resolveParticipant` already selects `token_expires_at` from the DB but does **not** include it in the returned `ResolvedParticipant`. We need a variant that passes it through.

**Option A — extend `ResolvedParticipant`:** Add `expiresAt` field to the existing interface. This changes the return type for all callers (Group C routes) but they can ignore the new field.

**Option B — new function `resolveParticipantWithExpiry`:** Thin wrapper that calls the same DB query but also returns `expiresAt`. Keeps existing interface stable.

**Recommendation: Option A** (simpler, no duplication). The change is backward-compatible — existing callers simply don't use the new field.

```typescript
// Updated ResolvedParticipant
export interface ResolvedParticipant {
  participantId: string
  displayName: string
  sessionId: string
  role: string
  status: string
  expiresAt: string | null  // NEW — token_expires_at ISO string
}

// Updated return in resolveParticipant:
return {
  participantId: participant.id,
  displayName: participant.display_name,
  sessionId: participant.session_id,
  role: participant.role ?? 'player',
  status: participant.status ?? 'active',
  expiresAt: participant.token_expires_at ?? null,  // NEW
}
```

No new DB queries needed — `token_expires_at` is already in the SELECT.

### 8.4 Type Export for Handlers

```typescript
// Export from route-handler.ts for handler files
export type { ParticipantContext }
```

Handlers that need to reference the type (e.g., for utility functions) can import it:
```typescript
import { apiHandler, type ParticipantContext } from '@/lib/api/route-handler'
```

---

## 9. Transport Standardization

### Current State (3 inconsistent patterns)

| Pattern | Transport | Routes | Count |
|---------|-----------|--------|-------|
| **Header** | `x-participant-token` header | play/me, play/me/role, play/me/role/reveal, play/ready | 4 |
| **Body (snake_case)** | `participant_token` in JSON body | participants/progress/update, participants/progress/unlock-achievement | 2 |
| **Body (camelCase)** | `participantToken` in JSON body | participants/sessions/rejoin | 1 |
| **N/A** | Token does not exist yet | participants/sessions/join | 1 |

### Target State

| Transport | Routes | Rationale |
|-----------|--------|-----------|
| **Header `x-participant-token`** | All routes that validate an existing token | Credentials in headers, not body (OWASP). Single extraction point for wrapper. |
| **Body** | `sessions/join` (creates token), `sessions/rejoin` (reconnection body data) | Token lifecycle routes that also carry body payload. Rejoin keeps body token because the client stores and re-sends the full reconnection payload. |

### Client-Side Impact

**Breaking changes for 2 routes:**

| Route | Current Client Call | New Client Call |
|-------|-------|-----|
| `progress/update` | `fetch(url, { body: { participant_token, game_id, ... } })` | `fetch(url, { headers: { 'x-participant-token': token }, body: { game_id, ... } })` |
| `progress/unlock-achievement` | `fetch(url, { body: { participant_token, achievement_id, ... } })` | `fetch(url, { headers: { 'x-participant-token': token }, body: { achievement_id, ... } })` |

**Rejoin stays as-is:** The rejoin route reads `participantToken` from body. This is acceptable — it's a lifecycle route (category 6c) that won't use `auth: 'participant'`.

---

## 10. Security Invariants

### 10.1 Invariants Enforced by the Wrapper

| Invariant | Enforcement | Current Gaps Fixed |
|-----------|-------------|-------------------|
| **Token presence required** | Wrapper rejects with 401 if `x-participant-token` header missing | Some routes check token + session_code together — missing token without session_code returned 400, not 401 |
| **Token must exist in DB** | `resolveParticipant` → DB lookup via service-role client | Currently enforced by inline code in each route — no gap, but 6× duplication |
| **Blocked/kicked → reject** | `isParticipantValid()` checks `REJECTED_PARTICIPANT_STATUSES` | All routes do this, but error messages inconsistent |
| **Expired → reject** | `isParticipantValid()` checks `token_expires_at` | **`play/ready` is missing this check** — wrapper fixes it automatically |
| **Service-role for DB access** | `resolveParticipant` uses `createServiceRoleClient()` | Currently done correctly by all routes |
| **Rate limiting** | Auto-applied `'participant'` tier (60/min) when `auth === 'participant'` | **4 of 6 participant routes have no rate limiting** — wrapper fixes all automatically |

### 10.2 Invariants Enforced by the Handler (NOT wrapper)

| Invariant | Rationale |
|-----------|-----------|
| Session belongs to participant | Business rule — session lookup varies by route |
| Session status gates (lobby, active) | Business rule — different routes allow different statuses |
| Resource-level authorization (SVG accessibility) | Too specific for generic wrapper |

### 10.3 Bug Fixes Included in Batch 6

| Bug | Route | Fix |
|-----|-------|-----|
| **Missing token expiry check** | `play/ready` | Wrapper enforces via `isParticipantValid()` |
| **Missing rate limiting** | `participants/sessions/rejoin` | Add `rateLimit: 'api'` in wrapper config |
| **Missing try/catch** | `play/me`, `play/ready` | Wrapper's error handler catches all |
| **Missing `await` on `createServiceRoleClient()`** | `progress/update`, `unlock-achievement` | Wrapper calls `resolveParticipant` which correctly `await`s |

---

## Appendix A: Current vs Target Comparison

### play/me (representative example)

**Before (83 lines, inline auth):**
```typescript
export async function GET(request: Request) {
  const token = request.headers.get('x-participant-token')
  const url = new URL(request.url)
  const sessionCode = url.searchParams.get('session_code')

  if (!token || !sessionCode) {
    return NextResponse.json({ error: 'Missing participant token or session_code' }, { status: 400 })
  }

  const normalizedCode = normalizeSessionCode(sessionCode)
  const supabase = await createServiceRoleClient()

  // 1. Session lookup (~5 lines)
  const { data: session } = await supabase.from('participant_sessions')...
  if (!session) return 404

  // 2. Participant lookup (~5 lines)
  const { data: participant } = await supabase.from('participants')...
  if (!participant) return 404

  // 3. Status check (~3 lines)
  if (REJECTED_PARTICIPANT_STATUSES.has(participant.status)) return 403

  // 4. Expiry check (~3 lines)
  if (token_expires_at < now) return 401

  // 5. Business logic (~20 lines)
  return NextResponse.json({ participant: {...}, session: {...} })
}
```

**After (~45 lines, wrapper auth):**
```typescript
export const GET = apiHandler({
  auth: 'participant',
  handler: async ({ req, participant }) => {
    const url = new URL(req.url)
    const sessionCode = url.searchParams.get('session_code')
    if (!sessionCode) {
      throw ApiError.badRequest('Missing session_code')
    }

    const normalizedCode = normalizeSessionCode(sessionCode)
    const supabase = await createServiceRoleClient()

    // 1. Session lookup — validate participant belongs to this session
    const { data: session } = await supabase.from('participant_sessions')
      .select('*').eq('session_code', normalizedCode).single()
    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }
    if (session.id !== participant!.sessionId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // 2. Business logic (~20 lines) — auth already validated by wrapper
    return NextResponse.json({ participant: {...}, session: {...} })
  },
})
```

**Lines saved:** ~38 lines of auth boilerplate per route × 4 routes = ~152 lines eliminated.

---

## Appendix B: Existing Group B Routes (No Migration Needed)

These 8 routes already use `apiHandler({ auth: 'public' })` + inline `resolveSessionViewer()`. They are NOT part of Batch 6 — listed here for completeness:

| Route | Methods | Wrapper Since |
|-------|---------|---------------|
| `play/sessions/[id]/chat` | GET, POST | Batch 5 |
| `play/sessions/[id]/decisions` | GET | Batch 5 |
| `play/sessions/[id]/decisions/results` | GET | Batch 5 |
| `play/sessions/[id]/artifacts` | GET | Batch 5 |
| `play/sessions/[id]/signals` | GET, POST | Batch 5 |
| `play/sessions/[id]/outcome` | GET | Batch 5 |
| `play/sessions/[id]/conversation-cards/collections` | GET | Batch 5 |
| `play/sessions/[id]/heartbeat` | POST | Batch 5 |

---

## Appendix C: Existing Group C Routes (No Migration Needed)

These 3 routes already use `apiHandler` + inline `resolveParticipant()`. They use `auth: 'public'` because they were migrated before `auth: 'participant'` existed. They **could** be updated to `auth: 'participant'` after Batch 6a ships, but this is optional and low-priority.

| Route | Methods | Notes |
|-------|---------|-------|
| `play/sessions/[id]/decisions/vote` | POST | Uses `resolveParticipant(req, sessionId)` with explicit session scoping |
| `play/sessions/[id]/artifacts/keypad` | POST | Uses `resolveParticipant(req, sessionId)` |
| `play/sessions/[id]/artifacts/puzzle` | POST, PATCH, DELETE | Uses `resolveParticipant(req, sessionId)` |

**Note:** These routes pass `sessionId` to `resolveParticipant()` from the URL param. Under `auth: 'participant'` (which calls `resolveParticipant(req)` without sessionId), they would need to add inline session verification. This makes migration marginal — leave them as-is.

---

## Appendix D: Auth Validation Atomicity Analysis

GPT review raised the question: are the 5 participant-auth checks atomic?

### The 5 checks

| # | Check | Where | Atomic? |
|---|-------|-------|---------|
| 1 | Token exists in DB | `resolveParticipant` — single DB query | ✅ Part of single query |
| 2 | Token not expired | `isParticipantValid` — reads `token_expires_at` from same row | ✅ Same row |
| 3 | Token active (not revoked) | Covered by status check (#4) — revoked = `status: 'kicked'` | ✅ Same row |
| 4 | Participant active (not blocked/kicked) | `isParticipantValid` — reads `status` from same row | ✅ Same row |
| 5 | **Session active** | **NOT checked by wrapper** | ⚠️ Not in auth layer |

### Assessment

Checks 1–4 are effectively atomic: they all operate on the same `participants` row returned by a single `.select().eq('participant_token', token).single()` query.

Check 5 (session active) is **intentionally NOT in the wrapper**. This is correct because:
- Session status is a **business rule**, not authentication
- Different routes allow different session statuses (lobby, active, paused)
- `play/ready` only allows `lobby` + `active`; `play/me` allows any non-ended status
- The wrapper can't know which statuses are valid for a given route

**However**, there is a TOCTOU window between the wrapper's participant check and the handler's session check. A session could be ended between the two calls. This is an acceptable race condition because:
1. The window is milliseconds (same request)
2. Session end is a host-initiated action, not an attack vector
3. The handler will see the ended session and return 409/410 anyway
4. Supabase reads are snapshot-consistent within a single client instance

### Recommendation

No change needed for Batch 6. If a future audit identifies session-state races as a real issue, consider a combined query:

```sql
participants p JOIN participant_sessions s ON p.session_id = s.id
WHERE p.participant_token = ? AND s.status NOT IN ('ended', 'cancelled', 'archived')
```

But this couples auth to session lifecycle — keep them separate for now.

---

## Appendix E: system_admin Override in Play Sessions

GPT review asked: should `system_admin` get host privileges in Play sessions?

### Current behavior

| Function | system_admin handling | Behavior |
|----------|----------------------|----------|
| `requireSessionHost()` (auth-guard.ts) | **Bypasses** host_user_id check | system_admin = full host privileges |
| `resolveSessionViewer()` (play-auth.ts) | **No bypass** — checks `host_user_id === user.id` | system_admin who isn't host → `null` (rejected) |
| `resolveParticipant()` (play-auth.ts) | **N/A** — participant-only, no user auth path | system_admin irrelevant |

### Analysis

There is an **inconsistency**:
- Session management routes (delete, archive, token revoke) — system_admin has full access via `requireSessionHost()` ✅
- Play runtime routes (chat, signals, artifacts) — system_admin who isn't host is locked out of `resolveSessionViewer()` ⚠️

### Decision: Defer to Sessions & Participants domain audit

This is **not a Batch 6 concern**. The `auth: 'participant'` mode is participant-only — system_admin never uses it.

The question of whether system_admin should be able to observe (or override) active Play sessions belongs in the **Sessions & Participants domain audit** (Phase 3.8 in the launch program). Options:

| Option | Viewer type | Implication |
|--------|-------------|-------------|
| A: system_admin = host | `{ type: 'host', userId }` | Can see everything, send host messages, control session. Risk: accidental interference. |
| B: system_admin = observer | New `{ type: 'observer', userId }` | Read-only view. Requires new viewer type in all handlers. |
| C: system_admin locked out | Current behavior | Can manage sessions (archive, delete) but can't see live Play content. Clean separation. |

**Current recommendation: Option C** (keep current behavior). system_admin manages sessions via management routes. Live Play observation is a feature request, not a security gap. Revisit during domain audit.

---

## Appendix F: Future Evolution — `withSessionViewer()` Adapter

GPT proposed a Play-specific adapter layered on top of `apiHandler()`:

```typescript
// Future: Play route adapter
export const GET = withSessionViewer({
  allow: ['host', 'participant'],
}, async ({ viewer, sessionId }) => {
  // viewer is typed and guaranteed non-null
  // sessionId resolved from URL params
})
```

### Architecture

```
apiHandler()            ← generic: auth, rate limit, validation, error handling
   ↓
withSessionViewer()     ← Play-specific: viewer resolution, session scoping
   ↓
handler                 ← business logic only
```

### Why this is elegant

1. Eliminates repeated `resolveSessionViewer()` + null check (2–3 lines/route × 8+ routes)
2. Types the `allow` array — handler knows exactly which viewer types are possible
3. Centralizes session-not-found handling
4. Could enforce session-active checks (Appendix D, check #5) in one place

### Why not now

1. Only 8 Group B routes would benefit (already wrapped + working)
2. Group A routes (Batch 6) use `auth: 'participant'`, not viewer resolution
3. Adding another abstraction layer before Batch 6 ships = risk
4. Better to build it AFTER the Play domain audit reveals the full pattern

**Recommendation:** Track as post-Batch 6 / post-Play-audit improvement. If the domain audit confirms 15+ routes using the same viewer pattern, build it then.

---

## Changelog

| Date | Change |
|------|--------|
| 2025-07-19 | Initial DD-2 spec — full contract, error model, batch plan, infrastructure changes |
| 2025-07-19 | **GPT review v1:** Approved spec. Two adjustments applied: (1) `ParticipantContext` extended with `expiresAt` for replay detection, telemetry, and debugging; (2) Auto rate limiting — `'participant'` tier auto-applied when `auth === 'participant'` unless overridden. `play-auth.ts` now needs minor change: add `expiresAt` to `ResolvedParticipant`. |
| 2026-03-11 | **GPT review v2:** Approved for implementation. Three research appendices added: (D) Auth validation atomicity — checks 1–4 atomic via single DB row, check 5 (session active) intentionally deferred to handler. (E) system_admin Play override — current behavior = locked out of live Play, deferred to Sessions & Participants audit. (F) `withSessionViewer()` adapter — tracked as post-Batch 6 / post-audit improvement. |
| 2026-03-11 | **GPT review v3 — Play state model review.** Play state model assessed as **B+** (denormalized columns + command idempotency + monotonic broadcast seq + audit log + DB constraints). GPT sharpened two concurrency characterizations: (1) Command idempotency (`UNIQUE(session_id, client_id, client_seq)`) protects against **replay/duplicate from same client** but NOT against **concurrent semantic conflicts** between different clients/tabs/devices — those remain last-write-wins. (2) Monotonic `broadcast_seq` provides **delivery consistency** (clients converge to latest server state) but is NOT the same as **state correctness** (domain-invalid mutations can still commit). Biggest confirmed gap: runtime mutations (`set_step`, `set_phase`, timers) do not consistently go through session-status lifecycle guards. GPT defined 4-area Play audit agenda: (i) runtime mutation matrix, (ii) state transition coverage, (iii) multi-tab/multi-actor races, (iv) authoritative source mapping. No changes to DD-2 contract or Batch 6 plan — proceed as decided. |
