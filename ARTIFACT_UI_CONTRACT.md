# Artifact UI Contract

> Single Source of Truth for artifact data model, states, actions, and visibility rules.
> All UI components **must** implement against this contract.
> Violations = bugs — update this contract first if behaviour needs to change.

**Version:** 1.0
**Datum:** 2026-02-23

---

## 1. Artifact Identity

Every artifact in the system has the following core identity:

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Unique artifact identifier |
| `game_id` | `UUID` | Parent game |
| `title` | `string` | Human-readable name |
| `description` | `string \| null` | Rich description |
| `artifact_type` | `ArtifactType` | Discriminator (see §2) |
| `artifact_order` | `number` | Sort position within game |
| `tags` | `string[]` | Freeform tags for filtering |
| `metadata` | `Record<string, unknown>` | Type-specific config (puzzle config, counter target, etc.) |
| `locale` | `string \| null` | Localised variant key |
| `variants` | `GameArtifactVariant[]` | Sub-units (cards, handouts, role-scoped content) |

### 1.1 Variant Identity

Each artifact may have 1–N variants — the atomic units that get revealed/hidden at runtime:

| Field | Type | Description |
|---|---|---|
| `id` | `UUID` | Unique variant identifier |
| `artifact_id` | `UUID` | Parent artifact |
| `title` | `string \| null` | Variant title |
| `body` | `string \| null` | Rich content (markdown) |
| `media_ref` | `UUID \| null` | Linked media asset |
| `variant_order` | `number` | Sort position within artifact |
| `visibility` | `ArtifactVisibility` | Access rule (see §4) |
| `visible_to_role_id` | `UUID \| null` | Role restriction (when `role_private`) |
| `metadata` | `Record<string, unknown>` | Variant-specific data |

---

## 2. Artifact Types (Canonical)

22 artifact types in 7 categories. The `artifact_type` field discriminates all UI and logic branching.

### 2.1 Basic Content
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `card` | Text/image card | No | Reveal, hide, highlight, assign | View, collect |
| `document` | Long-form document | No | Reveal, hide, highlight | View, scroll |
| `image` | Image asset | No | Reveal, hide, highlight | View, zoom |

### 2.2 Toolbelt
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `conversation_cards_collection` | Deck of conversation cards | No | Reveal, hide | Browse deck, navigate cards |

### 2.3 Code & Input Puzzles
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `keypad` | Numeric/alpha code entry | Yes | Reveal, hide, reset, view attempts | Enter code, view attempts |
| `riddle` | Text prompt with answer matching | Yes | Reveal, hide, reset, view attempts, send hint | Submit answer, view hints |
| `multi_answer` | Checklist of correct answers | Yes | Reveal, hide, reset | Check items, track progress |

### 2.4 Media & Interaction
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `audio` | Audio playback + acknowledge gate | Yes | Reveal, hide, view ack status | Play, pause, acknowledge |
| `hotspot` | Image with tap zones | Yes | Reveal, hide, reset | Tap hotspots, track found |
| `tile_puzzle` | Sliding tile puzzle | Yes | Reveal, hide, reset | Slide tiles to solve |

### 2.5 Cryptography & Logic
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `cipher` | Substitution/caesar cipher | Yes | Reveal, hide, reset | Decode characters |
| `logic_grid` | Category logic grid | Yes | Reveal, hide, reset | Mark cells, deduce |

### 2.6 Special Mechanics
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `counter` | Numeric counter toward target | Yes | Reveal, hide, increment, reset | Increment, view progress |
| `qr_gate` | QR/barcode scan verification | Yes | Reveal, hide, reset | Scan QR, manual fallback |
| `hint_container` | Sequential hint dispenser | Yes | Reveal, send hint | Request hint, view hints |
| `prop_confirmation` | Physical prop verification | Yes | Approve, reject, request photo | Photo capture, submit |
| `location_check` | GPS/QR location gate | Yes | Reveal, hide, view status | Verify location |
| `sound_level` | Microphone threshold detector | Yes | Reveal, hide, reset | Monitor mic level |
| `replay_marker` | Analysis marker (host-only) | No | Add marker, annotate | *(not rendered)* |

### 2.7 Session Cockpit Artifacts
| Type | Description | Puzzle? | Director Actions | Participant Actions |
|---|---|---|---|---|
| `signal_generator` | Signal emitter for trigger system | No | Trigger signal, configure | View visual indicator |
| `time_bank_step` | Time bank countdown unit | No | Configure, adjust | View timer, track time |
| `empty_artifact` | Placeholder/break/custom slot | No | Configure purpose | View placeholder |

---

## 3. Artifact States

### 3.1 Author-Time States (Game Builder)
Artifacts exist only as authored game data. No runtime state.

### 3.2 Session Runtime States (Director Cockpit)

The `ArtifactStateStatus` enum governs all runtime state transitions:

```
hidden → revealed → consumed
  ↑         ↓          ↓
  └── locked ←──────────┘
  
Additional: unlocked, solved, failed
```

| Status | Meaning | Who sets it |
|---|---|---|
| `hidden` | Not visible to participants | Default / Director / Trigger |
| `revealed` | Visible to participants | Director / Trigger |
| `locked` | Visible but interaction disabled | Director / Trigger |
| `unlocked` | Visible and interaction enabled | Director / Trigger |
| `solved` | Puzzle completed successfully | System (on correct answer) |
| `failed` | Puzzle exhausted attempts | System (on max attempts) |

### 3.3 Variant-Level Runtime State

Each variant tracks independently:

| Field | Type | Meaning |
|---|---|---|
| `revealed_at` | `timestamp \| null` | When revealed (null = hidden) |
| `highlighted_at` | `timestamp \| null` | When highlighted (null = normal) |

### 3.4 Participant 3-State Model

From the participant's perspective (enforced by `ParticipantArtifactDrawer`):

| State | Definition | Visual Signal |
|---|---|---|
| **Highlighted** | `highlighted_at` is set, not used | Glow border, pulse animation, "NEW" badge |
| **Available** | Revealed, not highlighted, not used | Normal card appearance |
| **Used** | `used_at` or `metadata.solved/used` set | Dimmed, checkmark, collapsed |

> **Law:** There is NO "locked" state in participant view. Server access-controls what gets sent.

### 3.5 Puzzle-Specific State

Stored in `session_artifact_state.state` (JSONB):

| Puzzle Type | State Shape |
|---|---|
| `keypad` | `{ isUnlocked, attemptCount, maxAttempts, lockedUntil }` |
| `riddle` | `{ isCorrect, attemptsUsed, attempts[], showHint }` |
| `counter` | `{ currentValue, target, isComplete, roleValues? }` |
| `audio` | `{ isPlaying, hasPlayed, hasAcknowledged }` |
| `multi_answer` | `{ checkedItems[], progress }` |
| `qr_gate` | `{ verified, scannedCode?, verifiedAt }` |
| `hint_container` | `{ revealedHints[], penaltyApplied }` |
| `hotspot` | `{ foundSpots[], requiredCount }` |
| `tile_puzzle` | `{ grid[][], solved, moveCount }` |
| `cipher` | `{ decodedChars{}, solved }` |
| `logic_grid` | `{ cells{}, cluesUsed[], solved }` |
| `prop_confirmation` | `{ status: pending/approved/rejected, photoUrl?, notes }` |
| `location_check` | `{ verified, distance?, method }` |
| `sound_level` | `{ triggered, peakLevel, duration }` |

---

## 4. Visibility Rules

### 4.1 Author-Time Visibility (`ArtifactVisibility`)

| Value | Meaning |
|---|---|
| `public` | Visible to all when revealed |
| `leader_only` | Only visible to host/director |
| `role_private` | Only visible to participants with specific role |

### 4.2 Runtime Visibility Logic

```
canParticipantSee(variant, participant):
  IF variant.visibility === 'leader_only' → false
  IF variant.visibility === 'role_private':
    IF participant.assignedRoleId !== variant.visible_to_session_role_id → false
  IF variant.revealed_at === null → false
  RETURN true
```

### 4.3 Forbidden Fields (Participant Contract)

Per `ParticipantGameStepSchema` and `ParticipantRoleSchema`, these fields are **NEVER** sent to participants:

**Step fields:** `leaderScript`, `boardText`, `leaderTips`
**Role fields:** `assignment_strategy`, `scaling_rules`, `conflicts_with`, `min_count`, `max_count`

---

## 5. Actions

### 5.1 Director Actions (Host)

| Action | Scope | Effect | Broadcast Event |
|---|---|---|---|
| `revealArtifact` | Artifact | Sets `revealed_at` on all public variants | `artifact_update:variant_revealed` |
| `hideArtifact` | Artifact | Clears `revealed_at` | `artifact_update:variant_hidden` |
| `resetArtifact` | Artifact | Resets puzzle state + clears reveal | `artifact_update:variant_hidden` |
| `highlightVariant` | Variant | Sets `highlighted_at` | `artifact_update:variant_highlighted` |
| `unhighlightVariant` | Variant | Clears `highlighted_at` | `artifact_update:variant_unhighlighted` |
| `assignVariant` | Variant→Participant | Creates assignment record | `artifact_update:assigned` |
| `unassignVariant` | Variant→Participant | Removes assignment | `artifact_update:unassigned` |
| `snapshotArtifacts` | Session | Takes snapshot at session start | `artifact_update:snapshot` |

**Batch operations (via `BatchArtifactPanel`):**
- `batchReveal` — Reveal multiple artifacts at once
- `batchHide` — Hide multiple artifacts
- `batchReset` — Reset multiple puzzle states
- `batchUnlock` — Unlock multiple artifacts
- `batchLock` — Lock multiple artifacts
- `batchSolve` — Mark multiple as solved (debug)

### 5.2 Participant Actions

| Action | Scope | Artifact Types | Effect |
|---|---|---|---|
| `view` | Variant | All revealed | Records view event (telemetry) |
| `submitCode` | Artifact | `keypad` | Server-validates code, updates state |
| `submitAnswer` | Artifact | `riddle` | Fuzzy-match answer, updates state |
| `checkItem` | Artifact | `multi_answer` | Toggles item, checks completion |
| `acknowledge` | Artifact | `audio` | Marks audio as acknowledged |
| `tapHotspot` | Artifact | `hotspot` | Records found spot |
| `slideTile` | Artifact | `tile_puzzle` | Moves tile, checks solved |
| `decodeChar` | Artifact | `cipher` | Updates decoded character |
| `markCell` | Artifact | `logic_grid` | Toggles grid cell |
| `scanQR` | Artifact | `qr_gate` | Verifies scanned code |
| `requestHint` | Artifact | `hint_container` | Reveals next hint |
| `capturePhoto` | Artifact | `prop_confirmation` | Submits photo for host review |
| `verifyLocation` | Artifact | `location_check` | GPS/QR location verification |
| `increment` | Artifact | `counter` | Increments counter value |
| `navigateCard` | Artifact | `conversation_cards_collection` | Previous/next card in deck |

### 5.3 Trigger Actions (System/Automated)

Triggers can perform artifact actions automatically:

| Trigger Action | Effect |
|---|---|
| `reveal_artifact` | Reveals artifact by ID |
| `hide_artifact` | Hides artifact by ID |
| `reset_keypad` | Resets keypad to locked state |
| `reset_riddle` | Resets riddle for new attempts |
| `send_hint` | Reveals next hint in container |
| `reset_scan_gate` | Resets QR gate state |
| `reset_hotspot_hunt` | Resets hotspot found state |
| `reset_tile_puzzle` | Resets tile puzzle to shuffled |
| `reset_cipher` | Resets cipher decoder |
| `reset_prop` | Resets prop confirmation |
| `reset_location` | Resets location check |
| `reset_logic_grid` | Resets logic grid cells |
| `reset_sound_meter` | Resets sound level meter |
| `increment_counter` | Increments counter by N |
| `reset_counter` | Resets counter to initial |
| `trigger_signal` | Triggers signal generator artifact |
| `time_bank_pause` | Pauses/resumes time bank |
| `time_bank_apply_delta` | Adds/removes seconds |

---

## 6. Links & Connections

Every artifact exists within a rich web of connections:

### 6.1 Structural Links

| Link | Direction | Purpose |
|---|---|---|
| `artifact → step` | Optional | Artifact is associated with a specific step |
| `artifact → phase` | Optional | Artifact is associated with a specific phase |
| `artifact → role` | Via variant | Role-private visibility scoping |
| `artifact → game` | Required | Parent game ownership |

### 6.2 Trigger Links

| Link | Direction | Purpose |
|---|---|---|
| `trigger.condition → artifact` | Input | Artifact state change fires trigger |
| `trigger.action → artifact` | Output | Trigger action modifies artifact |

Trigger conditions that reference artifacts:
`artifact_unlocked`, `keypad_correct`, `keypad_failed`, `riddle_correct`, `audio_acknowledged`, `multi_answer_complete`, `scan_verified`, `hint_requested`, `hotspot_found`, `hotspot_hunt_complete`, `tile_puzzle_complete`, `cipher_decoded`, `prop_confirmed`, `prop_rejected`, `location_verified`, `logic_grid_solved`, `sound_level_triggered`, `signal_generator_triggered`, `counter_reached`

### 6.3 Decision Links

| Link | Direction | Purpose |
|---|---|---|
| `decision → step` | Optional | Decision tied to step context |
| `decision → phase` | Optional | Decision tied to phase context |
| `trigger.action → decision` | Output | Trigger can unlock/lock decisions |

### 6.4 Gamification Links

| Link | Direction | Purpose |
|---|---|---|
| `artifact_solved → XP/coins` | Output | Puzzle completion rewards |
| `artifact_solved → achievement` | Output | Achievement unlocked |
| `time_bank → artifact` | Bidirectional | Time bank deductions/additions on artifact events |
| `signal → trigger → artifact` | Chain | Signal → trigger fires → artifact state change |

---

## 7. Telemetry Hooks

Every artifact interaction produces telemetry events for analytics:

| Hook | Trigger | Data |
|---|---|---|
| `artifact_revealed` | Director/trigger reveals | `{ artifactId, variantId, actorType, timestamp }` |
| `artifact_hidden` | Director/trigger hides | `{ artifactId, variantId, actorType, timestamp }` |
| `artifact_viewed` | Participant opens/scrolls to | `{ artifactId, participantId, timestamp, duration }` |
| `artifact_state_changed` | Puzzle state mutates | `{ artifactId, previousState, newState, timestamp }` |
| `puzzle_solved` | Correct answer/completion | `{ artifactId, participantId, attemptCount, timeToSolve }` |
| `puzzle_failed` | Max attempts exhausted | `{ artifactId, participantId, attemptCount }` |

---

## 8. Realtime Broadcast Contract

Artifact changes are broadcast to all session participants via Supabase Realtime:

```typescript
interface ArtifactBroadcast {
  type: 'artifact_update';
  payload: {
    action:
      | 'snapshot'           // Session artifacts snapshotted
      | 'variant_revealed'   // Variant made visible
      | 'variant_hidden'     // Variant hidden
      | 'variant_highlighted'// Variant highlighted (new)
      | 'variant_unhighlighted'// Highlight removed
      | 'assigned'           // Variant assigned to participant
      | 'unassigned';        // Assignment removed
    variant_id?: string;
  };
  timestamp: string;
  seq?: number;  // Monotonic DB-seq for dedup (see PLAY_UI_CONTRACT §5)
}
```

Participants use `seq` to reject stale/duplicate events. `state_change` events with forward progress override stale seq.

---

## 9. Edge Cases

| Scenario | Behaviour |
|---|---|
| **Late join** | Participant receives current snapshot state — all currently revealed artifacts |
| **Reconnect** | 60s recovery poll re-fetches authoritative state; `onReconnect` immediately refreshes artifacts |
| **Multi-device** | Same participant on multiple devices: all devices receive same broadcast events |
| **Offline** | Puzzle state is local-optimistic; reconciles on reconnect |
| **Director disconnects** | Triggers continue operating server-side; manual actions queue until reconnect |
| **Concurrent reveal** | DB-seq prevents race conditions; last-write-wins with monotonic ordering |
| **Role change mid-session** | Role-private variants rechecked on next artifact fetch |
| **Version mismatch** | Snapshot is frozen at session start — game edits don't affect running sessions |

---

## 10. Database Tables Reference

| Table | Purpose | Layer |
|---|---|---|
| `game_artifacts` | Author-time artifact definitions | Game Builder |
| `game_artifact_variants` | Author-time variant definitions | Game Builder |
| `session_artifacts` | Snapshot of artifacts (V1) | Session Runtime |
| `session_artifact_variants` | Snapshot of variants + reveal state (V1) | Session Runtime |
| `session_artifact_assignments` | Variant→Participant assignments (V1) | Session Runtime |
| `session_artifact_state` | Runtime puzzle/keypad/counter state (V2) | Session Runtime |
| `session_artifact_variant_state` | Reveal/highlight state (V2) | Session Runtime |
| `session_artifact_variant_assignments_v2` | Variant→Participant assignments (V2) | Session Runtime |

---

*This contract is enforced by guardrail tests. See PLAY_UI_CONTRACT.md for structural rules.*
