# Content docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the content management documentation cluster. This cluster is the umbrella for admin-facing content workflows that bridge builder, import/export, and content-planner primitives.

## Purpose

Use this cluster when the task spans structured game authoring, bulk content operations, and tenant content-planner primitives. It routes into the more specific builder and import clusters rather than replacing them.

## Read order

1. [CONTENT_MANAGEMENT_DOMAIN.md](CONTENT_MANAGEMENT_DOMAIN.md)
2. [TRANSLATION_ENGINE_DOMAIN.md](TRANSLATION_ENGINE_DOMAIN.md)
3. [../builder/README.md](../builder/README.md)
4. [../import/README.md](../import/README.md)
5. [../admin/ADMIN_GAME_BUILDER_V1.md](../admin/ADMIN_GAME_BUILDER_V1.md)

## Active docs

- [CONTENT_MANAGEMENT_DOMAIN.md](CONTENT_MANAGEMENT_DOMAIN.md) — current content-management domain reference for builder, bulk ops, and content-planner primitives
- [TRANSLATION_ENGINE_DOMAIN.md](TRANSLATION_ENGINE_DOMAIN.md) — translation-engine domain reference for language preferences, content locales, and fallback rules
- [I18N_GUIDE.md](I18N_GUIDE.md) — active guide for next-intl locale architecture, message sources, and locale-aware UI patterns

## Historical snapshots

- [TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md](TRANSLATION_ENGINE_DOMAIN_VALIDATION_REPORT.md) — earlier validation snapshot for the translation-engine domain
- [I18N_MIGRATION_PLAN.md](I18N_MIGRATION_PLAN.md) — historical snapshot of the repo-wide i18n rollout status and migration progress

## Related docs

- [../builder/README.md](../builder/README.md) — builder-specific audit, contract, and implementation material
- [../import/README.md](../import/README.md) — import validation and fail-fast audit material
- [../admin/ADMIN_GAME_BUILDER_V1.md](../admin/ADMIN_GAME_BUILDER_V1.md) — admin builder UI/API reference
- [../import/CSV_IMPORT_FIELD_REFERENCE.md](../import/CSV_IMPORT_FIELD_REFERENCE.md) — canonical CSV field contract
- [../import/JSON_IMPORT_FIELD_REFERENCE.md](../import/JSON_IMPORT_FIELD_REFERENCE.md) — canonical JSON field contract

## Placement rule

- Keep umbrella content workflow docs in `docs/content/`.
- Keep builder-specific implementation material in `docs/builder/`.
- Keep import validation material in `docs/import/`.
- Do not duplicate builder/import details here when a more specific cluster already owns them.