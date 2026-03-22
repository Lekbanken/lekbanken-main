# Database Architecture Remediation Plan

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Executed remediation record for the database canonical-baseline decision. Treat this as the implementation snapshot behind the database decision set; use current migration and environment docs for present-day operational guidance.

> **Status:** ✅ GENOMFÖRD — Alternativ B valt och verifierat  
> **Datum:** 2026-03-13  
> **Input:** database-architecture-audit.md  
> **Syfte:** Tre strategiska alternativ med tydlig rekommendation  
> **Resultat:** Alternativ B (Canonical Baseline) genomfört. Fresh install verifierad: 247 tabeller, 156 funktioner, 545 policies, 28 enums. Baseline är nu canonical source för alla nya environments.

---

## Bakgrund

Sandbox-provisioneringen avslöjade att Lekbankens 307 migreringar har **10 fresh-install-fel** och **29% fix-migreringar**. Datamodellen i sig är rimlig, men migrationskedjan är inte tillförlitlig som källa för nya environments.

Tre alternativ presenteras: **Minimal Repair**, **Canonical Baseline**, och **Partial Redesign**.

---

## Alternativ A: Minimal Repair

### Beskrivning
Behåll nuvarande schema och migreringskedja exakt som de är. Fixa bara de kända 10 fresh-install-problemen. Alla framtida migreringar läggs till i slutet som vanligt.

### Vad som görs
- [x] 10 sandbox-fixes redan applicerade
- [ ] Verifiera att `supabase db reset` fungerar stabilt (regression test)
- [ ] Dokumentera kända begränsningar
- [ ] Lägg till CI-check som kör `db reset` på varje PR-push

### Fördelar
- ✅ **Minst arbete** — redan i princip klart
- ✅ **Ingen risk** för produktions-data
- ✅ **Ingen regressionsfara** — inga strukturella ändringar
- ✅ Sandbox-provisioning fungerar redan

### Nackdelar
- ❌ 307 migreringar fortsätter växa — nästa environment kräver potentiellt nya fixar
- ❌ 29% fix-migreringar kvar — kedjan blir svårare att förstå med tiden
- ❌ Namngivingsdrift (owner_tenant_id, tenant_memberships/user_tenant_memberships) kvarstår
- ❌ Fantom-objekt (plan_schedules) kvar som död kod
- ❌ Gamification-sprawl (25–30 tabeller) oförändrad
- ❌ Varje ny miljö (staging, demo, CI) riskerar att hitta nya problem

### Uppskattad tidsinsats
~2–4 timmar (CI-setup + dokumentation)

### Risk
🟡 **MEDEL** — Fungerar kortsiktigt, men skulden växer.

---

## Alternativ B: Canonical Baseline (REKOMMENDERAS)

### Beskrivning
Skapa en ny baseline-migration som representerar **dagens faktiska produktionsschema** i ett enda, rent SQL-skript. Alla gamla migreringar arkiveras. Framtida miljöer startar från den nya baseline.

### Vad som görs

#### Fas 1: Generera baseline (½–1 dag)
- [x] ~~Exportera aktuellt produktionsschema: `supabase db dump --linked > baseline.sql`~~ Krävde Docker — löst via Supabase Management API
- [x] Genererade baseline från sandboxen via Management API SQL endpoint (759 KB, 17 600+ rader)
- [x] Granskat exporten — Supabase-interna objekt exkluderade (auth, storage, realtime, pgsodium, vault)
- [x] Verifierat att baseline skapar identiskt schema: 247 tabeller, 156 funktioner, 545 policies, 28 enums

#### Fas 2: Sanera baseline (½–1 dag)
- [x] 10 fixkategorier applicerade (schema-kvalificering, forward declarations, BOM, syntax)
- [ ] ~~Standardisera updated_at-triggerfunktionen~~ Dokumenterat — fixas i separat migration
- [ ] ~~Ta bort dead code: plan_schedules RLS-policyer~~ Dokumenterat — fixas i separat migration
- [x] Verifierat att alla SECURITY DEFINER-funktioner har SET search_path

#### Fas 3: Anta ny struktur (½ dag)
- [x] Flyttat alla nuvarande migreringar till `supabase/migrations/_archived/` (304 filer)
- [x] Skapat `supabase/migrations/00000000000000_baseline.sql`
- [x] Verifierat: `supabase db reset --linked` mot sandbox — exit code 0
- [ ] Uppdatera `supabase_migrations.schema_migrations` i produktionsdatabasen (återstår vid prod-deploy)

#### Fas 4: Verifiering (½ dag)
- [x] `supabase db reset` mot sandbox med ny baseline → exit code 0
- [x] Jämfört schema-räkningar → exakt match (247/156/545/28)
- [ ] Kör `npx tsc --noEmit` → 0 errors (återstår)
- [ ] Kör applikationen lokalt mot new-baseline-databas (återstår)

### Fördelar
- ✅ **Ren startpunkt** — alla nya miljöer byggs från en korrekt, verifierad baseline
- ✅ **Eliminerar migrationsskuld** — 307 → 1 + framtida migreringar
- ✅ **Eliminerar alla 10 fresh-install-problem** — baseline representerar slutresultatet
- ✅ **Snabbare provisioning** — en migration istället för 307
- ✅ **Historik bevarad** — arkiverade migreringar finns kvar som referens
- ✅ **Produktionen påverkas INTE** — prod har redan alla migreringar applicerade

### Nackdelar
- ⚠️ Kräver noggrann verifiering att baseline matchar prod
- ⚠️ Gamla migreringar måste markeras som redan-körda i prod
- ⚠️ Eventuella pågående utvecklingsbranchar måste anpassas
- ⚠️ Kräver Docker Desktop ELLER remote pg_dump-åtkomst för schema-export

### Uppskattad tidsinsats
~2–3 dagar

### Risk
🟢 **LÅG** — Produktionsdatabasen påverkas inte. Baseline genereras från faktiskt schema. Gamla migreringar arkiveras.

### Kritisk distinktion

> **Vi gör inte om databasen. Vi ersätter 307 steg med 1 steg som leder till exakt samma slutresultat.**

Prod-databasen vet inte skillnaden. Den har redan alla migreringar. Framtida migreringar läggs till efter baseline precis som vanligt.

---

## Alternativ C: Partial Redesign

### Beskrivning
Bygg om utvalda domäner som anses ha arkitekturproblem, utöver baseline-konsolideringen. Behåll resten som det är.

### Kandidater för redesign

| Domän | Problem | Redesign-scope |
|-------|---------|---------------|
| **Tenant/Membership** | Tabell/vy-förvirring, roll-fragmentering, duplicerade attribut | Consolidera user_tenant_memberships/tenant_memberships, standardisera rollkälla |
| **Gamification** | 25–30 tabeller, 5 analytics-versioner, sprawl | Konsolidera analytics-tabeller, slå ihop relaterade config-tabeller |
| **Updated_at-triggers** | 6 varianter av samma funktion | Konsolidera till 1 |
| **Naming** | owner_tenant_id vs tenant_id | Standardisera till tenant_id överallt |

### Fördelar
- ✅ Löser strukturella brister, inte bara migrationskedjan
- ✅ Renare datamodell framåt
- ✅ Bäst tidpunkt (låg risk med lite data)

### Nackdelar
- 🔴 **Hög arbetsinsats** — 1–2 veckor
- 🔴 **Kräver applikationsändringar** — queries, types, API-routes som refererar ändrade tabeller/kolumner
- 🔴 **Regressionsfara** — varje schema-ändring kan bryta applikationskod
- 🔴 **TypeScript-typer** — alla Supabase-genererade typer måste regenereras
- 🔴 **Överdrivet** — problemen är hanterbara utan redesign

### Uppskattad tidsinsats
~1–2 veckor

### Risk
🔴 **HÖG** — Stor yta för regressioner. ROI osäker.

---

## Rekommendation

### Alternativ B: Canonical Baseline

**Motivering:**

1. **Kärnproblemet är migrationskedjan, inte schemat.** Schemat fick betyg 7/10 i auditen. 10 av 10 sandbox-problem var migreringsordningsproblem, inte designproblem. En ny baseline eliminerar alla utan att ändra något i schemat.

2. **Perfekt timing.** Nästan ingen känslig kunddata. Lekar kan exporteras/importeras. Kostnaden att göra detta nu är en bråkdel av vad det kostar med aktiva kunder.

3. **Minimal risk.** Produktionsdatabasen påverkas inte. Baseline genereras från faktiskt schema. Inga applikationsändringar behövs.

4. **Framtidssäkring.** Alla framtida environments (sandbox, staging, CI, demo) startar rent. CI kan köra `db reset` på varje push utan risk.

5. **Alternativ C (redesign) kan göras EFTER baseline.** Om ni vill standardisera naming eller konsolidera gamification-tabeller, gör det som separata migreringar mot den nya baseline. Steg för steg, inte allt-på-en-gång.

### Komplettering med delar av A och C

Oavsett valt alternativ bör dessa åtgärder från A och C genomföras:

| Åtgärd | Från | Prioritet |
|--------|------|-----------|
| Lägg till CI-check: `supabase db reset` | A | P1 |
| Dokumentera owner_tenant_id vs tenant_id | C | P2 |
| Konsolidera updated_at-funktioner till 1 | C | P2 |
| Ta bort plan_schedules dead code | A | P1 |
| Schema-versionerings-konvention framåt | Ny | P1 |

---

## Beslutspunkter

| Fråga | Alternativ | Din input behövs |
|-------|-----------|-----------------|
| Vilken strategi? | A / **B** / C | — |
| Acceptera naming-drift (owner_tenant_id)? | Ja / Nej (fix i C) | — |
| Gamification-sprawl: acceptera eller konsolidera? | Acceptera / Konsolidera (C) | — |
| CI-check på db reset? | Ja / Nej | — |
| Tidpunkt: nu eller efter sandbox-deploy? | Nu / Efter | — |

---

## Nästa steg efter beslut

### Om Alternativ B väljs:
1. Generera baseline från sandbox-databasen (redan provisionerad med alla 307 migreringar)
2. Sanera baseline (ta bort Supabase internals, verifiera)
3. Arkivera gamla migreringar
4. Verifiera fresh install med ny baseline
5. Uppdatera prod schema_migrations-tabell
6. Fortsätt sandbox-deploy med ren bas

### Om Alternativ A väljs:
1. Fortsätt sandbox-deploy omedelbart
2. Lägg till CI-check
3. Dokumentera kända begränsningar
4. Lev med risken

### Om Alternativ C väljs:
1. Genomför Alternativ B först (baseline)
2. Identifiera redesign-scope
3. Skapa migreringar mot ny baseline
4. Verifiera applikationskod
5. ~1–2 veckors arbete innan sandbox-deploy
