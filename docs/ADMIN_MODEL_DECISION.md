# Admin Model Decision: System Admin vs Tenant Admin

**Date**: 2026-01-10  
**Status**: DECISION DOCUMENT  
**Scope**: Canonical model for admin access control + Phase 2 readiness  

---

## Executive Summary

After comprehensive code archaeology, this document establishes the **canonical admin access model** and provides a safe Phase 2 implementation plan.

### Decision: Model A* (Fix Proxy to Enable Existing Design)

The codebase was **designed** for Model A (`/admin/tenant/*` accessible to tenant admins) but the proxy was implemented with an overly broad gate. The layouts, navigation, tests, and documentation all assume tenant admins can reach `/admin/tenant/*`.

**Canonical Model**:
- `/admin/*` (excluding `/admin/tenant/*`) → **system_admin only**
- `/admin/tenant/[tenantId]/*` → **system_admin OR tenant owner/admin/editor with membership**
- `/app/*` → **authenticated users** (consumer-facing app)

---

## 1. Evidence: Intended Meaning of `/admin/tenant/*`

### 1.1 All References Found

| Pattern | File | Line | Implication |
|---------|------|------|-------------|
| `ActingAsTenantBanner` | `components/admin/ActingAsTenantBanner.tsx` | 1-82 | **System admin viewing as tenant** - shows "Agerar som: {tenant}" |
| `showActingAsBanner = isSystemAdmin && currentTenantId` | `components/admin/AdminSidebar.tsx` | 157 | Banner only shown for system admins, not tenant admins |
| `TenantRouteSync` | `app/admin/tenant/[tenantId]/layout.tsx` | 43-47 | Syncs tenantId from route param, `enabled={!isSystemAdmin && hasTenantAccess}` |
| `organisationAdminCategories` | `lib/admin/nav.ts` | 153-214 | All hrefs point to `/admin/tenant/[tenantId]/*` |
| `app/admin/page.tsx` redirect | `app/admin/page.tsx` | 12-17 | **Non-system admins redirected TO `/admin/tenant/{id}`** |
| Layout guard | `app/admin/tenant/[tenantId]/layout.tsx` | 27-35 | Allows `isSystemAdmin OR hasTenantAccess` |
| Test expectations | `tests/e2e/admin-auth.spec.ts` | 115-137 | Tests expect tenant admins to access `/admin/tenant/*` |
| Test setup comment | `tests/e2e/auth.setup.tenant-admin.ts` | 38 | "tenant admins may go to /admin/tenant/[id]" |
| IA Proposal | `docs/ADMIN_IA_PROPOSAL.md` | 23 | "Audience: tenant owner/admin/editor (and system_admin when 'acting as tenant')" |

### 1.2 What "showActingAsBanner" Means

```typescript
// components/admin/ActingAsTenantBanner.tsx lines 29-31
if (!isSystemAdmin || !currentTenantId || !currentTenant) {
  return null;
}
```

**Meaning**: The banner is shown ONLY when:
- User IS a system_admin
- AND they have selected a tenant context

This is for **system admins impersonating/viewing a tenant** - NOT for actual tenant admins (who don't need a reminder they're viewing their own org).

### 1.3 TenantRouteSync Intent

```typescript
// app/admin/tenant/[tenantId]/layout.tsx lines 43-47
<TenantRouteSync 
  tenantId={tenantId} 
  enabled={!isSystemAdmin && hasTenantAccess}
/>
```

**Meaning**: TenantRouteSync is ENABLED for users who:
- Are NOT system_admin
- AND have tenant access

This reveals clear **DESIGN INTENT** for tenant admins to use these routes.

---

## 2. Do Real Users Navigate to `/admin/tenant/*`?

### 2.1 Redirect Logic Found

| File | Code | Intent |
|------|------|--------|
| `app/admin/page.tsx` | `redirect(\`/admin/tenant/${tenantId}\`)` | **YES** - non-system admins are sent here |
| `app/admin/tenant/[tenantId]/layout.tsx` | `redirect(\`/admin/tenant/${firstTenantId}\`)` | Fallback to first available tenant |

### 2.2 E2E Tests

```typescript
// tests/e2e/admin-auth.spec.ts lines 114-121
test('can access own tenant dashboard', async ({ page }) => {
  await page.goto(`/admin/tenant/${TEST_TENANT_ID}`);
  // Should be able to access own tenant, or redirected to /app if membership missing
  const url = page.url();
  const hasAccess = url.includes(`/admin/tenant/${TEST_TENANT_ID}`) || url.includes('/app');
  expect(hasAccess).toBe(true);
});
```

**Intent**: Tests EXPECT tenant admins to reach `/admin/tenant/*`.

### 2.3 Navigation Config

All tenant admin navigation in `lib/admin/nav.ts` points to `/admin/tenant/[tenantId]/*`:
- `/admin/tenant/[tenantId]` (Dashboard)
- `/admin/tenant/[tenantId]/members`
- `/admin/tenant/[tenantId]/analytics`
- `/admin/tenant/[tenantId]/games`
- etc.

### 2.4 Documentation

From `docs/ADMIN_IA_PROPOSAL.md`:
> "Tenant mode: Audience: tenant owner/admin/editor (and system_admin when 'acting as tenant')"

### 2.5 Conclusion

**`/admin/tenant/*` WAS INTENDED for tenant admins** - but the proxy blocks them before they can reach the designed layouts.

---

## 3. Existing Tenant-Admin Surfaces Under `/app`

### 3.1 Current `/app/admin/*` Routes

| Path | File | Guards | Status |
|------|------|--------|--------|
| `/app/admin/tenant` | `app/app/admin/tenant/page.tsx` | **NONE** | Old debug page |
| `/app/admin/gamification/achievements` | `app/app/admin/gamification/achievements/page.tsx` | **NONE** | Phase 1 placeholder |

### 3.2 Guard Analysis

**`app/app/layout.tsx`**:
```typescript
// Lines 14-20
if (!authContext.user) {
  redirect('/auth/login?redirect=/app')
}
// NO ROLE CHECK - any authenticated user can access /app/*
```

**Result**: `/app/admin/*` has NO tenant admin guards. Any authenticated user can reach these pages.

### 3.3 Tenant Context Derivation Under `/app`

From `proxy.ts` lines 232-272:
- Proxy DOES set `x-tenant-id` header for `/app` paths
- Uses cookie → membership fallback
- Supports `/app/t/[tenantId]/...` path override (regex: `/^\/app\/t\/([^/]+)/i`)

**Note**: The `/app/t/[tenantId]` pattern is recognized by proxy but NO file-system routes exist.

---

## 4. Model Recommendation

### Comparison Table

| Aspect | Model A (Fix Proxy) | Model B (/app/t/[tenantId]/admin/*) |
|--------|---------------------|-------------------------------------|
| Proxy changes | YES - add exception for `/admin/tenant/*` | NO |
| Existing routes | All `/admin/tenant/*` routes work | Must create new routes |
| Existing navigation | Works as-is | Must update all hrefs |
| Existing tests | Pass after proxy fix | Must rewrite |
| Existing docs | Accurate | Must update |
| Layout guards | Already exist and are tested | Must create new |
| Risk | Security change in proxy | Large migration |
| Effort | ~20 lines in proxy.ts | 50+ files changed |

### Chosen Model: **A*** (Fix Proxy to Enable Design)

The codebase was DESIGNED for `/admin/tenant/*` to be accessible to tenant admins. The layouts, navigation, tests, and documentation all assume this. The proxy gate was simply too broad.

---

## 5. Canonical Route Prefixes

| Route Pattern | Audience | Auth Layer | Tenant Context |
|---------------|----------|------------|----------------|
| `/admin` | system_admin only | Proxy gate | None (global) |
| `/admin/*` (non-tenant) | system_admin only | Proxy gate | None (global) |
| `/admin/tenant/[tenantId]/*` | system_admin OR tenant owner/admin/editor | Proxy (modified) + Layout | From route param |
| `/app/*` | Authenticated users | Layout (authentication) | From cookie/header |
| `/app/t/[tenantId]/*` | Authenticated users | Layout (authentication) | From route param |

---

## 6. Navigation Tree Mapping

| Mode | Nav Tree | Points To | Shown To |
|------|----------|-----------|----------|
| System | `ADMIN_NAV.system` | `/admin/*` | `system_admin` |
| Tenant | `ADMIN_NAV.organisation` | `/admin/tenant/[tenantId]/*` | `system_admin` (in tenant mode) OR `tenant owner/admin/editor` |

**No changes needed** to navigation configuration once proxy is fixed.

---

## 7. Required Guards Per Layer

### 7.1 Proxy Layer (`proxy.ts`)

```typescript
// CURRENT (line 219) - TOO BROAD:
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
  return NextResponse.redirect(new URL('/app', request.url))
}

// REQUIRED CHANGE:
if (user && pathname.startsWith('/admin')) {
  // Tenant routes: allow tenant admins with membership
  if (pathname.startsWith('/admin/tenant/')) {
    // Extract tenantId from path, verify membership
    const tenantIdMatch = pathname.match(/^\/admin\/tenant\/([^/]+)/)
    if (tenantIdMatch) {
      const tenantId = tenantIdMatch[1]
      const hasTenantMembership = checkTenantMembership(user, tenantId)
      if (hasTenantMembership || effectiveRole === 'system_admin') {
        // Allow through - layout will do detailed check
      } else {
        return NextResponse.redirect(new URL('/app', request.url))
      }
    }
  } else if (effectiveRole !== 'system_admin') {
    return NextResponse.redirect(new URL('/app', request.url))
  }
}
```

### 7.2 Layout Layer (`app/admin/tenant/[tenantId]/layout.tsx`)

**Already exists and is correct** (lines 27-35):
```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
const tenantRole = membership?.role ?? null;
const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

if (!isSystemAdmin && !hasTenantAccess) {
  redirect('/admin');
}
```

### 7.3 Server Actions

Use `assertTenantAdminOrSystem(tenantId, user)` from `lib/utils/tenantAuth.ts`:

```typescript
// Example pattern
const allowed = await assertTenantAdminOrSystem(tenantId, user);
if (!allowed) {
  return { success: false, error: 'Unauthorized' };
}
```

### 7.4 RLS Policies

Already exist for achievements (from Phase 1 migrations). Pattern:
```sql
CREATE POLICY achievement_awards_tenant_admin_select
  ON public.achievement_awards FOR SELECT
  USING (
    is_system_admin(auth.uid()) OR
    (is_tenant_admin(tenant_id) AND tenant_id = achievement_awards.tenant_id)
  );
```

---

## 8. DO NOT DO List

### ❌ Architectural Regressions to Avoid

1. **DO NOT create new admin routes under `/app/admin/*`**
   - Reason: This path has no guards and creates confusion
   - Phase 1 placeholder should be MOVED, not replicated

2. **DO NOT add tenant admin pages under `/admin/*` (non-tenant paths)**
   - Reason: These are system-admin-only
   - Example: Don't put tenant achievements at `/admin/gamification/achievements`

3. **DO NOT remove the layout guards in `/admin/tenant/[tenantId]/layout.tsx`**
   - Reason: These are the real access control; proxy is just first-pass

4. **DO NOT allow tenant admins to reach `/admin` root**
   - Reason: This page redirects to `/admin/tenant/{id}` and shows system dashboard
   - The redirect logic in `/admin/page.tsx` handles this correctly

5. **DO NOT skip `assertTenantAdminOrSystem` in server actions**
   - Reason: Client can be bypassed; server must validate

6. **DO NOT rely on client-side role checks for security**
   - Reason: Always validate on server (layout guard + action guard)

7. **DO NOT modify `TenantRouteSync` enabled logic**
   - Reason: It correctly enables for tenant admins, disables for system admins

8. **DO NOT add a new nav tree for `/app/admin`**
   - Reason: The existing `ADMIN_NAV.organisation` is correct

---

## 9. Phase 2 Readiness Checklist

### 9.1 Preconditions (MUST complete before Phase 2 code)

| # | Task | Validation |
|---|------|------------|
| P1 | Proxy exception for `/admin/tenant/*` | Login as tenant owner, navigate to `/admin/tenant/{id}`, expect 200 |
| P2 | Verify layout guard still works | Login as regular user (no tenant role), navigate to `/admin/tenant/{id}`, expect redirect |
| P3 | Verify TenantRouteSync functions | Login as tenant admin, check `useTenant()` returns correct tenant |
| P4 | Move Phase 1 placeholder | Delete `/app/admin/gamification/achievements/page.tsx`, create at `/admin/tenant/[tenantId]/gamification/achievements/page.tsx` |
| P5 | Add nav entry | Add gamification category to `organisationAdminCategories` in `lib/admin/nav.ts` |

### 9.2 Phase 2 Implementation Steps

| # | Step | Files | Validation |
|---|------|-------|------------|
| 1 | Create tenant achievements page shell | `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx` | Page renders with tenantId |
| 2 | Create tenant achievements client | `app/admin/tenant/[tenantId]/gamification/achievements/AchievementsClient.tsx` | Shows "Coming soon" or list |
| 3 | Add tenant-scoped server actions | `app/actions/tenant-achievements.ts` | Actions check `assertTenantAdminOrSystem` |
| 4 | Wire to existing badge_presets table | (existing) | Query with tenant_id filter |
| 5 | Update nav | `lib/admin/nav.ts` | Gamification category visible in tenant mode |

### 9.3 Manual Test Steps (Post-Implementation)

| Test | Actor | Steps | Expected |
|------|-------|-------|----------|
| T1 | System admin | Login → `/admin` → Switch to tenant mode → Gamification → Achievements | See tenant achievements page |
| T2 | Tenant owner | Login → `/admin/tenant/{id}/gamification/achievements` | See own tenant achievements |
| T3 | Tenant admin | Same as T2 | See own tenant achievements |
| T4 | Tenant editor | Same as T2 | See own tenant achievements |
| T5 | Regular user (no role) | Navigate to `/admin/tenant/{id}/gamification/achievements` | Redirect to `/app` |
| T6 | Tenant owner | Try to access other tenant's achievements | Redirect or error |
| T7 | System admin | Award achievement to tenant user | Success |
| T8 | Tenant admin | Award achievement to tenant user | Success |

---

## 10. Open Questions for Product Decision

1. **Should editors have full achievements admin access?**
   - Current layout allows `owner`, `admin`, `editor`
   - Consider: editors may only need view access

2. **Should tenant admins see "global" achievements?**
   - Currently badge_presets has `scope: global | tenant`
   - Should tenant admins be able to award global badges?

3. **Gamification category position in tenant nav?**
   - Propose: After "Innehåll", before "Deltagare"

---

## 11. Document References

| Document | Purpose |
|----------|---------|
| `docs/ARCH_REALITY_CHECK_ADMIN_TENANT.md` | Detailed proxy vs layout analysis |
| `docs/ARCH_VALIDATION_ADMIN_TENANT_PHASE2.md` | Initial validation report |
| `docs/ADMIN_IA_PROPOSAL.md` | Original IA design intent |
| `docs/admin/appshell.md` | AppShell architecture docs |
| `docs/ADMIN_AUTH_AUDIT.md` | API auth patterns |

---

## Appendix: Evidence Index

### Files Read
- `proxy.ts` lines 218-223, 232-272
- `app/admin/layout.tsx` lines 16-23
- `app/admin/tenant/[tenantId]/layout.tsx` lines 27-47
- `app/admin/tenant/[tenantId]/TenantRouteSync.tsx` lines 1-60
- `components/admin/ActingAsTenantBanner.tsx` lines 1-82
- `components/admin/AdminSidebar.tsx` lines 150-170
- `lib/admin/nav.ts` lines 1-264
- `lib/utils/tenantAuth.ts` lines 1-58
- `app/admin/page.tsx` lines 1-21
- `tests/e2e/admin-auth.spec.ts` lines 50-170
- `tests/e2e/auth.setup.tenant-admin.ts` lines 1-42
- `docs/ADMIN_IA_PROPOSAL.md` lines 1-162
- `docs/admin/appshell.md` lines 1-129

### Grep Searches Performed
- `admin/tenant|TenantRouteSync`
- `ActingAs|acting.?as|impersonat|switch.?tenant`
- `router.push.*admin/tenant|href.*admin/tenant|redirect.*admin/tenant`
- `assertTenantAdmin|tenantAuth`
- `tenant.?admin|owner.*admin.*editor`
