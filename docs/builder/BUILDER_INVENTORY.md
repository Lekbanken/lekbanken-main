# Game Builder Inventory

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Frozen file-by-file builder inventory snapshot from the 2026-02-08 audit batch. Useful as a structure map, but re-audit ownership and risk before large-scale reorganization.

**Exekveringsstatus:** KOMPLETT FIL-FÖR-FIL INVENTORY

---

## Inventering Legend

| Symbol | Betydelse |
|--------|-----------|
| 🔴 HIGH | Kritisk fil, ändring kräver noggrann review |
| 🟡 MED | Viktig fil, moderat risk |
| 🟢 LOW | Hjälpfil eller leaf UI, låg risk |
| **CORE** | Kärnlogik, state, persistence |
| **UI** | Presentation, komponenter |
| **UTIL** | Hjälpfunktioner, validering |
| **API** | Server-side endpoints |
| **TYPE** | TypeScript-typer |

---

## 1. Routes/Pages

### Entry Points

| Fil | Ansvar | Dependencies | Risk | Typ |
|-----|--------|--------------|------|-----|
| [app/admin/games/page.tsx](../../app/admin/games/page.tsx) | Lista alla lekar, entry till builder | `GameAdminPageV2`, `requireSystemAdmin` | 🟢 LOW | UI |
| [app/admin/games/new/page.tsx](../../app/admin/games/new/page.tsx) | Skapa ny lek | `GameBuilderPage`, `requireSystemAdmin` | 🟢 LOW | UI |
| [app/admin/games/[gameId]/edit/page.tsx](../../app/admin/games/%5BgameId%5D/edit/page.tsx) | Redigera lek | `GameBuilderPage`, `SystemAdminClientGuard` | 🟢 LOW | UI |

---

## 2. Komponenter

### Main Builder

| Fil | Ansvar | Dependencies | Risk | Typ |
|-----|--------|--------------|------|-----|
| [app/admin/games/builder/GameBuilderPage.tsx](../../app/admin/games/builder/GameBuilderPage.tsx) | **HUVUDKOMPONENT** - All state, save, load, render | `useGameBuilder`, alla section-komponenter, API:er | 🔴 HIGH | CORE/UI |
| [app/admin/games/builder/GameBuilderForm.tsx](../../app/admin/games/builder/GameBuilderForm.tsx) | Legacy form (deprecated) | - | 🟢 LOW | DEPRECATED |

### Section Components

| Fil | Ansvar | Dependencies | Risk | Typ |
|-----|--------|--------------|------|-----|
| [components/BuilderSectionNav.tsx](../../app/admin/games/builder/components/BuilderSectionNav.tsx) | Vänster sidebar navigation | PlayMode, completedSections | 🟢 LOW | UI |
| [components/QualityChecklist.tsx](../../app/admin/games/builder/components/QualityChecklist.tsx) | Höger sidebar kvalitetscheck | QualityState | 🟢 LOW | UI |
| [components/StepEditor.tsx](../../app/admin/games/builder/components/StepEditor.tsx) | Steg-editor med drag-drop | StepData[], phases | 🟡 MED | UI |
| [components/PhaseEditor.tsx](../../app/admin/games/builder/components/PhaseEditor.tsx) | Fas-editor med timers | PhaseData[] | 🟡 MED | UI |
| [components/RoleEditor.tsx](../../app/admin/games/builder/components/RoleEditor.tsx) | Roll-definitioner | RoleData[] | 🟡 MED | UI |
| [components/ArtifactEditor.tsx](../../app/admin/games/builder/components/ArtifactEditor.tsx) | **STOR KOMPONENT** - Alla artifact-typer (~1400 rader) | ArtifactFormData[], roles, steps | 🔴 HIGH | UI |
| [components/ArtifactWizard.tsx](../../app/admin/games/builder/components/ArtifactWizard.tsx) | Steg-för-steg artifact-skapande | ArtifactFormData | 🟡 MED | UI |
| [components/TriggerEditor.tsx](../../app/admin/games/builder/components/TriggerEditor.tsx) | **STOR KOMPONENT** - Trigger-regler (~774 rader) | TriggerFormData[], artifacts, steps, phases, roles | 🔴 HIGH | UI |
| [components/TriggerSimulator.tsx](../../app/admin/games/builder/components/TriggerSimulator.tsx) | Sandbox-test av triggers | triggers, artifacts | 🟡 MED | UI |
| [components/BoardEditor.tsx](../../app/admin/games/builder/components/BoardEditor.tsx) | Publik tavla-konfiguration | BoardConfigData | 🟢 LOW | UI |
| [components/MaterialEditor.tsx](../../app/admin/games/builder/components/MaterialEditor.tsx) | Material och förberedelser | MaterialsForm | 🟢 LOW | UI |
| [components/DecisionEditor.tsx](../../app/admin/games/builder/components/DecisionEditor.tsx) | Poll/vote/quiz templates | - | 🟢 LOW | UI |
| [components/PlayModeSelector.tsx](../../app/admin/games/builder/components/PlayModeSelector.tsx) | Välj basic/facilitated/participants | play_mode | 🟢 LOW | UI |
| [components/SaveIndicator.tsx](../../app/admin/games/builder/components/SaveIndicator.tsx) | Autosave status display | saveStatus, lastSaved | 🟢 LOW | UI |
| [components/SnapshotManager.tsx](../../app/admin/games/builder/components/SnapshotManager.tsx) | Version snapshots (ej aktivt) | - | 🟢 LOW | UI |
| [components/TemplatePickerDialog.tsx](../../app/admin/games/builder/components/TemplatePickerDialog.tsx) | Trigger templates | - | 🟢 LOW | UI |
| [components/StandardImagePicker.tsx](../../app/admin/games/builder/components/StandardImagePicker.tsx) | Stock image selection | - | 🟢 LOW | UI |
| [components/ValidationPanel.tsx](../../app/admin/games/builder/components/ValidationPanel.tsx) | Visa validation errors | ValidationResult | 🟢 LOW | UI |

### Overview/Graph Components

| Fil | Ansvar | Dependencies | Risk | Typ |
|-----|--------|--------------|------|-----|
| [components/overview/GameFlowCanvas.tsx](../../app/admin/games/builder/components/overview/GameFlowCanvas.tsx) | Visual flow-graf | useGameFlowGraph, ReactFlow | 🟡 MED | UI |
| [components/overview/GameOverview.tsx](../../app/admin/games/builder/components/overview/GameOverview.tsx) | Översiktsvy | GameBuilderState | 🟢 LOW | UI |
| [components/overview/FlowNodes.tsx](../../app/admin/games/builder/components/overview/FlowNodes.tsx) | Custom ReactFlow nodes | - | 🟢 LOW | UI |
| [components/overview/FlowEdges.tsx](../../app/admin/games/builder/components/overview/FlowEdges.tsx) | Custom ReactFlow edges | - | 🟢 LOW | UI |
| [components/overview/deriveOverviewGraph.ts](../../app/admin/games/builder/components/overview/deriveOverviewGraph.ts) | Bygg graf från state | GameBuilderState | 🟡 MED | UTIL |
| [components/overview/useGameFlowGraph.ts](../../app/admin/games/builder/components/overview/useGameFlowGraph.ts) | React hook för graf | deriveOverviewGraph | 🟢 LOW | UTIL |
| [components/overview/index.ts](../../app/admin/games/builder/components/overview/index.ts) | Re-exports | - | 🟢 LOW | UTIL |

---

## 3. Hooks

| Fil | Ansvar | Dependencies | Risk | Typ |
|-----|--------|--------------|------|-----|
| [hooks/useGameBuilder.ts](../../hooks/useGameBuilder.ts) | **KÄRNHOOK** - All state management, history, undo/redo (~478 rader) | game-builder-state types, useReducer | 🔴 HIGH | CORE |

---

## 4. Services/API

### Builder API Endpoints

| Fil | Ansvar | Methods | Risk | Typ |
|-----|--------|---------|------|-----|
| [app/api/games/builder/route.ts](../../app/api/games/builder/route.ts) | Skapa nytt spel | POST | 🔴 HIGH | API |
| [app/api/games/builder/[id]/route.ts](../../app/api/games/builder/%5Bid%5D/route.ts) | Ladda/spara spel (~832 rader) | GET, PUT | 🔴 HIGH | API |

### Related API Endpoints

| Fil | Ansvar | Methods | Risk | Typ |
|-----|--------|---------|------|-----|
| [app/api/games/route.ts](../../app/api/games/route.ts) | Lista spel, legacy create | GET, POST | 🟡 MED | API |
| [app/api/games/[gameId]/route.ts](../../app/api/games/%5BgameId%5D/route.ts) | CRUD för spel | GET, PUT, DELETE | 🟡 MED | API |
| [app/api/games/[gameId]/publish/route.ts](../../app/api/games/%5BgameId%5D/publish/route.ts) | Publicera spel | POST | 🟡 MED | API |
| [app/api/games/csv-import/route.ts](../../app/api/games/csv-import/route.ts) | CSV/JSON import (~561 rader) | POST | 🟡 MED | API |
| [app/api/games/[gameId]/roles/route.ts](../../app/api/games/%5BgameId%5D/roles/route.ts) | Roll-hantering | GET, POST | 🟢 LOW | API |
| [app/api/games/[gameId]/artifacts/route.ts](../../app/api/games/%5BgameId%5D/artifacts/route.ts) | Artifact-hantering | GET, POST | 🟢 LOW | API |
| [app/api/games/[gameId]/triggers/route.ts](../../app/api/games/%5BgameId%5D/triggers/route.ts) | Trigger-hantering | GET, POST | 🟢 LOW | API |
| [app/api/games/[gameId]/snapshots/route.ts](../../app/api/games/%5BgameId%5D/snapshots/route.ts) | Snapshot management | GET, POST | 🟢 LOW | API |

---

## 5. Types/Schemas

| Fil | Ansvar | Exports | Risk | Typ |
|-----|--------|---------|------|-----|
| [types/game-builder-state.ts](../../types/game-builder-state.ts) | **KÄRNTYPER** - All builder state (~303 rader) | GameBuilderState, BuilderAction, CoreForm, StepData, etc. | 🔴 HIGH | TYPE |
| [types/games.ts](../../types/games.ts) | Game domain types | GameBuilderData, ArtifactFormData, TriggerFormData, etc. | 🔴 HIGH | TYPE |
| [types/trigger.ts](../../types/trigger.ts) | Trigger condition/action types | TriggerCondition, TriggerAction | 🟡 MED | TYPE |
| [types/game-snapshot.ts](../../types/game-snapshot.ts) | Snapshot types | GameSnapshot, SnapshotGame | 🟢 LOW | TYPE |

---

## 6. Utils

| Fil | Ansvar | Exports | Risk | Typ |
|-----|--------|---------|------|-----|
| [app/admin/games/builder/utils/validateGameRefs.ts](../../app/admin/games/builder/utils/validateGameRefs.ts) | Validera artifact/trigger refs (~414 rader) | validateGameRefs, ValidationResult | 🟡 MED | UTIL |
| [features/admin/games/utils/csv-parser.ts](../../features/admin/games/utils/csv-parser.ts) | CSV parsing | parseCsvGames | 🟡 MED | UTIL |
| [features/admin/games/utils/json-game-import.ts](../../features/admin/games/utils/json-game-import.ts) | JSON parsing | parseGamesFromJsonPayload | 🟡 MED | UTIL |
| [features/admin/games/utils/game-validator.ts](../../features/admin/games/utils/game-validator.ts) | Import validation | validateGames | 🟡 MED | UTIL |
| [lib/games/trigger-order-alias.ts](../../lib/games/trigger-order-alias.ts) | Trigger order aliasing | actionOrderAliasesToIds, conditionOrderAliasesToIds | 🟢 LOW | UTIL |

---

## 7. Tests

| Fil | Ansvar | Coverage | Risk | Typ |
|-----|--------|----------|------|-----|
| [tests/e2e/game-builder.spec.ts](../../tests/e2e/game-builder.spec.ts) | E2E tests för builder (~358 rader) | Create, edit, phases, triggers | 🟢 LOW | TEST |

---

## 8. Database Migrations

| Fil | Ansvar | Risk |
|-----|--------|------|
| [supabase/migrations/20251216010000_game_builder_p0.sql](../../supabase/migrations/20251216010000_game_builder_p0.sql) | Initialt builder-schema | 🔴 HIGH (applied) |

---

## Sammanfattning

### Kritiska Filer (🔴 HIGH)

1. **GameBuilderPage.tsx** - Huvudkomponent, ~1492 rader
2. **useGameBuilder.ts** - State management hook, ~478 rader
3. **ArtifactEditor.tsx** - Artifact UI, ~1400 rader
4. **TriggerEditor.tsx** - Trigger UI, ~774 rader
5. **builder/[id]/route.ts** - API GET/PUT, ~832 rader
6. **game-builder-state.ts** - Core types, ~303 rader
7. **games.ts** - Domain types

### Total Lines of Code (estimat)

| Kategori | LOC |
|----------|-----|
| Main Page | ~1492 |
| Hook | ~478 |
| Section Components | ~4000 |
| API Endpoints | ~1200 |
| Types | ~600 |
| Utils | ~500 |
| Tests | ~400 |
| **TOTAL** | **~8600+ LOC** |

### Dependency Graph

```
GameBuilderPage.tsx
├── useGameBuilder.ts
│   └── game-builder-state.ts (types)
│       └── games.ts (shared types)
├── All Section Components
│   ├── StepEditor
│   ├── PhaseEditor
│   ├── RoleEditor
│   ├── ArtifactEditor
│   ├── TriggerEditor
│   ├── BoardEditor
│   ├── MaterialEditor
│   └── ...
├── validateGameRefs.ts
├── API Calls
│   ├── GET /api/games/builder/[id]
│   └── PUT /api/games/builder/[id]
└── External
    ├── next/navigation
    ├── next-intl
    └── @supabase/supabase-js
```
