# Implementation Log: Admin Tenant Proxy Fix

**Date**: 2026-01-10  
**Status**: COMPLETE  
**Scope**: Enable tenant admins to access `/admin/tenant/*` routes  

---

## Summary

Fixed the proxy gate to allow tenant admins (owner/admin/editor) to reach `/admin/tenant/[tenantId]/*` routes. Previously, the proxy blocked ALL non-system-admins from any `/admin/*` path, making the existing tenant admin layouts/navigation unreachable.

---

## Before State

### Proxy Gate (proxy.ts line 218-222)

```typescript
// BEFORE: Blocked ALL /admin/* for non-system-admins
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  redirectResponse.headers.set('x-request-id', requestId)
  return redirectResponse
}
```

**Problem**: This blocked tenant admins from reaching `/admin/tenant/*` even though:
- Layouts existed with proper tenant membership guards
- Navigation config pointed to these routes
- E2E tests expected tenant admins to access them

### Tenant Layout Redirect (app/admin/tenant/[tenantId]/layout.tsx lines 35-41)

```typescript
// BEFORE: Redirect to /admin caused chain → then proxy redirected to /app
if (!isSystemAdmin && !hasTenantAccess) {
  const firstTenantId = authContext.memberships?.[0]?.tenant_id;
  if (firstTenantId && firstTenantId !== tenantId) {
    redirect(`/admin/tenant/${firstTenantId}`);
  }
  redirect('/admin');  // ← Would be blocked by proxy anyway
}
```

**Problem**: Redirecting to `/admin` for unauthorized users created a redirect chain since proxy would then redirect to `/app`.

### /app/admin/* Anomaly

Incorrect tenant admin routes existed under `/app/admin/*` with NO guards:
- `app/app/admin/gamification/achievements/page.tsx` - Phase 1 placeholder
- `app/app/admin/tenant/page.tsx` - Debug page

---

## After State

### Proxy Gate (proxy.ts lines 217-224)

```typescript
// AFTER: Exception for /admin/tenant/* - layout enforces access
const effectiveRole = deriveEffectiveGlobalRoleFromClaims(user)
// Gate: /admin/* requires system_admin, EXCEPT /admin/tenant/* which allows
// any authenticated user through (tenant membership validated by layout guard)
if (user && pathname.startsWith('/admin') && !pathname.startsWith('/admin/tenant/') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  redirectResponse.headers.set('x-request-id', requestId)
  return redirectResponse
}
```

**Change**: Added `!pathname.startsWith('/admin/tenant/')` exception. Any authenticated user can now reach `/admin/tenant/*` routes - the layout guard handles authorization.

### Tenant Layout Redirect (app/admin/tenant/[tenantId]/layout.tsx lines 36-48)

```typescript
// AFTER: Redirect directly to /app to avoid chain
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

**Changes**:
1. Redirect unauthorized users directly to `/app` (no chain through `/admin`)
2. Only redirect to another tenant if user has admin role there (not just any membership)

### /app/admin/* Anomaly - REMOVED

Deleted:
- `app/app/admin/gamification/achievements/page.tsx`
- `app/app/admin/tenant/page.tsx`
- `app/app/admin/tenant/TenantAdminPage.tsx`
- `app/app/admin/` directory

**Reason**: These routes had no guards and contradicted the canonical `/admin/tenant/*` pattern.

---

## Files Changed

| File | Change |
|------|--------|
| `proxy.ts` | Added exception for `/admin/tenant/*` in system_admin gate |
| `app/admin/tenant/[tenantId]/layout.tsx` | Changed unauthorized redirect from `/admin` to `/app` |
| `app/app/admin/gamification/achievements/page.tsx` | **DELETED** |
| `app/app/admin/tenant/page.tsx` | **DELETED** |
| `app/app/admin/tenant/TenantAdminPage.tsx` | **DELETED** |
| `app/app/admin/` | **DELETED** (empty directory) |

---

## Access Matrix (After)

| Path | system_admin | tenant owner/admin/editor | regular user | unauthenticated |
|------|--------------|---------------------------|--------------|-----------------|
| `/admin` | ✅ Allowed | ❌ → `/app` (proxy) | ❌ → `/app` (proxy) | ❌ → `/auth/login` |
| `/admin/users` | ✅ Allowed | ❌ → `/app` (proxy) | ❌ → `/app` (proxy) | ❌ → `/auth/login` |
| `/admin/tenant/[id]` | ✅ Allowed | ✅ Allowed (with membership) | ❌ → `/app` (layout) | ❌ → `/auth/login` |
| `/admin/tenant/[other]` | ✅ Allowed | ❌ → `/app` (layout) | ❌ → `/app` (layout) | ❌ → `/auth/login` |
| `/app/*` | ✅ Allowed | ✅ Allowed | ✅ Allowed | ❌ → `/auth/login` |

---

## Verification Results

### TypeScript Compilation

```bash
npx tsc --project tsconfig.json --noEmit 2>&1 | Select-String -Pattern "proxy\.ts|layout\.tsx"
# Result: No errors in changed files
```

### Manual Test Checklist

| # | Actor | Action | Expected | Status |
|---|-------|--------|----------|--------|
| 1 | Tenant owner | Visit `/admin/tenant/{ownTenantId}` | Page loads | ⬜ To verify |
| 2 | Tenant owner | Visit `/admin/tenant/{otherTenantId}` | Redirect to `/app` | ⬜ To verify |
| 3 | Tenant owner | Visit `/admin` | Redirect to `/app` (proxy) | ⬜ To verify |
| 4 | System admin | Visit `/admin` | Page loads | ⬜ To verify |
| 5 | System admin | Visit `/admin/tenant/{anyId}` | Page loads | ⬜ To verify |
| 6 | Regular user | Visit `/admin/tenant/{anyId}` | Redirect to `/app` (layout) | ⬜ To verify |
| 7 | Unauthenticated | Visit `/admin/*` | Redirect to `/auth/login` | ⬜ To verify |

---

## Security Layers

The fix maintains defense-in-depth:

| Layer | Responsibility | Location |
|-------|---------------|----------|
| **Proxy** | Coarse gating: block non-system-admins from `/admin/*` except `/admin/tenant/*` | `proxy.ts` |
| **Layout** | Fine-grained: verify tenant membership for `/admin/tenant/[id]/*` | `app/admin/tenant/[tenantId]/layout.tsx` |
| **Server Actions** | Per-action: `assertTenantAdminOrSystem(tenantId, user)` | Individual action files |
| **RLS Policies** | Database: tenant_id scoping + role checks | Supabase migrations |

---

## Rollback Plan

To revert this change:

### 1. Revert proxy.ts

```typescript
// Change line 220 FROM:
if (user && pathname.startsWith('/admin') && !pathname.startsWith('/admin/tenant/') && effectiveRole !== 'system_admin') {

// TO (original):
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
```

### 2. Revert tenant layout redirect

```typescript
// In app/admin/tenant/[tenantId]/layout.tsx, change redirect target FROM:
redirect('/app');

// TO (original):
redirect('/admin');
```

### 3. Restore /app/admin/* routes (optional)

Only needed if Phase 2 work depended on these - but they should not have been used as they had no guards.

---

## Related Documents

- [ADMIN_MODEL_DECISION.md](ADMIN_MODEL_DECISION.md) - Canonical admin access model
- [ARCH_REALITY_CHECK_ADMIN_TENANT.md](ARCH_REALITY_CHECK_ADMIN_TENANT.md) - Detailed proxy analysis
- [ADMIN_IA_PROPOSAL.md](ADMIN_IA_PROPOSAL.md) - Original IA design intent

---

## Next Steps (Phase 2)

With proxy fixed, Phase 2 tenant achievements can be implemented at the correct location:

1. Create `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx`
2. Add nav entry to `organisationAdminCategories` in `lib/admin/nav.ts`
3. Create tenant-scoped server actions with `assertTenantAdminOrSystem` checks
