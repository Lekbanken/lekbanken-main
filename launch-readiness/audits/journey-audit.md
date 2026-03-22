# Journey & Gamification Launch Audit (#9)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for the journey and gamification domain. Use `launch-readiness/launch-control.md` for current program status and consult remediation or regression artifacts for the latest follow-up state.

**Date:** 2026-03-12  
**Status:** ✅ Launch-scope complete (2026-03-12). M1+M2 GPT-approved. M3/M4 deferred post-launch.  
**Scope:** Factions, cosmetics, XP, achievements, loadout, shop, leaderboard, burn economy, campaigns, admin dashboard  
**Auditor:** Claude (automated deep-dive)

---

## GPT Calibration

> **Calibrated 2026-03-12.** GPT reclassified 3 findings from P1→P2 (JOUR-002, JOUR-003, JOUR-004). JOUR-001 stays P1 with sharpened framing: the core issue is tenant-scoped preference mutation without explicit membership validation, not the GET opt-out leak. JOUR-009 stays as umbrella in audit, split into 009a/b/c in remediation. M1–M4 reordered per GPT: M1 = tenant boundary + auth (JOUR-001, JOUR-004), M2 = high-ROI rate limiting (JOUR-007/008/009a), M3 = wrapper migration (JOUR-002/003/009b-c), M4 = validation/cleanup.

---

## 0. Domain Overview

**36 route files** audited (21 user-facing + 15 admin). Core subsystems:

| Subsystem | Routes | Description |
|-----------|--------|-------------|
| Gamification snapshot | 1 | Full user payload (achievements, coins, streak, progress, showcase, cosmetics) |
| Achievements | 3 | Check, unlock, single-achievement lookup |
| Coins & economy | 4 | Transactions, burn, sinks catalog, events |
| Leaderboard | 3 | Rankings (public), preferences, admin leaderboard mgmt |
| Faction & journey | 3 | Faction selection, journey preference, journey snapshot |
| Cosmetics & loadout | 3 | Catalog, equip, loadout (shop + cosmetics) |
| Shop | 2 | Browse + purchase, powerup consumption |
| Pins & showcase | 2 | Achievement pinning, showcase slots |
| Admin | 15 | Dashboard, awards, campaigns, analytics, levels, rules, automation, seed, sinks, refund |

**Service layer:** 8 gamification services + 3 journey services in `lib/services/` and `lib/journey/`.

**Tables:** 14+ gamification tables with RLS policies.

---

## 1. Findings Summary

| Severity | Count | Resolved | Finding IDs |
|----------|-------|----------|-------------|
| P0 — Launch blocker | 0 | 0 | — |
| P1 — Must fix before launch | 1 | 1 | JOUR-001 |
| P2 — Should fix, not blocker | 8 | 5 | JOUR-002, JOUR-003, JOUR-004, JOUR-005, JOUR-006, JOUR-007, JOUR-008, JOUR-009 |
| P3 — Nice to have | 3 | 0 | JOUR-010, JOUR-011, JOUR-012 |
| **Total** | **12** | **0** | |

---

## 2. Route Inventory

### User-Facing Routes

| Route | Methods | Auth | Wrapper | Capability/Role | Validation | Finding |
|-------|---------|------|---------|-----------------|------------|---------|
| `GET /api/gamification` | 1 | `user` | ✅ apiHandler | RLS | None | OK |
| `POST /api/gamification/events` | 1 | `user` + role | ✅ apiHandler | `requireTenantRole` / `system_admin` | Zod + source guard | OK ✅ |
| `POST /api/gamification/coins/transaction` | 1 | `user` + role | ✅ apiHandler | `requireTenantRole(['admin', 'owner'])` | Zod | OK ✅ |
| `POST /api/gamification/achievements/check` | 1 | manual auth | ❌ raw | RLS + service role | Zod + prod hardening + `rateLimit: 'api'` | ~~JOUR-009a~~ ✅ |
| `POST /api/gamification/achievements/unlock` | 1 | `system_admin` | ✅ apiHandler | service role | Zod + metadata limits + `rateLimit: 'api'` | ~~JOUR-009a~~ ✅ ~~GAM-001~~ ✅ |
| `GET /api/gamification/achievement/[id]` | 1 | `user` | ✅ apiHandler | `assertTenantMembership` + tenant filter | tenantId required | ~~JOUR-004/005~~ ✅ |
| `GET /api/gamification/leaderboard` | 1 | public | ❌ raw | None (intentional) | UUID regex + enum | JOUR-003 |
| `GET/POST /api/gamification/leaderboard/preferences` | 2 | `user` | ✅ apiHandler | `assertTenantMembership` (POST) | Zod (POST) | ~~JOUR-001~~ ✅ |
| `POST /api/gamification/burn` | 1 | `cron_or_admin` | ✅ apiHandler | Internal-only | Interface (no Zod) | JOUR-006 |
| `GET /api/gamification/sinks` | 1 | public | ❌ raw | None (intentional, DD-4) | None | JOUR-003 |
| `POST /api/gamification/faction` | 1 | `user` | ✅ apiHandler | RLS | Set-based enum | OK |
| `POST /api/gamification/journey-preference` | 1 | `user` | ✅ apiHandler | RLS | typeof check | OK |
| `POST /api/gamification/showcase` | 1 | `user` | ✅ apiHandler | RLS | Anti-dup + bounds | OK |
| `GET/POST /api/gamification/pins` | 2 | `user` | ✅ apiHandler | `requireTenantMembership` | Max 3 + unique | OK |
| `GET /api/journey/snapshot` | 1 | `user` | ✅ apiHandler | RLS | None | OK |
| `GET /api/journey/feed` | 1 | `user` | ✅ apiHandler | RLS | Cursor + limit clamp | OK |
| `GET /api/journey/cosmetics` | 1 | `user` | ✅ apiHandler | RLS + level check | None | OK |
| `POST /api/journey/cosmetics/equip` | 1 | `user` | ✅ apiHandler | RLS + ownership | Zod (slots) | OK |
| `GET/POST /api/shop` | 2 | `user` | ✅ apiHandler | `requireTenantMembership` | Zod | OK ✅ |
| `POST /api/shop/powerups/consume` | 1 | `user` | ✅ apiHandler | `requireTenantMembership` | Zod | OK ✅ |
| `GET/POST /api/cosmetics/loadout` | 2 | `user` | ✅ apiHandler | `requireTenantMembership` | Zod + level gate | OK ✅ |

### Admin Routes

| Route | Methods | Auth | Wrapper | Role Check | Validation | Finding |
|-------|---------|------|---------|------------|------------|---------|
| `GET /api/admin/gamification/dashboard` | 1 | `user` | ✅ | `requireTenantRole` | Manual | OK |
| `GET/POST/PATCH /api/admin/gamification/automation` | 3 | `user` | ✅ | `requireTenantRole` | Zod | OK |
| `POST /api/admin/gamification/awards` | 1 | `user` | ✅ | `requireTenantRole` + approval threshold | Zod + `rateLimit: 'strict'` | OK |
| `PATCH /api/admin/gamification/awards/requests/[id]` | 1 | `system_admin` | ✅ | system_admin | Manual + `rateLimit: 'strict'` | OK |
| `GET/PATCH /api/admin/gamification/rules` | 2 | `user` | ✅ | `requireTenantRole` | Manual | OK |
| `GET/POST /api/admin/gamification/levels` | 2 | `user` | ✅ | `requireTenantRole` | Zod | OK |
| `POST /api/admin/gamification/refund` | 1 | `system_admin` | ✅ | system_admin | Manual + `rateLimit: 'strict'` | ~~JOUR-007~~ ✅ |
| `POST/PATCH /api/admin/gamification/sinks` | 2 | `system_admin` | ✅ | system_admin | Manual | OK |
| `GET /api/admin/gamification/campaign-templates` | 1 | `user` | ✅ | `requireTenantRole` | None | OK |
| `GET/POST/PATCH /api/admin/gamification/campaigns` | 3 | `user` | ✅ | `requireTenantRole` | Zod | OK ✅ |
| `GET /api/admin/gamification/campaigns/[id]/analytics` | 1 | `user` | ✅ | `requireTenantRole` | Query param | OK |
| `POST /api/admin/gamification/analytics/rollups/refresh` | 1 | `user` | ✅ | `requireTenantRole` | Body + `rateLimit: 'strict'` | ~~JOUR-008~~ ✅ |
| `GET /api/admin/gamification/analytics` | 1 | `user` | ✅ | `requireTenantRole` | Zod | OK |
| `GET/POST /api/admin/gamification/seed-rules` | 2 | `system_admin` | ✅ | system_admin | Mode validation | OK |
| `GET/POST/PATCH /api/admin/gamification/leaderboard` | 3 | `user` | ✅ | `requireTenantRole` | Manual | OK |

---

## 3. Finding Details

### JOUR-001 — Leaderboard preferences route lacks wrapper + explicit membership validation for tenant-scoped preference mutation ~~(P1)~~ ✅ **FIXED (M1)**

**Category:** Security / Tenant Isolation  
**Location:** `app/api/gamification/leaderboard/preferences/route.ts`

**Description:** Both GET and POST handlers are raw `NextRequest` functions — no `apiHandler` wrapper, no auth enforcement in route code. POST calls `setLeaderboardVisibility(tenantId, visible)` which internally uses RLS client + `set_leaderboard_visibility` RPC (which uses `auth.uid()`), so the RPC itself will fail for unauthenticated callers.

**Core problem (GPT-sharpened):** The route accepts `tenantId` from the client for a tenant-scoped preference mutation without route-level membership validation. This is the same pattern that was P1 in Planner (PLAN-007/008) and Games (GAME-002). Even though the RPC uses `auth.uid()`, the route contract is too weak for a tenant-scoped setting.

**Secondary:** GET returns tenant opt-out status to any visitor (low impact — boolean only). No rate limiting. No standardized error format.

**RLS mitigation:** RPC `set_leaderboard_visibility` uses `auth.uid()` internally, so unauthenticated POST would fail at DB level. But this relies on Supabase RPC behavior, not explicit route-level enforcement.

**Risk:** Medium. Tenant-scoped mutation without explicit membership check.

**Fix:** Wrap both handlers in `apiHandler`. GET: `auth: 'user'`. POST: `auth: 'user'` + `requireTenantMembership` for `tenantId`.

---

### JOUR-002 — Achievements check/unlock: unwrapped routes (P2) ~~P1~~

**Category:** Security / Wrapper Consistency  
**Location:** `app/api/gamification/achievements/check/route.ts`, ~~`app/api/gamification/achievements/unlock/route.ts`~~

**Description:** ~~Both routes use~~ `achievements/check` uses manual `NextRequest` handler with inline `rlsClient.auth.getUser()` instead of `apiHandler`. While functionally secure (Phase 4.1 hardened with production guards, metadata limits, and race-safe idempotency), it lacks:

1. No `apiHandler` wrapper — inconsistent with domain conventions
2. No rate limiting — achievement check could be called repeatedly  
3. No standardized error format — uses `{ error: string }` instead of `{ error: { code, message } }`
4. Manual try/catch instead of wrapper error handling

**Security status:** The auth and tenant logic is correct. `achievements/check` blocks stats-requiring triggers in production. This is a **wrapper consistency** issue, not an auth bypass.

**Update (2026-03-14):** `achievements/unlock` has been migrated to `apiHandler({ auth: 'system_admin' })` as part of GAM-001 security hardening. Only `achievements/check` remains unwrapped.

**Risk:** Low-medium. Auth is present via RLS client. Missing rate limiting is the primary concern (could be used for achievement enumeration or resource exhaustion).

**Fix:** Migrate both to `apiHandler({ auth: 'user', rateLimit: 'api' })`. Preserve existing hardening logic.

---

### JOUR-003 — Public routes missing wrapper (sinks, leaderboard) (P2) ~~P1~~

**Category:** Security / Wrapper Consistency  
**Location:** `app/api/gamification/leaderboard/route.ts`, `app/api/gamification/sinks/route.ts`

**Description:** Both are intentionally public endpoints (documented in DD-4, `security-auth-remediation.md`), but lack `apiHandler` wrapper. Issues:

1. No rate limiting — leaderboard queries hit DB, can be used for DoS
2. No standardized error format
3. No request ID for tracing
4. Leaderboard accepts tenantId from query without UUID validation (uses regex, not Zod)

**Design decision:** DD-4 confirms these should be public. Leaderboard returns display names + scores only (no PII). Sinks returns catalog data.

**Risk:** Low-medium. DoS via unrate-limited queries is the primary concern. No data exposure issue.

**Fix:** Wrap both in `apiHandler({ auth: 'public', rateLimit: 'api' })`. Preserve public access with standardized error handling and rate limiting.

---

### JOUR-004 — Achievement/[id] route: tenantId from query without membership validation ~~(P2)~~ ✅ **FIXED (M1)**

**Category:** Tenant Isolation — Correctness/Hardening  
**Location:** `app/api/gamification/achievement/[id]/route.ts`

**Description:** This route requires `tenantId` from query string to check user achievement unlock status, but never validates the user has membership in that tenant. The achievement itself is fetched via RLS (which doesn't filter by tenant — achievements can be global). The `user_achievements` query uses `tenantId` for the unlock lookup.

**Impact:** A user could query their achievement unlock status in a tenant they don't belong to. The data returned is minimal (locked/unlocked status) and the achievement catalog itself is not tenant-gated. Low real-world impact.

**RLS mitigation:** `user_achievements` RLS policies likely scope reads to `user_id = auth.uid()`, which prevents cross-user exposure.

**Risk:** Low. The tenantId affects which unlock record is checked (a user might have the same achievement unlocked in different tenants), but no cross-user data exposure.

**Fix:** Add `requireTenantMembership` check, or resolve tenantId from user's memberships instead of accepting from client.

---

### JOUR-005 — Achievement/[id]: no tenant filter on achievement lookup ~~(P2)~~ ✅ **FIXED (M1)**

**Category:** Data Consistency  
**Location:** `app/api/gamification/achievement/[id]/route.ts`

**Description:** Achievement is fetched by `id` only — no tenant filter. A user could look up details of a tenant-specific achievement from another tenant. The data is non-sensitive (name, description, icon_config) but leaks the existence and details of other tenants' custom achievements.

**Risk:** Low. Non-sensitive catalog data. Achievements table may have RLS that limits visibility, but the route doesn't add a `.eq('tenant_id', ...)` or `.or('tenant_id.is.null,...')` filter.

**Fix:** Add tenant filter: `.or('tenant_id.is.null,tenant_id.eq.${tenantId}')` to match the pattern used in the gamification main route.

---

### JOUR-006 — Burn route: no Zod validation (P2)

**Category:** Input Validation  
**Location:** `app/api/gamification/burn/route.ts`

**Description:** Uses TypeScript interface `BurnRequestBody` for type assertion but no runtime Zod validation. Fields (`userId`, `tenantId`, `sinkId`, `amount`, `idempotencyKey`, `metadata`) are manually checked for presence but not for type/format (e.g., UUID validation).

**Mitigation:** Route is `auth: 'cron_or_admin'` — only internal cron jobs or admin users can call it. The `burnCoins` service handles business validation.

**Risk:** Low (admin-only endpoint). Missing UUID validation could cause DB errors with malformed input.

**Fix:** Add Zod schema with UUID validation for userId, tenantId, sinkId. Replace manual presence checks.

---

### JOUR-007 — Refund route: no rate limiting ~~(P2)~~ ✅ **FIXED (M2)**

**Category:** Rate Limiting  
**Location:** `app/api/admin/gamification/refund/route.ts`

**Description:** Refund endpoint (`auth: 'system_admin'`) has no rate limiting. While only system admins can call it, repeated calls could process multiple refunds rapidly.

**Risk:** Low (system_admin only). A compromised admin account could drain coin balances via rapid refunds.

**Fix:** Add `rateLimit: 'strict'` to match the awards route pattern.

---

### JOUR-008 — Analytics rollup refresh: no rate limiting on expensive operation ~~(P2)~~ ✅ **FIXED (M2)**

**Category:** Rate Limiting / DoS  
**Location:** `app/api/admin/gamification/analytics/rollups/refresh/route.ts`

**Description:** Triggers RPC `refresh_gamification_daily_summaries_v1` which recomputes summaries for up to 3650 days. No rate limiting despite being computationally expensive. `days` parameter accepted from body with maximum of 3650.

**Risk:** Low (admin-only). Could cause DB load spike if called repeatedly.

**Fix:** Add `rateLimit: 'strict'` and lower `days` maximum to a more reasonable value (e.g., 365).

---

### JOUR-009 — Multiple user routes missing rate limiting (P2)

**Category:** Rate Limiting  
**Location:** Multiple routes

**Description:** The following user-facing mutation routes lack rate limiting:

- `POST /api/gamification/achievements/check` — could be spammed to trigger unlock checks
- ~~`POST /api/gamification/achievements/unlock` — could be spammed (idempotency handles duplication but wastes resources)~~ **Now `system_admin` only (GAM-001)**
- `POST /api/gamification/faction` — low risk (user pref)
- `POST /api/gamification/journey-preference` — low risk (user pref)
- `POST /api/gamification/showcase` — low risk (replace-all, user-scoped)
- `GET /api/gamification` — heavy 9-query payload, could be used for DoS

**Risk:** Low-medium. Achievement routes are the highest concern due to DB write operations. The main gamification GET is resource-intensive.

**Fix:** Add `rateLimit: 'api'` to achievement routes and gamification main GET. Lower priority for user preference routes.

---

### JOUR-010 — Gamification main GET: no input validation (P3)

**Category:** Input Validation  
**Location:** `app/api/gamification/route.ts`

**Description:** GET handler has no query parameters to validate (user context comes from auth). Minor concern — the `or()` filter for achievements uses `tenantId` from `user_progress` (server-derived, not client input).

**Risk:** Negligible. No client input to validate.

**Fix:** No action needed. Consider adding caching headers (Cache-Control) for the heavy payload.

---

### JOUR-011 — Inconsistent validation patterns across domain (P3)

**Category:** Code Quality  
**Location:** Multiple routes

**Description:** The domain uses a mix of validation approaches:

- Zod schemas: events, coins/transaction, achievements/check, achievements/unlock, shop, cosmetics/equip, campaigns
- Manual validation: leaderboard (regex), faction (Set), journey-preference (typeof), showcase (bounds), burn (presence)
- Interface-only (no runtime): burn request body

The well-audited routes (shop, events, coins/transaction) use Zod consistently. Older routes use manual checks.

**Risk:** No risk — all routes have some validation. This is a code quality concern.

**Fix:** Post-launch: migrate manual validation to Zod for consistency.

---

### JOUR-012 — Pins vs. Showcase conceptual overlap (P3)

**Category:** Architecture / Design  
**Location:** `app/api/gamification/pins/route.ts`, `app/api/gamification/showcase/route.ts`

**Description:** Two separate systems for displaying achievements:

- **Showcase** → `user_achievement_showcase` table, max 4 slots, user-scoped (global)
- **Pins** → `leader_profile.display_achievement_ids`, max 3, tenant-scoped

Both store "displayed achievements" but with different storage, limits, and scope. Could confuse users.

**Risk:** No security risk. Design/UX concern only.

**Fix:** Post-launch: consider consolidating into a single system.

---

### GAM-001 — Achievement unlock condition-bypass exploit (P1) ✅ RESOLVED (2026-03-14)

> **Note:** Discovered and resolved in the same audit pass (2026-03-14). Never an open P1 — identified by GPT during gamification economy review, confirmed by code audit, and fixed immediately.

**Category:** Security / Authorization  
**Location:** `app/api/gamification/achievements/unlock/route.ts`, `app/api/participants/progress/unlock-achievement/route.ts`

**Description:** Any authenticated user could call `POST /api/gamification/achievements/unlock` with an arbitrary `achievementId` UUID and unlock that achievement without meeting its conditions. The route performed auth (via `getUser()`) and tenant validation but never verified the user had actually satisfied the achievement's unlock conditions. This bypassed the canonical path (`/achievements/check` → server evaluates conditions → `unlockAchievement()`), allowing:

1. **Direct condition bypass** — unlock any active achievement by UUID
2. **Cosmetic grant escalation** — `checkAndGrantCosmetics()` fires on unlock, granting cosmetics tied to the achievement
3. **Participant variant** — `POST /api/participants/progress/unlock-achievement` had the same pattern with participant tokens

**Fix:**
- `achievements/unlock` → rewritten with `apiHandler({ auth: 'system_admin' })` + `targetUserId` in schema. No longer user-callable.
- `participants/progress/unlock-achievement` → changed from `auth: 'participant'` to `auth: 'cron_or_admin'`. No longer participant-callable.
- Both hooks (`useAchievementAutoAward`, `useAchievementUnlock`) have zero active component consumers — no runtime impact.
- `tsc --noEmit` = 0 errors.

**Risk (pre-fix):** High — allowed arbitrary achievement unlocks + cosmetic grants without earning them.

**GPT sign-off (2026-03-14):** Patch confirmed correct. Both bypass surfaces closed. Tenant-scope verified: admin route resolves tenant from target user, not caller. Idempotency preserved. Dead hook chain (`useAchievementAutoAward`, `useAchievementUnlock`, `useSessionAchievements`) confirmed low-risk. **Achievement bypass effectively closed for launch-scope.**

---

## 4. Remediation Plan (GPT-ordered)

### M1 — Tenant Boundary + Explicit Auth (JOUR-001 P1, JOUR-004 P2, JOUR-005 P2) ✅ KLAR (2026-03-12)

- [x] **JOUR-001** — Wrap `leaderboard/preferences` in `apiHandler({ auth: 'user' })` + `requireTenantMembership` for POST `tenantId`
- [x] **JOUR-004** — Add tenant membership validation for `achievement/[id]` `tenantId`
- [x] **JOUR-005** — Add tenant filter on achievement lookup (`.or('tenant_id.is.null,...')`)

**Noteringar:** Both routes now use `assertTenantMembership()` from `lib/planner/require-plan-access.ts` (same pattern as Planner M3). `leaderboard/preferences` fully rewritten: raw NextRequest → `apiHandler({ auth: 'user' })`, POST uses `input: postSchema` (Zod UUID + boolean), GET requires auth. `achievement/[id]` was already wrapped — added membership check + `.or()` tenant filter. Response shapes bit-identical. One caller verified: `CourseRunnerClient.tsx` always calls within user's own tenant. `tsc --noEmit` = 0 errors.

### M2 — High-ROI Rate Limiting (JOUR-007, JOUR-008, JOUR-009a) ✅ KLAR (2026-03-12) — GPT-approved

- [x] **JOUR-007** — Add `rateLimit: 'strict'` to refund route
- [x] **JOUR-008** — Add `rateLimit: 'strict'` to analytics rollup refresh + lower `days` cap (3650→365)
- [x] **JOUR-009a** — Add `rateLimit: 'api'` to `achievements/check` + `achievements/unlock` (inline `applyRateLimit` since routes are unwrapped)
- [ ] *(Deferred to M3)* **JOUR-003** — Wrap `leaderboard` + `sinks` in `apiHandler({ auth: 'public', rateLimit: 'api' })`

**Noteringar:** JOUR-007/008: single-line `rateLimit: 'strict'` additions to existing `apiHandler` configs. JOUR-008 also lowered `days` max from 3650 to 365 (reasonable operational limit). JOUR-009a: since achievements routes are unwrapped (JOUR-002, deferred to M3), rate limiting added inline via `applyRateLimit(request, 'api')` at top of handler — will be replaced by wrapper config when routes are migrated in M3. `tsc --noEmit` = 0 errors.

**GPT sign-off (2026-03-12):** Tier selection confirmed correct (`strict` for admin destructive/expensive, `api` for user-facing gameplay). Inline placement confirmed correct (rate limit before auth/DB work). M3 deferral accepted — inline rate limiting sufficient for launch.

### M3 — Wrapper Migration / Consistency (JOUR-002, JOUR-003, JOUR-009b/c) — Post-launch

- [ ] **JOUR-002** — Wrap `achievements/check` in `apiHandler({ auth: 'user', rateLimit: 'api' })` preserving Phase 4.1 hardening (`achievements/unlock` already wrapped as `system_admin` via GAM-001)
- [ ] **JOUR-003** — Wrap `leaderboard` + `sinks` in `apiHandler({ auth: 'public', rateLimit: 'api' })`
- [ ] **JOUR-009b** — Add rate limiting to gamification main GET and other read-heavy endpoints
- [ ] **JOUR-009c** — Add rate limiting to preference/showcase/faction/journey routes

### M4 — Validation + Cleanup (JOUR-006, JOUR-010, JOUR-011, JOUR-012, GAM-001 cleanup) — Post-launch

- [ ] **JOUR-006** — Add Zod to burn route
- [ ] **JOUR-010** — Caching headers for gamification main GET
- [ ] **JOUR-011** — Migrate manual validation to Zod across domain
- [ ] **JOUR-012** — Consider pins/showcase consolidation
- [ ] **GAM-001a** — Remove dead hooks: `useAchievementAutoAward`, `useAchievementUnlock`, `useSessionAchievements` (zero component consumers, schema-incompatible post-hardening)
- [ ] **GAM-001b** — Add Zod `input` schema to `participants/progress/unlock-achievement` (currently manual body-interface; SYS-001 convergence)
- [ ] **GAM-001c** — Document canonical unlock architecture: `check/evaluate` = user-facing, `unlock` = internal/service-layer, no public unlock without condition verification

---

## 5. Security Strengths Identified

The Journey & Gamification domain has several well-implemented security patterns:

1. **Idempotency everywhere** — Events, coins, burns, achievements, shop purchases all use `idempotencyKey` + DB uniqueness constraints
2. **Production hardening** — `achievements/check` blocks stats-requiring triggers in production mode (prevents client-supplied stat manipulation)
3. **Race-safe patterns** — `achievements/unlock` uses insert-first with duplicate detection (code 23505)
4. **Metadata limits** — 25 keys, 200 chars/value, 8KB max serialized size on achievement unlock
5. **Source validation** — Events route blocks `'planner'` and `'play'` sources from client (server-only)
6. **Coin minting restrictions** — Only `'admin'` or `'system'` sources can mint coins, no global-event coin minting
7. **Approval thresholds** — Awards above configurable threshold require system_admin approval
8. **Tenant role enforcement** — All admin routes use `requireTenantRole(['admin', 'owner'], tenantId)` consistently
9. **Shop as RPC** — Purchase uses `purchase_shop_item_v1` RPC for atomic balance check + deduction
10. **Cosmetic ownership validation** — Multi-layer check (explicit grant OR level eligibility) before equip

---

## 6. Cross-Reference

| Launch-control ID | Finding | Status |
|-------------------|---------|--------|
| JOUR-001 | Leaderboard preferences no auth | ✅ Fixed (M1) |
| JOUR-002 | Achievements check/unlock unwrapped | ⬜ Deferred (M3 — post-launch) |
| JOUR-003 | Public routes unwrapped | ⬜ Deferred (M3 — post-launch) |
| JOUR-004 | Achievement/[id] tenantId unvalidated | ✅ Fixed (M1) |
| JOUR-005 | Achievement tenant filter missing | ✅ Fixed (M1) |
| JOUR-006 | Burn route missing Zod | ⬜ Deferred (M4 — post-launch) |
| JOUR-007 | Refund no rate limit | ✅ Fixed (M2) |
| JOUR-008 | Rollup refresh no rate limit | ✅ Fixed (M2) |
| JOUR-009a | Achievements check/unlock no rate limit | ✅ Fixed (M2) |
| GAM-001 | Achievement unlock condition-bypass exploit | ✅ Fixed (2026-03-14) — GPT-approved |
| GAM-001a/b/c | Dead hook removal, Zod schema, architecture doc | ⬜ Deferred (M4 — post-launch) |
| JOUR-009b/c | Other routes no rate limit | ⬜ Deferred (M3 — post-launch) |
| JOUR-010–012 | Caching, Zod migration, consolidation | ⬜ Deferred (M4 — post-launch) |
