# Artifact Components — Inventory & Layout Specification

> Component inventory for Director Mode and Participant View artifact UI.
> Every component has: purpose, states, required props, placement, and accessibility.
> This is the implementation backlog for Claude.

**Version:** 1.1
**Datum:** 2026-02-27

---

## Table of Contents

1. [Design DNA & Tokens](#1-design-dna--tokens)
2. [Director Mode: "Artifact Console" Layout](#2-director-mode-artifact-console-layout)
3. [Participant View: "Artifact Feed" Layout](#3-participant-view-artifact-feed-layout)
4. [Shared Components](#4-shared-components)
5. [Director-Only Components](#5-director-only-components)
6. [Participant-Only Components](#6-participant-only-components)
7. [Puzzle Renderers (Shared)](#7-puzzle-renderers-shared)
8. [Implementation Status & Mapping](#8-implementation-status--mapping)
9. [ArtifactStateStatus Contract](#9-artifactstatestatus-contract)
10. [Key Architectural Constraints](#10-key-architectural-constraints)

---

## 1. Design DNA & Tokens

Extracted from sandbox patterns and existing play components. All new artifact components **must** use these tokens.

### 1.1 Surface Tokens

| Token | Usage | CSS | Exists? |
|---|---|---|---|
| `PlaySurface` | Desktop container, single border owner | `lg:border lg:rounded-2xl lg:bg-background` | ✅ |
| `DrawerOverlay` | Bottom sheet (mobile) / centered modal (desktop) | Backdrop, ESC close, scroll lock | ✅ |
| `CardSurface` | Individual artifact card | `rounded-lg border bg-card shadow-sm` | 🔲 (inline) |
| `PanelSurface` | Director tab content panel | `rounded-md border bg-muted/50 p-4` | 🔲 (inline) |
| `OverlaySurface` | Blocking overlay (decision, story, countdown) | `fixed inset-0 z-[70] bg-black/60` | ✅ |
| `InspectorSurface` | Director artifact properties sidebar | `border-l bg-card w-80` | 🔲 |

### 1.2 Interaction Tokens

| Token | Trigger | Implementation |
|---|---|---|
| `press` | Tap/click on artifact card | `active:scale-[0.98] transition-transform` |
| `expand` | Card body expand/collapse | AnimatePresence height transition |
| `reveal-in` | Artifact revealed to participants | `opacity-0→1 + translateY(8px)→0` over 300ms |
| `highlight-pulse` | New artifact highlighted | `ring-2 ring-primary animate-pulse` (2 cycles) |
| `dismiss-out` | Card used/consumed | `opacity-1→0.6` over 200ms |
| `drag` | Director drag to reorder/stage | 🔲 not implemented |
| `snap` | Drag target snaps into place | 🔲 not implemented |

### 1.3 Status Tokens (Visual Signals)

| Status | Director Signal | Participant Signal |
|---|---|---|
| `hidden` | Faded card, eye-slash icon | *(not rendered)* |
| `revealed` | Full card, eye icon, green dot | Normal card |
| `highlighted` | Green glow ring | Pulse animation + "NEW" badge |
| `solved` | Checkmark, green bg | Checkmark, collapsed, dimmed |
| `used` | *(N/A director side)* | Dimmed, checkmark, collapsed by default |

> **Note (2026-02-27):** `ArtifactStateStatus` has exactly 3 values: `hidden`, `revealed`, `solved`.
> `locked` and `failed` were removed — `loadArtifacts()` never assigned them.
> `highlighted` and `used` are *visual presentation states*, not values in the type.
> See [§9 ArtifactStateStatus Contract](#9-artifactstatestatus-contract) for the canonical spec.

### 1.4 Density

| Context | Density | Card Height | Font Size | Padding |
|---|---|---|---|---|
| **Director Panel** | Dense | ~56px collapsed | 13px | p-2 |
| **Director Stage** | Comfortable | ~80px | 14px | p-3 |
| **Participant Drawer** | Comfortable | ~72px collapsed | 15px | p-3 |
| **Participant Expanded** | Spacious | Auto | 16px | p-4 |

---

## 2. Director Mode: "Artifact Console" Layout

The Director sees artifacts as a **control panel** — fast scanning, multi-select, batch operations.

### 2.1 Information Architecture

```
┌───────────────────────────────────────────────────────┐
│ PlayHeader (back, status pill, session title)          │
│ NowSummaryRow (step X/N, elapsed, participants, ...)  │
│ ChipLane (signal chips, trigger chips, join chips)     │
├──────────┬──────────────────────────┬─────────────────┤
│ Tab Bar  │                          │                 │
│ ┌──────┐ │   Stage / Canvas         │  Inspector      │
│ │ Play │ │   (current step view +   │  (selected      │
│ │Time  │ │    participant glass     │   artifact      │
│ │Artif.│ │    pane)                 │   properties)   │
│ │Trig. │ │                          │                 │
│ │Sig.  │ │                          │                 │
│ │Event │ │                          │                 │
│ └──────┘ │                          │                 │
│          │                          │                 │
│ Panel    │                          │                 │
│ Content  │                          │                 │
│ (based   │                          │                 │
│  on tab) │                          │                 │
├──────────┴──────────────────────────┴─────────────────┤
│ Director Controls Bar (timer, reveal all, end, ...)   │
└───────────────────────────────────────────────────────┘
```

**Current state:** Tabs exist (`play | time | artifacts | triggers | signals | events`). Stage panel exists. Inspector panel is **missing**.

### 2.2 Artifacts Tab Content

```
┌────────────────────────────────────┐
│ [Filter: All] [Search...] [Batch] │
│                                    │
│ ┌──────────────────────────────┐   │
│ │ ☐ 🔐 Keypad: "Vault Code"   │   │  ← ArtifactRow (dense)
│ │   Status: locked · 0 attempts │   │
│ │   [Reveal] [Reset]           │   │
│ ├──────────────────────────────┤   │
│ │ ☐ 🃏 Card: "Welcome Letter"  │   │
│ │   Status: revealed · 12 views │   │
│ │   [Hide] [Highlight]         │   │
│ ├──────────────────────────────┤   │
│ │ ☐ 🧩 Riddle: "Ancient Text"  │   │
│ │   Status: solved · 3 attempts │   │
│ │   [Reset] [View Answer]      │   │
│ └──────────────────────────────┘   │
│                                    │
│ ──── Batch: 3 selected ────────── │
│ [Reveal All] [Hide All] [Reset]   │
└────────────────────────────────────┘
```

---

## 3. Participant View: "Artifact Feed" Layout

The Participant sees artifacts as an **experience layer** — focused, progressive, low friction.

### 3.1 Information Architecture

```
┌──────────────────────────────────┐
│ PlayHeader (title, "Playing as") │
│ NowSummaryRow (step, time, ...)  │
│ TriggerLane (chip notifications) │
├──────────────────────────────────┤
│                                  │
│   Stage (scrollable)             │
│   ┌────────────────────────┐     │
│   │ Step Title              │     │
│   │ Step Description        │     │
│   │ (typewriter/dramatic)   │     │
│   │                         │     │
│   │ Timer (traffic light)   │     │
│   │ Board Message           │     │
│   │ Phase Info              │     │
│   │ ProgressDots            │     │
│   │                         │     │
│   │ [Artifact Callout]      │     │  ← Inline, only when new artifacts
│   └────────────────────────┘     │
│                                  │
├──────────────────────────────────┤
│ Action Bar                       │
│ [🎒 Artifacts (3)] [🗳️ Decisions] │
│ [🎭 Role] [🛠️ Toolbelt]          │
└──────────────────────────────────┘

        ↓ Tap "Artifacts" ↓

┌──────────────────────────────────┐   ← DrawerOverlay (bottom sheet)
│ ✕  Artifacts                     │
│ ─────────────────────────────    │
│ Summary: 2 new · 5 available    │   ← ArtifactInventoryStrip
│ [Show latest ↓]                  │
│                                  │
│ ┌──────────────────────────┐     │   ← ArtifactCard (highlighted)
│ │ ★ NEW                     │     │
│ │ 🔐 Keypad: "Vault Code"  │     │
│ │   Enter the 4-digit code  │     │
│ │   ┌─────────────────┐    │     │
│ │   │ [_][_][_][_]     │    │     │   ← KeypadInput inline
│ │   │   [Submit]        │    │     │
│ │   └─────────────────┘    │     │
│ └──────────────────────────┘     │
│                                  │
│ ┌──────────────────────────┐     │   ← ArtifactCard (available)
│ │ 🧩 Riddle: "Ancient Text" │     │
│ │   ▶ Tap to expand         │     │   ← collapsed by default
│ └──────────────────────────┘     │
│                                  │
│ ┌──────────────────────────┐     │   ← ArtifactCard (used)
│ │ ✓ Card: "Welcome Letter"  │     │
│ │   (dimmed, collapsed)     │     │
│ └──────────────────────────┘     │
└──────────────────────────────────┘
```

---

## 4. Shared Components

These components are used by **both** Director and Participant views.

---

### 4.1 `ArtifactCard`

**Purpose:** Atomic card rendering for a single artifact with its variants.

**States:** `hidden | revealed | highlighted | used | solved | failed`

**Props:**
```typescript
interface ArtifactCardProps {
  artifact: {
    id: string;
    title: string;
    description?: string;
    artifactType: ArtifactType;
    artifactOrder: number;
    metadata: Record<string, unknown> | null;
  };
  variants: ArtifactVariant[];
  state: 'hidden' | 'revealed' | 'highlighted' | 'used' | 'solved' | 'failed';
  density: 'dense' | 'comfortable' | 'spacious';
  
  // Interaction
  isExpanded: boolean;
  onToggleExpand: () => void;
  isSelected?: boolean;        // Director only: batch select
  onToggleSelect?: () => void; // Director only
  
  // Content
  children?: React.ReactNode;  // Puzzle renderer or variant list
  
  className?: string;
}
```

**Accessibility:**
- `role="article"`, `aria-label` from title
- `aria-expanded` for collapse state
- State announced via `aria-live="polite"` on status change
- Keyboard: Enter to expand, Space to select (director)

**Exists?** 🔲 — Currently inline in `ArtifactsPanel` and `ParticipantArtifactDrawer`. Needs extraction.

---

### 4.2 `ArtifactBadge`

**Purpose:** Small badge showing artifact state + audience.

**Props:**
```typescript
interface ArtifactBadgeProps {
  state: ArtifactStateStatus;
  visibility?: ArtifactVisibility;
  artifactType: ArtifactType;
  compact?: boolean;
}
```

**Renders:**
- State icon (eye/eye-slash/lock/check/x)
- State label
- Visibility pill (`public` / `leader_only` / `role: Name`)
- Type icon

**Exists?** 🟡 — Partially exists as inline rendering in `ArtifactsPanel`. Needs extraction as standalone.

---

### 4.3 `ArtifactLinkPills`

**Purpose:** Show connections from artifact to steps, phases, triggers, and other linked entities.

**Props:**
```typescript
interface ArtifactLinkPillsProps {
  stepId?: string;
  phaseId?: string;
  triggerIds?: string[];
  decisionIds?: string[];
  steps?: { id: string; title: string }[];
  phases?: { id: string; name: string }[];
  triggers?: { id: string; name: string }[];
  compact?: boolean;
  onPillClick?: (type: string, id: string) => void;
}
```

**Renders:** Row of small pills: `Step 3: "Find the key"`, `Phase: Finale`, `Trigger: "On solve → reveal clue"`

**Exists?** 🔲 — New component needed.

---

### 4.4 `ArtifactTypeIcon`

**Purpose:** Consistent icon rendering per artifact type.

**Props:**
```typescript
interface ArtifactTypeIconProps {
  type: ArtifactType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}
```

**Icon mapping (from existing code):**
| Type | Icon |
|---|---|
| `keypad` | 🔐 |
| `riddle` | 🧩 |
| `cipher` | 🔣 |
| `tile_puzzle` | 🧱 |
| `logic_grid` | 🔢 |
| `hotspot` | 🎯 |
| `card` | 🃏 |
| `document` | 📄 |
| `image` | 🖼️ |
| `audio` | 🔊 |
| `counter` | 🔢 |
| `qr_gate` | 📱 |
| `hint_container` | 💡 |
| `prop_confirmation` | 📦 |
| `location_check` | 📍 |
| `sound_level` | 🎙️ |
| `signal_generator` | 📡 |
| `time_bank_step` | ⏳ |
| `conversation_cards_collection` | 🗣️ |
| `replay_marker` | 🔖 |
| `empty_artifact` | ◻️ |

**Exists?** 🟡 — Icon mapping exists inline in `BatchArtifactPanel`. Needs extraction.

---

## 5. Director-Only Components

---

### 5.1 `ArtifactLibraryPanel` (refactored from `ArtifactsPanel`)

**Purpose:** Full artifact management panel in the Artifacts tab — list view with filters, search, and individual actions.

**Props:**
```typescript
interface ArtifactLibraryPanelProps {
  sessionId: string;
  artifacts: CockpitArtifact[];
  artifactStates: Record<string, ArtifactState>;
  refreshKey?: number;
  
  // Actions
  onReveal: (artifactId: string) => Promise<void>;
  onHide: (artifactId: string) => Promise<void>;
  onReset: (artifactId: string) => Promise<void>;
  onHighlight: (variantId: string) => Promise<void>;
  onSelect: (artifactId: string) => void;  // Opens inspector
  
  // Filter/search
  filterType?: ArtifactType | 'all';
  filterState?: ArtifactStateStatus | 'all';
  searchQuery?: string;
}
```

**Features:**
- Filter by type (dropdown with type icons)
- Filter by state (hidden/revealed/solved/etc.)
- Search by title
- Per-artifact actions (reveal/hide/reset/highlight)
- Click to select → opens in Inspector
- Sort by order, name, or state

**Exists?** ✅ as `ArtifactsPanel` — needs refactoring to accept cockpit state and support inspector selection.

---

### 5.2 `BatchArtifactPanel` (exists)

**Purpose:** Multi-select batch operations on artifacts.

**Current status:** ✅ Fully implemented with 6 operations, progress tracking, confirmation dialogs.

**No changes needed** — already well-structured.

---

### 5.3 `ArtifactInspector`

**Purpose:** Sidebar panel showing full details and properties of a selected artifact.

**Props:**
```typescript
interface ArtifactInspectorProps {
  artifact: CockpitArtifact | null;
  artifactState: ArtifactState | null;
  variants: GameArtifactVariant[];
  linkedTriggers: CockpitTrigger[];
  linkedStep?: CockpitStep;
  linkedPhase?: CockpitPhase;
  
  // Actions
  onReveal: () => Promise<void>;
  onHide: () => Promise<void>;
  onReset: () => Promise<void>;
  onPin: () => Promise<void>;
  onClose: () => void;
  
  // Notes
  notes?: string;
  onNotesChange?: (notes: string) => void;
}
```

**Sections:**
1. **Header:** Type icon, title, state badge
2. **Quick Actions:** Reveal / Hide / Reset / Pin buttons
3. **State:** Current status, attempt count, progress bar
4. **Variants:** List of variants with per-variant reveal/highlight toggles
5. **Links:** Linked step, phase, triggers (clickable pills)
6. **Config:** Read-only metadata display (puzzle config)
7. **History:** Timeline of state changes (reveal, solve, etc.)
8. **Notes:** Director-only text area for annotations

**Exists?** 🔲 — Entirely new component.

---

### 5.4 `ArtifactTimeline`

**Purpose:** Per-artifact event history (what happened, when, by whom).

**Props:**
```typescript
interface ArtifactTimelineProps {
  events: SessionEvent[];
  artifactId: string;
  compact?: boolean;
}
```

**Renders:** Vertical timeline with items like:
- `🟢 Revealed by Director at 14:23` 
- `🔐 Keypad attempt #3 (failed) at 14:25`
- `✅ Solved by "Team Alpha" at 14:28`
- `🔄 Reset by trigger "On phase 3" at 14:30`

**Exists?** 🔲 — New. Event data exists in `SessionEvent` type; needs filtering + rendering.

---

### 5.5 `PinnedArtifactBar`

**Purpose:** Quick-access bar showing artifacts pinned by the director for at-a-glance monitoring.

**Props:**
```typescript
interface PinnedArtifactBarProps {
  pinnedArtifacts: Array<{
    artifact: CockpitArtifact;
    state: ArtifactState;
  }>;
  onUnpin: (artifactId: string) => void;
  onSelect: (artifactId: string) => void;
}
```

**Renders:** Horizontal strip of compact artifact chips showing: type icon + title + state dot. Clickable → opens inspector.

**Placement:** Between ChipLane and Stage panel (or below tab bar).

**Exists?** 🔲 — New component.

---

### 5.6 `DirectorArtifactActions`

**Purpose:** Context-aware action buttons for artifact management.

**Props:**
```typescript
interface DirectorArtifactActionsProps {
  artifact: CockpitArtifact;
  state: ArtifactState;
  
  onReveal: () => Promise<void>;
  onHide: () => Promise<void>;
  onReset: () => Promise<void>;
  onHighlight: () => Promise<void>;
  onPin: () => void;
  
  compact?: boolean;
  disabled?: boolean;
}
```

**Logic:** Shows only valid actions for current state:
- Hidden → [Reveal]
- Revealed → [Hide] [Highlight] [Pin]
- Solved → [Reset] [Pin]
- Failed → [Reset]
- Puzzle types → +[Reset] always available

**Exists?** 🟡 — Action logic inline in `ArtifactsPanel` and `DirectorModePanel`. Needs extraction.

---

### 5.7 `PuzzleProgressPanel` (exists)

**Purpose:** Host-facing panel showing puzzle progress per participant/team.

**Current status:** ✅ Fully implemented.

---

### 5.8 `PropConfirmationManager` (exists)

**Purpose:** Host panel for managing prop confirmation requests.

**Current status:** ✅ Fully implemented.

---

### 5.9 `DecisionsPanel` (exists)

**Purpose:** Host CRUD for decisions.

**Current status:** ✅ Fully implemented.

---

### 5.10 `OutcomePanel` (exists)

**Purpose:** Host creates/reveals outcomes.

**Current status:** ✅ Fully implemented. Needs participant-facing counterpart.

---

## 6. Participant-Only Components

---

### 6.1 `ParticipantArtifactDrawer` (exists — needs enhancement)

**Purpose:** Bottom-sheet drawer containing all revealed artifacts for the participant.

**Current status:** ✅ Core functionality implemented (594 lines).

**Enhancement needs:**
- Extract `ArtifactCard` as shared component (currently inline)
- Add "My Artifacts" collection section (for assigned variants)
- Improve image artifact zoom/fullscreen

**Sub-components already present:**
- `InventorySummaryStrip` — count per state
- `KeypadArtifact` — inline keypad with code entry
- Delegates to `PuzzleArtifactRenderer` for all puzzle types
- Delegates to `ConversationCardsCollectionArtifact` for conversation cards

---

### 6.2 `ArtifactInventoryStrip`

**Purpose:** Compact summary row showing artifact counts by state.

**Props:**
```typescript
interface ArtifactInventoryStripProps {
  highlighted: number;
  available: number;
  used: number;
  onShowLatest?: () => void;
}
```

**Renders:** `★ 2 new · 5 available · 3 used  [Show latest ↓]`

**Exists?** ✅ — Inline in `ParticipantArtifactDrawer`. Could be extracted.

---

### 6.3 `ParticipantDecisionOverlay` (exists)

**Purpose:** Blocking decision modal + non-blocking decision drawer.

**Current status:** ✅ Fully implemented with 2-step confirm flow and results chart.

---

### 6.4 `ParticipantOutcomeReveal`

**Purpose:** Post-session outcome display for participants.

**Props:**
```typescript
interface ParticipantOutcomeRevealProps {
  outcomes: Array<{
    id: string;
    title: string;
    body: string;
    isRevealed: boolean;
  }>;
  sessionEnded: boolean;
}
```

**Renders:** Award-style reveal with animation when session ends.

**Exists?** 🔲 — New component needed. Director has `OutcomePanel` but participant-facing reveal doesn't exist.

---

### 6.5 `ParticipantSignalMicroUI` (exists)

**Purpose:** Compact signal indicator in participant view.

**Current status:** ✅ Exists.

---

### 6.6 `ParticipantTimeBankDisplay` (exists)

**Purpose:** Time bank countdown display.

**Current status:** ✅ Exists.

---

## 7. Puzzle Renderers (Shared)

All puzzle types are rendered by `PuzzleArtifactRenderer` which dispatches to specific sub-components.

| Component | Artifact Type | Status | Location |
|---|---|---|---|
| `RiddleInput` | `riddle` | ✅ | `@/components/play` |
| `CounterDisplay` | `counter` | ✅ | `@/components/play` |
| `AudioPlayer` | `audio` | ✅ | `@/components/play` |
| `MultiAnswerForm` | `multi_answer` | ✅ | `@/components/play` |
| `QRScanner` | `qr_gate` | ✅ | `@/components/play` |
| `HintPanel` | `hint_container` | ✅ | `@/components/play` |
| `HotspotImage` | `hotspot` | ✅ | `@/components/play` |
| `TilePuzzle` | `tile_puzzle` | ✅ | `@/components/play` |
| `CipherDecoder` | `cipher` | ✅ | `@/components/play` |
| `LogicGrid` | `logic_grid` | ✅ | `@/components/play` |
| `PropRequest` | `prop_confirmation` | ✅ | `@/components/play` |
| `LocationCheck` | `location_check` | ✅ | `@/components/play` |
| `SoundLevelMeter` | `sound_level` | ✅ | `@/components/play` |
| `SignalGeneratorUI` | `signal_generator` | ✅ | Inline in `PuzzleArtifactRenderer` |
| `TimeBankStepUI` | `time_bank_step` | ✅ | Inline in `PuzzleArtifactRenderer` |
| `EmptyArtifactUI` | `empty_artifact` | ✅ | Inline in `PuzzleArtifactRenderer` |

**All puzzle renderers are implemented.** `PuzzleArtifactRenderer` (1123 lines) is the central dispatcher.

---

## 8. Implementation Status & Mapping

### 8.1 Existing Components → New Architecture

| Current Component | Lines | Maps To | Action |
|---|---|---|---|
| `ArtifactsPanel` | ~400 | `ArtifactLibraryPanel` | Refactor: accept cockpit state, add inspector selection |
| `BatchArtifactPanel` | ~350 | `BatchArtifactPanel` | ✅ Keep as-is |
| `DirectorModePanel` | 1503 | Shell + tabs | Extract artifact tab into `ArtifactLibraryPanel` |
| `DirectorStagePanel` | 297 | Keep + add `PinnedArtifactBar` | Add pin slot above glass pane |
| `ParticipantArtifactDrawer` | 594 | Keep + extract `ArtifactCard` | Extract shared card, add collection section |
| `PuzzleArtifactRenderer` | 1123 | Keep as-is | ✅ All puzzle types implemented |
| `ConversationCardsCollectionArtifact` | ~200 | Keep as-is | ✅ |
| `DecisionsPanel` | 310 | Keep as-is | ✅ |
| `OutcomePanel` | ~200 | Keep + add `ParticipantOutcomeReveal` | Need participant counterpart |
| `PuzzleProgressPanel` | 295 | Keep as-is | ✅ |
| `PropConfirmationManager` | 344 | Keep as-is | ✅ |

### 8.2 New Components Needed

| Component | Priority | Effort | Status | Purpose |
|---|---|---|---|---|
| `ArtifactTypeIcon` | P0 | Low | ✅ Done (PR #1) | Icon mapping extraction |
| `ArtifactBadge` | P0 | Low | ✅ Done (PR #1) | State + type badge extraction |
| `ArtifactCard` | P0 | Medium | ✅ Done (PR #1) | Shared card extraction from drawer + panel |
| `DirectorArtifactActions` | P0 | Low | ✅ Done (PR #1) | State-aware action buttons |
| `ArtifactInspector` | P0 | High | ✅ Done (PR #2) | Director artifact detail sidebar |
| `ArtifactTimeline` | P1 | Medium | ✅ Done (PR #3) | Per-artifact event history |
| `PinnedArtifactBar` | P1 | Medium | ✅ Done (PR #4) | Director quick-access pins |
| `ArtifactLinkPills` | P1 | Low | 🔲 Not started | Step/phase/trigger link display |
| `ParticipantOutcomeReveal` | P1 | Medium | 🔲 Not started | Participant outcome display |

### 8.3 Implementation Order (recommended)

**Phase 1 — Foundations (P0)**
1. Extract `ArtifactTypeIcon` from `BatchArtifactPanel` → shared
2. Extract `ArtifactBadge` from `ArtifactsPanel` → shared
3. Extract `ArtifactCard` from `ParticipantArtifactDrawer` → shared
4. Extract `DirectorArtifactActions` from `ArtifactsPanel` → director

**Phase 2 — Director Inspector (P0)**
5. Build `ArtifactInspector` (uses ArtifactCard + ArtifactBadge + ArtifactLinkPills)
6. Wire inspector into `DirectorModePanel` artifacts tab (selection → sidebar)
7. Refactor `ArtifactsPanel` → `ArtifactLibraryPanel` with cockpit state

**Phase 3 — Enrichment (P1)**
8. Build `ArtifactTimeline` (filter SessionEvents by artifactId)
9. Build `PinnedArtifactBar` + wire into `DirectorStagePanel`
10. Build `ArtifactLinkPills` for inspector and library panel
11. Build `ParticipantOutcomeReveal`

**Phase 4 — Polish (P2)**
12. Image fullscreen/zoom in participant drawer
13. "My Artifacts" collection section in participant drawer
14. Director private notes on artifacts
15. Board projection for counters/timers

---

## 9. ArtifactStateStatus Contract

> **Canonical spec — 2026-02-27.** If you change status values, update all callsites per the checklist below.

`ArtifactStateStatus` is a *derived, client-side* status for artifact visibility/availability in the play session UI.

The type is derived from the `ARTIFACT_STATUSES` const array in `types/session-cockpit.ts`:

```ts
export const ARTIFACT_STATUSES = ['hidden', 'revealed', 'solved'] as const;
export type ArtifactStateStatus = (typeof ARTIFACT_STATUSES)[number];
```

### Allowed values

| Status | Meaning | Assigned in |
|---|---|---|
| `hidden` | No revealed variant is available to the viewer | `loadArtifacts()` default |
| `revealed` | At least one variant is revealed/visible (participant can access content) | `loadArtifacts()` when `anyRevealed` |
| `solved` | Puzzle solved OR keypad unlocked (completion state; may still be revealed) | `loadArtifacts()` when `puzzleSolved \|\| keypadUnlocked` |

### Disallowed / reserved values

- **`unlocked`** — removed 2026-02-27. Keypad-unlock is represented by `solved`. Was never assigned by `loadArtifacts()`.
- **`locked`** — removed 2026-02-27. `loadArtifacts()` never assigned it. Re-introduce only when server provides an explicit lock state and `loadArtifacts()` derives it.
- **`failed`** — removed 2026-02-27. `loadArtifacts()` never assigned it. Re-introduce only when attempt-exhaustion logic exists in `loadArtifacts()`.
- **`highlighted`** — this is a *visual presentation layer* (`ArtifactState.isHighlighted`), not a status value.
- **`used`** — this is a participant-side *rendering concept* derived from `isVariantUsed()`, not a status value.

### Guard guidance

| Intent | Guard expression |
|---|---|
| Visibility-dependent actions (highlight, "show latest", pin) | `status === 'revealed'` |
| Completion-dependent visuals (badge, celebration) | `status === 'solved'` |
| Hide action (return to hidden) | `status === 'revealed'` |
| Reset action | `status === 'solved'` |

### Change checklist

If you introduce a new status value, you **MUST**:

1. Assign it in `loadArtifacts()` in `useSessionState.ts` (source of derivation)
2. Add to `ARTIFACT_STATUSES` const array in `types/session-cockpit.ts` (type is derived automatically)
3. Add entry to `STATE_CONFIG` map in `ArtifactBadge.tsx`
4. Add entry to `STATUS_DOT` map in `PinnedArtifactBar.tsx`
5. Review all guards in `DirectorArtifactActions`, `ArtifactInspector`, `DirectorModePanel`
6. Run `tsc --noEmit` + `eslint` on changed files

---

## 10. Key Architectural Constraints

1. **PlaySurface is the only border owner** — no component may add its own `lg:border` (see PLAY_UI_CONTRACT.md §1).
2. **DrawerOverlay owns drawer chrome** — title + close button rendered by DrawerOverlay, not children (§2).
3. **Pill label === drawer title** — same i18n key for both (§2).
4. **No "locked" state in participant view** — server controls visibility; client never renders placeholder locked artifacts.
5. **3-state participant model only** — Highlighted → Available → Used. No other states visible.
6. **`isVariantUsed()` is SSoT** — the canonical function for determining if a variant has been consumed.
7. **Haptic + sound feedback** — all interactive artifact actions provide tactile feedback.
8. **All text must use i18n** — no hardcoded strings.
9. **Realtime: ref-stored callbacks** — all `on*` callbacks in realtime hooks stored via `useLatestRef`.
10. **Broadcast via `broadcastPlayEvent`** — no direct `channel.send()` in API routes.

---

*This component inventory is the implementation backlog. Update status as components are built.*
