# Level 2 Audit — Play / Session Authoring Chain

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Closed level-2 audit for the play and session-authoring chain. Treat this as a bounded building-block verification snapshot behind the launch-readiness runtime work.

> **Audit type:** Level 2 Building Block Audit (per §7 audit-program.md)  
> **Date:** 2026-03-16  
> **Auditor:** Claude  
> **Status:** ✅ COMPLETE  
> **Result:** 0 P0, 0 P1, 3 P2, 4 P3 — **PASS (launch-safe)**

---

## 1. Scope & Building Blocks Audited

This audit covers the **Play / Session authoring chain** — the core runtime system that manages session lifecycle, participant authentication, command execution, realtime broadcast, and all play-time API surfaces.

### Domain Size

| Category | Count |
|----------|-------|
| API routes (play + participants + sessions) | 68 |
| Server helpers (lib/) | 16 |
| Client hooks | 23 |
| Components (features/play + components/play) | 90+ |
| Tables (primary) | participant_sessions, participants, session_commands, game_sessions, run_sessions, session_artifacts, participant_activity_log |
| Type definition files | 7 |

### Building Blocks

| # | Building Block | File | Responsibility |
|---|---------------|------|----------------|
| BB-1 | Play Auth | `lib/api/play-auth.ts` | Participant token validation, session viewer resolution (dual-path: participant token OR host cookie) |
| BB-2 | Session Command Pipeline | `lib/play/session-command.ts` | Command idempotency, state machine transitions, mutation execution, broadcast trigger |
| BB-3 | Play Broadcast Server | `lib/realtime/play-broadcast-server.ts` | Atomic sequence counter, best-effort Supabase channel broadcast |
| BB-4 | Session Guards | `lib/play/session-guards.ts` | Mutation-type → allowed-status policy matrix (18 mutation types) |
| BB-5 | Participant Token | `lib/services/participants/participant-token.ts` | Token generation (UUID v4), verification, activity tracking, expiry extension, revocation |
| BB-6 | Route Handler (auth dispatch) | `lib/api/route-handler.ts` | Central API wrapper — auth mode dispatch, rate limiting, Zod validation |

---

## 2. Architecture Chain Map

```
┌─────────────────────────────────────────────────────────────────────────┐
│ PLAY / SESSION AUTHORING CHAIN                                          │
│                                                                         │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │ ENTRY POINTS                                                     │    │
│  │                                                                  │    │
│  │  Host (authenticated)          Participant (token-based)         │    │
│  │  ┌─────────────────┐          ┌────────────────────────┐        │    │
│  │  │ apiHandler({    │          │ apiHandler({           │        │    │
│  │  │   auth: 'user'  │          │   auth: 'participant'  │        │    │
│  │  │ })              │          │ }) [or 'public' +      │        │    │
│  │  │                 │          │    inline token check]  │        │    │
│  │  └────────┬────────┘          └──────────┬─────────────┘        │    │
│  │           │                               │                      │    │
│  │           ▼                               ▼                      │    │
│  │  ┌────────────────┐          ┌────────────────────────┐         │    │
│  │  │ Inline host    │          │ resolveParticipant()   │         │    │
│  │  │ check:         │          │ BB-1: play-auth.ts     │         │    │
│  │  │ host_user_id   │          │                        │         │    │
│  │  │ === userId     │          │ x-participant-token →  │         │    │
│  │  │ [+ admin       │          │ service role lookup →  │         │    │
│  │  │  fallback]     │          │ check REJECTED +       │         │    │
│  │  │                │          │ check expiry           │         │    │
│  │  └────────┬───────┘          └──────────┬─────────────┘         │    │
│  └───────────┼──────────────────────────────┼───────────────────────┘    │
│              │                              │                            │
│  ┌───────────▼──────────────────────────────▼───────────────────────┐    │
│  │ COMMAND PIPELINE (BB-2: session-command.ts)                       │    │
│  │                                                                   │    │
│  │  1. Idempotency check (client_id + client_seq)                   │    │
│  │  2. Insert session_commands record                                │    │
│  │  3. executeMutation():                                            │    │
│  │     ├─ Status transitions: atomic WHERE guard (TOCTOU fix)        │    │
│  │     │  STATUS_TRANSITIONS[cmd] → { from: Set, to: string }       │    │
│  │     │  .update({ status }).in('status', [...from]).maybeSingle()  │    │
│  │     │  null → throw Conflict                                      │    │
│  │     │                                                             │    │
│  │     └─ Runtime mutations: set_step, set_phase, timer_*, board_msg │    │
│  │        assertSessionStatus() (BB-4)                               │    │
│  │  4. Mark command applied                                          │    │
│  │  5. broadcastPlayEvent() (BB-3)                                   │    │
│  │  6. Return updated state                                         │    │
│  └──────────────────────────────────┬────────────────────────────────┘    │
│                                     │                                     │
│  ┌──────────────────────────────────▼────────────────────────────────┐    │
│  │ BROADCAST (BB-3: play-broadcast-server.ts)                        │    │
│  │                                                                   │    │
│  │  nextSeq(sessionId):                                              │    │
│  │    atomic RPC increment_broadcast_seq → monotonic sequence        │    │
│  │    fallback seq = -1 on failure (never poisons client guard)      │    │
│  │                                                                   │    │
│  │  broadcastPlayEvent(sessionId, event):                            │    │
│  │    Supabase channel.send() to `play:{sessionId}`                  │    │
│  │    best-effort (logged, never thrown)                              │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │ SESSION GUARDS (BB-4: session-guards.ts)                          │    │
│  │                                                                   │    │
│  │  PLAY_MUTATION_STATUS_POLICY: 18 mutation types                   │    │
│  │  Each maps to Set of allowed SessionStatus values                 │    │
│  │  assertSessionStatus() → null (ok) | 409 NextResponse            │    │
│  └───────────────────────────────────────────────────────────────────┘    │
│                                                                          │
│  ┌───────────────────────────────────────────────────────────────────┐    │
│  │ PARTICIPANT TOKEN (BB-5: participant-token.ts)                    │    │
│  │                                                                   │    │
│  │  generate: crypto.randomUUID() — UUID v4, 122 bits entropy       │    │
│  │  verify: service role lookup → check REJECTED + check expiry     │    │
│  │  activity: update last_seen_at + status='active'                  │    │
│  │  extend: update token_expires_at                                  │    │
│  │  revoke: set status='kicked' + disconnected_at                   │    │
│  └───────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Complete Auth Pattern Survey (68 routes)

### Auth Mode Distribution

| Auth Mode | Route Count | Pattern |
|-----------|------------|---------|
| `'user'` (Supabase auth) | 42 methods | Host-only operations with inline host_user_id check |
| `'public'` (no auth / custom internal) | 14 methods | Public endpoints + routes using `resolveSessionViewer()` internally |
| `'participant'` (token-based) | 9 methods | Participant-only operations via `x-participant-token` |
| `'cron_or_admin'` | 3 methods | Cron jobs + admin operations |
| `{ sessionHost }` (object) | 1 method | `DELETE participants/sessions/[sessionId]` |
| No apiHandler | 8 methods | Inline auth or deprecated endpoints |

### Routes Without `apiHandler` Wrapper

| Route | Methods | Auth Pattern | Risk |
|-------|---------|-------------|------|
| `play/board/[code]/` | GET | Rate-limited only, no auth | **By design** — public participant board (SESS-010) |
| `play/session/[code]/` | GET | Rate-limited only, no auth | **By design** — public lobby view (SESS-010) |
| `play/sessions/[id]/overrides/` | GET, PATCH | Inline `getUser()` + host check | **L2-SESS-002** — no rate limit, no standardized errors |
| `play/sessions/[id]/game/` | GET | Inline dual auth (host/participant/admin) | **L2-SESS-001** — complex inline auth, no rate limit |
| `play/sessions/[id]/artifacts/snapshot/` | GET, POST | None (deprecated 410) | Low risk — always returns 410 |
| `sessions/[sessionId]/` | GET | Inline RLS client | Low risk — RLS-scoped read |
| `participants/[participantId]/actions/` | POST | None (deprecated 410) | Low risk — always returns 410 |
| `sessions/[sessionId]/actions/` | POST | None (deprecated 410) | Low risk — always returns 410 |

### Routes With `system_admin` Bypass via Inline `users.global_role` Check

| Route | Line Pattern | Cross-ref |
|-------|-------------|-----------|
| `play/sessions/[id]/command/` POST | `users.global_role === 'system_admin'` | L2-AUTH-003 |
| `play/sessions/[id]/state/` PATCH | `users.global_role === 'system_admin'` | L2-AUTH-003 |
| `play/sessions/[id]/game/` GET | `users.global_role === 'system_admin'` | L2-AUTH-003 |

### Routes Using `resolveSessionViewer()` (Dual Auth)

These routes use `auth: 'public'` at the apiHandler level but do internal auth via `resolveSessionViewer()`:

- `play/sessions/[id]/signals/` POST
- `play/sessions/[id]/chat/` GET, POST
- `play/sessions/[id]/decisions/` GET
- `play/sessions/[id]/decisions/[decisionId]/results/` GET
- `play/sessions/[id]/outcome/` GET
- `play/sessions/[id]/artifacts/` GET
- `play/sessions/[id]/roles/` GET
- `play/sessions/[id]/conversation-cards/collections/[collectionId]/` GET

**Assessment:** This is the correct pattern — these endpoints serve both host and participant views with role-appropriate filtering. `resolveSessionViewer()` performs proper token/cookie validation.

---

## 4. Building Block Analysis

### BB-1: Play Auth (`lib/api/play-auth.ts`)

**Ingress:** `(request: Request, sessionId?: string)` — reads `x-participant-token` header and/or cookie auth  
**Egress:** `ResolvedParticipant | null` or `Viewer | null`

**Key invariants verified:**
- ✅ `REJECTED_PARTICIPANT_STATUSES` = `Set(['blocked', 'kicked'])` — consistently checked
- ✅ Token expiry checked: `new Date(p.token_expires_at) < new Date()` → reject
- ✅ `resolveSessionViewer` forces participant path for token holders (even if also host) — prevents host seeing participant data
- ✅ Service role used for participant lookups (correct — participants have no Supabase auth)
- ✅ `isParticipantValid` composes both status and expiry checks

**Call-sites verified (grep):**

| Call-site | File | Usage | Correct? |
|-----------|------|-------|----------|
| `resolveParticipantAuth` | `lib/api/route-handler.ts` L193 | apiHandler participant auth dispatch | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/signals/` | POST — sender identification | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/chat/` | GET+POST — viewer-scoped filtering | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/decisions/` | GET — viewer-scoped filtering | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/decisions/[decisionId]/results/` | GET | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/outcome/` | GET | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/artifacts/` | GET | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/roles/` | GET — soft host check for auto-snapshot | ✅ |
| `resolveSessionViewer` | `play/sessions/[id]/conversation-cards/` | GET | ✅ |
| `REJECTED_PARTICIPANT_STATUSES` | `play/sessions/[id]/game/route.ts` | Inline participant rejection check | ✅ |
| `REJECTED_PARTICIPANT_STATUSES` | `participants/sessions/rejoin/route.ts` | Rejoin status check | ✅ |

**No finding.** Building block is correct and consistently used.

---

### BB-2: Session Command Pipeline (`lib/play/session-command.ts`)

**Ingress:** `SessionCommand { sessionId, commandType, issuedBy, payload, clientId, clientSeq }`  
**Egress:** `{ success, commandId?, duplicate?, state?, error? }`

**Key invariants verified:**

- ✅ **Idempotency:** Checks `session_commands` for matching `client_id + client_seq`. Handles unique constraint violation (23505) as duplicate.
- ✅ **TOCTOU fix:** Status transitions use atomic `UPDATE ... WHERE id = :id AND status IN (:allowed_statuses)`. `.maybeSingle()` returns `null` on conflict → throws Error.
- ✅ **State machine:** `STATUS_TRANSITIONS` defines valid `{ from: Set, to: string }` for each status action (publish, unpublish, start, pause, resume, end, lock, unlock).
- ✅ **End command side effects:** Disconnects all active/idle participants, logs gamification event (idempotency key: `participant_session:{id}:ended`).
- ✅ **Broadcast ordering:** Mutation applied BEFORE broadcast. Failure in broadcast does not roll back mutation (correct — broadcast is best-effort).
- ✅ **Error handling:** Failed mutations mark command as `applied: false` with error message.

**Call-sites verified:**

| Call-site | File | Auth Mode | Correct? |
|-----------|------|-----------|----------|
| `play/sessions/[id]/command/` POST | Direct | `'user'` + inline host check + admin bypass | ✅ |
| `play/sessions/[id]/route.ts` PATCH | Legacy wrapper | `'user'` + inline host check | ✅ (see L2-SESS-004) |
| `participants/sessions/[id]/control/` PATCH | Delegation | `'user'` + inline host check | ✅ (see known SESS-004) |

**No new finding on the pipeline itself.** The TOCTOU guard is correctly implemented.

---

### BB-3: Play Broadcast Server (`lib/realtime/play-broadcast-server.ts`)

**Ingress:** `(sessionId: string, event: Record<string, unknown>)`  
**Egress:** Side-effect only (channel.send)

**Key invariants verified:**
- ✅ `nextSeq`: Atomic RPC `increment_broadcast_seq` — monotonically increasing
- ✅ Fallback `seq = -1` on RPC failure — never poisons client's sequence guard
- ✅ Best-effort: errors logged, never thrown — callers cannot fail on broadcast

**No finding.** Building block is well-designed with correct failure semantics.

---

### BB-4: Session Guards (`lib/play/session-guards.ts`)

**Ingress:** `(status: string, mutationType: string)`  
**Egress:** `null | NextResponse (409)`

**Policy matrix (18 mutation types × 8 session statuses):**

Verified that all mutation types have explicit allowed-status sets. Key observations:
- Status transitions (`start`, `pause`, `resume`, `end`, etc.) are enforced in the command pipeline's `STATUS_TRANSITIONS`, not via `assertSessionStatus`
- `assertSessionStatus` guards runtime mutations (set_step, timer_*, chat, signals, puzzle, etc.)
- Both guard systems are complementary — the command pipeline guards status changes, `assertSessionStatus` guards read/write operations

**Call-sites verified (grep — 17 unique call-sites):**
- All play mutation routes call `assertSessionStatus` before performing their operation
- The mutation type string matches the route's semantic action

**No finding.** Guard system is correct and consistently applied.

---

### BB-5: Participant Token (`lib/services/participants/participant-token.ts`)

**Ingress:** Various — `generateParticipantToken()`, `verifyParticipantToken(token)`, etc.  
**Egress:** Token string, participant data, or void

**Key invariants verified:**
- ✅ `generateParticipantToken()` uses `crypto.randomUUID()` — UUID v4 with 122 bits entropy (cryptographically secure)
- ✅ `verifyParticipantToken()` checks REJECTED status + token expiry
- ✅ `revokeParticipantToken()` sets `status='kicked'` + `disconnected_at` — permanent rejection via `REJECTED_PARTICIPANT_STATUSES`
- ✅ `updateParticipantActivity()` uses atomic `last_seen_at` + `status='active'` update
- ✅ `extendTokenExpiry()` validates positive hours value
- ✅ All functions use service role client (correct — participants have no Supabase auth)

**No finding.** Token lifecycle is secure and consistent.

---

### BB-6: Route Handler Auth Dispatch (`lib/api/route-handler.ts`)

See L2-AUTH audit (level2-auth-tenant-capability-audit.md) for full analysis. Session-relevant auth paths:

- `auth: 'user'` → `requireAuth()` → host check done in handler
- `auth: 'participant'` → `resolveParticipantAuth()` → auto-applies 'participant' rate limit
- `auth: 'public'` → null auth → inline validation
- `auth: { sessionHost }` → **falls back to `requireAuth()` only** (L2-AUTH-001 P3)

**Participant rejection detail (L193-220):**
On failure, `resolveParticipantAuth` re-queries DB to distinguish:
- Token not found / expired → 401
- Participant is blocked/kicked → 403

**No new finding.** Cross-references L2-AUTH-001.

---

## 5. End-to-End Flow Proofs

### Flow 1: Anonymous Participant Join → Play → Heartbeat → Rejoin

```
═══ JOIN ═══════════════════════════════════════════════════════════════
Client → POST /api/participants/sessions/join
  → apiHandler({ auth: 'public', rateLimit: 'strict' })              [5/min per IP]
  → Zod: sessionCode (1-10), displayName (1-50, trimmed),
         avatarUrl (optional, URL with HTTP(S) refine)
  → ParticipantSessionService.getSessionByCode(code)                  [service role]
  → Status gate: rejects draft/locked/ended/cancelled/archived
  → Expiry gate: rejects expired sessions
  → Max participants gate: count participants WHERE status IN (active,idle)
  → require_approval → status 'idle' instead of 'active'
  → generateParticipantToken() → crypto.randomUUID()                  [122 bits]
  → calculateTokenExpiry(24)                                           [default 24h]
  → INSERT participant (service role) with ip_address + user_agent
  → INSERT participant_activity_log (type: 'joined')
  → broadcastPlayEvent(sessionId, { type: 'participants_changed' })
  ← { participant: { id, token, ... }, session: { code, status, ... } }

═══ HEARTBEAT ═════════════════════════════════════════════════════════
Client → POST /api/play/heartbeat  [every ~30s]
  → apiHandler({ auth: 'public', rateLimit: 'api' })
  → Reads x-participant-token header + session_code query param
  → Service role: validates session (code match), participant (token match)
  → REJECTED_PARTICIPANT_STATUSES check → 403 if blocked/kicked
  → Token expiry check → 401 if expired
  → UPDATE: last_seen_at, status='active', disconnected_at=null
  ← { success: true }

═══ REJOIN (after disconnect/refresh) ═════════════════════════════════
Client → POST /api/participants/sessions/rejoin
  → apiHandler({ auth: 'public', rateLimit: 'api' })
  → Zod: participantToken (UUID), sessionId (UUID)
  → Service role: participant + session join query
  → REJECTED_PARTICIPANT_STATUSES → 403
  → Session status gate: rejects draft/ended/cancelled/archived
  → Token expiry → 401
  → require_approval check (skip activation if approval needed + idle)
  → UPDATE: status='active', last_seen_at, disconnected_at=null
  ← { participant, session }

Proof: ✅ Full lifecycle verified — join generates secure token, heartbeat
maintains liveness, rejoin restores state. Status + expiry gates enforced
at all three entry points.
```

### Flow 2: Host Session Lifecycle (Create → Start → Command → End)

```
═══ CREATE ═════════════════════════════════════════════════════════════
Host → POST /api/participants/sessions/create
  → apiHandler({ auth: 'user' })
  → Generates session code (session-code-generator.ts)
  → INSERT participant_sessions (host_user_id = auth.user.id, status='draft')
  ← { session: { id, code, status: 'draft', ... } }

═══ START (via command pipeline) ═══════════════════════════════════════
Host → POST /api/play/sessions/[id]/command
  { command_type: 'start', client_id: 'host-xyz', client_seq: 1 }
  → apiHandler({ auth: 'user' })
  → Inline host check: session.host_user_id === userId (+ system_admin fallback)
  → applySessionCommand():
    1. Idempotency check: no existing (client_id='host-xyz', client_seq=1) → proceed
    2. INSERT session_commands record
    3. executeMutation():
       - STATUS_TRANSITIONS.start = { from: Set([lobby]), to: 'active' }
       - Fetch session → verify status ∈ from set
       - Atomic UPDATE ... .in('status', ['lobby']) → sets status='active', started_at=now
       - .maybeSingle() → gets row back → success (no TOCTOU race)
    4. Mark command applied=true
    5. broadcastPlayEvent({ type: 'state_change', payload: { status: 'active' } })
    6. Return updated state
  ← { success: true, state: { status: 'active', ... } }

═══ END ════════════════════════════════════════════════════════════════
Host → POST /api/play/sessions/[id]/command
  { command_type: 'end', client_id: 'host-xyz', client_seq: 2 }
  → ... same flow as above ...
  → executeMutation():
    - STATUS_TRANSITIONS.end = { from: Set([active, paused, locked]), to: 'ended' }
    - Atomic UPDATE → sets status='ended', ended_at=now
    - Side effect: UPDATE participants SET status='disconnected' WHERE status IN (active, idle)
    - Side effect: logGamificationEventV1({ eventType: 'session_completed', ... })
  → broadcastPlayEvent({ type: 'state_change', payload: { status: 'ended' } })
  ← { success: true, state: { status: 'ended', ... } }

Proof: ✅ Full host lifecycle verified — create → start → end.
State machine enforced with atomic WHERE guard. Concurrent starts rejected.
Participants disconnected on end. Gamification event logged.
```

### Flow 3: Participant Rejection Propagation (Kick → API Rejection)

```
═══ HOST KICKS PARTICIPANT ═════════════════════════════════════════════
Host → PATCH /api/play/sessions/[id]/participants/[participantId]
  { action: 'kick' }
  → apiHandler({ auth: 'user' })
  → Inline host check: session.host_user_id === userId
  → assertSessionStatus(session.status, 'kick-block')
  → revokeParticipantToken(participantToken):
    UPDATE participants SET status='kicked', disconnected_at=now
  → broadcastPlayEvent({ type: 'participant_kicked', ... })
  ← { success: true }

═══ KICKED PARTICIPANT TRIES HEARTBEAT ═════════════════════════════════
Participant → POST /api/play/heartbeat
  → Token lookup → participant.status = 'kicked'
  → REJECTED_PARTICIPANT_STATUSES.has('kicked') → true
  ← 403 { error: 'Blocked or expired participant' }

═══ KICKED PARTICIPANT TRIES CHAT ══════════════════════════════════════
Participant → POST /api/play/sessions/[id]/chat
  → apiHandler({ auth: 'public' })
  → resolveSessionViewer(sessionId, req):
    → x-participant-token → lookup → REJECTED_PARTICIPANT_STATUSES.has('kicked')
    → returns null
  ← 401 { error: 'Unauthorized' }

═══ KICKED PARTICIPANT TRIES REJOIN ═══════════════════════════════════
Participant → POST /api/participants/sessions/rejoin
  → Zod validation passes
  → Service role lookup → participant.status = 'kicked'
  → REJECTED_PARTICIPANT_STATUSES.has('kicked') → true
  ← 403 { error: 'You have been removed from this session' }

Proof: ✅ Rejection propagation verified — kicked status blocks all
participant API paths: heartbeat (403), viewer-based routes (401), rejoin (403).
```

### Flow 4: Concurrent Command TOCTOU Guard

```
═══ TWO HOSTS PRESS START SIMULTANEOUSLY ══════════════════════════════
Host A → POST command { type: 'start', client_id: 'A', client_seq: 1 }
Host B → POST command { type: 'start', client_id: 'B', client_seq: 1 }

Both pass:
  - Auth (both are host)
  - Idempotency check (different client_id → both proceed)
  - INSERT session_commands (both succeed, unique by session_id+client_id+client_seq)

Host A enters executeMutation():
  - SELECT session → status = 'lobby' → transition.from.has('lobby') ✅
  - UPDATE ... .in('status', ['lobby']) → succeeds (status was 'lobby')
  - Row returned → mutation applied ✅
  - status is now 'active'

Host B enters executeMutation():
  - SELECT session → status MIGHT be 'lobby' (race) or 'active' (already changed)
  
  Case 1 (status already 'active'):
    - transition.from.has('active') = false → throw Error('Cannot start: session is active')
    - Command marked as failed
  
  Case 2 (SELECT returns 'lobby' but concurrent UPDATE already changed it):
    - UPDATE ... .in('status', ['lobby']) → 0 rows affected (status is now 'active')
    - .maybeSingle() returns null
    - throw Error('Conflict: session status changed concurrently')
    - Command marked as failed

Proof: ✅ TOCTOU race correctly handled — atomic WHERE guard ensures exactly
one concurrent command succeeds. The other receives a clear conflict error.
```

---

## 6. Regression Check

### Previously Remediated Findings (L1 Sessions Audit)

| SESS ID | Original Finding | L1 Fix | Still Intact? |
|---------|-----------------|--------|---------------|
| SESS-001 | Mock data fallback in participants/[participantId] | M1: Removed mock, wrapped with apiHandler | ✅ Verified — no mock data, route uses apiHandler({ auth: 'user' }) |
| SESS-002 | Missing Zod validation on join/rejoin/create | M2: Added Zod schemas | ✅ Verified — join has sessionCode/displayName/avatarUrl Zod, rejoin has UUID Zod |
| SESS-003 | Unwrapped admin routes (participants/[participantId]) | M1: Wrapped with apiHandler + auth + rate limit | ✅ Verified — apiHandler({ auth: 'user' }) |
| SESS-005 | Export endpoint no rate limiting | M1: Added rate limit | ✅ Verified — apiHandler wraps export route |
| SESS-007 | Rejoin allows draft status | M3: Block draft in rejoin | ✅ Verified — rejoin rejects draft/ended/cancelled/archived |

### Known Deferred P2/P3 (Still Present)

| ID | Finding | Still Present? | Notes |
|----|---------|---------------|-------|
| SESS-004 | Dual broadcast in control route | ✅ Present | Sends to both `play:` (via command pipeline) and `session:` (direct channel.send). Deferred post-launch. |
| SESS-006 | N+1 queries in history/analytics | ✅ Present | Performance backlog |
| SESS-010 | Board/lobby code-only auth | ✅ Present | Documented design tradeoff — classroom projector use case |
| SESS-011 | Dual-channel play: + session: | ✅ Present | Post-launch unification |
| SESS-012 | Token in localStorage | ✅ Present | Post-launch hardening |
| SESS-013 | setNextStarter race condition | ✅ Present | Post-launch fix |

**No regressions detected.** All L1 fixes are intact. No existing fixes have been undone.

---

## 7. Findings

### L2-SESS-001 — `game/` route bypasses apiHandler with complex inline auth (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — no data leak, but missing standardized protections) |
| **Type** | Systemic pattern (non-apiHandler route) |
| **File** | `app/api/play/sessions/[id]/game/route.ts` |
| **Evidence** | Route exports raw `async function GET()` — not wrapped with `apiHandler`. Implements triple auth inline: (1) host via RLS `getUser()` + `host_user_id` match, (2) system_admin via `users.global_role === 'system_admin'` (non-canonical, see L2-AUTH-003), (3) participant via `x-participant-token` + `REJECTED_PARTICIPANT_STATUSES` + expiry check. |
| **Impact** | Missing: rate limiting, standardized error format, request ID tracing. The inline `users.global_role` check bypasses canonical `deriveEffectiveGlobalRole()` (cross-ref L2-AUTH-003). Functionally correct — auth logic is present and validates all three paths. |
| **Recommendation** | Wrap with `apiHandler({ auth: 'public' })` and use `resolveSessionViewer()` internally for dual-path auth. Replace inline `global_role` check with canonical role derivation. |
| **Mitigated by** | Auth IS present (just inline). No mutable operations — read-only endpoint. Participant response is sanitized (host-only fields stripped). |

### L2-SESS-002 — `overrides/` route bypasses apiHandler with inline auth (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — same category as L2-SESS-001) |
| **Type** | Systemic pattern (non-apiHandler route) |
| **File** | `app/api/play/sessions/[id]/overrides/route.ts` |
| **Evidence** | Route exports raw `async function GET/PATCH()`. Auth via inline `getUser()` + `getSessionAndAssertHost()` helper. Manual type-checking in `sanitizeOverrides()` instead of Zod schema. |
| **Impact** | Missing: rate limiting, standardized error format, request ID tracing, Zod input validation. The `sanitizeOverrides()` function does manual type checking that is functionally equivalent to a Zod schema but harder to audit. |
| **Recommendation** | Wrap with `apiHandler({ auth: 'user' })`, add Zod schema for override payloads, use inline host check in handler. |
| **Mitigated by** | Auth IS present (inline host check). Host-only endpoint. `sanitizeOverrides()` is conservative (strips unknown fields, type-checks each property). |

### L2-SESS-003 — Inline `users.global_role` admin bypass in 3 routes (P2)

| Field | Value |
|-------|-------|
| **Severity** | P2 (medium — role derivation inconsistency) |
| **Type** | Systemic pattern (cross-ref L2-AUTH-003) |
| **Files** | `play/sessions/[id]/command/route.ts`, `play/sessions/[id]/state/route.ts`, `play/sessions/[id]/game/route.ts` |
| **Evidence** | These routes query `users.global_role` directly to check for system_admin, bypassing the canonical `deriveEffectiveGlobalRole()` which checks 6 priority sources. Pattern: `const { data: userData } = await supabase.from('users').select('global_role')...` → `if (userData?.global_role === 'system_admin')`. |
| **Impact** | If a user's admin role is set in `app_metadata.role` or `user_metadata.global_role` but NOT in the `users.global_role` DB column, they will not be recognized as admin. In practice, roles are synced across all sources during user setup, so this is theoretical. |
| **Recommendation** | Replace inline `users.global_role` checks with `requireSessionHost()` from auth-guard (which has system_admin bypass via canonical role derivation). |
| **Mitigated by** | Role sync during user setup ensures `users.global_role` is always set for admins. The host check (which is the primary auth gate) already works correctly. |

### L2-SESS-004 — Legacy PATCH on sessions/[id] defeats idempotency (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (low — legacy endpoint, limited usage) |
| **Type** | Local bug |
| **File** | `app/api/play/sessions/[id]/route.ts` |
| **Evidence** | `clientSeq: Date.now()` — uses current timestamp as sequence number. Since `Date.now()` returns a different value on each call, every retry creates a new command record instead of being detected as a duplicate. The command pipeline's idempotency check (`client_id + client_seq`) is defeated. |
| **Impact** | Low — this is the legacy update path. Modern clients use the `/command` endpoint with proper `client_id` + `client_seq`. Each retry would re-execute the mutation, but the atomic WHERE guard prevents invalid status transitions. Runtime mutations (set_step, set_phase) would be re-applied but are idempotent in effect (setting the same value). |
| **Recommendation** | Have legacy callers pass a stable `client_seq` or add client-side deduplication. Low priority — will be resolved by migrating all callers to `/command` endpoint. |

### L2-SESS-005 — setNextStarter N+1 queries (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (low — performance only) |
| **Type** | Local bug |
| **File** | `app/api/play/sessions/[id]/participants/[participantId]/route.ts` |
| **Evidence** | `setNextStarter` action loops all participants and updates each individually in a separate query. For N participants, this issues N UPDATE queries. |
| **Impact** | Performance only. Participant counts are typically < 30. Each update is a simple indexed query. No data integrity issue. |
| **Recommendation** | Batch into a single `UPDATE participants SET is_next_starter = (id = :targetId) WHERE session_id = :sessionId`. |
| **Mitigated by** | Small participant counts, fast indexed queries. |

### L2-SESS-006 — Deprecated routes have zero auth (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (informational — deprecated, returns 410) |
| **Type** | Dead code path |
| **Files** | `play/sessions/[id]/artifacts/snapshot/route.ts`, `participants/[participantId]/actions/route.ts`, `sessions/[sessionId]/actions/route.ts`, `play/sessions/[id]/triggers/` POST |
| **Evidence** | These routes return 410 Gone immediately, but have no apiHandler wrapper, no auth, and no rate limiting. The deprecated trigger POST route has `apiHandler({ auth: 'public' })` and returns 410, which is correctly wrapped. |
| **Impact** | None — all return 410 before any data access. |
| **Recommendation** | Remove deprecated routes entirely, or wrap with `apiHandler({ auth: 'public' })` + rate limit for defense-in-depth. Low priority. |

### L2-SESS-007 — Heartbeat uses auth: 'public' with inline token validation (P3)

| Field | Value |
|-------|-------|
| **Severity** | P3 (informational — correctly implemented) |
| **Type** | Product decision (architectural note) |
| **File** | `app/api/play/heartbeat/route.ts` |
| **Evidence** | Uses `apiHandler({ auth: 'public', rateLimit: 'api' })` but performs full participant token validation inline, including REJECTED status check and token expiry. This is functionally equivalent to `auth: 'participant'` but with custom error handling. |
| **Impact** | None — behavior is correct. The inline validation replicates what `resolveParticipant()` does. |
| **Recommendation** | Consider migrating to `auth: 'participant'` for consistency. The current inline pattern works but means heartbeat error responses differ slightly from other participant-auth routes. Not urgent. |

---

## 8. Summary

### Verdict: **PASS (launch-safe)**

The Play / Session Authoring Chain is the largest domain in Lekbanken (68 API routes, 215+ files) and serves as the core runtime system. This L2 audit found:

- **0 P0** — No critical security or data integrity issues
- **0 P1** — No high-priority issues requiring pre-launch fix
- **3 P2** — Two routes bypass `apiHandler` (missing rate limits/standardized errors), three routes use non-canonical admin bypass. All are functionally correct but diverge from the standard pattern.
- **4 P3** — Legacy idempotency quirk, N+1 queries, deprecated dead code, architecture note

### Strengths

1. **Command pipeline** — Well-designed with idempotency, atomic TOCTOU guard, and clean state machine
2. **Participant token security** — UUID v4 (122 bits), proper status/expiry checks at every entry point
3. **Rejection propagation** — Kicked/blocked participants are consistently rejected across all API surfaces
4. **Broadcast architecture** — Atomic sequence counter, best-effort semantics, correct failure isolation
5. **Session guards** — 18 mutation types properly mapped to allowed statuses
6. **L1 remediations intact** — All 5 previously fixed findings verified still in place

### Known Debt (Post-Launch)

| ID | Finding | Priority |
|----|---------|----------|
| SESS-004 | Dual broadcast in control route | P2 |
| SESS-010 | Board/lobby code-only auth | P2 (design tradeoff) |
| L2-SESS-001 | game/ route no apiHandler | P2 |
| L2-SESS-002 | overrides/ route no apiHandler | P2 |
| L2-SESS-003 | Inline global_role checks | P2 |

### Cross-References

| Finding | Related To |
|---------|-----------|
| L2-SESS-003 | L2-AUTH-003 (inline app_metadata/global_role checks) |
| L2-SESS-001, L2-SESS-002 | GAME-012 P3 (game display routes without apiHandler) |
| L2-AUTH-001 | sessionHost auth mode no-op (P3) — confirmed still present |
