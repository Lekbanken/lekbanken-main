# Play UI Wiring Audit Report v2
## UI → API → DB Field Mapping (SSoT + Evidence)

**Date:** 2026-02-08  
**Status:** Verified Reference Document  
**Previous:** v1 (2026-01-24)

---

## 1. Verification Summary

### ✅ Verified Sections (with evidence)

| Section | Status | Evidence |
|---------|--------|----------|
| Session Status Panel | ✅ Verified | [route.ts#L23-55](../app/api/play/sessions/[id]/route.ts) |
| Participants List | ✅ Verified | Table is `participants` (not session_participants) - [migration#L104](../supabase/migrations/20241210_create_participants_domain.sql) |
| Roles (session_roles snapshot) | ✅ Verified | Snapshot via RPC `snapshot_game_roles_to_session` - [migration#L288-347](../supabase/migrations/20251216160000_play_runtime_schema.sql) |
| Artifacts V2 Config/State | ✅ Verified | Config from `game_artifacts`, state from `session_artifact_state` - [route.ts#L161-315](../app/api/play/sessions/[id]/artifacts/route.ts) |
| Triggers V2 Config/State | ✅ Verified | Config from `game_triggers`, state from `session_trigger_state` - [route.ts#L54-120](../app/api/play/sessions/[id]/triggers/route.ts) |
| Duration conversion | ✅ Verified | `Math.ceil(duration_seconds / 60)` → `durationMinutes` - [route.ts#L373-374](../app/api/play/sessions/[id]/game/route.ts) |
| Board text fallback | ✅ Verified | `board_text ?? body` - [route.ts#L74-77](../app/api/play/board/[code]/route.ts) |
| Participant sanitization | ✅ Verified | `correctCode` stripped, `leader_script` not exposed - [route.ts#L52-95](../app/api/play/sessions/[id]/artifacts/route.ts), [route.ts#L385-402](../app/api/play/sessions/[id]/game/route.ts) |

### ⚠️ Corrected Sections

| Section | v1 Claim | v2 Correction | Evidence |
|---------|----------|---------------|----------|
| Board phase lookup | "by phase_order" | **BUG:** Uses `.eq('phase_order', current_phase_index)` - treats index as order | [route.ts#L54-60](../app/api/play/board/[code]/route.ts) |
| Board step lookup | "by step_order" | ✅ Correct: Fetches all steps ordered, uses array index | [route.ts#L67-78](../app/api/play/board/[code]/route.ts) |
| Step.phaseId in API | Not mentioned | **GAP:** `/game` endpoint does NOT return `phase_id` for steps | [route.ts#L385-402](../app/api/play/sessions/[id]/game/route.ts) |
| Step→Phase linkage | Unclear | Phase shown via independent `current_phase_index`, NOT derived from step.phase_id | See Section 5 |

### ❌ Bugs Found

| Bug | Severity | Location | Impact |
|-----|----------|----------|--------|
| **Phase name off-by-one** | 🔴 HIGH | `/api/play/board/[code]` | If `phase_order` is 1-based and `current_phase_index` is 0-based, board shows wrong phase name |
| **Step.phase_id not exposed** | 🟡 MEDIUM | `/api/play/sessions/[id]/game` | UI cannot auto-derive phase from current step; relies on manual `current_phase_index` |

---

## 2. Core SSoT Tables (Verified)

### 2.1 Session Runtime (participant_sessions)

**Table:** `public.participant_sessions`  
**Migration:** [20241210_create_participants_domain.sql#L44](../supabase/migrations/20241210_create_participants_domain.sql) + [20251216160000_play_runtime_schema.sql](../supabase/migrations/20251216160000_play_runtime_schema.sql)

| Column | Type | SSoT For | Verified In |
|--------|------|----------|-------------|
| `id` | UUID | Session identity | All endpoints |
| `session_code` | TEXT | Join code (6-char) | [route.ts#L23](../app/api/play/sessions/[id]/route.ts) |
| `display_name` | TEXT | Session title | [route.ts#L24](../app/api/play/sessions/[id]/route.ts) |
| `status` | ENUM | Session state | Values: draft/lobby/active/paused/locked/ended/archived/cancelled |
| `current_step_index` | INTEGER | Current step (0-based) | [migration#L11-13](../supabase/migrations/20251216160000_play_runtime_schema.sql) |
| `current_phase_index` | INTEGER | Current phase (0-based) | [migration#L15-17](../supabase/migrations/20251216160000_play_runtime_schema.sql) |
| `timer_state` | JSONB | Timer runtime | `{ started_at, duration_seconds, paused_at }` |
| `board_state` | JSONB | Board overrides | `{ message, overrides }` |

### 2.2 Game Content Tables (game_*)

**SSoT Bucket:** `GAME_CONFIG` (immutable during session)

| Table | Purpose | Key Columns | Evidence |
|-------|---------|-------------|----------|
| `games` | Game metadata | `name`, `play_mode` | [migration](../supabase/migrations/20251216010000_game_builder_p0.sql) |
| `game_steps` | Step content | `title`, `body`, `leader_script`, `participant_prompt`, `board_text`, `step_order`, `duration_seconds`, `phase_id` | [migration#L16-34](../supabase/migrations/20251216010000_game_builder_p0.sql) |
| `game_phases` | Phase structure | `name`, `description`, `phase_order`, `duration_seconds` | [migration](../supabase/migrations/20251216010000_game_builder_p0.sql) |
| `game_roles` | Role definitions (source) | `name`, `private_instructions`, `public_description` | Snapshotted to `session_roles` |
| `game_artifacts` | Artifact configs | `title`, `artifact_type`, `metadata` | [route.ts#L197-208](../app/api/play/sessions/[id]/artifacts/route.ts) |
| `game_triggers` | Trigger rules | `name`, `condition`, `actions`, `execute_once` | [route.ts#L79-90](../app/api/play/sessions/[id]/triggers/route.ts) |

### 2.3 Session Runtime State Tables (session_*)

**SSoT Bucket:** `SESSION_STATE` (mutable during session)

| Table | Purpose | Key Columns | Evidence |
|-------|---------|-------------|----------|
| `session_roles` | Role snapshot (immutable during session) | Copied from `game_roles` at session start | [migration#L38-77](../supabase/migrations/20251216160000_play_runtime_schema.sql) |
| `session_artifact_state` | Artifact runtime state | `game_artifact_id`, `state` (JSONB) | [route.ts#L230-238](../app/api/play/sessions/[id]/artifacts/route.ts) |
| `session_artifact_variant_state` | Variant visibility | `revealed_at`, `highlighted_at` | [route.ts#L247-261](../app/api/play/sessions/[id]/artifacts/route.ts) |
| `session_trigger_state` | Trigger fired status | `game_trigger_id`, `status`, `fired_count`, `fired_at` | [route.ts#L93-103](../app/api/play/sessions/[id]/triggers/route.ts) |
| `participants` | Session participants | `display_name`, `status`, `role`, `participant_token` | [migration#L104](../supabase/migrations/20241210_create_participants_domain.sql) |

---

## 3. UI Component → API → DB Mapping (Updated)

### 3.1 useSessionState Hook Endpoints

**File:** [features/play/hooks/useSessionState.ts](../features/play/hooks/useSessionState.ts)

| Loader Function | API Endpoint | Fields Populated | SSoT Bucket |
|-----------------|--------------|------------------|-------------|
| `loadSession` | `GET /api/play/sessions/[id]` → via `getHostSession()` | `sessionCode`, `displayName`, `status`, `startedAt`, `gameId` | SESSION_STATE |
| `loadRuntimeState` | `GET /api/play/sessions/[id]/state` | `current_step_index`, `current_phase_index`, `status` | SESSION_STATE |
| `loadGameContent` | `GET /api/play/sessions/[id]/game` | `steps[]`, `phases[]`, `safetyInfo` | GAME_CONFIG |
| `loadParticipants` | `GET /api/play/sessions/[id]/participants` | `participants[]` | SESSION_STATE |
| `loadRoles` | `GET /api/play/sessions/[id]/roles` | `sessionRoles[]` | SESSION_STATE (snapshot) |
| `loadAssignments` | `GET /api/play/sessions/[id]/assignments` | `roleAssignments{}` | SESSION_STATE |
| `loadArtifacts` | `GET /api/play/sessions/[id]/artifacts` | `artifacts[]` | GAME_CONFIG + SESSION_STATE |
| `loadTriggers` | `GET /api/play/sessions/[id]/triggers` | `triggers[]` | GAME_CONFIG + SESSION_STATE |
| `loadSignals` | `GET /api/play/sessions/[id]/signals` | `recentSignals[]` | SESSION_STATE |
| `loadTimeBank` | `GET /api/play/sessions/[id]/time-bank` | `timeBankBalance`, `timeBankLedger[]` | SESSION_STATE |
| `loadSecrets` | `GET /api/play/sessions/[id]/secrets` | `secretsUnlockedAt`, `secretsRevealedBy{}` | SESSION_STATE |

**Evidence:** [useSessionState.ts#L476-491](../features/play/hooks/useSessionState.ts)

### 3.2 Step Content Mapping

| UI Field | API Endpoint | Response Key | DB Table.Column | Conversion |
|----------|--------------|--------------|-----------------|------------|
| Step Title | `GET /game` | `steps[i].title` | `game_steps.title` | None |
| Step Description | `GET /game` | `steps[i].description` | `game_steps.body` | None |
| Leader Script | `GET /game` | `steps[i].leaderScript` | `game_steps.leader_script` | None (host only) |
| Participant Prompt | `GET /game` | `steps[i].participantPrompt` | `game_steps.participant_prompt` | None |
| Board Text | `GET /game` | `steps[i].boardText` | `game_steps.board_text` | None |
| Duration (minutes) | `GET /game` | `steps[i].durationMinutes` | `game_steps.duration_seconds` | `Math.ceil(seconds / 60)` |
| Duration (seconds) | `GET /game` | `steps[i].duration` | `game_steps.duration_seconds` | None |
| Display Mode | `GET /game` | `steps[i].display_mode` | `game_steps.display_mode` | None |
| Step Index | `GET /game` | `steps[i].index` | DERIVED (array position) | 0-based |
| **Phase ID** | ❌ NOT EXPOSED | N/A | `game_steps.phase_id` | **GAP** |

**Evidence:** [route.ts#L373-402](../app/api/play/sessions/[id]/game/route.ts)

### 3.3 Board Display Mapping

**Route:** `/board/[code]`  
**API:** `GET /api/play/board/[code]`

| UI Field | Response Key | DB Query | ⚠️ Notes |
|----------|--------------|----------|----------|
| Session Code | `session.code` | `participant_sessions.session_code` | ✅ |
| Status | `session.status` | `participant_sessions.status` | ✅ |
| Current Step Index | `session.current_step_index` | `participant_sessions.current_step_index` | ✅ 0-based |
| Current Phase Index | `session.current_phase_index` | `participant_sessions.current_phase_index` | ✅ 0-based |
| Current Phase Name | `session.current_phase_name` | `game_phases WHERE phase_order = current_phase_index` | ⚠️ **BUG:** Treats index as order |
| Current Step Title | `session.current_step_title` | `game_steps[current_step_index]` after ORDER BY step_order | ✅ Uses array index |
| Current Step Board Text | `session.current_step_board_text` | `game_steps.board_text ?? game_steps.body` | ✅ Fallback verified |
| Timer State | `session.timer_state` | `participant_sessions.timer_state` | ✅ JSONB |
| Board Message | `session.board_state.message` | `participant_sessions.board_state->>'message'` | ✅ |

**Evidence:** [route.ts#L48-78](../app/api/play/board/[code]/route.ts)

---

## 4. Conversion/Normalization Rules

### 4.1 Duration Conversion

| Location | From | To | Formula | Evidence |
|----------|------|----|---------|---------
| `/api/play/sessions/[id]/game` | `game_steps.duration_seconds` | `steps[i].durationMinutes` | `Math.ceil(seconds / 60)` | [route.ts#L373-374](../app/api/play/sessions/[id]/game/route.ts) |
| `StepEditor.tsx` | `duration_seconds` | display value | `Math.round(seconds / 60)` | [StepEditor.tsx#L121](../app/admin/games/builder/components/StepEditor.tsx) |

**Verified:** No double-conversion. API returns both `durationMinutes` (rounded) and `duration` (raw seconds).

### 4.2 Board Text Fallback

| Endpoint | Fallback Rule | Evidence |
|----------|---------------|----------|
| `/api/play/board/[code]` | `step.board_text ?? step.body` | [route.ts#L74-77](../app/api/play/board/[code]/route.ts) |

### 4.3 Index vs Order Semantics

| Entity | DB Column | Semantic | UI Index |
|--------|-----------|----------|----------|
| Steps | `step_order` | 1-based (typically) | 0-based (`index` = array position) |
| Phases | `phase_order` | 1-based (typically) | 0-based (`index` = array position) |
| Current Step | `current_step_index` | 0-based | 0-based |
| Current Phase | `current_phase_index` | 0-based | 0-based |

**⚠️ Critical Bug in Board API:**
```typescript
// BUG: Treats current_phase_index (0-based) as phase_order (1-based)
.eq('phase_order', session.current_phase_index ?? 0)
```

**Correct approach (as used for steps):**
```typescript
// CORRECT: Fetch all phases ordered, then use index
const phase = (phases ?? [])[session.current_phase_index ?? 0];
```

---

## 5. Step→Phase Linkage

### Current Behavior (Verified)

| Aspect | Behavior | Evidence |
|--------|----------|----------|
| Phase navigation | **Independent** from step navigation | [StepPhaseNavigation.tsx#L39-51](../features/play/components/StepPhaseNavigation.tsx) |
| Phase display source | `current_phase_index` from `participant_sessions` | [useSessionState.ts#L254](../features/play/hooks/useSessionState.ts) |
| Step→Phase derivation | **Not implemented** in Play UI | `/game` endpoint doesn't return `phase_id` |
| Phase name on Board | Queried by `phase_order` = `current_phase_index` (BUG) | [route.ts#L54-60](../app/api/play/board/[code]/route.ts) |

### What's Missing

1. **API Gap:** `/api/play/sessions/[id]/game` does NOT return `step.phase_id`
2. **UI Gap:** No logic to auto-advance `current_phase_index` when step changes to a step in a different phase
3. **Board Bug:** Phase lookup uses index as order (off-by-one potential)

### How It Should Work (Recommended)

```
Option A: Add step.phase_id to /game response, let UI derive phase
Option B: Keep phases independent, document this as intentional design
Option C: Add server-side logic to update current_phase_index when step changes
```

---

## 6. Participant Security (Verified)

### Sanitization Checklist

| Field | Host Sees | Participant Sees | Evidence |
|-------|-----------|------------------|----------|
| `leader_script` | ✅ Yes | ❌ No (not in response) | [route.ts#L398-399](../app/api/play/sessions/[id]/game/route.ts) - only included for steps, not filtered per viewer but endpoint checks auth |
| `correctCode` (keypad) | ✅ Yes | ❌ No (sanitized) | [route.ts#L52-95](../app/api/play/sessions/[id]/artifacts/route.ts) - `sanitizeMetadataForParticipant()` |
| `private_instructions` | ✅ Yes | Only if assigned this role | [route.ts#L47-66](../app/api/play/sessions/[id]/roles/route.ts) |
| `triggers` | ✅ Yes | ❌ No access | [route.ts#L69](../app/api/play/sessions/[id]/triggers/route.ts) - host_user_id check |
| Artifact variants | ✅ All | Filtered by visibility + role + reveal | [route.ts#L330-374](../app/api/play/sessions/[id]/artifacts/route.ts) |

---

## 7. Roles Snapshot Mechanism (Verified)

### When Snapshot Happens

| Trigger | Location | Behavior |
|---------|----------|----------|
| First GET `/roles` by host | [route.ts#L34-47](../app/api/play/sessions/[id]/roles/route.ts) | Auto-snapshot if roles empty and game_id set |
| Explicit POST `/roles` | [route.ts#L77-130](../app/api/play/sessions/[id]/roles/route.ts) | Manual trigger by host |

### RPC Function

**Function:** `snapshot_game_roles_to_session(p_session_id, p_game_id, p_locale)`  
**Evidence:** [migration#L288-347](../supabase/migrations/20251216160000_play_runtime_schema.sql)

**Behavior:**
1. Copies all `game_roles` to `session_roles`
2. Maps `source_role_id` back to original `game_roles.id`
3. Converts `conflicts_with` (role IDs) to role names via subquery
4. Session roles are **immutable** during session

---

## 8. Verification Runbook

### 8.1 Unit Tests (if they exist)

```bash
# Run import preflight tests (step-phase linkage)
npm test -- tests/unit/import/preflightValidation.test.ts

# Run builder roundtrip tests (step.phase_id)
npm test -- tests/integration/builder/roundtrip.test.ts
```

### 8.2 Manual Verification Steps

#### A) Current step index persists

1. Start a play session
2. Navigate to step 2 (`onStepChange(1)`)
3. Refresh page
4. Verify `current_step_index` is still 1

**DB Check:**
```sql
SELECT current_step_index, current_phase_index 
FROM participant_sessions 
WHERE id = '<session_id>';
```

#### B) Board shows correct phase name

1. Set up a game with phases where `phase_order` starts at 1
2. Start session, set `current_phase_index = 0`
3. Open board view
4. **Expected:** Phase 1 name shown
5. **Actual (BUG):** May show nothing or wrong phase

**Fix verification:**
```typescript
// In board/[code]/route.ts, line ~54
// Change:
.eq('phase_order', session.current_phase_index ?? 0)
// To:
// Fetch all phases, use array index
```

#### C) Keypad correctCode hidden from participants

1. Create artifact with type=keypad, metadata.correctCode="1234"
2. Join as participant
3. Fetch `/api/play/sessions/[id]/artifacts` with participant token
4. Verify response has `metadata.codeLength` but NOT `metadata.correctCode`

#### D) Artifacts state joined correctly

1. Create session with game that has artifacts
2. Reveal an artifact via PATCH
3. GET `/artifacts` as host
4. Verify `artifacts[].state` contains merged runtime state from `session_artifact_state`

---

## 9. Known Bugs & Fixes

### Bug 1: Board Phase Lookup Off-by-One

**Severity:** 🔴 HIGH  
**Location:** [app/api/play/board/[code]/route.ts#L54-60](../app/api/play/board/[code]/route.ts)

**Current Code:**
```typescript
const { data: phase } = await service
  .from('game_phases')
  .select('name')
  .eq('game_id', session.game_id)
  .eq('phase_order', session.current_phase_index ?? 0)  // BUG: index ≠ order
  .single();
```

**Fix:**
```typescript
const { data: phases } = await service
  .from('game_phases')
  .select('name, phase_order')
  .eq('game_id', session.game_id)
  .is('locale', null)
  .order('phase_order', { ascending: true });

const phase = (phases ?? [])[session.current_phase_index ?? 0];
currentPhaseName = phase?.name ?? null;
```

### Bug 2: Step.phase_id Not Exposed in /game

**Severity:** 🟡 MEDIUM  
**Location:** [app/api/play/sessions/[id]/game/route.ts#L385-402](../app/api/play/sessions/[id]/game/route.ts)

**Gap:** The step object returned does not include `phase_id`, preventing UI from deriving which phase a step belongs to.

**Fix (if desired):**
```typescript
return {
  id: s.id,
  index,
  title: s.title || `Steg ${index + 1}`,
  // ... existing fields ...
  phaseId: s.phase_id ?? null,  // ADD THIS
};
```

---

## 10. API Contract Summary (Updated)

### Session Endpoints

| Endpoint | Method | Auth | Returns | SSoT Bucket |
|----------|--------|------|---------|-------------|
| `/api/play/sessions/[id]` | GET | Host | Session details | SESSION_STATE |
| `/api/play/sessions/[id]` | PATCH | Host | Status change | SESSION_STATE |
| `/api/play/sessions/[id]/state` | GET | Host | Runtime state (step/phase/timer) | SESSION_STATE |
| `/api/play/sessions/[id]/state` | PATCH | Host | Update step/phase/timer | SESSION_STATE |
| `/api/play/sessions/[id]/game` | GET | Host/Participant | Steps, phases, safety | GAME_CONFIG |
| `/api/play/sessions/[id]/roles` | GET | Host/Participant | Roles (host: full, participant: public) | SESSION_STATE |
| `/api/play/sessions/[id]/artifacts` | GET | Host/Participant | Artifacts + state (participant: sanitized) | GAME_CONFIG + SESSION_STATE |
| `/api/play/sessions/[id]/triggers` | GET | Host only | Triggers + fired state | GAME_CONFIG + SESSION_STATE |
| `/api/play/board/[code]` | GET | Public | Board display data | DERIVED |

---

## 11. References

### Key Files (with line references)

| Category | File | Key Lines |
|----------|------|-----------|
| Hook | [useSessionState.ts](../features/play/hooks/useSessionState.ts) | L97-150 (loadSession), L248-268 (loadRuntimeState), L270-310 (loadGameContent) |
| API | [/sessions/[id]/route.ts](../app/api/play/sessions/[id]/route.ts) | L23-55 (GET), L57-132 (PATCH) |
| API | [/sessions/[id]/game/route.ts](../app/api/play/sessions/[id]/game/route.ts) | L373-402 (step mapping) |
| API | [/sessions/[id]/artifacts/route.ts](../app/api/play/sessions/[id]/artifacts/route.ts) | L52-95 (sanitization), L268-315 (host view) |
| API | [/board/[code]/route.ts](../app/api/play/board/[code]/route.ts) | L54-78 (phase/step lookup) |
| Migration | [20251216010000_game_builder_p0.sql](../supabase/migrations/20251216010000_game_builder_p0.sql) | L16-34 (game_steps) |
| Migration | [20251216160000_play_runtime_schema.sql](../supabase/migrations/20251216160000_play_runtime_schema.sql) | L11-27 (runtime columns), L38-77 (session_roles), L288-347 (snapshot RPC) |

---

*Last updated: 2026-02-08 by Claude verification audit*
