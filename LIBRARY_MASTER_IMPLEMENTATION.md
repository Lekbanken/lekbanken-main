# Lekbanken Admin — Library (Bibliotek) Master Implementation

Last updated: 2026-01-01
Status: IN PROGRESS (tenant-scope MVP complete; global-scope deferred)
Owner: Admin (Library module)
Scope: Library-first IA for Badges only (MVP)

## Locked decisions (must not change)
- Library is a first-class Admin module (separate menu entry).
- MVP asset types: **Badges only**.
- Canonical persistence: `public.award_builder_exports` via Admin API routes:
  - `GET /api/admin/award-builder/exports?scopeType=tenant&tenantId=<uuid>`
  - `POST /api/admin/award-builder/exports`
  - `GET /api/admin/award-builder/exports/<exportId>`
  - `PUT /api/admin/award-builder/exports/<exportId>`
- Builder is an editor; Library is the hub.
- Multi-tenant: must use existing active-tenant mechanism (no guessing).

## What exists already (repo facts)
- Admin Achievements UI is currently mock-backed:
  - `features/admin/achievements/AchievementAdminPage.tsx` uses `features/admin/achievements/data.ts`.
- Canonical persistence exists:
  - DB migration: `supabase/migrations/20260101152000_award_builder_exports_v1.sql`
  - API routes:
    - `app/api/admin/award-builder/exports/route.ts`
    - `app/api/admin/award-builder/exports/[exportId]/route.ts`

## Implementation plan (living)
### Step 1 — IA & navigation
- [x] Add menu entry: **Bibliotek**
- [x] Add route: `/admin/library/badges`
- [x] Make `/admin/achievements` redirect/alias to `/admin/library/badges`
- [x] RBAC: map `/admin/library/badges` to existing permission `admin.achievements.list`

### Step 2 — Library UI (Badges)
- [x] Reuse existing grid/editor UI from Achievements, but swap data source to exports API.
- [x] Support:
  - Search
  - Status filter (Draft/Published)
  - Create → POST export (create row) → PUT rewrite to canonical identity → open builder with `exportId`
  - Open existing → load export by `exportId` and hydrate builder
  - Save → PUT export (same `exportId`) and update list
- [x] States:
  - Loading
  - Empty
  - Error

### Step 3 — Multi-tenant & scope
- [x] Tenant-scope is default.
- [ ] Global-scope is available only to system_admin (API enforces; UI toggle deferred).
- [x] TenantId must come from existing active-tenant mechanism.

## Files / routes to be touched (expected)
- Navigation:
  - `app/admin/components/admin-nav-config.tsx`
  - `app/admin/components/admin-nav-items.tsx`
  - `features/admin/shared/hooks/useRbac.ts`
- Routes:
  - `/admin/library/badges` (new)
  - `/admin/achievements` (redirect)
- UI reuse:
  - `features/admin/achievements/*` components reused by Library Badges

## Known limitations (explicit)
- Publish workflow is not implemented end-to-end; Draft/Published is currently a UI/editor concept stored inside the builder payload at `unlock_criteria.params.builder.badge.status`.
- `award_builder_exports` is created via migration and may not be present in generated Supabase TS types until types are regenerated; API routes locally augment typing and cast validated exports to `Json`.

## Current Export JSON (as implemented)

This section captures the exact JSON shape that was produced/consumed by the Library Badges UI **before** the schema-alignment work in this task.

### Where it is produced
- Producer: `features/admin/library/badges/LibraryBadgesPage.tsx` → `buildExportJson(tenantId, item)`
- Written via:
  - `POST /api/admin/award-builder/exports` (create)
  - `PUT /api/admin/award-builder/exports/:exportId` (save)
- Stored at: `public.award_builder_exports.export` (jsonb)

### AS-IS export JSON shape (produced on create/save)

```json
{
  "schema_version": "1.0",
  "publish_scope": { "type": "tenant", "tenant_id": "<tenant_uuid>" },
  "meta": {
    "status": "draft|published",
    "version": 1,
    "title": "<badge title>"
  },
  "badge": {
    "id": "<exportId or temp-*>",
    "title": "...",
    "subtitle": "...",
    "description": "...",
    "rewardCoins": 0,
    "status": "draft|published",
    "version": 1,
    "icon": { "...": "(layered icon config)" },
    "profileFrameSync": { "enabled": false },
    "publishedRoles": []
  },
  "achievements": [
    {
      "achievement_key": "<badge id>",
      "name": "<badge title>",
      "description": "<badge description>"
    }
  ]
}
```

Notes:
- The `badge` object is a partial/full `AchievementItem` payload (UI/editor model).
- `meta` is used as a lightweight metadata envelope for status/version/title.
- The `achievements` array is present, but does **not** match the canonical schema’s required nested fields.

### Where it is consumed
- Consumer: `features/admin/library/badges/LibraryBadgesPage.tsx` → `extractBadgeItem(id, exportJson)`
- Read via:
  - `GET /api/admin/award-builder/exports?scopeType=tenant&tenantId=...` (list)
  - `GET /api/admin/award-builder/exports/:exportId` (single)

### AS-IS load expectations
`extractBadgeItem()` accepted either:
1) `exportJson.badge` (preferred): treat it as an `AchievementItem` and render/edit it.
2) Fallback: `exportJson.achievements[0]` (minimal) to render *something* even if `badge` is missing.

### Fields used by Library UI (AS-IS)
- Title:
  - Primary: `export.badge.title`
  - Fallback: `export.achievements[0].name|title`
- Status:
  - Primary: `export.badge.status`
  - Fallback: `export.meta.status`
- Version:
  - Primary: `export.badge.version`
  - Fallback: `export.meta.version`
- Preview/theme filtering:
  - Reads layered icon config from `export.badge.icon` (themeId, layers)

## Schema Alignment Matrix (AS-IS vs Canonical V1)

Canonical reference: `docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md`.

Legend:
- ✅ Matchar exakt
- ⚠️ Avvikelse men tolererbar (optional/kan utelämnas)
- ❌ Bryter schema

| Area | Canonical V1 requirement | AS-IS (LibraryBadgesPage) | Status |
|------|--------------------------|---------------------------|--------|
| `schema_version` | required string ("1.0") | present (`"1.0"`) | ✅ |
| `exported_at` | required ISO datetime string | **missing** | ❌ |
| `exported_by` | required object `{ user_id, tool, tool_version? }` | **missing** | ❌ |
| `publish_scope` | required `{ type, tenant_id }` with constraints | present, but union type omitted `tenant_id:null` case | ✅ |
| `achievements` | required array | present, but item shape incomplete | ❌ |
| `achievements[].icon` | required `{ icon_media_id, icon_url_legacy }` | **missing** | ❌ |
| `achievements[].badge` | required `{ badge_color }` | **missing** | ❌ |
| `achievements[].visibility` | required `{ is_easter_egg, hint_text }` | **missing** | ❌ |
| `achievements[].unlock` | required `{ condition_type, condition_value, unlock_criteria{type,params} }` | **missing** | ❌ |
| Extra top-level keys | only those in schema | `meta`, `badge` (extra) | ❌ |
| Load behavior | should hydrate from canonical shape | accepts non-canonical `badge` + fallback | ❌ |

Conclusion (AS-IS): the Library export JSON **does not** strictly follow canonical V1. It contains extra top-level keys and omits required canonical fields.

## Current Export JSON (aligned to Canonical V1)

✅ **Confirmation:** Library badge exports now strictly follow `docs/gamification/AWARD_BUILDER_EXPORT_SCHEMA_V1.md`.

### Where it is produced (current)
- Producer: `features/admin/library/badges/LibraryBadgesPage.tsx` → `buildExportJson({ ... })`
- Validation:
  - UI: validates with `lib/validation/awardBuilderExportSchemaV1.ts` before sending
  - API: validates `export` on POST/PUT with the same schema

### Canonical export JSON shape (produced on create/save)

```json
{
  "schema_version": "1.0",
  "exported_at": "<ISO datetime>",
  "exported_by": {
    "user_id": "<authenticated user uuid>",
    "tool": "admin-library-badges",
    "tool_version": "optional"
  },
  "publish_scope": {
    "type": "tenant",
    "tenant_id": "<tenant uuid>"
  },
  "achievements": [
    {
      "achievement_key": "<exportId>",
      "name": "<badge title>",
      "description": "<badge description>",
      "icon": {
        "icon_media_id": null,
        "icon_url_legacy": null
      },
      "badge": {
        "badge_color": null
      },
      "visibility": {
        "is_easter_egg": false,
        "hint_text": null
      },
      "unlock": {
        "condition_type": "manual",
        "condition_value": null,
        "unlock_criteria": {
          "type": "manual",
          "params": {
            "builder": {
              "badge": { "...": "(AchievementItem editor payload)" }
            }
          }
        }
      }
    }
  ]
}
```

Important:
- The UI/editor payload is stored under `achievements[0].unlock.unlock_criteria.params.builder.badge`.
- This is **not** a schema change: `unlock_criteria.params` is explicitly defined as an open object in V1.
- There are **no** extra top-level keys.

### Where it is consumed (current)
- Library consumer: `features/admin/library/badges/LibraryBadgesPage.tsx` → `extractBadgeItem(exportId, exportJson)`
- Load expectations (strict):
  - `exportJson` must validate against V1.
  - `exportJson.achievements[0].unlock.unlock_criteria.params.builder.badge` must exist.
  - If missing/invalid: Library surfaces a clear error message (no auto-migration).

### Fields used by Library UI (current)
- Title:
  - Primary: `achievements[0].unlock.unlock_criteria.params.builder.badge.title`
  - Fallback (defensive): `achievements[0].name`
- Description:
  - Primary: `...builder.badge.description` (or `subtitle` fallback inside editor model)
  - Fallback: `achievements[0].description`
- Status (Draft/Published):
  - `...builder.badge.status`
- Version:
  - `...builder.badge.version`
- Preview/theme filtering:
  - layered icon config: `...builder.badge.icon` (themeId, layers)

### Fields currently ignored by Library UI
- `exported_at` (display)
- `exported_by.*` (display)
- `publish_scope.*` (display)
- `achievements[0].icon.*` (always `null` today)
- `achievements[0].badge.badge_color` (always `null` today)
- `achievements[0].visibility.*` (always `false/null` today)
- `achievements[0].unlock.condition_type/condition_value` (always `manual/null` today)

## Schema Alignment Matrix (current)

| Area | Canonical V1 requirement | Current implementation | Status |
|------|--------------------------|------------------------|--------|
| `schema_version` | required string ("1.0") | present (`"1.0"`) | ✅ |
| `exported_at` | required ISO datetime string | present | ✅ |
| `exported_by` | required object `{ user_id, tool, tool_version? }` | present (`tool_version` omitted) | ✅ |
| `publish_scope` | required `{ type, tenant_id }` with constraints | present + enforced (API) | ✅ |
| `achievements` | required array | present (length ≥ 1) | ✅ |
| `achievements[].icon` | required `{ icon_media_id, icon_url_legacy }` | present (`null/null`) | ✅ |
| `achievements[].badge` | required `{ badge_color }` | present (`null`) | ✅ |
| `achievements[].visibility` | required `{ is_easter_egg, hint_text }` | present (`false/null`) | ✅ |
| `achievements[].unlock` | required `{ condition_type, condition_value, unlock_criteria{type,params} }` | present (`manual/null`, payload in `params`) | ✅ |
| Extra top-level keys | only those in schema | none | ✅ |
| Round-trip | load/save without loss | stored under `unlock_criteria.params.builder.badge` | ✅ |

## Runtime safety (v1)
- Strict Zod validation on both UI + API.
- No auto-migration of incompatible exports. Invalid exports produce explicit errors so they can be corrected at the source.

## Known limitations (explicit, current)
- Existing non-canonical rows in `award_builder_exports.export` (created before this alignment) will fail to load until they are manually re-exported into V1.
- Library currently uses only `achievements[0]` (single-badge per export). Supporting multiple achievements per export would require an explicit product/UX decision.

## Future schema v2 note (non-implementation)
- If/when we need first-class support for layered icon configs, publish workflow, or richer unlock criteria, that belongs in a deliberate schema v2 proposal (not in v1 via ad-hoc top-level fields).

## Implemented (so far)
- Navigation:
  - `app/admin/components/admin-nav-config.tsx`: Added **Bibliotek** group; removed duplicate Achievements entry.
  - `app/admin/components/admin-nav-items.tsx`: Added Bibliotek; removed Achievements.
- Routing:
  - `app/admin/achievements/page.tsx`: Redirects to `/admin/library/badges`.
  - `app/admin/library/badges/page.tsx`: New page.
- RBAC:
  - `features/admin/shared/hooks/useRbac.ts`: `/admin/library/*` maps to `admin.achievements.list`.
- API:
  - `app/api/admin/award-builder/exports/route.ts`: List endpoint now includes `export` JSON for Library rendering.
- UI:
  - `features/admin/library/badges/LibraryBadgesPage.tsx`: Library Badges hub wired to exports API.
  - `features/admin/achievements/components/AchievementLibraryGrid.tsx`: Added status filter.
  - `features/admin/achievements/editor/AchievementEditor.tsx`: Real async save (no simulated delay) + draft sync.
