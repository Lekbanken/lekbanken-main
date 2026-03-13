# Sessions & Participants Architecture

> **Version:** 1.0  
> **Date:** 2026-03-11  
> **Source:** Sessions & Participants audit (`audits/sessions-audit.md`)  
> **Scope:** Session lifecycle, participant lifecycle, auth boundaries, data flow, broadcast topology  
> **Purpose:** Stable reference for AI agents and developers working on the Sessions & Participants domain

---

## 1. System Overview

The Sessions & Participants domain manages the **entire lifecycle** of interactive game sessions — from creation by a host through participant join/rejoin, live state management, and eventual archival. It bridges the gap between the Play runtime (game mechanics) and the user-facing session management concerns.

```
┌──────────────────────────────────────────────────────────────────────┐
│                          HOST (teacher)                              │
│  SessionControlPanel → useSessionControl → HTTP API                  │
│  ParticipantList → useParticipants → Supabase postgres_changes       │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │                   API Layer (Next.js)                          │  │
│  │                                                                │  │
│  │  Session CRUD                                                  │  │
│  │    /participants/sessions/create      POST  (create session)   │  │
│  │    /participants/sessions/[id]        GET   (public preview)   │  │
│  │    /participants/sessions/[id]        DELETE (host cleanup)    │  │
│  │    /participants/sessions/history     GET   (host dashboard)   │  │
│  │                                                                │  │
│  │  Session Lifecycle                                             │  │
│  │    /participants/sessions/[id]/control PATCH (pause/resume/..) │  │
│  │    /participants/sessions/[id]/archive POST  (archive ended)   │  │
│  │    /participants/sessions/[id]/restore POST  (un-archive)      │  │
│  │                                                                │  │
│  │  Participant Management                                        │  │
│  │    /play/sessions/[id]/participants       GET   (list)         │  │
│  │    /play/sessions/[id]/participants/[pid] PATCH (kick/block/…) │  │
│  │    /participants/tokens/revoke            POST  (expire token) │  │
│  │    /participants/tokens/extend            POST  (extend token) │  │
│  │    /participants/tokens/cleanup           POST  (cron job)     │  │
│  │                                                                │  │
│  │  Join/Rejoin Flow                                              │  │
│  │    /participants/sessions/join            POST  (anonymous)    │  │
│  │    /participants/sessions/rejoin          POST  (stored token) │  │
│  │    /play/join  (→ forwarding alias)                            │  │
│  │    /play/rejoin (→ forwarding alias)                           │  │
│  │                                                                │  │
│  │  Participant Self-Service                                      │  │
│  │    /play/me                               GET  (profile+state) │  │
│  │    /play/me/role                          GET  (role info)     │  │
│  │    /play/me/role/reveal                   POST (reveal secret) │  │
│  │    /play/ready                            POST (toggle ready)  │  │
│  │    /play/heartbeat                        POST (presence ping) │  │
│  │                                                                │  │
│  │  Public / Board                                                │  │
│  │    /play/session/[code]                   GET  (lobby preview) │  │
│  │    /play/board/[code]                     GET  (display board) │  │
│  │    /public/v1/sessions                    GET  (tenant list)   │  │
│  │    /public/v1/sessions/[id]               GET  (detail)        │  │
│  │                                                                │  │
│  │  Analytics/Export                                              │  │
│  │    /participants/sessions/[id]/analytics  GET  (host stats)    │  │
│  │    /participants/sessions/[id]/export     GET  (CSV download)  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           ↓ SQL                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Supabase PostgreSQL                               │  │
│  │  participant_sessions (28 cols)    ←── session state (SoT)     │  │
│  │  participants (16 cols)            ←── player roster + token   │  │
│  │  participant_activity_log          ←── audit trail             │  │
│  │  session_commands                  ←── idempotent command log  │  │
│  │  participant_token_quotas          ←── no-expiry limits        │  │
│  │  session_roles + assignments       ←── role assignment         │  │
│  │  game_progress                     ←── per-participant scores  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                           ↓ Realtime                                 │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │              Broadcast Channels                                │  │
│  │  play:{sessionId}        ←── host cockpit events (seq-guarded) │  │
│  │  session:{sessionId}     ←── participant events (legacy)       │  │
│  │  participants:{sessionId}←── postgres_changes for host UI      │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│                     PARTICIPANTS (students)                           │
│  JoinSessionForm → join API → token → localStorage                   │
│  ParticipantPlayView → useLiveSession (play:) + useParticipantBroadcast (session:) │
│  useParticipantHeartbeat (30s) + useParticipantRejoin (auto)         │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. Session Lifecycle State Machine

```
                        ┌──────────┐
                        │  CREATE   │  ← Host calls /sessions/create
                        └─────┬────┘
                              ▼
    ┌─────────────────► draft ────────────┐
    │                     │               │ (cancel)
    │                     ▼               ▼
    │                   lobby ──────► cancelled
    │                     │
    │                     ▼
    │   ┌──── lock ◄── active ──► pause ──┐
    │   │                 │               │
    │   │    unlock ──►   │   ◄── resume ─┘
    │   │                 ▼
    │   └──────────►   ended
    │                     │
    │                     ▼
    │                  archived
    │                     │
    │                     ▼
    └─────────────── (restored = ended/cancelled)
```

**Session status enum:** `draft`, `lobby`, `active`, `paused`, `locked`, `ended`, `archived`, `cancelled`

**Transition enforcement:**
- `applySessionCommand()` in `lib/play/session-command.ts` — canonical state machine with `STATUS_TRANSITIONS` map
- `PLAY_MUTATION_STATUS_POLICY` in `lib/play/session-guards.ts` — per-mutation allowed-status table (18 mutation types)
- Control route delegates to command pipeline (M1 fix)

---

## 3. Participant Lifecycle

```
  [Anonymous user enters code]
         │
         ▼
  ┌── JOIN ──┐
  │          │
  │ requireApproval=false    requireApproval=true
  │          │                       │
  ▼          ▼                       ▼
active    active                   idle (awaiting approval)
  │                                  │
  │                          host approves → active
  │                                  │
  │          ┌───────────────────────┘
  ▼          ▼
  active ◄──── rejoin (if disconnected)
  │
  ├── disconnect → disconnected (heartbeat timeout)
  │                    │
  │                    └── rejoin → active
  │
  ├── host kicks → kicked (403 on all future API calls)
  │
  └── host blocks → blocked (403 on all future API calls, permanent)
```

**Participant status enum:** `active`, `idle`, `disconnected`, `kicked`, `blocked`

**Rejected statuses (API access denied):** `blocked`, `kicked` — enforced by `REJECTED_PARTICIPANT_STATUSES` set in `lib/api/play-auth.ts` and by wrapper's `resolveParticipantAuth()`.

---

## 4. Auth Boundaries

### 4.1 Auth Patterns Used

| Pattern | Used Where | Mechanism |
|---------|-----------|-----------|
| `auth: 'user'` | Host session management, analytics, export | Supabase cookie JWT → `auth!.user!.id` |
| `auth: 'participant'` | Vote, puzzle, keypad, me, ready, role reveal, progress | `x-participant-token` header → `resolveParticipantAuth()` |
| `auth: 'public'` | Join, rejoin, heartbeat, chat, lobby view, board | No auth; routes handle own validation |
| `requireSessionHost()` | Archive, restore, token management, session delete | `auth: 'user'` + host_user_id ownership check |
| `resolveSessionViewer()` | Chat, decisions, artifacts, outcome | Dual: participant token OR host cookie |
| Inline host check | Overrides, participants list | Manual `getUser()` + `host_user_id` comparison |

### 4.2 Host ↔ Participant Boundary

| Capability | Host | Participant | Public |
|-----------|------|------------|--------|
| Create/delete session | ✅ | ❌ | ❌ |
| Pause/resume/lock/end | ✅ | ❌ | ❌ |
| Kick/block/approve | ✅ | ❌ | ❌ |
| View participant list | ✅ | ❌ | Partial (lobby preview: id+name+ready) |
| View session metadata | ✅ | Via `/play/me` | Via code (lobby preview) |
| Join session | ❌ (host is not a participant) | ✅ via code | ✅ via code |
| Submit puzzle/vote/keypad | ❌ | ✅ | ❌ |
| Send chat | ✅ (visibility: host/public) | ✅ (visibility: public only) | ❌ |
| Toggle readiness | ❌ | ✅ | ❌ |

---

## 5. Token Architecture

### 5.1 Participant Token

- **Format:** UUID v4 (`crypto.randomUUID()`) — 128-bit entropy
- **Storage:** Browser `localStorage` keys: `participant_token`, `participant_session_id`, `participant_display_name`
- **Transport:** `x-participant-token` HTTP header on every participant API call
- **Validation:** Server-side lookup in `participants` table → check status (not kicked/blocked) + expiry
- **Expiry:** Configurable per session (default 24h, null = no-expiry with quota)
- **Revocation:** Host can revoke (sets status → kicked, token_expires_at → now)

### 5.2 Session Code

- **Format:** 6 uppercase alphanumeric characters from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (32 chars, excludes confusing 0/O/1/I/L)
- **Entropy:** 32^6 ≈ 1.07 billion combinations
- **Uniqueness:** DB unique constraint + collision detection with 5 retries
- **Normalization:** Input normalized (uppercase, strip whitespace) via `normalizeSessionCode()`
- **Lookup:** Used by join, heartbeat, board, lobby preview routes

---

## 6. Broadcast Architecture

Three separate Supabase Realtime channels operate per session:

### 6.1 `play:{sessionId}` — Host Cockpit Events
- **Used by:** `useLiveSession` hook (host + participant views)
- **Sequencing:** Monotonic `seq` counter via `increment_broadcast_seq()` Postgres RPC
- **Event types:** 15+ types including `state_change`, `participants_changed`, `assignments_changed`, `signal_received`, `time_bank_changed`
- **Sender:** `broadcastPlayEvent()` server-side helper (centralized, best-effort)

### 6.2 `session:{sessionId}` — Participant Events (Legacy)
- **Used by:** `useParticipantBroadcast` hook, control route
- **Sequencing:** None (no seq counter)
- **Event types:** `session_paused`, `session_resumed`, `session_ended`, `session_locked`, `session_unlocked`, `host_message`, `participant_joined`, `participant_left`
- **Sender:** Direct `channel.send()` in control route (not via `broadcastPlayEvent()`)
- **Note:** This is a separate channel from `play:` — creates dual-channel architecture

### 6.3 `participants:{sessionId}` — Postgres Changes
- **Used by:** `useParticipants` hook (host view)
- **Mechanism:** Supabase `postgres_changes` subscription on `participants` table
- **Events:** INSERT/UPDATE/DELETE on participant rows for the session
- **Purpose:** Real-time participant list updates in host UI

---

## 7. Data Model

### 7.1 participant_sessions (28 columns)
Source of truth for session state. Key relationships:
- `tenant_id` → tenants table (multi-tenancy)
- `host_user_id` → auth.users (session owner)
- `plan_id` → plans (optional lesson plan link)
- `game_id` → games (optional game link)
- `game_snapshot_id` → game_snapshots (frozen game state)

### 7.2 participants (16 columns)
One row per participant per session. Key fields:
- `participant_token` — unique, used as bearer credential
- `status` — enum controlling API access
- `progress` — JSONB bag (games_completed, score, achievements, isReady, isNextStarter)
- `ip_address` + `user_agent` — abuse tracking

### 7.3 participant_activity_log
Append-only audit trail for session events (join, rejoin, kick, block, session_pause, etc.).

### 7.4 session_commands
Idempotent command pipeline entries with `(client_id, client_seq)` dedup constraint.

---

## 8. Route Topology

### 8.1 Route Count by Auth Pattern

| Auth Pattern | Count | Examples |
|-------------|-------|---------|
| `apiHandler({ auth: 'user' })` | ~20 | control, archive, restore, export, analytics, participants list |
| `apiHandler({ auth: 'participant' })` | 5 | me, ready, role, role/reveal, progress |
| `apiHandler({ auth: 'public' })` | 6 | join, rejoin, heartbeat, chat, lobby areas |
| `requireSessionHost()` | 4 | archive, restore, token revoke/extend |
| Raw `export async function` (unwrapped) | 5 | participants, participants/[id], overrides, board/[code], session/[code], public/v1/* |

### 8.2 Rate Limiting Coverage

| Route | Tier | Limit |
|-------|------|-------|
| Join | `strict` | 5/min per IP |
| Rejoin | `api` | 100/min per IP |
| Heartbeat | `api` | 100/min per IP |
| Board/[code] | `api` (inline) | 100/min per IP |
| Session/[code] | `api` (inline) | 100/min per IP |
| Vote/puzzle/keypad | `participant` | 60/min per IP |
| All other wrapped routes | Default (`api`) | 100/min per IP |
| Unwrapped routes | None | ❌ No rate limiting |

---

## 9. Key Service Components

| File | Purpose |
|------|---------|
| `lib/services/participants/session-service.ts` | `ParticipantSessionService` — session CRUD, code generation, quota enforcement |
| `lib/services/participants/participant-token.ts` | Token generation, verification, expiry calculation, revocation |
| `lib/services/participants/session-code-generator.ts` | 6-char code generation, normalization, collision detection |
| `lib/api/play-auth.ts` | `resolveSessionViewer()`, `resolveParticipant()`, `REJECTED_PARTICIPANT_STATUSES` |
| `lib/api/route-handler.ts` | `apiHandler` wrapper with `auth: 'participant'` mode + `resolveParticipantAuth()` |
| `lib/play/session-guards.ts` | `PLAY_MUTATION_STATUS_POLICY` + `assertSessionStatus()` |
| `lib/play/session-command.ts` | `applySessionCommand()` — idempotent command pipeline |
| `lib/realtime/play-broadcast-server.ts` | `broadcastPlayEvent()` — centralized broadcast with atomic seq |

---

## 10. Key Client Hooks

| Hook | Location | Purpose |
|------|----------|---------|
| `useLiveSession` | `features/play/hooks/` | Real-time session state orchestration (play: channel) |
| `useParticipants` | `features/participants/hooks/` | Host-side participant list (postgres_changes) |
| `useSessionControl` | `features/participants/hooks/` | Host session lifecycle actions |
| `useParticipantRejoin` | `features/participants/hooks/` | Auto-rejoin on browser return |
| `useParticipantHeartbeat` | `features/participants/hooks/` | 30s presence pings + idle detection |
| `useParticipantBroadcast` | `features/participants/hooks/` | Session-level event listener (session: channel) |
