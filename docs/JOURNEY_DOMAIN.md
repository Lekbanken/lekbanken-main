# JOURNEY DOMAIN

## Metadata
- **Status:** Draft / placeholder implementation
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code (Journey UI placeholder) + sandbox references

## Scope
Journey Domain (“Din lekresa”) is intended to own:
- A user-facing timeline/dashboard of recent and upcoming activity
- Progress storytelling across sessions/plans/gamification (e.g., “what you did”, “what’s next”)
- Surfacing streaks, milestones, achievements, and suggested next actions

Non-goals (currently owned elsewhere):
- Coins/streaks/levels/achievements as data models (see `docs/GAMIFICATION_DOMAIN.md`)
- Live sessions runtime (see `docs/PLAY_DOMAIN.md`)
- Planner authoring and plan data model (see `docs/PLANNER_DOMAIN.md`)

## Current implementation status (as-is in repo)
Journey is currently implemented as the **App dashboard** with partial real data:
- `/app` is a dashboard page implemented in `features/journey/AppDashboardPage.tsx`.
- `/app/journey` exists and renders the same dashboard.
- The dashboard reads Gamification stats via `GET /api/gamification` (streak, coin balance, unlocked achievements).
- There is still **no** `app/api/journey/*` API surface.

There is also a legacy placeholder component with hard-coded sessions:
- `features/journey/JourneyPage.tsx`

## Related code (repo-anchored)
- App dashboard implementation: `features/journey/AppDashboardPage.tsx`
- Routes:
  - `app/app/page.tsx` (renders dashboard)
  - `app/app/journey/page.tsx` (alias route)
- Legacy placeholder: `features/journey/JourneyPage.tsx`

Sandbox references (currently inconsistent with filesystem):
- `app/sandbox/config/sandbox-modules.ts` references components that do not exist in the repo:
  - `@/features/journey/components/DashboardHero`
  - `@/features/journey/components/StatsCards`
  - `@/features/journey/components/EventCard`
  - `@/features/journey/components/EventProgress`

## Intended integrations (not yet wired)
When implemented, Journey will likely integrate read-only data from:
- Play sessions (recent activity, time spent) — Play Domain
- Plans and plan playback — Planner + Play domains
- Achievements/coins/streaks/levels — Gamification Domain

## Known gaps / next concrete steps
- Add a real route (e.g. `app/app/journey/page.tsx`) that renders `JourneyPage`.
- Decide whether Journey is:
  - a thin UI layer on top of Gamification snapshot + session queries, or
  - its own API surface that composes multiple domains.
- Fix sandbox references: either add the missing `features/journey/components/*` files or update `sandbox-modules.ts` to point to real components.

## Validation checklist (once wired)
- Journey route renders in app navigation.
- Data shown matches authenticated user and active tenant context.
- Links/actions route to existing Play/Planner/Gamification surfaces without duplicating write logic.
