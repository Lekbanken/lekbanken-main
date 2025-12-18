# CONTENT MANAGEMENT DOMAIN (CMD)

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-18
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
CMD owns the **admin-facing content operations** that turn “content ideas” into reliably structured, publishable data.

In this repo, CMD primarily covers:
- **Games authoring ops**: Builder (“v2” structured content), publish toggles, and mass operations.
- **Bulk import/export** for games via CSV/JSON (validation, dry-run, upsert).
- **Content planner primitives**: tenant-scoped content items, collections, schedules and events.

Non-goals:
- Public browsing, ranking, recommendations (Browse Domain).
- Play runtime, sessions, realtime state (Play Domain).
- Translation batch workflows beyond what exists in Translation Engine.
- Media moderation/pipelines (Media Domain).

## Related docs
- Games model + publishing rules: `docs/GAMES_DOMAIN.md`
- CSV contract (source-of-truth for fields): `docs/CSV_IMPORT_FIELD_REFERENCE.md`
- Builder overview (current admin builder): `docs/ADMIN_GAME_BUILDER_V1.md`
- Data model governance (migrations/typegen/RLS): `docs/DATA_MODEL_DOMAIN.md`

## Related code (repo-anchored)

### UI entrypoints
Games admin:
- `app/admin/games/page.tsx` (entry)
- `features/admin/games/GameAdminPage.tsx` (list, bulk actions, import/export dialogs)
- `app/admin/games/builder/*` (builder UI)

Content planner:
- `app/admin/content/page.tsx` (content planner – **mixed reality**, see “Reality notes”)
- `app/admin/tenant/[tenantId]/content/page.tsx` (tenant content page, reads `content_items`)

### API routes
Games builder (structured authoring):
- `app/api/games/builder/route.ts` (POST create)
- `app/api/games/builder/[id]/route.ts` (GET load; PUT save)

Games CSV bulk ops:
- `app/api/games/csv-import/route.ts` (POST import; supports dry-run)
- `app/api/games/csv-export/route.ts` (GET export; CSV/JSON)

Publishing flow:
- `app/api/games/[gameId]/publish/route.ts` (POST publish)

### Utilities / validation
- `lib/utils/csv.ts` (generic CSV parsing/generation + helpers)
- `features/admin/games/utils/csv-parser.ts` (CSV → `ParsedGame[]`)
- `features/admin/games/utils/csv-generator.ts` (games → CSV/JSON)
- `features/admin/games/utils/game-validator.ts` (bulk validation rules)
- `types/csv-import.ts` (import/export contract types)

### Content planner service layer
- `lib/services/contentService.ts` (CRUD helpers for content planner tables using browser supabase client)

## Data model

### Games authoring tables (CMD-consumed)
CMD uses the Games Domain storage model, but owns the **workflows** that write to it.

Key tables:
- `games` (core fields incl `status`, `owner_tenant_id`, `play_mode`, `game_content_version`)
- `game_steps` (structured step content)
- `game_materials` (materials + safety + prep)
- `game_phases` (for timed/structured flows)
- `game_roles` (participants play mode)
- `game_board_config` (public board settings)
- `game_secondary_purposes` (sub-purpose links)
- `game_media` (cover is `kind='cover'`)

### Content planner tables (CMD-owned)
Defined in `supabase/migrations/20251129000009_content_planner_domain.sql`:
- `content_items` (tenant-scoped items like game/collection/event/challenge)
- `content_schedules` (start/end windows)
- `seasonal_events` (timeboxed campaigns)
- `content_collections` + `collection_items` (curated sets of games)
- `content_analytics` (engagement counters)

RLS highlights (as implemented in migration):
- Published content is readable more broadly; non-published is generally limited to the creator.
- Inserts/updates require membership via `user_tenant_memberships` with role gates (admin/editor).

## Core workflows

### 1) Game Builder (v2 structured authoring)
**Goal:** Create/update a game with structured steps/materials/etc.

Server endpoints:
- Create: `POST /api/games/builder`
- Edit: `GET /api/games/builder/:id` and `PUT /api/games/builder/:id`

Payload shape (high level):
- `core`: name, short_description, status, owner_tenant_id, purpose/product, metadata
- `steps[]`: ordered structured steps
- `materials`: items/safety/prep
- Optional modules: phases, roles, board config (in `PUT` route)
- `secondaryPurposes[]` and `coverMediaId`

Implementation notes:
- Builder writes `games.game_content_version = 'v2'`.
- Save strategy is “replace-all” for related tables (delete then insert) in the `PUT` route.

### 2) CSV/JSON import (bulk create/update)
**Goal:** Mass-produce games and their related structured data.

Endpoint:
- `POST /api/games/csv-import`

Supported modes:
- `dry_run: true` → validate only; returns `DryRunResult` (UI-friendly).
- `upsert: true` (default) → updates existing games by `game_key`.

Parsing/validation pipeline:
1. Parse input (CSV via `parseCsvGames`, JSON via `JSON.parse` mapping)
2. Validate with `validateGames(...)`
3. If `dry_run`: return aggregated errors/warnings + previews
4. Otherwise: write `games` and related tables

Important behavior:
- “At least one step required” is enforced by the parser/validator.
- Update path deletes old related data (`game_steps`, `game_materials`, `game_phases`, `game_roles`, `game_board_config`, `game_secondary_purposes`) before inserting new.

Field contract:
- Treat `docs/CSV_IMPORT_FIELD_REFERENCE.md` as the canonical contract for columns, formats and examples.

### 3) CSV/JSON export (backup + editing)
**Goal:** Export games for spreadsheet editing or backups.

Endpoint:
- `GET /api/games/csv-export`

Key query params:
- `format=csv|json` (default `csv`)
- `ids=<comma-separated game ids>` (optional)
- `tenantId=<uuid|global>` (optional)
- `includeSteps/includeMaterials/includePhases/includeRoles/includeBoardConfig` (default true)

Output:
- Returns `Content-Disposition: attachment; filename="games-export-YYYY-MM-DD.csv"` (or `.json`).

### 4) Content planner (tenant content primitives)
There are **two** admin surfaces related to “content planning” right now:

- `app/admin/content`:
  - Reads from `games` table directly.
  - “Events” are currently client-local state (not persisted) in this page.
  - Uses the browser supabase client for deletes and fetches.

- `app/admin/tenant/[tenantId]/content`:
  - Reads from `content_items` via `lib/services/contentService.ts`.
  - Current call site uses `{ onlyPublished: true }`.

## Reality notes (important)
- The games bulk endpoints (`/api/games/csv-import`, `/api/games/csv-export`) and builder endpoints (`/api/games/builder*`) use `createServiceRoleClient()`.
  - That bypasses RLS and should be treated as “admin-only”.
  - The current route handlers do not include an explicit role gate in the handler itself.
  - If you want defense-in-depth, mirror the pattern used in `app/api/purposes/[purposeId]/route.ts` (e.g. `requireSystemAdmin()` or tenant-admin checks) before performing service-role reads/writes.

- The content planner DB model exists (migration + generated types + `contentService`), but not all UI paths are wired to it yet.

## Suggested validation (for doc + workflow changes)
- `npm run type-check`
- `npm test`

## Change checklist (when modifying CMD)
- If you change CSV columns/format: update `docs/CSV_IMPORT_FIELD_REFERENCE.md` and `types/csv-import.ts`.
- If you change builder payload/schema: update `docs/ADMIN_GAME_BUILDER_V1.md` and ensure migrations + typegen are in sync.
- If you wire content planner UI to DB tables: ensure RLS policies allow the intended tenant roles.
