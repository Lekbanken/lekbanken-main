# Sessions & Participants Audit

> **Domain:** Sessions & Participants (#8 in audit queue)  
> **Status:** ✅ Complete  
> **Date:** 2026-03-11  
> **Scope:** Join/rejoin flow, lobby state, participant lifecycle, session management, host/participant boundary, token usage, chat/voting from session perspective, public API exposure  
> **Files examined:** ~45 route files, ~60 handlers, 8 service/lib files, 6 hooks, 15+ migration files, 3 UI components  
> **Context:** Play remediation M1–M5 complete. Participant auth (DD-2) is stable. Session guards (M2) enforced across play routes. Focus is session/participant lifecycle integrity, auth boundaries, and data exposure.

---

## Executive Summary

The Sessions & Participants domain has **solid core infrastructure** — a well-designed command pipeline, proper token-based participant auth (DD-2), centralized session-status guards, and effective broadcast architecture. The join/rejoin flow is functionally correct with appropriate rate limiting and enumeration protection.

However, the audit identified **three systemic themes** that require attention:

1. **Unwrapped admin-facing routes** — `participants/route.ts` and `participants/[participantId]/route.ts` rely solely on RLS with no explicit auth check and no `apiHandler` wrapper. One route returns mock data on error in production.
2. **Missing input validation** — Join, rejoin, and create-session routes use manual string checks instead of Zod schemas via the wrapper's `input:` config. Fields like `avatarUrl` and `expiresInHours` have no validation.
3. **Dual-channel broadcast inconsistency** — The control route bypasses `broadcastPlayEvent()` and sends directly via `channel.send()` on a separate `session:` channel, creating divergent broadcast patterns.

None of these are P0 launch blockers, but several P1 findings require attention before launch.

---

## Table of Contents

1. [Findings Summary](#1-findings-summary)
2. [Join Flow Analysis](#2-join-flow-analysis)
3. [Rejoin Flow Analysis](#3-rejoin-flow-analysis)
4. [Participant Lifecycle Matrix](#4-participant-lifecycle-matrix)
5. [Host–Participant Boundary](#5-hostparticipant-boundary)
6. [Session Lifecycle & Control](#6-session-lifecycle--control)
7. [Public API Exposure](#7-public-api-exposure)
8. [Broadcast Architecture Analysis](#8-broadcast-architecture-analysis)
9. [Token Security & Lifecycle](#9-token-security--lifecycle)
10. [Unwrapped Routes](#10-unwrapped-routes)
11. [Confirmed Findings](#11-confirmed-findings)
12. [Test Gaps](#12-test-gaps)
13. [Doc Gaps](#13-doc-gaps)

---

## 1. Findings Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Launch blocker** | 0 | — |
| **P1 — Must fix** | 4 | Mock fallback in production; missing input validation (join/rejoin/create, incl. avatarUrl + expiresInHours); unwrapped admin routes; export endpoint no rate limit |
| **P2 — Should fix** | 6 | Control route broadcast bypass (dual broadcast path); N+1 queries in history/analytics; rejoin allows draft/locked status; board/lobby code-only auth (documented design tradeoff) |
| **P3 — Nice to have** | 3 | Dual-channel unification; token in localStorage vs HttpOnly cookie; setNextStarter race condition |

> **GPT Calibration (2026-03-11):** SESS-004 reclassified P1→P2 (architecture/hardening, no known user-facing or state-corruption issue). SESS-008 and SESS-009 subsumed under SESS-002 (umbrella finding for schema validation). SESS-010 reclassified as documented design tradeoff. SESS-001 category corrected to Implementation/Reliability.

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| SESS-001 | Mock data fallback in production — `participants/[participantId]` returns hardcoded mock participant+log on any error | P1 | Implementation / Reliability |
| SESS-002 | Missing Zod validation on join/rejoin/create — manual string checks, no schema, unvalidated fields (incl. `avatarUrl`, `expiresInHours`, settings). Subsumes SESS-008 and SESS-009. | P1 | Input validation | ✅ Fixed (M2) |
| SESS-003 | Unwrapped admin routes — `participants/route.ts` and `participants/[participantId]/route.ts` have no `apiHandler`, no explicit auth, no rate limiting | P1 | Auth/wrapper |
| SESS-004 | Dual broadcast path in control route — uses direct `channel.send()` on `session:` channel instead of `broadcastPlayEvent()`, no seq counter | **P2** | Architecture / Realtime consistency |
| SESS-005 | Export endpoint has no rate limiting — `participants/sessions/[id]/export` allows unlimited CSV downloads | P1 | Rate limiting |
| SESS-006 | N+1 query pattern in session history — per-session participant count + game progress queries for up to 50 sessions | P2 | Performance |
| SESS-007 | Rejoin status policy is implicit and inconsistent — `draft` should be blocked, `locked` requires explicit product decision | P2 | State consistency | ✅ Fixed (M3) |
| ~~SESS-008~~ | ~~`avatarUrl` field not validated~~ — **subsumed under SESS-002** | — | — |
| ~~SESS-009~~ | ~~`expiresInHours` accepts negative values~~ — **subsumed under SESS-002** | — | — |
| SESS-010 | Board and lobby endpoints have code-only auth — documented design tradeoff (classroom projector with shared session code) | P2 | Design note |
| SESS-011 | Dual-channel architecture (play: + session:) creates maintenance burden — two channels per session, inconsistent event delivery | P3 | Architecture |
| SESS-012 | Participant token stored in localStorage — vulnerable to XSS; HttpOnly cookie would be stronger | P3 | Security |
| SESS-013 | setNextStarter race condition — clears all flags then sets new one without transaction | P3 | Concurrency |

---

## 2. Join Flow Analysis

**Route:** `POST /api/participants/sessions/join`  
**Auth:** `public` | **Rate limit:** `strict` (5/min per IP) | **Wrapper:** ✅ `apiHandler`

### Flow

```
Client sends { sessionCode, displayName, avatarUrl? }
  → Validate inputs (manual string checks)
  → Normalize session code
  → Look up session by code (ParticipantSessionService.getSessionByCode)
  → Check session status (allow: lobby, active, paused)
  → Check session expiry
  → Check max participants limit
  → Generate participant token (crypto.randomUUID)
  → Calculate token expiry (from session settings, default 24h)
  → Insert participant row (service role)
  → Log join activity
  → Broadcast participants_changed (fire-and-forget)
  → Return { participant (with token), session metadata }
```

### Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Rate limiting | ✅ | `strict` tier (5/min) — appropriate for anonymous endpoint |
| Session status gate | ✅ | Correctly blocks draft, locked, ended, cancelled, archived |
| Max participants | ✅ | Reads from session settings, blocks at limit |
| Token generation | ✅ | `crypto.randomUUID()` — 128-bit entropy |
| Approve workflow | ✅ | `requireApproval` → status `idle` (awaiting host approval) |
| Enumeration protection | ✅ | 404 for invalid code (acceptable — codes are 6-char, not UUIDs) |
| IP/UA capture | ✅ | Stored for abuse detection |
| Activity logging | ✅ | `participant_activity_log` insert |
| Broadcast | ✅ | `participants_changed` via `broadcastPlayEvent()` |
| Input validation | ✅ ~~SESS-002~~ | ✅ Fixed (M2) — Zod schema via wrapper `input:` (sessionCode, displayName, avatarUrl) |

### Specific Concerns

1. **SESS-002: No Zod schema** — Uses manual `if (!field)` checks. Wrapper supports `input:` config with Zod for automatic 400 responses. Current approach is fragile and inconsistent with wrapped routes.

2. **SESS-008: `avatarUrl` not validated** — Accepted as arbitrary string, inserted directly into DB. If rendered as `<img src>`, could be:
   - External URL pointing to tracking pixel
   - `javascript:` URI (must verify rendering context)
   - Extremely long string (no length limit)
   
   **Mitigation:** Verify how `avatar_url` is rendered in UI. If via `<img>` or Next.js `<Image>`, XSS risk is low. Storage/SSRF risk depends on whether the URL is fetched server-side (likely not).

---

## 3. Rejoin Flow Analysis

**Route:** `POST /api/participants/sessions/rejoin`  
**Auth:** `public` | **Rate limit:** `api` (100/min per IP) | **Wrapper:** ✅ `apiHandler`

### Flow

```
Client sends { participantToken, sessionId }
  → Validate inputs (manual existence check)
  → Look up participant by token + sessionId (service role)
  → If not found: 401 (DD-2 enumeration protection)
  → Check participant status (blocked/kicked → 403)
  → Check session status (ended/cancelled/archived → 410)
  → Check token expiry (expired → 401)
  → If shouldActivate: update status to 'active', clear disconnected_at
  → Log rejoin activity
  → Return { participant, session }
```

### Assessment

| Aspect | Status | Notes |
|--------|--------|-------|
| Token enumeration | ✅ | 401 for invalid AND expired (DD-2) |
| Blocked/kicked check | ✅ | Uses `REJECTED_PARTICIPANT_STATUSES` set |
| Session status check | ✅ ~~SESS-007~~ | ✅ Fixed (M3) — draft now blocked (403), locked allowed (intended semantics) |
| Token expiry check | ✅ | Explicit server-side check |
| Activity restore | ✅ | Sets active + clears disconnected_at |
| Activity logging | ✅ | IP/UA captured |
| Input validation | ✅ ~~SESS-002~~ | ✅ Fixed (M2) — Zod schema validates participantToken + sessionId as UUID |

### SESS-007 Detail: Rejoin Status Inconsistency

| Session Status | Join Allows? | Rejoin Allows? | Correct? |
|---------|-------------|---------------|----------|
| draft | ❌ 403 | ✅ Allowed | ⚠️ Inconsistent — participant could rejoin a draft session they previously joined when it was active |
| lobby | ✅ | ✅ | ✅ |
| active | ✅ | ✅ | ✅ |
| paused | ✅ | ✅ | ✅ |
| locked | ❌ 403 | ✅ Allowed | ⚠️ Inconsistent — rejoin bypasses lock. Semantics unclear: should existing participants be able to return to a locked session? |
| ended | ❌ 410 | ❌ 410 | ✅ |
| cancelled | ❌ 410 | ❌ 410 | ✅ |
| archived | ❌ 410 | ❌ 410 | ✅ |

**Product decision needed:** Should rejoin be allowed in `locked` sessions? The lock semantics are "no new participants" — an existing participant reconnecting is not a new join. Argument FOR allowing: a disconnected participant shouldn't lose access. Argument AGAINST: host locked for a reason. **Recommendation:** Allow rejoin for `locked` (current behavior makes sense), but block `draft`. Add explicit status gate matching join's pattern.

---

## 4. Participant Lifecycle Matrix

Every API that changes participant state, with guards:

| Route | Method | Actor | Action | Status Guard | Broadcast | Notes |
|-------|--------|-------|--------|-------------|-----------|-------|
| `/participants/sessions/join` | POST | Anonymous | Create participant (active/idle) | Session: lobby/active/paused | `participants_changed` | ✅ Well-gated |
| `/participants/sessions/rejoin` | POST | Participant | Restore to active | Session: not ended/cancelled/archived | None | ⚠️ Missing broadcast on rejoin |
| `/play/heartbeat` | POST | Participant | Update last_seen_at, set active | Token valid + not rejected | None | Presence only |
| `/play/sessions/[id]/participants/[pid]` | PATCH | Host | kick | `assertSessionStatus('kick-block')` | `participants_changed` | ✅ |
| `/play/sessions/[id]/participants/[pid]` | PATCH | Host | block | `assertSessionStatus('kick-block')` | `participants_changed` | ✅ |
| `/play/sessions/[id]/participants/[pid]` | PATCH | Host | approve | **None** | `participants_changed` | ⚠️ No status check — approve works in any status |
| `/play/sessions/[id]/participants/[pid]` | PATCH | Host | setNextStarter | **None** | `turn_update` | ⚠️ No status check, race condition (SESS-013) |
| `/play/sessions/[id]/participants/[pid]` | PATCH | Host | setPosition | Only for ended sessions | None | Position for results display |
| `/participants/tokens/revoke` | POST | Host | Set status=kicked, expire token | Host ownership | None | Token management |
| `/participants/tokens/extend` | POST | Host | Extend token_expires_at | Host ownership | None | Token management |
| `/participants/tokens/cleanup` | POST | Cron | Disconnect inactive, archive sessions | `cron_or_admin` auth | None | Background job |
| `/play/ready` | POST | Participant | Toggle isReady in progress JSON | Session: lobby/active | `participants_changed` | ✅ |
| `/participants/progress/update` | POST | Participant | Update score/level/checkpoint | `participant` auth | None | Progress tracking |

### Missing Broadcasts

- **Rejoin** does not broadcast `participants_changed` — host won't see participant return in real-time
- **Token revoke/extend** — no broadcast, but host likely refreshes participant list
- **Token cleanup (disconnect)** — no broadcast for mass disconnects

---

## 5. Host–Participant Boundary

### Auth Pattern Consistency

| Route Group | Expected Auth | Actual Auth | Consistent? |
|-------------|-------------|-------------|-------------|
| Session CRUD (create, delete) | `user` + host check | ✅ `apiHandler({ auth: 'user' })` + host check | ✅ |
| Session control (pause/end/…) | `user` + host check | ✅ `apiHandler({ auth: 'user' })` + host check | ✅ |
| Participant management (kick/block) | `user` + host check | ✅ `apiHandler({ auth: 'user' })` + host check | ✅ |
| Token management | `user` + host check | ✅ `apiHandler` + `requireSessionHost()` | ✅ |
| Admin participant list | `user` + admin check | ❌ **RLS only, no explicit auth** | ⚠️ SESS-003 |
| Admin participant detail | `user` + admin check | ❌ **RLS only, mock fallback** | ⚠️ SESS-001/003 |
| Archive/restore | `user` + host check | ✅ `apiHandler` + `requireSessionHost()` | ✅ |
| Analytics/export | `user` + host check | ✅ `apiHandler({ auth: 'user' })` + host check | ✅ |

### `requireSessionHost()` Behavior

Defined in `lib/api/auth-guard.ts`. System admins always pass (bypass host check). This is consistent with `requireTenantRole()` behavior and intentional by design.

---

## 6. Session Lifecycle & Control

### Control Route Analysis

**Route:** `PATCH /api/participants/sessions/[sessionId]/control`  
**Auth:** `user` | **Wrapper:** ✅ `apiHandler`

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth | ✅ | `auth: 'user'` + host_user_id check |
| State machine | ✅ | Delegates to `applySessionCommand()` pipeline |
| Idempotency | ✅ | Via command pipeline (client_id + client_seq) |
| Activity logging | ✅ | Inserts to `participant_activity_log` |
| Broadcast | ⚠️ **SESS-004** | Uses direct `channel.send()` on `session:` channel — not `broadcastPlayEvent()` |

### SESS-004 Detail: Broadcast Bypass

The control route creates its own Supabase client with env vars:
```typescript
const supabaseService = createClient<Database>(supabaseUrl, supabaseServiceKey);
const channel = supabaseService.channel(`session:${sessionId}`);
await channel.send({ type: 'broadcast', event: 'participant_event', ... });
```

**Issues:**
1. No `seq` counter — cannot be deduplicated by client
2. No error handling wrapper — if send fails, no logging (unlike `broadcastPlayEvent()`)
3. Different channel (`session:` vs `play:`) — clients must subscribe to both
4. Creates a new Supabase client instance per request (resource waste)

**Fix:** Replace with `broadcastPlayEvent()` call on `play:` channel. Participant UI already listens to `play:` via `useLiveSession`. The `session:` channel listener in `useParticipantBroadcast` should be migrated to use `play:` events.

### Archive/Restore Flow

Both properly wrapped with `apiHandler` + `requireSessionHost()`:
- **Archive:** Only `ended` or `cancelled` → `archived` (with `archived_at` timestamp)
- **Restore:** Only `archived` → `ended` or `cancelled` (based on `ended_at` presence)
- Both write activity log entries. No broadcasts needed (non-live sessions).

---

## 7. Public API Exposure

### `/api/public/v1/sessions` (GET) — Unwrapped

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth | ❌ None | Requires `tenant_id` query param as authorization |
| Rate limit | ❌ None | Only pagination limits (max 100 per page) |
| Wrapper | ❌ Raw handler | No `apiHandler` |
| Data exposed | Session list | id, display_name, status, participant_count, created_at, started_at, ended_at |
| Tenant scoping | ✅ | Enforced via `.eq('tenant_id', tenantId)` |

**Risk:** Low-medium. Tenant IDs are UUIDs (hard to guess), and the data exposed is non-sensitive session metadata. Already documented in TI-NEW-1a (P2 deferred).

### `/api/public/v1/sessions/[id]` (GET) — Unwrapped

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth | ❌ None | Requires `tenant_id` query param |
| Rate limit | ❌ None | No rate limiting |
| Data exposed | Session detail | Same as above + optional `participants` (display_name, status, joined_at) |
| PII risk | ⚠️ | `include_participants` returns display names | 

**Risk:** Medium. Already documented in TI-NEW-1c (P1 — product decision needed). Display names are user-chosen pseudonyms, not real names.

### `/api/play/session/[code]` (GET) — Lobby Preview

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth | ❌ None (code-only) | Anyone with code can view |
| Rate limit | ✅ `api` (inline) | `applyRateLimitMiddleware()` |
| Data exposed | Lobby state | Session metadata + participant list (id, displayName, isReady) |
| Wrapper | ❌ Raw handler | Uses inline rate limit middleware |

### `/api/play/board/[code]` (GET) — Display Board

| Aspect | Status | Notes |
|--------|--------|-------|
| Auth | ❌ None (code-only) | Anyone with code can view |
| Rate limit | ✅ `api` (inline) | `applyRateLimitMiddleware()` |
| Data exposed | Board state | Current phase/step, revealed artifacts, decision results, outcomes |
| Wrapper | ❌ Raw handler | Uses inline rate limit middleware |

**SESS-010:** Board and lobby are intentionally public (the board is displayed on a projector via QR code). The 6-char code provides access control. However, this means anyone who sees the code (e.g., on a shared screen) can access the board from their phone. This is expected behavior but should be documented as a conscious design choice.

---

## 8. Broadcast Architecture Analysis

### Channel Inventory

| Channel | Used By | Events | Seq? | Sender |
|---------|---------|--------|------|--------|
| `play:{sessionId}` | Host + Participant via `useLiveSession` | 15+ event types | ✅ Atomic | `broadcastPlayEvent()` |
| `session:{sessionId}` | Participant via `useParticipantBroadcast` | 6 control events | ❌ No seq | Direct `channel.send()` |
| `participants:{sessionId}` | Host via `useParticipants` | postgres_changes (INSERT/UPDATE/DELETE) | N/A | Supabase auto |

### SESS-011: Dual Channel Problem

Both `play:` and `session:` channels deliver events to participants, but:
- `play:` has monotonic sequencing → dedup-safe
- `session:` has no sequencing → potential duplicates on reconnect
- Control events (pause/resume/end) go through `session:` only
- Participant state events (kick/block/approve) go through `play:` only
- Clients must subscribe to both channels

**Recommendation (P3):** Migrate control events from `session:` to `play:` channel via `broadcastPlayEvent()`. This unifies event delivery and adds seq-based dedup. Can be done post-launch.

---

## 9. Token Security & Lifecycle

### Token Validation Chain

```
Request with x-participant-token header
  → resolveParticipantAuth() [wrapper, for auth:'participant']
  OR resolveParticipant() [inline, for auth:'public' routes]
  OR resolveSessionViewer() [inline, for dual-auth routes]
  → DB lookup: participants WHERE participant_token = $1
  → Check status ∉ {kicked, blocked} → 403
  → Check token_expires_at > now() → 401
  → Return participant context
```

**Assessment:** The token validation chain is properly centralized and consistent. DD-2 error model is correctly implemented:
- 401: invalid token, expired token, missing token
- 403: blocked, kicked
- No 404 for tokens (prevents enumeration)

### Token Lifecycle Gaps

1. **No token refresh mechanism** — if a token expires mid-session, the participant must rejoin with a new code. This means they get a new participant ID and lose their progress. For long sessions (>24h), this could be problematic.

2. **SESS-012: localStorage is XSS-vulnerable** — Participant tokens are stored in `localStorage` (keys: `participant_token`, `participant_session_id`). If the app has an XSS vulnerability, tokens can be stolen. An HttpOnly cookie would be stronger, but harder to implement for cross-origin participant views.

3. **Token revocation is kick** — `tokens/revoke` sets status to `kicked` permanently. There's no "soft revoke" (expire without status change). This is fine for the current "kick = permanent" semantics.

---

## 10. Unwrapped Routes

Routes in the sessions/participants domain that still use raw `export async function` instead of `apiHandler`:

| Route | Method | Lines | Current Auth | Risk |
|-------|--------|-------|-------------|------|
| `participants/route.ts` | GET | 82 | RLS client only | 🔴 SESS-003: No explicit auth, no rate limit |
| `participants/[participantId]/route.ts` | GET | 86 | RLS client only | 🔴 SESS-001+003: Mock fallback + no explicit auth |
| `participants/[participantId]/actions/route.ts` | POST | ~20 | None (deprecated) | ✅ Returns 410 Gone |
| `play/sessions/[id]/overrides/route.ts` | GET, PATCH | 195 | Inline host check | ⚠️ Already in PLAY-008 (P2) |
| `play/sessions/[id]/artifacts/snapshot/route.ts` | GET, POST | ~20 | None (deprecated) | ✅ Returns 410 Gone |
| `play/board/[code]/route.ts` | GET | ~200 | Inline rate limit | ⚠️ Intentionally public |
| `play/session/[code]/route.ts` | GET | ~100 | Inline rate limit | ⚠️ Intentionally public |
| `public/v1/sessions/route.ts` | GET | ~80 | None | ⚠️ Already in TI-NEW-1a (P2) |
| `public/v1/sessions/[id]/route.ts` | GET | ~100 | None | ⚠️ Already in TI-NEW-1c (P1) |

### SESS-001 Detail: Mock Data Fallback

`participants/[participantId]/route.ts` contains hardcoded mock data:
```typescript
const mockParticipant = {
  id: 'p-1', name: 'Nora Nilsson', email: 'nora@example.com',
  tenantName: 'Lekbanken', risk: 'none', notes: 'Mockdata',
};
const mockLog = [
  { id: 'p-log-1', action: 'Lades till i session' },
  { id: 'p-log-2', action: 'Risknivå: låg' },
];
```

On any error (including auth failure via RLS), the catch block returns this mock data instead of an error:
```typescript
catch (err) {
  console.warn('[api/participants/:id] fallback to mock', err);
  return NextResponse.json({ participant: mockParticipant, log: mockLog });
}
```

**Issues:**
1. Masks real errors — RLS denials, DB connection issues, schema mismatches all silently return mock data
2. Returns 200 status with fake data — caller assumes success
3. Contains a fake email address (`nora@example.com`) visible in production responses
4. Admin UI shows fake participant info when real data should be displayed

---

## 11. Confirmed Findings

### SESS-001: Mock Data Fallback in Production (P1)

- **Category:** Implementation / Reliability
- **Location:** `app/api/participants/[participantId]/route.ts`
- **Impact:** Admin viewing participant detail sees mock data on any DB/auth error instead of an error message. Masks real errors, returns 200 with fabricated data, makes felsökning and admin decisions unreliable.
- **Fix:** Remove mock data, wrap in `apiHandler({ auth: 'user' })`, return proper error on failure
- **Effort:** Small (< 1 hour)

### SESS-002: Missing Zod Validation on Join/Rejoin/Create (P1) — ✅ Fixed (M2)

- **Location:** `participants/sessions/join`, `participants/sessions/rejoin`, `participants/sessions/create`
- **Resolution:** Zod schemas added to all 3 routes.
  - **join**: wrapper `input:` — `sessionCode` (1-20), `displayName` (1-50, trimmed), `avatarUrl` (URL, max 2048, HTTP(S) scheme check)
  - **rejoin**: wrapper `input:` — `participantToken` (UUID), `sessionId` (UUID)
  - **create**: internal `safeParse()` — `displayName` (1-100, trimmed), `description` (max 500), `expiresInHours` (0.5-720), `settings.maxParticipants` (int 1-1000), `settings.tokenExpiryHours` (0.5-720, nullable)
- **Security:** `avatarUrl` scheme-checked (HTTP/HTTPS only) — blocks `javascript:`, `data:`, `file:` URI schemes
- **Fixed:** 2026-03-11 (M2)

### SESS-003: Unwrapped Admin Routes (P1)

- **Location:** `app/api/participants/route.ts`, `app/api/participants/[participantId]/route.ts`
- **Impact:** No explicit auth check (relies on RLS), no rate limiting, no standardized error format
- **Context:** Called by `ParticipantsPage.tsx` (admin component using RBAC). The RLS policies limit SELECT to host (owns session) or system_admin. But the route doesn't verify auth at all — it relies on `createServerRlsClient()` which uses the cookie-based session. An unauthenticated request would get an anonymous Supabase client where RLS blocks everything... returning empty data (or mock data for `[participantId]`).
- **Fix:** Wrap both in `apiHandler({ auth: 'user' })` — the wrapper handles auth consistently. Remove mock fallback from `[participantId]`.
- **Effort:** Small (1-2 hours)

### SESS-004: Dual Broadcast Path in Control Route (P2 — reclassified per GPT calibration)

- **Category:** Architecture / Realtime consistency
- **Location:** `app/api/participants/sessions/[sessionId]/control/route.ts` lines 108-126
- **Impact:** Control events (pause/resume/lock/unlock/end) bypass centralized `broadcastPlayEvent()`, miss seq counter, use separate channel. No known user-facing errors or state corruption — the dual-channel pattern works correctly today.
- **GPT rationale for P2:** No evidence of security issues, state corruption, or user-visible errors. The divergence is architectural and should be addressed for consistency, but is not launch-blocking.
- **Fix:** Replace direct `channel.send()` with `broadcastPlayEvent()`. Update client to listen for control events on `play:` channel.
- **Effort:** Medium (2-3 hours — requires client-side migration)
- **Risk:** Low — can keep dual-channel temporarily while migrating

### SESS-005: Export Endpoint No Rate Limiting (P1)

- **Location:** `app/api/participants/sessions/[sessionId]/export/route.ts`
- **Impact:** Host can download unlimited CSV exports. Each export triggers 1-3 DB queries with potential for large result sets.
- **Fix:** Add `rateLimit: 'api'` to the `apiHandler` config. Already wrapped with `apiHandler`, just needs rate limit added.
- **Effort:** Trivial (1 line)

### SESS-006: N+1 Query Pattern (P2)

- **Location:** `participants/sessions/history`, `participants/sessions/[sessionId]/analytics`
- **Impact:** History endpoint may execute 100+ queries for 50 sessions (per-session participant counts + game progress). Analytics executes 3 separate queries that could be joined.
- **Fix:** Use aggregate subqueries or batch fetching
- **Effort:** Medium (3-4 hours)

### SESS-007: Rejoin Allows Draft/Locked Sessions (P2) — ✅ Fixed (M3)

- **Location:** `app/api/participants/sessions/rejoin/route.ts`
- **Impact:** Participant can rejoin a session that's been set back to draft or locked
- **Resolution:** `draft` now blocked with 403 "Session is not open for participants yet". `locked` remains allowed (existing participant reconnecting — intended lock semantics: "no _new_ participants"). Status matrix now consistent with join route.
- **Fixed:** 2026-03-11 (M3)

### ~~SESS-008: avatarUrl Not Validated~~ — Subsumed under SESS-002

This finding is covered by SESS-002's Zod schema for the join route (`avatarUrl: z.string().url().max(500).optional()`).

### ~~SESS-009: expiresInHours Negative Values~~ — Subsumed under SESS-002

This finding is covered by SESS-002's Zod schema for the create route (`expiresInHours: z.number().min(0.5).max(720).optional()`).

### SESS-010: Board/Lobby Code-Only Auth (P2 — Documented Design Tradeoff)

- **Location:** `play/board/[code]/route.ts`, `play/session/[code]/route.ts`
- **Impact:** Anyone with session code can view board state and participant list
- **Decision:** This is by design — the board is displayed on classroom projectors. Code serves as shared secret. Both routes have rate limiting. **No fix needed**, but documented as conscious design choice.
- **Status:** Documented design tradeoff — not a remediation item

### SESS-011: Dual-Channel Architecture (P3)

- **Impact:** Maintenance burden + potential event delivery divergence
- **Fix:** Unify on `play:` channel (post-launch)

### SESS-012: Token in localStorage (P3)

- **Impact:** XSS attack could steal participant tokens
- **Mitigation:** Tokens have configurable expiry (default 24h). Stolen tokens grant limited API access (participant actions only, no admin). CSP headers mitigate XSS risk.
- **Fix:** Move to HttpOnly cookie (post-launch consideration)

### SESS-013: setNextStarter Race Condition (P3)

- **Location:** `/play/sessions/[id]/participants/[participantId]` PATCH
- **Impact:** Concurrent setNextStarter calls could result in zero or multiple flags set
- **Fix:** Use single atomic UPDATE with CASE expression instead of clear-all-then-set
- **Effort:** Small

---

## 12. Test Gaps

| Test | Coverage | Priority |
|------|----------|----------|
| Join with max participants reached | None | P1 |
| Rejoin with expired token | None | P1 |
| Rejoin with kicked/blocked status | None | P1 |
| Concurrent join (race to max limit) | None | P2 |
| Token expiry mid-session | None | P2 |
| Control route state transitions (all 5 actions) | None | P1 |
| Export CSV injection | None | P2 |
| Board endpoint with non-existent code | None | P3 |
| Session code collision handling | None | P3 |
| No-expiry token quota enforcement | None | P2 |

---

## 13. Doc Gaps

| Doc | Issue | Priority |
|-----|-------|----------|
| `PLAY_SYSTEM_DOCUMENTATION.md` | Does not cover token lifecycle or join/rejoin flow | P2 |
| Participant status transitions | No state diagram in any doc | P2 |
| Board/lobby access model | Not documented as intentional design choice | P3 |
| Session code format | Documented in code comments only, not in architecture docs | P3 |
| `session:` vs `play:` channel split | Not documented anywhere | P2 |
