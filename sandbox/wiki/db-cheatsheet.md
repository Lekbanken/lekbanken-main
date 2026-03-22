# DB cheatsheet

## Metadata
- Status: draft
- Date: 2025-12-17
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: sandbox
- Scope: Sandbox wiki note for DB quick reference

Syfte: snabb referens för Supabase/DB.

- Migrations: ../../docs/MIGRATIONS.md
- Type generation: `npm run db:types` / `npm run db:types:remote`

Viktig princip:
- Efter schema-ändring: regenerera `types/supabase.ts` och commit:a samtidigt.
