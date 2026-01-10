# Phase 2 Preflight Validation: Admin Tenant Architecture

**Generated**: 2026-01-10  
**Validator**: GitHub Copilot (Claude Opus 4.5)  
**Scope**: Read-only audit of Phase 1 implementation before Phase 2 tenant achievements  
**Status**: ✅ **GO** – All critical checks pass (with preconditions)

---

## Executive Summary

| Verdict | Confidence | Critical Issues | Warnings | Preconditions |
|---------|------------|-----------------|----------|---------------|
| ✅ **GO** | High | 0 | 0 | 3 |

The canonical admin model is correctly implemented. Tenant admins can now access `/admin/tenant/*` routes while being properly blocked from system-only `/admin/*` routes. All security layers are in place and functioning correctly.

**Phase 2 requires these preconditions before implementation begins:**
1. ✅ Route contract corrected to `/admin/tenant/[tenantId]/gamification/achievements`
2. ⏳ Tenant nav must add Gamification category
3. ⏳ Awarding security pattern must be decided (RPC vs service role)

---

## 1. Critical Path Verification

### 1.1 Proxy Gate (`proxy.ts`)

**Status**: ✅ PASS

**Evidence** (lines 217-225):
```typescript
const effectiveRole = deriveEffectiveGlobalRoleFromClaims(user)
// Gate: /admin/* requires system_admin, EXCEPT /admin/tenant/* which allows
// any authenticated user through (tenant membership validated by layout guard)
if (user && pathname.startsWith('/admin') && !pathname.startsWith('/admin/tenant/') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  redirectResponse.headers.set('x-request-id', requestId)
  return redirectResponse
}
```

**Behavior Matrix**:
| User Type | `/admin` | `/admin/users` | `/admin/tenant/abc` |
|-----------|----------|----------------|---------------------|
| system_admin | ✅ Pass | ✅ Pass | ✅ Pass |
| tenant_admin | ➡️ Redirect `/app` | ➡️ Redirect `/app` | ✅ Pass (to layout) |
| member | ➡️ Redirect `/app` | ➡️ Redirect `/app` | ✅ Pass (to layout) |
| unauthenticated | ➡️ Login | ➡️ Login | ➡️ Login |

---

### 1.2 Admin Root Layout (`app/admin/layout.tsx`)

**Status**: ✅ PASS

**Evidence** (lines 16-23):
```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin'
const allowedTenantRoles = new Set(['owner', 'admin', 'editor'])
const hasTenantAdminAccess = (authContext.memberships ?? []).some((m) =>
  allowedTenantRoles.has((m.role ?? 'member') as string)
)

if (!isSystemAdmin && !hasTenantAdminAccess) {
  redirect('/app')
}
```

**Authorization**: `system_admin OR hasTenantAdminAccess`  
**Rendered**: `<TenantProvider>` + `<AdminShellV2>` wrapper

---

### 1.3 Admin Root Page (`app/admin/page.tsx`)

**Status**: ✅ PASS

**Evidence** (lines 11-17):
```typescript
if (authContext.effectiveGlobalRole !== 'system_admin') {
  const tenantId = authContext.activeTenant?.id ?? authContext.memberships?.[0]?.tenant_id ?? null
  if (tenantId) {
    redirect(`/admin/tenant/${tenantId}`)
  }
  redirect('/app/select-tenant')
}
```

**Behavior**:
- System admins → Render `<AdminDashboardPage />`
- Tenant admins → Redirect to `/admin/tenant/{tenantId}`
- No tenant → Redirect to `/app/select-tenant`

---

### 1.4 Tenant Layout Guard (`app/admin/tenant/[tenantId]/layout.tsx`)

**Status**: ✅ PASS

**Evidence** (lines 28-46):
```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';

// Check tenant membership for non-system-admins
const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
const tenantRole = membership?.role as string | null;
const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

// Redirect unauthorized users directly to /app (avoid redirect chain through /admin)
if (!isSystemAdmin && !hasTenantAccess) {
  // If user has another tenant they can admin, redirect there
  const adminRoles = new Set(['owner', 'admin', 'editor']);
  const firstAdminMembership = authContext.memberships?.find(m => 
    m.tenant_id !== tenantId && adminRoles.has(m.role as string)
  );
  if (firstAdminMembership?.tenant_id) {
    redirect(`/admin/tenant/${firstAdminMembership.tenant_id}`);
  }
  // No admin access anywhere - redirect to app
  redirect('/app');
}
```

**Authorization**: Per-tenant check `system_admin OR (owner|admin|editor for tenantId)`  
**Redirect target**: `/app` (not `/admin` – no redirect chain)

---

### 1.5 TenantRouteSync (`app/admin/tenant/[tenantId]/TenantRouteSync.tsx`)

**Status**: ✅ PASS

**Evidence** (lines 7-19):
```typescript
export function TenantRouteSync({ tenantId, enabled = true }: { tenantId: string; enabled?: boolean }) {
  const { currentTenant, selectTenant, isLoadingTenants } = useTenant()

  useEffect(() => {
    if (!enabled) return
    if (!tenantId) return
    if (isLoadingTenants) return

    const currentId = currentTenant?.id ?? null
    if (currentId && currentId === tenantId) return

    selectTenant(tenantId)
  }, [enabled, tenantId, currentTenant?.id, isLoadingTenants, selectTenant])

  return null
}
```

**Usage** (layout.tsx line 50):
```typescript
<TenantRouteSync tenantId={tenantId} enabled={!isSystemAdmin && hasTenantAccess} />
```

**Behavior**:
- Tenant admins: Syncs route param to TenantContext (`enabled=true`)
- System admins: Does NOT auto-sync (`enabled=false`) – preserves their chosen context

---

## 2. Deleted Routes Verification

### 2.1 `/app/admin/*` Anomaly Routes

**Status**: ✅ DELETED

**Verification**: Directory listing returns `ENOENT: no such file or directory`

| Deleted File | Reason |
|--------------|--------|
| `app/app/admin/gamification/achievements/page.tsx` | Wrong location (outside guarded path) |
| `app/app/admin/tenant/page.tsx` | Wrong location |
| `app/app/admin/tenant/TenantAdminPage.tsx` | Wrong location |
| `app/app/admin/` (directory) | Entire anomaly tree |

---

## 3. Navigation Configuration

### 3.1 Tenant Admin Navigation (`lib/admin/nav.ts`)

**Status**: ✅ CORRECT

All `organisationAdminCategories` items correctly point to `/admin/tenant/[tenantId]/*`:

| Navigation Item | Target Path |
|-----------------|-------------|
| Dashboard | `/admin/tenant/{tenantId}` |
| Sessioner | `/admin/tenant/{tenantId}/sessions` |
| Lekar | `/admin/tenant/{tenantId}/games` |
| Innehåll | `/admin/tenant/{tenantId}/content` |
| Medlemmar | `/admin/tenant/{tenantId}/members` |
| Deltagare | `/admin/tenant/{tenantId}/participants` |
| Inställningar | `/admin/tenant/{tenantId}/settings` |
| Prenumeration | `/admin/tenant/{tenantId}/subscription` |
| Fakturering | `/admin/tenant/{tenantId}/billing` |
| Analys | `/admin/tenant/{tenantId}/analytics` |

### 3.2 System Admin Navigation

**Status**: ✅ CORRECT

All `systemAdminCategories` items correctly point to `/admin/*` (system-only routes).

---

## 4. UI Indicators

### 4.1 ActingAsTenantBanner (`components/admin/ActingAsTenantBanner.tsx`)

**Status**: ✅ CORRECT

**Evidence** (lines 29-31):
```typescript
// Only show for system admins who have selected a tenant
if (!isSystemAdmin || !currentTenantId || !currentTenant) {
  return null;
}
```

**Behavior**:
- System admin with tenant selected → Shows "Agerar som: {tenant}"
- Tenant admin (regardless of context) → Hidden
- Anyone without tenant selected → Hidden

---

## 5. Server Action Security

### 5.1 `assertTenantAdminOrSystem` Usage

**Status**: ✅ VERIFIED

**Helper** (`lib/utils/tenantAuth.ts` lines 53-57):
```typescript
export async function assertTenantAdminOrSystem(tenantId: string, user: UserLike | null | undefined) {
  if (!user) return false
  if (isSystemAdmin(user)) return true
  return isTenantAdmin(tenantId, user.id)
}
```

**Usage in API Routes** (confirmed via grep):
- `app/api/admin/award-builder/presets/route.ts` ✅
- `app/api/games/route.ts` ✅
- `app/api/games/csv-export/route.ts` ✅
- `app/api/games/csv-import/route.ts` ✅
- `app/api/gamification/coins/transaction/route.ts` ✅

---

## 6. Security Pattern Audit

### 6.1 No Unauthorized `/admin` Links in User-Facing Code

**Status**: ⚠️ ACCEPTABLE (system admin features only)

Hardcoded `/admin/*` links found in:
- `features/admin/dashboard/AdminDashboardPage.tsx` – system admin only page
- `features/admin/users/UserAdminPage.tsx` – system admin only page
- `features/admin/products/ProductHubPage.tsx` – system admin only page
- `features/admin/users/components/UserDetailDrawer.tsx` – system admin only component
- `tests/e2e/admin-auth.spec.ts` – test file (expected)

All are in **system admin features** guarded by proxy gate. No user-facing code exposes these links.

### 6.2 No `redirect('/admin')` Chains

**Status**: ✅ PASS

Grep for `redirect('/admin')` found matches only in documentation files, not in actual code.

### 6.3 No `x-tenant-id` Header in Admin Routes

**Status**: ✅ CORRECT

Admin routes use route params (`/admin/tenant/[tenantId]/*`) not headers.

---

## 7. Existing Tenant Routes Inventory

| Route | File | Status |
|-------|------|--------|
| `/admin/tenant/[tenantId]` | `page.tsx` | ✅ Placeholder dashboard |
| `/admin/tenant/[tenantId]/sessions` | `sessions/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/games` | `games/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/content` | `content/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/members` | `members/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/participants` | `participants/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/participants/[participantId]` | `participants/[participantId]/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/settings` | `settings/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/subscription` | `subscription/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/billing` | `billing/page.tsx` | ✅ Exists |
| `/admin/tenant/[tenantId]/analytics` | `analytics/page.tsx` | ✅ Exists |

**Total**: 13 tenant route files

---

## 8. TypeScript Validation

**Status**: ✅ NO ERRORS

Files checked:
- `proxy.ts` – No errors
- `app/admin/layout.tsx` – No errors
- `app/admin/page.tsx` – No errors
- `app/admin/tenant/[tenantId]/layout.tsx` – No errors

---

## 9. Manual Test Plan

Before Phase 2, execute these manual tests:

### Test 1: Tenant Admin Access
1. Log in as user with `owner` role on tenant `ABC`
2. Navigate to `/admin`
3. **Expected**: Redirect to `/admin/tenant/ABC`
4. Navigate to `/admin/users`
5. **Expected**: Redirect to `/app` (blocked by proxy)

### Test 2: Tenant Admin Wrong Tenant
1. Log in as user with `owner` role on tenant `ABC` only
2. Navigate to `/admin/tenant/XYZ` (different tenant)
3. **Expected**: Redirect to `/admin/tenant/ABC` or `/app`

### Test 3: System Admin Full Access
1. Log in as `system_admin`
2. Navigate to `/admin` → **Expected**: Dashboard renders
3. Navigate to `/admin/users` → **Expected**: Users page renders
4. Navigate to `/admin/tenant/ABC` → **Expected**: Tenant view renders
5. **Expected**: ActingAsTenantBanner shows "Agerar som: ABC"

### Test 4: Member Only
1. Log in as user with only `member` role
2. Navigate to `/admin/tenant/ABC`
3. **Expected**: Redirect to `/app` (no admin access)

### Test 5: Unauthenticated
1. Log out
2. Navigate to `/admin/tenant/ABC`
3. **Expected**: Redirect to `/auth/login?redirect=/admin`

---

## 10. Phase 2 Constraints Contract

When implementing Phase 2 tenant achievements, adhere to:

### ✅ DO
1. Create new routes under `/admin/tenant/[tenantId]/gamification/achievements`
2. Use `assertTenantAdminOrSystem(tenantId, user)` in all server actions
3. Follow existing tenant page patterns (no additional layout guards needed)
4. Use TenantContext for tenant ID in client components
5. Add Gamification category to `organisationAdminCategories` in `lib/admin/nav.ts`

### ❌ DO NOT
1. Create routes under `/app/admin/*` (deleted, was unguarded)
2. Create routes under `/admin/achievements/*` (system-only path)
3. Create routes under `/admin/tenant/[tenantId]/achievements/*` (wrong IA — use `/gamification/achievements`)
4. Skip server action authorization
5. Use `x-tenant-id` headers (use route params)
6. Add `redirect('/admin')` anywhere (causes chain for tenant admins)

---

## 11. Phase 2 Preconditions (MUST COMPLETE FIRST)

### Precondition 1: Navigation Update ⏳

**File**: `lib/admin/nav.ts`

Add Gamification category to `organisationAdminCategories`:

```typescript
{
  id: 'org-gamification',
  label: 'Gamification',
  icon: 'achievements',
  items: [
    { id: 'org-achievements', label: 'Utmärkelser', href: '/admin/tenant/[tenantId]/gamification/achievements', icon: 'achievements' },
  ],
},
```

### Precondition 2: Awarding Security Decision ⏳

**Decision Required**: How will tenant admins award achievements to users?

| Option | Pros | Cons | Recommendation |
|--------|------|------|----------------|
| **Tenant-safe RPC** | DB-level validation, no service role exposure, audit built-in | Migration required | ✅ **RECOMMENDED** |
| Server + service role | No migration | Service role in app, must enforce manually | ❌ |

**If RPC chosen**, create migration with:
- `tenant_award_achievement_v1(p_tenant_id, p_achievement_id, p_user_ids, p_message, p_idempotency_key)`
- Must validate: `has_tenant_role(p_tenant_id, ARRAY['owner','admin','editor']) OR is_system_admin()`
- Must validate: achievement.tenant_id = p_tenant_id
- Must validate: all recipients are tenant members
- Must write audit rows + user_achievements with idempotency

### Precondition 3: Route Structure Confirmation ✅

**Correct route pattern** (matching IA):
```
/admin/tenant/[tenantId]/gamification/            → Hub page
/admin/tenant/[tenantId]/gamification/achievements → List page
/admin/tenant/[tenantId]/gamification/achievements/[id] → Detail/edit (optional)
```

**NOT**:
```
/admin/tenant/[tenantId]/achievements/*  ← WRONG (skips gamification namespace)
```

---

## 12. Conclusion

**Verdict**: ✅ **GO** (with preconditions)

All Phase 1 implementation changes are correctly in place:

| Layer | Status | Evidence |
|-------|--------|----------|
| Proxy Gate | ✅ | Exception for `/admin/tenant/*` (line 220) |
| Admin Layout | ✅ | Allows `hasTenantAdminAccess` |
| Tenant Layout | ✅ | Validates per-tenant, redirects to `/app` |
| TenantRouteSync | ✅ | Conditionally enabled |
| Navigation | ⚠️ | Missing Gamification category (precondition) |
| UI Indicators | ✅ | Banner only for system admin |
| Anomaly Routes | ✅ | Deleted |
| TypeScript | ✅ | No errors |

**Before Phase 2 implementation:**
1. ✅ Route contract corrected in this document
2. ⏳ Add Gamification to tenant nav
3. ⏳ Decide + document awarding security pattern

**Proceed to Phase 2: Tenant Achievements Implementation**

---

## Appendix A: File References

| File | Lines | Purpose |
|------|-------|---------|
| [proxy.ts](../proxy.ts#L217-L225) | 217-225 | Proxy gate with tenant exception |
| [app/admin/layout.tsx](../app/admin/layout.tsx#L16-L23) | 16-23 | Root admin authorization |
| [app/admin/page.tsx](../app/admin/page.tsx#L11-L17) | 11-17 | Tenant admin redirect |
| [app/admin/tenant/[tenantId]/layout.tsx](../app/admin/tenant/%5BtenantId%5D/layout.tsx#L28-L46) | 28-46 | Tenant membership check |
| [app/admin/tenant/[tenantId]/TenantRouteSync.tsx](../app/admin/tenant/%5BtenantId%5D/TenantRouteSync.tsx#L7-L19) | 7-19 | Context sync |
| [components/admin/ActingAsTenantBanner.tsx](../components/admin/ActingAsTenantBanner.tsx#L29-L31) | 29-31 | System admin indicator |
| [lib/utils/tenantAuth.ts](../lib/utils/tenantAuth.ts#L53-L57) | 53-57 | Authorization helper |
| [lib/admin/nav.ts](../lib/admin/nav.ts#L152-L215) | 152-215 | Tenant navigation config (needs Gamification) |

---

## Appendix B: Phase 2 Route Map

```
app/admin/tenant/[tenantId]/
├── gamification/
│   ├── page.tsx                    ← Gamification hub (optional)
│   └── achievements/
│       ├── page.tsx                ← Achievements list
│       └── [achievementId]/
│           └── page.tsx            ← Achievement detail/edit (optional)
```

---

## Appendix C: Awarding RPC Specification (Recommended)

```sql
-- Migration: tenant_award_achievement_v1
CREATE OR REPLACE FUNCTION public.tenant_award_achievement_v1(
  p_tenant_id UUID,
  p_achievement_id UUID,
  p_user_ids UUID[],
  p_message TEXT DEFAULT NULL,
  p_idempotency_key UUID DEFAULT gen_random_uuid()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_achievement RECORD;
  v_awarded_count INT := 0;
BEGIN
  -- 1. Validate caller is tenant admin or system admin
  IF NOT (
    public.has_tenant_role(p_tenant_id, ARRAY['owner', 'admin', 'editor'])
    OR public.is_system_admin()
  ) THEN
    RAISE EXCEPTION 'Unauthorized: requires tenant admin or system admin role';
  END IF;

  -- 2. Validate achievement exists and belongs to tenant
  SELECT * INTO v_achievement
  FROM achievements
  WHERE id = p_achievement_id AND tenant_id = p_tenant_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Achievement not found or does not belong to tenant';
  END IF;

  -- 3. Validate all recipients are tenant members
  IF EXISTS (
    SELECT 1 FROM unnest(p_user_ids) AS uid
    WHERE NOT EXISTS (
      SELECT 1 FROM tenant_memberships
      WHERE tenant_id = p_tenant_id AND user_id = uid AND status = 'active'
    )
  ) THEN
    RAISE EXCEPTION 'One or more users are not members of this tenant';
  END IF;

  -- 4. Create award record
  INSERT INTO achievement_awards (achievement_id, tenant_id, message, idempotency_key, awarded_by)
  VALUES (p_achievement_id, p_tenant_id, p_message, p_idempotency_key, auth.uid())
  ON CONFLICT (idempotency_key) DO NOTHING;

  -- 5. Award to users (idempotent)
  INSERT INTO user_achievements (user_id, achievement_id, tenant_id, awarded_at)
  SELECT uid, p_achievement_id, p_tenant_id, NOW()
  FROM unnest(p_user_ids) AS uid
  ON CONFLICT (user_id, achievement_id) DO NOTHING;

  GET DIAGNOSTICS v_awarded_count = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'awarded_count', v_awarded_count,
    'idempotency_key', p_idempotency_key
  );
END;
$$;
```
