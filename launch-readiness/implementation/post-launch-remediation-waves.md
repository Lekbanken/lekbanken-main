# Post-Launch Remediation Waves

> **Status:** WAVE 1 COMPLETE — 22 closed, 1 needs decision (BUG-022/DD-LEGACY-1) (2026-03-19)  
> **Created:** 2026-03-18  
> **Updated:** 2026-03-19  
> **Source:** `audits/post-launch-cluster-triage.md`, `audits/wave1-extension-verification.md`  
> **Rule:** Do not start Wave N+1 until Wave N is green. Do not skip verification.
>
> **Errata (2026-03-19):** Commit `3966ae6` subject says "18 bugs" — canonical count is **20 closed**. BUG-022 was erroneously listed under "Bugs closed" in the commit message; it remains ⚠️ PARTIALLY REMEDIATED pending DD-LEGACY-1 decision. The 20 closed bugs are: MFA-004, BUG-006, BUG-019, BUG-025, BUG-027, BUG-029, BUG-031, BUG-034, BUG-035, BUG-047, BUG-056, BUG-057, BUG-058, BUG-060, BUG-061, BUG-079, BUG-081, BUG-083, BUG-084, BUG-085.

---

## Wave 1 — Critical Execution Now

**Scope:** 12 findings (3 P0, 9 P1) — security, tenant isolation, financial integrity, authorization bypass, secret gating, state machine  
**Gate:** All verified. 7 executable immediately + 3 newly promoted, 1 needs migration (BUG-020), 1 blocked on DD-MFA-1 (MFA-005).

### Execution Order

#### 1.1 MFA-004 — Silent-fail MFA reset ✅ KLAR (2026-03-18)

**File:** `app/api/admin/tenant/[tenantId]/mfa/users/[userId]/reset/route.ts`  
**Root cause:** RC-1 + RC-4 — `user_mfa` update uses wrong field names (`is_enrolled`, `last_verification_at`, `grace_period_started_at`); PostgREST returns 0-row update; code reports success  
**Fix applied:**
1. Replaced field names with actual `user_mfa` columns: `enrolled_at: null`, `last_verified_at: null`, `methods: null`, `grace_period_end: null`
2. Fail-hard: `if (clearError) return NextResponse.json({ error: '...' }, { status: 500 })`
3. Removed `as unknown as SupabaseClient` cast
4. Device delete now scoped: added `.eq('tenant_id', tenantId)`

**Migration:** None  
**Frontend impact:** None (admin API, same contract)  
**Regression test:** Call reset API for non-enrolled user → expect error, not 200

---

#### 1.2 BUG-029 + BUG-031 + BUG-034 — Publish workflow bypass ✅ KLAR (2026-03-18)

**Files:** `games/route.ts`, `builder/route.ts`, `builder/[id]/route.ts`, `csv-import/route.ts`  
**Root cause:** RC-7 — Multiple create/update endpoints accept arbitrary status  
**Fix applied:**
1. `games/route.ts`: `status: 'draft'` forced on create
2. `builder/route.ts`: `status: 'draft' as const` forced on create
3. `builder/[id]/route.ts`: Conditional spread omits status if 'published' (preserves existing state, blocks new publish)
4. `csv-import/route.ts`: `status: 'draft' as const` forced on import

**Canonical rule:** Only `/api/games/[gameId]/publish` may set status to 'published'

---

#### 1.3 BUG-027 — Product filter authorization bypass ✅ KLAR (2026-03-18)

**File:** `app/api/games/search/route.ts`  
**Root cause:** RC-7 — `effectiveProductFilter = products.length ? products : allowedProductIds` replaces authorized set  
**Fix applied:** Changed to `products.filter((p: string) => allowedProductIds.includes(p))` — intersection instead of replacement

---

#### 1.4 BUG-019 + BUG-025 — Cart provisioning (bundled) ✅ KLAR (2026-03-19)

**Files:**
- `app/api/checkout/cart/route.ts` — BUG-019: `product_id: productIds[0]` only stores first
- `app/api/billing/webhooks/stripe/route.ts` — BUG-025: provisions one entitlement without seat verification

**Root cause:** RC-4 — user pays for N products, receives 1 entitlement, no seat check  
**Fix applied (pass 1):** Webhook reads ALL product IDs from `stripeSession.metadata?.product_ids`. Loops over all products creating entitlements + seat assignments + bundle expansion for each.  
**Fix applied (pass 2 — 2026-03-19):**
1. Removed broken `provisioning` intermediate status — violated `purchase_intents_status_chk` CHECK constraint (only allows `draft|awaiting_payment|paid|provisioned|failed|expired`). The `as never` TypeScript cast bypassed TS but not PostgreSQL.
2. Fixed split-brain: partial failure now leaves intent in `paid` status for Stripe retry (previously marked `provisioned` even with missing products). Already-provisioned entitlements are found on retry and skipped.
3. All-failed still marks `failed`. Partial failure stores observability data in intent `metadata.partial_provisioning`.
4. Individual operations remain idempotent via existing-entitlement check + 23505 tolerance.

**Noteringar:**
- Concurrent webhook handlers produce correct results — all provisioning operations are individually idempotent, no exclusive claim needed.
- Stripe auto-retry heals partial failures: on retry, succeeded products are found existing and skipped, failed products re-attempted.

---

#### 1.5 BUG-006 — Admin tenant context desync ✅ KLAR (2026-03-19)

**Files:**
- `app/actions/tenant.ts` — `selectTenant` action
- `app/admin/tenant/[tenantId]/layout.tsx` — TenantRouteSync
- 9 pages under `app/admin/tenant/[tenantId]/` — converted to route param

**Root cause:** RC-2 — child pages read tenant from context; system admins skip sync; context may hold previous tenant  
**Fix applied (pass 1):**
1. `selectTenant` now handles system admins: when no membership found, falls back to direct tenant read (RLS policy `tenants_select_sysadmin` ensures only system admins succeed)
2. `TenantRouteSync` always enabled (removed `enabled={!isSystemAdmin && hasTenantAccess}` guard)

**Fix applied (pass 2 — 2026-03-19):** Made route param canonical for all 9 remaining context-dependent pages:
- analytics, billing, content, games, gamification, gamification/achievements, licenses, members, subscription
- Each page now uses `use(params)` (React 19 pattern) to extract `tenantId` from route
- `useTenant()` import removed from 8 pages; kept only in achievements for `currentTenant?.name` display
- TenantRouteSync remains as secondary sync for context consumers outside the page tree

**Noteringar:**
- 7 pages already used route params (sessions, participants, legal, security/mfa) — no change needed
- 2 pages (dashboard, settings) are static placeholders with no tenant data fetching — no change needed
- 13 admin pages outside `/tenant/[tenantId]/` correctly use `useTenant()` (no route param available)

---

#### 1.6 BUG-022 — Legacy billing fallback ⚠️ PARTIALLY REMEDIATED / NEEDS DECISION (2026-03-19)

**File:** `app/api/games/utils.ts` (`getAllowedProductIds`)  
**Root cause:** RC-5 — legacy `tenant_subscriptions` path adds products without seat check, includes paused subscriptions  
**Fix applied (pass 1):** Status filter changed from `['active', 'trial', 'paused']` to `['active', 'trial']` — paused subscriptions no longer grant access.  
**Fix applied (pass 2 — 2026-03-19):** Legacy path now skips entirely when `!userId`, matching canonical entitlement path's guard.

**⚠️ Open decision (DD-LEGACY-1):** Legacy subscription fallback still grants access to authenticated admin/owner users without seat enforcement. This is NOT an intentional coexistence — it's an unfinished migration:
- New purchases (cart/checkout flow) → `tenant_product_entitlements` + seat assignments (canonical)
- Old `create-subscription` route → `tenant_subscriptions` only (legacy)
- No formal ADR exists; no tenant data migration has been performed
- 5 files still write/read `tenant_subscriptions`; `billing_product_key` only consumed in this legacy path

**To close BUG-022 fully, one of:**
1. **Migrate data:** Audit which tenants have subscriptions but no entitlements → create entitlements + seats → remove legacy block
2. **Accept & document:** Write formal ADR accepting legacy admin/owner access as permanent design → close as accepted risk

**5 runtime callers:** `browse/filters`, `games/featured`, `games/[gameId]`, `games/[gameId]/related`, `games/search`.

---

#### 1.7 BUG-020 — Seat oversubscription race ✅ KLAR (2026-03-19)

**File:** `app/api/billing/tenants/[tenantId]/seats/route.ts`  
**Root cause:** RC-3 — `SELECT count` → compare → `INSERT` not atomic  
**Fix:** Created Postgres RPC `assign_seat_if_available()` using `SELECT ... FOR UPDATE` on the subscription row + conditional INSERT. Route now calls RPC instead of count→check→insert.  
**Migration:** `20260319012804_assign_seat_if_available.sql`  
**Design decision:** DD-RACE-1 — RESOLVED: `FOR UPDATE` lock on subscription row + conditional INSERT (not advisory lock)  
**Frontend impact:** None  
**Regression test:** Concurrent seat assignment requests at limit → verify exactly N seats, not N+M

**Noteringar:**
- RPC uses `SECURITY DEFINER` to bypass RLS (admin-only action already gated by role check in route)
- Subscription row locked with `FOR UPDATE` to serialize concurrent assignments
- Error messages mapped from PG exceptions to user-friendly HTTP responses

---

#### 1.8 MFA-005 — Cross-tenant MFA bypass ✅ KLAR (2026-03-19)

**Files:** `lib/services/mfa/mfaDevices.server.ts`, `app/api/accounts/auth/mfa/devices/verify/route.ts`, `lib/auth/mfa-aal.ts`, `proxy.ts`  
**Root cause:** RC-2 — verify path queries `user_id` without `tenant_id`, returns device from any tenant  
**Fix:** Added `tenantId: string` as required 4th parameter to `verifyTrustedDevice()`. Added `.eq('tenant_id', tenantId)` to the verify query. Route reads tenant ONLY from HMAC-signed cookie — never from client body.  
**Design decision:** DD-MFA-1 — RESOLVED: Tenant-scoped trust (server-canonical cookie only)  
**Migration:** None (RLS policy already has `tenant_id` column)  
**Frontend impact:** MFA challenge flow must supply tenant context (already available via cookie)  
**Regression test:** User with devices in tenant A and B → verify from tenant A context → only tenant A device accepted

**Noteringar:**
- **Postfix hardening (2026-03-19):** Two additional vectors closed:
  1. `devices/verify` route: removed `body.tenant_id` override — uses ONLY `readTenantIdFromCookies()` (HMAC-signed, httpOnly cookie). Prevents client spoofing.
  2. Middleware path: `checkTrustedDevice()` in `mfa-aal.ts` now requires `tenantId` param with `.eq('tenant_id', tenantId)`. `proxy.ts` reads tenant from signed cookie before MFA check.
- Trust check is skipped (falls through to normal MFA) if tenant cookie is not yet set (e.g. first login before tenant selection).

---

#### 1.9 BUG-047 — Secret instructions returned before unlock/reveal ✅ KLAR (2026-03-18)

**File:** `app/api/play/me/role/route.ts`  
**Root cause:** RC-9 Secret gating bypass — `private_instructions` and `private_hints` selected and returned unconditionally  
**Fix applied:**
1. Session query now selects `secret_instructions_unlocked_at`
2. After security tripwire, dual-gate check: host unlock AND participant reveal
3. If either gate fails, `private_instructions` and `private_hints` are deleted from response

**Migration:** None  
**Frontend impact:** Clients must trigger reveal to see secrets  
**Regression test:** GET /api/play/me/role before host unlock → no secrets; after unlock before reveal → no secrets; after both → secrets visible

---

#### 1.10 BUG-058 — Heartbeat promotes idle→active bypassing approval ✅ KLAR (2026-03-18)

**File:** `app/api/play/heartbeat/route.ts`  
**Root cause:** RC-10 State machine break — heartbeat sets `status: 'active'` for all non-blocked/kicked participants  
**Fix applied:**
1. Added `idle` detection: `const isIdle = participant.status === 'idle'`
2. Conditional spread: idle participants get `last_seen_at` only; others get `status: 'active'` + `disconnected_at: null`
3. Aligns with rejoin's `shouldActivate = !requireApproval && status !== 'idle'`

**Migration:** None  
**Frontend impact:** None — idle participants remain idle until host approves  

---

#### 1.11 BUG-035 — Invitation accept without email verification ✅ KLAR (2026-03-18)

**File:** `app/api/tenants/invitations/[token]/accept/route.ts`  
**Root cause:** RC-6 Bespoke auth drift — no comparison between `invite.email` and `user.email`  
**Fix applied:**
1. Case-insensitive email comparison before membership upsert
2. On mismatch: 403 "This invitation was sent to a different email address"
3. Audit log event `invitation_email_mismatch` with expected/actual emails
4. Guard clause: only applies if both `invite.email` and `user.email` are truthy

**Migration:** None  
**Frontend impact:** None — correct users can still accept; wrong users are now blocked  

---

#### 1.12 Batch C — Participant State-Machine Hardening ✅ KLAR (2026-03-19)

> BUG-079, BUG-081, BUG-083, BUG-084 — Cluster 19 family fix
> Audit: `audits/participant-state-machine-hardening-audit.md`
> Postfix: `audits/participant-state-machine-postfix-verification.md`

**BUG-083 — Idle participants bypass mutation gates ✅ KLAR**

**Files:** `lib/api/play-auth.ts` + 6 mutation routes  
**Root cause:** `isParticipantValid()` only rejects `blocked`/`kicked` — `idle` passes all mutations  
**Fix applied:** New `requireActiveParticipant()` guard. Applied to: ready, vote, puzzle, keypad, role/reveal, progress/update. NOT applied to: GET /me, GET /me/role (idle-safe reads), heartbeat (own handling), chat (deferred).  
**Migration:** None  
**Frontend impact:** Idle participants see 403 if they attempt mutations before host approval  

**BUG-079 — Heartbeat reactivates after session ends ✅ KLAR**

**File:** `app/api/play/heartbeat/route.ts`  
**Root cause:** Session SELECT lacked `status` — no gate for ended/cancelled/archived  
**Fix applied:** `select('id, status')` + reject 410 for terminal session states  
**Migration:** None  
**Frontend impact:** Heartbeats for ended sessions return 410 — client should handle gracefully  

**BUG-081 — Approved-then-disconnected cannot rejoin ✅ KLAR**

**File:** `app/api/participants/sessions/rejoin/route.ts`  
**Root cause:** `shouldActivate = !requireApproval && status !== 'idle'` conflated two concerns  
**Fix applied:** `previouslyApproved = status === 'active' || status === 'disconnected'`; `shouldActivate = !requireApproval || previouslyApproved`  
**Migration:** None  
**Frontend impact:** None — approved participants in approval sessions can now rejoin correctly  

**BUG-084 — Progress/update missing session guard ✅ KLAR**

**Files:** `lib/play/session-guards.ts`, `app/api/participants/progress/update/route.ts`  
**Root cause:** Route never integrated with session-guards system  
**Fix applied:** Added `'progress-update': ['active', 'paused']` policy + `assertSessionStatus()` call + `status` in SELECT  
**Migration:** None  
**Frontend impact:** Progress writes after session ends return 409  

---

#### 1.13 Batch D — Rejoin Policy Gaps + Host Action Integrity ✅ KLAR (2026-03-19)

> BUG-056, BUG-057, BUG-060, BUG-061, BUG-085 — RC-10 family continuation (Clusters 13–14)
> Audit: `audits/batch-d-rejoin-host-action-verification.md`
> Postfix: `audits/batch-d-postfix-verification.md`

**BUG-056 — Rejoin ignores `allow_rejoin=false` ✅ KLAR**

**File:** `app/api/participants/sessions/rejoin/route.ts`  
**Root cause:** `allow_rejoin` setting exists in DB/session-service but rejoin route never reads or checks it  
**Fix applied:** Extract `allow_rejoin` from `session.settings` (supports both snake_case and camelCase); return 403 if disabled; default `true` for backward compat  
**Migration:** None  
**Frontend impact:** Clients may receive 403 when rejoining sessions with `allow_rejoin: false` (previously silently succeeded)  

**BUG-057 — Rejoin ignores `session.expires_at` ✅ KLAR**

**File:** `app/api/participants/sessions/rejoin/route.ts`  
**Root cause:** `session.expires_at` fetched in SELECT but never validated; join route has the check, rejoin doesn’t  
**Fix applied:** Added `session.expires_at` check mirroring join route pattern; returns 410 if expired  
**Migration:** None  
**Frontend impact:** Clients may receive 410 when rejoining expired sessions (previously silently succeeded)  

**BUG-060 — approve/kick/block returns success when no row matched ✅ KLAR**

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`  
**Root cause:** All three actions use `const { error }` without checking row count; return `{ success: true }` even if participantId doesn’t exist  
**Fix applied:** Added `.select('id')` to all update operations (approve/kick/block/setNextStarter); check row count; return 404 if no match; broadcast only fires after verified mutation  
**Migration:** None  
**Frontend impact:** Host clients may receive 404 for stale participant references (previously silent false-success)  

**BUG-061 — approve can reactivate kicked/blocked participants ✅ KLAR**

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`  
**Root cause:** Approve action uses `.update({ status: 'active' })` without filtering on current status  
**Fix applied:** Added `.eq('status', 'idle')` to approve — only participants in pending-approval state can be approved  
**Migration:** None  
**Frontend impact:** Approve returns 404 for non-idle participants (previously silently reactivated kicked/blocked)  

**BUG-085 — setNextStarter missing `session_id` on progress read ✅ KLAR**

**File:** `app/api/play/sessions/[id]/participants/[participantId]/route.ts`  
**Root cause:** Second query reads participant progress with `.eq('id', participantId)` but no `.eq('session_id', sessionId)`  
**Fix applied:** Added `.eq('session_id', sessionId)` to progress read; added early 404 if participant not found; added `.select('id')` + row verification on final update; broadcast gated  
**Migration:** None  
**Frontend impact:** None — UUIDs made cross-session collision practically impossible; this is a correctness defense  

---

### Wave 1 Regression Plan

After all Wave 1 fixes:

1. **Type check:** `npx tsc --noEmit` → 0 errors
2. **Lint:** `npx eslint --no-warn .` → 0 errors  
3. **Unit tests:** `npx vitest run` → all pass
4. **Manual smoke tests:**
   - MFA reset admin flow (MFA-004)
   - Game creation with status override (BUG-029)
   - Game search with unauthorized product IDs (BUG-027)
   - Multi-product cart checkout (BUG-019 + BUG-025)
   - Admin tenant switch as system admin (BUG-006)
   - Legacy subscription tenant game access (BUG-022)
   - Seat assignment at capacity (BUG-020)
   - **Secret instruction access before host unlock (BUG-047)**
   - **Heartbeat with idle participant in approval session (BUG-058)**
   - **Invitation accept with wrong-email user (BUG-035)**
   - **Idle participant attempting vote/puzzle/keypad (BUG-083)**
   - **Heartbeat after session ended (BUG-079)**
   - **Rejoin in approval session after disconnect (BUG-081)**
   - **Progress update after session ended (BUG-084)**
   - **Rejoin with `allow_rejoin: false` (BUG-056)**
   - **Rejoin on expired session (BUG-057)**
   - **Approve idle participant + attempt on kicked/blocked (BUG-060/061)**
   - **Host kick/block with non-existent participantId (BUG-060)**
   - **setNextStarter targeting correct session participant (BUG-085)**
5. **E2E:** relevant `tests/` Playwright specs if they exist

---

## Wave 2 — High-Value Correctness

**Scope:** 16 findings — dead endpoints, tenant resolution, data integrity, race conditions  
**Gate:** Wave 1 green, all Wave 2 items verified

### Sub-groups (ordered by impact and shared-file efficiency)

#### 2A: Dead Schema-Drift Endpoints (RC-1)

| ID | File | Fix |
|----|------|-----|
| MFA-001 + MFA-002 | `mfa/users/route.ts` | Fix column names, remove type cast |
| BUG-010 | `accounts/sessions/route.ts` | Fix column names, remove type cast |
| BUG-011 | `accounts/devices/route.ts` | Fix column names, remove type cast |
| BUG-024 | `billing/subscription/my/route.ts` | Fix `valid_until` → actual column |

**Strategy:** Batch these — same root cause, same fix pattern. Can be one PR.

#### 2B: Tenant Resolution (RC-2)

| ID | File | Fix |
|----|------|-----|
| BUG-015 | `participants/sessions/create/route.ts` | Remove `.single()` or add tenant filter |
| BUG-023 | `billing/subscription/my/route.ts` | Add explicit tenant context |

**Strategy:** Each is isolated. BUG-023 shares file with BUG-024 — bundle.

#### 2C: TOCTOU Races (RC-3)

| ID | File | Fix |
|----|------|-----|
| BUG-016 | `participants/sessions/join/route.ts` | New RPC: atomic join |
| BUG-017 | `lib/services/participants/session-service.ts` | New RPC: atomic quota check |

**Strategy:** Same pattern as BUG-020 from Wave 1. Reuse the DD-RACE-1 decision. Each needs its own RPC.

#### 2D: False-Success Mutations (RC-4)

| ID | File | Fix |
|----|------|-----|
| BUG-012 | `accounts/profile/route.ts` | Fail on secondary write failure |
| BUG-013 | `accounts/sessions/revoke/route.ts` | Fail or return partial-success |

**Strategy:** Isolated fixes. Apply fail-closed principle.

#### 2E: Auth Drift (RC-6)

| ID | File | Fix |
|----|------|-----|
| BUG-007 | Admin layout + `tenantAuth.ts` | Align page gate to action policy |
| BUG-028 | `games/[gameId]/publish/route.ts` | Use canonical role helper |

**Strategy:** Needs DD-EDITOR-1 for BUG-007. BUG-028 is straightforward.

#### 2F: Legacy / Data Mapping

| ID | File | Fix |
|----|------|-----|
| BUG-026 | `games/utils.ts` | Free games bypass entitlement check |
| BUG-018 | `billing/portal/route.ts` etc. | Centralize Stripe customer resolution |

**Strategy:** BUG-026 bundles with BUG-022 (same file, probably same PR from Wave 1).

### Wave 2 Regression Plan

1. `npx tsc --noEmit` + lint + vitest
2. Focus smoke tests on: admin MFA list, account sessions/devices pages, participant join, billing subscription page, game publishing
3. Monitor Sentry for 4xx/5xx spikes after deploy

---

## Wave 3 — Structural Hardening

**Scope:** 5 findings — P2 polish + lower-blast-radius P1s  
**Gate:** Wave 2 green

| ID | File | Fix | Notes |
|----|------|-----|-------|
| MFA-003 | `mfa/users/route.ts` | Move filter before pagination | Bundle with MFA-001/002 if not already done |
| BUG-008 | `tenant-achievements-admin.ts` | Add pagination to recipient query | UX-only impact |
| BUG-009 | `members/page.tsx` | Call router.refresh() in retry handler | One-line fix |
| BUG-014 | `accounts/profile/notifications/route.ts` | Depends on DD-NOTIF-1 | May be intentional |
| BUG-021 | `billing/subscription/update/route.ts` | Map price ID to product UUID | Needs data migration audit |

### Wave 3 Regression Plan

1. Standard CI gates
2. Admin UX smoke tests

---

## Cross-Wave Dependencies

```
DD-MFA-1   ──blocks──▶  MFA-005 (Wave 1)
DD-CART-1  ──informs──▶  BUG-019 + BUG-025 (Wave 1)
DD-RACE-1  ──informs──▶  BUG-020 (Wave 1), BUG-016 + BUG-017 (Wave 2)
DD-EDITOR-1──blocks──▶  BUG-007 (Wave 2)
DD-NOTIF-1 ──blocks──▶  BUG-014 (Wave 3)

BUG-022 (Wave 1) + BUG-026 (Wave 2) ── same file, prefer bundling
BUG-019 (Wave 1) + BUG-025 (Wave 1) ── same webhook, must bundle
BUG-023 + BUG-024 (Wave 2) ── same file, must bundle
```

---

## Implementation Checklist Template

For each fix before merge:

- [ ] Code implements the exact fix described above
- [ ] `as unknown as SupabaseClient` cast removed if applicable
- [ ] `npx tsc --noEmit` passes
- [ ] Unit/integration test added for the failure case
- [ ] Manual smoke test passed
- [ ] No unrelated changes in the diff
- [ ] Triage table updated with `✅ KLAR (date)` and status moved to RESOLVED
