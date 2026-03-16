# Participant Play UI Laws

> Immutable layout contract for the participant mobile-first play view.
> Every component in the `/play/session/[code]` route **must** obey these rules.
> Violations = bugs.

---

## 1. Top Bar — always visible, fixed height

- The header (`<header>`) is **always rendered** regardless of session state.
- It contains game title + "Playing as" name. Nothing else.
- It must never scroll away; its height is constant (no dynamic resize).
- `z-index` is ambient (no z-override needed — overlays sit above it).

## 2. Stage = the only scroll surface

- `ParticipantStepStage` is the **sole vertically-scrollable** region.
- All step content (title, description, media, materials, safety, note, callout) lives inside the Stage.
- The Stage **never shifts layout** when overlays open/close — it remains positioned and scrollable underneath.
- Timer, board messages, phase info, and step progress dots are Stage siblings (same scroll container).

## 3. Overlays = the only blocking layer

- Blocking overlays: **Decision modal**, **Story overlay**, **Countdown overlay**.
- Exactly **one** blocking overlay may render at a time — priority: `Decision > Story > Countdown`.
- Blocking overlays use `position: fixed` + high z-index (`z-[70]+`).
- When a blocking overlay is active: body scroll is locked (iOS-safe `position: fixed` pattern).
- The Stage remains mounted but visually hidden behind the overlay backdrop.

## 4. Drawers are never blocking

- Drawers: **Artifacts**, **Decisions list**, **Role**, **Chat**.
- Drawers slide up from the bottom or side — they **do not** lock body scroll.
- Only one drawer may be open at a time (mutual exclusion via `activeDrawer` state).
- The Decision **modal** (blocking, from Rule 3) is distinct from the Decision **drawer** (non-blocking list view).

## 5. Action bar is the single entry point for drawers

- All drawer toggles live in `ParticipantOverlayStack`'s action bar.
- Badges on action bar buttons reflect live counts + highlight state.
- The action bar itself is never hidden by drawers (drawers render above the Stage, below the action bar).

## 6. Signals never block

- Signal toasts appear at a fixed position (`z-50`), auto-dismiss after 4s.
- They never prevent interaction with the Stage or drawers.
- Per-channel cooldown (800–1200ms jitter) prevents mash-tapping.

## 7. Inline callout rules

- The artifact callout inside the Stage (Decision B) appears only when:
  - `artifactsHighlight === true` AND
  - `activeDrawer !== 'artifacts'` AND
  - `hasBlockingOverlay === false` AND
  - Session is not paused or ended.
- It transitions `false→true` only once (anti-spam: `prev ? prev : true`).

## 8. Z-index hierarchy

| Layer              | z-index     |
|--------------------|-------------|
| Debug overlay      | `z-[200]`   |
| Fullscreen wrapper | `z-[70]`    |
| Decision modal     | `z-[75]`    |
| Blocking overlay   | `z-[70]`    |
| Signal toast       | `z-50`      |
| Action bar         | `z-40`      |
| Stage content      | ambient     |

## 9. Body scroll lock contract

- Locked **only** when a blocking overlay (Rule 3) is active.
- Uses the iOS-safe pattern: `position: fixed` + `top: -scrollY` + restore on unlock.
- Drawers, signals, and callouts **never** lock scroll.

## 10. DEV debug overlay

- Activated via `?debug=1` query parameter in development only.
- Renders at `z-[200]` (above everything) — shows live state chips.
- Stripped from production builds (`process.env.NODE_ENV !== 'production'`).

---

*Last updated: 2025-07-15 — Interaction Lock v1.1 + Dramaturgy v1*
