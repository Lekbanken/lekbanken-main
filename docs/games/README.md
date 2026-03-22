# Games Docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-21
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the games documentation cluster. This folder covers the games domain, GameDetails context work, and related audit snapshots. Builder UI references remain under the admin cluster and are linked here rather than duplicated.

## Purpose

Use this cluster to understand the games content domain, browse and publish boundaries, GameDetails display/context security work, and the relationship between games data flows and the builder/admin surfaces.

## Start here

1. `GAMES_DOMAIN.md`
2. `GAMEDETAILS_CONTEXT_ARCHITECTURE.md`
3. `GAMEDETAILS_CONTEXT_AUDIT.md`
4. `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md`
5. `../admin/ADMIN_GAME_BUILDER_V1.md`
6. `../import/CSV_IMPORT_FIELD_REFERENCE.md`

## Status map

### Active references

- `GAMES_DOMAIN.md` — canonical games-domain overview for content model, publish flow, browse access, and API boundaries

### Bounded GameDetails context work

- `GAMEDETAILS_CONTEXT_ARCHITECTURE.md` — target architecture for GameDetails context handling
- `GAMEDETAILS_CONTEXT_AUDIT.md` — closed audit for preview-context exposure fixes
- `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md` — implementation plan showing the security workstream closure and remaining non-security follow-ups

### Historical snapshots

- `GAMEDETAILS_IMPLEMENTATION_PLAN.md` — earlier implementation history for GameDetails + sandbox work
- `GAMEDETAILS_SECTION_ANALYSIS.md` — deep section/data provenance analysis snapshot
- `GAME_INTEGRITY_REPORT.md` — earlier end-to-end integrity audit snapshot

## Related docs outside this folder

- `../admin/README.md` — builder UI and admin-domain references
- `../admin/ADMIN_GAME_BUILDER_V1.md` — canonical builder UI/API reference under the admin cluster
- `../import/CSV_IMPORT_FIELD_REFERENCE.md` — CSV field contract reference
- `../GAME_BUILDER_UI_SPEC.md` — builder UI draft/spec material
- `../TESTPLAN_GAME_BUILDER_P0.md` — builder validation/test plan

## Working rule

For the overall games domain, prefer `docs/games/GAMES_DOMAIN.md`. For the specific GameDetails preview-context security and display workstream, use the bounded documents in this folder. For builder UI workflows, follow the admin cluster rather than treating builder docs as part of the games cluster.