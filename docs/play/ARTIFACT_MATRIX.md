# Artifact Matrix — Coverage Table

> 100% coverage tracker: every artifact type × every capability dimension.
> Rows = artifact types. Columns = requirements.
> ✅ = implemented, 🔲 = needed but missing, ➖ = not applicable, 🟡 = partial.

## Metadata

- Owner: -
- Status: draft
- Date: 2026-02-27
- Last updated: 2026-03-21
- Last validated: -

> Draft coverage matrix for artifact capabilities and implementation gaps across director and participant flows.

**Version:** 1.0

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Fully implemented and tested |
| 🟡 | Partially implemented or needs verification |
| 🔲 | Required but not yet built |
| ➖ | Not applicable for this artifact type |
| 🔴 | Blocked / has known issue |

---

## 1. Director Actions Matrix

| Artifact Type | Reveal | Hide | Highlight | Reset | Batch | Pin/Stage | Assign | Notes | History |
|---|---|---|---|---|---|---|---|---|---|
| `card` | ✅ | ✅ | ✅ | ➖ | ✅ | 🔲 | 🔲 | 🔲 | 🔲 |
| `document` | ✅ | ✅ | ✅ | ➖ | ✅ | 🔲 | 🔲 | 🔲 | 🔲 |
| `image` | ✅ | ✅ | ✅ | ➖ | ✅ | 🔲 | 🔲 | 🔲 | 🔲 |
| `conversation_cards_collection` | ✅ | ✅ | ➖ | ➖ | 🟡 | 🔲 | ➖ | 🔲 | 🔲 |
| `keypad` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🟡 |
| `riddle` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🟡 |
| `multi_answer` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `audio` | ✅ | ✅ | ➖ | ➖ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `hotspot` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `tile_puzzle` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `cipher` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `logic_grid` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `counter` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `qr_gate` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `hint_container` | ✅ | ✅ | ➖ | ➖ | 🟡 | 🔲 | ➖ | 🔲 | 🔲 |
| `prop_confirmation` | ✅ | ✅ | ➖ | ✅ | 🟡 | 🔲 | ➖ | 🔲 | 🔲 |
| `location_check` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `sound_level` | ✅ | ✅ | ➖ | ✅ | ✅ | 🔲 | ➖ | 🔲 | 🔲 |
| `replay_marker` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ | ✅ |
| `signal_generator` | ✅ | ✅ | ➖ | ➖ | 🟡 | 🔲 | ➖ | 🔲 | 🔲 |
| `time_bank_step` | ✅ | ✅ | ➖ | ➖ | 🟡 | 🔲 | ➖ | 🔲 | 🔲 |
| `empty_artifact` | ✅ | ✅ | ➖ | ➖ | ➖ | 🔲 | ➖ | 🔲 | 🔲 |

### Gaps — Director Actions
- **Pin/Stage**: No artifact can currently be "pinned" to the director stage panel for quick reference. Needed for live facilitation.
- **Assign**: Variant→participant assignment UI exists in DB schema but no director UI for manual assignment.
- **Private Notes**: Director cannot annotate artifacts with private notes during a session.
- **History**: No per-artifact history timeline (when revealed, by whom, state changes).

---

## 2. Participant Actions Matrix

| Artifact Type | View | Expand | Collect | Submit | Interact | Feedback | Progress |
|---|---|---|---|---|---|---|---|
| `card` | ✅ | ✅ | 🔲 | ➖ | ➖ | ➖ | ➖ |
| `document` | ✅ | ✅ | 🔲 | ➖ | ➖ | ➖ | ➖ |
| `image` | ✅ | ✅ | 🔲 | ➖ | 🔲 zoom | ➖ | ➖ |
| `conversation_cards_collection` | ✅ | ✅ | ➖ | ➖ | ✅ navigate | ➖ | ✅ |
| `keypad` | ✅ | ✅ | ➖ | ✅ code | ➖ | ✅ haptic | ✅ attempts |
| `riddle` | ✅ | ✅ | ➖ | ✅ answer | ➖ | ✅ haptic | ✅ attempts |
| `multi_answer` | ✅ | ✅ | ➖ | ✅ check | ➖ | ➖ | ✅ checklist |
| `audio` | ✅ | ✅ | ➖ | ✅ ack | ✅ play | ➖ | ✅ playback |
| `hotspot` | ✅ | ✅ | ➖ | ➖ | ✅ tap | ✅ haptic | ✅ found/total |
| `tile_puzzle` | ✅ | ✅ | ➖ | ➖ | ✅ slide | ➖ | ✅ moves |
| `cipher` | ✅ | ✅ | ➖ | ➖ | ✅ decode | ➖ | ✅ chars |
| `logic_grid` | ✅ | ✅ | ➖ | ➖ | ✅ mark | ➖ | ✅ cells |
| `counter` | ✅ | ✅ | ➖ | ✅ inc | ➖ | ➖ | ✅ value/target |
| `qr_gate` | ✅ | ✅ | ➖ | ✅ scan | ✅ camera | ➖ | ✅ verified |
| `hint_container` | ✅ | ✅ | ➖ | ✅ request | ➖ | ➖ | ✅ hints |
| `prop_confirmation` | ✅ | ✅ | ➖ | ✅ photo | ✅ camera | ➖ | ✅ status |
| `location_check` | ✅ | ✅ | ➖ | ✅ verify | ✅ GPS | ➖ | ✅ distance |
| `sound_level` | ✅ | ✅ | ➖ | ➖ | ✅ mic | ➖ | ✅ level |
| `replay_marker` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `signal_generator` | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `time_bank_step` | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ✅ timer |
| `empty_artifact` | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |

### Gaps — Participant Actions
- **Collect**: No "My Artifacts" collection bag/inventory for participants (DB supports assignments but no UI).
- **Image zoom**: No pinch-to-zoom or fullscreen image viewer for image artifacts.

---

## 3. States Matrix

| Artifact Type | hidden | revealed | locked | unlocked | solved | failed | highlighted |
|---|---|---|---|---|---|---|---|
| `card` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ |
| `document` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ |
| `image` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ✅ |
| `conversation_cards_collection` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `keypad` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ |
| `riddle` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ |
| `multi_answer` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `audio` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `hotspot` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `tile_puzzle` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `cipher` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `logic_grid` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `counter` | ✅ | ✅ | ➖ | ➖ | ✅ | ➖ | ➖ |
| `qr_gate` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `hint_container` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `prop_confirmation` | ✅ | ✅ | ➖ | ➖ | ✅ approved | ✅ rejected | ➖ |
| `location_check` | ✅ | ✅ | ✅ | ✅ | ✅ | ➖ | ➖ |
| `sound_level` | ✅ | ✅ | ✅ | ✅ | ✅ triggered | ➖ | ➖ |
| `replay_marker` | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `signal_generator` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `time_bank_step` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |
| `empty_artifact` | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | ➖ |

---

## 4. Inputs / Outputs Matrix

| Artifact Type | Inputs (receives) | Outputs (produces) |
|---|---|---|
| `card` | Reveal/hide events | View telemetry |
| `document` | Reveal/hide events | View telemetry |
| `image` | Reveal/hide events | View telemetry |
| `conversation_cards_collection` | Reveal event, collection data | Card navigation events |
| `keypad` | Code submission | `keypad_correct` / `keypad_failed` trigger events |
| `riddle` | Answer submission | `riddle_correct` trigger event, hint reveal |
| `multi_answer` | Item check | `multi_answer_complete` trigger event |
| `audio` | Play command | `audio_acknowledged` trigger event |
| `hotspot` | Tap coordinates | `hotspot_found` / `hotspot_hunt_complete` trigger events |
| `tile_puzzle` | Tile move | `tile_puzzle_complete` trigger event |
| `cipher` | Character decode | `cipher_decoded` trigger event |
| `logic_grid` | Cell mark | `logic_grid_solved` trigger event |
| `counter` | Increment/decrement | `counter_reached` trigger event |
| `qr_gate` | QR scan data | `scan_verified` trigger event |
| `hint_container` | Hint request | `hint_requested` trigger event, time bank penalty |
| `prop_confirmation` | Photo submission | `prop_confirmed` / `prop_rejected` trigger events |
| `location_check` | GPS/QR data | `location_verified` trigger event |
| `sound_level` | Mic level data | `sound_level_triggered` trigger event |
| `replay_marker` | Manual add | `replay_marker_added` trigger event |
| `signal_generator` | Trigger fire | `signal_generator_triggered` event, outbound signal |
| `time_bank_step` | Time delta | `time_bank_expired` trigger event |
| `empty_artifact` | *(none)* | *(none)* |

---

## 5. Placement Matrix

| Artifact Type | Director: Panel | Director: Stage | Participant: Drawer | Participant: Overlay | Board |
|---|---|---|---|---|---|
| `card` | ✅ artifact tab | 🔲 pinned | ✅ | ➖ | 🔲 |
| `document` | ✅ artifact tab | 🔲 pinned | ✅ | ➖ | ➖ |
| `image` | ✅ artifact tab | 🔲 pinned | ✅ | ➖ | 🔲 |
| `conversation_cards_collection` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `keypad` | ✅ artifact tab | 🔲 pinned | ✅ | ➖ | ➖ |
| `riddle` | ✅ artifact tab | 🔲 pinned | ✅ | ➖ | ➖ |
| `multi_answer` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `audio` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `hotspot` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `tile_puzzle` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `cipher` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `logic_grid` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `counter` | ✅ artifact tab | 🔲 stage widget | ✅ | ➖ | 🔲 |
| `qr_gate` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `hint_container` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `prop_confirmation` | ✅ dedicated panel | ➖ | ✅ | ➖ | ➖ |
| `location_check` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `sound_level` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| `replay_marker` | ✅ timeline | ➖ | ➖ | ➖ | ➖ |
| `signal_generator` | ✅ signal tab | ➖ | ✅ micro | ➖ | ➖ |
| `time_bank_step` | ✅ time tab | ➖ | ✅ display | ➖ | 🔲 |
| `empty_artifact` | ✅ artifact tab | ➖ | ✅ | ➖ | ➖ |
| **Decisions** | ✅ dedicated panel | 🔲 pinned | ✅ drawer | ✅ modal (blocking) | 🔲 |
| **Outcomes** | ✅ dedicated panel | ➖ | 🔲 | 🔲 reveal overlay | 🔲 |

### Gaps — Placement
- **Director Stage pinning**: High-priority artifacts should be pinnable to the director stage for quick glance during facilitation.
- **Board projection**: Counters, timers, and select card content should be projectable to the board view.
- **Outcome participant view**: Participants lack an outcome reveal experience.

---

## 6. Edge Cases Matrix

| Scenario | Handled? | Where | Notes |
|---|---|---|---|
| **Offline** | 🟡 | `PuzzleArtifactRenderer` | Local-optimistic for puzzles; standard artifacts no offline |
| **Reconnect** | ✅ | `ParticipantPlayView.onReconnect` | Re-fetches artifacts + decisions on channel recovery |
| **Multi-device** | ✅ | Broadcast layer | Same broadcast to all device instances |
| **Late join** | ✅ | Session state fetch | Gets current snapshot state |
| **Rate limit** | ✅ | `requestRateMonitor.ts` | Play API rate limiting |
| **Concurrent reveal** | ✅ | DB-seq + broadcast | Monotonic sequence prevents duplication |
| **Role change mid-session** | 🟡 | Server-side | Role-private variants rechecked on fetch; no push |
| **Version mismatch** | ✅ | Snapshot model | Frozen at session start |
| **Participant kicked** | 🟡 | `participant_left` event | Drawer/overlay may still render briefly |
| **Session ended during puzzle** | 🟡 | `isEnded` guard | Blocking overlays auto-dismiss; puzzle input disabled |
| **Empty artifacts list** | ✅ | Empty state in drawer/panel | Appropriate empty states shown |
| **Rapid toggle** | ✅ | `useDrawerDiscipline` | Prevents drawer flickering |
| **Browser permissions** | 🟡 | Per-puzzle | Camera (QR), GPS (location), Mic (sound) — permission flows vary |
| **Accessibility** | 🟡 | Per-component | Some puzzles lack screen reader support |

---

## 7. Trigger Integration Matrix

| Artifact Type | Can Fire Trigger? | Condition Types | Can Be Target of Action? | Action Types |
|---|---|---|---|---|
| `card` | ✅ | `artifact_unlocked` | ✅ | `reveal_artifact`, `hide_artifact` |
| `document` | ✅ | `artifact_unlocked` | ✅ | `reveal_artifact`, `hide_artifact` |
| `image` | ✅ | `artifact_unlocked` | ✅ | `reveal_artifact`, `hide_artifact` |
| `conversation_cards_collection` | ✅ | `artifact_unlocked` | ✅ | `reveal_artifact`, `hide_artifact` |
| `keypad` | ✅ | `keypad_correct`, `keypad_failed` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_keypad` |
| `riddle` | ✅ | `riddle_correct` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_riddle` |
| `multi_answer` | ✅ | `multi_answer_complete` | ✅ | `reveal_artifact`, `hide_artifact` |
| `audio` | ✅ | `audio_acknowledged` | ✅ | `reveal_artifact`, `hide_artifact` |
| `hotspot` | ✅ | `hotspot_found`, `hotspot_hunt_complete` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_hotspot_hunt` |
| `tile_puzzle` | ✅ | `tile_puzzle_complete` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_tile_puzzle` |
| `cipher` | ✅ | `cipher_decoded` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_cipher` |
| `logic_grid` | ✅ | `logic_grid_solved` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_logic_grid` |
| `counter` | ✅ | `counter_reached` | ✅ | `reveal_artifact`, `hide_artifact`, `increment_counter`, `reset_counter` |
| `qr_gate` | ✅ | `scan_verified` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_scan_gate` |
| `hint_container` | ✅ | `hint_requested` | ✅ | `reveal_artifact`, `hide_artifact`, `send_hint` |
| `prop_confirmation` | ✅ | `prop_confirmed`, `prop_rejected` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_prop` |
| `location_check` | ✅ | `location_verified` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_location` |
| `sound_level` | ✅ | `sound_level_triggered` | ✅ | `reveal_artifact`, `hide_artifact`, `reset_sound_meter` |
| `replay_marker` | ✅ | `replay_marker_added` | ➖ | `add_replay_marker` |
| `signal_generator` | ✅ | `signal_generator_triggered` | ✅ | `trigger_signal` |
| `time_bank_step` | ✅ | `time_bank_expired` | ✅ | `time_bank_apply_delta`, `time_bank_pause` |
| `empty_artifact` | ➖ | ➖ | ✅ | `reveal_artifact`, `hide_artifact` |

---

## 8. Priority Gap Summary

### P0 — Required for Director Mode MVP
| Gap | Impact | Effort |
|---|---|---|
| Artifact pin/stage | Director can't keep key artifacts visible during facilitation | Medium |
| Per-artifact history | No audit trail visible in UI | Medium |
| Outcome participant view | Participants can't see session outcomes | Low |

### P1 — Required for Complete Participant Experience
| Gap | Impact | Effort |
|---|---|---|
| Participant "My Artifacts" collection | No personal inventory | Medium |
| Image fullscreen/zoom | Poor image artifact UX | Low |
| Board projection for counters/timers | Board lacks dynamic content | Medium |

### P2 — Nice to Have
| Gap | Impact | Effort |
|---|---|---|
| Director private notes on artifacts | Host notes lost between sessions | Low |
| Variant→participant assignment UI | DB supports it, no UI | Medium |
| Accessibility audit for all puzzles | Screen reader gaps | High |
| Offline puzzle state persistence | Puzzle progress lost on disconnect | Medium |
| Browser permission pre-check | Camera/GPS/Mic permission UX varies | Medium |

---

*This matrix should be reviewed after each sprint. Update status symbols as features are implemented.*
