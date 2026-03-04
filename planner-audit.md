# Planner/Planläggaren — Audit, Riskanalys & Förbättringsförslag

> **Datum:** 2026-03-04 | **Senast uppdaterad:** 2026-03-04 (efter MS5 Tenant RLS implementation)  
> **Scope:** `/app/planner`, `/admin/planner`, `/app/play/plan/`, kalender, körning  
> **Syfte:** Kartlägga nuvarande tillstånd, identifiera risker och föreslå en genomtänkt ändringsplan inför beta-launch.  
> **Status:** MS0–MS5 implementerade. Se `planner-architecture.md` för stabil systemöversikt.

---

## 1. Audit (Nuvarande läge)

### 1.1 Informationsarkitektur & Navigation

#### Rutter i `/app` (lekledare)

| URL | Fil | Funktion |
|-----|-----|----------|
| `/app/planner` | `app/app/planner/page.tsx` | Redirect → `/app/planner/plans` |
| `/app/planner/plans` | `app/app/planner/plans/page.tsx` | Planlista (91 rader) |
| `/app/planner/plan/[planId]` | `app/app/planner/plan/[planId]/page.tsx` | Wizard-editor (2 steg: `build` / `save-and-run`, klient). Legacy URL-params (`?step=grund` etc.) mappas automatiskt. |
| `/app/planner/[planId]` | `app/app/planner/[planId]/page.tsx` | Delningslänk (server) |
| `/app/planner/calendar` | `app/app/planner/calendar/page.tsx` | Kalendervy |
| `/app/play/plan/[planId]` | `app/app/play/plan/[planId]/page.tsx` | Kör plan (PlayPlanPage) |
| `/app/play/sessions` | `app/app/play/sessions/page.tsx` | Sessionssamling |
| `/app/play/sessions/[id]` | `app/app/play/sessions/[id]/page.tsx` | SessionCockpit |

#### Rutter i `/admin`

| URL | Fil | Funktion |
|-----|-----|----------|
| `/admin/planner` | `app/admin/planner/page.tsx` (604 rader) | Adminpanelens planlista |
| `/admin/planner/[planId]` | `app/admin/planner/[planId]/page.tsx` (508 rader) | Admindetalj + blockvy |
| `/admin/planner/[planId]/versions` | `…/versions/page.tsx` (160 rader) | Versionshistorik |

#### Tab-navigation (PlannerTabs)

Två flikar: **Planer** → **Kalender**  
- "Planer"-fliken visar planlistan med scope-tabs (Mina / {Org} / Global — Org+Global disabled i beta).  
- Calendar-fliken visar kalendervy med PlanPickerModal (feature-flagga `planner_calendar`, enabled).

#### Kritiska observationer

- **Dubbla dynamiska segment** under `/app/planner/`: `[planId]` (delningslänk) och `plan/[planId]` (wizard). Potentiell rutt-konflikt vid framtida ändringar.
- **Planlistan** heter "Mine planer" i nav men sidan säger "Planer" i header — inkonsekvent terminologi.
- ~~**Wizard-flödet** kräver 5 steg~~ → **FIXAT:** Refaktorerat till 2 steg (Build Plan + Save & Run). CreatePlanDialog → direkt till Steg 1.
- **Ingen breadcrumb** från "Kör plan" tillbaka till planwizarden — användaren fastnar i PlayPlanPage.

---

### 1.2 UI/UX — Desktop vs Mobil

#### Mobil (primärt mål)

| Komponent | Status | Notering |
|-----------|--------|----------|
| `TouchBlockRow` (473 rader) | ✅ Fungerande | Swipe-gester, lång-tryck, dubbel-tryck |
| `MobileWizardStepper` (290 rader) | ✅ Fungerande | Steg-indikator för 2 steg |
| `PullToRefresh` (106 rader) | ✅ Fungerande | Pull-to-refresh i planlistan |
| `StickyActionBar` (254 rader) | ✅ Fungerande | Fixerad navigationsbar nedtill |
| Kalender | ⚠️ Fungerar | Kolumner kan bli trånga i veckoläge |
| PlayPlanPage | ⚠️ Fungerar | Timer + steg-navigering, men designen är basic |
| GamePicker | ⚠️ Stort (547 rader) | Auto-browse, filter-chips, AbortController — fungerande men visuellt tung |

#### Desktop

- Admin-sidorna (604 + 508 rader) är desktop-first med tabeller och inline-åtgärder.
- Wizard-steget "Granska & Publicera" visar avancerade funktioner (versionshistorik, dela, exportera CSV) som inte är mobilanpassade.

#### Det som "overwhelmar"

1. ~~**5 wizard-steg**~~ → **FIXAT:** Reducerat till 2 steg.
2. ~~**Steg 4 (Granska & Publicera)** blandar förhandsvisning, versionshistorik, dela, exportera CSV och publicering~~ → **FIXAT:** Förenklat till inline preview + "Spara & Utför" (auto-publicering transparent).
3. ~~**Steg 5 (Kör)** är ett separat steg med sammanfattning + "Starta körning"-knapp~~ → **FIXAT:** Borttaget, "Spara & Utför" navigerar direkt till PlayPlanPage.

---

### 1.3 Dataflöden

```
Plan (plans-tabell)
  ├── PlanBlocks (plan_blocks)  ←  game_id → games
  ├── PlanNotes (plan_notes_private / plan_notes_tenant)
  ├── PlanVersions (plan_versions)
  │     └── PlanVersionBlocks (plan_version_blocks)  ←  frysta vid publicering
  ├── PlanSchedules (plan_schedules)  ←  för kalendervy
  └── Runs (runs)
        └── RunSteps (run_steps)  ←  genereras från version_blocks vid "Start Run"
```

**Publiceringsflöde:**
1. Användare bygger plan med block (CRUD via `/api/plans/[planId]/blocks`)
2. Publicerar → `/api/plans/[planId]/publish` → skapar `plan_version` + `plan_version_blocks`
3. Startar körning → `/api/play/[planId]/start` → skapar `run` + `run_steps` från versionsblock
4. Fallback: opublicerade planer kan köras via "legacy"-läge direkt från `plan_blocks`

**Kalenderflöde:**
1. Användare väljer dag i kalender → klickar "Planlägg"
2. `useSchedules.openCreateDialog(selectedDate)` öppnar schemaläggarmodulen
3. `POST /api/plans/schedules` med `planId`, `scheduledDate`, `scheduledTime`, etc.
4. Schemat visas i `ScheduleCard` → "Starta plan"-knapp navigerar till `/app/play/plan/{planId}`

---

### 1.4 Dubbelhet mellan `/app` och `/admin`

| Funktion | `/app` | `/admin` |
|----------|--------|----------|
| Planlista | `PlanListPanel` (156 rader) + `usePlanFilters` | Inline i page.tsx (604 rader) |
| Plandetalj | Wizard (5 steg, ~1 200 rader totalt) | Inline i page.tsx (508 rader) |
| Blockvy | `BlockList` + `BlockRow`/`TouchBlockRow` | Inline tabell i page.tsx |
| Publicering | StepGranska (button) | Inline action button |
| Versionshistorik | VersionsDialog (175 rader) | Separat sida (160 rader) |
| Status-ändring | Via state-machine + wizard | Via admin actions |

**Problem:** Admin-sidorna (1 112 rader) duplicerar logik som redan finns i features/planner. De importerar från `lib/planner` (labels, state-machine, DTOs) men bygger egna UI-representationer av listor, detaljer och åtgärder.

---

### 1.5 Terminologi/Översättningar

| Term i UI | Var | Konsekvent? |
|-----------|-----|-------------|
| "Mine planer" | Nav-meny, tab-label | ❌ Skillnad sv/no i samma UI |
| "Planlegg" / "Planer" | Sidtitlar | ❌ Rubrik = "Planlegg", tab = "Mine planer" |
| "Opprett ny plan" | CreatePlanDialog | ✅ Konsekvent |
| "Grunnleggende" | Steg 1 | ✅ men onödig om vi slår ihop steg |
| "Granska & Publicera" | Steg 4 | ⚠️ Blandning sv/no |
| "Kör" | Steg 5 | ✅ men otydlig action |

**i18n-strukturen** finns i **en enda plats**:
1. `messages/{sv,no,en}.json` → `planner.*` (all UI-text)

~~Tidigare parallellt system~~ (`lib/planner/locales.json` + `lib/planner/i18n.ts`) — **Borttaget** (var 100% död kod, noll runtime-imports).

---

### 1.6 Identifierade Buggar & Broken Flows

| # | Problem | Orsak | Status |
|---|---------|-------|--------|
| 1 | ~~"Planlägg"-knappen i kalendern gör ingenting synligt~~ | ~~`useSchedules` har full CRUD men UI kopplar inte till plan-selection~~ | ✅ **Fixat** — PlanPickerModal skapad, kopplad till PlanCalendar |
| 2 | "Kör plan" 404 | URL-mismatch i StepKor.tsx (navigerade till `/app/play/${id}/start` istället för `/app/play/plan/${id}`) | ✅ Fixat |
| 3 | ~~Kalender visar inte planer per dag~~ | ~~Om inga scheman skapats syns ingenting~~ | ✅ **Fixat** — PlanPickerModal gör det möjligt att schemalägga planer |
| 4 | ~~`/app/play/[gameId]`-rutt~~ | ~~Redirect till `/app/games/{gameId}` — troligen helt död~~ | ✅ **Borttagen** |
| 5 | ~~`ActionBar.tsx` exporteras men importeras aldrig~~ | ~~Överskuggad av `StickyActionBar`~~ | ✅ **Borttagen** |
| 6 | `plan_games`-tabell | Legacy M:M-tabell, ersatt av `plan_blocks.game_id` | ⚠️ **Oanvänd tabell** |
| 7 | `plan_play_progress`-tabell | Legacy, ersatt av `runs`-tabellen | ⚠️ **Oanvänd tabell** |
| 8 | `fetchLegacyPlayView()` | Markerad `@deprecated`, används fortfarande som fallback | ⚠️ **Teknisk skuld** |

---

## 2. Riskanalys

### 2.1 Tekniska risker

| Risk | Sannolikhet | Påverkan | Beskrivning |
|------|-------------|----------|-------------|
| **Duplicerad UI-logik admin vs app** | HÖG | MEDEL | Admin-sidorna (1 112 rader) duplicerar lista/detalj/åtgärder. Vid ändringar i features/planner syns de inte i admin. |
| **Två i18n-system** | ~~MEDEL~~ | ~~LÅG~~ | ✅ **LÖST** — `lib/planner/locales.json` + `i18n.ts` raderade (död kod). Alla nycklar i `messages/*.json` |
| **Legacy tabeller/API** | LÅG | LÅG | `plan_games`, `plan_play_progress`, `fetchLegacyPlayView` — fungerar men skapar förvirring |
| **RLS-gap för delning** | ~~HÖG~~ | ~~HÖG~~ | ✅ **LÖST** (MS5) — Tenant-aware RLS-policies implementerade för alla planner-tabeller. Migration `20260305100000_tenant_rls_planner.sql`. `plan_version_blocks` SELECT existerade redan (gammalt namn `users_can_select_version_blocks`), standardiserad till `plan_version_blocks_select`. |
| **Saknad session-block-integration** | ~~HÖG~~ | ~~HÖG~~ | ✅ **LÖST** (MS6+MS7.2) — Backend spine + UI: `run_sessions`-tabell, snapshot, `RunSessionCockpit`, NavigationControls guard. Force-end session: `POST /api/play/runs/:runId/sessions/end` + dashboard “Avsluta”-knapp med bekräftelsedialog (MS7.2). Sessions-lista: `RunsDashboard` i `/app/play/sessions` (MS7.1). |
| **Feature-flaggor utan tenant-stöd** | MEDEL | LÅG | Feature-flaggor kollar env/localStorage/defaults men tenant-metadata-stöd är TODO |
| **Caching/stale data** | MEDEL | MEDEL | Plan-data hämtas med useEffect + lokalt state. Ingen automatisk invalidation vid publiceringsstatus-ändringar. |
| **Stora komponenter** | MEDEL | MEDEL | GamePicker (547), PlayPlanPage (500), StickyActionBar (254) — svåra att underhålla |

### 2.2 Produkt-/UX-risker

| Risk | Sannolikhet | Påverkan | Beskrivning |
|------|-------------|----------|-------------|
| **"Overwhelming" wizard** | ~~HÖG~~ | ~~HÖG~~ | ✅ **LÖST** — 5 steg → 2 steg. Avancerade funktioner borttagna från app-wizard. |
| **Inkonsekvent plan-skapande** | ~~HÖG~~ | ~~MEDEL~~ | ✅ **LÖST** — CreatePlanDialog → direkt till Bygg plan (steg 1). Inget dubbelarbete. |
| **Kalender broken/otydlig** | ~~HÖG~~ | ~~MEDEL~~ | ✅ **LÖST** — PlanPickerModal skapad. "Planlägg" → välj plan → schema skapas. |
| **Ingen "lägg till i plan"** | HÖG | HÖG | Knappen finns i GameStartActions men är avaktiverad (showAddToPlan=false). Ingen modal för val av plan. |
| **Ingen navigering till aktiv körning** | ~~HÖG~~ | ~~MEDEL~~ | ✅ **LÖST** (MS7.1) — `RunsDashboard` som "Planruns"-tab i `/app/play/sessions`. Visar pågående runs med session-info, resume-knappar, stale/needs-attention badges. |
| **Privat/Org/Global-scopning saknas** | ~~HÖG~~ | ~~HÖG~~ | ✅ **LÖST** (MS5) — ScopeSelector aktiverad (Org om tenant finns, Global alltid). Search API med `scope` parameter. RLS-policies implementerade. |

### 2.3 Lanseringsrisker (Beta)

| Risk | Påverkan | Beskrivning |
|------|----------|-------------|
| **Support-tryck från förvirrande wizard** | ~~HÖG~~ | ✅ **LÖST** — Wizard förenklad till 2 steg. Inga avancerade knappar. |
| **"Planlägg" fungerar inte** | ~~MEDEL~~ | ✅ **LÖST** — PlanPickerModal skapad (MS3). |
| **Ingen väg tillbaka från körning** | MEDEL | Lekledare tappar orientering under körning |
| **Deltagarlekar kan inte köras via plan** | HÖG | Planer med deltagarlekar saknar session-integration |
| **Organisationsplaner osynliga** | ~~MEDEL~~ | ✅ **LÖST** (MS5) — Tenant RLS + Scope-tabs aktiverade |

### 2.4 Datamodellrisker

| Risk | Beskrivning |
|------|-------------|
| **`games.product_id` saknar koppling till plans** | Produktfiltrering (specialpedagogik vs fotboll) kräver att planer kopplas till produkter. Idag finns ingen `plan.product_id` eller `plan_product_tags`-tabell. |
| **`play_mode` som sessionindikator** | Bara `participants`-läget stödjer sessions. Planer vet inte om ett block kräver session förrän runtime. |
| **Scheman utan tvåvägskoppling** | `plan_schedules` lagrar `planId + date + time`, men plans-listan visar inte "nästa schemalagda körning". |
| **`section`-block i enum** | ✅ `section` verifierad i DB-enum. Migrering körd + 4 enforcement layers (check constraint, RLS-validation, auto-rename, runtime guard). |

---

## 3. Förbättringsförslag

### 3.1 Prioriterade förbättringar (Impact/Effort-matris)

| # | Förbättring | Impact | Effort | Prioritet |
|---|-------------|--------|--------|-----------|
| 1 | ~~**Förenkla wizard → 2 steg**~~ | ~~🟢 HÖG~~ | ~~🟡 MEDEL~~ | ✅ **KLAR** (MS1) |
| 2 | ~~**"Ny plan" direkt till wizard**~~ | ~~🟢 HÖG~~ | ~~🟢 LÅG~~ | ✅ **KLAR** (MS1) |
| 3 | ~~**Fixa kalender: "Planlägg" → välj plan**~~ | ~~🟡 MEDEL~~ | ~~🟡 MEDEL~~ | ✅ **KLAR** (MS3) |
| 4 | ~~**"Lägg till i plan"-modal från speldetalj**~~ | ~~🟢 HÖG~~ | ~~🟡 MEDEL~~ | ✅ **KLAR** (MS4) |
| 5 | ~~**Organisationsplaner + Tenant RLS**~~ | ~~🟢 HÖG~~ | ~~🔴 HÖG~~ | ✅ **KLAR** (MS5) |
| 6 | **Produkttaggning av planer** | 🟡 MEDEL | 🟡 MEDEL | P1 — MS5.1 |
| 7 | **Session-block ("Deltagarlek")** | 🟢 HÖG | 🔴 HÖG | ✅ **KLAR** (MS6, 2026-03-04) — Backend spine + UI komplett. AddGameButton, GamePicker filter, RunSessionCockpit, PlayPlanPage integration, NavigationControls guard. Kvarstår: force-end, sessions-lista. |
| 8 | **Aktiva körningar i sessions-listan** | 🟡 MEDEL | 🟡 MEDEL | ✅ **KLAR** (MS7.1, 2026-03-04) — `RunsDashboard` komponent, `GET /api/play/runs/dashboard`, top-level tabs i sessions-sidan. |
| 8b | **Director Mode Track 1 + Realtime Presence** | 🟢 HÖG | 🟡 MEDEL | ✅ **KLAR** (MS8–MS9, 2026-03-05) — RunSessionCockpit: QR, join-länk, copy, polling 30s fallback, terminal guardrails. Realtime broadcast `participants_changed` on join → host subscribar via Supabase Realtime, debounce 400ms. |
| 9 | ~~**Rensa dödkod**~~ | ~~🟢 LÅG~~ | ~~🟢 LÅG~~ | ✅ **KLAR** (MS0) |
| 10 | ~~**Konsolidera i18n**~~ | ~~🟢 LÅG~~ | ~~🟢 LÅG~~ | ✅ **KLAR** (MS0) |
| 11 | ~~**PlanSnapshot Pipeline**~~ | ~~🟢 HÖG~~ | ~~🟡 MEDEL~~ | ✅ **KLAR** — SSoT i `lib/planner/server/snapshot/`, start-route 452→174 rader, runs-route 200→141 rader, 3 duplicerade `generateStepsFromBlocks` → 1 |

### 3.2 Mobile-First Designprinciper

1. **Maximalt 3 wizard-steg** — varje steg ska vara helt synligt utan scroll på en 375px-skärm
2. **En primär action per vy** — inte 4 knappar (preview + versions + share + export) i samma steg
3. **Direkt feedback** — sparande ska visa inline-bekräftelse, inte modal
4. **Thumb-friendly** — alla primära knappar i nedre 40% av skärmen (StickyActionBar)
5. **Progressive disclosure** — avancerade funktioner (versioner, CSV, delning) bakom "Mer"-meny
6. **Offlinekänsla** — optimistisk UI med pending-states vid blockändringar

### 3.3 Navigation & Terminologiförslag

#### Föreslagna termer (konsekvent)

| Nuvarande | Föreslaget | Motivering |
|-----------|-----------|------------|
| "Mine planer" | "Planer" | Paraplynamn för alla planer |
| "Grundläggande" (Steg 1) | *(bort)* | Slås ihop med CreatePlanDialog eller tas bort |
| "Bygg plan" (Steg 2) | "Bygg plan" | Behåll — tydlig action |
| "Anteckningar" (Steg 3) | *(bort — flytta till Bygg plan)* | Anteckningar bör vara en sektion i Bygg plan |
| "Granska & Publicera" (Steg 4) | "Spara & Utför" | Enklare, fokus på action |
| "Kör" (Steg 5) | *(bort — flytta till Spara & Utför)* | "Starta körning" blir en knapp i sista steget |

#### Föreslagen sidstruktur

```
/app/planner
  └── /plans                    → "Planer" (huvud)
       ├── Mina (tab/knapp)
       ├── {Org} (tab/knapp)      ← om användare har org
       └── Global (tab/knapp)     ← om globala planer finns
  └── /plan/[planId]            → Wizard (2 steg)
       ├── Steg 1: Bygg plan    (block + anteckningar)
       └── Steg 2: Spara & Utför (förhandsvisning + save/run)
  └── /calendar                 → Kalender
```

---

## 4. Ändringsplaner (Change Plan)

### Fas 0: Städning & Stabilisering ✅ KLAR (2026-03-04)

- [x] Ta bort `ActionBar.tsx` (död kod, överskuggad av StickyActionBar)
- [x] Ta bort `/app/play/[gameId]`-rutten (död redirect)
- [x] Konsolidera i18n: raderade `lib/planner/locales.json` + `lib/planner/i18n.ts` (100% död kod)
- [x] Verifiera att `section`-enum finns i DB — migrering körd & verifierad
- [ ] Dokumentera `plan_games` och `plan_play_progress` som deprecated i schema
- [x] Fixa kalender "Planlägg" → PlanPickerModal skapad (MS3)

### Fas 1: Wizard-förenkling & Ny plan-flöde ✅ KLAR (2026-03-04)

- [x] **Ny plan-knapp → direkt till wizard.** Grundsteget borttaget. CreatePlanDialog → wizard steg 1 (Bygg plan). Synlighet = `private`.
- [x] **Slagit ihop "Bygg plan" + "Anteckningar"** till StepBuildPlan.
- [x] **Nytt slutsteg: StepSaveAndRun.** Förhandsvisning + "Spara" / "Spara & Utför".
- [x] **Steg 5 (Kör) borttaget** — ersatt av "Spara & Utför" i StepSaveAndRun.
- [x] **Avancerade funktioner** borttagna från wizard (versionshistorik, CSV, dela).
- [x] **MobileWizardStepper** uppdaterad för 2 steg. Legacy URL-mapping via `resolveStep()`.

### Fas 2: Planlista v2 + Scope-tabs ✅ KLAR (2026-03-04)

- [x] **Sidnamn** ändrat till "Planer"
- [x] **ScopeSelector** skapad: "Mina" (aktiv) / "{Org}" (aktiv om tenant) / "Global" (aktiv)
- [x] **Snabbåtgärder i listan**: Ögon-ikon (förhandsvisning) + penna-ikon (editera) i PlanListItem
- [x] **RLS-migrering**: tenant-aware policies — se Fas 5 Tenant RLS ✅ (MS5)
- [ ] Produktfiltrering av globala planer (kräver `plan_product_tags`, Fas 7)

### Fas 3: Kalender & Schemaläggning ✅ KLAR (2026-03-04)

- [x] **PlanPickerModal** skapad — "Planlägg" → välj plan → skapa schedule.
- [x] **PlanCalendar** uppdaterad — PlanPickerModal integrerad, play-URL fixad.
- [ ] **Visa ikon/badge på kalenderdagar** som har schemalagda planer (P1)
- [ ] **ScheduleCard: förbättra mobilvy** — tydligare start-knapp, bättre tidsinformation (P1)
- [ ] **Dagvy**: Visa schemalagda planer + snabb "Starta körning"-knapp (P1)

### Fas 4: "Lägg till i plan" & Spelintegration ✅ KLAR (2026-03-04)

- [x] **Aktivera `showAddToPlan` i `GameStartActions`** (`app/app/games/[gameId]/page.tsx`) ✅
- [x] **Skapa AddToPlanModal**: Lista användarens planer, varje rad med plannamn + "Lägg till lek" + "Gå till plan" ✅
- [x] **API**: `POST /api/plans/[planId]/blocks` med `block_type: 'game', game_id: gameId` ✅
- [x] Optimistisk UI: visa "Tillagd!"-bekräftelse i modalen ✅
- [x] **Kvalitetshärdning**: pendingPlanIds Set (race-safe), toast feedback, "Öppna plan"-knapp, optimistisk block count ✅ (2026-03-04)

### Fas 4.5: Run Resume ("Fortsätt") ✅ KLAR (2026-03-04)

- [x] **API**: `GET /api/play/runs/active` — hämtar pågående körningar via `plan_versions` left join ✅
- [x] **Idempotent start**: `POST /api/play/{planId}/start` returnerar befintlig aktiv run istf dublett ✅
- [x] **Client hook**: `useActiveRuns()` — `planId → ActiveRun` mapping ✅
- [x] **PlanListItem**: "Fortsätt" / "Kör"-knapp + "Pågår"-badge ✅
- [x] **ScheduleCard**: "Fortsätt" visas alltid (ej bara on hover) när aktiv run finns ✅
- [x] **i18n**: `resume`, `play`, `resumePlan` i alla 3 locales ✅

### Fas 4.6: Calendar Day Badges + Progress Indicator ✅ KLAR (2026-03-04)

- [x] **CalendarDay**: Amber pulsande dot för dagar med aktiv run ✅
- [x] **ActiveRun**: `totalSteps` tillagd från `metadata.stepsGenerated` ✅
- [x] **PlanListItem**: Visar "Pågår · 3 av 12" progress i badge ✅
- [x] **ScheduleCard**: Visar "Fortsätt · 3 av 12" på resume-knapp ✅
- [x] **Data flow**: `activeRunPlanIds` threadad CalendarGrid → CalendarDay ✅

### Fas 4.7: Performance & UX Polish ✅ KLAR (2026-03-04)

- [x] **Animation**: `animate-pulse` → `animate-soft-pulse` (2.5s ease-in-out, subtilare) ✅
- [x] **Progress format**: "3/12" → i18n `runStatus.progress` → "3 av 12" / "3 of 12" ✅
- [x] **Metadata fallback**: `meta?.steps` som fallback i `active/route.ts` ✅
- [x] **React.memo**: `PlanListItem` + `ScheduleCard` wrappade med `React.memo` ✅
- [x] **useDeferredValue**: Sök-filtrering i `PlanListPanel` använder `useDeferredValue` ✅
- [x] **useCallback**: Stabil `handlePlay` i `PlanListPanel` ✅
- [x] **Reduced motion**: `animate-soft-pulse` respekterar `prefers-reduced-motion` ✅

### Fas 4.8: Run Safety — Heartbeat & Auto-Stale ✅ KLAR (2025-07-15)

- [x] **DB**: `runs.last_heartbeat_at timestamptz NULL` kolumn + partial index + backfill (migration `20260305000000_runs_last_heartbeat_at.sql`)
- [x] **API**: `POST /api/play/runs/[runId]/heartbeat` endpoint (RLS-enforced, noop för virtual/draft)
- [x] **API**: `POST /api/play/runs/[runId]/abandon` endpoint (markerar run som abandoned)
- [x] **Client**: PlayPlanPage skickar heartbeat var 30s via `setInterval` + progress piggybackar
- [x] **Active runs**: Filtrerar bort stale runs (heartbeat > 24h) i `GET /api/play/runs/active` med legacy bakåtkompatibilitet
- [x] **UI**: "Avbryt körning"-knapp med bekräftelsedialog (destructive styling)
- [x] **i18n**: `abandonRun` + `abandonConfirm` nycklar i sv/en/no
- [x] **Types**: `last_heartbeat_at` tillagd i `types/supabase.ts` (runs Row/Insert/Update)
- [x] 0 TS-errors

### Fas 5: Tenant RLS — Isolation & Organisationsplaner ✅ KLAR (2026-03-04)

- [x] ~~**Kritisk fix**: `plan_version_blocks` SELECT-policy saknas~~ — Existerade med gammalt namn `users_can_select_version_blocks`; standardiserad till `plan_version_blocks_select`
- [x] **plans**: Tenant-visible SELECT + tenant-admin UPDATE policies
- [x] **plan_blocks/versions/version_blocks**: Kaskad-RLS via FK till plans
- [x] **plan_schedules**: Synkad med plans RLS (per-operation, borttagen inkonsistens)
- [x] **plan_notes_tenant**: Åtstramad — kräver att planen är synlig
- [x] **runs**: `tenant_id` sätts i start-API + backfill av befintliga runs
- [x] **Scope-tabs**: Org + Global aktiverade i ScopeSelector + PlanListPanel
- [x] **RLS-migrering**: `20260305100000_tenant_rls_planner.sql` — wrapped i BEGIN/COMMIT
- [ ] Produktfiltrering av globala planer (kräver `plan_product_tags`) — skjuten till MS5.1
- [ ] **Testplan**: Cross-tenant isolation test (User A/Tenant 1 vs User B/Tenant 2)

### Fas 6: Session-block (Deltagarlek) (5+ dagar)

- [ ] **Ny block_type: `'session_game'`** i DB-enum + TypeScript + UI
- [ ] **Block-metadata**: Lagra `{ gameId, playMode: 'participants' }` i `plan_blocks.metadata`
- [ ] **GamePicker**: Visa `play_mode`-badge och separera vanliga lekar från deltagarlekar
- [ ] **Run-generering**: Vid start av körning med session-block → skapa `participant_session` automatiskt
- [ ] **PlayPlanPage: Session-steg**: När RunStep är `session_game` → visa session-kod/QR, växla till mini-SessionCockpit, återgå till nästa steg vid avslutad session
- [x] **Aktiva körningar i sessions-listan**: ✅ Visa pågående plan-runs i `/app/play/sessions` (MS7.1, 2026-03-04)

### Fas 7: Admin-förbättringar (3–4 dagar)

- [ ] **Produkttaggning**: Lägg till `plan_product_tags`-tabell (M:M plan_id ↔ product_id)
- [ ] **Admin UI**: Multi-select produkter vid plan-skapande/-redigering
- [ ] **Scope-filter i admin**: "Tenant" / "Global" med produktfilter
- [ ] **Refaktor**: Extrahera gemensamma UI-delar (planlista, status-badges) till shared components

### Bakåtkompatibilitet

- **Publicerade planer** med versions_blocks påverkas inte — de behåller sin struktur.
- **Wizard-steg-URL** (`?step=`) byts från 1-5 till 1-2 — men inga externa länkar/bookmarks pekar hit.
- **API:er oförändrade** — alla `/api/plans/` och `/api/play/` endpoints behålls.
- **Legacy fallback** (`fetchLegacyPlayView`) kan tas bort EFTER att alla planer migrerats till versionsbaserade runs, men bevaras under beta.

---

## 5. Filräkning & Kodinventering

### Planner-domänen (totalt)

| Del | Filer | Rader (uppskattning) |
|-----|-------|---------------------|
| `features/planner/` | ~58 | ~7 200 |
| `lib/planner/` | 9 | ~2 000 |
| `app/app/planner/` | 5 sidor | ~500 |
| `app/admin/planner/` | 3 sidor | ~1 270 |
| `app/api/plans/` | ~20 routes | ~3 000 (uppskattning) |
| `types/planner.ts` | 1 | 90 |
| **Totalt** | **~96** | **~14 060** |

### Play/Run-domänen

| Del | Filer | Rader |
|-----|-------|-------|
| `features/play/` | 70+ | ~15 000+ |
| `app/app/play/` | 8 sidor | ~800 |
| `app/api/play/` | 30+ routes | ~5 000+ |

### Identifierad dödkod (kan tas bort)

| Fil/Tabell | Rader | Anledning |
|-----------|-------|-----------|
| ~~`ActionBar.tsx`~~ | ~~86~~ | ✅ **Borttagen** (MS0) |
| ~~`AnimatedList.tsx`~~ | ~~152~~ | ✅ **Borttagen** (MS0) |
| ~~`/app/play/[gameId]/page.tsx`~~ | ~~15~~ | ✅ **Borttagen** (MS0) |
| `plan_games` DB-tabell | — | Ersatt av `plan_blocks.game_id` |
| `plan_play_progress` DB-tabell | — | Ersatt av `runs`-tabellen |
| `fetchLegacyPlayView()` | ~60 | `@deprecated`, bevaras som fallback tills vidare |

---

## 6. Beslut (alla låsta — 2026-03-04)

Samtliga open questions har besvarats och besluten är låsta:

| # | Fråga | Beslut |
|---|-------|--------|
| Q1 | CreatePlanDialog — behåll eller ta bort? | ✅ **Behåll.** Namn (required) + Beskrivning (optional). Ingen visibility i /app — alltid privat. |
| Q2 | Publiceringsflöde — behövs det i beta? | ✅ **Auto-publicera vid "Spara & Utför".** Transparent för användaren. Versioner kvar under huven. |
| Q3 | Organisationsplaner i beta? | ✅ **Visa scope-tabs (Mina / Org / Global) men Org + Global disabled + "Kommer snart (Beta)".** RLS i P1. |
| Q4 | Kalender — scope för beta? | ✅ **Create + Delete i beta.** Edit-dialog kan vänta till P1. End-to-end: Planlägg → välj plan → skapa schema → dagvy → starta körning. |
| Q5 | Session-block — beta eller post-beta? | ✅ **Post-beta (P2).** I beta: visa tydlig blockering i UI om block kräver session. |
| Q6 | ai-assist.ts — ska den exponeras i UI? | ✅ **Inte i beta.** Prioritera stabilitet. |
| Q7 | Admin-refaktor — i detta projekt? | ✅ **Separat sprint.** Nödvändiga admin-buggfixar nu, refaktor i P2. |

---

*Denna fil genererades och uppdaterades som del av Planner v2.0-projektet. Ingen kod ska skrivas förrän implementeringsplanen är godkänd och klarsignal givits.*
