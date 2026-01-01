# Award Builder — Canonical Export Schema (v1)

Last updated: 2026-01-01
Status: Canonical (decision 2026-01-01)
Audience: Product / Engineering

## Purpose
Define a single canonical, versioned export format for achievements/awards that:
- Both builder UIs must be able to export and import.
- Contains fields required by DiceCoin UX (locked achievements + hints + easter eggs).
- Separates *authoring schema* from *storage schema* (DB tables can evolve).

## Versioning
- `schema_version` is required.
- Backwards compatibility policy:
  - Minor additions (new optional fields) do not bump major.
  - Breaking changes bump major.

## Top-level structure
```json
{
  "schema_version": "1.0",
  "exported_at": "2026-01-01T12:00:00Z",
  "exported_by": {
    "user_id": "00000000-0000-0000-0000-000000000000",
    "tool": "admin-wizard|standalone-builder",
    "tool_version": "optional"
  },
  "publish_scope": {
    "type": "global|tenant",
    "tenant_id": "uuid|null"
  },
  "achievements": [
    {
      "achievement_key": "string",
      "name": "string",
      "description": "string",
      "icon": {
        "icon_media_id": "uuid|null",
        "icon_url_legacy": "string|null"
      },
      "badge": {
        "badge_color": "string|null"
      },
      "visibility": {
        "is_easter_egg": false,
        "hint_text": "string|null"
      },
      "unlock": {
        "condition_type": "string",
        "condition_value": "number|null",
        "unlock_criteria": {
          "type": "event|milestone|manual",
          "params": {}
        }
      }
    }
  ]
}
```

## Field notes
- `publish_scope.type`:
  - `global`: curated by `system_admin`.
  - `tenant`: curated by `tenant_admin` within a specific tenant.
- `publish_scope.tenant_id`:
  - Must be `null` for `global`.
  - Must be a UUID for `tenant`.
- `visibility.is_easter_egg`:
  - If `true`, UI must not show hints/criteria (show `?` only).
- `visibility.hint_text`:
  - Only used when locked and not easter egg.
- `unlock.condition_type` / `unlock.condition_value`:
  - Compatibility bridge with existing DB fields.
- `unlock.unlock_criteria`:
  - Structured format preferred; can start minimal and evolve.

## Mapping to DB (current direction)
- Hybrid achievements scope (decision 2026-01-01):
  - `publish_scope.global` → `achievements.tenant_id = NULL`
  - `publish_scope.tenant` → `achievements.tenant_id = <tenant>`

## Next implementation step
- Pick one location for persistence:
  - Option A: store this JSON as a versioned blob (`award_builder_exports` table) and generate DB rows from it.
  - Option B: write directly to `achievements` and store `schema_version` + minimal provenance fields.
