# PLAY DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code (`app/app/play/**`, `app/(marketing)/play/**`, `app/api/play/**`, `features/play/**`, `features/play-participant/**`) + Supabase migrations (`supabase/migrations/*play*`)

## Scope
Play Domain owns the “run the activity” experience:
- Host creates and manages **participant sessions** (lobby, participants list, status)
- Participants join via a **6-character session code** (anonymous token-based access)
- “Legendary Play” runtime:
  - Step/phase navigation
  - Event-driven timer (start/pause/resume/reset)
  - Board/public display state (message + visibility overrides)
  - Role snapshot + assignment for the session
  - Near-realtime updates via Supabase Realtime **broadcast**
- Planner playback mode (non-realtime): play through a stored plan

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
  - `app/app/play/[gameId]/page.tsx` + `start-session-button.tsx` (create session then redirect)
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

### 5) Planner playback (“Play plan”)
- UI:
  - `app/app/play/plan/[planId]/page.tsx` → `features/play/PlayPlanPage.tsx`
- API:
  - Plan playback reads plan data via Planner domain endpoints (not part of Legendary Play realtime runtime)

## Data model (Supabase)

### Core session tables
- `participant_sessions`
  - Session identity: `session_code`, `display_name`, `host_user_id`, `tenant_id`
  - Lifecycle: `status`, `paused_at`, `ended_at`, `expires_at`
  - Links: `game_id`, `plan_id`
  - Runtime (Legendary Play): `current_step_index`, `current_phase_index`, `timer_state` (jsonb), `board_state` (jsonb)
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

Timer is event-driven:
- Server persists `timer_state` (started_at, duration_seconds, paused_at)
- Clients compute remaining time locally from timestamps

## Known gaps / tech debt (repo-anchored)
- Host participant actions store some fields in `participants.progress` json; TODO notes suggest dedicated columns may be preferable.
- Participant join UI currently stores tokens in `sessionStorage` (separate from `features/play-participant/tokenStorage.ts` localStorage helper).
- Planner playback is separate from Legendary Play runtime (different state and persistence model).

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
- Security:
  - Host-only endpoints reject non-host (except system_admin).
  - Token endpoints reject expired/invalid tokens.
