# PARTICIPANTS DOMAIN – ARCHITECTURE SPECIFICATION

**Version:** 2.0  
**Date:** 2025-12-10  
**Status:** Design Phase (historical spec; not source of truth)  
**Based on:** DDD v1.0 Specification + Revised Design Discussion

## Metadata

- Owner: -
- Status: archived
- Last validated: 2025-12-17

This document is a **design/architecture spec** and contains pseudo-schema and planned behavior.

For the repo-anchored current implementation, see:
- [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md)

---

## 1. Executive Summary

This document defines the architecture for the Participants Domain – enabling **anonymous, temporary participation** in group games without requiring user accounts. The design supports both **ephemeral sessions** (single classroom use) and **persistent sessions** (multi-day campaigns).

### Key Principles

| Principle | Description |
|-----------|-------------|
| **Host = Account** | Leaders must be logged in (accountability, billing, analytics) |
| **Participant = Token** | Players join with displayName only, get a `participant_token` |
| **Zero Friction** | No signup for participants – just code + name |
| **Reconnection** | Token in localStorage enables seamless rejoin |
| **Privacy** | Role cards are private; RLS enforces isolation |

---

## 2. Identity Model

### 2.1 Two Identity Types

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEKBANKEN IDENTITY                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   HOST (Leader)                    PARTICIPANT (Player)         │
│   ─────────────                    ────────────────────         │
│   ✓ Logged in (Supabase Auth)      ✗ No account required        │
│   ✓ user_id in auth.users          ✓ participant_token          │
│   ✓ Full app access                ✓ Session-scoped identity    │
│   ✓ Creates sessions               ✓ Joins via session_code     │
│   ✓ Billing, analytics             ✓ Can later claim account    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Participant Token (GamePlayID)

```typescript
interface ParticipantIdentity {
  participant_id: string;      // UUID - internal DB ID
  participant_token: string;   // 32-char secret token (nanoid)
  display_name: string;        // Chosen by participant
  session_code: string;        // Session they belong to
}
```

**Token Storage (Client):**
```typescript
// localStorage key pattern
`lekbanken.participantToken.${sessionCode}` = participantToken

// Example
localStorage.setItem('lekbanken.participantToken.H3K9QF', 'abc123...');
```

### 2.3 Future Account Linking

Participants can optionally claim their history:
```sql
-- When participant creates/links an account
UPDATE participants 
SET user_id = 'authenticated-user-uuid'
WHERE participant_token = 'their-token';
```

---

## 3. Session Lifecycle

### 3.1 Persistence Modes

| Mode | `expires_at` | Use Case | Cleanup |
|------|-------------|----------|---------|
| `ephemeral` | +24h (default) | Vikarie, single class | Auto-delete after 72h |
| `persistent` | +30d | Multi-day campaign | Manual or 90d cleanup |

### 3.2 Session States

```
    ┌─────────┐
    │ WAITING │ ← Host creates session
    └────┬────┘
         │ Host starts
         ▼
    ┌─────────┐
    │ RUNNING │ ← Game in progress
    └────┬────┘
         │ Host pauses
         ▼
    ┌─────────┐
    │ PAUSED  │ ← Break / next day
    └────┬────┘
         │ Host resumes or ends
         ▼
    ┌─────────┐
    │  ENDED  │ ← Game complete
    └─────────┘
```

### 3.3 Participant States

```
    ┌─────────┐
    │ PENDING │ ← Just entered code
    └────┬────┘
         │ Enters displayName
         ▼
    ┌─────────┐
    │ JOINED  │ ← In lobby, waiting
    └────┬────┘
         │ Game starts
         ▼
    ┌─────────┐
    │ ACTIVE  │ ← Playing
    └────┬────┘
         │
    ┌────┴────┬──────────────┐
    ▼         ▼              ▼
┌──────┐ ┌────────────┐ ┌────────┐
│ LEFT │ │DISCONNECTED│ │ KICKED │
└──────┘ └─────┬──────┘ └────────┘
               │ Rejoin with token
               ▼
          ┌─────────┐
          │ ACTIVE  │
          └─────────┘
```

---

## 4. Database Schema

### 4.1 Core Tables

#### `participant_sessions`
```sql
CREATE TABLE participant_sessions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Join mechanism
  session_code        varchar(6) NOT NULL,  -- Human-friendly: H3K9QF
  
  -- Ownership
  host_user_id        uuid NOT NULL REFERENCES auth.users(id),
  tenant_id           uuid REFERENCES tenants(id),
  
  -- Game reference (one of these)
  game_id             uuid REFERENCES games(id),
  plan_id             uuid REFERENCES plans(id),
  
  -- State
  status              varchar(20) NOT NULL DEFAULT 'waiting',
  persistence_mode    varchar(20) NOT NULL DEFAULT 'ephemeral',
  current_phase       varchar(100),  -- For multi-phase games
  
  -- Limits
  max_participants    integer DEFAULT 50,
  
  -- Timestamps
  created_at          timestamptz DEFAULT now(),
  started_at          timestamptz,
  ended_at            timestamptz,
  expires_at          timestamptz NOT NULL,
  
  -- Constraints
  CONSTRAINT valid_status CHECK (status IN ('waiting', 'running', 'paused', 'ended')),
  CONSTRAINT valid_persistence CHECK (persistence_mode IN ('ephemeral', 'persistent')),
  CONSTRAINT valid_session_code CHECK (session_code ~ '^[A-Z0-9]{6}$')
);

-- Session code must be unique among active sessions
CREATE UNIQUE INDEX idx_active_session_codes 
ON participant_sessions(session_code) 
WHERE status != 'ended' AND expires_at > now();

-- Fast lookup by host
CREATE INDEX idx_sessions_by_host ON participant_sessions(host_user_id);
```

#### `participants`
```sql
CREATE TABLE participants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES participant_sessions(id) ON DELETE CASCADE,
  
  -- Identity
  display_name        varchar(50) NOT NULL,
  participant_token   varchar(64) NOT NULL UNIQUE,  -- Secret for rejoin
  
  -- Optional account link (for future claiming)
  user_id             uuid REFERENCES auth.users(id),
  
  -- State
  status              varchar(20) NOT NULL DEFAULT 'pending',
  
  -- Metadata
  device_info         jsonb,  -- Optional: browser, OS
  color               varchar(7),  -- Optional: #FF5733
  avatar_seed         varchar(20), -- For generated avatars
  
  -- Timestamps
  joined_at           timestamptz DEFAULT now(),
  last_seen_at        timestamptz DEFAULT now(),
  left_at             timestamptz,
  
  -- Constraints
  CONSTRAINT valid_participant_status CHECK (
    status IN ('pending', 'joined', 'active', 'disconnected', 'left', 'kicked')
  ),
  CONSTRAINT unique_display_name_per_session UNIQUE (session_id, display_name)
);

-- Fast token lookup for rejoin
CREATE INDEX idx_participant_token ON participants(participant_token);

-- Fast session participant list
CREATE INDEX idx_participants_by_session ON participants(session_id);
```

#### `participant_role_assignments`
```sql
CREATE TABLE participant_role_assignments (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id      uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  
  -- Role reference (from Game Domain)
  role_id             uuid NOT NULL,  -- References game_roles when that exists
  role_name           varchar(100) NOT NULL,  -- Denormalized for display
  
  -- Private data (only visible to this participant + host)
  private_instructions text,
  secret_info         jsonb,  -- Role-specific secrets
  
  -- Assignment metadata
  assigned_by         varchar(20) NOT NULL DEFAULT 'system',  -- 'system' | 'host'
  assigned_at         timestamptz DEFAULT now(),
  
  CONSTRAINT valid_assigned_by CHECK (assigned_by IN ('system', 'host'))
);

-- One role per participant (for now)
CREATE UNIQUE INDEX idx_one_role_per_participant 
ON participant_role_assignments(participant_id);
```

#### `participant_actions`
```sql
CREATE TABLE participant_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id          uuid NOT NULL REFERENCES participant_sessions(id) ON DELETE CASCADE,
  participant_id      uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  
  -- Action details
  action_type         varchar(50) NOT NULL,  -- vote, answer, choice, reveal, etc.
  phase_id            varchar(100),          -- Which game phase
  payload             jsonb NOT NULL,        -- Action-specific data
  
  -- Host override
  overridden_by       uuid REFERENCES auth.users(id),
  override_reason     text,
  original_payload    jsonb,  -- Saved if overridden
  
  -- Timestamps
  created_at          timestamptz DEFAULT now(),
  
  CONSTRAINT valid_action_type CHECK (
    action_type IN ('vote', 'answer', 'choice', 'reveal', 'submit', 'skip')
  )
);

-- Fast action queries
CREATE INDEX idx_actions_by_session ON participant_actions(session_id);
CREATE INDEX idx_actions_by_participant ON participant_actions(participant_id);
CREATE INDEX idx_actions_by_phase ON participant_actions(session_id, phase_id);
```

### 4.2 Session Code Generation

```sql
-- Function to generate unique session code
CREATE OR REPLACE FUNCTION generate_session_code()
RETURNS varchar(6) AS $$
DECLARE
  chars text := 'ACDEFGHJKMNPQRTUVWXY3479';  -- No confusing chars
  code varchar(6);
  attempts int := 0;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    
    -- Check if code is unique among active sessions
    IF NOT EXISTS (
      SELECT 1 FROM participant_sessions 
      WHERE session_code = code 
      AND status != 'ended' 
      AND expires_at > now()
    ) THEN
      RETURN code;
    END IF;
    
    attempts := attempts + 1;
    IF attempts > 100 THEN
      RAISE EXCEPTION 'Could not generate unique session code';
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

### 4.3 RLS Policies

```sql
-- Enable RLS
ALTER TABLE participant_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_role_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE participant_actions ENABLE ROW LEVEL SECURITY;

-- Sessions: Host can do everything, public can view active sessions by code
CREATE POLICY "Host full access" ON participant_sessions
  FOR ALL USING (host_user_id = auth.uid());

CREATE POLICY "Public can view active sessions by code" ON participant_sessions
  FOR SELECT USING (status != 'ended' AND expires_at > now());

-- Participants: Visible to host and other participants in same session
CREATE POLICY "Host sees all participants" ON participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM participant_sessions 
      WHERE id = participants.session_id 
      AND host_user_id = auth.uid()
    )
  );

CREATE POLICY "Participants see each other" ON participants
  FOR SELECT USING (
    session_id IN (
      SELECT session_id FROM participants WHERE participant_token = current_setting('app.participant_token', true)
    )
  );

-- Role assignments: Only visible to the participant + host
CREATE POLICY "Host sees all roles" ON participant_role_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM participants p
      JOIN participant_sessions s ON s.id = p.session_id
      WHERE p.id = participant_role_assignments.participant_id
      AND s.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Participant sees own role" ON participant_role_assignments
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants 
      WHERE participant_token = current_setting('app.participant_token', true)
    )
  );

-- Actions: Visible to host, own actions visible to participant
CREATE POLICY "Host sees all actions" ON participant_actions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM participant_sessions 
      WHERE id = participant_actions.session_id 
      AND host_user_id = auth.uid()
    )
  );

CREATE POLICY "Participant sees own actions" ON participant_actions
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM participants 
      WHERE participant_token = current_setting('app.participant_token', true)
    )
  );
```

---

## 5. API Design

### 5.1 Host Endpoints (Authenticated)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/play/sessions` | Create new session |
| `GET` | `/api/play/sessions` | List host's sessions |
| `GET` | `/api/play/sessions/[id]` | Get session details |
| `PATCH` | `/api/play/sessions/[id]` | Update session (start/pause/end) |
| `DELETE` | `/api/play/sessions/[id]` | Delete session |
| `GET` | `/api/play/sessions/[id]/participants` | List all participants |
| `PATCH` | `/api/play/sessions/[id]/participants/[pid]` | Kick/modify participant |
| `POST` | `/api/play/sessions/[id]/roles/assign` | Trigger role assignment |
| `POST` | `/api/play/sessions/[id]/override` | Override participant action |

### 5.2 Participant Endpoints (Token-based)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/play/join` | Join session (code + displayName) |
| `POST` | `/api/play/rejoin` | Rejoin with participantToken |
| `GET` | `/api/play/session/[code]` | Get public session info |
| `GET` | `/api/play/me` | Get own participant + role |
| `POST` | `/api/play/actions` | Submit action |
| `GET` | `/api/play/state` | Get current game state |

### 5.3 Request/Response Examples

#### Create Session (Host)
```typescript
// POST /api/play/sessions
// Authorization: Bearer <supabase-jwt>

// Request
{
  "game_id": "uuid",           // or plan_id
  "persistence_mode": "ephemeral",
  "max_participants": 30
}

// Response 201
{
  "id": "session-uuid",
  "session_code": "H3K9QF",
  "status": "waiting",
  "join_url": "https://play.lekbanken.no/join/H3K9QF",
  "qr_code_url": "https://api.lekbanken.no/qr/H3K9QF",
  "expires_at": "2025-12-11T14:00:00Z"
}
```

#### Join Session (Participant)
```typescript
// POST /api/play/join
// No auth required

// Request
{
  "session_code": "H3K9QF",
  "display_name": "Anna"
}

// Response 201
{
  "participant_id": "participant-uuid",
  "participant_token": "abc123def456...",  // Store in localStorage!
  "display_name": "Anna",
  "session": {
    "id": "session-uuid",
    "status": "waiting",
    "game_title": "Mordmysteriet"
  }
}

// Error 409 (name taken)
{
  "error": "display_name_taken",
  "message": "Navnet 'Anna' er allerede tatt i denne sesjonen"
}
```

#### Rejoin Session (Participant)
```typescript
// POST /api/play/rejoin
// No auth required

// Request
{
  "session_code": "H3K9QF",
  "participant_token": "abc123def456..."
}

// Response 200
{
  "participant_id": "participant-uuid",
  "display_name": "Anna",
  "status": "active",
  "session": {
    "id": "session-uuid",
    "status": "running",
    "current_phase": "investigation"
  },
  "role": {
    "role_name": "Detektiv",
    "private_instructions": "Du skal finne morderen..."
  }
}

// Error 404
{
  "error": "participant_not_found",
  "message": "Kunne ikke finne din deltaker. Prøv å bli med på nytt."
}
```

#### Get Own State (Participant)
```typescript
// GET /api/play/me
// Header: X-Participant-Token: abc123def456...

// Response 200
{
  "participant": {
    "id": "uuid",
    "display_name": "Anna",
    "status": "active"
  },
  "session": {
    "id": "uuid",
    "status": "running",
    "current_phase": "voting"
  },
  "role": {
    "role_name": "Detektiv",
    "private_instructions": "..."
  },
  "pending_action": {
    "type": "vote",
    "prompt": "Hvem tror du er morderen?",
    "options": ["Erik", "Lisa", "Johan"]
  }
}
```

---

## 6. User Flows

### 6.1 Flow A: Vikarie Session (Ephemeral)

```
┌─────────────────────────────────────────────────────────────────┐
│ HOST (Vikarie-lärare)                                           │
│                                                                 │
│ 1. Loggar in på app.lekbanken.no                                │
│ 2. Väljer lek från browse eller plan                            │
│ 3. Trycker "Start session"                                      │
│    → Backend skapar:                                            │
│       • participant_session (ephemeral, expires +24h)           │
│       • session_code: H3K9QF                                    │
│ 4. Visar på projektor: "Gå til play.lekbanken.no – kod H3K9QF"  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ ELEVER (Participants)                                           │
│                                                                 │
│ 1. Går till play.lekbanken.no på sin telefon                   │
│ 2. Skriver kod: H3K9QF                                         │
│ 3. Skriver visningsnamn: "Anna"                                │
│    → Backend skapar:                                            │
│       • participant (status: joined)                            │
│       • participant_token → localStorage                        │
│ 4. Ser lobby: "Väntar på att spelet startar..."                │
│ 5. (Host startar) → Får sin roll/uppgift                       │
│ 6. Spelar!                                                      │
│                                                                 │
│ [Session raderas automatiskt efter 72h]                         │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Flow B: Flerdagars Session (Persistent)

```
┌─────────────────────────────────────────────────────────────────┐
│ DAG 1                                                           │
│                                                                 │
│ [Samma som ovan, men host väljer "persistent"]                  │
│ Host pausar sessionen → status = 'paused'                       │
│ Elever stänger telefoner                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ DAG 2                                                           │
│                                                                 │
│ HOST                                                            │
│ 1. Loggar in                                                    │
│ 2. Går till "Mina sessioner" → ser H3K9QF (paused)              │
│ 3. Trycker "Återuppta"                                          │
│                                                                 │
│ ELEVER                                                          │
│ 1. Går till play.lekbanken.no                                  │
│ 2. Skriver samma kod: H3K9QF                                   │
│ 3. Browser hittar participant_token i localStorage              │
│    → Automatisk rejoin!                                         │
│ 4. Samma roll, samma progress                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ EDGE CASE: Elev har ny enhet                                    │
│                                                                 │
│ 1. Skriver kod: H3K9QF                                         │
│ 2. Inget token hittas                                           │
│ 3. Visar: "Har du spelat förut?"                                │
│    [Ja, men ny enhet] → Host kan para ihop manuellt             │
│    [Nej, ny spelare]  → Skapar ny participant                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Flow C: Host Control Panel

```
┌─────────────────────────────────────────────────────────────────┐
│ HOST PANEL (app.lekbanken.no/play/sessions/[id])                │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Session: Mordmysteriet           Kod: H3K9QF    [RUNNING]  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ DELTAGARE (12/30)                                               │
│ ┌──────────────────────────────────────────────────────────┐   │
│ │ 🟢 Anna      Detektiv     [Kicka] [Byt roll]             │   │
│ │ 🟢 Erik      Mördare      [Kicka] [Byt roll]             │   │
│ │ 🟡 Lisa      Vittne       [Disconnected] [Ersätt]        │   │
│ │ 🟢 Johan     Offer        [Kicka] [Byt roll]             │   │
│ │ ...                                                       │   │
│ └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│ KONTROLLER                                                      │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │   Pausa     │ │  Nästa fas  │ │  Avsluta    │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
│                                                                 │
│ PUBLIC BOARD                                                    │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Öppna projektorvy] → play.lekbanken.no/board/H3K9QF       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Frontend Architecture

### 7.1 Routes (play.lekbanken.no)

```
play.lekbanken.no/
├── /                           → Landing: "Skriv din kod"
├── /join                       → Same as /
├── /join/[code]                → Pre-filled code, enter name
├── /session/[code]             → Participant view (lobby/game)
├── /session/[code]/role        → Private role card
├── /board/[code]               → Public board (projektor)
└── /offline                    → PWA offline fallback
```

### 7.2 Component Structure

```
features/play-participant/
├── components/
│   ├── JoinForm.tsx            → Code + name input
│   ├── Lobby.tsx               → Waiting for host
│   ├── ParticipantList.tsx     → See other players
│   ├── RoleCard.tsx            → Private role display
│   ├── ActionPanel.tsx         → Vote/answer/choice
│   ├── GameStateView.tsx       → Current phase info
│   └── DisconnectedBanner.tsx  → "Reconnecting..."
├── hooks/
│   ├── useParticipantSession.ts
│   ├── useParticipantToken.ts
│   └── useSessionPolling.ts    → MVP: polling, later realtime
├── services/
│   ├── participantApi.ts       → API calls
│   └── tokenStorage.ts         → localStorage helpers
└── types.ts
```

### 7.3 Token Management

```typescript
// features/play-participant/services/tokenStorage.ts

const TOKEN_PREFIX = 'lekbanken.participantToken';

export function getStoredToken(sessionCode: string): string | null {
  return localStorage.getItem(`${TOKEN_PREFIX}.${sessionCode}`);
}

export function storeToken(sessionCode: string, token: string): void {
  localStorage.setItem(`${TOKEN_PREFIX}.${sessionCode}`, token);
}

export function clearToken(sessionCode: string): void {
  localStorage.removeItem(`${TOKEN_PREFIX}.${sessionCode}`);
}

export function getAllStoredSessions(): { code: string; token: string }[] {
  const sessions: { code: string; token: string }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(TOKEN_PREFIX)) {
      const code = key.replace(`${TOKEN_PREFIX}.`, '');
      const token = localStorage.getItem(key);
      if (token) sessions.push({ code, token });
    }
  }
  return sessions;
}
```

---

## 8. Implementation Roadmap

### Phase MVP (2-3 weeks)

**Goal:** Basic join flow works, no realtime

| Task | Priority | Estimate |
|------|----------|----------|
| Create `participant_sessions` table + RLS | P0 | 4h |
| Create `participants` table + RLS | P0 | 4h |
| Session code generation function | P0 | 2h |
| `POST /api/play/sessions` (host creates) | P0 | 4h |
| `POST /api/play/join` (participant joins) | P0 | 4h |
| `POST /api/play/rejoin` (with token) | P0 | 3h |
| `GET /api/play/session/[code]` | P0 | 2h |
| `GET /api/play/me` | P0 | 2h |
| Join UI (`/join`, `/join/[code]`) | P0 | 6h |
| Lobby UI (waiting, participant list) | P0 | 4h |
| Token storage helpers | P0 | 2h |
| Host panel (basic: list participants) | P1 | 4h |
| **Total MVP** | | **~41h** |

### Phase V1.5 (1-2 weeks)

**Goal:** Host can control session, basic game state

| Task | Priority | Estimate |
|------|----------|----------|
| Session state transitions (start/pause/end) | P0 | 4h |
| `PATCH /api/play/sessions/[id]` | P0 | 3h |
| Host control buttons | P0 | 4h |
| Polling for session state | P0 | 4h |
| "Game started" participant view | P0 | 4h |
| Participant status updates (disconnect detect) | P1 | 4h |
| **Total V1.5** | | **~23h** |

### Phase V2 (2-3 weeks)

**Goal:** Roles, realtime, actions

| Task | Priority | Estimate |
|------|----------|----------|
| `participant_role_assignments` table | P0 | 3h |
| Role assignment logic | P0 | 6h |
| RoleCard component (private) | P0 | 4h |
| Supabase Realtime setup | P0 | 6h |
| Real-time participant join/leave | P0 | 4h |
| `participant_actions` table | P1 | 3h |
| Action submission API | P1 | 4h |
| Action UI (vote/answer) | P1 | 6h |
| Host override capability | P1 | 4h |
| Public Board view | P2 | 6h |
| **Total V2** | | **~46h** |

### Phase V3 (Future)

| Task | Priority |
|------|----------|
| Gamification events integration | P2 |
| Participant analytics | P2 |
| Account claiming flow | P2 |
| Offline/PWA support | P3 |
| Advanced host controls (reassign, etc.) | P3 |
| Session history/replay | P3 |

---

## 9. Technical Decisions

### 9.1 Session Code Charset

```
ACDEFGHJKMNPQRTUVWXY3479
```
- **22 characters** (excludes confusing: `0O`, `1IL`, `B8`, `S5`, `Z2`)
- **6 positions** = 22^6 = **113 million** combinations
- **Probability of collision:** Near zero with active session check

### 9.2 Participant Token Format

```typescript
import { nanoid } from 'nanoid';

const participantToken = nanoid(32);  
// Example: "V1StGXR8_Z5jdHi6B-myT3kk9L2Q4Nm1"
```
- **32 characters** = 2^192 bits of entropy
- **Never in URLs** – only in localStorage + headers
- **Rotatable** on rejoin if needed

### 9.3 MVP: Polling vs Realtime

**MVP:** Polling every 3 seconds
```typescript
const { data } = useSWR('/api/play/state', fetcher, { refreshInterval: 3000 });
```

**V2:** Supabase Realtime
```typescript
const channel = supabase
  .channel(`session:${sessionCode}`)
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'participants',
    filter: `session_id=eq.${sessionId}`
  }, handleChange)
  .subscribe();
```

### 9.4 Why `play.lekbanken.no`?

| Reason | Impact |
|--------|--------|
| Clean UX | "Gå til play.lekbanken.no" fits on a whiteboard |
| Separate deploy | Can be a lighter PWA build |
| Different auth model | Participant tokens vs Supabase sessions |
| Future scaling | Could be edge-deployed separately |

**Start:** `/play` routes in main app, extract later if needed.

---

## 10. Security Considerations

### 10.1 Token Security

| Risk | Mitigation |
|------|------------|
| Token theft | HTTPS only, never in URLs |
| Token reuse | One token per session per device |
| Brute force | 32-char token = infeasible |
| Session hijacking | Token bound to session_id |

### 10.2 RLS Verification

- **Participant token** set via `current_setting('app.participant_token')`
- **Supabase Edge Functions** or **API middleware** must set this
- **Never trust client** to send participant_id without token verification

### 10.3 Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `POST /api/play/join` | 10 req/min per IP |
| `POST /api/play/rejoin` | 30 req/min per IP |
| `GET /api/play/state` | 60 req/min per token |

---

## 11. Open Questions

| Question | Options | Recommendation |
|----------|---------|----------------|
| Where to deploy play UI? | Same Next.js app vs separate | **Same app, `/play` routes** for MVP |
| Token rotation on rejoin? | Yes/No | **No** for MVP, simpler |
| Multiple roles per participant? | Yes/No | **No** for MVP, one role |
| Device fingerprinting? | Yes/No | **No**, privacy concern |
| Session code reuse after end? | Yes/No | **Yes**, after 24h buffer |

---

## 12. Appendix: Full Type Definitions

```typescript
// features/play-participant/types.ts

export type SessionStatus = 'waiting' | 'running' | 'paused' | 'ended';
export type PersistenceMode = 'ephemeral' | 'persistent';
export type ParticipantStatus = 'pending' | 'joined' | 'active' | 'disconnected' | 'left' | 'kicked';
export type ActionType = 'vote' | 'answer' | 'choice' | 'reveal' | 'submit' | 'skip';

export interface ParticipantSession {
  id: string;
  session_code: string;
  host_user_id: string;
  game_id?: string;
  plan_id?: string;
  status: SessionStatus;
  persistence_mode: PersistenceMode;
  current_phase?: string;
  max_participants: number;
  created_at: string;
  started_at?: string;
  ended_at?: string;
  expires_at: string;
}

export interface Participant {
  id: string;
  session_id: string;
  display_name: string;
  participant_token?: string;  // Only returned on join/rejoin
  user_id?: string;
  status: ParticipantStatus;
  color?: string;
  avatar_seed?: string;
  joined_at: string;
  last_seen_at: string;
  left_at?: string;
}

export interface RoleAssignment {
  id: string;
  participant_id: string;
  role_id: string;
  role_name: string;
  private_instructions?: string;
  secret_info?: Record<string, unknown>;
  assigned_by: 'system' | 'host';
  assigned_at: string;
}

export interface ParticipantAction {
  id: string;
  session_id: string;
  participant_id: string;
  action_type: ActionType;
  phase_id?: string;
  payload: Record<string, unknown>;
  overridden_by?: string;
  override_reason?: string;
  created_at: string;
}

// API Response Types
export interface JoinResponse {
  participant_id: string;
  participant_token: string;
  display_name: string;
  session: {
    id: string;
    status: SessionStatus;
    game_title: string;
  };
}

export interface ParticipantState {
  participant: Participant;
  session: ParticipantSession;
  role?: RoleAssignment;
  pending_action?: {
    type: ActionType;
    prompt: string;
    options?: string[];
    deadline?: string;
  };
}
```

---

## 13. Game Domain Integration: Play-Ready Game Model

### 13.1 Design Principles

For games to work seamlessly across Browse, Play, Planner, Participants, and Gamification domains, the game model must support:

| Principle | Implementation |
|-----------|----------------|
| **One game, many contexts** | Base game + context adaptations (not clones) |
| **Detailed execution plans** | Structured steps with leader scripts, timers, visual cues |
| **General adaptations** | Adaptation hints per step (younger/older, indoors/outdoors, fewer/more players) |
| **Product neutrality** | Classification via tags, not hardcoded product logic |
| **Role-based mechanics** | Structured roles with private instructions for Participants Domain |

### 13.2 Core Field Groups

#### A. Base Metadata
```typescript
interface Game {
  // Identity
  id: string;
  slug: string;
  title: string;
  short_description: string;      // 1-2 sentences for cards
  description?: string;            // Full description
  language: 'sv' | 'no' | 'en';
  created_by_user_id: string;
  
  // Status
  status: 'draft' | 'review' | 'published' | 'archived';
  
  // Context
  environment: 'indoors' | 'outdoors' | 'either';
  difficulty_level: 1 | 2 | 3 | 4 | 5;
  energy_level: 1 | 2 | 3 | 4 | 5;
  noise_level: 1 | 2 | 3 | 4 | 5;
}
```

#### B. Classification (Product + Purpose Integration)
```typescript
interface GameClassification {
  // Product Domain
  product_ids: string[];              // ['school', 'football', 'confirmation']
  
  // Purpose Domain
  main_purpose_ids: string[];         // ['cooperation', 'trust']
  sub_purpose_ids: string[];          // ['communication', 'creativity']
  
  // Location suitability
  suitable_locations: ('classroom' | 'gym' | 'outdoor_field' | 'hallway' | 'any')[];
}
```

#### C. Participants & Duration
```typescript
interface GameParticipants {
  age_min: number;
  age_max: number;
  players_min: number;
  players_max: number;
  players_optimal_min?: number;
  players_optimal_max?: number;
  group_structure: 'whole_group' | 'pairs' | 'small_groups' | 'teams' | 'mixed';
  estimated_duration_minutes: number;
}
```

#### D. Materials & Safety
```typescript
interface GameMaterial {
  name: string;
  quantity_type: 'per_person' | 'per_team' | 'total';
  quantity?: number;
  substitutions?: string;              // "Plastmuggar fungerar om ni saknar konor"
}

interface GameSafety {
  materials: GameMaterial[];
  safety_notes: string[];              // ["Se upp för väggar", "Undvik glatta golv"]
  inclusion_notes: string[];           // Tips för nedsatt rörlighet, neurodivergenta etc.
}
```

#### E. Execution Plan (Steps) – **CORE FOR PLAY DOMAIN**

```typescript
type StepType = 
  | 'prep'           // Förberedelser
  | 'explain'        // Instruktion till grupp
  | 'demo'           // Demonstration
  | 'run'            // Genomför aktivitet
  | 'reflection'     // Reflektionsfråga
  | 'cooldown'       // Avslut
  | 'rules'          // Regler
  | 'tips';          // Tips & variationer

interface GameStep {
  id: string;
  section: 'preparation' | 'intro' | 'main' | 'ending' | 'rules' | 'tips';
  step_type: StepType;
  order: number;
  
  // Content
  title: string;
  leader_script?: string;            // "Säg så här till gruppen..."
  description: string;               // Vad som ska göras
  expected_outcome?: string;         // "Nu ska alla ha hittat en partner"
  
  // Timing
  estimated_duration_seconds?: number;
  timer_config?: {
    enabled: boolean;
    seconds: number;
    show_traffic_light?: boolean;    // grön → gul → röd
    sound?: 'beep' | 'gong' | 'none';
    vibration?: boolean;
  };
  
  // UX
  visual_cues?: ('gather' | 'move' | 'split_into_groups' | 'listen' | 'reflect')[];
  
  // Adaptations
  adaptation_hints?: {
    younger?: string;                // "För yngre: förenkla reglerna..."
    older?: string;                  // "För äldre: lägg till tävlingsmoment..."
    fewer_players?: string;          // "Vid <10 spelare: hoppa över lag..."
    many_players?: string;           // "Vid >30: dela i flera grupper..."
    indoors?: string;                // "Inomhus: minska avståndet..."
    outdoors?: string;               // "Utomhus: öka ytan..."
  };
}
```

**Why this structure matters for Play Domain:**
- Play UI can show "teleprompter" mode with leader scripts
- Timer integration is built-in
- Visual cues guide leader through phases
- Adaptation hints provide contextual help without creating game clones

#### F. Context Adaptations – **KEY FOR MULTI-PRODUCT STRATEGY**

Instead of creating separate games for school/football/church, use:

```typescript
interface GameContext {
  id: string;
  name: string;                     // "Skola – Idrott"
  slug: string;                     // "school_pe"
  product_id: string;               // FK to products table
  description?: string;
}

interface GameContextAdaptation {
  game_id: string;
  context_id: string;               // FK to game_contexts
  
  // Overrides
  title_override?: string;          // Alternative title for this context
  intro_override?: string;          // "I fotbollsträningen presenterar du så här..."
  rule_adjustments?: string;        // "Spela kortare intervaller för U9"
  
  // Context-specific content
  reflection_prompts?: string[];    // Specific reflection questions
  emphasis?: string;                // "Fokusera på passningskvalitet"
}
```

**Example:**
- **Base game:** "Stoppdans" (neutral)
- **Adaptations:**
  - `school_pe`: Emphasize inclusion, all must participate
  - `football_training`: Add ball control between music pauses
  - `church_youth`: Use Christian music, add reflection on togetherness

**Database structure:**
```sql
CREATE TABLE game_contexts (
  id uuid PRIMARY KEY,
  name varchar(100),
  slug varchar(100) UNIQUE,
  product_id uuid REFERENCES products(id),
  description text
);

CREATE TABLE game_context_adaptations (
  id uuid PRIMARY KEY,
  game_id uuid REFERENCES games(id),
  context_id uuid REFERENCES game_contexts(id),
  title_override text,
  intro_override text,
  rule_adjustments text,
  reflection_prompts jsonb,
  emphasis text,
  UNIQUE(game_id, context_id)
);
```

#### G. Roles (Participants Domain Integration)

For games requiring roles (murder mystery, team exercises, etc.):

```typescript
interface GameRole {
  id: string;
  game_id: string;
  name: string;                     // "Mördare", "Detektiv", "Vittne"
  public_description?: string;      // Shown on public board
  private_instructions: string;     // Only visible to participant with this role
  
  // Constraints
  min_count?: number;               // At least X of this role
  max_count?: number;               // At most Y of this role
  
  // Assignment
  assignment_strategy?: 'random' | 'host_picks' | 'self_select' | 'balanced';
  conflicts_with?: string[];        // Role IDs that can't coexist
  
  // Recommended distribution
  recommended_at_players?: {        // "Med 12 spelare: 1 mördare, 2 detektiver"
    player_count: number;
    role_count: number;
  }[];
}
```

**Integration with Participants Domain:**
- When host starts session with role-based game:
  1. System fetches `game_roles` for game
  2. Auto-assigns based on `assignment_strategy` + `min_count/max_count`
  3. Creates `participant_role_assignments` with `private_instructions`
  4. Participants see their role card (private)
  5. Host can override assignments

#### H. Media References
```typescript
interface GameMedia {
  cover_media_id?: string;          // Main image
  step_media?: {                    // Images per step
    step_id: string;
    media_id: string;
  }[];
  icon_key?: string;                // Icon library reference
}
```

#### I. Accessibility & UX Flags
```typescript
interface GameAccessibility {
  accessibility_notes: string[];    // ["Undvik blinkande ljus", "Kan vara stressande"]
  pace: 'calm' | 'normal' | 'high';
  requires_visual_support?: boolean;
  requires_quiet_environment?: boolean;
  sensory_considerations?: string[];
}
```

#### J. Gamification Hooks
```typescript
interface GameGamification {
  gamification_tags: ('cooperation' | 'trust' | 'creativity' | 'communication' | 'leadership')[];
  reflection_recommended: boolean;
  recommended_reflection_questions: string[];
}
```

### 13.3 Database Strategy: ONE Games Table (Progressive Enhancement)

**Core Philosophy:** All games use the **same `games` table**, enriched with optional related tables.

```
┌─────────────────────────────────────────────────────────────────┐
│                        GAMES TABLE                              │
│                  (Single Source of Truth)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────────┐
                ▼             ▼                 ▼
         ┌──────────┐  ┌────────────┐  ┌──────────────┐
         │ Browse   │  │    Play    │  │ Participants │
         │ (basic)  │  │ (+ steps)  │  │  (+ roles)   │
         └──────────┘  └────────────┘  └──────────────┘
```

**Benefits:**
- No data duplication
- Gradual enrichment (start simple, add features later)
- Easy migration (additive, not breaking)
- Unified API (`GET /api/games/[id]` returns everything)

### 13.4 Implementation Phases

#### Phase 1: Extend Existing Games Table (Non-Breaking)

**Step 1: Add new columns to existing `games` table**
```sql
-- Migration: Add Play-ready fields (all optional, backward compatible)
ALTER TABLE games
  ADD COLUMN IF NOT EXISTS environment varchar(20) DEFAULT 'either',
  ADD COLUMN IF NOT EXISTS difficulty_level int CHECK (difficulty_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS energy_level int CHECK (energy_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS noise_level int CHECK (noise_level BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS group_structure varchar(20) DEFAULT 'whole_group',
  ADD COLUMN IF NOT EXISTS players_optimal_min int,
  ADD COLUMN IF NOT EXISTS players_optimal_max int;

-- Existing games continue to work with NULL/default values
```

**Step 2: Create optional related tables**
```sql
-- Steps (optional: game can have 0 steps = old-style browse-only)
CREATE TABLE game_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  section varchar(50) NOT NULL,
  step_type varchar(20) NOT NULL,
  order_index int NOT NULL,
  title text NOT NULL,
  description text,
  leader_script text,
  estimated_duration_seconds int,
  timer_config jsonb,
  adaptation_hints jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, order_index)
);

-- Materials (optional)
CREATE TABLE game_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity_type varchar(20) CHECK (quantity_type IN ('per_person', 'per_team', 'total')),
  quantity int,
  substitutions text,
  order_index int,
  created_at timestamptz DEFAULT now()
);

-- Roles (optional: only for Participants-ready games)
CREATE TABLE game_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  name varchar(100) NOT NULL,
  public_description text,
  private_instructions text NOT NULL,
  min_count int,
  max_count int,
  assignment_strategy varchar(20) DEFAULT 'random',
  conflicts_with uuid[],
  recommended_at_players jsonb,
  created_at timestamptz DEFAULT now(),
  UNIQUE(game_id, name)
);
```

**Result:**
- **Old games (no steps/roles):** Work perfectly in Browse
- **Games with steps:** Enhanced Play experience
- **Games with roles:** Participants Domain enabled

**Postpone to Phase 2:**
- Context adaptations (F)
- Advanced timer_config details
- Step adaptation_hints (can add via ALTER TABLE later)

#### Phase 2: Context System
**Add:**
```sql
game_contexts
game_context_adaptations
```

**Benefits unlocked:**
- One game serves multiple products
- Product-specific UI can show relevant adaptations
- Reduces game cloning

#### Phase 3: Advanced Play Features
**Add:**
- `timer_config` details
- `adaptation_hints` per step
- `visual_cues` integration
- Advanced accessibility

### 13.4 Wizard Structure (Editor UI)

**Step 1: Basics** (required)
- Title, description
- Product categories
- Main purposes
- Age/players/duration

**Step 2: Execution Plan** (required)
- Add steps (sections: prep, intro, main, ending)
- For each step: title, description, duration
- Leader scripts (optional but recommended)

**Step 3: Materials** (required if any)
- Structured material list
- Safety notes

**Step 4: Roles** (conditional)
- Only if game requires roles
- Add roles with private instructions

**Step 5: Context Adaptations** (optional, high value)
- Select contexts (school_pe, football_training, etc.)
- Add context-specific adjustments

**Step 6: Media & Publish** (required)
- Upload/select cover image
- Set status

**Completion levels:**
- **Minimal:** Steps 1-3 = publishable
- **Good:** + Step 4 (if roles) or 5 (adaptations)
- **Excellent:** All steps, rich adaptations

### 13.5 API Implications

**For Play Domain:**
```typescript
GET /api/games/[id]/execution-plan
// Returns: steps with leader_scripts, timers, cues
// Used by: Play UI to guide leader

GET /api/games/[id]/context/[contextSlug]
// Returns: game + context adaptations applied
// Used by: Product-specific views
```

**For Participants Domain:**
```typescript
GET /api/games/[id]/roles
// Returns: role definitions (without private_instructions)
// Used by: Host to preview roles before session

POST /api/play/sessions/[id]/roles/assign
// Assigns roles to participants based on game_roles constraints
// Creates participant_role_assignments
```

### 13.6 Migration Strategy: Zero Downtime

**Principle:** Additive changes only, no breaking migrations.

#### Step 1: Extend Schema (Backward Compatible)
```sql
-- All new columns are nullable or have defaults
ALTER TABLE games
  ADD COLUMN environment varchar(20) DEFAULT 'either',
  ADD COLUMN difficulty_level int,
  ADD COLUMN energy_level int,
  -- ... etc
;

-- Create optional tables
CREATE TABLE game_steps (...);
CREATE TABLE game_materials (...);
CREATE TABLE game_roles (...);
```

**Impact:** Existing games work unchanged, queries return NULL for new fields.

#### Step 2: Update API (Feature Detection)
```typescript
// GET /api/games/[id] returns different capabilities based on what exists

interface GameResponse {
  // Base fields (always present)
  id: string;
  title: string;
  description: string;
  // ... existing fields
  
  // New optional fields
  environment?: 'indoors' | 'outdoors' | 'either';
  difficulty_level?: number;
  
  // Related data (only if exists)
  steps?: GameStep[];         // Empty array if no steps
  materials?: GameMaterial[]; // Empty array if no materials
  roles?: GameRole[];         // Empty array if no roles
  
  // Computed flags (for UI)
  capabilities: {
    has_detailed_guide: boolean;      // true if steps.length > 0
    supports_participants: boolean;   // true if roles.length > 0
    supports_timer: boolean;          // true if any step has timer_config
  };
}
```

#### Step 3: UI Progressive Enhancement
```typescript
// Browse: No changes needed (ignores new fields)
function GameCard({ game }: { game: Game }) {
  return (
    <Card>
      <h3>{game.title}</h3>
      <p>{game.short_description}</p>
      {/* New badges appear automatically if data exists */}
      {game.capabilities?.supports_participants && <Badge>Rollbaserad</Badge>}
      {game.capabilities?.has_detailed_guide && <Badge>Detaljerad guide</Badge>}
    </Card>
  );
}

// Play: Adapts to available data
function PlayView({ game }: { game: GameResponse }) {
  if (game.steps && game.steps.length > 0) {
    return <DetailedGuideView steps={game.steps} />;
  }
  return <BasicGameView game={game} />;
}

// Participants: Only enabled if roles exist
function StartSessionButton({ game }: { game: GameResponse }) {
  const canStartSession = game.capabilities?.supports_participants;
  
  return (
    <Button disabled={!canStartSession}>
      {canStartSession ? 'Starta session med roller' : 'Stöder ej deltagar-läge'}
    </Button>
  );
}
```

#### Step 4: Editor Gradual Enrichment
Editors can enhance existing games:

1. **Day 1:** Game exists with only basic data
   - Visible in Browse ✓
   - Play shows basic view
   - Participants unavailable

2. **Day 30:** Editor adds steps
   - Browse still works ✓
   - Play shows detailed guide ✓
   - Participants still unavailable

3. **Day 60:** Editor adds roles
   - Browse shows "Rollbaserad" badge ✓
   - Play shows guide ✓
   - Participants enabled ✓

**No breaking changes at any step!**

### 13.7 Real-World Examples

#### Example 1: Legacy Game (No Changes)
```sql
-- Existing game in database
SELECT * FROM games WHERE id = 'old-game-uuid';
-- Returns: title, description, age_min, age_max, players_min, players_max
-- New fields: NULL (uses defaults)

-- Steps query
SELECT * FROM game_steps WHERE game_id = 'old-game-uuid';
-- Returns: 0 rows

-- API response
{
  "id": "old-game-uuid",
  "title": "Stoppdans",
  "capabilities": {
    "has_detailed_guide": false,
    "supports_participants": false
  }
}
```
**Result:** Browse works, Play shows basic view.

#### Example 2: Enhanced Game (With Steps)
```sql
-- Same game, editor added steps
INSERT INTO game_steps (game_id, section, title, description, order_index)
VALUES 
  ('old-game-uuid', 'preparation', 'Förbered rummet', 'Flytta bort möbler...', 1),
  ('old-game-uuid', 'intro', 'Förklara reglerna', 'Säg: När musiken...', 2);

-- API response now includes steps
{
  "id": "old-game-uuid",
  "title": "Stoppdans",
  "steps": [
    { "title": "Förbered rummet", "description": "..." },
    { "title": "Förklara reglerna", "description": "..." }
  ],
  "capabilities": {
    "has_detailed_guide": true,  // Changed!
    "supports_participants": false
  }
}
```
**Result:** Play shows detailed guide with timer support.

#### Example 3: Full Participants Game
```sql
-- Editor adds roles
INSERT INTO game_roles (game_id, name, private_instructions, max_count)
VALUES 
  ('old-game-uuid', 'Mördare', 'Du är morderen...', 1),
  ('old-game-uuid', 'Detektiv', 'Hitta morderen...', 2);

-- API response
{
  "id": "old-game-uuid",
  "title": "Stoppdans Mysteriet",
  "steps": [...],
  "roles": [
    { "name": "Mördare", "public_description": "...", "max_count": 1 },
    { "name": "Detektiv", "public_description": "...", "max_count": 2 }
  ],
  "capabilities": {
    "has_detailed_guide": true,
    "supports_participants": true  // Enabled!
  }
}
```
**Result:** Participants Domain fully functional.

---

**End of Architecture Document**
