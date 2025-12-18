# Data Model Domain

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-18

## Purpose

Data Model Domain ansvarar för **schema governance**: hur databasen förändras, valideras och konsumeras som kontrakt i kod.

Den här domänen är tvärgående och definierar "reglerna för data" som alla andra domäner bygger på:

- Migrations (schema evolution)
- Type generation (TS-kontrakt)
- Tenancy & RLS conventions
- Verifiering/audit av schema och RLS-täckning

## Source of truth

- **Schema source of truth:** `supabase/migrations/*.sql`
- **RLS audit script:** `supabase/verify_rls_coverage.sql`
- **Runtime kontrakt i TypeScript:** `types/supabase.ts` (genererad)
- **Runbook för migrations + typegen:** `docs/MIGRATIONS.md`

> Viktigt: Docs ska inte duplicera hela tabellkolumn-listor (de driver lätt). För exakta kolumner/typer: använd `types/supabase.ts` och migrations.

## Schema lifecycle

1. Ändra schema via en ny fil i `supabase/migrations/` (timestamped).
2. Kör migrations i korrekt ordning mot databasen (Dashboard/CLI enligt `docs/MIGRATIONS.md`).
3. Regenerera TypeScript-typer direkt efter schemaändring:
   - `npm run db:types:remote` (kräver `supabase link`)
4. Verifiera:
   - `npm run type-check`
   - `npm test`

## Type generation (Supabase → TypeScript)

- Genererade typer ligger i `types/supabase.ts`.
- Script:
  - `npm run db:types` (lokalt)
  - `npm run db:types:remote` (linked/remote)

Windows-hjälp:
- `scripts/regenerate-types.ps1` kan användas som wrapper för remote typegen + type-check.

## Tenancy conventions

Baslinje:
- Tenant-scopade tabeller har oftast `tenant_id`.
- User-scopade data använder `user_id` (typiskt `auth.uid()` i RLS).
- I vissa fall är `tenant_id` nullable för "privat" scope (ex. vissa support/feedback-flöden) — detta ska vara medvetet och uttryckligt.

Konsekvens:
- Query-ytor ska alltid ange rätt scope (tenant/user) och undvika att "råka" exponera tenant-data genom breda selects.

## Row Level Security (RLS)

RLS är standard för `public.*` tabeller.

- Audit:
  - Kör `supabase/verify_rls_coverage.sql` i Supabase SQL Editor för att se om någon tabell saknar RLS.

Policy-principer:
- End-user queries ska vara RLS-säkra (använd request-scoped client eller browser client).
- Admin/background operations kan använda service role men ska vara server-only och strikt avgränsade.

## Inspect current schema (reality anchored)

När någon frågar “vad finns i DB:n just nu?” är rätt svar inte en textdump i docs, utan att köra en verifiering mot databasen.

Rekommenderade checks (Supabase SQL Editor):

1) **Vilka migrations är applicerade?**
- Kör `scripts/verify-migrations.sql`.
  - Visar senaste entries i `supabase_migrations.schema_migrations`.
  - Ger också en snabb sanity-check för att kritiska tabeller/enums existerar.

2) **Har alla public-tabeller RLS på?**
- Kör `supabase/verify_rls_coverage.sql`.
  - Rapporterar vilka tabeller som saknar RLS (security risk) och en totalsumma.

3) **Behöver vi en exakt kolumn/typ?**
- Utgå från `types/supabase.ts` (genererad) och/eller den relevanta migrationen i `supabase/migrations/`.

Mål: varje PR som ändrar schema ska kunna verifieras med dessa checks + `npm run db:types:remote` + `npm run type-check`.

## Supabase clients (data access patterns)

Det finns två centrala server-side mönster:

1) **Request-scoped RLS client** (föredras för user flows)
- `lib/supabase/server.ts:createServerRlsClient()`
- Bygger på `@supabase/ssr` och cookies → RLS gäller.

2) **Service role client** (endast server)
- `lib/supabase/server.ts:createServiceRoleClient()` och `supabaseAdmin`
- Kräver `SUPABASE_SERVICE_ROLE_KEY`.
- Ska aldrig användas i browser eller i user-scopade request-flöden.

## Validation checklist

- Alla nya migrations uppdaterar `types/supabase.ts` i samma PR.
- `npm run type-check` är grön utan nya `as any` workarounds.
- RLS är aktiverat på nya tabeller och policies finns.
- `scripts/verify-migrations.sql` kan användas i SQL Editor för att sanity-checka att kritiska tabeller/enums finns.

## Related docs

- `docs/MIGRATIONS.md` – execution guide + typegen krav
- `docs/AUTH_DATABASE_SCHEMA.md` – auth/membership schema + helper functions
- Domänspecifika docs (Games/Planner/Support/Notifications/etc) – beskriver data i kontext, men refererar alltid tillbaka till migrations + types för detaljer
