# Wave 1 Extension — Priority Verification Batch

> Created: 2026-03-18
> Author: Claude (post-fix verification agent)
> Status: VERIFICATION COMPLETE — ready for implementation decision

---

## Verdict Table

| Bug | Verdict | Severity | Root-cause Family | Action |
|-----|---------|----------|-------------------|--------|
| BUG-047 | **VERIFIED** | **P0** | Secret gating bypass | **Execute now** |
| BUG-058 | **VERIFIED** | **P1** | State machine break | **Execute now** |
| BUG-035 | **VERIFIED** | **P1** | Bespoke auth drift | **Execute now** |
| BUG-039 | **PARTIALLY VERIFIED** | **P1** | AuthZ gap / by-design tension | **Needs decision** |
| BUG-042 | **PARTIALLY VERIFIED** | **P2** | PII exposure (RLS-mitigated) | **Track only** |

---

## BUG-047 — Secret instructions returned before unlock/reveal gates

### Verdict: VERIFIED P0 — Execute Now

### Contract analysis

The secret instruction lifecycle requires two gates:
1. **Host unlock**: Host calls POST `/api/play/sessions/:id/secrets` → sets `session.secret_instructions_unlocked_at`
2. **Participant reveal**: Participant calls POST `/api/play/me/role/reveal` → sets `assignment.secret_instructions_revealed_at`

The reveal endpoint (`app/api/play/me/role/reveal/route.ts`) correctly enforces gate 1:
```
Line 59: if (!(session).secret_instructions_unlocked_at) → 409
```

### The bug

`GET /api/play/me/role` (`app/api/play/me/role/route.ts`) returns `private_instructions` and `private_hints` **unconditionally**.

**Code path verified:**
- Line 51-58: SELECT explicitly includes `private_instructions, private_hints` from `session_roles` join
- Line 68: Returns entire `role` object to participant
- Lines 72-86: Security tripwire strips design-meta fields (`assignment_strategy`, `scaling_rules`, etc.) but **does NOT strip `private_instructions` or `private_hints`**
- No check for `session.secret_instructions_unlocked_at`
- No check for `assignment.secret_instructions_revealed_at`

### Which fields should be masked?

| Field | Visible before unlock? | Visible before reveal? |
|-------|----------------------|----------------------|
| `name` | Yes | Yes |
| `icon`, `color` | Yes | Yes |
| `public_description` | Yes | Yes |
| `private_instructions` | **NO** | **NO** |
| `private_hints` | **NO** | **NO** |

### Is `/api/play/me/role` violating both gates or only one?

**Both.** The endpoint performs zero gating. A participant can call `GET /api/play/me/role?session_code=X` at any point after role assignment and receive `private_instructions` and `private_hints`, regardless of whether:
- The host has unlocked secrets (`secret_instructions_unlocked_at` is null)
- The participant has revealed their secrets (`secret_instructions_revealed_at` is null)

### Fix required

Server must mask `private_instructions` and `private_hints` until:
1. `session.secret_instructions_unlocked_at IS NOT NULL` (host has unlocked), **AND**
2. `assignment.secret_instructions_revealed_at IS NOT NULL` (participant has revealed)

Implementation: After fetching the assignment (line 50), fetch session to check `secret_instructions_unlocked_at`. If either gate is not passed, strip `private_instructions` and `private_hints` from the role object before returning.

### Needs migration: No
### Needs doc update: Yes — document masking behavior in participant API contract

---

## BUG-058 — Heartbeat promotes idle→active, bypassing approval flow

### Verdict: VERIFIED P1 — Execute Now

### State machine analysis

**Join route** (`app/api/participants/sessions/join/route.ts`):
- Line 130: `status: requireApproval ? 'idle' : 'active'`
- Correctly uses `idle` as waiting-for-approval state

**Rejoin route** (`app/api/participants/sessions/rejoin/route.ts`):
- Line 102: `const shouldActivate = !requireApproval && participant.status !== 'idle'`
- Correctly prevents activation of idle (awaiting approval) participants

**Heartbeat route** (`app/api/play/heartbeat/route.ts`):
- Line 48: Only checks `REJECTED_PARTICIPANT_STATUSES` = `{'blocked', 'kicked'}`
- Lines 57-62: Unconditionally sets `status: 'active'` for all non-rejected participants
- **`idle` is NOT in `REJECTED_PARTICIPANT_STATUSES`** — confirmed via `lib/api/play-auth.ts` line 24-27

### The bug

An `idle` participant (waiting for host approval in `requireApproval=true` sessions) becomes `active` the moment their client sends a heartbeat. The heartbeat poll runs automatically in the participant client.

### Comparison with rejoin

| Route | Handles idle correctly? | Logic |
|-------|------------------------|-------|
| join | ✅ | Sets `idle` when `requireApproval=true` |
| rejoin | ✅ | `shouldActivate = !requireApproval && status !== 'idle'` |
| heartbeat | **❌** | Blindly sets `active` for all non-blocked/kicked |

### Fix required

Heartbeat should:
1. **Never promote `idle` → `active`**
2. For `idle` participants: only update `last_seen_at` (presence tracking), leave `status` unchanged
3. Implementation: Add `idle` to the set of statuses that skip the `status: 'active'` update, or check `requireApproval` in session settings

### Needs migration: No
### Needs doc update: Yes — document heartbeat state-machine rules

---

## BUG-035 — Invitation accept does not verify email matches logged-in user

### Verdict: VERIFIED P1 — Execute Now

### Accept flow (`app/api/tenants/invitations/[token]/accept/route.ts`)

1. Line 10: `auth: 'user'` — requires authenticated user
2. Line 17-22: Load invitation by token from DB
3. Line 28: Check `invite.status === 'pending'`
4. Line 37: Check expiry
5. Line 39-46: **Upsert membership with `user_id: user.id`** — the currently logged-in user
6. **Missing:** No comparison between `invite.email` and `user.email`

### The bug

Any authenticated user who possesses (or guesses) an invitation token can accept it, even if the invitation was sent to a completely different email address. The invitation `email` field is informational only — it does not gate acceptance.

### Real-world impact

- User A invites `colleague@example.com` as `admin`
- User B (logged in as `attacker@example.com`) navigates to the accept URL
- User B receives `admin` role on User A's tenant

### Mitigation not present

- No case-insensitive email comparison
- No fallback check (e.g., email domain matching)
- The `upsert` with `onConflict: 'tenant_id,user_id'` means if User B already has a membership, it **overwrites their role** with the invitation role (also BUG-036)

### Fix required

Before creating membership:
1. Compare `invite.email.toLowerCase()` with `user.email.toLowerCase()`
2. If mismatch: return 403 — "This invitation was sent to a different email address"
3. Consider: allow system_admin override if needed

### Needs migration: No
### Needs doc update: No (correctness fix, existing contract preserved)

---

## BUG-039 — Public V1 APIs serve data with tenant_id as only "auth"

### Verdict: PARTIALLY VERIFIED P1 — Needs Decision

### Routes analyzed

| Route | Auth | Client | Data returned |
|-------|------|--------|--------------|
| `GET /api/public/v1/games` | None | `createServiceRoleClient()` | Published games (name, desc, player counts) |
| `GET /api/public/v1/games/[id]` | None | `createServiceRoleClient()` | Game details + optional session stats |
| `GET /api/public/v1/sessions` | None | `createServiceRoleClient()` | Session list (display name, status, timestamps, participant count) |
| `GET /api/public/v1/sessions/[id]` | None | `createServiceRoleClient()` | Session details (same fields + duration) |

### Observations

1. **All 4 routes use raw `export async function GET`** — not wrapped in `apiHandler`, so no rate limiting
2. **All use `createServiceRoleClient()`** — complete RLS bypass
3. **Only scoping is `tenant_id` as query parameter** — no API key, no bearer token
4. Comment in games route: `// API key validation would go here` — explicitly planned but not implemented
5. Games routes only return published games — **by design for public catalog**
6. Sessions routes return all sessions including `participant_count`, timestamps, `display_name`

### Is this by design?

**Partly.** The routes are documented as "public, read-only" in `docs/toolkit/api-reference/`. The games catalog exposure is likely intentional. But:
- The comment `// API key validation would go here` proves API key auth was **planned but skipped**
- Service role client is unnecessarily powerful — could use RLS with a restricted service account
- No rate limiting means a scraper can enumerate all tenants' session data
- Session data (active counts, timestamps) may be business-sensitive even if not PII

### Decision needed

| Option | Impact |
|--------|--------|
| A: Add API key to all public v1 routes | Full fix — matches original intent |
| B: Add API key to sessions only, keep games public | Partial — games catalog stays open |
| C: Wrap in `apiHandler` for rate limiting only | Mitigates abuse, doesn't address auth |
| D: Accept as-is (document as intentional) | Risk accepted, document decision |

### Fix required (if approved)

1. At minimum: wrap all 4 routes in `apiHandler` for rate limiting
2. Recommended: implement API key validation (the comment shows it was planned)
3. Replace `createServiceRoleClient()` with an RLS-scoped approach or keep service role but add explicit tenant ownership check

### Needs migration: No
### Needs doc update: Yes — document the auth decision either way

---

## BUG-042 — Invitation token lookup leaks email/role/status

### Verdict: PARTIALLY VERIFIED P2 — Track Only

### Route analyzed (`app/api/tenants/invitations/[token]/route.ts`)

The GET endpoint returns:
```
tenant_id, email, role, status, expires_at, accepted_at, token
```

### RLS mitigation (significant)

The route uses `createServerRlsClient()`. RLS policy on `tenant_invitations`:
```sql
CREATE POLICY tenant_invitations_select ON public.tenant_invitations
FOR SELECT USING (is_system_admin() OR tenant_id = ANY(get_user_tenant_ids()));
```

`get_user_tenant_ids()` queries `user_tenant_memberships WHERE user_id = auth.uid()`.

**Impact:** Only existing members of the same tenant (or system admins) can read invitation data. Unauthenticated users and non-members get an empty result.

### Codex claim vs reality

| Codex claim | Verified? |
|-------------|-----------|
| "leaks email" | Partially — only to same-tenant members |
| "leaks name" | **FALSE** — no name field in response |
| "leaks role/status/token" | Partially — only to same-tenant members |

### Remaining risk

- Any authenticated tenant member (not just admin/owner) can read invitation details by token
- The `token` field is redundant in response (already in URL) — unnecessary exposure
- For most real-world scenarios, tenant members knowing pending invitation emails is expected admin behavior

### Secondary finding

The invitation accept flow at `accept/route.ts` also uses `createServerRlsClient()`. This means **non-member invitees cannot read or accept invitations** — the invitation flow may be functionally broken for new users who aren't already tenant members. This is a separate functional bug beyond BUG-042's scope.

### Recommendation

- **P2 Track Only** — RLS provides adequate protection against external leakage
- Optional hardening: strip `token` from GET response (it's already in the URL)
- Separate investigation: verify the invitation accept flow works for non-member invitees (likely a new finding)

### Needs migration: No
### Needs doc update: No (unless accept flow is confirmed broken)

---

## Additional Finding: Invitation Accept May Be Broken for Non-Members

During BUG-042 analysis, discovered that both the token GET and accept POST routes use `createServerRlsClient()`. The RLS policy on `tenant_invitations` restricts SELECT to existing tenant members. This means a newly invited user who is NOT yet a member cannot:
1. Preview the invitation (GET returns no data)
2. Accept the invitation (accept POST reads the invite first, gets null, returns 400)

This needs investigation as a separate finding — potentially **BUG-067** if confirmed.

---

## Proposed Implementation Order

### Batch 1 — Immediate (P0 + P1 verified, no decisions needed)

| Priority | Bug | Fix | Complexity | Files |
|----------|-----|-----|------------|-------|
| 1 | **BUG-047** | Mask `private_instructions`/`private_hints` until both gates pass | Low | `app/api/play/me/role/route.ts` |
| 2 | **BUG-058** | Skip `status: 'active'` for `idle` participants in heartbeat | Low | `app/api/play/heartbeat/route.ts` |
| 3 | **BUG-035** | Add email verification to invitation accept | Low | `app/api/tenants/invitations/[token]/accept/route.ts` |

**Rationale:**
- BUG-047 is P0 — directly undermines the game's core information control model
- BUG-058 is P1 — bypasses host approval, state machine integrity
- BUG-035 is P1 — auth/invitation integrity gap

### Batch 2 — Pending Decision

| Bug | Decision needed from |
|-----|---------------------|
| **BUG-039** | Product owner — is public API intentionally unauthenticated? |

### Batch 3 — Track / Low Priority

| Bug | Why track |
|-----|-----------|
| **BUG-042** | RLS mitigates — same-tenant exposure only. Optional: strip token from response |

### After Batch 1, resume existing second-pass queue:
4. Family 4 second pass (BUG-019+025) — partial-failure split-brain
5. BUG-022 second pass — seat enforcement on legacy path
6. BUG-006 phase 2 — admin page tenant ID migration
