# Lekbanken docs (Source of Truth)

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Active entrypoint for the `docs/` tree. Use this file to route into canonical clusters and governance docs.

Detta är den **aktuella** dokumentationen för Lekbanken.

- Repo:t (docs/ + sandbox/wiki) är **Single Source of Truth**.
- Notion är en **spegel/portal** som ska länka hit, inte divergera.

## Start här

- Root product context: [../PROJECT_CONTEXT.md](../PROJECT_CONTEXT.md)
- Root inventory governance: [../INVENTORY_RULES.md](../INVENTORY_RULES.md) + [../INVENTORY_DECISIONS.md](../INVENTORY_DECISIONS.md)
- Systemöversikt (för humans + AI): se [../sandbox/wiki/README.md](../sandbox/wiki/README.md)
- Authoritative docs registry: se [INVENTORY.md](INVENTORY.md)
- Quick docs entry map: se [DOCS_INDEX.md](DOCS_INDEX.md)
- Naming/struktur: se [DOCS_NAMING_CONVENTIONS.md](DOCS_NAMING_CONVENTIONS.md)
- Canonical doc map: se [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md)
- Dateringsstandard: se [DOCUMENT_DATING_STANDARD.md](DOCUMENT_DATING_STANDARD.md)
- Triplet workflow: se [TRIPLET_WORKFLOW_STANDARD.md](TRIPLET_WORKFLOW_STANDARD.md)
- Triplet creation checklist: se [TRIPLET_CREATION_CHECKLIST.md](TRIPLET_CREATION_CHECKLIST.md)
- Launch program status: se [../launch-readiness/launch-control.md](../launch-readiness/launch-control.md)
- Launch audits: se [../launch-readiness/audits/README.md](../launch-readiness/audits/README.md)
- Launch remediation records: se [../launch-readiness/implementation/README.md](../launch-readiness/implementation/README.md)
- Internationalization guide: se [I18N_GUIDE.md](I18N_GUIDE.md)
- VS Code/session workflow: se [VS_CODE_WORKFLOW.md](VS_CODE_WORKFLOW.md)
- CLI/MCP tool policy: se [TOOLING_MATRIX.md](TOOLING_MATRIX.md)
- Artifact UI specs (draft): se [ARTIFACT_COMPONENTS.md](ARTIFACT_COMPONENTS.md) + [ARTIFACT_MATRIX.md](ARTIFACT_MATRIX.md)
- AI coding guardrails: se [AI_CODING_GUIDELINES.md](AI_CODING_GUIDELINES.md)
- DB/migrations: se [MIGRATIONS.md](MIGRATIONS.md)
- Database cluster: [database/README.md](database/README.md)
- Demo cluster: [demo/README.md](demo/README.md)
- Notifications cluster: [notifications/README.md](notifications/README.md)
- Profile cluster: [profile/README.md](profile/README.md)
- Play cluster: [play/README.md](play/README.md)
- Participants cluster: [participants/README.md](participants/README.md)
- Support cluster: [support/README.md](support/README.md)
- Games cluster: [games/README.md](games/README.md)
- Builder cluster: [builder/README.md](builder/README.md)
- Billing cluster: [billing/README.md](billing/README.md)
- Browse cluster: [browse/README.md](browse/README.md)
- Content cluster: [content/README.md](content/README.md)
- Import docs: [import/README.md](import/README.md)
- Journey cluster: [journey/README.md](journey/README.md)
- Legal cluster: [legal/README.md](legal/README.md)
- Marketing cluster: [marketing/README.md](marketing/README.md)
- Media cluster: [media/README.md](media/README.md)
- Sandbox docs: [sandbox/README.md](sandbox/README.md)
- Toolkit docs: [toolkit/README.md](toolkit/README.md)
- Auth/RBAC cluster: [auth/README.md](auth/README.md) + AUTH_SYSTEM_ANALYSIS.md (historisk/archived)
- Admin cluster: [admin/README.md](admin/README.md)
- Ops/runbooks: ops/
- Validation snapshots: validation/README.md
- Release path: [ops/release-promotion-checklist.md](ops/release-promotion-checklist.md)
- Notion AI pack: notion-ai/
- Rapporter/analys (arkiv): se [reports/README.md](reports/README.md)
- Arkivindex: se [archive/README.md](archive/README.md)

## Dokumentationskontrakt

### Regler

- Om en ändring påverkar beteende/struktur ska docs uppdateras i samma PR.
- Om området använder `architecture + audit + implementation plan` ska [TRIPLET_WORKFLOW_STANDARD.md](TRIPLET_WORKFLOW_STANDARD.md) följas.
- Varje “core doc” ska ha en tydlig scope, och kunna valideras mot kod/DB.
- Dokument som är historiska (plan/rapport/todo) ska tydligt markeras som sådana.
- Om flera dokument beskriver samma område ska ett av dem tydligt vara den kanoniska ingången.
- `INVENTORY.md` är enda auktoritativa filregistret för `docs/**/*.md`.
- `DOCS_INDEX.md` är en lättviktig entry map, inte en andra metadataregisteryta.
- Aktiv områdesdokumentation ska över tid flytta in i klustermappar; historik ska hamna djupare i samma kluster när det är praktiskt säkert.

### Fält (rekommenderat)

För nya eller uppdaterade core-dokument:

- Owner:
- Status: active | draft | deprecated | frozen audit | historical snapshot
- Last validated: YYYY-MM-DD

För exakt betydelse av datumfält: se [DOCUMENT_DATING_STANDARD.md](DOCUMENT_DATING_STANDARD.md)

## Notion

Se [NOTION.md](NOTION.md) för strategi och synk.

Operativt stöd:
- [NOTION_SYNC_PLAN.md](NOTION_SYNC_PLAN.md)
- [NOTION_UPDATE_CHECKLIST.md](NOTION_UPDATE_CHECKLIST.md)
