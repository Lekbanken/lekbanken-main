# Participant Play Audit — Full Report

## Metadata

- Owner: -
- Status: active audit
- Date: 2026-02-22
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Aktiv audit för participant play-surface och dess kontrakt. Revalidera mot aktuell participant-view-kod innan du använder den som exakt nutidsbeskrivning.

**Revalidering 2026-03-21:** Route-/komponentkartan och säkerhetsgränserna håller fortfarande. Gap S2 är delvis mildrad genom att PlayMode-pollern nu körs som en 60s recovery-only safety net i stället för en tätare allmän refresh. S3–S4 kvarstår som verklig teknisk skuld.

**Scope:** `/play/session/[code]` participant view — routing, data flow, visibility, performance, contract, architecture.  
**Goal:** Lock architecture + contract before UI rebuild.

---

## A) File Map + Responsibilities

### Routes (Next.js App Router)

| Route | File | Role |
|---|---|---|
| `/play` | `app/(marketing)/play/page.tsx` → `client.tsx` | Join form — enter session code + display name. Stores token in `sessionStorage`, navigates to `/play/session/[CODE]` |
| `/play/session/[code]` | `app/(marketing)/play/session/[code]/page.tsx` | **Primary entry.** Server component → renders `<ParticipantSessionWithPlayClient code={code} />` |
| `/participants/join` | `app/participants/join/page.tsx` | **Legacy** join form (uses `localStorage`). Redirects to `/participants/view` |
| `/participants/view` | `app/participants/view/page.tsx` | **Legacy** self-contained inline participant view (353 lines). Does NOT reuse `ParticipantPlayView` |

### Component Hierarchy (New System)

```
ParticipantSessionWithPlayClient          (829 lines — orchestrator)
├── [lobby] → ParticipantLobby            (418 lines — waiting room)
│             ├── Avatar grid
│             ├── Session code (copy)
│             ├── Ready toggle / Leave
│             └── SessionChatModal
│
└── [active] → ActiveSessionShell         (263 lines — fullscreen overlay)
               ├── ReconnectingBanner
               ├── ParticipantPlayMode    (185 lines — play-mode gate)
               │   ├── [basic]       → static "Follow board" card
               │   └── [facilitated/participants] →
               │       ParticipantPlayView (1441 lines — main interactive view)
               │       ├── TimerDisplay
               │       ├── StatusIndicator
               │       ├── BoardMessage
               │       ├── ParticipantSignalMicroUI (219 lines)
               │       ├── ParticipantTimeBankDisplay (96 lines)
               │       ├── RoleCard (269 lines)
               │       ├── PuzzleArtifactRenderer
               │       ├── ConversationCardsCollectionArtifact
               │       ├── Toolbelt (dice roller, conversation cards)
               │       ├── CountdownOverlay
               │       ├── StoryOverlay
               │       └── Decision modal (blocking vote)
               └── SessionChatModal
```

### Supporting Files

| File | Role |
|---|---|
| `features/play/api/session-api.ts` (497 lines) | `getHostPlaySession`, `getParticipantPlaySession`, `updatePlaySessionState` |
| `features/play/api/primitives-api.ts` (233 lines) | `getParticipantArtifacts`, `getParticipantDecisions`, `castParticipantVote`, `submitKeypadCode` |
| `features/play/api/chat-api.ts` | `sendSessionChatMessage`, `getSessionChatMessages` |
| `features/play/api/signals-api.ts` | `sendSessionSignal`, `getSessionSignals` |
| `features/play/api/time-bank-api.ts` | `getSessionTimeBank` |
| `features/play/hooks/useLiveSession.ts` (389 lines) | Supabase realtime subscription — 13 event types |
| `features/play-participant/api.ts` (233 lines) | `joinSession`, `getPublicSession`, `getParticipantMe`, `heartbeat`, `rejoinSession` |
| `features/play-participant/tokenStorage.ts` | `saveParticipantAuth`, `loadParticipantAuth`, `clearParticipantAuth` |
| `types/play-runtime.ts` (381 lines) | `SessionRuntimeState`, `TimerState`, `BoardState`, all broadcast event types |

---

## B) Locked Visibility Rules (beslut 2026-02-21)

| Fält / Typ | Regel | Enforcement |
|---|---|---|
| `leaderScript` | **Aldrig** till deltagare | Server-side strip i game route ✅ |
| `boardText` | **Aldrig** till deltagare | Server-side strip i game route ✅ |
| `leaderTips` | **Aldrig** till deltagare | Utelämnas från safety-objekt ✅ |
| `leader_only` variants | **Aldrig** till deltagare | `artifacts/route.ts` filtrerar server-side ✅ |
| `public` variants | Synliga **efter** host avslöjar (`revealed_at`) | Server: kräver `revealed_at` ✅ |
| `role_private` variants | Synliga **bara** för deltagare med matchande roll — full body, ej maskad | Server: `mySessionRoleIds.has(sessionRoleId)` + step/phase-gate ✅ |
| Explicit assignments | Synliga för tilldelad deltagare | Server: `myAssignedVariantIds` ✅ |
| Role: `private_instructions` | Synliga efter host unlock (`secretUnlockedAt`) + deltagare reveal (`secretRevealedAt`) | Client-gate i RoleCard + server-gate i `/me/role/reveal` |
| Role: `private_hints` | Synliga efter reveal + deltagare klickar "visa ledtrådar" | Client-gate i RoleCard |
| Role: designmeta (`assignment_strategy`, `scaling_rules`, etc.) | **Aldrig** till deltagare | Server-side explicit SELECT i role route ✅ |

---

## C) Data Contract — "Participant Cockpit Contract"

### What the participant UI currently receives and renders:

```typescript
/**
 * ParticipantCockpitContract
 *
 * Single source of truth for every data field the participant UI
 * needs to render a complete play experience.
 */

// ─── Session Meta ────────────────────────────────────────────
interface SessionMeta {
  sessionId: string;
  sessionCode: string;
  gameId: string | null;
  gameTitle: string;
  playMode: 'basic' | 'facilitated' | 'participants';
  status: 'active' | 'paused' | 'ended' | 'cancelled';
  boardTheme?: 'neutral' | 'mystery' | 'party' | 'sport' | 'nature';
  participantCount: number;
}

// ─── Participant Identity ────────────────────────────────────
interface ParticipantIdentity {
  participantId: string;
  participantName: string;
  participantToken: string;            // stored in sessionStorage
  isNextStarter: boolean;
}

// ─── Connection ──────────────────────────────────────────────
interface ConnectionState {
  polling: 'connected' | 'degraded' | 'offline';
  degradedReason: 'auth' | 'not-found' | 'temporary' | null;
  realtime: boolean;                   // Supabase channel connected
  reconnecting: boolean;
}

// ─── Current Step ────────────────────────────────────────────
interface StepData {
  id: string;
  index: number;                       // 0-based
  totalSteps: number;
  title: string;
  description: string;                 // participant-facing instruction
  display_mode?: 'instant' | 'typewriter' | 'dramatic';
  media?: { type: string; url: string; altText?: string };
  materials?: string[];
  safety?: string;                     // safety note for this step
  tag?: string;                        // step tag/badge
  note?: string;                       // participant note
  // ⚠ SHOULD NOT exist: leaderScript, boardText
}

// ─── Current Phase ───────────────────────────────────────────
interface PhaseData {
  index: number;
  totalPhases: number;
  name: string;
  description?: string;
}

// ─── Timer ───────────────────────────────────────────────────
interface TimerData {
  state: TimerState | null;            // raw from runtime
  display: {
    remaining: number;                 // seconds
    progress: number;                  // 0..1
    isPaused: boolean;
    isFinished: boolean;
  };
  trafficLight: 'green' | 'yellow' | 'red';
}

// ─── Role ────────────────────────────────────────────────────
interface RoleData {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  public_description: string | null;   // always visible
  private_instructions: string;        // gated by unlock+reveal
  private_hints: string | null;        // gated by unlock+reveal+user action
  secretUnlockedAt: string | null;     // host unlocked secrets globally
  secretRevealedAt: string | null;     // this participant chose to reveal
}

// ─── Board ───────────────────────────────────────────────────
interface BoardData {
  message: string | null;              // host broadcast message
}

// ─── Artifacts ───────────────────────────────────────────────
type ArtifactType =
  | 'standard'
  | 'conversation_cards_collection'
  | 'keypad'
  | 'riddle' | 'counter' | 'audio' | 'multi_answer' | 'qr_gate'
  | 'hint_container' | 'hotspot' | 'tile_puzzle' | 'cipher'
  | 'logic_grid' | 'prop_confirmation' | 'location_check'
  | 'sound_level' | 'replay_marker';

interface ArtifactData {
  id: string;
  title: string | null;
  description: string | null;
  artifact_type: ArtifactType;
  artifact_order: number;
  metadata: Record<string, unknown>;   // sanitized (no correctCode)
  variants: ArtifactVariantData[];
}

interface ArtifactVariantData {
  id: string;
  title: string | null;
  body: string | null;
  visibility: 'public' | 'leader_only' | 'role_private';
  revealed_at: string | null;
  highlighted_at: string | null;
  variant_order: number;
}

// ─── Decisions ───────────────────────────────────────────────
interface DecisionData {
  id: string;
  title: string;
  prompt: string | null;
  decision_type: string | null;
  status: 'draft' | 'open' | 'closed' | 'revealed';
  options: Array<{ key: string; label: string }>;
  results?: Array<{ key: string; label: string; count: number }>;
}

// ─── Signals ─────────────────────────────────────────────────
// Participant SENDS: 3 hardcoded channels
type SignalChannel = 'READY' | 'SOS' | 'FOUND';

// Participant RECEIVES: toast notification via realtime
interface SignalToast {
  id: string;
  channel: string;
  message: string;
  createdAt: string;
}

// ─── Time Bank ───────────────────────────────────────────────
interface TimeBankData {
  balanceSeconds: number;              // read-only
}

// ─── Tools ───────────────────────────────────────────────────
interface ToolbeltData {
  enabledTools: Array<{
    tool_key: string;                  // 'dice_roller_v1' | 'conversation_cards_v1'
    enabled: boolean;
    scope: string;                     // 'both' for participant-visible
  }>;
}

// ─── Overlays ────────────────────────────────────────────────
interface OverlayState {
  countdown: { open: boolean; duration: number; message?: string; variant: 'default' | 'dramatic' };
  storyOverlay: {
    open: boolean;
    text: string;
    title?: string;
    speed: 'normal' | 'dramatic';
    theme: 'dark' | 'light' | 'dramatic';
    allowParticipantSkip: boolean;
    allowClose: boolean;
  };
  decisionModal: DecisionData | null;  // open decision = blocking modal
}

// ─── Chat ────────────────────────────────────────────────────
interface ChatCapability {
  canSend: boolean;                    // true in both lobby + active
  visibility: 'public' | 'host';      // participant can choose
  anonymous: boolean;                  // participant can toggle
}

// ═══════════════════════════════════════════════════════════════
// FULL CONTRACT
// ═══════════════════════════════════════════════════════════════
interface ParticipantCockpitContract {
  session: SessionMeta;
  participant: ParticipantIdentity;
  connection: ConnectionState;
  step: StepData | null;                // null = not started yet
  phase: PhaseData | null;
  timer: TimerData;
  role: RoleData | null;
  board: BoardData;
  artifacts: ArtifactData[];
  decisions: DecisionData[];
  signals: {
    outbound: SignalChannel[];          // what participant can send
    inbound: SignalToast | null;        // latest received signal
    offlineQueue: number;               // queued count
  };
  timeBank: TimeBankData | null;
  tools: ToolbeltData;
  overlays: OverlayState;
  chat: ChatCapability;
}
```

---

## C) Gaps + Risks

### 🔴 Critical — ALL FIXED ✅ (2026-02-21)

| # | Issue | Detail | Status |
|---|---|---|---|
| **C1** | **`leaderScript` leaked to participants** | `/api/play/sessions/[id]/game` returned `leaderScript` per step and `leaderTips` in safety. | **FIXED** — `isParticipant` flag strips `leaderScript`, `boardText`, `phaseId` from steps and `leaderTips` from safety via destructuring. Runtime assertion in dev. |
| **C2** | **`boardText` leaked to participants** | Same endpoint returned `boardText` per step. | **FIXED** — stripped in same participant branch. |
| **C3** | **Role endpoint over-exposes** | `/api/play/me/role` returned `SELECT *` on `session_roles`. | **FIXED** — explicit column select: `id, name, icon, color, public_description, private_instructions, private_hints`. Runtime assertion in dev. |

### 🟡 Significant

| # | Issue | Detail | Impact |
|---|---|---|---|
| **S1** | **`leader_only` variants not filtered server-side** | Audit initially flagged this, but code review confirmed: `artifacts/route.ts` already uses `resolveSessionViewer()` with proper host/participant branching. Participant path skips `visibility === 'leader_only'` at line ~288. | **Already handled** ✅ |
| **S2** | **Dual polling: orchestrator + PlayMode** | `ParticipantSessionWithPlay` polls session/runtime state adaptively. `ParticipantPlayMode` still re-fetches full game data, but now only every 60s as a recovery-only stale-state safety net after missed realtime events. | Lower network pressure than before, but still duplicated refresh responsibility and more moving parts than necessary. |
| **S3** | **No lazy-loading of heavy components** | `ParticipantPlayView` (1441 lines) imports ALL artifact renderers, CountdownOverlay, StoryOverlay, ConversationCards, PuzzleRenderer, Toolbelt — all eagerly loaded even if the game uses none of them. | Larger bundle on mobile. First paint delayed. |
| **S4** | **ParticipantPlayView is a 1441-line monolith** | All state (artifacts, decisions, keypad, signals, secrets, overlays, body lock) lives in a single component with 20+ `useState` hooks. No state reducer or context. | Hard to reason about, test, and extend. Re-renders cascade. |
| **S5** | **Legacy system not deprecated** | `/participants/join` + `/participants/view` is a parallel, unmaintained system (353-line inline page). Users could still land there. | Confusion + maintenance burden. |

### 🟠 Moderate

| # | Issue | Detail | Impact |
|---|---|---|---|
| **M1** | **No offline/degraded UI for play view** | `ParticipantPlayView` only has a small "offline" badge in StatusIndicator. No fullscreen degraded state, no "you lost connection — last known state" recovery. | Bad UX on flaky mobile connections. |
| **M2** | **Signal channels hardcoded** | Only 3 signals (READY/SOS/FOUND) — cannot be configured per-game. | Limits game design expressiveness. |
| **M3** | **No fullscreen API integration** | `ActiveSessionShell` uses CSS fixed positioning, not the browser Fullscreen API. No immersive mode on mobile. | Not truly immersive on mobile. |
| **M4** | **No keyboard shortcuts / accessibility** | No keybinds for next step, signal, vote. No ARIA landmarks. | Accessibility gap. |
| **M5** | **Feature flags checked per-render** | `isFeatureEnabled('timeBank')` and `isFeatureEnabled('signals')` called inline in JSX (not memoized). Config is likely static, but pattern is messy. | Minor perf concern. |
| **M6** | **Several concurrent timers in active play** | Adaptive poll chain + heartbeat interval + 60s recovery refresh + countdown tick + signal toast dismiss. Multiple independent `setTimeout`/`setInterval` loops still coexist. | Timer cleanup complexity. Not critical but increases cognitive load. |

---

## D) Recommended Implementation Plan

### Steg 0 — Fix Critical Leaks (DO FIRST)

**Before ANY UI work:**

1. **Strip `leaderScript` + `leaderTips` + `boardText` from participant responses.**  
   In `app/api/play/sessions/[id]/game/route.ts`: detect `x-participant-token` header → return a filtered `steps` array without `leaderScript`, and omit `safety.leaderTips`.

2. **Filter `leader_only` variants server-side** in `/api/play/sessions/[id]/artifacts`:  
   When caller is participant, exclude variants where `visibility = 'leader_only'`.

3. **Trim role response** in `/api/play/me/role`:  
   Return only: `id`, `name`, `icon`, `color`, `public_description`, `private_instructions`, `private_hints`.

### Steg 1 — Architecture Refactor: Extract State + Contract

**Goal:** Turn `ParticipantPlayView` from a 1441-line monolith into a composable shell.

1. Create `ParticipantPlayContext` (React context + reducer):
   ```
   features/play/context/ParticipantPlayContext.tsx
   ```
   - Holds the full `ParticipantCockpitContract` state
   - Single `useReducer` instead of 20+ `useState`
   - Actions: `SET_STEP`, `SET_TIMER`, `SET_ARTIFACTS`, `SET_DECISIONS`, `SIGNAL_RECEIVED`, `OVERLAY_SHOW/HIDE`, etc.

2. Create `useParticipantPlayData` hook:
   ```
   features/play/hooks/useParticipantPlayData.ts
   ```
   - Merges the 30s poll from `ParticipantPlayMode` with `useLiveSession` realtime
   - Single data source: initial fetch + realtime patches
   - Eliminates redundant dual polling

3. Extract sub-components into standalone files:
   - `ParticipantStepStage.tsx` — step title, description, media, materials, safety, typewriter
   - `ParticipantArtifactTray.tsx` — artifact drawer/grid with keypad, puzzle, conversation cards
   - `ParticipantDecisionModal.tsx` — blocking vote modal
   - `ParticipantSignalLane.tsx` — signal send buttons + received toast
   - `ParticipantOverlayStack.tsx` — countdown + story overlay management
   - `ParticipantHeader.tsx` — game title, status badge, player name, toolbelt

### Steg 2 — Fullscreen Shell + Navigation

**Goal:** Premium mobile-first fullscreen experience.

1. **Upgrade `ActiveSessionShell`** or create `ParticipantFullscreenShell`:
   - Browser Fullscreen API integration (optional prompt)
   - Safe area insets (notch, bottom bar)
   - Swipe-to-navigate (left/right between sections if applicable)
   - Connection quality bar (connected → degraded → offline with animation)

2. **Top Bar:**
   - Session code (tap to copy)
   - Status badge (live/paused/ended) with pulse animation
   - Leave button → confirm
   - Chat bubble with unread count

3. **Skeleton loading strategy:**
   - Shell renders immediately with skeleton
   - Step content lazy-loads
   - Artifacts/decisions fetch on demand (not on mount)

### Steg 3 — Step Stage (Core)

**Goal:** The "main stage" — what participants look at 80% of the time.

1. `ParticipantStepStage` component:
   - Step number badge + progress dots
   - Title + description with display_mode (instant/typewriter/dramatic)
   - Timer with traffic-light coloring (integrated, not separate)
   - Media embed (image, potentially video)
   - Materials list + safety note
   - Phase banner (when applicable)

2. **Transitions:** Animate step changes (fade/slide).

3. **QA scenarios:**
   - Step changes mid-typewriter → resets cleanly
   - Timer reaches 0 → visual alert, no crash
   - No step yet (index -1) → skeleton/waiting state
   - Session paused → overlay, step still visible underneath
   - Session ended → thank-you card replaces everything

### Steg 4 — Artifacts + Decisions

**Goal:** "Inventory" feel — clear states, tactile interactions.

1. `ParticipantArtifactTray`:
   - Grid/list layout with clear states: locked → unlocked → used
   - Keypad: fullscreen numpad feel
   - Puzzle types: delegated to `PuzzleArtifactRenderer`
   - Conversation cards: own drawer/modal

2. `ParticipantDecisionModal`:
   - Blocking modal for open decisions (current behavior, polish)
   - Results view for revealed decisions
   - Animation on vote submit

3. **Lazy-load:** `React.lazy()` for PuzzleArtifactRenderer, ConversationCards, heavy artifact sub-components.

4. **QA scenarios:**
   - Artifact appears mid-step → toast notification + tray update
   - Keypad: correctCode NEVER in client JS (verified ✅)
   - Decision closed while voting → graceful dismiss
   - No side effects on re-render

### Steg 5 — Signals + Time Bank + Overlays

**Goal:** Signal lane = unified event/notification stream.

1. `ParticipantSignalLane`:
   - Outbound: 1-tap signal buttons (READY/SOS/FOUND)
   - Inbound: toast/chip notification with auto-dismiss
   - Offline queue badge + auto-retry indicator

2. `ParticipantOverlayStack`:
   - Manages z-index priority: Decision modal > Story overlay > Countdown
   - Only one blocking overlay at a time
   - Participant-skip support for story overlay

3. Time Bank: wrap existing `ParticipantTimeBankDisplay` — already clean.

4. **QA scenarios:**
   - Signal sent offline → queued → auto-retried on reconnect
   - Countdown + decision modal at same time → decision takes priority
   - No request loops from overlay state changes

### Steg 6 — Chat Integration + Polish

**Goal:** Non-intrusive chat that doesn't break focus.

1. `ChatDrawer`:
   - Slide-up drawer (not modal) from bottom
   - Unread count badge in header
   - Public + host-only visibility toggle
   - Host broadcast messages highlighted

2. **Polish:**
   - Haptic feedback (vibration API) for signals and events
   - Sound effects (optional, user preference)
   - Dark mode verification
   - i18n completeness check
   - Performance profiling (React DevTools, Lighthouse)

---

## Appendix: All Endpoints Used by Participant

| Endpoint | Method | Auth | Purpose | Component |
|---|---|---|---|---|
| `/api/play/session/{code}` | GET | None | Public session info (lobby) | ParticipantSessionWithPlay |
| `/api/play/me?session_code={code}` | GET | `x-participant-token` | Participant's own data + session state | ParticipantSessionWithPlay, session-api |
| `/api/play/me/role?session_code={code}` | GET | `x-participant-token` | Participant's assigned role | session-api |
| `/api/play/me/role/reveal?session_code={code}` | POST | `x-participant-token` | Mark secret instructions as revealed | ParticipantPlayView |
| `/api/play/sessions/{id}/game` | GET | `x-participant-token` | Game data (steps, phases, tools) ⚠️ **leaks** | session-api |
| `/api/play/sessions/{id}/artifacts` | GET | `x-participant-token` | Participant's artifacts + variants | primitives-api |
| `/api/play/sessions/{id}/artifacts/{id}/keypad` | POST | `x-participant-token` | Submit keypad code | primitives-api |
| `/api/play/sessions/{id}/decisions` | GET | `x-participant-token` | Participant's decisions | primitives-api |
| `/api/play/sessions/{id}/decisions/{id}/vote` | POST | `x-participant-token` | Cast vote | primitives-api |
| `/api/play/sessions/{id}/decisions/{id}/results` | GET | `x-participant-token` | Decision results (revealed only) | primitives-api |
| `/api/play/sessions/{id}/signals` | POST | `x-participant-token` | Send signal | signals-api |
| `/api/play/sessions/{id}/chat` | GET/POST | `x-participant-token` | Chat messages | chat-api |
| `/api/play/sessions/{id}/time-bank` | GET | cookie | Time bank balance | time-bank-api |
| `/api/play/participant/heartbeat` | POST | `x-participant-token` | Keep-alive | play-participant/api |
| Supabase Realtime | WS | Supabase anon key | 13 broadcast event types | useLiveSession |

## Appendix: All Realtime Broadcast Events

| Event Type | Participant Action | Source |
|---|---|---|
| `state_change` | Update step/phase/status/secret-unlock | useLiveSession |
| `timer_update` | Update timer state + display | useLiveSession |
| `role_update` | (callback — not currently used by participant) | useLiveSession |
| `board_update` | Update board message | useLiveSession |
| `turn_update` | Update next-starter indicator | useLiveSession |
| `artifact_update` | Re-fetch artifacts | useLiveSession → loadArtifacts |
| `decision_update` | Re-fetch decisions | useLiveSession → loadDecisions |
| `outcome_update` | (callback — not currently used) | useLiveSession |
| `countdown` | Show/hide countdown overlay | useLiveSession |
| `story_overlay` | Show/hide story overlay | useLiveSession |
| `signal_received` | Show signal toast | useLiveSession |
| `time_bank_changed` | Re-fetch time bank | ParticipantTimeBankDisplay |
| `puzzle_update` | (callback — not currently wired) | useLiveSession |

## Appendix: Timer/Poller Inventory

| Timer | Location | Interval | Purpose | Risk |
|---|---|---|---|---|
| Adaptive poll chain | ParticipantSessionWithPlay | 3s base, backoff to 30s | Session status + participant data | Low — well-built with backoff |
| Heartbeat | ParticipantSessionWithPlay | 10s | Keep participant alive | Low |
| Data refresh | ParticipantPlayMode | 30s | Full re-fetch of game data | **Redundant** — realtime covers step changes |
| Timer tick | useLiveSession | 1s | Recalculate timer display | Low |
| Signal toast auto-dismiss | ParticipantPlayView | 4s | Auto-hide signal toast | Low |
| Join-gate countdown | ParticipantSessionWithPlay | 1s (recursive) | Auto-join countdown | Low — self-terminating |
