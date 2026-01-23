# PLAY DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-19
- **Source of truth:** Repo code (`app/app/play/**`, `app/(marketing)/play/**`, `app/api/play/**`, `features/play/**`, `features/play-participant/**`) + Supabase migrations (`supabase/migrations/*play*`)

## Scope
Play Domain owns the “run the activity” experience:
- Host creates and manages **participant sessions** (lobby, participants list, status)
- Participants join via a **6-character session code** (anonymous token-based access)
- “Legendary Play” runtime:
  - Active Session Overlay (locks navigation until exit to lobby)
  - Step/phase navigation
  - Event-driven timer (start/pause/resume/reset)
  - Board/public display state (message + visibility overrides)
  - Role snapshot + assignment for the session
  - Secret instruction gating (host unlock + participant reveal)
  - Play primitives (Artifacts + Decisions/Votes + Outcomes)
  - Near-realtime updates via Supabase Realtime **broadcast**
- Planner playback mode (non-realtime): play through a stored plan

Public (read-only) viewing:
- `/board/[code]` renders a public board for a running session

Non-goals (owned by other domains):
- Authoring game content (Games Domain + builder)
- Managing plans (Planner Domain)
- Auth/RBAC primitives and tenant membership (Accounts/Auth/Tenant domains)

## Related docs
- Participants (sessions/participants tables): `docs/PARTICIPANTS_DOMAIN.md`
- Games content model (steps/phases/roles): `docs/GAMES_DOMAIN.md`
- Play sessions UI spec (historical/spec): `docs/PLAY_SESSIONS_UI_SPEC.md`
- Platform + auth: `docs/PLATFORM_DOMAIN.md`, `docs/auth/*`

## Primary user journeys (as implemented)

### 1) Host: create a session for a game
- UI:
  - `app/app/play/page.tsx` → redirects to `/app/play/sessions`
  - `app/app/games/[gameId]/page.tsx` + `app/app/games/[gameId]/start-session-cta.tsx` (create session then route to host cockpit)
  - `app/app/play/[gameId]/page.tsx` (legacy route → redirects to `/app/games/[gameId]`)
- API:
  - `POST /api/play/sessions` (creates `participant_sessions` for authenticated host)

### 2) Host: lobby management
- UI:
  - `app/app/play/sessions/page.tsx` + `client.tsx` (list sessions)
  - `app/app/play/sessions/[id]/page.tsx` → `features/play/components/HostSessionWithPlay.tsx`
- API:
  - `GET /api/play/sessions` (list host sessions)
  - `GET /api/play/sessions/[id]` (get session; host-owned)
  - `PATCH /api/play/sessions/[id]` (pause/resume/end)
  - `GET /api/play/sessions/[id]/participants` (host view)
  - `PATCH /api/play/sessions/[id]/participants/[participantId]` (kick/block/set starter/position)

### 3) Participant: join/rejoin and stay present
- UI:
  - `app/(marketing)/play/page.tsx` + `client.tsx` (enter code + name)
  - `app/(marketing)/play/session/[code]/page.tsx` + `client.tsx` (participant session view)
- API:
  - `POST /api/play/join` → re-export of `/api/participants/sessions/join`
  - `POST /api/play/rejoin` → re-export of `/api/participants/sessions/rejoin`
  - `GET /api/play/me?session_code=...` (token → participant + session)
  - `POST /api/play/heartbeat?session_code=...` (presence)

### 4) Legendary Play: host runtime + participant runtime
- Host UI:
  - `features/play/components/HostPlayMode.tsx`
  - `features/play/components/FacilitatorDashboard.tsx` (step/phase/timer/board controls)
  - `features/play/components/RoleAssignerContainer.tsx`
- Participant UI:
  - `features/play/components/ParticipantPlayMode.tsx` + `ParticipantPlayView.tsx`
- API:
  - `GET /api/play/sessions/[id]/game` (game title + steps/phases for the session; host or participant)
  - `PATCH /api/play/sessions/[id]/state` (host-only action-based runtime updates)
  - `GET /api/play/sessions/[id]/state` (public runtime state)
  - `GET /api/play/sessions/[id]/roles` (roles snapshot for session)
  - `POST /api/play/sessions/[id]/roles` (snapshot game roles into session roles)
  - `GET /api/play/me/role?session_code=...` (participant’s assigned role)

#### Active Session Overlay: UX contract

When the Active Session Overlay is active:
- AppShell is disabled (no navigation to other areas of Lekbanken)
- The only supported exit is “Tillbaka till Lobbyn”

Rationale: This makes the running session the single focus, keeps tablet/desktop behavior consistent, and provides a clear contract to say “no” to future feature requests that introduce side navigation while a session is running.

Primitives (Artifacts + Decisions/Votes + Outcomes):
- API (host):
  - `POST /api/play/sessions/[id]/artifacts` (snapshot artifacts/variants into session; one-time)
  - `GET /api/play/sessions/[id]/artifacts` (host: full view incl. assignments)
  - `PATCH /api/play/sessions/[id]/artifacts/state` (reveal/highlight/assign/unassign actions)
  - `GET /api/play/sessions/[id]/decisions` (host: all decisions)
  - `POST /api/play/sessions/[id]/decisions` (action-based: create/update/open/close/reveal)
  - `GET /api/play/sessions/[id]/outcome` (host: all outcomes)
  - `POST /api/play/sessions/[id]/outcome` (action-based: set/reveal/hide)
- API (participant token):
  - `GET /api/play/sessions/[id]/artifacts` (filtered to accessible variants)
  - `GET /api/play/sessions/[id]/decisions` (only open + revealed)
  - `GET /api/play/sessions/[id]/outcome` (only revealed)
  - `POST /api/play/sessions/[id]/decisions/[decisionId]/vote`
  - `GET /api/play/sessions/[id]/decisions/[decisionId]/results`

Chat:
- API:
  - `GET /api/play/sessions/[id]/chat` (host: sees all; participant: sees public + own private-to-host)
  - `POST /api/play/sessions/[id]/chat` (host or participant)

### 5) Planner playback (“Play plan”)
- UI:
  - `app/app/play/plan/[planId]/page.tsx` → `features/play/PlayPlanPage.tsx`
- API:
  - Plan playback reads plan data via Planner domain endpoints (not part of Legendary Play realtime runtime)

### 6) Public board (`/board/[code]`)
- UI:
  - `app/board/[code]/page.tsx` (read-only; suitable for a big screen)
- API:
  - `GET /api/play/board/[code]` (public aggregated view)

Design note:
- Public Board is a presentation layer, not a game engine.
- It renders revealed/highlighted state for the session (plus board message / timer display), and intentionally does not apply step/phase gating logic beyond what is already implied by “revealed”.

## Data model (Supabase)

### Core session tables
- `participant_sessions`
  - Session identity: `session_code`, `display_name`, `host_user_id`, `tenant_id`
  - Lifecycle: `status`, `paused_at`, `ended_at`, `expires_at`
  - Links: `game_id`, `plan_id`
  - Runtime (Legendary Play): `current_step_index`, `current_phase_index`, `timer_state` (jsonb), `board_state` (jsonb)
  - Secret instruction gating:
    - `secret_instructions_unlocked_at`, `secret_instructions_unlocked_by`
- `participants`
  - Anonymous participant identity + token: `participant_token`, `token_expires_at`
  - Presence: `last_seen_at`, `disconnected_at`, `status` (active/blocked/kicked…)
  - Optional progress data stored in `progress` jsonb (used by host participant endpoints)

### Legendary Play runtime tables
Introduced in migration `supabase/migrations/20251216160000_play_runtime_schema.sql`:
- `session_roles` (snapshot of `game_roles` into a running session)
- `participant_role_assignments` (assign a `session_role_id` to a participant)
- `session_events` (audit log)
- RPC: `snapshot_game_roles_to_session(p_session_id, p_game_id, p_locale)` (SECURITY DEFINER)

Secret instruction semantics:
- Unlock = the host enables the system to allow reveal (session-level gate)
- Reveal = an individual participant chooses to view their secret instructions (participant-level action)

### Chat tables
Introduced in migration `supabase/migrations/20251219090000_play_chat_messages.sql`:
- `play_chat_messages` (public + private-to-host; optional anonymous)

### Legendary Play primitives tables (Artifacts + Decisions/Votes + Outcomes)
Introduced in migration `supabase/migrations/20251219113000_legendary_play_primitives_v1.sql`:
- Author-time:
  - `game_artifacts`, `game_artifact_variants`
- Runtime:
  - `session_artifacts`, `session_artifact_variants`, `session_artifact_assignments`
  - `session_decisions`, `session_votes`
  - `session_outcomes`

## Auth and security model
- Hosts use the request-scoped Supabase client (RLS-aware) and are verified as:
  - `participant_sessions.host_user_id == auth.uid()` OR
  - `users.global_role == system_admin`
- Participant access is **token-based** (anonymous):
  - Clients store a `participant_token` and send it as `x-participant-token`
  - Server validates token belongs to the session and is not expired
  - Token-based endpoints use the **service role** Supabase client to bypass RLS safely

## Realtime model
- Uses Supabase Realtime **broadcast** channels (not DB change feeds)
- Channel name derived from session id (see `features/play/hooks/useLiveSession.ts`)
- Event types:
  - `state_change` (step/phase/status)
  - `timer_update` (start/pause/resume/reset + timer_state)
  - `board_update` (message + overrides)
  - `role_update` (assignment/reveal)
  - `artifact_update` (reveal/highlight/assign)
  - `decision_update` (create/open/close/reveal)
  - `outcome_update` (create/reveal)

Timer is event-driven:
- Server persists `timer_state` (started_at, duration_seconds, paused_at)
- Clients compute remaining time locally from timestamps

## Known gaps / tech debt (repo-anchored)
- Host participant actions store some fields in `participants.progress` json; TODO notes suggest dedicated columns may be preferable.
- Participant join UI currently stores tokens in `sessionStorage` (separate from `features/play-participant/tokenStorage.ts` localStorage helper).
- Planner playback is separate from Legendary Play runtime (different state and persistence model).

## Future work (PR6 candidates, optional)

These are logical next steps that build on the existing schema and audit log.

- PR6-A: Author-time UI for Artifacts
  - Goal: CRUD UI in the game builder for `artifacts_json` / variants (no new runtime logic).
  - Rationale: the data model already supports artifacts/variants + step/phase gating; creators currently author this via CSV/JSON.

- PR6-B: Session transcript / export
  - Goal: export a readable “session story” (e.g. JSON/PDF) based on:
    - `session_events` (timeline)
    - decisions + votes + results
    - outcomes
    - (optional) revealed/highlighted artifact state
  - Rationale: supports debrief, training, and documentation.

## Validation checklist
- Host session lifecycle:
  - Create session → list → open details → pause/resume/end works.
- Participant lifecycle:
  - Join → refresh → rejoin restores presence; token expiry blocks access.
- Legendary Play runtime:
  - Step/phase changes persist in DB and broadcast to participants.
  - Timer start/pause/resume/reset persists and broadcasts; clients render remaining time correctly.
  - Board message persists and broadcasts.
- Roles:
  - Snapshot roles creates `session_roles` and assignments appear on participant.
  - Secret instructions remain locked until host unlock; reveal is tracked per participant.
- Chat:
  - Participant can send `visibility=public` messages (visible to all).
  - Participant can send `visibility=host` message; host sees sender name unless `anonymous=true`.
- Primitives:
  - Snapshot creates session primitives (`session_artifacts`, `session_decisions`, etc.) for the session.
  - Participant “Mina artefakter” shows assigned artifacts and respects visibility rules.
  - Decision open → participant can vote; vote is rejected if decision is not open.
  - Decision reveal → participant can see results.
  - Outcome reveal → board shows revealed outcomes.
- Public board:
  - `/board/[code]` renders for an active session and reflects board message, highlighted artifact, revealed public artifacts, revealed decision results, and revealed outcomes.
- Security:
  - Host-only endpoints reject non-host (except system_admin).
  - Token endpoints reject expired/invalid tokens.
