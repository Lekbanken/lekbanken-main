# Planner v2.0 — Arkitektur & Systemöversikt

> **Senast uppdaterad:** 2026-03-04 (MS10 KLAR: Director Realtime State — timer/board seq-guard, gap detection, on-SUBSCRIBED sync)
> **Syfte:** Stabil referens för systemdesign. Ändras sällan — bara vid arkitekturella förändringar.

---

## 1. System Overview

Planner v2.0 är ett verktyg för lekledare att skapa, schemalägga och köra aktivitetsplaner. Det består av tre huvudvyer: **Planlista**, **Wizard** (2 steg), och **Kalender**.

### Domän-avgränsning

```
┌──────────────────────────────────────────────────────┐
│                      Planner                         │
│                                                      │
│  ┌─────────┐  ┌──────────┐  ┌──────────┐            │
│  │ Planlista│→│  Wizard   │→│   Kör    │             │
│  │ (plans) │  │ (2 steg) │  │  (play)  │             │
│  └────┬────┘  └──────────┘  └──────────┘             │
│       │                                              │
│  ┌────┴────┐                                         │
│  │Kalender │→ Schemalägg → Kör                       │
│  │(calendar)│                                        │
│  └─────────┘                                         │
└──────────────────────────────────────────────────────┘
```

---

## 2. Route Structure

### `/app` (lekledare)

| URL | Fil | Funktion |
|-----|-----|----------|
| `/app/planner` | `app/app/planner/page.tsx` | Redirect → `/app/planner/plans` |
| `/app/planner/plans` | `app/app/planner/plans/page.tsx` | Planlista med scope-tabs + filter |
| `/app/planner/plan/[planId]` | `app/app/planner/plan/[planId]/page.tsx` | Wizard (2 steg: `?step=build` / `?step=save-and-run`) |
| `/app/planner/[planId]` | `app/app/planner/[planId]/page.tsx` | Delningslänk (server, read-only eller redirect till wizard) |
| `/app/planner/calendar` | `app/app/planner/calendar/page.tsx` | Kalendervy (feature-flagga: `planner_calendar`) |
| `/app/play/plan/[planId]` | `app/app/play/plan/[planId]/page.tsx` | Kör plan (PlayPlanPage) |

### `/admin`

| URL | Fil | Funktion |
|-----|-----|----------|
| `/admin/planner` | `app/admin/planner/page.tsx` | Admin planlista (desktop-first, oberoende UI) |
| `/admin/planner/[planId]` | `app/admin/planner/[planId]/page.tsx` | Admin plandetalj + blockvy |
| `/admin/planner/[planId]/versions` | `app/admin/planner/[planId]/versions/page.tsx` | Versionshistorik |

### URL-parametrar

| Param | Komponent | Giltiga värden | Bakåtkompatibilitet |
|-------|-----------|----------------|---------------------|
| `?step=` | Wizard | `build`, `save-and-run` | Legacy: `grund`→`build`, `bygg`→`build`, `anteckningar`→`build`, `granska`→`save-and-run`, `kor`→`save-and-run` |

---

## 3. Component Map

### Filstruktur

```
features/planner/
  ├── api.ts                    — Klient-API (fetchPlans, createPlan, etc.)
  ├── hooks/                    — useActionFeedback, useActiveRuns, etc.
  │
  ├── components/               — Dela UI-komponenter
  │   ├── ScopeSelector.tsx     — "Mina" / "{Org}" / "Global" scope-tabs (MS5: Org/Global aktiverade)
  │   ├── PlanListPanel.tsx     — Planlista med search, filter, sort, scope (useDeferredValue + useCallback)
  │   ├── PlanListItem.tsx      — Listrad: namn + badges + 👁/✏️ ikoner (React.memo)
  │   ├── CreatePlanDialog.tsx  — Modal: namn + beskrivning → skapa plan
  │   ├── AddToPlanModal.tsx   — Modal: välj plan → lägg till lek som block
  │   ├── PlannerTabs.tsx       — "Planer" / "Kalender" navigation
  │   ├── PlannerPageLayout.tsx — Layout-wrapper
  │   ├── PlanOverview.tsx      — Plan-översikt
  │   ├── BlockList.tsx         — DnD-sorterad blocklista
  │   ├── BlockRow.tsx          — Desktop blockrad
  │   ├── TouchBlockRow.tsx     — Mobil blockrad (swipe-gester)
  │   ├── GamePicker.tsx        — Spelväljare (auto-browse, filter)
  │   ├── AddGameButton.tsx     — "+Lägg till"-dropdown
  │   ├── StickyActionBar.tsx   — Fixerad navigationsbar (nedtill)
  │   ├── PreviewDialog.tsx     — Förhandsvisningsdialog
  │   ├── StatusBadge.tsx       — Status-badge
  │   ├── ShareDialog.tsx       — Delningsdialog
  │   ├── VersionsDialog.tsx    — Versionshistorik-dialog
  │   ├── VersionTimeline.tsx   — Versionstidslinje
  │   ├── ConfirmDialog.tsx     — Bekräftelsedialog
  │   ├── PlanHeaderBar.tsx     — Plan-header
  │   ├── BlockDetailDrawer.tsx — Block-detalj (drawer)
  │   ├── PullToRefresh.tsx     — Pull-to-refresh
  │   ├── LongPressIndicator.tsx
  │   ├── PlannerFeatureGate.tsx
  │   ├── WizardStepTransition.tsx
  │   └── index.ts              — Barrel exports
  │
  ├── wizard/                    — 2-stegs wizard
  │   ├── PlanWizard.tsx         — Huvud-wizard (renderar steg)
  │   ├── MobileWizardStepper.tsx — Mobil steg-indikator + navigation
  │   ├── WizardStepNav.tsx      — Desktop steg-navigation
  │   ├── types.ts               — WizardStep = 'build' | 'save-and-run', legacy mapping
  │   ├── hooks/
  │   │   └── usePlanWizard.ts   — URL-baserad wizard-state, legacy resolving
  │   ├── steps/
  │   │   ├── StepBuildPlan.tsx  — Steg 1: Block + ihopfällbara anteckningar
  │   │   └── StepSaveAndRun.tsx — Steg 2: Preview + Spara + Auto-publicera + Kör
  │   └── index.ts               — Barrel exports
  │
  └── calendar/                  — Kalendervy
      ├── types.ts               — PlanSchedule, CalendarDay, CRUD-typer
      ├── hooks/
      │   ├── useCalendar.ts     — Kalendernavigation, grid-generering
      │   └── useSchedules.ts    — Schedule CRUD + dialog-state
      ├── components/
      │   ├── PlanCalendar.tsx    — Split-view: kalender + schema-lista
      │   ├── CalendarHeader.tsx  — Nav: prev/next/today + månad/vecka toggle
      │   ├── CalendarGrid.tsx    — Månads- eller veckvy-grid
      │   ├── CalendarDay.tsx     — Dag-cell med dots
      │   ├── ScheduleList.tsx    — Dagvy: scheman + "Schemalägg"-knapp
      │   ├── ScheduleCard.tsx    — Schema-kort: tid, plan, status, actions (React.memo)
      │   ├── PlanPickerModal.tsx — Välj plan att schemalägga (sökbar lista)
      │   └── index.ts
      ├── utils/
      │   ├── calendarUtils.ts   — Grid-generering, schedule-gruppering
      │   └── dateUtils.ts       — Datum-helpers
      └── index.ts
```

### Delade moduler (lib/planner/)

```
lib/planner/
  ├── state-machine.ts   — Plan status-övergångar (draft→published→modified→archived)
  ├── labels.ts          — Etiketter, färger, ikoner per block/status
  ├── dto.ts             — Zod-validering, API-scheman
  ├── scope.ts           — Scope-konfiguration (app vs admin)
  ├── analytics.ts       — Client-side beräkningar
  ├── ai-assist.ts       — AI-stub (inte exponerad i beta)
  ├── hooks/             — Delade hooks
  ├── server/
  │   └── snapshot/
  │       ├── types.ts              — PlanSnapshot, NormalizedBlock, GeneratedStep, SnapshotPreference
  │       ├── getPlanSnapshot.ts    — SSoT: getPlanSnapshot() + generateStepsFromBlocks()
  │       └── index.ts             — Barrel exports
  └── index.ts           — Barrel exports
```

---

## 4. Data Flow

### Publiceringsflöde (transparent för användaren)

```
Plan (draft)
  │
  ├─ Användare bygger: CRUD via /api/plans/[planId]/blocks
  │
  ├─ "Spara" → PATCH /api/plans/[planId] (namn/beskrivning)
  │
  └─ "Spara & Utför" →
       ├─ PATCH /api/plans/[planId] (om ändrat)
       ├─ POST /api/plans/[planId]/publish  ← auto, transparent
       │    └─ Skapar plan_version + plan_version_blocks (snapshot)
       ├─ Plan status → 'published'
       └─ Navigate → /app/play/plan/{planId}
            └─ PlayPlanPage: POST /api/play/[planId]/start
                 ├─ Om aktiv run finns → returnerar befintlig (idempotent)
                 └─ Annars → skapar ny run + run_steps
```

### Run Resume

```
GET /api/play/runs/active
  → Returnerar user's in_progress runs med planId (via plan_versions join)
  → Filtrerar bort stale runs: last_heartbeat_at >= now() - 24h OR IS NULL (legacy)

useActiveRuns() hook
  → Map: planId → { id, planId, currentStepIndex, startedAt }
  → PlanListItem: visa "Fortsätt" + "Pågår"-badge
  → ScheduleCard: visa "Fortsätt" permanent (ej hover-only)

Klick "Fortsätt" → /app/play/plan/{planId}
  → POST /api/play/{planId}/start returnerar befintlig run (resumed: true)
  → PlayPlanPage återställer steg från run.currentStepIndex + localStorage
```

### Run Safety — Heartbeat & Abandon (MS4.8)

```
PlayPlanPage mount:
  → Omedelbar heartbeat: POST /api/play/runs/{runId}/heartbeat
  → setInterval(30s): POST /api/play/runs/{runId}/heartbeat
  → Varje progress-sparning piggybackar heartbeat

Stale-detection (GET /api/play/runs/active):
  → .or('last_heartbeat_at.gte.{now-24h},last_heartbeat_at.is.null')
  → Runs utan heartbeat > 24h filtreras bort ("soft abandon")
  → legacy runs (last_heartbeat_at IS NULL) inkluderas för bakåtkompatibilitet

Explicit abandon:
  → "Avbryt körning"-knapp i PlayPlanPage (bekräftelsedialog)
  → POST /api/play/runs/{runId}/abandon
  → Sätter status = 'abandoned', completed_at = now()
  → Bara run owner, bara aktiva runs

API-endpoints (nya i MS4.8):
  POST /api/play/runs/[runId]/heartbeat  — uppdaterar last_heartbeat_at
  POST /api/play/runs/[runId]/abandon    — markerar run som abandoned

Client-API:
  sendRunHeartbeat(runId)  — fire-and-forget, errors silently swallowed
```

### Status State Machine

```
  draft ──────→ published ──→ modified ──→ published
    │               │            │              │
    └─→ archived ←──┘            └─→ archived ←─┘
         │
         └─→ draft (återställ)
```

### Kalenderflöde

```
Kalender → Välj dag → Klicka "Schemalägg"
  → PlanPickerModal öppnas (sökbar lista av egna planer)
  → Välj plan → POST /api/plans/schedules { planId, scheduledDate }
  → ScheduleCard visas på den dagen
  → Klicka [▶ Starta körning] → /app/play/plan/{planId}
```

---

## 5. Wizard Architecture

### 2-steg (v2.0 — implementerat 2026-03-04)

| Steg | Komponent | URL-param | Innehåll |
|------|-----------|-----------|----------|
| 1 | `StepBuildPlan` | `?step=build` | Blocklista (DnD, CRUD), GamePicker, ihopfällbara anteckningar (privat + tenant) |
| 2 | `StepSaveAndRun` | `?step=save-and-run` | Redigerbart namn/beskrivning, inline blockpreview, session-block ⚠️ varning, "Spara" + "Spara & Utför" |

### Legacy URL-mapping

```typescript
LEGACY_STEP_MAP = {
  grund: 'build',        // gamla steg 1
  bygg: 'build',         // gamla steg 2
  anteckningar: 'build',  // gamla steg 3
  granska: 'save-and-run', // gamla steg 4
  kor: 'save-and-run',    // gamla steg 5
}
```

Hanteras av `resolveStep()` i `features/planner/wizard/types.ts` och `usePlanWizard`.

### Wizard State

URL-driven via `?step=` searchParam. Ingen global state — `usePlanWizard` hook läser/skriver URL.

---

## 6. Calendar Architecture

### Komponenter

- **PlanCalendar**: Split-view layout (kalender + dagvy). Desktop: `grid lg:grid-cols-[1fr_380px]`
- **CalendarGrid**: Renderar månads- eller vecko-grid. Varje dag visar dots (blå = schemalagd, grön = genomförd)
- **ScheduleList**: Dagvyn. "Schemalägg"-knapp → öppnar PlanPickerModal
- **PlanPickerModal**: Dialog med sökbar lista av användarens planer. Välj plan → skapar schedule via API

### Hooks

- **useCalendar**: Navigation (prev/next/today), grid-generering, visibleRange för API
- **useSchedules**: CRUD + dialog-state (`openCreateDialog`, `openEditDialog`, `closeDialog`)

### API

| Endpoint | Metod | Användning |
|----------|-------|------------|
| `/api/plans/schedules` | GET | Hämta scheman med datumfilter |
| `/api/plans/schedules` | POST | Skapa nytt schema |
| `/api/plans/schedules/[id]` | PUT | Uppdatera schema |
| `/api/plans/schedules/[id]` | DELETE | Ta bort schema |

---

## 7. Data Model

### Kärntabeller

```
plans                     plan_blocks              plan_versions
  id (PK)                   id (PK)                  id (PK)
  name                      plan_id (FK)             plan_id (FK)
  description               position                 version_number
  visibility (enum)         block_type (enum)        name, description
  status (enum)             game_id (FK, nullable)   published_at
  owner_user_id (FK)        duration_minutes         published_by
  owner_tenant_id (FK)      title, notes
  total_time_minutes        is_optional
  current_version_id (FK)   metadata (jsonb)
  metadata (jsonb)

plan_version_blocks       plan_schedules           runs
  id (PK)                   id (PK)                  id (PK)
  version_id (FK)           plan_id (FK)             user_id (FK)
  position                  scheduled_date           tenant_id (FK, nullable)
  block_type, game_id       scheduled_time           plan_version_id (FK)
  duration_minutes          status (enum)            status (enum)
  title, notes              recurrence_rule          current_step
                            notes, group_id          elapsed_seconds
                            completed_at             last_heartbeat_at (nullable)
                                                     metadata (jsonb)

plan_notes_private        plan_notes_tenant
  (per user, per plan)      (per tenant, per plan)
```

> **OBS:** `run_steps` existerar **inte** som tabell. Steg genereras i minnet via
> `getPlanSnapshot()` → `generateStepsFromBlocks()` (SSoT i `lib/planner/server/snapshot/`).
> Persistens kräver designbeslut (se MS6).

### Enums

```sql
plan_visibility_enum: 'private' | 'tenant' | 'public'
plan_status_enum: 'draft' | 'published' | 'modified' | 'archived'
plan_block_type_enum: 'game' | 'pause' | 'preparation' | 'custom' | 'section'
```

### RLS (implementerat i MS5 — migration `20260305100000_tenant_rls_planner.sql`)

**Aktuella policies (efter MS5 Tenant RLS):**

| Tabell | Policies | Logik |
|--------|----------|-------|
| `plans` | `plans_select/insert/update/delete` | ✅ Owner + tenant-visible + public + admin |
| `plan_blocks` | `plan_blocks_select/insert/update/delete` | ✅ Kaskad via `plan_id IN (SELECT id FROM plans)` |
| `plan_versions` | `plan_versions_select/insert` | ✅ Kaskad via `plan_id IN (SELECT id FROM plans)` |
| `plan_version_blocks` | `plan_version_blocks_select/insert` | ✅ Kaskad via `plan_version_id IN (SELECT id FROM plan_versions)` |
| `plan_schedules` | `plan_schedules_select/insert/update/delete` | ✅ Kaskad via plans + own schedules |
| `plan_notes_private` | `plan_notes_private_manage` | ✅ Owner-only (oförändrad) |
| `plan_notes_tenant` | `plan_notes_tenant_select/insert/update/delete` | ✅ Tenant-medlem + plan synlig |
| `runs` | `runs_select/insert/update` | ✅ Per-operation, insert kräver synlig plan_version |

**SQL helper-funktioner (befintliga):**
- `is_tenant_member(p_tenant_id)` — SECURITY DEFINER, checkar `user_tenant_memberships`
- `get_user_tenant_ids()` — Returnerar alla tenant IDs för current user
- `has_tenant_role(p_tenant_id, role)` — Roll-check (admin/owner/member), `public.tenant_role_enum`
- `is_system_admin()` — System admin bypass

**Policy-principer (Q9, implementerade):**
- Inga `FOR ALL`-policies — separata SELECT/INSERT/UPDATE/DELETE per tabell
- Child-tabeller (blocks, versions, schedules) kaskad-filtreras via `plan_id IN (SELECT id FROM plans)`
- `runs_insert` kräver `plan_version_id IN (SELECT id FROM plan_versions)` — förhindrar run på osynlig plan
- `plans_select` stödjer tre visibilitetslägen: private (owner), tenant (is_tenant_member), public (alla)

---

## 8. i18n Structure

**Enda källa:** `messages/{sv,en,no}.json` under `planner.*`

Nyckelgrupper:
- `planner.actions.*` — Knappar (save, cancel, preview, edit, saveAndRun, etc.)
- `planner.statusLabels.*` — draft, published, modified, archived
- `planner.filters.*` — all, draft, published, etc.
- `planner.sort.*` — newest, oldest, aToZ, zToA
- `planner.scopeTabs.*` — mine, org, global, comingSoon
- `planner.wizard.*` — Wizard-specifik text (steg, navigation, calendar)
- `planner.wizardSteps.*` — buildPlan, saveAndRun
- `planner.success.*` — saved, published, deleted, etc.
- `planner.warnings.*` — archivedPlan, planChangedSinceRun, sessionBlockNotSupported
- `planner.errors.*` — deleteFailed, copyFailed, loadFailed, etc.
- `planner.runStatus.*` — inProgress, lastActive

**Tidigare parallellt system** (`lib/planner/locales.json` + `lib/planner/i18n.ts`) är **borttaget** — var 100% död kod.

---

## 9. Feature Flags

| Flagga | Default | Beskrivning |
|--------|---------|-------------|
| `planner_v2` | `true` | Planner v2.0 aktiverad |
| `planner_calendar` | `true` | Kalendervy aktiverad |
| `planner_gestures` | `true` | Touch-gester (swipe, long-press) |

---

## 10. Modulberoenden

```
App pages → features/planner/ → lib/planner/ → types/planner.ts
                               → lib/context/TenantContext (useTenant)
                               → components/ui/* (shadcn)
                               → @dnd-kit/sortable (DnD)
                               → next-intl (i18n)
                               → @heroicons/* (ikoner)

features/planner/api.ts → /api/plans/* (API routes)
                        → /api/play/* (run routes)

API routes → lib/supabase/ → Supabase RLS
```

---

## 11. Session Integration (MS6 — backend spine implementerad)

> **Status:** Backend spine klar 2026-03-04. UI (SessionCockpit) kvarstår.
> **Princip:** Run är "master timeline". Session är en "sub-run" — orchestrerad av run_sessions, inte tvärtom.

### Block-typ: `session_game`

```sql
-- DB-ändring (implementerad i migration 20260305200000_run_sessions.sql)
ALTER TYPE plan_block_type_enum ADD VALUE IF NOT EXISTS 'session_game';

CREATE TABLE run_sessions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id      uuid        NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  step_index  integer     NOT NULL,
  session_id  uuid        REFERENCES participant_sessions(id) ON DELETE SET NULL,
  status      text        NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'active', 'completed', 'ended', 'abandoned')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (run_id, step_index)
);
-- RLS: SELECT/INSERT/UPDATE/DELETE cascade via runs ownership
```

**plan_blocks metadata** (för `session_game`):

```json
{
  "session": {
    "v": 1,
    "gameId": "uuid",
    "playMode": "participants",
    "autoCreate": true
  }
}
```

### Snapshot: session detection

`getPlanSnapshot()` → `generateStepsFromBlocks()` sätter per steg:

```typescript
step.requiresSession: boolean  // true om session_game ELLER game med playMode=participants
step.sessionSpec?: { gameId: string; autoCreate: boolean }
```

**playMode-propagering:**
- Draft: `games.play_mode` hämtas direkt
- Published: `game_snapshot.playMode` fryst vid publish

### Runtime-flöde

```
Starta run (POST /api/play/[planId]/start)
  │
  ├─ game/pause/custom/section block → vanlig step
  │
  └─ session_game block → step med requiresSession: true
       └─ upsertRunSession(run_id, step_index) → run_sessions rad (session_id=null)

Lekledaren når session-steget i PlayPlanPage:
  │
  ├─ session_id saknas i run_sessions?
  │    → POST /api/sessions (skapa participant_session)
  │    → UPDATE run_sessions SET session_id = ..., status = 'active'
  │
  ├─ Visa Lobby: kod/QR + "X anslutna" + status
  │
  ├─ Deltagare ansluter via befintligt session-system
  │
  └─ Avsluta:
       ├─ session.status = ended → auto-complete run_session
       └─ "Avsluta & gå vidare" → force-end session + complete run_session
```

### Completion-semantik

Run session är "completed" när:
- `participant_session.status = 'ended'`, **eller**
- Lekledaren trycker "Avsluta och gå vidare" (force-end)

### Resume/refresh

Om `run_sessions` redan har en rad för `(run_id, step_index)` → återanvänd (UNIQUE constraint förhindrar dubbletter). Start-route gör idempotent upsert med `ignoreDuplicates: true`.

### Kopplingsmodell

**Implementerad (MS6):** `run_sessions`-tabell (Q10 Option C). Minimal, querybar, utökningsbar.

**Robust (framtid):** Om multi-session per steg, retries eller audit trail behövs → utöka `run_sessions` med extra kolumner istället för ny tabell.

### Acceptance Criteria (MS6)

- [x] `session_game` tillagd i `plan_block_type_enum` ✅
- [x] `run_sessions`-tabell med RLS, UNIQUE constraint, indexes ✅
- [x] Snapshot: `requiresSession` + `sessionSpec` per steg ✅
- [x] Start-route: idempotent upsert av `run_sessions` ✅
- [x] `playMode` propageras genom snapshot (draft + published) ✅
- [x] i18n + block labels + UI ikoner ✅
- [x] `session_game` kan läggas till i plan (GamePicker med play_mode-filter) ✅
- [x] PlayPlanPage: RunSessionCockpit inline (kod, status, deltagare, "Öppna sessionsvyn") ✅
- [x] POST /api/play/runs/:runId/sessions: skapa participant_session, uppdatera run_sessions ✅
- [x] Lekledaren kan avsluta session och gå vidare (force-end) ✅ (MS7.2, 2026-03-05)
- [x] RunSessionCockpit: QR-kod, join-länk, copy, polling (30s fallback), terminal guardrails ✅ (MS8, 2026-03-05)
- [x] Director Mode länk: `/app/play/sessions/{id}` öppnas i ny flik ✅ (MS8, 2026-03-05)
- [x] Realtime Presence: broadcast `participants_changed` on join → host subscribar via Supabase Realtime, debounce 400ms ✅ (MS9, 2026-03-05)
- [x] Live session status: broadcast `state_change` på alla statusändringar (3 routes), optimistisk UI-update i cockpit ✅ (MS9.2, 2026-03-04)
- [x] Director Realtime State: timer/board via seq-guard (ingen REST-storm), gap detection, on-SUBSCRIBED sync, timer countdown + board display ✅ (MS10, 2026-03-04)
- [x] Refresh/resume: befintlig session återanvänds (UNIQUE constraint + fetchRunSession) ✅
- [x] NavigationControls: "Nästa" blockeras om session ej startad ✅

---

*Denna fil är en stabil arkitektur-referens. Uppdateras bara vid verkliga arkitekturförändringar.*
