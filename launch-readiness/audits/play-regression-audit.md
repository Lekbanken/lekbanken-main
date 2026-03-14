# Play / Run — Regression Audit

> **Domain:** Play / Run  
> **Type:** Phase 2 Regression Audit  
> **Date:** 2026-03-14  
> **Source:** `play-audit.md` (14 findings) + `play-runtime-remediation.md` (M1–M5)  
> **Scope:** Verify M1–M5 remediation still intact, no new regressions introduced  
> **Result:** ✅ **PASS** — 1 gap found and fixed inline

---

## Audit Areas

Five GPT-directed regression areas verified against current codebase:

| Area | Status | Details |
|------|--------|---------|
| **1. State Transitions** | ✅ PASS | TOCTOU fix, delegation, timestamps — all intact |
| **2. Broadcast Integrity** | ✅ PASS | kick/block/approve, assignments, readiness, sequencing — all intact |
| **3. Participant Sync** | ✅ PASS | join blocks draft/locked/ended, rejoin blocks removed, disconnect-on-end — all intact |
| **4. Session Mutation Safety** | ⚠️ 1 gap → FIXED | `assignments` route missing guard call — fixed inline |
| **5. DB Atomicity (RPCs)** | ✅ PASS | 4 puzzle RPCs, keypad, time-bank, trigger fire — all atomic |

---

## 1. State Transitions (M1 — State Machine Consolidation)

### Verified

- **PATCH route delegates**: `app/api/play/sessions/[id]/route.ts` L65–81 → `applySessionCommand()` with `clientId: 'legacy-patch'`
- **Control route delegates**: `app/api/participants/sessions/[sessionId]/control/route.ts` L74–84 → `applySessionCommand()` with `clientId: 'control'`
- **STATUS_TRANSITIONS map**: `lib/play/session-command.ts` L71–99 — 8 transitions, `from` sets as `Set<SessionStatus>`
- **TOCTOU fix**: `.in('status', [...transition.from])` on atomic UPDATE (L225) — no rows → Conflict error
- **Timestamps**: `started_at` (first start only), `paused_at` (set on pause, cleared otherwise), `ended_at` (set on end) — all in single UPDATE (L208–210)
- **Side effects**: End command disconnects active/idle participants + logs gamification event (L228–250)

### Result: ✅ No regression

---

## 2. Broadcast Integrity (M4 — Broadcast Completeness)

### Verified

| Mutation | Route | Event | Channel |
|----------|-------|-------|---------|
| Kick | `participants/[participantId]` PATCH L60–66 | `participants_changed` | `play:{sessionId}` |
| Block | `participants/[participantId]` PATCH L72–78 | `participants_changed` | `play:{sessionId}` |
| Approve | `participants/[participantId]` PATCH L47–53 | `participants_changed` | `play:{sessionId}` |
| Assign | `assignments` POST L119–130 | `assignments_changed` | `play:{sessionId}` |
| Unassign | `assignments` DELETE L290–299 | `assignments_changed` | `play:{sessionId}` |
| Readiness | `play/ready` POST L66–75 | `participants_changed` | `play:{sessionId}` |

- **Monotonic sequencing**: `increment_broadcast_seq` RPC via `play-broadcast-server.ts` L32 — fallback to `-1` on error
- **Command pipeline broadcast**: Emitted after DB apply (L114), never before

### Result: ✅ No regression

---

## 3. Participant Sync

### Verified

- **Join route** (`participants/sessions/join`): Blocks `draft` (403), `locked` (403), `ended`/`cancelled`/`archived` (410). Allows only `lobby`/`active`/`paused`
- **Rejoin route** (`participants/sessions/rejoin`): Checks `REJECTED_PARTICIPANT_STATUSES`, blocks removed/kicked (403). Validates token expiry
- **Heartbeat** (`play/runs/[runId]/heartbeat`): Updates `last_heartbeat_at`, guards on run status `not_started`/`in_progress`
- **Disconnect on end**: `session-command.ts` L230–237 — all `active`/`idle` → `disconnected` with timestamp

### Result: ✅ No regression

---

## 4. Session Mutation Safety (M2 — Session-Status Guards)

### Verified: 18 mutation routes

| # | Route | Guard | Status |
|---|-------|-------|--------|
| 1 | `time-bank` POST | `assertSessionStatus(session.status, 'time-bank')` | ✅ |
| 2 | `signals` POST | `assertSessionStatus(session.status, 'signals')` | ✅ |
| 3 | `outcome` POST | `assertSessionStatus(session.status, 'outcome')` | ✅ |
| 4 | `decisions` POST | `assertSessionStatus(session.status, 'decisions')` | ✅ |
| 5 | `decisions/[id]` PATCH | `assertSessionStatus(session.status, 'decision-update')` | ✅ |
| 6 | `assignments` POST | **Was missing → FIXED** | ✅ Fixed |
| 7 | `assignments` DELETE | **Was missing → FIXED** | ✅ Fixed |
| 8 | `artifacts/state` PATCH | `assertSessionStatus(session.status, 'artifacts-state')` | ✅ |
| 9 | `triggers` PATCH | `assertSessionStatus(session.status, 'triggers')` | ✅ |
| 10 | `participants/[id]` PATCH | `assertSessionStatus(session.status, 'kick-block')` | ✅ |
| 11 | `chat` POST | `assertSessionStatus(sessionStatus, 'chat')` | ✅ |
| 12 | `roles` POST | `assertSessionStatus(session.status, 'roles')` | ✅ |
| 13 | `secrets` POST | `assertSessionStatus(session.status, 'secrets')` | ✅ |
| 14 | `state` PATCH | `assertSessionStatus(session.status, 'state')` | ✅ |
| 15 | `vote` POST | `assertSessionStatus(session.status, 'vote')` | ✅ |
| 16 | `puzzle` POST | `assertSessionStatus(session.status, 'puzzle')` | ✅ |
| 17 | `keypad` POST | `assertSessionStatus(session.status, 'keypad')` | ✅ |
| 18 | `me/role/reveal` POST | `assertSessionStatus(status, 'role-reveal')` | ✅ |

### Gap Found: REG-PLAY-001

**`assignments` route** imported `assertSessionStatus` but never called it. Both POST (assign) and DELETE (unassign) handlers fetched session with `SELECT 'id, host_user_id'` (no `status` column) and skipped the guard entirely.

**Impact:** A host could assign/unassign roles on ended, archived, or draft sessions — violating the `['lobby', 'active', 'paused']` policy.

**Fix applied:** Added `status` to SELECT, added `assertSessionStatus(session.status, 'assignments')` after host check in both POST and DELETE handlers. `tsc --noEmit` = 0 errors.

### Note: `ready` route

Uses hardcoded inline check (`status !== 'lobby' && status !== 'active'`) instead of central guard. Functionally equivalent to policy `['lobby', 'active']`. Style inconsistency (P3) — not a regression.

### Result: ⚠️ 1 gap found → fixed

---

## 5. DB Atomicity (M3 + M5)

### Verified: Atomic RPCs

| Mutation | Route | RPC | Locking |
|----------|-------|-----|---------|
| Riddle puzzle | `puzzle/route.ts` L149–158 | `attempt_puzzle_riddle_v2` | `FOR UPDATE` |
| Counter puzzle | `puzzle/route.ts` L201–206 | `attempt_puzzle_counter_v2` | `FOR UPDATE` |
| Multi-answer puzzle | `puzzle/route.ts` L228–233 | `attempt_puzzle_multi_answer_v2` | `FOR UPDATE` |
| QR gate puzzle | `puzzle/route.ts` L253–258 | `attempt_puzzle_qr_gate_v2` | `FOR UPDATE` |
| Keypad unlock | `keypad/route.ts` L136–142 | `attempt_keypad_unlock_v2` | `FOR UPDATE` |
| Time bank | `time-bank/route.ts` L78–89 | `time_bank_apply_delta` | `FOR UPDATE` |
| Trigger fire | `triggers/route.ts` L162–170 | `fire_trigger_v2_safe` | Idempotency table |

All RPCs defined in `00000000000000_baseline.sql` (production baseline). Original migration `20260311000001_atomic_puzzle_rpcs.sql` archived (consolidated).

### Verified: Wrapper (M5)

| Route | Wrapper | Session scope check |
|-------|---------|-------------------|
| `puzzle` POST/GET | `apiHandler({ auth: 'participant' })` | `p!.sessionId !== sessionId` → 403 |
| `keypad` POST/GET | `apiHandler({ auth: 'participant' })` | `p!.sessionId !== sessionId` → 403 |
| `vote` POST | `apiHandler({ auth: 'participant' })` | `p!.sessionId !== sessionId` → 403 |

### Verified: Already-safe patterns (no RPC needed)

- **Vote**: Postgres upsert `ON CONFLICT (decision_id, participant_id)` — atomic by design
- **Command dedup**: `UNIQUE(session_id, client_id, client_seq)` constraint

### Result: ✅ No regression

---

## Summary

| Metric | Value |
|--------|-------|
| **Areas checked** | 5 |
| **Routes verified** | 25+ |
| **Files read** | 20+ |
| **Gaps found** | 1 (REG-PLAY-001) |
| **Gaps fixed** | 1 (inline) |
| **TypeScript errors** | 0 |
| **Verdict** | ✅ PASS |
