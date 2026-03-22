# Game Builder Implementation Tracker

# Game Builder Implementation Tracker

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-25
- Last updated: 2026-03-21
- Last validated: 2026-01-25

> Historical snapshot of builder implementation progress after the roadmap analysis. Canonical routing starts at `docs/builder/README.md`.
**Started:** 2026-01-24  
**Last Updated:** 2026-03-21  
**Last validated:** 2026-01-25  
**Status:** historical snapshot  
---
**Execution status:** Phase 2 Complete ✅  
**Canonical entrypoint:** `docs/builder/README.md`

---

## Overview

This document tracks the implementation of the Game Builder improvements based on the inventory and roadmap defined in [GAME_BUILDER_INVENTORY_AND_ROADMAP.md](./GAME_BUILDER_INVENTORY_AND_ROADMAP.md).

The implementation follows a hybrid "Outline as source + Flow as visualization" approach where:
- **Phases remain containers** with steps nested inside
- **Triggers create the real edges** visualized as connections
- **Editing happens via structured forms** with visual overview for understanding

---

## Implementation Phases

### Phase 0: State Refactor + Undo/Redo ✅ COMPLETE

**Goal:** Clean up before adding new features - extract builder state to a hook with reducer-based history.

| Task | Status | Files | Notes |
|------|--------|-------|-------|
| Create GameBuilderState types | ✅ Done | [types/game-builder-state.ts](../types/game-builder-state.ts) | All state types, actions, defaults |
| Create useGameBuilder hook | ✅ Done | [hooks/useGameBuilder.ts](../hooks/useGameBuilder.ts) | ~470 lines with full undo/redo |
| Integrate hook into GameBuilderPage | ✅ Done | [GameBuilderPage.tsx](../app/admin/games/builder/GameBuilderPage.tsx) | Replaced 15+ useState calls |
| Add keyboard shortcuts | ✅ Done | GameBuilderPage.tsx | Ctrl+Z (undo), Ctrl+Y / Ctrl+Shift+Z (redo) |
| Fix SessionControlPanel status | ✅ Done | [SessionControlPanel.tsx](../components/play/SessionControlPanel.tsx) | Added 'draft' and 'lobby' status badges |

**Technical Details:**
- History pattern: `past/present/future` arrays with MAX_HISTORY_SIZE = 50
- Committing actions: ADD/DELETE/REORDER commit immediately
- Non-committing actions: SET actions use debounced commits (800ms)
- stateRef for accessing current state in callbacks (avoids stale closure issues)

---

### Phase 1: MVP Overview Tab ✅ COMPLETE

**Goal:** Add "Översikt" section with static visualization of game structure.

| Task | Status | Files | Notes |
|------|--------|-------|-------|
| Add 'oversikt' to BuilderSectionNav | ✅ Done | [BuilderSectionNav.tsx](../app/admin/games/builder/components/BuilderSectionNav.tsx) | MapIcon, second in nav order |
| Create deriveOverviewGraph helper | ✅ Done | [overview/deriveOverviewGraph.ts](../app/admin/games/builder/components/overview/deriveOverviewGraph.ts) | ~400 lines, extracts nodes/edges |
| Create GameOverview component | ✅ Done | [overview/GameOverview.tsx](../app/admin/games/builder/components/overview/GameOverview.tsx) | ~650 lines with SVG edges |
| Create overview index exports | ✅ Done | [overview/index.ts](../app/admin/games/builder/components/overview/index.ts) | Exports GameOverview + utilities |
| Add GameOverview to components index | ✅ Done | [components/index.ts](../app/admin/games/builder/components/index.ts) | Added export |
| Wire GameOverview in page render | ✅ Done | GameBuilderPage.tsx | Renders when activeSection === 'oversikt' |
| Add translations (sv/en/no) | ✅ Done | messages/*.json | `admin.games.builder.overview.*` namespace |

**Component Structure:**
```
GameOverview
├── PhaseContainer - Renders phases with nested steps
│   └── StepNode - Individual step display
├── OrphanStepsContainer - Steps without a phase
├── ArtifactNode - Artifact display  
├── EdgesSvg - SVG overlay for trigger edges
│   └── TriggerEdgeLabel - Unresolved warning icons
├── Legend - Color coding explanation
└── Quick Stats Grid - Counts for phases/steps/artifacts/triggers
```

**Features Implemented:**
- Phases as containers with steps nested inside
- Orphan steps (no phase) displayed separately
- Artifacts section at bottom
- Triggers summary with quick navigation buttons
- SVG curved edges for trigger relationships with arrowheads
- Click-to-navigate on any node (opens respective editor section)
- Unresolved reference warnings (red dashed edges)
- Legend for node/edge colors
- Quick stats grid (phase/step/artifact/trigger counts)
- Empty state with call-to-action buttons

---

### Phase 2: React Flow Integration ✅ COMPLETE

**Goal:** Replace simple SVG with React Flow for better UX (pan/zoom/minimap).

| Task | Status | Files | Notes |
|------|--------|-------|-------|
| Install @xyflow/react | ✅ Done | package.json | React Flow v12 library |
| Create useGameFlowGraph hook | ✅ Done | [overview/useGameFlowGraph.ts](../app/admin/games/builder/components/overview/useGameFlowGraph.ts) | ~365 lines, derives nodes/edges |
| Create custom node types | ✅ Done | [overview/FlowNodes.tsx](../app/admin/games/builder/components/overview/FlowNodes.tsx) | PhaseNode, StepNode, ArtifactNode |
| Create custom edge types | ✅ Done | [overview/FlowEdges.tsx](../app/admin/games/builder/components/overview/FlowEdges.tsx) | TriggerEdge with curved bezier |
| Create GameFlowCanvas | ✅ Done | [overview/GameFlowCanvas.tsx](../app/admin/games/builder/components/overview/GameFlowCanvas.tsx) | ~280 lines, React Flow wrapper |
| Add mini-map | ✅ Done | GameFlowCanvas.tsx | Color-coded by node type |
| Add zoom controls | ✅ Done | GameFlowCanvas.tsx | Zoom in/out/fit buttons |
| Update exports | ✅ Done | overview/index.ts, components/index.ts | Added GameFlowCanvas |
| Wire into GameBuilderPage | ✅ Done | GameBuilderPage.tsx | Replaced GameOverview with GameFlowCanvas |

**Technical Details:**
- Uses @xyflow/react v12 (React Flow)
- Custom nodes: PhaseNode (blue), StepNode (emerald), ArtifactNode (amber)
- Custom edges: TriggerEdge with curved bezier paths, unresolved warnings
- MiniMap: Color-coded by node type (phase/step/artifact)
- Controls: Zoom in/out/fit, pan with drag
- Click-to-navigate: Any node opens corresponding editor section
- Unresolved reference count shown in UI

**Free Features Used:**
- ReactFlow component (viewport, panning)
- Background component (grid dots)
- MiniMap component (navigation)
- Controls component (zoom buttons)
- Custom nodes & edges (fully customizable)

**Important Notes:**
- User explicitly requested: "Avoid paid React Flow features"
- Only using open-source features (no Pro license required)

---

### Phase 3: Polish 🔄 IN PROGRESS

| Task | Status | Priority | Notes |
|------|--------|----------|-------|
| Validation inline (red borders) | ✅ Done | High | Real-time feedback with error/warning badges |
| Edge editing (click edge → edit trigger) | ✅ Done | Medium | Click trigger edge to navigate to trigger editor |
| Auto-layout button | ✅ Done | Medium | Dagre layout algorithm for automatic positioning |
| Multi-select nodes | ✅ Done | Medium | Shift+drag box select, SelectionMode.Partial |
| Snap-to-grid | ✅ Done | Low | 20x20 grid snapping when dragging |
| Quick-add from context menu | ⏳ TODO | Medium | Right-click to add |
| Keyboard shortcuts (Delete to remove) | ⏳ TODO | Low | Already have Ctrl+Z/Y |
| Zoom-to-cursor | ⏳ TODO | Low | Nice-to-have UX |

**Phase 3 Progress:**
- ✅ Added inline validation with red/amber borders on nodes with errors/warnings
- ✅ Added validation badges showing error/warning counts
- ✅ Added edge click handler to navigate to trigger editor
- ✅ Integrated existing `validateGameRefs` utility into flow graph
- ✅ Added validation summary section (error + warning counts)
- ✅ Installed @dagrejs/dagre for auto-layout
- ✅ Added auto-layout button with LR (left-to-right) layout
- ✅ Added multi-select (selectionOnDrag + SelectionMode.Partial)
- ✅ Added snap-to-grid (20x20 grid)
- ✅ Added translations for new features (autoLayout, legend.error)

---

### Future Improvements (Backlog)

| Task | Priority | Notes |
|------|----------|-------|
| Add Zod schemas for runtime validation | Medium | schemas/game-builder.ts |
| Standardize makeId() in lib/utils | Low | Currently duplicated |
| Extract ConditionEditor/ActionEditor from TriggerEditor | Low | For reuse |
| Split ArtifactEditor into sub-editors | Low | 1398 lines is large |
| Add optimistic locking | Low | Prevent concurrent edit overwrites |
| Add snapshot history (major changes) | Low | Revert to earlier states |

---

## Files Created/Modified

### New Files
| File | Purpose | Lines |
|------|---------|-------|
| `types/game-builder-state.ts` | Centralized state types | ~200 |
| `hooks/useGameBuilder.ts` | State management hook with undo/redo | ~470 |
| `app/admin/games/builder/components/overview/deriveOverviewGraph.ts` | Graph derivation logic | ~400 |
| `app/admin/games/builder/components/overview/GameOverview.tsx` | Visual overview component (Phase 1) | ~650 |
| `app/admin/games/builder/components/overview/useGameFlowGraph.ts` | React Flow graph derivation hook + validation | ~440 |
| `app/admin/games/builder/components/overview/FlowNodes.tsx` | Custom React Flow node components with validation | ~300 |
| `app/admin/games/builder/components/overview/FlowEdges.tsx` | Custom React Flow edge component | ~120 |
| `app/admin/games/builder/components/overview/GameFlowCanvas.tsx` | React Flow canvas with auto-layout | ~420 |
| `app/admin/games/builder/components/overview/index.ts` | Exports | ~15 |

### Modified Files
| File | Changes |
|------|---------|
| `app/admin/games/builder/GameBuilderPage.tsx` | Integrated useGameBuilder hook, keyboard shortcuts, GameFlowCanvas render |
| `app/admin/games/builder/components/BuilderSectionNav.tsx` | Added 'oversikt' section |
| `app/admin/games/builder/components/index.ts` | Added GameFlowCanvas export |
| `components/play/SessionControlPanel.tsx` | Added 'draft' and 'lobby' status badges |
| `messages/sv.json` | Added overview translations, fixed jsonEscaping bug, added autoLayout |
| `messages/en.json` | Added overview translations, fixed jsonEscaping bug, added autoLayout |
| `messages/no.json` | Added overview translations, fixed jsonEscaping bug, added autoLayout |
| `package.json` | Added @xyflow/react and @dagrejs/dagre dependencies |

---

## Translation Keys Added

Namespace: `admin.games.builder.overview`

| Key | Description |
|-----|-------------|
| `title` | Section title |
| `description` | Section description |
| `phaseLabel` | Label for phases |
| `noSteps` | Empty phase message |
| `orphanPhase` | Title for steps without phase |
| `orphanDescription` | Description for orphan steps |
| `empty.title` | Empty state title |
| `autoLayout` | Auto-layout button label |
| `legend.error` | Legend label for validation errors |
| `empty.description` | Empty state description |
| `empty.addSteps` | CTA button text |
| `empty.addPhases` | CTA button text |
| `unresolvedWarning` | Warning for unresolved trigger refs |
| `legend.phase` | Legend label |
| `legend.step` | Legend label |
| `legend.artifact` | Legend label |
| `legend.unlocks` | Legend label |
| `legend.reveals` | Legend label |
| `artifactsSection` | Artifacts section title |
| `triggersSection` | Triggers section title (with count) |
| `more` | "more" text for overflow |
| `stats.phases` | Stats label |
| `stats.steps` | Stats label |
| `stats.artifacts` | Stats label |
| `stats.triggers` | Stats label |

---

## Bug Fixes

| Issue | Status | Fix |
|-------|--------|-----|
| jsonEscaping translation error in GameInfoDialog | ✅ Fixed | Removed `{'""'}` curly brace syntax from translations |
| TypeScript error: TriggerCondition/TriggerAction import | ✅ Fixed | Import from `@/types/trigger` not `@/types/games` |
| Unused imports in GameOverview | ✅ Fixed | Removed TriggerFormData, OverviewGraph, NodeType |
| SessionControlPanel missing 'draft'/'lobby' status | ✅ Fixed | Added to badges object |

---

## Testing Checklist

### Phase 0
- [x] All useState calls migrated to useGameBuilder hook
- [x] TypeScript compiles without errors
- [x] Undo/redo keyboard shortcuts work (Ctrl+Z, Ctrl+Y)
- [x] Autosave still functions
- [ ] Manual test: Create new game, edit all sections
- [ ] Manual test: Edit existing game, verify state loads

### Phase 1
- [x] 'Översikt' visible in navigation
- [x] GameOverview renders without errors
- [x] Translations load correctly (sv/en/no)
- [ ] Manual test: Create game with phases/steps, verify visualization
- [ ] Manual test: Click nodes to navigate to editors
- [ ] Manual test: Add triggers, verify edges appear

---

## ChatGPT Feedback Applied

From the user's ChatGPT conversation, the following feedback was incorporated:

| Feedback | Applied |
|----------|---------|
| History should be 50-100 states, not 20 | ✅ MAX_HISTORY_SIZE = 50 |
| Commit-actions save directly, text debounced | ✅ Committing vs non-committing actions |
| Zod: start minimal | ⏳ Deferred to later phase |
| React Flow in Phase 2, not Phase 1 | ✅ Phase 1 uses simple SVG |
| Avoid paid React Flow features | ✅ Noted in Phase 2 requirements |

---

## Next Steps

1. **Testing Phase 1**: Manually verify the overview visualization works
2. **Decide on Phase 2**: Evaluate if React Flow is needed or if SVG is sufficient
3. **Address real-time validation**: High priority from gap analysis
4. **Continue to Phase 2**: If React Flow integration is desired

---

## Architecture Decisions

### Decision 1: Hybrid Outline + Flow Visualization ✅
- Phases as containers (not nodes in pure graph)
- Triggers create the real edges
- Edit via forms, visualize via overview

### Decision 2: Reducer with History Pattern ✅
- useReducer with past/present/future arrays
- Committing vs non-committing actions
- Debounced commits for text fields

### Decision 3: SVG for Phase 1 ✅
- Simple flex layout with SVG overlay
- React Flow deferred to Phase 2
- Avoid over-engineering initial implementation

---

*This document should be updated as implementation progresses.*
