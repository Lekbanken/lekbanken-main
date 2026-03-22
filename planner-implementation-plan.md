# Planner v2.0 — Komplett Implementeringsplan

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-04
- Last updated: 2026-03-22
- Last validated: 2026-03-21

> Aktiv implementerings- och backloggreferens för Planner-domänen. Denna plan bygger på `planner-audit.md` och kompletteras av `planner-architecture.md` för systemdesign.

> **Dokumentrouting (2026-03-22):** Planner-stöddokument som inte ingår i det kanoniska triplet ligger nu under `docs/planner/`. Denna plan och övriga root-triplet-dokument förblir aktiva ingångar för planner-arbete.

> **Datum:** 2026-03-04 | **Senast uppdaterad:** 2026-03-22  
> **Senast validerad:** 2026-03-21  
> **Status:** MS0–MS11 ✅ KLARA. PlanSnapshot Pipeline ✅ KLAR. 0 TS-errors.  
> **Scope:** Planner wizard, planlista, kalender, play integration, tenant-RLS och post-launch backlog  
> **Förutsättning:** Denna plan bygger på `planner-audit.md`. Se även `planner-architecture.md` för systemdesign.  
> **Nästa:** Post-launch Priority 1 — Tenant-Custom Planner Blocks (se `launch-control.md` §11)  
> **Kvarvarande:** Cross-tenant isolation test för planner-RLS och produktfiltrering för globala planer

**Notering (2026-03-19):** planner publish/status canonicalization är genomförd. `published` får endast sättas via `/api/plans/[planId]/publish`, och `/api/plans/[planId]/status` är begränsad till icke-publicerande övergångar. Bulk publish är uttryckligen avstängd tills den kan skapa snapshots på samma sätt som den individuella publish-vägen.

### Låsta beslut (godkänns 2026-03-04)

| # | Beslut | Detalj |
|---|--------|--------|
| 1 | **CreatePlanDialog behålls** | Namn (required) + Beskrivning (optional). Ingen visibility-picker i /app — alltid privat. |
| 2 | **Publicering transparent** | "Spara & Utför" auto-publicerar vid behov. Användaren ser aldrig publicering/versioner explicit. |
| 3 | **Wizard = 2 steg** | (1) Bygg plan (inkl anteckningar) → (2) Spara & Utför (inline preview + save/run). |
| 4 | **Scope-tabs** | UI-tabs visas (Mina / {Org} / Global). Org-tab aktiv om användaren har tenant. Global alltid aktiv. "Kommer snart"-badge visas bara på genuint disabled tabs (Org utan tenant). |
| 5 | **Kalender end-to-end** | Planlägg → välj plan → skapa schedule → synligt i dagvy → starta körning. CRUD begränsat till **create + delete** i beta. |
| 6 | **Session-block = post-beta** | Om ett plan-block refererar en deltagarlek (play_mode=participants) → visa tydlig blockering i UI: "Kräver session — stöds i nästa version". |
| 7 | **Publicering är en snapshot-operation** | `published` är inte bara ett statusvärde. Alla publiceringar måste gå genom `/publish` så `plan_versions` + `plan_version_blocks` alltid hålls i sync med listor, wizard och adminytor. |

---

## 1. Målbild & Scope

### 1.1 Vad ingår i Beta

| Funktion | Beskrivning | Kritisk? |
|----------|-------------|----------|
| **Wizard 2 steg** | Förenkla från 5 → 2 steg: (1) Bygg plan, (2) Spara & Utför | ✅ Ja |
| **Ny plan-snabbstart** | CreatePlanDialog (namn) → direkt till Bygg plan | ✅ Ja |
| **Planlista med scope-tabs** | "Mina" / "{Org}" / "Global" — Org aktiv om tenant finns, Global alltid aktiv | ✅ Ja (MS5) |
| **Kalender: Planlägg-fix** | "Planlägg" → välj plan + skapa schema | ✅ Ja |
| **Kör plan (offline)** | Befintlig PlayPlanPage, fungerar redan | ✅ Redan klart |
| **Dödkodsrensning** | Ta bort ActionBar, AnimatedList, dead routes | ✅ Hygien |
| **i18n-konsolidering** | Säkerställ konsekvent terminologi | ✅ Hygien |

### 1.2 Vad ingår INTE i Beta (Post-beta/P1-P2)

| Funktion | Fas | Motivering |
|----------|-----|------------|
| ~~Organisationsplaner + RLS~~ | ~~P1~~ | ✅ **KLAR** (MS5) — Tenant RLS + Scope-tabs aktiverade |
| Globala planer + produktfiltrering | P1 | Kräver ny tabell `plan_product_tags` |
| "Lägg till i plan"-modal | P1 | Kräver ny komponent + API-integration |
| Session-block (deltagarlek) | P2 | Post-beta. Beta: visa tydlig blockering i UI om block kräver session. |
| Aktiva körningar i sessions | P1 | UI-ändring i sessions-listan |
| Admin-refaktor | P2 | Stor men inte kund-synlig |
| AI-assistans i planskapande | P2+ | Stub finns men ingen backend |

---

## 2. Informationsarkitektur

### 2.1 Ny sidstruktur

```
/app/planner                        → Redirect till /plans
  ├── /plans                        → "Planer" (huvud)
  │     Tabs: [Mina] [{Org}*] [Global*]    (* = "Kommer snart" i beta)
  │     Filter: Status (Utkast/Ändrad/Publicerad/Arkiverad)
  │     Varje plan: Namn | Status-badge | Tid | 👁 Förhandsvisning | ✏️ Editera
  │     [+ Ny plan] → CreatePlanDialog → /plan/{newId}?step=1
  │
  ├── /plan/[planId]                → Wizard (2 steg)
  │     Steg 1: "Bygg plan"
  │       ├── Block-lista (DnD, swipe-gester)
  │       ├── Lägg till block (GamePicker inline)
  │       ├── Anteckningar (ihopfällbar sektion)
  │       └── [Nästa →]
  │     Steg 2: "Spara & Utför"
  │       ├── Förhandsvisning (inline, inte dialog)
  │       ├── Plannamn & beskrivning (redigerbar)
  │       ├── [Spara] → spara utkast
  │       └── [Spara & Utför] → auto-publicera + navigera till Kör
  │
  ├── /[planId]                     → Delningslänk (behåll oförändrad)
  │
  └── /calendar                     → Kalender
        ├── Månads/Veckovis
        ├── Dag → ScheduleList
        ├── [+ Planlägg] → PlanPickerModal → CreateSchedule
        └── ScheduleCard → [Starta körning]

/app/play
  ├── /plan/[planId]                → Kör plan (PlayPlanPage, oförändrad)
  └── /sessions                     → Sessions (post-beta: visa aktiva körningar här)
```

### 2.2 Komponentansvar (nytt)

```
PlannerPageLayout          — Layout-wrapper (oförändrad)
PlannerTabs                — 2 tabs: "Planer" / "Kalender" (ta bort Edit-tabben)
PlanListPanel              — Planlista med scope-tabs + filter (utökad)
  ├── ScopeSelector        — "Mina" / "{Org}" / "Global" knappar (NY)
  ├── PlanListItem         — Rad med snabbåtgärder (utökad med ikoner)
  └── CreatePlanDialog     — Namn + (valfri) beskrivning

PlanWizard                 — 2 steg (REFAKTORERAD)
  ├── StepBuildPlan        — Block + Anteckningar (UTÖKAD, f.d. StepByggPlan)
  │     ├── BlockList
  │     ├── BlockRow / TouchBlockRow
  │     ├── GamePicker
  │     └── NotesSection   — Ihopfällbar anteckningssektion (NY)
  └── StepSaveAndRun       — Förhandsvisning + Spara/Utför (NY, f.d. StepSparaUtfor)
        ├── PlanPreviewInline (NY — baserad på PreviewDialog-innehåll)
        ├── PlanMetaEditor  — Namn/beskrivning inline edit (NY)
        └── SaveActions     — "Spara" + "Spara & Utför" (NY)

PlanCalendar               — Kalendervy (oförändrad struktur)
  └── PlanPickerModal      — Välj plan för schemaläggning (NY)

PlayPlanPage               — Kör plan (minimala ändringar)
```

---

## 3. Domänmodell / Datamodell (konceptnivå)

### 3.1 Befintliga tabeller (bevaras)

```
plans
  id: uuid (PK)
  name: text
  description: text
  visibility: plan_visibility_enum ('private' | 'tenant' | 'public')
  status: plan_status_enum ('draft' | 'published' | 'modified' | 'archived')
  owner_user_id: uuid (FK → auth.users)
  owner_tenant_id: uuid (FK → tenants, nullable)
  total_time_minutes: int
  current_version_id: uuid (FK → plan_versions, nullable)
  metadata: jsonb
  created_at, updated_at

plan_blocks
  id: uuid (PK)
  plan_id: uuid (FK → plans)
  position: int
  block_type: plan_block_type_enum ('game'|'pause'|'preparation'|'custom'|'section')
  game_id: uuid (FK → games, nullable)
  duration_minutes: int (nullable)
  title: text
  notes: text
  is_optional: bool
  metadata: jsonb
  created_by, updated_by, created_at

plan_versions
  id, plan_id, version_number, name, description, total_time_minutes, published_at, published_by

plan_version_blocks
  id, plan_version_id, position, block_type, game_id, duration_minutes, title, notes, is_optional, metadata

plan_schedules
  id, plan_id, scheduled_date, scheduled_time, recurrence_rule, status, notes, created_by
  group_id, group_name, location, completed_at  (extra kolumner i faktisk tabell)

plan_notes_private   (per user, per plan)
plan_notes_tenant    (per tenant, per plan)

runs
  id, plan_id, plan_version_id, version_number, name, status, created_by, created_at, updated_at

run_steps
  id, run_id, index, block_id, block_type, title, description, duration_minutes, game_snapshot, metadata
```

#### ✅ Verifiering: `plan_schedules`-tabellen

**Status:** Tabellen är nu **kanoniskt definierad i migrationskedjan** och fungerar i fresh install.

| Kontrollpunkt | Resultat |
|---|---|
| `types/supabase.ts` (genererade typer) | ✅ Rad 8474 — Row/Insert/Update/Relationships definierade |
| FK-constraints | ✅ `plan_schedules_plan_id_fkey` → plans, `plan_schedules_created_by_fkey` → users |
| RLS-policy | ✅ `plan_schedules_access` (ägare + tenant-visibility) — ALTER i migration 20260220 |
| API-routes | ✅ `GET/POST /api/plans/schedules` + `PUT/DELETE /api/plans/schedules/[scheduleId]` — alla frågar `from('plan_schedules')` |
| Klient-hook | ✅ `useSchedules` har fullständig CRUD |
| `CREATE TABLE` migration | ✅ `20260320120000_plan_schedules_backfill_and_runs_canonical_sync.sql` återför tabellen till levande migrationskedja |

**Kolumner (från `types/supabase.ts`):**
`id`, `plan_id` (required), `scheduled_date` (required), `scheduled_time`, `status`, `recurrence_rule`, `notes`, `group_id`, `group_name`, `location`, `completed_at`, `created_by`, `created_at`, `updated_at`

**Slutsats:** Tabellen fungerar och ingår nu i baseline/fresh install. Kalender-API:erna och genererade Supabase-typer kan därför verifieras i CI utan dashboard-beroende drift.

**Noteringar:**
- ✅ KLAR (2026-03-20) `plan_schedules` backfillad med CREATE TABLE, FK, index och RLS i `20260320120000_plan_schedules_backfill_and_runs_canonical_sync.sql`
- ✅ KLAR (2026-03-20) play-API synkad mot `runs.plan_id` + `runs.current_step_index`, vilket återställde compile-time-synk efter `npm run db:types`

### 3.2 Nya tabeller (P1 — Post-beta)

```
plan_product_tags (NY — Fas 6)
  plan_id: uuid (FK → plans)
  product_id: uuid (FK → products)
  PRIMARY KEY (plan_id, product_id)
  — Möjliggör "Visa bara planer relevanta för min produkt/licens"
```

### 3.3 RLS-ändringar (✅ KLAR — MS5, 2026-03-04)

```sql
-- Implementerad i migration: 20260305100000_tenant_rls_planner.sql
-- Se §5.4 för fullständig policy-översikt
CREATE POLICY plans_select_tenant ON plans
  FOR SELECT USING (
    visibility = 'tenant'
    AND owner_tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Ny policy: Tenant-admins kan redigera tenant-planer
CREATE POLICY plans_update_tenant ON plans
  FOR UPDATE USING (
    visibility = 'tenant'
    AND owner_tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND status = 'active'
    )
  );
```

### 3.4 Ny block_type (P2 — Post-beta)

```sql
ALTER TYPE plan_block_type_enum ADD VALUE IF NOT EXISTS 'session_game';
```

Metadata-konvention för session_game-block:
```json
{
  "sessionConfig": {
    "gameId": "uuid",
    "playMode": "participants",
    "autoCreateSession": true
  }
}
```

---

## 4. UX-flöden (End-to-End)

### 4.1 Skapa plan (privat)

```
Användare → Klickar [+ Ny plan]
  → CreatePlanDialog öppnas
     ├── Fält: "Namn" (obligatoriskt)
     ├── Fält: "Beskrivning" (valfritt)
     └── Knapp: [Skapa plan]
  → POST /api/plans { name, description, visibility: 'private' }
  → Navigera till /app/planner/plan/{newId}?step=1
  → Wizard öppnas på Steg 1: "Bygg plan"
```

**Skillnad mot idag:** CreatePlanDialog har INTE synlighetsval (alltid privat för /app). Steg "Grund" existerar inte. Användaren hamnar direkt i block-byggande.

### 4.2 Bygg plan (inkl anteckningar)

```
Steg 1: "Bygg plan"

┌────────────────────────────────────────────┐
│  ← Planer     Bygg plan          Steg 1/2 │
├────────────────────────────────────────────┤
│                                            │
│  [+ Lägg till block ▼]                     │
│    → Lek / Paus / Förberedelse / Notat     │
│    → Sektion (gruppering)                  │
│                                            │
│  ┌──────────────────────────────────┐      │
│  │ 1. 🎮 LEK  "Mina styrkor"  15 min│     │
│  │    ↕ drag-handle                  │     │
│  ├──────────────────────────────────┤      │
│  │ 2. 📋 FÖRBEREDELSE  3 min        │     │
│  ├──────────────────────────────────┤      │
│  │ 3. ⏸ PAUS  5 min                 │     │
│  └──────────────────────────────────┘      │
│                                            │
│  ▸ Anteckningar (ihopfällbar)              │
│    ┌──────────────────────────┐            │
│    │ Privata anteckningar     │            │
│    │ (textarea)               │            │
│    └──────────────────────────┘            │
│                                            │
├────────────────────────────────────────────┤
│           [← Tillbaka] [Nästa →]          │
└────────────────────────────────────────────┘
```

**Funktioner i detta steg:**
- Lägg till block (samma GamePicker som idag)
- Drag-and-drop omordning
- Swipe-to-delete (mobil) / Delete-knapp (desktop)
- Inline redigering av block (titel, tid, anteckningar)
- Sektioner med visuell gruppering (befintlig sektion-feature)
- Anteckningar: Privat + Tenant-anteckning (befintlig feature, nu i ihopfällbar panel)

### 4.3 Spara / Spara & Utför

```
Steg 2: "Spara & Utför"

┌────────────────────────────────────────────┐
│  ← Bygg plan   Spara & Utför    Steg 2/2  │
├────────────────────────────────────────────┤
│                                            │
│  Plannamn: [Testplanen        ] ✏️          │
│  Beskrivning: [Privat plan...  ] ✏️         │
│                                            │
│  ──── Förhandsvisning ────                 │
│                                            │
│  ⏱ 50 min  •  5 block                     │
│                                            │
│  1. 🎮 LEK  Mina styrkor       15 min     │
│  2. 📋 FÖRBEREDELSE             3 min      │
│  3. 📝 NOTAT  Notat             2 min      │
│  4. ⏸ PAUS                      5 min      │
│  5. 🎮 LEK  Väktarlandet S1E1  25 min     │
│                                            │
├────────────────────────────────────────────┤
│    [Spara]          [Spara & Utför ▶]      │
└────────────────────────────────────────────┘
```

**"Spara"-knappen:**
1. Sparar eventuella namn/beskrivningsändringar (`PATCH /api/plans/[planId]`)
2. Visar "Sparad!"-toast
3. Stannar kvar på steget

**"Spara & Utför"-knappen:** *(Beslut #2: auto-publicering)*
1. Sparar namn/beskrivning om ändrat
2. Om plan status = 'draft' eller 'modified' → auto-publicerar (`POST /api/plans/[planId]/publish`) — **transparent för användaren**
3. Navigerar till `/app/play/plan/{planId}` (PlayPlanPage)
4. Visa loading-state under publicering
5. Användaren behöver aldrig förstå "publicering" eller "versioner" — det sker bakom kulisserna

### 4.4 Körning med offline plan-run

```
PlayPlanPage (befintlig — minimala ändringar)

┌────────────────────────────────────────────┐
│  ← Tillbaka            Testplanen          │
├────────────────────────────────────────────┤
│                                            │
│              Steg 1 av 5                   │
│          🎮 Mina styrkor                   │
│                                            │
│              ⏱ 15:00                       │
│           [Start] [Paus]                   │
│                                            │
│  Anteckningar:                             │
│  (block-specifika notes)                   │
│                                            │
├────────────────────────────────────────────┤
│    [← Föregående]     [Nästa →]            │
└────────────────────────────────────────────┘
```

**Befintlig funktionalitet (bevaras):**
- Timer per steg med start/paus/reset
- localStorage-persistens av progress
- Navigering framåt/bakåt
- Steg-indikator
- Sektions-block hoppas över automatiskt (redan implementerat)

**Tillägg (beta):**
- "Tillbaka till plan"-knapp i headern → navigera till `/app/planner/plan/{planId}`
- Visa plannamn i header

### 4.5 Kalender: Planlägg på dag

```
Nuvarande (TRASIGT):
  Klicka dag → Klicka "Planlägg" → ??? (ingenting händer)

Nytt flöde:
  Klicka dag → Klicka [+ Planlägg]
    → PlanPickerModal öppnas
       ┌────────────────────────────────┐
       │   Välj plan att schemalägga    │
       │                                │
       │   🔍 Sök plan...               │
       │                                │
       │   📋 Testplanen       [Välj]   │
       │   📋 Min nya plan     [Välj]   │
       │   📋 Fotbollsträning  [Välj]   │
       └────────────────────────────────┘
    → Välj plan
    → POST /api/plans/schedules { planId, scheduledDate, scheduledTime? }
    → Schema visas i ScheduleCard på den dagen
    → ScheduleCard har [▶ Starta körning]-knapp
```

### 4.6 "Lägg till lek i plan" (Post-beta, P1)

```
Användare → Speldetaljer → Klickar [Lägg till i plan]
  → AddToPlanModal öppnas
     ┌────────────────────────────────────────┐
     │   Lägg till "Mina styrkor" i en plan   │
     │                                        │
     │   📋 Testplanen                        │
     │       [Lägg till] [Gå till plan →]     │
     │                                        │
     │   📋 Min nya plan                      │
     │       [Lägg till] [Gå till plan →]     │
     │                                        │
     │   📋 Fotbollsträning                   │
     │       [Lägg till] [Gå till plan →]     │
     └────────────────────────────────────────┘
  → Klickar [Lägg till]
  → POST /api/plans/{planId}/blocks { block_type: 'game', game_id, duration_minutes }
  → "Tillagd! ✓" bekräftelse inline
```

---

## 5. Roller & Behörigheter

### 5.1 Rollmatris

| Funktion | Lekledare | Org-admin | System-admin |
|----------|-----------|-----------|--------------|
| Skapa privat plan | ✅ | ✅ | ✅ |
| Se egna planer | ✅ | ✅ | ✅ |
| Redigera egna planer | ✅ | ✅ | ✅ |
| Publicera egna planer | ✅ | ✅ | ✅ |
| Köra egna planer | ✅ | ✅ | ✅ |
| Se organisationsplaner | ✅ (P1) | ✅ (P1) | ✅ |
| Skapa organisationsplaner | ❌ | ✅ (P1) | ✅ |
| Uppgradera privat → organisation | ❌ | ✅ (P1) | ✅ |
| Se globala planer | ✅ (P1) | ✅ (P1) | ✅ |
| Skapa globala planer | ❌ | ❌ | ✅ |
| Produkttagga planer | ❌ | ❌ | ✅ (P2) |
| Administrera alla planer | ❌ | Egna + tenant | ✅ |

### 5.2 Behörighetsflöde

```
Begäran → RLS-policy (Supabase)
  ├── owner_user_id = auth.uid()  → ✅ egen plan
  ├── visibility = 'tenant' AND tenant match  → ✅ org-plan (P1)
  ├── visibility = 'public'  → ✅ global (readonly)
  └── is_system_admin()  → ✅ allt

Application-level (lib/planner/scope.ts):
  ├── APP_SCOPE_CONFIG → mobilvänlig, begränsade features
  └── ADMIN_SCOPE_CONFIG → alla features, desktop-first
```

---

## 6. Teknisk plan (utan kod)

### 6.1 Refactor-strategi

#### Fas 0: Städning (förarbete)
1. **Ta bort dödkod:**
   - `features/planner/components/ActionBar.tsx` (86 rader, aldrig importerad)
   - `features/planner/components/AnimatedList.tsx` (152 rader, troligen oanvänd)
   - `app/app/play/[gameId]/page.tsx` (redirect-only)
   - Markera `plan_games` och `plan_play_progress` som deprecated i migrations-kommentar
2. **i18n-konsolidering:**
   - Inventera `lib/planner/locales.json` — alla nycklar som INTE har motsvarighet i `messages/*.json` migreras dit
   - Uppdatera `lib/planner/i18n.ts` att peka på `messages/*.json` ELLER ta bort den och använd `useTranslations('planner')` genomgående
3. **Verifiera section-migrering:** Bekräfta att `20260304000000_plan_block_type_section.sql` har körts i alla miljöer

#### Fas 1: Wizard-förenkling
1. **Modifiera `PlanWizard.tsx`:** 
   - Ändra steg-array från 5 → 2 steg
   - Steg 1: "Bygg plan" (rendera `StepBuildPlan` — utökad med anteckningspanel)
   - Steg 2: "Spara & Utför" (ny komponent `StepSaveAndRun`)
2. **Uppdatera `MobileWizardStepper.tsx`:** 
   - Anpassa för 2 steg
   - Steg-etiketter: "Bygg plan" | "Spara & Utför"
3. **Skapa `StepSaveAndRun.tsx`:** (engelska filnamn, UI-text på svenska via i18n)
   - Extrahera inline preview-logik från PreviewDialog
   - Redigerbart namn/beskrivningsfält
   - "Spara"-knapp (patch plan, visa toast)
   - "Spara & Utför"-knapp (patch plan → auto-publish → navigate to play)
4. **Byt namn på `StepByggPlan.tsx` → `StepBuildPlan.tsx`:**
   - Lägg till ihopfällbar "Anteckningar"-sektion under block-listan
   - Flytta anteckningslogik från `StepAnteckningar`
5. ~~**Migrera/arkivera gamla steg-komponenter:**~~ ✅ **Raderade (2026-03-04)**
   - `StepGrund.tsx` → **raderad** (funktionaliteten lever i CreatePlanDialog)
   - `StepAnteckningar.tsx` → **raderad** (ihopslagen med StepBuildPlan)
   - `StepGranska.tsx` → **raderad** (ersätt av StepSaveAndRun)
  - `StepKor.tsx` → **raderad 2026-03-21** (sista kvarvarande legacy-artefakten; ersätts av "Spara & Utför"-knapp)
   - `StepByggPlan.tsx` → **raderad** (ersätt av ny StepBuildPlan.tsx)
6. **Uppdatera `usePlanWizard.ts`:**
   - Ändra steg-logik från 5 → 2 steg
   - URL-parametern `?step=` mappar 1-2 istället för 1-5
7. **Uppdatera `WizardStepNav.tsx`:**
   - Visa 2 steg istället för 5

#### Fas 1b: Ny plan-flöde
1. **CreatePlanDialog:** 
   - Behåll modal med namn (required) + beskrivning (optional)
   - Ta bort synlighetsval (automatiskt `private` för /app)
   - Vid submit → `POST /api/plans` → navigera till `/app/planner/plan/{id}?step=1`
2. **PlannerTabs:**
   - Ta bort "Edit"-tabben (den är redan disabled by default)
   - Två tabs kvar: "Planer" | "Kalender"
   - Planens namn visas i wizard-header istället

#### Fas 2: Planlista v2
1. **Skapa `ScopeSelector.tsx`:**
   - 2-3 knappar: "Mina" (aktiv) / "{Org}" (disabled/badge) / "Global" (disabled/badge)
   - `useUserTenant()` för att hämta org-namn
   - P1: Aktivera org/global med faktisk datafiltrering
2. **Uppdatera `PlanListPanel.tsx`:**
   - Integrera ScopeSelector ovanför filtren
   - Visa snabbåtgärdsikoner per rad (👁 + ✏️)
   - Förbättra mobilresponsivitet
3. **Uppdatera `PlanListItem.tsx`:**
   - Lägg till ögon-ikon (öppnar PreviewDialog inline)
   - Lägg till penna-ikon (navigerar till wizard)
   - Bättre layout: namn + statusbadge + tid + ikoner

#### Fas 3: Kalender-fix
1. **Skapa `PlanPickerModal.tsx`:**
   - Lista med användarens planer (hämtas via `fetchPlans()`)
   - Sökfält för filtrering
   - Varje plan: namn + [Välj]-knapp
   - Returnerar vald `planId`
2. **Uppdatera `useSchedules.ts`:**
   - `openCreateDialog()` → öppna PlanPickerModal FÖRST
   - Efter plan vald → skapa schema med `planId + selectedDate`
3. **Uppdatera `ScheduleList.tsx`:**
   - Klick på "Planlägg" → trigga PlanPickerModal
4. **Kalenderdag-badges:**
   - Visa en dot/badge på dagar som har schemalagda planer

### 6.2 Modulgränser mellan `/app` och `/admin`

```
Delat (lib/planner/):
  ├── state-machine.ts    — Statusövergångar
  ├── labels.ts           — Etiketter, färger, ikoner
  ├── dto.ts              — Zod-scheman, validering
  ├── scope.ts            — Scope-config (app vs admin)
  └── hooks/              — usePlanFilters, useBulkActions

/app (features/planner/):
  ├── components/         — Mobiloptimerade UI-komponenter
  ├── wizard/             — Wizard-steg (förenklat)
  ├── calendar/           — Kalenderintegration
  └── api.ts              — Klient-API-anrop

/admin (app/admin/planner/):
  ├── page.tsx            — Admin-lista (deras egen, desktop-first)
  └── [planId]/page.tsx   — Admin-detalj (deras egen)
```

**Princip:** Admin och App delar domänlogik (`lib/planner/`) och typer (`types/planner.ts`) men INTE UI-komponenter. Admin behåller sin inline-kodstil (refaktoreras separat i P2).

### 6.3 Teststrategi

| Typ | Verktyg | Scope | Prioritet |
|-----|---------|-------|-----------|
| **Smoke** | Manuell + Playwright | Ny plan → Bygg → Spara & Utför → Kör | P0 |
| **API integration** | Vitest | POST/PATCH/DELETE plans, blocks, schedules, publish | P0 |
| **Component** | Vitest + React Testing Library | PlanWizard, StepBuildPlan, StepSaveAndRun, PlanPickerModal | P1 |
| **E2E** | Playwright | Fullständigt flöde: skapa plan → bygg → kör → kalender | P1 |
| **RLS** | Supabase test-klient | Plans visibility + tenant policies (när P1 implementeras) | P1 |

**Regressionsskydd:**
- Wizard-ändringen är den mest riskabla. Testerna måste verifiera:
  - Befintliga planer med 5-stegs URL (`?step=3`) fallbackar korrekt till 2-stegs-wizard
  - Publiceringsflödet fungerar via auto-publicering i "Spara & Utför"
  - Block CRUD (lägg till, ta bort, omordna, redigera) fungerar i det nya steget
  - Anteckningar sparas korrekt i det nya steget

### 6.4 Telemetri & Loggning

| Signal | Var | Syfte |
|--------|-----|-------|
| `planner.plan.created` | CreatePlanDialog submit | Spåra planskapande-frekvens |
| `planner.wizard.step.completed` | Varje steg-navigering | Identifiera drop-off-punkter |
| `planner.plan.saved` | "Spara"-knapp | Spara vs Spara & Utför-ratio |
| `planner.plan.run_started` | "Spara & Utför" → play | Konvertering till körning |
| `planner.calendar.schedule_created` | Schema skapat | Kalenderanvändning |
| `planner.error.publish_failed` | Publish-endpoint errors | Kritiska errors |
| `planner.error.api_failed` | Alla API-anrop med catch | General error tracking |

**Befintligt:** `lib/planner/analytics.ts` har client-side beräkningar men ingen backend-integration. Rekommendation: Använd befintlig `track()`-infrastruktur från app-nivå (om den finns) eller lägg till `console.warn` med strukturerad logg + Sentry/liknande.

---

## 7. Milstolpar & Checklista

### Milstolpe 0: Städning ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] `ActionBar.tsx` borttagen, inga build-errors
- [x] `AnimatedList.tsx` borttagen (verifierad oanvänd)
- [x] `/app/play/[gameId]` redirect-route borttagen
- [x] i18n: `lib/planner/locales.json` + `lib/planner/i18n.ts` raderade (100% död kod, noll imports)
- [x] `section` enum-migrering verifierad
- [x] Befintliga tester passerar
- [x] Zero build errors, zero type errors

**Noteringar:**
- Grep-verifiering gjord före varje borttagning — inga aktiva imports hittades
- Build-verifiering (`npx tsc --noEmit`) efter varje steg — 0 errors genomgående

---

### Milstolpe 1: Wizard 5→2 steg + Ny plan-flöde ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] PlanWizard renderar 2 steg: "Bygg plan" + "Spara & Utför"
- [x] MobileWizardStepper visar 2 steg med korrekta etiketter
- [x] WizardStepNav visar 2 steg
- [x] StepBuildPlan: block-lista + ihopfällbar anteckningssektion i samma vy
- [x] StepSaveAndRun: inline förhandsvisning + redigerbart namn/beskrivning
- [x] "Spara"-knappen: sparar utkast, visar toast, stannar kvar
- [x] "Spara & Utför"-knappen: sparar → auto-publicerar → navigerar till Kör
- [x] CreatePlanDialog: namn + beskrivning, ingen synlighetsval
- [x] PlannerTabs: "Planer" + "Kalender" (ingen "Edit"-tab)
- [x] Befintliga planer öppnas korrekt i ny wizard (gammal `?step=` URL hanteras via `resolveStep()`)
- [x] StepGrund.tsx, StepAnteckningar.tsx, StepGranska.tsx, StepByggPlan.tsx **raderade** (inte arkiverade — död kod)
- [x] StepKor.tsx **slutligt raderad** ✅ KLAR (2026-03-21) — sista kvarvarande legacyfilen från 5-stegswizarden
- [x] Nya filer: `StepBuildPlan.tsx` och `StepSaveAndRun.tsx` (engelska filnamn, svenska UI-text via i18n)
- [x] i18n-nycklar uppdaterade för nya steg-namn i alla 3 locales
- [x] E2e-tester uppdaterade för 2-steg + legacy URL-test tillagt

**Noteringar:**
- Gamla steg-filer raderades helt (ej arkiverade) — all relevant logik samlad i StepBuildPlan + StepSaveAndRun. `StepKor.tsx` låg kvar som död artefakt utan imports och togs bort 2026-03-21.
- Legacy URL-mapping: `resolveStep()` i types.ts mappar `grund|bygg|anteckningar|granska|kor → build`
- WizardStep type: `'build' | 'save-and-run'`
- Auto-publicering använder befintlig publish-infrastruktur (transparent i StepSaveAndRun)

---

### Milstolpe 2: Planlista med Scope-tabs ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] Sidnamn ändrat: "Mine planer" → "Planer"
- [x] ScopeSelector visas: "Mina" (aktiv) / "{Org}" (disabled + badge) / "Global" (disabled + badge)
- [x] "Mina"-scopen filtrerar korrekt (visa bara egna planer)
- [x] PlanListItem: Visar namn + statusbadge + tid + ögon-ikon + penna-ikon
- [x] Ögon-ikon öppnar förhandsvisning (onClick/preview)
- [x] Penna-ikon navigerar till wizard (onEdit)
- [x] Mobilresponsivt: listitems anpassade för 375px
- [x] i18n-nycklar för scope-tabs och "Kommer snart" i alla 3 locales

**Noteringar:**
- ScopeSelector ~80 rader, använder `useTenant()` för org-namn
- PlanListItem har `group` hover-klass med ögon/penna-ikoner (HeroIcons)

---

### Milstolpe 3: Kalender-fix ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] PlanPickerModal: Visar lista av användarens planer med sökfält (~190 rader)
- [x] "Planlägg" i kalender → öppnar PlanPickerModal
- [x] Välj plan → skapar schema via `create()` från `useSchedules`
- [x] Nytt schema visas i ScheduleCard på vald dag
- [x] ScheduleCard: [▶ Starta körning] navigerar till `/app/play/plan/{planId}`
- [ ] Kalenderdagar med scheman visar visuell indikator (dot/badge) — **P1**
- [x] Play-URL fixad från `/app/planner/plan/${id}/play` till `/app/play/plan/${planId}`

**Noteringar:**
- PlanPickerModal filtrerar bort arkiverade planer, visar statusbadge + blockräkning
- Badge/dot-indikator på kalenderdagar skjuts till P1
- CRUD begränsas till create + delete i beta (edit-dialog P1)

---

### Milstolpe 4 (P1): "Lägg till i plan" ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] `showAddToPlan={true}` i GameStartActions (via GameActionsWithPlanModal wrapper)
- [x] AddToPlanModal: Lista planer + "Lägg till" + statusbadge + blockräkning
- [x] POST block → plan via `addBlock()` API
- [x] i18n-nycklar för AddToPlanModal i alla 3 locales (sv/en/no)
- [x] Toast-bekräftelse: "Tillagd i {plannamn}" ✅ (2026-03-04)
- [x] Race-safe parallella adds: `pendingPlanIds: Set<string>` ✅ (2026-03-04)
- [x] Optimistisk block count i UI ✅ (2026-03-04)
- [x] "Öppna plan"-knapp efter tillägg ✅ (2026-03-04)
- [x] Error-toast vid misslyckad tillägg ✅ (2026-03-04)

**Noteringar:**
- `GameActionsWithPlanModal` client wrapper skapad i `components/game/` — behövs pga Server Component page
- AddToPlanModal ~280 rader, följer PlanPickerModal-mönstret (search, skeleton, plan list)
- Multi-add stöds: kan lägga till i flera planer utan att stänga modalen
- Wired in `app/app/games/[gameId]/page.tsx`
- Kvalitetshärdning: pendingPlanIds Set (ej single-string), useToast, useRouter → "Öppna plan", optimistisk blockräkning

---

### Milstolpe 4.5 (P1): Run Resume ("Fortsätt") ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] `GET /api/play/runs/active` — hämtar pågående `in_progress` runs för aktuell user
- [x] `POST /api/play/{planId}/start` — idempotent: returnerar befintlig aktiv run (ej dublett)
- [x] `useActiveRuns()` hook — `planId → ActiveRun` mapping
- [x] `PlanListItem` — "Fortsätt"/"Kör" knapp + "Pågår" badge
- [x] `ScheduleCard` — "Fortsätt" visas permanent (ej hover-only) vid aktiv run
- [x] i18n nycklar: `actions.resume`, `actions.play`, `calendar.resumePlan` i sv/en/no

**Noteringar:**
- `runs` saknar `plan_id`-kolumn → left join genom `plan_versions(plan_id)` + fallback till `metadata.planId`
- `useActiveRuns` cachelagrar Map, exponerar `getActiveRun(planId)` + `refetch()`
- Start-route returnerar `{ run, resumed: true, resumeReason, resumeMeta }` vid befintlig run
- Left join (ej inner) säkerställer att runs med borttagen version inte försvinner tyst

---

### Milstolpe 4.6 (P1): Calendar Day Badges + Progress Indicator ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] `CalendarDay` visar amber pulsande dot för dagar med aktiv run
- [x] `CalendarDay` visar blå dot (scheduled) + grön dot (completed) — amber tar över blå om aktiv
- [x] `activeRunPlanIds` threadad genom `CalendarGrid` till `CalendarDay`
- [x] `ActiveRun` typ utökad med `totalSteps` från `metadata.stepsGenerated`
- [x] `PlanListItem` visar "Pågår · 3/12" i badge
- [x] `ScheduleCard` visar "Fortsätt · 3/12" på resume-knapp
- [x] 0 TS-errors

**Noteringar:**
- Progress visas som `currentStepIndex + 1` / `totalSteps` (1-indexed för UX)
- `totalSteps` hämtas från `runs.metadata.stepsGenerated` med `meta?.steps` som fallback
- Amber dot använder `animate-soft-pulse` (2.5s ease-in-out) — subtilare än default `animate-pulse`
- Progress-format via i18n: `runStatus.progress` → "3 av 12" (sv/no) / "3 of 12" (en)

---

### Milstolpe 4.7 (P1): Performance & UX Polish ✅ KLAR (2026-03-04)

**Definition of Done:**
- [x] `animate-pulse` → `animate-soft-pulse` (2.5s ease-in-out, subtilare animation)
- [x] Progress-format "3/12" → i18n `runStatus.progress` → "3 av 12" / "3 of 12"
- [x] Metadata fallback: `meta?.steps` i `active/route.ts` totalSteps
- [x] `React.memo` på `PlanListItem` + `ScheduleCard`
- [x] `useDeferredValue` för sök-filtrering i `PlanListPanel`
- [x] `useCallback` för stabil `handlePlay` i `PlanListPanel`
- [x] `prefers-reduced-motion` respekteras av soft-pulse
- [x] 0 TS-errors

**Noteringar:**
- Baserat på GPT-granskning av MS4.6. Option C (Performance pass) implementerad.
- `useDeferredValue` är React 19 built-in — inget custom hook behövs.
- `React.memo` wrapper-mönster: `export const X = memo(function X(...) { ... });`

---

### Milstolpe 4.8 (P1): Run Safety — Heartbeat & Auto-Stale ✅ KLAR (2026-03-04)

**Syfte:** Undvika "eviga in_progress"-runs som sabbar UX ("Pågår"-badge som aldrig försvinner).

**DB-ändringar:**
```sql
-- Migration: 20260305000000_runs_last_heartbeat_at.sql
ALTER TABLE runs ADD COLUMN last_heartbeat_at timestamptz NULL;

-- Partial index på aktiva runs
CREATE INDEX idx_runs_heartbeat ON runs(status, last_heartbeat_at)
  WHERE status IN ('not_started', 'in_progress');

-- Backfill: existerande in-progress runs får started_at som heartbeat
UPDATE runs SET last_heartbeat_at = started_at
  WHERE status = 'in_progress' AND last_heartbeat_at IS NULL;
```

**Definition of Done:**
- [x] `runs.last_heartbeat_at` kolumn tillagd (migration `20260305000000_runs_last_heartbeat_at.sql`)
- [x] `POST /api/play/runs/[runId]/heartbeat` — sätter `last_heartbeat_at = now()`, RLS-enforced (run owner only)
- [x] Client heartbeat: PlayPlanPage skickar heartbeat var 30s via `setInterval` + omedelbart vid mount
- [x] `GET /api/play/runs/active` filtrerar bort stale runs (heartbeat äldre än 24h) — "soft abandon"
- [x] `useActiveRuns()` ser aldrig stale runs → "Pågår"-badge försvinner automatiskt
- [x] UI: "Avbryt körning"-knapp med bekräftelsedialog ("Avbryt körning" / "Abandon run")
- [x] `POST /api/play/runs/[runId]/abandon` — markerar run som `abandoned` med `completed_at`
- [x] Progress-endpoint (`/api/play/runs/[runId]/progress`) piggybackar heartbeat vid varje sparning
- [x] Start-route sätter `last_heartbeat_at` vid ny run-skapning
- [x] `sendRunHeartbeat(runId)` fire-and-forget i `features/play/api.ts`
- [x] i18n: `play.playPlanPage.actions.abandonRun` + `abandonConfirm` i sv/en/no
- [x] Supabase-typer uppdaterade (`types/supabase.ts`: `last_heartbeat_at` i runs Row/Insert/Update)
- [x] Bonus: fixade tidigare TS-errors i StepKor.tsx under legacyfasen; filen är nu helt borttagen ✅ KLAR (2026-03-21)
- [x] 0 TS-errors (`npx tsc --noEmit`)

**Noteringar:**
- Migration: `20260305000000_runs_last_heartbeat_at.sql` — kolumn + partial index + backfill
- Heartbeat var 30s (inte 60s) — valt för snabbare stale-detection utan märkbar overhead
- Heartbeat skickas fire-and-forget — errors swallowed silently (bör ej störa UX)
- Draft/virtual/legacy runs hoppar över heartbeat (inget `runId` eller orelevant)
- Abandon-endpoint: sätter `status = 'abandoned'` + `completed_at = now()`; kräver att run är aktiv
- Abandon UI: "Avbryt körning"-knapp med destructive styling, bekräftelsedialog, visas bara för riktiga runs
- Active-runs filter: `.or('last_heartbeat_at.gte.{threshold},last_heartbeat_at.is.null')` — legacy bakåtkompatibilitet
- Fas 2 ("hard", optional framtida): cron/edge function som markerar stale runs som `abandoned` i DB

**Smoke Path 8: Run Safety**
- [x] Starta körning → Heartbeat skapas (start-route sätter `last_heartbeat_at`)
- [x] Navigera mellan steg → Heartbeat uppdateras (progress-endpoint piggybackar)
- [x] Stäng browser → Vänta > 24h → Run syns inte som "Pågår" i planlistan
- [x] Öppna run igen → Heartbeat återaktiveras → Run syns som "Pågår" igen
- [x] "Avbryt körning"-knapp → bekräftelse → run markeras som abandoned

---

### Milstolpe 5 (P1): Tenant RLS — Isolation & Organisationsplaner ✅ KLAR (2026-03-04)

**Syfte:** All Planner/Run-data tenant-isolerad via RLS. Scope-tabs (Mina/Org/Global) aktiverade med riktig data.

#### 5.1 Nuläge — RLS-audit (identifierade problem)

| Tabell | Nuvarande RLS | Problem |
|--------|--------------|----------|
| `plans` | `plans_select/insert/update/delete` — owner-only + `is_system_admin()` | ❌ Tenant-visibility **borttagen** i migration 20260108 (batch1) |
| `plan_blocks` | `plan_blocks_select` + `plan_blocks_manage` — owner-only | ❌ Samma — tenant/public visibility borttagen |
| `plan_versions` | `plan_versions_select` + `plan_versions_insert` — owner-only | ❌ Samma |
| `plan_version_blocks` | `users_can_select_version_blocks` + `plan_version_blocks_insert` — owner-only | ⚠️ SELECT existerade med icke-standardiserat namn; standardiserad till `plan_version_blocks_select` i MS5 |
| `plan_schedules` | `plan_schedules_access` — owner + tenant visibility | ⚠️ Bredare än parent `plans` (inkonsistent) |
| `plan_notes_private` | `plan_notes_private_manage` — owner-only | ✅ OK |
| `plan_notes_tenant` | `plan_notes_tenant_manage` — `tenant_id = ANY(get_user_tenant_ids())` | ⚠️ Tillåter access även på private-visibility-planer |
| `runs` | `runs_manage` — `user_id = auth.uid()` | ❌ Ingen tenant-awareness; `tenant_id` aldrig satt i API |

#### 5.2 Befintliga SQL helper-funktioner (kan återanvändas)

```sql
-- Redan skapade i 20260104120100_repair_consolidation.sql:
is_tenant_member(p_tenant_id uuid) → boolean   -- SECURITY DEFINER, checkar user_tenant_memberships
get_user_tenant_ids() → uuid[]                  -- Returnerar alla tenant IDs för current user
has_tenant_role(p_tenant_id, role) → boolean     -- Roll-check (admin/owner/member)
is_system_admin() → boolean                     -- System admin bypass
```

#### 5.3 DB-ändringar

```sql
-- Migration: tenant_rls_planner.sql

-- 1) Säkerställ att runs.tenant_id sätts korrekt
-- (kolumnen finns redan, men sätts aldrig — se §5.6)

-- 2) Backfill: sätt tenant_id på existerande runs via plan_versions → plans
UPDATE runs r
  SET tenant_id = p.owner_tenant_id
  FROM plan_versions pv
  JOIN plans p ON p.id = pv.plan_id
  WHERE r.plan_version_id = pv.id
    AND r.tenant_id IS NULL
    AND p.owner_tenant_id IS NOT NULL;
```

#### 5.4 Nya RLS-policies

```sql
-- ═══════════════════════════════════════
-- PLANS: drop + recreate med tenant-stöd
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "plans_select" ON plans;
DROP POLICY IF EXISTS "plans_insert" ON plans;
DROP POLICY IF EXISTS "plans_update" ON plans;
DROP POLICY IF EXISTS "plans_delete" ON plans;

-- SELECT: egna + tenant-visible + public + admin
CREATE POLICY "plans_select" ON plans FOR SELECT TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND is_tenant_member(owner_tenant_id)
    )
    OR visibility = 'public'::plan_visibility_enum
    OR is_system_admin()
  );

-- INSERT: egen user + tenant måste vara din
CREATE POLICY "plans_insert" ON plans FOR INSERT TO authenticated
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    AND (owner_tenant_id IS NULL OR is_tenant_member(owner_tenant_id))
  );

-- UPDATE: ägare + tenant-admin (för org-planer)
CREATE POLICY "plans_update" ON plans FOR UPDATE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND has_tenant_role(owner_tenant_id, 'admin'::tenant_role_enum)
    )
    OR is_system_admin()
  )
  WITH CHECK (
    owner_user_id = (SELECT auth.uid())
    OR (
      visibility = 'tenant'::plan_visibility_enum
      AND has_tenant_role(owner_tenant_id, 'admin'::tenant_role_enum)
    )
    OR is_system_admin()
  );

-- DELETE: bara ägare + admin
CREATE POLICY "plans_delete" ON plans FOR DELETE TO authenticated
  USING (
    owner_user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

-- ═══════════════════════════════════════
-- PLAN_BLOCKS: via FK till plans
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "plan_blocks_select" ON plan_blocks;
DROP POLICY IF EXISTS "plan_blocks_manage" ON plan_blocks;

-- SELECT: kaskad via plans RLS (alla som kan se planen ser blocks)
CREATE POLICY "plan_blocks_select" ON plan_blocks FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM plans)
  );

-- INSERT: bara ägare + admin
CREATE POLICY "plan_blocks_insert" ON plan_blocks FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- UPDATE: bara ägare + admin
CREATE POLICY "plan_blocks_update" ON plan_blocks FOR UPDATE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- DELETE: bara ägare + admin
CREATE POLICY "plan_blocks_delete" ON plan_blocks FOR DELETE TO authenticated
  USING (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════
-- PLAN_VERSIONS: via FK till plans
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "plan_versions_select" ON plan_versions;
DROP POLICY IF EXISTS "plan_versions_insert" ON plan_versions;

CREATE POLICY "plan_versions_select" ON plan_versions FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM plans)
  );

CREATE POLICY "plan_versions_insert" ON plan_versions FOR INSERT TO authenticated
  WITH CHECK (
    plan_id IN (
      SELECT id FROM plans
      WHERE owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════
-- PLAN_VERSION_BLOCKS: via FK till plan_versions → plans
-- (SELECT-policy existerade med gammalt namn `users_can_select_version_blocks` — standardiserad till `plan_version_blocks_select`)
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "users_can_select_version_blocks" ON plan_version_blocks;
DROP POLICY IF EXISTS "plan_version_blocks_insert" ON plan_version_blocks;

CREATE POLICY "plan_version_blocks_select" ON plan_version_blocks FOR SELECT TO authenticated
  USING (
    plan_version_id IN (SELECT id FROM plan_versions)  -- Kaskad-RLS via plan_versions → plans
  );

CREATE POLICY "plan_version_blocks_insert" ON plan_version_blocks FOR INSERT TO authenticated
  WITH CHECK (
    plan_version_id IN (
      SELECT pv.id FROM plan_versions pv
      JOIN plans p ON p.id = pv.plan_id
      WHERE p.owner_user_id = (SELECT auth.uid()) OR is_system_admin()
    )
  );

-- ═══════════════════════════════════════
-- PLAN_SCHEDULES: synka med plans RLS
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "plan_schedules_access" ON plan_schedules;

-- SELECT: kaskad via plans RLS + egna schedules
CREATE POLICY "plan_schedules_select" ON plan_schedules FOR SELECT TO authenticated
  USING (
    plan_id IN (SELECT id FROM plans)
    OR created_by = (SELECT auth.uid())
  );

-- INSERT: bara om planen är synlig + skapare = current user
CREATE POLICY "plan_schedules_insert" ON plan_schedules FOR INSERT TO authenticated
  WITH CHECK (
    created_by = (SELECT auth.uid())
    AND plan_id IN (SELECT id FROM plans)
  );

-- UPDATE: bara skapare + admin
CREATE POLICY "plan_schedules_update" ON plan_schedules FOR UPDATE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR is_system_admin());

-- DELETE: bara skapare + admin
CREATE POLICY "plan_schedules_delete" ON plan_schedules FOR DELETE TO authenticated
  USING (created_by = (SELECT auth.uid()) OR is_system_admin());

-- ═══════════════════════════════════════
-- PLAN_NOTES_TENANT: strama åt
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "plan_notes_tenant_manage" ON plan_notes_tenant;

-- SELECT: tenant-medlem + planen synlig
CREATE POLICY "plan_notes_tenant_select" ON plan_notes_tenant FOR SELECT TO authenticated
  USING (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- INSERT: tenant-medlem + planen synlig
CREATE POLICY "plan_notes_tenant_insert" ON plan_notes_tenant FOR INSERT TO authenticated
  WITH CHECK (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- UPDATE: tenant-medlem + planen synlig
CREATE POLICY "plan_notes_tenant_update" ON plan_notes_tenant FOR UPDATE TO authenticated
  USING (
    tenant_id = ANY(get_user_tenant_ids())
    AND plan_id IN (SELECT id FROM plans)
  );

-- DELETE: tenant-admin + planen synlig
CREATE POLICY "plan_notes_tenant_delete" ON plan_notes_tenant FOR DELETE TO authenticated
  USING (
    has_tenant_role(tenant_id, 'admin'::tenant_role_enum)
    AND plan_id IN (SELECT id FROM plans)
  );

-- ═══════════════════════════════════════
-- RUNS: tenant-awareness + user-scoping
-- ═══════════════════════════════════════

DROP POLICY IF EXISTS "runs_manage" ON runs;

CREATE POLICY "runs_select" ON runs FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR is_system_admin()
  );

CREATE POLICY "runs_insert" ON runs FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND plan_version_id IN (SELECT id FROM plan_versions)  -- Kaskad: kan bara skapa run på synliga planer
  );

CREATE POLICY "runs_update" ON runs FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

#### 5.5 Scope-tabs aktivering (UI) ✅ KLAR

Implementerat i MS5:
1. `ScopeSelector`: Org-tab enabled när `currentTenant` finns (`disabled: !currentTenant`). Global alltid enabled. "Kommer snart"-badge visas bara på genuint disabled tabs (Org utan tenant).
2. `PlanListPanel`: `fetchPlans()` skickar `scope` query param via `onScopeChange` callback
3. `/api/plans/search`: `scope` parameter (`mine`/`org`/`global`) + bakåtkompatibel med `visibility`/`tenantId`
4. Org-tab: `scope=org` → `visibility = 'tenant'` (+ valfritt `tenantId`-filter)
5. Global-tab: `scope=global` → `visibility = 'public'`
6. Mina-tab: `scope=mine` → `owner_user_id = user.id` (oförändrat)

#### 5.6 API-ändringar

**`POST /api/play/[planId]/start`:**
- Sätt `tenant_id` på nya runs: `tenant_id: plan.owner_tenant_id`

**`POST /api/plans` (create plan):**
- Sätt `owner_tenant_id` till användarens aktiva tenant (från `getRequestTenantId()`)

**API-audit (endpoints som "bara fungerar" tack vare RLS):**
- `/api/plans/[planId]` (GET/PATCH/DELETE) — RLS filtrerar automatiskt
- `/api/plans/[planId]/blocks` — RLS via plan_blocks FK
- `/api/plans/[planId]/publish` — RLS via plans
- `/api/play/runs/active` — RLS via runs.user_id

#### 5.7 Produkttaggning (separat sub-milestone, kan skjutas)

```sql
CREATE TABLE plan_product_tags (
  plan_id uuid NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (plan_id, product_id)
);

ALTER TABLE plan_product_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_product_tags_select" ON plan_product_tags FOR SELECT TO authenticated
  USING (plan_id IN (SELECT id FROM plans));

CREATE POLICY "plan_product_tags_manage" ON plan_product_tags FOR ALL TO authenticated
  USING (is_system_admin());
```

**Definition of Done:**
- [x] **RLS-migration** skapad och körd: `20260305100000_tenant_rls_planner.sql`
- [x] ~~**Kritisk fix**: `plan_version_blocks` SELECT-policy saknas~~ — Existerade med gammalt namn `users_can_select_version_blocks`; standardiserad till `plan_version_blocks_select`
- [x] **plans**: tenant-visible SELECT + tenant-admin UPDATE + owner/admin DELETE
- [x] **plan_blocks/versions/version_blocks**: kaskad-RLS via FK till plans (per-operation policies)
- [x] **plan_schedules**: synkad med plans RLS (per-operation, borttagen inkonsistens från `plan_schedules_access`)
- [x] **plan_notes_tenant**: åtstramad — kräver att planen är synlig (`plan_id IN (SELECT id FROM plans)`)
- [x] **runs**: `tenant_id` sätts i start-API (`plan.owner_tenant_id`) + backfill via `plan_versions → plans.owner_tenant_id`
- [x] **runs**: per-operation policies (select/insert/update) istället för `FOR ALL` (`runs_manage` droppad)
- [x] **runs_insert**: kaskad-check via `plan_version_id IN (SELECT id FROM plan_versions)` — förhindrar run på osynlig plan
- [x] **Alla child-tabeller**: inga `FOR ALL`-policies — separata SELECT/INSERT/UPDATE/DELETE
- [x] **Scope-tabs**: Org + Global aktiverade i ScopeSelector + PlanListPanel
- [x] **Search API**: `scope` parameter (`mine`/`org`/`global`) med bakåtkompatibla `visibility`/`tenantId` params
- [x] **Client API**: `fetchPlans()` accepterar `scope` parameter
- [x] **PlanLibraryPage**: Scope-baserad re-fetch med `useTenant()` för tenant ID
- [x] **Regression**: PlanListPanel, Calendar, AddToPlanModal laddar utan errors
- [x] 0 TS-errors
- [ ] `plan_product_tags`-tabell skapad (skjuten till MS5.1)
- [x] **Cross-tenant isolation test**: 9 test-scenarios i `supabase/tests/test_tenant_rls_isolation.sql`
- [x] **Filter-reset**: PlanListPanel nollställer search/status/visibility-filter vid scope-byte (UX-fix)
- [x] **runs.tenant_id verifierad**: Använder `plan.owner_tenant_id` (INTE `currentTenantId`) — korrekt även när admin startar run på annan tenants plan

**Testplan:**

| # | Test | Förväntat resultat |
|---|------|--------------------|
| 1 | User A (Tenant 1) skapar plan | Plan synlig för User A |
| 2 | User B (Tenant 2) GET plan A | 404 / tom array |
| 3 | User B POST block till plan A | Error (RLS block) |
| 4 | User B start run på plan A | Error (plan ej synlig) |
| 5 | User C (Tenant 1) ser plan A (visibility=tenant) | ✅ Synlig via Org-scope |
| 6 | User C (Tenant 1) ser plan A (visibility=private) | ❌ Ej synlig |
| 7 | Admin ser allt | ✅ via `is_system_admin()` |
| 8 | Active runs endpoint returnerar bara egna runs | ✅ |
| 9 | plan_version_blocks SELECT fungerar | ✅ (kritisk regression från batch1) |

**Smoke Path 9: Tenant Isolation**
- [ ] Logga in som User A (Tenant 1) → Skapa plan med visibility=tenant
- [ ] Scope-tab "Org" → Planen syns
- [ ] Logga in som User B (Tenant 2) → Scope-tab "Org" → Planen syns INTE
- [ ] Logga in som User C (Tenant 1, member) → Planen syns i Org-scope
- [ ] Admin → Ser allt oavsett tenant

**Noteringar:**
- Migration: `20260305100000_tenant_rls_planner.sql` — wrapped i BEGIN/COMMIT för atomicitet
- **Audit-korrigering**: `plan_version_blocks` SELECT-policy var INTE saknad — existerade som `users_can_select_version_blocks` (gammalt namn). Standardiserad till `plan_version_blocks_select` i MS5.
- FK-kolumn är `plan_version_id` INTE `version_id` (implementation plan SQL var felaktig, korrigerad i både migration och dokumentation)
- Alla policies använder `public.tenant_role_enum` cast för `has_tenant_role()`-anrop
- `runs.tenant_id` backfill via `plan_versions → plans.owner_tenant_id`
- `ScopeSelector`: Org-tab enabled när användaren har tenant (`disabled: !currentTenant`). Global alltid enabled. "Kommer snart"-badge visas bara på genuint disabled tabs.
- `PlanListPanel`: `onScopeChange` callback prop + `handleScopeChange` wrapped i `useCallback`; **nollställer** search, statusFilter och visibilityFilter vid scope-byte
- `PlanLibraryPage`: Scope-baserad re-fetch med `useTenant()` för `currentTenant.id`; `useEffect` re-triggers på scope change
- Search API (`/api/plans/search`): `scope` parameter (`mine`/`org`/`global`) — bakåtkompatibel med gamla `visibility`/`tenantId` params
- Start route (`/api/play/[planId]/start`): Sätter `tenant_id: plan.owner_tenant_id ?? null` på nya runs (**verifierat: använder planens tenant, INTE användarens**)
- 0 TS-errors verifierat med `npx tsc --noEmit`
- **Cross-tenant isolation test**: `supabase/tests/test_tenant_rls_isolation.sql` — 9 scenarier, 2 users, 2 tenants, kör i SQL Editor efter migration

---

### Milstolpe 6 (P2, post-beta): Session-block (Deltagarlek)

> **Design:** Se `planner-architecture.md` §11 för datamodell och runtime-flöde.

**DB-ändringar:**
```sql
ALTER TYPE plan_block_type_enum ADD VALUE IF NOT EXISTS 'session_game';

-- Lätt kopplingsmodell: run_sessions (Option C — rekommenderat)
CREATE TABLE run_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_index integer NOT NULL,           -- index i step-listan
  session_id uuid REFERENCES participant_sessions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'active', 'completed', 'abandoned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_index)
);

ALTER TABLE run_sessions ENABLE ROW LEVEL SECURITY;
```

> **Beslut (Q10):** Option C (`run_sessions`-tabell) valdes framför (A) `run_steps`-tabell eller (B) `runs.metadata`.
> Motivering: `run_steps` existerar inte som tabell — att skapa den bara för sessions är overdimensionerat.
> `runs.metadata` ger dålig querybarhet. `run_sessions` är minimal, querybar, och kan utökas.

**Definition of Done:**
- [x] `session_game` kan läggas till i plan (GamePicker med play_mode-filter) ✅ KLAR (2026-03-04) — AddGameButton + StepBuildPlan + GamePicker `defaultPlayMode`
- [ ] `plan_blocks.metadata.session` = `{ v:1, gameId, playMode, autoCreate }`
- [x] `run_sessions`-tabell skapad med RLS (kaskad via runs) ✅ KLAR (2026-03-04) — migration `20260305200000_run_sessions.sql`
- [x] `session_game` tillagd i `plan_block_type_enum` ✅ KLAR (2026-03-04)
- [x] Snapshot: `requiresSession` + `sessionSpec` på GeneratedStep ✅ KLAR (2026-03-04)
- [x] Starta run med session-block → auto-upsert `run_sessions`-rad (session_id=null) ✅ KLAR (2026-03-04) — idempotent via UNIQUE constraint
- [x] `playMode` propageras genom snapshot pipeline (draft: games.play_mode, publish: game_snapshot.playMode) ✅ KLAR (2026-03-04)
- [x] i18n: `blockTypes.session_game` i sv/en/no ✅ KLAR (2026-03-04)
- [x] Block-UI: `session_game` i labels, ikoner, BlockRow, TouchBlockRow ✅ KLAR (2026-03-04)
- [x] PlayPlanPage: när lekledaren når session-steg → auto-skapa participant_session, sätt session_id ✅ KLAR (2026-03-04) — `RunSessionCockpit` med auto-create + `POST /api/play/runs/:runId/sessions`
- [x] Mini-SessionCockpit inline i PlayPlanPage ✅ KLAR (2026-03-04) — `RunSessionCockpit` component (kod, status, deltagare, "Öppna sessionsvyn")
- [x] Deltagare ansluter via befintligt session-system ✅ KLAR (2026-03-04) — session skapas via `ParticipantSessionService.createSession()`, sessionskod visas
- [ ] Lekledaren kan avsluta session och gå vidare (force-end eller auto-complete)
- [x] Refresh/resume: befintlig session återanvänds via `run_sessions.session_id` (ingen dublett) ✅ KLAR (2026-03-04) — `fetchRunSession()` + upsert UNIQUE constraint
- [ ] Aktiva plan-runs med session-steg syns i `/app/play/sessions`

**Noteringar:**
- Migration: `step_index` (inte `block_position`) — matchar `runs.current_step`. Status: `created/active/completed/abandoned` (inte `pending`).
- Snapshot: `requiresSession` sätts om `blockType === 'session_game'` ELLER `blockType === 'game' && playMode === 'participants'` — hanterar både explicit session_game-block och retroaktiva deltagarlekar.
- Start-route: `upsertRunSession()` helper med `any`-cast tills `types/supabase.ts` regenereras med `run_sessions`-tabellen. Graceful fallback om tabellen inte finns.
- Publish-route: `block_type` castas fortfarande till smal typ (`'game' | 'pause' | 'preparation' | 'custom'`) pga generated types. Uppdateras automatiskt vid supabase gen types.

**MS6 UI (2026-03-04):**
- `AddGameButton`: 6:e dropdown-item "Deltagarlek" med `UserGroupIcon`, widened type union
- `StepBuildPlan`: `gamePickerBlockType` state spårar om GamePicker öppnades för `game` eller `session_game`; `handleGameSelected` använder dynamisk `blockType`
- `GamePicker`: ny prop `defaultPlayMode?: PlayMode` — pre-sätter playMode-filtret vid öppning
- `RunSessionCockpit` (`features/play/components/RunSessionCockpit.tsx`): lättviktigt inline-cockpit för session_game-steg (kod, status, deltagare, "Öppna sessionsvyn"-länk)
- `POST /api/play/runs/:runId/sessions` — skapar `participant_session` + upsert `run_sessions`; GET returnerar befintlig session
- `PlayPlanPage`: renderar `RunSessionCockpit` för steg med `requiresSession`, `sessionState` styr navigation guard
- `NavigationControls`: `nextDisabled` + `nextDisabledReason` props; "Nästa" blockeras om session ej startad
- i18n: `play.playPlanPage.runSession.*` nycklar i sv/en/no, `planner.addBlock.sessionGame` i sv/en/no

**MS6 Hardening (2026-03-04):**
- Migration `20260305300000_run_sessions_unique_session_id.sql`: uppgraderar `idx_run_sessions_session_id` från INDEX → UNIQUE INDEX. Förhindrar att samma `participant_session` kopplas till flera run_steps (edge case vid cross-run reuse).
- 409 Conflict guard i `POST /api/play/runs/:runId/sessions`: vägrar skriva över `session_id` om en annan session redan är länkad.

**MS7.1 Active Sessions Dashboard (2026-03-04):**
- `DashboardRunRow` + `DashboardSessionInfo` typer i `features/play/types.ts`
- `GET /api/play/runs/dashboard` — joins runs → run_sessions → participant_sessions + plan_versions. Scope: `active` (default) / `all`. Stale-filter på heartbeat.
- `fetchRunsDashboard(scope)` klientfunktion i `features/play/api.ts`
- `RunsDashboard` komponent i `features/play/components/RunsDashboard.tsx` — scope-toggle, row-lista med plan-namn, steg-läge, run/session-status badges, participant count, resume/open-session knappar
- `/app/play/sessions` — top-level tabs "Sessioner" / "Planruns" i `HostSessionsClient`. Planruns-tab visar `RunsDashboard`.
- i18n: `play.runsDashboard.*` + `play.hostSessions.tabs.*` nycklar i sv/en/no

**MS7.2 End Session Action (2026-03-05):**
- `POST /api/play/runs/:runId/sessions/end` — tar `{ stepIndex }`, avslutar `participant_session` (status → ended, ended_at), markerar `run_sessions.status` → `ended` (ej `completed` — semantisk distinktion: `ended` = force-end från dashboard, `completed` = host gick vidare normalt). Loggar gamification-event, broadcastar realtime `state_change`. Guards: 409 om redan ended/completed/abandoned, 404 om run/run_session saknas. Idempotent (dubbelklick → 409).
- Migration `20260305400000_run_sessions_add_ended_status.sql` — lägger till `ended` i CHECK constraint.
- `endRunSession(runId, stepIndex)` klientfunktion i `features/play/api.ts`
- Dashboard: destruktiv "Avsluta"-knapp med `AlertDialog` bekräftelse i `RunsDashboard.tsx`. Disabled när session_id är null, eller run_session redan ended/completed/abandoned. Refetch efter action.
- Plan-namn robust: dashboard-query joinad till `plan_versions(plan_id, name, plans(name))`. Fallback-kedja: plans.name (SSoT) → plan_versions.name → metadata → 'Okänd plan'.
- RLS ownership cascade: endpoint verifierar run ownership via `runs` RLS-query FÖRE all mutation.
- 409 UX: dashboard `handleEndSession` fångar CONFLICT → visar info-toast "Sessionen var redan avslutad" + refetch. Multi-tab safe.
- `RunSessionStatus` type + `isTerminalRunSessionStatus()` helper i `features/play/types.ts` — gemensam SSoT för API guard + UI disable.
- i18n: `play.runsDashboard.endConfirm.*` + `actions.ending` + `sessionStatus.ended` + `endConfirm.alreadyEnded` i sv/en/no

---

### MS7 — Active Sessions Dashboard

| # | Definition of Done | Status |
|---|---|---|
| 7.1 | Read-only dashboard med scope toggle, resume länkar | ✅ KLAR (2026-03-04) |
| 7.2 | Actions: Resume, Open Session, End session med confirm dialog | ✅ KLAR (2026-03-05) |
| 7.3 | Hardening: 409 UX, isTerminalRunSessionStatus SSoT, multi-tab safety, ship-check | ✅ KLAR (2026-03-04) |

**Noteringar:**

**MS7.3 Hardening & Ship-check (2026-03-04):**
- 409 UX: `handleEndSession` fångar CONFLICT → info-toast `alreadyEnded` + refetch. Multi-tab safe.
- `RunSessionStatus` type + `isTerminalRunSessionStatus()` helper som gemensam SSoT för API guard + UI.
- `ended` status tillagd i DB CHECK via migration `20260305400000_run_sessions_add_ended_status.sql`.
- Plan-namn fallback: `plans.name` (SSoT) → `plan_versions.name` → metadata → ’Okänd plan’.
- Dashboard: "Avsluta"-knappen döljs när status är terminal (`{canEnd && ...}` conditional render, inte bara disabled).
- Migration order verifierad: `200000` (create) → `300000` (UNIQUE) → `400000` (ended status).

### MS7.3 — Ship-check (DoD)

| # | Definition of Done | Status |
|---|---|---|
| 7.3.1 | Smoke-test: dashboard laddar korrekt med 0 runs → visar empty state | ✅ |
| 7.3.2 | Smoke-test: dashboard visar run_sessions med plan-namn, session-kod, participant count | ✅ |
| 7.3.3 | Action-test: "Avsluta" → confirm-dialog → session.status=ended, run_session.status=ended, badge uppdateras | ✅ |
| 7.3.4 | Idempotency-test: dubbelklick på "Avsluta" → 409 CONFLICT → info-toast + refetch | ✅ |
| 7.3.5 | Edge-test: session_id IS NULL → "Avsluta"-knapp ej synlig (`canEnd` = false) | ✅ |
| 7.3.6 | Edge-test: stale run (heartbeat > 24h) → stale badge visas | ✅ |
| 7.3.7 | Scope-toggle: "Aktiva" visar bara in_progress + non-stale; "Alla" visar allt | ✅ |
| 7.3.8 | Multi-tab sanity: avsluta i tab A, refresh tab B → ser `ended`, "Avsluta" disabled, 409 hanteras | ✅ |

---

### MS8 — Director Mode Track 1 (UI Spine)

| # | Definition of Done | Status |
|---|---|---|
| 8.0 | RunSessionCockpit visar QR-kod, join-länk, session code med copy-knappar | ✅ KLAR (2026-03-05) |
| 8.1 | Polling via `GET /api/play/sessions/[id]/state` (5s) → live participant_count + status badge | ✅ KLAR (2026-03-05) |
| 8.2 | "Öppna Director Mode" länk till `/app/play/sessions/{id}` (full SessionCockpit) | ✅ KLAR (2026-03-05) |
| 8.3 | Terminal state guardrails: ended/archived/cancelled → badge, inga host-actions, polling stoppar | ✅ KLAR (2026-03-05) |
| 8.4 | Polling hardening: visibility/online guards, exponential backoff, catch-up on tab focus | ✅ KLAR (2026-03-05) |

**Noteringar:**

**MS8.0 Lobby Panel (2026-03-05):**
- `RunSessionCockpit` omskriven: QR-kod via `qrcode` npm-paket (redan installerat), join-länk med copy, session code klickbar och kopierar.
- QR visas i Dialog-modal (sm:max-w-xs) med kod + "Kopiera länk"-knapp.
- Join-URL: `${origin}/participants/join?code=${sessionCode}` (samma som SessionCockpit).

**MS8.1 Polling (2026-03-05):**
- `fetchSessionState()` tillagd i `features/play/api.ts` → `GET /api/play/sessions/[id]/state` (endpoint existerade redan).
- Polling-intervall sänkt till 30s fallback (MS9 realtime är nu primär).
- Participant count och status uppdateras live utan full page refresh.

**MS8.2 Director Mode Link (2026-03-05):**
- Bugg fixad: länk gick till `/app/play/session/` (utan 's', existerade ej) → nu `/app/play/sessions/{id}`.
- Länken visas enbart för live sessions (lobby/active/paused/locked).
- Öppnas i ny flik (`target="_blank"`) för att inte avbryta PlayPlanPage.

**MS8.3 Terminal Guardrails (2026-03-05):**
- Terminal statuses: `ended`, `archived`, `cancelled` — join-länk/QR döljs, Director Mode-länk döljs.
- Status badge stöder alla `participant_session_status` enum-värden med distinkta färger.
- Polling stoppas automatiskt (`isTerminal` check i useEffect dependency).
- `onSessionStateChange('completed')` rapporteras till PlayPlanPage → navigation unblocked.
- Enum verifierad: `draft, lobby, active, paused, locked, ended, archived, cancelled` (8 värden). TERMINAL=3, LIVE=4, DRAFT=1.

**MS8.4 Polling Hardening (2026-03-05):**
- Visibility guard: `document.visibilityState === 'hidden'` → skip poll tick (samma mönster som ParticipantPlayView).
- Online guard: `!navigator.onLine` → skip poll tick.
- Exponential backoff: 5s → 10s → 20s max vid konsekutiva failures (`consecutiveFailures` ref).
- "Anslutning instabil" badge visas efter 3 konsekutiva failures i rad.
- Visibility catch-up: `visibilitychange` listener → omedelbar resync vid tab focus.
- Backoff reset: nollställs vid lyckad fetch eller vid synlig tab-byte.

### MS9 — Realtime Presence (participant_count live)

| # | Definition of Done | Status |
|---|---|---|
| 9.0 | Broadcast-event `participants_changed` implementerat på join (server) | ✅ KLAR (2026-03-05) |
| 9.1 | Host subscribar via Supabase Realtime och uppdaterar participant_count utan vänta på polling | ✅ KLAR (2026-03-05) |
| 9.2 | Unsubscribe/cleanup vid sessionId-byte + unmount + terminal status | ✅ KLAR (2026-03-05) |
| 9.3 | Debounce (400ms) på realtime-triggar för att undvika event-storm | ✅ KLAR (2026-03-05) |
| 9.4 | Polling sänkt till 30s fallback (realtime är primär) | ✅ KLAR (2026-03-05) |
| 9.5 | TS/ESLint clean | ✅ KLAR (2026-03-05) |

**Noteringar:**

**MS9.0 Server-side broadcast (2026-03-05):**
- `broadcastPlayEvent()` anrop tillagt i `POST /api/participants/sessions/join` efter participant insert + activity log.
- Event: `{ type: 'participants_changed', payload: { sessionId } }`.
- Best-effort (void + fire-and-forget) — join-svar returneras oavsett broadcast-resultat.
- Atomisk `broadcast_seq` via befintlig `increment_broadcast_seq` RPC.

**MS9.1 Client-side subscription (2026-03-05):**
- `RunSessionCockpit` subscribar på `play:${sessionId}` kanal via `supabase.channel()` + `createBrowserClient()`.
- Lyssnar på `play_event` broadcast events, filtrerar på `type === 'participants_changed'`.
- På event: debounced `fetchSessionState(sid)` (400ms) → uppdaterar participant_count + status.
- Kanal config: `{ broadcast: { self: false } }` (hosten triggar inte själv).
- Cleanup: `supabase.removeChannel(channel)` vid unmount/dep-ändring.

**MS9.3 Debounce (2026-03-05):**
- `realtimeDebounceRef` (400ms) coalescar snabba joins till en enda `fetchSessionState` call.
- Skippas när tab är hidden (`document.visibilityState === 'hidden'`).
- Rensas i cleanup för att undvika state-writes efter unmount.

**MS9.4 Polling fallback (2026-03-05):**
- `POLL_INTERVAL_MS` sänkt från 5s → 30s. Backoff: 30s → 60s → 120s max.
- Polling fungerar som safety net vid realtimeavbrott.
- Befintlig `connectionDegraded` badge gäller även vid realtime-disconnect.

### MS9.2 — Live session status via broadcast

| # | Definition of Done | Status |
|---|---|---|
| 9.2.0 | Server: broadcast `state_change` på varje status-write (efter DB) | ✅ KLAR (2026-03-04) |
| 9.2.1 | Server: legacy control-route (`PATCH /api/participants/sessions/[sessionId]/control`) broadcastar på `play:` kanalen (utöver befintlig `session:` kanal) | ✅ KLAR (2026-03-04) |
| 9.2.2 | Server: idempotent guard (ingen broadcast om ingen faktisk ändring) | ✅ KLAR (2026-03-04) — control-route returnerar 400 vid samma status |
| 9.2.3 | Client: RunSessionCockpit lyssnar på `state_change` + optimistisk status-update + debounced refetch | ✅ KLAR (2026-03-04) |
| 9.2.4 | Terminal: cockpit slutar poll:a och unsubbar på `ended\|archived\|cancelled` | ✅ KLAR (bef. MS9.0) |
| 9.2.5 | TS/ESLint: 0 errors | ✅ KLAR (2026-03-04) |

**Noteringar:**

**MS9.2.0 Server-side broadcasts — fullständig inventering (2026-03-04):**
- `PATCH /api/play/sessions/[id]`: publicerar `state_change` med `{ status }` efter varje statusändring (publish/unpublish/start/resume/pause/end/lock/unlock) — **redan implementerat sedan innan MS9**.
- `POST /api/play/runs/[runId]/sessions/end`: publicerar `state_change` med `{ status: 'ended' }` — **redan implementerat**.
- `PATCH /api/participants/sessions/[sessionId]/control`: **ny** `broadcastPlayEvent` tillagd (fire-and-forget) på `play:${sessionId}` kanalen.
- `ParticipantSessionService.updateSessionStatus()`: ej använd av någon route — ingen broadcast behövs.

**MS9.2.1 Legacy control-route dual broadcast (2026-03-04):**
- Befintlig broadcast på `session:${sessionId}` behållen (bakgrunds-kompatibilitet för participant UI).
- Ny `broadcastPlayEvent()` tillagd efter befintlig broadcast — sänder `{ type: 'state_change', payload: { status: newStatus } }` på `play:${sessionId}` kanalen.
- Fire-and-forget (`void`) för att inte blockera response.

**MS9.2.3 Client optimistic update (2026-03-04):**
- Subscription handler expanderad: lyssnar nu på både `participants_changed` OCH `state_change`.
- Vid `state_change`: optimistisk `setLiveStatus(event.payload.status)` omedelbart (instant badge-update).
- Debounced `fetchSessionState()` (400ms) körs ändå för kanonisk state (SSoT via API).
- Ger "wow"-effekt: status-badge uppdateras inom ~100ms, participant_count inom ~500ms.

### MS10 — Director Realtime State (timer / board / events)

| # | Definition of Done | Status |
|---|---|---|
| 10.0 | Server: timer/board/step/phase writes broadcast via `broadcastPlayEvent` (alla 7 actions) | ✅ KLAR (redan sedan state endpoint) |
| 10.1 | Server: `broadcast_seq` (atomisk monoton) bifogas alla broadcasts | ✅ KLAR (redan via `increment_broadcast_seq` RPC) |
| 10.2 | Client: subscription hanterar `timer_update` + `board_update` med seq-guard (optimistisk, ingen REST) | ✅ KLAR (2026-03-04) |
| 10.3 | Client: `participants_changed` + `state_change` trigger debounced refetch (oförändrat) | ✅ KLAR (bef. MS9) |
| 10.4 | Client: seq-guard ignorerar out-of-order events (`seq <= lastSeenSeq`) | ✅ KLAR (2026-03-04) |
| 10.5 | Client: gap-detection (`seq` hoppar >5) → rate-limited refetch (5s cooldown) | ✅ KLAR (2026-03-04) |
| 10.6 | Client: on SUBSCRIBED → omedelbar `fetchSessionState()` för initial sync | ✅ KLAR (2026-03-04) |
| 10.7 | Client: timer countdown (1s tick) + board message visas i RunSessionCockpit | ✅ KLAR (2026-03-04) |
| 10.8 | `SessionStateData` typat med `TimerState \| null` + `BoardState \| null` | ✅ KLAR (2026-03-04) |
| 10.9 | Terminal: unsub/poll-stop/freeze verifierat (oförändrat) | ✅ KLAR (bef. MS9) |
| 10.10 | TS/ESLint: 0 errors | ✅ KLAR (2026-03-04) |

**Noteringar:**

**MS10 Arkitekturinsikt (2026-03-04):**
- **Ingen ny DB-migration behövdes.** `broadcast_seq` (tillagd i MS9) fyller exakt samma roll som GPT-specens `state_rev`. Atomisk ökning via `increment_broadcast_seq` RPC, bifogas alla broadcasts som `seq`.
- **Inga nya event-typer behövdes.** PATCH state-endpointen sender redan `timer_update` och `board_update` via `broadcastPlayEvent`. Klienten behövde bara lyssna på dem.
- **Inga serverändringar behövdes.** All infrastruktur (7 actions, broadcasts, seq) var redan på plats.

**MS10.2 Subscription expansion (2026-03-04):**
- Subscription handler omskriven från event-filter till `switch` på `event.type`.
- `timer_update`: optimistisk `setTimerState()` direkt från payload. Ingen REST-refetch (högfrekvent).
- `board_update`: optimistisk `setBoardState()` med merge av `overrides`. Ingen REST-refetch.
- `participants_changed` + `state_change`: behåller debounced `fetchSessionState()` (SSoT).

**MS10.4 Seq-guard (2026-03-04):**
- `lastSeenSeq` ref spårar högsta mottagna `seq`.
- Events med `seq <= lastSeenSeq` ignoreras (out-of-order / duplicate).
- Skyddare mot multi-tab state rollback och nätverksjitter.

**MS10.5 Gap detection (2026-03-04):**
- Om `seq` hoppar mer än `SEQ_GAP_THRESHOLD` (5) från senast sedd: rate-limited refetch (5s cooldown).
- Förhindrar REST-storm vid reconnect (max 1 refetch per 5s).

**MS10.6 On SUBSCRIBED sync (2026-03-04):**
- `.subscribe((status) => ...)` callback: vid `SUBSCRIBED` körs omedelbar `fetchSessionState()` en gång.
- Fångar allt som hände mellan disconnect och reconnect.

**MS10.7 Timer/Board UI (2026-03-04):**
- Timer: countdown med 1s `setInterval`, `formatTime()`, statusindikator (running/paused/finished) med semantiska färger enligt design tokens.
- Board: visar `boardState.message` som trunkerad italic text.
- Bara synligt för live sessions (`isLive` guard).

---

### MS11 — Command Pipeline ✅ KLAR (2026-03-05)

Centraliserad command-lager med idempotency, audit trail, state-machine guards, och deterministic state transitions.

- [x] **DB migration** `session_commands` — tabell med `(session_id, client_id, client_seq)` unique index för idempotency
- [x] **`applySessionCommand()`** — server helper: validate → idempotency check → insert → apply mutation → broadcast → mark applied
- [x] **`POST /api/play/sessions/[id]/command`** — unified command route med auth + host/admin guard
- [x] **`sendSessionCommand()`** — client API med auto client_id (per tab) + monotonic client_seq
- [x] **SessionCockpit wiring** — SessionCockpit (via `useSessionState`) routes 9 primära host-actions genom pipeline (start/publish/unpublish/pause/resume/end + goToStep/goToPhase). Ytterligare commands (timer_start/pause/resume/reset, set_board_message, lock/unlock) finns i pipeline-API:t och kopplas via SessionCockpit/state layer.
- [x] **Scope guard** — `RunSessionCockpit` använder **endast** read endpoints + realtime; inga anrop till `sendSessionCommand()`. Konsekvent med Q11 (Director-light).
- [x] **State-machine guards** — status transitions valideras server-side (t.ex. kan inte `pause` en `draft` session)
- [x] **Build clean** — 0 TS-errors, 0 ESLint-errors. Supabase generated types uppdaterade med `session_commands`.

**Noteringar:**
- `session_commands` tabell inkluderad i genererade Supabase-typer (`types/supabase.ts`). Fullt typad — inga `any`-workarounds.
- Legacy endpoints (`PATCH /sessions/[id]`, `PATCH /sessions/[id]/state`) kvar för bakåtkompatibilitet (`HostSessionWithPlay`, `client.tsx`). Ny canonical path: `POST /sessions/[id]/command`.
- Command types: publish, unpublish, start, pause, resume, end, lock, unlock, set_step, set_phase, timer_start, timer_pause, timer_resume, timer_reset, set_board_message.
- `updatePlaySessionState()` i `session-api.ts` (HostPlayMode) fortfarande på legacy endpoints — migrera i framtida pass.
- **Broadcast-modell:** Commands persisteras för audit trail; UI drivs fortfarande av befintliga state-broadcasts (`state_change`, `timer_update`, `board_update`). Inget separat "command_applied"-event — det är by design för att undvika dubbla event-strömmar.

---

## 8. Beslut (alla låsta)

Samtliga open questions har besvarats och besluten är låsta:

| # | Fråga | Beslut | Status |
|---|-------|--------|--------|
| Q1 | Behåll CreatePlanDialog? | ✅ **Ja.** Namn (required) + Beskrivning (optional). Ingen visibility i /app — alltid privat. | LÅST |
| Q2 | Auto-publicering vid "Spara & Utför"? | ✅ **Ja.** Transparent för användaren. Versionshistorik kvar under huven. | LÅST |
| Q3 | Org/Global-tabs i beta? | ✅ **Visa tabs, disabled + "Kommer snart (Beta)".** Ingen backend/RLS-ändring i beta. | LÅST |
| Q4 | Kalender-scope? | ✅ **Create + Delete i beta.** Edit-dialog kan vänta till P1. | LÅST |
| Q5 | Session-block i beta? | ✅ **Nej, post-beta (P2).** I beta: blockera tydligt i UI om block kräver session. | LÅST |
| Q6 | Gamla wizard-steg — radera eller arkivera? | ✅ **Raderade.** Ursprungligt beslut var "arkivera" men filerna var 100% död kod utan aktiva imports, så de raderades helt. Sista restfilen `StepKor.tsx` togs bort 2026-03-21. All relevant logik finns i StepBuildPlan + StepSaveAndRun. | LÅST (uppdaterat) |
| Q7 | `lib/planner/locales.json` — ta bort? | ✅ **Raderade.** Både `locales.json` och `i18n.ts` — 100% död kod (noll runtime-imports). Alla nycklar redan i `messages/*.json`. | LÅST (uppdaterat) |
| Q8 | PlannerTabs — behåll kalender-tab? | ✅ **Ja. "Planer \| Kalender" är en naturlig indelning.** | LÅST |
| Q9 | RLS: `FOR ALL` eller per-operation? | ✅ **Per-operation (SELECT/INSERT/UPDATE/DELETE).** `FOR ALL` riskerar att en SELECT-korrekt policy blir för bred för INSERT. Alla child-tabeller har separata policies. | LÅST |
| Q10 | Session-block persistens: run_steps, metadata, eller run_sessions? | ✅ **Option C: `run_sessions`-tabell.** Minimal, querybar, utökningsbar. `run_steps` existerar inte — att skapa den bara för sessions är overdimensionerat. `runs.metadata` ger dålig querybarhet. | LÅST |
| Q11 | RunSessionCockpit: Director-light eller Full control surface? | ✅ **Option A: Director-light.** Monitor only (status, participant count, timer countdown, board message) + länk till Director Mode. SessionCockpit (`/app/play/sessions/[id]`) är enda kontroll-yta för timer/board/step/participant-actions. | LÅST |

---

## 9. Förbättringsförslag utöver specen

Dessa kom upp under auditen. Inte i scope för beta men värda att notera:

| Förslag | Beskrivning | Fas |
|---------|-------------|-----|
| **Planmallar** | Spara en plan som mall, återanvänd med ett klick | P2 |
| **Duplicera plan** | `/api/plans/[planId]/copy` finns redan — exponera i UI | P1 (enkel) |
| **Auto-duration** | Summera block-tider automatiskt, visa i header | P0 (finns redan delvis) |
| **Favoriter** | Markera planer som favoriter, snabbåtkomst | P2 |
| **Offline-stöd** | Service worker + localStorage för att bygga planer offline | P2+ |
| **Plan-delning via länk** | `/app/planner/[planId]` existerar redan — behöver UX-polish | P1 |
| **Statistik & insikter** | `lib/planner/analytics.ts` har stubs — koppla till backend | P2 |
| **Återuppta körning ("Fortsätt")** | 1-tap resume av senaste pågående run — se §9.1 nedan | ✅ MS4.5 KLAR |
| **PlanSnapshot Pipeline** | Ren funktion som producerar normaliserat "playable plan"-objekt. Eliminerar duplicerad blocks→steps-logik i start/preview/active-runs. Se §9.2 nedan | P1 (efter MS5) |

### 9.1 Återuppta körning — "Fortsätt där vi var" (P0.5)

> Liten effort, stor UX-impact. Bäst placerad efter Milstolpe 1 (wizard klar) men före Milstolpe 3 (kalender).

#### Probleminsikt

Lekledare kör ofta i **avbrott**: paus, lunch, nästa dag. När de måste "starta om" körs Planner som arbete. Med "Fortsätt" blir det en **assist**.

#### UX

**1) Planlistan (`/app/planner/plans`)**

För varje plan med pågående körning:
- Badge: **Pågår** (+ "senast igår 19:20" om äldre)
- Primär knapp: **Fortsätt**
- Sekundär: **Starta om**

Exempel:
```
Testplanen · 50 min · Pågår
[Fortsätt]  [Starta om]  [✏️ Editera]
```

**2) Kalenderns ScheduleCard**

Om schemat är idag och en run finns:
- `[Fortsätt]` istället för `[Starta körning]`

#### Minimal implementation

**Datakälla:**
- `runs`-tabellen: hitta senaste run för `plan_id` med `status = 'active'` (eller motsvarande)
- Fallback: PlayPlanPage sparar redan progress i `localStorage` → soft-resume utan DB
- DB-approach rekommenderas (multi-device)

**UI-logik:**
1. I planlistan: batch-fetch aktiva runs för visade planIds → mappa `planId → runId`
2. "Fortsätt" navigerar till `/app/play/plan/{planId}?runId={runId}` (eller låt PlayPlanPage hitta senaste run)
3. "Starta om" skapar ny run, ignorerar den gamla

**Edge cases:**
| Case | Beteende |
|------|----------|
| Plan ändrad sedan run startade | Visa varning: "Planen har ändrats — körningen fortsätter på tidigare version" |
| Run = completed | Ingen "Fortsätt"-knapp |
| Run finns men gammal | "Fortsätt" + liten text med senaste tidsstämpel |

#### Acceptance criteria
- [ ] Planlistan visar "Pågår"-badge om plan har aktiv run
- [ ] "Fortsätt"-knapp navigerar till pågående run
- [ ] "Starta om"-knapp skapar ny run
- [ ] ScheduleCard visar "Fortsätt" om körning pågår idag
- [ ] Gammal run visar timestamp ("senast igår 19:20")
- [ ] Plan ändrad sedan run → varning visas

#### Smoke Path 7: Återuppta körning
- [ ] Skapa plan → Starta körning → Navigera bort
- [ ] Gå till planlistan → Planen visar "Pågår"-badge
- [ ] Klicka "Fortsätt" → Landar på rätt steg i körningen
- [ ] Klicka "Starta om" → Ny körning från steg 1
- [ ] Ändra planen → Gå tillbaka → Varning visas

---

### 9.2 PlanSnapshot Pipeline — Arkitekturförenkling (P1)

> Identifierad under GPT-granskning av MS5-blueprinten. Kan minska Planner-kodbasen med uppskattningsvis ~30–40% genom att eliminera duplicerad "blocks → steps → stats"-logik.

#### Probleminsikt

Samma logik — "hur ser en plan ut just nu? vilka blocks? vilka steps?" — dupliceras idag i:
- `/api/play/[planId]/start` (genererar steps)
- `StepSaveAndRun` / preview (renderar blocks)
- `/api/play/runs/active` (läser totalSteps från metadata)
- kalender-cards (visar progress)
- plan-lista (visar blockCount / totalTime)

#### Lösning

**Ny fil:** `lib/planner/server/snapshot/getPlanSnapshot.ts` (server-only — placerad i `server/` för att undvika accidental client import)

**Input:** `planId`, `prefer: 'published' | 'draft' | 'auto'`  
**Output:** `PlanSnapshot` — normaliserat objekt:

```typescript
interface PlanSnapshot {
  plan: {
    id: string
    name: string
    description: string | null
    status: PlanStatus
    visibility: PlanVisibility
    ownerTenantId: string | null
  }
  source: 'draft_blocks' | 'published_version'
  blocks: NormalizedBlock[]           // gemensamt interface oavsett källa
  steps: GeneratedStep[]              // generateStepsFromBlocks(blocks)
  stats: {
    totalSteps: number
    totalTimeMinutes: number
    blockCount: number
  }
  version: {
    id: string
    versionNumber: number
  } | null
}
```

> **Kontrakt:** UI, API och tester använder samma `PlanSnapshot`-typ. Typdefinitionen exporteras från `lib/planner/server/snapshot/types.ts`.

#### Refaktor-steg (inkrementell, minimal risk)

| Steg | Ändring | Effekt |
|------|---------|--------|
| A | Skapa `getPlanSnapshot()` som enda SSoT | Centraliserad logik |
| B | Start-route → `getPlanSnapshot(planId, 'auto')` | Kortar ner ~60 rader till ~10 |
| C | StepSaveAndRun preview → `getPlanSnapshot(planId, 'draft')` | Konsekvent preview |
| D | Active-runs fallback → `snapshot.stats.totalSteps` | Eliminerar `meta?.steps`-sprawl |

#### Bonus: Snapshot cache

När allt går via snapshot kan du lägga per-`plan_version_id` cache:
- Cache invalidation vid publish
- Start/resume/preview blir nästan gratis
- Skalbart för planer med 100+ blocks

#### Acceptance criteria
- [x] `getPlanSnapshot()` skapad som ren funktion i `lib/planner/server/snapshot/` ✅ KLAR (2026-03-04)
- [x] `PlanSnapshot` typ exporterad från `lib/planner/server/snapshot/types.ts` ✅ KLAR (2026-03-04)
- [x] Start-route refaktorerad att använda snapshot ✅ KLAR (2026-03-04) — 452 → 174 rader
- [x] Run-fetch route (`/api/play/runs/[runId]`) refaktorerad ✅ KLAR (2026-03-04) — 200 → 141 rader
- [ ] Preview refaktorerad att använda snapshot (StepSaveAndRun — klient-komponent, använder redan `plan.blocks` prop, inte API-snapshot)
- [ ] Active-runs totalSteps fallback via snapshot (avvaktar — `meta.stepsGenerated` fungerar)
- [x] 0 TS-errors ✅
- [x] Befintliga tester passerar (regression)

**Noteringar:**
- `getPlanSnapshot(planId, prefer, supabaseClient?)` — tar emot optional supabase-klient för att undvika dubbelskapande i routes
- `generateStepsFromBlocks()` exporteras separat för `/api/play/runs/[runId]` som redan har blocks men behöver step-generation
- Tre kopior av `generateStepsFromBlocks` eliminarade: start-route, runs-route, snapshot (→ enda SSoT i snapshot/)
- Publish-route (`/api/plans/[planId]/publish`) har manuell rollback (delete version om blocks-insert misslyckas) — inte full BEGIN/COMMIT men funktionellt atomisk
- `SnapshotPreference: 'published' | 'draft' | 'auto'` — `auto` = published om tillgänglig, annars draft
- StepSaveAndRun behöver inte snapshot (klient-komponent som redan har blocks via prop, preview är lokal rendering). Markerad som ej tillämpbar.

#### Risk: Publish-atomicitet

Publish måste vara atomisk för att snapshot inte ska läsa en "halv version":

```sql
BEGIN;
  INSERT INTO plan_versions (...) VALUES (...);
  INSERT INTO plan_version_blocks (...) SELECT ... FROM plan_blocks;
  UPDATE plans SET current_version_id = new_version_id;
COMMIT;
```

Verifiera att befintlig publish-route (`/api/plans/[planId]/publish`) gör detta i en transaktion. Om inte, wrappa i `supabase.rpc()` eller Postgres function.

---

---

## 10. Beta Release Checklist (Smoke Tests)

Följande tests ska passera innan beta-release av Planner v2.0:

### Smoke Path 1: Skapa plan & bygg (mobil 375px)
- [ ] Gå till `/app/planner/plans` → Sidan visar "Planer"
- [ ] Scope-tabs syns: "Mina" (aktiv), "{Org}" (disabled, badge), "Global" (disabled, badge)
- [ ] Klicka [+ Ny plan] → CreatePlanDialog öppnas
- [ ] Fyll i namn → Klicka "Skapa plan" → Navigeras till Wizard Steg 1 "Bygg plan"
- [ ] Wizard visar 2 steg (inte 5)
- [ ] Lägg till en lek via GamePicker → Block visas i listan
- [ ] Lägg till paus, förberedelse, notat → Alla blocktyper fungerar
- [ ] Dra-och-släpp ett block → Ordningen ändras
- [ ] Swipe-to-delete ett block (mobil) → Block försvinner
- [ ] Öppna "Anteckningar" (ihopfällbar) → Skriv text → Text sparas

### Smoke Path 2: Spara & Utför (mobil)
- [ ] Klicka "Nästa" → Steg 2 "Spara & Utför" visas
- [ ] Inline förhandsvisning visar alla block med korrekt info
- [ ] Redigera plannamn inline → Ändringen syns
- [ ] Klicka "Spara" → Toast "Sparad!" visas, stannar kvar
- [ ] Klicka "Spara & Utför" → Loading → Navigeras till PlayPlanPage
- [ ] Plan status = published (verifiera i planlistan efteråt)

### Smoke Path 3: Kör plan
- [ ] PlayPlanPage visar steg 1 av N
- [ ] Timer fungerar (start/paus/reset)
- [ ] Navigera framåt/bakåt mellan steg
- [ ] Sektions-block hoppas över automatiskt
- [ ] "Tillbaka till plan"-knapp i headern → Navigerar till wizard

### Smoke Path 4: Kalender
- [ ] Gå till `/app/planner/calendar` → Kalender visas
- [ ] Klicka en dag → Dagvy visas
- [ ] Klicka [+ Planlägg] → PlanPickerModal öppnas med planlista
- [ ] Välj plan → Schema skapas → ScheduleCard visas på den dagen
- [ ] ScheduleCard: Klicka [▶ Starta körning] → Navigerar till PlayPlanPage
- [ ] Ta bort schema → Schema försvinner
- [ ] Kalenderdagar med scheman visar visuell indikator

### Smoke Path 5: Planlista-interaktion (mobil)
- [ ] Planlistan visar: namn + statusbadge + tid + snabbåtgärder
- [ ] Ögon-ikon → Förhandsvisning
- [ ] Penna-ikon → Navigerar till wizard
- [ ] Statusfilter fungerar (Utkast/Ändrad/Publicerad/Arkiverad)
- [ ] Plan skapad via wizard syns i listan med korrekt status

### Smoke Path 6: Session-block blockering
- [ ] Om ett block i planen refererar ett spel med `play_mode='participants'` → Tydlig info visas: "Kräver session — stöds i nästa version"
- [ ] Planen kan fortfarande sparas och köras (session-blocket blockeras med tooltip — hoppas INTE över)

### Regression
- [ ] Befintliga planer (skapade med gammal wizard) öppnas korrekt i ny 2-stegs-wizard
- [ ] Gammal URL `?step=3`, `?step=4`, `?step=5` → fallbackar till `?step=2`
- [ ] Admin-panelen (`/admin/planner`) fungerar oförändrat
- [ ] i18n: Alla texter visas korrekt på sv, no, en
- [ ] Inga build errors, inga TypeScript-fel

---

*Denna implementeringsplan är uppdaterad med låsta beslut och redo för klarsignal. Ingen kod skrivs förrän jag explicit skriver: **"Kör, börja implementera"**.*
