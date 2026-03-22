# Play System Architecture

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Active architecture reference for the Play domain. Use this as the stable design overview together with `launch-readiness/launch-control.md` and the bounded Play audit/remediation records.

> **Version:** 1.0  
> **Date:** 2026-03-11  
> **Source:** Play Runtime audit (`audits/play-audit.md`)  
> **Scope:** State ownership, data flow, broadcast architecture, route topology  
> **Purpose:** Stable reference for AI agents and developers working on the Play domain

---

## 1. System Overview

The Play system manages **live game sessions** — a host starts a session, participants join, and the system orchestrates state transitions, artifact interactions, decisions, timers, and gamification in real-time.

```
┌─────────────────────────────────────────────────────────────────┐
│                        HOST (teacher)                           │
│  RunSessionCockpit → useLiveSession → Supabase Realtime        │
│                           ↓ HTTP                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              API Layer (Next.js Route Handlers)          │   │
│  │                                                          │   │
│  │  Command Pipeline (MS11)  ←── primary mutation path      │   │
│  │  Legacy PATCH             ←── should delegate to above   │   │
│  │  Control PATCH            ←── should delegate to above   │   │
│  │  State PATCH              ←── runtime state (step/timer) │   │
│  │  Feature routes           ←── decisions/artifacts/etc.   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓ SQL                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Supabase PostgreSQL                         │   │
│  │  participant_sessions    ←── session state (SoT)         │   │
│  │  session_commands        ←── command audit trail         │   │
│  │  session_*               ←── feature tables              │   │
│  │  participants            ←── player roster               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                           ↓ Realtime                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              Broadcast Channels                          │   │
│  │  play:{sessionId}     ←── host cockpit events            │   │
│  │  session:{sessionId}  ←── participant events (legacy)    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│                     PARTICIPANTS (students)                       │
│  ParticipantView → useLiveSession → Supabase Realtime           │
│                           ↓ HTTP                                │
│  Puzzle/Keypad/Vote/Signal/Chat                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Route Topology

### 2.1 Route Groups

| Group | Base Path | Files | Handlers | Actor |
|-------|-----------|-------|----------|-------|
| **Play core** | `app/api/play/` | 46 | ~60 | Host + Participant |
| **Participants** | `app/api/participants/` | 19 | ~25 | Host + Participant |
| **Sessions** | `app/api/sessions/` | 3 | ~5 | Host (admin) |
| **Media** | `app/api/media/` | 2 | ~5 | Host (media serving) |
| **Total** | — | **70** | **~95** | — |

### 2.2 Auth Patterns

| Pattern | Count | Description |
|---------|-------|-------------|
| `apiHandler({ auth: 'user' })` | 44 | Authenticated user (host) |
| `apiHandler({ auth: 'public' })` | 16 | Public (participant or anonymous) |
| `apiHandler({ auth: 'participant' })` | 6 | Participant token check |
| `apiHandler({ auth: 'cron_or_admin' })` | 1 | System maintenance |
| Raw `export async function` | 9 | Unwrapped — Batch 7 scope |

### 2.3 Key Routes by Function

**Session Lifecycle:**
| Route | Purpose |
|-------|---------|
| `play/sessions/[id]` GET/PATCH | Session detail + legacy status transitions |
| `play/sessions/[id]/command` POST | MS11 command pipeline (primary) |
| `participants/.../control` PATCH | Host controls (pause/resume/lock/unlock/end) |
| `participants/sessions/join` POST | Participant joins session |
| `participants/sessions/rejoin` POST | Reconnection |
| `play/sessions/[id]/archive` POST | End → archived transition |

**Runtime State:**
| Route | Purpose |
|-------|---------|
| `play/sessions/[id]/state` GET/PATCH | Step, phase, timer, board state |
| `play/sessions/[id]/time-bank` POST/GET | Atomic time-bank operations |
| `play/sessions/[id]/overrides` GET/PATCH | Admin runtime settings |

**Interactions:**
| Route | Purpose |
|-------|---------|
| `play/sessions/[id]/decisions` POST | Create decisions |
| `play/sessions/[id]/decisions/[id]` PATCH | Open/close/reveal decisions |
| `play/sessions/[id]/decisions/[id]/vote` POST | Participant votes |
| `play/sessions/[id]/artifacts/[id]/puzzle` POST/GET | Puzzle submissions |
| `play/sessions/[id]/artifacts/[id]/keypad` POST/GET | Keypad unlock codes |
| `play/sessions/[id]/signals` POST/GET | Signal events |
| `play/sessions/[id]/chat` POST/GET | Chat messages |
| `play/sessions/[id]/triggers` PATCH/GET | Trigger management |
| `play/sessions/[id]/outcome` POST/GET | Session outcomes |

**Roles & Assignments:**
| Route | Purpose |
|-------|---------|
| `play/sessions/[id]/roles` POST | Snapshot game roles to session |
| `play/sessions/[id]/assignments` POST | Assign roles to participants |
| `play/me/role/reveal` POST | Participant reveals own role |
| `play/sessions/[id]/secrets` POST | Unlock session secrets |

---

## 3. State Ownership

### 3.1 Session State — Source of Truth

The `participant_sessions` table is the **single source of truth** for all session state:

```
participant_sessions
├── id, code, game_id, host_user_id, tenant_id
├── status                    ← session lifecycle (8 values)
├── current_step_index        ← which game step is active
├── current_phase_index       ← which phase within step
├── timer_state (JSONB)       ← countdown/stopwatch state
│   ├── mode: 'countdown' | 'stopwatch'
│   ├── duration_seconds
│   ├── started_at
│   ├── paused_at
│   └── remaining_seconds
├── board_state (JSONB)       ← board display configuration
│   ├── mode: 'standard' | 'secret' | 'competition'
│   └── message: string | null
├── settings (JSONB)          ← host configuration + admin overrides
│   ├── lobby_settings
│   ├── admin_overrides
│   └── feature_flags
├── started_at, paused_at, ended_at  ← lifecycle timestamps
└── created_at, updated_at
```

### 3.2 Feature State — Supporting Tables

```
session_commands          ← audit trail + idempotency (MS11)
session_events            ← event log (fire-and-forget)
session_decisions         ← host decisions (open/close/reveal)
session_votes             ← participant votes (canonical)
session_artifact_state    ← per-artifact V2 state (JSONB)
session_artifact_variant_state     ← per-variant visibility/assignments
session_artifact_variant_assignments_v2  ← variant assignments
session_roles             ← game roles snapshotted to session
participant_role_assignments  ← role → participant mapping
session_signals           ← signal events
session_trigger_state     ← trigger arm/fire state
session_time_bank         ← time bank balance
session_time_bank_ledger  ← time bank history
session_outcomes          ← session outcomes
play_chat_messages        ← chat history
participant_game_progress ← gamification progress
participant_activity_log  ← host action audit
```

### 3.3 Session Status Lifecycle

```
             publish          start
   draft ──────────→ lobby ──────────→ active
     ↑                                   ↕ pause/resume
     └── unpublish ── lobby              paused
                                          ↕ lock/unlock
                                        locked
                                          
                                    end (from any)
                                          ↓
                                        ended
                                          ↓ archive
                                       archived

                                   (cancelled — direct DB only)
```

**Status semantics:**

| Status | Meaning | Allowed mutations |
|--------|---------|-------------------|
| `draft` | Being configured | Config only (overrides, roles) |
| `lobby` | Waiting for players | Join, readiness, assignments, config |
| `active` | Game in progress | All runtime mutations |
| `paused` | Game paused | Most mutations (solve puzzles, vote) |
| `locked` | Temporarily frozen | Limited — unlock only |
| `ended` | Game complete | Read-only (archive transition) |
| `archived` | Long-term storage | Read-only |
| `cancelled` | Abandoned | Read-only |

---

## 4. Command Pipeline (MS11)

The **command pipeline** (`lib/play/session-command.ts`) is the primary mutation path for session status transitions.

### 4.1 Flow

```
Client Request
     ↓
applySessionCommand(sessionId, command, userId)
     ↓
┌─────────────────────────┐
│ 1. Idempotency check    │  ← (client_id, client_seq) uniqueness
│    Already processed?   │  → Return cached result
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ 2. Insert session_      │  ← Audit trail
│    commands record      │  → status: 'pending'
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ 3. executeMutation()    │  ← STATUS_TRANSITIONS validation
│    Validate from→to     │  → UPDATE participant_sessions
│    Apply timestamps     │
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ 4. Mark command applied │  ← status: 'applied'
└─────────┬───────────────┘
          ↓
┌─────────────────────────┐
│ 5. Broadcast            │  ← broadcastPlayEvent()
│    play:{sessionId}     │     with atomic seq
└─────────┬───────────────┘
          ↓
Return updated session state
```

### 4.2 Command Types

| Category | Commands |
|----------|----------|
| **Status transitions** | `publish`, `unpublish`, `start`, `pause`, `resume`, `lock`, `unlock`, `end` |
| **Runtime state** | `set_step`, `set_phase`, `timer_start`, `timer_pause`, `timer_resume`, `timer_reset`, `set_board_message`, `clear_board_message` |

### 4.3 State Machine (STATUS_TRANSITIONS)

```typescript
STATUS_TRANSITIONS = {
  publish:   { from: ['draft'],                     to: 'lobby' },
  unpublish: { from: ['lobby'],                     to: 'draft' },
  start:     { from: ['lobby'],                     to: 'active' },
  pause:     { from: ['active'],                    to: 'paused' },
  resume:    { from: ['paused'],                    to: 'active' },
  lock:      { from: ['active'],                    to: 'locked' },
  unlock:    { from: ['locked'],                    to: 'active' },
  end:       { from: ['active','paused','locked','lobby','draft'], to: 'ended' },
}
```

---

## 5. Broadcast Architecture

### 5.1 Server-Side

```
broadcastPlayEvent(sessionId, eventType, payload)
     ↓
┌─────────────────────────────────────┐
│ 1. increment_broadcast_seq RPC     │  ← atomic counter
│    Returns monotonic seq number    │
└─────────┬───────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ 2. Supabase Realtime .send()       │  ← to channel play:{sessionId}
│    Payload includes: seq, type,    │
│    data, timestamp                 │
└─────────────────────────────────────┘
```

### 5.2 Client-Side (`useLiveSession`)

```
Supabase Realtime subscription
     ↓
┌──────────────────────────────────┐
│ Sequence guard (reject ≤ last)  │ ← prevents out-of-order
│ Signal dedup (LRU 50 IDs)      │ ← prevents duplicate processing
│ Reconnect handler               │ ← triggers resync on reconnect
└─────────┬────────────────────────┘
          ↓
┌──────────────────────────────────┐
│ resyncRuntimeState() fallback   │ ← HTTP poll if Realtime gap
│ GET /api/play/sessions/[id]/    │
│     state                       │
└──────────────────────────────────┘
```

### 5.3 Event Types

| Event | Triggered by | Content |
|-------|-------------|---------|
| `state_change` | Status/step/phase/secrets | Full session state |
| `timer_update` | Timer start/pause/resume/reset | Timer state JSONB |
| `board_update` | Board message set/clear | Board state JSONB |
| `decision_update` | Decision create/open/close/reveal/vote | Decision + vote tally |
| `artifact_update` | Artifact reveal/hide/puzzle solve | Artifact state |
| `signal_received` | Signal sent | Signal data |
| `time_bank_changed` | Time bank delta applied | New balance |
| `trigger_update` | Trigger fire/arm/disable | Trigger state |
| `outcome_update` | Outcome set/modified | Outcome data |
| `participants_changed` | Join (only) | Participant list |
| `progress_updated` | Participant progress | Progress data |
| `turn_update` | setNextStarter | Next starter ID |
| `session_ended` | End command (redundant?) | Session state |

### 5.4 Channel Architecture

| Channel | Audience | Used by |
|---------|----------|---------|
| `play:{sessionId}` | Host cockpit (RunSessionCockpit) | Most Play routes |
| `session:{sessionId}` | Participant UI (legacy) | Control route, join, progress |

**Issue:** Dual channels mean some events go to one audience but not the other. The control route broadcasts on both. Most Play routes broadcast only on `play:`. Some participant-facing events broadcast only on `session:`.

---

## 6. Service Layer

### 6.1 Key Services

| Service | File | Purpose |
|---------|------|---------|
| `ParticipantSessionService` | `lib/services/participants/session-service.ts` | Session CRUD + runtime state |
| `applySessionCommand` | `lib/play/session-command.ts` | Command pipeline (MS11) |
| `broadcastPlayEvent` | `lib/realtime/play-broadcast-server.ts` | Atomic broadcast |
| `resolveSessionViewer` | `lib/api/play-auth.ts` | Session viewer resolution |
| `resolveParticipant` | `lib/api/play-auth.ts` | Participant identity resolution |
| `requireSessionHost` | `lib/api/play-auth.ts` | Host authorization |

### 6.2 UI State Derivation

Pure functions in `lib/play/ui-state.ts`:

| Function | Input | Output | Purpose |
|----------|-------|--------|---------|
| `resolveUiMode()` | Session status + timestamps | UI mode string | Determines which UI view to show |
| `resolveConnectionHealth()` | Last seen, reconnect state | Health indicator | Connection quality display |
| `resolveSessionBanner()` | Session state | Banner config | Top-bar status message |
| `resolveAllowedActions()` | Session status + user role | Action list | Which buttons to show |

### 6.3 Realtime Gating

`lib/play/realtime-gate.ts` → `shouldEnableRealtime(status)`:
- Returns `true` for: `lobby`, `active`, `paused`, `locked`
- Returns `false` for: `draft`, `ended`, `archived`, `cancelled`

---

## 7. Data Flow Diagrams

### 7.1 Host Starts Session

```
Host clicks "Start"
     ↓
POST /api/play/sessions/{id}/command
  { type: 'start', client_id: 'cockpit-abc', client_seq: 42 }
     ↓
applySessionCommand()
  1. Check idempotency → new command
  2. Insert session_commands record
  3. STATUS_TRANSITIONS.start.from includes 'lobby' → ✓
  4. UPDATE participant_sessions SET status='active', started_at=now()
  5. Mark command applied
  6. broadcastPlayEvent('state_change', { status: 'active', ... })
     ↓
play:{sessionId} channel
     ↓
useLiveSession receives event
  → seq > lastSeq → accept
  → Update local state
  → UI transitions to active view
```

### 7.2 Participant Submits Puzzle

```
Participant submits answer
     ↓
POST /api/play/sessions/{id}/artifacts/{artifactId}/puzzle
  { type: 'riddle', answer: 'blue' }
     ↓
resolveParticipant(sessionId, request)
  → Validate participant identity from cookie/header
     ↓
Read session_artifact_state.state  ← (⚠️ RACE: not atomic)
  → Check maxAttempts, existing attempts
     ↓
Evaluate answer correctness
     ↓
Write updated state back  ← (⚠️ RACE: full JSONB overwrite)
     ↓
If solved: broadcastPlayEvent('artifact_update', ...)
```

### 7.3 Host Kicks Participant

```
Host clicks "Kick"
     ↓
PATCH /api/play/sessions/{id}/participants/{participantId}
  { action: 'kick' }
     ↓
requireSessionHost(sessionId, userId)
     ↓
UPDATE participants SET status='kicked', kicked_at=now()
     ↓
(⚠️ NO broadcast — host/participants don't get live update)
```

---

## 8. Known Architectural Gaps

Per `play-audit.md` findings — these are the high-level architectural issues:

| Issue | Description | Remediation milestone |
|-------|-------------|----------------------|
| Triple mutation path | 3 endpoints write session status | M1 (consolidation) |
| No session-status guards | 13/15 routes mutate without status check | M2 (guards) |
| Non-atomic JSONB mutations | Puzzle/counter lose data under concurrency | M3 (RPCs) |
| Incomplete broadcasts | Kick, assign, readiness not broadcast | M4 (completeness) |
| Unwrapped routes | 9 routes lack apiHandler wrapper | M5 (Batch 7) |
| Dual broadcast channels | `play:` and `session:` with inconsistent usage | Post-launch unification |

---

## 9. File Index

### Core Libraries
| File | Purpose |
|------|---------|
| `lib/play/session-command.ts` | Command pipeline + state machine |
| `lib/play/ui-state.ts` | UI state derivation (pure functions) |
| `lib/play/realtime-gate.ts` | Realtime enable/disable gating |
| `lib/play/game-to-cockpit.ts` | Game data → cockpit format transform |
| `lib/realtime/play-broadcast-server.ts` | Server broadcast with atomic seq |
| `lib/realtime/play-broadcast.ts` | Client broadcast builder |
| `lib/api/play-auth.ts` | Session viewer/participant/host auth |
| `lib/services/participants/session-service.ts` | ParticipantSessionService |

### Type Definitions
| File | Purpose |
|------|---------|
| `types/play-runtime.ts` | Runtime state types, broadcast types |
| `features/play/types.ts` | Run model types |

### Client Hooks
| File | Purpose |
|------|---------|
| `features/play/hooks/useLiveSession.ts` | Realtime subscription + resync |

### Database
| Table | Purpose |
|-------|---------|
| `participant_sessions` | Session state (SoT) |
| `participants` | Player roster + status |
| `session_commands` | Command audit + idempotency |
| `session_events` | Event log |
| `session_decisions` + `session_votes` | Decisions + voting |
| `session_artifact_state` | Artifact state (V2 JSONB) |
| `session_signals` | Signal events |
| `session_trigger_state` | Trigger state |
| `session_time_bank` + `_ledger` | Time bank |
| `play_chat_messages` | Chat |
