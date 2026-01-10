# Architecture Validation Report: Admin Separation & Tenant Access

**Date**: 2026-01-10  
**Scope**: System Admin vs Tenant Admin separation, routing structure, access control, Phase 1 correctness  
**Status**: Read-only analysis for Phase 2 readiness

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Section A: Inventory - Routes, Layouts, Nav, Guards](#section-a-inventory)
3. [Section B: Phase 1 Review - Architectural Correctness](#section-b-phase-1-review)
4. [Section C: Recommendations - Options & Tradeoffs](#section-c-recommendations)
5. [Section D: Phase 2 Constraints Contract](#section-d-phase-2-constraints-contract)

---

## Executive Summary

### Key Findings

| Category | Status | Summary |
|----------|--------|---------|
| **Route Structure** | ⚠️ Inconsistent | Two parallel tenant admin patterns exist: `/admin/tenant/[tenantId]/*` and `/app/admin/*` |
| **Access Control** | ✅ Layered | Proxy → Layout → Server Action → RLS. Properly blocks non-system-admin from `/admin` |
| **Phase 1 Placement** | ⚠️ Wrong Location | `/app/admin/*` creates `/app/admin/*` route, which differs from established `/admin/tenant/[tenantId]/*` pattern |
| **Tenant Context** | ⚠️ Unreliable at `/app/admin` | No guaranteed tenant context in `/app/admin/*` routes |
| **Types/Build** | ❌ Corrupted | `types/supabase.ts` contains npm prompt text instead of TypeScript types |

### Critical Decision Required

Phase 1 placed the tenant admin placeholder at `app/app/admin/gamification/achievements/page.tsx`, which generates route `/app/admin/gamification/achievements`.

**Problem**: The repo already has an established tenant admin pattern at `/admin/tenant/[tenantId]/*` with proper layout guards, tenant context sync, and RBAC. The `/app/admin/*` path is a separate, incomplete pattern.

**Recommendation**: Move Phase 2 tenant admin to `/admin/tenant/[tenantId]/gamification/achievements` to align with established patterns.

---

## Section A: Inventory

### A.1 Route Map

#### System Admin Routes (`/admin/*`)

All routes under `/admin/*` are protected by:
1. `proxy.ts` line 219: Redirects non-`system_admin` to `/app`
2. `app/admin/layout.tsx`: Secondary check with tenant admin fallback (but blocked by proxy first)

| File Path | Generated Route | Intended Audience | Guard |
|-----------|-----------------|-------------------|-------|
| `app/admin/page.tsx` | `/admin` | System Admin | proxy + layout |
| `app/admin/gamification/achievements/page.tsx` | `/admin/gamification/achievements` | System Admin | proxy + layout + server action |
| `app/admin/organisations/page.tsx` | `/admin/organisations` | System Admin | proxy + layout |
| `app/admin/users/page.tsx` | `/admin/users` | System Admin | proxy + layout |
| ... (100+ routes) | `/admin/*` | System Admin | proxy + layout |

#### Tenant Admin Routes - Pattern A (`/admin/tenant/[tenantId]/*`)

These routes have a dedicated layout with tenant-scoped access control:

| File Path | Generated Route | Intended Audience | Guard |
|-----------|-----------------|-------------------|-------|
| `app/admin/tenant/[tenantId]/page.tsx` | `/admin/tenant/:tenantId` | Tenant Admin | layout (tenant membership) |
| `app/admin/tenant/[tenantId]/members/page.tsx` | `/admin/tenant/:tenantId/members` | Tenant Admin | layout (tenant membership) |
| `app/admin/tenant/[tenantId]/analytics/page.tsx` | `/admin/tenant/:tenantId/analytics` | Tenant Admin | layout (tenant membership) |
| `app/admin/tenant/[tenantId]/games/page.tsx` | `/admin/tenant/:tenantId/games` | Tenant Admin | layout (tenant membership) |
| `app/admin/tenant/[tenantId]/settings/page.tsx` | `/admin/tenant/:tenantId/settings` | Tenant Admin | layout (tenant membership) |
| ... (12+ routes) | `/admin/tenant/:tenantId/*` | Tenant Admin | layout (tenant membership) |

**Guard Implementation** (`app/admin/tenant/[tenantId]/layout.tsx`):
```typescript
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
const tenantRole = membership?.role as string | null;
const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

if (!isSystemAdmin && !hasTenantAccess) {
  redirect('/admin');
}
```

#### Tenant Admin Routes - Pattern B (`/app/admin/*`)

A secondary pattern exists with minimal structure:

| File Path | Generated Route | Intended Audience | Guard |
|-----------|-----------------|-------------------|-------|
| `app/app/admin/tenant/page.tsx` | `/app/admin/tenant` | Tenant Admin? | **None** (uses `/app` layout only) |
| `app/app/admin/gamification/achievements/page.tsx` | `/app/admin/gamification/achievements` | Tenant Admin? | **None** (Phase 1 placeholder) |

**Problem**: These routes inherit `/app/layout.tsx` which has no tenant admin validation, only general authentication.

#### Route Collision Analysis

| Pattern | URL | Source | Has Tenant Context? | Has Access Control? |
|---------|-----|--------|---------------------|---------------------|
| Pattern A | `/admin/tenant/:tenantId/...` | `app/admin/tenant/[tenantId]/...` | ✅ Yes (from route param) | ✅ Yes (layout guard) |
| Pattern B | `/app/admin/...` | `app/app/admin/...` | ❌ No (relies on cookie/context) | ❌ No (only auth check) |

### A.2 Navigation Structure

#### System Admin Navigation

**Source**: `lib/admin/nav.ts`

```typescript
const systemAdminCategories: AdminNavCategory[] = [
  { id: 'overview', label: 'Översikt', items: [...] },
  { id: 'organisations', label: 'Organisationer', items: [...] },
  { id: 'users', label: 'Användare', items: [...] },
  { id: 'products', label: 'Produkter', items: [...] },
  { id: 'library', label: 'Bibliotek', items: [...] },
  { id: 'gamification', label: 'Gamification', items: [
    { id: 'achievements', label: 'Achievements', href: '/admin/gamification/achievements' },
    ...
  ]},
  { id: 'learning', label: 'Utbildning', items: [...] },
  { id: 'operations', label: 'Drift', items: [...] },
  { id: 'system', label: 'System', items: [...] },
];
```

#### Organisation/Tenant Admin Navigation

**Source**: `lib/admin/nav.ts`

```typescript
const organisationAdminCategories: AdminNavCategory[] = [
  { id: 'org-overview', label: 'Översikt', items: [
    { href: '/admin/tenant/[tenantId]' },  // Uses Pattern A
    { href: '/admin/tenant/[tenantId]/analytics' },
  ]},
  { id: 'org-members', label: 'Medlemmar', items: [
    { href: '/admin/tenant/[tenantId]/members' },
    ...
  ]},
  { id: 'org-content', label: 'Innehåll', items: [
    { href: '/admin/tenant/[tenantId]/games' },
    ...
  ]},
  ...
];
```

**Key Observation**: Tenant admin nav uses Pattern A (`/admin/tenant/[tenantId]/...`), not Pattern B (`/app/admin/...`).

#### Menu Rendering Decision Logic

**Source**: `components/admin/AdminShellV2.tsx` + `components/admin/AdminSidebarV2.tsx`

```typescript
// AdminShellV2.tsx
const { user, effectiveGlobalRole } = useAuth();
const { hasTenants } = useTenant();
const isGlobalAdmin = effectiveGlobalRole === 'system_admin';

// AdminSidebarV2.tsx (inferred from AdminSidebar.tsx pattern)
// Filters nav items based on:
// - item.systemAdminOnly → only shown if isSystemAdmin
// - item.tenantAdminOnly → only shown if currentTenantId exists
```

#### "Acting As Tenant" Banner

The admin shell can show tenant context when a system admin is viewing tenant-scoped pages. This is handled by `TenantProvider` which receives `activeTenant` from `getServerAuthContext()`.

### A.3 Guards and Enforcement Layers

```
┌─────────────────────────────────────────────────────────────────────────┐
│ Request enters                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 1: proxy.ts (middleware)                                         │
│                                                                         │
│ • Line 21: isProtectedPath() checks /app and /admin                    │
│ • Line 219: if (pathname.startsWith('/admin') &&                       │
│             effectiveRole !== 'system_admin')                          │
│             → redirect to /app                                          │
│ • Line 232-271: Tenant resolution for /app paths:                      │
│   - Path override: /app/t/[tenantId]                                   │
│   - Hostname resolution                                                 │
│   - Cookie/membership fallback                                          │
│ • Sets x-tenant-id header when tenant is resolved                      │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 2: Layout Guards                                                  │
│                                                                         │
│ app/admin/layout.tsx:                                                   │
│ • Requires user                                                         │
│ • Checks isSystemAdmin OR hasTenantAdminAccess                         │
│ • If neither → redirect to /app                                        │
│ • BUT: proxy already blocked non-system-admin, so this is secondary    │
│                                                                         │
│ app/admin/tenant/[tenantId]/layout.tsx:                                │
│ • Extracts tenantId from route params                                  │
│ • Checks system_admin OR membership in that specific tenant            │
│ • Syncs tenant context via TenantRouteSync                             │
│                                                                         │
│ app/app/layout.tsx:                                                     │
│ • Only checks user authentication                                       │
│ • NO role-based access control                                          │
│ • NO tenant-specific validation                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 3: Server Actions / API Routes                                   │
│                                                                         │
│ System Admin actions (e.g., achievements-admin.ts):                    │
│ • Uses createServerRlsClient() for user-scoped queries                 │
│ • Explicit isSystemAdmin(user) check                                   │
│ • Uses createServiceRoleClient() for privileged operations             │
│                                                                         │
│ Tenant Admin actions:                                                   │
│ • assertTenantAdminOrSystem(tenantId, user)                            │
│ • Validates user has system_admin OR tenant membership                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ LAYER 4: Database RLS                                                   │
│                                                                         │
│ Helper functions:                                                       │
│ • is_system_admin() - checks JWT claims                                │
│ • is_global_admin() - alias for system admin                           │
│ • get_user_tenant_ids() - returns user's tenant memberships            │
│ • has_tenant_role(tenant_id, roles[]) - checks specific role           │
│                                                                         │
│ Achievements table policies:                                            │
│ • System admin: full access via is_system_admin()                      │
│ • Service role: full access via auth.role() = 'service_role'           │
│ • Tenant admin: NOT YET IMPLEMENTED for achievements                   │
│                                                                         │
│ Achievement awards policies:                                            │
│ • is_system_admin() for INSERT/UPDATE/DELETE                           │
│ • service_role for RPC operations                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

### A.4 Tenant Context Resolution

#### For `/app` paths

**Resolution priority** (from `proxy.ts`):

1. **Path override**: `/app/t/[tenantId]/...` → extracts UUID from path
2. **Hostname resolution**: Custom domain or `tenant.lekbanken.no` subdomain
3. **Cookie/membership fallback**: Via `resolveTenant()` function

**Propagation**:
- `x-tenant-id` header set by proxy
- `lb_tenant` signed cookie refreshed
- `TenantProvider` in layout receives `activeTenant` from `getServerAuthContext()`

#### For `/admin` paths

**Tenant context sources**:

1. **Route parameter**: `/admin/tenant/[tenantId]/*` extracts from params
2. **TenantProvider**: Falls back to cookie/membership resolution
3. **No x-tenant-id header**: Proxy does not set this for `/admin` paths

**Key Issue**: `/admin/tenant/[tenantId]/layout.tsx` correctly syncs tenant from route param, but the main `/admin/layout.tsx` does NOT have guaranteed tenant context.

#### For `/app/admin` paths (Pattern B)

**Tenant context**: Inherits from `/app/layout.tsx` which relies on cookie/membership resolution.

**Problem**: No route parameter, no explicit tenant validation, no dedicated layout guard.

---

## Section B: Phase 1 Review

### B.1 File Placement Correctness

| File Created | Convention | Match? | Issue |
|--------------|------------|--------|-------|
| `app/actions/achievements-admin.ts` | Actions in `app/actions/` | ✅ | Correct location |
| `app/admin/gamification/achievements/page.tsx` | System admin at `/admin/...` | ✅ | Correct location |
| `app/admin/gamification/achievements/AchievementsAdminClient.tsx` | Colocated with page | ✅ | Correct location |
| `app/admin/gamification/achievements/AchievementEditorDrawer.tsx` | Colocated with page | ✅ | Correct location |
| `app/admin/gamification/achievements/AwardAchievementModal.tsx` | Colocated with page | ✅ | Correct location |
| **`app/app/admin/gamification/achievements/page.tsx`** | Tenant admin at `/admin/tenant/[tenantId]/...` | ❌ | **Wrong pattern** |

**Evidence of Correct Pattern**:

The existing tenant admin routes use `/admin/tenant/[tenantId]/*`:
```
app/admin/tenant/[tenantId]/
├── layout.tsx          # Has tenant-scoped access control
├── page.tsx
├── analytics/
├── billing/
├── content/
├── games/
├── members/
├── participants/
├── sessions/
├── settings/
├── subscription/
└── TenantRouteSync.tsx
```

Phase 1 created:
```
app/app/admin/gamification/achievements/page.tsx
```

This generates route `/app/admin/gamification/achievements` which:
- ❌ Does not have tenant ID in route
- ❌ Does not have dedicated layout with access control
- ❌ Does not match navigation config (`lib/admin/nav.ts` uses `/admin/tenant/[tenantId]/*`)
- ❌ Has no way to know which tenant the user is acting as

### B.2 Access Model Correctness

#### Phase 1 System Admin Actions

**File**: `app/actions/achievements-admin.ts`

| Action | Check | Correct? |
|--------|-------|----------|
| `listAchievements` | `isSystemAdmin(user)` | ✅ |
| `getAchievement` | `isSystemAdmin(user)` | ✅ |
| `createAchievement` | `isSystemAdmin(user)` | ✅ |
| `updateAchievement` | `isSystemAdmin(user)` | ✅ |
| `deleteAchievement` | `isSystemAdmin(user)` | ✅ |
| `setAchievementStatus` | `isSystemAdmin(user)` | ✅ |
| `bulkSetAchievementStatus` | `isSystemAdmin(user)` | ✅ |
| `awardAchievement` | RPC calls `is_system_admin()` | ✅ |
| `getTenantUserIds` | `isSystemAdmin(user)` | ✅ |
| `listTenantsForSelector` | `isSystemAdmin(user)` | ✅ |
| `searchUsersForAward` | `isSystemAdmin(user)` | ✅ |

**Verdict**: All Phase 1 server actions correctly enforce `system_admin` requirement.

#### Tenant Admin Capability Gap

Phase 1 did NOT introduce any tenant admin write capability. The placeholder at `/app/admin/gamification/achievements` is a static "Coming Soon" page with no server actions.

**Risk Assessment**:
- No unauthorized writes possible
- Placeholder has no forms or data submission
- Phase 2 will need to implement proper tenant-scoped actions

### B.3 Data Model Correctness

#### Migration: `20260110000001_achievements_phase1_schema.sql`

| Aspect | Expected | Actual | Match? |
|--------|----------|--------|--------|
| Naming | snake_case | `achievement_status_enum`, `icon_config` | ✅ |
| Enum creation | `DO $$ ... IF NOT EXISTS` | Used | ✅ |
| Column additions | `ADD COLUMN IF NOT EXISTS` | Used | ✅ |
| Index naming | `idx_tablename_column` | `idx_achievements_status` | ✅ |
| Foreign keys | Reference `users(id)` | `created_by`, `updated_by` reference `users(id)` | ✅ |
| Triggers | Pattern from other tables | `achievements_set_updated_at()` | ✅ |
| Comments | Yes | Added on all new columns | ✅ |

#### Migration: `20260110000002_achievement_awards_v1.sql`

| Aspect | Expected | Actual | Match? |
|--------|----------|--------|--------|
| Table naming | snake_case, plural | `achievement_awards`, `achievement_award_recipients` | ✅ |
| RLS enabled | Yes | `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` | ✅ |
| Policies | `is_system_admin()` pattern | Used for admin access | ✅ |
| Service role | `auth.role() = 'service_role'` | Used for RPC | ✅ |
| Indexes | On foreign keys | Yes, all FK columns indexed | ✅ |

#### Migration: `20260110000003_admin_award_achievement_rpc.sql`

| Aspect | Expected | Actual | Match? |
|--------|----------|--------|--------|
| `SECURITY DEFINER` | Yes for privileged ops | Used | ✅ |
| `SET search_path = public` | Yes | Used | ✅ |
| `is_system_admin()` check | Yes | Line 42 | ✅ |
| Error handling | RAISE EXCEPTION | Used throughout | ✅ |
| Idempotency | Advisory locks | `pg_advisory_xact_lock` used | ✅ |

**Verdict**: Migrations follow repo conventions and are well-structured.

#### Future Compatibility

| Future Feature | Migration Ready? | Notes |
|----------------|-----------------|-------|
| Private scope | ✅ | `scope` column already supports 'private' |
| Achievement tiers | ⚠️ | Would need new column or `icon_config` extension |
| Notification integration | ✅ | Can use `achievement_award_recipients` as trigger source |
| Tenant admin RLS | ⏳ | Policies exist for `is_system_admin()`, need tenant admin policies |

### B.4 Types and Build Health

#### `types/supabase.ts` Status

**Content** (first 3 lines):
```
Need to install the following packages:
supabase@2.72.2
Ok to proceed? (y) 
```

**Diagnosis**: This file contains the npm prompt output from a failed `npx supabase gen types typescript` command. The command's stdout (npm prompt) was written to the file instead of the TypeScript types.

**Root Cause**: The package.json scripts use shell redirection:
```json
"db:types": "npx --yes supabase gen types typescript --local > types/supabase.ts"
```

The `--yes` flag should prevent the prompt, but it appears the prompt was still captured.

**Impact**:
- ❌ Full TypeScript compilation fails
- ❌ Type imports from `@/types/supabase` fail
- ✅ Individual file checks pass (using alternative `types/database.ts`)

**Recommended Fix** (do NOT apply):
```powershell
# Option 1: Regenerate from local Supabase
npm run db:types

# Option 2: Regenerate from linked project
npm run db:types:remote

# Option 3: Use PowerShell script
.\scripts\regenerate-types.ps1
```

**Canonical Workflow**:
- `package.json` line 16-17 defines the scripts
- `scripts/regenerate-types.ps1` provides a PowerShell alternative
- Multiple docs reference `npm run db:types:remote`

---

## Section C: Recommendations

### Option 1: Consolidate Under `/admin/tenant/[tenantId]/*` (Recommended)

**Structure**:
```
/admin                              → System Admin (global view)
/admin/gamification/achievements    → System Admin achievements CRUD
/admin/tenant/[tenantId]            → Tenant Admin (scoped view)
/admin/tenant/[tenantId]/gamification/achievements → Tenant achievements
```

**Route Implementation**:
- System admin: `app/admin/gamification/achievements/page.tsx` (exists)
- Tenant admin: `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx` (to create)

**Pros**:
- ✅ Uses existing, proven pattern with proper access control
- ✅ Navigation config already uses this pattern
- ✅ Layout guard already validates tenant membership
- ✅ Route param provides reliable tenant context
- ✅ System admin can view any tenant via same URL pattern
- ✅ No proxy changes needed

**Cons**:
- ⚠️ URL is longer: `/admin/tenant/:id/gamification/achievements`
- ⚠️ Requires updating Phase 1 placeholder location

**Security Properties**:
- Tenant ID is explicit in URL (auditable)
- Layout enforces membership check
- Server actions must validate `assertTenantAdminOrSystem(tenantId, user)`
- RLS can use `tenant_id` from request context

**Migration/RLS Implications**:
- Add RLS policies: `has_tenant_role(tenant_id, ARRAY['owner','admin','editor'])`
- Server actions need tenant-scoped variants

### Option 2: Keep `/app/admin/*` Pattern

**Structure**:
```
/admin                              → System Admin only
/app/admin/gamification/achievements → Tenant Admin (tenant from context)
```

**Route Implementation**:
- System admin: `app/admin/gamification/achievements/page.tsx` (exists)
- Tenant admin: `app/app/admin/gamification/achievements/page.tsx` (exists, placeholder)

**Pros**:
- ✅ Clear separation: `/admin` = system, `/app/admin` = tenant
- ✅ Matches proxy rule: proxy blocks non-system-admin from `/admin`
- ✅ Phase 1 placeholder already in place

**Cons**:
- ❌ No route-based tenant ID (relies on cookie/context)
- ❌ Inconsistent with existing `/admin/tenant/[tenantId]/*` pattern
- ❌ Navigation config uses different pattern (`/admin/tenant/[tenantId]/*`)
- ❌ No dedicated layout guard for `/app/admin/*`
- ❌ Requires new layout at `app/app/admin/layout.tsx`
- ❌ Menu would need restructuring

**Security Properties**:
- Tenant context is implicit (less auditable)
- Must create new layout guard for `/app/admin/*`
- Risk of context mismatch if user changes tenant mid-session

**Migration/RLS Implications**:
- Same as Option 1, but tenant_id must come from cookie/header

### Option 3: Unified Admin with RBAC + Tenant Selector

**Structure**:
```
/admin                              → Both System and Tenant Admin
/admin/gamification/achievements    → RBAC-filtered view
                                      - System admin: sees all
                                      - Tenant admin: sees own tenant
```

**Route Implementation**:
- Single page: `app/admin/gamification/achievements/page.tsx`
- RBAC determines what data is shown and what actions are allowed

**Pros**:
- ✅ Single codebase for both views
- ✅ Simpler mental model for developers
- ✅ Natural "acting as tenant X" pattern

**Cons**:
- ❌ Requires changing proxy to allow tenant admins into `/admin`
- ❌ Complex RBAC logic in every component
- ❌ Risk of privilege escalation if RBAC is buggy
- ❌ Major refactor of existing patterns

**Security Properties**:
- All access control in application layer
- Higher risk of bugs exposing system admin data to tenant admins
- Requires comprehensive test coverage

**Migration/RLS Implications**:
- RLS must handle both cases
- Server actions need conditional logic

### Recommendation Matrix

| Criterion | Option 1 | Option 2 | Option 3 |
|-----------|----------|----------|----------|
| Matches existing patterns | ✅ Best | ⚠️ Partial | ❌ Major change |
| Security clarity | ✅ Explicit | ⚠️ Implicit | ⚠️ Complex |
| Implementation effort | ⚠️ Medium | ⚠️ Medium | ❌ High |
| Developer ergonomics | ✅ Clear | ⚠️ Confusing | ⚠️ Complex |
| Phase 1 compatibility | ⚠️ Needs move | ✅ In place | ❌ Needs refactor |

**Strong Recommendation**: **Option 1**

---

## Section D: Phase 2 Constraints Contract

### GO / NO-GO Decision

## ⚠️ CONDITIONAL GO

Phase 2 may proceed **IF** the following pre-conditions are met:

### Pre-Conditions (Must Fix Before Phase 2)

1. **Move tenant admin placeholder** from:
   - `app/app/admin/gamification/achievements/page.tsx`
   - TO: `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx`

2. **Regenerate types**: Run `npm run db:types:remote` to fix corrupted `types/supabase.ts`

3. **Add gamification category to tenant nav**: Update `lib/admin/nav.ts` to include gamification items under `organisationAdminCategories`

### Phase 2 Constraints (Must Follow)

Phase 2 implementation MUST:

1. **Use Pattern A for tenant admin routes**:
   - Route: `/admin/tenant/[tenantId]/gamification/achievements`
   - File: `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx`

2. **Extract tenantId from route params**, not from context:
   ```typescript
   export default async function Page({ params }: { params: Promise<{ tenantId: string }> }) {
     const { tenantId } = await params;
     // Use tenantId explicitly
   }
   ```

3. **Use `assertTenantAdminOrSystem` for all tenant admin server actions**:
   ```typescript
   const allowed = await assertTenantAdminOrSystem(tenantId, user);
   if (!allowed) {
     throw new Error('Forbidden: tenant admin access required');
   }
   ```

4. **Create tenant-scoped server action variants**:
   - `listTenantAchievements(tenantId, params)` - filtered to tenant
   - `createTenantAchievement(tenantId, input)` - scoped to tenant
   - `awardTenantAchievement(tenantId, achievementId, userIds, message)` - tenant users only

5. **Add RLS policies for tenant admin access** in migration:
   ```sql
   CREATE POLICY achievements_tenant_admin_select ON public.achievements
     FOR SELECT USING (
       is_system_admin() OR 
       (scope = 'tenant' AND tenant_id = ANY(get_user_tenant_ids()) AND 
        has_tenant_role(tenant_id, ARRAY['owner','admin','editor']::tenant_role_enum[]))
     );
   ```

6. **Validate tenant membership in RPC functions**:
   - Add `p_tenant_id` parameter
   - Check `has_tenant_role(p_tenant_id, ...)` before operations

7. **Filter data to tenant scope**:
   - Tenant admin sees only their tenant's achievements
   - Award targets limited to tenant members
   - Cannot create global-scope achievements

8. **Update navigation config**:
   - Add achievements to `organisationAdminCategories` in `lib/admin/nav.ts`
   - Use href: `/admin/tenant/[tenantId]/gamification/achievements`

### Pre-Phase 2 Checklist

Before starting Phase 2, validate:

- [ ] `types/supabase.ts` contains valid TypeScript (not npm prompt)
- [ ] Full `npm run type-check` passes
- [ ] Placeholder moved to `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx`
- [ ] Route `/app/admin/gamification/achievements` no longer exists (or redirects)
- [ ] `lib/admin/nav.ts` has gamification in `organisationAdminCategories`
- [ ] Phase 1 system admin UI works: can list, create, edit, archive achievements
- [ ] Phase 1 award flow works: can award to tenant users
- [ ] `assertTenantAdminOrSystem` helper tested with tenant admin user
- [ ] RLS helper `has_tenant_role` exists and is tested
- [ ] Implementation log updated with Phase 2 plan

### Files to Create in Phase 2

1. `app/admin/tenant/[tenantId]/gamification/page.tsx` - Gamification hub for tenant
2. `app/admin/tenant/[tenantId]/gamification/achievements/page.tsx` - Achievements list
3. `app/admin/tenant/[tenantId]/gamification/achievements/[achievementId]/page.tsx` - Detail view (optional)
4. `app/actions/tenant-achievements-admin.ts` - Tenant-scoped server actions
5. `supabase/migrations/20260111000001_achievements_tenant_admin_rls.sql` - Tenant admin policies

### Files to Modify in Phase 2

1. `lib/admin/nav.ts` - Add gamification to organisation categories
2. `app/app/admin/gamification/achievements/page.tsx` - Delete or redirect
3. `docs/IMPLEMENTATION_LOG_ACHIEVEMENTS_PHASE1.md` - Update with Phase 2 progress

---

## Appendix: Evidence References

### Proxy Guard Evidence

```typescript
// proxy.ts line 219
if (user && pathname.startsWith('/admin') && effectiveRole !== 'system_admin') {
  const redirectResponse = NextResponse.redirect(new URL('/app', request.url))
  redirectResponse.headers.set('x-request-id', requestId)
  return redirectResponse
}
```

### Tenant Layout Guard Evidence

```typescript
// app/admin/tenant/[tenantId]/layout.tsx lines 27-42
const isSystemAdmin = authContext.effectiveGlobalRole === 'system_admin';
const membership = authContext.memberships?.find(m => m.tenant_id === tenantId);
const tenantRole = membership?.role as string | null;
const hasTenantAccess = tenantRole === 'owner' || tenantRole === 'admin' || tenantRole === 'editor';

if (!isSystemAdmin && !hasTenantAccess) {
  const firstTenantId = authContext.memberships?.[0]?.tenant_id;
  if (firstTenantId && firstTenantId !== tenantId) {
    redirect(`/admin/tenant/${firstTenantId}`);
  }
  redirect('/admin');
}
```

### Server Action Guard Evidence

```typescript
// app/actions/achievements-admin.ts lines 106-110
const supabase = await createServerRlsClient();
const { data: { user } } = await supabase.auth.getUser();

if (!user || !isSystemAdmin(user)) {
  throw new Error('Forbidden: system_admin required');
}
```

### RLS Helper Evidence

```sql
-- supabase/migrations/20260110000003_admin_award_achievement_rpc.sql lines 41-44
IF NOT public.is_system_admin() THEN
  RAISE EXCEPTION 'Forbidden: only system_admin can award achievements';
END IF;
```

---

**End of Report**
