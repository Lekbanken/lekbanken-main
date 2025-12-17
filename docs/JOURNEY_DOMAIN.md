# JOURNEY DOMAIN

## Metadata
- **Status:** Active (read/composition domain)
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code (Journey UI + BFF endpoints) + sandbox references

## Scope
Journey Domain (“Din lekresa”) owns **read models and presentation composition**:
- A user-facing timeline/dashboard of recent and upcoming activity
- Progress storytelling across sessions/plans/gamification (e.g., “what you did”, “what’s next”)
- Surfacing streaks, milestones, achievements, and suggested next actions

Journey is NOT a new source of truth:
- Journey should not recompute or duplicate Gamification rules.
- Journey should not write coin/XP/level/streak/award state.

Non-goals (currently owned elsewhere):
- Coins/streaks/levels/achievements as data models (see `docs/GAMIFICATION_DOMAIN.md`)
- Live sessions runtime (see `docs/PLAY_DOMAIN.md`)
- Planner authoring and plan data model (see `docs/PLANNER_DOMAIN.md`)

## Current implementation status (as-is in repo)
Journey is currently implemented as the **App dashboard** with partial real data:
- `/app` is a dashboard page implemented in `features/journey/AppDashboardPage.tsx`.
- `/app/journey` exists and renders the same dashboard.
- The dashboard reads Journey snapshot via `GET /api/journey/snapshot`.
- Journey BFF endpoints exist under `app/api/journey/*`.

There is also a legacy placeholder component with hard-coded sessions:
- `features/journey/JourneyPage.tsx`

## Journey API (BFF / read API)

Journey exposes its own API as a **read/composition boundary**:

### `GET /api/journey/snapshot`
Purpose: “Var står jag nu?”

Response (v0):
```ts
type JourneySnapshot = {
  userId: string;
  tenantId?: string | null;
  streakDays: number | null;
  coinsBalance: number | null;
  unlockedAchievements: number | null;
  totalAchievements: number | null;
  level: number | null;
  currentXp: number | null;
  nextLevelXp: number | null;
};
```

### `GET /api/journey/feed?cursor=...&limit=...`
Purpose: “Vad har hänt?”

Response (v0):
```ts
type JourneyFeed = {
  items: Array<{
    id: string;
    type: 'coin_earned' | 'coin_spent' | 'achievement_unlocked' | 'session_completed' | 'plan_progressed';
    occurredAt: string; // ISO
    title: string;
    description?: string;
    href?: string;
    meta?: Record<string, unknown>;
  }>;
  nextCursor?: string;
};
```

Cursor semantics:
- `cursor` is an ISO timestamp; server returns items strictly older than `cursor`.
- `nextCursor` is the last item’s `occurredAt`.

## Ownership matrix (source of truth)

| Field / concept | Source of truth | Journey role |
|---|---|---|
| coins, coin transactions | Gamification tables (`user_coins`, `coin_transactions`) | Render + summarize |
| streaks, levels/XP | Gamification tables (`user_streaks`, `user_progress`) | Render + summarize |
| achievements unlocked | Play/Gamification (`achievements`, `user_achievements`) | Render + summarize |
| play sessions history | Play (`game_sessions`) | Render + timeline |
| plan playback progress | Planner (`plan_play_progress`) | Render + timeline |

## Related code (repo-anchored)
- App dashboard implementation: `features/journey/AppDashboardPage.tsx`
- Journey client API: `features/journey/api.ts`
- Journey types: `features/journey/types.ts`
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

## Growth path (when volume grows)
Journey can remain “compose-on-read” initially. When scale demands it, add a read model:
- `journey_activities` (append-only) populated by domain events
- `journey_snapshot_cache` (per user + tenant) with TTL

## Known gaps / next concrete steps
- Add pagination (“Visa fler”) for the feed via `cursor`.
- Align sandbox references: either add the missing `features/journey/components/*` files or update `sandbox-modules.ts` to point to real components.

## Validation checklist (once wired)
- Journey route renders in app navigation.
- Data shown matches authenticated user and active tenant context.
- Links/actions route to existing Play/Planner/Gamification surfaces without duplicating write logic.
