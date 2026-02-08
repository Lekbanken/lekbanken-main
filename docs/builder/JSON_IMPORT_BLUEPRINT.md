# JSON Import Blueprint — Lekbanken (Legendary Games)

**Version:** 1.0  
**Datum:** 2026-02-04  
**Status:** CANONICAL SPECIFICATION  
**SSoT Modules:**
- [types/csv-import.ts](../../types/csv-import.ts) — ParsedGame, ParsedTrigger, ParsedArtifact
- [types/trigger.ts](../../types/trigger.ts) — TriggerCondition, TriggerAction
- [types/games.ts](../../types/games.ts) — ArtifactType, PlayMode, PhaseType, etc.
- [lib/import/metadataSchemas.ts](../../lib/import/metadataSchemas.ts) — Artifact metadata normalization/validation
- [lib/import/trigger-normalization.ts](../../lib/import/trigger-normalization.ts) — Trigger SSoT normalization
- [lib/import/preflight-validation.ts](../../lib/import/preflight-validation.ts) — Fail-fast validation

---

## 1. Overview

This document is the **canonical specification** for the JSON import format used by:
- `POST /api/games/csv-import?format=json`
- `parseGamesFromJsonPayload()` in `features/admin/games/utils/json-game-import.ts`

The import format is a JSON array of game objects. Each game object contains core metadata plus optional nested arrays for steps, phases, roles, artifacts, triggers, etc.

---

## 2. Top-Level Structure

```json
[
  { /* Game 1 */ },
  { /* Game 2 */ },
  ...
]
```

Each game is a `ParsedGame` object (see Section 3).

---

## 3. Game Object Schema

### 3.1 Core Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `game_key` | `string` | ✅ | - | Unique key for upsert matching |
| `name` | `string` | ✅ | - | Display name |
| `short_description` | `string` | ✅ | - | One-line summary (max 200 chars) |
| `description` | `string \| null` | ❌ | `null` | Long description (Markdown OK) |
| `play_mode` | `"basic" \| "facilitated" \| "participants"` | ❌ | `"basic"` | Game mode |
| `status` | `"draft" \| "published"` | ❌ | `"draft"` | Publication status |
| `locale` | `string \| null` | ❌ | `null` | ISO locale (e.g., `"sv"`, `"en"`) |

### 3.2 Metadata Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `energy_level` | `"low" \| "medium" \| "high" \| null` | ❌ | `null` | Activity level |
| `location_type` | `"indoor" \| "outdoor" \| "both" \| null` | ❌ | `null` | Location requirement |
| `time_estimate_min` | `number \| null` | ❌ | `null` | Minutes (minimum) |
| `duration_max` | `number \| null` | ❌ | `null` | Minutes (maximum) |
| `min_players` | `number \| null` | ❌ | `null` | Minimum players |
| `max_players` | `number \| null` | ❌ | `null` | Maximum players |
| `players_recommended` | `number \| null` | ❌ | `null` | Recommended player count |
| `age_min` | `number \| null` | ❌ | `null` | Minimum age |
| `age_max` | `number \| null` | ❌ | `null` | Maximum age |
| `difficulty` | `string \| null` | ❌ | `null` | Difficulty label |
| `accessibility_notes` | `string \| null` | ❌ | `null` | Accessibility info |
| `space_requirements` | `string \| null` | ❌ | `null` | Space needed |
| `leader_tips` | `string \| null` | ❌ | `null` | Tips for facilitator |

### 3.3 Reference Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `main_purpose_id` | `string \| null` | ❌ | `null` | Primary purpose UUID |
| `sub_purpose_ids` | `string[]` | ❌ | `[]` | Secondary purpose UUIDs |
| `product_id` | `string \| null` | ❌ | `null` | Product bundle UUID |
| `owner_tenant_id` | `string \| null` | ❌ | `null` | Tenant UUID (admin-only) |

### 3.4 Nested Data

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `steps` | `ParsedStep[]` | ❌ | Game steps (Section 4) |
| `phases` | `ParsedPhase[]` | ❌ | Phase definitions (Section 5) |
| `roles` | `ParsedRole[]` | ❌ | Role definitions (Section 6) |
| `materials` | `ParsedMaterials \| null` | ❌ | Materials list (Section 7) |
| `boardConfig` | `ParsedBoardConfig \| null` | ❌ | Board display config (Section 8) |
| `artifacts` | `ParsedArtifact[]` | ❌ | Artifacts/puzzles (Section 9) |
| `triggers` | `ParsedTrigger[]` | ❌ | Automation rules (Section 10) |
| `decisions` | `object` | ❌ | Poll/vote definitions (future) |
| `outcomes` | `object` | ❌ | Decision outcomes (future) |

---

## 4. Steps (`ParsedStep[]`)

Each step represents a discrete moment in the game.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `step_order` | `number` | ✅ | - | 1-based order (must be unique) |
| `title` | `string` | ✅ | - | Step title |
| `body` | `string` | ✅ | - | Instructions/content |
| `duration_seconds` | `number \| null` | ❌ | `null` | Suggested duration |
| `leader_script` | `string \| null` | ❌ | `null` | Facilitator script |
| `participant_prompt` | `string \| null` | ❌ | `null` | Participant view text |
| `board_text` | `string \| null` | ❌ | `null` | Board display text |
| `optional` | `boolean` | ❌ | `false` | Whether step is skippable |
| `phase_order` | `number \| null` | ❌ | `null` | Reference to phase by order (resolved to `phase_id` during preflight) |
| `phase_id` | `string \| null` | ❌ | `null` | Direct phase UUID (mutually exclusive with `phase_order`) |

### Step-to-Phase Linkage

Steps can optionally be grouped under phases using **one of two methods**:

1. **By `phase_order`** (recommended): Reference the phase by its `phase_order` value.
   - Preflight validation resolves this to the actual `phase_id` (UUID).
   - Fails if the referenced `phase_order` doesn't exist.

2. **By `phase_id`**: Direct UUID reference.
   - Must be a valid UUID format.
   - Typically used when re-importing with known UUIDs.

**Rules:**
- **Only one may be specified**: If both `phase_id` and `phase_order` are present → `STEP_PHASE_REF_BOTH_PRESENT` error.
- **If neither is specified**: Step belongs to no phase (`phase_id` = `null`).
- **Invalid phase_order**: If `phase_order` references a non-existent phase → `STEP_PHASE_ORDER_NOT_FOUND` error.

### Preflight Validation
- **DUPLICATE_STEP_ORDER**: Each `step_order` must be unique within the game.
- **STEP_PHASE_REF_BOTH_PRESENT**: Cannot specify both `phase_id` and `phase_order`.
- **STEP_PHASE_ORDER_NOT_FOUND**: Referenced `phase_order` does not exist in phases array.
- **STEP_PHASE_ORDER_INVALID**: `phase_order` must be a positive integer.
- **STEP_PHASE_ID_INVALID**: `phase_id` must be a valid UUID format.

### Example: Steps with Phase Linkage

```json
{
  "phases": [
    { "phase_order": 1, "name": "Introduction", "phase_type": "intro", ... },
    { "phase_order": 2, "name": "Main Activity", "phase_type": "main", ... }
  ],
  "steps": [
    { "step_order": 1, "title": "Welcome", "phase_order": 1, ... },
    { "step_order": 2, "title": "Setup", "phase_order": 1, ... },
    { "step_order": 3, "title": "Challenge 1", "phase_order": 2, ... },
    { "step_order": 4, "title": "Challenge 2", "phase_order": 2, ... }
  ]
}
```

---

## 5. Phases (`ParsedPhase[]`)

Phases group steps and control timer/display.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `phase_order` | `number` | ✅ | - | 1-based order (must be unique) |
| `name` | `string` | ✅ | - | Phase name |
| `phase_type` | `PhaseType` | ✅ | - | See below |
| `duration_seconds` | `number \| null` | ❌ | `null` | Phase timer duration |
| `timer_visible` | `boolean` | ❌ | `false` | Show timer on board |
| `timer_style` | `TimerStyle` | ❌ | `"countdown"` | See below |
| `description` | `string \| null` | ❌ | `null` | Phase description |
| `board_message` | `string \| null` | ❌ | `null` | Board display message |
| `auto_advance` | `boolean` | ❌ | `false` | Auto-advance when timer ends |

### PhaseType Enum
```typescript
type PhaseType = 'intro' | 'round' | 'finale' | 'break';
```

### TimerStyle Enum
```typescript
type TimerStyle = 'countdown' | 'elapsed' | 'trafficlight';
```

### Preflight Validation
- **DUPLICATE_PHASE_ORDER**: Each `phase_order` must be unique within the game.

---

## 6. Roles (`ParsedRole[]`)

Roles define player types for facilitated/participants modes.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `role_order` | `number` | ✅ | - | 1-based order (must be unique) |
| `name` | `string` | ✅ | - | Role name |
| `icon` | `string \| null` | ❌ | `null` | Emoji icon |
| `color` | `string \| null` | ❌ | `null` | Hex color (e.g., `"#FF5733"`) |
| `public_description` | `string \| null` | ❌ | `null` | Visible to all players |
| `private_instructions` | `string` | ✅ | - | Only visible to role holder |
| `private_hints` | `string \| null` | ❌ | `null` | Role-specific hints |
| `min_count` | `number` | ❌ | `1` | Minimum players with role |
| `max_count` | `number \| null` | ❌ | `null` | Maximum (null = unlimited) |
| `assignment_strategy` | `AssignmentStrategy` | ❌ | `"random"` | See below |
| `scaling_rules` | `Record<string, number> \| null` | ❌ | `null` | Role scaling by player count |
| `conflicts_with` | `string[]` | ❌ | `[]` | Conflicting role names |

### AssignmentStrategy Enum
```typescript
type AssignmentStrategy = 'random' | 'leader_picks' | 'player_picks';
```

### Preflight Validation
- **DUPLICATE_ROLE_ORDER**: Each `role_order` must be unique within the game.

---

## 7. Materials (`ParsedMaterials`)

Physical materials needed to run the game.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `string[]` | ✅ | - | List of material names |
| `safety_notes` | `string \| null` | ❌ | `null` | Safety warnings |
| `preparation` | `string \| null` | ❌ | `null` | Prep instructions |

---

## 8. Board Config (`ParsedBoardConfig`)

Display configuration for the projection board/wall.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `show_game_name` | `boolean` | ❌ | `true` | Show game title |
| `show_current_phase` | `boolean` | ❌ | `true` | Show current phase |
| `show_timer` | `boolean` | ❌ | `true` | Show countdown/timer |
| `show_participants` | `boolean` | ❌ | `false` | Show participant list |
| `show_public_roles` | `boolean` | ❌ | `false` | Show public role info |
| `show_leaderboard` | `boolean` | ❌ | `false` | Show scores |
| `show_qr_code` | `boolean` | ❌ | `true` | Show join QR code |
| `welcome_message` | `string \| null` | ❌ | `null` | Lobby message |
| `theme` | `BoardTheme` | ❌ | `"neutral"` | See below |
| `background_color` | `string \| null` | ❌ | `null` | Hex color |
| `layout_variant` | `BoardLayout` | ❌ | `"standard"` | See below |

### BoardTheme Enum
```typescript
type BoardTheme = 'mystery' | 'party' | 'sport' | 'nature' | 'neutral';
```

### BoardLayout Enum
```typescript
type BoardLayout = 'standard' | 'fullscreen';
```

---

## 9. Artifacts (`ParsedArtifact[]`)

Artifacts are interactive elements: puzzles, cards, hints, etc.

### 9.1 Artifact Structure

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `artifact_order` | `number` | ✅ | - | 1-based order (must be unique) |
| `artifact_type` | `ArtifactType` | ✅ | - | See Section 9.2 |
| `title` | `string` | ✅ | - | Display title |
| `description` | `string \| null` | ❌ | `null` | Description |
| `locale` | `string \| null` | ❌ | `null` | ISO locale |
| `tags` | `string[]` | ❌ | `[]` | Searchable tags |
| `metadata` | `object \| null` | ❌ | `null` | Type-specific config (Section 9.3) |
| `variants` | `ParsedArtifactVariant[]` | ❌ | `[]` | Content variants |

### 9.2 ArtifactType Enum

All supported artifact types (from [types/games.ts](../../types/games.ts)):

```typescript
type ArtifactType =
  // Basic content
  | 'card'          // Rich text card
  | 'document'      // Document viewer
  | 'image'         // Image display
  // Toolbelt
  | 'conversation_cards_collection'  // Card deck
  // Code & Input puzzles
  | 'keypad'        // PIN entry
  | 'riddle'        // Text answer puzzle
  | 'multi_answer'  // Checklist/multiple choice
  // Media & Interaction
  | 'audio'         // Audio player
  | 'hotspot'       // Image hotspot hunt
  | 'tile_puzzle'   // Sliding tile puzzle
  // Cryptography & Logic
  | 'cipher'        // Cipher decoder
  | 'logic_grid'    // Logic puzzle grid
  // Special mechanics
  | 'counter'       // Increment counter
  | 'qr_gate'       // QR/barcode scanner
  | 'hint_container'// Progressive hints
  | 'prop_confirmation' // Physical prop check
  | 'location_check'// GPS/QR location verify
  | 'sound_level'   // Sound meter trigger
  | 'replay_marker' // Session replay marker
  // Session Cockpit
  | 'signal_generator'  // Emit signals
  | 'time_bank_step'    // Time bank control
  | 'empty_artifact';   // Placeholder
```

### 9.3 Artifact Metadata Schemas

Each artifact type has specific metadata requirements. The import system normalizes legacy field names (aliases) and validates required fields.

#### 9.3.1 Keypad

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `correctCode` | `string` | ✅ HARD | - | The correct PIN code |
| `codeLength` | `number` | ❌ | - | Expected code length |
| `maxAttempts` | `number \| null` | ❌ | `null` | Max attempts before lock |
| `lockOnFail` | `boolean` | ❌ | `false` | Lock after max attempts |
| `successMessage` | `string` | ❌ | - | Message on correct entry |
| `failMessage` | `string` | ❌ | - | Message on wrong entry |
| `lockedMessage` | `string` | ❌ | - | Message when locked |

#### 9.3.2 Riddle

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `correctAnswers` | `string[]` | ✅ HARD | - | `acceptedAnswers`, `correctAnswer` (string) |
| `promptText` | `string` | ❌ | `""` | `prompt` |
| `normalizeMode` | `"exact" \| "fuzzy" \| "loose"` | ❌ | `"fuzzy"` | - |
| `maxAttempts` | `number \| null` | ❌ | `null` | - |
| `hintText` | `string` | ❌ | - | - |
| `showHintAfterAttempts` | `number` | ❌ | - | - |

#### 9.3.3 Counter

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `target` | `number` | ✅ HARD (policy) | - | Target value to reach |
| `step` | `number` | ❌ | `1` | Increment per click |
| `initialValue` | `number` | ❌ | `0` | Starting value |
| `label` | `string` | ❌ | `"Räknare"` | Display label |

#### 9.3.4 Multi-Answer

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `items` | `string[]` | ✅ HARD | - | List of items to check |
| `checks` | `object[]` | ❌ | - | Detailed check config |
| `requiredCount` | `number` | ❌ | - | Required items to check |
| `requireAll` | `boolean` | ❌ | `true` | All items required |
| `showProgress` | `boolean` | ❌ | `true` | Show progress indicator |

#### 9.3.5 QR Gate

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `expectedValue` | `string` | ✅ HARD | - | `correctAnswer` |
| `mode` | `"qr" \| "barcode" \| "manual"` | ❌ | `"qr"` | - |
| `promptText` | `string` | ❌ | `"Skanna QR-kod"` | `instruction` |
| `allowedValues` | `string[]` | ❌ | - | Alternative correct values |
| `fallbackCode` | `string` | ❌ | - | Manual fallback code |
| `allowManualFallback` | `boolean` | ❌ | `true` | Allow manual entry |

#### 9.3.6 Hint Container

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `hints` | `HintItem[]` | ✅ QUALITY_GATE | - | Array of hints |
| `penaltyPerHint` | `number` | ❌ | `0` | Seconds penalty per hint |
| `maxHints` | `number` | ❌ | - | Max hints available |
| `cooldownSeconds` | `number` | ❌ | `0` | Cooldown between hints |

```typescript
type HintItem = { id?: string; text: string; penaltySeconds?: number };
// Legacy: string[] is auto-converted to HintItem[]
```

#### 9.3.7 Hotspot

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `hotspots` | `HotspotZone[]` | ✅ HARD | - | `zones` |
| `imageUrl` | `string` | ⚠️ WARN | - | - |
| `imageArtifactId` | `string` | ❌ | `""` | - |
| `showProgress` | `boolean` | ❌ | `true` | `showFeedback` |
| `hapticFeedback` | `boolean` | ❌ | `true` | - |
| `requireAll` | `boolean` | ❌ | `true` | - |

```typescript
type HotspotZone = {
  id: string;
  x: number; y: number;
  radius?: number; // default: 10
  label?: string;
  required?: boolean; // default: true
};
```

#### 9.3.8 Tile Puzzle

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `imageUrl` | `string` | ⚠️ WARN | - | - |
| `gridSize` | `"2x2" \| "3x3" \| "4x4" \| "3x2" \| "4x3"` | ❌ | `"3x3"` | `rows`+`cols` |
| `imageArtifactId` | `string` | ❌ | `""` | - |
| `showPreview` | `boolean` | ❌ | `false` | `allowPreview` |

#### 9.3.9 Cipher

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `encodedMessage` | `string` | ✅ QUALITY_GATE | - | `cipherText` |
| `expectedPlaintext` | `string` | ✅ QUALITY_GATE | - | `plaintext` |
| `cipherType` | `"caesar" \| "atbash" \| "substitution"` | ❌ | `"caesar"` | `cipherMethod` |
| `caesarShift` | `number` | ❌ | `3` | `cipherKey` |
| `substitutionMap` | `Record<string, string>` | ❌ | - | - |
| `showDecoderUI` | `boolean` | ❌ | `true` | `showDecoderHelper` |
| `normalizeMode` | `"exact" \| "fuzzy" \| "loose"` | ❌ | `"fuzzy"` | - |

#### 9.3.10 Logic Grid

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `categories` | `Category[]` | ✅ HARD | - | Grid categories |
| `clues` | `unknown[]` | ❌ | `[]` | Logic clues |
| `solution` | `unknown[]` | ❌ | `[]` | Solution matrix |
| `title` | `string` | ❌ | - | Puzzle title |

```typescript
type Category = { id: string; name: string; items: string[] };
```

#### 9.3.11 Prop Confirmation

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `propName` | `string` | ❌ | `"Föremål"` | `propDescription`, `instruction` |
| `propImageUrl` | `string` | ❌ | - | - |
| `propId` | `string` | ❌ | - | - |
| `instructions` | `string` | ❌ | `"Visa upp föremålet för spelledaren."` | `instruction` |
| `requirePhoto` | `boolean` | ❌ | `false` | - |

#### 9.3.12 Location Check

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `checkType` | `"gps" \| "qr" \| "manual"` | ✅ HARD (policy) | - | `method` |
| `latitude` | `number` | ✅ (if GPS) | - | - |
| `longitude` | `number` | ✅ (if GPS) | - | - |
| `radius` | `number` | ❌ | `50` | Meters |
| `locationName` | `string` | ❌ | `""` | - |
| `locationId` | `string` | ❌ | - | - |
| `qrCodeValue` | `string` | ❌ | - | `qrCode` |
| `showDistance` | `boolean` | ❌ | `true` | - |
| `showCompass` | `boolean` | ❌ | `true` | - |

#### 9.3.13 Sound Level

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `instructions` | `string` | ❌ | `"Gör ljud!"` | `instruction` |
| `triggerMode` | `"threshold" \| "peak" \| "sustained"` | ❌ | `"threshold"` | - |
| `thresholdLevel` | `number` | ❌ | `70` | `threshold` |
| `sustainDuration` | `number` | ❌ | `2` | `holdDuration` |
| `activityLabel` | `string` | ❌ | - | - |
| `showMeter` | `boolean` | ❌ | `true` | - |

#### 9.3.14 Audio

| Field | Type | Required | Default | Aliases |
|-------|------|----------|---------|---------|
| `audioUrl` | `string` | ⚠️ WARN | - | `src` |
| `autoPlay` | `boolean` | ❌ | `false` | `autoplay` |
| `loop` | `boolean` | ❌ | `false` | - |
| `requireAck` | `boolean` | ❌ | `false` | - |
| `showTranscript` | `boolean` | ❌ | `false` | - |
| `transcriptText` | `string` | ❌ | - | `transcript` |

#### 9.3.15 Conversation Cards Collection

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `conversation_card_collection_id` | `string` | ✅ HARD | - | Collection UUID |

#### 9.3.16-18 Signal Generator / Time Bank Step / Empty Artifact

These types pass through metadata without validation.

#### 9.3.19 Card / Document / Image

Static content types — no metadata validation.

### 9.4 Artifact Variants (`ParsedArtifactVariant[]`)

Variants allow role-specific or step-specific content.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `variant_order` | `number` | ✅ | - | Order within artifact |
| `visibility` | `"public" \| "leader_only" \| "role_private"` | ✅ | - | Who can see |
| `visible_to_role_id` | `string \| null` | ❌ | `null` | Role UUID (if role_private) |
| `visible_to_role_order` | `number \| null` | ❌ | `null` | Role order alias |
| `visible_to_role_name` | `string \| null` | ❌ | `null` | Role name alias |
| `title` | `string \| null` | ❌ | `null` | Variant title |
| `body` | `string \| null` | ❌ | `null` | Variant content |
| `media_ref` | `string \| null` | ❌ | `null` | Media asset reference |
| `metadata` | `object \| null` | ❌ | `null` | Variant-specific metadata |

### Preflight Validation
- **DUPLICATE_ARTIFACT_ORDER**: Each `artifact_order` must be unique within the game.

---

## 10. Triggers (`ParsedTrigger[]`)

Triggers are automation rules: "When X happens, do Y."

### 10.1 Trigger Structure

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | `string` | ✅ | - | Trigger name |
| `description` | `string \| null` | ❌ | `null` | Description |
| `enabled` | `boolean` | ❌ | `true` | Is trigger active |
| `condition` | `TriggerCondition` | ✅ | - | When to fire (Section 10.2) |
| `actions` | `TriggerAction[]` | ✅ | - | What to do (Section 10.3) |
| `execute_once` | `boolean` | ❌ | `false` | Only fire once |
| `delay_seconds` | `number` | ❌ | `0` | Delay before actions |
| `sort_order` | `number` | ❌ | - | Evaluation order |

### 10.2 Trigger Conditions

All conditions have a `type` field plus type-specific fields.

#### Canonical Format (REQUIRED)
```json
{
  "condition": {
    "type": "keypad_correct",
    "artifactOrder": 2
  }
}
```

#### Legacy Format (DEPRECATED but supported)
```json
{
  "condition_type": "keypad_correct",
  "condition_config": { "artifactOrder": 2 }
}
```

The server automatically normalizes legacy → canonical during import.

#### Condition Types

| Type | Required Fields | Aliases | Description |
|------|-----------------|---------|-------------|
| `manual` | - | - | Host button press |
| `step_started` | `stepId` or `stepOrder` | - | Step begins |
| `step_completed` | `stepId` or `stepOrder` | - | Step ends |
| `phase_started` | `phaseId` or `phaseOrder` | - | Phase begins |
| `phase_completed` | `phaseId` or `phaseOrder` | - | Phase ends |
| `artifact_unlocked` | `artifactId` or `artifactOrder` | - | Artifact revealed |
| `keypad_correct` | `keypadId` or `artifactOrder` | - | Correct code entered |
| `keypad_failed` | `keypadId` or `artifactOrder` | - | Max attempts reached |
| `timer_ended` | `timerId` | - | Timer runs out |
| `decision_resolved` | `decisionId`, `outcome?` | - | Vote completed |
| `signal_received` | `channel?` | - | Signal emitted |
| `counter_reached` | `counterKey`, `targetValue?` | - | Counter hits target |
| `riddle_correct` | `riddleId` or `artifactOrder` | - | Correct answer |
| `audio_acknowledged` | `audioId` | - | Audio acknowledged |
| `multi_answer_complete` | `multiAnswerId` | - | Checklist done |
| `scan_verified` | `scanGateId` | - | QR/NFC verified |
| `hint_requested` | `hintId?` | - | Hint revealed |
| `hotspot_found` | `hotspotHuntId`, `hotspotId?` | - | Hotspot clicked |
| `hotspot_hunt_complete` | `hotspotHuntId` | - | All hotspots found |
| `tile_puzzle_complete` | `tilePuzzleId` | - | Puzzle solved |
| `cipher_decoded` | `cipherId` | - | Cipher solved |
| `prop_confirmed` | `propId` | - | Prop confirmed |
| `prop_rejected` | `propId` | - | Prop rejected |
| `location_verified` | `locationId` | - | Location confirmed |
| `logic_grid_solved` | `gridId` | - | Grid solved |
| `sound_level_triggered` | `soundMeterId` | - | Sound threshold met |
| `replay_marker_added` | `markerType?` | - | Marker added |
| `time_bank_expired` | `timeBankId?` | - | Time bank empty |
| `signal_generator_triggered` | `signalGeneratorId`, `signalKey?` | - | Signal generated |

### 10.3 Trigger Actions

All actions have a `type` field plus type-specific fields.

| Type | Required Fields | Description |
|------|-----------------|-------------|
| `reveal_artifact` | `artifactId` or `artifactOrder` | Show hidden artifact |
| `hide_artifact` | `artifactId` or `artifactOrder` | Hide visible artifact |
| `unlock_decision` | `decisionId` | Enable voting |
| `lock_decision` | `decisionId` | Disable voting |
| `advance_step` | - | Move to next step |
| `advance_phase` | - | Move to next phase |
| `start_timer` | `duration`, `name` | Start countdown |
| `send_message` | `message`, `style?` | Post to board |
| `send_signal` | `channel`, `message` | Emit signal |
| `time_bank_apply_delta` | `deltaSeconds`, `reason` | Add/remove time |
| `play_sound` | `soundId` | Play audio |
| `show_countdown` | `duration`, `message` | Overlay countdown |
| `reset_keypad` | `keypadId` | Reset keypad state |
| `increment_counter` | `counterKey`, `amount?` | Add to counter |
| `reset_counter` | `counterKey` | Reset counter |
| `reset_riddle` | `riddleId` | Reset riddle |
| `send_hint` | `hintId`, `skipCooldown?` | Reveal hint |
| `reset_scan_gate` | `scanGateId` | Reset QR gate |
| `reset_hotspot_hunt` | `hotspotHuntId` | Reset hotspots |
| `reset_tile_puzzle` | `tilePuzzleId` | Reset puzzle |
| `reset_cipher` | `cipherId` | Reset cipher |
| `reset_prop` | `propId` | Reset prop |
| `reset_location` | `locationId` | Reset location |
| `reset_logic_grid` | `gridId` | Reset grid |
| `reset_sound_meter` | `soundMeterId` | Reset sound meter |
| `add_replay_marker` | `markerType`, `label` | Add marker |
| `show_leader_script` | `stepId?`, `customScript?`, `autoDismissSeconds?` | Show script |
| `trigger_signal` | `signalGeneratorId` | Trigger generator |
| `time_bank_pause` | `pause`, `timeBankId?` | Pause/resume time |

### 10.4 Order Aliases

For portable JSON, use `*Order` aliases instead of UUIDs:

| Alias | Resolves To | Example |
|-------|-------------|---------|
| `stepOrder` | `stepId` (UUID) | `"stepOrder": 1` → step_order=1 |
| `phaseOrder` | `phaseId` (UUID) | `"phaseOrder": 2` → phase_order=2 |
| `artifactOrder` | `artifactId` (UUID) | `"artifactOrder": 3` → artifact_order=3 |

The import system resolves these aliases to UUIDs during import.

### Trigger Validation Errors

| Code | Meaning |
|------|---------|
| `TRIGGER_INVALID_FORMAT` | Trigger object malformed |
| `TRIGGER_MISSING_CONDITION_TYPE` | Missing `condition.type` |
| `TRIGGER_ACTION_INVALID` | Action missing `type` |
| `TRIGGER_REF_INVALID` | Referenced entity not found |
| `TRIGGER_NORMALIZATION_FAILED` | Legacy format conversion failed |

---

## 11. Preflight Validation

Before writing to DB, the import system runs preflight validation (fail-fast):

### 11.1 Duplicate Order Checks

| Check | Error Code | Description |
|-------|------------|-------------|
| Step orders | `DUPLICATE_STEP_ORDER` | `step_order` must be unique |
| Phase orders | `DUPLICATE_PHASE_ORDER` | `phase_order` must be unique |
| Artifact orders | `DUPLICATE_ARTIFACT_ORDER` | `artifact_order` must be unique |
| Role orders | `DUPLICATE_ROLE_ORDER` | `role_order` must be unique |

### 11.2 Trigger Normalization

1. Convert legacy `condition_type` + `condition_config` → canonical `condition: { type, ... }`
2. Normalize action field names (`artifactOrder` → `artifact_order`)
3. Validate all `condition.type` and `action.type` values

### 11.3 Metadata Validation

For each artifact, run type-specific validation:
- **HARD_REQUIRED**: Missing = import fails
- **QUALITY_GATE**: Empty = import fails (artifact would be useless)
- **SOFT_REQUIRED**: Missing = warning (artifact renders poorly)
- **OPTIONAL**: Missing = silent default applied

---

## 12. Validation Runbook

### Pre-Import Checklist

1. ✅ **JSON Structure**: Must be array `[ {...}, {...} ]`
2. ✅ **game_key**: Every game must have unique `game_key`
3. ✅ **Required fields**: `name`, `short_description` required
4. ✅ **Orders unique**: No duplicate `step_order`, `phase_order`, `artifact_order`, `role_order`
5. ✅ **Triggers canonical**: Use `condition: { type }` format, not `condition_type`
6. ✅ **Artifact metadata**: Check HARD_REQUIRED fields per artifact type
7. ✅ **Enums valid**: `play_mode`, `phase_type`, `artifact_type` etc. must be valid values

### Common Errors

| Symptom | Cause | Fix |
|---------|-------|-----|
| "condition.type is required" | Missing trigger condition type | Add `type` field to `condition` |
| "DUPLICATE_STEP_ORDER" | Two steps have same order | Renumber steps |
| "keypad.correctCode är HARD_REQUIRED" | Missing keypad code | Add `correctCode` to metadata |
| "Okänd artifact_type" | Invalid artifact type | Check spelling, use supported type |

---

## 13. Example Payload

See [maximal-import-example.json](./maximal-import-example.json) for a comprehensive example covering all artifact types, trigger conditions, and trigger actions.

---

## 14. Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2026-02-04 | 1.0 | Initial canonical specification |

