# Sprint 3: Consolidation & Contracts

> **Datum**: 2026-02-02  
> **Status**: PLAN  
> **Källa**: GPT QA feedback på Sprint 2  
> **Fokus**: Eliminera dual mode, konsolidera trigger registry, låsa contracts

---

## Executive Summary

Sprint 2 låste in single entrypoint (`resolveDraft()`). Sprint 3 fokuserar på:

1. **Kill dual mode** - ValidationPanel blir "ResolveResult only"
2. **Unify trigger registry** - Eliminera duplicering i triggerRefRewrite.ts
3. **Orphan steps** - Säkra first-class stöd överallt
4. **Zero-jitter diffing** - Stabila node/edge ordningar
5. **Beta policies** - Explicit gate-semantik för ofärdiga features

---

## 1. ValidationPanel: Kill Dual Mode

### Problem

ValidationPanel stödjer idag endast `ResolveResult`, men `ValidationResult` är fortfarande i codebase.

### Locked Contract

```typescript
// ============================================================
// TRIPWIRE: No ValidationResult in builder runtime
// ============================================================
// tests/unit/builder/tripwires.test.ts

it('builder runtime does not import ValidationResult', async () => {
  const runtimeFiles = [
    'app/admin/games/builder/**/*.{ts,tsx}',
    'components/builder/**/*.{ts,tsx}',
  ];
  
  for (const pattern of runtimeFiles) {
    const files = await glob(pattern);
    for (const file of files) {
      const content = await fs.readFile(file, 'utf-8');
      expect(content).not.toMatch(/import.*ValidationResult/);
      expect(content).not.toMatch(/from.*validateGameRefs/);
    }
  }
});
```

### Migration Path

| File | Action |
|------|--------|
| `ValidationPanel.tsx` | ✅ Already ResolveResult only |
| `validateGameRefs.ts` | Mark @deprecated, add runtime warning |
| `legacyValidationAdapter.ts` | Create if needed elsewhere |

### Success Criteria

- [ ] Tripwire passes: no `ValidationResult` imports in runtime
- [ ] `validateGameRefs.ts` has deprecation notice
- [ ] No dual mode code paths

---

## 2. Trigger Registry Unification

### Problem

Duplicerad trigger type registry:

| Location | Types |
|----------|-------|
| `lib/domain/enums.ts` | `TRIGGER_CONDITION_TYPES`, `TRIGGER_ACTION_TYPES` |
| `lib/import/triggerRefRewrite.ts` | `KNOWN_CONDITION_TYPES`, `KNOWN_ACTION_TYPES` (local Sets) |

### Locked Contract

```typescript
// ============================================================
// TRIPWIRE: No hardcoded trigger type lists outside enums.ts
// ============================================================

it('triggerRefRewrite uses enums.ts, no local trigger type lists', async () => {
  const content = await fs.readFile('lib/import/triggerRefRewrite.ts', 'utf-8');
  
  // Should import from enums
  expect(content).toMatch(/from.*enums/);
  
  // Should NOT have local hardcoded Sets
  expect(content).not.toMatch(/const KNOWN_CONDITION_TYPES\s*=\s*new Set/);
  expect(content).not.toMatch(/const KNOWN_ACTION_TYPES\s*=\s*new Set/);
});
```

### Migration

```typescript
// Before (triggerRefRewrite.ts)
const KNOWN_CONDITION_TYPES = new Set([
  'step_started',
  'step_completed',
  // ... 30+ types
]);

// After (triggerRefRewrite.ts)
import { 
  TRIGGER_CONDITION_TYPES, 
  TRIGGER_ACTION_TYPES 
} from '@/lib/domain/enums';

const KNOWN_CONDITION_TYPES = new Set(TRIGGER_CONDITION_TYPES);
const KNOWN_ACTION_TYPES = new Set(TRIGGER_ACTION_TYPES);
```

### Success Criteria

- [ ] `triggerRefRewrite.ts` imports from `lib/domain/enums.ts`
- [ ] No local hardcoded trigger type arrays/sets
- [ ] Tripwire passes

---

## 3. Orphan Steps: First-Class Everywhere

### Contract

| Context | Orphan Handling |
|---------|-----------------|
| **ReactFlow** | `phase-orphan` container node exists |
| **Wizard UI** | Orphan steps shown in separate group |
| **Sorting** | Orphans sorted by `step_order`, after phases |
| **Validation** | `step.phase_id = null` is valid, not warning |
| **Serialization** | `phase_id: null` preserved in payload |

### Tripwires

```typescript
// tests/unit/builder/tripwires.test.ts

describe('orphan steps', () => {
  it('ReactFlow includes orphan container node', () => {
    const draft = createMockDraft({
      phases: [{ id: 'p1' }],
      steps: [
        { id: 's1', phaseId: 'p1' },
        { id: 's2', phaseId: null }, // orphan
      ],
    });
    
    const { nodes } = buildNodes(draft);
    
    expect(nodes.some(n => n.id === 'phase-orphan')).toBe(true);
    expect(nodes.some(n => n.id === 'step-s2')).toBe(true);
  });
  
  it('serialization preserves null phase_id', () => {
    const draft = createMockDraft({
      steps: [{ id: 's1', phaseId: null }],
    });
    
    const payload = serializeForDb(draft);
    
    expect(payload.steps[0].phase_id).toBeNull();
  });
});
```

### Success Criteria

- [ ] Orphan container renders in graph
- [ ] Orphans sorted correctly
- [ ] `phase_id: null` serialized (not omitted)

---

## 4. Zero-Jitter Diffing

### Problem

Node/edge arrays can have unstable ordering, causing React re-renders.

### Contract

```typescript
// tests/unit/builder/edge-stability.test.ts

describe('zero-jitter', () => {
  it('buildNodes returns identical output for identical input', () => {
    const draft = createMockDraft({ /* stable data */ });
    
    const result1 = buildNodes(draft);
    const result2 = buildNodes(draft);
    
    // Deep equality - same order, same values
    expect(result1).toEqual(result2);
  });
  
  it('buildEdges returns identical output for identical input', () => {
    const draft = createMockDraft({ /* stable data */ });
    
    const result1 = buildEdges(draft);
    const result2 = buildEdges(draft);
    
    expect(result1).toEqual(result2);
  });
});
```

### Implementation

```typescript
// Sort nodes: by type, then by order, then by id (stable tiebreaker)
function sortNodes(nodes: Node[]): Node[] {
  return [...nodes].sort((a, b) => {
    const typeOrder = NODE_TYPE_ORDER[a.type] - NODE_TYPE_ORDER[b.type];
    if (typeOrder !== 0) return typeOrder;
    
    const orderA = a.data?.order ?? Infinity;
    const orderB = b.data?.order ?? Infinity;
    if (orderA !== orderB) return orderA - orderB;
    
    return a.id.localeCompare(b.id);
  });
}

const NODE_TYPE_ORDER = {
  phaseNode: 1,
  stepNode: 2,
  artifactNode: 3,
  triggerNode: 4,
};
```

### Success Criteria

- [ ] `buildNodes()` deterministic
- [ ] `buildEdges()` deterministic
- [ ] No graph flicker on unchanged data

---

## 5. Beta Feature Policies

### Publik Tavla (Public Board)

| Gate | Policy |
|------|--------|
| Draft | No validation |
| Playable | No validation |
| Publish | Warning only if active but incomplete |

```typescript
// validators/quality.ts

if (draft.boardConfig?.publicBoard?.enabled && !isPublicBoardComplete(draft)) {
  warnings.push({
    path: 'boardConfig.publicBoard',
    code: 'B_PUBLIC_BOARD_BETA',
    message: 'Beta: Publik tavla är aktiverad men inte fullständigt konfigurerad',
    severity: 'warning',
    gate: 'publish',
    suggestion: 'Publik tavla är under utveckling - validering ej komplett',
  });
}
```

### Demo + Product Coupling

| Field | Draft | Playable | Publish |
|-------|-------|----------|---------|
| `is_demo_content` | - | - | Warning if demo utan omslagsbild |
| `product_id` | - | - | Warning if recommended but missing |

```typescript
// validators/quality.ts

if (draft.core.isDemoContent && !draft.cover?.url) {
  warnings.push({
    path: 'cover',
    code: 'B_DEMO_MISSING_COVER',
    message: 'Demo-lek saknar omslagsbild',
    severity: 'warning',
    gate: 'publish',
  });
}
```

### Success Criteria

- [ ] Beta features have explicit gate policies
- [ ] UI shows beta status in Kvalitetskontroll
- [ ] No beta feature blocks publish

---

## 6. QualityControlPanel Full Wiring

### Current State

`ValidationPanel.tsx` shows errors/warnings but limited navigation.

### Target State

```typescript
// QualityControlPanel features:
// 1. Grouped by section (steps, phases, artifacts, etc)
// 2. Click-to-navigate to entity
// 3. Gate indicators (draft/playable/publish passed?)
// 4. Counts per severity

interface QualityControlPanelProps {
  result: ResolverResult;
  onNavigateToItem: (section: string, entityId: string) => void;
}
```

### UI Contract

| Section | Click Action |
|---------|--------------|
| Steps | Navigate to step editor, focus field |
| Phases | Navigate to phases section |
| Artifacts | Open artifact modal |
| Triggers | Navigate to triggers section |
| Core | Navigate to basic info |

### Success Criteria

- [ ] All sections navigable
- [ ] Gate indicators visible
- [ ] Warning/error counts accurate

---

## 7. Wizard/Mallar Resolver Integration

### Locked Contract

```typescript
// ============================================================
// POLICY: Wizard/Mallar writes ONLY via reducer actions
// ============================================================

// ❌ FORBIDDEN: Direct state mutation
const applyTemplate = (draft: GameDraft, template: Template) => {
  draft.steps.push(...template.steps); // NO!
};

// ✅ REQUIRED: Via reducer
const applyTemplate = (dispatch: BuilderDispatch, template: Template) => {
  for (const step of template.steps) {
    dispatch({ type: 'ADD_STEP', payload: step });
  }
};
```

### Template Apply Tests

```typescript
// tests/unit/builder/templates.test.ts

describe('applyTemplate', () => {
  it('creates valid draft (draft gate passed)', () => {
    const template = getTemplate('basic-workshop');
    const draft = applyTemplate(emptyDraft(), template);
    const result = resolveDraft(draft);
    
    expect(result.isGatePassed('draft')).toBe(true);
  });
  
  it('uses enum registry, no hardcoded values', async () => {
    const templateFiles = await glob('lib/templates/**/*.ts');
    
    for (const file of templateFiles) {
      const content = await fs.readFile(file, 'utf-8');
      
      // Should import enums
      expect(content).toMatch(/from.*enums/);
      
      // Should not hardcode artifact types
      expect(content).not.toMatch(/artifact_type:\s*['"]card['"]/);
    }
  });
  
  it('template is deterministic', () => {
    const template = getTemplate('basic-workshop');
    
    const draft1 = applyTemplate(emptyDraft(), template);
    const draft2 = applyTemplate(emptyDraft(), template);
    
    // Note: IDs will differ, but structure should match
    expect(draft1.steps.length).toBe(draft2.steps.length);
    expect(draft1.phases.length).toBe(draft2.phases.length);
  });
});
```

### Success Criteria

- [ ] Templates apply via reducer
- [ ] Applied templates pass draft gate
- [ ] No hardcoded enums in templates

---

## Sprint 3 Execution Order

### P0 (Must Have)

1. **Trigger registry unification** - Eliminera duplicering (30 min)
2. **Kill dual mode tripwire** - Lägg test som failar på ValidationResult import (15 min)
3. **Zero-jitter tests** - Säkra determinism i buildNodes/buildEdges (30 min)

### P1 (Should Have)

4. **Orphan steps tests** - Container + serialization (30 min)
5. **Beta policies** - Public board + demo warnings (30 min)
6. **QualityControlPanel wiring** - Full click navigation (1h)

### P2 (Nice to Have)

7. **Template tests** - Om templates existerar (1h)
8. **Publish flow** - Server route connection (2h)

---

## Acceptance Criteria

- [ ] All new tripwires pass
- [ ] No trigger type duplication
- [ ] ValidationPanel is ResolveResult-only
- [ ] Zero-jitter verified
- [ ] Beta features have explicit policies
- [ ] 145+ tests passing

---

## Files to Modify

| File | Change |
|------|--------|
| `lib/import/triggerRefRewrite.ts` | Import from enums.ts |
| `tests/unit/builder/tripwires.test.ts` | Add dual-mode + trigger tripwires |
| `tests/unit/builder/edge-stability.test.ts` | Add zero-jitter tests |
| `lib/builder/validators/quality.ts` | Add beta feature warnings |
| `ValidationPanel.tsx` | Minor cleanup (already correct) |
