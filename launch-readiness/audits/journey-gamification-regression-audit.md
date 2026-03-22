# Journey & Gamification — Regression Audit

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-14
- Last updated: 2026-03-21
- Last validated: 2026-03-14

> Closed regression audit for the journey and gamification domain after the launch-readiness remediation slices. Use `launch-readiness/launch-control.md` for current program status and the original audit plus follow-up records for upstream context.

> **Domain:** Journey & Gamification (Audit #9 + Event Integrity)  
> **Type:** Regression Audit (Phase 5)  
> **Date:** 2026-03-14  
> **Auditor:** Claude  
> **Verdict:** ✅ PASS — 0 new findings, all M1+M2 fixes intact  

---

## 1. Scope

Verify that all M1 (tenant boundary + auth) and M2 (rate limiting) remediations from the original Journey & Gamification audit remain intact. Verify no new routes added without proper auth/wrapper. Confirm event integrity findings unchanged.

### Original Audit Findings

| ID | Pri | Description | Milestone | Status |
|----|-----|-------------|-----------|--------|
| JOUR-001 | P1 | Leaderboard preferences lacks wrapper + membership validation | M1 | ✅ FIXED |
| JOUR-002 | P2 | Achievements check/unlock unwrapped routes | M3 | ⏳ DEFERRED |
| JOUR-003 | P2 | Public routes missing wrapper (sinks, leaderboard) | M3 | ⏳ DEFERRED |
| JOUR-004 | P2 | Achievement/[id] tenantId from query without membership validation | M1 | ✅ FIXED |
| JOUR-005 | P2 | Achievement/[id] no tenant filter on achievement lookup | M1 | ✅ FIXED |
| JOUR-006 | P2 | Burn route no Zod validation | M3 | ⏳ DEFERRED |
| JOUR-007 | P2 | Refund route no rate limiting | M2 | ✅ FIXED |
| JOUR-008 | P2 | Analytics rollup refresh no rate limiting on expensive op | M2 | ✅ FIXED |
| JOUR-009 | P2 | Multiple user routes missing rate limiting | M2 | ⏳ PARTIAL |
| JOUR-010 | P3 | Gamification main GET no input validation | M4 | ⏳ DEFERRED |
| JOUR-011 | P3 | Inconsistent validation patterns across domain | M4 | ⏳ DEFERRED |
| JOUR-012 | P3 | Pins vs Showcase conceptual overlap | M4 | ⏳ DEFERRED |

### Event Integrity Findings (noted, not remediated)

| ID | Pri | Description | Status |
|----|-----|-------------|--------|
| F-01 | P2 | Wasteful cascade re-execution on 23505 duplicate | ℹ️ NOTED |
| F-02 | P2 | XP grants JSONB unbounded growth | ℹ️ NOTED |
| F-03 | P2 | `apply_automation_rule_reward_v1` lacks own advisory lock | ℹ️ NOTED |
| F-04 | P2 | Achievement admin fallback to `crypto.randomUUID()` | ℹ️ NOTED |
| F-05 | P3 | No cascade re-execution monitoring | ℹ️ NOTED |
| F-06 | P3 | Visibility change creates distinct events per state | ℹ️ NOTED |

---

## 2. Regression Areas Verified

### 2.1 M1 — Tenant Boundary + Auth (3/3 intact ✅)

#### JOUR-001: Leaderboard Preferences — Wrapper + Membership Validation
**File:** `app/api/gamification/leaderboard/preferences/route.ts`  
**Verified:**
- ✅ GET wrapped in `apiHandler({ auth: 'user' })`
- ✅ GET calls `assertTenantMembership(supabase, auth!.user!, tenantId)` before returning data
- ✅ POST wrapped in `apiHandler({ auth: 'user', input: postSchema })`
- ✅ POST calls `assertTenantMembership(supabase, auth!.user!, tenantId)` before mutation
- ✅ tenantId validated against UUID regex before use

#### JOUR-004: Achievement/[id] — Tenant Membership Validation
**File:** `app/api/gamification/achievement/[id]/route.ts`  
**Verified:**
- ✅ Wrapped in `apiHandler({ auth: 'user' })`
- ✅ `assertTenantMembership(supabase, user, tenantId)` called before achievement lookup
- ✅ Returns 403 if membership check fails

#### JOUR-005: Achievement/[id] — Tenant Filter on Lookup
**File:** `app/api/gamification/achievement/[id]/route.ts`  
**Verified:**
- ✅ `.or(\`tenant_id.is.null,tenant_id.eq.${tenantId}\`)` filter on achievement query
- ✅ Only returns global or tenant-specific achievements, never cross-tenant

### 2.2 M2 — Rate Limiting (2/3 intact ✅, 1 partial as expected)

#### JOUR-007: Refund Route — Rate Limiting
**File:** `app/api/admin/gamification/refund/route.ts`  
**Verified:**
- ✅ `apiHandler({ auth: 'system_admin', rateLimit: 'strict' })`
- ✅ Rate limit applied before handler execution

#### JOUR-008: Analytics Rollup Refresh — Rate Limiting + Days Cap
**File:** `app/api/admin/gamification/analytics/rollups/refresh/route.ts`  
**Verified:**
- ✅ `apiHandler({ auth: 'user', rateLimit: 'strict', input: bodySchema })`
- ✅ Zod schema: `days: z.coerce.number().int().min(1).max(365)` — capped at 365
- ✅ Default 90 days if not specified
- ✅ `requireTenantRole(['admin', 'owner'], tenantId)` inside handler

#### JOUR-009: Multiple Routes Rate Limiting — PARTIAL (expected)
- ✅ Status unchanged — same routes lack rate limiting as in original audit
- No regression in this area

### 2.3 Route Coverage Scan (33 routes)

| Category | Count | All apiHandler? | Auth |
|----------|-------|----------------|------|
| Journey routes | 4 | ✅ All 4 | `user` |
| Gamification user routes | 14 | 11/14 ✅ | `user` or `system_admin` |
| Admin gamification routes | 15 | ✅ All 15 | `user` + tenant role or `system_admin` |
| **Total** | **33** | **30/33** | — |

**3 unwrapped routes (known deferrals, no regression):**
1. `achievements/check/route.ts` — JOUR-002 (M3 deferred). Has manual auth + `applyRateLimit` inline.
2. `leaderboard/route.ts` — JOUR-003a (M3 deferred). Intentionally public (DD-4).
3. `sinks/route.ts` — JOUR-003b (M3 deferred). Intentionally public (DD-4).

**No new routes found since original audit.** File count: 14 gamification + 4 journey + 15 admin = 33. Matches original inventory.

### 2.4 Security Hardening Verification

#### GAM-001: Achievement Unlock — system_admin Only
**File:** `app/api/gamification/achievements/unlock/route.ts`  
**Verified:**
- ✅ `apiHandler({ auth: 'system_admin', rateLimit: 'api' })`
- ✅ Zod validation on all inputs (achievementId, targetUserId UUIDs)
- ✅ Metadata size limits enforced (25 keys, 200 char strings, 8KB total)
- ✅ Tenant resolved from memberships, never from client input
- ✅ Cosmetic grants via `checkAndGrantCosmetics()` on successful unlock

#### Phase 4.1: Achievement Check — Production Hardening
**File:** `app/api/gamification/achievements/check/route.ts`  
**Verified:**
- ✅ Production mode blocks stats-requiring triggers
- ✅ Only `first_login` and `profile_completed` triggers allowed in production
- ✅ Zod schema validates trigger + optional stats
- ✅ Inline rate limiting via `applyRateLimit(request, 'api')`
- ✅ Dual-client pattern: RLS for auth, service role for DB operations
- ✅ Tenant resolved from memberships (not user_progress)

### 2.5 Event Integrity Pipeline

**Files verified:**
- `lib/services/gamification-events.server.ts` (V1 pipeline)
- `lib/services/gamification-events-v2.server.ts` (V2 pipeline)

**Verified:**
- ✅ Both pipelines use `server-only` import
- ✅ Both use `createServiceRoleClient()` — never exposed to client
- ✅ 23505 duplicate handling intact in V1 (`if (code !== '23505')`)
- ✅ Idempotency keys on all cascade operations (events, campaigns, automation rules, streaks, first-events)
- ✅ Campaign bonus application scoped to active campaigns with date range filters
- ✅ F-01 through F-06 findings unchanged (hygiene items, no correctness risk)
- ✅ `achievements-admin.ts` L434 — F-04 `crypto.randomUUID()` fallback still present (noted, not a regression)

### 2.6 Deferred Items Baseline Check

All M3/M4 deferrals confirmed unchanged:
- ✅ JOUR-002: `achievements/check` still uses raw NextRequest handler (deferred M3)
- ✅ JOUR-003a: `leaderboard` still uses raw export (`export async function GET`) (deferred M3)
- ✅ JOUR-003b: `sinks` still uses raw export (deferred M3)
- ✅ JOUR-006: `burn` uses `apiHandler` but no Zod validation (deferred M3)
- ✅ JOUR-010/011/012: Unchanged (deferred M4)

---

## 3. Summary

| Area | Checks | Result |
|------|--------|--------|
| M1 tenant boundary + auth | 3 fixes verified | ✅ All intact |
| M2 rate limiting | 2 fixes + 1 partial verified | ✅ All intact |
| Route coverage | 33 routes scanned | ✅ No new routes |
| Security hardening (GAM-001) | system_admin lock verified | ✅ Intact |
| Phase 4.1 production hardening | Achievement check production guard | ✅ Intact |
| Event integrity pipeline | V1 + V2 idempotency | ✅ Intact |
| Deferred items baseline | 9 deferrals confirmed unchanged | ✅ No regression |

**Verdict: PASS**  
- 0 new findings  
- All 5 M1+M2 fixes verified intact  
- All 9 deferred items confirmed at expected state  
- Event integrity pipeline idempotency confirmed  
- No new routes added since original audit  

### Known Deferrals (unchanged)

| ID | Pri | Description | Expected Fix |
|----|-----|-------------|-------------|
| JOUR-002 | P2 | achievements/check unwrapped | M3 post-launch |
| JOUR-003 | P2 | Public routes missing wrapper | M3 post-launch |
| JOUR-006 | P2 | Burn route no Zod validation | M3 post-launch |
| JOUR-009 | P2 | Multiple routes missing rate limiting | M2 partial, remaining post-launch |
| JOUR-010 | P3 | Main GET no input validation | M4 post-launch |
| JOUR-011 | P3 | Inconsistent validation patterns | M4 post-launch |
| JOUR-012 | P3 | Pins vs Showcase overlap | M4 post-launch |
| F-01–F-06 | P2/P3 | Event integrity hygiene items | Post-launch |
