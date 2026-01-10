# Architecture Reality Check: Admin vs Tenant Access Control

**Date**: 2025-01-XX  
**Scope**: Verification of ACTUAL access patterns vs INTENDED design  
**Method**: Code archaeology with direct evidence  

---

## Executive Summary

This report presents a **ground truth analysis** of how admin access control actually works in the codebase, with direct code citations. The key finding is a **FUNDAMENTAL CONFLICT** between the proxy gate and the layout guards, resulting in dead code and unreachable routes.

### Critical Finding

| Component | Intent | Reality |
|-----------|--------|---------|
| `/admin/tenant/*` layouts | Allow tenant admins | **UNREACHABLE** - proxy blocks first |
| Proxy at line 219 | Gate system admin | Gates **ALL** `/admin/*` paths |
| Layout guards in admin | Secondary auth check | **DEAD CODE** for tenant admins |

---

## 1. Route Access Truth Table

Based on actual proxy logic in `proxy.ts` lines 218-223:

```typescript
const effectiveRole = deriveEffectiveGlobalRoleFromClaims(user)
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  return redirectResponse
}
```

### Access Matrix

| Path Pattern | system_admin | tenant owner/admin | regular user |
|--------------|--------------|-------------------|--------------|
| `/admin` | ✅ ALLOWED | ❌ BLOCKED at proxy | ❌ BLOCKED |
| `/admin/gamification/*` | ✅ ALLOWED | ❌ BLOCKED at proxy | ❌ BLOCKED |
| `/admin/tenant/[tenantId]/*` | ✅ ALLOWED | ❌ BLOCKED at proxy | ❌ BLOCKED |
| `/app` | ✅ ALLOWED | ✅ ALLOWED | ❌ (must select tenant) |
| `/app/[tenantId]/*` | ✅ ALLOWED | ✅ ALLOWED (with membership) | ❌ BLOCKED |
| `/app/admin/*` | ✅ ALLOWED | ✅ ALLOWED | ✅ ALLOWED |

### Key Observations

1. **No path exceptions in proxy**: The check is `pathname.startsWith('/admin')` with **NO exceptions** for `/admin/tenant/*`
2. **Dead layouts**: The layout guards in `/admin/tenant/*` are designed for tenant admins but those users can never reach them
3. **Unprotected `/app/admin/*`**: The Phase 1 placement has NO proxy-level protection and NO layout-level guards

---

## 2. Code Evidence: The Proxy Gate

### Source: `proxy.ts` lines 218-223

```typescript
// ==========================================
// 4) GATE: /admin requires system_admin
// ==========================================

const effectiveRole = deriveEffectiveGlobalRoleFromClaims(user)
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  redirectResponse.headers.set('x-request-id', requestId)
  return redirectResponse
}
```

**Analysis**: This is a hard gate. ANY path starting with `/admin` requires `system_admin` role. There are NO exceptions carved out.

---

## 3. Code Evidence: Layout Guards (Dead Code)

### Source: `app/admin/layout.tsx` lines 16-23

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

**Analysis**: This check INTENDS to allow both system admins AND tenant admins. However, since the proxy already blocked all non-system-admins, this check:
- ✅ Runs for system admins (always passes)
- ❌ Never runs for tenant admins (proxy blocked them first)

**Verdict**: Dead code for the tenant admin case.

### Source: `app/admin/tenant/[tenantId]/layout.tsx` lines 27-35

```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
const tenantRole = membership?.role ?? null;
const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

if (!isSystemAdmin && !hasTenantAccess) {
  redirect('/admin');
}
```

**Analysis**: This layout has proper tenant membership validation AND uses `TenantRouteSync` (line 43-47):

```typescript
<TenantRouteSync 
  tenantId={tenantId} 
  enabled={!isSystemAdmin && hasTenantAccess}
/>
```

The `enabled` condition reveals clear INTENT: this was designed for tenant admins (`!isSystemAdmin && hasTenantAccess`).

**Verdict**: Well-designed layout that is **UNREACHABLE** by its intended audience.

---

## 4. Navigation Evidence

### Source: `lib/admin/nav.ts` lines 153-214

The navigation config defines two separate nav trees:

```typescript
// System admin navigation - all paths start with /admin
const systemAdminCategories: AdminNavCategory[] = [
  {
    id: 'overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: 'dashboard' },
      // ... more /admin/* paths
    ],
  },
  // ...
]

// Tenant admin navigation - all paths start with /admin/tenant/[tenantId]
const organisationAdminCategories: AdminNavCategory[] = [
  {
    id: 'org-overview',
    items: [
      { id: 'org-dashboard', label: 'Dashboard', href: '/admin/tenant/[tenantId]', icon: 'dashboard' },
      { id: 'org-analytics', label: 'Statistik', href: '/admin/tenant/[tenantId]/analytics', icon: 'analytics' },
    ],
  },
  {
    id: 'org-members',
    items: [
      { id: 'members-list', label: 'Alla medlemmar', href: '/admin/tenant/[tenantId]/members', icon: 'users' },
      { id: 'roles', label: 'Roller & Behörigheter', href: '/admin/tenant/[tenantId]/roles', icon: 'moderation' },
      // ... more tenant paths
    ],
  },
]
```

**Key Insight**: ALL tenant navigation points to `/admin/tenant/[tenantId]/*` which is **BLOCKED** for actual tenant admins.

### Navigation Toggle: `AdminSidebar.tsx` line 157

```typescript
const showActingAsBanner = isSystemAdmin && currentTenantId;
```

This confirms `/admin/tenant/*` is for "system admin viewing as tenant", not actual tenant admins.

---

## 5. Tenant Context Sources Per Area

### Where does tenant context come from?

| Route Area | Tenant Context Source | Proxy sets `x-tenant-id`? |
|------------|----------------------|--------------------------|
| `/app` | Cookie → `lb_tenant` + membership check | ✅ Yes (line 271) |
| `/app/[tenantId]/*` | Path param + cookie fallback | ✅ Yes (line 271) |
| `/admin` | None (system-wide) | ❌ No |
| `/admin/tenant/[tenantId]/*` | Route param via `TenantRouteSync` | ❌ No |
| `/app/admin/*` | Inherited from `/app` | ✅ Yes (inherits from /app) |

### Evidence: Proxy only sets header for `/app` paths

From `proxy.ts` lines 232-272:

```typescript
if (pathname.startsWith('/app') && user) {
  // ... tenant resolution logic ...
  if (finalTenantId) {
    response.headers.set('x-tenant-id', finalTenantId)  // LINE 271
    await setTenantCookie(response.cookies, finalTenantId, { hostname })
  }
}
```

**Conclusion**: The proxy ONLY sets `x-tenant-id` for `/app` paths, never for `/admin` paths.

---

## 6. The `/app/admin/*` Anomaly

### Phase 1 placed tenant admin here: `app/app/admin/gamification/achievements/page.tsx`

This generates the URL path: `/app/admin/gamification/achievements`

**Access Control Analysis**:

1. ✅ Proxy allows (starts with `/app`, not `/admin`)
2. ✅ Tenant context available (inherits from `/app` which sets `x-tenant-id`)
3. ❌ **NO LAYOUT GUARD** - any authenticated user can access
4. ❌ **NO PERMISSION CHECK** - no RBAC validation

### Current file content (Phase 1 placeholder):

```typescript
// From app/app/admin/gamification/achievements/page.tsx
export default function TenantAchievementsPage() {
  // ... renders "Coming Soon" UI
  // NO auth check
  // NO role validation
}
```

**Risk Assessment**: When Phase 2 adds real functionality here, it will be accessible to ALL authenticated users unless guards are added.

---

## 7. Architectural Conflict Summary

### Design Intent vs Reality

```
INTENDED DESIGN (from layout code):
┌─────────────────────────────────────────────────────┐
│  /admin/*           → system_admin only             │
│  /admin/tenant/*    → system_admin OR tenant_admin  │
│  /app/*             → authenticated users           │
└─────────────────────────────────────────────────────┘

ACTUAL BEHAVIOR (from proxy code):
┌─────────────────────────────────────────────────────┐
│  /admin/*           → system_admin only (ALL paths) │
│  /admin/tenant/*    → system_admin only (BLOCKED!)  │
│  /app/*             → authenticated users           │
│  /app/admin/*       → authenticated users (NO GUARD)│
└─────────────────────────────────────────────────────┘
```

### Evidence Summary

| Evidence Point | Source | Line | Finding |
|----------------|--------|------|---------|
| Proxy gate blocks all `/admin` | `proxy.ts` | 219 | No path exceptions |
| Admin layout intends dual access | `app/admin/layout.tsx` | 19-22 | Dead code for tenant admins |
| Tenant layout has proper guards | `app/admin/tenant/[tenantId]/layout.tsx` | 27-35 | Unreachable by tenant admins |
| TenantRouteSync designed for tenants | `TenantRouteSync.tsx` | 43-47 | `enabled={!isSystemAdmin && hasTenantAccess}` |
| Acting-as badge for system admins | `AdminSidebar.tsx` | 157 | `isSystemAdmin && currentTenantId` |
| Tenant nav points to blocked paths | `lib/admin/nav.ts` | 160-210 | All hrefs are `/admin/tenant/*` |
| Proxy sets tenant header for /app only | `proxy.ts` | 271 | No header for `/admin` paths |

---

## 8. Phase 1 Placement Assessment

### Assessment: (C) AMBIGUOUS - Conflicting Patterns Exist

**Evidence supports BOTH interpretations**:

| Interpretation | Supporting Evidence | Contradicting Evidence |
|----------------|---------------------|------------------------|
| `/admin/tenant/*` is for tenant admins | Layout guards, TenantRouteSync design, navigation structure | Proxy blocks all `/admin/*` for non-system-admins |
| `/admin/tenant/*` is for system admin acting as tenant | Proxy gate, ActingAsTenantBanner | Layout allows `hasTenantAdminAccess`, TenantRouteSync enabled flag |

**Root Cause**: The proxy was implemented with a broad gate that didn't carve out exceptions, making the layout-level permissions effectively dead code.

### Phase 1 Placement Consequences

If tenant admin belongs at `/admin/tenant/[tenantId]/*`:
- ❌ **Phase 1 placement is WRONG** at `/app/admin/*`
- ❌ Proxy must be modified to allow tenant admins to `/admin/tenant/*`

If tenant admin belongs at `/app/[tenantId]/admin/*` or similar:
- ❌ **Phase 1 placement is WRONG** (should include tenantId in path)
- ⚠️ The existing `/admin/tenant/*` structure is orphaned/unused for tenants

---

## 9. Recommendations

### Option A: Fix the Proxy (Align with Layout Intent)

Modify `proxy.ts` to allow tenant admins to `/admin/tenant/*`:

```typescript
// Proposed change to proxy.ts line 219
if (user && pathname.startsWith('/admin')) {
  // Allow tenant admins to their tenant-scoped routes
  if (pathname.startsWith('/admin/tenant/') && hasTenantAdminMembership(user)) {
    // Allow through - layout will validate specific tenant access
  } else if (effectiveRole !== 'system_admin') {
    return NextResponse.redirect(new URL('/app', request.url))
  }
}
```

**Pros**: Activates existing layout guards, uses existing nav structure  
**Cons**: Requires proxy changes, security-sensitive area  

### Option B: Accept Current Behavior (System Admin Only for /admin/*)

Keep `/admin/*` as system-admin-only and move tenant admin to `/app`:

```
/app/[tenantId]/manage/*  → Tenant admin routes (new location)
/admin/tenant/*           → System admin "acting as tenant" only
```

**Pros**: No proxy changes, cleaner separation  
**Cons**: Requires moving existing tenant routes, nav restructuring  

### Option C: Hybrid (Phase 1 stays, add guards)

Keep Phase 1 at `/app/admin/*` but add proper guards:

```typescript
// Add to app/app/admin/layout.tsx
const allowedRoles = ['owner', 'admin', 'editor']
const hasTenantAdminAccess = memberships.some(m => 
  m.tenant_id === currentTenantId && allowedRoles.includes(m.role)
)
if (!hasTenantAdminAccess) {
  redirect('/app')
}
```

**Pros**: Minimal changes, works now  
**Cons**: Creates third admin location, increases confusion  

---

## 10. Verification Commands

To verify these findings, run these checks:

```bash
# Verify proxy gate - search for admin path check
grep -n "startsWith('/admin')" proxy.ts

# Verify no exceptions exist
grep -n "admin/tenant" proxy.ts  # Should find nothing relevant

# Verify layout intent
grep -n "hasTenantAdminAccess" app/admin/layout.tsx

# Verify TenantRouteSync enabled condition
grep -n "enabled=" app/admin/tenant/*/layout.tsx

# Verify x-tenant-id only set for /app
grep -n "x-tenant-id" proxy.ts  # Line 271, inside /app block
```

---

## Document Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-01-XX | AI Assistant | Initial reality check analysis |
