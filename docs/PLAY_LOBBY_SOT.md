# Play Lobby (Host) — Single Source of Truth

Date: 2026-01-23

## Goal
The Lobby is the host’s daily workspace before and between live play.
It must be **mobile-first**, **fast**, and **unambiguous**: what’s ready, what’s missing, and what the host should do next.

## Scope
This document covers the **host lobby experience** on `/app/play/sessions/[id]`:
- Readiness/preflight checklist (before start)
- Lobby hub sections (participants/roles/content/triggers/settings)
- Single primary CTA to enter Director Mode
- “What is my session status?” and core session info on phone

### Out of scope (for now)
- Director Mode (drawer overlay) UX polishing
- Admin play tools and participant-only views

## UX Principles (non-negotiable)
- **Phone-first layout**: everything critical reachable with one hand.
- **One primary CTA** (no competing start buttons).
- **Checklist is visible in lobby** (not hidden behind navigation).
- **Status clarity**: lobby vs live vs paused vs ended, always obvious.
- **Safe operations**: any destructive/global-impact action must confirm.
- **Fast scanning**: large touch targets, minimal dense text, clear icons.

## Canonical Route + Component Map
### Host sessions list

### Host session lobby/cockpit (canonical)

 Host start: `/app/games/[gameId]` (creates session + routes to cockpit Lobby)
 Host start (legacy): `/app/play/[gameId]` (redirects to `/app/games/[gameId]`)
- Drawer overlay → [features/play/components/DirectorModeDrawer.tsx](../features/play/components/DirectorModeDrawer.tsx)

## Current Behavior Summary
- Lobby vs Live is derived from server data:
  - **Lobby** = `status === 'active'` and `startedAt` is `null` (joinable, but not started)
  - **Live** = `status === 'active'` and `startedAt` is set
  - **Paused** = `status === 'paused'`
  - **Ended** = `status in { ended, archived, cancelled }`
- In the cockpit (all statuses except ended), the host sees:
  - A session summary card (code, participants, total time, settings)
- In lobby, the host additionally sees:
  - A readiness banner (preflight summary)
  - Lobby hub section cards
  - A simplified checklist card (top items) + ability to open full checklist
  - A single primary “Start/Director Mode” CTA in the lobby content
- In live/paused, the Run tab switches to runtime controls + status and Director Mode button remains available.

### Data Model Note (important)
New sessions must have `started_at = NULL` initially, otherwise they appear “Live” immediately.
This is enforced by the migration [supabase/migrations/20260123130000_participant_sessions_lobby_defaults.sql](../supabase/migrations/20260123130000_participant_sessions_lobby_defaults.sql).

## Known Issues / Audit Notes
- Mobile needs stronger “session summary” presentation (code, participants, duration/total time).
- Checklist should be even more compact and skimmable on phone.
- Remove or redirect legacy host surfaces to avoid confusion.

## Legacy/Parallel Host Surfaces (candidates for cleanup)
These exist and can cause navigation/ownership ambiguity:
- [app/app/play/sessions/[id]/client.tsx](../app/app/play/sessions/[id]/client.tsx) (legacy host detail client)
- [app/participants/host/[sessionId]/page.tsx](../app/participants/host/[sessionId]/page.tsx) (older host dashboard)

## Roadmap
### P0 — Lobby “daily driver” perfection
- Make session summary card match mobile concept (code, participants, total time, status, settings).
- Ensure only one primary CTA on mobile (avoid duplicated start buttons).
- Checklist: show the essentials first, reveal more on demand.
- Verify touch targets and spacing across iPhone/Android.

### P1 — Content clarity and error states
- Improve error copy and recovery actions (offline/degraded state in lobby).
- Better empty states (no steps, no roles snapshot, no triggers, etc.)

## Changelog
### 2026-01-23
- LobbyPreflightCard: Replaced separate ReadinessIndicator + LobbyChecklistCard with unified component.
  - Checklist shows all items with color-coded status (green/amber/red)
  - "Starta session" button integrated: green when ready, gray when not
  - Gray button is still clickable but triggers confirmation dialog
  - Confirmation dialog lists unmet requirements before allowing start
- Fixed polling status flicker: loadRuntimeState now uses same lobby-vs-active logic as loadSession
- Fixed director mode state sync: useEffect now syncs directorModeOpen with status changes
- Lobby: hide runtime RunTab content while in lobby/draft.
- Lobby: show a compact preflight checklist card inline (plus open full checklist).
- Lobby: add a session summary card (mobile-first) with session code + key stats.
- Lobby: add a Settings shortcut in the cockpit header.
- DB: new sessions start with `started_at = NULL` so they land in Lobby by default.
