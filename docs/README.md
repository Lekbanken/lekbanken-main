# Lekbanken docs (Source of Truth)

Detta är den **aktuella** dokumentationen för Lekbanken.

- Repo:t (docs/ + sandbox/wiki) är **Single Source of Truth**.
- Notion är en **spegel/portal** som ska länka hit, inte divergera.

## Start här

- Systemöversikt (för humans + AI): se [../sandbox/wiki/README.md](../sandbox/wiki/README.md)
- Full inventory (alla docs): se [INVENTORY.md](INVENTORY.md)
- DB/migrations: MIGRATIONS.md
- Auth/RBAC: auth/* (aktuellt) + AUTH_SYSTEM_ANALYSIS.md (historisk/archived)
- Admin: ADMIN_OVERVIEW_REPORT.md + admin/
- Games / Game Builder / CSV: ADMIN_GAME_BUILDER_V1.md, TESTPLAN_GAME_BUILDER_P0.md, GAME_BUILDER_UI_SPEC.md, CSV_IMPORT_FIELD_REFERENCE.md
- Ops/runbooks: ops/

## Dokumentationskontrakt

### Regler

- Om en ändring påverkar beteende/struktur ska docs uppdateras i samma PR.
- Varje “core doc” ska ha en tydlig scope, och kunna valideras mot kod/DB.
- Dokument som är historiska (plan/rapport/todo) ska tydligt markeras som sådana.

### Fält (rekommenderat)

För nya eller uppdaterade core-dokument:

- Owner:
- Status: active | draft | deprecated
- Last validated: YYYY-MM-DD

## Notion

Se NOTION.md för strategi och synk.
