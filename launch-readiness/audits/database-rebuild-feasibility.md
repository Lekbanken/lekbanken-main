# Database Rebuild Feasibility Assessment

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Closed feasibility and ROI assessment for the database alternatives considered during launch-readiness. Use this as historical decision context, not as the current database operating guide.

> **Datum:** 2026-03-13  
> **Senast uppdaterad:** 2026-03-21  
> **Senast validerad:** 2026-03-21  
> **Status:** Frozen audit  
> **Exekveringsstatus:** ✅ GENOMFÖRD — Alternativ B verifierat  
> **Input:** database-architecture-audit.md, ../implementation/database-architecture-remediation-plan.md  
> **Syfte:** Bedöma genomförbarhet, risker och ROI för de tre alternativen  
> **Slutsats:** Alternativ B (Canonical Baseline) framgångsrikt genomfört. Fresh install verifierad.  
> **Notering:** Fryst besluts- och genomförandesnapshot. Använd aktuella miljö- och migrationsdokument för nuvarande arbetssätt.

---

## 1. Nuläge

### Databasstatistik
| Mätning | Värde |
|---------|-------|
| Migreringar | 307 filer |
| Tabeller | ~200+ |
| RLS-policyer | ~994 skapade, ~600 aktiva |
| Funktioner/RPCs | ~150+ |
| Vyer | ~5–10 |
| Enums | ~20+ |
| Triggers | ~30+ |
| Indexes | ~300+ |

### Datamängd i produktion
| Data | Status | Migreringsrisk |
|------|--------|---------------|
| Lekar (games) | Viktig — men kan exporteras/importeras | 🟢 Låg |
| Användarkonton | Mest testkonton + ägarens konto | 🟢 Låg |
| Tenant-data | Demo/test-tenants | 🟢 Låg |
| Billing/Stripe | Ingen aktiv billing i prod | 🟢 Låg |
| Gamification (coins, streaks) | Ingen riktig användardata | 🟢 Låg |
| Sessions/play-data | Testdata | 🟢 Låg |

**Slutsats:** Nuvarande datamängd utgör **minimal risk** vid omstrukturering. Detta är optimalt fönster.

---

## 2. Feasibility per alternativ

### Alternativ A: Minimal Repair

| Faktor | Bedömning |
|--------|-----------|
| **Genomförbarhet** | ✅ 100% — redan gjort (10 fixes applicerade, alla migreringar passerar) |
| **Tidsåtgång** | ✅ 2–4 timmar (CI-setup + docs) |
| **Risk** | 🟢 Noll — inga strukturella ändringar |
| **Kräver Docker** | Nej |
| **Kräver appändringar** | Nej |
| **Långsiktig hållbarhet** | 🔴 Låg — skulden växer med varje ny migration |

**Feasibility-dom: TRIVIAL ATT GENOMFÖRA**

Men löser inte grundproblemet. Nästa environment-setup riskerar nya problem i den 307-stegs kedjan.

---

### Alternativ B: Canonical Baseline

| Faktor | Bedömning |
|--------|-----------|
| **Genomförbarhet** | ✅ Hög |
| **Tidsåtgång** | ~2–3 dagar |
| **Risk** | 🟢 Låg — prod påverkas inte |
| **Kräver Docker** | Se nedan |
| **Kräver appändringar** | Nej |
| **Långsiktig hållbarhet** | ✅ Hög — rent fundament |

#### Tekniska förutsättningar

**Schema-export:**
Det finns flera vägar att generera baseline:

| Metod | Krav | Status |
|-------|------|--------|
| `supabase db dump --linked` | Docker Desktop | ❌ Ej tillgänglig |
| `pg_dump` direkt mot sandbox | psql/pg_dump CLI | ❌ Ej tillgänglig lokalt |
| Supabase SQL Editor → export | Webbläsare | ✅ Tillgänglig |
| Supabase Table Editor → schema export | Webbläsare | ✅ Tillgänglig |
| Node.js-skript med `pg` module | IPv4 (pooler) | 🟡 Pooler ger "tenant not found" för sandbox |
| `supabase inspect db --linked` | CLI | ✅ Tillgänglig |
| GitHub Action med Docker | CI/CD | ✅ Möjlig |

**Rekommenderad metod:**

1. **Primär:** Använd Supabase Dashboard SQL Editor för att köra `pg_dump`-liknande queries som extraherar schemat:
   ```sql
   -- Hämta alla tabeller, kolumner, constraints, indexes
   SELECT * FROM information_schema.tables WHERE table_schema = 'public';
   SELECT * FROM information_schema.columns WHERE table_schema = 'public';
   -- etc.
   ```

2. **Alternativ:** Installera Docker Desktop (en gång) → kör `supabase db dump` → avinstallera om önskat.

3. **Alternativ:** Sätt upp en GitHub Action som kör `supabase db dump` i CI och sparar resultatet som artifact.

#### Produktionshantering

Prod-databasen har tabellen `supabase_migrations.schema_migrations` som trackar vilka migreringar som körts. Vid baseline-övergång:

```sql
-- I prod: markera att baseline redan är applicerad
INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES ('00000000000000', 'baseline');
```

Inga tabeller, data eller policyer ändras i prod. Den enda ändringen är att migrations-tracking vet att baseline redan är gjord.

#### Verifieringsplan

| Steg | Verifiering | Pass/Fail |
|------|-------------|-----------|
| 1 | Baseline-fil skapas utan fel | — |
| 2 | `supabase db reset` med baseline → exit 0 | — |
| 3 | Jämförelse: baseline-schema = prod-schema | — |
| 4 | `npx tsc --noEmit` → 0 errors | — |
| 5 | Supabase-genererade TypeScript-typer → oförändrade | — |
| 6 | Applikation startar och fungerar lokalt | — |

**Feasibility-dom: GENOMFÖRBART MED RIMLIG INSATS**

2–3 dagar, låg risk, stor långsiktig vinst.

---

### Alternativ C: Partial Redesign

| Faktor | Bedömning |
|--------|-----------|
| **Genomförbarhet** | 🟡 Medel — kräver omfattande verifiering |
| **Tidsåtgång** | ~1–2 veckor |
| **Risk** | 🔴 Hög — applikationsändringar krävs |
| **Kräver Docker** | Ja (för schema-export) |
| **Kräver appändringar** | JA — queries, types, routes |
| **Långsiktig hållbarhet** | ✅ Högst — renare arkitektur |

#### Impact-analys per redesign-kandidat

**1. Konsolidera tenant_memberships/user_tenant_memberships**
- Berörda filer: ~50+ (alla som refererar tenant_memberships eller user_tenant_memberships)
- RLS-policyer som behöver uppdateras: ~20+
- Applikationskod: queries, hooks, API-routes
- Risk: 🔴 HÖG — central tabell, alla domäner beroende

**2. Standardisera owner_tenant_id → tenant_id**
- Berörda tabeller: games, plans
- Berörda filer: ~100+ (alla game/plan queries)
- Supabase-genererade typer: ändras
- Risk: 🟡 MEDEL — isolerbar ändring men bred påverkan

**3. Konsolidera gamification-tabeller**
- Berörda tabeller: ~10 av 25–30
- Risk: 🟡 MEDEL — gamification är relativt fristående
- ROI: tveksam — tabellerna fungerar, bara för många

**4. Konsolidera updated_at-funktioner**
- Berörda funktioner: 6 → 1
- Berörda triggers: ~30
- Risk: 🟢 LÅG — ren refactoring

**Feasibility-dom: GENOMFÖRBART MEN ÖVERDRIVET FÖR NUVARANDE BEHOV**

ROI motiverar inte risken. Bättre att göra som separata migreringar post-baseline om/när behovet uppstår.

---

## 3. Jämförande tabell

| Dimension | A: Minimal Repair | B: Canonical Baseline | C: Partial Redesign |
|-----------|-------------------|----------------------|---------------------|
| **Tidsåtgång** | 2–4 timmar | 2–3 dagar | 1–2 veckor |
| **Risk för regression** | 🟢 Noll | 🟢 Låg | 🔴 Hög |
| **Påverkan på prod** | Ingen | Ingen | Schema-ändringar |
| **Påverkan på appkod** | Ingen | Ingen | JA — bred |
| **Fresh install fungerar** | ✅ (med 10 fixar) | ✅ (rent) | ✅ (rent) |
| **Migrationsskuld** | Kvarstår | Eliminerad | Eliminerad |
| **Naming-drift** | Kvarstår | Dokumenterad | Fixad |
| **Gamification-sprawl** | Kvarstår | Kvarstår | Konsoliderad |
| **CI-testbarhet** | 🟡 Fragil | ✅ Robust | ✅ Robust |
| **Framtida environments** | Risk för nya fixar | Ren start | Ren start |

---

## 4. Slutbedömning och rekommendation

### Rekommendation: **Alternativ B — Canonical Baseline**

**Motivering i tre punkter:**

1. **Eliminerar grundproblemet** (migrationskedjan) utan att ändra något som fungerar (schemat).

2. **Rätt ROI-balans** — 2–3 dagars investering ger permanent elimination av migrationsskulden. Alternativ A skjuter bara upp problemet. Alternativ C löser problem som inte är akuta.

3. **Timing** — Nästan ingen kunddata gör detta till ett unikt fönster. Post-launch blir denna typ av arbete 10x dyrare.

### Vad som INTE behöver göras

- ❌ Bygga om schemat
- ❌ Ändra applikationskod
- ❌ Migrera kunddata
- ❌ Ändra RLS-policyer
- ❌ Standardisera naming (kan göras separat, i efterhand)

### Vad som BÖR göras efter baseline

| Åtgärd | Prioritet | Tidpunkt |
|--------|-----------|----------|
| CI-check: `db reset` per PR | P1 | Omedelbart efter baseline |
| Dokumentera owner_tenant_id-konventionen | P2 | Inom 1 vecka |
| Konsolidera updated_at-funktioner | P2 | Nästa underhållsfönster |
| Ta bort plan_schedules dead code | P1 | I baseline-saneringen |
| Gamification-sprawl utvärdering | P3 | Post-launch |

---

## 5. Exekveringsplan (om B väljs)

### Dag 1: Schema-export & sanering
1. Generera schema-dump från sandbox-databasen (alla 307 migreringar redan applicerade)
2. Rensa bort Supabase-interna schemas (auth, storage, realtime, pgsodium, vault, extensions, supabase_migrations)
3. Rensa bort dead code (plan_schedules policyer)
4. Konsolidera updated_at-funktioner till `touch_updated_at()`
5. Granska och validera baseline-skriptet

### Dag 2: Ny migrationsstruktur
1. Flytta alla 307 migreringar till `supabase/migrations/_archived/`
2. Skapa `supabase/migrations/00000000000000_baseline.sql`
3. Testa: `supabase db reset --linked` mot sandbox → exit code 0
4. Verifiera: schema-jämförelse baseline vs prod
5. Testa: `npx tsc --noEmit` → 0 errors

### Dag 3: Verifiering & dokumentation
1. Starta applikationen lokalt mot baseline-databas
2. Smoke-test kritiska flöden (login, games, planner, play)
3. Uppdatera prod `schema_migrations`-tabell
4. Uppdatera launch-control.md
5. Dokumentera migrationskonventioner framåt

---

## 6. Riskregister

| Risk | Sannolikhet | Påverkan | Mitigation |
|------|-------------|----------|------------|
| Baseline matchar inte prod exakt | Låg | Medel | Schema-diff-verifiering (information_schema jämförelse) |
| Pågående dev-branchar kräver rebase | Medel | Låg | Kommunicera cutoff-tidpunkt |
| Schema-export missar triggers/functions | Låg | Hög | pg_dump inkluderar alla objekt; manuell verifiering |
| Supabase-interna objekt inkluderas i baseline | Medel | Medel | Explicit exclude-lista vid export |
| Prod schema_migrations update misslyckas | Låg | Hög | Test mot sandbox först; backup av migrations-tabell |
