# Participant State-Machine Hardening — Post-Fix Verification

> Created: 2026-03-19
> Author: Claude (implementation + verification agent)
> Scope: BUG-079, BUG-081, BUG-083, BUG-084 (Cluster 19 — participant state-machine family)

---

## Summary

| Bug | Fix Applied | Verdict | Status |
|-----|-------------|---------|--------|
| BUG-079 | Session status gate in heartbeat | **CLOSED** | ✅ KLAR |
| BUG-081 | Rejoin distinguishes idle vs previously-approved | **CLOSED** | ✅ KLAR |
| BUG-083 | `requireActiveParticipant()` guard on 6 mutation routes | **CLOSED** | ✅ KLAR |
| BUG-084 | `assertSessionStatus('progress-update')` guard | **CLOSED** | ✅ KLAR |

**tsc:** 0 errors after all changes.

---

## Pre-notes: Route Policy for Each Touched File

| Route | idle allowed? | active required? | ended/cancelled/archived forbidden? |
|-------|:------------:|:----------------:|:-----------------------------------:|
| POST /api/play/heartbeat | ✅ presence-only | No (presence for all valid) | ✅ Rejected (410) |
| POST /api/play/ready | ❌ | ✅ | ✅ (manual session check) |
| POST /api/play/.../vote | ❌ | ✅ | ✅ (assertSessionStatus) |
| POST /api/play/.../puzzle | ❌ | ✅ | ✅ (assertSessionStatus) |
| POST /api/play/.../keypad | ❌ | ✅ | ✅ (assertSessionStatus) |
| POST /api/play/me/role/reveal | ❌ | ✅ | ✅ (assertSessionStatus) |
| POST /api/participants/progress/update | ❌ | ✅ | ✅ (assertSessionStatus) |
| POST /api/play/rejoin | ✅ stays idle | No (handles its own) | ✅ (manual 410) |
| GET /api/play/me | ✅ | No | No (read-only) |
| GET /api/play/me/role | ✅ | No | No (read-only) |

---

## BUG-079 — Heartbeat reactivates after session ends

### Fix applied

**File:** `app/api/play/heartbeat/route.ts`

1. Changed session SELECT from `select('id')` to `select('id, status')`
2. Added session status check: reject with 410 if `ended`/`cancelled`/`archived`
3. Existing BUG-058 idle-presence logic unchanged

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Active session, active participant | ✅ heartbeat updates | ✅ heartbeat updates |
| Active session, idle participant | ✅ presence-only (BUG-058) | ✅ presence-only (BUG-058) |
| Ended session, any participant | ❌ reactivates to `active` | ✅ 410 "Session has ended" |
| Cancelled session, any participant | ❌ reactivates to `active` | ✅ 410 "Session has ended" |
| Archived session, any participant | ❌ reactivates to `active` | ✅ 410 "Session has ended" |
| Lobby/paused session | ✅ heartbeat updates | ✅ heartbeat updates |

### Remaining edge cases

None. The session status gate is comprehensive for all terminal states.

---

## BUG-081 — Approved-then-disconnected cannot rejoin in requireApproval sessions

### Fix applied

**File:** `app/api/participants/sessions/rejoin/route.ts`

Replaced:
```typescript
const shouldActivate = !requireApproval && participant.status !== 'idle';
```

With:
```typescript
const previouslyApproved = participant.status === 'active' || participant.status === 'disconnected';
const shouldActivate = !requireApproval || previouslyApproved;
```

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| No approval, any valid status | ✅ activates | ✅ activates |
| Approval required, idle participant | ✅ stays idle | ✅ stays idle |
| Approval required, active participant | ❌ stays stuck | ✅ reactivates |
| Approval required, disconnected participant | ❌ stays stuck | ✅ reactivates |
| Blocked/kicked participant | ✅ rejected by earlier guard | ✅ rejected by earlier guard |
| Ended session | ✅ rejected by 410 guard | ✅ rejected by 410 guard |

### Remaining edge cases

None. The distinction between "not yet approved" (idle) and "previously approved" (active/disconnected) is now explicit.

---

## BUG-083 — Idle participants can perform all mutations

### Fix applied

**File:** `lib/api/play-auth.ts` — new `requireActiveParticipant()` guard

```typescript
export function requireActiveParticipant(
  status: string | null,
): NextResponse | null {
  if (status === 'active') return null;
  return NextResponse.json(
    { error: 'Participant must be active to perform this action' },
    { status: 403 },
  );
}
```

**Applied to 6 routes:**

| Route | File | Insertion point |
|-------|------|-----------------|
| POST /api/play/ready | `app/api/play/ready/route.ts` | After session mismatch check |
| POST /api/play/.../vote | `app/api/play/sessions/[id]/decisions/[decisionId]/vote/route.ts` | After session mismatch check |
| POST /api/play/.../puzzle | `app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts` | After session mismatch check |
| POST /api/play/.../keypad | `app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts` | After session mismatch check |
| POST /api/play/me/role/reveal | `app/api/play/me/role/reveal/route.ts` | After assertSessionStatus |
| POST /api/participants/progress/update | `app/api/participants/progress/update/route.ts` | First guard in handler |

**NOT applied to (idle-safe routes):**

| Route | Reason |
|-------|--------|
| GET /api/play/me | Read-only — idle participants need session info while waiting |
| GET /api/play/me/role | Read-only — role info (with secrets masked) visible when idle |
| POST /api/play/heartbeat | Has its own idle-specific handling (BUG-058) |
| POST /api/play/sessions/[id]/chat | Deferred — debatable UX decision |
| POST /api/play/rejoin | Has its own idle/approval handling (BUG-081) |

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Active participant calls vote | ✅ allowed | ✅ allowed |
| Idle participant calls vote | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls puzzle | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls keypad | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls ready | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls role/reveal | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls progress/update | ❌ allowed (no gate) | ✅ 403 "must be active" |
| Idle participant calls GET /me | ✅ allowed | ✅ allowed (not gated) |
| Disconnected participant calls vote | ❌ allowed (no gate) | ✅ 403 "must be active" |

### Remaining edge cases

- **Chat for idle:** Deferred to product decision. Not a security issue (chat messages visible on public board anyway).
- **BUG-080:** Same root cause as BUG-083 — resolved by this fix. `idle` no longer passes through mutation routes.

---

## BUG-084 — Progress/update missing session status guard

### Fix applied

**File 1:** `lib/play/session-guards.ts`
- Added policy entry: `'progress-update': ['active', 'paused']`

**File 2:** `app/api/participants/progress/update/route.ts`
1. Added imports for `requireActiveParticipant` and `assertSessionStatus`
2. Added `requireActiveParticipant(p!.status)` guard at top of handler
3. Changed session SELECT to include `status`
4. Added `assertSessionStatus(session.status, 'progress-update')` after session fetch

### Verification

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Active session, active participant | ✅ updates progress | ✅ updates progress |
| Paused session, active participant | ❌ allowed (no check) | ✅ allowed (policy allows paused) |
| Ended session, active participant | ❌ allowed (no check) | ✅ 409 "not allowed in current status" |
| Cancelled session | ❌ allowed (no check) | ✅ 409 "not allowed in current status" |
| Archived session | ❌ allowed (no check) | ✅ 409 "not allowed in current status" |
| Active session, idle participant | ❌ allowed (no check) | ✅ 403 "must be active" |

### Remaining edge cases

None. Both participant status AND session status are now gated.

---

## Files Modified

| File | Changes |
|------|---------|
| `lib/api/play-auth.ts` | Added `import { NextResponse }`, added `requireActiveParticipant()` function |
| `lib/play/session-guards.ts` | Added `'progress-update': ['active', 'paused']` to policy table |
| `app/api/play/heartbeat/route.ts` | Session SELECT includes `status`, added ended/cancelled/archived gate |
| `app/api/participants/sessions/rejoin/route.ts` | Rewrote `shouldActivate` to distinguish idle vs previously-approved |
| `app/api/play/ready/route.ts` | Added `requireActiveParticipant` import + guard |
| `app/api/play/sessions/[id]/decisions/[decisionId]/vote/route.ts` | Added `requireActiveParticipant` import + guard |
| `app/api/play/sessions/[id]/artifacts/[artifactId]/puzzle/route.ts` | Added `requireActiveParticipant` import + guard |
| `app/api/play/sessions/[id]/artifacts/[artifactId]/keypad/route.ts` | Added `requireActiveParticipant` import + guard |
| `app/api/play/me/role/reveal/route.ts` | Added `requireActiveParticipant` import + guard |
| `app/api/participants/progress/update/route.ts` | Added `requireActiveParticipant` + `assertSessionStatus` imports + guards + `status` in SELECT |

---

## Appendix: Closure Checks (GPT-requested)

### 1. GET /api/play/me/role — idle-safe confirmation

**File:** `app/api/play/me/role/route.ts`

**Findings:**

- **Read-only:** The handler is a pure GET. No `.update()`, `.insert()`, or `.delete()` calls. No broadcast events. No side effects.
- **Idle participants get correct payload:** The route uses `auth: 'participant'` → `resolveParticipant()` → `isParticipantValid()`, which allows `idle` through (only rejects `blocked`/`kicked`). An idle participant receives their role assignment data.
- **Secret masking still correct:** Lines 91–96 implement the BUG-047 dual-gate:
  1. `hostUnlocked` = `session.secret_instructions_unlocked_at` is set
  2. `participantRevealed` = `assignment.secret_instructions_revealed_at` is set
  3. If either gate fails → `private_instructions` and `private_hints` are deleted from the response
- **No interaction with new guards:** The `requireActiveParticipant()` guard was NOT added to this route (by design). The BUG-047 masking runs independently of participant status — it checks session and assignment flags, not participant status. An idle participant who somehow had a role assignment would still see secrets masked correctly.
- **Security tripwire still active:** Lines 77–88 hard-strip `FORBIDDEN_ROLE_KEYS` regardless of environment.

**Verdict:** ✅ Safe as idle-safe read-only. No mutations. Masking correct. No regression from Batch C.

---

### 2. Chat POST — policy classification

**File:** `app/api/play/sessions/[id]/chat/route.ts`

**Current state:**
- `auth: 'public'` with `resolveSessionViewer()` (dual-path: participant token OR host cookie)
- `assertSessionStatus(sessionStatus, 'chat')` → allowed in `lobby`, `active`, `paused`
- No participant status check (no `requireActiveParticipant`)
- Rate-limited: `rateLimit: 'strict'`

**Analysis:**

The chat route allows any valid viewer (participant or host) to send messages. For participants, `resolveSessionViewer()` calls `isParticipantValid()` which rejects `blocked`/`kicked` but allows `idle`.

**Product semantics question:** Should idle (approval-pending) participants be able to chat?

Arguments for **idle-safe** (current behavior):
- In a classroom/workshop lobby, idle participants might need to ask the host for help or communicate while waiting for approval
- Chat supports `visibility: 'host'` (private to host) — an idle participant sending "I'm here, please approve me" is a legitimate use case
- The lobby is explicitly in the `chat` policy (`['lobby', 'active', 'paused']`)
- Chat messages are logged with `sender_participant_id` — the host can see who sent them
- No mutation of participant or session state occurs — chat is write-to-log, not state-changing

Arguments for **active-required**:
- A strict approval flow means participants should have zero interaction before approval
- Allowing chat before approval means the participant is already "participating" in a social sense

**Policy decision: idle-safe (keep current behavior)**

Rationale: Chat is a communication channel, not a gameplay mutation. The product intent of `requireApproval` is to gate *gameplay participation* (voting, puzzles, readiness) — not to create a silent waiting room. The host-private messaging channel (`visibility: 'host'`) is specifically useful for the approval workflow itself. Adding `requireActiveParticipant` here would be over-restrictive with no security benefit.

**Classification:**
| Route | Policy | Rationale |
|-------|--------|-----------|
| POST /api/play/sessions/[id]/chat | **idle-safe** | Communication channel, not gameplay mutation. Useful for approval workflow. No state-machine impact. |
