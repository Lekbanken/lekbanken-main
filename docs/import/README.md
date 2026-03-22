# Import Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Entry point for the import documentation cluster. Use this folder for bounded import-validation audits and phase/step/artifact fail-fast verification history.

## Purpose

This cluster covers import-pipeline validation audits that verify whether imports fail fast before any database writes occur. It complements the builder and CSV field references but should not be treated as the canonical home for builder UI or import authoring workflows.

## Start here

1. `PHASE_STEP_ARTIFACT_AUDIT_REPORT.md`
2. `../builder/README.md`
3. `../CSV_IMPORT_FIELD_REFERENCE.md`
4. `../JSON_IMPORT_FIELD_REFERENCE.md`

## Status map

### Closed audit references

- `PHASE_STEP_ARTIFACT_AUDIT_REPORT.md` — closed fail-fast audit for phases, steps, roles, and artifact validation coverage in the import pipeline

## Related docs outside this folder

- `../builder/README.md` — canonical builder cluster for authoring workflows and import-related implementation references
- `../CSV_IMPORT_FIELD_REFERENCE.md` — field contract for CSV import/export
- `../JSON_IMPORT_FIELD_REFERENCE.md` — field contract for JSON import/export
- `../toolkit/README.md` — toolkit-facing entrypoint for builder/import guidance

## Working rule

Use this folder for bounded verification of import validation behavior. For current builder/import workflows, prefer the builder and toolkit clusters, then verify runtime behavior in `app/api/admin/games/import/` and related builder validators before treating an audit snapshot as current implementation truth.