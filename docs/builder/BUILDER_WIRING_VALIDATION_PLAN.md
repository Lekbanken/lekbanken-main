# Builder Wiring & Validation Plan

## Metadata

- Owner: -
- Status: active
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active plan for the builder validation and wiring layer. If parts of the plan are implemented, update the status and decisions here, not only in code or sprint notes.

**Syfte**: Industrial-grade validering och wiring för Game Builder  
**Planstatus**: PLAN — ej implementerad  
**Källa**: [BUILDER_EVENT_MODEL.md](BUILDER_EVENT_MODEL.md), Import Atomicity patterns  
**Policy**: Samma rigor som import-systemet. Typed errors. Inga gissningar.

---

## Executive Summary

| Aspekt | Nuläge | Mål |
|--------|--------|-----|
| **Validering** | Ad-hoc UI-checks | 3-nivå gates (Draft/Playable/Publish) |
| **State** | useGameBuilder reducer | Samma + `resolveDraft()` resolver |
| **Errors** | Manuella varningar | Typed `BuilderError[]` med paths |
| **ReactFlow** | Planerad | Vy på samma GameDraft state |
| **Kvalitetskontroll** | Statisk checklista | Live validering med klickbara länkar |

---

## Persistence Decisions

> **Princip**: Bygg validering på relationer som faktiskt finns i DB.

| Relation | Persist-strategi | Kommentar |
|----------|------------------|----------|
| Step → Phase | `game_steps.phase_id` (FK) | ✅ Finns i DB |
| Artifact → Step | `game_artifacts.metadata.step_id` | ⚠️ Soft link, ingen FK |
| Variant → Role | `artifact_variants.role_id` (FK) | ✅ Finns i DB |
| Trigger → Target | `game_triggers.actions` (JSONB) | ⚠️ Soft refs |

### Artifact ↔ Step Linking (v1)

> **LOCKED CONTRACT**: `metadata.step_id` är canonical för artifact→step wiring.

### LOCKED CONTRACT: Canonical Field Path

**Canonical storage path (v1):**
```
artifacts[i].metadata.step_id   (string UUID)
```

**Forbidden:**
- `artifacts[i].step_id`
- `artifacts[i].stepId`
- `artifact.stepId` (shadow prop)
- Any parallel "link field" outside `metadata.step_id`

### Normalization Policy

Implement and use **one** normalization function everywhere:

```typescript
// lib/builder/normalize.ts

export function normalizeStepId(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
```

**Rules:**
| Case | Policy |
|------|--------|
| Missing `metadata` | Treat as `{}` |
| `metadata.step_id = ''` or `' '` | Treat as `undefined` |
| `metadata.step_id` exists but not valid UUID | `B_INVALID_UUID` (draft gate error) |
| `metadata.step_id` is UUID but not in `steps[]` | `B_DANGLING_REF` (draft gate error) |

### Wiring Semantics

- **Edge-building (ReactFlow)**: uses only `normalizeStepId(artifact.metadata?.step_id)`
- **Validation**: checks dangling refs on the normalized result
- **Serialization**: writes `metadata.step_id` as-is (string UUID) or omits when `undefined`

### Backwards Compatibility (if needed)

If drafts exist with `stepId` somewhere, add one-time migration layer in draft load:
1. Read old field(s)
2. Set `metadata.step_id`
3. Delete old field(s) in memory
4. Never write old fields again

```typescript
// game_artifacts.metadata schema (v1)
interface ArtifactMetadata {
  step_id?: string;      // Soft link to step (UUID or undefined)
  step_ids?: string[];   // Future: multi-step artifacts
  // ... other metadata
}
```

**Kontrakt:**
- `metadata.step_id` är en **UUID string** eller `undefined`
- Ingen FK i DB — validering sker i `resolveDraft()`
- `DANGLING_REF` error om `metadata.step_id` finns men step saknas
- `UNASSIGNED_ARTIFACTS` är **warning** (publish gate), inte error

**Intern representation (VIKTIGT):**

```typescript
// I GameDraft state använder vi metadata.step_id DIREKT
// Ingen separat artifact.stepId field — undvik dubbla sanningar

// ❌ FEL: Dubbla fält
interface ArtifactFormData {
  stepId: string;           // UI-fält
  metadata: { step_id };    // DB-fält  ← KONFLIKT!
}

// ✅ RÄTT: En sanning
interface ArtifactFormData {
  id: string;
  title: string;
  // ... andra fält
  metadata: {
    step_id?: string;       // ← ENDA KÄLLAN
    // ... andra metadata
  };
}

// Helper för UI
function getArtifactStepId(a: ArtifactFormData): string | undefined {
  return a.metadata?.step_id;
}

function setArtifactStepId(a: ArtifactFormData, stepId: string | undefined): ArtifactFormData {
  return {
    ...a,
    metadata: { ...a.metadata, step_id: stepId },
  };
}
```

**Serialization (DB ↔ Draft):**

```typescript
// Serialize TO DB (publish)
function serializeArtifact(a: ArtifactFormData): DbArtifact {
  return {
    id: a.id,
    title: a.title,
    // ... andra fält
    metadata: a.metadata,  // step_id ingår automatiskt
  };
}

// Deserialize FROM DB (load draft)
function deserializeArtifact(db: DbArtifact): ArtifactFormData {
  return {
    id: db.id,
    title: db.title,
    // ... andra fält
    metadata: db.metadata,  // step_id ingår automatiskt
  };
}
```

**Varför soft link?**
- Ingen DB-migration krävs
- `UNASSIGNED_ARTIFACTS` blir kontraktsvalidering, inte FK-validering
- Om hårda relationer behövs: migrera till `game_step_artifacts` join-tabell

### Publish Uses Server Route

```
┌─────────────┐     POST /api/builder/publish     ┌─────────────┐
│  Builder UI │ ─────────────────────────────────▶ │  API Route  │
│  (client)   │                                    │  (server)   │
└─────────────┘                                    └─────────────┘
                                                          │
                                                          │ service_role
                                                          ▼
                                                   ┌─────────────┐
                                                   │  Supabase   │
                                                   │  RPC        │
                                                   └─────────────┘
```

**Never call `upsert_game_content_v1` from client** — RPC is service_role only.

---

## Arkitektur Översikt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUILDER VALIDATION PIPELINE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                         ┌─────────────────────┐
                         │     GameDraft       │
                         │  (Single Source)    │
                         └─────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ▼              ▼              ▼
           ┌────────────┐  ┌────────────┐  ┌────────────┐
           │   Wizard   │  │ ReactFlow  │  │  Preview   │
           │   Forms    │  │   Canvas   │  │   Mode     │
           └────────────┘  └────────────┘  └────────────┘
                    │              │              │
                    └──────────────┼──────────────┘
                                   ▼
                         ┌─────────────────────┐
                         │   resolveDraft()    │
                         │  (Resolver Service) │
                         └─────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
           ┌────────────┐  ┌────────────┐  ┌────────────┐
           │ Draft Gate │  │Playable Gate│ │Publish Gate│
           │ (Spara)    │  │ (Testa)    │  │ (Publicera)│
           └────────────┘  └────────────┘  └────────────┘
                    │              │              │
                    ▼              ▼              ▼
           ┌─────────────────────────────────────────────┐
           │              BuilderError[]                 │
           │  { path, message, severity, code, gate }    │
           └─────────────────────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
           ┌────────────┐  ┌────────────┐  ┌────────────┐
           │ Kvalitets- │  │  ReactFlow │  │   Toast/   │
           │  kontroll  │  │  Markers   │  │   Banner   │
           │   Panel    │  │ (red nodes)│  │            │
           └────────────┘  └────────────┘  └────────────┘
```

---

## 1. GameDraft Schema

> **Princip**: En sanning. Alla vyer läser/skriver samma state.

### TypeScript Definition

```typescript
// types/game-draft.ts

export interface GameDraft {
  // === Metadata ===
  id: string;                          // Game UUID (from DB or temp)
  tenantId: string;
  isDraft: boolean;                    // true until first publish
  
  // === Core ===
  core: CoreForm;
  
  // === Content Entities ===
  phases: PhaseData[];
  steps: StepData[];
  roles: RoleData[];
  artifacts: ArtifactFormData[];
  triggers: TriggerFormData[];
  
  // === Supporting Data ===
  materials: MaterialsForm;
  boardConfig: BoardConfigData;
  gameTools: GameToolForm[];
  subPurposeIds: string[];
  cover: CoverMedia | null;
}

// Resolved version after wiring
export interface ResolvedGameDraft extends GameDraft {
  // Maps for O(1) lookups
  _phaseMap: Map<string, PhaseData>;
  _stepMap: Map<string, StepData>;
  _roleMap: Map<string, RoleData>;
  _artifactMap: Map<string, ArtifactFormData>;
  _triggerMap: Map<string, TriggerFormData>;
  
  // Computed relationships
  _stepsByPhase: Map<string, StepData[]>;
  _artifactsByStep: Map<string, ArtifactFormData[]>;  // Uses metadata.step_id (soft link)
  _variantsByArtifact: Map<string, ArtifactVariant[]>;
}

// Helper to extract step_id from artifact metadata
function getArtifactStepId(artifact: ArtifactFormData): string | null {
  return artifact.metadata?.step_id ?? null;
}
```

### Serialization Contract

```typescript
// Matches DB payload shape
export function serializeForDb(draft: ResolvedGameDraft): DbGamePayload {
  return {
    game_id: draft.id,
    is_update: !draft.isDraft,
    phases: draft.phases.map(serializePhase),
    steps: draft.steps.map(serializeStep),
    roles: draft.roles.map(serializeRole),
    artifacts: draft.artifacts.map(serializeArtifact),
    artifact_variants: draft.artifacts.flatMap(a => 
      (a.variants || []).map(v => serializeVariant(v, a.id))
    ),
    triggers: draft.triggers.map(serializeTrigger),
    materials: draft.materials,
    board_config: draft.boardConfig,
  };
}
```

---

## 2. BuilderError Format

> **Princip**: Samma shape som ImportError. Återanvändbar infrastruktur.

```typescript
// types/builder-error.ts

export type BuilderErrorSeverity = 'error' | 'warning' | 'info';
export type BuilderGate = 'draft' | 'playable' | 'publish';

export interface BuilderError {
  // === Location ===
  path: string;                        // JSON path: "steps[2].title" or "phases[0]"
  entityType: EntityType;              // 'step' | 'phase' | 'artifact' | etc
  entityId?: string;                   // UUID of affected entity
  
  // === Message ===
  code: string;                        // Machine-readable: 'MISSING_TITLE'
  message: string;                     // Human-readable: "Steg 3 saknar titel"
  
  // === Classification ===
  severity: BuilderErrorSeverity;
  gate: BuilderGate;                   // Which gate catches this
  
  // === UI Hints ===
  field?: string;                      // Specific field: 'title', 'phase_id'
  suggestion?: string;                 // "Lägg till en titel för steget"
  
  // === Debug Metadata (optional) ===
  meta?: Record<string, unknown>;      // Extra data for debugging (e.g., occurrences for DUPLICATE_ID)
}

// ============================================================
// SINGLE SOURCE ENUMS - import from lib/domain/enums.ts
// Never duplicate these lists in validators!
// ============================================================
import { 
  VALID_VISIBILITY, 
  VALID_PHASE_TYPES, 
  VALID_ARTIFACT_TYPES,
  VALID_TIMER_STYLES,
} from '@/lib/domain/enums';

// ============================================================
// ENUM REGISTRY (canonical values)
// Validators MUST use these — never hardcode enum values
// ============================================================
//
// VISIBILITY:     ['public', 'leader_only', 'role_private']
//   source: db
//   constraint: artifact_variants_visibility_check
//
// PHASE_TYPE:     ['intro', 'main', 'outro', 'reflection']
//   source: db
//   constraint: game_phases_phase_type_check
//
// ARTIFACT_TYPE:  ['card', 'board', 'timer', 'scoreboard', 'custom']
//   source: db
//   constraint: game_artifacts_artifact_type_check
//
// TIMER_STYLE:    ['countdown', 'stopwatch', 'hidden']
//   source: builder (no DB constraint — stored in metadata)
//
// GAME_STATUS:    ['draft', 'published', 'archived']
//   source: db
//   constraint: games_status_check
//
// See lib/domain/enums.ts for authoritative definitions
// When adding new enums: verify DB constraint exists or mark as 'builder'
// ============================================================

// Error codes (exhaustive list)
// PREFIX: B_ for Builder errors (distinguishes from I_ Import errors in logs)
export const BUILDER_ERROR_CODES = {
  // Draft-level (structure)
  ORDER_COLLISION: 'B_ORDER_COLLISION',
  DANGLING_REF: 'B_DANGLING_REF',
  INVALID_ENUM: 'B_INVALID_ENUM',
  INVALID_UUID: 'B_INVALID_UUID',      // metadata.step_id is not a valid UUID
  DUPLICATE_ID: 'B_DUPLICATE_ID',
  
  // Playable-level (completeness)
  MISSING_TITLE: 'B_MISSING_TITLE',
  MISSING_PURPOSE: 'B_MISSING_PURPOSE',
  NO_STEPS: 'B_NO_STEPS',
  NO_PHASES: 'B_NO_PHASES',
  TRIGGER_NO_ACTION: 'B_TRIGGER_NO_ACTION',
  ARTIFACT_NO_VARIANTS: 'B_ARTIFACT_NO_VARIANTS',
  ROLE_NO_INSTRUCTIONS: 'B_ROLE_NO_INSTRUCTIONS',
  
  // Publish-level (quality) — ALL ARE WARNINGS, NOT ERRORS
  STEP_TOO_SHORT: 'B_STEP_TOO_SHORT',
  MISSING_DESCRIPTION: 'B_MISSING_DESCRIPTION',
  MISSING_COVER: 'B_MISSING_COVER',
  UNASSIGNED_ARTIFACTS: 'B_UNASSIGNED_ARTIFACTS',
} as const;
```

---

## 3. Resolver Service

> **Princip**: Samma filosofi som import-systemets preflight.

### Interface

```typescript
// lib/builder/resolver.ts

export interface ResolverResult {
  resolved: ResolvedGameDraft;
  errors: BuilderError[];      // severity: 'error'
  warnings: BuilderError[];    // severity: 'warning'
  
  // === Gate checking (semantically correct) ===
  /** Returns errors that block this gate (gate <= targetGate AND severity === 'error') */
  blockingErrorsFor: (gate: BuilderGate) => BuilderError[];
  
  /** True if no blocking errors for this gate */
  isGatePassed: (gate: BuilderGate) => boolean;
  
  // === Convenience lookups ===
  errorsByEntity: Map<string, BuilderError[]>;
  errorsByPath: Map<string, BuilderError[]>;
}

/**
 * resolveDraft - MUST be pure and deterministic
 * 
 * Invariants:
 * - No side effects
 * - No new ID generation
 * - No input mutation
 * - Fast enough to run on every keystroke (or debounced)
 */
export function resolveDraft(draft: GameDraft): ResolverResult {
  const errors: BuilderError[] = [];
  const warnings: BuilderError[] = [];
  
  // 1. Build lookup maps (pure, no mutation)
  const phaseMap = new Map(draft.phases.map(p => [p.id, p]));
  const stepMap = new Map(draft.steps.map(s => [s.id, s]));
  const roleMap = new Map(draft.roles.map(r => [r.id, r]));
  const artifactMap = new Map(draft.artifacts.map(a => [a.id, a]));
  const triggerMap = new Map(draft.triggers.map(t => [t.id, t]));
  
  const maps = { phaseMap, stepMap, roleMap, artifactMap, triggerMap };
  
  // 2. Validate structure (Draft gate)
  errors.push(...validateStructure(draft, maps));
  
  // 3. Validate completeness (Playable gate)
  errors.push(...validateCompleteness(draft, maps));
  
  // 4. Validate quality (Publish gate)
  warnings.push(...validateQuality(draft));
  
  // 5. Build resolved draft with computed relationships
  const resolved: ResolvedGameDraft = {
    ...draft,
    _phaseMap: phaseMap,
    _stepMap: stepMap,
    _roleMap: roleMap,
    _artifactMap: artifactMap,
    _triggerMap: triggerMap,
    _stepsByPhase: groupBy(draft.steps, s => s.phaseId || '__unassigned__'),
    // Uses metadata.step_id (soft link, not FK)
    _artifactsByStep: groupBy(draft.artifacts, a => getArtifactStepId(a) || '__unassigned__'),
    _variantsByArtifact: groupBy(
      draft.artifacts.flatMap(a => a.variants || []),
      v => v.artifactId
    ),
  };
  
  // Combine all for convenience
  const allIssues = [...errors, ...warnings];
  
  return {
    resolved,
    errors,
    warnings,
    
    // === Gate checking (fixed semantics) ===
    // 
    // GATE SEMANTICS:
    //   blockingErrorsFor('draft')    = errors where gate === 'draft' AND severity === 'error'
    //   blockingErrorsFor('playable') = errors where gate in ['draft','playable'] AND severity === 'error'
    //   blockingErrorsFor('publish')  = errors where gate in ['draft','playable','publish'] AND severity === 'error'
    //
    // INVARIANT: isGatePassed(gate) === blockingErrorsFor(gate).length === 0
    //
    // CRITICAL: Warnings MUST NEVER end up in blockingErrorsFor()!
    // All publish-gate items are warnings (see BUILDER_ERROR_CODES).
    // If you need a publish-blocking error, add it to playable gate instead.
    //
    // ============================================================
    // UI BUTTON DISABLED STATES (authoritative)
    // ============================================================
    //
    //   "Spara utkast"        → disabled if blockingErrorsFor('draft').length > 0
    //   "Förhandsgranska"     → disabled if blockingErrorsFor('playable').length > 0
    //   "Publicera"           → disabled if blockingErrorsFor('playable').length > 0
    //                           (publish warnings shown but do NOT disable button)
    //
    // NOTE: Publish button checks 'playable' gate, not 'publish' gate!
    // This is because all publish-gate items are warnings by design.
    //
    blockingErrorsFor: (gate: BuilderGate) => 
      errors.filter(e => gateOrder[e.gate] <= gateOrder[gate] && e.severity === 'error'),
    
    isGatePassed: (gate: BuilderGate) => 
      errors.filter(e => gateOrder[e.gate] <= gateOrder[gate] && e.severity === 'error').length === 0,
    
    // Convenience lookups
    errorsByEntity: groupErrorsByEntity(allIssues),
    errorsByPath: groupErrorsByPath(allIssues),
  };
}

const gateOrder: Record<BuilderGate, number> = {
  draft: 1,
  playable: 2,
  publish: 3,
};
```

### Validation Functions

```typescript
// lib/builder/validators/structure.ts

export function validateStructure(
  draft: GameDraft,
  maps: EntityMaps
): BuilderError[] {
  const errors: BuilderError[] = [];
  
  // === Order Collisions ===
  errors.push(...checkOrderCollisions(draft.phases, 'phase', 'phase_order'));
  errors.push(...checkOrderCollisions(draft.steps, 'step', 'step_order'));
  errors.push(...checkOrderCollisions(draft.roles, 'role', 'role_order'));
  errors.push(...checkOrderCollisions(draft.artifacts, 'artifact', 'artifact_order'));
  
  // === Dangling References: Step → Phase ===
  for (const [idx, step] of draft.steps.entries()) {
    if (step.phaseId && !maps.phaseMap.has(step.phaseId)) {
      errors.push({
        path: `steps[${idx}].phaseId`,
        entityType: 'step',
        entityId: step.id,
        code: 'DANGLING_REF',
        message: `Steg "${step.title || idx + 1}" refererar till en fas som inte finns`,
        severity: 'error',
        gate: 'draft',
        field: 'phaseId',
        suggestion: 'Välj en befintlig fas eller skapa en ny',
      });
    }
  }
  
  // === Dangling References: Artifact → Step (via metadata.step_id) ===
  for (const [idx, artifact] of draft.artifacts.entries()) {
    const stepId = artifact.metadata?.step_id;
    if (stepId && !maps.stepMap.has(stepId)) {
      errors.push({
        path: `artifacts[${idx}].metadata.step_id`,
        entityType: 'artifact',
        entityId: artifact.id,
        code: 'DANGLING_REF',
        message: `Artifact "${artifact.title || idx + 1}" refererar till ett steg som inte finns`,
        severity: 'error',
        gate: 'draft',
        field: 'metadata.step_id',
        suggestion: 'Välj ett befintligt steg eller ta bort kopplingen',
      });
    }
  }
  
  // === Duplicate IDs (with occurrence tracking for debugging) ===
  const idOccurrences = new Map<string, Array<{ entityType: EntityType; path: string }>>();
  
  const trackId = (id: string, entityType: EntityType, path: string) => {
    if (!idOccurrences.has(id)) idOccurrences.set(id, []);
    idOccurrences.get(id)!.push({ entityType, path });
  };
  
  draft.phases.forEach((p, i) => trackId(p.id, 'phase', `phases[${i}]`));
  draft.steps.forEach((s, i) => trackId(s.id, 'step', `steps[${i}]`));
  draft.roles.forEach((r, i) => trackId(r.id, 'role', `roles[${i}]`));
  draft.artifacts.forEach((a, i) => trackId(a.id, 'artifact', `artifacts[${i}]`));
  draft.triggers.forEach((t, i) => trackId(t.id, 'trigger', `triggers[${i}]`));
  
  for (const [id, occurrences] of idOccurrences) {
    if (occurrences.length > 1) {
      errors.push({
        path: occurrences[0].path,
        entityType: occurrences[0].entityType,
        entityId: id,
        code: 'DUPLICATE_ID',
        message: `Duplicerat ID: ${id} (finns i ${occurrences.map(o => o.entityType).join(', ')})`,
        severity: 'error',
        gate: 'draft',
        // UI-användbar meta för "jump list" i kvalitetskontroll
        meta: { 
          id, 
          occurrences: occurrences.map(o => ({
            entityType: o.entityType,  // 'phase' | 'step' | etc
            entityId: id,              // UUID
            path: o.path,              // 'phases[0]' | 'steps[2]' | etc
          })),
        },
      });
    }
  }
  
  // === Invalid Enums ===
  for (const [idx, artifact] of draft.artifacts.entries()) {
    for (const [vIdx, variant] of (artifact.variants || []).entries()) {
      if (variant.visibility && !VALID_VISIBILITY.includes(variant.visibility)) {
        errors.push({
          path: `artifacts[${idx}].variants[${vIdx}].visibility`,
          entityType: 'artifact_variant',
          entityId: variant.id,
          code: 'INVALID_ENUM',
          message: `Ogiltig visibility: "${variant.visibility}"`,
          severity: 'error',
          gate: 'draft',
          field: 'visibility',
          suggestion: `Giltiga värden: ${VALID_VISIBILITY.join(', ')}`,
        });
      }
    }
  }
  
  return errors;
}
```

```typescript
// lib/builder/validators/completeness.ts

export function validateCompleteness(draft: GameDraft): BuilderError[] {
  const errors: BuilderError[] = [];
  
  // === Game must have purpose ===
  if (!draft.core.mainPurposeId) {
    errors.push({
      path: 'core.mainPurposeId',
      entityType: 'game',
      code: 'MISSING_PURPOSE',
      message: 'Spelet måste ha ett syfte valt',
      severity: 'error',
      gate: 'playable',
      field: 'mainPurposeId',
    });
  }
  
  // === Game must have at least one step ===
  if (draft.steps.length === 0) {
    errors.push({
      path: 'steps',
      entityType: 'game',
      code: 'NO_STEPS',
      message: 'Spelet måste ha minst ett steg',
      severity: 'error',
      gate: 'playable',
    });
  }
  
  // === Steps must have titles ===
  for (const [idx, step] of draft.steps.entries()) {
    if (!step.title?.trim()) {
      errors.push({
        path: `steps[${idx}].title`,
        entityType: 'step',
        entityId: step.id,
        code: 'MISSING_TITLE',
        message: `Steg ${idx + 1} saknar titel`,
        severity: 'error',
        gate: 'playable',
        field: 'title',
      });
    }
  }
  
  // === Roles must have private_instructions ===
  for (const [idx, role] of draft.roles.entries()) {
    if (!role.privateInstructions?.trim()) {
      errors.push({
        path: `roles[${idx}].privateInstructions`,
        entityType: 'role',
        entityId: role.id,
        code: 'ROLE_NO_INSTRUCTIONS',
        message: `Roll "${role.name || idx + 1}" saknar hemliga instruktioner`,
        severity: 'error',
        gate: 'playable',
        field: 'privateInstructions',
      });
    }
  }
  
  // === Triggers must have actions ===
  for (const [idx, trigger] of draft.triggers.entries()) {
    if (!trigger.actions || trigger.actions.length === 0) {
      errors.push({
        path: `triggers[${idx}].actions`,
        entityType: 'trigger',
        entityId: trigger.id,
        code: 'TRIGGER_NO_ACTION',
        message: `Trigger "${trigger.name || idx + 1}" har inga actions`,
        severity: 'error',
        gate: 'playable',
        field: 'actions',
      });
    }
  }
  
  return errors;
}
```

```typescript
// lib/builder/validators/quality.ts

export function validateQuality(draft: GameDraft): BuilderError[] {
  const warnings: BuilderError[] = [];
  
  // === Cover image recommended ===
  if (!draft.cover?.url) {
    warnings.push({
      path: 'cover',
      entityType: 'game',
      code: 'MISSING_COVER',
      message: 'Spelet saknar omslagsbild',
      severity: 'warning',
      gate: 'publish',
      suggestion: 'Lägg till en omslagsbild för bättre presentation',
    });
  }
  
  // === Description recommended ===
  if (!draft.core.description?.trim() || draft.core.description.length < 50) {
    warnings.push({
      path: 'core.description',
      entityType: 'game',
      code: 'MISSING_DESCRIPTION',
      message: 'Spelet saknar eller har kort beskrivning',
      severity: 'warning',
      gate: 'publish',
      field: 'description',
      suggestion: 'En bra beskrivning hjälper användare förstå spelet',
    });
  }
  
  // === Steps should have body content ===
  for (const [idx, step] of draft.steps.entries()) {
    if (!step.body?.trim() || step.body.length < 20) {
      warnings.push({
        path: `steps[${idx}].body`,
        entityType: 'step',
        entityId: step.id,
        code: 'STEP_TOO_SHORT',
        message: `Steg "${step.title || idx + 1}" har lite innehåll`,
        severity: 'warning',
        gate: 'publish',
        field: 'body',
      });
    }
  }
  
  // === Artifacts should be linked to steps (soft link via metadata.step_id) ===
  const unassignedArtifacts = draft.artifacts.filter(a => !a.metadata?.step_id);
  if (unassignedArtifacts.length > 0) {
    warnings.push({
      path: 'artifacts',
      entityType: 'game',
      code: 'UNASSIGNED_ARTIFACTS',
      message: `${unassignedArtifacts.length} artifact(s) är inte kopplade till något steg`,
      severity: 'warning',
      gate: 'publish',
      suggestion: 'Koppla varje artifact till ett steg för bättre struktur',
      meta: {
        count: unassignedArtifacts.length,
        artifactIds: unassignedArtifacts.map(a => a.id),
      },
    });
  }
  
  return warnings;
}
```

---

## 4. Gate Rules

> **Princip**: Tydliga regler per nivå. Blockerar = error. Rekommenderar = warning.

### Terminology: Define Gates Precisely

| Gate | Purpose | Contains |
|------|---------|----------|
| **Draft** | Structural integrity | refs, collisions, enums, UUID validity |
| **Playable** | Minimum completeness to run/test | purpose, steps, titles, instructions |
| **Publish** | Quality recommendations | cover, description, content length |

### MUST NEVER Block Rule

> **Warnings MUST NEVER block any action.**

All publish-gate items are warnings. If you need something to block publish, add it to playable gate instead.

### Gate Scope (Cumulative)

- `blockingErrorsFor('draft')` = draft errors only
- `blockingErrorsFor('playable')` = draft errors + playable errors
- `blockingErrorsFor('publish')` = draft + playable + publish errors (but publish has no errors in v1)

### Truth Table: What Blocks What

| Action | Blocks on draft errors | Blocks on playable errors | Blocks on publish warnings |
|--------|------------------------|---------------------------|----------------------------|
| **Spara utkast** | ✅ Yes | ❌ No | ❌ No |
| **Förhandsgranska/Testa** | ✅ Yes | ✅ Yes | ❌ No |
| **Publicera** | ✅ Yes | ✅ Yes | ❌ No |

> **NOTE**: Publish button checks `playable` gate, not `publish` gate. This is intentional — all publish-gate items are warnings by design.

### Draft Gate (Spara utkast)

| Regel | Kod | Blockerar? |
|-------|-----|------------|
| Inga order-kollisioner | `ORDER_COLLISION` | ✅ Error |
| Inga dangling refs (phase_id, role_id, artifact_id) | `DANGLING_REF` | ✅ Error |
| Inga ogiltiga enum-värden | `INVALID_ENUM` | ✅ Error |
| Inga duplicerade UUIDs | `DUPLICATE_ID` | ✅ Error |

### Playable Gate (Redo att testas)

| Regel | Kod | Blockerar? |
|-------|-----|------------|
| Syfte valt | `MISSING_PURPOSE` | ✅ Error |
| Minst 1 steg | `NO_STEPS` | ✅ Error |
| Alla steg har titel | `MISSING_TITLE` | ✅ Error |
| Roller har hemliga instruktioner | `ROLE_NO_INSTRUCTIONS` | ✅ Error |
| Triggers har actions | `TRIGGER_NO_ACTION` | ✅ Error |
| Artifacts (typ="card") har minst 1 variant | `ARTIFACT_NO_VARIANTS` | ✅ Error |

### Publish Gate (Publicera)

| Regel | Kod | Blockerar? |
|-------|-----|------------|
| Omslagsbild finns | `MISSING_COVER` | ⚠️ Warning |
| Beskrivning finns (>50 tecken) | `MISSING_DESCRIPTION` | ⚠️ Warning |
| Steg har body-innehåll | `STEP_TOO_SHORT` | ⚠️ Warning |
| Artifacts har `metadata.step_id` (soft link) | `UNASSIGNED_ARTIFACTS` | ⚠️ Warning |

> **OBS**: `UNASSIGNED_ARTIFACTS` validerar `metadata.step_id` (soft link), inte en FK.  
> Om hårda relationer behövs i framtiden: migrera till `game_step_artifacts` join-tabell.

---

## 5. UI Wiring: Kvalitetskontroll-panelen

> **Princip**: Panelen är en vy på `resolveDraft()` output. Inga egna checks.

### Panel Structure

```typescript
// components/builder/QualityControlPanel.tsx

interface QualityControlPanelProps {
  draft: GameDraft;
  onNavigate: (path: string, entityId?: string) => void;
}

export function QualityControlPanel({ draft, onNavigate }: QualityControlPanelProps) {
  const { errors, warnings, isGatePassed, blockingErrorsFor } = useMemo(
    () => resolveDraft(draft),
    [draft]
  );
  
  const errorsByCategory = useMemo(() => ({
    structure: errors.filter(e => e.gate === 'draft'),
    completeness: errors.filter(e => e.gate === 'playable'),
    quality: warnings,  // All warnings are publish-gate
  }), [errors, warnings]);
  
  return (
    <div className="quality-panel">
      <QualitySection
        title="Struktur"
        icon="🔧"
        count={errorsByCategory.structure.length}
        items={errorsByCategory.structure}
        onItemClick={(e) => onNavigate(e.path, e.entityId)}
      />
      <QualitySection
        title="Spelbarhet"
        icon="🎮"
        count={errorsByCategory.completeness.length}
        items={errorsByCategory.completeness}
        onItemClick={(e) => onNavigate(e.path, e.entityId)}
      />
      <QualitySection
        title="Kvalitet"
        icon="✨"
        count={errorsByCategory.quality.length}
        items={errorsByCategory.quality}
        onItemClick={(e) => onNavigate(e.path, e.entityId)}
      />
      
      <div className="gate-status">
        <GateIndicator 
          gate="draft" 
          passed={isGatePassed('draft')} 
          blockingCount={blockingErrorsFor('draft').length}
        />
        <GateIndicator 
          gate="playable" 
          passed={isGatePassed('playable')} 
          blockingCount={blockingErrorsFor('playable').length}
        />
        <GateIndicator 
          gate="publish" 
          passed={isGatePassed('publish')} 
          blockingCount={blockingErrorsFor('publish').length}
          warningCount={warnings.length}
        />
      </div>
    </div>
  );
}
```

### Navigation Handler

```typescript
// hooks/useBuilderNavigation.ts

export function useBuilderNavigation() {
  const { setActiveSection, setActiveEntity } = useBuilderUI();
  
  const navigateToPath = useCallback((path: string, entityId?: string) => {
    // Parse path to determine section
    const section = parseSectionFromPath(path);
    // e.g., "steps[2].title" → section: 'steps', index: 2, field: 'title'
    
    setActiveSection(section.type);
    
    if (entityId) {
      setActiveEntity(entityId);
      
      // Scroll to element after render
      requestAnimationFrame(() => {
        const element = document.querySelector(`[data-entity-id="${entityId}"]`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        // Focus specific field if provided
        if (section.field) {
          const input = element?.querySelector(`[data-field="${section.field}"]`);
          (input as HTMLElement)?.focus();
        }
      });
    }
  }, [setActiveSection, setActiveEntity]);
  
  return { navigateToPath };
}
```

### Inline Error Markers

```typescript
// components/builder/StepEditor.tsx

interface StepEditorProps {
  step: StepData;
  errors: BuilderError[];  // Filtered for this step
  onChange: (data: Partial<StepData>) => void;
}

export function StepEditor({ step, errors, onChange }: StepEditorProps) {
  const titleError = errors.find(e => e.field === 'title');
  const bodyError = errors.find(e => e.field === 'body');
  
  return (
    <div data-entity-id={step.id}>
      <FormField
        label="Titel"
        data-field="title"
        value={step.title}
        onChange={(v) => onChange({ title: v })}
        error={titleError?.message}
        errorSeverity={titleError?.severity}
      />
      <FormField
        label="Innehåll"
        data-field="body"
        value={step.body}
        onChange={(v) => onChange({ body: v })}
        warning={bodyError?.severity === 'warning' ? bodyError.message : undefined}
      />
    </div>
  );
}
```

---

## 6. ReactFlow Integration

> **Princip**: ReactFlow är en vy + editor på samma GameDraft state.

### Node Types

| Entity | Node Type | Visual |
|--------|-----------|--------|
| Phase | `phaseNode` | Rounded rectangle, colored by phase_type |
| Step | `stepNode` | Card with title, duration badge |
| Artifact | `artifactNode` | Card with type icon |
| Trigger | `triggerNode` | Diamond shape |
| Role | `roleNode` | Circle with icon/color |

### Edge Types

| Relationship | Edge Type | Visual |
|--------------|-----------|--------|
| Phase → Step | `phaseStepEdge` | Solid line |
| Step → Artifact | `stepArtifactEdge` | Dashed line |
| Trigger → Target | `triggerEdge` | Dotted line with arrow |
| Variant → Role | `variantRoleEdge` | Thin line |

### Error Highlighting

```typescript
// components/builder/flow/useFlowErrors.ts

export function useFlowErrors(errors: BuilderError[]) {
  const nodeStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    for (const error of errors) {
      if (error.entityId) {
        styles[error.entityId] = {
          borderColor: error.severity === 'error' ? '#ef4444' : '#f59e0b',
          borderWidth: 2,
          boxShadow: error.severity === 'error' 
            ? '0 0 0 2px rgba(239, 68, 68, 0.3)' 
            : '0 0 0 2px rgba(245, 158, 11, 0.3)',
        };
      }
    }
    
    return styles;
  }, [errors]);
  
  const edgeStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    
    // Highlight edges with dangling refs
    const danglingRefs = errors.filter(e => e.code === 'DANGLING_REF');
    for (const error of danglingRefs) {
      // Edge ID format: `${sourceId}-${targetId}`
      const edgeId = `${error.entityId}-${extractRefId(error.path)}`;
      styles[edgeId] = {
        stroke: '#ef4444',
        strokeWidth: 2,
        strokeDasharray: '5,5',
      };
    }
    
    return styles;
  }, [errors]);
  
  return { nodeStyles, edgeStyles };
}
```

### Drag/Drop Handler

```typescript
// components/builder/flow/FlowCanvas.tsx

export function FlowCanvas({ draft, dispatch }: FlowCanvasProps) {
  const { errors, resolved } = useMemo(() => resolveDraft(draft), [draft]);
  const { nodeStyles, edgeStyles } = useFlowErrors(errors);
  
  const nodes = useMemo(() => buildNodes(resolved, nodeStyles), [resolved, nodeStyles]);
  const edges = useMemo(() => buildEdges(resolved, edgeStyles), [resolved, edgeStyles]);
  
  const onNodeDragStop = useCallback((event, node) => {
    // Update order based on new position
    const entityType = node.type.replace('Node', '');
    const newOrder = calculateOrderFromPosition(node.position, nodes, entityType);
    
    dispatch({
      type: `REORDER_${entityType.toUpperCase()}S`,
      payload: { id: node.id, newOrder },
    });
  }, [dispatch, nodes]);
  
  const onConnect = useCallback((connection) => {
    // Handle new connections (e.g., step → phase)
    const sourceType = getNodeType(connection.source, nodes);
    const targetType = getNodeType(connection.target, nodes);
    
    if (sourceType === 'step' && targetType === 'phase') {
      dispatch({
        type: 'UPDATE_STEP',
        payload: { id: connection.source, data: { phaseId: connection.target } },
      });
    }
  }, [dispatch, nodes]);
  
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodeDragStop={onNodeDragStop}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
    >
      <Background />
      <Controls />
      <MiniMap />
    </ReactFlow>
  );
}
```

---

## 7. Publish Flow

> **Princip**: Publish är atomisk. Gate-check + atomic RPC.  
> **⚠️ KRITISKT**: Publish MÅSTE gå via server route — RPC är service_role only.

### LOCKED CONTRACT: No RPC from Client

```typescript
// ============================================================
// TRIPWIRE: Enforce "never call RPC from client"
// ============================================================
// tests/unit/builder/tripwires.test.ts

it('builder client code does not call upsert RPC directly', async () => {
  const clientFiles = await glob('components/builder/**/*.{ts,tsx}');
  
  for (const file of clientFiles) {
    const content = await fs.readFile(file, 'utf-8');
    expect(content).not.toContain("rpc('upsert_game_content_v1");
    expect(content).not.toContain('rpc("upsert_game_content_v1');
  }
});
```

### API Route Contract

| Steg | Krav | Detalj |
|------|------|--------|
| **1. Auth** | Session user måste vara inloggad | `getServerSession()` returnerar session |
| **2. Game Lookup** | Spelet måste finnas | `games.id = gameId` |
| **3. Authorization** | User måste ha publish-rättighet | Se nedan |
| **4. Validation** | `resolveDraft()` + gate-check på server (authoritative) | Klienten är bara UX |
| **5. Persist** | `service_role` client: `rpc(upsert_game_content_v1)` + `update games` | Atomiskt |
| **6. Response** | `{ ok, runId, counts, errors[], warnings[] }` | Se Response Contract |

### Authorization Details (EXPLICIT)

```typescript
// ============================================================
// AUTHORIZATION: Ownership vs Membership
// ============================================================
//
// Game ownership:   games.owner_tenant_id (FK to tenants)
// User membership:  tenant_members table
//
// REQUIRED PERMISSION:
//   User must be member of game's tenant WITH role in ['admin', 'editor']
//   OR user has system_admin permission (bypass)
//
// Tables used:
//   - games (owner_tenant_id)
//   - tenant_members (tenant_id, user_id, role)
//
// ============================================================

async function checkPublishPermission(
  userId: string,
  tenantId: string,
  userClient: SupabaseClient
): Promise<{ allowed: boolean; reason?: string }> {
  // Check tenant membership with sufficient role
  const { data: membership } = await userClient
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', userId)
    .single();
  
  if (!membership) {
    return { allowed: false, reason: 'NOT_MEMBER' };
  }
  
  const publishRoles = ['admin', 'editor'];  // Explicit list
  if (!publishRoles.includes(membership.role)) {
    return { allowed: false, reason: 'INSUFFICIENT_ROLE' };
  }
  
  return { allowed: true };
}
```

### Request / Response Contract

```typescript
// Request (from client)
interface PublishRequest {
  runId?: string;             // Optional: client can generate, server will if missing
  gameId: string;             // UUID of game to publish
  draft: GameDraft;           // Raw draft from builder state
}

// Response (discriminated union)
type PublishResponse =
  | { ok: true;  runId: string; type: 'publish'; gameId: string; counts: Record<string, number>; warnings: BuilderError[] }
  | { ok: false; runId: string; type: 'publish'; code: 'VALIDATION_FAILED'; errors: BuilderError[] }
  | { ok: false; runId: string; type: 'publish'; code: 'PERMISSION_DENIED' | 'NOT_FOUND' | 'INSUFFICIENT_ROLE'; message: string }
  | { ok: false; runId: string; type: 'publish'; code: 'DB_ERROR'; message: string };
```
```

### Gate Before RPC (Non-Negotiable Ordering)

Server route logic **must** follow this exact order:

```typescript
// 1. Generate runId
const runId = request.runId ?? crypto.randomUUID();

// 2. Auth check
const session = await getServerSession();
if (!session) return { ok: false, runId, code: 'PERMISSION_DENIED' };

// 3. Load + verify game exists
const game = await getGame(gameId);
if (!game) return { ok: false, runId, code: 'NOT_FOUND' };

// 4. Permission check (ownership + membership)
const perm = await checkPublishPermission({ userId: session.user.id, gameId });
if (!perm.ok) return { ok: false, runId, code: perm.code };

// 5. Resolve draft (PURE - no side effects)
const { resolved, blockingErrorsFor, warnings } = resolveDraft(draft);

// 6. Gate check (MUST be before RPC)
const errors = blockingErrorsFor('playable');
if (errors.length > 0) return { ok: false, runId, code: 'VALIDATION_FAILED', errors };

// 7. Serialize
const payload = serializeForDb(resolved);

// 8. Call RPC (service_role only)
const { data, error } = await serviceClient.rpc('upsert_game_content_v1', { p_payload: payload });

// 9. Update status + return
```

### Structured Logging (Minimum Required)

```typescript
console.log(JSON.stringify({
  event: result.ok ? 'game_published' : 'game_publish_failed',
  runId,
  gameId,
  tenantId: game.tenant_id,
  userId: session.user.id,
  result: result.ok ? 'success' : 'failure',
  counts: result.ok ? data.counts : undefined,
  errorCode: result.ok ? undefined : result.code,
  timestamp: new Date().toISOString(),
}));
```

### Audit Trail

När RPC är service_role-only måste servern logga "who did it":

```typescript
// I API route, efter successful publish
console.log(JSON.stringify({
  event: 'game_published',
  runId,
  gameId,
  userId: session.user.id,
  tenantId: game.tenant_id,
  counts: data.counts,
  timestamp: new Date().toISOString(),
}));
```

### Client Side (Builder UI)

```typescript
// components/builder/PublishButton.tsx

async function handlePublish(draft: GameDraft) {
  // 1. Client-side pre-validation (snabb feedback)
  const { isGatePassed, errors } = resolveDraft(draft);
  
  if (!isGatePassed('playable')) {
    toast.error(`Kan inte publicera: ${errors.length} fel`);
    return;
  }
  
  // 2. Send to server route (NEVER call RPC directly)
  const response = await fetch('/api/builder/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gameId: draft.id, draft }),
  });
  
  const result = await response.json();
  
  if (!result.ok) {
    toast.error(result.message);
    return;
  }
  
  toast.success('Spelet publicerat!');
  router.push(`/app/games/${draft.id}`);
}
```

### Server Side (API Route)

```typescript
// app/api/builder/publish/route.ts

import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { resolveDraft, serializeForDb } from '@/lib/builder/resolver';

export async function POST(request: Request) {
  // Generate correlation ID for audit trail
  const runId = crypto.randomUUID();
  
  // 1. Auth check (user must be logged in)
  const session = await getServerSession();
  if (!session) {
    return Response.json({ ok: false, runId, code: 'UNAUTHORIZED' }, { status: 401 });
  }
  
  const { gameId, draft } = await request.json();
  
  // 2. Authorization: Verify user is member of tenant OR system admin
  const userClient = createServerClient();
  const { data: game } = await userClient
    .from('games')
    .select('id, tenant_id')
    .eq('id', gameId)
    .single();
  
  if (!game) {
    return Response.json({ ok: false, runId, code: 'NOT_FOUND' }, { status: 404 });
  }
  
  // Check tenant membership (RLS handles this, but explicit check for clarity)
  const { data: membership } = await userClient
    .from('tenant_members')
    .select('role')
    .eq('tenant_id', game.tenant_id)
    .eq('user_id', session.user.id)
    .single();
  
  if (!membership) {
    return Response.json({ ok: false, runId, code: 'UNAUTHORIZED' }, { status: 403 });
  }
  
  // 3. Server-side validation (AUTHORITATIVE - client validation is just UX)
  const { resolved, isGatePassed, blockingErrorsFor, warnings } = resolveDraft(draft);
  
  const blockingErrors = blockingErrorsFor('playable');  // Playable gate for publish
  if (blockingErrors.length > 0) {
    return Response.json({
      ok: false,
      runId,
      code: 'VALIDATION_FAILED',
      errors: blockingErrors,
    }, { status: 400 });
  }
  
  // 4. Use SERVICE ROLE client for RPC (NEVER from client!)
  const serviceClient = createServiceRoleClient();
  
  const payload = serializeForDb(resolved);
  payload.is_update = true;
  
  const { data, error } = await serviceClient.rpc('upsert_game_content_v1', {
    p_payload: payload,
  });
  
  if (error) {
    // Audit: Log failure
    console.error(JSON.stringify({
      event: 'game_publish_failed',
      runId,
      gameId,
      userId: session.user.id,
      tenantId: game.tenant_id,
      error: error.message,
      timestamp: new Date().toISOString(),
    }));
    
    return Response.json({
      ok: false,
      runId,
      code: 'DB_ERROR',
      message: 'Kunde inte spara till databas',
    }, { status: 500 });
  }
  
  // 5. Update game status
  await serviceClient
    .from('games')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', gameId);
  
  // Audit: Log success
  console.log(JSON.stringify({
    event: 'game_published',
    runId,
    gameId,
    userId: session.user.id,
    tenantId: game.tenant_id,
    counts: data.counts,
    warningCount: warnings.length,
    timestamp: new Date().toISOString(),
  }));
  
  return Response.json({
    ok: true,
    runId,
    gameId,
    counts: data.counts,
    warnings,  // Include warnings so UI can show them
  });
}
```

---

## 8. Test Strategy

> **Princip**: Samma rigor som import-systemet.

### Unit Tests: Validators

```typescript
// tests/unit/builder/validators/structure.test.ts

describe('validateStructure', () => {
  it('detects order collisions in phases', () => {
    const draft = createMockDraft({
      phases: [
        { id: 'p1', phase_order: 1 },
        { id: 'p2', phase_order: 1 },  // Collision!
      ],
    });
    
    const errors = validateStructure(draft, buildMaps(draft));
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'ORDER_COLLISION',
        entityType: 'phase',
      })
    );
  });
  
  it('detects dangling phase_id reference', () => {
    const draft = createMockDraft({
      phases: [{ id: 'phase-1' }],
      steps: [{ id: 'step-1', phaseId: 'non-existent' }],
    });
    
    const errors = validateStructure(draft, buildMaps(draft));
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'DANGLING_REF',
        path: 'steps[0].phaseId',
      })
    );
  });
  
  it('detects invalid visibility enum', () => {
    const draft = createMockDraft({
      artifacts: [{
        id: 'a1',
        variants: [{ visibility: 'role' }],  // Invalid! Should be 'role_private'
      }],
    });
    
    const errors = validateStructure(draft, buildMaps(draft));
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'INVALID_ENUM',
        field: 'visibility',
      })
    );
  });
});
```

### Unit Tests: Completeness

```typescript
// tests/unit/builder/validators/completeness.test.ts

describe('validateCompleteness', () => {
  it('requires at least one step', () => {
    const draft = createMockDraft({ steps: [] });
    
    const errors = validateCompleteness(draft);
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'NO_STEPS',
        gate: 'playable',
      })
    );
  });
  
  it('requires purpose to be set', () => {
    const draft = createMockDraft({
      core: { mainPurposeId: null },
    });
    
    const errors = validateCompleteness(draft);
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'MISSING_PURPOSE',
      })
    );
  });
  
  it('requires role private_instructions', () => {
    const draft = createMockDraft({
      roles: [{ id: 'r1', name: 'Test', privateInstructions: '' }],
    });
    
    const errors = validateCompleteness(draft);
    
    expect(errors).toContainEqual(
      expect.objectContaining({
        code: 'ROLE_NO_INSTRUCTIONS',
        entityId: 'r1',
      })
    );
  });
});
```

### Integration Tests: Publish Gate

```typescript
// tests/integration/builder/publish.test.ts

describe('publishGame', () => {
  it('rejects draft with blocking errors', async () => {
    const draft = createMockDraft({
      steps: [],  // NO_STEPS error
    });
    
    const result = await publishGame(draft, supabase);
    
    expect(result.ok).toBe(false);
    expect(result.code).toBe('VALIDATION_FAILED');
    expect(result.errors).toContainEqual(
      expect.objectContaining({ code: 'NO_STEPS' })
    );
  });
  
  it('allows publish with only warnings', async () => {
    const draft = createValidDraft({
      cover: null,  // MISSING_COVER warning
    });
    
    const result = await publishGame(draft, supabase);
    
    expect(result.ok).toBe(true);
  });
  
  it('uses atomic RPC for publish', async () => {
    const draft = createValidDraft();
    
    const result = await publishGame(draft, supabase);
    
    expect(result.ok).toBe(true);
    expect(result.counts).toBeDefined();
  });
});
```

### Tripwire Tests

```typescript
// tests/unit/builder/tripwires.test.ts

describe('Builder Architecture Tripwires', () => {
  it('resolveDraft is called before any DB write', async () => {
    const publishSource = await fs.readFile('app/api/builder/publish/route.ts', 'utf-8');
    
    // resolveDraft must appear before rpc call
    const resolveIndex = publishSource.indexOf('resolveDraft');
    const rpcIndex = publishSource.indexOf('.rpc(');
    
    expect(resolveIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(-1);
    expect(resolveIndex).toBeLessThan(rpcIndex);
  });
  
  it('publish route checks gate before RPC', async () => {
    const publishSource = await fs.readFile('app/api/builder/publish/route.ts', 'utf-8');
    
    // blockingErrorsFor must appear before rpc call
    const gateCheckIndex = publishSource.indexOf('blockingErrorsFor');
    const rpcIndex = publishSource.indexOf('.rpc(');
    
    expect(gateCheckIndex).toBeGreaterThan(-1);
    expect(rpcIndex).toBeGreaterThan(-1);
    expect(gateCheckIndex).toBeLessThan(rpcIndex);
  });
  
  it('all gates are defined in gate order', () => {
    const gates: BuilderGate[] = ['draft', 'playable', 'publish'];
    
    for (const gate of gates) {
      expect(gateOrder[gate]).toBeDefined();
    }
    
    expect(gateOrder.draft).toBeLessThan(gateOrder.playable);
    expect(gateOrder.playable).toBeLessThan(gateOrder.publish);
  });
  
  it('builder client code does not call upsert RPC directly', async () => {
    const clientFiles = await glob('components/builder/**/*.{ts,tsx}');
    
    for (const file of clientFiles) {
      const content = await fs.readFile(file, 'utf-8');
      expect(content).not.toContain("rpc('upsert_game_content_v1");
      expect(content).not.toContain('rpc("upsert_game_content_v1');
    }
  });
  
  it('publish route uses service_role client', async () => {
    const publishSource = await fs.readFile('app/api/builder/publish/route.ts', 'utf-8');
    
    // Must use service role client for RPC
    expect(publishSource).toContain('createServiceRoleClient');
    
    // Must NOT use regular client for RPC
    const rpcMatch = publishSource.match(/(\.rpc\()/g);
    const serviceRoleMatch = publishSource.match(/serviceClient\.rpc\(/g);
    
    // All rpc calls should be on serviceClient
    expect(rpcMatch?.length).toBe(serviceRoleMatch?.length);
  });
});
```

### Resolver Invariant Tests

```typescript
// tests/unit/builder/resolver.test.ts

describe('resolveDraft invariants', () => {
  it('does not mutate input draft', () => {
    const draft = createMockDraft();
    const frozen = deepFreeze(draft);  // Throws if mutated
    
    // Should not throw
    expect(() => resolveDraft(frozen)).not.toThrow();
  });
  
  it('is deterministic (same input → same output)', () => {
    const draft = createMockDraft();
    
    const result1 = resolveDraft(draft);
    const result2 = resolveDraft(draft);
    
    expect(result1.errors).toEqual(result2.errors);
    expect(result1.warnings).toEqual(result2.warnings);
    expect(result1.isGatePassed('draft')).toBe(result2.isGatePassed('draft'));
  });
  
  it('builds maps only once (O(n) not O(n²))', () => {
    // Create draft with 1000 entities
    const largeDraft = createLargeMockDraft({ 
      phases: 100, 
      steps: 500, 
      artifacts: 400 
    });
    
    const start = performance.now();
    resolveDraft(largeDraft);
    const duration = performance.now() - start;
    
    // Should complete in < 100ms for 1000 entities
    expect(duration).toBeLessThan(100);
  });
  
  it('does not generate new IDs', () => {
    const draft = createMockDraft();
    const originalIds = new Set([
      ...draft.phases.map(p => p.id),
      ...draft.steps.map(s => s.id),
      ...draft.artifacts.map(a => a.id),
    ]);
    
    const { resolved } = resolveDraft(draft);
    
    // All IDs in resolved should exist in original
    for (const phase of resolved.phases) {
      expect(originalIds.has(phase.id)).toBe(true);
    }
  });
});
```

---

## 9. Implementation Roadmap

### Sprint 1: Builder Contracts (Vecka 1)

**Mål**: Formaliserade valideringsregler, typed errors

**Tasks:**
- [ ] Skapa `lib/domain/enums.ts` med ENUM REGISTRY
- [ ] Skapa `types/builder-error.ts` med B_ prefix
- [ ] Implementera `validateStructure()` (order, refs, enums, metadata.step_id)
- [ ] Implementera `validateCompleteness()` (playable gate)
- [ ] Implementera `validateQuality()` (publish gate — warnings only)
- [ ] Implementera `resolveDraft()` med gate-checking
- [ ] Koppla Kvalitetskontroll-panelen till `resolveDraft()`

**Tests (30+ unit, 2 integration):**
- [ ] 15+ unit tests för `validateStructure()`
- [ ] 10+ unit tests för `validateCompleteness()`
- [ ] 5+ unit tests för `validateQuality()`
- [ ] 4+ resolver invariant tests (no mutation, deterministic, O(n), no new IDs)
- [ ] 1 integration: publish-route returns 400 with errors for invalid draft
- [ ] 1 integration: anon client cannot call publish route (401)

**Definition of Done:**
- [ ] Panelen visar riktiga fel med klickbara länkar
- [ ] Alla error codes har B_ prefix
- [ ] `metadata.step_id` is canonical (no shadow props)
- [ ] Tripwires pass: resolver before RPC, gate before RPC, no client RPC
- [ ] Enum registry matches DB constraints (verified manually)

### Sprint 2: Wiring/Resolver (Vecka 2)

**Mål**: `resolveDraft()` som central service

- [ ] Implementera `resolveDraft()` med maps och computed relationships
- [ ] Lägg till inline error markers i Wizard-formulär
- [ ] Lägg till error highlighting i ReactFlow (röd border/edge)
- [ ] Publish använder resolver output
- [ ] Tripwire tests för arkitektur

**DoD**: Inga dangling refs kan nå DB/publish.

### Sprint 3: Persist-strategi (Vecka 3)

**Mål**: Atomisk publish, granular draft-save

- [ ] Draft save: granular upserts (valfritt, nuvarande autosave fungerar)
- [ ] Publish: kör fullständig gate-check + atomic RPC
- [ ] Rollback-mekanism vid publish-fail
- [ ] Integration tests för publish flow

**DoD**: Publish är transaktionell och kör publish-gate.

### Sprint 4: ReactFlow Polish (Vecka 4)

**Mål**: Full ReactFlow-integration

- [ ] Alla node types implementerade
- [ ] Drag/drop uppdaterar draft state
- [ ] Error nodes har tooltips
- [ ] Minimap + controls
- [ ] Sync mellan Wizard och Flow views

**DoD**: ReactFlow är fullt användbar som editor.

---

## 10. Locked Contracts (efter implementation)

| Kontrakt | Beskrivning | Test Coverage |
|----------|-------------|---------------|
| **Structure Validation** | Order, refs, enums | Unit tests |
| **Completeness Validation** | Playable requirements | Unit tests |
| **Quality Validation** | Publish recommendations | Unit tests |
| **Gate Order** | draft < playable < publish | Tripwire |
| **Resolver Before Write** | resolveDraft() före RPC | Tripwire |
| **Atomic Publish** | Gate + RPC i samma flow | Integration tests |

---

## Appendix: Error Code Reference

> **Prefix Convention**: `B_` = Builder, `I_` = Import (for log/search disambiguation)

| Code | Gate | Severity | Message Template |
|------|------|----------|------------------|
| `B_ORDER_COLLISION` | draft | error | `{entityType} har duplicerad order: {order}` |
| `B_DANGLING_REF` | draft | error | `{entity} refererar till {refType} som inte finns` |
| `B_INVALID_ENUM` | draft | error | `Ogiltigt värde för {field}: "{value}"` |
| `B_INVALID_UUID` | draft | error | `{field} är inte ett giltigt UUID: "{value}"` |
| `B_DUPLICATE_ID` | draft | error | `Duplicerat ID: {id}` |
| `B_MISSING_PURPOSE` | playable | error | `Spelet måste ha ett syfte valt` |
| `B_NO_STEPS` | playable | error | `Spelet måste ha minst ett steg` |
| `B_MISSING_TITLE` | playable | error | `{entity} saknar titel` |
| `B_ROLE_NO_INSTRUCTIONS` | playable | error | `Roll "{name}" saknar hemliga instruktioner` |
| `B_TRIGGER_NO_ACTION` | playable | error | `Trigger "{name}" har inga actions` |
| `B_ARTIFACT_NO_VARIANTS` | playable | error | `Artifact "{title}" saknar varianter` |
| `B_MISSING_COVER` | publish | **warning** | `Spelet saknar omslagsbild` |
| `B_MISSING_DESCRIPTION` | publish | **warning** | `Spelet saknar eller har kort beskrivning` |
| `B_STEP_TOO_SHORT` | publish | **warning** | `Steg "{title}" har lite innehåll` |
| `B_UNASSIGNED_ARTIFACTS` | publish | **warning** | `{count} artifacts är inte kopplade till steg` |

---

## Appendix: QA Lint Checklist

> **Instruktion**: Kör denna checklista mot dokumentet innan implementation.

| # | Check | Status |
|---|-------|--------|
| 1 | Finns orden "Canonical storage path (v1)" + `artifacts[i].metadata.step_id`? | ✅ |
| 2 | Finns "Forbidden" lista som uttryckligen förbjuder alternativa fields? | ✅ |
| 3 | Finns `normalizeStepId()` och policy för tom sträng? | ✅ |
| 4 | Finns enum registry med `source: db\|builder` och constraint-namn? | ✅ |
| 5 | Finns Truth Table som visar att warnings aldrig blockar? | ✅ |
| 6 | Finns publish-flow som säger att publish-knappen checkar `playable` gate? | ✅ |
| 7 | Finns explicit `checkPublishPermission()` och namngiven membership-tabell (`tenant_members`)? | ✅ |
| 8 | Finns tripwire: "gate before RPC" + "service_role only"? | ✅ |
| 9 | Finns B_ prefix på alla error codes? | ✅ |
| 10 | Finns resolver invariants (no mutation, deterministic, O(n), no ID creation)? | ✅ |

---

*Skapad 2026-02-02. Status: PLAN. Baserad på Import Atomicity patterns + BUILDER_EVENT_MODEL.md.*
