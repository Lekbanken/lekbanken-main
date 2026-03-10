# GameDetails Context Architecture

> **Datum:** 2026-03-10  
> **Version:** 2.0  
> **Förutsättning:** GAMEDETAILS_CONTEXT_AUDIT.md v2.0 (godkänd)  
> **Syfte:** Önskat stabilt målläge för kontexthantering — inte nuläge  
> **Status:** Målarkitektur — ej implementerad

---

## A. Scope and Assumptions

This document describes the **desired target state**, not the current state. Current state is documented in GAMEDETAILS_CONTEXT_AUDIT.md.

**Assumptions based on verified findings:**
- The display/runtime separation is correct and should be preserved (VERIFIED in audit: C4-C7 use separate components)
- Play domain's security model (dual-strip + Zod contracts) is exemplary and should be extended to display domain where applicable (VERIFIED: F2)
- Config-driven section visibility is the right architectural pattern — it needs expansion, not replacement (VERIFIED: F14)
- All `GameStep.leaderScript`, `GameStep.boardText`, `GameRole.privateNote`, `GameRole.secrets` reaching the browser in library context must be prevented (VERIFIED: F1, F3-F5)

**Assumptions NOT yet verified:**
- Director Preview should use a `facilitator` mode distinct from `preview` — this is a product decision, not a verified fact
- Trigger `condition`/`actions` should be hidden in preview — depends on product intent (OPEN QUESTION from audit F7)

---

## B. Principles

1. **Context decides information access** — The viewing context (library preview, director, host, participant, board) determines which fields may exist in the response. No context should receive fields it doesn't need.

2. **Display and runtime do not share components** — GameDetails sections are for game evaluation. Play components are for game execution. These have different UX patterns, different data shapes, and different trust boundaries. Do not try to unify them.

3. **Strip at the server boundary** — Sensitive fields must be removed before data crosses the server→client boundary. "Not rendered" is insufficient — any field in the client payload is exposed.

4. **Config over scattered conditionals** — Visibility decisions live in `config.ts` via `SECTION_VISIBILITY` and `getSectionConfig()`. Individual components should not make independent visibility decisions.

5. **Sandbox must verify context logic, not just rendering** — Sandbox should validate that the right data reaches the right context, not just that components render without errors.

6. **Contracts are explicit and enforced** — Type definitions are documentation. Runtime validation (Zod schemas) is enforcement. Both must exist for trust boundaries.

7. **Minimal blast radius** — Prefer config changes over component rewrites. Prefer additive changes over migrations. Prefer local fixes over system-wide harmonization.

---

## C. Target Context Model

### Recommended modes

| Mode | Belongs in GameDetails? | Rationale |
|------|------------------------|-----------|
| `preview` | **YES** | Library browsing — public game evaluation. Most restrictive visibility. |
| `admin` | **YES** | Game editing/management. Sees everything including admin actions. |
| `host` | **YES** | Active session hosting. Focused on gameplay-relevant sections. |
| `facilitator` | **YES (new)** | Director preview / pre-session prep. Same as preview + leaderTips + leaderScript indicator in steps. |
| `participant` | **NO** | Participants use Play domain components. Adding this would create a false abstraction. |
| `board` | **NO** | Board has its own UX (full-screen, audience-facing, real-time). Not a GameDetails context. |

### Why `facilitator` mode

Currently, Director Preview uses `mode="preview"` but loads full data via `mapDbGameToDetailFull()`. This is a semantic mismatch (F11). A `facilitator` mode would:
- Allow Director Preview to use the correct mode name
- Enable showing `leaderTips` in facilitator context while hiding them in preview
- Keep the config system as the single source of truth for visibility

### Why NOT `participant` mode

Participants never see GameDetails components. They use:
- Step rendering: `features/play/components/` (host and participant variants)
- Data source: `/api/play/sessions/[id]/game` with field stripping
- Contracts: `ParticipantGameStepSchema` (Zod)

Adding `participant` to `GameDetailMode` would create unused config entries and imply a relationship that doesn't exist.

---

## D. Section Visibility Matrix (Target)

| Section | `preview` | `facilitator` | `admin` | `host` | Rationale for differences |
|---------|----------|---------------|---------|--------|--------------------------|
| header | ✅ | ✅ | ✅ | ✅ | Always needed |
| badges | ✅ | ✅ | ✅ | ❌ | Host already knows the game |
| about | ✅ | ✅ | ✅ | ❌ | Host already knows the game |
| steps | ✅ | ✅ | ✅ | ✅ | Core content |
| materials | ✅ | ✅ | ✅ | ✅ | Reference during play |
| safety | ✅ | ✅ | ✅ | ✅ | Always important |
| preparation | ✅ | ✅ | ✅ | ❌ | Already prepared at game time |
| phases | ✅* | ✅* | ✅ | ✅ | *Hidden for basic playMode |
| gallery | ✅ | ✅ | ✅ | ❌ | Not needed during play |
| roles | ✅* | ✅* | ✅ | ✅ | *Hidden for basic/facilitated playMode |
| artifacts | ✅* | ✅* | ✅ | ✅ | *Hidden for basic/facilitated playMode |
| triggers | ✅* | ✅* | ✅ | ✅ | *Hidden for basic/facilitated playMode |
| quickFacts | ✅ | ✅ | ✅ | ❌ | Not needed during play |
| sidebar | ✅ | ✅ | ✅ | ❌ | Not needed during play |
| adminActions | ❌ | ❌ | ✅ | ❌ | Admin only |
| accessibility | ✅ | ✅ | ✅ | ✅ | Important for adaptations |
| requirements | ✅ | ✅ | ✅ | ❌ | Already set up |
| board | ✅* | ✅* | ✅ | ✅ | *Hidden for basic playMode |
| tools | ✅* | ✅* | ✅ | ✅ | *Hidden for basic playMode |
| **leaderTips** | **❌** | **✅** | ✅ | ✅ | **Key change: hidden in preview, visible in facilitator** |
| metadata | ✅ | ✅ | ✅ | ❌ | Not needed during play |
| outcomes | ✅ | ✅ | ✅ | ❌ | Not needed during play |

**Key change from current state:** `leaderTips` moves from `true` to `false` in preview mode, and `facilitator` mode inherits preview's matrix with `leaderTips: true`.

---

## E. Capabilities Matrix

Capabilities are separate from section visibility — they control what a context can **do** and what **data** it may access, not just what **sections** are shown.

| Capability | `preview` | `facilitator` | `admin` | `host` |
|-----------|----------|---------------|---------|--------|
| canSeeLeaderTips | ❌ | ✅ | ✅ | ✅ |
| canSeeLeaderScript | ❌ | ✅ | ✅ | ✅ |
| canSeePrivateRoleFields | ❌ | ✅ | ✅ | ✅ |
| canSeeTriggerInternals | ❌ | ✅ | ✅ | ✅ |
| canSeeNonPublicArtifacts | ❌ | ✅ | ✅ | ✅ |
| canStartSession | ✅ | ✅ | ✅ | ❌ |
| canEditGame | ❌ | ❌ | ✅ | ❌ |
| canFireTriggers | ❌ | ❌ | ❌ | ✅ |
| canAssignRoles | ❌ | ❌ | ❌ | ✅ |
| canRevealArtifacts | ❌ | ❌ | ❌ | ✅ |

**Relationship between capabilities and data flow:**
- `canSeeLeaderScript: false` → mapper/page must strip `leaderScript` from `steps[]` before serialization
- `canSeePrivateRoleFields: false` → Roles API must strip `privateNote`, `secrets`, `assignmentStrategy`
- `canSeeTriggerInternals: false` → Triggers API must strip `condition`, `actions` (if product decides these are sensitive)
- `canSeeNonPublicArtifacts: false` → Artifacts API must filter to `visibility === 'public'` only

---

## F. Trust Boundaries

### F.1: Library Preview Trust Boundary (preview mode)

```
Server boundary: mapDbGameToDetailPreview() + API routes
  │
  │  Fields that MUST be stripped before crossing:
  │  ├─ steps[].leaderScript
  │  ├─ steps[].boardText
  │  ├─ steps[].participantPrompt (OPEN QUESTION: strip or keep?)
  │  └─ game.leaderTips (config already gates rendering; prefer stripping from data too)
  │
  │  Lazy-loaded API responses that MUST be sanitized:
  │  ├─ /api/games/[id]/roles → strip privateNote, secrets, assignmentStrategy
  │  ├─ /api/games/[id]/artifacts → filter to visibility === 'public' only
  │  └─ /api/games/[id]/triggers → strip condition, actions (if decided sensitive)
  ↓
Client: receives only public-safe data
```

**Responsible code:**
- Mapper: `mapDbGameToDetailPreview()` in `lib/game-display/mappers.ts`
- Roles API: `app/api/games/[gameId]/roles/route.ts`
- Artifacts API: `app/api/games/[gameId]/artifacts/route.ts`
- Triggers API: `app/api/games/[gameId]/triggers/route.ts`

### F.2: Facilitator/Director Trust Boundary (facilitator mode)

```
Server boundary: mapDbGameToDetailFull()
  │
  │  Fields allowed to cross:
  │  ├─ All display fields
  │  ├─ leaderTips ✅
  │  ├─ steps[].leaderScript ✅ (facilitator needs this)
  │  └─ privateNote, secrets ✅ (facilitator is preparing to host)
  ↓
Client: receives full facilitator data
```

**Responsible code:**
- Mapper: `mapDbGameToDetailFull()` in `lib/game-display/mappers.ts`
- Director Preview page: `app/app/games/[gameId]/director-preview/`

### F.3: Play Participant Trust Boundary (exemplary — do not change)

```
Server boundary: /api/play/sessions/[id]/game route handler
  │
  │  Primary defense: destructuring removes leaderScript, boardText, phaseId
  │  Secondary defense: hard-strip loop removes FORBIDDEN_STEP_KEYS
  │  Contract defense: ParticipantGameStepSchema Zod validation
  ↓
Client: receives only participant-safe data
```

### F.4: Board Trust Boundary (exemplary — do not change)

```
Server boundary: /api/play/board/[code] route handler
  │
  │  Artifact filter: visibility === 'public' && revealed_at IS NOT NULL
  │  Decision filter: status === 'revealed'
  │  Outcome filter: revealed_at IS NOT NULL
  │  No game step content exposed (only current_step_title, current_step_board_text)
  ↓
Client: receives only public revealed data
```

---

## G. Component Family Strategy

### G.1: Display Components (GameDetails)

**Purpose:** Game evaluation in library, admin, and director contexts.  
**Data source:** `GameDetailData` type via `map*` functions.  
**Ownership:** `components/game/GameDetails/`  
**Trust model:** Server-side stripping before serialization. Config-driven section visibility.

| Component type | Examples | Sharing rule |
|---------------|----------|-------------|
| Pure display | Header, Badges, About, QuickFacts, Metadata, Outcomes | Context-neutral — safe anywhere |
| Content display | Steps, Phases, Materials, Safety, Preparation | Context-neutral when data is pre-stripped |
| Facilitator-specific | LeaderTips | Must be gated by mode — never in preview |
| Lazy-loaded | Roles, Artifacts, Triggers | API must sanitize per-context |

### G.2: Host/Director Runtime Components (Play domain)

**Purpose:** Active session management — step execution, participant control, timing.  
**Data source:** `StepInfo` type via `/api/play/sessions/[id]/game`.  
**Ownership:** `features/play/components/host/`  
**Trust model:** Host auth via Supabase RLS. Full facilitator data.

### G.3: Participant Runtime Components (Play domain)

**Purpose:** Participant interaction during active sessions.  
**Data source:** `ParticipantGameStep` type via `/api/play/sessions/[id]/game` with participant token.  
**Ownership:** `features/play/components/participant/` (minimal — a few files)  
**Trust model:** Token auth + dual-strip + Zod validation. No facilitator data.

### G.4: Board Components

**Purpose:** Public audience display during active sessions.  
**Data source:** Board API response via `/api/play/board/[code]`.  
**Ownership:** `app/board/[code]/`  
**Trust model:** No auth. Rate-limited. Only revealed public data.

### G.5: Shared Primitives

**Explicitly shared across families:**
- UI primitives from `components/ui/` (shadcn/ui) — buttons, cards, badges
- Formatting utilities from `lib/game-display/formatters.ts` — duration, age range, player count

**Explicitly NOT shared:**
- Step rendering between display and play — different UX (evaluation vs execution)
- Data types between display and play — different semantics (`body` vs `description`)
- API consumption patterns between display and play — different auth models

---

## H. Contract Strategy

### Contracts that remain separate (intentionally)

| Contract | Domain | Reason |
|----------|--------|--------|
| `GameStep` | Display | Describes game content for evaluation — includes all authored fields |
| `Step` | Play | Describes execution context — different field semantics |
| `StepInfo` | Play API | Server-to-client transport — includes role-based field filtering |
| `ParticipantGameStep` | Play contract | Zod-enforced trust boundary — explicit forbidden fields |
| Board step fields | Board | Minimal snapshot — only title + board_text at session level |

**Why not unify:** Each contract serves a different purpose with different trust requirements. A shared `BaseStep` would either be too permissive (including `leaderScript` that shouldn't flow to participants) or too restrictive (excluding `body` that display needs).

### Contracts that should be formalized

| Contract | Current state | Target |
|----------|--------------|--------|
| `BoardApiResponse` | Inline type in `BoardClient.tsx` | Extract to `lib/board/types.ts` |
| Roles API public shape | No explicit type | Define `PublicGameRole` type excluding private fields |
| Artifacts API preview shape | No explicit type | Define response type that only includes public variants |

### Contract enforcement pattern (target)

```
DB query (SELECT *) → Mapper (strips by context) → API route (validates) → Client (Zod if applicable)
```

Each boundary should have:
1. **Stripping** — mapper or route handler removes unauthorized fields
2. **Typing** — response type explicitly defines allowed fields
3. **Validation** — Zod schema (for trust boundaries like participant) or contract test (for display boundaries)

---

## I. Drift Prevention Strategy

### I.1: Config visibility drift

**Current guardrail:** None — `SECTION_VISIBILITY` has no tests (F12).

**Target:** Unit tests for `getSectionConfig()` asserting:
- `preview` mode: `leaderTips === false` (after fix)
- `facilitator` mode: `leaderTips === true`
- Each playMode filter produces expected section set
- Adding a new section to `SectionVisibility` type forces adding it to all mode configs (TypeScript completeness check via `satisfies`)

### I.2: Contract drift

**Current guardrail:** Zod schemas exist for participant contracts (F2) but no contract tests in CI (F12).

**Target:**
- Contract test: `mapDbGameToDetailPreview()` output matches `GameDetailData` schema — excludes host-only fields when used in preview
- Contract test: Roles API response for non-admin matches `PublicGameRole` (no `privateNote`, `secrets`)
- Contract test: Play API participant response passes `ParticipantGameStepSchema` validation
- All tests run in CI

### I.3: UX behavior drift

**Current guardrail:** Sandbox with mode toggle and section overrides (F14).

**Target:** Extend sandbox with:
- Cross-context comparison (same game, different modes, side-by-side)
- API response preview (show what lazy-loaded APIs would return per context)
- Sensitive field indicators (highlight fields that differ between modes)

### I.4: Sandbox coverage drift

**Current guardrail:** Sandbox tests 3 modes × 3 playModes.

**Target:** When `facilitator` mode is added:
- Sandbox mode toggle must include it
- Mock data must demonstrate leaderTips visibility difference
- Diff view must show preview→facilitator section changes

---

## J. Explicit "Do Not Do" List

These are tempting but wrong refactors. Each is justified by the audit findings.

| # | Tempting refactor | Why it's wrong | Audit reference |
|---|-------------------|---------------|-----------------|
| 1 | Create a shared `BaseStep` type for `GameStep` and `Step` | `body` vs `description` is semantic, not drift. Display describes content; play describes execution. Shared base would force both domains to use the same word for different concepts. | G.1 divergence assessment |
| 2 | Add `participant` mode to `GameDetailMode` | Participants never use GameDetails components. They use Play domain with its own types, components, and security model. Adding `participant` mode creates dead config and false architectural relationship. | C6, J.3 from audit |
| 3 | Make Play host components consume `GameDetailData` | Play host needs `StepInfo` (with execution context, media objects, server-stripped fields). `GameDetailData` has different structure (`body` vs `description`, `mediaRef` vs structured media). Forcing one to use the other would require constant translation. | G.1, G.2 contract comparison |
| 4 | Create a universal game data API | Each context needs different fields at different trust levels. A single API would either over-expose (sending `leaderScript` where not needed) or require complex per-caller filtering that already exists in separate routes. | D1-D5 data flow maps |
| 5 | Merge `mapDbGameToDetailPreview` and `mapDbGameToDetailFull` into one mapper with options | They serve fundamentally different trust contexts. A merged mapper with "include private fields" option would be an error-prone abstraction where the default behavior matters enormously. Two separate functions make the trust boundary explicit. | F11, F.1/F.2 trust boundaries |
| 6 | Rewrite board components to use GameDetails | Board is full-screen, audience-facing, real-time, no-auth. GameDetails is form-factor, authenticated, static. They share no UX patterns, no data flow, no trust model. | C7, D5, F.4 |
| 7 | Add all `GameRole` fields to preview API response "for future use" | Every field that reaches the client is an exposure surface. Fields should be added when needed, not preemptively. | F5, F.1 trust boundary |
