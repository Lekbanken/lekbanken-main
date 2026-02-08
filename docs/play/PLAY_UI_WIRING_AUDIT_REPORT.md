# Play UI Wiring Audit Report
## UI → API → DB Field Mapping (SSoT + Evidence)

**Version:** 2.2  
**Date:** 2026-02-08  
**Status:** Reference Document (Verified + Tests Added)  
**Scope:** All Play domain UI components, API endpoints, and database tables

---

## Changelog

| Version | Date | Changes |
|---------|------|------|
| v2.2 | 2026-02-08 | ✅ Added contract tests, ✅ Added Design Invariants section |
| v2.1 | 2026-02-08 | ✅ Fixed Board phase off-by-one bug, ✅ Exposed `step.phaseId` in `/game` endpoint |
| v2.0 | 2026-02-08 | Full verification audit with evidence, identified bugs |
| v1.0 | 2026-01-24 | Initial audit |

---

## Design Invariants

### Navigation vs Structure Truth

> **INVARIANT:** UI phase navigation is controlled by runtime indices (`participant_sessions.current_phase_index`); `game_steps.phase_id` / `step.phaseId` is for observability and future derivation, **not currently authoritative for runtime**.

This means:
- **Runtime navigation**: `current_step_index` and `current_phase_index` in `participant_sessions` control what the UI shows
- **Structural metadata**: `game_steps.phase_id` tells us which phase a step belongs to (design-time linkage)
- **Do NOT derive phase from step**: Future devs must not "fix" navigation by deriving `current_phase_index` from `steps[current_step_index].phase_id` without explicit migration

### Index vs Order Fields

| Field | Base | Source | Usage |
|-------|------|--------|-------|
| `current_step_index` | 0-based | Runtime | Array index into ordered steps |
| `current_phase_index` | 0-based | Runtime | Array index into ordered phases |
| `step_order` | 1-based | Design | Sort key for ordering |
| `phase_order` | 1-based | Design | Sort key for ordering |

**Contract tests:** [tests/unit/play/board-phase-contract.test.ts](../../tests/unit/play/board-phase-contract.test.ts), [tests/unit/play/game-phaseId-contract.test.ts](../../tests/unit/play/game-phaseId-contract.test.ts)

---

## 1. Executive Summary

This document provides a complete field-level audit of the Play UI wiring:
- **UI Components** → How they render data
- **API Endpoints** → What they return
- **DB Tables** → Source of truth (SSoT)

### Key Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| Host Cockpit | ✅ Well-wired | All fields traceable to DB |
| Board Display | ✅ Well-wired | Real-time sync working |
| Participant View | ✅ Well-wired | Token auth + limited data |
| Step/Phase Navigation | ✅ SSoT: `participant_sessions` | `current_step_index`, `current_phase_index` |
| Artifacts V2 | ✅ SSoT: `game_artifacts` + `session_artifact_state` | Config vs runtime state separated |
| Triggers | ✅ SSoT: `game_triggers` + `session_trigger_state` | Config vs fired state separated |
| Roles | ✅ SSoT: `session_roles` (snapshot from `game_roles`) | Immutable during session |

---

## 2. Core SSoT Tables

### 2.1 Session Runtime (participant_sessions)

**Table:** `public.participant_sessions`  
**Migration:** `20241210_create_participants_domain.sql` + `20251216160000_play_runtime_schema.sql`

| Column | Type | SSoT For | API Exposure |
|--------|------|----------|--------------|
| `id` | UUID | Session identity | All endpoints |
| `session_code` | TEXT | Join code (6-char) | `/api/play/board/[code]`, Join flow |
| `display_name` | TEXT | Session title | Host cockpit, Board |
| `status` | ENUM | Session state (draft/lobby/active/paused/ended) | All endpoints |
| `host_user_id` | UUID | Authorization | Internal only |
| `game_id` | UUID | Linked game | Determines steps/phases/artifacts |
| `plan_id` | UUID | Linked plan (optional) | Legacy support |
| `current_step_index` | INTEGER | Current step (0-based) | `/api/play/sessions/[id]/state` |
| `current_phase_index` | INTEGER | Current phase (0-based) | `/api/play/sessions/[id]/state` |
| `timer_state` | JSONB | Timer runtime | `{ started_at, duration_seconds, paused_at }` |
| `board_state` | JSONB | Board overrides | `{ message, overrides }` |
| `started_at` | TIMESTAMPTZ | Session start time | UI state resolution |
| `paused_at` | TIMESTAMPTZ | Pause timestamp | UI state resolution |
| `ended_at` | TIMESTAMPTZ | End timestamp | UI state resolution |
| `settings` | JSONB | Session config | `allow_rejoin`, `max_participants`, etc. |

### 2.2 Game Content (game_* tables)

**SSoT for immutable game design data:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `games` | Game metadata | `name`, `play_mode`, `min_players`, `max_players` |
| `game_steps` | Step content | `title`, `body`, `leader_script`, `participant_prompt`, `board_text`, `step_order` |
| `game_phases` | Phase structure | `name`, `description`, `phase_order`, `duration_seconds` |
| `game_roles` | Role definitions | `name`, `private_instructions`, `public_description`, `assignment_strategy` |
| `game_artifacts` | Artifact configs | `title`, `artifact_type`, `metadata`, `visibility` |
| `game_artifact_variants` | Artifact variants | `title`, `body`, `visibility`, `variant_order` |
| `game_triggers` | Trigger rules | `name`, `condition_type`, `action_type`, `execute_once` |
| `game_board_config` | Board theming | `theme`, `background_url`, `font_config` |

### 2.3 Session Runtime State (session_* tables)

**SSoT for mutable runtime data:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `session_roles` | Role snapshot at session start | Copied from `game_roles`, immutable during session |
| `session_artifact_state` | Artifact runtime state | `is_revealed`, `is_locked`, `state_metadata` |
| `session_artifact_variant_state` | Variant visibility | `revealed_at`, `highlighted_at` |
| `session_trigger_state` | Trigger fired status | `fired_at`, `fired_count`, `last_error` |
| `session_events` | Audit log | `event_type`, `event_data`, `actor_user_id` |
| `session_signals` | Signal history | `signal_type`, `channel`, `payload` |
| `session_time_bank` | Time bank balance | `balance_seconds`, `paused` |
| `session_decisions` | Decision state | `title`, `options`, `revealed_at` |
| `session_outcomes` | Outcome reveals | `title`, `body`, `outcome_type` |

---

## 3. UI Component → API → DB Mapping

### 3.1 Host Cockpit (`SessionCockpit.tsx`)

**Hook:** `useSessionState.ts`

#### Session Status Panel

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Session Code | `GET /api/play/sessions/[id]` | `session.sessionCode` | `participant_sessions.session_code` |
| Display Name | `GET /api/play/sessions/[id]` | `session.displayName` | `participant_sessions.display_name` |
| Status Badge | `GET /api/play/sessions/[id]` | `session.status` | `participant_sessions.status` |
| Started At | `GET /api/play/sessions/[id]` | `session.startedAt` | `participant_sessions.started_at` |
| Participant Count | `GET /api/play/sessions/[id]` | `session.participantCount` | `participant_sessions.participant_count` |

**Evidence:** [app/api/play/sessions/[id]/route.ts](app/api/play/sessions/%5Bid%5D/route.ts#L23-L55)

#### Step/Phase Navigation

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Current Step Index | `GET /api/play/sessions/[id]/state` | `session.current_step_index` | `participant_sessions.current_step_index` |
| Current Phase Index | `GET /api/play/sessions/[id]/state` | `session.current_phase_index` | `participant_sessions.current_phase_index` |
| Step List | `GET /api/play/sessions/[id]/game` | `steps[]` | `game_steps.*` |
| Phase List | `GET /api/play/sessions/[id]/game` | `phases[]` | `game_phases.*` |

**Evidence:** [app/api/play/sessions/[id]/state/route.ts](app/api/play/sessions/%5Bid%5D/state/route.ts#L79-L92), [app/api/play/sessions/[id]/game/route.ts](app/api/play/sessions/%5Bid%5D/game/route.ts#L280-L395)

#### Step Content (StepViewer.tsx)

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Step Title | `GET /api/play/sessions/[id]/game` | `steps[i].title` | `game_steps.title` |
| Step Description | `GET /api/play/sessions/[id]/game` | `steps[i].description` | `game_steps.body` |
| Leader Script | `GET /api/play/sessions/[id]/game` | `steps[i].leaderScript` | `game_steps.leader_script` |
| Participant Prompt | `GET /api/play/sessions/[id]/game` | `steps[i].participantPrompt` | `game_steps.participant_prompt` |
| Board Text | `GET /api/play/sessions/[id]/game` | `steps[i].boardText` | `game_steps.board_text` |
| Duration | `GET /api/play/sessions/[id]/game` | `steps[i].durationMinutes` | `game_steps.duration_seconds` (÷60) |
| Display Mode | `GET /api/play/sessions/[id]/game` | `steps[i].display_mode` | `game_steps.display_mode` |
| Phase ID | `GET /api/play/sessions/[id]/game` | `steps[i].phaseId` | `game_steps.phase_id` ✅ **NEW v2.1** |

**Evidence:** [app/api/play/sessions/[id]/game/route.ts](app/api/play/sessions/%5Bid%5D/game/route.ts#L375-L402)

#### Participants List

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Participant ID | `GET /api/play/sessions/[id]/participants` | `participants[i].id` | `participants.id` |
| Display Name | `GET /api/play/sessions/[id]/participants` | `participants[i].displayName` | `participants.display_name` |
| Status | `GET /api/play/sessions/[id]/participants` | `participants[i].status` | `participants.status` |
| Role | `GET /api/play/sessions/[id]/participants` | `participants[i].role` | `participants.role` |
| Joined At | `GET /api/play/sessions/[id]/participants` | `participants[i].joinedAt` | `participants.joined_at` |
| Last Seen | `GET /api/play/sessions/[id]/participants` | `participants[i].lastSeenAt` | `participants.last_seen_at` |

**Evidence:** [features/play-participant/api.ts](features/play-participant/api.ts)

#### Session Roles

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Role ID | `GET /api/play/sessions/[id]/roles` | `roles[i].id` | `session_roles.id` |
| Role Name | `GET /api/play/sessions/[id]/roles` | `roles[i].name` | `session_roles.name` |
| Icon | `GET /api/play/sessions/[id]/roles` | `roles[i].icon` | `session_roles.icon` |
| Color | `GET /api/play/sessions/[id]/roles` | `roles[i].color` | `session_roles.color` |
| Private Instructions | `GET /api/play/sessions/[id]/roles` | `roles[i].private_instructions` | `session_roles.private_instructions` |
| Public Description | `GET /api/play/sessions/[id]/roles` | `roles[i].public_description` | `session_roles.public_description` |
| Assigned Count | `GET /api/play/sessions/[id]/roles` | `roles[i].assigned_count` | `session_roles.assigned_count` |

**Note:** `session_roles` is a SNAPSHOT of `game_roles` created at session start. Immutable during session.

**Evidence:** [app/api/play/sessions/[id]/roles/route.ts](app/api/play/sessions/%5Bid%5D/roles/route.ts#L16-L66)

#### Artifacts Panel (ArtifactsPanel.tsx)

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Artifact ID | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].id` | `game_artifacts.id` |
| Title | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].title` | `game_artifacts.title` |
| Type | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].artifact_type` | `game_artifacts.artifact_type` |
| Visibility | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].visibility` | `game_artifacts.visibility` |
| Metadata (config) | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].metadata` | `game_artifacts.metadata` |
| State (runtime) | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].state` | `session_artifact_state.state_metadata` |
| Is Revealed | `GET /api/play/sessions/[id]/artifacts` | `artifacts[i].is_revealed` | `session_artifact_state.is_revealed` |

**V2 Architecture:** Config comes from `game_artifacts`, runtime state from `session_artifact_state`.

**Evidence:** [app/api/play/sessions/[id]/artifacts/route.ts](app/api/play/sessions/%5Bid%5D/artifacts/route.ts#L1-L100)

#### Triggers Panel (TriggerLivePanel.tsx)

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Trigger ID | `GET /api/play/sessions/[id]/triggers` | `triggers[i].id` | `game_triggers.id` |
| Name | `GET /api/play/sessions/[id]/triggers` | `triggers[i].name` | `game_triggers.name` |
| Enabled | `GET /api/play/sessions/[id]/triggers` | `triggers[i].enabled` | `game_triggers.enabled` |
| Execute Once | `GET /api/play/sessions/[id]/triggers` | `triggers[i].execute_once` | `game_triggers.execute_once` |
| Condition Type | `GET /api/play/sessions/[id]/triggers` | `triggers[i].condition_type` | `game_triggers.condition_type` |
| Action Type | `GET /api/play/sessions/[id]/triggers` | `triggers[i].action_type` | `game_triggers.action_type` |
| Fired Count | `GET /api/play/sessions/[id]/triggers` | `triggers[i].fired_count` | `session_trigger_state.fired_count` |
| Last Fired At | `GET /api/play/sessions/[id]/triggers` | `triggers[i].last_fired_at` | `session_trigger_state.fired_at` |

**Evidence:** [app/api/play/sessions/[id]/triggers](app/api/play/sessions/%5Bid%5D/triggers)

---

### 3.2 Board Display (`BoardClient.tsx`)

**Route:** `/board/[code]`  
**API:** `GET /api/play/board/[code]`

| UI Field | API Key | DB Table.Column |
|----------|---------|-----------------|
| Session Code | `session.code` | `participant_sessions.session_code` |
| Status | `session.status` | `participant_sessions.status` |
| Started At | `session.started_at` | `participant_sessions.started_at` |
| Ended At | `session.ended_at` | `participant_sessions.ended_at` |
| Current Step Index | `session.current_step_index` | `participant_sessions.current_step_index` |
| Current Phase Index | `session.current_phase_index` | `participant_sessions.current_phase_index` |
| Current Phase Name | `session.current_phase_name` | `game_phases.name` (by phase_order) |
| Current Step Title | `session.current_step_title` | `game_steps.title` (by step_order) |
| Current Step Board Text | `session.current_step_board_text` | `game_steps.board_text` OR `game_steps.body` |
| Timer State | `session.timer_state` | `participant_sessions.timer_state` |
| Board Message | `session.board_state.message` | `participant_sessions.board_state->>'message'` |
| Game Title | `game.title` | `games.name` |
| Board Theme | `game.board_config.theme` | `game_board_config.theme` |
| Revealed Variants | `artifacts.revealed_public_variants` | `session_artifact_variant_state` JOIN `game_artifact_variants` |
| Highlighted Variant | `artifacts.highlighted_variant` | `session_artifact_variant_state.highlighted_at` |
| Revealed Decisions | `decisions.revealed[]` | `session_decisions` WHERE `revealed_at IS NOT NULL` |
| Outcomes | `outcomes[]` | `session_outcomes` |

**Evidence:** [app/api/play/board/[code]/route.ts](app/api/play/board/%5Bcode%5D/route.ts#L1-L120)

---

### 3.3 Participant View (`ParticipantPlayView.tsx`)

**Route:** `/participants/view`  
**Auth:** `x-participant-token` header

| UI Field | API Endpoint | API Key | DB Table.Column |
|----------|--------------|---------|-----------------|
| Session Status | `GET /api/play/sessions/[id]/game` | (via session lookup) | `participant_sessions.status` |
| Current Step | `GET /api/play/sessions/[id]/game` | `steps[currentIndex]` | `game_steps.*` |
| Participant Prompt | `GET /api/play/sessions/[id]/game` | `steps[i].participantPrompt` | `game_steps.participant_prompt` |
| My Role | `GET /api/play/sessions/[id]/roles` | (filtered) | `session_roles` + `participant_role_assignments` |
| Private Instructions | (only for assigned role) | `role.private_instructions` | `session_roles.private_instructions` |
| Visible Artifacts | `GET /api/play/sessions/[id]/artifacts` | (filtered by visibility) | `game_artifacts` + `session_artifact_state` |

**Security Note:** Participants do NOT see:
- `leader_script` (host only)
- `correctCode` for keypads (sanitized)
- Other participants' roles
- Triggers

**Evidence:** [app/api/play/sessions/[id]/game/route.ts](app/api/play/sessions/%5Bid%5D/game/route.ts#L186-L225) (participant auth), [app/api/play/sessions/[id]/artifacts/route.ts](app/api/play/sessions/%5Bid%5D/artifacts/route.ts#L52-L95) (sanitization)

---

## 4. API Contract Summary

### 4.1 Session Endpoints

| Endpoint | Method | Auth | Purpose | Key Response Fields |
|----------|--------|------|---------|---------------------|
| `/api/play/sessions/[id]` | GET | Host | Session details | `sessionCode`, `displayName`, `status`, `gameId` |
| `/api/play/sessions/[id]` | PATCH | Host | Status change | `action: start\|pause\|end\|lock` |
| `/api/play/sessions/[id]/state` | GET | Host | Runtime state | `current_step_index`, `current_phase_index`, `timer_state` |
| `/api/play/sessions/[id]/state` | PATCH | Host | Update state | `action: set_step\|set_phase\|timer_*` |
| `/api/play/sessions/[id]/game` | GET | Host/Participant | Game content | `steps[]`, `phases[]`, `safety`, `tools[]` |
| `/api/play/sessions/[id]/roles` | GET | Host/Participant | Roles | `roles[]` (host: full, participant: public only) |
| `/api/play/sessions/[id]/artifacts` | GET | Host/Participant | Artifacts | `artifacts[]` (participant: sanitized metadata) |
| `/api/play/sessions/[id]/triggers` | GET | Host | Triggers | `triggers[]` with fired state |
| `/api/play/sessions/[id]/participants` | GET | Host | Participant list | `participants[]` with status |
| `/api/play/sessions/[id]/assignments` | GET/POST | Host | Role assignments | `assignments[]` |

### 4.2 Board Endpoint

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/play/board/[code]` | GET | Public | Board display data |

**Rate limiting:** 5s poll interval recommended

### 4.3 Participant Endpoints

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/participants/sessions/join` | POST | Public | Join session |
| `/api/participants/sessions/rejoin` | POST | Token | Rejoin session |
| `/api/participants/heartbeat` | POST | Token | Keep-alive |

---

## 5. Realtime Channels

### 5.1 Play Channel

**Channel:** `play:{sessionId}`  
**Events:**

| Event | Payload | Trigger |
|-------|---------|---------|
| `state_change` | `{ status, current_step_index, current_phase_index }` | PATCH `/state` |
| `play_event` | `{ type, payload, timestamp }` | Various state changes |
| `artifact_revealed` | `{ artifactId, variantId }` | Host reveals artifact |
| `signal_sent` | `{ signalType, channel }` | Host sends signal |

**Evidence:** [app/api/play/sessions/[id]/route.ts](app/api/play/sessions/%5Bid%5D/route.ts#L8-L20) (broadcastPlayEvent)

---

## 6. State Resolution (UI Mode)

**Function:** `resolveUiState()` in [lib/play/ui-state.ts](lib/play/ui-state.ts)

| Input | Output | Logic |
|-------|--------|-------|
| `status='active'`, `startedAt=null` | `'waiting'` | Session open but not started |
| `status='active'`, `startedAt=set` | `'live'` | Session running |
| `status='paused'` | `'paused'` | Session paused by host |
| `status='ended'` | `'ended'` | Session completed |
| `status='locked'` | `'locked'` | No new participants |
| `lastPollAt > 30s ago` | `'stale'` | Connection issues |

**Evidence:** [app/board/[code]/BoardClient.tsx](app/board/%5Bcode%5D/BoardClient.tsx#L113-L117)

---

## 7. Data Flow Diagrams

### 7.1 Host Session Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│ SessionCockpit  │────▶│ useSessionState hook │────▶│ Multiple API endpoints  │
│ (React UI)      │     │ (state aggregator)   │     │                         │
└─────────────────┘     └──────────────────────┘     │ GET /sessions/[id]      │
                                                      │ GET /sessions/[id]/game │
                                                      │ GET /sessions/[id]/roles│
                                                      │ GET /sessions/[id]/...  │
                                                      └───────────┬─────────────┘
                                                                  │
                                                      ┌───────────▼─────────────┐
                                                      │ Supabase Tables (SSoT)  │
                                                      │ - participant_sessions  │
                                                      │ - game_steps            │
                                                      │ - game_phases           │
                                                      │ - session_roles         │
                                                      │ - session_artifact_state│
                                                      └─────────────────────────┘
```

### 7.2 Board Display Flow

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────────┐
│ BoardClient     │────▶│ Poll every 5s        │────▶│ GET /api/play/board/    │
│ (React UI)      │     │ + Realtime channel   │     │     [code]              │
└─────────────────┘     └──────────────────────┘     └───────────┬─────────────┘
                                                                  │
                                                      ┌───────────▼─────────────┐
                                                      │ Supabase Tables (SSoT)  │
                                                      │ - participant_sessions  │
                                                      │ - games                 │
                                                      │ - game_steps            │
                                                      │ - game_phases           │
                                                      │ - session_artifact_*    │
                                                      │ - session_decisions     │
                                                      │ - session_outcomes      │
                                                      └─────────────────────────┘
```

---

## 8. Verification Checklist

### 8.1 Host Cockpit Fields

- [ ] Session code displays correctly
- [ ] Status badge reflects `participant_sessions.status`
- [ ] Participant count matches DB
- [ ] Steps load from `game_steps` via `/game` endpoint
- [ ] Phases load from `game_phases` via `/game` endpoint
- [ ] Current step navigation updates `current_step_index`
- [ ] Timer state persists in `timer_state` JSONB
- [ ] Roles snapshot from `game_roles` → `session_roles`
- [ ] Artifacts show with correct visibility
- [ ] Triggers display with fired state

### 8.2 Board Display Fields

- [ ] QR code generates with correct join URL
- [ ] Status banner reflects session state
- [ ] Current step/phase title displays
- [ ] Board text shows fallback to body if `board_text` null
- [ ] Revealed artifacts appear
- [ ] Highlighted variant emphasized
- [ ] Decisions show vote counts
- [ ] Outcomes display when revealed

### 8.3 Participant View Fields

- [ ] Join flow creates participant with token
- [ ] Participant prompt shows (not leader script)
- [ ] Assigned role displays private instructions
- [ ] Visible artifacts show sanitized metadata
- [ ] Keypad artifacts hide `correctCode`

---

## 9. Known Gaps & Future Work

| Gap | Description | Priority | Status |
|-----|-------------|----------|--------|
| `play_mode` routing | UI doesn't adapt based on `basic`/`facilitated`/`participants` | P1 | Open |
| Offline resilience | Board has safe-mode, but could be stronger | P2 | Open |
| Step-phase linkage | `phaseId` now exposed in `/game` endpoint, available for future use | P2 | ✅ AVAILABLE |
| Trigger engine | Client-side evaluation exists, server-side fire queue pending | P1 | Open |

### Bugs Fixed (v2.1)

| Bug | Severity | Fix | Evidence |
|-----|----------|-----|----------|
| Board phase lookup off-by-one | HIGH | Changed from direct `phase_order` lookup to array indexing | [board/[code]/route.ts#L51-L63](../../app/api/play/board/%5Bcode%5D/route.ts) |
| `step.phaseId` not exposed | MEDIUM | Added `phaseId` field to step response in `/game` endpoint | [game/route.ts#L399](../../app/api/play/sessions/%5Bid%5D/game/route.ts) |

---

## 10. References

### Key Files

| Category | File | Purpose |
|----------|------|---------|
| Types | [types/session-cockpit.ts](types/session-cockpit.ts) | UI state types |
| Types | [types/play-runtime.ts](types/play-runtime.ts) | Runtime types |
| Hook | [features/play/hooks/useSessionState.ts](features/play/hooks/useSessionState.ts) | State aggregator |
| API | [app/api/play/sessions/[id]/route.ts](app/api/play/sessions/%5Bid%5D/route.ts) | Session CRUD |
| API | [app/api/play/sessions/[id]/game/route.ts](app/api/play/sessions/%5Bid%5D/game/route.ts) | Game content |
| API | [app/api/play/board/[code]/route.ts](app/api/play/board/%5Bcode%5D/route.ts) | Board display |
| UI | [features/play/components/SessionCockpit.tsx](features/play/components/SessionCockpit.tsx) | Host cockpit |
| UI | [app/board/[code]/BoardClient.tsx](app/board/%5Bcode%5D/BoardClient.tsx) | Board client |
| Migration | [supabase/migrations/20251216160000_play_runtime_schema.sql](supabase/migrations/20251216160000_play_runtime_schema.sql) | Runtime columns |

### Related Documentation

- [PLAY_SYSTEM_DOCUMENTATION.md](../PLAY_SYSTEM_DOCUMENTATION.md) - Full system spec
- [PLAY_MODE_UI_AUDIT.md](../PLAY_MODE_UI_AUDIT.md) - UI routing audit
- [docs/PLAY_DOMAIN.md](PLAY_DOMAIN.md) - Domain overview
- [docs/PLAY_LOBBY_SOT.md](PLAY_LOBBY_SOT.md) - Lobby state spec

---

*Last updated: 2026-02-08*
