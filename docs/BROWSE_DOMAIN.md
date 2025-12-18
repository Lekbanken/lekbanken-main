# Browse Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-18

## Purpose

Browse Domain ansvarar för **upptäckt av lekar/aktiviteter** i appen: sök, filter, sortering, “utvalda” (featured) och “relaterade” rekommendationer på detaljsidan.

Domänen är en **read/discovery-yta** ovanpå Games Domain (som äger själva innehållet).

## Key responsibilities

- Tillhandahålla UI för upptäckt: browse-sida med sök, filter, sortering och pagination.
- Exponera entitlement-aware API:er för listning/search som tar hänsyn till tenant + licenser.
- Leverera filterdata (produkter + syften) scoped till tenant och dess tillgångar.
- Logga sök (analytics) i `browse_search_logs`.

## Non-goals

- Skapa/uppdatera lekar (Content Management Domain + Games Domain).
- Plan-sök / plan-listor (Planner Domain).
- Avancerad ML-rekommendationsmotor (nuvarande rekommendationer är heuristiska/rankade queries).

## UI surface

Primär route:
- `app/app/browse/page.tsx` → renderar `features/browse/BrowsePage.tsx`

Nyckelkomponenter:
- `features/browse/BrowsePage.tsx`
  - Debounced search input (300ms)
  - Tenant-awareness via `useTenant()`
  - Hämtar filter: `GET /api/browse/filters?tenantId=`
  - Hämtar spel: `POST /api/games/search`
  - Hämtar utvalda: `GET /api/games/featured?tenantId=&limit=`
  - Visar “no access” när tenant saknar tillåtna produkter
- Filter/UI:
  - `features/browse/components/FilterBar.tsx`
  - `features/browse/components/FilterSheet.tsx`
  - `features/browse/components/SearchBar.tsx`

## API surface (server)

### `GET /api/browse/filters`
Fil: `app/api/browse/filters/route.ts`

- Input: `tenantId` (query param, optional)
- Output:
  - `products`: aktiva produkter (scopade till tenant entitlements om tenantId ges)
  - `purposes`: main purposes för tillåtna produkter
  - `subPurposes`: sub purposes för tillåtna produkter (filtrerade så att `parent_id` finns i main-set när möjligt)
  - `metadata.allowedProducts`: lista product IDs som tenant får via subscription
- Cache: in-memory cache per tenant i 5 minuter (gäller per server instance).

### `POST /api/games/search`
Fil: `app/api/games/search/route.ts`

- Validering: `searchSchema` i `app/api/games/search/helpers.ts` (Zod)
- Stöd:
  - `tenantId` (nullable)
  - `search` (name/description ilike)
  - Filter: `products`, `mainPurposes`, `subPurposes`, `energyLevels`, `environment`, `groupSizes`, player/age/time ranges
  - Sort: `relevance | newest | popular | name | duration | rating`
  - Paging: `page` (default 1), `pageSize` (default 24, max 50)
- Tenancy + “global games”:
  - För icke-elevated: om tenantId finns → `owner_tenant_id = tenantId OR NULL`, annars endast `owner_tenant_id IS NULL`.
- Status:
  - För icke-elevated: alltid `status = published`
  - För elevated (system_admin/superadmin/admin/owner): kan styra via `status` (`published | draft | all`)
- Sub-purpose filter:
  - Resolvas via lookup i `game_secondary_purposes`, därefter `query.in('id', subPurposeGameIds)`
- Group sizes:
  - Byggs som Supabase `.or(...)`-sträng via `buildGroupSizeOr()` (small/medium/large)
- Logging:
  - Best-effort insert till `browse_search_logs` när `search` eller filter används.

### `GET /api/games/featured`
Fil: `app/api/games/featured/route.ts`

- Input: `tenantId` (optional), `limit` (default 8, max 50)
- Output: listade `published` games, tenant-aware owner filter, entitlement-aware product filter
- Sort: `popularity_score desc`, `rating_count desc`, `created_at desc`

### `GET /api/games/[gameId]/related`
Fil: `app/api/games/[gameId]/related/route.ts`

- Input: `tenantId` (optional), `limit` (default 6, max 24)
- Krav:
  - Bas-game måste vara `published`
  - Tenant + entitlement checks gör “not found”/tomma listor
- Ranking:
  - Score = product match (+3) + main purpose match (+2) + secondary overlap (+1)
  - Tiebreak: nyast

## Entitlements (tenant → allowed products)

Kärnmekanism:
- `getAllowedProductIds()` i `app/api/games/utils.ts`
  - Hämtar `tenant_subscriptions` för tenant (RLS)
  - Mappar `billing_products.billing_product_key` → `products.product_key`
  - Returnerar `allowedProductIds`

Beteende i Browse:
- Om `tenantId` ges men `allowedProductIds` blir tom:
  - `GET /api/browse/filters` → tomma filter
  - `GET /api/games/featured` → tom lista
  - `POST /api/games/search` → tom lista (för icke-elevated)

## Data model (Supabase)

Browse är primärt en läsdomän men använder flera tabeller.

### Centrala tabeller

- `games`
  - `status` (`published`/`draft`)
  - `owner_tenant_id` (tenant-scope vs global)
  - `product_id`, `main_purpose_id`
  - `energy_level`, `location_type`
  - `time_estimate_min`, `min_players`, `max_players`, `age_min`, `age_max`
  - Browse metrics (migration `20251209000100_add_game_metrics.sql`):
    - `popularity_score` (double)
    - `rating_average` (double)
    - `rating_count` (int)
- `products`, `purposes`, `product_purposes`
- `game_secondary_purposes`
- `browse_search_logs`
  - `search_term`, `filters_applied` (jsonb), `results_count`, `result_ids` (uuid[])

### Migrations

- `supabase/migrations/20251129000000_initial_schema.sql`
  - Skapar `browse_search_logs` + bas-RLS
- `supabase/migrations/20251209000100_add_game_metrics.sql`
  - Lägger metricskolumner + index för sorting
- `supabase/migrations/20251209000110_browse_search_logs_insert_policy.sql`
  - Tillåter INSERT för authenticated (egen user_id + tenant medlem) eller service role

## RLS & security notes (reality)

- `browse_search_logs` har RLS för SELECT (egna logs eller tenant logs) i initial schema, och en separat INSERT policy (20251209000110).
- `POST /api/games/search` och `GET /api/games/featured` gör entitlement checks i handlern, inte via RLS.
- RLS-policy för `games` i initial schema innehåller `OR (owner_tenant_id IS NULL)` vilket gör att global games kan bli läsbara även utan `status = published`. Därför är handler-level `status`-filter viktigt för “public browse”/end users.

## Legacy / internal helpers

Det finns äldre browse-helpers som inte alltid är entitlement-aware:
- `lib/db/browse.ts` (browse queries + log helpers)
- `lib/services/gameService.ts` (sök/lista games)

Historik/anteckningar:
- `docs/BROWSE_REWORK_NOTES.md`

## Tests

- `tests/browse/search-helpers.test.cjs`
  - Smoke tests för `searchSchema`, `normalizeEnvironment`, `buildGroupSizeOr`, `computeHasMore`

## Current state (reality check)

- Browse UI (`/app/browse`) använder de entitlement-aware API:erna (`/api/browse/filters`, `/api/games/search`, `/api/games/featured`).
- Det finns även server-side läsning av game details i `lib/services/games.server.ts` (används av `app/app/games/[gameId]/page.tsx`) som idag hämtar relaterade games via en enklare query och inte använder `/api/games/[id]/related` (tenant/entitlement-aware ranking). Det är funktionellt men kan divergera från Browse-domänens “riktiga” behavior.
