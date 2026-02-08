# Sprint 2: Wiring Plan

> Status: **Ready to execute**  
> Dependencies: Sprint 1 ✅ (130 tests passing)

## Overview

Sprint 2 migrates runtime code from shadow validator (`validateGameRefs`) to the unified
`resolveDraft()` entrypoint, and ensures Wizard/Templates/Accelerators use the same contracts.

---

## 1. Single Entrypoint Migration

### 1.1 Files to Migrate

| File | Current | Target | Priority |
|------|---------|--------|----------|
| `GameBuilderPage.tsx` | `validateGameRefs()` | `resolveDraft()` | P0 |
| `useGameFlowGraph.ts` | `validateGameRefs()` | `resolveDraft()` | P0 |
| `ValidationPanel.tsx` | Types only | Use resolver output | P1 |

### 1.2 Migration Pattern

```typescript
// BEFORE (scattered validation)
const { errors, warnings } = validateGameRefs(state);
const hasErrors = errors.length > 0;

// AFTER (single source of truth)
const rr = useMemo(() => resolveDraft(draft), [draft]);
const blocking = rr.blockingErrorsFor('playable');
const hasErrors = blocking.length > 0;

// Gate checks
const isDraftValid = rr.isGatePassed('draft');
const isPlayable = rr.isGatePassed('playable');
const isPublishable = rr.isGatePassed('publish');
```

### 1.3 Context Provider (recommended)

```typescript
// BuilderResolvedContext.tsx
const BuilderResolvedContext = createContext<ResolverResult | null>(null);

export function BuilderResolvedProvider({ draft, children }) {
  const rr = useMemo(() => resolveDraft(draft), [draft]);
  return (
    <BuilderResolvedContext.Provider value={rr}>
      {children}
    </BuilderResolvedContext.Provider>
  );
}

export function useBuilderResolved() {
  const ctx = useContext(BuilderResolvedContext);
  if (!ctx) throw new Error('Must be inside BuilderResolvedProvider');
  return ctx;
}
```

---

## 2. Locked Contracts

### 2.1 Steps With/Without Phases

**POLICY**: `step.phase_id` is OPTIONAL. Orphan steps are first-class.

| Gate | Rule |
|------|------|
| Draft | `phase_id = null` → OK (no error) |
| Playable | Requires ≥1 step, but NOT phases |
| Publish | May warn on many orphans (never block) |

**ReactFlow**: `phase-orphan` container always renders orphan steps.

### 2.2 Demo Flag + Product Coupling

**Fields in `CoreForm`**:
```typescript
is_demo_content: boolean;  // Show on demo.lekbanken.no
product_id: string | null; // Link to license product
```

**POLICY v1**:
- `product_id` is optional (allows "free games")
- `is_demo_content` never affects Playable gate
- Publish route may enforce tenant-specific product policies

**Resolver**: Both fields read from same `GameDraft.core`.

### 2.3 Trigger Condition/Action Registry

**Source of truth**: `types/trigger.ts`

```typescript
// Already exists:
export const CONDITION_OPTIONS: ConditionMeta[]
export const ACTION_OPTIONS: ActionMeta[]

// Canonical types:
export type TriggerConditionType = TriggerCondition['type'];
export type TriggerActionType = TriggerAction['type'];
```

**LOCKED CONTRACT**:
1. UI dropdowns use `CONDITION_OPTIONS` / `ACTION_OPTIONS`
2. Validator uses same registry
3. Import uses `KNOWN_CONDITION_TYPES` / `KNOWN_ACTION_TYPES` (derived from same source)

**Gap to fix**: Import has its own registry in `triggerRefRewrite.ts`. Should import from
shared source (Sprint 2 tech debt item).

### 2.4 Publik Tavla (Public Board)

**Status**: Beta, not fully implemented.

**Fields in state**:
```typescript
interface BoardConfigData {
  show_game_name: boolean;
  show_current_phase: boolean;
  show_timer: boolean;
  show_participants: boolean;
  show_public_roles: boolean;
  show_leaderboard: boolean;
  show_qr_code: boolean;
  welcome_message: string;
  theme: BoardTheme;
  background_color: string;
  layout_variant: BoardLayout;
}
```

**POLICY v1**:
- Never blocks Draft/Playable/Publish gates
- May generate warnings if config enables features that require missing data
- Config shape is versioned (`board_config_v1`)

---

## 3. ReactFlow Edge Builder Spec

### 3.1 Node IDs (LOCKED)

| Entity | ID Format | Example |
|--------|-----------|---------|
| Phase | `phase-{uuid}` | `phase-a1b2c3d4-...` |
| Step | `step-{uuid}` | `step-e5f6g7h8-...` |
| Artifact | `artifact-{uuid}` | `artifact-i9j0k1l2-...` |
| Orphan container | `phase-orphan` | (fixed string) |

**Not visualized (v1)**: Roles, Triggers (as nodes)

### 3.2 Edge IDs (LOCKED)

| Edge Type | ID Format | Source → Target |
|-----------|-----------|-----------------|
| Trigger action | `trigger-{triggerId}-{actionIdx}` | condition entity → action entity |
| Artifact→Step | `artifact-step-{artifactId}-{stepId}` | artifact → step (from `metadata.step_id`) |
| Phase sequence | `phase-next-{phaseId}-{nextPhaseId}` | phase → next phase (optional) |

### 3.3 Stable Sorting (CRITICAL)

```typescript
// buildNodes() must sort:
phases:    (phase_order, id)
steps:     (step_order, id)  // within each phase + orphans
artifacts: (artifact_order, id)

// buildEdges() must sort:
triggers:  (trigger_order, actionIdx, id)
```

**Zero-jitter guarantee**: Same draft → same node/edge arrays (deep-equal).

### 3.4 Error Decoration (not position)

```typescript
// Errors affect styles, NOT positions or node list
nodeDecorations = buildNodeDecorations(rr.errors);
edgeDecorations = buildEdgeDecorations(rr.errors);

// Example decoration:
{
  nodeId: 'step-abc123',
  severity: 'error',
  hasErrors: true,
  errorCount: 2,
  tooltip: ['B_EMPTY_STEP: Step has no content']
}
```

---

## 4. Wizard/Templates/Suggestions

### 4.1 Wizard Contract

**Output**: Entities that pass Playable gate (or have clear blocking errors).

**Rules**:
1. Wizard writes ONLY via builder-reducer actions
2. Wizard output is resolver-compatible
3. If placeholder refs needed → generate clear `B_DANGLING_REF` errors

**Trigger Wizard flow**:
1. Name
2. Condition ("När")
3. Action(s) ("Gör")
4. Parameters (artifactId/phaseId etc)
5. Summary → Create

### 4.2 Template Contract

**Definition**:
```typescript
interface Template {
  id: string;
  category: 'escape_room' | 'party' | 'educational' | ...;
  apply: (draft: GameDraft) => GameDraft; // Deterministic patch
}
```

**Rules**:
1. `applyTemplate()` never creates silent dangling refs
2. Placeholder refs → generate `BuilderError` with navigation hint
3. Templates use same registry as validators

### 4.3 Suggestions Contract

```typescript
type Suggestion = {
  id: string;
  type: 'connect' | 'add_trigger' | 'fix_ref';
  title: string;
  description: string;
  apply: () => void; // Dispatches reducer action
};

function deriveSuggestions(rr: ResolverResult): Suggestion[]
```

**Rules**:
1. Suggestions are read-only until user clicks "Apply"
2. Apply goes through reducer (not direct state mutation)

---

## 5. Sprint 2 Task List

### P0 - Must Complete

- [ ] **Migrate `useGameFlowGraph.ts`** to use `resolveDraft()`
- [ ] **Migrate `GameBuilderPage.tsx`** to use `resolveDraft()`
- [ ] **Create `BuilderResolvedContext`** for memoized resolver result
- [ ] **Add Artifact→Step edges** from `metadata.step_id`
- [ ] **Add edge ID stability test** (snapshot format)

### P1 - Should Complete

- [ ] **Connect `QualitetskontrollPanel`** to resolver output
- [ ] **Verify orphan steps render** in `phase-orphan` container
- [ ] **Add click-to-navigate** from error panel to entity

### P2 - Nice to Have

- [ ] **Unify trigger registry** (remove duplicate in `triggerRefRewrite.ts`)
- [ ] **Add board config warnings** when features require missing data
- [ ] **Suggestions engine** (basic implementation)

---

## 6. Definition of Done

### 6.1 Single Entrypoint ✓
- [ ] `validateGameRefs()` not called in runtime paths
- [ ] All UI status driven by `resolveDraft()` output
- [ ] Publish button disabled when `!rr.isGatePassed('playable')`

### 6.2 Error Routing ✓
- [ ] No UI component filters on gate logic
- [ ] Components receive pre-filtered errors via helpers
- [ ] Click on error navigates to correct tab + entity

### 6.3 ReactFlow Stability ✓
- [ ] Same draft produces identical node/edge arrays
- [ ] Errors only affect styles, not positions
- [ ] Edge IDs follow locked format

### 6.4 Tests ✓
- [ ] Edge ID format test (snapshot)
- [ ] Stable sorting test
- [ ] Error decoration mapping test

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Double-resolve per render | `BuilderResolvedContext` with memoization |
| Edge ID drift | Unit test for canonical format |
| Publish on wrong gate | Tripwire test for playable check |
| Registry divergence | Tech debt item to unify trigger registries |

---

## Appendix A: Current Registry Locations

| Registry | Location | Status |
|----------|----------|--------|
| Play modes | `lib/domain/enums.ts` | ✅ Shared |
| Artifact types | `lib/domain/enums.ts` | ✅ Shared |
| Trigger conditions | `types/trigger.ts` | ✅ Primary |
| Trigger actions | `types/trigger.ts` | ✅ Primary |
| Import trigger types | `lib/import/triggerRefRewrite.ts` | ⚠️ Duplicate (tech debt) |

## Appendix B: UI Screenshots Reference

See attached images in conversation for:
- Trigger wizard (5-step flow)
- Trigger templates (by category)
- Artifact templates (by category)
- Trigger condition dropdown (11 options)
- Trigger action dropdown (13 options)
- Publik Tavla config (beta)
- Inställningar with Demo + Product fields
