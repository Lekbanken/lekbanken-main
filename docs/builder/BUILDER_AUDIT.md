# Game Builder Audit

**Datum:** 2026-02-01  
**Status:** KOMPLETT AUDIT (7 delar)

---

## Innehåll

1. [Entry Points & Routing](#1-entry-points--routing)
2. [Domain Model (GameDraft / Schema)](#2-domain-model-gamedraft--schema)
3. [State Management & Event Pipeline](#3-state-management--event-pipeline)
4. [Persistence & Autosave](#4-persistence--autosave)
5. [Validation & Publish Pipeline](#5-validation--publish-pipeline)
6. [UX Flows (Kritiska Användarflöden)](#6-ux-flows-kritiska-användarflöden)
7. [Integrations & Import/Export Readiness](#7-integrations--importexport-readiness)

---

## 1. Entry Points & Routing

### Builder Boot Sequence

```
┌─────────────────────────────────────────────────────────────────┐
│                    BUILDER ENTRY POINTS                          │
└─────────────────────────────────────────────────────────────────┘

Route 1: SKAPA NY LEK
/admin/games → "Ny i Builder" → /admin/games/new

  app/admin/games/new/page.tsx
    ↓ (Server Component)
  requireSystemAdmin('/admin')
    ↓
  <GameBuilderPage />  (no gameId)
    ↓
  useGameBuilder({ gameId: undefined })
    ↓
  createInitialHistory() → tom state

Route 2: REDIGERA BEFINTLIG LEK
/admin/games → klicka på lek → /admin/games/[gameId]/edit

  app/admin/games/[gameId]/edit/page.tsx
    ↓ (Client Component med use())
  <SystemAdminClientGuard>
    ↓
  <GameBuilderPage gameId={gameId} />
    ↓
  useGameBuilder({ gameId })
    ↓
  fetch('/api/games/builder/[id]') → ladda state
```

### Routes & Filer

| Route | Fil | Auth Guard | Syfte |
|-------|-----|------------|-------|
| `/admin/games` | [app/admin/games/page.tsx](../../app/admin/games/page.tsx) | `requireSystemAdmin` | Lista alla lekar, "Ny i Builder" knapp |
| `/admin/games/new` | [app/admin/games/new/page.tsx](../../app/admin/games/new/page.tsx) | `requireSystemAdmin` | Skapa ny lek (wraps GameBuilderPage) |
| `/admin/games/[gameId]/edit` | [app/admin/games/[gameId]/edit/page.tsx](../../app/admin/games/%5BgameId%5D/edit/page.tsx) | `SystemAdminClientGuard` | Redigera befintlig lek |

### Layouts/Providers

```
app/layout.tsx
  └── app/providers.tsx (NextIntlProvider, ThemeProvider, etc.)
      └── app/admin/layout.tsx (AdminLayout med sidebar)
          └── app/admin/games/[gameId]/edit/page.tsx
              └── GameBuilderPage.tsx (all state i denna komponent)
```

### Server/Client Boundaries

| Fil | Typ | Anledning |
|-----|-----|-----------|
| `app/admin/games/new/page.tsx` | Server | `requireSystemAdmin` är async server auth |
| `app/admin/games/[gameId]/edit/page.tsx` | Client | `use()` för att läsa params |
| `GameBuilderPage.tsx` | Client | `'use client'` - all interaktiv logik |
| `useGameBuilder.ts` | Client | React hook med useReducer |

---

## 2. Domain Model (GameDraft / Schema)

### Game Draft Spec v2

Buildern opererar på en "draft" som är en fullständig representation av ett spel i minnet. Denna draft synkas med databasen via API.

#### Core Types (från [types/game-builder-state.ts](../../types/game-builder-state.ts))

```typescript
interface GameBuilderState {
  core: CoreForm;              // Grundinfo (namn, beskrivning, status, etc.)
  steps: StepData[];           // Ordnade steg
  materials: MaterialsForm;    // Material & förberedelser
  phases: PhaseData[];         // Faser (för facilitated/participants)
  roles: RoleData[];           // Roller (för participants)
  artifacts: ArtifactFormData[]; // Artifakter (puzzles, kort, etc.)
  triggers: TriggerFormData[]; // Automation-regler
  boardConfig: BoardConfigData; // Publik tavla-konfiguration
  gameTools: GameToolForm[];   // Verktyg (timer, dice, etc.)
  subPurposeIds: string[];     // Sekundära syften
  cover: CoverMedia;           // Omslagsbild
}
```

#### Entitetsrelationer (DB-schema)

```
games (core)
├── game_steps (1:N, ordered by step_order)
│   └── phase_id (FK till game_phases, optional)
├── game_phases (1:N, ordered by phase_order)
├── game_roles (1:N, ordered by role_order)
├── game_artifacts (1:N, ordered by artifact_order)
│   └── game_artifact_variants (1:N per artifact)
├── game_triggers (1:N, ordered by sort_order)
│   └── condition/actions refererar till artifacts/steps/roles via ID
├── game_materials (1:1 per locale)
├── game_board_config (1:1 per locale)
├── game_tools (1:N)
├── game_media (1:N för cover/gallery)
└── game_secondary_purposes (N:M via join)
```

#### Versionering

| Fält | Värde | Betydelse |
|------|-------|-----------|
| `game_content_version` | `'v1'` | Legacy-format (före builder) |
| `game_content_version` | `'v2'` | Builder-format (nuvarande) |

#### Backward Compatibility

- **v1 → v2 migration**: Hanteras automatiskt vid laddning (steg konverteras)
- **Inget versionsfält i draft**: Draft är alltid v2-format
- **DB har ingen explicit versionskolumn för schema**: Bara `game_content_version` för innehåll

#### Schema Changes Risk

| Risk | Beskrivning | Mitigation |
|------|-------------|------------|
| **Artifact type changes** | Nya artifact_types läggs till men UI kanske saknar editor | Registry pattern i [types/games.ts](../../types/games.ts) |
| **Trigger condition changes** | Nya trigger-typer kan ha okända fält | Discriminated unions, fallback till `'manual'` |
| **Phase/Role additions** | Nya fält kan saknas i äldre drafts | Default-värden i normalizers |

---

## 3. State Management & Event Pipeline

### Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                    useGameBuilder HOOK                           │
│  [hooks/useGameBuilder.ts]                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   dispatch   │ →  │ historyReducer│ →  │   state      │       │
│  │   (action)   │    │              │    │   (current)  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │               │
│         │                   ▼                   │               │
│         │          ┌──────────────┐             │               │
│         │          │ BuilderHistory │            │               │
│         │          │ past | present | future    │               │
│         │          └──────────────┘             │               │
│         │                                       │               │
│         ▼                                       ▼               │
│  ┌──────────────┐                      ┌──────────────┐        │
│  │ scheduleCommit│ ← debounce 800ms    │ autosave     │        │
│  │ (text edits) │                      │ (1500ms)     │        │
│  └──────────────┘                      └──────────────┘        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Event-matris

Se [BUILDER_EVENT_MODEL.md](BUILDER_EVENT_MODEL.md) för fullständig matris.

| Action Type | State Mutation | History | Side Effects |
|-------------|----------------|---------|--------------|
| `SET_CORE` | `core` uppdateras | Nej (debounce) | scheduleCommit |
| `ADD_STEP` | `steps.push()` | **Ja** | - |
| `DELETE_STEP` | `steps.filter()` | **Ja** | - |
| `REORDER_STEPS` | splice/insert | **Ja** | - |
| `UPDATE_STEP` | `steps.map()` | Nej | - |
| `UNDO` | `past.pop() → present` | - | - |
| `REDO` | `future.shift() → present` | - | - |
| `LOAD_FROM_API` | Ersätt allt | Reset history | markClean |
| `COMMIT_TO_HISTORY` | - | Forcera commit | - |

### Deduplicering av Async

```typescript
// useGameBuilder.ts - autosave timeout ref
const autosaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  if (!onSave || !isDirty) return;
  
  // Cancel previous timeout
  if (autosaveTimeoutRef.current) {
    clearTimeout(autosaveTimeoutRef.current);
  }
  
  // Schedule new autosave
  autosaveTimeoutRef.current = setTimeout(() => {
    void onSave(state).then(() => markClean());
  }, autosaveDelay); // 1500ms default
  
  return () => { /* cleanup */ };
}, [state, onSave, autosaveDelay, isDirty, markClean]);
```

### Undo/Redo

| Funktion | Implementation |
|----------|----------------|
| Max history | `MAX_HISTORY_SIZE = 50` |
| Keyboard shortcuts | Ctrl+Z / Ctrl+Y (eller Ctrl+Shift+Z) |
| Text field handling | Browser hanterar undo i inputs |
| Committing actions | Strukturella ändringar (add/delete/reorder) |
| Non-committing | Text-uppdateringar (debounce → commit) |

---

## 4. Persistence & Autosave

### Persistence Contract

```
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
└─────────────────────────────────────────────────────────────────┘

Storage Location: Supabase PostgreSQL
Tables: games, game_steps, game_phases, game_roles, 
        game_artifacts, game_artifact_variants, game_triggers,
        game_materials, game_board_config, game_tools,
        game_media, game_secondary_purposes

INGEN localStorage för draft state (endast session storage)
```

### Save Flow

```
1. Användare gör ändring
   ↓
2. dispatch(action) → state uppdateras
   ↓
3. isDirty = true (state !== savedState)
   ↓
4. Debounce 1500ms (autosaveDelay)
   ↓
5. handleSave() i GameBuilderPage
   ↓
6. fetch(PUT /api/games/builder/[id])
   ↓
7. API: DELETE + INSERT för relaterade tabeller
   ↓
8. Response OK → setSaveStatus('saved'), markClean()
```

### Autosave Triggers

| Trigger | Delay | Behavior |
|---------|-------|----------|
| State change | 1500ms | Debounced autosave |
| Blur from text field | 800ms | COMMIT_TO_HISTORY |
| Manual "Spara utkast" | Immediate | handleSave() |
| Navigation away | **RISK** | Inget flush! |

### Konflikthantering

| Scenario | Nuvarande Behavior | Risk |
|----------|-------------------|------|
| Två tabbar | Last-write-wins | **HIGH** - data förloras |
| Stale draft | Ingen varning | **MEDIUM** - överskrivning |
| Concurrent edits | Ingen locking | **HIGH** - race condition |
| Network failure | saveStatus: 'error' | **MEDIUM** - retry möjligt |

### Risker

1. **Ingen optimistic locking** - Ingen `updated_at` check
2. **Ingen localStorage backup** - Om browser crashar förloras unsaved changes
3. **Ingen flush vid navigation** - `beforeunload` saknas
4. **Replace-all pattern** - DELETE + INSERT kan orsaka constraint violations

---

## 5. Validation & Publish Pipeline

### Validation Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                    VALIDATION PIPELINE                           │
└─────────────────────────────────────────────────────────────────┘

Layer 1: REAL-TIME (varje render)
├── validateGameRefs() → broken artifact/trigger refs
├── qualityState → required fields check
└── completedSections → progress tracking

Layer 2: ON PUBLISH
├── qualityState.allRequiredMet === true
├── validationResult.isValid === true
└── Ingen separat server-side validation

Layer 3: API-LEVEL
├── core.name required
├── core.short_description required
└── Enum validation (energy_level, location_type, etc.)
```

### Quality Checklist (QualityState)

```typescript
const qualityState: QualityState = {
  name: Boolean(core.name.trim()),
  shortDescription: Boolean(core.short_description.trim()),
  purposeSelected: Boolean(core.main_purpose_id),
  subPurposeSelected: subPurposeIds.length > 0,
  coverImageSelected: Boolean(cover.mediaId),
  hasStepsOrDescription: steps.length > 0 || Boolean(core.description.trim()),
  energyLevel: Boolean(core.energy_level),
  location: Boolean(core.location_type),
  allRequiredMet: Boolean(/*...*/),
  noValidationErrors: validationResult.isValid,
  reviewed: false, // Alltid false (ej implementerat)
};
```

### Validation Errors ([validateGameRefs.ts](../../app/admin/games/builder/utils/validateGameRefs.ts))

| Typ | Severity | Exempel |
|-----|----------|---------|
| Orphan artifact ref | error | Trigger refererar till raderad artifact |
| Orphan step ref | error | Artifact refererar till raderat steg |
| Orphan role ref | warning | Variant synlig för raderad roll |
| Unused artifact | warning | Artifact som aldrig triggas |

### Publish Flow

```
1. Klicka "Publicera"
   ↓
2. Check: qualityState.allRequiredMet?
   ↓ NEJ → setError('Saknar obligatoriska fält')
   ↓ JA
3. setCore({ status: 'published' })
   ↓
4. handleSave({ status: 'published' })
   ↓
5. API: UPDATE games SET status = 'published'
   ↓
6. DONE → Leken är publicerad
```

### Definition of Done för "Publish"

- [x] `name` ifyllt
- [x] `short_description` ifyllt
- [x] `main_purpose_id` valt
- [x] Cover image valt
- [x] Minst 1 steg ELLER description
- [x] Inga validation errors (broken refs)

---

## 6. UX Flows (Kritiska Användarflöden)

### Flow 1: Skapa Ny Lek

```
1. /admin/games → "Ny i Builder" knapp
2. → /admin/games/new
3. GameBuilderPage renderas med tom state
4. Fyll i namn + kort beskrivning
5. Första save (blur eller knapp) → POST /api/games/builder
6. Response → gameId → router.replace('/admin/games/[gameId]/edit')
7. Fortsätt redigera med PUT-anrop
```

**Edge cases:**
- Network failure vid första save → Error visas, ingen gameId
- Refresha innan save → Allting förloras (ingen draft i localStorage)

### Flow 2: Importera Template

```
STATUS: EJ IMPLEMENTERAT I BUILDER

Nuvarande import: /admin/games → "Importera" → CSV/JSON upload
Detta skapar games direkt i DB, inte via builder.

GAP: Ingen "Use as template" funktion i builder.
```

### Flow 3: Lägga till Phase/Step

```
1. Navigera till "Steg" eller "Faser" sektion
2. Klicka "Lägg till" knapp
3. dispatch({ type: 'ADD_STEP', payload: { id: makeId(), ... }})
4. historyReducer → push till past, uppdatera present
5. Ny rad renderas i listan
6. Autosave triggas efter 1500ms
```

**Edge cases:**
- Reorder via drag-drop → REORDER_STEPS action
- Delete → DELETE_STEP → confirmation dialog (saknas!)

### Flow 4: Redigera, Reorder, Delete

```
REDIGERA:
1. Klicka på item → drawer/modal öppnas
2. Ändra fält → dispatch UPDATE_* action
3. Close drawer → autosave

REORDER:
1. Drag item i listan
2. Drop → dispatch REORDER_* action
3. History commit (strukturell ändring)

DELETE:
1. Klicka delete-ikon
2. dispatch DELETE_* action  ⚠️ INGEN CONFIRMATION!
3. History commit
4. Autosave
```

**Risker:**
- Ingen delete confirmation → oavsiktlig radering
- Undo finns men inte tydligt visat i UI

### Flow 5: Preview/Playtest

```
STATUS: DELVIS IMPLEMENTERAT

1. Klicka "Förhandsgranska" i header
2. Button är disabled om gameId saknas
3. Ingen preview-route implementerad

GAP: Ingen live preview av spelet
```

### Flow 6: Spara, Lämna, Återkomma

```
SPARA:
1. Automatiskt via autosave (1500ms)
2. Manuellt via "Spara utkast" knapp

LÄMNA:
1. Navigera bort (link eller back)
2. ⚠️ INGEN beforeunload warning!
3. Osparade ändringar förloras

ÅTERKOMMA:
1. Navigera till /admin/games/[gameId]/edit
2. useEffect → fetch('/api/games/builder/[id]')
3. LOAD_FROM_API → state laddas från DB
4. Allt som sparades finns kvar
```

**Risker:**
- Ingen unsaved changes warning
- Ingen localStorage backup

### Flow 7: Publish + Rollback

```
PUBLISH:
1. Klicka "Publicera"
2. Validation check → allRequiredMet
3. handleSave({ status: 'published' })
4. games.status = 'published'

ROLLBACK:
STATUS: EJ IMPLEMENTERAT
GAP: Ingen "unpublish" funktion
GAP: Ingen version history / snapshots aktiverat
```

---

## 7. Integrations & Import/Export Readiness

### Current Import Capability

| Format | Endpoint | Status |
|--------|----------|--------|
| CSV | `/api/games/csv-import` | ✅ Fungerar |
| JSON | `/api/games/csv-import` (format: 'json') | ✅ Fungerar |

### Import → Builder Mapping

```
CSV/JSON Import
    ↓
parseCsvGames() / parseGamesFromJsonPayload()
    ↓
validateGames()
    ↓
INSERT direkt i DB (INTE via builder state)
    ↓
games, game_steps, game_artifacts, etc.

⚠️ PROBLEM: Importerade spel går inte via builder-normalisering
```

### Export Capability

```
STATUS: DELVIS

Nuvarande: Ingen dedicated export endpoint för builder format

Tillgängligt:
- GET /api/games/builder/[id] → returnerar all builder data
- Ingen CSV/JSON export-funktion i UI

GAP: Ingen "Exportera" knapp i builder
```

### Roundtrip Guarantee

```
JSON Import → DB → Builder Load → Builder Save → DB
     ↓                                              ↓
  Normaliseras                               Normaliseras
     via parser                              via GameBuilderPage

POTENTIELLA PROBLEM:
1. ID-hantering: Import genererar nya UUIDs, builder behåller
2. Artifact variants: Import kan ha annan struktur
3. Trigger conditions: Import normaliserar, builder har annat format
```

### Gap Analysis

| Gap | Beskrivning | Prioritet |
|-----|-------------|-----------|
| **Export från builder** | Ingen "Exportera till JSON" | MEDIUM |
| **Import till builder** | Ingen "Öppna importerat spel i builder" | LOW |
| **Template library** | Ingen "Spara som mall" funktion | MEDIUM |
| **Roundtrip validation** | Ingen test att import → export → import är identiskt | HIGH |
| **Version snapshots** | SnapshotManager finns men inte aktiverat | MEDIUM |

---

## Pass B: Runtime Traces (3 Flöden)

### Trace 1: Öppna builder med existerande draft

**Scenario:** Användare navigerar till `/admin/games/abc123/edit`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRACE 1: LOAD EXISTING GAME                                                  │
└─────────────────────────────────────────────────────────────────────────────┘

T=0ms: Browser navigates to /admin/games/abc123/edit
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ app/admin/games/[gameId]/edit/page.tsx (Client Component)       │
│ • use(params) → { gameId: 'abc123' }                            │
│ • <SystemAdminClientGuard> checks auth                          │
│ • <GameBuilderPage gameId="abc123" />                           │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ GameBuilderPage.tsx - Initial Render                            │
│ • isEditing = true (gameId exists)                              │
│ • loading = true                                                │
│ • useGameBuilder({ gameId: 'abc123' })                          │
│   └─ useReducer(historyReducer, createInitialHistory())         │
│   └─ state = empty initial state                                │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=10ms: useEffect triggers (gameId dependency)
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ fetch('/api/games/builder/abc123', { cache: 'no-store' })       │
│                                                                  │
│ Server-side (route.ts GET):                                     │
│ 1. supabase.from('games').select('*').eq('id', gameId)          │
│ 2. supabase.from('game_steps').select('*').eq('game_id', ...)   │
│ 3. supabase.from('game_phases')...                              │
│ 4. supabase.from('game_roles')...                               │
│ 5. supabase.from('game_artifacts')...                           │
│ 6. supabase.from('game_artifact_variants')...                   │
│ 7. supabase.from('game_triggers')...                            │
│ 8. supabase.from('game_materials')...                           │
│ 9. supabase.from('game_board_config')...                        │
│ 10. supabase.from('game_tools')...                              │
│ 11. supabase.from('game_media') (cover)...                      │
│ 12. supabase.from('game_secondary_purposes')...                 │
│                                                                  │
│ → Returns JSON with all game data                                │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=150ms: Response received
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ GameBuilderPage.tsx - Normalize & Load                          │
│                                                                  │
│ setCore({ name, short_description, ... })                       │
│   └─ dispatch({ type: 'SET_CORE', payload })                    │
│   └─ scheduleCommit() → timeout 800ms                           │
│                                                                  │
│ setSteps(loadedSteps.map(normalize))                            │
│   └─ dispatch({ type: 'SET_STEPS', payload })                   │
│                                                                  │
│ setPhases(loadedPhases.map(normalize))                          │
│ setRoles(loadedRoles.map(normalize))                            │
│ setArtifacts(loadedArtifacts.map(normalizeArtifact))            │
│ setTriggers(loadedTriggers.map(normalize))                      │
│ setMaterials(data.materials)                                    │
│ setBoardConfig(data.boardConfig)                                │
│ setCover({ mediaId, url })                                      │
│ setGameTools(merged with defaults)                              │
│ setSubPurposeIds(data.secondaryPurposes)                        │
│                                                                  │
│ ⚠️ Note: Multiple dispatches, but no history created            │
│    (all are SET_* non-committing actions)                       │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=160ms: setLoading(false)
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ React Re-render                                                  │
│                                                                  │
│ Components rendered:                                            │
│ • header (SaveIndicator, Preview, Publish buttons)              │
│ • BuilderSectionNav (left sidebar)                              │
│ • Main content (activeSection = 'grundinfo')                    │
│ • QualityChecklist (right sidebar)                              │
│ • ValidationPanel (if errors)                                   │
│                                                                  │
│ Hooks running:                                                   │
│ • useMemo(validationResult) → validateGameRefs()                │
│ • useMemo(qualityState) → check required fields                 │
│ • useMemo(completedSections) → calculate progress               │
└─────────────────────────────────────────────────────────────────┘

RESULT: Game loaded, UI ready for editing
TOTAL TIME: ~160ms
RENDERS: 2 (initial loading + loaded)
API CALLS: 1 (GET /api/games/builder/[id])
STATE UPDATES: ~12 dispatch calls
HISTORY: Empty (LOAD_FROM_API resets history)
```

---

### Trace 2: Gör en ändring som triggar autosave

**Scenario:** Användare skriver i "Namn"-fältet

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRACE 2: TEXT EDIT → AUTOSAVE                                               │
└─────────────────────────────────────────────────────────────────────────────┘

T=0ms: User types "Test" in name input
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Input onChange handler                                          │
│ • e.target.value = "Gammal NamnTest"                            │
│ • setCore({ name: e.target.value })                             │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ useGameBuilder.setCore()                                        │
│ • payload = { name: 'Gammal NamnTest' }                         │
│ • dispatch({ type: 'SET_CORE', payload })                       │
│ • scheduleCommit()                                              │
│   └─ Clear previous commitTimeout                               │
│   └─ setTimeout(COMMIT_TO_HISTORY, 800ms)                       │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ historyReducer                                                  │
│ • action.type = 'SET_CORE'                                      │
│ • isCommittingAction() = false                                  │
│ • newState = stateReducer(present, action)                      │
│   └─ { ...state, core: { ...core, name: 'Gammal NamnTest' } }   │
│ • return { ...history, present: newState }                      │
│   └─ past remains unchanged                                     │
│   └─ future remains unchanged                                   │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=5ms: React re-renders
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Components re-rendered:                                          │
│ • Input (controlled, shows new value)                           │
│ • QualityChecklist (qualityState.name recalculated)             │
│ • SaveIndicator (status still 'saved' or 'idle')                │
│                                                                  │
│ Memos recalculated:                                             │
│ • qualityState → name: true (has content)                       │
│ • completedSections → may include 'grundinfo'                   │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=10ms: isDirty check in useEffect
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ useGameBuilder autosave effect                                   │
│ • state changed                                                 │
│ • savedState !== state → isDirty = true                         │
│ • Clear previous autosaveTimeout                                │
│ • Schedule: setTimeout(onSave, 1500ms)                          │
└─────────────────────────────────────────────────────────────────┘
   │
   │ (User continues typing...)
   │
T=100ms: User types more ("Test Lek")
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Same flow repeats:                                               │
│ • setCore({ name: 'Gammal NamnTest Lek' })                      │
│ • Commit timeout reset to 800ms from now                        │
│ • Autosave timeout reset to 1500ms from now                     │
│ • No history commit yet (debouncing)                            │
└─────────────────────────────────────────────────────────────────┘
   │
T=900ms: commitTimeout fires (800ms after last keystroke)
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ dispatch({ type: 'COMMIT_TO_HISTORY' })                         │
│                                                                  │
│ historyReducer:                                                  │
│ • Push current present to past[]                                 │
│ • past = [...past, present].slice(-50)                          │
│ • future = [] (cleared)                                         │
│                                                                  │
│ Result: Undo point created!                                      │
│ canUndo = true                                                   │
└─────────────────────────────────────────────────────────────────┘
   │
T=1600ms: autosaveTimeout fires (1500ms after last state change)
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ handleSave() called                                             │
│                                                                  │
│ 1. setSaveStatus('saving')                                      │
│ 2. Build payload from state                                      │
│ 3. fetch(PUT /api/games/builder/abc123, { body: payload })      │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server-side (route.ts PUT):                                      │
│                                                                  │
│ 1. Update games SET name = ?, short_description = ?, ...        │
│ 2. DELETE FROM game_steps WHERE game_id = ?                     │
│ 3. INSERT INTO game_steps VALUES (...)                          │
│ 4. DELETE FROM game_phases WHERE game_id = ?                    │
│ 5. INSERT INTO game_phases VALUES (...)                         │
│ ... (same pattern for all related tables)                       │
│                                                                  │
│ → Returns { success: true }                                     │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=1800ms: Response received
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ handleSave() completion:                                         │
│                                                                  │
│ • setSaveStatus('saved')                                        │
│ • setLastSaved(new Date())                                      │
│ • markClean() → savedState = state                              │
│                                                                  │
│ React re-renders:                                                │
│ • SaveIndicator shows "Sparad" with timestamp                   │
│ • isDirty = false                                               │
└─────────────────────────────────────────────────────────────────┘

RESULT: Change saved, undo point created
TOTAL TIME: ~1800ms
RENDERS: ~4 (keystrokes + save status changes)
API CALLS: 1 (PUT /api/games/builder/[id])
STATE UPDATES: 2+ SET_CORE + 1 COMMIT_TO_HISTORY
HISTORY: 1 entry in past[]
```

---

### Trace 3: Publish/Preview/Export

**Scenario:** Användare klickar "Publicera"

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRACE 3: PUBLISH FLOW                                                        │
└─────────────────────────────────────────────────────────────────────────────┘

T=0ms: User clicks "Publicera" button
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ handlePublish() called                                          │
│                                                                  │
│ Pre-flight check:                                                │
│ • qualityState.allRequiredMet?                                  │
│   └─ name.trim() ✓                                              │
│   └─ short_description.trim() ✓                                 │
│   └─ main_purpose_id ✓                                          │
│   └─ (steps.length > 0 || description.trim()) ✓                 │
│   └─ cover.mediaId ✓                                            │
│                                                                  │
│ If NOT met:                                                      │
│   setError('Saknar obligatoriska fält')                         │
│   return; (abort)                                                │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼ (All requirements met)
   │
┌─────────────────────────────────────────────────────────────────┐
│ setCore({ status: 'published' })                                │
│                                                                  │
│ • dispatch({ type: 'SET_CORE', payload: { status: 'published' }})│
│ • scheduleCommit() (800ms debounce)                             │
│ • State updated: core.status = 'published'                      │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ handleSave({ status: 'published' })                             │
│                                                                  │
│ • setSaveStatus('saving')                                       │
│ • Build payload with status: 'published' override               │
│ • fetch(PUT /api/games/builder/abc123, { body: payload })       │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server-side (route.ts PUT):                                      │
│                                                                  │
│ UPDATE games SET                                                 │
│   name = ?,                                                      │
│   short_description = ?,                                         │
│   status = 'published',  ← Key change                            │
│   ...                                                            │
│ WHERE id = ?                                                     │
│                                                                  │
│ (+ all related table updates as before)                         │
│                                                                  │
│ → Returns { success: true }                                     │
└─────────────────────────────────────────────────────────────────┘
   │
   ▼
T=200ms: Response received
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Post-publish:                                                    │
│                                                                  │
│ • setSaveStatus('saved')                                        │
│ • setLastSaved(new Date())                                      │
│ • core.status = 'published' in state                            │
│                                                                  │
│ UI changes:                                                      │
│ • SaveIndicator shows "Sparad"                                  │
│ • Game is now live/published                                    │
│                                                                  │
│ ⚠️ Missing:                                                     │
│ • No success toast/modal                                         │
│ • No redirect to published view                                  │
│ • No "Unpublish" option                                          │
└─────────────────────────────────────────────────────────────────┘

RESULT: Game published
TOTAL TIME: ~200ms
RENDERS: 2 (saving → saved)
API CALLS: 1 (PUT /api/games/builder/[id])
STATE UPDATES: 1 SET_CORE (status change)
SIDE EFFECTS: Game now visible to players

---

PREVIEW FLOW (Not fully implemented):

T=0ms: User clicks "Förhandsgranska"
   │
   ▼
┌─────────────────────────────────────────────────────────────────┐
│ Button is disabled if !gameId                                    │
│                                                                  │
│ Current implementation:                                          │
│ • Button exists but onClick does nothing                        │
│ • No preview route implemented                                   │
│                                                                  │
│ Expected (TODO):                                                 │
│ • window.open(`/preview/games/${gameId}`, '_blank')             │
│ • Or modal with game preview component                          │
└─────────────────────────────────────────────────────────────────┘

---

EXPORT FLOW (Not implemented):

Current state:
• No "Export" button in UI
• GET /api/games/builder/[id] can be used manually
• No download functionality

Expected (TODO):
1. Add "Exportera" dropdown in header
2. Options: JSON, CSV
3. fetch(GET /api/games/builder/[id])
4. downloadAsFile(json, `${game.name}.json`)
```

SUMMARY OF TRACES:

| Flow | Components | Hooks | API Calls | State Changes | Time |
|------|------------|-------|-----------|---------------|------|
| Load existing | GameBuilderPage, all editors | useGameBuilder, validation memos | 1 GET | 12+ SET_* | ~160ms |
| Text edit + autosave | Input, SaveIndicator | useGameBuilder | 1 PUT | SET_CORE + COMMIT | ~1800ms |
| Publish | Button, SaveIndicator | useGameBuilder | 1 PUT | 1 SET_CORE | ~200ms |

---

## Risklista (Top 10)

| # | Risk | Severity | Area | Mitigation |
|---|------|----------|------|------------|
| 1 | **Ingen beforeunload warning** | HIGH | Persistence | Lägg till `onbeforeunload` |
| 2 | **Last-write-wins (concurrent edit)** | HIGH | Persistence | Optimistic locking med `updated_at` |
| 3 | **Ingen delete confirmation** | MEDIUM | UX | Lägg till confirmation dialog |
| 4 | **Replace-all persistence** | MEDIUM | Persistence | Diffing eller soft-delete |
| 5 | **Ingen localStorage backup** | MEDIUM | Persistence | Cache draft i localStorage |
| 6 | **Autosave failure silent** | MEDIUM | Persistence | Tydligare error UI |
| 7 | **Preview ej implementerat** | LOW | UX | Bygg preview-route |
| 8 | **Rollback/unpublish saknas** | LOW | UX | Lägg till status toggle |
| 9 | **Import/export roundtrip untested** | MEDIUM | Integration | E2E test för roundtrip |
| 10 | **Artifact type growth** | LOW | Schema | Registry pattern utökat |

---

## Framtidssäkerhets-plan

### Kortsikt (P0 - Nu)
- [ ] Lägg till `beforeunload` warning för unsaved changes
- [ ] Lägg till delete confirmation dialog
- [ ] Fixa preview-länk

### Medellång sikt (P1 - 2-4 veckor)
- [ ] Implementera optimistic locking (updated_at check)
- [ ] Lägg till "Exportera till JSON" i builder
- [ ] Aktivera SnapshotManager för versionering

### Långsikt (P2 - 1-3 månader)
- [ ] localStorage draft backup
- [ ] Template library ("Spara som mall")
- [ ] Collaborative editing (realtime sync)
- [ ] Roundtrip test suite
