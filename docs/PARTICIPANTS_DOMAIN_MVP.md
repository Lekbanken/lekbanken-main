# Participants Domain MVP (Play Sessions)

## Metadata

- Owner: -
- Status: archived
- Last validated: 2025-12-17

This document is an MVP/spec snapshot.

For the repo-anchored current implementation surface, see:
- [PARTICIPANTS_DOMAIN.md](PARTICIPANTS_DOMAIN.md)

This MVP reuses the existing participants domain but exposes a lightweight **/play** surface for hosts and participants inside the Next.js app.

## API (Next.js route handlers)
- `POST /api/play/sessions` (auth) – create session (gameId/planId optional). Returns `sessionCode` and `id`.
- `GET /api/play/sessions` (auth) – list host-owned sessions.
- `GET /api/play/sessions/:id` (auth) – host-only detail.
- `PATCH /api/play/sessions/:id` (auth) – `{ action: start|pause|resume|end }`.
- `GET /api/play/sessions/:id/participants` (auth) – host-only participants list.
- `POST /api/play/join` – anonymous join by `{ sessionCode, displayName }`.
- `POST /api/play/rejoin` – anonymous rejoin by `{ sessionCode, participantToken }`.
- `GET /api/play/session/:code` – public session metadata (status, counts).
- `GET /api/play/me` – headers: `x-participant-token`, query `session_code`; returns participant + session.
- `POST /api/play/heartbeat` – headers: `x-participant-token`, query `session_code`; updates last_seen.

All endpoints reuse the existing Supabase tables (`participant_sessions`, `participants`, activity log).

## Frontend surfaces
- `/play` – participant join form (code + name).
- `/play/join/[code]` – redirects to `/play/session/[code]`.
- `/play/session/[code]` – join/rejoin lobby using per-code localStorage token `lekbanken.participant.{code}`; shows session status and basic lobby info.
- `/app/play/[gameId]` – host start-session page (CTA from game detail) creates a session and routes to host panel.
- `/app/play/sessions/[id]` – host control (polling every 3s) shows status, participants list, and Start/Pause/Resume/End actions.
- `/admin/play/sessions` – simple host-owned session list (system-admin expansion can be added later).

## Token storage
- Stored per session code: `lekbanken.participant.{CODE}` with `{ token, participantId, sessionId, displayName }`.
- Used for rejoin/heartbeat; cleared on leave/expiry.

## Known limitations / next steps
- Polling only (no realtime broadcast); add Supabase channel later.
- Roles/actions are stubbed (player/team_lead etc. exist in schema but no UI controls yet).
- No approval/locking UI; only Start/Pause/Resume/End.
- Admin view limited to host-owned sessions; extend to tenant/system admins if needed.
- Heartbeat is best-effort; consider durable rate limiting for join/rejoin endpoints.

## Manual test plan (MVP)
1) Host login -> go to `/app/games/{id}` -> “Starta session” -> redirects to `/app/play/sessions/{sessionId}` and shows code.
2) Participant open `/play` -> enter code + name -> should join and land on `/play/session/{code}` lobby.
3) Refresh participant page -> rejoin automatically via stored token.
4) Host page polls participants list (every 3s) and shows joined participant.
5) Host clicks Pause -> status changes to paused; Resume -> active; End -> participants can no longer rejoin (API returns error).
6) Heartbeat: leave participant tab idle then refresh; `last_seen_at` should update every ~10s (visible in DB).
7) Admin list: `/admin/play/sessions` shows the created session and link opens host view.
