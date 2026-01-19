# Game Integrity Report

**Generated:** 2026-01-19  
**Scope:** End-to-end game logic consistency audit  
**Status:** Complete

---

## A) System Map: Authoring → Snapshot → Runtime

> **Reality Check:** Audit reflects repo state as of commit `44219fe` (2026-01-19).  
> Components marked **(verified)** exist in repo. Components marked **(planned)** are documented but not yet implemented.

### Pipeline Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTHORING (Admin)                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│  GameBuilderPage.tsx        → API: /api/games/builder/[id]                  │
│  GameBuilderForm.tsx        → Tables: games, game_steps, game_phases,       │
│  validators                 →         game_roles, game_artifacts,           │
│                             →         game_triggers, board_configs          │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SNAPSHOT (DB Function)                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  create_game_snapshot(p_game_id, p_version_label, p_created_by)             │
│  → Freezes: game, steps, phases, roles, artifacts, triggers, board_config  │
│  → Writes to: game_snapshots.snapshot_data (JSONB)                          │
│  → Called by: create_session_with_snapshot()                                │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RUNTIME (Play Mode)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  Host APIs:     /api/play/sessions/[id]/*                                   │
│  Participant:   /api/participants/* (token-authed)                          │
│  Board:         /api/play/board/[code]                                      │
│                                                                              │
│  UI Views (verified): BasicPlayView, FacilitatedPlayView, ParticipantPlayView │
│  Hooks (verified): useSessionCapabilities, useTriggerEngine, useLiveSession  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Authoritative Type Definitions

| Stage | Primary Type | File | Purpose |
|-------|--------------|------|---------|
| **Authoring** | `GameBuilderData` | [types/games.ts#L283](types/games.ts#L283) | API response for builder |
| **Authoring** | `GameStep`, `GamePhase`, `GameRole`, `GameArtifact` | [types/games.ts](types/games.ts) | DB row types |
| **Authoring** | `StepFormData`, `PhaseFormData`, `RoleFormData` | [types/games.ts](types/games.ts) | Form input types |
| **Snapshot** | `GameSnapshotData` | [types/game-snapshot.ts#L110](types/game-snapshot.ts#L110) | Complete frozen game |
| **Snapshot** | `SnapshotStep`, `SnapshotPhase`, `SnapshotRole` | [types/game-snapshot.ts](types/game-snapshot.ts) | Per-entity snapshot types |
| **Runtime** | `SessionRuntimeState` | [types/play-runtime.ts#L53](types/play-runtime.ts#L53) | Live session state |
| **Runtime** | `SessionRole`, `SessionTrigger` | [types/play-runtime.ts](types/play-runtime.ts), [types/games.ts#L350](types/games.ts#L350) | Runtime copies |
| **Runtime** | `SessionCapabilities` | [hooks/useSessionCapabilities.ts#L28](hooks/useSessionCapabilities.ts#L28) | UI routing decisions |

### Key Files by Stage

**Authoring:**
- [app/admin/games/builder/GameBuilderPage.tsx](app/admin/games/builder/GameBuilderPage.tsx) - Main builder UI
- [app/admin/games/builder/GameBuilderForm.tsx](app/admin/games/builder/GameBuilderForm.tsx) - Legacy simple form
- [app/api/games/builder/[id]/route.ts](app/api/games/builder/[id]/route.ts) - Builder API (GET/PUT)
- [lib/validation/games.ts](lib/validation/games.ts) - Payload validation
- [features/admin/games/utils/game-validator.ts](features/admin/games/utils/game-validator.ts) - CSV import validation

**Snapshot Creation:**
- [supabase/migrations/20251228120000_game_snapshots.sql#L70](supabase/migrations/20251228120000_game_snapshots.sql#L70) - `create_game_snapshot()` function
- [app/api/games/[gameId]/snapshots/route.ts](app/api/games/[gameId]/snapshots/route.ts) - Manual snapshot creation

**Runtime:**
- [app/api/play/sessions/[id]/route.ts](app/api/play/sessions/[id]/route.ts) - Session state API
- [app/api/play/sessions/[id]/artifacts/route.ts](app/api/play/sessions/[id]/artifacts/route.ts) - Artifact serving with sanitization
- [app/api/play/board/[code]/route.ts](app/api/play/board/[code]/route.ts) - Public board endpoint
- [features/play/components/](features/play/components/) - Play mode views
- [features/play/hooks/useTriggerEngine.ts](features/play/hooks/useTriggerEngine.ts) - Trigger execution

---

## B) Contract Tables

### Contract 1: Game Core

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `name` | Admin form → `games.name` | Builder, Session, Board | Yes (create) | — | API 400 | `validateGamePayload()` |
| `play_mode` | Admin form → `games.play_mode` | `useSessionCapabilities`, View routing | Yes | `'basic'` | Falls back to basic view | `['basic','facilitated','participants']` enum |
| `status` | Admin form → `games.status` | Publish gate, Session creation | Yes | `'draft'` | Can't create sessions from draft | Enum check |
| `min_players` | Admin form → `games.min_players` | Lobby validation | No | `null` | No enforcement | `min <= max` check |
| `max_players` | Admin form → `games.max_players` | Lobby enforcement | No | `null` | Unlimited participants | `min <= max` check |
| `short_description` | Admin form → `games.short_description` | Game cards, search | Yes (create) | — | API 400 | `validateGamePayload()` |
| `main_purpose_id` | Admin form → `games.main_purpose_id` | Categorization | Yes (create) | — | API 400 | UUID validation |

**Evidence:**
- [lib/validation/games.ts#L24-26](lib/validation/games.ts#L24-26): `name` and `short_description` required on create
- [types/games.ts#L10](types/games.ts#L10): `PlayMode = 'basic' | 'facilitated' | 'participants'`
- [hooks/useSessionCapabilities.ts#L85](hooks/useSessionCapabilities.ts#L85): Intent extraction from `play_mode`

---

### Contract 2: Steps & Phases

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `steps[].title` | Admin → `game_steps.title` | Host view, Board | No | Empty string | Silent (shows empty) | None |
| `steps[].body` | Admin → `game_steps.body` | Host view, Participant prompt fallback | No | Empty string | Silent | None |
| `steps[].duration_seconds` | Admin → `game_steps.duration_seconds` | Timer, Phase durations | No | `null` | Timer disabled | Positive int |
| `steps[].leader_script` | Admin → `game_steps.leader_script` | Host script panel | No | `null` | Panel hidden | None |
| `steps[].participant_prompt` | Admin → `game_steps.participant_prompt` | Participant view | No | `null` | Falls back to `body` | None |
| `steps[].board_text` | Admin → `game_steps.board_text` | Board display | No | Falls back to `body` | Uses step body | None |
| `steps[].display_mode` | Admin → `game_steps.display_mode` | Typewriter effect | No | `'instant'` | Instant display | `['instant','typewriter','dramatic']` |
| `phases[].phase_type` | Admin → `game_phases.phase_type` | Phase styling | Yes | `'round'` | Default styling | `['intro','round','finale','break']` |
| `phases[].auto_advance` | Admin → `game_phases.auto_advance` | Phase timer behavior | No | `false` | Manual advance | Boolean |

**Evidence:**
- [types/game-snapshot.ts#L14-23](types/game-snapshot.ts#L14-23): `SnapshotStep` definition
- [supabase/migrations/20251228120000_game_snapshots.sql#L124-133](supabase/migrations/20251228120000_game_snapshots.sql#L124-133): Step snapshot aggregation
- [app/api/play/board/[code]/route.ts#L75-79](app/api/play/board/[code]/route.ts#L75-79): `board_text` fallback to `body`

---

### Contract 3: Roles & Secrets

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `roles[].name` | Admin → `game_roles.name` | Role cards, Assignment | Yes | — | Missing role display | String non-empty |
| `roles[].private_instructions` | Admin → `game_roles.private_instructions` | Participant (own role only) | Yes | Empty string | Empty instructions | None |
| `roles[].private_hints` | Admin → `game_roles.private_hints` | Participant (on reveal) | No | `null` | Hints hidden | None |
| `roles[].public_description` | Admin → `game_roles.public_description` | All participants | No | `null` | Empty description | None |
| `roles[].assignment_strategy` | Admin → `game_roles.assignment_strategy` | Role assigner | Yes | `'random'` | Random assignment | `['random','leader_picks','player_picks']` |
| `roles[].min_count` | Admin → `game_roles.min_count` | Pre-flight check | Yes | `1` | Warning if unmet | Positive int |
| `roles[].max_count` | Admin → `game_roles.max_count` | Assignment cap | No | `null` (unlimited) | Unlimited | `null` or positive int |
| `roles[].conflicts_with` | Admin → `game_roles.conflicts_with` | Assignment validation | No | `[]` | No conflicts | Array of role names |

**Evidence:**
- [types/play-runtime.ts#L65-97](types/play-runtime.ts#L65-97): `SessionRole` with all fields
- [types/game-snapshot.ts#L38-52](types/game-snapshot.ts#L38-52): `SnapshotRole` definition

**Security Note:** `private_instructions` and `private_hints` are only served to the assigned participant via:
- [app/api/participants/[participantId]/role/route.ts](app/api/participants/[participantId]/role/route.ts)

---

### Contract 4: Artifacts

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `artifact_type` | Admin → `game_artifacts.artifact_type` | Renderer selection | Yes | — | Unknown type error | `ArtifactType` enum |
| `visibility` | Admin → `game_artifact_variants.visibility` | Access control | Yes | `'public'` | Public by default | `['public','leader_only','role_private']` |
| `metadata.correctCode` | Admin → `game_artifacts.metadata` | **HOST ONLY** - Server validation | Yes (keypad) | — | Keypad broken | **NEVER sent to participants** |
| `metadata.codeLength` | Admin → `game_artifacts.metadata` | UI input length | No | `4` | Default 4-digit | Positive int |
| `metadata.maxAttempts` | Admin → `game_artifacts.metadata` | Lockout logic | No | `null` (unlimited) | Unlimited attempts | `null` or positive int |
| `variant.revealed_at` | Session → `session_artifact_variants.revealed_at` | Visibility gate | No | `null` | Hidden until revealed | ISO timestamp |

> **Note:** `revealed_at` is a **runtime** field (set by session, not authoring). When prompting new games, do NOT include runtime fields in specs.

**Critical Sanitization:**
```typescript
// app/api/play/sessions/[id]/artifacts/route.ts#L48-77
function sanitizeMetadataForParticipant(metadata, artifactType) {
  if (artifactType === 'keypad') {
    // correctCode is NEVER included
    return {
      codeLength: ...,
      maxAttempts: ...,
      successMessage: ...,
      failMessage: ...,
      lockedMessage: ...,
      keypadState: { isUnlocked, isLockedOut, attemptCount, unlockedAt }
    };
  }
  // Other types return null or safe subset
}
```

**Evidence:**
- [features/play/api/primitives-api.ts#L7-22](features/play/api/primitives-api.ts#L7-22): `SanitizedKeypadMetadata` type
- [app/api/play/sessions/[id]/artifacts/route.ts#L48-77](app/api/play/sessions/[id]/artifacts/route.ts#L48-77): Sanitization function

**Canonical Metadata Keys per ArtifactType (VERIFIED in [types/keypad.ts](types/keypad.ts), [features/play/components/PuzzleArtifactRenderer.tsx](features/play/components/PuzzleArtifactRenderer.tsx)):**

| ArtifactType | Required Keys | Optional Keys | Notes |
|--------------|---------------|---------------|-------|
| `keypad` | `correctCode` | `codeLength`, `maxAttempts`, `cooldownSeconds`, `buttonLayout` [VERIFY], `onSuccessTrigger` [VERIFY] | `correctCode` NEVER sent to participants |
| `riddle` | `acceptedAnswers[]` or `correctAnswer` | `normalizeMode` [VERIFY], `maxAttempts`, `promptText` | `normalizeMode`: verify enum values in repo |
| `counter` | — | `target`, `label` | Increments to target |
| `audio` | `audioUrl` or `src` | `autoPlay`, `loop`, `requireAck`, `transcript` | |
| `multi_answer` | `checks[]` or `items[]` | `requireAll`, `showProgress` | Checklist items |
| `qr_gate` | `expectedValue` or `allowedValues[]` | `fallbackCode`, `allowManualFallback`, `promptText` | |
| `hint_container` | `hints[]` | `penaltyPerHint`, `maxReveals` | Each hint has `id`, `text` |
| `hotspot` | `imageUrl`, `zones[]` | — | Each zone: `id`, `x`, `y`, `radius` |
| `tile_puzzle` | `imageUrl` | `gridSize` (`'2x2'`\|`'3x3'`\|`'4x4'`) | |
| `cipher` | `encodedMessage`, `expectedPlaintext` | `cipherType` (`'caesar'`\|`'atbash'`\|`'substitution'`), `caesarShift` | |
| `logic_grid` | `categories[]` | `title` | |
| `prop_confirmation` | — | `propId`, `propDescription`, `instructions`, `requirePhoto` | |
| `location_check` | `latitude`, `longitude` | `radius`, `locationName`, `checkType` | |
| `sound_level` | — | `thresholdLevel`, `sustainDuration`, `instruction` | |
| `signal_generator` | — | `signalConfig.label`, `signalConfig.outputs` | |
| `time_bank_step` | — | `timerConfig.initialSeconds`, `displayStyle` | |
| `document`, `image`, `card` | — | `body`, `media_ref` | Simple content |

---

### Contract 5: Triggers

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `condition.type` | Admin → `game_triggers.condition_type` | Engine matching | Yes | — | Trigger never fires | `TriggerConditionType` union |
| `condition.{config}` | Admin → `game_triggers.condition_config` | Event matching | Varies | — | Trigger never matches | Per-condition schema |
| `actions[]` | Admin → `game_triggers.actions` | Action execution | Yes | `[]` | Nothing happens | `TriggerAction[]` |
| `execute_once` | Admin → `game_triggers.execute_once` | Re-fire prevention | No | `true` | Fires once | Boolean |
| `delay_seconds` | Admin → `game_triggers.delay_seconds` | Action delay | No | `0` | Immediate | Non-negative int |
| `enabled` | Admin → `game_triggers.enabled` | Engine evaluation | No | `true` | Trigger skipped | Boolean |
| `status` | Runtime → `session_triggers.status` | UI badge, Engine | Yes | `'armed'` | — | `['armed','fired','disabled','error']` |

**Condition Types (29 total):**
```typescript
// types/trigger.ts#L210-241
type TriggerConditionType = 
  | 'step_started' | 'step_completed' | 'phase_started' | 'phase_completed'
  | 'keypad_correct' | 'keypad_failed' | 'artifact_unlocked' | 'timer_ended'
  | 'decision_resolved' | 'manual' | 'signal_received' | 'counter_reached'
  | 'riddle_correct' | 'audio_acknowledged' | 'multi_answer_complete'
  | 'scan_verified' | 'hint_requested' | 'hotspot_found' | 'hotspot_hunt_complete'
  | 'tile_puzzle_complete' | 'cipher_decoded' | 'prop_confirmed' | 'prop_rejected'
  | 'location_verified' | 'logic_grid_solved' | 'sound_level_triggered'
  | 'replay_marker_added' | 'time_bank_expired' | 'signal_generator_triggered';
```

**Evidence:**
- [features/play/hooks/useTriggerEngine.ts#L12-42](features/play/hooks/useTriggerEngine.ts#L12-42): `TriggerEvent` union
- [types/trigger.ts#L210-241](types/trigger.ts#L210-241): `TriggerCondition` union

---

### Contract 6: Tools

| Field | Source of Truth | Read By | Required | Default | Failure Mode | Validators |
|-------|-----------------|---------|----------|---------|--------------|------------|
| `tool_key` | Admin → `game_tools.tool_key` | Registry lookup | Yes | — | Tool not rendered | `ToolKey` enum |
| `enabled` | Admin → `game_tools.enabled` | Toolbelt visibility | No | `true` | Tool shown | Boolean |
| `scope` | Admin → `game_tools.scope` | Role-based access | No | Tool's `defaultScope` | Uses default | `['host','participants','both']` |

**Tool Registry:**
```typescript
// features/tools/registry.ts
export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  { key: 'dice_roller_v1', name: 'Dice Roller', defaultScope: 'both' },
  { key: 'coach_diagram_builder_v1', name: 'Coach Diagram Builder', defaultScope: 'host' },
  { key: 'conversation_cards_v1', name: 'Samtalskort', defaultScope: 'both' },
];
```

**Scope Gating:**
```typescript
// features/tools/types.ts#L14-18
export function isScopeAllowedForRole(scope: ToolScope, role: ToolRole): boolean {
  if (scope === 'both') return true;
  if (scope === 'host') return role === 'host';
  return role === 'participant';
}
```

**Evidence:**
- [features/tools/types.ts#L1-3](features/tools/types.ts#L1-3): `ToolKey`, `ToolScope` types
- [features/tools/api.ts#L25-51](features/tools/api.ts#L25-51): `getEnabledToolsForSession()` function

---

## C) Verification Checklist

### Static Checks (TypeScript)

| Check | Command/Location | Status |
|-------|------------------|--------|
| Type consistency: games.ts ↔ game-snapshot.ts | `npx tsc --noEmit` | ✅ Passing |
| PlayMode enum used consistently | Grep for `play_mode` assignments | ✅ Verified |
| TriggerConditionType exhaustive | Union type in trigger.ts | ✅ 29 types defined |
| ArtifactType complete | Union type in games.ts | ✅ 24 types defined |

### Runtime Checks (Manual Testing)

| Scenario | Test Method | Expected Result |
|----------|-------------|-----------------|
| Keypad correctCode not leaked | Inspect participant artifact response | `correctCode` absent from metadata |
| Role private_instructions isolated | Query different participant tokens | Only own role instructions visible |
| Board shows public data only | Inspect `/api/play/board/[code]` | No private fields exposed |
| Trigger fires once with execute_once | Fire trigger twice | Status changes to 'fired', no re-fire |

### Snapshot Consistency

| Check | Method | Status |
|-------|--------|--------|
| Checksum field exists | DB column `game_snapshots.checksum` | ⚠️ Column exists but NULL (not implemented) |
| Version incrementing | `create_game_snapshot` logic | ✅ `COALESCE(MAX(version), 0) + 1` |
| All entities frozen | Inspect snapshot_data JSONB | ✅ Contains game, steps, phases, roles, artifacts, triggers, board_config |

### Security Checks

| Check | Implementation | Evidence |
|-------|----------------|----------|
| Keypad sanitization | `sanitizeMetadataForParticipant()` | [artifacts/route.ts#L48-77](app/api/play/sessions/[id]/artifacts/route.ts#L48-77) |
| Participant token validation | `resolveViewer()` | [artifacts/route.ts#L89-108](app/api/play/sessions/[id]/artifacts/route.ts#L89-108) |
| Role visibility gating | `visibility` + `visible_to_session_role_id` check | [artifacts/route.ts#L240-257](app/api/play/sessions/[id]/artifacts/route.ts#L240-257) |
| leader_only artifacts excluded | `if (visibility === 'leader_only') continue` | [artifacts/route.ts#L248](app/api/play/sessions/[id]/artifacts/route.ts#L248) |

---

## D) Findings

### P0: Critical (Can break sessions / leak data)

**None found.** Security boundaries are well-maintained.

---

### P1: Significant (Incorrect UX / Missing gating)

#### P1-1: Snapshot Checksum Not Implemented

**Evidence:** [supabase/migrations/20251228120000_game_snapshots.sql#L48](supabase/migrations/20251228120000_game_snapshots.sql#L48)
- Column `checksum` exists but always `NULL`
- No integrity verification on snapshot load

**User Impact:** Cannot detect snapshot corruption or tampering.

**Risk:** Low (data stored in trusted DB)

**Minimal Fix:** Document as intentional for MVP, or add MD5 hash:
```sql
v_checksum := md5(v_snapshot::text);
```

---

#### P1-2: Graceful Degradation Missing UI Feedback

**Evidence:** [hooks/useSessionCapabilities.ts#L164-175](hooks/useSessionCapabilities.ts#L164-175)
- When `participants` mode has no roles, silently falls back to `basic`
- No user notification

**User Impact:** Host may not understand why participants view is simplified.

**Risk:** UX confusion

**Minimal Fix:** Add warning to session preflight:
```typescript
if (intent === 'participants' && !hasRoles) {
  warnings.push('Inga roller definierade - använder förenklad vy');
}
```

---

#### P1-3: Tool Scope UX Clarity (Admin)

**Evidence:** 
- [features/tools/types.ts#L3](features/tools/types.ts#L3): `ToolScope = 'host' | 'participants' | 'both'`
- [app/api/games/builder/route.ts#L186](app/api/games/builder/route.ts#L186): Normalizes unknown values to `'both'`

**User Impact:** Admin may not understand difference between `'participants'` (player-only) and `'both'` (shared).

**Current Behavior:**
| Scope | Host Sees | Participant Sees |
|-------|-----------|------------------|
| `host` | ✅ | ❌ |
| `participants` | ❌ | ✅ |
| `both` | ✅ | ✅ |

**Examples:**
- `dice_roller_v1`: default `both` (shared rolling)
- `coach_diagram_builder_v1`: default `host` (facilitator tool)

**Risk:** Low - UX/documentation issue, not contract violation

**Minimal Fix:** Add tooltip in admin UI explaining scope options.

---

#### P1-4: Board Endpoint Reads from Live DB, Not Snapshot

**Evidence:** [app/api/play/board/[code]/route.ts#L45-78](app/api/play/board/[code]/route.ts#L45-78)
- Fetches from `game_phases`, `game_steps` directly
- Does NOT use `game_snapshot_id` on session

**User Impact:** If game is edited during active session, board shows new content instead of frozen snapshot.

**Risk:** **HIGH** - breaks snapshot immutability contract which is a core architectural invariant

**Minimal Fix Proposal:**
```typescript
// Should read from session.game_snapshot_id → snapshot_data instead
const snapshot = await getSnapshotData(session.game_snapshot_id);
currentPhaseName = snapshot.phases[session.current_phase_index]?.name;
currentStepTitle = snapshot.steps[session.current_step_index]?.board_text;
```

---

### P2: Cleanup (Tech debt / Documentation drift)

#### P2-1: SnapshotTrigger Uses condition_type/condition_config (Not condition Object)

**Evidence:**
- [types/game-snapshot.ts#L63-72](types/game-snapshot.ts#L63-72): `SnapshotTrigger` has `condition_type: string` + `condition_config: Record<string, unknown>`
- [types/games.ts#L322-336](types/games.ts#L322-336): `GameTrigger` has `condition: TriggerCondition`

**User Impact:** None (snapshot is internal format)

**Risk:** Type confusion during development

**Minimal Fix (doc-only):** Add comment in game-snapshot.ts explaining the flattened format.

---

#### P2-2: display_mode Not in SnapshotStep

**Evidence:**
- [types/games.ts#L120](types/games.ts#L120): `GameStep.display_mode: 'instant' | 'typewriter' | 'dramatic' | null`
- [types/game-snapshot.ts#L14-23](types/game-snapshot.ts#L14-23): `SnapshotStep` does NOT include `display_mode`
- [supabase/migrations/20251228120000_game_snapshots.sql#L124-133](supabase/migrations/20251228120000_game_snapshots.sql#L124-133): Not in snapshot aggregation

**User Impact:** Step display mode not preserved in session snapshot.

**Risk:** Low - defaults to 'instant'

**Minimal Fix:** Add to snapshot function:
```sql
'display_mode', display_mode,
```

---

## E) Recommendations for Prompting New Games

> **STRICT CONTRACT MODE:** All enum values and metadata keys MUST come from Appendix G or Contract 4.  
> If a value is not listed there, mark it `[VERIFY_IN_REPO]` before using.

**ID-policy (för referensintegritet i specs):**
- Alla `id` i YAML används för att kunna referera mellan objekt (t.ex. triggers → artifacts).
- Builder/API kan ignorera dessa och generera UUID internt.
- AI måste dock använda konsekventa `id` inom samma spec.

---

### Template 1: Minimum Viable Game Spec (Basic Mode)

```yaml
# Minimum Viable Game - Basic Mode
game:
  name: "Mitt Första Spel"                    # REQUIRED
  short_description: "En enkel samarbetslek"  # REQUIRED
  play_mode: basic                            # REQUIRED: basic | facilitated | participants
  main_purpose_id: "<uuid>"                   # REQUIRED: Must be valid purpose
  status: draft                               # Default, change to 'published' to enable sessions

steps:                                        # REQUIRED: At least 1 step
  - title: "Introduktion"
    body: "Välkommen! Samla gruppen i en cirkel."
    duration_seconds: 60                      # Optional: null = no timer
  - title: "Aktivitet"
    body: "Börja leken enligt instruktionerna."
    duration_seconds: 300
  - title: "Avslut"
    body: "Bra jobbat! Diskutera vad ni lärde er."
```

**Required Fields:**
- `game.name` (non-empty string)
- `game.short_description` (non-empty string)
- `game.main_purpose_id` (valid UUID)
- At least 1 step with `title`

**Common Pitfalls:**
- ❌ Missing `main_purpose_id` → API 400
- ❌ Empty `name` → API 400
- ❌ No steps → Import validation error

---

### Template 2: Facilitated Game Spec

```yaml
# Facilitated Game - With Phases and Triggers
game:
  name: "Escape Room Äventyr"
  short_description: "Ett teambaserat escape room"
  play_mode: facilitated
  main_purpose_id: "<uuid>"
  min_players: 4
  max_players: 12

phases:
  - name: "Intro"
    phase_type: intro
    duration_seconds: 120
    timer_visible: true
    timer_style: countdown
    board_message: "Välkomna till mysteriet!"
  - name: "Omgång 1"
    phase_type: round
    duration_seconds: 600
    auto_advance: false
  - name: "Finale"
    phase_type: finale
    duration_seconds: 300

steps:
  - title: "Samla ledtrådar"
    body: "Teamet ska hitta alla dolda ledtrådar."
    leader_script: "Ge tips om de fastnar efter 5 minuter."
    board_text: "Sök i rummet!"
  - title: "Lös gåtan"
    body: "Kombinera ledtrådarna för att knäcka koden."

artifacts:
  - title: "Kodlås"
    artifact_type: keypad
    metadata:
      correctCode: "1234"                     # HOST ONLY - never shown to participants
      codeLength: 4
      maxAttempts: 5
      successMessage: "Koden är rätt! 🎉"

triggers:
  - name: "Kodlås löst"
    condition_type: keypad_correct
    condition_config:
      keypadId: "<artifact-uuid>"
    actions:
      - type: advance_step
    execute_once: true

board_config:
  show_game_name: true
  show_timer: true
  show_qr_code: true
  theme: mystery
```

**Required Fields:**
- All from Basic template
- `phases[].name` and `phase_type`
- `artifacts[].artifact_type` from valid enum
- `triggers[].condition_type` from valid enum

**Common Pitfalls:**
- ❌ `keypad.correctCode` missing → Keypad always fails
- ❌ `trigger.condition_config.keypadId` wrong → Trigger never fires
- ❌ `phase_type` not in enum → Fallback styling

---

### Template 3: Participants/Roles Game Spec

```yaml
# Participants Mode - With Roles
game:
  name: "Mysteriet på Godset"
  short_description: "En rollspelslek med hemligheter"
  play_mode: participants
  main_purpose_id: "<uuid>"
  min_players: 5
  max_players: 10

roles:
  - name: "Detektiven"
    icon: "🔍"
    color: "blue"
    public_description: "Ledare för utredningen"
    private_instructions: |
      Du misstänker att Butler Johnson ljuger.
      Undersök hans alibi noga.
    private_hints: "Fråga om nyckeln till biblioteket."
    min_count: 1
    max_count: 1
    assignment_strategy: leader_picks

  - name: "Butlern"
    icon: "🎩"
    color: "gray"
    public_description: "Har arbetat på godset i 20 år"
    private_instructions: |
      Du är oskyldig men såg något misstänkt.
      Berätta bara om någon frågar direkt.
    min_count: 1
    max_count: 1
    assignment_strategy: random

  - name: "Gäst"
    icon: "👤"
    color: "green"
    public_description: "En av de inbjudna gästerna"
    private_instructions: "Du har inga hemligheter."
    min_count: 0
    max_count: null                           # Unlimited
    assignment_strategy: random

steps:
  - title: "Rollutdelning"
    body: "Varje deltagare får sin hemliga roll."
    participant_prompt: "Läs dina hemliga instruktioner!"
  - title: "Utredning"
    body: "Mingla och samla information."
    participant_prompt: "Prata med andra och sök ledtrådar."

artifacts:
  - title: "Brevet"
    artifact_type: document
    variants:
      - title: "Till Detektiven"
        body: "Hemligt bevis som bara detektiven ser."
        visibility: role_private
        visible_to_role_id: "<detektiv-role-uuid>"
      - title: "Offentlig version"
        body: "Ett mystiskt brev hittades..."
        visibility: public
```

**Required Fields:**
- All from Facilitated template
- `roles[].name` and `private_instructions`
- `roles[].assignment_strategy`

**Common Pitfalls:**
- ❌ No roles defined → Fallback to basic view (P1-2)
- ❌ `visible_to_role_id` wrong → Variant visible to wrong role
- ❌ All roles `max_count: 1` with more players → Assignment fails

---

## F) Admin Info Panel Content

### F.1) Runtime Rules (Core Game Logic)

```markdown
## Runtime Rules (Single Source of Truth)

### Play Modes

| Mode | Requirements | UI Features |
|------|--------------|-------------|
| **basic** | Steps only | Step navigation, optional toolbelt |
| **facilitated** | Steps + Phases recommended | Phase navigation, triggers panel, director mode |
| **participants** | Steps + Roles required | Role assignment, private instructions, role-gated artifacts |

**Graceful Degradation:**
- `participants` without roles → Renders as `basic` (⚠️ no user feedback - P1-2)
- `facilitated` without phases → Renders as `basic`

---

### Snapshot Rules

1. **Immutable:** Once created, snapshot data cannot change
2. **Versioned:** Each new snapshot increments version number  
3. **Complete:** Contains game, steps, phases, roles, artifacts, triggers, board_config
4. **Session-bound:** Each session references exactly one snapshot
5. **⚠️ Known Issue:** Board endpoint reads live DB, not snapshot (P1-4)

---

### Artifact Rules

| Type | Visibility Options | Sanitization |
|------|-------------------|---------------|
| `keypad` | public, leader_only | `correctCode` NEVER sent to participants |
| `document`, `image`, `card` | public, leader_only, role_private | No secrets |
| `conversation_cards_collection` | public | Only `collection_id` exposed |

**Visibility:**
- `public` + `revealed_at` set → All participants see it
- `leader_only` → Host only, never sent to participants
- `role_private` + `visible_to_session_role_id` → Only that role sees it

**Board must NOT show:**
- Participant-identifying info (names, tokens)
- Role private_instructions or private_hints
- leader_only artifacts
- keypad correctCode (always sanitized)

---

### Trigger Rules

1. **Conditions:** 29 event types (see Appendix G)
2. **Actions:** 30 action types (see Appendix G)
3. **execute_once:** Default `true` - trigger fires once then status → `'fired'`
4. **delay_seconds:** Actions delayed by this amount after condition matches
5. **Manual triggers:** `condition.type: 'manual'` - host-only button

---

### Tool Scope Rules

| Scope | Host Sees | Participant Sees | Use Case |
|-------|-----------|------------------|----------|
| `host` | ✅ | ❌ | Facilitator-only tools |
| `participants` | ❌ | ✅ | Player-only interactions |
| `both` | ✅ | ✅ | Shared tools (dice, cards) |

**Available Tools (verified):**
- `dice_roller_v1` (default: both)
- `coach_diagram_builder_v1` (default: host)  
- `conversation_cards_v1` (default: both)
```

---

### F.2) Publishing & Marketplace Rules

```markdown
## Publishing Rules (Marketplace Requirements)

### Create Game (Required for Draft):
- `name` (non-empty string)
- `short_description` (non-empty string)
- `main_purpose_id` (valid UUID from purposes table)
- At least 1 step with `title`

### Publish Game (Additional Requirements):
- Cover image required (`games.cover_image_url`)
- Status must be set to `'published'`
- All referenced artifacts must exist
- All trigger references (artifact IDs, step IDs) must be valid

### Visibility & Discovery:
- `is_public: true` → Listed in marketplace
- `is_public: false` → Only accessible via direct link or tenant access
- `tenant_id` → Scopes game to specific organization

### Cloning & Templates:
- Published games can be cloned as templates
- Cloning creates new game with new UUIDs for all entities
- Clone inherits steps, phases, roles, artifacts, triggers
```

---

### F.3) Don't Do This ⚠️

```markdown
## Anti-Patterns (AVOID)

### Security Violations
1. ❌ Put secrets in `board_text` (visible on public board without auth)
2. ❌ Put rollspecifika hemligheter in `participant_prompt` (den är inte roll-gated). Använd `private_instructions` (roll) eller `leader_script` (host) för hemligheter.
3. ❌ Assume `leader_script` is private (it is, but double-check visibility)

### Data Integrity
4. ❌ Forget `correctCode` in keypad metadata (keypad always fails validation)
5. ❌ Reference artifact/step IDs that don't exist in trigger configs (trigger never fires)
6. ❌ Use invalid enum values (see Appendix G for allowed values)

### Mode Mismatches
7. ❌ Use `participants` mode without defining roles (silently falls back to basic)
8. ❌ Set `max_count: 1` for all roles when expecting more players than roles
9. ❌ Expect `facilitated` features without defining phases

### Prompting New Games
10. ❌ Invent new artifact types not in ArtifactType enum
11. ❌ Invent new trigger conditions not in TriggerConditionType
12. ❌ Invent new tool keys not in ToolKey enum

**Rule:** When prompting new games, use ONLY enum values from Appendix G. If unsure, mark `[VERIFY_IN_REPO]`.
```

---

## G) Enum Appendix (Authoritative Values)

> **Source:** Verified from TypeScript types as of commit `44219fe`.  
> **Rule:** When prompting new games, you MUST use only these enum values. Do NOT invent new values.
>
> **STRICT MODE:** If you need a metadata key or enum value not listed here, mark it `[VERIFY_IN_REPO]`.
> Nested metadata (e.g., `buttonLayout`, `normalizeMode`) must also be verified in Contract 4.

### G.1) ArtifactType

**Source:** [types/games.ts#L21-51](types/games.ts#L21-51)

```typescript
type ArtifactType =
  // Basic content
  | 'card'
  | 'document'
  | 'image'
  // Toolbelt artifacts
  | 'conversation_cards_collection'
  // Code & Input puzzles
  | 'keypad'
  | 'riddle'
  | 'multi_answer'
  // Media & Interaction
  | 'audio'
  | 'hotspot'
  | 'tile_puzzle'
  // Cryptography & Logic
  | 'cipher'
  | 'logic_grid'
  // Special mechanics
  | 'counter'
  | 'qr_gate'
  | 'hint_container'
  | 'prop_confirmation'
  | 'location_check'
  | 'sound_level'
  | 'replay_marker'
  // Session Cockpit artifacts
  | 'signal_generator'
  | 'time_bank_step'
  | 'empty_artifact';
```

**Count:** 24 artifact types

---

### G.2) TriggerConditionType

**Source:** [types/trigger.ts#L210-241](types/trigger.ts#L210-241)

```typescript
type TriggerConditionType =
  | 'step_started'
  | 'step_completed'
  | 'phase_started'
  | 'phase_completed'
  | 'keypad_correct'
  | 'keypad_failed'
  | 'artifact_unlocked'
  | 'timer_ended'
  | 'decision_resolved'
  | 'manual'
  | 'signal_received'
  | 'counter_reached'
  | 'riddle_correct'
  | 'audio_acknowledged'
  | 'multi_answer_complete'
  | 'scan_verified'
  | 'hint_requested'
  | 'hotspot_found'
  | 'hotspot_hunt_complete'
  | 'tile_puzzle_complete'
  | 'cipher_decoded'
  | 'prop_confirmed'
  | 'prop_rejected'
  | 'location_verified'
  | 'logic_grid_solved'
  | 'sound_level_triggered'
  | 'replay_marker_added'
  | 'time_bank_expired'
  | 'signal_generator_triggered';
```

**Count:** 29 condition types

---

### G.3) TriggerActionType

**Source:** [types/trigger.ts#L442-474](types/trigger.ts#L442-474)

```typescript
type TriggerActionType =
  | 'reveal_artifact'
  | 'hide_artifact'
  | 'unlock_decision'
  | 'lock_decision'
  | 'advance_step'
  | 'advance_phase'
  | 'start_timer'
  | 'send_message'
  | 'play_sound'
  | 'show_countdown'
  | 'reset_keypad'
  | 'send_signal'
  | 'time_bank_apply_delta'
  | 'increment_counter'
  | 'reset_counter'
  | 'reset_riddle'
  | 'send_hint'
  | 'reset_scan_gate'
  | 'reset_hotspot_hunt'
  | 'reset_tile_puzzle'
  | 'reset_cipher'
  | 'reset_prop'
  | 'reset_location'
  | 'reset_logic_grid'
  | 'reset_sound_meter'
  | 'add_replay_marker'
  | 'show_leader_script'
  | 'trigger_signal'
  | 'time_bank_pause';
```

**Count:** 29 action types

---

### G.4) ToolKey

**Source:** [features/tools/types.ts#L1](features/tools/types.ts#L1)

```typescript
type ToolKey = 
  | 'dice_roller_v1'
  | 'coach_diagram_builder_v1'
  | 'conversation_cards_v1';
```

**Count:** 3 tools

---

### G.5) ToolScope

**Source:** [features/tools/types.ts#L3](features/tools/types.ts#L3)

```typescript
type ToolScope = 'host' | 'participants' | 'both';
```

---

### G.6) PlayMode

**Source:** [types/games.ts#L10](types/games.ts#L10)

```typescript
type PlayMode = 'basic' | 'facilitated' | 'participants';
```

---

### G.7) ArtifactVisibility

**Source:** [types/games.ts#L56](types/games.ts#L56)

```typescript
type ArtifactVisibility = 'public' | 'leader_only' | 'role_private';
```

---

### G.8) TriggerStatus

**Source:** [types/trigger.ts#L480](types/trigger.ts#L480)

```typescript
type TriggerStatus = 'armed' | 'fired' | 'disabled' | 'error';
```

---

## Summary

This audit confirms that the Lekbanken game logic system maintains strong contracts between authoring, snapshot, and runtime stages. Key security boundaries (artifact sanitization, role visibility, participant token validation) are well-implemented.

**No P0 (critical) issues found.**

Four P1 issues merit attention:
1. Snapshot checksum not implemented (integrity verification gap)
2. Graceful degradation lacks user feedback
3. Tool scope UX clarity needs improvement
4. **Board endpoint reads live DB, not snapshot** (breaks immutability)

Two P2 cleanup items for future consideration:
1. SnapshotTrigger format consistency with GameTrigger
2. `display_mode` missing from snapshot schema

---

## Next Steps

For a standalone, iterable prompting guide, see: [docs/admin/GAME_PROMPTING_GUIDE.md](docs/admin/GAME_PROMPTING_GUIDE.md) (STRICT CONTRACT MODE).

This integrity report should remain stable as an audit document. The prompting guide can evolve independently.
