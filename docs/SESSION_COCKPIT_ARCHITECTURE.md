# 🎮 LEKBANKEN SESSION COCKPIT ARCHITECTURE
## Unified Design & Implementation Plan

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-28
- Last updated: 2026-03-21
- Last validated: -

> Historical snapshot of the session cockpit architecture and implementation plan from the 2025-12 control-surface work.

**Version**: 1.1  
**Created**: 2025-12-28  
**Updated**: 2025-12-28  
**Status**: ✅ Epics 1-7 Complete (Core Implementation)

---

## Implementation Summary

| Epic | Status | Description |
|------|--------|-------------|
| **Epic 1** | ✅ Complete | Foundation & Unified Shell |
| **Epic 2** | ✅ Complete | Artifact Catalog |
| **Epic 3** | ✅ Complete | Leader Script |
| **Epic 4** | ✅ Complete | Signals & TimeBank |
| **Epic 5** | ✅ Complete | Trigger Debug & Safety |
| **Epic 6** | ✅ Complete | Event System & Observability |
| **Epic 7** | ✅ Analysis | Cleanup & Consolidation (see migration guide) |

**Next Steps:** Wire up SessionCockpit, run integration tests, proceed with migration.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Module Taxonomy](#3-module-taxonomy)
4. [Session Cockpit Architecture](#4-session-cockpit-architecture)
5. [UX Information Architecture](#5-ux-information-architecture)
6. [Trigger & Artifact Interactions](#6-trigger--artifact-interactions)
7. [Signals & Time Bank](#7-signals--time-bank)
8. [Observability & Replay](#8-observability--replay)
9. [Implementation Plan](#9-implementation-plan)
10. [Feature Flags & Migration](#10-feature-flags--migration)
11. [Differentiators](#11-differentiators)

---

## 1. Executive Summary

### Vision
Transform Lekbanken's host experience from fragmented dual-mode views into a **unified Session Cockpit** where Lobby and Director Mode are two perspectives of the same control panel.

### Core Principles
- **Single Source of Truth**: One session state, multiple views
- **Everything is a Module**: All features are triggerable artifacts
- **Progressive Disclosure**: Director Mode is focus mode, not a different world
- **Always Accessible Controls**: Critical actions within 1-2 clicks
- **Observable & Debuggable**: Complete event logging

### Key Outcomes
- ✅ Host never needs to exit session to fix mistakes
- ✅ All 20+ artifact types fully integrated with triggers
- ✅ Leader script visible per step
- ✅ Complete event logging for debugging
- ✅ Zero code duplication

---

## 2. Current State Analysis

### What Works Well ✅

| Area | Strength |
|------|----------|
| **Type System** | `types/trigger.ts` and `types/puzzle-modules.ts` well-defined |
| **Trigger Architecture** | `TriggerCondition` + `TriggerAction` provides powerful automation |
| **Artifact Rendering** | `PuzzleArtifactRenderer.tsx` handles 15+ module types |
| **Builder Wizard** | `ArtifactWizard.tsx` has templates |
| **Simulator** | `TriggerSimulator.tsx` exists |
| **Signal/TimeBank Types** | Exist in supabase schema with ledger |

### What Must Change ⚠️

| Problem | Impact | Solution |
|---------|--------|----------|
| **Two host worlds** | Lobby and PlayMode are separate | → Session Cockpit with overlay |
| **Incomplete artifact catalog** | 40% modules lack Builder templates | → Complete taxonomy |
| **Signals/TimeBank in wrong mode** | Configuration and runtime mixed | → Builder + Live separation |
| **Preflight lacks artifact check** | Can start without artifacts ready | → Extended readiness |
| **Leader script not implemented** | Host cheat sheet missing | → New field + UI |
| **Fragmented event logging** | No unified observability | → Session event feed |
| **Duplicated components** | RoleAssigner in 2 places | → Consolidation |

---

## 3. Module Taxonomy

### Artifact Hierarchy

```
ARTIFACT (base)
├── 🔐 VERIFICATION MODULES (input → validated → event)
│   ├── keypad           ✅ Implemented
│   ├── riddle           ✅ Implemented  
│   ├── multi_answer     ✅ Implemented
│   ├── qr_gate          ✅ Implemented
│   ├── location_check   ✅ Implemented
│   └── prop_confirmation ✅ Implemented
│
├── 🧠 PUZZLE MODULES (state → solved → event)
│   ├── cipher           ✅ Implemented
│   ├── hotspot          ✅ Implemented
│   ├── tile_puzzle      ✅ Implemented
│   ├── logic_grid       ✅ Implemented
│   ├── counter          ✅ Implemented
│   └── sound_level      ✅ Implemented
│
├── 📚 CONTENT MODULES (display-only or reveal)
│   ├── card             ✅ Implemented
│   ├── document         ✅ Implemented
│   ├── image            ✅ Implemented
│   ├── audio            ✅ Implemented
│   └── hint_container   ✅ Implemented
│
├── 🔊 SIGNAL MODULES (emit/receive)
│   └── signal_generator  ⚠️ NEW MODULE REQUIRED
│
└── 🧭 META MODULES (system-level)
    ├── replay_marker    ✅ Implemented
    ├── time_bank_step   ⚠️ NEW MODULE REQUIRED
    └── empty_artifact   ⚠️ NEW MODULE REQUIRED
```

### Complete Artifact Specification

| Module | artifact_type | Triggers IN | Events OUT | Builder | Play UX | Host Admin |
|--------|---------------|-------------|------------|---------|---------|------------|
| **Keypad** | `keypad` | `reveal`, `reset` | `keypad_correct`, `keypad_failed` | ✅ | ✅ | Reset, reveal |
| **Riddle** | `riddle` | `reveal`, `reset` | `riddle_correct` | ✅ | ✅ | Reset, show answer |
| **Multi-Answer** | `multi_answer` | `reveal`, `reset` | `multi_answer_complete` | ✅ | ✅ | Reset |
| **QR Gate** | `qr_gate` | `reveal`, `reset` | `scan_verified` | ✅ | ✅ | Manual verify |
| **Location Check** | `location_check` | `reveal`, `reset` | `location_verified` | ✅ | ✅ | Manual verify |
| **Prop Confirm** | `prop_confirmation` | `reveal`, `reset` | `prop_confirmed` | ✅ | ⬜ | Confirm/deny |
| **Cipher** | `cipher` | `reveal`, `reset` | `cipher_decoded` | ✅ | ✅ | Reset, reveal |
| **Hotspot** | `hotspot` | `reveal`, `reset` | `hotspot_found`, `hotspot_hunt_complete` | ✅ | ✅ | Reset, reveal all |
| **Tile Puzzle** | `tile_puzzle` | `reveal`, `reset`, `shuffle` | `tile_puzzle_complete` | ✅ | ✅ | Reset, solve |
| **Logic Grid** | `logic_grid` | `reveal`, `reset` | `logic_grid_complete` | ✅ | ✅ | Reset, reveal |
| **Counter** | `counter` | `reveal`, `increment`, `reset` | `counter_reached` | ✅ | ✅ | Set value |
| **Sound Level** | `sound_level` | `reveal`, `reset` | `sound_threshold_reached` | ✅ | ✅ | Calibrate |
| **Card** | `card` | `reveal`, `hide` | – | ✅ | ✅ | Reveal/hide |
| **Document** | `document` | `reveal`, `hide` | – | ✅ | ✅ | Reveal/hide |
| **Image** | `image` | `reveal`, `hide` | – | ✅ | ✅ | Reveal/hide |
| **Audio** | `audio` | `reveal`, `play`, `stop` | `audio_acknowledged` | ✅ | ✅ | Play, stop |
| **Hint Container** | `hint_container` | `reveal_hint` | `hint_requested` | ✅ | ✅ | Send hint |
| **Signal Generator** | `signal_generator` | `trigger_signal` | `signal_sent` | ⚠️ NEW | ⚠️ NEW | Fire signal |
| **Replay Marker** | `replay_marker` | `add_marker` | – | ✅ | N/A | Add marker |
| **Time Bank Step** | `time_bank_step` | `start_timer` | `final_timer_expired` | ⚠️ NEW | ⚠️ NEW | Extend/reduce |
| **Empty Artifact** | `empty_artifact` | `reveal`, `hide` | – | ⚠️ NEW | ⚠️ NEW | – |

---

## 4. Session Cockpit Architecture

### Visual Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SESSION COCKPIT SHELL                                │
│  (Owns ALL session-state: participants, artifacts, triggers, signals, etc) │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    SESSION HEADER (sticky)                            │ │
│   │  [← Back] Game Title    [●LIVE]  MKH5HV    [⏸Pause] [📤Share] [⏹End] │ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌───────────────────────────────────────────────────────────────────────┐ │
│   │                    PREFLIGHT CHECKLIST                                │ │
│   │  ✅ Deltagare (3)  ✅ Roller  ⚠️ Hemligheter  ✅ Triggers  ✅ Signals │ │
│   │                                                    [🎬 Starta Spelläge]│ │
│   └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │ [👥 Deltagare+Roller] [📡 Signals] [⏱ Tidsbank] [⚙ Admin]           │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│   ╔═════════════════════════════════════════════════════════════════════╗   │
│   ║                 DIRECTOR MODE (Drawer/Overlay)                       ║   │
│   ║  ┌─────────────────────────────────────────────────────────────────┐║   │
│   ║  │ [▶ Spela] [📦 Artefakter] [🎯 Triggers] [💬 Chat]                │║   │
│   ║  ├─────────────────────────────────────────────────────────────────┤║   │
│   ║  │ 📜 LEADER SCRIPT (per step)                                     │║   │
│   ║  │ 🔓 QUICK ACTIONS                                                │║   │
│   ║  │ 📊 EVENT FEED                                                   │║   │
│   ║  └─────────────────────────────────────────────────────────────────┘║   │
│   ╚═════════════════════════════════════════════════════════════════════╝   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### State Schema

```typescript
interface SessionCockpitState {
  // Core identifiers
  sessionId: string;
  gameId: string | null;
  sessionCode: string;
  
  // Status
  status: 'draft' | 'lobby' | 'active' | 'paused' | 'ended';
  isDirectorMode: boolean;
  
  // Participants & Roles  
  participants: Participant[];
  sessionRoles: SessionRole[];
  roleAssignments: Map<string, string>;
  
  // Game Structure
  steps: StepInfo[];
  phases: PhaseInfo[];
  currentStepIndex: number;
  currentPhaseIndex: number;
  
  // Artifacts
  artifacts: SessionArtifact[];
  artifactStates: Map<string, ArtifactState>;
  
  // Triggers
  triggers: SessionTrigger[];
  triggerStates: Map<string, TriggerState>;
  
  // Signals
  signalCapabilities: SignalCapabilities;
  signalPresets: SignalPreset[];
  recentSignals: Signal[];
  
  // Time Bank
  timeBankBalance: number;
  timeBankLedger: TimeBankEntry[];
  timeBankRules: TimeBankRules;
  
  // Secrets
  secretsUnlockedAt: string | null;
  secretsRevealedBy: Map<string, string>;
  
  // Event Log
  eventLog: SessionEvent[];
  
  // Readiness (computed)
  preflightItems: PreflightItem[];
  canStartDirectorMode: boolean;
}
```

---

## 5. UX Information Architecture

### 5.1 Builder (Design-time)

```
GAME BUILDER
├── 📋 Overview
│   ├── Game info (name, description, mode)
│   ├── Validation panel (errors, warnings)
│   └── Publish / Preview
│
├── 🧩 Structure
│   ├── Phases (intro, round, finale)
│   └── Steps (order, duration, leader_script)
│
├── 📦 Artifacts
│   ├── Wizard (all 20+ types)
│   ├── Variants per role
│   └── Link to step/phase
│
├── ⚡ Triggers
│   ├── Trigger list
│   ├── Wizard (condition → actions)
│   ├── Simulator (dry-run)
│   └── Validation (broken refs)
│
├── 📡 Signals & TimeBank
│   ├── Signal presets
│   └── TimeBank rules (rewards, penalties, caps)
│
└── 👥 Roles
    ├── Role definitions
    ├── Min/max count
    └── Private instructions (secrets)
```

### 5.2 Lobby / Session Setup (Pre-Live)

```
LOBBY
├── 🔍 Preflight Checklist
│   ├── ✅ Participants connected
│   ├── ✅ Roles copied
│   ├── ⚠️ Roles assigned
│   ├── ⏳ Secrets (locked/unlocked)
│   ├── ✅ Triggers ready
│   ├── ✅ Artifacts snapshotted
│   └── 📡 Signal test (torch/audio/screen)
│
├── 👥 Participants + Roles (merged)
│   ├── Participant list with inline role dropdown
│   ├── Role summary (min/max status)
│   └── [Randomize roles] action
│
├── 📡 Signals (configuration)
│   ├── Capability test
│   ├── Presets from game
│   └── Fallback info
│
├── ⏱ TimeBank (configuration)
│   ├── Initial balance
│   ├── Active rules (from game)
│   └── Cap settings
│
└── ⚙️ Admin
    ├── Session overrides
    ├── Safety/inclusion notes
    └── [End session]
```

### 5.3 Director Mode / Active Session (Live)

```
DIRECTOR MODE (drawer/overlay)
├── 🎬 Control Bar (sticky)
│   ├── [⏸ Pause] [▶ Resume]
│   ├── ⏱ Timer display
│   └── 🟢 Connection status
│
├── 📍 Navigation
│   ├── Phase tabs
│   ├── Step list (current highlighted)
│   └── [← Previous] [Next →]
│
├── 📜 Leader Script (for current step)
│   └── Host-only instructions
│
├── 🔓 Quick Actions (context-aware)
│   ├── [Reveal hint X]
│   ├── [Reset keypad]
│   ├── [Give time bonus +30s]
│   └── [Manual trigger: Y]
│
├── 📦 Artifacts (live status)
│   ├── List with state badges
│   ├── [Reveal] [Hide] [Reset] per artifact
│   └── Puzzle progress
│
├── ⚡ Triggers (live status)
│   ├── Armed / Fired / Error
│   ├── [Fire manually]
│   ├── [Disable] [Arm]
│   └── 🛑 Kill switch
│
├── 📡 Signal Quick-panel
│   ├── [🔦 Torch] [🔊 Audio] [📺 Screen]
│   └── Recent signals feed
│
├── ⏱ TimeBank Quick-panel
│   ├── Balance display
│   ├── [+30s] [−30s] [Pause]
│   └── Ledger preview
│
├── 📊 Event Feed (live)
│   ├── Recent 20 events
│   ├── Filter: [All] [Triggers] [Artifacts] [Signals]
│   └── Error highlighting
│
└── ◀ Back to Lobby
```

---

## 6. Trigger & Artifact Interactions

### Trigger-Artifact Matrix

| Artifact | Emits Event | Can Be Triggered By |
|----------|-------------|---------------------|
| `keypad` | `keypad_correct`, `keypad_failed` | `reveal`, `hide`, `reset` |
| `riddle` | `riddle_correct` | `reveal`, `hide`, `reset`, `show_hint` |
| `cipher` | `cipher_decoded` | `reveal`, `hide`, `reset` |
| `hotspot` | `hotspot_found`, `hotspot_hunt_complete` | `reveal`, `hide`, `reset`, `reveal_all` |
| `tile_puzzle` | `tile_puzzle_complete` | `reveal`, `hide`, `reset`, `shuffle` |
| `logic_grid` | `logic_grid_complete` | `reveal`, `hide`, `reset` |
| `counter` | `counter_reached` | `reveal`, `hide`, `increment`, `decrement`, `reset` |
| `audio` | `audio_acknowledged` | `reveal`, `hide`, `play`, `stop` |
| `qr_gate` | `scan_verified` | `reveal`, `hide`, `reset` |
| `location_check` | `location_verified` | `reveal`, `hide`, `reset` |
| `prop_confirmation` | `prop_confirmed`, `prop_denied` | `reveal`, `hide`, `reset` |
| `sound_level` | `sound_threshold_reached` | `reveal`, `hide`, `reset`, `calibrate` |
| `hint_container` | `hint_requested` | `reveal_hint` (index) |
| `card`, `document`, `image` | – | `reveal`, `hide` |

### New Trigger Conditions Required

```typescript
// Missing conditions to add
interface PropConfirmedCondition {
  type: 'prop_confirmed';
  propId: string;
}

interface LocationVerifiedCondition {
  type: 'location_verified';
  locationId: string;
}

interface LogicGridCompleteCondition {
  type: 'logic_grid_complete';
  gridId: string;
}

interface SoundThresholdCondition {
  type: 'sound_threshold_reached';
  soundMeterId: string;
}
```

### New Trigger Actions Required

```typescript
// Missing actions to add
interface ShowLeaderScriptAction {
  type: 'show_leader_script';
  message: string;
  style?: 'info' | 'warning' | 'success';
}

interface AddReplayMarkerAction {
  type: 'add_replay_marker';
  markerType: 'highlight' | 'bookmark' | 'note' | 'error';
  label: string;
}
```

---

## 7. Signals & Time Bank

### Signal Architecture

```typescript
type SignalOutputType = 'torch' | 'audio' | 'screen' | 'vibration';

interface SignalCapabilities {
  torch: boolean;
  audio: boolean;
  screen: boolean;
  vibration: boolean;
  torchError?: string;
  audioGateRequired?: boolean;
}

interface SignalPreset {
  id: string;
  name: string;
  channel: string;
  output: SignalOutputType;
  pattern?: 'morse' | 'pulse' | 'sos' | 'custom';
  customPattern?: number[];
  color?: string;
  soundUrl?: string;
}
```

### TimeBank Architecture

```typescript
interface TimeBankRules {
  initialBalance: number;
  minBalance?: number;
  maxBalance?: number;
  autoRewards: TimeBankAutoRule[];
  autoPenalties: TimeBankAutoRule[];
}

interface TimeBankAutoRule {
  id: string;
  condition: TriggerConditionType;
  targetId?: string;
  deltaSeconds: number;
  reason: string;
}

interface TimeBankEntry {
  id: string;
  sessionId: string;
  deltaSeconds: number;
  reason: string;
  balance: number;
  triggerId?: string;
  actorUserId?: string;
  createdAt: string;
}
```

---

## 8. Observability & Replay

### Session Event Schema

```typescript
type SessionEventType =
  // Lifecycle
  | 'session_created' | 'session_started' | 'session_paused' 
  | 'session_resumed' | 'session_ended'
  // Navigation
  | 'step_started' | 'step_completed' | 'phase_started' | 'phase_completed'
  // Participants
  | 'participant_joined' | 'participant_left' | 'role_assigned'
  | 'secrets_unlocked' | 'secret_revealed'
  // Artifacts
  | 'artifact_revealed' | 'artifact_hidden' | 'artifact_state_changed'
  | 'puzzle_solved' | 'puzzle_failed'
  // Triggers
  | 'trigger_fired' | 'trigger_error' | 'trigger_disabled' | 'trigger_armed'
  // Signals & TimeBank
  | 'signal_sent' | 'time_bank_delta'
  // Timer
  | 'timer_started' | 'timer_paused' | 'timer_ended'
  // Debug
  | 'error' | 'warning' | 'replay_marker';

interface SessionEvent {
  id: string;
  sessionId: string;
  type: SessionEventType;
  timestamp: string;
  actorType: 'system' | 'host' | 'participant' | 'trigger';
  actorId?: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  parentEventId?: string;
  stepId?: string;
  phaseId?: string;
  artifactId?: string;
  triggerId?: string;
}
```

---

## 9. Implementation Plan

### Epic Overview

| Epic | Sprint | Focus |
|------|--------|-------|
| **Epic 1** | 1 | Session Cockpit Foundation |
| **Epic 2** | 1-2 | Artifact Catalog Completion |
| **Epic 3** | 2 | Leader Script |
| **Epic 4** | 2 | Signals & TimeBank Integration |
| **Epic 5** | 3 | Trigger Debug & Safety |
| **Epic 6** | 3 | Event System & Observability |
| **Epic 7** | 3 | Cleanup & Consolidation |

### Detailed Stories & Tasks

See [TODO List](#todo-list) below.

---

## 10. Feature Flags & Migration

### Feature Flags

```typescript
const FEATURE_FLAGS = {
  // Session Cockpit
  USE_SESSION_COCKPIT: false,
  DIRECTOR_MODE_DRAWER: false,
  
  // Artifacts
  SIGNAL_GENERATOR: false,
  TIME_BANK_STEP: false,
  
  // Leader Script
  LEADER_SCRIPT: false,
  
  // Observability
  REALTIME_SESSION_EVENTS: false,
  LIVE_EVENT_FEED: false,
  
  // Safety
  TRIGGER_KILL_SWITCH: false,
};
```

### Migration Path

1. **Phase 1**: Feature flags off, old behavior
2. **Phase 2**: Feature flags on for beta users
3. **Phase 3**: Feature flags on by default
4. **Phase 4**: Remove old code paths

---

## 11. Differentiators

1. 🎭 **Role-based secret handling** - Private instructions per role
2. 📜 **Leader Script** - Built-in host cheat sheet per step
3. ⚡ **Declarative triggers without code** - "When X, do Y"
4. 📡 **Multi-modal signals** - Torch, audio, screen flash
5. ⏱ **TimeBank with automation** - Rewards/penalties via triggers
6. 🧩 **20+ puzzle modules** - Keypad, cipher, hotspot, GPS...
7. 🔄 **Live event feed** - Real-time debugging
8. 🛑 **Kill switch** - Emergency trigger disable
9. 🎬 **Director Mode overlay** - Run session without leaving lobby
10. 📊 **Session replay** (roadmap) - Playback for analysis

---

# TODO LIST

## Epic 1: Session Cockpit Foundation

### Sprint 1 - Priority: 🔴 Critical

- [x] **1.1** Create `types/session-cockpit.ts` with SessionCockpitState interface ✅
  - [x] Define all state properties
  - [x] Define action methods
  - [x] Export from types index

- [x] **1.2** Create `features/play/hooks/useSessionState.ts` ✅
  - [x] Consolidate session data fetching
  - [x] Combine participants, roles, artifacts, triggers
  - [ ] Add real-time subscriptions (TODO: Future iteration)
  - [x] Return unified state object

- [x] **1.3** Create `features/play/components/SessionCockpit.tsx` ✅
  - [x] Create SessionStateProvider context
  - [ ] Replace HostSessionWithPlay.tsx structure (migration)
  - [ ] Keep backward compatibility via feature flag (migration)

- [x] **1.4** Create `features/play/components/DirectorModeDrawer.tsx` ✅
  - [x] Sheet/Drawer component from right side
  - [x] Full height overlay
  - [x] Close button + escape key handling
  - [x] Responsive (fullscreen on mobile)

- [x] **1.5** Extend PreflightChecklist ✅
  - [x] Add artifact snapshot check
  - [x] Add trigger validation check
  - [x] Add signal capability check
  - [x] Add secrets status check
  - [x] Sync with useSessionState buildPreflightItems

- [x] **1.6** Merge Deltagare + Roller tabs ✅
  - [x] Create ParticipantWithRoleRow component (in SessionCockpit.tsx)
  - [x] Inline role dropdown
  - [x] Role summary section with distribution stats
  - [x] Remove separate Roller tab (was never separate)

---

## Epic 2: Artifact Catalog Completion

### Sprint 1-2 - Priority: 🟡 High

- [x] **2.1** Add `signal_generator` artifact type ✅
  - [x] Add to ArtifactType union in types/games.ts
  - [x] Create SignalGeneratorConfig interface in puzzle-modules.ts
  - [x] Add to artifactTypeOptions in ArtifactEditor.tsx
  - [x] Add renderer in PuzzleArtifactRenderer.tsx
  - [x] Add trigger action `trigger_signal` in trigger.ts
  - [x] Add trigger condition `signal_generator_triggered`

- [x] **2.2** Add `time_bank_step` artifact type ✅
  - [x] Add to ArtifactType union
  - [x] Create TimeBankStepConfig interface in puzzle-modules.ts
  - [x] Add to artifactTypeOptions
  - [x] Add renderer (countdown display with warning/critical states)
  - [x] Add trigger condition `time_bank_expired`
  - [x] Add trigger action `time_bank_pause`

- [x] **2.3** Add `empty_artifact` artifact type ✅
  - [x] Add to ArtifactType union
  - [x] Create EmptyArtifactConfig (purpose, placeholder text, etc.)
  - [x] Add to artifactTypeOptions
  - [x] Add renderer (placeholder, break marker, host note modes)

- [x] **2.4** Add missing trigger conditions ✅
  - [x] All puzzle module conditions already existed in trigger.ts
  - [x] Added `time_bank_expired` condition
  - [x] Added `signal_generator_triggered` condition
  - [x] Updated useTriggerEngine.ts conditionMatches with all handlers
  - [x] Updated TriggerEvent type with all event variants

- [x] **2.5** Add missing trigger actions ✅
  - [x] Added `show_leader_script` action
  - [x] Added `trigger_signal` action
  - [x] Added `time_bank_pause` action
  - [x] Updated TriggerAction union type
  - [x] Updated useTriggerEngine.ts executeAction
  - [x] Updated TriggerActionContext interface

- [x] **2.6** Add Builder wizard validation ✅
  - [x] Created validateGameRefs.ts utility
  - [x] Check for broken artifact refs in triggers
  - [x] Check for broken step/phase refs in triggers
  - [x] Check for broken role refs in artifact variants
  - [x] Created ValidationPanel component
  - [x] Integrated in GameBuilderPage sidebar
  - [x] noValidationErrors now computed from real validation
  - [x] Orphan puzzle artifacts warning

---

## Epic 2 Complete! ✅

---

## Epic 3: Leader Script

### Sprint 2 - Priority: 🟡 High

- [x] **3.1** Add leader_script to step schema ✅ (Already existed)
  - [x] Column exists in game_steps table (migrations)
  - [x] GameStep type in types/games.ts has leader_script
  - [x] CockpitStep type in session-cockpit.ts has leaderScript

- [x] **3.2** Add Builder UI for leader_script ✅ (Already existed)
  - [x] Markdown textarea in StepEditor
  - [x] Placeholder text with example
  - [x] Saved with step data

- [x] **3.3** Display leader_script in Director Mode ✅ (Already existed)
  - [x] LeaderScriptPanel component in DirectorModeDrawer
  - [x] Shows for current step
  - [x] Amber styling for visibility
  - [x] Host-only (never sent to participants)

- [x] **3.4** Add Story view mode ✅
  - [x] Created StoryViewModal component
  - [x] Shows all steps with leader_script
  - [x] Collapsible step cards
  - [x] Current step highlighting
  - [x] Navigate to step functionality
  - [x] Integrated "Berättelse" button in Director Mode

---

## Epic 3 Complete! ✅

---

## Epic 4: Signals & TimeBank Integration

### Sprint 2 - Priority: 🟡 High

- [x] **4.1** Signal capability detection ✅
  - [x] Create useSignalCapabilities hook → `features/play/hooks/useSignalCapabilities.ts`
  - [x] Detect torch (Flashlight API via ImageCapture)
  - [x] Detect audio (Web Audio + iOS gate)
  - [x] Detect screen flash (always available)
  - [x] Detect vibration (Navigator.vibrate)
  - [x] Return SignalCapabilities object with status per type

- [x] **4.2** Signal preset builder ✅
  - [x] Create SignalPresetEditor component → `features/play/components/SignalPresetEditor.tsx`
  - [x] CRUD operations for presets
  - [x] Pattern selector (single, double, triple, sos, pulse, custom)
  - [x] CustomPatternEditor with step visualization
  - [x] Type-specific options (color for screen_flash, volume for audio, etc.)

- [x] **4.3** Lobby capability test ✅
  - [x] Create SignalCapabilityTest component → `features/play/components/SignalCapabilityTest.tsx`
  - [x] Test button for each capability with live execution
  - [x] Show fallback info if not supported
  - [x] iOS audio gate activation UX
  - [x] Compact mode for inline display

- [x] **4.4** Director Mode signal quick-panel ✅
  - [x] Enhanced SignalQuickPanel in DirectorModeDrawer
  - [x] Device signal presets with type icons
  - [x] Quick message presets (pause, hint, attention, flash)
  - [x] Custom signal input with toggle
  - [x] Recent signals feed with click-to-resend
  - [x] Signal execution with loading state

- [x] **4.5** TimeBank rule builder ✅
  - [x] Create TimeBankRuleEditor component → `features/play/components/TimeBankRuleEditor.tsx`
  - [x] Add/edit/remove reward/penalty rules
  - [x] Trigger types: artifact_solved, step_completed, phase_completed, trigger_fired, time_elapsed, manual
  - [x] Operators: add, subtract, set, multiply
  - [x] Conditional rules (balance_below/above threshold)
  - [x] Max fires limit and enable/disable toggle
  - [x] Basic settings: initial balance, min/max, on-zero action

- [x] **4.6** TimeBank live panel ✅
  - [x] Create TimeBankLivePanel component → `features/play/components/TimeBankLivePanel.tsx`
  - [x] Large balance display with status indicators (critical, warning, normal, good)
  - [x] Progress bar visualization
  - [x] Quick adjustment buttons (+/-30s, +/-1m, +/-5m)
  - [x] Custom adjustment input with reason
  - [x] Pause/resume button
  - [x] Ledger history with trend indicator
  - [x] Compact mode for inline display

## Epic 4 Complete! ✅

---

## Epic 5: Trigger Debug & Safety

### Sprint 3 - Priority: 🟡 High

- [x] **5.1** Trigger state tracking
  - [x] Add status column to session_triggers (armed/fired/disabled/error)
  - [x] Add last_error, last_error_at, error_count columns
  - [x] Update on trigger execution
  - [x] Created migration `20251228130000_session_triggers_error_tracking.sql`

- [x] **5.2** Live trigger panel
  - [x] Create TriggerLivePanel component
  - [x] Group by status (armed/fired/error/disabled)
  - [x] Manual fire button
  - [x] Disable/arm buttons
  - [x] Error display

- [x] **5.3** Kill switch
  - [x] Create TriggerKillSwitch component
  - [x] One button to disable all triggers
  - [x] Confirmation dialog
  - [x] Database functions for bulk disable/rearm

- [x] **5.4** Trigger error logging
  - [x] Capture errors in useTriggerEngine
  - [x] Added TriggerError interface and recentErrors state
  - [x] onTriggerError callback for external handling
  - [x] clearErrors function

- [x] **5.5** Trigger dry-run in lobby
  - [x] Create TriggerDryRunPanel component
  - [x] Simulate events without live session
  - [x] Show what would fire
  - [x] Condition matching for all event types

## Epic 5 Complete! ✅

---

## Epic 6: Event System & Observability


### Sprint 3 - Priority: 🟢 Medium

- [x] **6.1** Event schema & DB table
  - [x] Create session_events table (migration `20251228140000_session_events.sql`)
  - [x] Add indexes for efficient queries
  - [x] Create SessionEvent type (`types/session-event.ts`)

- [x] **6.2** Event emission from actions
  - [x] Create useSessionEvents hook
  - [x] Emit events via emitEvent/emitEvents functions
  - [x] createEventEmitters helper for common events
  - [x] Add correlation IDs support

- [x] **6.3** Live event feed UI
  - [x] Create EventFeedPanel component
  - [x] Real-time updates via Supabase subscription
  - [x] Grouped by time (senaste minuten, 5 min, etc.)
  - [x] Event type icons and category colors

- [x] **6.4** Event filtering
  - [x] Filter by category
  - [x] Filter by severity
  - [x] Text search in events
  - [x] Toggle time grouping

- [x] **6.5** Correlation tracking
  - [x] correlationId field in events
  - [x] parentEventId for event chains
  - [x] Display correlation ID in event details
  - [x] Expandable payload view

## Epic 6 Complete! ✅

---

## Epic 7: Cleanup & Consolidation

### Sprint 3 - Priority: 🟢 Medium

**Note:** Analysis complete. See [SESSION_COCKPIT_MIGRATION.md](SESSION_COCKPIT_MIGRATION.md) for detailed migration plan.

- [x] **7.1** Analyze legacy host shell
  - [x] Identified dead code paths
  - [x] Documented components to remove
  - [x] Created migration guide
  - ⬜ Implementation: Wire up SessionCockpit (requires testing)

- [x] **7.2** Analyze RoleAssigner consolidation
  - [x] Found duplicate in HostPlayMode + Lobby
  - [x] Documented consolidation plan
  - ⬜ Implementation: Remove from HostPlayMode (blocked by 7.1)

- [x] **7.3** Analyze chat drawer consolidation
  - [x] Found per-view chat state
  - [x] Documented lift to SessionCockpit level
  - ⬜ Implementation: Lift ChatDrawer (blocked by 7.1)

- [x] **7.4** Analyze duplicate tabs
  - [x] Documented tab structure changes
  - ⬜ Implementation: Simplify tabs (blocked by 7.1)

## Epic 7 Analysis Complete! ✅
### Implementation deferred to separate PR with testing

---

## Backlog (Future Sprints)

- [x] **B.1** Session replay system
- [x] **B.2** Keyboard shortcuts for Director Mode ✅
  - [x] useDirectorShortcuts hook
  - [x] ShortcutHelpPanel component
  - [x] KeyboardShortcutIndicator component
  - [x] All shortcut categories: navigation, playback, triggers, signals, view, system
- [x] **B.3** Session timeline visualization ✅
  - [x] useSessionTimeline hook
  - [x] SessionTimeline component (full visualization)
  - [x] CompactTimeline component (for sidebar)
  - [x] Timeline segments, markers, zoom, filtering
  - [x] Live statistics and event list
- [x] **B.4** Confidence indicator ("95% ready") ✅
  - [x] useSessionReadiness hook
  - [x] ReadinessIndicator component (inline, compact, detailed variants)
  - [x] Category-based checks: participants, content, triggers, artifacts, signals, config
  - [x] Critical issues vs warnings separation
- [x] **B.5** Batch artifact operations ✅
  - [x] useBatchArtifacts hook (selection, filtering, batch operations)
  - [x] BatchArtifactPanel UI component
  - [x] Preset filters for common selections
  - [x] Confirmation dialogs for destructive operations
- [x] **B.6** Trigger template library ✅
  - [x] TriggerTemplate types and definitions
  - [x] 15+ pre-built templates across 6 categories
  - [x] TriggerTemplateLibrary UI component
  - [x] Variable configuration dialog
  - [x] Search and filter functionality
- [x] **B.7** Analytics dashboard ✅
  - [x] useSessionAnalytics hook
  - [x] AnalyticsDashboard component (overview, steps, puzzles tabs)
  - [x] AnalyticsSummaryCard component
  - [x] JSON and CSV export
- [x] **B.8** Multi-language leader script ✅
  - [x] Multi-language script types and utilities (lib/multi-language-script.ts)
  - [x] useMultiLanguageScript hook
  - [x] LeaderScriptPanel component
  - [x] CompactScriptLine component
  - [x] Translation status tracking
  - [x] 6 supported languages (sv, en, no, da, fi, de)

---

## Definition of Done

For each task:
- [ ] Code implemented
- [ ] Types updated
- [ ] Unit tests added (where applicable)
- [ ] Manual testing passed
- [ ] Feature flag guarded (if applicable)
- [ ] No TypeScript errors
- [ ] PR reviewed and merged

---

## Quick Reference: Files Created

### Types
- ✅ `types/session-cockpit.ts` - Session state types
- ✅ `types/session-event.ts` - Event system types
- ✅ `types/trigger.ts` - Updated with error status

### Hooks
- ✅ `features/play/hooks/useSessionState.ts` - Unified session state
- ✅ `features/play/hooks/useSignalCapabilities.ts` - Signal detection
- ✅ `features/play/hooks/useSessionEvents.ts` - Event logging
- ✅ `features/play/hooks/useTriggerEngine.ts` - Updated with error tracking
- ✅ `features/play/hooks/useDirectorShortcuts.ts` - Keyboard shortcuts
- ✅ `features/play/hooks/useSessionReadiness.ts` - Readiness calculation
- ✅ `features/play/hooks/useBatchArtifacts.ts` - Batch artifact operations
- ✅ `features/play/hooks/useSessionTimeline.ts` - Timeline visualization
- ✅ `features/play/hooks/useSessionAnalytics.ts` - Session analytics
- ✅ `features/play/hooks/useMultiLanguageScript.ts` - Multi-language script

### Components
- ✅ `features/play/components/SessionCockpit.tsx` - Unified host shell
- ✅ `features/play/components/DirectorModeDrawer.tsx` - Focus mode overlay
- ✅ `features/play/components/StoryViewModal.tsx` - Participant perspective
- ✅ `features/play/components/SignalPresetEditor.tsx` - Signal preset CRUD
- ✅ `features/play/components/SignalCapabilityTest.tsx` - Lobby signal test
- ✅ `features/play/components/TimeBankRuleEditor.tsx` - TimeBank rules
- ✅ `features/play/components/TimeBankLivePanel.tsx` - Live time display
- ✅ `features/play/components/TriggerLivePanel.tsx` - Live trigger management
- ✅ `features/play/components/TriggerKillSwitch.tsx` - Emergency disable
- ✅ `features/play/components/TriggerDryRunPanel.tsx` - Trigger simulation
- ✅ `features/play/components/EventFeedPanel.tsx` - Real-time event feed
- ✅ `features/play/components/ShortcutHelpPanel.tsx` - Keyboard shortcut help
- ✅ `features/play/components/ReadinessIndicator.tsx` - Confidence meter
- ✅ `features/play/components/BatchArtifactPanel.tsx` - Batch operations UI
- ✅ `features/play/components/TriggerTemplateLibrary.tsx` - Template picker
- ✅ `features/play/components/SessionTimeline.tsx` - Timeline visualization
- ✅ `features/play/components/AnalyticsDashboard.tsx` - Analytics dashboard
- ✅ `features/play/components/LeaderScriptPanel.tsx` - Multi-language script UI

### Migrations
- ✅ `supabase/migrations/20251228130000_session_triggers_error_tracking.sql`
- ✅ `supabase/migrations/20251228140000_session_events.sql`

### Libraries
- ✅ `lib/multi-language-script.ts` - Multi-language script types and utilities
- ✅ `lib/trigger-templates.ts` - Pre-built trigger templates

### Documentation
- ✅ `docs/SESSION_COCKPIT_ARCHITECTURE.md` - This file
- ✅ `docs/SESSION_COCKPIT_MIGRATION.md` - Migration guide

### Files to Modify (for integration)
- `types/games.ts` - Add new artifact types
- `types/trigger.ts` - Add new conditions/actions
- `types/puzzle-modules.ts` - Add new module configs
- `features/play/components/HostSessionWithPlay.tsx` - Refactor to use SessionCockpit
- `features/play/components/PreflightChecklist.tsx` - Extend checks
- `features/play/components/PuzzleArtifactRenderer.tsx` - Add new renderers
- `features/play/hooks/useTriggerEngine.ts` - Add new condition/action handlers
- `app/admin/games/builder/components/ArtifactWizard.tsx` - Add new templates
- `lib/config/feature-flags.ts` - Add new flags

---

*Document generated 2025-12-28*
