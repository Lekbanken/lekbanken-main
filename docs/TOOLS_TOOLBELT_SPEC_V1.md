# Toolbelt UX Spec v1 (MVP)

## Metadata

- Status: draft
- Last validated: 2026-01-02

## Purpose

Defines the **exact MVP UX** for the Toolbelt system (Admin + Play) and the single MVP tool: **Dice Roller v1**.

This file is the **UX spec**. Implementation details and progress live in [docs/TOOLS_MASTER_IMPLEMENTATION.md](docs/TOOLS_MASTER_IMPLEMENTATION.md).

## Core principles

- Toolbelt is a **session capability**, not game content and not a step artifact.
- MVP tools: **ONLY** Dice Roller v1.
- No canvas/WebGL/physics.
- No event logging or persistence of tool usage (client-only state is fine).

## Data model (MVP)

Per-game Tool configuration is persisted in DB table `public.game_tools`:

- `tool_key` (text): e.g. `dice_roller_v1`
- `enabled` (boolean)
- `scope` (text enum): `host` | `participants` | `both`

## Admin UX (MVP)

### 1) Tools Library (Admin)

- Shows the code-defined tool catalog (no CRUD).
- For MVP, the list contains only Dice Roller v1.

### 2) Game Builder: “Tools for this game”

- Located in the existing Admin Game Builder edit flow.
- Allows configuring tools for the specific game:
  - Enable/disable Dice Roller v1
  - Choose scope: host / participants / both
- Saved to `public.game_tools` for that `game_id`.

## Play UX (MVP)

### Toolbelt surface

- Toolbelt appears in Play and renders enabled tools based on `public.game_tools` for the session’s game.
- Tool availability is filtered by `scope` and the current user role:
  - Host sees tools scoped to `host` or `both`
  - Participant sees tools scoped to `participants` or `both`

### Layout

- Desktop: toolbelt opens as a drawer/panel.
- Mobile: toolbelt opens as a bottom sheet.

### Dice Roller v1 behavior

- User triggers a roll.
- The result is computed first (final result decided immediately).
- After computation, a CSS-only animation plays and then reveals the precomputed result.

## TBD (must be filled before expanding UX)

- Toolbelt button placement (implemented):
  - Host: in the Play host header (Session Cockpit), opens the Toolbelt sheet.
  - Participant: in the participant play header, opens the Toolbelt sheet.
- Copy/text (implemented): trigger label defaults to "🧰 Verktyg".
- Whether toolbelt should be openable during all session states (lobby/live/paused).
