# PLANNER DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code (`app/app/planner/**`, `app/api/plans/**`, `features/planner/**`, `lib/services/planner.server.ts`) + Supabase migrations (`supabase/migrations/*planner*` + initial schema)

## Scope
Planner Domain owns:
- Creating and editing **plans** (name/description/visibility/metadata)
- Organizing a plan into ordered **blocks** (game/pause/preparation/custom)
- Plan visibility rules: `private | tenant | public`
- Notes attached to plans:
  - private (owner-only)
  - tenant-shared (tenant members when visibility allows)
- “Play view” projection for consumption by Play Domain (`/api/plans/[planId]/play`)

Non-goals:
- Running realtime sessions (Play Domain)
- Authoring games/steps/phases (Games Domain)
- Auth/RBAC primitives (Accounts/Auth/Tenant domains)

## Related docs
- Games content model: `docs/GAMES_DOMAIN.md`
- Play runtime vs plan playback: `docs/PLAY_DOMAIN.md`
- Tenancy model: `docs/TENANT_DOMAIN.md`

## Related code (repo-anchored)

### UI routes
- Planner main UI: `app/app/planner/page.tsx` → `features/planner/PlannerPage.tsx`
- Plan detail SSR view: `app/app/planner/[planId]/page.tsx` → `features/planner/components/PlanOverview.tsx`

Core planner components (client-side):
- `features/planner/components/SessionList.tsx` (lists plans + create)
- `features/planner/components/SessionEditor.tsx` (edit plan fields, blocks, notes, reorder)
- `features/planner/components/AddGameButton.tsx` + `GameRow.tsx` (block UI)

### API routes (`app/api/plans/**`)
- `POST /api/plans` (create plan)
- `POST /api/plans/search` (search/list plans)
- `GET /api/plans/[planId]` (fetch plan with relations)
- `PATCH /api/plans/[planId]` (update name/description/metadata)
- `POST /api/plans/[planId]/visibility` (update visibility/tenant)
- Blocks:
  - `POST /api/plans/[planId]/blocks` (create block, inserts at position, resequences)
  - `PATCH /api/plans/[planId]/blocks/[blockId]` (update block + optional reorder)
  - `DELETE /api/plans/[planId]/blocks/[blockId]` (delete + resequence)
  - `POST /api/plans/[planId]/blocks/reorder` (bulk reorder)
- Notes:
  - `POST /api/plans/[planId]/notes/private` (upsert private note)
  - `POST /api/plans/[planId]/notes/tenant` (upsert tenant note)
- Playback projection:
  - `GET /api/plans/[planId]/play` (builds a Play-friendly view of blocks + game summaries)

### Server-side planner service
- `lib/services/planner.server.ts`
  - `fetchPlanWithRelations(planId)` (plan + blocks + notes)
  - `buildPlayView(planWithRelations, localeOrder)` (projection for play)
  - `recalcPlanDuration(blocks)` (duration calculation)
  - Locale fallback order used for game translations: `['sv','no','en']`

### Validation
- `lib/validation/plans.ts`
  - `validatePlanPayload(...)` (name, visibility constraints)
  - `validatePlanBlockPayload(...)` (block_type, duration, game_id for game blocks)

## Core concepts

### Plan visibility model
The DB enum `plan_visibility_enum` is:
- `private`: only the plan owner can access
- `tenant`: tenant members can read (and may write tenant notes)
- `public`: readable without tenant membership (still behind auth in most app flows)

Important guardrail:
- Setting `visibility = 'public'` is blocked unless caller is system admin (enforced in `validatePlanPayload` and `/api/plans/[planId]/visibility`).

### Blocks model (ordered timeline)
Plans are made of ordered `plan_blocks`:
- `block_type`: `game | pause | preparation | custom` (hardened to enum via `20251208120000_planner_modernization.sql`)
- Optional `game_id` (required when `block_type='game'`)
- `position`: ordering (0..n-1)
- `duration_minutes` can override the game duration
- UI provides both single-item move and bulk reorder.

Duration rule (as implemented):
- Prefer `block.durationMinutes`
- Else use `block.game.durationMinutes`
- Sum across blocks; server writes `plans.total_time_minutes` opportunistically after block changes.

### Notes model
- `plan_notes_private`: owner-only note per plan per author (`UNIQUE(plan_id, created_by)`) — used for personal notes.
- `plan_notes_tenant`: a tenant-shared note per plan per tenant (`UNIQUE(plan_id, tenant_id)`).

### Play view projection
`GET /api/plans/[planId]/play` returns a normalized structure used by Play Domain:
- Plan title + ordered blocks
- For game blocks: includes translation-aware title/summary/materials and derived steps from legacy `game_translations.instructions`

Note: Legendary Play realtime runtime uses `game_steps`/`game_phases` (Games/Play domains). Plan playback currently derives “steps” from `game_translations.instructions`.

## Data model (Supabase)

### Initial schema (base)
From `supabase/migrations/20251129000000_initial_schema.sql`:
- `plans`
- `plan_blocks`
- `plan_games` (legacy M:M mapping; planner UI primarily uses `plan_blocks`)
- RLS policies:
  - `users_can_select_plans` (owner, tenant-visible, or public)
  - `users_can_insert_plans` / `users_can_update_own_plans` / `users_can_delete_own_plans`
  - `users_can_select_plan_blocks` (mirrors plan access)

### Planner modernization
From `supabase/migrations/20251208120000_planner_modernization.sql`:
- `plans`:
  - adds `metadata jsonb`, `created_by`, `updated_by`
- `plan_blocks`:
  - adds `title`, `metadata jsonb`, `is_optional`, `created_by`, `updated_by`
  - hardens `block_type` to `plan_block_type_enum`
- `plan_notes_private`
- `plan_notes_tenant`
- `plan_play_progress` (user-scoped progress tracking table)
- RLS policies added/adjusted:
  - `manage_plan_blocks` (write access only for plan owners)
  - `manage_private_plan_notes` (owner-only)
  - `manage_tenant_plan_notes` (tenant member + visibility >= tenant)
  - `manage_plan_play_progress` (user-scoped + plan access)

## Auth and access model
- API routes use `createServerRlsClient()` (request-scoped Supabase client, RLS enforced).
- Tenant context is optionally provided via request (see `getRequestTenantId()`), mainly for:
  - selecting tenant when creating tenant-visible plans
  - writing tenant notes

## Known gaps / tech debt (repo-anchored)
- Duration consistency: handled by DB trigger in `supabase/migrations/20251217120000_planner_total_time_trigger.sql`.
- Plan playback progress: persisted via `GET/POST /api/plans/[planId]/progress` + Play plan playback sync.

## Validation checklist
- Create plan, rename, edit description.
- Add blocks (game/pause/preparation/custom) and verify ordering + duration.
- Reorder blocks (move up/down + drag/drop) and verify server resequences.
- Change visibility:
  - `tenant` requires `owner_tenant_id`
  - `public` requires system admin
- Save private note and tenant note.
- `GET /api/plans/[planId]/play` returns playable structure with locale fallback.
