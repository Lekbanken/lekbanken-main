# DB cheatsheet

Syfte: snabb referens för Supabase/DB.

- Migrations: ../../docs/MIGRATIONS.md
- Type generation: `npm run db:types` / `npm run db:types:remote`

Viktig princip:
- Efter schema-ändring: regenerera `types/supabase.ts` och commit:a samtidigt.
