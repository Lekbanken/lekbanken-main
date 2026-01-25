# Game Builder — Inventory, Reuse Plan & UX-First Builder Roadmap

**Date:** 2026-01-24  
**Author:** Claude Opus 4.5  
**Status:** Comprehensive Analysis

---

## Deliverable A1: Builder Entry Points & Surfaces

### Routes & Entry Points

| Route | File | Purpose |
|-------|------|---------|
| `/admin/games` | `features/admin/games/GameAdminPage.tsx` | Game list with "New in Builder" button |
| `/admin/games/new` | `app/admin/games/new/page.tsx` | Create new game (wraps GameBuilderPage) |
| `/admin/games/[gameId]/edit` | `app/admin/games/[gameId]/edit/page.tsx` | Edit existing game (wraps GameBuilderPage) |

### Main Builder Components

| File | Purpose | Lines |
|------|---------|-------|
| `app/admin/games/builder/GameBuilderPage.tsx` | Main builder container with all state, sections, save logic | ~1400 |
| `app/admin/games/builder/GameBuilderForm.tsx` | Legacy form (deprecated, kept for reference) | ~200 |

### Builder Section Components

| Component | File | Purpose |
|-----------|------|---------|
| `BuilderSectionNav` | `components/BuilderSectionNav.tsx` | Left sidebar navigation, mode-aware visibility |
| `QualityChecklist` | `components/QualityChecklist.tsx` | Right sidebar validation/quality gates |
| `PlayModeSelector` | `components/PlayModeSelector.tsx` | Select basic/facilitated/participants mode |
| `StepEditor` | `components/StepEditor.tsx` | Drag-drop ordered steps with drawer editing |
| `PhaseEditor` | `components/PhaseEditor.tsx` | Drag-drop phases with type/timer config |
| `RoleEditor` | `components/RoleEditor.tsx` | Role definitions with assignment strategies |
| `ArtifactEditor` | `components/ArtifactEditor.tsx` | All artifact types with variants (1398 lines) |
| `ArtifactWizard` | `components/ArtifactWizard.tsx` | Step-by-step artifact creation |
| `TriggerEditor` | `components/TriggerEditor.tsx` | Declarative trigger rules (774 lines) |
| `TriggerSimulator` | `components/TriggerSimulator.tsx` | Test triggers in sandbox mode |
| `BoardEditor` | `components/BoardEditor.tsx` | Public board config (theme, toggles) |
| `DecisionEditor` | `components/DecisionEditor.tsx` | Poll/vote/quiz decision templates |
| `SaveIndicator` | `components/SaveIndicator.tsx` | Auto-save status display |
| `SnapshotManager` | `components/SnapshotManager.tsx` | Version snapshots (future) |
| `TemplatePickerDialog` | `components/TemplatePickerDialog.tsx` | Pre-built trigger templates |
| `StandardImagePicker` | `components/StandardImagePicker.tsx` | Stock image selection |
| `ValidationPanel` | `components/ValidationPanel.tsx` | Validation error display |

### Builder Utilities

| File | Purpose |
|------|---------|
| `utils/validateGameRefs.ts` | Validates artifact/trigger references before publish (414 lines) |

### API Endpoints

| Endpoint | File | Methods | Purpose |
|----------|------|---------|---------|
| `/api/games/builder` | `app/api/games/builder/route.ts` | POST | Create new game with v2 structure |
| `/api/games/builder/[id]` | `app/api/games/builder/[id]/route.ts` | GET, PUT | Load/save full builder data |

### How the Builder is Wired

```
GameBuilderPage (main container)
├── useState for: core, steps, phases, roles, artifacts, triggers, boardConfig, materials, tools, etc.
├── BuilderSectionNav (left) - controls activeSection
├── Main content area - renders section based on activeSection
│   ├── 'grundinfo' → Basic info form (inline)
│   ├── 'steg' → StepEditor
│   ├── 'material' → Materials form (inline)
│   ├── 'sakerhet' → Safety/accessibility form (inline)
│   ├── 'spellage' → PlayModeSelector
│   ├── 'faser' → PhaseEditor
│   ├── 'roller' → RoleEditor
│   ├── 'artifacts' → ArtifactEditor
│   ├── 'triggers' → TriggerEditor
│   ├── 'tavla' → BoardEditor
│   └── etc.
├── QualityChecklist (right) - validation state
└── Header with SaveIndicator, Preview, Publish buttons
```

---

## Deliverable B1: Current Game Data Model

### Entities & Relationships

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            games (core)                                  │
│  id, name, short_description, status, play_mode, game_content_version   │
│  main_purpose_id, product_id, owner_tenant_id                           │
│  classification: energy_level, location_type, time_estimate_min, etc.   │
└─────────────────────────────────────────────────────────────────────────┘
        │
        ├──▶ game_steps (1:N, ordered by step_order)
        │    id, game_id, locale, step_order, title, body, duration_seconds
        │    leader_script, participant_prompt, board_text, media_ref
        │    phase_id (FK to game_phases, optional)
        │
        ├──▶ game_phases (1:N, ordered by phase_order)
        │    id, game_id, locale, name, phase_type, phase_order
        │    duration_seconds, timer_visible, timer_style
        │    description, board_message, auto_advance
        │
        ├──▶ game_roles (1:N, ordered by role_order)
        │    id, game_id, locale, name, icon, color
        │    public_description, private_instructions, private_hints
        │    min_count, max_count, assignment_strategy, scaling_rules
        │
        ├──▶ game_artifacts (1:N, ordered by artifact_order)
        │    id, game_id, title, description, artifact_type, artifact_order
        │    tags, metadata, locale
        │    └──▶ game_artifact_variants (1:N per artifact)
        │         id, artifact_id, title, body, media_ref, variant_order
        │         visibility, visible_to_role_id, metadata, step_index, phase_index
        │
        ├──▶ game_triggers (1:N, ordered by sort_order)
        │    id, game_id, name, description, enabled
        │    condition (JSONB: TriggerCondition)
        │    actions (JSONB: TriggerAction[])
        │    execute_once, delay_seconds, sort_order
        │
        ├──▶ game_materials (1:1 per locale)
        │    id, game_id, locale, items[], safety_notes, preparation
        │
        ├──▶ game_board_config (1:1 per locale)
        │    id, game_id, locale, show_*, welcome_message, theme, etc.
        │
        ├──▶ game_tools (1:N)
        │    id, game_id, tool_key, enabled, scope
        │
        ├──▶ game_media (1:N)
        │    id, game_id, media_id, kind (cover/gallery), position
        │
        └──▶ game_secondary_purposes (N:M via join)
             game_id, purpose_id
```

### Key Observations

1. **Ordering is by `_order` columns**: `step_order`, `phase_order`, `role_order`, `artifact_order`, `sort_order` (triggers).
2. **Phases are containers**: Steps can optionally belong to a phase via `phase_id` FK.
3. **No edge-based relationships**: Currently NO explicit edges between entities (no "step A unlocks step B" in schema).
4. **Triggers encode relationships in JSONB**: The `condition` field references steps/phases/artifacts by ID strings, but there's no referential integrity.
5. **Versioning**: `game_content_version` distinguishes 'v1' (legacy) from 'v2' (builder).
6. **Localization**: Most content tables have a `locale` column; translations are per-locale rows.

### Types/Interfaces Location

| Type | File | Notes |
|------|------|-------|
| `GameBuilderData` | `types/games.ts` | API response shape for builder |
| `GameStep`, `GamePhase`, `GameRole`, etc. | `types/games.ts` | DB row types |
| `StepFormData`, `PhaseFormData`, etc. | `types/games.ts` | Form/UI state types |
| `ArtifactType` (union) | `types/games.ts` | 25+ artifact types |
| `TriggerCondition`, `TriggerAction` | `types/trigger.ts` | Discriminated unions for all trigger types |
| `TriggerConditionType` | `types/trigger.ts` | Type literals |

### Persistence Strategy

- **Save**: PUT `/api/games/builder/[id]` with full `{core, steps, materials, phases, roles, artifacts, triggers, boardConfig}`.
- **Replace-all pattern**: Related tables (steps, phases, etc.) are DELETE + INSERT on save.
- **Autosave**: Frontend debounces and calls PUT on changes.
- **No optimistic locking**: Last-write-wins.

---

## Deliverable C1: Builder UX Today

### Step-by-Step User Flow

1. **Entry**: Admin clicks "Ny i Builder" from `/admin/games` list
2. **Create**: Redirected to `/admin/games/new` → GameBuilderPage renders
3. **Name & Describe**: Fill "Grundinfo" section (name*, short_description*)
4. **Auto-create**: First save (on blur or button) calls POST to create game, gets ID
5. **Add Steps**: Navigate to "Steg" section, add/reorder steps via drag-drop
6. **Add Materials**: Navigate to "Material" section, add items
7. **Safety Notes**: Navigate to "Säkerhet" section, fill leader tips
8. **Choose Play Mode**: Navigate to "Spelläge" → select basic/facilitated/participants
   - This reveals/hides advanced sections in sidebar
9. **Add Phases (if facilitated+)**: Navigate to "Faser" → add phases, configure timers
10. **Add Roles (if participants)**: Navigate to "Roller" → define roles
11. **Add Artifacts (if participants)**: Navigate to "Artifakter" → create puzzles/cards
12. **Add Triggers (if participants)**: Navigate to "Triggers" → wire automation rules
13. **Configure Board (if participants)**: Navigate to "Tavla" → toggle visibility options
14. **Quality Check**: Right sidebar shows checklist progress
15. **Publish**: Click "Publicera" when all requirements met

### Friction Points & Cognitive Load Hotspots

| Issue | Section | Severity | User Impact |
|-------|---------|----------|-------------|
| **No visual overview** | All | HIGH | User can't see "the whole game" at once—must mentally stitch together phases→steps→triggers |
| **No relationship visualization** | Triggers | HIGH | Trigger conditions/actions reference IDs but user can't see connections visually |
| **Linear section navigation** | Nav | MEDIUM | User jumps between sections to build relationships; no contextual linking |
| **Orphan detection is late** | Triggers | MEDIUM | Broken refs only caught at publish validation, not during editing |
| **No undo/redo** | All | MEDIUM | Accidental deletions require manual re-creation |
| **Deep forms for artifacts** | Artifacts | MEDIUM | 1398-line component, many nested accordions—easy to get lost |
| **Phases vs Steps confusion** | Phases/Steps | MEDIUM | Steps can exist without phases; mental model unclear |
| **No preview during editing** | All | LOW | Must save and go to separate preview to see result |
| **Autosave but no history** | All | LOW | Can't revert to earlier state |

---

## Deliverable D1: Reusable Building Blocks

### Components Reusable for Flow Builder

| Component | Location | Reusability | Constraints |
|-----------|----------|-------------|-------------|
| `Button`, `Input`, `Select`, `Textarea`, `Card` | `components/ui/*` | ✅ HIGH | None |
| `Dialog`, `Drawer`, `Sheet` | `components/ui/*` | ✅ HIGH | None |
| `Badge`, `Tooltip` | `components/ui/*` | ✅ HIGH | None |
| `HelpText`, `FeatureExplainer` | `components/ui/*` | ✅ HIGH | None |
| `MediaPicker`, `StandardImagePicker` | `components/ui/*` | ✅ HIGH | None |
| Drag-drop (`@dnd-kit/core`) | Used in StepEditor, PhaseEditor | ✅ HIGH | Already a dependency |
| `validateGameRefs.ts` | `builder/utils/` | ✅ HIGH | Generic validation logic |
| `TriggerWizard` | `components/play/` | ✅ MEDIUM | Wizard UX for trigger creation |
| `ConditionEditor`, `ActionEditor` (inline) | `TriggerEditor.tsx` | 🔄 REFACTOR | Currently embedded; extract as standalone |
| `ArtifactWizard` | `builder/components/` | ✅ MEDIUM | Step-by-step creation flow |
| `TemplatePickerDialog` | `builder/components/` | ✅ MEDIUM | Template selection pattern |

### Utilities Reusable

| Utility | Location | Reusability | Notes |
|---------|----------|-------------|-------|
| `makeId()` | Various | ✅ HIGH | UUID generation; standardize in lib/utils |
| `cn()` | `lib/utils` | ✅ HIGH | Class merging |
| Trigger CSV import/export | `features/admin/games/utils/trigger-csv.ts` | ✅ MEDIUM | Export pattern for graph data |
| `CONDITION_OPTIONS`, `ACTION_OPTIONS` | `types/trigger.ts` | ✅ HIGH | Config for node types |

### Schema Validation (Zod)

- **Current state**: No Zod schemas found for game builder data.
- **Opportunity**: Add Zod schemas for:
  - `GameBuilderDocument` (full save payload)
  - `TriggerCondition`, `TriggerAction` (already well-typed but no runtime validation)
  - Migration validation

---

## Deliverable E1: Gap Analysis (Current vs Target)

| Current State | Issue | User Impact | Proposed Fix | Effort | Risk |
|---------------|-------|-------------|--------------|--------|------|
| **Sections-based navigation** | No overview of game structure | User can't see relationships | Add "Översikt" tab with graph/outline view | M | Low |
| **No visual graph** | Triggers reference IDs without visualization | Hard to understand flow | Add node-based view for triggers→artifacts | L | Med |
| **Phases are "just a list"** | No containment visualization | Unclear which steps belong to which phase | Show phases as containers with nested steps | M | Low |
| **No undo/redo** | Accidental changes can't be reverted | Data loss, frustration | Add useReducer with history stack | M | Low |
| **Late validation** | Broken refs caught at publish | Wasted time, confusion | Real-time validation as refs change | S | Low |
| **1400-line GameBuilderPage** | Monolithic component | Hard to maintain | Extract state to custom hook or context | M | Med |
| **No semantic edges in DB** | Relationships implicit in trigger JSONB | Can't query "what depends on X" | Add edges table or computed graph | L | Med |
| **Replace-all save** | Potential data loss on concurrent edit | Silent overwrites | Add version check / optimistic locking | S | Low |
| **No autosave history** | Can't revert to earlier state | No safety net | Store snapshots on major changes | M | Low |
| **Deep nested forms** | ArtifactEditor is 1398 lines | Cognitive overload | Split into sub-editors, use wizard more | M | Low |

---

## Deliverable F1: Recommended Architecture & UX Approach

### Primary Recommendation: Hybrid Outline + Flow Visualization

**Canonical representation**: The existing structured data model (phases → steps → artifacts → triggers) remains source of truth.

**Visualization layer**: A read-mostly "Flow View" that renders the game as a graph for understanding relationships. Editing happens via the structured forms (current pattern), with some quick-actions possible from the graph (e.g., click node → open editor drawer).

#### Why This Approach

1. **Phases are containers, not edges**: A phase "contains" steps—this is better modeled as a hierarchy than as edges in a graph. Forcing phases into a pure flow-graph creates confusion.

2. **Steps are sequential within a phase**: The `step_order` column implies sequence. This is naturally shown as a vertical list inside a phase container.

3. **Triggers are the "wiring"**: Triggers DO create edges (condition→action). These are the only true graph edges and should be visualized.

4. **Avoid double-truth**: If both "phase.steps[]" and "edge from phase to step" exist, they can diverge. Keep phases as containers in data model; derive edges only for visualization.

#### Proposed UX Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│  [← Tillbaka]   Lekbyggaren   [Spara]  [Förhandsgranska] [Publicera]    │
├───────────────┬─────────────────────────────────────────────────────────┤
│               │                                                          │
│   SEKTIONER   │  TABS:  [ Översikt ]  [ Struktur ]  [ Automation ]       │
│   (nav)       │                                                          │
│               │  ┌────────────────────────────────────────────────────┐ │
│  ○ Grundinfo  │  │                                                    │ │
│  ○ Översikt   │  │   ACTIVE TAB CONTENT                               │ │
│  ○ Struktur   │  │                                                    │ │
│  ○ Automation │  │   - Översikt: Visual graph (read-mostly)          │ │
│  ○ Material   │  │   - Struktur: Phases→Steps editing                │ │
│  ○ Artifakter │  │   - Automation: Triggers with visual preview      │ │
│  ─────────────│  │                                                    │ │
│  ○ Inställn.  │  └────────────────────────────────────────────────────┘ │
│               │                                                          │
└───────────────┴─────────────────────────────────────────────────────────┘
```

#### "Översikt" Tab (Flow View)

A read-only (or light-edit) canvas showing:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          GAME OVERVIEW                                   │
│                                                                          │
│   ┌──────────────┐                    ┌──────────────┐                  │
│   │  INTRO       │ ─── sequence ───▶  │  ROUND 1     │                  │
│   │  (phase)     │                    │  (phase)     │                  │
│   │              │                    │              │                  │
│   │  ├─ Step 1   │                    │  ├─ Step 3   │                  │
│   │  └─ Step 2   │                    │  ├─ Step 4   │                  │
│   │              │                    │  └─ Step 5   │                  │
│   └──────────────┘                    └──────────────┘                  │
│          │                                   │                           │
│          │ unlocks                           │ unlocks                   │
│          ▼                                   ▼                           │
│   ┌──────────────┐                    ┌──────────────┐                  │
│   │  🔐 Keypad   │                    │  📄 Clue     │                  │
│   │  (artifact)  │ ─── on_correct ──▶ │  (artifact)  │                  │
│   └──────────────┘                    └──────────────┘                  │
│                                                                          │
│   Legend: ── sequence  ─▶ unlocks  ═══ contains                         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Interaction**:
- Click any node → opens detail drawer (same as current editors)
- Hover shows connections
- Cannot drag to reorder (use Struktur tab for that)
- Mini-map in corner for large games

---

## Deliverable F2: State Management Recommendation

### Current State Pattern

```typescript
// GameBuilderPage.tsx (simplified)
const [core, setCore] = useState<CoreForm>(defaultCore);
const [steps, setSteps] = useState<StepData[]>([]);
const [phases, setPhases] = useState<PhaseData[]>([]);
const [artifacts, setArtifacts] = useState<ArtifactFormData[]>([]);
const [triggers, setTriggers] = useState<TriggerFormData[]>([]);
// ... 10+ more useState calls
```

### Recommended: Reducer with History

```typescript
// types/game-builder-state.ts
interface GameBuilderState {
  core: CoreForm;
  steps: StepData[];
  phases: PhaseData[];
  roles: RoleData[];
  artifacts: ArtifactFormData[];
  triggers: TriggerFormData[];
  materials: MaterialsForm;
  boardConfig: BoardConfigData;
  tools: GameToolForm[];
  // Derived
  validationErrors: ValidationError[];
}

interface BuilderHistory {
  past: GameBuilderState[];
  present: GameBuilderState;
  future: GameBuilderState[];
}

// Actions (command pattern)
type BuilderAction =
  | { type: 'SET_CORE'; payload: Partial<CoreForm> }
  | { type: 'ADD_STEP'; payload: StepData }
  | { type: 'REMOVE_STEP'; payload: { id: string } }
  | { type: 'REORDER_STEPS'; payload: { from: number; to: number } }
  | { type: 'ADD_PHASE'; payload: PhaseData }
  // ... etc
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'LOAD'; payload: GameBuilderData }
  | { type: 'RESET' };
```

### What Gets Committed to History

| Action Type | Commit to History? | Rationale |
|-------------|-------------------|-----------|
| Field changes (name, description) | ✅ Yes (debounced) | User expects undo for text edits |
| Add/remove step/phase/artifact | ✅ Yes | Structural changes are significant |
| Reorder (drag end) | ✅ Yes | After drop completes |
| Drag in-progress | ❌ No | Transient; only commit on drop |
| Validation re-run | ❌ No | Derived state |
| Pan/zoom (if graph) | ❌ No | View state, not data |

### Proposed Hook

```typescript
// hooks/useGameBuilder.ts
export function useGameBuilder(gameId?: string) {
  const [state, dispatch] = useReducer(builderReducer, initialState);
  const [history, setHistory] = useState<BuilderHistory>({ past: [], present: initialState, future: [] });
  
  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);
  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;
  
  // Autosave effect
  useEffect(() => {
    const timer = setTimeout(() => saveToServer(state), 2000);
    return () => clearTimeout(timer);
  }, [state]);
  
  return { state, dispatch, undo, redo, canUndo, canRedo };
}
```

---

## Deliverable F3: Validation & Import/Export

### Versioned Document Shape

```typescript
// types/game-builder-document.ts
interface GameBuilderDocument {
  /** Schema version for migrations */
  version: '1.0';
  
  /** When this document was exported */
  exportedAt: string;
  
  /** Game ID (null for new/template) */
  gameId: string | null;
  
  /** Full game data */
  data: {
    core: CoreForm;
    steps: StepData[];
    phases: PhaseData[];
    roles: RoleData[];
    artifacts: ArtifactFormData[];
    triggers: TriggerFormData[];
    materials: MaterialsForm;
    boardConfig: BoardConfigData;
    tools: GameToolForm[];
  };
}
```

### Zod Schema (to add)

```typescript
// schemas/game-builder.ts
import { z } from 'zod';

const CoreFormSchema = z.object({
  name: z.string().min(1),
  short_description: z.string().min(1),
  // ... etc
});

const GameBuilderDocumentSchema = z.object({
  version: z.literal('1.0'),
  exportedAt: z.string().datetime(),
  gameId: z.string().uuid().nullable(),
  data: z.object({
    core: CoreFormSchema,
    steps: z.array(StepDataSchema),
    // ... etc
  }),
});

// Migration function
function migrateDocument(doc: unknown): GameBuilderDocument {
  const parsed = GameBuilderDocumentSchema.safeParse(doc);
  if (parsed.success) return parsed.data;
  
  // Handle older versions
  if (typeof doc === 'object' && doc !== null && 'version' in doc) {
    // Version-specific migrations
  }
  
  throw new Error('Invalid document format');
}
```

### Backward Compatibility

1. **Existing games**: `game_content_version = 'v2'` already indicates builder format.
2. **Legacy games**: `game_content_version = 'v1'` or null → read-only in builder, prompt to convert.
3. **Import**: Always validate through schema; reject or migrate unknown formats.
4. **Export**: Always export as latest version with `version` field.

---

## Deliverable F4: Performance Considerations

### Current Performance Profile

| Area | Current | Risk | Mitigation |
|------|---------|------|------------|
| GameBuilderPage render | ~1400 lines, many useState | Medium | Extract to hook; memoize sections |
| ArtifactEditor | 1398 lines, all artifacts in DOM | Medium | Virtualize list for >20 artifacts |
| TriggerEditor | 774 lines | Low | OK for typical trigger counts |
| Drag-drop | @dnd-kit (optimized) | Low | Already good |

### Graph Editor Performance (if added)

| Risk | Mitigation |
|------|------------|
| Naive 10,000×10,000 canvas | Use bounds-based rendering; only draw visible nodes |
| Many nodes (100+) | Unlikely for games; if needed, cluster phases |
| Many edges (triggers) | SVG paths are cheap; only redraw affected on change |
| React re-renders on pan/zoom | Keep camera state in ref, not useState |

### Recommended Approach

- **Use React Flow (XYFlow)**: Mature library with built-in viewport optimization, mini-map, edge routing.
- **Or**: If minimal needs, custom SVG canvas with `react-zoom-pan-pinch`.
- **Don't**: Build custom canvas from scratch.

---

## Deliverable G1: Implementation Plan

### Phase 0: Refactors (1-2 days)

**Goal**: Clean up before adding new features.

| Task | Files | Acceptance Criteria |
|------|-------|---------------------|
| Extract builder state to `useGameBuilder` hook | `hooks/useGameBuilder.ts`, `GameBuilderPage.tsx` | All useState moved to hook; page imports hook |
| Add undo/redo to hook | `hooks/useGameBuilder.ts` | `canUndo`, `canRedo`, `undo()`, `redo()` work |
| Add Zod schemas for core types | `schemas/game-builder.ts` | `GameBuilderDocumentSchema` validates correctly |
| Standardize `makeId()` | `lib/utils.ts` | Single source for UUID generation |

**Testing**: Manual test all sections still work; no regressions.

---

### Phase 1: MVP Overview Tab (3-5 days)

**Goal**: Add "Översikt" section with static visualization.

| Task | Files | Acceptance Criteria |
|------|-------|---------------------|
| Add "Översikt" to BuilderSectionNav | `BuilderSectionNav.tsx` | New section visible for all modes |
| Create `GameOverview.tsx` component | `components/GameOverview.tsx` | Renders phases as containers with steps |
| Add simple SVG-based layout | `GameOverview.tsx` | Phases left-to-right; steps vertical inside |
| Show trigger edges as lines | `GameOverview.tsx` | Arrows from condition source to action target |
| Click node → open drawer | `GameBuilderPage.tsx` | Clicking phase/step/artifact opens edit drawer |

**Visualization approach** (no library for MVP):

```tsx
// Simple flex layout with SVG overlay for edges
<div className="relative flex gap-8 p-8">
  {phases.map(phase => (
    <PhaseContainer key={phase.id} phase={phase}>
      {steps.filter(s => s.phase_id === phase.id).map(step => (
        <StepNode key={step.id} step={step} onClick={...} />
      ))}
    </PhaseContainer>
  ))}
  
  <svg className="absolute inset-0 pointer-events-none">
    {triggerEdges.map(edge => (
      <TriggerEdge key={edge.id} from={edge.from} to={edge.to} />
    ))}
  </svg>
</div>
```

**Testing**: 
- Create game with 3 phases, 10 steps, 5 triggers
- Verify all render correctly
- Click each node type; verify drawer opens

---

### Phase 2: React Flow Integration (5-7 days)

**Goal**: Replace simple SVG with React Flow for better UX.

| Task | Files | Acceptance Criteria |
|------|-------|---------------------|
| Install `@xyflow/react` | `package.json` | Dependency added |
| Create `GameFlowCanvas.tsx` | `components/GameFlowCanvas.tsx` | React Flow instance with custom nodes |
| Custom node types | `components/flow-nodes/` | PhaseNode, StepNode, ArtifactNode, TriggerNode |
| Custom edge types | `components/flow-edges/` | SequenceEdge, UnlocksEdge, ContainsEdge |
| Derive nodes/edges from state | `hooks/useGameFlowGraph.ts` | `{ nodes, edges }` computed from builder state |
| Mini-map | `GameFlowCanvas.tsx` | Mini-map in corner for navigation |
| Zoom controls | `GameFlowCanvas.tsx` | Zoom in/out/fit buttons |

**Node derivation logic**:

```typescript
function deriveFlowGraph(state: GameBuilderState): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  
  // Phases as group nodes
  state.phases.forEach((phase, i) => {
    nodes.push({
      id: `phase-${phase.id}`,
      type: 'phase',
      position: { x: i * 300, y: 0 },
      data: phase,
    });
  });
  
  // Steps as child nodes inside phases
  state.steps.forEach((step, i) => {
    const phaseIndex = state.phases.findIndex(p => p.id === step.phase_id);
    nodes.push({
      id: `step-${step.id}`,
      type: 'step',
      parentNode: step.phase_id ? `phase-${step.phase_id}` : undefined,
      position: { x: 20, y: 50 + i * 60 },
      data: step,
    });
  });
  
  // Trigger edges
  state.triggers.forEach(trigger => {
    const sourceId = getConditionSourceId(trigger.condition);
    trigger.actions.forEach(action => {
      const targetId = getActionTargetId(action);
      if (sourceId && targetId) {
        edges.push({
          id: `trigger-${trigger.id}`,
          source: sourceId,
          target: targetId,
          type: 'unlocks',
          data: { trigger },
        });
      }
    });
  });
  
  return { nodes, edges };
}
```

**Testing**:
- Pan, zoom, mini-map work smoothly
- Large game (20 phases, 100 steps) still performs
- Click nodes to edit

---

### Phase 3: Polish (3-5 days)

| Task | Effort |
|------|--------|
| Zoom-to-cursor | S |
| Multi-select nodes | M |
| Quick-add from context menu | M |
| Edge editing (click edge → edit trigger) | M |
| Keyboard shortcuts (Ctrl+Z, Ctrl+Y, Delete) | S |
| Snap-to-grid | S |
| Auto-layout button | M |
| Validation inline (red borders on broken refs) | S |

---

## Deliverable G2: Reuse vs Replace Decision List

| Component/Module | Decision | Rationale |
|------------------|----------|-----------|
| `GameBuilderPage.tsx` | 🔄 REFACTOR | Extract state to hook; keep rendering |
| `StepEditor.tsx` | ✅ KEEP | Works well; used from drawer |
| `PhaseEditor.tsx` | ✅ KEEP | Works well |
| `ArtifactEditor.tsx` | 🔄 REFACTOR | Split into smaller editors per type |
| `TriggerEditor.tsx` | ✅ KEEP | Good; add visual preview |
| `BuilderSectionNav.tsx` | ✅ KEEP | Add new sections |
| `QualityChecklist.tsx` | ✅ KEEP | Works well |
| `validateGameRefs.ts` | ✅ KEEP | Reuse for real-time validation |
| `GameBuilderForm.tsx` | ❌ DEPRECATE | Legacy; unused |
| UI components (`Button`, etc.) | ✅ KEEP | Standard library |
| Drag-drop (@dnd-kit) | ✅ KEEP | Used for list reordering |

---

## Deliverable G3: Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **Data migration**: Existing games incompatible with new schema | Low | High | Keep `game_content_version`; don't change DB schema initially |
| **UX confusion**: Two editing modes (forms vs graph) | Medium | Medium | Graph is read-mostly; edits still via forms in drawers |
| **Performance**: Large games slow in graph view | Low | Medium | Use React Flow virtualization; test with 100+ nodes |
| **Developer time sink**: Custom graph editor | Medium | High | Use React Flow, not custom; limit scope |
| **Undo/redo bugs**: State corruption | Medium | Medium | Unit test reducer thoroughly; keep history shallow (20 states max) |
| **Concurrent editing**: Two admins edit same game | Low | Medium | Add optimistic locking (version number) |

---

## Summary

### Key Takeaways

1. **The builder exists and is functional** — it has steps, phases, roles, artifacts, triggers, and saves to Supabase.
2. **The main gap is overview/visualization** — users can't see relationships at a glance.
3. **Phases should remain containers** — not nodes in a pure graph. Steps belong inside phases.
4. **Triggers create the real "edges"** — these should be visualized as connections.
5. **Recommended path**: Add an "Översikt" tab with a hybrid layout (phases as containers, triggers as edges) using React Flow.
6. **Protect existing workflows** — don't break current section-based editing; augment with visualization.

### Next Actions

1. ✅ Approve this inventory/plan
2. Execute Phase 0 refactors (extract `useGameBuilder` hook)
3. Build MVP overview visualization (Phase 1)
4. Iterate based on user feedback
