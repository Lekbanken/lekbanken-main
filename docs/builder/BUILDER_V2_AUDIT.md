# Game Builder Full Audit (Pre-Import Hardening)

## Metadata

- Owner: -
- Status: active audit
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active foundational audit for the Builder V2 workstream. Use it together with the verification document and later import/contract docs, not in isolation.

**Syfte**: Defensiv audit av Game Builder före implementation av bulk import.  
**Läsare**: Utvecklare, teknisk PM  
**Omfattning**: Endast befintlig implementation; inga ändringsförslag.

---

## Innehållsförteckning

1. [Builderns ansvar (Scope & Boundaries)](#1-builderns-ansvar-scope--boundaries)
2. [Dataflöde – End-to-End](#2-dataflöde--end-to-end)
3. [Builder-State: Shape & Semantik](#3-builder-state-shape--semantik)
4. [Koppling till Artifacts & Triggers V2](#4-koppling-till-artifacts--triggers-v2)
5. [Riskanalys (Korthus-perspektivet)](#5-riskanalys-korthus-perspektivet)
6. [Säkra Extensions-Seams](#6-säkra-extensions-seams)
7. [Pre-Import Readiness Check](#7-pre-import-readiness-check)
8. [Appendix: Open Questions](#8-appendix-open-questions)

---

## 1. Builderns ansvar (Scope & Boundaries)

### 1.1 Vad Buildern ÄR

Buildern är ett **author-time redigeringsverktyg** som:

| Ansvar | Detaljer |
|--------|----------|
| **Läser** | Config från `game_*`-tabeller via GET `/api/games/builder/[id]` |
| **Skriver** | Config till `game_*`-tabeller via PUT `/api/games/builder/[id]` |
| **Muterar** | Core, steps, phases, roles, materials, boardConfig, artifacts, triggers, tools, coverMedia, secondaryPurposes |
| **Publicerar** | Ändrar `games.status` från `draft` → `published` |

### 1.2 Vad Buildern INTE är

| Inte ansvar | Detaljer |
|-------------|----------|
| **Runtime/Play** | Läser/skriver aldrig `session_*_state` eller `participant_sessions` |
| **Import** | Hanterar inte CSV/JSON-import (separat route: `/api/games/csv-import`) |
| **Medieurval** | Hanterar inte media upload (extern MediaPicker-komponent) |
| **Versionshantering** | Sparar ej historik i DB (endast client-side undo/redo) |

### 1.3 Entrypoint & Routes

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           BUILDER ENTRYPOINT                            │
├─────────────────────────────────────────────────────────────────────────┤
│ URL:   /admin/games/new | /admin/games/[gameId]/edit                    │
│ File:  app/admin/games/builder/GameBuilderPage.tsx (1379 lines)         │
│ State: hooks/useGameBuilder.ts (452 lines)                              │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                     ┌────────────┴────────────┐
                     ▼                         ▼
            ┌─────────────┐           ┌──────────────┐
            │  GET        │           │  PUT         │
            │  /api/games │           │  /api/games  │
            │  /builder   │           │  /builder    │
            │  /[id]      │           │  /[id]       │
            └─────────────┘           └──────────────┘
```

### 1.4 Fil-inventering (nyckelkomponenter)

| Fil | Rader | Ansvar | Risk |
|-----|-------|--------|------|
| [app/api/games/builder/[id]/route.ts](../../app/api/games/builder/[id]/route.ts) | 816 | GET/PUT persistence | **Hög** |
| [hooks/useGameBuilder.ts](../../hooks/useGameBuilder.ts) | 452 | State management + undo/redo | **Hög** |
| [GameBuilderPage.tsx](../../app/admin/games/builder/GameBuilderPage.tsx) | 1379 | Orchestration + autosave | **Hög** |
| [types/game-builder-state.ts](../../types/game-builder-state.ts) | 303 | State types + actions | Medel |
| [types/games.ts](../../types/games.ts) | 408 | ArtifactType union, form data | Medel |
| [types/trigger.ts](../../types/trigger.ts) | 619 | TriggerCondition/TriggerAction unions | Medel |

---

## 2. Dataflöde – End-to-End

### 2.1 Load Flow (GET)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              LOAD FLOW                                   │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. GameBuilderPage.useEffect → loadGame(id)                             │
│                          │                                               │
│                          ▼                                               │
│  2. fetch(`/api/games/builder/${id}`)                                    │
│                          │                                               │
│                          ▼                                               │
│  3. GET route.ts:                                                        │
│     ┌──────────────────────────────────────────────────────────────┐     │
│     │ supabase.from('games').select('*').eq('id', id).single()     │     │
│     │ supabase.from('game_steps').select('*').eq('game_id', id)    │     │
│     │ supabase.from('game_materials')...                           │     │
│     │ supabase.from('game_phases')...                              │     │
│     │ supabase.from('game_roles')...                               │     │
│     │ supabase.from('game_board_config')...                        │     │
│     │ supabase.from('game_artifacts')...                           │     │
│     │ supabase.from('game_artifact_variants')...                   │     │
│     │ supabase.from('game_triggers')...                            │     │
│     │ supabase.from('game_tools')...                               │     │
│     │ supabase.from('game_secondary_purposes')...                  │     │
│     │ supabase.from('game_media').eq('kind', 'cover')...           │     │
│     └──────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  4. Transformation: game_media.id → media.id (för variants/steps)        │
│                          │                                               │
│                          ▼                                               │
│  5. Return JSON: { game, steps, materials, phases, roles, ...}           │
│                          │                                               │
│                          ▼                                               │
│  6. GameBuilderPage → dispatch(LOAD_FROM_API, payload)                   │
│                          │                                               │
│                          ▼                                               │
│  7. useGameBuilder reducer → initializes BuilderHistory with:            │
│     { past: [], present: <loaded state>, future: [] }                    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Edit + Autosave Flow (PUT)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         EDIT + AUTOSAVE FLOW                             │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. User edits field (e.g., setSteps([...]))                             │
│                          │                                               │
│                          ▼                                               │
│  2. useGameBuilder.setX() → dispatch({ type: 'SET_X', payload, commit }) │
│     commit=true → adds to history (undo-able)                            │
│     commit=false → replaces present only                                 │
│                          │                                               │
│                          ▼                                               │
│  3. Debounced (800ms) → reducer 'COMMIT_PENDING_CHANGES'                 │
│     Makes edit officially part of history                                │
│                          │                                               │
│                          ▼                                               │
│  4. isDirty flag → triggers autosave debounce (1500ms)                   │
│                          │                                               │
│                          ▼                                               │
│  5. saveGame() → buildPayload()                                          │
│     ┌──────────────────────────────────────────────────────────────┐     │
│     │ payload = {                                                  │     │
│     │   core: { name, short_description, status, ... },            │     │
│     │   steps: [{ id, title, body, duration_seconds, ... }],       │     │
│     │   materials: { items, safety_notes, preparation },           │     │
│     │   phases: [{ id, name, phase_type, ... }],                   │     │
│     │   roles: [{ id, name, icon, color, ... }],                   │     │
│     │   boardConfig: { show_timer, theme, ... },                   │     │
│     │   artifacts: [{ id, title, artifact_type, variants, ... }],  │     │
│     │   triggers: [{ id, name, condition, actions, ... }],         │     │
│     │   tools: [{ tool_key, enabled, scope }],                     │     │
│     │   secondaryPurposes: [purposeId, ...],                       │     │
│     │   coverMediaId: uuid | null                                  │     │
│     │ }                                                            │     │
│     └──────────────────────────────────────────────────────────────┘     │
│                          │                                               │
│                          ▼                                               │
│  6. fetch PUT → /api/games/builder/[id]                                  │
│                          │                                               │
│                          ▼                                               │
│  7. PUT route.ts → ID-preserving upsert:                                 │
│     - Delete orphans (IDs not in payload)                                │
│     - Upsert remaining (onConflict: 'id')                                │
│                          │                                               │
│                          ▼                                               │
│  8. Return { success: true } → dispatch(MARK_CLEAN)                      │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.3 Persistence Strategy: ID-Preserving Upsert

**Pattern i PUT-routen** (exempel: artifacts):

```typescript
// 1. Filter existing UUIDs from payload
const artifactIdsToKeep = artifacts.filter(a => isUuid(a.id)).map(a => a.id);

// 2. Get existing IDs from DB
const { data: existingArtifacts } = await supabase
  .from('game_artifacts').select('id').eq('game_id', id);

// 3. Delete orphaned artifacts (existed in DB, not in payload)
const artifactIdsToDelete = existingArtifactIds.filter(eId => !artifactIdsToKeep.includes(eId));
await supabase.from('game_artifact_variants').delete().in('artifact_id', artifactIdsToDelete);
await supabase.from('game_artifacts').delete().in('id', artifactIdsToDelete);

// 4. Delete variants for KEPT artifacts (re-insert strategy)
await supabase.from('game_artifact_variants').delete().in('artifact_id', artifactIdsToKeep);

// 5. Upsert artifacts with preserved IDs
const { data: upsertedArtifacts } = await supabase
  .from('game_artifacts')
  .upsert(artifactRows, { onConflict: 'id' })
  .select();

// 6. Insert new variants (no upsert - always fresh)
await supabase.from('game_artifact_variants').insert(variantRows);
```

**Konsekvens**:
- Artifact IDs är **stabila** (bevaras över redigeringar)
- Variant IDs är **flyktiga** (återskapas vid varje save)
- Trigger IDs är **stabila** (samma pattern som artifacts)

---

## 3. Builder-State: Shape & Semantik

### 3.1 GameBuilderState (client-side)

```typescript
// types/game-builder-state.ts

interface GameBuilderState {
  // === CORE (games table) ===
  core: CoreForm;           // name, description, status, play_mode, etc.
  
  // === ENTITIES (child tables) ===
  steps: StepData[];        // game_steps
  phases: PhaseData[];      // game_phases
  roles: RoleData[];        // game_roles
  artifacts: ArtifactFormData[];  // game_artifacts + game_artifact_variants
  triggers: TriggerFormData[];    // game_triggers
  
  // === SINGLETONS ===
  materials: MaterialsForm;       // game_materials
  boardConfig: BoardConfigData;   // game_board_config
  
  // === JUNCTION / REFERENCE ===
  gameTools: GameToolForm[];      // game_tools
  subPurposeIds: string[];        // game_secondary_purposes
  cover: CoverMedia;              // game_media (kind='cover')
}
```

### 3.2 CoreForm Shape

```typescript
interface CoreForm {
  name: string;                    // Required
  short_description: string;       // Required
  description: string;
  status: 'draft' | 'published';
  play_mode: 'basic' | 'facilitated' | 'participants';
  main_purpose_id: string;
  product_id: string | null;
  taxonomy_category: string;
  energy_level: 'low' | 'medium' | 'high' | null;
  location_type: 'indoor' | 'outdoor' | 'both' | null;
  time_estimate_min: number | null;
  duration_max: number | null;
  min_players: number | null;
  max_players: number | null;
  age_min: number | null;
  age_max: number | null;
  difficulty: string | null;
  accessibility_notes: string;
  space_requirements: string;
  leader_tips: string;
  is_demo_content: boolean;
}
```

### 3.3 ArtifactFormData Shape

```typescript
interface ArtifactFormData {
  id: string;                      // UUID (stable, preserved on save)
  title: string;
  description: string;
  artifact_type: string;           // One of ArtifactType union
  tags: string[];
  metadata?: Record<string, unknown> | null;  // TYPE-SPECIFIC CONFIG
  variants: ArtifactVariantFormData[];
}

interface ArtifactVariantFormData {
  id: string;                      // UUID (EPHEMERAL - recreated each save)
  title: string;
  body: string;
  media_ref: string;               // References media.id
  visibility: 'public' | 'leader_only' | 'role_private';
  visible_to_role_id: string | null;
  step_index: number | null;       // Unlock at step N
  phase_index: number | null;      // Unlock at phase N
  metadata?: Record<string, unknown> | null;
}
```

### 3.4 TriggerFormData Shape

```typescript
interface TriggerFormData {
  id?: string;                     // UUID (stable, preserved on save)
  name: string;
  description?: string | null;
  enabled: boolean;
  condition: TriggerCondition;     // Discriminated union (types/trigger.ts)
  actions: TriggerAction[];        // Array of discriminated union
  execute_once: boolean;
  delay_seconds: number;
  sort_order?: number;
}
```

### 3.5 Metadata Semantik per Artifact Type

**KRITISKT**: `artifact.metadata` innehåller **type-specific config** som Play läser.

| artifact_type | metadata keys | Syfte |
|---------------|---------------|-------|
| `keypad` | `correctCode`, `codeLength`, `maxAttempts`, `successMessage`, `failMessage`, `lockedMessage` | Kod-låskonfiguration |
| `riddle` | `correctAnswers[]`, `normalizeMode`, `maxAttempts`, `successMessage`, `failMessage` | Gåtekonfiguration |
| `cipher` | `cipherType`, `key`, `solution` | Krypteringsparametrar |
| `logic_grid` | `gridSize`, `categories[]`, `clues[]`, `solution` | Logiknöt-setup |
| `multi_answer` | `requiredAnswers[]`, `minRequired` | Multi-svar konfiguration |
| `counter` | `initialValue`, `targetValue`, `counterKey` | Räknarkonfiguration |
| `hotspot` | `hotspots[]`, `imageRef`, `requiredCount` | Hotspot-koordinater |
| `qr_gate` | `expectedCodes[]`, `requiredScans` | QR-gate konfiguration |
| `tile_puzzle` | `gridSize`, `imageRef`, `shuffle` | Brickläggarconfig |
| `conversation_cards_collection` | `conversation_card_collection_id` | Koppling till collection |
| `signal_generator` | `signalKey`, `label` | Signalgenerator-config |
| `time_bank_step` | `deltaSeconds`, `reason` | Tidsbanksmodifikation |
| `hint_container` | `hints[]`, `cooldownSeconds` | Tips-konfiguration |

---

## 4. Koppling till Artifacts & Triggers V2

### 4.1 V2 Arkitektur-sammanfattning

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    V2 ARCHITECTURE: CONFIG + STATE                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────┐      ┌─────────────────────────────┐   │
│  │      AUTHOR-TIME            │      │       RUNTIME               │   │
│  │      (Builder writes)       │      │       (Play writes)         │   │
│  ├─────────────────────────────┤      ├─────────────────────────────┤   │
│  │                             │      │                             │   │
│  │  game_artifacts             │      │  session_artifact_state     │   │
│  │  ├─ id (stable UUID)        │      │  ├─ session_id              │   │
│  │  ├─ game_id                 │      │  ├─ game_artifact_id ───────┼───┐
│  │  ├─ artifact_type           │      │  └─ state (JSONB)           │   │
│  │  ├─ title, description      │      │      ├─ keypadState         │   │
│  │  ├─ metadata (CONFIG)       │      │      ├─ puzzleState         │   │
│  │  │   ├─ correctCode ✓       │      │      └─ customState         │   │
│  │  │   ├─ correctAnswers ✓    │      │                             │   │
│  │  │   └─ ...                 │      │  session_artifact_variant_  │   │
│  │  └─ artifact_order          │      │  state                      │   │
│  │                             │      │  ├─ session_id              │   │
│  │  game_artifact_variants     │      │  ├─ game_artifact_variant_id│   │
│  │  ├─ id (EPHEMERAL)          │      │  ├─ revealed_at             │   │
│  │  ├─ artifact_id ────────────┼──────┼──├─ highlighted_at          │   │
│  │  ├─ visibility              │      │  └─ assigned (via junction) │   │
│  │  ├─ step_index/phase_index  │      │                             │   │
│  │  └─ metadata (config)       │      │                             │   │
│  │                             │      │                             │   │
│  │  game_triggers              │      │  session_trigger_state      │   │
│  │  ├─ id (stable UUID)        │      │  ├─ session_id              │   │
│  │  ├─ game_id                 │      │  ├─ game_trigger_id ────────┼───┘
│  │  ├─ condition (JSONB)       │      │  ├─ status (armed/fired/    │
│  │  ├─ actions (JSONB[])       │      │  │         disabled)        │
│  │  ├─ execute_once            │      │  ├─ fired_count             │
│  │  ├─ delay_seconds           │      │  └─ fired_at                │
│  │  └─ sort_order              │      │                             │   │
│  │                             │      │                             │   │
│  └─────────────────────────────┘      └─────────────────────────────┘   │
│             ▲                                    ▲                      │
│             │                                    │                      │
│       BUILDER WRITES                       PLAY WRITES                  │
│       (PUT /api/games/builder/[id])        (PATCH /api/play/sessions)   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Play läser Config från game_* tabeller

**Fil**: [app/api/play/sessions/[id]/artifacts/route.ts](../../app/api/play/sessions/[id]/artifacts/route.ts)

```typescript
// V2: Läs config från game_artifacts (INTE session_artifacts)
const { data: gameArtifacts } = await service
  .from('game_artifacts')
  .select('id, title, description, artifact_type, artifact_order, tags, metadata, locale')
  .eq('game_id', session.game_id)
  .order('artifact_order', { ascending: true });

// Läs state från session_artifact_state
const { data: artifactStates } = await service
  .from('session_artifact_state')
  .select('game_artifact_id, state')
  .eq('session_id', sessionId)
  .in('game_artifact_id', artifactIds);

// Kombinera: Config + State
const artifacts = gameArtifacts.map(config => ({
  ...config,
  state: stateMap.get(config.id)?.state ?? null,
}));
```

### 4.3 Builderns kritiska kontrakt med Play

| Builder skriver | Play läser | Kritisk? |
|-----------------|------------|----------|
| `game_artifacts.id` (UUID) | Använder som `game_artifact_id` i state | ✅ **JA** |
| `game_artifacts.artifact_type` | Bestämmer vilken puzzle-komponent | ✅ **JA** |
| `game_artifacts.metadata` | Config för puzzle (correctCode etc) | ✅ **JA** |
| `game_artifact_variants.id` | Variant-reveal/highlight references | ⚠️ Flyktigt |
| `game_artifact_variants.visibility` | Access control i Play | ✅ **JA** |
| `game_artifact_variants.step_index` | Unlock-logik | ✅ **JA** |
| `game_triggers.condition` | Trigger-matchning | ✅ **JA** |
| `game_triggers.actions` | Trigger-exekvering | ✅ **JA** |

### 4.4 Trigger References till Artifacts

Triggers refererar artifacts via **artifact ID** i condition och actions:

```typescript
// Condition examples (types/trigger.ts)
interface KeypadCorrectCondition {
  type: 'keypad_correct';
  keypadId: string;  // ← References game_artifacts.id
}

interface RiddleCorrectCondition {
  type: 'riddle_correct';
  riddleId: string;  // ← References game_artifacts.id
}

// Action examples
interface RevealArtifactAction {
  type: 'reveal_artifact';
  artifactId: string;  // ← References game_artifacts.id
}

interface ResetKeypadAction {
  type: 'reset_keypad';
  keypadId: string;  // ← References game_artifacts.id
}
```

**Implikation**: Om artifact IDs ändras vid import, bryts trigger-kopplingar.

---

## 5. Riskanalys (Korthus-perspektivet)

### 5.1 Kritiska invarianter

| Invariant | Om bruten → |
|-----------|-------------|
| `artifact.id` stabil mellan saves | Triggers med artifact-refs bryts |
| `artifact_type` valid enum value | Play-komponent hittas ej, runtime crash |
| `metadata.correctCode` finns för keypad | Unlock omöjligt |
| `step_index` ≤ antal steps | Artifact låser aldrig upp |
| `phase_id` refererar existerande phase | Orphaned step |
| `visible_to_role_id` refererar existerande role | Access control bryts |

### 5.2 Riskmatris

| Risk | Sannolikhet | Påverkan | Åtgärd krävs? |
|------|-------------|----------|---------------|
| Variant-ID flyktighet kräver re-reveal | Medel | Låg | Dokumentera |
| Trigger-artifact refs bryts vid import | Hög | Hög | ID-mappning |
| metadata shape mismatch | Låg | Hög | Schema-validering |
| step/phase-index out-of-bounds | Låg | Medel | Bounds check |
| media_ref pekar på raderad media | Medel | Låg | Graceful fallback |

### 5.3 Observerade gaps

1. **Ingen constraint check**: Builder validerar inte att `visible_to_role_id` finns bland definierade roles.

2. **Ingen metadata schema**: `artifact.metadata` är `Record<string, unknown>` utan typechecking per artifact_type.

3. **Ingen referentiell integritet i client**: Trigger conditions kan referera till borttagna artifacts.

4. **Last-write-wins**: Ingen optimistic locking; concurrent edits overwrite silently.

---

## 6. Säkra Extensions-Seams

### 6.1 Hur man lägger till ny ArtifactType

**Steg 1**: Uppdatera TypeScript union

```typescript
// types/games.ts
export type ArtifactType =
  | 'card'
  | 'keypad'
  // ... existing types ...
  | 'new_puzzle_type';  // ← Lägg till här
```

**Steg 2**: Uppdatera ArtifactEditor dropdown

```typescript
// app/admin/games/builder/components/ArtifactEditor.tsx
const artifactTypeOptions = useMemo(() => [
  // ... existing options ...
  { value: 'new_puzzle_type', label: t('artifact.types.newPuzzleType') },
], [t]);

// Add styling
const ARTIFACT_STYLES: Record<string, ArtifactTypeStyle> = {
  // ...
  new_puzzle_type: { emoji: '🆕', bg: '...', border: '...', text: '...' },
};
```

**Steg 3**: Uppdatera TriggerCondition (om puzzle triggrar events)

```typescript
// types/trigger.ts
export interface NewPuzzleCompleteCondition {
  type: 'new_puzzle_complete';
  puzzleId: string;
}

// Add to TriggerCondition union
export type TriggerCondition = 
  | ... 
  | NewPuzzleCompleteCondition;
```

**Steg 4**: Skapa Play-komponent

```typescript
// components/play/puzzles/NewPuzzle/NewPuzzle.tsx
// components/play/puzzles/NewPuzzle/index.ts
```

**Steg 5**: Registrera i puzzle dispatch

```typescript
// components/play/ArtifactRenderer.tsx (or similar)
case 'new_puzzle_type':
  return <NewPuzzle artifact={artifact} session={session} />;
```

### 6.2 Seam: Builder → API → DB → Play

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   TypeScript    │   │    API Route    │   │   Play Reader   │
│   types/games   │   │  PUT handler    │   │   artifacts/    │
│                 │   │                 │   │   route.ts      │
├─────────────────┤   ├─────────────────┤   ├─────────────────┤
│ ArtifactType    │──▶│ artifact_type   │──▶│ artifact_type   │
│ union           │   │ = string        │   │ switch/case     │
│                 │   │ (no validation) │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘
        │                     │                     │
        └──── Type safety ────┴── RUNTIME STRING ──┘
```

**Observera**: API-routen validerar INTE att `artifact_type` är valid enum. Det är en `string` i DB.

### 6.3 Metadata Extension Pattern

För nya artifact types med custom metadata:

```typescript
// Dokumentera förväntad shape
interface NewPuzzleMetadata {
  difficulty: 'easy' | 'hard';
  timeLimit: number;
  hints: string[];
}

// Play läser och validerar runtime:
function parseNewPuzzleMetadata(raw: unknown): NewPuzzleMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  // ... validation ...
}
```

---

## 7. Pre-Import Readiness Check

### 7.1 Import måste uppfylla

| Krav | Builder-beroende | Status |
|------|------------------|--------|
| Stabil artifact ID | Builder bevarar UUIDs | ✅ Redo |
| Stabil trigger ID | Builder bevarar UUIDs | ✅ Redo |
| Valid artifact_type | Builder dropdown-vald | ⚠️ Import måste validera |
| Valid metadata shape | Builder-specifika editors | ⚠️ Import måste matcha |
| Phase-step association | phase_id FK | ✅ Redo |
| Role references i variants | visible_to_role_id | ⚠️ ID-mappning |
| Trigger artifact refs | condition.keypadId etc | ⚠️ ID-mappning |

### 7.2 Rekommenderad Import-strategi

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         IMPORT FLOW                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  1. Parse import payload (CSV/JSON)                                      │
│                          │                                               │
│                          ▼                                               │
│  2. Generate stable UUIDs för:                                           │
│     - Alla artifacts                                                     │
│     - Alla triggers                                                      │
│     - Alla phases                                                        │
│     - Alla roles                                                         │
│                          │                                               │
│                          ▼                                               │
│  3. Bygg ID-mapping:                                                     │
│     source_artifact_ref → generated_uuid                                 │
│                          │                                               │
│                          ▼                                               │
│  4. Rewrite trigger conditions/actions med nya UUIDs                     │
│                          │                                               │
│                          ▼                                               │
│  5. Rewrite variant visible_to_role_id med nya role UUIDs                │
│                          │                                               │
│                          ▼                                               │
│  6. Validate metadata shapes per artifact_type                           │
│                          │                                               │
│                          ▼                                               │
│  7. Insert via samma pattern som Builder PUT                             │
│     (eller använd Builder PUT endpoint direkt)                           │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 7.3 Import Validation Checklist

```typescript
// Pseudokod för import validation
function validateImportPayload(payload: ImportPayload): ValidationResult {
  const errors: string[] = [];
  
  // 1. artifact_type validation
  for (const artifact of payload.artifacts) {
    if (!VALID_ARTIFACT_TYPES.includes(artifact.artifact_type)) {
      errors.push(`Invalid artifact_type: ${artifact.artifact_type}`);
    }
  }
  
  // 2. Trigger condition validation
  for (const trigger of payload.triggers) {
    const artifactRefs = extractArtifactRefs(trigger.condition);
    for (const ref of artifactRefs) {
      if (!payload.artifactIdMap.has(ref)) {
        errors.push(`Trigger ${trigger.name} references unknown artifact: ${ref}`);
      }
    }
  }
  
  // 3. Metadata shape validation
  for (const artifact of payload.artifacts) {
    const schemaError = validateMetadata(artifact.artifact_type, artifact.metadata);
    if (schemaError) errors.push(schemaError);
  }
  
  // 4. Role reference validation
  for (const variant of allVariants) {
    if (variant.visible_to_role_id && !payload.roleIdMap.has(variant.visible_to_role_id)) {
      errors.push(`Variant references unknown role: ${variant.visible_to_role_id}`);
    }
  }
  
  return { valid: errors.length === 0, errors };
}
```

---

## 8. Appendix: Open Questions

### 8.1 Oavgjorda designbeslut

| Fråga | Kontext | Påverkar import? |
|-------|---------|------------------|
| Ska variant IDs bli stabila? | Idag flyktiga; skapas om varje save | Nej (import skapar nya) |
| Behöver Builder metadata-schema? | Idag `Record<string, unknown>` | Ja (import-validering) |
| Optimistic locking? | Idag last-write-wins | Nej (import är single-writer) |
| Referentiell integritet för trigger refs? | Idag ingen | Ja (import måste validera) |

### 8.2 Teknisk skuld

1. **ARTIFACT_STYLES hårdkodad**: Bör vara registry-driven
2. **TriggerCondition/TriggerAction**: 35+ typer, ingen exhaustive check i Play
3. **media_ref mapping**: Komplex game_media ↔ media.id transformation

### 8.3 Framtida utbyggnad

| Feature | Builder-påverkan | V2-kompatibel? |
|---------|------------------|----------------|
| Multi-locale artifacts | metadata.locale + variants per locale | ✅ Ja |
| Artifact versioning | Ny tabell, behåll game_artifacts struktur | ✅ Ja |
| Collaborative editing | OT/CRDT layer ovanpå builder state | Neutral |
| Template library | Clone game → new game_id | ✅ Ja |

---

## Sammanfattning

Buildern är **V2-kompatibel** och skriver till rätt tabeller (`game_*`). Play läser config därifrån och skriver state till `session_*_state`.

**Kritiskt för import**:
1. Generera stabila UUIDs för artifacts/triggers/phases/roles
2. Rewrite alla interna ID-referenser (trigger → artifact, variant → role)
3. Validera metadata shapes per artifact_type
4. Använd samma PUT-pattern som Builder (eller anropa Builder API)

**Inga ändringar krävs i Builder** för att stödja import – men import måste respektera Builderns kontrakt med Play.
