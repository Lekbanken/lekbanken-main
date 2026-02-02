# Game Builder Event Model

**Datum:** 2026-02-01  
**Status:** KOMPLETT EVENT/STATE PIPELINE

---

## Arkitektur Översikt

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BUILDER STATE MACHINE                                │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────────────────────────────┐
                    │           GameBuilderPage            │
                    │  (Orchestrator & UI Container)       │
                    └──────────────────────────────────────┘
                                      │
                                      │ uses
                                      ▼
                    ┌──────────────────────────────────────┐
                    │          useGameBuilder()            │
                    │  (State Management Hook)             │
                    ├──────────────────────────────────────┤
                    │ • useReducer(historyReducer)         │
                    │ • Undo/Redo (past/present/future)    │
                    │ • Autosave debounce (1500ms)         │
                    │ • History commit debounce (800ms)    │
                    └──────────────────────────────────────┘
                                      │
           ┌──────────────────────────┴──────────────────────────┐
           │                                                      │
           ▼                                                      ▼
┌─────────────────────┐                              ┌─────────────────────┐
│   historyReducer    │                              │   stateReducer      │
│   (BuilderHistory)  │───────────────────────────▶  │   (GameBuilderState)│
├─────────────────────┤                              ├─────────────────────┤
│ past: State[]       │                              │ core: CoreForm      │
│ present: State      │                              │ steps: StepData[]   │
│ future: State[]     │                              │ phases: PhaseData[] │
└─────────────────────┘                              │ roles: RoleData[]   │
                                                     │ artifacts: []       │
                                                     │ triggers: []        │
                                                     │ materials: {}       │
                                                     │ boardConfig: {}     │
                                                     │ gameTools: []       │
                                                     │ subPurposeIds: []   │
                                                     │ cover: {}           │
                                                     └─────────────────────┘
```

---

## Event Categories

### 1. Committing Actions (Strukturella Ändringar)

Dessa actions skapar en ny history entry (undo-punkt).

| Action Type | Payload | State Mutation | History Effect |
|-------------|---------|----------------|----------------|
| `ADD_STEP` | `StepData` | `steps.push(payload)` | Push present → past |
| `DELETE_STEP` | `{ id: string }` | `steps.filter(s => s.id !== id)` | Push present → past |
| `REORDER_STEPS` | `{ from: number, to: number }` | Splice + insert | Push present → past |
| `ADD_PHASE` | `PhaseData` | `phases.push(payload)` | Push present → past |
| `DELETE_PHASE` | `{ id: string }` | `phases.filter(p => p.id !== id)` | Push present → past |
| `REORDER_PHASES` | `{ from: number, to: number }` | Splice + insert | Push present → past |
| `ADD_ROLE` | `RoleData` | `roles.push(payload)` | Push present → past |
| `DELETE_ROLE` | `{ id: string }` | `roles.filter(r => r.id !== id)` | Push present → past |
| `REORDER_ROLES` | `{ from: number, to: number }` | Splice + insert | Push present → past |
| `ADD_ARTIFACT` | `ArtifactFormData` | `artifacts.push(payload)` | Push present → past |
| `DELETE_ARTIFACT` | `{ id: string }` | `artifacts.filter(a => a.id !== id)` | Push present → past |
| `REORDER_ARTIFACTS` | `{ from: number, to: number }` | Splice + insert | Push present → past |
| `ADD_TRIGGER` | `TriggerFormData` | `triggers.push(payload)` | Push present → past |
| `DELETE_TRIGGER` | `{ id: string }` | `triggers.filter(t => t.id !== id)` | Push present → past |
| `REORDER_TRIGGERS` | `{ from: number, to: number }` | Splice + insert | Push present → past |

### 2. Non-Committing Actions (Text & Metadata)

Dessa actions uppdaterar state utan att skapa history entry. History commit sker via debounce.

| Action Type | Payload | State Mutation | Side Effect |
|-------------|---------|----------------|-------------|
| `SET_CORE` | `Partial<CoreForm>` | `core = { ...core, ...payload }` | scheduleCommit (800ms) |
| `UPDATE_STEP` | `{ id, data: Partial<StepData> }` | `steps.map(s => s.id === id ? {...s, ...data} : s)` | - |
| `UPDATE_PHASE` | `{ id, data: Partial<PhaseData> }` | `phases.map(...)` | - |
| `UPDATE_ROLE` | `{ id, data: Partial<RoleData> }` | `roles.map(...)` | - |
| `UPDATE_ARTIFACT` | `{ id, data: Partial<ArtifactFormData> }` | `artifacts.map(...)` | - |
| `UPDATE_TRIGGER` | `{ id, data: Partial<TriggerFormData> }` | `triggers.map(...)` | - |
| `SET_STEPS` | `StepData[]` | `steps = payload` | - |
| `SET_PHASES` | `PhaseData[]` | `phases = payload` | - |
| `SET_ROLES` | `RoleData[]` | `roles = payload` | - |
| `SET_ARTIFACTS` | `ArtifactFormData[]` | `artifacts = payload` | - |
| `SET_TRIGGERS` | `TriggerFormData[]` | `triggers = payload` | - |
| `SET_MATERIALS` | `Partial<MaterialsForm>` | `materials = { ...materials, ...payload }` | scheduleCommit |
| `SET_BOARD_CONFIG` | `Partial<BoardConfigData>` | `boardConfig = { ...boardConfig, ...payload }` | - |
| `SET_GAME_TOOLS` | `GameToolForm[]` | `gameTools = payload` | - |
| `SET_SUB_PURPOSE_IDS` | `string[]` | `subPurposeIds = payload` | - |
| `SET_COVER` | `CoverMedia` | `cover = payload` | - |

### 3. History Actions

| Action Type | Effect |
|-------------|--------|
| `UNDO` | `past.pop() → present`, `present → future.unshift()` |
| `REDO` | `future.shift() → present`, `present → past.push()` |
| `COMMIT_TO_HISTORY` | Force push current present to past (used after text debounce) |
| `LOAD_FROM_API` | Replace present with payload, clear past/future |
| `RESET` | Return to createInitialHistory() |

---

## State Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STATE FLOW                                         │
└─────────────────────────────────────────────────────────────────────────────┘

User Action (e.g., click "Add Step")
        │
        ▼
┌───────────────────┐
│ Component calls   │
│ dispatch(action)  │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ historyReducer    │
│ receives action   │
└───────────────────┘
        │
        ├─────────────────────────────────────────┐
        │                                         │
        ▼                                         ▼
┌───────────────────┐                   ┌───────────────────┐
│ isCommittingAction│                   │ isHistoryAction   │
│ (ADD_*, DELETE_*, │                   │ (UNDO, REDO,      │
│  REORDER_*)       │                   │  LOAD_FROM_API)   │
└───────────────────┘                   └───────────────────┘
        │                                         │
        ▼                                         ▼
┌───────────────────┐                   ┌───────────────────┐
│ 1. Push present   │                   │ Navigate history  │
│    to past[]      │                   │ (pop/shift)       │
│ 2. stateReducer   │                   └───────────────────┘
│    → new present  │
│ 3. Clear future[] │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ React re-renders  │
│ with new state    │
└───────────────────┘
        │
        ▼
┌───────────────────┐
│ isDirty check     │
│ (state !== saved) │
└───────────────────┘
        │
        ├── isDirty = true ────────────────────┐
        │                                       ▼
        │                              ┌───────────────────┐
        │                              │ Debounce 1500ms   │
        │                              │ autosaveTimeout   │
        │                              └───────────────────┘
        │                                       │
        │                                       ▼
        │                              ┌───────────────────┐
        │                              │ onSave(state)     │
        │                              │ → fetch(PUT)      │
        │                              └───────────────────┘
        │                                       │
        │                                       ▼
        │                              ┌───────────────────┐
        │                              │ markClean()       │
        │                              │ savedState = state│
        │                              └───────────────────┘
        │
        └── isDirty = false (no-op)
```

---

## Persistence Side Effects

### Autosave Pipeline

```
State Change
    │
    ▼
isDirty = true
    │
    ▼
Clear previous autosaveTimeout
    │
    ▼
Schedule new timeout (1500ms)
    │
    ▼ (after 1500ms)
    │
handleSave() [in GameBuilderPage]
    │
    ▼
Build payload from state
    │
    ▼
fetch(PUT /api/games/builder/[id])
    │
    ├── Success ──────────────────────┐
    │                                  ▼
    │                         setSaveStatus('saved')
    │                         setLastSaved(new Date())
    │                         markClean()
    │
    └── Failure ──────────────────────┐
                                       ▼
                              setSaveStatus('error')
                              setError(message)
```

### History Commit Pipeline (for text fields)

```
setCore({ name: 'Ny text' })
    │
    ▼
dispatch({ type: 'SET_CORE', payload })
    │
    ▼
scheduleCommit()
    │
    ▼
Clear previous commitTimeout
    │
    ▼
Schedule new timeout (800ms)
    │
    ▼ (after 800ms of no typing)
    │
dispatch({ type: 'COMMIT_TO_HISTORY' })
    │
    ▼
Push current present to past[]
(Creates undo point for text changes)
```

---

## Action Type Detection

```typescript
// From types/game-builder-state.ts

export function isCommittingAction(action: BuilderAction): action is CommittingAction {
  const committingTypes = [
    'ADD_STEP',
    'DELETE_STEP',
    'REORDER_STEPS',
    'ADD_PHASE',
    'DELETE_PHASE',
    'REORDER_PHASES',
    'ADD_ROLE',
    'DELETE_ROLE',
    'REORDER_ROLES',
    'ADD_ARTIFACT',
    'DELETE_ARTIFACT',
    'REORDER_ARTIFACTS',
    'ADD_TRIGGER',
    'DELETE_TRIGGER',
    'REORDER_TRIGGERS',
  ];
  return committingTypes.includes(action.type);
}
```

---

## History Limits

| Constant | Value | Purpose |
|----------|-------|---------|
| `MAX_HISTORY_SIZE` | 50 | Maximum undo levels |
| `autosaveDelay` | 1500ms | Debounce for autosave |
| Commit debounce | 800ms | Debounce for text field history commits |

---

## State Mutation Rules

### Immutability

All reducers produce new objects:

```typescript
// ✅ Correct - new array
case 'ADD_STEP':
  return { ...state, steps: [...state.steps, action.payload] };

// ✅ Correct - new array via filter
case 'DELETE_STEP':
  return { ...state, steps: state.steps.filter(s => s.id !== action.payload.id) };

// ✅ Correct - new array via map
case 'UPDATE_STEP':
  return {
    ...state,
    steps: state.steps.map(s =>
      s.id === action.payload.id ? { ...s, ...action.payload.data } : s
    ),
  };
```

### No-op Detection

```typescript
// If state didn't change, don't update history
if (newState === present) return history;
```

---

## Convenience Setters

The hook provides callback-style setters for ergonomic updates:

```typescript
// Direct value
setCore({ name: 'New Name' });

// Callback pattern (access previous state)
setCore(prev => ({ ...prev, name: prev.name + ' v2' }));

// Implementation uses stateRef to avoid stale closures
const setCore = useCallback((update) => {
  const payload = typeof update === 'function' 
    ? update(stateRef.current.core) 
    : update;
  dispatch({ type: 'SET_CORE', payload });
  scheduleCommit();
}, [scheduleCommit]);
```

---

## Event Flow Examples

### Example 1: Add a Step

```
1. User clicks "Lägg till steg"
2. StepEditor calls: dispatch({ type: 'ADD_STEP', payload: { id: 'new-uuid', title: '', body: '' } })
3. historyReducer:
   - isCommittingAction('ADD_STEP') → true
   - newPast = [...past, present].slice(-50)
   - newState = stateReducer(present, action)
   - return { past: newPast, present: newState, future: [] }
4. React re-renders with new step in list
5. isDirty = true (state !== savedState)
6. After 1500ms: handleSave() → PUT API
```

### Example 2: Edit Step Title

```
1. User types in step title input
2. StepEditor calls: dispatch({ type: 'UPDATE_STEP', payload: { id: 'step-1', data: { title: 'New' } } })
3. historyReducer:
   - isCommittingAction('UPDATE_STEP') → false
   - newState = stateReducer(present, action)
   - return { ...history, present: newState }  // No history commit
4. React re-renders
5. After 800ms of no typing: COMMIT_TO_HISTORY → creates undo point
6. After 1500ms of no changes: handleSave() → PUT API
```

### Example 3: Undo

```
1. User presses Ctrl+Z
2. handleKeyDown dispatches: dispatch({ type: 'UNDO' })
3. historyReducer:
   - past.length > 0 → true
   - previous = past[past.length - 1]
   - return { past: past.slice(0, -1), present: previous, future: [present, ...future] }
4. React re-renders with previous state
5. isDirty recalculated
```

---

## Race Condition Mitigations

### 1. Debounced Commits

Text field updates don't create individual history entries. They're batched via 800ms debounce.

### 2. Autosave Cancellation

```typescript
if (autosaveTimeoutRef.current) {
  clearTimeout(autosaveTimeoutRef.current);
}
autosaveTimeoutRef.current = setTimeout(...);
```

### 3. stateRef for Closures

```typescript
const stateRef = useRef(state);
useEffect(() => {
  stateRef.current = state;
}, [state]);

// Setters use stateRef.current to avoid stale closure
const setCore = useCallback((update) => {
  const payload = typeof update === 'function' 
    ? update(stateRef.current.core)  // ← Fresh state
    : update;
  dispatch({ type: 'SET_CORE', payload });
}, []);
```

---

## Known Issues & Gaps

| Issue | Impact | Status |
|-------|--------|--------|
| No server-side locking | Concurrent edits overwrite | ⚠️ Not addressed |
| No beforeunload warning | Unsaved changes lost on navigation | ⚠️ Not addressed |
| No localStorage backup | Crash loses unsaved work | ⚠️ Not addressed |
| DELETE actions have no confirmation | Accidental deletions | ⚠️ Not addressed |
