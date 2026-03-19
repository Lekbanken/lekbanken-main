# Participant State-Machine Hardening Audit

> Created: 2026-03-19
> Author: Claude (verification agent)
> Scope: Cluster 19 — BUG-079, BUG-081, BUG-083, BUG-084
> Directive: GPT review requested focused verification before implementation

---

## Executive Summary

Four bugs in the participant state-machine family (Cluster 19) were code-verified against the live codebase. **All four are confirmed.** Two share a common root cause: the auth layer treats `idle` (approval-pending) participants as fully valid, letting them perform mutations they shouldn't. The other two are independent gaps — heartbeat ignoring session status, and progress/update lacking any session guard.

The recommended fix batch addresses all four with **3 code changes in 3 files**, plus one new shared helper.

> **Implementation status:** ✅ ALL FOUR FIXED (2026-03-19)
> **Postfix verification:** `audits/participant-state-machine-postfix-verification.md`

---

## Verified Findings

### BUG-079 — Heartbeat reactivates participants after session ends (P1)

**Status: ✅ CONFIRMED**

**File:** `app/api/play/heartbeat/route.ts`

**Evidence:**
- Lines 23–29: Session lookup `SELECT id` — no `status` field selected
- Lines 57–67: BUG-058 fix handles idle (presence-only), but non-idle participants are set to `status: 'active', disconnected_at: null` unconditionally
- No session status check anywhere in the route

**Impact:**
A participant connected to an `ended`/`cancelled`/`archived` session will be reactivated to `active` by their heartbeat. This causes phantom presence — the host dashboard may show active participants in a session that is over. If any downstream logic trusts participant `active` status as "session is live", it compounds into further incorrect behavior.

**Root cause:** The heartbeat route was written before `assertSessionStatus()` existed and was never retrofitted. The BUG-058 fix addressed the idle-to-active promotion, but didn't add the session-status gate.

---

### BUG-081 — Approved-then-disconnected participants cannot rejoin in requireApproval sessions (P1)

**Status: ✅ CONFIRMED**

**File:** `app/api/participants/sessions/rejoin/route.ts`

**Evidence (line 103):**
```typescript
const shouldActivate = !requireApproval && participant.status !== 'idle';
```

**Trace of the bug for an approved-then-disconnected participant:**
1. Participant joins requireApproval session → status = `idle`
2. Host approves → status = `active`
3. Participant disconnects → status = `disconnected` (or stays `active` with stale `last_seen_at`)
4. Participant calls rejoin
5. `shouldActivate = !true && 'disconnected' !== 'idle'` → `false && true` → `false`
6. Participant stays `disconnected`, never re-promoted to `active`

**Impact:** In requireApproval sessions, any participant who disconnects after approval is permanently stuck. They see "reconnecting" UI but never regain active status. The host has no "re-approve" action — the participant must be kicked and re-join with a new code.

**Root cause:** The `shouldActivate` condition conflates two independent concerns:
1. "Is approval required?" (gate for *new/idle* participants)
2. "Was this participant already approved?" (gate for *returning* participants)

The fix should allow rejoin-to-active for participants whose status is `active` or `disconnected` (previously approved), regardless of `requireApproval`.

---

### BUG-083 — Idle (approval-pending) participants can perform all mutations (P1)

**Status: ✅ CONFIRMED**

**Auth layer evidence — `lib/api/play-auth.ts`:**
- Line 25: `REJECTED_PARTICIPANT_STATUSES = new Set(['blocked', 'kicked'])` — `idle` NOT in set
- Line 60: `isParticipantValid()` only checks rejected statuses + token expiry
- Lines 120–165: `resolveParticipant()` returns `status` in result but does not gate on it

**Route-level evidence — zero idle checks found on any mutation route:**

| Route | Auth | Has `assertSessionStatus`? | Has idle check? | Impact |
|-------|------|---------------------------|-----------------|--------|
| POST /api/play/ready | participant | ✅ manual equiv. | ❌ | Idle can toggle ready |
| POST /api/play/sessions/[id]/decisions/[decisionId]/vote | participant | ✅ | ❌ | Idle can vote |
| POST /api/play/sessions/[id]/artifacts/[artifactId]/puzzle | participant | ✅ | ❌ | Idle can submit puzzle answers |
| POST /api/play/sessions/[id]/artifacts/[artifactId]/keypad | participant | ✅ | ❌ | Idle can submit keypad codes |
| POST /api/play/me/role/reveal | participant | ✅ | ❌ | Idle can reveal secret role |
| POST /api/participants/progress/update | participant | ❌ (BUG-084) | ❌ | Idle can update game progress |
| POST /api/play/sessions/[id]/chat | public* | ✅ | ❌ | Idle can send chat messages |
| POST /api/play/heartbeat | public* | ❌ (BUG-079) | ✅ (BUG-058 fix) | Only route with idle gate |

*\*These routes use `auth: 'public'` with inline participant validation*

**Impact:** A participant in `idle` status (waiting for host approval in `requireApproval` sessions) can bypass the approval gate by calling any mutation API directly. They can vote, solve puzzles, reveal roles, and chat — all before the host has approved them. This defeats the purpose of `requireApproval`.

**Root cause:** The auth layer was designed with only two rejection states (`blocked`/`kicked`). `idle` was added later as an approval-pending state but was never integrated into the auth gate. The BUG-058 fix addressed heartbeat specifically, but no systemic fix was applied.

---

### BUG-084 — Progress/update route missing session status guard (P1)

**Status: ✅ CONFIRMED**

**File:** `app/api/participants/progress/update/route.ts`

**Evidence:**
- Line 31: `auth: 'participant'` — no session status check
- Lines 53–60: Session is fetched (`SELECT id, tenant_id`) but `status` is never selected or checked
- No `assertSessionStatus()` import or call anywhere in the file
- The `PLAY_MUTATION_STATUS_POLICY` table in `session-guards.ts` doesn't even have a `progress-update` entry

**Impact:** A participant can update game progress after the session has `ended`, `cancelled`, or been `archived`. Scores, completion percentages, and game state can be modified post-session. This corrupts session analytics and leaderboards.

**Root cause:** This route was built for the gamification feature and follows a different pattern from the core play routes. It was never integrated with the session-guards system.

---

## Canonical Participant Status Model (Proposal)

### Current statuses

| Status | Meaning | Set by |
|--------|---------|--------|
| `idle` | Awaiting host approval (requireApproval sessions) | Join route |
| `active` | Fully participating | Approve action / join (no approval) / heartbeat / rejoin |
| `disconnected` | Lost connection (detected by heartbeat timeout) | Server-side cron or explicit disconnect |
| `blocked` | Permanently removed by host | Host action |
| `kicked` | Removed by host (may rejoin) | Host action |

### Proposed auth-level policy

```
MUTATION-ALLOWED statuses: { active }
READ-ALLOWED statuses:     { idle, active, disconnected }
REJECTED statuses:         { blocked, kicked }
```

The key change: **mutation routes should require `active` status**. Currently only `blocked`/`kicked` are rejected, meaning `idle` and `disconnected` implicitly have full mutation access.

### Why NOT add `idle` to `REJECTED_PARTICIPANT_STATUSES`?

Adding `idle` to the rejected set would be the simplest fix, but it would also:
- Block idle participants from GET /api/play/me (they need this to see session info while waiting)
- Block idle participants from heartbeat (they need presence tracking)
- Block idle participants from chat (debatable — some hosts want idle participants to see chat)

Instead, the recommended approach is a **new `requireActiveParticipant()` guard** that routes opt into for mutations, while leaving `isParticipantValid()` as the baseline auth check.

---

## Route Policy Matrix

### Participant-auth mutation routes

| Route | Method | Session guard needed? | Active-only? | Current state | Fix needed? |
|-------|--------|----------------------|-------------|---------------|-------------|
| /api/play/ready | POST | ✅ has manual equiv. | ✅ Yes | ❌ No idle check | **Yes** |
| /api/play/sessions/[id]/decisions/[decisionId]/vote | POST | ✅ has assertSessionStatus | ✅ Yes | ❌ No idle check | **Yes** |
| /api/play/sessions/[id]/artifacts/[artifactId]/puzzle | POST | ✅ has assertSessionStatus | ✅ Yes | ❌ No idle check | **Yes** |
| /api/play/sessions/[id]/artifacts/[artifactId]/keypad | POST | ✅ has assertSessionStatus | ✅ Yes | ❌ No idle check | **Yes** |
| /api/play/me/role/reveal | POST | ✅ has assertSessionStatus | ✅ Yes | ❌ No idle check | **Yes** |
| /api/participants/progress/update | POST | ❌ Missing entirely | ✅ Yes | ❌ No idle check, no session guard | **Yes** (both) |

### Participant-auth read routes (idle-safe)

| Route | Method | Session guard needed? | Active-only? | Current state | Fix needed? |
|-------|--------|----------------------|-------------|---------------|-------------|
| /api/play/me | GET | No (read-only) | No | ✅ OK | No |
| /api/play/me/role | GET | No (read-only) | No | ✅ OK | No |

### Public routes with participant logic

| Route | Method | Session guard? | Idle handling? | Current state | Fix needed? |
|-------|--------|---------------|----------------|---------------|-------------|
| /api/play/heartbeat | POST | ❌ Missing | ✅ BUG-058 fix | ❌ No session status check | **Yes** (session guard) |
| /api/play/sessions/[id]/chat | POST | ✅ has assertSessionStatus | ❌ No idle check | Debatable — idle chat may be desirable | **Defer** |
| /api/play/rejoin | POST | ✅ manual checks | ❌ Broken for approved-then-disconnected | ❌ shouldActivate logic flawed | **Yes** |

### Host-only routes (auth: 'user') — not affected

All host routes already use `assertSessionStatus` and don't pass through participant auth. Not in scope.

---

## Recommended Implementation Batch

### Approach: Smallest safe fix for all 4 bugs

**Strategy:** Don't refactor the auth layer. Instead:
1. Add a shared `requireActiveParticipant()` guard (single new helper)
2. Add it to the 6 mutation routes that need it
3. Add session status check to heartbeat
4. Fix rejoin `shouldActivate` logic
5. Add session status guard to progress/update

### Fix 1 — New `requireActiveParticipant()` guard (BUG-083)

**File:** `lib/api/play-auth.ts` (add function)

```typescript
/**
 * Guard: require participant to be in 'active' status for mutations.
 * Returns a 403 NextResponse if participant is not active, null otherwise.
 */
export function requireActiveParticipant(
  status: string | null
): NextResponse | null {
  if (status === 'active') return null;
  return NextResponse.json(
    { error: 'Participant must be active to perform this action' },
    { status: 403 }
  );
}
```

**Apply to routes:**
- `app/api/play/ready/route.ts` — add after session check
- `app/api/play/sessions/[id]/decisions/[decisionId]/vote/route.ts` — add after session check
- `app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts` — add after session check
- `app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts` — add after session check
- `app/api/play/me/role/reveal/route.ts` — add after session check
- `app/api/participants/progress/update/route.ts` — add after participant auth

### Fix 2 — Heartbeat session status gate (BUG-079)

**File:** `app/api/play/heartbeat/route.ts`

Change session SELECT from `select('id')` to `select('id, status')`, then reject if session status is `ended`/`cancelled`/`archived`:

```typescript
if (['ended', 'cancelled', 'archived'].includes(session.status)) {
  return NextResponse.json({ error: 'Session has ended' }, { status: 410 });
}
```

### Fix 3 — Rejoin shouldActivate logic (BUG-081)

**File:** `app/api/participants/sessions/rejoin/route.ts`

Replace:
```typescript
const shouldActivate = !requireApproval && participant.status !== 'idle';
```

With:
```typescript
// Activate if: (a) no approval needed, or (b) previously approved (active/disconnected)
const previouslyApproved = participant.status === 'active' || participant.status === 'disconnected';
const shouldActivate = !requireApproval || previouslyApproved;
```

This correctly handles:
- `idle` in requireApproval → stays idle (correct: awaiting approval)
- `active` in requireApproval → re-activates (correct: was already approved)
- `disconnected` in requireApproval → re-activates (correct: was approved, then disconnected)
- Any status in non-requireApproval → activates (correct: no approval needed)
- `blocked`/`kicked` → already rejected by earlier guard (lines 62-67)

### Fix 4 — Progress/update session guard (BUG-084)

**File:** `app/api/participants/progress/update/route.ts`

1. Add `assertSessionStatus` import from `@/lib/play/session-guards`
2. Add policy entry `'progress-update': ['active', 'paused']` to `PLAY_MUTATION_STATUS_POLICY`
3. Change session SELECT to include `status`
4. Add guard: `const statusError = assertSessionStatus(session.status, 'progress-update'); if (statusError) return statusError;`

---

## Risk Assessment

| Fix | Risk | Mitigation |
|-----|------|-----------|
| Fix 1 (idle guard) | Could break legitimate idle access if over-applied | Only applied to POST mutation routes; GET routes untouched |
| Fix 2 (heartbeat session gate) | Stale participants stop heartbeating → appear disconnected | Correct behavior — they SHOULD stop appearing alive |
| Fix 3 (rejoin logic) | Edge case: participant status corrupted to unexpected value | `previouslyApproved` is explicit allowlist; unknown statuses won't activate |
| Fix 4 (progress session guard) | Games running in paused sessions won't be able to save | Policy allows `paused`; only blocks `ended`/`cancelled`/`archived` |

### Estimated scope

- **Files modified:** 9 (1 new helper + 6 route additions + 1 heartbeat fix + 1 rejoin fix)
- **Lines changed:** ~40
- **Risk level:** Low — all changes are additive guards, no existing behavior modified for valid states

---

## Out of Scope (Deferred)

| Bug | Reason |
|-----|--------|
| BUG-080 | Same root cause as BUG-083 — resolved by Fix 1 |
| BUG-082 | setNextStarter is host-only route (`auth: 'user'`) — not affected |
| BUG-085 | Same as BUG-082 |
| Cluster 18 (BUG-075..078) | Demo session state — separate domain, GPT deferred |
| Chat idle policy | Debatable UX decision — should idle participants chat? Defer to product decision |
