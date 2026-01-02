# Tools / Toolbelt — Master Implementation (MVP)

## Metadata

- Owner: TBD
- Status: draft
- Last validated: 2026-01-02

## Scope (MVP)

This document covers the **Toolbelt** system: a set of **session tools** (utilities) available in Play.

**Explicit MVP constraints (from project direction):**

- Tools are **not** game content and must not add gamification logic.
- Tool runtime state is **client-only** (no server persistence of tool usage/results in MVP).
- First tool is **Dice Roller**.
- Dice Roller UX rule: **compute result first, animate after** (CSS-only; no canvas/physics).

If you have an external “master prompt/spec” for Toolbelt UX, it is not currently stored in this repo. Add it (or paste it into this doc) before we lock UI behaviors.

**UX spec:** see [docs/TOOLS_TOOLBELT_SPEC_V1.md](docs/TOOLS_TOOLBELT_SPEC_V1.md).

## Definitions

- **Tool**: A lightweight capability used during a session (e.g. dice roller). Tools may read **per-game tool configuration** and the current **role** (host/participant) to decide if they are available.
- **Toolbelt**: The UI surface that lists available tools for the current session and allows opening one tool at a time.
- **Artifact**: Game-authored content rendered by the Play runtime (puzzles, boards, etc). Tools must not be implemented as artifacts.

## Architecture (high-level)

- A **code-defined registry** provides the list of tools (no CRUD).
- The Play runtime reads **enabled tools** from the game definition and filters by **scope** (host/participant/both).
- Tool runtime state remains in the client, owned by the Tool component.

## Data model (per-game tool configuration)

MVP needs a persistent per-game configuration that answers:

- Which tools are enabled for this game?
- For each enabled tool: who can use it (host/participant/both)?

Tool config is persisted in a **new relational table**: `public.game_tools`.

MVP columns:

- `id` (uuid pk)
- `game_id` (uuid fk → `games.id`, on delete cascade)
- `tool_key` (text)
- `enabled` (boolean)
- `scope` (text enum: `host` | `participants` | `both`)
- `created_at`, `updated_at`

## Admin surfaces (MVP)

- **Tools Library page** (Admin): lists available code-defined tools and their scopes. No CRUD.
- **Game Editor integration** (Admin Game Builder): enable/disable tools per game and set scope per enabled tool.

## Play surfaces (MVP)

- Toolbelt is available in Play for both host and participants, filtered by configured scope.
- Toolbelt opens as:
  - Bottom sheet/drawer on mobile
  - Side drawer/panel on desktop

## Implemented tools

### Dice Roller (v1)

MVP behavior:

- User initiates a roll.
- Result is computed immediately (deterministic after click).
- UI plays a CSS-based animation and then reveals the precomputed result.

Non-goals:

- No canvas rendering.
- No physics engine.
- No persistence of roll history to server.

## Limitations

- No event logging or analytics for tool usage in MVP.
- No shared state sync between participants (client-only state).

## Next safe extensions (post-MVP)

- Optional server persistence for tool events (behind explicit product decision).
- Optional real-time sync (host broadcast) for specific tools.
- Additional tools added via registry (still code-defined).

## Implementation log

- 2026-01-02: Added `public.game_tools` migration + local `types/supabase.ts` typings.
- 2026-01-02: Added code-defined tool registry (`features/tools/*`) with Dice Roller v1 placeholder.
- 2026-01-02: Added Admin Tools Library page at `/admin/tools`.
- 2026-01-02: Added Game Builder "Verktyg (Toolbelt)" section; builder APIs now read/write `public.game_tools`.
- 2026-01-02: Added Play Toolbelt launcher (host + participant) using Sheet (desktop: right drawer, mobile: bottom sheet) backed by `/api/play/sessions/[id]/game` `tools`.
- 2026-01-02: Implemented Dice Roller v1 tool UI (compute-first, CSS-only animation; respects reduced motion via `getAnimationDuration()`) and wired it into Toolbelt.
