# Miljö- och databasinventering — Revisionsrapport

## Metadata

**Datum:** 2026-03-19  
**Senast uppdaterad:** 2026-03-21  
**Senast validerad:** 2026-03-19  
**Status:** Frozen audit  
**Metod:** Statisk kodanalys, CLI-verifiering, Docker-databasinspektion  
**Omfattning:** Alla tre Supabase-miljöer (local, sandbox, production), notifications-domänen

> Fryst revisionssnapshot. Använd `docs/database/environments.md`, `docs/toolkit/developer-guide/DEVELOPER_SETUP.md` och `launch-readiness/launch-control.md` som nuvarande operativ vägledning.

---

# 1. Beviskedja

### 1.1 `.env.local` — Lokal utveckling pekar mot lokal Docker

**Källa:** `.env.local` (ej i git, verifierad på disk)  
**Observation:**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<REDACTED>
SUPABASE_SERVICE_ROLE_KEY=<REDACTED>
APP_ENV=local
DEPLOY_TARGET=development
```
Produktions-URL:er finns **utkommenterade** ovanför:
```
# NEXT_PUBLIC_SUPABASE_URL=https://qohhnufxididbmzqnjwg.supabase.co
```
**Bevisar:** Lokal utveckling kör mot lokal Docker-Supabase. Produktionsnycklar finns i filen men är inaktiverade.

### 1.2 `.env.local.example` — Mall bekräftar lokal-first-design

**Källa:** [../../.env.local.example](../../.env.local.example)  
**Observation:** Mallen anger `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` som default, med produktionsvärden som kommentarer märkta "For PRODUCTION (Vercel sets these per scope)".  
**Bevisar:** Repot är designat för att lokal `.env.local` alltid pekar lokalt.

### 1.3 `supabase/.temp/project-ref` — CLI länkad till produktion

**Källa:** `supabase/.temp/project-ref`  
**Observation:** Filinnehåll = `qohhnufxididbmzqnjwg`  
**Bevisar:** Supabase CLI:s `link`-target är produktion. Alla `supabase db push`, `migration list`, `gen types --linked` etc. går mot produktion.

### 1.4 `supabase status` — Lokal Docker-stack körs

**Källa:** `npx supabase status` (kört 2026-03-19)  
**Observation:**
```
Studio:       http://127.0.0.1:54323
Project URL:  http://127.0.0.1:54321
Database URL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
```
Lokala nycklar: `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` (matchar `.env.local`).  
**Bevisar:** Lokal Supabase kör via Docker med egen Postgres-instans, egna nycklar. Appen ansluter till denna.

### 1.5 `supabase migration list` — Local och Production i synk

**Källa:** `npx supabase migration list` (kört 2026-03-19, jämför lokal vs linked/production)  
**Observation:**
```
Local          | Remote         | Time (UTC)
00000000000000 | 00000000000000 | baseline
20251129000015 | 20251129000015 | ...
... (alla 17 migrations) ...
20260319020000 | 20260319020000 | 2026-03-19 02:00:00
```
**Alla 17 migrations matchar.** Ingen finns bara lokalt, ingen finns bara remote.  
**Bevisar:** Lokal Docker och Production ligger på **exakt samma migrationsnivå** per 2026-03-19.

### 1.6 `scripts/db-push-guard.mjs` — Guardrail mot oavsiktlig push

**Källa:** [../../scripts/db-push-guard.mjs](../../scripts/db-push-guard.mjs)  
**Observation:** Scriptet:
1. Läser `supabase/.temp/project-ref`
2. Jämför med hårdkodad `PRODUCTION_REF = "qohhnufxididbmzqnjwg"`
3. Blockerar push från icke-`main`-branch till produktion
4. Kräver manuell bekräftelse
**Bevisar:** `npm run db:push` har säkerhetslås. Bara `main`-branch kan pusha till produktion.

### 1.7 `supabase projects list` — Tre Supabase-projekt existerar

**Källa:** `npx supabase projects list` (kört 2026-03-19)  
**Observation:**
| Linked | Reference | Name | Region |
|--------|-----------|------|--------|
| | `zaufhdwajplipthjicts` | Lekbanken Projekt | West EU (Ireland) |
| | `vmpdejhgpsrfulimsoqn` | lekbanken-sandbox | West EU (Paris) |
| ✅ | `qohhnufxididbmzqnjwg` | lekbanken-main | West EU (Paris) |
**Bevisar:** Alla tre projekten existerar i Supabase Dashboard. CLI är länkad till `lekbanken-main`.

### 1.8 Sandbox DNS-test — Sandbox-databasen ej nåbar via CLI

**Källa:** Temporär `project-ref`-switch till `vmpdejhgpsrfulimsoqn` + `npx supabase migration list`  
**Observation:**
```
IPv6 is not supported on your current network: dial tcp: lookup db.vmpdejhgpsrfulimsoqn.supabase.co: no such host
Run supabase link --project-ref vmpdejhgpsrfulimsoqn to setup IPv4 connection.
```
**Bevisar:** Sandbox-projektets databashost resolvar inte utan att köra `supabase link` (som konfigurerar IPv4-pool-URL). **Migrationsstatus för sandbox kan inte verifieras utan `supabase link`.**

### 1.9 `vercel.json` — Ingen Supabase-config

**Källa:** [../../vercel.json](../../vercel.json)  
**Observation:** Har bara en cron-definition: `"/api/participants/tokens/cleanup"` kl 04:00 dagligen.  
**Bevisar:** `vercel.json` innehåller ingen env-var-konfiguration. Alla miljövariabler sätts via Vercel Dashboard.

### 1.10 Inga andra `.env`-filer finns

**Källa:** `Get-ChildItem .env* -Force`  
**Observation:** Bara `.env.local` och `.env.local.example` finns. Inga `.env.production`, `.env.preview`, `.env.staging`.  
**Bevisar:** Vercel-miljöer (production, preview) styrs helt via Vercel Dashboard env vars, inte via filer i repot.

### 1.11 GitHub Actions — Ingen workflow ansluter till remote Supabase

**Källa:** Alla 6 workflows i `.github/workflows/`  
**Observation:**
- `validate.yml` — lint, typecheck, tests. Ingen DB-anslutning.
- `unit-tests.yml` — vitest. Ingen DB.
- `typecheck.yml` — `tsc --noEmit` + `next build` (med `SKIP_ENV_VALIDATION=true`). Ingen DB.
- `rls-tests.yml` — **Startar lokal Supabase via `supabase db start`** och kör RLS-tester mot lokal DB. Ingen remote-anslutning.
- `baseline-check.yml` — **Startar lokal Supabase**, kör `supabase db reset --local`, verifierar types och schema-counts. Ingen remote.
- `i18n-audit.yml` — Ingen DB.
**Bevisar:** Ingen CI-pipeline ansluter till sandbox eller production Supabase. RLS-tester och baseline-checks kör mot lokal Docker.

### 1.12 Dokumentation säger sandbox-scope = Vercel Preview

**Källa:** [../../launch-readiness/sandbox-implementation-brief.md](../../launch-readiness/sandbox-implementation-brief.md), [../../launch-readiness/launch-control.md](../../launch-readiness/launch-control.md)  
**Observation:** Preview-scoped env vars i Vercel Dashboard pekar mot sandbox:
```
NEXT_PUBLIC_SUPABASE_URL = https://vmpdejhgpsrfulimsoqn.supabase.co  (Preview scope)
```
Verifierat via `/api/health` på preview-deploy (2026-03-14):
```json
{"supabaseProjectRef": "vmpdejhgpsrfulimsoqn", "deployTarget": "preview", "appEnv": "sandbox"}
```
**Bevisar:** Vercel preview-deploys (PR-builds) ansluter till sandbox Supabase. Dokumenterat och runtime-verifierat.

### 1.13 Hårdkodad fallback i kod

**Källa:** [../../lib/auth/ephemeral-users.ts](../../lib/auth/ephemeral-users.ts) rad 23  
**Observation:**
```ts
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qohhnufxididbmzqnjwg.supabase.co';
```
**Bevisar:** Det finns EN hårdkodad fallback till produktion. Denna aktiveras bara om env-var saknas helt. **Risk: om preview-build missar env-var faller den tillbaka till produktion.** Bör fixas.

### 1.14 Realtime publication — notification_deliveries saknas

**Källa:** `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'` (lokalt, via Docker)  
**Observation:** `supabase_realtime`-publication har **inga tabeller** (0 rader). `notification_deliveries` finns inte i publikationen.  
**Bevisar:** Supabase Realtime-prenumeration på `notification_deliveries` ger **aldrig** postgres_changes-events lokalt. Samma situation gäller troligen live.

**Ursprung:** Den arkiverade migreringen `20260220100000_fix_notifications_rls_and_realtime.sql` lade till `notification_deliveries` i `supabase_realtime`-publication. Men denna migrering konsoliderades **inte** in i baseline `00000000000000_baseline.sql` — baseline innehåller `0` rader med `publication` eller `supabase_realtime`.

### 1.15 pg_cron saknas lokalt

**Källa:** `SELECT extname FROM pg_extension WHERE extname = 'pg_cron'` → 0 rader  
**Bevisar:** `pg_cron` är inte installerat lokalt. `process_scheduled_notifications()` kan aldrig schemaläggas automatiskt lokalt. Ej bevisat om pg_cron är aktiverat i produktion.

### 1.16 Lokal schema-count

**Källa:** Docker-psql-queries  
**Observation:** 247 tabeller, 157 funktioner, 601 policies.  
**Bevisar:** Lokal DB har exakt baslinjeantal tabeller (247). Fler policies (601 vs baslinjecheck 545) indikerar att nyare migrationer lagt till policies.

---

# 2. Miljökarta

| Miljö | Supabase-projekt/databas | Ref ID | Hur det är bevisat | Säkerhetsgrad |
|-------|--------------------------|--------|---------------------|---------------|
| **Lokal utveckling** | Docker-container (`127.0.0.1:54322`) | N/A (lokal) | `.env.local` pekar `127.0.0.1:54321`, `supabase status` bekräftar, lokala nycklar matchar | **Bevisat** |
| **Vercel Preview (PR-builds)** | lekbanken-sandbox | `vmpdejhgpsrfulimsoqn` | Dokumenterat i `sandbox-implementation-brief.md`, runtime-verifierat via `/api/health` (2026-03-14) | **Bevisat** |
| **Vercel Production** | lekbanken-main | `qohhnufxididbmzqnjwg` | `db-push-guard.mjs` hårdkodar ref, CLI-`link` pekar hit, `migration list` bekräftar synk | **Bevisat** |
| **CI (GitHub Actions)** | Lokal Docker (per workflow-run) | N/A | `rls-tests.yml` och `baseline-check.yml` kör `supabase start` + `db reset --local` | **Bevisat** |
| **Legacy** | Lekbanken Projekt | `zaufhdwajplipthjicts` | Finns i `projects list`, dokumenterat som "not in active use" i `environments.md` | **Bevisat — oanvänd** |

---

# 3. Används sandbox eller inte?

## Svar: Ja, sandbox (`vmpdejhgpsrfulimsoqn`) används — men ENBART av Vercel Preview-deploys.

**Bevis:**
1. **Vercel Dashboard-konfiguration** (dokumenterat 2026-03-13, runtime-verifierat 2026-03-14): Preview-scoped `NEXT_PUBLIC_SUPABASE_URL` pekar mot `https://vmpdejhgpsrfulimsoqn.supabase.co`.
2. **Runtime-verifiering** (launch-control.md, 2026-03-14): `/api/health` på preview-deploy returnerade `supabaseProjectRef: vmpdejhgpsrfulimsoqn`.
3. **Ingen annan konsument:** CI kör lokal Docker. Lokal dev kör lokal Docker. Ingen script eller workflow refererar sandbox utöver dokumentation.

**Migrationsstatus för sandbox: Ej bevisat.** DNS-lookup mot `db.vmpdejhgpsrfulimsoqn.supabase.co` failade utan `supabase link`. Dokumentation hävdar att baseline applicerats (`247 tables, 156 functions, 545 policies`), men de 17 post-baseline-migrationerna kan saknas. Jag kan **inte bevisa** att sandbox är i synk med produktion.

---

# 4. Varför fungerar notifications lokalt men inte live?

## Bevisade orsaker

### 4.1 Realtime-publikation saknas (KRITISK)

`notification_deliveries` är **inte** i `supabase_realtime`-publication — varken lokalt eller (med mycket hög sannolikhet) i produktion. Baseline-migreringen har inget `ALTER PUBLICATION`-statement.

**Effekt:** `useAppNotifications`-hookens Realtime-prenumeration (`postgres_changes` på `notification_deliveries`) **får aldrig events**. Nya notifikationer syns inte förrän 30-sekunders-polling kickar in.

**Källa:** Arkivmigration `20260220100000_fix_notifications_rls_and_realtime.sql` var tänkt att fixa detta, men konsoliderades inte in i baseline.

### 4.2 Seed-data finns lokalt men inte live

Lokal DB har 8 `notifications` och 12 `notification_deliveries`. `seed.sql` innehåller **inga** notifikationsrader — dessa insertades manuellt eller via en annan process. Live har sannolikt inga notifikationer om ingen admin skickat dem.

**Effekt:** Lokalt "fungerar" det eftersom data finns. Live visar tom lista (korrekt beteende om inga notifikationer skickats — inte ett fel per se).

## Sannolika orsaker

### 4.3 Sandbox saknar post-baseline-migrationer (SANNOLIK)

Sandbox skapades 2026-03-13 med baseline. Sedan dess har 11 migrationer pushats till produktion. Om sandbox inte fått dessa:
- `20260316095957_fix_notifications_global_rls.sql` (fixar `notifications_select` för globala broadcasts) **saknas troligen i sandbox**
- Preview-deploys som testar notifications mot sandbox kör med **äldre, buggig RLS-policy**

**Ej bevisat** — kräver `supabase link --project-ref vmpdejhgpsrfulimsoqn` + `migration list`.

### 4.4 Admin aldrig skickat notifikation i live

Om `/admin/notifications` aldrig använts i produktion finns det inga `notifications`- eller `notification_deliveries`-rader. Systemet har inget automatiskt notifikationsflöde — allt initieras manuellt av admin eller via support-ticket-actions.

## Ej verifierade hypoteser

### 4.5 pg_cron-status i produktion

**Ej bevisat** om `pg_cron` är installerat i produktion. Lokalt saknas det. Om det saknas i produktion kan `process_scheduled_notifications` aldrig köra automatiskt.

### 4.6 Realtime-tjänstens hälsa i produktion

**Ej bevisat.** Även om `notification_deliveries` skulle läggas till i publication, finns ingen garanti att Realtime-tjänsten fungerar korrekt i produktion. Kräver runtime-test.

---

# 5. Risker i nuvarande setup

| # | Risk | Allvar | Status |
|---|------|--------|--------|
| R1 | **`notification_deliveries` saknas i `supabase_realtime`-publication** — Realtime-prenumeration ger aldrig events. Polling (30s) är enda uppdateringsmekanismen. | **Kritisk** | Aktivt problem i alla miljöer |
| R2 | **Sandbox migrationsläge okänt** — Preview-deploys kan köra mot en databas som saknar 11 migrationer (inkl. RLS-fixar) | **Hög** | Kräver verifiering |
| R3 | **Hårdkodad fallback till produktion** i `lib/auth/ephemeral-users.ts` — Om env-var saknas i preview-build faller koden tillbaka till produktion | **Medel** | Bör fixas |
| R4 | **Produktionsnycklar i `.env.local`** (utkommenterade) — Utvecklare kan av misstag avkommentera och köra mot produktion | **Låg** | Designat med kommentarer + `APP_ENV=local`-guard |
| R5 | **pg_cron inte installerat lokalt** — Schemalagda notifikationer testas aldrig i lokal miljö | **Låg** | P3-feature (scheduled notifications dokumenterat som ej anslutet) |
| R6 | **`types/supabase.ts` i repo matchar kanske inte sandbox** — Types genereras från lokal eller länkad (produktion) DB. Om sandbox driftar matchar de inte preview-runtime | **Medel** | Latent risk |
| R7 | **Legacy-projekt `zaufhdwajplipthjicts` finns kvar** — Ingen aktiv användning men fortfarande inte raderat | **Info** | Dokumenterat som legacy |

---

# 6. Rekommenderad målbild

## 6.1 Local

- **Fortsätt som idag:** `.env.local` → `127.0.0.1:54321` (Docker).
- `supabase db reset` för att applicera alla migrationer + seed.
- `npm run db:types` genererar types från lokal DB.
- **Fix:** Lägg till `ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;` i en ny migrering.

## 6.2 Sandbox / Staging

- **Sandbox = Vercel Preview-deploys** — detta är redan konfigurerat.
- **Krav: Sandbox måste synkas med produktion migrationsmässigt efter varje `db:push`.**
- Rekommendation: Lägg till ett steg i deploy-checklistan:
  ```
  1. npm run db:push (main → production)
  2. supabase link --project-ref vmpdejhgpsrfulimsoqn
  3. supabase db push --include-all
  4. supabase link --project-ref qohhnufxididbmzqnjwg  (återställ)
  ```
- Alternativ: Använd Supabase Branching istället (redan aktiverat, `main`-branch healthy).

## 6.3 Production

- **Ingen ändring:** CLI-link → production, guardrail-skript enforced.
- `npm run db:push` (bara `main`-branch) — enda vägen att migrera produktion.
- **Source of truth för schema: Repots migrations-kedja** (lokal `supabase/migrations/`).

## 6.4 Deploy/Migration-flöde (rekommenderat)

```
1. Utveckla lokalt:
   supabase migration new <name>
   supabase db reset
   Testa + verifiera

2. Commit + push + öppna PR:
   → CI kör baseline-check + RLS-tester (lokal Docker)
   → Vercel bygger preview → testar mot sandbox

3. Merge till main:
   → Vercel production-deploy körs automatiskt
   → MANUELLT: npm run db:push (guardrail kräver main-branch + bekräftelse)
   → MANUELLT: Synka sandbox (script eller Supabase Branching)

4. Verifiering efter deploy:
   → curl https://app.lekbanken.no/api/health → {"status":"ok","environment":{"appEnv":"production"}}
   → supabase migration list → alla rader synkade
   → npm run db:types:remote → jämför med types/supabase.ts
```

## 6.5 Notification-testning

1. **Lokalt:** Kör admin-sida (`/admin/notifications`) → skicka broadcast → verifiera i bell-komponent. Realtime fungerar INTE (publication saknas) — polling med 30s delay.
2. **Preview:** Samma test mot sandbox DB.
3. **Production:** Manuell smoke-test efter deploy.
4. **Fix realtime FÖRST** — ny migration som lägger `notification_deliveries` i `supabase_realtime`-publication.

## 6.6 Source of Truth

| Vad | Source of Truth |
|-----|-----------------|
| Schema | `supabase/migrations/` i repot |
| Types | `types/supabase.ts` genererat från lokal DB (`npm run db:types`) |
| Env vars (Production) | Vercel Dashboard (Production scope) |
| Env vars (Preview) | Vercel Dashboard (Preview scope) |
| Env vars (Local) | `.env.local` |
| CLI-target | `supabase/.temp/project-ref` |

---

# 7. Exakt handlingsplan

### Akuta (denna session)

- [ ] **1. Skapa migration: Lägg `notification_deliveries` i `supabase_realtime`-publication**
  ```sql
  -- supabase migration new add_notification_deliveries_to_realtime
  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'notification_deliveries'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_deliveries;
    END IF;
  END $$;
  ```

- [ ] **2. Testa lokalt:** `supabase db reset` → verifiera att `notification_deliveries` finns i publication → testa Realtime-prenumeration.

- [ ] **3. Ta bort hårdkodad fallback** i `lib/auth/ephemeral-users.ts`:
  ```ts
  // BEFORE:
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://qohhnufxididbmzqnjwg.supabase.co';
  // AFTER:
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  ```

### Kort sikt (denna vecka)

- [ ] **4. Synka sandbox-migrationer:**
  ```bash
  supabase link --project-ref vmpdejhgpsrfulimsoqn
  supabase db push --include-all
  supabase link --project-ref qohhnufxididbmzqnjwg  # återställ
  ```

- [ ] **5. Verifiera sandbox-migration-synk:**
  ```bash
  supabase link --project-ref vmpdejhgpsrfulimsoqn
  supabase migration list  # ska matcha produktion
  supabase link --project-ref qohhnufxididbmzqnjwg  # återställ
  ```

- [ ] **6. Push realtime-migration till produktion:**
  ```bash
  git checkout main
  npm run db:push
  ```

- [ ] **7. Verifiera produktion:**
  ```bash
  npm run db:push:dry  # ska visa "Already up to date"
  supabase migration list  # alla synkade
  curl https://app.lekbanken.no/api/health
  ```

### Medium sikt

- [ ] **8. Skapa script `scripts/sync-sandbox.sh`** som automatiserar sandbox-synk.
- [ ] **9. Överväg att radera legacy-projekt** (`zaufhdwajplipthjicts`) om det inte längre behövs.
- [ ] **10. Dokumentera sandbox-synk-rutinen** i `docs/database/environments.md`.

---

# 8. Osäkerheter

| # | Osäkerhet | Vad som krävs för att bevisa |
|---|-----------|------|
| O1 | **Sandbox migrationsstatus** — Ej bevisat om sandbox har post-baseline-migrationer | `supabase link --project-ref vmpdejhgpsrfulimsoqn` + `supabase migration list` |
| O2 | **pg_cron i produktion** — Ej bevisat om extension installerad | `SELECT * FROM pg_extension WHERE extname='pg_cron'` i produktion (SQL Editor i Dashboard) |
| O3 | **Realtime-publication i produktion** — Ej bevisat om notification_deliveries finns i publication i production-DB | `SELECT tablename FROM pg_publication_tables WHERE pubname='supabase_realtime'` i produktion |
| O4 | **Vercel env vars aktuell status** — Senaste verifiering var 2026-03-14. Ej bevisat att ingen ändrat sedan dess | Vercel Dashboard → Settings → Environment Variables → granska Production + Preview scope |
| O5 | **Sandbox seeding** — Ej bevisat om sandbox har seed-data. Baseline applicerats men `seed.sql` ej verifierad | `SELECT count(*) FROM tenants` i sandbox Dashboard |
| O6 | **Live notification-data** — Ej bevisat om admin skickat notifikationer i produktion | `SELECT count(*) FROM notifications` i produktion |

---

## Dokumentstatus

### Stale dokumentation identifierad

1. **`launch-readiness/implementation/sandbox-phase-1b.md` rad 17** — Hävdar att `.env.local` pekar mot produktion (`qohhnufxididbmzqnjwg`). **STALE — `.env.local` pekar nu mot lokal Docker.** Dokumentet reflekterar tillståndet vid audit-tidpunkt (2026-03-14), inte nuvarande.

2. **`docs/database/environments.md`** — Tabellen "CI / Vercel preview" anger "Preview branch DB" och "Auto" för CLI target. I verkligheten pekar preview mot sandbox, inte "auto branch DB". Texten bör uppdateras för tydlighet.

3. **`launch-readiness/enterprise-isolation-audit.md` rad 126** — Hävdar "zero instances of `qohhnufxididbmzqnjwg` in TypeScript/JavaScript files." **STALE — `lib/auth/ephemeral-users.ts` har en hårdkodad fallback.**

### Korrekt dokumentation

- `docs/database/environments.md` — Korrekt gällande CLI link target, migration workflow, local-first-princip.
- `../notifications/app-shell-notifications-architecture.md` — Korrekt gällande notifikationsarkitektur.
- `../notifications/app-shell-notifications-audit.md` — Korrekt gällande komponentkedja.
