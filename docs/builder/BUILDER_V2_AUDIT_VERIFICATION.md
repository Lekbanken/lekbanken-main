# Game Builder V2 Audit – Verification & Evidence Pack

> **Syfte**: Verifiera att BUILDER_V2_AUDIT.md stämmer mot koden  
> **Datum**: 2026-02-01  
> **Metod**: Kodgranskning mot audit-claims

---

## A) Claims Verification Matrix

### 1. Routing/Entrypoints

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Entrypoint `/admin/games/builder/[id]` | ✅ Verified | [GameBuilderPage.tsx](../../app/admin/games/builder/GameBuilderPage.tsx) rad 1-80: `export function GameBuilderPage({ gameId }: GameBuilderPageProps)` | Prop `gameId` optional för new vs edit |
| State hook `useGameBuilder.ts` | ✅ Verified | [hooks/useGameBuilder.ts](../../hooks/useGameBuilder.ts) rad 283-290: `export function useGameBuilder(options: UseGameBuilderOptions = {}): UseGameBuilderReturn` | 478 rader totalt |
| API route `/api/games/builder/[id]` | ✅ Verified | [app/api/games/builder/[id]/route.ts](../../app/api/games/builder/[id]/route.ts) rad 262-420: `export async function GET` + rad 430+: `export async function PUT` | 832 rader totalt |
| Client-side rendering ('use client') | ✅ Verified | GameBuilderPage.tsx rad 1: `'use client';` | Builder är client-only |

### 2. GET /api/games/builder/[id]

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Läser `games` tabell | ✅ Verified | route.ts rad 268-273: `supabase.from('games').select('*').eq('id', id).single()` | |
| Läser `game_steps` med sortering | ✅ Verified | route.ts rad 278-281: `.from('game_steps')...order('step_order', { ascending: true })` | |
| Läser `game_materials` | ✅ Verified | route.ts rad 295-298: `.from('game_materials')...maybeSingle()` | |
| Läser `game_phases` med sortering | ✅ Verified | route.ts rad 300-303: `.from('game_phases')...order('phase_order')` | |
| Läser `game_roles` med sortering | ✅ Verified | route.ts rad 305-308: `.from('game_roles')...order('role_order')` | |
| Läser `game_board_config` | ✅ Verified | route.ts rad 310-313: `.from('game_board_config')...maybeSingle()` | |
| Läser `game_tools` | ✅ Verified | route.ts rad 315-318: `.from('game_tools').select('tool_key, enabled, scope')` | |
| Läser `game_secondary_purposes` | ✅ Verified | route.ts rad 320-323: `.from('game_secondary_purposes').select('purpose_id')` | |
| Läser `game_media` (cover) | ✅ Verified | route.ts rad 325-332: `.from('game_media')...eq('kind', 'cover')` | Inkl. join till `media` |
| Läser `game_artifacts` med sortering | ✅ Verified | route.ts rad 334-338: `.from('game_artifacts')...order('artifact_order')` | |
| Läser `game_artifact_variants` | ✅ Verified | route.ts rad 340-347: `.from('game_artifact_variants').select('*').in('artifact_id', artifactIds)` | Sorterat på variant_order |
| Läser `game_triggers` med sortering | ✅ Verified | route.ts rad 397-401: `.from('game_triggers')...order('sort_order')` | |
| Media-mapping game_media.id → media.id | ✅ Verified | route.ts rad 354-373: `gameMediaIdToMediaId.set(row.id, row.media_id)` | Transformerar steps och variants |

### 3. PUT /api/games/builder/[id] – Delete/Upsert strategi

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| **Steps**: ID-preserving upsert | ✅ Verified | route.ts rad 501-527: `stepIdsToKeep.filter(isUuid)` → `delete().not('id', 'in', ...)` → `upsert(rows, { onConflict: 'id' })` | |
| **Materials**: Replace-all | ✅ Verified | route.ts rad 529-555: `delete().eq('game_id', id)` → `insert()` | Ingen ID-preservering |
| **Secondary purposes**: Replace-all | ✅ Verified | route.ts rad 557-565: `delete().eq('game_id', id)` → `insert()` | |
| **Tools**: Upsert on conflict | ✅ Verified | route.ts rad 567-600: `.upsert(rows, { onConflict: 'game_id,tool_key' })` | |
| **Phases**: ID-preserving upsert | ✅ Verified | route.ts rad 603-629: `phaseIdsToKeep` → `delete().not(...)` → `upsert()` | |
| **Roles**: ID-preserving upsert | ✅ Verified | route.ts rad 631-669: `roleIdsToKeep` → `delete().not(...)` → `upsert()` | |
| **Cover media**: Replace-all | ✅ Verified | route.ts rad 700-710: `delete().eq('kind', 'cover')` → `insert()` | |
| **Artifacts**: ID-preserving upsert | ✅ Verified | route.ts rad 712-760: `artifactIdsToKeep` → delete orphans → `upsert({ onConflict: 'id' })` | |
| **Variants**: DELETE + INSERT (FLYKTIGT) | ✅ Verified | route.ts rad 729-733 + 777-784: `delete().in('artifact_id', artifactIdsToKeep)` → `insert(variantRows)` | **Variant IDs återskapas varje save** |
| **Triggers**: ID-preserving upsert | ✅ Verified | route.ts rad 798-822: `triggerIdsToKeep` → `delete().not(...)` → `upsert()` | |

### 4. ID-semantik: Stable vs Ephemeral

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Artifact IDs är stabila | ✅ Verified | route.ts rad 712-714: `const artifactIdsToKeep = artifacts.filter((a) => isUuid(a.id))` + upsert on id | |
| Trigger IDs är stabila | ✅ Verified | route.ts rad 798-800: `const triggerIdsToKeep = triggers.filter((t) => isUuid(t.id))` + upsert on id | |
| Variant IDs är flyktiga | ✅ Verified | route.ts rad 729-733: `delete().in('artifact_id', artifactIdsToKeep)` före insert | **KRITISKT**: Variant-IDs skapas om varje save |
| Step IDs är stabila | ✅ Verified | route.ts rad 501-502: `stepIdsToKeep = steps.filter((s) => isUuid(s.id))` + upsert | |
| Phase IDs är stabila | ✅ Verified | route.ts rad 603: `phaseIdsToKeep = phases.filter((p) => isUuid(p.id))` | |
| Role IDs är stabila | ✅ Verified | route.ts rad 631: `roleIdsToKeep = roles.filter((r) => isUuid(r.id))` | |

### 5. artifact.metadata – Keys som faktiskt används

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| `keypad`: correctCode, codeLength, maxAttempts etc | ⚠️ Needs verification | Builder skriver generiskt metadata; Play-kod bör verifiera schema | Se [keypad route](../../app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts) |
| `riddle`: correctAnswers, normalizeMode, maxAttempts | ⚠️ Needs verification | Bör verifiera mot puzzle/route.ts | |
| metadata är `Record<string, unknown>` utan schema | ✅ Verified | [types/games.ts](../../types/games.ts) rad 85: `metadata?: Record<string, unknown> \| null` | **INGEN COMPILE-TIME VALIDERING** |

### 6. Trigger refs – Hur condition/actions refererar

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| `keypadId` i condition | ✅ Verified | [types/trigger.ts](../../types/trigger.ts) rad 56-58: `interface KeypadCorrectCondition { type: 'keypad_correct'; keypadId: string; }` | |
| `riddleId` i condition | ✅ Verified | types/trigger.ts rad 88-91: `interface RiddleCorrectCondition { type: 'riddle_correct'; riddleId: string; }` | |
| `artifactId` i actions | ✅ Verified | types/trigger.ts rad 249-252: `interface RevealArtifactAction { type: 'reveal_artifact'; artifactId: string; }` | |
| `stepId` i condition | ✅ Verified | types/trigger.ts rad 12-15: `interface StepStartedCondition { type: 'step_started'; stepId: string; }` | |
| `phaseId` i condition | ✅ Verified | types/trigger.ts rad 22-25: `interface PhaseStartedCondition { type: 'phase_started'; phaseId: string; }` | |
| Validation av refs i Builder | ✅ Verified | [validateGameRefs.ts](../../app/admin/games/builder/utils/validateGameRefs.ts) rad 57-115: `getArtifactIdsFromCondition()` + `getArtifactIdsFromAction()` | Client-side endast |

### 7. Media mapping

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| GET: game_media.id → media.id | ✅ Verified | route.ts rad 354-373: Map + transformation i stepsForBuilder/variantsForBuilder | |
| PUT: media.id → game_media.id (resolve) | ✅ Verified | route.ts rad 18-74: `resolveMediaRefsToGameMediaIds()` + rad 522: `mediaRefMap.get(s.media_ref)` | Skapar game_media row om ej finns |

### 8. Validation – Client vs Server

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Client: validateGameRefs | ✅ Verified | [validateGameRefs.ts](../../app/admin/games/builder/utils/validateGameRefs.ts) 414 rader | Validerar artifact/trigger/step/phase/role refs |
| Client: ValidationPanel UI | ✅ Verified | GameBuilderPage.tsx import rad 30: `import { ValidationPanel }` + rad 492 useMemo | |
| Server: Endast name/short_description required | ✅ Verified | route.ts rad 441-444: `if (!core?.name?.trim() \|\| !core.short_description?.trim())` | **INGEN artifact_type validation server-side** |
| Server: Ingen artifact_type enum validation | ✅ Verified | route.ts rad 738: `artifact_type: a.artifact_type ?? 'card'` | Fallback till 'card', ingen check mot ArtifactType union |
| Server: Ingen metadata schema validation | ✅ Verified | route.ts rad 742: `metadata: toJson(a.metadata)` | Passthrough utan typechecking |

### 9. Debounce-tider

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Autosave debounce 1500ms | ✅ Verified | useGameBuilder.ts rad 286: `autosaveDelay = 1500` | |
| History commit debounce 800ms | ✅ Verified | useGameBuilder.ts rad 310: `}, 800); // Debounce commits by 800ms` | |

### 10. Audit-påståenden om risker

| Claim | Status | Evidence | Notes |
|-------|--------|----------|-------|
| Ingen beforeunload warning | ✅ Verified | Sökte GameBuilderPage.tsx – ingen `beforeunload` listener hittad | isDirty finns men ingen window-warning |
| Last-write-wins (ingen optimistic locking) | ✅ Verified | Sökte route.ts – ingen version/etag check | Concurrent edits overwrite silently |
| Ingen constraint check visible_to_role_id | ✅ Verified | route.ts rad 776: `visible_to_role_id: v.visible_to_role_id ?? null` – ingen validering mot roles | |
| Trigger conditions kan referera borttagna artifacts | ⚠️ Partially verified | Client validateGameRefs gör check, men inte server-side vid save | |

---

## B) Evidence Pack (Minimal)

### 1) Builder Orchestrator

| Aspect | Location |
|--------|----------|
| **Fil** | [app/admin/games/builder/GameBuilderPage.tsx](../../app/admin/games/builder/GameBuilderPage.tsx) (1492 rader) |
| **Huvudkomponent** | `GameBuilderPage({ gameId })` – rad 81 |
| **Load trigger** | rad 270-486: `useEffect(() => { if (!gameId) return; ... fetch(\`/api/games/builder/${gameId}\`) })` |
| **Save trigger** | Hanteras av useGameBuilder hook autosave, inte direkt i page |

### 2) State Management

| Aspect | Location | Code |
|--------|----------|------|
| **Reducer** | [hooks/useGameBuilder.ts](../../hooks/useGameBuilder.ts) rad 25-160 | `function stateReducer(state, action)` + `function historyReducer(history, action)` |
| **History pattern** | rad 166-231 | UNDO/REDO/COMMIT_TO_HISTORY actions |
| **Debounced commit** | rad 300-311 | `scheduleCommit` → `setTimeout(..., 800)` → `dispatch({ type: 'COMMIT_TO_HISTORY' })` |
| **Autosave effect** | rad 313-333 | `setTimeout(() => void onSave(state)..., autosaveDelay)` |

### 3) Persistence Contracts

**GET Response Shape** (rad 403-418):
```typescript
{
  game: GameRow,
  steps: StepRow[],          // media_ref transformerat
  materials: MaterialsRow | null,
  phases: PhaseRow[],
  roles: RoleRow[],
  boardConfig: BoardConfigRow | null,
  gameTools: ToolRow[],
  secondaryPurposes: string[],
  coverMedia: { media_id, url, alt_text } | null,
  artifacts: ArtifactRow[],  // inkl. variants[], media_ref transformerat
  triggers: TriggerRow[]
}
```

**PUT Request Shape** (types rad 95-252):
```typescript
{
  core: CorePayload,
  steps: StepPayload[],
  materials: MaterialsPayload,
  phases: PhasePayload[],
  roles: RolePayload[],
  boardConfig: BoardConfigPayload,
  artifacts: ArtifactPayload[],   // inkl. variants[]
  triggers: TriggerPayload[],
  secondaryPurposes: string[],
  coverMediaId: string | null,
  tools: GameToolPayload[]
}
```

**DB Writes Summary**:
| Tabell | Strategi | IDs |
|--------|----------|-----|
| games | UPDATE | — |
| game_steps | DELETE orphans + UPSERT | Stable |
| game_materials | DELETE + INSERT | New each save |
| game_secondary_purposes | DELETE + INSERT | New each save |
| game_tools | UPSERT (game_id,tool_key) | Stable |
| game_phases | DELETE orphans + UPSERT | Stable |
| game_roles | DELETE orphans + UPSERT | Stable |
| game_board_config | UPSERT | — |
| game_media (cover) | DELETE + INSERT | New each save |
| game_artifacts | DELETE orphans + UPSERT | **Stable** |
| game_artifact_variants | DELETE ALL + INSERT | **EPHEMERAL** |
| game_triggers | DELETE orphans + UPSERT | **Stable** |

### 4) Play Coupling Points

| Play reads from | Files | Purpose |
|-----------------|-------|---------|
| `game_artifacts` | [artifacts/route.ts](../../app/api/play/sessions/[id]/artifacts/route.ts) rad 193-207 | Config: id, title, artifact_type, metadata |
| `game_artifact_variants` | artifacts/route.ts rad 223-229 | Config: visibility, media_ref, step_index |
| `game_triggers` | [triggers/route.ts](../../app/api/play/sessions/[id]/triggers/route.ts) rad 77-86 | Config: condition, actions, execute_once |

| Play writes to | Files | Purpose |
|----------------|-------|---------|
| `session_artifact_state` | artifacts/route.ts rad 235-241 | Runtime: keypadState, puzzleState |
| `session_artifact_variant_state` | artifacts/route.ts rad 244-248 | Runtime: revealed_at, highlighted_at |
| `session_trigger_state` | triggers/route.ts rad 95-100 | Runtime: status, fired_count, fired_at |

---

## C) Audit Gaps (saknas för Pre-Import Hardening)

| # | Vad saknas | Var i koden | Hur verifiera |
|---|------------|-------------|---------------|
| 1 | **Artifact metadata schema per type** | Builder: ArtifactEditor.tsx skapar metadata. Play: puzzle routes läser specifika keys | Mappa alla metadata-keys per artifact_type i Play |
| 2 | **Server-side artifact_type validation** | route.ts rad 738 – ingen check mot ArtifactType union | Leta efter "invalid artifact_type" error handling |
| 3 | **Import-route analys** | `/api/games/csv-import/route.ts` nämnd men ej analyserad | Läs csv-import och jämför med Builder PUT |
| 4 | **Trigger action exhaustive list** | Audit nämner 35+ typer men listar ej alla | Gå igenom types/trigger.ts TriggerAction union |
| 5 | **step_index/phase_index bounds validation** | Audit nämner risk men ej var/om det valideras | Sök efter step_index validation i Play |
| 6 | **visible_to_role_id → game_roles foreign key** | Audit säger ingen constraint check | Verifiera om DB har FK constraint |
| 7 | **Variant assignments i V2** | session_artifact_variant_assignments_v2 – hur det används | Leta i artifacts/state/route.ts |
| 8 | **RLS policies på game_* tabeller** | Audit nämner ej access control för Builder | Granska supabase/migrations för RLS |
| 9 | **Locale handling i GET/PUT** | GET har locale-filtering (rad 198-215), PUT har locale passthrough | Dokumentera locale-semantik |
| 10 | **game_content_version semantik** | PUT sätter `game_content_version: 'v2'` (rad 467) | Vad händer om v1? |

---

## D) "Do Not Touch" List (Korthus)

| # | Komponent/API/Tabell | Varför farlig | Domäner som går sönder | Bevis |
|---|---------------------|---------------|------------------------|-------|
| 1 | `game_artifacts.id` (UUID) | Triggers + Play state refererar via denna ID | **Play, Triggers, Import** | route.ts rad 712-760 (upsert preserverar), triggers/route.ts läser game_artifact_id |
| 2 | `game_triggers.condition` schema | Play matchar condition.type i switch | **Play automation** | types/trigger.ts TriggerCondition union |
| 3 | `game_artifacts.artifact_type` | Play väljer puzzle-komponent baserat på detta | **Play rendering** | types/games.ts ArtifactType union, Play ArtifactRenderer |
| 4 | `game_artifacts.metadata` shape per type | Play läser type-specific keys (correctCode, etc) | **Play puzzle logic** | keypad/route.ts, puzzle/route.ts |
| 5 | `game_artifact_variants` delete+insert pattern | Variant IDs är ej stabila; state refs bryts | **Play variant state** (re-reveal krävs) | route.ts rad 729-733 |
| 6 | `game_steps.step_order` | Phase/trigger step refs beror på order | **Play progression** | route.ts rad 515 (step_order), Play step advance |
| 7 | `game_phases.phase_order` | Step phase association, trigger phase refs | **Play phase logic** | route.ts rad 620 |
| 8 | `resolveMediaRefsToGameMediaIds()` | Skapar game_media rows automatiskt | **Media display** | route.ts rad 18-74 |
| 9 | `validateGameRefs.ts` | Enda stället som validerar trigger→artifact refs | **Data integrity** | builder/utils/validateGameRefs.ts |
| 10 | `session_artifact_state` + `session_trigger_state` | V2 runtime state – om schema ändras bryts Play | **Active sessions** | artifacts/route.ts, triggers/route.ts |

---

## Sammanfattning

### Verifierad
- ✅ Routing/entrypoints korrekt
- ✅ GET läser alla rätt tabeller
- ✅ PUT använder ID-preserving upsert för artifacts/triggers
- ✅ Variant IDs är flyktiga (bekräftat DELETE+INSERT)
- ✅ Trigger refs använder artifact IDs
- ✅ Debounce-tider stämmer (800ms commit, 1500ms autosave)
- ✅ Ingen beforeunload, ingen optimistic locking

### Behöver mer verifiering
- ⚠️ Artifact metadata shapes per type (ej dokumenterat)
- ⚠️ Server-side validation av artifact_type
- ⚠️ Import-route `/api/games/csv-import` ej analyserad
- ⚠️ RLS policies ej granskade

### Audit-dokumentet är i huvudsak korrekt
BUILDER_V2_AUDIT.md representerar koden korrekt. De gaps som identifierats handlar om djupare verifiering av metadata-shapes och import-flödet.
