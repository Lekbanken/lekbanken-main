# Sandbox Artifacts – Implementation Log

> **Scope rule (mandatory):** This file is updated continuously while implementing the Sandbox Artifacts initiative.
>
> - Add a short entry **before** starting a major task.
> - Add the outcome + follow-ups **after** completing it.
> - Keep decisions and constraints here so implementation doesn’t drift.

## Goal
Build out the UI Sandbox so **all artifact types** can be tested end-to-end in an isolated environment, across three perspectives:

- **ADMIN**: configure artifact (metadata + variant/config)
- **HOST**: control/reveal/reset, view state, and simulate events
- **PARTICIPANT**: interact with the artifact UI and produce “solved/failed/etc” events

Additionally:

- Sandbox **left nav categories must match Overview cards**, derived from a single registry to avoid drift.
- `/sandbox/play` must use the Sandbox AppShell / shell used by other sandbox routes.

## Non-goals
- Production-grade multiplayer, persistence, or real session networking.
- Adding unrelated UX “nice to haves” beyond what’s needed for artifact verification.

## Current repo inventory (starting point)
### Sandbox framework already exists
- The sandbox is dev-only, gated by `process.env.NODE_ENV` in:
  - `app/sandbox/layout.tsx` (calls `notFound()` in production)
- There is a shell implementation used by most sandbox pages:
  - `app/sandbox/components/shell/SandboxShellV2.tsx`
  - Left navigation is provided via `ModuleNavV2` and module data comes from `app/sandbox/config/sandbox-modules.ts`

### Current nav/overview sources
- Categories/modules are defined in a single config:
  - `app/sandbox/config/sandbox-modules.ts` (`sandboxCategories`)
- The sandbox index page currently renders specific categories manually:
  - `app/sandbox/page.tsx` uses `getCategoryById()` and renders categories in a hard-coded order.

### Known issue to fix
- `app/sandbox/play/page.tsx` is currently a standalone page with its own header/layout and does **not** use `SandboxShellV2`.

## Working assumptions
- We will reuse existing design system primitives already present in the codebase (no new theme/colors).
- Sandbox artifacts harness will be implemented as sandbox-only UI and state.
- Artifact definitions/config/state will be derived from a single registry to power:
  - Overview cards
  - Left nav module list
  - Artifact pages and per-role rendering

## Global TODO
- [ ] Make Sandbox overview render directly from the same registry as nav.
- [ ] Implement sandbox runtime store with event log.
- [ ] Implement and wire all artifact types with consistent harness patterns.
## Artifact-lista (checklist)

- [ ] Keypad (försöksbegränsning) (`keypad-attempt-limit`)
- [ ] Gåta / Fråga (text) (`riddle-text`)
- [ ] Pusselspel (3x3) (`tile-puzzle-3x3`)
- [ ] Logikrutnät (`logic-grid`)
- [ ] QR-kod checkpoint (`qr-gate-checkpoint`)
- [ ] Plats-checkpoint (`location-checkpoint`)
- [ ] Hemligt dokument (`secret-document`)
- [ ] Avslöjande kort (`reveal-card`)
- [ ] Ljudledtråd (`audio-clue`)
- [ ] Ljudaktivering (`audio-activation`)
### 2025-12-29 – Added minimal Host panel
Added a minimal Host panel to `/sandbox/artifacts` showing runtime kind/solved status and providing host actions (mark solved / log failed / log revealed / reset runtime) wired to the shared runtime store + event log. Also added a tiny read-only runtime snapshot (JSON) for quick inspection.

### 2025-12-29 – Hotspot: local test image
Updated the hotspot scenario default config to use a local image (`/sandbox/hotspot-test.svg`) instead of an external URL to make sandbox testing reliable.

### 2025-12-29 – Scenes Prototype route
Added `/sandbox/scenes` as a lightweight prototype for “karta → rum” navigation (per deltagare-position, host controls, event log) and registered it in the sandbox nav as “Scenes Prototype”.

### 2025-12-29 – Audio: local test file
Added a generator script (`scripts/generate-sandbox-audio.mjs`, with a small `scripts/generate-sandbox-audio.cjs` wrapper) that writes `public/sandbox/audio-test.wav` and updated audio sandbox scenarios to use `/sandbox/audio-test.wav` instead of external URLs.

### 2025-12-29 – Build fixes for Scenes prototype
Fixed `/sandbox/scenes` imports to use the correct sandbox shell path and aligned UI imports casing. Also resolved two unrelated TypeScript build blockers (`components/ui/collapsible.tsx` cloneElement/ref typing and `features/admin/games/utils/csv-generator.ts` column typing).
- [ ] Quizsvar (siffersvar) (`quiz-numeric-answer`)
- [ ] Textfråga (`text-question`)
- [ ] Checklista (`checklist`)
- [ ] Lärokort (`learn-card`)
- [ ] Bild att avslöja (`reveal-image`)
- [ ] Replay-markör (`replay-marker`)
- [ ] Tom artefakt (`empty-artifact`)

## Log
### 2025-12-29 – Inventory + log bootstrapped
- Added this log file and documented initial findings.
- Identified that `/sandbox/play` bypasses `SandboxShellV2` and needs to be refactored.

### 2025-12-29 – Sandbox overview + /sandbox/play shell alignment
- Updated Sandbox overview to render all categories from `sandboxCategories` so nav and overview cannot drift.
- Refactored `/sandbox/play` to render inside `SandboxShellV2` (so it uses the same sandbox AppShell/shell as other routes).

### 2025-12-29 – Artifact registry + schemas (foundation)
- Added a sandbox artifact registry with scenario IDs mapped to allowed artifact types.
- Added zod schemas for artifact configs (and a small set of state schemas for future store validation).
- Added a role-based `ArtifactRenderer` entrypoint to render participant/host/admin views where possible.

### 2025-12-29 – Sandbox artifact runtime store (foundation)
- Added a zustand store for sandbox artifact runtime state + an append-only event log.
- Added initial-state helpers per scenario so future harness pages can reset/seed consistently.

### 2025-12-29 – /sandbox/artifacts harness page wired
- Added an `Artifacts Harness` module to the sandbox nav (under Testing & Development).
- Implemented `/sandbox/artifacts` with scenario selector + role switch and an event log, powered by the artifact registry and runtime store.

### 2025-12-29 – ArtifactRenderer emits runtime events
- Wired key interactions (solve/reveal/fail/reset) to `useSandboxArtifactRuntimeStore().addEvent()` so the Event log is useful during manual testing.

### 2025-12-29 – ArtifactRenderer uses shared runtimeStates
- Refactored interactive artifacts to read/write `runtimeStates` via the zustand store (instead of local React state) so reset/role switching works end-to-end.

### 2025-12-29 – Admin config editor in harness
- Added a minimal admin JSON editor on `/sandbox/artifacts` that validates via the scenario schema and can reset runtime state after applying.

