# Batch Regression Audit — Tier 2 + Tier 3 Domains

> **Domains:** Atlas/Sandbox, Media/Assets, Notifications, Support/Tickets, Profile/Settings, Marketing/Landing, Calendar  
> **Type:** Regression Audit (Phase 5)  
> **Date:** 2026-03-14  
> **Auditor:** Claude  
> **Verdict:** ✅ PASS — 0 new findings across all 7 domains  

---

## 1. Tier 2 Domains (Remediated, M1 fixes to verify)

### 1.1 Atlas / Sandbox — PASS ✅

**Original audit:** 11 findings (0 P0, 2 P1, 6 P2, 3 P3). M1 complete (2 P1 fixed).

**M1 Fixes Verified:**

| Finding | File | Fix | Verified |
|---------|------|-----|----------|
| ATLAS-001 | `app/api/atlas/inventory/route.ts` | `apiHandler({ auth: 'system_admin' })` | ✅ L44 |
| ATLAS-001 | `app/api/atlas/annotations/route.ts` | GET + POST both `apiHandler({ auth: 'system_admin' })` | ✅ L18, L42 |
| ATLAS-001 | `app/api/atlas/annotations/route.ts` | POST production guard `NODE_ENV === 'production'` | ✅ Intact |
| ATLAS-002 | `app/api/admin/award-builder/seed-test-badges/route.ts` | GET `apiHandler({ auth: 'system_admin' })` | ✅ L143 |

**Route scan:** 2 atlas routes found, same as original audit. No new routes.  
**Deferred:** ATLAS-003–011 (M2/M3/M4) all post-launch, unchanged.

### 1.2 Media / Assets — PASS ✅

**Original audit:** 12 findings (0 P0, 2 P1, 6 P2, 4 P3). M1 complete (2 P1 fixed).

**M1 Fixes Verified:**

| Finding | File | Fix | Verified |
|---------|------|-----|----------|
| MEDIA-001 | `app/api/media/upload/route.ts` | `assertTenantMembership()` on tenantId before signed URL generation | ✅ L40-42 |
| MEDIA-001 | `app/api/media/upload/confirm/route.ts` | Path-prefix tenant validation (UUID extraction + membership check) | ✅ L22-27 |
| MEDIA-002 | `app/actions/design.ts` | `user_tenant_memberships` check in `uploadTenantAsset()` | ✅ L413-421 |

**Route scan:** 7 media routes found, same as original audit. No new routes.  
**Additional checks:**
- Upload POST has `rateLimit: 'api'` ✅
- Confirm POST uses Zod schema (`confirmSchema`) ✅
- Upload Zod schema enforces 10MB max ✅
- Bucket allowlist in Zod enum ✅

**Deferred:** MEDIA-003–012 (M2/M3/M4) all post-launch, unchanged.

---

## 2. Tier 3 Domains (0 P1, no remediation needed)

### 2.1 Notifications — PASS ✅

**Original audit:** 8 findings (0 P0, 0 P1, 5 P2, 3 P3). No M1 remediation.  
**Routes:** 0 API routes (uses server actions: `notifications-admin.ts`).  
**Regression check:** No fixes to verify. Domain architecture unchanged.

### 2.2 Support / Tickets — PASS ✅

**Original audit:** 10 findings (0 P0, 0 P1, 8 P2, 2 P3). No M1 remediation.  
**Routes:** 0 API routes (uses server actions: `tickets-user.ts`, `tickets-admin.ts`, `support-automation.ts`).  
**Regression check:** No fixes to verify. RLS-first design unchanged.

### 2.3 Profile / Settings — PASS ✅

**Original audit:** 8 findings (0 P0, 0 P1, 4 P2, 4 P3). No M1 remediation.  
**Routes:** 4 API routes — all using `apiHandler({ auth: 'user' })`:
- `app/api/accounts/profile/route.ts` (GET, PATCH)
- `app/api/accounts/profile/preferences/route.ts`
- `app/api/accounts/profile/notifications/route.ts`
- `app/api/accounts/profile/organizations/route.ts`

**Regression check:** All routes wrapped with auth. No fixes to verify.

### 2.4 Marketing / Landing — PASS ✅

**Original audit:** 7 findings (0 P0, 0 P1, 2 P2, 5 P3). MKT-001 M1 fixed.  
**Routes:** 0 API routes (public pages, static rendering).

**M1 Fix Verified:**

| Finding | File | Fix | Verified |
|---------|------|-----|----------|
| MKT-001 | `app/robots.ts` | Created — blocks `/app`, `/admin`, `/sandbox` from crawlers | ✅ File exists |
| MKT-001 | `app/sitemap.ts` | Created — lists public pages | ✅ File exists |

### 2.5 Calendar — PASS ✅

**Original audit:** 7 findings (0 P0, 0 P1, 3 P2, 4 P3). No M1 remediation.  
**Routes:** 2 API routes — both using `apiHandler({ auth: 'user' })`:
- `app/api/plans/schedules/route.ts` (GET, POST) — uses `requirePlanEditAccess`
- `app/api/plans/schedules/[scheduleId]/route.ts` (GET, PUT, DELETE)

**Regression check:** Sub-feature of Planner. Routes wrapped + plan access checks. No fixes to verify.

---

## 3. Summary

| Domain | Tier | Findings | M1 Fixes | Regression | New Findings |
|--------|------|----------|----------|------------|-------------|
| Atlas / Sandbox | T2 | 11 (2 P1) | 3 verified ✅ | PASS | 0 |
| Media / Assets | T2 | 12 (2 P1) | 3 verified ✅ | PASS | 0 |
| Notifications | T3 | 8 (0 P1) | — | PASS | 0 |
| Support / Tickets | T3 | 10 (0 P1) | — | PASS | 0 |
| Profile / Settings | T3 | 8 (0 P1) | — | PASS | 0 |
| Marketing / Landing | T3 | 7 (0 P1) | 1 verified ✅ | PASS | 0 |
| Calendar | T3 | 7 (0 P1) | — | PASS | 0 |
| **Total** | | **63** | **7** | **7/7 PASS** | **0** |
