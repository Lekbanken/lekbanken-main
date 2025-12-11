# API VALIDATION REPORT – Phase 2: Backend ↔ Frontend

**Date:** 2025-12-11  
**Phase:** 2 – Backend ↔ Frontend Validation  
**Total Endpoints Inventoried:** 83  
**Status:** 🔄 IN PROGRESS

---

## Executive Summary

This report validates all 83 API endpoints across all domains for:
1. **Type Safety** – Does API return match frontend expectations?
2. **RLS Validation** – Do RLS policies allow queries to execute?
3. **Error Handling** – Are errors standardized (200/400/401/403/404/500)?
4. **Performance** – Optimized queries, indexes, pagination?

**Approach:** Systematic domain-by-domain validation with code inspection + schema checks.

---

## Validation Methodology

### Type Safety Check
```typescript
// API route returns:
interface APIResponse { id: string; name: string }

// Frontend expects:
interface FrontendType { id: string; name: string; description?: string }

// Result: ⚠️ MISMATCH – description missing from API
```

### RLS Policy Check
- Read migration files for RLS policies
- Verify query in route.ts matches policy conditions
- Check if authenticated user can execute query

### Error Handling Check
- 200 OK – Success with data
- 400 Bad Request – Validation error
- 401 Unauthorized – No auth
- 403 Forbidden – Auth but no permission
- 404 Not Found – Resource doesn't exist
- 500 Internal Server Error – Unexpected failure

### Performance Check
- Query uses indexes?
- Pagination implemented?
- N+1 query risks?
- Proper `.select()` projections (not `*` everywhere)?

---

## API Endpoint Inventory by Domain

### 🔐 Accounts Domain (11 endpoints)

#### Authentication & MFA
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/accounts/auth/mfa/disable` | POST | ? | ? | ? | ? | ⏳ TODO (not critical path) |
| `/api/accounts/auth/mfa/enroll` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Uses Supabase auth.mfa.enroll() API, returns QR code |
| `/api/accounts/auth/mfa/recovery-codes` | POST | ? | ? | ? | ? | ⏳ TODO (not critical path) |
| `/api/accounts/auth/mfa/status` | GET | ✅ | ✅ | ✅ | ✅ | ✅ OK - Lists MFA factors via auth.mfa.listFactors(), joins user_mfa table |
| `/api/accounts/auth/mfa/verify` | POST | ? | ? | ? | ? | ⏳ TODO (not critical path) |

#### Devices & Sessions  
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/accounts/devices` | GET/POST | ⚠️ | ✅ | ✅ | ✅ | ⚠️ TYPE CAST - Uses `type LooseSupabase` to bypass type checking for user_devices |
| `/api/accounts/devices/remove` | POST | ⚠️ | ✅ | ✅ | ✅ | ⚠️ TYPE CAST - Same LooseSupabase pattern, validates device ownership |
| `/api/accounts/sessions` | GET | ⚠️ | ✅ | ✅ | ✅ | ⚠️ TYPE CAST - Lists user sessions via LooseSupabase cast |
| `/api/accounts/sessions/revoke` | POST | ⚠️ | ✅ | ✅ | ✅ | ⚠️ TYPE CAST - Uses admin.signOut() + updates user_sessions, logs audit |

#### Profile (Critical Auth Flow ✅)
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/accounts/profile` | GET/PATCH | ⚠️ | ✅ | ✅ | ✅ | ⚠️ TYPE CAST - Updates users + user_profiles + auth.metadata, complex upsert logic |
| `/api/accounts/whoami` | GET | ✅ | ✅ | ✅ | ✅ | ✅ OK - Core auth endpoint, returns user+memberships+tenant+admin status |

**Accounts Domain Summary:** 11 endpoints – **8 validated ✅**, 3 TODO (non-critical MFA)  
**Critical Issue:** Type casting pattern `type LooseSupabase` bypasses TypeScript safety for user_profiles/user_sessions/user_devices tables

---

### 💳 Billing Domain (13 endpoints)

#### Subscriptions
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/billing/create-subscription` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/products` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/subscription` | GET/POST/PATCH | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/stripe-customer` | GET/POST | ? | ? | ? | ? | ⏳ TODO |

#### Invoices & Payments
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/billing/tenants/[tenantId]/invoices` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/invoices/[invoiceId]` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/invoices/[invoiceId]/payments/[paymentId]` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/invoices/stripe` | POST | ? | ? | ? | ? | ⏳ TODO |

#### Seats
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/billing/tenants/[tenantId]/seats` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/billing/tenants/[tenantId]/seats/[seatId]` | PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |

#### Webhooks
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/billing/webhooks/stripe` | POST | ? | ? | ? | ? | ⏳ TODO |

**Billing Domain Summary:** 13 endpoints – ⏳ Validation pending

---

### 🔍 Browse Domain (1 endpoint)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/browse/filters` | GET | ? | ? | ? | ? | ⏳ TODO |

**Browse Domain Summary:** 1 endpoint – ⏳ Validation pending

---

### 🎮 Games Domain (6 endpoints)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/games` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/games/[gameId]` | GET/PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/games/[gameId]/publish` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/games/[gameId]/related` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/games/featured` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/games/search` | POST | ? | ? | ? | ? | ⏳ TODO |

**Games Domain Summary:** 6 endpoints – ⏳ Validation pending

---

### 🏆 Gamification Domain (1 endpoint)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/gamification` | GET | ? | ? | ? | ? | ⏳ TODO |

**Gamification Domain Summary:** 1 endpoint – ⏳ Validation pending

---

### 🖼️ Media Domain (8 endpoints)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/media` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/[mediaId]` | GET/PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/fallback` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/upload` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/upload/confirm` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/templates` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/media/templates/[templateId]` | GET | ? | ? | ? | ⏳ TODO |

**Media Domain Summary:** 8 endpoints – ⏳ Validation pending

---

### 👥 Participants Domain (15 endpoints)

#### Sessions
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/participants/sessions/create` | POST | ✅ | ✅ | ✅ | ✅ | ✅ VALIDATED (Dec 11) |
| `/api/participants/sessions/join` | POST | ✅ | ✅ | ✅ | ✅ | ✅ VALIDATED (Dec 11) |
| `/api/participants/sessions/rejoin` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role client, validates token+session+status, proper 401/403/404/410 |
| `/api/participants/sessions/[code]` | GET | ✅ | ✅ | ✅ | ✅ | ✅ OK - Public endpoint, returns sanitized session info only, normalizes code |
| `/api/participants/sessions/[sessionId]` | GET/DELETE | ✅ | ✅ | ✅ | ✅ | ✅ OK - GET: sanitized info, DELETE: archive-only+7-day minimum+cascading deletes |
| `/api/participants/sessions/[sessionId]/analytics` | GET | ✅ | ✅ | ✅ | ⚠️ | ⚠️ N+1 RISK - Loops participants for game_progress (100 participants = 100 queries) |
| `/api/participants/sessions/[sessionId]/archive` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role, validates status, logs activity |
| `/api/participants/sessions/[sessionId]/control` | PATCH | ✅ | ✅ | ✅ | ✅ | ✅ OK - Host-only auth, validates actions (pause/resume/lock/unlock/end), broadcasts |
| `/api/participants/sessions/[sessionId]/export` | GET | ✅ | ✅ | ✅ | ⚠️ | ⚠️ N+1 RISK - Similar analytics issue, CSV generation could batch better |
| `/api/participants/sessions/[sessionId]/restore` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Archive-only restore, logs activity |
| `/api/participants/sessions/history` | GET | ✅ | ✅ | ✅ | ⚠️ | ⚠️ N+1 RISK - Promise.all loops sessions for participant counts (batch query better) |

#### Participant Management
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/participants/[participantId]/role` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Host-only auth, validates role enum, broadcasts change |

#### Progress & Achievements
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/participants/progress/update` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role, token auth, upsert logic, validates blocked/kicked status |
| `/api/participants/progress/unlock-achievement` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role, duplicate check (409), broadcasts unlock, logs activity |

#### Tokens
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/participants/tokens/cleanup` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Background job, batch updates expired tokens, auto-archives old sessions (90d) |
| `/api/participants/tokens/extend` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role, validates 1-168h extension limit, logs activity |
| `/api/participants/tokens/revoke` | POST | ✅ | ✅ | ✅ | ✅ | ✅ OK - Service role, accepts token OR participant_id, sets expiry to now, disconnects |

**Participants Domain Summary:** 15 endpoints – **15 validated ✅ (Dec 11)**  
**Issues Found:** 3 N+1 query risks (analytics, export, history) – recommend batch queries

---

### 📋 Planner Domain (10 endpoints)

#### Plans
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/plans` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/search` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]` | GET/PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]/visibility` | PATCH | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]/play` | GET | ? | ? | ? | ? | ⏳ TODO |

#### Blocks
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/plans/[planId]/blocks` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]/blocks/[blockId]` | PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]/blocks/reorder` | POST | ? | ? | ? | ? | ⏳ TODO |

#### Notes
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/plans/[planId]/notes/private` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/plans/[planId]/notes/tenant` | GET/POST | ? | ? | ? | ? | ⏳ TODO |

**Planner Domain Summary:** 10 endpoints – ⏳ Validation pending

---

### 📦 Products Domain (6 endpoints)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/products` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/products/[productId]` | GET/PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/products/[productId]/purposes` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/products/[productId]/purposes/[purposeId]` | DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/purposes` | GET | ? | ? | ? | ? | ⏳ TODO |

**Products Domain Summary:** 6 endpoints – ⏳ Validation pending

---

### 🏢 Tenants Domain (12 endpoints)

#### Tenant Management
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/tenants` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]` | GET/PATCH | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/status` | POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/settings` | GET/PATCH | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/branding` | GET/PATCH | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/audit-logs` | GET | ? | ? | ? | ? | ⏳ TODO |

#### Members & Invitations
| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/tenants/[tenantId]/members` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/members/[userId]` | PATCH/DELETE | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/[tenantId]/invitations` | GET/POST | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/invitations/[token]` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/tenants/invitations/[token]/accept` | POST | ? | ? | ? | ? | ⏳ TODO |

**Tenants Domain Summary:** 12 endpoints – ⏳ Validation pending

---

### 🛠️ Platform/System Domain (2 endpoints)

| Endpoint | Method | Type-Safe | RLS | Error Handling | Performance | Status |
|----------|--------|-----------|-----|----------------|-------------|--------|
| `/api/health` | GET | ? | ? | ? | ? | ⏳ TODO |
| `/api/system/metrics` | GET | ? | ? | ? | ? | ⏳ TODO |

**Platform Domain Summary:** 2 endpoints – ⏳ Validation pending

---

## Validation Progress Summary

| Domain | Total Endpoints | Validated | Pending | % Complete |
|--------|----------------|-----------|---------|-----------|
| Accounts | 11 | 8 | 3 | 73% |
| Billing | 13 | 0 | 13 | 0% |
| Browse | 1 | 0 | 1 | 0% |
| Games | 6 | 0 | 6 | 0% |
| Gamification | 1 | 0 | 1 | 0% |
| Media | 8 | 0 | 8 | 0% |
| Participants | 15 | 15 | 0 | 100% |
| Planner | 10 | 0 | 10 | 0% |
| Products | 6 | 0 | 6 | 0% |
| Tenants | 12 | 0 | 12 | 0% |
| Platform/System | 2 | 0 | 2 | 0% |
| **TOTAL** | **83** | **23** | **60** | **28%** |

---

## Validation Plan

### Phase 2.1: Critical Paths (Week 1)
**Priority:** Validate core user flows first

1. **Auth Flow** (Accounts Domain)
   - `/api/accounts/whoami`
   - `/api/accounts/profile`
   - `/api/accounts/sessions`

2. **Game Discovery** (Games + Browse)
   - `/api/games/search`
   - `/api/browse/filters`
   - `/api/games/featured`

3. **Session Management** (Participants Domain)
   - Complete remaining 13 endpoints (2 already done)

4. **Tenant Operations** (Tenants Domain)
   - `/api/tenants`
   - `/api/tenants/[tenantId]/members`
   - `/api/tenants/invitations/[token]/accept`

**Estimate:** 3-4 days (30-40 endpoints)

---

### Phase 2.2: Secondary Flows (Week 2)
**Priority:** Business logic endpoints

1. **Planner Domain** (10 endpoints)
   - Plan CRUD + blocks + notes

2. **Media Domain** (8 endpoints)
   - Upload + delete + alt-text

3. **Products Domain** (6 endpoints)
   - Product/purpose queries

4. **Billing Domain** (13 endpoints)
   - Subscriptions + invoices + seats

**Estimate:** 4-5 days (37 endpoints)

---

### Phase 2.3: Support Endpoints (Week 2)
**Priority:** Admin + monitoring

1. **Gamification** (1 endpoint)
2. **Platform/System** (2 endpoints)
3. **Remaining Accounts** (MFA, devices)

**Estimate:** 1-2 days (14 endpoints)

---

## Next Actions

### Immediate (Today)
- [ ] Start with Participants Domain – validate remaining 13 endpoints
- [ ] Create validation checklist template for systematic review

### This Week
- [ ] Complete Phase 2.1 Critical Paths (30-40 endpoints)
- [ ] Document type mismatches found
- [ ] Fix P0 issues (missing RLS, critical type errors)

### Next Week
- [ ] Complete Phase 2.2 Secondary Flows (37 endpoints)
- [ ] Complete Phase 2.3 Support Endpoints (14 endpoints)
- [ ] Generate final API validation summary

---

## Validation Criteria

### ✅ PASS Criteria
- Type-safe: API response type matches frontend expectations (no `any` casts)
- RLS: Queries execute successfully with proper tenant/user scoping
- Error Handling: All error codes correct (400/401/403/404/500)
- Performance: Uses indexes, pagination for list endpoints, no N+1 queries

### ⚠️ NEEDS FIX Criteria
- Minor type mismatches (optional fields)
- Missing error handling for edge cases
- Performance improvements recommended but not critical

### ❌ CRITICAL Issues
- Type mismatches causing runtime errors
- RLS policies block legitimate queries
- Missing authentication/authorization checks
- SQL injection or security vulnerabilities
- No error handling (crashes on invalid input)

---

**Status:** 🔄 Phase 2 In Progress  
**Progress:** 23/83 endpoints validated (28%)  
**Next:** Continue with Games/Browse Domain (game search, filters, featured)

---

## Detailed Validation Findings

### ✅ Participants Domain – Complete (15/15 endpoints)

**Validated:** December 11, 2025  
**Overall Quality:** Excellent – Well-architected with proper auth, error handling, and RLS bypass where needed

#### Strengths
1. **Proper Auth Patterns:**
   - Service role client for token-based operations (bypasses RLS correctly)
   - Host verification for management endpoints (analytics, control, export)
   - Token validation with status checks (blocked/kicked prevention)

2. **Comprehensive Error Handling:**
   - Standardized error codes: 400 (validation), 401 (unauthorized), 403 (forbidden), 404 (not found), 410 (gone), 409 (conflict)
   - Clear error messages with context
   - Graceful degradation (e.g., already unlocked achievement returns 409)

3. **Security Features:**
   - Session ownership verification
   - Participant status validation (blocked/kicked checks)
   - Token expiry enforcement
   - Archive-only deletion with 7-day minimum guard
   - Sanitized public responses (no host_user_id exposure)

4. **Activity Logging:**
   - All state changes logged to `participant_activity_log`
   - Proper tenant_id/session_id/participant_id tracking
   - Rich event_data for audit trails

#### Performance Issues Found

**⚠️ Issue #1: N+1 Query in Analytics Endpoint**
- **Location:** [/api/participants/sessions/[sessionId]/analytics/route.ts](app/api/participants/sessions/[sessionId]/analytics/route.ts#L64-L88)
- **Problem:** Loops through participants array to calculate stats individually
- **Impact:** 100 participants = 100+ queries for game_progress
- **Fix:** Use single aggregated query with joins:
  ```sql
  SELECT 
    participant_id, 
    COUNT(*) as games_played,
    SUM(score) as total_score,
    SUM(achievement_count) as total_achievements
  FROM participant_game_progress
  WHERE session_id = $1
  GROUP BY participant_id
  ```

**⚠️ Issue #2: N+1 Query in Export Endpoint**
- **Location:** [/api/participants/sessions/[sessionId]/export/route.ts](app/api/participants/sessions/[sessionId]/export/route.ts#L54-L73)
- **Problem:** Similar to analytics – loops participants for progress stats
- **Impact:** CSV export slow for large sessions
- **Fix:** Same aggregation approach as Issue #1

**⚠️ Issue #3: N+1 Query in History Endpoint**
- **Location:** [/api/participants/sessions/[sessionId]/history/route.ts](app/api/participants/sessions/history/route.ts#L62-L101)
- **Problem:** `Promise.all` loops sessions to fetch participant counts individually
- **Impact:** 50 sessions = 50 extra queries
- **Fix:** Use window functions or single query with GROUP BY:
  ```sql
  SELECT 
    ps.*,
    COUNT(p.id) FILTER (WHERE p.status = 'active') as active_count,
    COUNT(p.id) FILTER (WHERE p.status = 'idle') as idle_count,
    -- etc
  FROM participant_sessions ps
  LEFT JOIN participants p ON ps.id = p.session_id
  WHERE ps.host_user_id = $1
  GROUP BY ps.id
  ```

#### Type Safety Analysis

All endpoints return properly typed responses:
- ✅ `Database['public']['Enums']` for status/role enums
- ✅ Explicit interfaces for request bodies (`RejoinRequest`, `ControlRequest`, etc.)
- ✅ `Json` type for metadata fields
- ✅ No `any` casts found

#### RLS Validation

**Correctly bypasses RLS:**
- Token-based operations use `createServiceRoleClient` (no user context)
- Cleanup job uses service role (background task)

**Correctly uses RLS:**
- Analytics, export, history use `createServerRlsClient` with host auth
- Control operations verify host ownership before mutations

**No RLS issues found** ✅

#### Error Handling Validation

All endpoints follow standard patterns:
- ✅ 400 for missing/invalid input
- ✅ 401 for invalid tokens
- ✅ 403 for blocked/kicked participants or non-host operations
- ✅ 404 for not found resources
- ✅ 409 for conflict (already unlocked achievement)
- ✅ 410 for ended sessions (rejoin)
- ✅ 500 for unexpected errors with try/catch

#### Recommendations

**P1 - Fix N+1 Queries:**
- Refactor analytics, export, and history endpoints to use aggregated queries
- Estimated impact: 10-100x performance improvement for large sessions
- Estimated effort: 2-3 hours

**P2 - Add Pagination to Analytics:**
- Activity log query uses `limit(100)` but no pagination
- Could miss events if >100 activities
- Add offset/limit parameters

**P3 - Consider Caching:**
- History endpoint could benefit from short-lived cache (1-5 min)
- Reduce load for users repeatedly checking session list

**P4 - Add Rate Limiting:**
- Token extend/revoke endpoints could be abused
- Recommend same rate limits as join endpoint (already implemented for create/join)

---

**Participants Domain Status:** ✅ COMPLETE  
**Critical Issues:** 0  
**Performance Issues:** 3 (N+1 queries - non-blocking)  
**Recommended Fixes:** 4 (P1-P4 above)

---

### ✅ Accounts Domain – Core Auth Complete (8/11 endpoints)

**Validated:** December 11, 2025  
**Overall Quality:** Good – Core auth flow solid, type safety issue with auxiliary tables

#### Strengths
1. **Core Auth Flow Works:**
   - `/api/accounts/whoami` returns complete user context (user, memberships, active_tenant, is_system_admin)
   - `/api/accounts/profile` handles users + user_profiles + auth.metadata sync correctly
   - Session management functional (list, revoke with admin API)

2. **RLS Policies Correct:**
   - All tables use `auth.uid() = user_id OR is_system_admin()` pattern
   - Devices/sessions properly scoped to user
   - Admin bypass working via `is_system_admin()` helper

3. **Audit Logging:**
   - Profile updates, session revokes, device removals all logged to `user_audit_logs`
   - Uses `logUserAuditEvent()` service consistently

4. **MFA Integration:**
   - Properly uses Supabase auth.mfa.* APIs
   - Status endpoint joins auth factors with user_mfa table
   - Enroll returns QR code for TOTP setup

#### Critical Type Safety Issue ❌

**Problem:** All endpoints querying `user_profiles`, `user_sessions`, `user_devices`, `user_mfa` use this pattern:

```typescript
type LooseSupabase = { from: (table: string) => ReturnType<typeof supabase.from> }
const loose = supabase as unknown as LooseSupabase
const { data } = await loose.from('user_profiles').select('*')
```

**Why:** These tables are **not in the generated Supabase types** (`types/supabase.ts`).

**Root Cause:** Migration `20251209120000_accounts_domain.sql` creates tables but types not regenerated.

**Impact:**
- ❌ No TypeScript compile-time validation
- ❌ Runtime errors possible if schema changes
- ❌ Auto-complete broken for these tables
- ❌ Type mismatches between API and frontend undetected

**Fix Required:**
```bash
# Regenerate Supabase types
npx supabase gen types typescript --project-id <project-id> > types/supabase.ts

# Then remove all LooseSupabase casts and use normal types:
const { data } = await supabase
  .from('user_profiles')  // Now type-safe!
  .select('*')
  .eq('user_id', user.id)
```

**Affected Endpoints:**
- `/api/accounts/profile` (GET, PATCH)
- `/api/accounts/sessions` (GET)
- `/api/accounts/sessions/revoke` (POST)
- `/api/accounts/devices` (GET, POST)
- `/api/accounts/devices/remove` (POST)
- `/api/accounts/auth/mfa/status` (GET)

#### RLS Validation ✅

All policies verified in migration:

```sql
-- user_profiles: Owner or system admin
CREATE POLICY user_profiles_owner ON public.user_profiles
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())

-- user_devices: Owner or system admin  
CREATE POLICY user_devices_owner ON public.user_devices
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())

-- user_sessions: Owner or system admin
CREATE POLICY user_sessions_owner ON public.user_sessions
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())

-- user_mfa: Owner or system admin
CREATE POLICY user_mfa_owner ON public.user_mfa
  FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())

-- user_audit_logs: Can see logs where you're user or actor
CREATE POLICY user_audit_logs_owner ON public.user_audit_logs
  FOR SELECT USING (user_id = auth.uid() OR actor_user_id = auth.uid() OR public.is_system_admin())
```

**Status:** ✅ Policies correct, queries will succeed

#### Error Handling ✅

Standard pattern across all endpoints:
- ✅ 401 for unauthenticated requests
- ✅ 400 for missing required fields (e.g., `device_id`, `session_id`)
- ✅ 500 with console.error for unexpected database errors
- ✅ Graceful error handling in profile PATCH (continues if auth metadata update fails)

#### Performance ✅

- Indexes exist for all foreign keys (user_id, session_id, device_id)
- Order by last_seen_at descending (indexed)
- No N+1 queries detected
- Device upsert logic optimized (single query to check existing)

#### Session Management Pattern

**Best-effort revoke:**
```typescript
// Try admin API revoke (may fail silently)
try {
  await supabaseAdmin.auth.admin.signOut(session_id)
} catch (err) {
  console.warn('[revoke] admin signOut warning', err)
}

// Always mark as revoked in database
await supabase
  .from('user_sessions')
  .update({ revoked_at: now })
  .eq('supabase_session_id', session_id)
```

This is **correct pattern** – database is source of truth, admin API is best-effort.

#### Recommendations

**P0 - CRITICAL: Regenerate Supabase Types**
- Run `supabase gen types` to add user_profiles/user_sessions/user_devices/user_mfa
- Remove all `LooseSupabase` type casts
- Test all 6 affected endpoints for type errors
- Estimated effort: 1-2 hours
- **Impact:** Prevents future runtime errors from schema changes

**P1 - Complete MFA Endpoints:**
- Implement `/api/accounts/auth/mfa/disable`, `/api/accounts/auth/mfa/verify`, `/api/accounts/auth/mfa/recovery-codes`
- Currently partial implementation (enroll + status work, but no disable/verify)
- Estimated effort: 2-3 hours

**P2 - Add Admin Override for user_profiles:**
- Migration `20251209123000_users_rls_admin.sql` adds admin policy for user_profiles:
  ```sql
  CREATE POLICY user_profiles_admin_or_self ON public.user_profiles
    FOR ALL USING (user_id = auth.uid() OR public.is_system_admin())
  ```
- Verify this policy is applied (may conflict with `user_profiles_owner` policy)
- Check for duplicate policies: `DROP POLICY IF EXISTS user_profiles_owner` before creating

**P3 - Frontend Type Sync:**
- After regenerating types, verify frontend components using these endpoints:
  - `features/profile/ProfilePage.tsx` (uses /whoami, /profile, /sessions, /devices)
  - Check SessionInfo, DeviceInfo types match API responses

---

**Accounts Domain Status:** ✅ CORE COMPLETE (8/11 validated)  
**Critical Issues:** 1 (Type safety - requires type regeneration)  
**Blocking:** No (API works, just lacks compile-time safety)  
**Recommended:** Fix type safety before adding new features to Accounts Domain
