# GAMES DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
Games Domain owns:
- The canonical “games” content model (draft vs published)
- Domain relations for translation + media + structured content
- Search/browse access patterns for games (tenant-aware entitlements)
- Admin content workflows (builder, publish, CSV import/export)

Non-goals:
- Billing/subscription management (Billing & Licensing Domain) — Games only *consumes* entitlements.
- Tenant lifecycle (Tenant Domain).

## Related docs
- CSV contract reference: `docs/CSV_IMPORT_FIELD_REFERENCE.md`
- Billing entitlements and product mapping: `docs/BILLING_LICENSING_DOMAIN.md` + `docs/STRIPE.md`
- Media junction patterns: `docs/MEDIA_DOMAIN.md`

## Related code (repo-anchored)

### API routes (App Router)
Core:
- `app/api/games/route.ts` (POST create)
- `app/api/games/[gameId]/route.ts` (GET read with relations; PATCH update; DELETE)
- `app/api/games/[gameId]/publish/route.ts` (POST publish)

Discovery/browse:
- `app/api/games/search/route.ts` (POST search)
- `app/api/games/featured/route.ts` (GET featured list)
- `app/api/games/[gameId]/related/route.ts` (GET related)

Admin content ops:
- `app/api/games/builder/route.ts` (POST create builder “v2” shape)
- `app/api/games/builder/[id]/route.ts` (GET/PUT builder “v2” shape)
- `app/api/games/csv-import/route.ts` (POST import)
- `app/api/games/csv-export/route.ts` (GET export)

Entitlements helper:
- `app/api/games/utils.ts` (`getAllowedProductIds`)

Validation:
- `lib/validation/games` (`validateGamePayload`)

Legacy/DB helpers (still used in some places):
- `lib/db/games.ts` (CRUD + relations, includes legacy media access)
- `lib/db/browse.ts` (browse queries)
- `lib/services/gameService.ts` (legacy)

UI (admin content):
- `app/admin/content/page.tsx` (content admin)
- `app/admin/games/builder/*` (builder UI)

## Core concepts

### Global vs tenant-owned games
- **Global game**: `games.owner_tenant_id IS NULL`
- **Tenant-owned game**: `games.owner_tenant_id = <tenantId>`

Many read paths intentionally allow mixing:
- for a tenant browse request: tenant-owned **or** global
- for public/non-tenant browse: global only

### Draft vs published
- `games.status` (enum) is used to gate visibility.
- Non-elevated users only see `status = 'published'`.

Publishing is a dedicated flow:
- `POST /api/games/:id/publish` enforces role gate + cover image requirement before setting `status='published'`.

### Entitlements (product access)
Games access is filtered using “allowed products” for a tenant:
- `app/api/games/utils.ts` reads active/trial/paused `tenant_subscriptions`
- it maps `billing_products.billing_product_key` → `products.product_key`
- returns the set of allowed `products.id` used by `games.product_id` filters

Note: this mapping exists because `billing_products` is not directly linked to `products`.

### Builder content model
The builder endpoints write/read a “v2” structured model:
- steps: `game_steps`
- materials: `game_materials`
- phases: `game_phases`
- roles: `game_roles`
- board config: `game_board_config`
- cover image mapping via `game_media(kind='cover')`

## Data model (current)
Primary tables:
- `games`
- `purposes` (main purpose via `games.main_purpose_id`)
- `game_secondary_purposes` (M:M)

Translations/media:
- `game_translations` (per-locale text/content)
- `game_media` (junction to `media`, with `kind` + `position` + `tenant_id`)
- `media` (media objects)

Builder structured content:
- `game_steps`
- `game_materials`
- `game_phases`
- `game_roles`
- `game_board_config`

Observability:
- `browse_search_logs` (search requests logged best-effort)

### Known drift/legacy surfaces
- Some legacy code paths still read `media.game_id` directly.
  - In migrations this is marked deprecated: prefer the `game_media` junction.
- Role checks vary by endpoint (`app_metadata.role` checks are not yet fully centralized).
- Builder endpoints currently use a service role client and should be treated as privileged admin-only APIs.

## API surface (summary)
- `POST /api/games` (create)
- `GET /api/games/:gameId` (read)
- `PATCH /api/games/:gameId` (update)
- `DELETE /api/games/:gameId` (delete)
- `POST /api/games/:gameId/publish` (publish)
- `POST /api/games/search` (search)
- `GET /api/games/featured` (featured)
- `GET /api/games/:gameId/related` (related)
- `POST /api/games/builder` (builder create)
- `GET|PUT /api/games/builder/:id` (builder read/update)
- `POST /api/games/csv-import` (import)
- `GET /api/games/csv-export` (export)

## Security model (as implemented)

### Read paths
- Non-elevated access:
  - only `published`
  - tenant-scoped mix of (tenant-owned or global)
  - product filter based on tenant entitlements

### Write paths
- `/api/games/:id` update uses an elevated role gate:
  - tenant admins can only edit games they own (`owner_tenant_id === activeTenantId`)
  - system admins can edit across tenants
- `/api/games/:id/publish` currently requires `app_metadata.role` `admin` or `owner`.

### Privileged admin ops
- `/api/games/builder/*` uses `createServiceRoleClient()`.
  - Treat as privileged: ensure it’s only reachable from protected admin flows.

## Validation checklist
- Search respects tenant entitlements via `getAllowedProductIds`.
- Non-elevated users cannot read draft games.
- Publish endpoint blocks when no cover exists in `game_media`.
- Builder read/write returns structured tables (`game_steps`, `game_materials`, `game_phases`, `game_roles`, `game_board_config`).
- CSV import supports `sub_purpose_ids` and remains backward compatible with `sub_purpose_id`.
