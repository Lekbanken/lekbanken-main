# Batch D — Post-Fix Verification

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-19
- Last updated: 2026-03-21
- Last validated: 2026-03-19

> Historical postfix verification snapshot for Batch D fixes. Use this as bounded closure evidence, not as an active operating guide.

> Created: 2026-03-19  
> Author: Claude (implementation + verification agent)  
> Scope: BUG-056, BUG-057, BUG-060, BUG-061, BUG-085 (RC-10 — State Machine Break)  

---

## Summary

| Bug | Fix Applied | Verdict | Status |
|-----|-------------|---------|--------|
| BUG-056 | `allow_rejoin` policy check in rejoin route | **CLOSED** | ✅ KLAR |
| BUG-057 | `session.expires_at` validation in rejoin route | **CLOSED** | ✅ KLAR |
| BUG-060 | `.select('id')` row verification on approve/kick/block/setNextStarter; broadcast gated on confirmed mutation | **CLOSED** | ✅ KLAR |
| BUG-061 | `.eq('status', 'idle')` on approve action | **CLOSED** | ✅ KLAR |
| BUG-085 | `.eq('session_id', sessionId)` on setNextStarter progress read; early 404 if not found | **CLOSED** | ✅ KLAR |

**tsc:** 0 errors after all changes.

---

## Guard Ordering (rejoin route)

After Batch D, the rejoin route's guard chain is:

1. **Token + session lookup** → 401 if not found (enumeration protection)
2. **Participant status** → 403 if blocked/kicked (`REJECTED_PARTICIPANT_STATUSES`)
3. **Session.status = draft** → 403
4. **Session.status = ended/cancelled/archived** → 410
5. **Session.expires_at** → 410 (BUG-057 — NEW)
6. **allow_rejoin = false** → 403 (BUG-056 — NEW)
7. **Token.token_expires_at** → 401
8. **require_approval + shouldActivate logic** (BUG-081 from Batch C)
9. **Update participant status** → reactivate or stay idle

---

## BUG-056 — Rejoin ignores `allow_rejoin=false`

### Fix applied

**File:** `app/api/participants/sessions/rejoin/route.ts`

1. Extracted `sessionSettings` typed variable (shared with `requireApproval`)
2. `allowRejoin = sessionSettings?.allow_rejoin ?? sessionSettings?.allowRejoin ?? true`
3. Returns 403 if `!allowRejoin`
4. Default `true` preserves backward compat for sessions without the setting

### Verification

- [x] `allow_rejoin` read from session settings with both snake_case and camelCase variants
- [x] Default `true` — sessions without the setting are unaffected
- [x] 403 response consistent with existing policy-denial pattern in same route (blocked/kicked, draft)
- [x] Guard placed AFTER session status checks (correct — no point checking policy on a dead session)
- [x] Guard placed BEFORE token expiry check (correct — policy rejection is more informative than token expiry)

### Remaining edge cases

None. The setting is a boolean property of session settings JSONB. The check is complete.

---

## BUG-057 — Rejoin ignores `session.expires_at`

### Fix applied

**File:** `app/api/participants/sessions/rejoin/route.ts`

1. Added `session.expires_at` check: `if (session.expires_at && new Date(session.expires_at) < new Date())`
2. Returns 410 with message "This session has expired"
3. Mirrors the join route's check pattern exactly

### Verification

- [x] `expires_at` is already in the SELECT (fetched via session join at line ~49)
- [x] Null-safe: only triggers when `expires_at` is non-null
- [x] 410 status consistent with ended/cancelled/archived in same route
- [x] Pattern matches join route's check (`app/api/participants/sessions/join/route.ts` line 80)
- [x] Guard placed immediately after terminal session status check — logical ordering

### Remaining edge cases

None. The check is the same as the join route. Clock skew is a theoretical concern but not in scope (same as join).

---

## BUG-060 — approve/kick/block returns success when no row matched

### Fix applied

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

1. **approve**: `const { data: approvedRows, error } = ... .select('id')` — check `approvedRows.length === 0` → 404
2. **kick**: `const { data: kickedRows, error } = ... .select('id')` — check `kickedRows.length === 0` → 404
3. **block**: `const { data: blockedRows, error } = ... .select('id')` — check `blockedRows.length === 0` → 404
4. **setNextStarter**: `const { data: starterRows, error } = ... .select('id')` — check `starterRows.length === 0` → 404

### Verification

- [x] All four mutation actions now use `.select('id')` to get affected rows back
- [x] All four check row count before proceeding
- [x] All broadcasts are AFTER row verification — no false broadcasts (GPT requirement)
- [x] Event payloads reference `participantId` from the request — not from stale reads (GPT requirement)
- [x] 404 response for "not found" is consistent across all actions

### Remaining edge cases

- `setPosition` (unreachable due to BUG-059) still has the old pattern. Deferred with BUG-059.

---

## BUG-061 — approve can reactivate kicked/blocked participants

### Fix applied

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

1. Added `.eq('status', 'idle')` to the approve update chain
2. Only participants in `idle` (pending approval) state can be approved
3. If participant is `kicked`/`blocked`/`active`/`disconnected`, the update matches 0 rows → 404

### Verification

- [x] `.eq('status', 'idle')` correctly filters — only pending-approval participants
- [x] No separate "unblock" pathway exists — a host who wants to re-admit a blocked participant must use a different flow (not yet implemented; this is by design)
- [x] `kicked` + `blocked` + `active` + `disconnected` all correctly excluded
- [x] The 404 message is "Participant not found or not in pending state" — informative for the host

### Remaining edge cases

None for the immediate fix. If a deliberate "unblock → re-approve" feature is wanted, it should be a separate action with explicit intent.

---

## BUG-085 — setNextStarter missing `session_id` + scope

### Fix applied

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

1. Added `.eq('session_id', sessionId)` to the progress read query
2. Added early 404 return if participant not found (`if (!participant)`)
3. Added `.select('id')` + row verification on the final update

### Verification

- [x] Progress read now scoped: `.eq('id', participantId).eq('session_id', sessionId)` — no cross-session leak (GPT requirement: "verify target in the correct session before using target state")
- [x] Early 404 BEFORE constructing the update payload — prevents using stale/wrong progress
- [x] Final update also verified via `.select('id')` + row count check
- [x] Broadcast only fires after both read AND write are verified
- [x] The clear loop (clearing `isNextStarter` on other participants) is already correctly scoped — the SELECT uses `.eq('session_id', sessionId)` and individual updates use `.eq('id', p.id)` from that scoped set

### Remaining edge cases

- **Non-atomicity (BUG-062):** The clear-then-set pattern is still two separate operations. A crash between clear and set could leave the session without a starter. This is accepted for now — host-only route, recoverable by re-triggering. Deferred to BUG-062.
- **`setPosition`** has the same missing `session_id` issue on its progress read. Unreachable (BUG-059). Deferred.

---

## GPT Requirements Check

| Requirement | Status |
|-------------|--------|
| "broadcast bara sker efter verifierad mutation" | ✅ All 4 broadcast-emitting actions now gate on row count > 0 |
| "event payload inte bygger på stale/fel participant read" | ✅ Payloads use request `participantId` directly, not from reads |
| "setNextStarter inte längre kan läsa progress från annan session" | ✅ `.eq('session_id', sessionId)` + early 404 before using progress |
| "approve only for genuinely pending/idle participants" | ✅ `.eq('status', 'idle')` on approve |
| "consistent response semantics" | ✅ 403 for policy denial, 410 for expired/gone, 404 for not found |
