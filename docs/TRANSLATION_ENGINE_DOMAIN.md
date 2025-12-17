# TRANSLATION ENGINE DOMAIN

## Metadata
- **Status:** Active (partial implementation)
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
Translation Engine Domain owns:
- Language preferences (user + tenant) and how the app decides “active language”
- Translation data models and locale fallback rules (content + UI copy)
- Patterns for rendering translated content in app flows (Games, Planner/Play)

Non-goals (currently outside implemented scope):
- A full framework-based i18n solution (e.g. next-intl) across the entire app UI
- Admin tooling/workflows for translation management (import/export, batch translate, missing key detection)

## Related docs
- Validation report (historical findings): `docs/TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md`
- Games content translations: `docs/GAMES_DOMAIN.md`
- Ops/system considerations: `docs/OPERATIONS_DOMAIN.md`

## Related code (repo-anchored)

### User language preference + persistence
- Preferences context (theme + language + persistence): `lib/context/PreferencesContext.tsx`
  - Persists language to:
    - localStorage key `lb-language`
    - `users.language`
    - `user_preferences.language` (tenant-scoped)
- Language selector UI: `components/navigation/LanguageSwitcher.tsx`

### UI copy translations (limited coverage)
- Hardcoded UI copy for marketing/auth: `lib/i18n/ui.ts`
  - Used by marketing/auth pages (e.g. `app/(marketing)/auth/*`)

### Content translations (games)
- DB table: `public.game_translations` (migration `supabase/migrations/20251208090000_games_translations_media.sql`)
- API routes join game translations:
  - `app/api/games/[gameId]/route.ts`
  - `app/api/plans/[planId]/play/route.ts`
  - `app/api/plans/search/route.ts`
- Fallback selection logic (currently hardcoded order): `lib/services/planner.server.ts`
- Game detail page translation pick: `app/app/games/[gameId]/page.tsx`

## Data model

### Language preference primitives
- Enum: `language_code_enum` (`NO | SE | EN`) (migration `supabase/migrations/20251129000000_initial_schema.sql`)
- Tenant default: `tenants.main_language`
- User preference: `users.language`
- Tenant-scoped preference (analytics / per-tenant settings): `user_preferences.language`

### Content translation tables
- `game_translations(game_id, locale)` where `locale` is text (typically `sv`, `no`, `en`)
  - RLS mirrors games visibility and tenant ownership (see migration `20251208090000_games_translations_media.sql`)

### Locale columns in “builder v1/v2” tables
Some structured game content tables include a `locale TEXT` column and explicitly document fallback behavior as:
- prefer exact locale match
- else fall back to `NULL` (default language)

Examples (migrations):
- `supabase/migrations/20251216010000_game_builder_p0.sql` (`game_steps`, `game_materials`)
- `supabase/migrations/20251216020000_game_phases.sql` (`game_phases`)
- `supabase/migrations/20251216030000_game_roles.sql` (`game_roles`)
- `supabase/migrations/20251216040000_game_board_config.sql` (`game_board_config`)

The Play runtime schema also follows this “exact locale or NULL fallback” pattern (e.g. `supabase/migrations/20251216160000_play_runtime_schema.sql`).

## Core concepts

### LanguageCode vs locale
There are two related but distinct identifiers in the codebase:
- **LanguageCode** (UI preference): `NO | SE | EN` (uppercase)
- **Locale** (content rows): `sv | no | en` (lowercase)

Currently, several content rendering paths use a hardcoded locale order (e.g. `sv → no → en`) instead of deriving from the active `LanguageCode`.

### Locale fallback rules (as implemented)

**Game translations (`game_translations`)**
- Many read paths fetch all translations and choose the best match client/server side.
- Fallback order is currently hardcoded in multiple places:
  - `lib/services/planner.server.ts`: `DEFAULT_LOCALE_ORDER = ['sv', 'no', 'en']`
  - `app/app/games/[gameId]/page.tsx`: `localePriority = ['sv', 'no', 'en']`

**Structured game content tables with `locale TEXT` and `NULL` fallback**
- SQL and RPC logic often uses: `(row.locale = p_locale OR row.locale IS NULL)`

## Security model

### RLS for translations
`game_translations` RLS is enabled and is scoped via the related `games` row:
- Read: allowed for published global games, and for authenticated users reading games owned by one of their tenants
- Write: allowed only for tenant members editing games owned by their tenant

See: `supabase/migrations/20251208090000_games_translations_media.sql`.

### API layer
- Public/non-elevated reads are additionally gated by game status (`published`) and tenant entitlement checks in the Games API.
- Translation rows are fetched via joins in API routes and returned as part of game payloads.

## Known gaps / drift risks
- UI translations beyond marketing/auth are mostly hardcoded and not wired to `LanguageCode`.
- Locale fallback order is duplicated and hardcoded in multiple places.
- `LanguageCode` and content locales are not centralized in a single mapping utility.
- No admin UI for managing translations or reporting missing locales.

## Validation checklist
- Language preference persists correctly for:
  - logged-out users (localStorage)
  - logged-in users (`users.language`)
  - tenant-scoped preference (`user_preferences.language`)
- Marketing/auth pages render copy using `lib/i18n/ui.ts`.
- Games/Planner/Play payloads include `translations: game_translations(*)` and choose a fallback translation.
- RLS blocks reads of tenant-owned game translations for non-tenant members.
- “Exact locale or NULL fallback” queries are consistent for builder/structured content tables.
