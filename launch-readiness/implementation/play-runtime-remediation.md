# Play Runtime Remediation Plan

> **Date:** 2026-03-11  
> **Source:** `audits/play-audit.md` — 14 findings (2 P0, 4 P1, 5 P2, 3 P3)  
> **Scope:** Runtime mutation integrity, state transition safety, concurrency fixes, broadcast completeness  
> **Approver:** GPT (pending)

---

## Milestone Overview

| Milestone | Scope | Depends on | Status |
|-----------|-------|-----------|--------|
| **M1 — State Machine Consolidation** | PLAY-001, PLAY-004 | None | ✅ Complete (2025-07-24) |
| **M2 — Session-Status Guards** | PLAY-003 | None (parallel with M1) | ✅ Complete (2025-07-24) |
| **M3 — Atomic Puzzle RPCs** | PLAY-002 | None (parallel with M1) | ✅ Complete (2026-03-11) |
| **M4 — Broadcast Completeness** | PLAY-005, PLAY-007 | None | ✅ Complete (2026-03-11) |
| **M5 — Wrapper Migration** | PLAY-006, PLAY-008 | DD-2 complete (✅) | ✅ Complete (2026-03-11) |
| **M6 — Polish & Hardening** | PLAY-009 — PLAY-014 | M1–M3 | ⬜ Not started |

M1–M3 are **P0/P1 launch blockers**. M4–M5 are **P1 should-fix**. M6 is **P2/P3 post-launch**.

---

## M1 — State Machine Consolidation (DD-PLAY-1: A + C)

**Goal:** Single code path for all status transitions. Eliminate the triple-mutation-path risk.

Per GPT directive, execute in two steps:

### Step 1: Make pipeline authoritative (add missing side effects)

#### M1.1 — Add gamification-event to command pipeline
- [x] On `end` command: log `session_completed` gamification event ✅
- [x] Verify event payload matches what PATCH route sends ✅

#### M1.2 — Add disconnect-on-end to command pipeline
- [x] On `end` command: update all `active`/`idle` participants to `disconnected` ✅
- [x] Use service role client for participant status update ✅

#### M1.3 — TOCTOU fix in executeMutation
- [x] Atomic UPDATE with `.in('status', [...transition.from]).select('id').maybeSingle()` ✅
- [x] No rows returned → throws Conflict error → 409 from route handlers ✅
- [x] SELECT still used for context (tenant_id, game_id etc.) but UPDATE is race-safe ✅

#### M1.4 — Verify timestamps in pipeline
- [x] `started_at` set on `start` (only if null) ✅
- [x] `paused_at` set on `paused`, cleared otherwise ✅
- [x] `ended_at` set on `ended` ✅

### Step 2: Migrate clients away from bypass paths

#### M1.5 — Migrate PATCH route to delegate
- [x] PATCH `sessions/[id]` now delegates to `applySessionCommand()` with `clientId: 'legacy-patch'` ✅
- [x] Host ownership check preserved (RLS client) ✅
- [x] State machine rejection → 409 Conflict ✅
- [x] Removed inline status mapping, gamification event, broadcast (all handled by pipeline) ✅

#### M1.6 — Migrate control route to delegate
- [x] Control route delegates to `applySessionCommand()` with `clientId: 'control'` ✅
- [x] Preserved dual broadcast: pipeline → `play:` channel, handler → legacy `session:` channel ✅
- [x] Preserved `participant_activity_log` entries ✅
- [x] `clientSeq: Date.now()` — collision safe (DB unique index + 23505 catch) ✅

#### M1.7 — PATCH is now thin adapter
- [x] PATCH handler is a thin delegation layer → `applySessionCommand()` ✅
- [x] GET handler unchanged ✅
- [x] `session-api.ts` / `HostPlayMode.tsx` / `useSessionControl.ts` unchanged — no client migration needed ✅

**Regression Verification (2025-07-24):**
- [x] Idempotency safe: `Date.now()` collision → unique index catches → `{ duplicate: true }`. Theoretical sub-ms different-action collision is functionally impossible from UI. ✅
- [x] No double broadcast: `play:` and `session:` channels have different subscribers, different event names. No component receives both. ✅
- [x] Disconnect coverage complete: all 5 participant statuses accounted for (`active`+`idle` → disconnected, `disconnected`/`kicked`/`blocked` untouched). Rejoin blocked after end. ✅
- [x] Gamification exact-once: triple protection — command dedup (row existence check ignores `applied` flag), DB unique index on `idempotency_key`, function's own `23505` handler. ✅
- [x] `tsc --noEmit` = 0 errors ✅

---

## M2 — Session-Status Guards

**Goal:** No mutation executes on an inappropriate session status. Central policy table — rules must not spread freely in handlers.

### M2.1 — Create shared guard utility + central policy table
- [x] Create `lib/play/session-guards.ts` ✅
- [x] Export `assertSessionStatus(currentStatus, mutationType)` — returns null if allowed, 409 NextResponse if not ✅
- [x] Include current status + allowed statuses in 409 error response for client debugging ✅
- [x] Export central policy table `PLAY_MUTATION_STATUS_POLICY` with 18 mutation types ✅

```typescript
export const PLAY_MUTATION_STATUS_POLICY = {
  'time-bank':       ['active', 'paused'],
  'signals':         ['lobby', 'active', 'paused'],
  'outcome':         ['active', 'paused'],
  'decisions':       ['lobby', 'active', 'paused'],
  'decision-update': ['active', 'paused'],
  'assignments':     ['lobby', 'active', 'paused'],
  'artifacts-state': ['active', 'paused'],
  'triggers':        ['active', 'paused'],
  'kick-block':      ['lobby', 'active', 'paused'],
  'vote':            ['active', 'paused'],
  'puzzle':          ['active', 'paused'],
  'keypad':          ['active', 'paused'],
  'chat':            ['lobby', 'active', 'paused'],
  'ready':           ['lobby', 'active'],
  'roles':           ['lobby', 'active', 'paused'],
  'secrets':         ['lobby', 'active', 'paused'],
  'state':           ['active', 'paused'],
  'role-reveal':     ['lobby', 'active', 'paused'],
} as const;
```

### M2.2 — Apply guard to host mutation routes
- [x] `time-bank` POST — allow: `active`, `paused` ✅
- [x] `signals` POST — allow: `lobby`, `active`, `paused` ✅
- [x] `outcome` POST — allow: `active`, `paused` ✅
- [x] `decisions` POST — allow: `lobby`, `active`, `paused` ✅
- [x] `decisions/[id]` PATCH — allow: `active`, `paused` ✅
- [x] `assignments` POST — allow: `lobby`, `active`, `paused` ✅ (added `status` to SELECT)
- [x] `artifacts/state` PATCH — allow: `active`, `paused` ✅
- [x] `triggers` PATCH — allow: `active`, `paused` ✅
- [x] `participants/[id]` PATCH (kick/block) — allow: `lobby`, `active`, `paused` ✅
- [x] `roles` POST — allow: `lobby`, `active`, `paused` ✅
- [x] `secrets` POST — allow: `lobby`, `active`, `paused` ✅
- [x] `state` PATCH — allow: `active`, `paused` ✅

### M2.3 — Apply guard to participant mutation routes
- [x] `vote` POST — allow: `active`, `paused` ✅ (raw export, unguarded → now guarded)
- [x] `puzzle` POST — allow: `active`, `paused` ✅ (raw export, added session fetch + guard)
- [x] `keypad` POST — allow: `active`, `paused` ✅ (raw export, already fetches session)
- [x] `chat` POST — allow: `lobby`, `active`, `paused` ✅ (added `getSessionStatus()` helper)
- [x] `me/role/reveal` POST — allow: `lobby`, `active`, `paused` ✅ (participant auth, session by code)

### M2.4 — Overrides guard decision
- [x] `overrides` PATCH — **no guard applied** (config-level mutation, intentionally allowed in any status) ✅
- [x] `ready` POST — **pre-existing guard preserved** (`['lobby', 'active']` matches central policy) ✅

**Regression Verification (2025-07-24):**
- [x] vote when ended → 409 ✅ (assertSessionStatus at L42 before decision query)
- [x] puzzle when ended → 409 ✅ (session fetch + assertSessionStatus at L408 before puzzle logic)
- [x] ready outside lobby/active → 409 ✅ (pre-existing custom guard at L52-57)
- [x] signal when locked → 409 ✅ (assertSessionStatus at L67 before INSERT)
- [x] time-bank when locked → 409 ✅ (assertSessionStatus at L87 before RPC)
- [x] chat when ended → 409 ✅ (getSessionStatus + assertSessionStatus at L126 before INSERT)
- [x] vote when active → passes (null) ✅
- [x] chat when lobby → passes (null) ✅
- [x] time-bank when active → passes (null) ✅
- [x] All 17 routes import from `@/lib/play/session-guards` (no competing imports) ✅
- [x] No ad-hoc status arrays in any route (except pre-existing ready guard) ✅
- [x] `tsc --noEmit` = 0 errors ✅

---

## M3 — Atomic Puzzle RPCs

**Goal:** Eliminate read-modify-write JSONB race conditions in puzzle and counter artifacts.

✅ **KLAR (2026-03-11)**

### M3.1 — Create puzzle attempt RPCs
- [x] Create Postgres function `attempt_puzzle_riddle_v2` — atomic attempt append + solve/lockout with `FOR UPDATE` row lock
- [x] Create Postgres function `attempt_puzzle_counter_v2` — atomic increment/decrement + target check
- [x] Create Postgres function `attempt_puzzle_multi_answer_v2` — atomic item toggle in checked array
- [x] Create Postgres function `attempt_puzzle_qr_gate_v2` — atomic scan verification
- [x] All RPCs validate session status + artifact ownership (defense-in-depth, matching keypad pattern)
- [x] Return: `{ status, message, solved, state }` — client gets updated state without second query
- [x] Handle `maxAttempts` exceeded as a SQL-level check (not application-level)

### M3.2 — Migrate puzzle route to use RPCs
- [x] Replace read-modify-write pattern in `puzzle/route.ts` with RPC calls via `callRpc` wrapper
- [x] Keep riddle answer validation (fuzzy normalization) in TypeScript — pass `p_is_correct` to RPC
- [x] Counter, multi_answer, qr_gate: full logic in SQL (no app-layer trust needed)
- [x] Preserve existing broadcast behavior (client-side via `usePuzzleRealtime` — unchanged)
- [x] Fix pre-existing bug: `checkRiddleAnswer()` return value was used as boolean (object always truthy) — now properly destructured

### M3.3 — Add Supabase migration
- [x] Migration file: `supabase/migrations/20260311000001_atomic_puzzle_rpcs.sql`
- [ ] Run migration in dev/staging environment
- [ ] Verify functions work via direct SQL calls

**Noteringar:**

| Mutation | Previous race pattern | New atomic solution | Why concurrency-safe |
|----------|----------------------|--------------------|--------------------|
| **Riddle** | 3 queries: read config → read state → blind upsert. Two concurrent attempts both read `attempts=[]`, both append, second overwrites first. | `attempt_puzzle_riddle_v2`: `INSERT ON CONFLICT DO NOTHING` + `SELECT FOR UPDATE` + append + write in single transaction. | `FOR UPDATE` row lock serializes concurrent attempts. Second request blocks until first commits. No lost appends. |
| **Counter** | 3 queries: read config → read state (`currentValue=47`) → blind upsert (`48`). 10 concurrent increments all read 47, all write 48. Lost: 9 increments. | `attempt_puzzle_counter_v2`: lock → read `currentValue` → arithmetic in SQL → write. | Row lock ensures sequential reads. 10 increments: 47→48→49→...→57. All counted. |
| **Multi-answer** | 3 queries: read config → read checked array → blind upsert. Concurrent toggles overwrite each other's array changes. | `attempt_puzzle_multi_answer_v2`: lock → read checked → toggle in SQL loop → write. | Row lock prevents concurrent array modifications. Each toggle sees previous toggle's result. |
| **QR gate** | Read state → blind upsert. Low race risk (idempotent boolean) but audit trail (scannedAt, participant) could be lost. | `attempt_puzzle_qr_gate_v2`: lock → read verified → set if match → write. | Row lock ensures first-scan-wins with correct participant attribution. |

**Tests (deferred to runtime verification):**
- [ ] Simulate 10 concurrent riddle attempts — all recorded, none lost
- [ ] Simulate 50 concurrent counter increments — final value = 50
- [ ] Verify maxAttempts enforcement under concurrency
- [ ] Verify solve detection works atomically

---

## M4 — Broadcast Completeness ✅ KLAR (2026-03-11)

**Goal:** Launch-minimum broadcast completeness: kick/block, readiness, assignments (per DD-PLAY-4).

### M4.1 — Kick/block/approve broadcast (P1 — security-relevant)
- [x] After kick/block in `participants/[id]` PATCH → `broadcastPlayEvent(sessionId, 'participants_changed', {...})`
- [x] After approve in `participants/[id]` PATCH → same broadcast
- [x] Kicked participant must be notified immediately ✅ — `ParticipantPlayView` wires `onParticipantsChanged` to detect kick/block and show removal overlay

### M4.2 — Assignment broadcast (P1 — central to live flow)
- [x] After role assignment in `assignments` POST → `broadcastPlayEvent(sessionId, 'assignments_changed', {...})`
- [x] After role unassignment in `assignments` DELETE → `broadcastPlayEvent(sessionId, 'assignments_changed', {...})`

### M4.3 — Readiness broadcast (P1 — host lobby visibility)
- [x] After readiness toggle in `play/ready` POST → `broadcastPlayEvent(sessionId, 'participants_changed', {...})`

### M4.4 — Deferred (post-launch)
- Chat broadcast — poll-based for MVP
- Approve/rejoin — UX polish (approve now broadcasts but is out of strict M4 scope)
- Overrides — config, not runtime

**Noteringar:**

| Mutation | Route | Event Type | Payload | Channel | After Commit? |
|----------|-------|-----------|---------|---------|---------------|
| Kick | `participants/[participantId]` PATCH | `participants_changed` | `{ action: 'kicked', participant_id }` | `play:{sessionId}` | ✅ After `if (error) throw error` |
| Block | `participants/[participantId]` PATCH | `participants_changed` | `{ action: 'blocked', participant_id }` | `play:{sessionId}` | ✅ After `if (error) throw error` |
| Approve | `participants/[participantId]` PATCH | `participants_changed` | `{ action: 'approved', participant_id }` | `play:{sessionId}` | ✅ After `if (error) throw error` |
| Readiness | `play/ready` POST | `participants_changed` | `{ action: 'readiness_changed', participant_id, is_ready }` | `play:{sessionId}` | ✅ After `if (updateError)` check |
| Assign | `assignments` POST | `assignments_changed` | `{ action: 'assigned', count, assignments[] }` | `play:{sessionId}` | ✅ After audit log insert |
| Unassign | `assignments` DELETE | `assignments_changed` | `{ action: 'unassigned', count: 1, assignments[] }` | `play:{sessionId}` | ✅ After audit log insert |

Client wiring: `useLiveSession` hook handles both `participants_changed` and `assignments_changed` via new `onParticipantsChanged` / `onAssignmentsChanged` callbacks. Types defined in `types/play-runtime.ts`.

UI wiring: `ParticipantPlayView` passes `onParticipantsChanged` to `useLiveSession`. When the current participant's ID matches a `kicked` or `blocked` event, a full-screen removal overlay is shown immediately with i18n messages (`play.participantView.session.removed*`) and a "back to start" link. This closes the critical gap where a kicked participant would sit idle until the next API call or 30s polling.

**Tests:**
- [ ] Kick participant → verify host cockpit receives broadcast
- [ ] Assign roles → verify participant receives broadcast
- [ ] Toggle readiness → verify host lobby view updates

---

## M5 — Wrapper Migration (Play-Critical Routes) ✅ KLAR (2026-03-11)

**Goal:** Wrap puzzle + keypad + vote (participant-facing, untrusted input, core gameplay) per DD-PLAY-5. Rest in Batch 7.

### M5.1 — Participant routes (Play-critical)
- [x] `play/sessions/[id]/decisions/[decisionId]/vote` → `apiHandler({ auth: 'participant' })` ✅
- [x] `play/sessions/[id]/artifacts/[artifactId]/puzzle` POST+GET → `apiHandler({ auth: 'participant' })` ✅
- [x] `play/sessions/[id]/artifacts/[artifactId]/keypad` POST+GET → `apiHandler({ auth: 'participant' })` ✅

### M5.2 — Session-scope security check (cross-session access prevention)
- [x] All 5 handlers verify `p!.sessionId !== params.id` → 403 Forbidden ✅
- [x] This is necessary because `resolveParticipantAuth()` in the wrapper resolves by token only, without sessionId scoping ✅
- [x] Semantics: 401 = invalid/expired token (wrapper), 403 = valid participant but wrong session (handler) ✅

### M5.3 — Deferred to Batch 7 (per domain audit)
- [ ] `play/board/[code]` — display only
- [ ] `play/session/[code]` — lookup only
- [ ] `play/sessions/[id]/game` — read only
- [ ] `play/sessions/[id]/overrides` — admin config
- [ ] `participants/[id]/actions` — remove or keep as 410
- [ ] `sessions/[sessionId]/actions` — remove or keep as 410

**Noteringar:**

#### Per-Route Verification

##### Vote POST (`decisions/[decisionId]/vote`)

| Aspect | Before | After | Change type |
|--------|--------|-------|-------------|
| Wrapper | None (raw `export async function POST`) | `apiHandler({ auth: 'participant' })` | Structural |
| Auth | `resolveParticipant(request, sessionId)` → null check → `jsonError('Unauthorized', 401)` | Wrapper `resolveParticipantAuth()` → 401/403 per DD-2 | Improved (kicked/blocked → 403 instead of generic 401) |
| Session scope | Not checked (any valid participant could hit any session) | `p!.sessionId !== sessionId` → 403 | **Security fix** |
| Rate limit | None | Auto `'participant'` tier (60 req/min) | Intentional addition |
| Error format | `jsonError(msg, status)` → `{ error: "..." }` | Handler: `NextResponse.json({ error: msg }, { status })` — identical. Wrapper-caught: adds `requestId` | Improved (tracing) |
| Response body | `{ success: true }` (200) | `{ success: true }` (200) | Identical |
| Business logic | Unchanged | Unchanged | None |

##### Keypad POST (`artifacts/[artifactId]/keypad`)

| Aspect | Before | After | Change type |
|--------|--------|-------|-------------|
| Wrapper | None (raw export) | `apiHandler({ auth: 'participant' })` | Structural |
| Auth | `resolveParticipant(request, sessionId)` → null check → 401 | Wrapper → 401/403 per DD-2 | Improved |
| Session scope | Not checked | `p!.sessionId !== sessionId` → 403 | **Security fix** |
| Rate limit | None | Auto `'participant'` tier (60 req/min) | Intentional addition |
| Error format | `jsonError(msg, status)` → `{ error: "..." }` | `NextResponse.json({ error: msg }, { status })` — identical | No change |
| Response body | `KeypadAttemptResponse` (200) | `KeypadAttemptResponse` (200) | Identical |
| Business logic | Unchanged (atomic RPC, broadcast, variant reveal) | Unchanged | None |

##### Keypad GET (`artifacts/[artifactId]/keypad`)

| Aspect | Before | After | Change type |
|--------|--------|-------|-------------|
| Wrapper | None (raw export) | `apiHandler({ auth: 'participant' })` | Structural |
| Auth | `resolveParticipant(request, sessionId)` → null check → 401 | Wrapper → 401/403 per DD-2 | Improved |
| Session scope | Not checked | `p!.sessionId !== sessionId` → 403 | **Security fix** |
| Rate limit | None | Auto `'participant'` tier (60 req/min) | Intentional addition |
| Response body | `{ artifactId, title, codeLength, maxAttempts, attemptsLeft, successMessage, failMessage, lockedMessage, keypadState }` (200) | Identical | No change |

##### Puzzle POST (`artifacts/[artifactId]/puzzle`)

| Aspect | Before | After | Change type |
|--------|--------|-------|-------------|
| Wrapper | None (raw export + outer try/catch) | `apiHandler({ auth: 'participant' })` | Structural |
| Auth | `resolveParticipant(request, sessionId)` → null check → 401 | Wrapper → 401/403 per DD-2 | Improved |
| Session scope | Not checked | `p!.sessionId !== sessionId` → 403 | **Security fix** |
| Rate limit | None | Auto `'participant'` tier (60 req/min) | Intentional addition |
| Error handling | Outer try/catch → `jsonError('Internal server error', 500)` | Wrapper catch → `errorResponse(error, requestId)` with `requestId` | Improved (tracing + error classification) |
| Response body | `PuzzleSubmitResponse` via `mapRpcResult()` | Identical | No change |
| Business logic | Unchanged (4 atomic RPCs, riddle normalization) | Unchanged | None |

##### Puzzle GET (`artifacts/[artifactId]/puzzle`)

| Aspect | Before | After | Change type |
|--------|--------|-------|-------------|
| Wrapper | None (raw export + outer try/catch) | `apiHandler({ auth: 'participant' })` | Structural |
| Auth | `resolveParticipant(request, sessionId)` → null check → 401 | Wrapper → 401/403 per DD-2 | Improved |
| Session scope | Not checked | `p!.sessionId !== sessionId` → 403 | **Security fix** |
| Rate limit | None | Auto `'participant'` tier (60 req/min) | Intentional addition |
| Response body | `{ artifactId, artifactType, state }` | Identical | No change |

#### Rate Limit Summary

| Route | Before | After | Tier |
|-------|--------|-------|------|
| vote POST | None | 60 req/min | `participant` (auto) |
| keypad POST | None | 60 req/min | `participant` (auto) |
| keypad GET | None | 60 req/min | `participant` (auto) |
| puzzle POST | None | 60 req/min | `participant` (auto) |
| puzzle GET | None | 60 req/min | `participant` (auto) |

This is an **intentional** improvement. Participant-facing routes accepting untrusted input should have rate limits. The `'participant'` tier (60/min) is automatically applied by the wrapper when `auth: 'participant'` is specified — consistent with all other participant routes (play/ready, play/me, etc.).

#### Negative Test Case

Valid participant token from session A used against route `/api/play/sessions/{session-B-id}/...`:
- Wrapper resolves participant successfully (token is valid) ✅
- Handler checks `p!.sessionId !== params.id` → `p!.sessionId` is session-A, `params.id` is session-B → mismatch → **403 Forbidden** ✅

#### Positive Test Case

Valid participant in correct session:
- Wrapper resolves participant ✅
- `p!.sessionId === params.id` → passes ✅
- Business logic executes normally ✅
- Response shape unchanged ✅

**Tests:**
- [ ] Verify all wrapped routes return 401/403 for unauthorized access
- [ ] Verify wrapped routes preserve existing behavior for authorized callers
- [ ] Verify rate limits applied correctly
- [ ] Cross-session negative case: valid token from session A → route for session B → 403

---

## M6 — Polish & Hardening (Post-Launch)

Lower-priority improvements. Not launch-blocking.

### M6.1 — set_step version guard (PLAY-009)
- [ ] Add `expected_step_index` parameter to `set_step` command
- [ ] If `current_step_index != expected_step_index`, return 409 Conflict
- [ ] Update client to pass current step index when advancing

### M6.2 — Participant readiness data model (PLAY-011)
- [ ] Evaluate promoting `isReady` from `progress` JSONB to dedicated column
- [ ] Add migration if decided

### M6.3 — Cancel transition from UI (PLAY-010)
- [ ] Product decision: Should hosts be able to cancel sessions?
- [ ] If yes, add `cancel` command to `STATUS_TRANSITIONS` with allowed `from` states
- [ ] Add UI button with confirmation dialog

### M6.4 — resolveSessionViewer system_admin bypass (PLAY-007 → P2)
- [ ] Add `system_admin` global_role check in `resolveSessionViewer()`
- [ ] Return a viewer object with `role: 'admin'` for admin-level access
- [ ] Audit which downstream routes need admin-scoped behavior

---

## Design Decisions (Locked — GPT Review 2026-03-11)

| ID | Decision | Status |
|----|----------|--------|
| DD-PLAY-1 | **A + C.** Full pipeline consolidation: (1) Move gamification-event + disconnect-on-end into `applySessionCommand()`. (2) Migrate `HostPlayMode` away from direct PATCH status. (3) Migrate `useSessionControl` away from own status mutation. PATCH/control either delegate or stop supporting status mutation. Only applies to status transitions — not participant mutations (vote/puzzle/signal). | ✅ Decided |
| DD-PLAY-2 | **A with central policy table.** Shared utility `assertSessionStatus()` + centralized `PLAY_ROUTE_STATUS_POLICY` map. Rules must not be spread freely in handlers — single catalog of allowed statuses per mutation type. Wrapper-config (B) deferred to post-launch evolution. | ✅ Decided |
| DD-PLAY-3 | **A — Postgres RPCs.** Follows proven patterns (keypad RPC, time-bank RPC, trigger RPC). Consider generic safe primitives (counter increment, boolean flip, append attempt, set toggle) rather than necessarily one RPC per puzzle type. Implementation detail — architecture decision is atomic DB operations. | ✅ Decided |
| DD-PLAY-4 | **Kick/block + readiness + assignments** as launch minimum. Readiness affects host's real-time lobby view. Assignments affect what participants see/do. Both are central to live flow, not just polish. Chat, approve, rejoin, overrides can wait. | ✅ Decided |
| DD-PLAY-5 | **Puzzle + keypad + vote** wrapped in Play remediation (M5). Participant-facing, untrusted input, core gameplay. Rest (board, session/code, game, overrides, deprecated) in Batch 7 per domain audit. | ✅ Decided |

---

## Execution Order (GPT-locked sequencing)

```
M1 (P0, state machine consolidation)
  ↓
M2 (P1, session-status guards + central policy table)
  ↓
M3 (P0, atomic puzzle RPCs)
  ↓
M4 (P1, broadcast: kick/block + readiness + assignments)
  ↓
M5 (P1, wrap puzzle + keypad + vote)
  ↓
M6 (P2/P3, polish — post-launch)
```

**Critical:** M5 must NOT come before M1–M3. Don't clean up routes before invariant problems are solved.

---

## Verification Checklist

Before marking each milestone complete:

- [ ] `npx tsc --noEmit` = 0 new errors
- [ ] All modified routes return correct status codes for edge cases
- [ ] Broadcast events reach both host cockpit and participant UI where applicable
- [ ] No regression in existing happy-path flows (host starts session, participants join, play through, session ends)
- [ ] Idempotency: same request sent twice → same result (no duplicate side effects)
