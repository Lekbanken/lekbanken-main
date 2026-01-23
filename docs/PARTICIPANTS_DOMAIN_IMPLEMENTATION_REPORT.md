# PARTICIPANTS DOMAIN – FULL IMPLEMENTATION REPORT

**Report Date:** 2025-12-10  
**Assessed Version:** Current `main` branch  
**Analysis Scope:** Complete repository scan for Participants Domain implementation

## Metadata

- Owner: -
- Status: archived
- Last validated: 2025-12-17

## 2025-12-17 validation addendum (supersedes the original conclusion)

The original finding (**"DOMAIN NOT IMPLEMENTED"**) is no longer accurate for the current repo state.

Verified implementation exists and is the source of truth here:
- [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md)

High-signal evidence in code:
- API routes:
   - `app/api/participants/**` (sessions, tokens, participant mgmt)
   - `app/api/play/**` (public participant surface; `join`/`rejoin` re-export participants handlers)
- Core services:
   - `lib/services/participants/session-service.ts`
   - `lib/services/participants/session-code-generator.ts`
   - `lib/services/participants/participant-token.ts`
- Generated DB types include participant tables:
   - `types/supabase.ts`

Behavior confirmed from route handlers (examples):
- Join enforces session status/expiry/capacity, generates token, inserts participant, logs activity.
- Rejoin validates token and session, rejects `kicked/blocked`, restores participant to `active`.
- Token lifecycle endpoints implement extend/revoke/cleanup.

Everything below this addendum should be treated as a **historical snapshot (2025-12-10)** and may not match the current implementation.

---

## 1. Domain Summary (Real Implementation)

### Current Reality (as of 2025-12-10): **DOMAIN NOT IMPLEMENTED** (superseded)

The Participants Domain as specified in DDD v1.0 **does not exist** in the current codebase. There is no implementation of:

- Temporary participant identities (anonymous join via code)
- Session codes / Join codes for game sessions
- Role assignment to participants within games
- Role cards / private information display
- Participant actions (votes, answers, choices)
- Host override capabilities
- Public board / projection view
- Reconnection / resilience mechanisms

### What Exists Instead

The codebase has **two tangentially related systems** that touch some concepts but do not fulfill the Participants Domain specification:

| System | Location | Purpose | Gap vs Specification |
|--------|----------|---------|---------------------|
| **Game Sessions (Play Domain)** | `lib/services/sessionService.ts`, `game_sessions` table | Single-player score tracking | No participants, no join codes, no roles |
| **Multiplayer Sessions (Social Domain)** | `lib/services/socialService.ts`, `multiplayer_sessions` table | Basic multiplayer lobby | Requires accounts, no anonymous join, no roles |

---

## 2. File Structure & Responsibilities

### Files That Should Exist But Don't

Based on the specification, these files/folders are expected but **completely absent**:

```
features/participants/                    ❌ Does not exist
├── components/
│   ├── JoinSessionForm.tsx              ❌ Missing
│   ├── ParticipantList.tsx              ❌ Missing
│   ├── RoleCard.tsx                     ❌ Missing
│   ├── ParticipantAction.tsx            ❌ Missing
│   └── PublicBoard.tsx                  ❌ Missing
├── services/
│   ├── participantJoinService.ts        ❌ Missing
│   ├── roleAssignmentService.ts         ❌ Missing
│   └── participantActionService.ts      ❌ Missing
└── types.ts                             ❌ Missing

lib/services/
├── participantService.ts                ❌ Missing

app/api/
├── session/join/route.ts                ❌ Missing
├── session/[code]/route.ts              ❌ Missing
├── participants/route.ts                ❌ Missing
└── participants/[id]/actions/route.ts   ❌ Missing

app/(play)/
├── join/page.tsx                        ❌ Missing
├── join/[code]/page.tsx                 ❌ Missing
└── session/[code]/participant/page.tsx  ❌ Missing
```

### Files That Exist (Related but Insufficient)

```
lib/services/
├── sessionService.ts        ✅ Exists - Single-player game sessions only
├── socialService.ts         ✅ Exists - Multiplayer lobby (account-based)

features/play/
├── PlayPage.tsx             ✅ Exists - Single-player instruction viewer
├── types.ts                 ✅ Exists - Step/GameRun types (no participants)
├── components/
│   ├── SessionHeader.tsx    ✅ Exists - Display only, no participant logic
│   ├── StepViewer.tsx       ✅ Exists - Step navigation
│   └── NavigationControls.tsx ✅ Exists - Step controls

app/app/play/
├── page.tsx                 ✅ Exists - Redirects to game selection
├── [gameId]/page.tsx        ✅ Exists - Single-player play view
└── plan/[planId]/page.tsx   ✅ Exists - Plan execution view
```

---

## 3. Architecture & Data Flow

### Expected Architecture (from Specification)

```
[Participant Device]
       │
       ▼ Join via SessionCode
┌──────────────────────┐
│  ParticipantJoinService  │
└──────────────────────┘
       │ Creates Participant
       ▼
┌──────────────────────┐
│  ParticipantSession  │
│  (Aggregate Root)    │
│  - participants[]    │
│  - roleAssignments[] │
│  - actions[]         │
└──────────────────────┘
       │ Publishes Events
       ▼
┌──────────────────────┐     ┌──────────────────────┐
│  Participant UI      │     │  Public Board        │
│  (private role view) │     │  (shared projection) │
└──────────────────────┘     └──────────────────────┘
```

### Actual Architecture (Current State)

```
[Authenticated User]
       │
   ▼ Navigate to /app/games/[gameId]
┌──────────────────────┐
│  Game Detail Page     │
│  (Start Session CTA)  │
└──────────────────────┘
   │ Creates participant session
       ▼
┌──────────────────────┐
│  API: /api/play/sessions │
└──────────────────────┘
   │ Returns session id + code
       ▼
┌──────────────────────┐
│  Host Cockpit         │
│  /app/play/sessions/[id] │
└──────────────────────┘
```

Note: `/app/play/[gameId]` is a legacy route and now redirects to `/app/games/[gameId]`.

**Critical Gap:** The current "Play" flow is a **single-user instruction viewer**, not a multi-participant session system.

---

## 4. Database & RLS Overview

### Expected Tables (from Specification)

| Table | Status | Description |
|-------|--------|-------------|
| `participant_sessions` | ❌ **MISSING** | Session aggregate with session_code, host_id, status |
| `participants` | ❌ **MISSING** | Temporary identities with displayName, status, role |
| `participant_actions` | ❌ **MISSING** | Votes, answers, choices with payload |
| `role_assignments` | ❌ **MISSING** | Participant ↔ Role mapping |
| `session_codes` | ❌ **MISSING** | Human-friendly join codes |

### Existing Tables (Partial Relevance)

#### `game_sessions` (Play Domain)
```sql
CREATE TABLE game_sessions (
  id                  uuid PRIMARY KEY,
  session_key         text UNIQUE,        -- ⚠️ Not a join code, just identifier
  game_id             uuid NOT NULL,
  user_id             uuid NOT NULL,      -- ⚠️ Single user, not participants
  tenant_id           uuid,
  status              session_status_enum,
  score               integer,
  duration_seconds    integer,
  started_at          timestamptz,
  ended_at            timestamptz
);
```
**Gap:** No participants, no join code logic, no roles.

#### `multiplayer_sessions` (Social Domain)
```sql
CREATE TABLE multiplayer_sessions (
  id                  uuid PRIMARY KEY,
  game_id             uuid NOT NULL,
  created_by_user_id  uuid NOT NULL,
  max_players         integer,
  current_players     integer,
  status              varchar,            -- waiting, in_progress, completed
  started_at          timestamp,
  ended_at            timestamp,
  winner_user_id      uuid
);
```
**Gap:** Requires authenticated users (not temporary), no roles, no session code.

#### `multiplayer_participants` (Social Domain)
```sql
CREATE TABLE multiplayer_participants (
  id          uuid PRIMARY KEY,
  session_id  uuid NOT NULL,
  user_id     uuid NOT NULL,              -- ⚠️ Requires account, not temporary
  score       integer,
  placement   integer,
  joined_at   timestamp
);
```
**Gap:** No displayName, no role, no status state machine, no participant token.

### RLS Policies

The existing tables have basic RLS but **no privacy isolation for role-based information** since roles don't exist:

- `multiplayer_sessions`: Anyone can view (too open for private games)
- `multiplayer_participants`: Anyone can view (no private data isolation)

---

## 5. API Overview (Real Implementation)

### Expected Endpoints (from Specification)

| Endpoint | Status | Description |
|----------|--------|-------------|
| `POST /api/session/join` | ❌ **MISSING** | Join via sessionCode + displayName |
| `GET /api/session/[code]` | ❌ **MISSING** | Get session by join code |
| `POST /api/session/[code]/rejoin` | ❌ **MISSING** | Reconnect with participantToken |
| `GET /api/participants/[id]` | ❌ **MISSING** | Get participant with role card |
| `POST /api/participants/[id]/actions` | ❌ **MISSING** | Submit action (vote/answer) |
| `POST /api/session/[id]/roles/assign` | ❌ **MISSING** | Trigger role assignment |
| `POST /api/session/[id]/host-override` | ❌ **MISSING** | Host overrides participant |

### Existing Endpoints (Tangentially Related)

| Endpoint | Implementation | Relevance |
|----------|---------------|-----------|
| `GET /api/games/[id]` | ✅ Full | Gets game definition, no session logic |
| `POST /api/plans/[id]/play` | ✅ Partial | Starts plan run, no participants |
| None for multiplayer | ❌ | `socialService.ts` is client-only |

---

## 6. UI & UX Implementation

### Expected UI Components (from Specification)

| Component | Status | Purpose |
|-----------|--------|---------|
| Join Screen | ❌ **MISSING** | Enter code + display name |
| Lobby View | ❌ **MISSING** | See other participants, wait for host |
| Role Card | ❌ **MISSING** | Private role information |
| Action Panel | ❌ **MISSING** | Vote/answer submission |
| Public Board | ❌ **MISSING** | Shared projection screen |
| Host Control Panel | ❌ **MISSING** | Override, reassign, kick |

### Existing UI (Not Participants)

| Component | Location | Purpose |
|-----------|----------|---------|
| `PlayPage` | `features/play/PlayPage.tsx` | Single-user instruction stepper |
| `SessionHeader` | `features/play/components/` | Title/metadata display |
| `StepViewer` | `features/play/components/` | Step content renderer |
| `NavigationControls` | `features/play/components/` | Previous/Next buttons |

**Gap:** All existing Play UI is for a **solo user following instructions**, not for **multi-participant interactive sessions**.

---

## 7. Core Domain Logic (Real Behaviour)

### 7.1 Participants – **NOT IMPLEMENTED**

No code exists for:
- Temporary participant creation
- DisplayName validation/uniqueness
- Participant status state machine
- Participant token generation/validation

### 7.2 Sessions – **PARTIALLY IMPLEMENTED (Wrong Model)**

**`sessionService.ts`** handles single-user game sessions:

```typescript
// Current: Single-user session
export async function startGameSession(params: SessionStartParams): Promise<GameSession | null> {
  const { gameId, userId, tenantId } = params;
  // Creates a session for ONE authenticated user
}
```

**Gap:** No multi-participant session, no join code, no host concept.

**`socialService.ts`** handles multiplayer lobbies:

```typescript
// Current: Account-based multiplayer
export async function createMultiplayerSession(
  gameId: string,
  userId: string,  // ⚠️ Requires account
  maxPlayers = 2
): Promise<MultiplayerSession | null>

export async function joinMultiplayerSession(
  sessionId: string,
  userId: string   // ⚠️ Requires account
): Promise<boolean>
```

**Gap:** Requires Supabase auth, no anonymous join, no session codes.

### 7.3 Roles – **NOT IMPLEMENTED**

No role assignment logic exists:
- No role definitions
- No role-to-participant mapping
- No role card rendering
- No role constraints validation

### 7.4 Actions – **NOT IMPLEMENTED**

No participant action system:
- No vote/answer/choice submission
- No action validation against game rules
- No action persistence
- No domain events for actions

### 7.5 Host Overrides – **NOT IMPLEMENTED**

No host control system:
- No override capability
- No action modification by host
- No audit trail for overrides

---

## 8. Cross-Domain Interactions

### Expected Interactions

| From | To | Interaction | Status |
|------|----|-------------|--------|
| Participants | Game Domain | Get role definitions | ❌ No roles in games |
| Participants | Game Domain | Validate action rules | ❌ No action system |
| Leader Domain | Participants | Create session | ❌ No leader domain |
| Participants | Analytics | Log participant events | ❌ No events |
| Participants | UI | Real-time updates | ❌ No realtime |

### Current Interactions

| From | To | Interaction | Status |
|------|----|-------------|--------|
| Play UI | Games API | Fetch game instructions | ✅ Works |
| Multiplayer Service | DB | Create/join lobby | ⚠️ Basic, no roles |

---

## 9. Detected Issues / Risks

### Critical Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| **Domain not implemented** | 🔴 Critical | Cannot run interactive group games |
| **No anonymous join** | 🔴 Critical | Participants must have accounts |
| **No role system** | 🔴 Critical | Cannot play role-based games (murder mystery) |
| **No private information** | 🔴 Critical | Cannot hide role cards from others |
| **No real-time sync** | 🔴 Critical | No live updates between participants |

### Architectural Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Wrong session model | 🟠 High | `game_sessions` is for scoring, not participation |
| Account dependency | 🟠 High | Multiplayer requires Supabase auth |
| No session codes | 🟠 High | No human-friendly join mechanism |
| No reconnection | 🟡 Medium | Disconnected users are lost |

### Security Concerns

| Issue | Severity | Impact |
|-------|----------|--------|
| No participant isolation | 🟠 High | Would leak private role info if implemented naively |
| No token auth | 🟠 High | No way to verify returning participants |

---

## 10. Improvement Recommendations

### Phase 1: Foundation (MUST)

1. **Create `participant_sessions` table**
   - session_code (unique, human-friendly)
   - host_id
   - game_id
   - status (waiting, running, paused, ended)
   - max_participants
   - expires_at

2. **Create `participants` table**
   - session_id (FK)
   - display_name
   - status (pending, joined, active, disconnected, left, kicked)
   - participant_token (unique, for reconnection)
   - joined_at

3. **Implement Join API**
   - `POST /api/session/join` with sessionCode + displayName
   - Return participantToken for subsequent requests
   - Validate uniqueness of displayName within session

### Phase 2: Roles & Privacy (MUST)

4. **Create `role_assignments` table**
   - participant_id (FK)
   - role_id
   - assigned_at
   - assigned_by (system/host)

5. **Create `participant_roles` table in Game Domain**
   - game_id
   - role_name
   - role_description
   - private_instructions (encrypted or RLS-protected)
   - max_count (e.g., 1 murderer)

6. **Implement RLS for privacy**
   - Participants can only see their own role_assignment
   - Host can see all
   - Other participants cannot see others' private data

### Phase 3: Actions & Real-time (SHOULD)

7. **Create `participant_actions` table**
   - participant_id
   - action_type (vote, answer, choice)
   - phase_id
   - payload (JSONB)
   - overridden_by_host_id (nullable)

8. **Implement Supabase Realtime**
   - Subscribe to session changes
   - Broadcast participant join/leave
   - Push role assignments
   - Sync action submissions

9. **Implement Host Override**
   - API endpoint for host to submit on behalf of participant
   - Audit trail with override reason

### Phase 4: UI Components (SHOULD)

10. **Build Participant UI**
    - `/join` page with code input
    - Lobby view with participant list
    - Role card component (private)
    - Action submission forms

11. **Build Host Control Panel**
    - Participant management
    - Role assignment interface
    - Override controls
    - Session lifecycle controls

12. **Build Public Board**
    - Projection-friendly view
    - Game state display (no private data)
    - Real-time updates

---

## 11. Documentation Updates Needed

| Document | Status | Action |
|----------|--------|--------|
| `PARTICIPANTS_DOMAIN.md` | ❌ Missing | Create with implementation details |
| `API.md` | ⚠️ Partial | Add session/participant endpoints |
| `SCHEMA.md` | ⚠️ Partial | Add participant tables |
| `REALTIME.md` | ❌ Missing | Document real-time architecture |
| `SECURITY.md` | ⚠️ Partial | Add participant privacy patterns |

---

## 12. TODO List

### MUST (Blocking for core functionality)

- [ ] Design and create `participant_sessions` table with session_code
- [ ] Design and create `participants` table with temporary identity model
- [ ] Implement `POST /api/session/join` for anonymous join
- [ ] Implement `GET /api/session/[code]` for session lookup
- [ ] Create participant token generation and validation
- [ ] Design role system integration with Game Domain
- [ ] Create `role_assignments` table with RLS
- [ ] Build Join UI component
- [ ] Build Participant Lobby component

### SHOULD (Important for full experience)

- [ ] Implement Supabase Realtime for live updates
- [ ] Build Role Card component with privacy
- [ ] Create `participant_actions` table
- [ ] Implement action submission API
- [ ] Build action submission UI (votes, answers)
- [ ] Implement host override system
- [ ] Build Host Control Panel
- [ ] Build Public Board projection view
- [ ] Add reconnection flow with participantToken

### COULD (Nice-to-have, future)

- [ ] Session expiry and cleanup jobs
- [ ] Participant kick functionality
- [ ] Role reassignment during game
- [ ] Analytics integration for participant behavior
- [ ] Session history for post-game review
- [ ] Avatar/color selection for participants
- [ ] Device info tracking for multi-device support

---

## 13. Deviations vs Intended Architecture

| Specification Requirement | Current State | Deviation Level |
|--------------------------|---------------|-----------------|
| Temporary participant identity | Not implemented | 🔴 **CRITICAL** |
| Session code join | Not implemented | 🔴 **CRITICAL** |
| DisplayName uniqueness per session | Not implemented | 🔴 **CRITICAL** |
| Role assignment | Not implemented | 🔴 **CRITICAL** |
| Private role cards | Not implemented | 🔴 **CRITICAL** |
| Participant actions | Not implemented | 🔴 **CRITICAL** |
| Host override | Not implemented | 🔴 **CRITICAL** |
| Reconnection flow | Not implemented | 🟠 **HIGH** |
| Public board projection | Not implemented | 🟠 **HIGH** |
| Real-time updates | Not implemented | 🟠 **HIGH** |
| Domain events | Not implemented | 🟡 **MEDIUM** |
| Analytics integration | Not implemented | 🟡 **MEDIUM** |

### Summary

**Implementation Status: 0%**

The Participants Domain is **entirely unimplemented**. The existing code has:

- **Play Domain**: Single-user instruction viewer (unrelated)
- **Social Domain**: Account-based multiplayer lobby (wrong model)

Neither provides the **anonymous temporary participation**, **role-based private information**, or **host control** mechanisms specified in the DDD v1.0 document.

**This domain requires greenfield implementation from scratch.**

---

## Appendix: Existing Code References

### sessionService.ts (Play Domain - Not Participants)
- Location: `lib/services/sessionService.ts`
- Purpose: Single-user game session scoring
- Lines: 449
- Key functions: `startGameSession`, `endGameSession`, `recordScore`

### socialService.ts (Social Domain - Partial Relevance)
- Location: `lib/services/socialService.ts`
- Purpose: Friends, leaderboards, multiplayer lobby
- Lines: 451
- Key functions: `createMultiplayerSession`, `joinMultiplayerSession`
- Gap: Requires accounts, no roles, no session codes

### PlayPage.tsx (Play Domain - Not Participants)
- Location: `features/play/PlayPage.tsx`
- Purpose: Step-by-step instruction viewer
- Lines: 428
- Gap: Solo user, no participant awareness

### Database Tables (Not Participants)
- `game_sessions`: Single-user scoring
- `multiplayer_sessions`: Account-based lobby
- `multiplayer_participants`: Account-based participants (no roles)
