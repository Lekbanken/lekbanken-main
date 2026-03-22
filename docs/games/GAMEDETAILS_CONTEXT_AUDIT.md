# GameDetails Context Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-10
- Last updated: 2026-03-21
- Last validated: 2026-03-10

> Closed audit snapshot for GameDetails context exposure and sanitization work. Use it as verified historical reality at the audit point, not as a live status doc without revalidation.

**Version:** 2.0 (evidence-driven rewrite)  
**Scope:** All contexts consuming game data — display, play, board, sandbox  
**Method:** Code inspection with exact file/line references  
**Execution status:** ✅ **STÄNGD (2026-03-10)** — All identified preview-context exposures fixed  
**Canonical entrypoint:** `docs/games/README.md`  
**Fixade findings:** F1, F3, F4, F5 (Block 1), F8/F8b (Block 3), F7 (Option B) — F12 partially addressed

---

## A. Executive Summary

The GameDetails display system is well-structured with config-driven section visibility. The Play domain correctly maintains separate runtime components. The **three critical information exposure issues** (F1, F3, F5) that existed in the library/preview context were **fixed in Block 1 (2026-03-10)**. **Artifacts API exposure** (F8, F8b) was **fixed in Block 3 (2026-03-10)**. **Triggers API** content exposure (F7) was **fixed with Option B sanitization (2026-03-10)** — trigger structure visible, content strings stripped. **All identified preview-context exposures are now resolved.**

**Top verified problems:**
1. ~~`leaderTips` rendered in preview mode~~ ✅ **FIXED** — config set to `false`, data stripped in page.tsx
2. ~~`steps[].leaderScript` serialized to client via RSC payload~~ ✅ **FIXED** — derived object strips field
3. ~~Roles API returns `privateNote`, `secrets`, `assignmentStrategy` in JSON response~~ ✅ **FIXED** — fields removed from route extraction

**~~Remaining verified problems:~~** ✅ ALL RESOLVED
4. ~~Triggers API returns `condition` and `actions` (F7 — DEFERRED, awaiting product decision)~~ ✅ **FIXED (2026-03-10)** — Option B: structure visible, content strings stripped
5. ~~Artifacts API returns all variants including non-public (F8 — planned for Block 3)~~ ✅ **FIXED (2026-03-10)**

**~~Top open questions:~~** ✅ ALL RESOLVED
1. ~~Whether trigger `condition`/`actions` exposure is a security concern or acceptable design content~~ ✅ **RESOLVED (2026-03-10)** — Product decision: Option B (show structure, strip content). Content strings (`message`, `customScript`, `reason`, `label`) and `outcome` in `decision_resolved` conditions stripped at route boundary.
2. ~~Whether artifact variant `visibility` field exposure (including non-public variants) is intentional~~ ✅ **RESOLVED** — non-public variants now filtered

**Highest-risk issues:** ~~F1, F3, F5~~ ✅ **ALL FIXED (2026-03-10)** — ~~F8~~ ✅ **FIXED (2026-03-10)** — ~~F7~~ ✅ **FIXED (2026-03-10, Option B)** — **no remaining preview-context exposures**

---

## B. Evidence Ledger

| Finding ID | Status | Summary | Evidence | Files |
|-----------|--------|---------|----------|-------|
| **F1** | **~~VERIFIED~~ ✅ FIXED (2026-03-10)** | `leaderTips` ~~visible~~ hidden in preview mode | `SECTION_VISIBILITY.preview.leaderTips = false` (line 91); derived object in page.tsx strips `leaderTips: undefined` | config.ts:91, app/app/games/[gameId]/page.tsx |
| **F2** | **VERIFIED** | Play API correctly strips `leaderScript`, `boardText`, `leaderTips` for participants | Destructuring strip (line ~240); secondary hard-strip tripwire loop with `FORBIDDEN_STEP_KEYS` (line ~260); Zod schema `ParticipantGameStepSchema` explicitly forbids these fields (line 48) | app/api/play/sessions/[id]/game/route.ts, participantCockpit.schema.ts:48 |
| **F3** | **~~VERIFIED~~ ✅ FIXED (2026-03-10)** | `steps[].leaderScript` ~~serialized to client~~ stripped before RSC serialization | page.tsx creates derived object: `steps.map(({ leaderScript, boardText, participantPrompt, ...publicStep }) => publicStep)` | app/app/games/[gameId]/page.tsx |
| **F4** | **~~VERIFIED~~ ✅ FIXED (2026-03-10)** | `steps[].boardText` ~~serialized to client~~ stripped (same fix as F3) | Same derived object in page.tsx strips `boardText` | app/app/games/[gameId]/page.tsx |
| **F5** | **~~VERIFIED~~ ✅ FIXED (2026-03-10)** | Roles API ~~returns~~ no longer returns `privateNote`, `secrets`, `assignmentStrategy` | Route extraction removed `private_instructions`, `private_hints`, `assignment_strategy` fields | app/api/games/[gameId]/roles/route.ts |
| **F6** | **VERIFIED** | Roles API does NOT return `scalingRules` or `conflictsWith` | Route extraction omits these fields; mapper receives `undefined` | app/api/games/[gameId]/roles/route.ts |
| **F7** | **~~VERIFIED~~ ✅ FIXED (2026-03-10, Option B)** | Triggers API ~~returns `condition` and `actions` unfiltered~~ now strips content strings from actions (`message`, `customScript`, `reason`, `label`) and `outcome` from `decision_resolved` conditions. Trigger structure (types, IDs, numbers) remains visible for design inspection. | Route-level sanitization before `mapTriggers()`. Shared mapper unchanged. | app/api/games/[gameId]/triggers/route.ts |
| **F8** | **~~VERIFIED~~ ✅ FIXED (2026-03-10)** | Artifacts API ~~returns all variants including non-public ones~~ now filters to public-only variants and strips `metadata.correctCode` | Route-level filter: `variants.filter(v => v.visibility === 'public')` + destructure strip of `correctCode` from metadata. Shared mapper and service unchanged. | app/api/games/[gameId]/artifacts/route.ts |
| **F8b** | **✅ FIXED (2026-03-10)** | `metadata.correctCode` (keypad answer) was exposed to all authenticated users via Artifacts API | Discovered during Block 3 research. `correctCode` stored in `game_artifacts.metadata` JSONB at parent level. Play session route already strips via `sanitizeMetadataForParticipant()` whitelist. Fixed in same route-boundary fix as F8. | app/api/games/[gameId]/artifacts/route.ts |
| **F9** | **VERIFIED** | Board API correctly filters: only public + revealed variants, only revealed decisions/outcomes | Visibility filter: `visibility === 'public' && state?.revealed_at`; decisions: `status === 'revealed'`; outcomes: `revealed_at IS NOT NULL` | app/api/play/board/[code]/route.ts |
| **F10** | **VERIFIED** | `GameDetailContext` / `GameDetailProvider` defined but never used — all components receive data via prop drilling | Zero usages of `GameDetailProvider` outside its definition file and barrel export | GameDetailContext.tsx, index.ts |
| **F11** | **RECLASSIFIED (2026-03-10)** | ~~Director Preview uses wrong GameDetailMode~~ → Director Preview does NOT use `GameDetailMode` at all. The `mode="preview"` at director-preview-client.tsx:57 refers to `DirectorModeDrawer`'s own Play domain type (`'session' \| 'preview'`), which is unrelated to `GameDetailMode`. Director Preview imports zero GameDetails components, never calls `getSectionConfig()`, and shows full data via `getGameByIdFull()` → Cockpit type mapping. **This is a naming/documentation concern in the Play domain, not a GameDetails config issue.** | director-preview-client.tsx:57, features/play/components/DirectorModeDrawer.tsx |
| **F12** | **~~VERIFIED~~ ✅ PARTIALLY FIXED (2026-03-10)** | Tests now exist for `getSectionConfig` and roles contract | 12 tests added: `tests/unit/game-details/config-visibility.test.ts` (9), `tests/unit/game-details/roles-contract.test.ts` (3); `tests/game-display/config.test.ts` updated (2 assertions) | tests/unit/game-details/, tests/game-display/config.test.ts |
| **F13** | **VERIFIED** | No `mapDbGameToDetailPublic` function exists — only `mapDbGameToDetail`, `mapDbGameToDetailPreview`, `mapDbGameToDetailFull` | Searched codebase for "mapDbGameToDetailPublic" — 0 results; checked barrel export in index.ts | lib/game-display/mappers.ts, lib/game-display/index.ts |
| **F14** | **VERIFIED** | Sandbox tests 3 modes (preview/admin/host) × 3 playModes with comprehensive mock data including leaderScript, leaderTips, boardText | Mock data in `mock-games.ts`; mode toggle at line 530; playMode toggle at line 502 | app/sandbox/app/game-detail/page.tsx, app/sandbox/app/game-detail/mock-games.ts |
| **F15** | **LIKELY** | Sandbox does not test facilitator mode because it does not exist in config | `GameDetailMode = 'preview' | 'admin' | 'host'` — no facilitator; sandbox offers only these 3 as toggle options | config.ts, components/game/GameDetails/types.ts |
| **F16** | **VERIFIED** | `GameDetailSteps` component does NOT render `leaderScript` — only `title`, `body`, `durationMinutes`, `displayMode`, `optional` | Component code renders only public step data | GameDetailSteps.tsx |
| **F17** | **VERIFIED** | `GameDetailRoles` component does NOT render `privateNote` or `secrets` — only `name`, `icon`, `color`, `publicNote`, `minCount/maxCount` | Component code renders only public fields | GameDetailRoles.tsx |
| **F18** | **VERIFIED** | Supabase query `getGameByIdPreview` fetches `game_steps(*)` which includes all columns including `leader_script`, `board_text` | Query uses `steps:game_steps(*)` — wildcard select | lib/services/games.server.ts:270-290 |
| **F19** | **VERIFIED** | Supabase query `getGameRoles` fetches `game_roles` with `select('*')` — all columns | Wildcard select returning all fields including `private_instructions`, `private_hints` | lib/services/games.server.ts:403-415 |

---

## C. Context Inventory

### C1: Library Browse

| Attribute | Value |
|-----------|-------|
| **Primary role** | Any authenticated user |
| **User goal** | Discover and explore games |
| **Expected info** | Title, cover, badges, duration, player count, purpose |
| **Implementation** | `GameCard` components consuming `GameSummary` type |
| **Data source** | `mapDbGameToSummary()` or `mapSearchResultToSummary()` |
| **GameDetails involved?** | No — uses card components only |
| **Sensitive field risk** | None — `GameSummary` contains only public metadata |
| **Status** | **VERIFIED** — no issues |

### C2: Library Game Detail (Preview)

| Attribute | Value |
|-----------|-------|
| **Primary role** | Any authenticated user |
| **User goal** | Evaluate a game before using it |
| **Expected info** | Description, steps, materials, safety, outcomes — NOT facilitator instructions |
| **Implementation** | Server Component at `app/app/games/[gameId]/page.tsx`, mode `'preview'` |
| **Data source** | `getGameByIdPreview()` → `mapDbGameToDetailPreview()` |
| **GameDetails involved?** | Yes — all 21+ section components, visibility controlled by `getSectionConfig('preview', playMode)` |
| **Sensitive field risk** | ~~**HIGH**~~ **NONE** — F1/F3/F4/F5/F7/F8/F8b all fixed |
| **Status** | **All findings fixed (2026-03-10)** |

**Detailed exposure analysis for C2:**
- ~~**F1**: `leaderTips` rendered in UI~~ ✅ **FIXED** — config `false` + data stripped
- ~~**F3/F4**: `leaderScript`, `boardText` in serialized RSC payload~~ ✅ **FIXED** — derived object strips fields
- ~~**F5**: `privateNote`, `secrets`, `assignmentStrategy` in Roles API JSON~~ ✅ **FIXED** — removed from route extraction
- ~~**F7**: Trigger `condition`/`actions` in Triggers API JSON (rendered as formatted code blocks) — DEFERRED~~ ✅ **FIXED (2026-03-10, Option B)** — content strings stripped, structure preserved
- ~~**F8**: All artifact variants including non-public in Artifacts API JSON — planned Block 3~~ ✅ **FIXED (2026-03-10)** — route filters to public variants + strips `correctCode`

### C3: Director Preview

| Attribute | Value |
|-----------|-------|
| **Primary role** | Game creator/facilitator previewing before running a live session |
| **User goal** | Test and preview the full game experience, including facilitator content |
| **Expected info** | Everything — including leaderTips, roles, artifacts, triggers |
| **Implementation** | `app/app/games/[gameId]/director-preview/page.tsx` → `director-preview-client.tsx` |
| **Data source** | `getGameByIdFull()` → `mapDbGameToDetailFull()` |
| **GameDetails involved?** | **No** — Director Preview uses `DirectorModeDrawer` from the Play domain, NOT GameDetail* section components. It maps game data to Cockpit types. |
| **Sensitive field risk** | **NONE** — director is meant to see everything; full data is loaded via `getGameByIdFull()` and displayed via Play domain components |
| **Status** | **VERIFIED** — functionally correct. ~~F11 mode mismatch~~ reclassified: the `mode="preview"` refers to DirectorModeDrawer's own type (`'session' \| 'preview'`), not GameDetailMode. |

### C4: Host Session Cockpit

| Attribute | Value |
|-----------|-------|
| **Primary role** | Session host running a live game |
| **User goal** | Manage the session — control steps, see leaderScript, manage participants |
| **Expected info** | Full game content including leaderScript, boardText, leaderTips |
| **Implementation** | Play domain components in `features/play/components/` |
| **Data source** | Play session API: `/api/play/sessions/[id]/game` with host auth |
| **GameDetails involved?** | **No** — completely separate component set |
| **Sensitive field risk** | None — host is authorized for all fields |
| **Status** | **VERIFIED** — correct separation |

### C5: Host Play Mode

| Attribute | Value |
|-----------|-------|
| **Primary role** | Host running steps during a live session |
| **User goal** | Execute steps with timer, leaderScript visible, control progression |
| **Expected info** | Full step content + facilitator fields |
| **Implementation** | `features/play/components/host/` |
| **Data source** | Same as C4 — `/api/play/sessions/[id]/game` |
| **GameDetails involved?** | **No** |
| **Sensitive field risk** | None |
| **Status** | **VERIFIED** |

### C6: Participant Play

| Attribute | Value |
|-----------|-------|
| **Primary role** | Game participant (no Supabase account) |
| **User goal** | Participate in game — see prompts, interact, vote |
| **Expected info** | Public step instructions, participant prompts — NOT leader content |
| **Implementation** | Participant app at `/participants/` |
| **Data source** | `/api/play/sessions/[id]/game` with `x-participant-token` header |
| **GameDetails involved?** | **No** |
| **Sensitive field risk** | None — dual-strip + Zod contract validation (F2) |
| **Status** | **VERIFIED** — exemplary security implementation |

### C7: Public Board

| Attribute | Value |
|-----------|-------|
| **Primary role** | Public display (no auth required) |
| **User goal** | Show current game state to audience |
| **Expected info** | Current step title, board text, revealed artifacts, revealed decisions, timer |
| **Implementation** | Board app at `/board/[code]/` |
| **Data source** | `/api/play/board/[code]` — public, rate-limited |
| **GameDetails involved?** | **No** |
| **Sensitive field risk** | None — correctly filters by visibility + reveal state (F9) |
| **Status** | **VERIFIED** — correct security |

### C8: Planner Play (Run)

| Attribute | Value |
|-----------|-------|
| **Primary role** | Facilitator running a plan (sequence of games) |
| **User goal** | Execute a planned sequence of activities with timing |
| **Expected info** | Aggregated step data from multiple games |
| **Implementation** | `features/play/` with `Run`/`RunStep` types |
| **Data source** | Server-generated steps from plan version blocks |
| **GameDetails involved?** | **No** |
| **Sensitive field risk** | **ASSUMPTION** — not fully traced; `RunStep` extends `Step` which has `description` but not `leaderScript` |
| **Status** | LIKELY correct — requires verification of run step generation server-side |

### C9: Admin/Builder

| Attribute | Value |
|-----------|-------|
| **Primary role** | System admin |
| **User goal** | Create and edit games |
| **Expected info** | All fields — full write access |
| **Implementation** | `/admin/games/builder` |
| **Data source** | Direct Supabase queries with admin context |
| **GameDetails involved?** | **No** — uses form-based editing, not GameDetails display components |
| **Sensitive field risk** | None — admin has full access |
| **Status** | **VERIFIED** |

### C10: Sandbox

| Attribute | Value |
|-----------|-------|
| **Primary role** | Developer/QA |
| **User goal** | Verify GameDetails rendering across modes and playModes |
| **Expected info** | All fields with visibility comparison |
| **Implementation** | `app/sandbox/app/game-detail/page.tsx` |
| **Data source** | Static mock data in `app/sandbox/app/game-detail/mock-games.ts` |
| **GameDetails involved?** | Yes — primary verification tool |
| **Sensitive field risk** | N/A — developer tool |
| **Status** | **VERIFIED** — comprehensive for existing 3 modes; does not test `facilitator` mode (F15) |

---

## D. Data Flow Map

### D1: Library Preview Data Flow

```
DB: games + game_steps(*) + game_materials + game_phases + game_media + game_board_config + game_tools
  │ getGameByIdPreview() — SELECT * on all joined tables [games.server.ts:270]
  ↓
mapDbGameToDetailPreview() [mappers.ts:780]
  │ mapSteps() includes: leaderScript, boardText, participantPrompt [mappers.ts:551-553]
  │ Maps: leaderTips from games.leader_tips [mappers.ts:826]
  │ (mapper still produces full data — stripping happens in page.tsx)
  ↓
page.tsx (Server Component) [app/app/games/[gameId]/page.tsx]
  │ const fullGame = mapDbGameToDetailPreview(...)
  │ ✅ SECURITY STRIP (Block 1, 2026-03-10):
  │   const game = { ...fullGame, leaderTips: undefined,
  │     steps: fullGame.steps?.map(({ leaderScript, boardText, participantPrompt, ...pub }) => pub) }
  │ getSectionConfig('preview', playMode) — config.leaderTips = false ✅ (was true before Block 1)
  │ Passes stripped `game` object as prop to client components
  ↓
Client Components:
  ├─ GameDetailLeaderTips → NOT rendered (config.leaderTips = false) ← F1: ✅ FIXED (2026-03-10)
  ├─ GameDetailSteps → renders title/body only; leaderScript/boardText stripped from payload ← F3/F4: ✅ FIXED (2026-03-10)
  ├─ GameDetailRoles → fetches /api/games/[id]/roles → privateNote/secrets/assignmentStrategy removed ← F5: ✅ FIXED (2026-03-10)
  ├─ GameDetailArtifacts → fetches /api/games/[id]/artifacts → JSON includes only public variants ← F8: ✅ FIXED
  └─ GameDetailTriggers → fetches /api/games/[id]/triggers → JSON includes structure (types, IDs), content strings stripped ← F7: ✅ FIXED (Option B)
```

### D2: Director Preview Data Flow

```
DB: Same as D1 + game_roles + game_artifacts + game_artifact_variants + game_triggers
  │ getGameByIdFull() — full relations loaded
  ↓
mapDbGameToDetailFull() [mappers.ts]
  │ Calls mapDbGameToDetailPreview() then appends roles, artifacts, triggers
  │ All fields included (correct for director context)
  ↓
director-preview-client.tsx
  │ <DirectorModeDrawer mode="preview"> — Play domain type ('session'|'preview'), NOT GameDetailMode
  │ Full data available — correct for director
  │ No GameDetails section components used, no getSectionConfig() called
```

### D3: Play Session Data Flow (Host)

```
DB: participant_sessions + games + game_steps + game_phases + game_tools + game_board_config
  │ Service role client (bypasses RLS)
  ↓
/api/play/sessions/[id]/game (host auth)
  │ StepInfo type with ALL fields: leaderScript, boardText, phaseId, leaderTips
  │ No field stripping for host
  ↓
Host components (features/play/components/host/)
  │ Renders full content including leaderScript — correct
```

### D4: Play Session Data Flow (Participant)

```
DB: Same as D3
  ↓
/api/play/sessions/[id]/game (participant token auth)
  │ Primary strip: destructuring removes leaderScript, boardText, phaseId [route.ts:~240]
  │ Secondary strip: hard-loop removes FORBIDDEN_STEP_KEYS [route.ts:~260]
  │ Safety response: leaderTips intentionally omitted
  ↓
Participant components
  │ Zod schema ParticipantGameStepSchema validates no forbidden fields
  │ Correct — exemplary security
```

### D5: Board Data Flow (Public)

```
DB: participant_sessions + games + game_board_config + session_artifacts + game_artifact_variants + session_decisions + session_outcomes
  │ Service role client; rate-limited; NO auth required
  ↓
/api/play/board/[code]
  │ Session: id, code, status, current_step_index, current_step_title, current_step_board_text, timer_state, board_state
  │ Game: id, title, board_config
  │ Artifacts: ONLY public + revealed variants
  │ Decisions: ONLY revealed decisions with vote counts
  │ Outcomes: ONLY revealed outcomes
  │ Correct — public-safe filtering
```

---

## E. Component Audit

### Classification Legend
- **Context-neutral** — Safe in all contexts, no sensitive data
- **Context-sensitive (correct)** — Handles sensitive data appropriately for its intended context
- **Context-sensitive (INCORRECT)** — Shows or serializes data it shouldn't in its current context
- **Context-exclusive** — Only makes sense in specific context(s)

| # | Component | Classification | Consumes | Sensitive fields in data? | Sensitive fields rendered? | Notes |
|---|-----------|---------------|----------|--------------------------|---------------------------|-------|
| 1 | `GameDetailHeader` | Context-neutral | title, subtitle, coverUrl | None | None | |
| 2 | `GameDetailBadges` | Context-neutral | energyLevel, purpose, product, age, players, duration | None | None | |
| 3 | `GameDetailAbout` | Context-neutral | description, shortDescription, highlights | None | None | |
| 4 | `GameDetailSteps` | **Context-sensitive (correct)** | game.steps (GameStep[]) | ~~`leaderScript`, `boardText` in prop~~ → stripped in page.tsx (Block 1) | **Not rendered, not in payload** | ~~F3/F4~~ ✅ FIXED (2026-03-10) |
| 5 | `GameDetailMaterials` | Context-neutral | materials (label, quantity, detail) | None | None | |
| 6 | `GameDetailSafety` | Context-neutral | safety (string[]) | None | None | |
| 7 | `GameDetailPreparation` | Context-neutral | preparation (string[]) | None | None | |
| 8 | `GameDetailPhases` | Context-neutral | phases (GamePhase[]) | None | None | |
| 9 | `GameDetailGallery` | Context-neutral | gallery URLs | None | None | |
| 10 | `GameDetailRoles` | **Context-sensitive (correct)** | Lazy API response | ~~`privateNote`, `secrets`, `assignmentStrategy` in JSON~~ → removed from route extraction (Block 1) | **Not rendered, not in response** | ~~F5~~ ✅ FIXED (2026-03-10) |
| 11 | `GameDetailArtifacts` | **Context-sensitive (CORRECT)** | Lazy API response | Non-public variants filtered; `correctCode` stripped | ✅ **Verified safe (2026-03-10)** | ~~F8~~ Fixed |
| 12 | `GameDetailTriggers` | **Context-sensitive (CORRECT)** | Lazy API response | Content strings stripped; structure visible | ✅ **Verified safe (2026-03-10, Option B)** | ~~F7~~ Fixed |
| 13 | `GameDetailQuickFacts` | Context-neutral | player count, duration, age, energyLevel | None | None | |
| 14 | `GameDetailLeaderTips` | **Context-sensitive (correct)** | game.leaderTips (string[]) | ~~All tips~~ → `leaderTips: undefined` in page.tsx + `config.leaderTips = false` (Block 1) | **Not rendered in preview** (still renders in host/admin) | ~~F1~~ ✅ FIXED (2026-03-10) |
| 15 | `GameDetailAccessibility` | Context-neutral | accessibility (string[]) | None | None | |
| 16 | `GameDetailRequirements` | Context-neutral | requirements (string[]) | None | None | |
| 17 | `GameDetailBoard` | Context-neutral | boardWidgets (title, detail labels) | None | None | |
| 18 | `GameDetailTools` | Context-neutral | facilitatorTools (string names) | None | None | |
| 19 | `GameDetailOutcomes` | Context-neutral | outcomes (string[]) | None | None | |
| 20 | `GameDetailMetadata` | Context-neutral | meta (gameKey, createdAt, updatedAt) | None | None | |
| 21 | `GameDetailSidebar` | Context-neutral | status, createdAt, isAdmin check | Admin edit link gated by `isAdmin` | None | |
| 22 | `GameDetailRelated` | Context-neutral | Related game summaries | None | None | Always rendered (no config guard) |
| 23 | `GameDetailActions` | Context-neutral | gameId, gameName | None | None | |

---

## F. Security / Trust Boundary Audit

**Rule: "Not rendered" ≠ "Not exposed".** If a field reaches the client (via RSC payload, API JSON, or HTML), it is accessible via browser DevTools.

### F.1: `leaderTips` (games.leader_tips)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — `leaderTips: undefined` in derived object (Block 1) + `config.leaderTips = false` | **No** | ✅ **FIXED (2026-03-10)** — was FULL EXPOSURE before Block 1 | ~~**F1**~~ |
| Director Preview (C3) | YES — RSC | YES | Correct (director should see) | |
| Play Host (C4) | YES — API | YES | Correct | |
| Play Participant (C6) | **NO** — stripped + Zod | No | Correct | **F2** |
| Board (C7) | **NO** — not in board API | No | Correct | **F9** |

### F.2: `leaderScript` (game_steps.leader_script)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — stripped via destructuring in page.tsx (Block 1) | No | ✅ **FIXED (2026-03-10)** — was PAYLOAD EXPOSURE before Block 1 | ~~**F3**~~ |
| Director Preview (C3) | YES | Presumed YES (Play domain components) | Correct — director is authorized | |
| Play Host (C4) | YES — API | YES | Correct | |
| Play Participant (C6) | **NO** — dual-strip | No | Correct | **F2** |
| Board (C7) | **NO** | No | Correct | |

### F.3: `boardText` (game_steps.board_text)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — stripped via destructuring in page.tsx (Block 1) | No | ✅ **FIXED (2026-03-10)** — was PAYLOAD EXPOSURE before Block 1 | ~~**F4**~~ |
| Board (C7) | YES — as `current_step_board_text` | YES | Correct | |
| Play Participant (C6) | **NO** — stripped | No | Correct | |

### F.4: `privateNote` / `private_instructions` (game_roles)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — removed from route extraction (Block 1) | No | ✅ **FIXED (2026-03-10)** — was API RESPONSE EXPOSURE before Block 1 | ~~**F5**~~ |
| Play Participant (C6) | **ASSUMPTION** — not verified for play-domain roles | | Needs verification | |

### F.5: `secrets` / `private_hints` (game_roles)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — removed from route extraction (Block 1) | No | ✅ **FIXED (2026-03-10)** — was API RESPONSE EXPOSURE before Block 1 | ~~**F5**~~ |

### F.6: `assignmentStrategy` (game_roles)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **NO** — removed from route extraction (Block 1) | No | ✅ **FIXED (2026-03-10)** — was API RESPONSE EXPOSURE before Block 1 | ~~**F5**~~ |

### F.7: `scalingRules` / `conflictsWith` (game_roles)

| Context | Reaches client? | Finding |
|---------|----------------|---------|
| Library Preview (C2) | **NO** — omitted at route extraction layer | **F6** — correctly excluded |

### F.8: Trigger `condition` / `actions` (game_triggers)

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | **YES** — Triggers API JSON (sanitized) | **YES** — but content strings stripped | ~~**FULL EXPOSURE**~~ **STRUCTURE ONLY (Option B)** | ~~**F7**~~ ✅ Fixed |

### F.9: Artifact non-public variants

| Context | Reaches client? | Rendered? | Exposure level | Finding |
|---------|----------------|-----------|---------------|---------|
| Library Preview (C2) | ~~YES~~ **NO** — Artifacts API now filters to public variants only | ✅ **FIXED** | ~~API RESPONSE EXPOSURE~~ **RESOLVED** | ~~F8~~ Fixed |
| Board (C7) | **NO** — correctly filtered | Only revealed public | Correct | **F9** |

---

## G. Contract Fragmentation Audit

### G.1: Step-level contracts — field-by-field comparison

| Field | `GameStep` (display) | `Step` (play) | `StepInfo` (play API) | `ParticipantGameStep` (Zod) | Board API |
|-------|---------------------|---------------|----------------------|----------------------------|-----------|
| id | optional | required | required | required | N/A |
| index | ❌ | ❌ | optional | optional | `current_step_index` |
| title | required | required | required | required | `current_step_title` |
| **body** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **description** | ❌ | ✅ | ✅ | ✅ | ❌ |
| **content** | ❌ | ❌ | ✅ | ✅ | ❌ |
| leaderScript | optional | ❌ | optional | **FORBIDDEN** | ❌ |
| boardText | optional | ❌ | optional | **FORBIDDEN** | `current_step_board_text` |
| participantPrompt | optional | ❌ | optional | ❌ | ❌ |
| displayMode | optional | ❌ | `display_mode` | `display_mode` | ❌ |
| durationMinutes | optional | optional | optional | optional | ❌ |
| durationSeconds | optional | ❌ | ❌ | ❌ | ❌ |
| duration (number) | ❌ | ❌ | nullable | nullable | ❌ |
| materials | ❌ | string[] | string[] | string[] | ❌ |
| safety | ❌ | string | string | string | ❌ |
| tag | ❌ | optional | optional | optional | ❌ |
| note | ❌ | optional | optional | optional | ❌ |
| media | `mediaRef` (string) | ❌ | `{type,url,altText?}` | `{type,url,altText?}` | ❌ |
| phaseId | optional | ❌ | optional | ❌ | ❌ |
| conditional | optional | ❌ | ❌ | ❌ | ❌ |
| optional | optional | ❌ | ❌ | ❌ | ❌ |

**Divergence assessment:**
- **`body` vs `description` vs `content`** — **INTENTIONAL**. Display uses `body` (game authoring). Play uses `description` (execution label). API also provides `content` as alternative. These represent genuinely different contexts.
- **Duration formats** — **INTENTIONAL**. Display needs human-readable. Play needs computed minutes. API uses seconds precision.
- **`leaderScript`/`boardText` absence in `Step`** — **INTENTIONAL and correct**. Play `Step` represents participant-safe sanitized data.

### G.2: Role-level contracts

| Field | `GameRole` (display type) | Roles API response (actual) | Play participant Zod | Notes |
|-------|--------------------------|---------------------------|---------------------|-------|
| name | required | ✅ | required | |
| icon | optional | ✅ | optional | |
| color | optional | ✅ | optional | |
| publicNote | optional | ✅ | `public_description` | |
| privateNote | optional | ~~✅ INCLUDED~~ → **❌ REMOVED** (Block 1, 2026-03-10) | `private_instructions` | ~~F5~~ ✅ FIXED |
| secrets | optional (string[]) | ~~✅ INCLUDED~~ → **❌ REMOVED** (Block 1, 2026-03-10) | `private_hints` | ~~F5~~ ✅ FIXED |
| assignmentStrategy | optional | ~~✅ INCLUDED~~ → **❌ REMOVED** (Block 1, 2026-03-10) | **FORBIDDEN** | ~~F5~~ ✅ FIXED |
| scalingRules | optional | ❌ Not extracted | **FORBIDDEN** | Correctly excluded |
| conflictsWith | optional | ❌ Not extracted | **FORBIDDEN** | Correctly excluded |
| minCount | optional | ✅ | **FORBIDDEN** | |
| maxCount | optional | ✅ | **FORBIDDEN** | |

### G.3: Board response — no formal shared type

**VERIFIED:** `BoardApiResponse` is only defined as an inline type in `app/board/[code]/BoardClient.tsx` (lines 11-55). There is no shared type definition between the board API route handler and the client consumer. This is fragile to drift.

---

## H. Sandbox Coverage Audit

### H.1: What sandbox validates

| Aspect | Covered? | Evidence |
|--------|----------|---------|
| Mode toggle (preview/admin/host) | **YES** | Mode selector at sandbox page line 530 |
| PlayMode toggle (basic/facilitated/participants) | **YES** | PlayMode selector with 3 mock games |
| Section visibility per mode × playMode | **YES** | Config-driven via `getSectionConfig()` |
| Mock data with sensitive fields (leaderTips, leaderScript, boardText) | **YES** | mock-games.ts |
| Section override controls | **YES** | Manual per-section toggle grid |
| Data provenance card (DB table mapping) | **YES** | Coverage checklist with 18 items |

### H.2: What sandbox does NOT validate

| Gap | Impact | Severity |
|-----|--------|----------|
| No `facilitator` mode | Cannot test facilitator-specific visibility | MEDIUM — mode doesn't exist yet |
| No `participant` context | Cannot verify participant view | LOW — uses separate components |
| No API response verification | Cannot verify lazy-loaded APIs are sanitized | ~~**MEDIUM** — F5 fixed (Block 1); F7 deferred; F8 still open~~ **VERY LOW** — F5/F7/F8 all fixed; all lazy-loaded APIs now sanitized |
| No RSC payload inspection | Cannot verify serialized data doesn't include leaderScript/boardText | **LOW** — F3/F4 fixed (Block 1); verified via contract tests |
| No cross-context comparison | Cannot side-by-side compare library/director/host | MEDIUM |
| No `isAdmin` toggle | Cannot verify admin-only UI elements | LOW |

---

## I. Prioritized Problem List

### ~~Critical Now~~ ✅ ALL FIXED (Block 1, 2026-03-10)

| ID | Problem | Status | Fix |
|----|---------|--------|-----|
| ~~**P1**~~ | `leaderTips` rendered in preview mode (F1) | ✅ **FIXED** | `config.leaderTips = false` + `leaderTips: undefined` in derived object |
| ~~**P2**~~ | Roles API leaks `privateNote`, `secrets`, `assignmentStrategy` (F5) | ✅ **FIXED** | Removed 3 fields from route extraction |
| ~~**P3**~~ | `steps[].leaderScript` in RSC payload (F3) | ✅ **FIXED** | Destructuring strip in page.tsx derived object |

### ~~Important Next~~ Partially resolved

| ID | Problem | Status | Notes |
|----|---------|--------|-------|
| ~~**P4**~~ | `steps[].boardText` in RSC payload (F4) | ✅ **FIXED** (Block 1) | Stripped alongside leaderScript in page.tsx |
| **P5** | ~~Artifacts API returns all variants without filtering (F8)~~ | ✅ **FIXED (2026-03-10)** — route filters to public variants + strips `correctCode` | app/api/games/[gameId]/artifacts/route.ts |
| ~~**P6**~~ | No tests for config visibility or contracts (F12) | ✅ **PARTIALLY FIXED** (Block 1) | 12 tests added; Block 4 extends coverage |

### Good Improvements

| ID | Problem | Risk | Impact | Confidence | Affected files/routes |
|----|---------|------|--------|------------|----------------------|
| **P7** | ~~Triggers API exposes `condition`/`actions` (F7)~~ | ✅ **FIXED (2026-03-10, Option B)** — content strings stripped, structure preserved | app/api/games/[gameId]/triggers/route.ts |
| **P8** | `GameDetailContext`/`GameDetailProvider` unused (F10) | Dead code | Maintenance burden | **VERIFIED** | GameDetailContext.tsx |
| **P9** | Config has only 3 modes (F15) | ~~Director uses `mode="preview"`~~ → Director Preview does not use GameDetailMode (reclassified). Facilitator mode may still be relevant for future GameDetails display consumers. | Low — no current consumer | **RECLASSIFIED** | config.ts |
| **P10** | `BoardApiResponse` type inline-only (G.3) | No shared type | Drift risk | **VERIFIED** | BoardClient.tsx:11 |

### Future

| ID | Problem | Risk | Impact | Confidence |
|----|---------|------|--------|------------|
| **P11** | Sandbox doesn't test API sanitization | Misses API-layer leaks | Missing safety net | **VERIFIED** |
| **P12** | No cross-context comparison tool | Harder to spot differences | Dev ergonomics | **VERIFIED** |

---

## J. Non-goals / False Reuse Warnings

These are things that should **NOT** be done based on this audit:

1. **Do NOT make Play domain components consume `GameDetailData`** — Play has its own types (`Step`, `RunStep`, `StepInfo`) with genuinely different semantics. The separation is correct and intentional.

2. **Do NOT create a shared `BaseStep` type between `GameStep` and `Step`** — `body` vs `description` is a semantic difference, not drift. Display steps describe content. Play steps describe execution.

3. **Do NOT add `participant` mode to `GameDetailMode`** — Participants never see GameDetails components. They use the Play domain's separate component set. Adding it would create a false abstraction.

4. **Do NOT make `GameDetailRoles`/`GameDetailArtifacts`/`GameDetailTriggers` consume Play domain APIs** — These are library/preview components using library APIs. Mixing contexts violates trust boundaries.

5. **Do NOT merge `mapDbGameToDetailPreview` and `mapDbGameToDetailFull`** — They serve different contexts with different data needs.

6. **Do NOT rewrite board components to use GameDetails** — Board has fundamentally different UX (full-screen, audience-facing, minimal chrome) and data flows (public, no auth, real-time).

---

## K. Closure — Preview/Security Workstream

> **All identified preview-context exposures fixed as of 2026-03-10.**

### Closed findings (security/preview)

| Finding | Fix | Where | Tests |
|---------|-----|-------|-------|
| **F1** | `leaderTips` hidden in preview | config.ts + page.tsx strip | 9 config tests |
| **F3** | `leaderScript` stripped from RSC payload | page.tsx derived object | Code verified |
| **F4** | `boardText` stripped from RSC payload | page.tsx derived object | Code verified |
| **F5** | Roles API private fields removed | roles/route.ts extraction | 3 contract tests |
| **F7** | Triggers content strings stripped (Option B) | triggers/route.ts sanitization | 5 contract tests |
| **F8** | Artifacts non-public variants filtered | artifacts/route.ts filter | 5 contract tests |
| **F8b** | `metadata.correctCode` stripped | artifacts/route.ts destructure | Included in F8 tests |

### Pattern used consistently

All fixes applied the same architectural pattern:
- **Strip at API/page boundary** — never modify shared mappers
- **Route-level filtering** for lazy-loaded APIs (roles, artifacts, triggers)
- **Derived object** for RSC-serialized data (page.tsx)
- **Config gate** for component visibility (config.ts)

### Remaining non-security work

| Item | Type | Priority |
|------|------|----------|
| Block 2 (facilitator-mode) | Design/YAGNI decision | Low — no consumer exists |
| Block 4 remainder | E2E integration tests, RSC snapshot | Medium — existing 22 unit tests cover contracts |
| Block 5 (UX harmonization) | Design decisions | Low — depends on Block 2 |
| F10 (unused GameDetailContext) | Dead code cleanup | Low |
| F11 (Play domain naming) | Documentation concern | Very low |
| Manual browser verification | Block 1 checklist | **Pending human action** |
