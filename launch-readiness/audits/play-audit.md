# Play Runtime Audit

> **Domain:** Play / Run (#6 in audit queue)  
> **Status:** ✅ Complete  
> **Date:** 2026-03-11  
> **Scope:** Runtime mutation integrity, state transition coverage, concurrency, authoritative source mapping  
> **Files examined:** ~70 route files, ~95 handlers, 4 service/lib files, 15+ types files, broadcast infrastructure  
> **Context:** DD-2 participant auth is complete (Batch 6). Auth layer is stable. Focus is now semantic/runtime integrity.

---

## Executive Summary

The Play system has **strong foundations** — a well-designed command pipeline (MS11), atomic broadcast sequencing, proper artifact V2 architecture, and safe vote/time-bank patterns. However, it suffers from **three systemic issues** that create real risk for live sessions:

1. **Triple status mutation path** — three independent endpoints write `participant_sessions.status`, only one enforces the state machine
2. **Missing session-status guards** — 13 of 15 mutation routes perform no session-status check, allowing mutations on ended/draft sessions
3. **JSONB read-modify-write races** — puzzle and counter state can lose data under concurrent participant submissions

These are not theoretical — they manifest whenever a host has multiple tabs, when participants submit simultaneously, or when a session is in transition.

---

## Table of Contents

1. [Findings Summary](#1-findings-summary)
2. [Runtime Mutation Matrix](#2-runtime-mutation-matrix)
3. [State Transition Coverage](#3-state-transition-coverage)
4. [Concurrent Semantic Conflicts](#4-concurrent-semantic-conflicts)
5. [Authoritative Source Mapping](#5-authoritative-source-mapping)
6. [Broadcast Gap Analysis](#6-broadcast-gap-analysis)
7. [Auth & Wrapper Coverage](#7-auth--wrapper-coverage)
8. [Confirmed Findings](#8-confirmed-findings)
9. [Quick Wins](#9-quick-wins)
10. [Post-Launch Ideas](#10-post-launch-ideas)

---

## 1. Findings Summary

| Severity | Count | Description |
|----------|-------|-------------|
| **P0 — Launch blocker** | 2 | Triple status mutation path; JSONB puzzle race conditions |
| **P1 — Must fix** | 4 | Missing status guards (systemic); control route timestamp gaps; broadcast gaps on critical actions; unwrapped participant-facing routes |
| **P2 — Should fix** | 5 | Chat lacks broadcast; overrides route unwrapped; set_step last-write-wins; no cancel from UI; participant readiness in generic JSONB |
| **P3 — Nice to have** | 3 | Reducer centralization; event sourcing replay; timer sub-millisecond drift |

| ID | Finding | Severity | Category |
|----|---------|----------|----------|
| PLAY-001 | Triple status mutation path — 3 endpoints write session status, only 1 enforces state machine | P0 | State transitions |
| PLAY-002 | JSONB read-modify-write races — puzzle/counter state loses data under concurrency | P0 | Concurrency |
| PLAY-003 | Missing session-status guards — 13/15 mutation routes allow mutations on ended/draft sessions | P1 | State transitions |
| PLAY-004 | Control route missing timestamp fields — pause/end don't set `paused_at`/`ended_at` | P1 | State transitions |
| PLAY-005 | Broadcast gaps on critical host actions — kick/block/approve, assignments, readiness have no broadcast | P1 | Broadcast |
| PLAY-006 | Unwrapped participant-facing routes — vote, puzzle, keypad, board, session-code, game, overrides use raw exports | P1 | Auth/wrapper |
| PLAY-007 | Chat lacks realtime broadcast — clients must poll | P2 | Broadcast |
| PLAY-008 | Overrides route unwrapped — inline host-check, no `apiHandler` | P2 | Auth/wrapper |
| PLAY-009 | `set_step` last-write-wins with no version guard | P2 | Concurrency |
| PLAY-010 | No `cancel` action exposed in UI-facing routes — `cancelled` status only reachable via direct DB | P2 | State transitions |
| PLAY-011 | Participant readiness stored in generic `progress` JSONB bag | P2 | Data model |
| PLAY-012 | No centralized reducer/state machine — mutations spread across 15+ handlers | P3 | Architecture |
| PLAY-013 | Session events lack structured schema — fire-and-forget, no replay capability | P3 | Audit trail |
| PLAY-014 | Timer resume `started_at` adjustment has theoretical millisecond drift | P3 | Concurrency |

---

## 2. Runtime Mutation Matrix

Every mutation that modifies Play runtime state, catalogued with guards and behavior.

### 2.1 Status Transitions

| Route | Method | Actor | Status Guard | Idempotency | Audit Trail | Broadcast |
|-------|--------|-------|-------------|-------------|-------------|-----------|
| `play/sessions/[id]` | PATCH | Host | **NONE** — maps action→status without checking current | None | None | `play:` only |
| `play/sessions/[id]/command` | POST | Host | **FULL** — `STATUS_TRANSITIONS` map with `from` sets | `(client_id, client_seq)` unique constraint | `session_commands` table | `play:` only |
| `participants/.../control` | PATCH | Host | **PARTIAL** — per-action idempotency checks ("already paused") | None | `participant_activity_log` | Both `play:` + `session:` |

### 2.2 Runtime State Mutations

| Route | Method | Actor | Status Guard | Idempotency | DB Tables | Broadcast |
|-------|--------|-------|-------------|-------------|-----------|-----------|
| `sessions/[id]/state` | PATCH | Host | **NONE** | None | `participant_sessions` (step/phase/timer/board) | `play:` (state_change / timer_update / board_update) |
| `sessions/[id]/command` | POST | Host | **FULL** | `(client_id, client_seq)` | `session_commands` + `participant_sessions` | `play:` |

### 2.3 Participant-Facing Mutations

| Route | Method | Actor | Status Guard | Idempotency | DB Tables | Broadcast |
|-------|--------|-------|-------------|-------------|-----------|-----------|
| `play/ready` | POST | Participant | **YES** — lobby/active only | Natural (toggle) | `participants.progress` | **NONE** |
| `play/heartbeat` | POST | Participant | **NONE** | Natural (timestamp) | `participants` (last_seen_at, status) | **NONE** |
| `play/me/role/reveal` | POST | Participant | **NONE** | Idempotent (marks revealed_at) | `participant_role_assignments` | **NONE** |
| `decisions/.../vote` | POST | Participant | **NONE** (checks decision.status=open) | Upsert on `(decision_id, participant_id)` | `session_votes` | `play:` (decision_update) |
| `artifacts/.../puzzle` | POST | Participant | **NONE** | **NONE** — R-M-W race | `session_artifact_state` | `play:` (artifact_update, on solve) |
| `artifacts/.../keypad` | POST | Participant | **NONE** | **Atomic RPC** (`attempt_keypad_unlock_v2`) | `session_artifact_state` | `play:` (custom broadcast) |
| `progress/update` | POST | Participant | **NONE** | Upsert on `(participant_id, game_id)` | `participant_game_progress` | `session:` (progress_updated) |
| `sessions/join` | POST | Public | **YES** — blocks draft/locked/ended | None (creates new row) | `participants`, `participant_activity_log` | `session:` (participants_changed) |
| `sessions/rejoin` | POST | Public | **NONE** (checks participant status) | Natural (reactivation) | `participants` | **NONE** |

### 2.4 Host Feature Mutations

| Route | Method | Actor | Status Guard | Idempotency | DB Tables | Broadcast |
|-------|--------|-------|-------------|-------------|-----------|-----------|
| `sessions/[id]/time-bank` | POST | Host | **NONE** | **Atomic RPC** (`time_bank_apply_delta`) | `session_time_bank`, `session_time_bank_ledger` | `play:` (time_bank_changed) |
| `sessions/[id]/signals` | POST | Host/Participant | **NONE** | Rate limit only (1/sec/sender) | `session_signals`, `session_events` | `play:` (signal_received) |
| `sessions/[id]/outcome` | POST | Host | **NONE** | None | `session_outcomes` | `play:` (outcome_update) |
| `sessions/[id]/decisions` | POST | Host | **NONE** | None | `session_decisions` | `play:` (decision_update) |
| `sessions/[id]/decisions/[id]` | PATCH | Host | **NONE** (checks decision.status) | None | `session_decisions` | `play:` (decision_update) |
| `sessions/[id]/assignments` | POST | Host | **NONE** | Delete-then-insert | `participant_role_assignments`, `session_roles` | **NONE** |
| `sessions/[id]/secrets` | POST | Host | **NONE** | Business logic guards (409 conflicts) | `participant_sessions` | `play:` (state_change) |
| `sessions/[id]/artifacts/state` | PATCH | Host | **NONE** | Upsert (blind write) | `session_artifact_variant_state`, `session_artifact_variant_assignments_v2` | `play:` (artifact_update) |
| `sessions/[id]/chat` | POST | Host/Participant | **NONE** | None | `play_chat_messages` | **NONE** |
| `sessions/[id]/triggers` | PATCH | Host | **NONE** | **YES for fire** (`X-Idempotency-Key` + RPC) | `session_trigger_state` | `play:` (trigger_update) |
| `sessions/[id]/participants/[id]` | PATCH | Host | **PARTIAL** (setPosition only) | None | `participants` | `play:` (turn_update, setNextStarter only) |
| `sessions/[id]/overrides` | PATCH | Host | **NONE** | None | `participant_sessions.settings` | **NONE** |
| `sessions/[id]/roles` | POST | Host | **NONE** | None (RPC `snapshot_game_roles_to_session`) | `session_roles` | **NONE** |

---

## 3. State Transition Coverage

### 3.1 Defined State Machine (from `session-command.ts`)

```
draft ──publish──→ lobby ──start──→ active ──pause──→ paused
  ↑                  ↑                ↓  ↑              ↓
  └──unpublish──────┘                 │  └──resume──────┘
                                      │
                                  lock ↓ ↑ unlock
                                    locked
                                      
         ┌────end────┐
draft    ─┤           ├──→ ended ──archive──→ archived
lobby    ─┤           │
active   ─┤           │
paused   ─┤           │
locked   ─┘           │
                      └──→ cancelled (no transition defined — only via direct DB)
```

### 3.2 Coverage by Endpoint

| Transition | `sessions/[id]` PATCH | `sessions/[id]/command` POST | `control` PATCH | Gap? |
|------------|----------------------|------------------------------|-----------------|------|
| draft→lobby (publish) | ✅ | ✅ | ❌ | — |
| lobby→draft (unpublish) | ✅ | ✅ | ❌ | — |
| lobby→active (start) | ✅ | ✅ | ❌ | — |
| active→paused (pause) | ✅ | ✅ | ✅ | — |
| paused→active (resume) | ✅ | ✅ | ✅ | — |
| active→locked (lock) | ✅ | ✅ | ✅ | — |
| locked→active (unlock) | ✅ | ✅ | ✅ | — |
| any→ended (end) | ✅ | ✅ | ✅ | — |
| ended→archived (archive) | ❌ | ❌ | ❌ | Handled by `sessions/[sessionId]/archive` route separately |
| *→cancelled (cancel) | ❌ | ❌ | ❌ | **🟡 No UI-exposed cancel mechanism** |

### 3.3 Guard Violations (PLAY-001)

The `sessions/[id]` PATCH endpoint allows **any action from any state**:
- `start` from `ended` → session becomes `active` again (zombie resurrection)
- `publish` from `active` → session becomes `lobby` (rewinds to pre-start)
- `unpublish` from `ended` → session becomes `draft` (reverses end)
- `pause` from `draft` → session becomes `paused` (nonsensical)

These violate the state machine defined in `session-command.ts` and are reachable by any host making the PATCH call instead of using the command pipeline.

### 3.4 Timestamp Gaps (PLAY-004)

| Route | Sets `started_at` | Sets `paused_at` | Sets `ended_at` |
|-------|-------------------|------------------|-----------------|
| `sessions/[id]` PATCH | ✅ (on start, if null) | ✅ (on pause) | ✅ (on end) |
| `sessions/[id]/command` | ✅ (on start, if null) | ✅ (on pause) | ✅ (on end) |
| `control` PATCH | ❌ **MISSING** | ❌ **MISSING** | ❌ **MISSING** |

The control route sets `status` and `updated_at` but does NOT set the lifecycle timestamps (`started_at`, `paused_at`, `ended_at`). This means:
- `uiMode` derivation (which uses `started_at` to distinguish lobby vs live) breaks
- Analytics queries on session duration are wrong
- Board display showing "session ended" timestamp is wrong

### 3.5 Status Guards on Mutation Routes (PLAY-003)

| Route | Mutation | Should require status | Actually checks? |
|-------|----------|----------------------|-----------------|
| time-bank POST | Apply time delta | active/paused | **NO** |
| signals POST | Send signal | active/paused/lobby | **NO** |
| outcome POST | Set outcome | active/paused | **NO** |
| decisions POST | Create decision | active/paused/lobby | **NO** |
| decisions PATCH | Open/close/reveal | active/paused | **NO** |
| assignments POST | Assign roles | lobby/active/paused | **NO** |
| artifacts/state PATCH | Reveal/highlight | active/paused | **NO** |
| chat POST | Send message | lobby/active/paused | **NO** |
| triggers PATCH | Fire/arm/disable | active/paused | **NO** |
| overrides PATCH | Replace overrides | any (config-level) | **NO** |
| participants/[id] PATCH | Kick/block/approve | lobby/active/paused | **PARTIAL** (setPosition only) |

---

## 4. Concurrent Semantic Conflicts

### 4.1 Race Condition Analysis

| ID | Scenario | Severity | Pattern | Root Cause |
|----|----------|----------|---------|------------|
| PLAY-002a | Parallel session status transitions | **P0** | TOCTOU | SELECT + validate + UPDATE are separate; no `WHERE status = ?` on UPDATE |
| PLAY-002b | Puzzle riddle concurrent submissions | **P0** | R-M-W on JSONB | Full state overwrite; second write erases first's attempt; maxAttempts bypass |
| PLAY-002c | Counter puzzle concurrent increments | **P0** | R-M-W on JSONB | Lost updates; counter value systematically lower than expected |
| PLAY-009 | Concurrent `set_step` from multi-tab | **P2** | Last-write-wins | No versioning; cosmetic impact — participants see flicker |
| PLAY-014 | Timer pause/resume quick succession | **P3** | R-M-W | Early-return guards mostly protect; residual risk is ms drift |

### 4.2 Specific Conflict Pairs

| Conflict | What Happens | Impact |
|----------|-------------|--------|
| `next-step` vs `set-step` (multi-tab host) | Both UPDATE `current_step_index`, last wins | Participants see wrong step briefly |
| `pause` vs `timer_start` | Timer can start while session is "paused" (no status guard on state route) | Confusing UX — timer counts down but session shows paused |
| `reveal` vs `vote` on same decision | Vote checks `decision.status === 'open'`, reveal sets it to `revealed`. Race: vote reads open, reveal writes revealed, vote inserts — succeeds despite revealed. | Vote counted after reveal — minor, revealed decisions don't accept new votes in UI |
| `assignment replace` vs `participant join` | Assignments use delete-then-insert. If a participant joins between delete and insert, their existing assignment is deleted but the re-insert doesn't include them. | New participant loses role assignment — silently |
| `outcome/decision updates` concurrent | No locking — both operations do separate UPDATE. Multiple host tabs can set conflicting outcomes. | Last-write-wins — low risk since single-host norm |
| `end` vs any mutation (multi-tab) | End proceeds; parallel mutation also proceeds on the now-ended session | Ghost mutations on ended sessions |

### 4.3 Already-Safe Patterns

These subsystems handle concurrency well:

| Pattern | Why It's Safe |
|---------|---------------|
| **Vote upsert** | `ON CONFLICT (decision_id, participant_id)` — atomic Postgres upsert |
| **Vote counting** | Computed on-read from canonical `session_votes` table — no counter to corrupt |
| **Keypad unlock** | Atomic RPC `attempt_keypad_unlock_v2` — handles idempotency and lockout atomically |
| **Time bank** | Atomic RPC `time_bank_apply_delta` — serialized balance updates |
| **Trigger fire** | `fire_trigger_v2_safe` RPC with `X-Idempotency-Key` — deduplicates |
| **Broadcast sequencing** | Monotonic `broadcast_seq` via atomic `increment_broadcast_seq` RPC |
| **Command dedup** | `UNIQUE(session_id, client_id, client_seq)` — same-client retries caught |

---

## 5. Authoritative Source Mapping

### 5.1 Source of Truth Table

| State | Source of Truth | Derived / Cache | Broadcast | Audit | Recon­structable |
|-------|----------------|-----------------|-----------|-------|-----------------|
| Session status | `participant_sessions.status` | Client via broadcast | `play:` + `session:` | `session_events` | ✅ |
| Step index | `participant_sessions.current_step_index` | `runs.current_step` (no sync) | `play:` state_change | `session_events` | ✅ |
| Phase index | `participant_sessions.current_phase_index` | Client only | `play:` state_change | `session_events` | ✅ |
| Timer | `participant_sessions.timer_state` (JSONB) | Client countdown | `play:` timer_update | `session_events` | ✅ |
| Board | `participant_sessions.board_state` (JSONB) | Client only | `play:` board_update | `session_events` | ✅ |
| Participant status | `participants.status` + `disconnected_at` | Client cache | **NONE** | **NONE** | ✅ |
| Readiness | `participants.progress.isReady` | Client cache | **NONE** | **NONE** | ✅ |
| Roles | `session_roles` + `participant_role_assignments` | Client cache | **NONE** | **NONE** | ✅ |
| Secret unlock | `participant_sessions` timestamps | Per-assignment reveal | `play:` state_change | `session_events` | ✅ |
| Artifact state | `session_artifact_variant_state` | None | `play:` artifact_update | **NONE** | ✅ |
| Decisions | `session_decisions` table | Client cache | `play:` decision_update | **NONE** | ✅ |
| Votes | `session_votes` table | Tallied on-read | `play:` decision_update | **NONE** | ✅ |
| Puzzles | `session_artifact_state.state` JSONB | None | `play:` artifact_update | **NONE** | ✅ |
| Signals | `session_signals` rows | None | `play:` signal_received | `session_events` | ✅ |
| Chat | `play_chat_messages` rows | None | **NONE** | **NONE** | ✅ |
| Time bank | `session_time_bank.balance_seconds` | Ledger (reconstructable) | `play:` time_bank_changed | `session_events` + ledger | ✅ |
| Triggers | `session_trigger_state` rows | Config from `game_triggers` | `play:` trigger_update | `session_events` | ✅ |
| Overrides | `participant_sessions.settings.admin_overrides` | None | **NONE** | **NONE** | ✅ |

### 5.2 Dual Source-of-Truth Red Flags

| Severity | State | Problem |
|----------|-------|---------|
| 🔴 **P0** | Session status | Three mutation paths write the same column with different validation rules |
| 🟡 **P2** | Step index | `participant_sessions.current_step_index` and `runs.current_step_index` track independently — no sync |

---

## 6. Broadcast Gap Analysis

### 6.1 Missing Broadcasts

| Mutation | Broadcast? | Impact |
|----------|-----------|--------|
| Kick/block/approve participant | ❌ | Host's participant list doesn't update in real-time; kicked participant doesn't know immediately |
| Role assignments | ❌ | Participants don't see role assignment in real-time |
| Readiness toggle | ❌ | Host doesn't see readiness updates without polling |
| Chat message | ❌ | Chat is poll-based — no instant messaging experience |
| Session overrides | ❌ | Acceptable — config change, not runtime |
| Rejoin | ❌ | Host doesn't see participant return without polling |

### 6.2 Dual Channel Architecture

Two broadcast channels coexist:
- `play:{sessionId}` — used by host cockpit (RunSessionCockpit) via `useLiveSession` hook
- `session:{sessionId}` — legacy channel used by participant UI

Some routes broadcast on both (control route), some on only one (PATCH route → play only, join → session only). This creates inconsistency in which clients receive which updates.

---

## 7. Auth & Wrapper Coverage

### 7.1 Unwrapped Routes (Batch 7 scope)

| Route | Methods | Current Auth | Recommended Wrapper |
|-------|---------|-------------|-------------------|
| `play/board/[code]` | GET | Rate limit only (RLS client) | `auth: 'public'`, `rateLimit: 'api'` |
| `play/session/[code]` | GET | Rate limit only (RLS client) | `auth: 'public'`, `rateLimit: 'api'` |
| `play/sessions/[id]/game` | GET | Inline dual-auth (user+participant) | `auth: 'public'` + inline viewer logic |
| `play/sessions/[id]/overrides` | GET, PATCH | Inline host-check | `auth: 'user'` |
| `play/sessions/[id]/artifacts/snapshot` | POST, GET | N/A (deprecated 410) | Keep as-is or remove |
| `play/sessions/[id]/artifacts/[id]/puzzle` | POST, GET | Inline `resolveParticipant` | `auth: 'public'` + inline participant check |
| `play/sessions/[id]/artifacts/[id]/keypad` | POST, GET | Inline `resolveParticipant` | `auth: 'public'` + inline participant check |
| `play/sessions/[id]/decisions/[id]/vote` | POST | Inline `resolveParticipant` | `auth: 'public'` + inline participant check |
| `participants/route` | GET | RLS client | `auth: 'user'` |
| `participants/[id]/route` | GET | RLS client | `auth: 'user'` |
| `participants/[id]/actions` | POST | N/A (deprecated 410) | Keep as-is or remove |
| `sessions/[sessionId]` | GET | RLS client | `auth: 'user'` |
| `sessions/[sessionId]/actions` | POST | N/A (deprecated 410) | Keep as-is or remove |

### 7.2 `resolveSessionViewer` vs `requireSessionHost`

| Function | System-admin bypass? | Used by |
|----------|---------------------|---------|
| `resolveSessionViewer(sessionId, request)` | ❌ **NO** | chat, signals, decisions GET, outcome GET, artifacts GET, conversation-cards |
| `requireSessionHost(sessionId, userId)` | ✅ **YES** | tokens/revoke, tokens/extend |
| Inline host check in routes | Varies — some check `global_role`, some don't | state PATCH, assignments, triggers, etc. |

This means a system_admin trying to help debug a live session via the `resolveSessionViewer` path gets rejected.

---

## 8. Confirmed Findings

### PLAY-001: Triple Status Mutation Path (P0)

**Problem:** Three independent endpoints write `participant_sessions.status`:

1. **`play/sessions/[id]` PATCH** — No state-machine guard. Maps action string directly to status. A host can `start` an `ended` session, `unpublish` an `active` one, or `pause` a `draft`. No idempotency, no audit trail.

2. **`play/sessions/[id]/command` POST** — Full state machine via `STATUS_TRANSITIONS` map. Idempotency via `(client_id, client_seq)`. Audit trail in `session_commands` table. This is the correct path (MS11).

3. **`participants/sessions/[sessionId]/control` PATCH** — Per-action idempotency checks ("already paused" → 400) but no formal state-machine validation. Also missing lifecycle timestamps (`started_at`, `paused_at`, `ended_at`). Broadcasts on both channels (good).

**Risk:** The PATCH endpoint is a bypass — any host can make invalid transitions that would be rejected by the command pipeline. The control route misses timestamps that other UI (and analytics) depend on.

**Recommendation:** Consolidate all status transitions through the command pipeline. Make the PATCH and control routes delegate to `applySessionCommand()` instead of doing direct DB updates.

### PLAY-002: JSONB Read-Modify-Write Races (P0)

**Problem:** Puzzle and counter mutations use a non-atomic read-modify-write pattern:
1. `SELECT state FROM session_artifact_state` (reads full JSONB)
2. Modify in memory (push attempt, increment counter)
3. `UPSERT state` (overwrites full JSONB)

Under concurrent submissions, the second write erases the first's changes.

**Specific impacts:**
- **Riddle:** Attempt array loses entries. `maxAttempts` check bypassed (two requests both read `attempts.length = 2`, both pass the `maxAttempts: 3` check).
- **Counter:** Lost increments. Counter value systematically lower than expected. Puzzle may never complete.
- **Multi-answer:** Item check toggles lost. Two participants checking different items → one check lost.
- **QR gate:** Less affected (single-write on verify), but `scannedAt` can be overwritten.

**Contrast:** Keypad uses `attempt_keypad_unlock_v2` RPC which is atomic. Time bank uses `time_bank_apply_delta` RPC which is atomic. These are the right pattern.

**Recommendation:** Create Postgres RPCs for each puzzle type that do atomic JSONB modification (`jsonb_set` with SQL-level arithmetic for counters, `jsonb_insert` for array appends).

### PLAY-003: Missing Session-Status Guards (P1)

**Problem:** 13 of 15 mutation routes perform no check on `session.status`. This means:
- A host can fire triggers on an `ended` session
- A host can create decisions on a `draft` session
- A participant can send signals on an `ended` session
- A host can modify artifacts on a `cancelled` session

Only `join` (blocks draft/locked/ended) and `ready` (requires lobby/active) check status.

**Recommendation:** Add a shared `assertSessionActive(status)` guard that accepts a set of allowed statuses. Apply consistently to all mutation routes. The allowed set varies by mutation type — some are valid in lobby only, some in lobby+active+paused.

### PLAY-004: Control Route Missing Timestamps (P1)

**Problem:** `participants/sessions/[sessionId]/control` PATCH sets `status` and `updated_at` but does NOT set:
- `started_at` (on start — N/A, control doesn't handle start)
- `paused_at` (on pause)
- `ended_at` (on end)

The PATCH route and command pipeline both set these correctly. The control route's omission means analytics and UI that depend on these timestamps get wrong data.

**Recommendation:** Add the same timestamp logic as the PATCH route: `paused_at: now` on pause, `ended_at: now` on end, clear `paused_at` on resume.

### PLAY-005: Broadcast Gaps on Critical Actions (P1)

**Problem:** Several host actions that affect visible state have no broadcast:
- **Kick/block/approve** — participant list doesn't update in real-time
- **Role assignments** — participants don't see their role assignment live
- **Readiness toggle** — host's lobby view doesn't show readiness without polling

These create a "stale UI" experience where the host or participant must refresh to see changes.

**Recommendation:** Add `broadcastPlayEvent` calls for these mutations. Prioritize kick/block (security-relevant — a kicked participant should be notified immediately).

### PLAY-006: Unwrapped Participant-Facing Routes (P1)

**Problem:** 9 Play routes still use raw `export async function` without `apiHandler`. These include participant-facing routes (vote, puzzle, keypad) that handle untrusted input without the wrapper's error handling, rate limiting, or request ID tracing.

**Recommendation:** Migrate in Batch 7 scope. Vote/puzzle/keypad should use `auth: 'public'` with inline `resolveParticipant`.

---

## 9. Quick Wins

These can be fixed independently with minimal risk:

| Fix | Effort | Risk | Impact |
|-----|--------|------|--------|
| Add `WHERE status = ANY(?)` to PATCH route UPDATE | 30 min | Low | Prevents invalid transitions on legacy endpoint |
| Add timestamps to control route | 15 min | Low | Fixes analytics/UI timestamp gaps |
| Add `broadcastPlayEvent` after kick/block/approve | 30 min | Low | Kicked participants get notified |
| Add session-status guard to time-bank POST | 15 min | Low | Prevents time-bank mutations on ended sessions |
| Deprecate `sessions/[id]` PATCH for status transitions | 15 min | Med | Route to command pipeline; needs client audit |

---

## 10. Post-Launch Ideas

These are architectural improvements that don't block launch:

| Idea | Description |
|------|-------------|
| **Reducer centralization** | Funnel all mutations through `applySessionCommand()` including runtime state. Single code path for all mutations. |
| **Event sourcing replay** | Make `session_events` structured enough to replay a session from event log. Currently fire-and-forget with inconsistent schemas. |
| **Optimistic UI with rollback** | Use the command pipeline's idempotency for optimistic updates — apply locally, confirm with server, rollback on 409. |
| **Unified broadcast channel** | Merge `play:` and `session:` channels. Currently dual-channel creates confusion about which clients receive which events. |
| **Cancel from UI** | Expose `cancelled` status transition. Currently only reachable via direct DB — but may be intentional (destructive action). |
| **Participant readiness column** | Promote `isReady` from generic `progress` JSONB to a dedicated boolean column with index. |

---

## Appendix A: Route Inventory

70 route files, ~95 handlers across `play/`, `participants/`, `sessions/`, and media-serving routes. Full inventory in `play-architecture.md`.

## Appendix B: Referenced Files

| File | Purpose |
|------|---------|
| `lib/play/session-command.ts` | Command pipeline with state machine (MS11) |
| `lib/play/ui-state.ts` | Pure functions for UI state derivation |
| `lib/play/realtime-gate.ts` | Realtime enable/disable logic |
| `lib/realtime/play-broadcast-server.ts` | Server-side broadcast with atomic sequencing |
| `lib/realtime/play-broadcast.ts` | Client-side broadcast builder |
| `lib/api/play-auth.ts` | `resolveSessionViewer` + `resolveParticipant` |
| `lib/services/participants/session-service.ts` | `ParticipantSessionService` — CRUD + runtime state |
| `types/play-runtime.ts` | Runtime state types |

## Appendix C: Session Status Enum

```
draft → lobby → active ↔ paused
                  ↕
               locked
         any → ended → archived
         (no UI path to cancelled)
```

## Appendix D: Flagged for Sessions/Participants Audit

Per GPT guidance, the following is **not** a code change for this audit but a product/security question for the Sessions/Participants audit (#8):

- **Join-route lifecycle status exposure:** The `join` route currently returns session status information to anonymous callers (before join completes). How much lifecycle status should be exposed to pre-join users? This is a product decision, not a bug.
