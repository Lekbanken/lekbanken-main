# Batch D Verification — Rejoin Policy Gaps + Host Action Integrity

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-19
- Last updated: 2026-03-21
- Last validated: 2026-03-19

> Historical issue-family verification snapshot for Batch D before and alongside the postfix closure pass. Use this as bounded verification history rather than an active operating guide.

> Created: 2026-03-19  
> Author: Claude (verification agent)  
> Scope: BUG-056, BUG-057, BUG-060, BUG-061, BUG-085  
> Family: RC-10 — State Machine Break (Clusters 13–14)  
> Directive: GPT requested verdict table, severity, family classification, smallest safe batch  

> **Implementation status:** ✅ ALL FIVE FIXED (2026-03-19)  
> **Postfix verification:** `audits/batch-d-postfix-verification.md`

---

## Executive Summary

Five bugs from the RC-10 (State Machine Break) family were code-verified against the live codebase. **All five are confirmed.** They split into two natural sub-groups by file:

1. **Rejoin policy gaps** (BUG-056 + BUG-057) — `participants/sessions/rejoin/route.ts`
2. **Host action integrity gaps** (BUG-060 + BUG-061 + BUG-085) — `play/sessions/[id]/participants/[participantId]/route.ts`

These are the natural continuation of Batch C (participant state-machine hardening). All bugs are in the same RC-10 family, same two clusters (C13 + C14), and involve the same two files.

---

## 1. Verdict Table

| Bug | Cluster | Title | Verified? | Severity | Root Cause | File |
|-----|---------|-------|-----------|----------|------------|------|
| **BUG-056** | C13 | Rejoin ignores `allow_rejoin=false` | ✅ CONFIRMED | **P1** | Missing policy check | `rejoin/route.ts` |
| **BUG-057** | C13 | Rejoin ignores `session.expires_at` | ✅ CONFIRMED | **P2** | Inconsistent guard (join checks it, rejoin doesn't) | `rejoin/route.ts` |
| **BUG-060** | C14 | approve/kick/block returns success when no row matched | ✅ CONFIRMED | **P2** | False-success pattern (RC-4) | `participants/[p]/route.ts` |
| **BUG-061** | C14 | approve can reactivate kicked/blocked participants | ✅ CONFIRMED | **P2** | Missing status guard | `participants/[p]/route.ts` |
| **BUG-085** | C14 | setNextStarter missing `session_id` + non-atomic | ✅ CONFIRMED | **P3** | Scope leak + race (host-only) | `participants/[p]/route.ts` |

**Family:** All RC-10 (State Machine Break). BUG-060 also overlaps with RC-4 (False Success).

---

## 2. Code Evidence

### BUG-056 — Rejoin ignores `allow_rejoin=false`

**File:** `app/api/participants/sessions/rejoin/route.ts`

**Evidence:**
- Session settings JSONB includes `allow_rejoin` — confirmed in baseline migration (default: `true`) and `session-service.ts` line 77: `allow_rejoin: options.settings?.allowRejoin ?? true`
- Rejoin route reads `settings` from the session join (for `require_approval`), but **never extracts or checks `allow_rejoin`**
- The setting exists in DB, is documented, is set by hosts — but rejoin completely ignores it
- A host who sets `allow_rejoin: false` gets no enforcement

**Impact:** Session hosts cannot prevent participants from rejoining. The setting is a no-op.

**Fix:** After session status validation, check `settings.allow_rejoin !== false` (default true for backwards compat). Return 403 if rejoin disabled.

---

### BUG-057 — Rejoin ignores `session.expires_at`

**File:** `app/api/participants/sessions/rejoin/route.ts`

**Evidence:**
- Line ~53: `sessions!inner(id, status, settings, expires_at, ...)` — `expires_at` is fetched via the session join
- Lines 89–96: Only `participant.token_expires_at` is validated
- **`session.expires_at` is fetched but never compared against `new Date()`**
- The join route (`participants/sessions/join/route.ts` line 87) HAS this check:
  ```
  if (session.expires_at && new Date(session.expires_at) < new Date())
  ```
- Rejoin route was written without porting this guard

**Impact:** Participants can rejoin expired sessions. The join route blocks them, but rejoin doesn't.

**Fix:** Add the same `expires_at` check from the join route, right after the session status check. Return 410 for expired sessions.

---

### BUG-060 — approve/kick/block returns success when no row matched

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

**Evidence:**
- Approve (line ~42): `const { error } = await supabase.from('participants').update({ status: 'active' }).eq('id', participantId).eq('session_id', sessionId)`
- Kick (line ~57): Same pattern with `{ status: 'kicked' }`
- Block (line ~71): Same pattern with `{ status: 'blocked' }`
- All three check `if (error)` but **never verify that any row was actually updated**
- Returns `{ success: true }` even if `participantId` doesn't exist or doesn't belong to the session

**Impact:** Host gets false confirmation. A stale UI showing a participant who already left could silently succeed without effect. Low direct harm (host-only) but misleading.

**Fix:** Change to `.update(...).select()` and check `data.length === 0` → return 404.

---

### BUG-061 — approve can reactivate kicked/blocked participants

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

**Evidence:**
- Approve action (line ~42): `.update({ status: 'active' }).eq('id', participantId).eq('session_id', sessionId)`
- **No filter on current status** — will set ANY participant to `active`
- A `kicked` or `blocked` participant can be re-approved without the host explicitly unblocking
- The kick/block actions don't filter on status either, but those are less problematic (idempotent in the wrong direction)

**Impact:** Host accidentally (or UI bug) re-approves a blocked participant. This undermines the block action.

**Fix:** Add `.eq('status', 'idle')` to the approve update — only approve participants who are in `idle` (pending approval) state. If we want a deliberate "unblock" flow, it should be a separate action.

---

### BUG-085 — setNextStarter missing `session_id` + non-atomic

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`

**Evidence:**
- Lines ~92–125: `setNextStarter` action uses two sequential queries:
  1. Clear `is_next_starter` on all participants in session (scoped by `session_id` ✅)
  2. Read participant's `progress` — `.eq('id', participantId).single()` **without `.eq('session_id', sessionId)`**
- The second query's missing `session_id` filter means it could theoretically read a participant from another session with the same ID (UUIDs make this practically impossible, but it's a correctness gap)
- The two-step clear-then-set is non-atomic — a crash between steps leaves the session without a starter

**Impact:** Very low — host-only route, UUIDs prevent cross-session collisions in practice. The non-atomicity is a minor correctness issue.

**Fix:** Add `.eq('session_id', sessionId)` to the second query. The non-atomic pattern is acceptable for now (host-only, recoverable).

---

## 3. Family Classification

All five bugs belong to **RC-10: State Machine Break** (Clusters 13–14).

| Sub-group | Bugs | Theme | Shared file |
|-----------|------|-------|-------------|
| Rejoin policy gaps | BUG-056, BUG-057 | Session settings/expiry not enforced on rejoin | `rejoin/route.ts` |
| Host action integrity | BUG-060, BUG-061 | Approve/kick/block lack row verification + status guards | `participants/[p]/route.ts` |
| Host action scope | BUG-085 | setNextStarter scope + atomicity gap | `participants/[p]/route.ts` (same file) |

This is the **same family** as Batch C (BUG-079/081/083/084). Natural continuation.

---

## 4. Smallest Safe Batch Proposal

### Batch D — RC-10 State Machine Break Continuation

**2 files, 5 bugs, 4 changes:**

#### Change 1: BUG-056 — Enforce `allow_rejoin` in rejoin route

**File:** `app/api/participants/sessions/rejoin/route.ts`  
**Change:** After session status validation, extract `allow_rejoin` from `session.settings` and return 403 if `false`.  
**Lines affected:** ~5 new lines  
**Risk:** Low — additive guard. Default `true` preserves current behavior for sessions without the setting.

#### Change 2: BUG-057 — Enforce `session.expires_at` in rejoin route

**File:** `app/api/participants/sessions/rejoin/route.ts` (same file as Change 1)  
**Change:** After session status validation, check `session.expires_at` against `new Date()`. Return 410 if expired.  
**Lines affected:** ~4 new lines  
**Risk:** Low — mirrors the join route's existing check. Same 410 response.

#### Change 3: BUG-060 + BUG-061 — Row verification + status guard on approve/kick/block

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`  
**Change:**
1. All three actions: change `const { error }` to `const { data, error }` using `.select()` after `.update()`, return 404 if `data.length === 0`
2. Approve only: add `.eq('status', 'idle')` to restrict approval to pending participants  
**Lines affected:** ~15 modified lines  
**Risk:** Low — host-only route with ownership check. Adding `.select()` is a minor query change. Adding status filter on approve prevents unintended reactivation.

#### Change 4: BUG-085 — Add `session_id` to setNextStarter second query

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts` (same file as Change 3)  
**Change:** Add `.eq('session_id', sessionId)` to the participant progress read query.  
**Lines affected:** 1 line  
**Risk:** Negligible — purely defensive, adds correct scoping.

### Batch D Summary

| Metric | Value |
|--------|-------|
| Files touched | 2 |
| Bugs closed | 5 (BUG-056, BUG-057, BUG-060, BUG-061, BUG-085) |
| New lines | ~25 |
| Modified lines | ~15 |
| Migration needed | No |
| Frontend impact | Rejoin returns 403/410 for disabled/expired sessions; approve returns 404 for non-idle participants |

### Execution Order

1. BUG-056 + BUG-057 (rejoin route — same file, bundle together)
2. BUG-060 + BUG-061 + BUG-085 (participants PATCH route — same file, bundle together)
3. `npx tsc --noEmit` — must pass
4. Postfix verification

### Regression Test Plan

| Test | Expected |
|------|----------|
| Rejoin with `allow_rejoin: false` | 403 |
| Rejoin on expired session | 410 |
| Rejoin on valid session (no setting) | 200 (default true) |
| Approve idle participant | 200 |
| Approve kicked participant | 404 (no matching row) |
| Approve blocked participant | 404 (no matching row) |
| Kick/block non-existent participant | 404 |
| Kick/block valid participant | 200 |
| setNextStarter | Still works correctly with session_id filter |

---

## 5. What NOT to Include

- **BUG-055** (rejoin uses sessionId vs sessionCode) — contract mismatch, not a state-machine bug. Defer.
- **BUG-059** (setPosition unreachable due to status guard) — policy contradiction needing design decision. Defer.
- **BUG-062** (setNextStarter non-atomic race condition) — accept for now; BUG-085 adds the scope fix. Full atomicity is Wave 2 material.
- **Demo/analytics bugs** — out of scope per GPT directive.

---

## 6. Wave 1 Scoreboard (after Batch D, if approved)

| Status | Count | Items |
|--------|-------|-------|
| ✅ CLOSED | 18 | MFA-004, BUG-029/031/034, BUG-027, BUG-047, BUG-058, BUG-035, BUG-019+025, BUG-006, BUG-079, BUG-081, BUG-083, BUG-084, BUG-056, BUG-057, BUG-060, BUG-061, BUG-085 |
| ⚠️ NEEDS DECISION | 1 | BUG-022 (DD-LEGACY-1) |
| ⏳ BLOCKED | 2 | MFA-005 (DD-MFA-1), BUG-020 (DD-RACE-1) |

> Note: BUG-056/057/060/061 are currently categorized as Wave 2 in the triage doc. This batch proposes promoting them to Wave 1 because they are the same RC-10 family we've been systematically closing, and the fixes are low-risk additive guards.
