# Wave 1 Extension — Post-Fix Verification

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-18
- Last updated: 2026-03-21
- Last validated: 2026-03-18

> Historical postfix verification snapshot for the Wave 1 extension fixes. Use this as bounded closure evidence rather than an active operating guide.

> Created: 2026-03-18
> Author: Claude (implementation + verification agent)
> Scope: BUG-047, BUG-058, BUG-035 — Batch A implementation

---

## Summary

| Bug | Fix Applied | Verdict | Status | Remaining Edge Cases |
|-----|-------------|---------|--------|---------------------|
| BUG-047 | Mask `private_instructions`/`private_hints` until both gates pass | **CLOSED** | ✅ KLAR | None — see notes |
| BUG-058 | Skip `status: 'active'` for `idle` participants | **CLOSED** | ✅ KLAR | None |
| BUG-035 | Email verification before membership upsert | **CLOSED** | ✅ KLAR | Edge case documented |

---

## BUG-047 — Secret instructions leak before unlock/reveal

### Fix applied

**File:** `app/api/play/me/role/route.ts`

1. Session query now selects `secret_instructions_unlocked_at` alongside `id`
2. After existing security tripwire (design-meta stripping), added dual-gate check:
   - `hostUnlocked`: `session.secret_instructions_unlocked_at` is set
   - `participantRevealed`: `assignment.secret_instructions_revealed_at` is set
3. If EITHER gate is not passed → `private_instructions` and `private_hints` are `delete`d from the role object before response

### Verification

- **Gate 1 only (host unlocked, participant not revealed):** `private_instructions` and `private_hints` masked ✅
- **Gate 2 only (participant revealed, host not unlocked):** masked ✅
- **Neither gate:** masked ✅
- **Both gates passed:** fields returned normally ✅
- **No assignment exists:** `role` is `null`, no fields to mask ✅
- **Adjacent fields checked:** `public_description`, `name`, `icon`, `color` — these are participant-safe and correctly remain visible at all times ✅

### Edge cases considered

- **Relock scenario (BUG-048):** If host relocks (nulls `secret_instructions_unlocked_at`), the `/me/role` endpoint will immediately mask the fields again on next call. This is correct behavior — the fix is defensive against relock.
- **Field still in SELECT:** `private_instructions` and `private_hints` are still fetched from DB but stripped server-side. This is a defense-in-depth pattern — if we later optimize to not fetch them at all, the masking code remains as a tripwire.

### Status: CLOSED ✅

---

## BUG-058 — Heartbeat promotes idle→active bypassing approval

### Fix applied

**File:** `app/api/play/heartbeat/route.ts`

1. After rejected-status and expiry checks, added `idle` detection: `const isIdle = participant.status === 'idle'`
2. Update query now conditionally spreads: idle participants get only `last_seen_at` updated; non-idle get `status: 'active'` + `disconnected_at: null` as before

### Verification

- **Idle participant (approval-pending):** only `last_seen_at` updated, status stays `idle` ✅
- **Active participant:** `status: 'active'`, `last_seen_at`, `disconnected_at: null` as before ✅
- **Disconnected participant:** promoted to `active` (correct — disconnected is not approval-pending) ✅
- **Blocked/kicked participant:** rejected at line 48 before reaching idle check ✅
- **State machine alignment:** matches rejoin's `shouldActivate = !requireApproval && participant.status !== 'idle'` ✅

### Edge cases considered

- **`disconnected` status:** Correctly still promoted to `active`. Only `idle` is the approval-pending state.
- **Client polling frequency:** No change — idle participants still send heartbeats, presence is tracked, but status is not promoted.

### Status: CLOSED ✅

---

## BUG-035 — Invitation accept without email verification

### Fix applied

**File:** `app/api/tenants/invitations/[token]/accept/route.ts`

1. After expiry check, added case-insensitive email comparison: `invite.email.toLowerCase() !== user.email.toLowerCase()`
2. On mismatch: audit log event `invitation_email_mismatch` with expected/actual emails, then 403 response
3. Guard clause: only applies if both `invite.email` and `user.email` are truthy

### Verification

- **Matching email (same case):** Accepted ✅
- **Matching email (different case):** Accepted (case-insensitive compare) ✅
- **Mismatched email:** 403 + audit log ✅
- **invite.email is null:** Falls through, no email check (invite without target email = open invite behavior) ✅
- **user.email is null:** Falls through, no email check (defensive, shouldn't happen with auth: 'user') ✅

### Edge cases considered

- **Null invite.email:** The guard `if (invite.email && user.email &&...)` means invites without a target email can still be accepted by anyone. This is intentional — some invitation systems allow open invites. If this is not desired, a separate policy change is needed.
- **BUG-036 still open:** The `upsert` with `onConflict: 'tenant_id,user_id'` will overwrite an existing membership role. This is a separate bug (BUG-036) not addressed in this fix.
- **Audit logging:** Mismatch attempts are logged with `invitation_email_mismatch` event type, including both emails, for security monitoring.

### Status: CLOSED ✅

---

## Remaining Related Bugs (NOT addressed by Batch A)

Each fixed bug exists in a broader family. These related bugs are tracked separately:

| Fixed Bug | Related Bug | Relationship | Status |
|-----------|-------------|-------------|--------|
| BUG-047 | BUG-048 | Relock (host nulls `unlocked_at`) — fix is already defensive against this | Tracked, not blocking |
| BUG-047 | BUG-063 | `/play/sessions/[id]/roles` GET uses `auth: 'public'` — but does NOT expose private fields (verified: `publicRoles` omits them) | Tracked separately |
| BUG-058 | BUG-056 | Approval flow gaps beyond heartbeat (e.g., rejoin edge cases) | Batch C verification queue |
| BUG-058 | BUG-060 | Broader state machine transitions (e.g., `disconnected` → `active` timing) | Batch C verification queue |
| BUG-035 | BUG-036 | Upsert `onConflict: 'tenant_id,user_id'` overwrites existing membership role | Tracked separately |

---

## Type Safety

`npx tsc --noEmit` → 0 errors after all three fixes.

---

## Files Modified

| File | Bug | Change |
|------|-----|--------|
| `app/api/play/me/role/route.ts` | BUG-047 | Session query adds `secret_instructions_unlocked_at`; dual-gate masking of `private_instructions`/`private_hints` |
| `app/api/play/heartbeat/route.ts` | BUG-058 | Conditional spread: idle-only gets `last_seen_at`, others get full activation |
| `app/api/tenants/invitations/[token]/accept/route.ts` | BUG-035 | Email comparison before membership upsert; audit log on mismatch |
