# Play Structure Audit

> Generated 2026-03-16. All findings verified via import analysis and route wiring.

---

## 1. Executive Summary

The play domain is split across **four separate surfaces**. This is **not a migration in progress** — it is a **deliberate layered architecture** where each surface has a distinct responsibility:

| Surface | Files | Role |
|---------|-------|------|
| `components/play/` | 47 | **Shared UI primitives** — puzzle modules, lobby components, form inputs, status badges |
| `features/play/` | 134 | **Domain orchestration** — session management, director mode, play modes, realtime hooks |
| `features/play-participant/` | 2 | **Participant API client** — session join/create, token storage |
| `lib/play/` | 5 | **Server-side utilities** — session commands, guards, UI state resolution |

**Key finding:** These are NOT parallel/competing systems. `features/play/` imports from `components/play/` (6 files do this). `components/play/` never imports from `features/play/`. The dependency flows one direction: `components/play` → `features/play` → routes.

---

## 2. Why Both Trees Exist

### `components/play/` — Shared UI Layer

This contains **pure presentation components** usable across multiple route surfaces:

- **Puzzle modules** (13): `Keypad`, `RiddleInput`, `CipherDecoder`, `HotspotImage`, `TilePuzzle`, `LogicGrid`, `QRScanner`, `HintPanel`, `AudioPlayer`, `LocationCheck`, `PropConfirmation`, `SoundLevelMeter`, `MultiAnswerForm`
- **Immersion components** (4): `TypewriterText`, `CountdownOverlay`, `StoryOverlay`, `Counter`
- **Session UI** (5): `SessionStatusBadge`, `JoinSessionForm`, `SessionControls`, `ParticipantList`, `ParticipantRow`
- **Trigger UI** (3): `TriggerCard`, `TriggerList`, `TriggerWizard`
- **Lobby** (5): `LobbyHub`, `ReadinessBadge`, `ContentPreviewSection`, `ParticipantsSection`, `RolesSection`, `SettingsSection`
- **Hooks** (5): `useTypewriter`, `useCountdown`, `useSound`, `useTrigger`, `useKeypad`

**Consumers:** Marketing routes, app routes, admin builder, sandbox, AND `features/play/` itself.

### `features/play/` — Domain Orchestration Layer

This contains **session management, play modes, and realtime logic**:

- **Play modes** (3): `HostPlayMode`, `ParticipantPlayMode`, `FacilitatedPlayView`
- **Session shells** (3): `ActiveSessionShell`, `HostSessionWithPlay`, `ParticipantSessionWithPlay`
- **Director mode** (7): `DirectorModePanel`, `DirectorModeDrawer`, `DirectorStagePanel`, `DirectorChipLane`, `DirectorTriggerCard`, `DirectorArtifactActions`, `DirectorModeDrawer`
- **Session management** (6): `SessionCockpit`, `RunSessionCockpit`, `RunsDashboard`, `SessionTimeline`, `SessionChatDrawer`, `SessionChatModal`
- **Participant UI** (11): `ParticipantPlayView`, `ParticipantLobby`, `ParticipantOverlayStack`, `ParticipantStepStage`, `ParticipantDecisionOverlay`, etc.
- **Signal/trigger system** (8): `SignalPanel`, `SignalPresetEditor`, `TriggerPanel`, `TriggerLivePanel`, `TriggerEngine`, etc.
- **Hooks** (17): `useLiveSession`, `useSessionState`, `useSessionChat`, `useTriggerEngine`, etc.
- **API layer** (5): `session-api`, `chat-api`, `signals-api`, `primitives-api`, `time-bank-api`

**Consumers:** Primarily app routes and marketing play session routes.

### `features/play-participant/` — API Client

Two files:
- `api.ts` — client functions: `joinSession`, `createSession`, `listHostSessions`, `approveParticipant`, `kickParticipant`, etc.
- `tokenStorage.ts` — participant auth token management

**Consumers:** Marketing play routes, app play routes, game start buttons, and `features/play/` components.

### `lib/play/` — Server Utilities

Five files:
- `session-command.ts` — `applySessionCommand()` used by API routes
- `session-guards.ts` — `assertSessionStatus()` used by 15+ API routes
- `ui-state.ts` — `resolveUiState()` used by board/participant views
- `game-to-cockpit.ts` — data transformation for director preview
- `realtime-gate.ts` — realtime channel management

**Consumers:** API route handlers exclusively (except `ui-state` and `game-to-cockpit` used by client components).

---

## 3. Cross-Import Analysis

### Direction: `features/play` → `components/play` (6 files)

| features/play file | Imports from components/play |
|--------------------|-----------------------------|
| `HostSessionWithPlay.tsx` | `SessionHeader`, `SessionControls`, `ParticipantList`, `SessionStatusMessage` |
| `ParticipantOverlayStack.tsx` | `TypewriterSpeed` (type), `CountdownOverlay`, `StoryOverlay` |
| `ParticipantSessionWithPlay.tsx` | `SessionStatusBadge`, `ReconnectingBanner`, `SessionStatusMessage`, `JoinSessionForm` |
| `ParticipantStepStage.tsx` | `TypewriterText` |
| `PuzzleArtifactRenderer.tsx` | 13 puzzle modules (`RiddleInput`, `CipherDecoder`, `HotspotImage`, etc.) |
| `HostSessionWithPlay.tsx` | Also imports from `features/play-participant/api` |

### Direction: `components/play` → `features/play` — **ZERO imports**

This confirms `components/play` is a pure dependency with no reverse coupling.

### Direction: `features/play` → `features/play-participant` (4 files)

`HostSessionWithPlay`, `ParticipantLobby`, `ParticipantSessionWithPlay`, `SessionCockpit`, `useSessionState` all import API functions from `play-participant`.

---

## 4. Route Wiring

### Marketing routes (`/play/*` — public, no auth)

| Route | Tree used |
|-------|-----------|
| `/play` (join page) | `components/play` (JoinSessionForm) + `features/play-participant` (joinSession, tokenStorage) |
| `/play/session/[code]` | Both — `components/play` (status badges, feedback) + `features/play` (ParticipantPlayMode, SessionChatDrawer, ActiveSessionShell) + `features/play-participant` (API + tokens) |

### App routes (`/app/play/*` — authenticated)

| Route | Tree used |
|-------|-----------|
| `/app/play` | Static page (no play imports) |
| `/app/play/sessions` | `components/play` (SessionListItem) + `features/play` (RunsDashboard) + `features/play-participant` (listHostSessions) |
| `/app/play/sessions/[id]` | `components/play` (SessionHeader, SessionControls, ParticipantList) + `features/play` (SessionCockpit) + `features/play-participant` (API) |
| `/app/play/plan/[planId]` | `features/play` (PlayPlanPage) |
| `/app/play/[gameId]` | `features/play-participant` (createSession) |

### Admin routes

| Route | Tree used |
|-------|-----------|
| `/admin/games/builder` | `components/play` (TriggerWizard) only |

### API routes (`/api/play/*` — server-side)

| Route | Tree used |
|-------|-----------|
| All 30+ `/api/play/*` routes | `lib/play` (session-command, session-guards) |
| `/api/play/[planId]/start` | `features/play/types` (type imports only) |

### Sandbox routes

Multiple sandbox pages import from both trees for testing/preview.

---

## 5. Duplicate Components

### `SessionHeader` — EXISTS IN BOTH TREES

- `components/play/SessionHeader.tsx` — exported via barrel, **never imported by anyone** → ORPHAN
- `features/play/components/SessionHeader.tsx` — imported by `PlayPage.tsx` and `PlayPlanPage.tsx` → CANONICAL

### Other near-duplicates

- `TriggerCard` in `components/play/` vs `DirectorTriggerCard` in `features/play/` — different components, different purposes
- No other exact name collisions

### Orphaned files in `components/play/`

| File | Status | Reason |
|------|--------|--------|
| `SessionHeader.tsx` | **ORPHAN** | Never imported — superseded by `features/play/components/SessionHeader.tsx` |
| `SessionCard.tsx` | **ORPHAN** | `SessionCard` and `SessionCardSkeleton` — zero external references |
| `ParticipantStatusBadge.tsx` | **ORPHAN** | `ParticipantStatusBadge` and `ParticipantStatusDot` — zero external references |
| `KeypadDisplay.tsx` | Internal only | Only used by `Keypad.tsx` within same directory — not orphaned |

---

## 6. Diagnosis: What Is This Structure?

This is **NOT**:
- ❌ A half-finished migration
- ❌ Two competing systems
- ❌ Old code vs new code

This **IS**:
- ✅ A **layered architecture** with deliberate separation of concerns:

```
Layer 1: components/play/    → Shared UI primitives (puzzle modules, forms, badges)
Layer 2: features/play/      → Domain orchestration (play modes, session shells, director)
Layer 3: features/play-participant/ → API client (session CRUD, auth tokens)
Layer 4: lib/play/           → Server utilities (commands, guards)
```

The dependency graph flows cleanly downward:
```
Route pages
  ↓ imports
features/play/ (orchestration)
  ↓ imports
components/play/ (UI primitives) + features/play-participant/ (API)
  ↓ imports                         ↓ calls
lib/play/ (server utils)           /api/play/* routes
```

### Why it looks confusing

1. **The names suggest competition** — `features/play` and `components/play` sound like they do the same thing
2. **3 orphaned files** create noise — `SessionHeader`, `SessionCard`, `ParticipantStatusBadge`
3. **Shared import style** — routes import from both `@/components/play` and `@/features/play`, making them look interchangeable
4. **No documentation** explains the intended layering

---

## 7. Risks

### Actual risks (verified)

| Risk | Severity | Impact |
|------|----------|--------|
| 3 orphaned files in `components/play/` | LOW | Agent confusion, no runtime impact |
| No architectural documentation for the layering | MEDIUM | New contributors may put orchestration code in `components/play/` |
| `SessionHeader` name collision | LOW | Confusing but non-breaking (orphaned one is never imported) |

### Previously assumed risks (now resolved)

| Previous assumption | Reality |
|---------------------|---------|
| "118+ components in parallel trees with zero cross-imports" | **Partially wrong** — there ARE cross-imports (6 files), flowing `features/play` → `components/play`. The trees are layered, not parallel. |
| "Largest structural risk in the repo" | **Overstated** — this is a working architecture, not a broken one. The real issue is 3 orphaned files + missing documentation. |
| "Requires full import graph analysis before touching" | **Done** — the graph is clean and one-directional. Safe to work within either tree. |

---

## 8. Recommendations

### Immediate (safe, zero risk)

1. Delete 3 orphaned files: `SessionHeader.tsx`, `SessionCard.tsx`, `ParticipantStatusBadge.tsx` from `components/play/`
2. Remove their barrel exports from `components/play/index.ts`

### Short-term (documentation)

3. Add a `components/play/README.md` explaining: "Shared UI primitives used by features/play and route pages"
4. Add a `features/play/README.md` explaining: "Domain orchestration layer — imports from components/play for UI"
5. Update `REPO_GOVERNANCE.md` to describe the play layering

### Not needed

6. ~~Move components/play into features/play~~ — **wrong move**. `components/play/` is correctly positioned as shared UI imported by admin builder, marketing routes, AND features/play. Moving it would violate the `components/` = shared UI rule.
