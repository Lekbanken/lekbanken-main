# PLANNER – INVENTERING & GAP-ANALYS

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2025-12-30
- Last updated: 2026-03-21
- Last validated: -

> Frozen audit snapshot of planner inventory and gap analysis prior to later architecture work.

**Status:** Facitdokument för arkitekturarbete  
**Datum:** 2025-12-30  
**Syfte:** Exakt nulägesbild, avvecklingslista, saknade begrepp – INGEN lösningsdesign

---

## 🧩 DEL 1 — VAD SOM FINNS IDAG (VERIFIERAT)

### 1.1 Frontend (Planner / Play)

#### Sidor (Routes)

| Fil | Route | Beskrivning |
|-----|-------|-------------|
| `app/app/planner/page.tsx` | `/app/planner` | Wrapper → `PlannerPage` |
| `app/app/planner/[planId]/page.tsx` | `/app/planner/[planId]` | SSR-detaljvy → `PlanOverview` |
| `app/app/play/plan/[planId]/page.tsx` | `/app/play/plan/[planId]` | Uppspelning → `PlayPlanPage` |

#### Huvudkomponenter

| Komponent | Fil | Ansvar |
|-----------|-----|--------|
| `PlannerPage` | `features/planner/PlannerPage.tsx` | Huvudcontainer, state-hantering, API-anrop |
| `SessionEditor` | `features/planner/components/SessionEditor.tsx` | Redigering av plan, blocks, notes, visibility |
| `SessionList` | `features/planner/components/SessionList.tsx` | Lista med planer, skapa-knapp |
| `BlockRow` | `features/planner/components/GameRow.tsx` | Enskilt block med dropdown-meny |
| `AddGameButton` | `features/planner/components/AddGameButton.tsx` | Dropdown för lägg till block |
| `PlanOverview` | `features/planner/components/PlanOverview.tsx` | Read-only planöversikt |
| `PlannerPageLayout` | `features/planner/components/PlannerPageLayout.tsx` | Layout-wrapper med header |
| `PlayPlanPage` | `features/play/PlayPlanPage.tsx` | Uppspelning med steg-navigation och timer |

#### UI-funktioner (verifierade)

| Funktion | Implementation | Status |
|----------|----------------|--------|
| Drag-and-drop reorder | Native HTML5 DnD i `SessionEditor` | ✅ Fungerar |
| Debounced title/description | `setTimeout` 300ms i `handleTitleChange/handleNotesChange` | ✅ Fungerar |
| Visibility switcher | `VisibilitySwitcher` komponent med 3 knappar | ✅ Fungerar |
| Game search | Inline i `SessionEditor`, anropar `/api/games/search` | ✅ Fungerar |
| Move up/down | Via `BlockRow` dropdown → `onReorderBlocks` | ✅ Fungerar |
| "Starta plan" knapp | Sticky footer, länk till `/app/play/plan/[id]` | ✅ Fungerar |
| Privata anteckningar | Textarea + manuell "Spara"-knapp | ✅ Fungerar |
| Tenant-anteckningar | Visas endast om `visibility !== 'private'` | ✅ Fungerar |

#### Progress-hantering i Play

| Aspekt | Implementation |
|--------|----------------|
| Lokal state | `localStorage` med key `play-plan:[planId]` |
| Server-state | `plan_play_progress` tabell via `/api/plans/[planId]/progress` |
| Synk-strategi | Debounced POST (800ms) efter state-ändring |
| Restore-flöde | Först `localStorage`, sedan API-fallback |
| Timer state | Client-side `setInterval`, persisteras i metadata |

### 1.2 API & Server

#### API Routes (fullständig lista)

| Route | Metoder | Fil |
|-------|---------|-----|
| `POST /api/plans` | CREATE | `app/api/plans/route.ts` |
| `POST /api/plans/search` | SEARCH/LIST | `app/api/plans/search/route.ts` |
| `GET /api/plans/[planId]` | READ | `app/api/plans/[planId]/route.ts` |
| `PATCH /api/plans/[planId]` | UPDATE | `app/api/plans/[planId]/route.ts` |
| `POST /api/plans/[planId]/visibility` | UPDATE VISIBILITY | `app/api/plans/[planId]/visibility/route.ts` |
| `POST /api/plans/[planId]/blocks` | CREATE BLOCK | `app/api/plans/[planId]/blocks/route.ts` |
| `PATCH /api/plans/[planId]/blocks/[blockId]` | UPDATE BLOCK | `app/api/plans/[planId]/blocks/[blockId]/route.ts` |
| `DELETE /api/plans/[planId]/blocks/[blockId]` | DELETE BLOCK | `app/api/plans/[planId]/blocks/[blockId]/route.ts` |
| `POST /api/plans/[planId]/blocks/reorder` | BULK REORDER | `app/api/plans/[planId]/blocks/reorder/route.ts` |
| `POST /api/plans/[planId]/notes/private` | UPSERT PRIVATE NOTE | `app/api/plans/[planId]/notes/private/route.ts` |
| `POST /api/plans/[planId]/notes/tenant` | UPSERT TENANT NOTE | `app/api/plans/[planId]/notes/tenant/route.ts` |
| `GET /api/plans/[planId]/play` | READ PLAY VIEW | `app/api/plans/[planId]/play/route.ts` |
| `GET /api/plans/[planId]/progress` | READ PROGRESS | `app/api/plans/[planId]/progress/route.ts` |
| `POST /api/plans/[planId]/progress` | UPSERT PROGRESS | `app/api/plans/[planId]/progress/route.ts` |

#### Server-logik

| Fil | Funktioner | Används av |
|-----|------------|------------|
| `lib/services/planner.server.ts` | `fetchPlanWithRelations`, `buildPlayView`, `toPlannerPlan`, `recalcPlanDuration` | Alla `/api/plans/*` routes |
| `lib/validation/plans.ts` | `validatePlanPayload`, `validatePlanBlockPayload` | API routes vid create/update |

#### Data-mappning DB → UI

```
DB: plans + plan_blocks + plan_notes_* 
  ↓ (fetchPlanWithRelations)
Server Model: PlanWithRelations
  ↓ (buildPlanModel / toPlannerPlan)  
API Response: PlannerPlan
  ↓ (fetch i features/planner/api.ts)
Client State: PlannerPlan[]
```

### 1.3 Datamodell

#### Tabeller (aktiva, verifierade)

| Tabell | Skapad i | Används aktivt |
|--------|----------|----------------|
| `plans` | `20251129000000_initial_schema.sql` | ✅ Ja |
| `plan_blocks` | `20251129000000_initial_schema.sql` | ✅ Ja |
| `plan_notes_private` | `20251208120000_planner_modernization.sql` | ✅ Ja |
| `plan_notes_tenant` | `20251208120000_planner_modernization.sql` | ✅ Ja |
| `plan_play_progress` | `20251208120000_planner_modernization.sql` | ✅ Ja |
| `plan_games` | `20251129000000_initial_schema.sql` | ⚠️ **LEGACY** – finns i schema men ej i UI-flöden |

#### `plans` – fält

| Fält | Typ | Källa |
|------|-----|-------|
| `id` | uuid | initial |
| `plan_key` | text | initial |
| `name` | text | initial |
| `description` | text | initial |
| `owner_user_id` | uuid FK | initial |
| `owner_tenant_id` | uuid FK | initial |
| `visibility` | plan_visibility_enum | initial |
| `total_time_minutes` | integer | initial |
| `metadata` | jsonb | modernization |
| `created_by` | uuid FK | modernization |
| `updated_by` | uuid FK | modernization |
| `created_at` | timestamptz | initial |
| `updated_at` | timestamptz | initial |

#### `plan_blocks` – fält

| Fält | Typ | Källa |
|------|-----|-------|
| `id` | uuid | initial |
| `plan_id` | uuid FK | initial |
| `position` | integer | initial |
| `block_type` | plan_block_type_enum | initial→modernization (enum) |
| `game_id` | uuid FK | initial |
| `duration_minutes` | integer | initial |
| `notes` | text | initial |
| `title` | text | modernization |
| `metadata` | jsonb | modernization |
| `is_optional` | boolean | modernization |
| `created_by` | uuid FK | modernization |
| `updated_by` | uuid FK | modernization |
| `created_at` | timestamptz | initial |

#### Enums

| Enum | Värden |
|------|--------|
| `plan_visibility_enum` | `'private'`, `'tenant'`, `'public'` |
| `plan_block_type_enum` | `'game'`, `'pause'`, `'preparation'`, `'custom'` |
| `plan_run_status_enum` | `'not_started'`, `'in_progress'`, `'completed'`, `'abandoned'` |

#### Triggers

| Trigger | Tabell | Funktion |
|---------|--------|----------|
| `plan_blocks_recalc_plan_total_time_minutes_ins` | `plan_blocks` | `trg_plan_blocks_recalc_plan_total_time_minutes()` |
| `plan_blocks_recalc_plan_total_time_minutes_del` | `plan_blocks` | `trg_plan_blocks_recalc_plan_total_time_minutes()` |
| `plan_blocks_recalc_plan_total_time_minutes_upd` | `plan_blocks` | `trg_plan_blocks_recalc_plan_total_time_minutes()` |

#### RLS-policies (aktiva)

| Policy | Tabell | Typ |
|--------|--------|-----|
| `users_can_select_plans` | `plans` | SELECT |
| `users_can_insert_plans` | `plans` | INSERT |
| `users_can_update_own_plans` | `plans` | UPDATE |
| `users_can_delete_own_plans` | `plans` | DELETE |
| `users_can_select_plan_blocks` | `plan_blocks` | SELECT |
| `manage_plan_blocks` | `plan_blocks` | ALL (owner) |
| `manage_private_plan_notes` | `plan_notes_private` | ALL (owner) |
| `manage_tenant_plan_notes` | `plan_notes_tenant` | ALL (tenant member) |
| `manage_plan_play_progress` | `plan_play_progress` | ALL (user-scoped) |

### 1.4 Roller & Access

#### Hur roller beräknas idag

| Kontext | Källa | Implementation |
|---------|-------|----------------|
| **Client (PlannerPage)** | `useAuth().effectiveGlobalRole` | Direkt jämförelse `=== 'system_admin'` |
| **API (visibility route)** | `deriveEffectiveGlobalRole()` från `lib/auth/role.ts` | Läser `users.global_role` + `user.app_metadata` |
| **RLS (DB-nivå)** | `auth.uid()` + helper-funktioner | `get_user_tenant_ids()`, `is_global_admin()` |

#### Vad styr visibility

| Visibility | Vem kan se | Vem kan skriva |
|------------|-----------|----------------|
| `private` | Endast owner (`owner_user_id`) | Endast owner |
| `tenant` | Owner + tenant-medlemmar | Owner (plan), tenant-medlemmar (tenant notes) |
| `public` | Alla autentiserade | Endast owner |

#### Guardrail: public visibility

```typescript
// lib/validation/plans.ts
if (payload.visibility === 'public' && !options.isSystemAdmin) {
  errors.push('public visibility requires system admin')
}
```

#### Kända inkonsekvenser

1. **Client vs Server roll-check:** Client använder `effectiveGlobalRole` från `useAuth()`, medan API använder `deriveEffectiveGlobalRole()`. Båda borde ge samma resultat men har olika kodvägar.

2. **Ingen tenant-roll-check för plan-skrivning:** RLS för `plans` baseras på `owner_user_id`, inte tenant-roll. En tenant-admin kan inte redigera andras planer även om de är `visibility: tenant`.

3. **`isSystemAdmin` i PlannerPage:** Använder `isSystemAdmin()` utility med old signature (`user, userProfile?.global_role`) i vissa fall – inkonsekvent.

---

## 🗑️ DEL 2 — VAD SOM BÖR TAS BORT / AVVECKLAS

### 2.1 Tekniska mönster som är skadliga

#### 2.1.1 Global error state utan granularitet

**Var:** `PlannerPage.tsx` rad 17, 34, 60, 66, 72, etc.

**Problem:**
```typescript
const [error, setError] = useState<string | null>(null);
// ...
setError("Kunde inte uppdatera plan");
```

En enda `error`-state för hela sidan. Om en block-operation misslyckas återrenderas ErrorState för hela Planner och användaren förlorar kontext.

**Bör:** Ersättas med action-level feedback (toast eller inline-fel per operation).

---

#### 2.1.2 Dubbel duration-beräkning (client + server)

**Var:**
- Client: `SessionEditor.tsx` rad 89-96 (`totalDuration` computed)
- Server: `planner.server.ts` rad 83-91 (`computeTotalDuration`)
- DB: Trigger `trg_plan_blocks_recalc_plan_total_time_minutes`

**Problem:** Samma beräkning görs på tre ställen. Client-värdet kan bli stale om DB-triggern inte körts.

**Bör:** Endast lita på `plans.total_time_minutes` från server. Client-beräkning bör endast vara optimistisk hint.

---

#### 2.1.3 Manuell "Spara"-knapp för notes som inte sparar automatiskt

**Var:** `SessionEditor.tsx` rad 354-367, 379-392

**Problem:** 
- Plan title/description sparas med debounce automatiskt
- Private/tenant notes kräver manuell "Spara"-klick
- Inkonsekvent UX, risk för dataförlust vid navigation

**Bör:** Antingen consistent manuell save för allt, eller auto-save för allt.

---

#### 2.1.4 Full plan re-fetch efter varje mutation

**Var:** Alla block-operationer returnerar `{ plan: PlannerPlan }` med komplett plan inkl. alla blocks.

**Problem:** 
- N+1-liknande overhead – ändra ett block → ladda om alla blocks
- Skalerar dåligt med många blocks
- `updatePlanState()` ersätter hela plan-objektet

**Bör:** Returnera endast ändrad entitet, låt client uppdatera lokalt.

---

#### 2.1.5 localStorage + API dubbel-persistering för progress

**Var:** `PlayPlanPage.tsx` rad 269-298

**Problem:**
- Skriver till både `localStorage` och API vid varje state-ändring
- Debounce på 800ms kan ändå orsaka race conditions
- Ingen konflikthantering om localStorage och API har olika värden

**Bör:** Välj en primär källa, använd den andra som fallback/sync.

---

### 2.2 Koncept som bör avvecklas

#### 2.2.1 `plan_games` tabell (LEGACY)

**Var:** `supabase/migrations/20251129000000_initial_schema.sql` rad 244-254

**Status:** 
- Finns i schema
- Har index och RLS
- Används av `lib/db/plans.ts` (7 ställen)
- **Används INTE av aktuellt UI-flöde** – allt går via `plan_blocks`

**Problem:** Två parallella sätt att representera "lekar i en plan":
- `plan_games`: legacy M:M relation
- `plan_blocks`: moderna block-modellen

**Bör:** `plan_games` bör avvecklas. All kod som refererar den i `lib/db/plans.ts` är oanvänd dead code.

---

#### 2.2.2 `lib/db/plans.ts` – hela filen?

**Var:** `lib/db/plans.ts` (434 rader)

**Status:** 
- Exporterar funktioner som `getPlanById`, `getPlansForUser`, `duplicatePlan`, etc.
- **Importeras ALDRIG av någon annan fil** (grep returnerar 0 träffar)
- `lib/db/index.ts` re-exporterar den, men ingen consumer

**Problem:** 434 rader död kod som underhålls utan nytta.

**Bör:** Antingen avvecklas helt eller integreras i planner.server.ts om någon funktion behövs (t.ex. `duplicatePlan`).

---

#### 2.2.3 Separat "Spara"-knapp i footer

**Var:** `SessionEditor.tsx` rad 400-403

```tsx
<Button variant="outline" className="h-12 gap-2">
  <BookmarkIcon className="h-4 w-4" />
  <span className="hidden sm:inline">Spara</span>
</Button>
```

**Problem:** 
- Har ingen `onClick`-handler
- Gör ingenting
- Förvirrar användare

**Bör:** Ta bort eller implementera funktionalitet.

---

#### 2.2.4 `onUpdateBlock` som aldrig anropas

**Var:** `SessionEditor.tsx` rad 52

```tsx
onUpdateBlock: _onUpdateBlock, // prefixed with _ = unused
```

**Problem:** Prop tas emot men används aldrig i komponenten. Block-redigering finns inte implementerat.

**Bör:** Antingen implementera eller ta bort från props.

---

### 2.3 Ansvar som ligger fel

#### 2.3.1 Client beräknar duration istället för att lita på server

**Var:** `SessionEditor.tsx` rad 89-96

**Problem:** Server beräknar och sparar `total_time_minutes` via trigger. Client räknar om samma sak.

**Bör:** Client visar `plan.totalTimeMinutes` från server-response direkt.

---

#### 2.3.2 Planner hanterar runtime-state (progress)

**Var:** `/api/plans/[planId]/progress` + `PlayPlanPage` localStorage

**Problem:** 
- Progress-hantering är ett Play-domän-ansvar
- `plan_play_progress` tabellen är för "Planner" men används för Play-uppspelning
- Namngivning är förvirrande – är det plan-progress eller play-progress?

**Bör:** Definiera tydligare gräns:
- **Planner:** författar plan-innehåll
- **Play:** äger runtime/session-state

---

#### 2.3.3 PlayPlanPage mappar plan → steps internt

**Var:** `PlayPlanPage.tsx` rad 62-94 (`mapPlanToRun`)

**Problem:**
- Play-domänen transformerar planner-data till egen modell
- Logiken för att extrahera steps från `game_translations.instructions` sker i client
- Samma logik finns i server (`mapInstructionsToSteps` i planner.server.ts)

**Bör:** Server bör leverera färdig "run"-struktur. Client ska inte tolka data.

---

#### 2.3.4 Visibility-validering i client OCH server

**Var:** 
- Client: `PlannerPage.tsx` rad 19 (`canSetPublic`)
- Server: `lib/validation/plans.ts` rad 39-41

**Problem:** Dubbel validering, kan gå ur synk.

**Bör:** Server är auktoritativ. Client bör endast använda UI-guard baserat på roll, inte duplicera validering.

---

## ➕ DEL 3 — VAD SOM SAKNAS

### 3.1 Saknade begrepp / entiteter

| Begrepp | Finns idag? | Behövs för |
|---------|-------------|------------|
| **Template** | Nej | Återanvändbara plan-mallar |
| **Tagg/kategori** | Nej | Organisering och sök |
| **Folder/mapp** | Nej | Hierarkisk organisering |
| **Versionering** | Nej | Historik, rollback |
| **Audit log** | Nej | Compliance, felsökning |
| **Session/Run** | Delvis (`plan_play_progress`) | Tydlig separation plan vs genomförande |
| **Collaborator** | Nej | Dela plan med specifika användare |
| **Schedule** | Nej | Koppla plan till datum |

### 3.2 Saknade systemegenskaper

| Egenskap | Nuläge | Problem |
|----------|--------|---------|
| **Konsekvent RBAC** | Tre olika roll-system (client, API, RLS) | Risk för inkonsekvens |
| **Server-ägda invariants** | Duration räknas på tre ställen | Data kan bli stale |
| **Pagination i sökning** | Hårdkodad `pageSize: 50` | Skalerar inte |
| **DELETE för planer** | Finns i RLS men exponeras ej i API/UI | Användare kan inte radera |
| **Optimistic updates** | Partiellt (drag/drop) | Inkonsekvent UX |
| **Error boundaries** | Endast global ErrorState | Ingen graceful degradation |
| **Bulk-operationer** | Endast reorder | Kan inte bulk-delete/move |

### 3.3 Saknade UX-principer

| Princip | Nuläge | Problem |
|---------|--------|---------|
| **Action-level feedback** | Global error state | Förstör hela vy vid småfel |
| **Undo/Redo** | Saknas helt | Ingen felåterställning |
| **Progressive disclosure** | Allt synligt direkt | Överbelastat UI |
| **Confirm destructive actions** | Saknas | Block raderas utan bekräftelse |
| **Empty states** | Finns för tom planlista | Saknas för andra scenarier |
| **Loading states per action** | Endast global | Ingen lokal feedback |
| **Keyboard navigation** | Saknas | Tillgänglighetsbrist |

---

## 📌 DEL 4 — TERMINOLOGI & ANSVAR

### Terminologi-tabell

| Begrepp | Finns idag? | Betydelse idag | Problem | Måste finnas i målbild? |
|---------|-------------|----------------|---------|-------------------------|
| `Plan` | ✅ | Container för ordnade blocks | Oklart om det är "mall" eller "instans" | ✅ Ja, men definiera roll |
| `Block` | ✅ | Element i plan (game/pause/etc) | Ok | ✅ Ja |
| `BlockType` | ✅ | Enum: game/pause/preparation/custom | Ok | ✅ Ja |
| `Visibility` | ✅ | private/tenant/public | Korrekt men tenant-skrivlogik saknas | ✅ Ja |
| `Template` | ❌ | – | Behövs för återanvändning | ✅ Ja |
| `Session` / `Run` | ⚠️ Förvirrande | `plan_play_progress` blandar | Behöver renodlas | ✅ Ja – Play-ägd |
| `Progress` | ⚠️ | Både plan-progress och play-progress | Otydlig ägare | ⚠️ Klargör eller döp om |
| `PlannerPlan` | ✅ | TypeScript-typ för client/API | Ok | ✅ Ja |
| `PlannerPlayView` | ✅ | Projektion för uppspelning | Ok men namn är förvirrande | ✅ Ja, ev. döp om |
| `Note` | ✅ | Private eller tenant-delad text | Ok | ✅ Ja |
| `TotalDuration` | ✅ | Summerad tid för plan | Beräknas på 3 ställen | ✅ Ja – endast server |
| `PlayPlanPage` | ✅ | Komponent för uppspelning | Tillhör Play-domän, inte Planner | ✅ Flytta till Play |
| `plan_games` | ⚠️ Legacy | M:M plan↔games | Oanvänd, ersatt av plan_blocks | ❌ Avveckla |

### Ansvarsmatris

| Ansvarsområde | Nuvarande ägare | Problem | Rätt ägare |
|---------------|-----------------|---------|------------|
| Plan CRUD | Planner | Ok | Planner |
| Block CRUD | Planner | Ok | Planner |
| Notes | Planner | Ok | Planner |
| Visibility-regler | Planner + RLS | Ok | Planner + RLS |
| Duration-beräkning | Client + Server + DB | Dubbel/trippel | **Endast DB-trigger** |
| Play-progress | Planner API | Fel domän | **Play-domän** |
| Timer-state | PlayPlanPage (client) | Ok | Play-domän |
| Step-mappning | Client + Server | Dubbel | **Endast Server** |
| Game search | SessionEditor | Ok men inline | Ev. extrahera |

---

## ✅ SAMMANFATTNING

### Behålla

1. Grundläggande datamodell: `plans`, `plan_blocks`, `plan_notes_*`
2. Block-typer och visibility enum
3. API-struktur med separata routes
4. `planner.server.ts` som server-logik
5. RLS-policies (med justeringar)
6. DB-trigger för duration

### Ta bort / Avveckla

1. `plan_games` tabell och relaterad kod
2. `lib/db/plans.ts` (hela filen är död kod)
3. Client-beräkning av totalDuration
4. Oanvänd "Spara"-knapp i footer
5. `onUpdateBlock` prop som inte används
6. Global error state-mönster

### Saknas (måste adresseras i målarkitektur)

1. Template-begrepp
2. Konsekvent RBAC utan duplicering
3. Tydlig gräns Planner vs Play
4. Action-level feedback
5. DELETE plan i UI
6. Pagination/sökning som skalar
7. Undo/Redo

---

*Detta dokument är facit för nästa steg: arkitekturdesign.*
