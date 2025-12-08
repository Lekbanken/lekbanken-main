# Games Domain TODOs

## DB changes
- Add `short_description`, `version`, `season_tags`, `holiday_tags`, `created_by`, `updated_by` to `games`; convert `materials` to `text[]`.
- Introduce enums for `energy_level` and `location_type`; index on `energy_level`, `location_type`, `time_estimate_min`, `age_min/age_max`.
- Create `game_translations` (locale, title, short_description, instructions jsonb, materials) and `game_media` (cover/gallery with ordering, `tenant_id`).
- Add publish RPC or policy guard requiring tenant admin/owner; regenerate `types/supabase.ts` after migrations.

## Component refactors
- Build `GameEditor` stack (BasicInfo, PurposesSelector, MetadataForm, TranslationForm, MediaManager, PublishFlow) using shared validation.
- Consolidate Game view model and reuse across Browse, Detail, Planner, Play; remove legacy `lib/db/*` usage or port to new types.
- Move Play/Planner off mocks to real games + structured instructions; add translation fallback logic.

## API improvements
- Centralize games service (server) exposing get/list/create/update/publish/delete/search with validation + tenant scoping.
- Remove `featured` dependency or add column; fix leaderboard/game queries to use `owner_tenant_id`.
- Add publish endpoint/handler with status guard; add related-games helper respecting tenant and category/purpose.

## UI/UX improvements
- Require and surface cover image + gallery in detail/browse; show purpose/product badges from real data.
- Add translations (sv/no/en) and instruction step rendering in detail/play; improve error states for missing/unpublished games.
- Expand browse filters (purpose, environment, age, time, group size) server-side and paginate.

## Documentation updates
- Write `docs/DOMAIN_GAMES.md` with schema, RLS, service/API map, component map, and media/translation rules.
- Update Notion Games Domain page with the new schema, publish flow, and validation rules.

## Follow-up items (versioning)
- Define versioning strategy per game (version number + changelog table).
- Add analytics hooks for browse/detail/play to validate RLS and filter performance.

## API endpoints added
- `POST /api/games` create with validation (requires short_description, main_purpose_id, etc).
- `PATCH /api/games/[gameId]` update with validation.
- `POST /api/games/[gameId]/publish` sets status=published (validates cover presence flag, requires role admin/owner).

## Types regeneration
- After applying migrations, run `supabase gen types typescript --local > types/supabase.ts` to sync generated types with new tables/enums.
