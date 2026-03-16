# PLAY — Implementation Guide (P0)
**Date:** 2026-01-18  
**Source of truth:** `PLAY SYSTEM DOCUMENTATION v1.1 (2026-01-17)`  
**Scope:** Golden Flows GF1–GF3 only  
**Rule:** This file is the implementation playbook. The documentation file remains the reference truth.

---

## 0. Locked decisions (P0)
These decisions are final for P0 and must not be changed during implementation.

### D0.1 Participant “awaiting approval”
- Use `participants.status = 'idle'` to represent “awaiting approval” for P0.
- No DB migration for `pending`. No enum changes.

### D0.2 `uiMode` is derived state
- `uiMode` must be derived from session fields:
  - `status`, `started_at`, `paused_at`, `ended_at`
- `uiMode` must never be stored in DB.

### D0.3 Lint policy
- ESLint **warnings** are acceptable for P0.
- ESLint **errors** are not acceptable.

---

## 1. Golden Flows (P0)
### GF1 Host — Run a live session end-to-end
**Goal:** Host can run a session without leaving the Run tab.

**Must-have IA**
- Tabs (session detail): `Run` (default), `Participants`, `Artifacts`, `Triggers`, `Board`, `Settings`

**Run view layout**
- NOW: current phase/step + prioritized instruction text
- NEXT: next step preview + primary CTA when live
- CONTROLS: start/pause/resume/end + timer/timebank
- HEALTH: realtime + participants + board freshness + trigger health

**Quick actions (only)**
- Reveal artifacts for current step
- Fire manual triggers for current step

**Acceptance (GF1)**
1. Run tab contains everything needed for normal operation.
2. Primary CTA is correct per `uiMode`.
3. Health panel is always visible and updates.
4. No incorrect action enabled in wrong mode.

---

### GF2 Participant — Join → wait → interact → rejoin
**Goal:** Participant never hits blank states and understands what’s happening.

**Routes**
- `/participants/join` (form)
- `/participants/view` (single view: lobby/live/paused/ended/locked/approval via idle)

**Join validation**
- Session code: uppercase, grouped display
- Name: 2–50 chars trimmed
- Errors mapped consistently: invalid/full/ended/approval-required

**Rejoin rules**
1. If token exists → call `/api/participants/sessions/rejoin`
2. If ended → show ended state (no redirect loop)
3. If invalid token → redirect to join with explanation
4. If `allowRejoin=false` → join with explanation

**Acceptance (GF2)**
1. Join completes in < 10s normally.
2. Participant always sees meaningful state.
3. Refresh triggers auto-rejoin when allowed.
4. Copy and state indicators match `uiMode`.

---

### GF3 Board — Public display that never breaks
**Goal:** Board never goes blank; safe mode always renders something.

**Templates**
- Lobby template: name + code + QR + short instruction + welcome message
- Live template: phase/step + timer (if enabled) + board text + public artifacts + active decisions

**Safe mode**
- Cache last known good payload in memory
- If degraded/offline: render cached state + overlay (“Updating… Showing last known state.”) + timestamp
- If no cache available: render Lobby template fallback

**Acceptance (GF3)**
1. Never blank screen.
2. Predictable layout changes between lobby/live.
3. Safe mode engages on errors and recovers automatically.
4. Only public/sanitized data rendered.

---

## 2. Shared UI-state-resolver (P0)
**Purpose:** Deterministic, reused state logic across Host/Participant/Board.

### Output contract
- `uiMode`: `lobby | live | paused | ended | locked`
- `banner`: `waiting | paused | locked | ended | degraded | offline | none`
- `connection`: `connected | degraded | offline`
- `allowedActions` (host controls)

### Derivation rules (P0)
- ended: `status in (ended|archived|cancelled)` → `uiMode=ended`
- paused: `status=paused` → `uiMode=paused`
- locked: `status=locked` → `uiMode=locked`
- lobby: `status=active && started_at is null` → `uiMode=lobby`
- live: `status=active && started_at set` → `uiMode=live`

### i18n requirement
All user-facing strings must use i18n keys (sv/en/no). No hardcoded Play strings.

### File pointers
- `lib/play/ui-state.ts` (shared resolver)
- `features/play/components/SessionCockpit.tsx` (Host Run view + tabs)
- `features/play/hooks/useSessionState.ts` (Host session state)
- `app/participants/join/page.tsx` (Join flow + validation)
- `app/participants/view/page.tsx` (Participant single view)
- `app/board/[code]/BoardClient.tsx` (Board templates + safe mode)
- `messages/en.json`, `messages/sv.json`, `messages/no.json` (i18n keys)

---

## 3. Implementation tasks (ordered)
### P0.1 Lock decisions into documentation
- Add/confirm the 3 locked decisions in the main documentation.
- Ensure “idle used for awaiting approval” is explicitly documented.

### P0.2 Host IA + Run view
- Implement tabs and ensure Run is default.
- Implement NOW/NEXT/CONTROLS/HEALTH layout.
- Ensure quick actions are limited and step-scoped.

### P0.3 Participant view states
- Ensure `/participants/view` is fully driven by shared resolver.
- Ensure join errors map to consistent UI states/copy.
- Verify rejoin edge cases (ended/invalid/allowRejoin=false).

### P0.4 Board templates + safe mode
- Verify lobby/live templates.
- Verify safe mode fallback + timestamp overlay.
- Prove non-blank in failed fetch scenarios.

### P0.5 Shared consistency
- Apply the copy-matrix across host/participant/board (sv/en/no).
- Standardize loading/empty/error components and patterns.

---

## 4. Manual test checklist (must pass)
### GF1 Host
1. Create session → verify lobby banner and code visible.
2. Join from participant device → host count updates.
3. Start → `uiMode=live`, NOW/NEXT updates.
4. Pause/Resume → correct banner and controls.
5. End → participants and board show ended state.

### GF2 Participant
1. Join valid code → redirects to view and shows lobby/live.
2. Invalid code → correct error message.
3. Approval required → show “awaiting approval” (idle semantics).
4. Refresh → auto-rejoin works (when allowRejoin=true).
5. Ended session → ended state is stable, no loops.

### GF3 Board
1. Lobby template renders code + QR + instruction.
2. Live template renders phase/step + timer + board text.
3. Simulate degraded/offline → safe mode overlay + cached view.
4. Ensure no private data appears.

---

## 5. Quality gates (must be green)
- `npm run lint` (warnings allowed, no errors)
- `npm run type-check`
- `npm test`

---

## 6. Release checklist (P0)
1. Manual tests green (section 4).
2. Safe mode verified on board.
3. No hardcoded Play strings remain.
4. Type-check + tests green.
5. Document locked decisions confirmed.
