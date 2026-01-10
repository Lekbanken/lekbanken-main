# Phase 1: Implementation Plan — Learning Admin

**Feature Area:** `/admin/learning/*`  
**Date:** 2026-01-10  
**Goal:** Replace mock admin UIs with real data + CRUD, using established patterns (Achievements/Shop).  
**Scope:** Admin foundations + Courses CRUD + Requirements wiring + Reports placeholder decision.  
**Non-goals:** Participant UI productionization, advanced graph editor (unless MVP defined).

---

## 1. Decisions Contract

### ✅ LOCKED — Phase 1 Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Content Model** | Hybrid (global + tenant) | Schema designed for this; matches Achievements pattern |
| **Global course creation** | `system_admin` only | Prevents accidental global pollution; tenant admins can only create tenant-scoped |
| **Global path creation** | `system_admin` only | Same logic as courses |
| **Global requirement creation** | `system_admin` only | Gating rules that apply everywhere need central control |
| **Tenant selection UX** | system_admin: explicit scope toggle + tenant selector when "tenant" chosen; tenant admin: no toggle, tenant implicit | Clear separation of concerns |
| **Paths MVP (Phase 1)** | **Read-only list only** | RLS only allows system_admin to write nodes/edges; defer graph editing to Phase 2 |
| **Requirements MVP** | Full CRUD (wrapper around existing actions) | Server actions already exist for requirements |
| **Reports page** | Create placeholder route (no 404) | Keeps nav consistent; defer implementation to Phase 2 |

### ⚠️ RLS Constraint — Path Nodes/Edges

**CRITICAL FINDING:** The RLS policies for `learning_path_nodes` and `learning_path_edges` only grant write access to `system_admin`:

```sql
-- From 20260104000000_learning_domain.sql lines 283-298
CREATE POLICY "system_admins_full_access_learning_path_nodes"
ON learning_path_nodes FOR ALL
USING (is_system_admin())
WITH CHECK (is_system_admin());

CREATE POLICY "users_select_learning_path_nodes"
ON learning_path_nodes FOR SELECT
USING (...)
-- NO tenant_admins_manage policy exists for nodes/edges
```

**Implication:** Tenant admins CANNOT write to nodes/edges via RLS client. Phase 1 Paths page will be:
- Read-only list for tenant admins
- Full CRUD only for system_admin (future Phase 2)

---

## 2. Verified Constraints

### 2.1 Learning Tables — Write Permissions (RLS)

| Table | system_admin | tenant_admin (own tenant) | tenant_admin (global) | Evidence |
|-------|--------------|--------------------------|----------------------|----------|
| `learning_courses` | ✅ ALL | ✅ ALL (tenant_id = their tenant) | ❌ Cannot write NULL tenant_id | [20260104000000_learning_domain.sql#L236-L258](supabase/migrations/20260104000000_learning_domain.sql#L236) |
| `learning_paths` | ✅ ALL | ✅ ALL (tenant_id = their tenant) | ❌ Cannot write NULL tenant_id | [20260104000000_learning_domain.sql#L260-L280](supabase/migrations/20260104000000_learning_domain.sql#L260) |
| `learning_path_nodes` | ✅ ALL | ❌ SELECT only | ❌ No | [20260104000000_learning_domain.sql#L283-L298](supabase/migrations/20260104000000_learning_domain.sql#L283) |
| `learning_path_edges` | ✅ ALL | ❌ SELECT only | ❌ No | [20260104000000_learning_domain.sql#L300-L315](supabase/migrations/20260104000000_learning_domain.sql#L300) |
| `learning_requirements` | ✅ ALL | ✅ ALL (tenant_id = their tenant) | ❌ Cannot write NULL tenant_id | [20260104000000_learning_domain.sql#L352-L375](supabase/migrations/20260104000000_learning_domain.sql#L352) |

### 2.2 Existing Auth Utilities

| Utility | Location | Purpose |
|---------|----------|---------|
| `isSystemAdmin(user)` | [lib/utils/tenantAuth.ts#L14-L38](lib/utils/tenantAuth.ts#L14) | Checks app_metadata for system_admin role |
| `isTenantAdmin(tenantId, userId)` | [lib/utils/tenantAuth.ts#L40-L50](lib/utils/tenantAuth.ts#L40) | Checks user_tenant_memberships for owner/admin |
| `assertTenantAdminOrSystem(tenantId, user)` | [lib/utils/tenantAuth.ts#L53-L57](lib/utils/tenantAuth.ts#L53) | Combined check: returns true if system_admin OR tenant admin for given tenantId |

### 2.3 Established Patterns

| Pattern | Reference File | Notes |
|---------|----------------|-------|
| System admin CRUD actions | [app/actions/achievements-admin.ts](app/actions/achievements-admin.ts) | Uses `isSystemAdmin` check + service role for writes |
| Tenant admin CRUD actions | [app/actions/tenant-achievements-admin.ts](app/actions/tenant-achievements-admin.ts) | Uses `assertTenantAdminOrSystem` + RLS client for writes |
| Editor drawer | [app/admin/gamification/achievements/AchievementEditorDrawer.tsx](app/admin/gamification/achievements/AchievementEditorDrawer.tsx) | Sheet component with form fields, scope toggle, tenant selector |
| List with pagination | `achievements-admin.ts#listAchievements` | Server-side pagination with count, filters, sorting |
| Zod validation | Both achievements files | Schema validation before DB writes |

### 2.4 Supabase Clients Available

| Client | Import | Usage |
|--------|--------|-------|
| RLS Client | `createServerRlsClient()` from `@/lib/supabase/server` | Reads (respects RLS), writes when tenant admin has RLS access |
| Service Role | `createServiceRoleClient()` from `@/lib/supabase/server` | Writes that bypass RLS (system admin operations, global content) |

### 2.5 Existing Learning Server Actions

| File | Functions | Admin CRUD? |
|------|-----------|-------------|
| [app/actions/learning.ts](app/actions/learning.ts) | `startCourseAttempt`, `submitQuizAnswers`, `getCourseProgress`, `getAllCourseProgress`, `checkPrerequisites` | ❌ Participant only |
| [app/actions/learning-requirements.ts](app/actions/learning-requirements.ts) | `checkRequirements`, `getRequirementsForTarget`, `createRequirement`, `deleteRequirement`, `toggleRequirementActive` | ✅ Partial admin (requirements) |

---

## 3. Deliverables (Files + Functions)

### 3.1 New File: `app/actions/learning-admin.ts`

**Purpose:** Admin CRUD for courses, paths, requirements (extends existing requirements actions).

```typescript
// TYPES
export interface LearningCourseRow { ... }
export interface LearningCourseListParams { ... }
export interface LearningCourseListResult { ... }
export interface LearningPathRow { ... }
export interface LearningPathListParams { ... }
export interface LearningPathListResult { ... }
export interface LearningRequirementRow { ... }
export interface LearningRequirementListParams { ... }
export interface LearningRequirementListResult { ... }

// VALIDATION SCHEMAS
const courseCreateSchema = z.object({ ... })
const courseUpdateSchema = courseCreateSchema.partial().extend({ id: z.string().uuid() })
const pathCreateSchema = z.object({ ... })
const pathUpdateSchema = ...
const requirementCreateSchema = z.object({ ... })

// COURSES
export async function listCourses(params: LearningCourseListParams): Promise<LearningCourseListResult>
export async function getCourse(courseId: string): Promise<LearningCourseRow | null>
export async function createCourse(input: CourseCreateInput): Promise<{ success: boolean; data?: LearningCourseRow; error?: string }>
export async function updateCourse(input: CourseUpdateInput): Promise<{ success: boolean; data?: LearningCourseRow; error?: string }>
export async function setCourseStatus(courseId: string, status: 'draft' | 'active' | 'archived'): Promise<{ success: boolean; error?: string }>
export async function deleteCourse(courseId: string): Promise<{ success: boolean; error?: string }> // soft delete = archive

// PATHS (read-only for Phase 1, full CRUD for system admin)
export async function listPaths(params: LearningPathListParams): Promise<LearningPathListResult>
export async function getPath(pathId: string): Promise<LearningPathRow | null>
// Note: createPath/updatePath/deletePath only if implementing system admin graph editor

// REQUIREMENTS (wrapper + enhanced list)
export async function listRequirements(params: LearningRequirementListParams): Promise<LearningRequirementListResult>
export async function getRequirement(requirementId: string): Promise<LearningRequirementRow | null>
// createRequirement, deleteRequirement, toggleRequirementActive — re-export or enhance from learning-requirements.ts
```

**Authorization Rules:**
```typescript
// For global content (tenant_id = null)
if (!isSystemAdmin(user)) {
  return { success: false, error: 'Endast systemadministratörer kan hantera globalt innehåll' };
}

// For tenant content
const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
if (!hasAccess) {
  return { success: false, error: 'Åtkomst nekad' };
}

// Prevent tenant admin from creating global
if (!isSystemAdmin(user) && tenantId === null) {
  return { success: false, error: 'Endast systemadministratörer kan skapa globalt innehåll' };
}
```

**DB Access:**
```typescript
// Reads: RLS client
const supabase = await createServerRlsClient();

// Writes (global): Service role
const adminClient = createServiceRoleClient();

// Writes (tenant): RLS client (tenant admin has RLS access for their tenant)
const supabase = await createServerRlsClient();
```

---

### 3.2 Modified File: `app/admin/learning/page.tsx`

**Changes:**
- [ ] Remove hardcoded stats (show "—" or fetch real counts)
- [ ] Fix Reports card: either remove link OR add `(Kommer snart)` badge
- [ ] Add scope indicator for system admin (show if viewing global vs tenant context)

---

### 3.3 Modified File: `app/admin/learning/courses/page.tsx`

**Changes:**
- [ ] Remove `mockCourses` array entirely
- [ ] Add state for courses, loading, error, pagination
- [ ] Call `listCourses()` on mount and filter changes
- [ ] Implement search input (debounced)
- [ ] Implement status filter dropdown
- [ ] Implement scope filter (for system admin: All/Global/Tenant)
- [ ] Add tenant selector dropdown (system admin only, when scope = Tenant)
- [ ] Implement pagination controls
- [ ] Wire Create button to open drawer
- [ ] Wire Edit button to open drawer with selected course
- [ ] Wire Delete button to archive course (with confirmation)
- [ ] Add `CourseEditorDrawer` component (inline or separate file)

---

### 3.4 New File: `app/admin/learning/courses/CourseEditorDrawer.tsx`

**Purpose:** Create/edit course drawer following AchievementEditorDrawer pattern.

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| title | Input | ✅ | Max 100 chars |
| slug | Input | ✅ | Auto-generated from title, editable |
| description | Textarea | ❌ | Max 500 chars |
| status | Select | ✅ | draft/active/archived |
| difficulty | Select | ❌ | beginner/intermediate/advanced/expert |
| duration_minutes | Number | ❌ | Estimated time |
| pass_score | Number | ✅ | 0-100, default 70 |
| tags | TagInput | ❌ | Array of strings |
| **Scope Section** | — | — | — |
| scope (system admin only) | RadioGroup | ✅ | Global / Tenant |
| tenant_id (if scope=Tenant) | Select | ✅ | Tenant picker |
| **Content Section** | — | — | — |
| content_json | Textarea (JSON) | ❌ | MVP: raw JSON editor; Future: block editor |
| quiz_json | Textarea (JSON) | ❌ | MVP: raw JSON editor; Future: question builder |
| **Rewards Section** | — | — | — |
| rewards.dicecoin_amount | Number | ❌ | |
| rewards.xp_amount | Number | ❌ | |
| rewards.achievement_id | Input | ❌ | Achievement key to unlock |

**Scope Logic:**
```tsx
// System admin sees scope toggle
{isSystemAdmin && (
  <ScopeToggle value={scope} onChange={setScope} />
)}
{isSystemAdmin && scope === 'tenant' && (
  <TenantSelector value={tenantId} onChange={setTenantId} tenants={tenants} />
)}
// Tenant admin: scope hidden, tenant_id = currentTenant
{!isSystemAdmin && (
  <input type="hidden" value={currentTenant.id} />
)}
```

---

### 3.5 Modified File: `app/admin/learning/paths/page.tsx`

**Changes:**
- [ ] Remove `mockPaths` array
- [ ] Fetch real paths via `listPaths()`
- [ ] Display read-only list with cards
- [ ] Show scope badge (Global / Tenant name)
- [ ] Show "Planerad" notice for graph editor feature
- [ ] Disable Create/Edit/Delete buttons for tenant admins (read-only)
- [ ] For system admin: optionally show Create button (Phase 2 scope)

---

### 3.6 Modified File: `app/admin/learning/requirements/page.tsx`

**Changes:**
- [ ] Remove `mockRequirements` array
- [ ] Fetch real requirements via `listRequirements()`
- [ ] Wire toggle switch to `toggleRequirementActive()`
- [ ] Wire delete button to `deleteRequirement()`
- [ ] Wire create button to open `RequirementEditorDrawer`
- [ ] Implement `RequirementEditorDrawer` component

---

### 3.7 New File: `app/admin/learning/requirements/RequirementEditorDrawer.tsx`

**Fields:**
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| requirement_type | Select | ✅ | role_unlock, activity_unlock, game_unlock, onboarding_required |
| target_ref.kind | Select | ✅ | game, role, activity, feature |
| target_ref.id | Input/Select | ✅ | UUID of target |
| target_ref.name | Input | ❌ | Display name for clarity |
| required_course_id | CourseSelector | ✅ | Dropdown of courses |
| scope (system admin) | RadioGroup | ✅ | Global / Tenant |
| tenant_id | Select | ✅ (if tenant) | Tenant picker |
| is_active | Switch | ❌ | Default true |

---

### 3.8 New File: `app/admin/learning/reports/page.tsx`

**Purpose:** Placeholder to prevent 404.

```tsx
'use client';

import { AdminPageHeader, AdminPageLayout, AdminBreadcrumbs } from "@/components/admin/shared";
import { ChartBarIcon } from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";

export default function LearningReportsPage() {
  return (
    <AdminPageLayout>
      <AdminBreadcrumbs
        items={[
          { label: "Utbildning", href: "/admin/learning" },
          { label: "Rapporter", href: "/admin/learning/reports" },
        ]}
      />
      <AdminPageHeader
        title="Rapporter"
        description="Översikt av lärande och framsteg"
        icon={<ChartBarIcon className="h-8 w-8" />}
        actions={<Badge variant="secondary">Kommer snart</Badge>}
      />
      <div className="mt-8 rounded-lg border border-dashed border-border bg-muted/30 p-12 text-center">
        <ChartBarIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
        <h3 className="mt-4 font-semibold text-foreground">Rapporter planeras</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Här kommer du kunna se gruppens framsteg, kursstatistik och användarrapporter.
        </p>
      </div>
    </AdminPageLayout>
  );
}
```

---

### 3.9 Optional: Navigation Improvements

**File:** `lib/admin/nav.ts`

**Changes:**
- [ ] Add `permission: 'admin.learning.list'` to learning items (for future RBAC)
- [ ] Consider adding `systemAdminOnly: true` to specific items if needed

```typescript
{
  id: 'learning',
  label: 'Utbildning',
  icon: 'learning',
  items: [
    { id: 'learning-hub', label: 'Översikt', href: '/admin/learning', icon: 'learning' },
    { id: 'courses', label: 'Kurser', href: '/admin/learning/courses', icon: 'learning' },
    { id: 'paths', label: 'Lärstigar', href: '/admin/learning/paths', icon: 'learning' },
    { id: 'requirements', label: 'Krav & Grind', href: '/admin/learning/requirements', icon: 'learning' },
    { id: 'reports', label: 'Rapporter', href: '/admin/learning/reports', icon: 'learning' }, // ADD
  ],
},
```

---

## 4. UI/UX Specification

### 4.1 Courses Page Layout

```
┌─────────────────────────────────────────────────────────────────────┐
│ Breadcrumbs: Utbildning > Kurser                                    │
├─────────────────────────────────────────────────────────────────────┤
│ [Icon] Kurser                                                       │
│ Skapa och hantera utbildningskurser                    [+ Ny kurs]  │
├─────────────────────────────────────────────────────────────────────┤
│ Stats Cards:                                                        │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐│
│ │ Totalt: 12   │ │ Aktiva: 8    │ │ Utkast: 3    │ │ Arkiverade: 1││
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│ Filters:                                                            │
│ [🔍 Sök...]  [Status ▼]  [Scope ▼ (sys admin)]  [Tenant ▼ (if T)]   │
├─────────────────────────────────────────────────────────────────────┤
│ Table:                                                              │
│ ┌───────┬──────────────────┬────────┬────────┬─────────┬──────────┐│
│ │ Scope │ Kurs             │ Status │ Nivå   │ Version │ Åtgärder ││
│ ├───────┼──────────────────┼────────┼────────┼─────────┼──────────┤│
│ │ 🌐    │ Intro till Lek   │ Aktiv  │ Nybörj │ v1      │ ✏️ 🗑️   ││
│ │ [Org] │ Säkerhet Grund   │ Aktiv  │ Nybörj │ v2      │ ✏️ 🗑️   ││
│ └───────┴──────────────────┴────────┴────────┴─────────┴──────────┘│
├─────────────────────────────────────────────────────────────────────┤
│ Pagination: [< Prev] 1 2 3 ... 5 [Next >]   Visar 1-20 av 42        │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.2 Scope Indicators

| Scope | Badge | Icon |
|-------|-------|------|
| Global | `🌐 Global` (blue) | GlobeAltIcon |
| Tenant | `[Tenant Name]` (gray) | BuildingOfficeIcon |

### 4.3 Course Editor Drawer

```
┌─────────────────────────────────────────────────────────────────┐
│ ✕                                              [Skapa kurs]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ GRUNDLÄGGANDE                                                   │
│ ─────────────────────────────────────────                       │
│ Titel *                                                         │
│ [Introduktion till Lekbanken                             ]      │
│                                                                  │
│ Slug *                                                          │
│ [intro-lekbanken                                         ]      │
│                                                                  │
│ Beskrivning                                                     │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ Lär dig grunderna...                                      │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ SCOPE (only for system admin)                                   │
│ ─────────────────────────────────────────                       │
│ ○ Global (synlig för alla)                                      │
│ ● Tenant (specifik organisation)                                │
│                                                                  │
│ Organisation *                                                  │
│ [▼ Välj organisation...                                  ]      │
│                                                                  │
│ INSTÄLLNINGAR                                                   │
│ ─────────────────────────────────────────                       │
│ Status *        Svårighetsgrad      Uppskattad tid              │
│ [▼ Utkast  ]    [▼ Nybörjare  ]    [15      ] min              │
│                                                                  │
│ Godkänt-gräns *                                                 │
│ [70      ] %                                                    │
│                                                                  │
│ Taggar                                                          │
│ [grundkurs] [obligatorisk] [+ Lägg till]                        │
│                                                                  │
│ INNEHÅLL (MVP: JSON)                                            │
│ ─────────────────────────────────────────                       │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ [{"id":"s1","title":"Välkommen","body_markdown":"..."}]   │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ QUIZ (MVP: JSON)                                                │
│ ─────────────────────────────────────────                       │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ [{"id":"q1","question":"Vad är...","options":[...]}]      │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│ BELÖNINGAR                                                      │
│ ─────────────────────────────────────────                       │
│ DiceCoin         XP              Achievement                    │
│ [100       ]     [50       ]     [safety-cert            ]      │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                               [Avbryt]  [Spara kurs]            │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Requirements Page Table Columns

| Column | Description |
|--------|-------------|
| Typ | Requirement type badge (role_unlock, game_unlock, etc.) |
| Mål | Target display name + ref |
| Krävd kurs | Course title (link) |
| Scope | 🌐 Global or [Tenant] |
| Status | Toggle switch (active/inactive) |
| Åtgärder | Delete button |

### 4.5 Paths Page (Read-Only MVP)

Same as current layout but:
- Real data from `listPaths()`
- Scope badges
- Disabled edit/delete buttons for tenant admins
- "Planerad" badge on graph editor feature

---

## 5. Test Plan

### 5.1 Manual Tests

#### Courses

| Test | Expected | Priority |
|------|----------|----------|
| Tenant admin creates tenant course | Success; tenant_id = their tenant | P0 |
| Tenant admin attempts to create global course | Blocked; error message shown | P0 |
| System admin creates global course | Success; tenant_id = null, scope badge = 🌐 | P0 |
| System admin creates tenant course | Success; requires tenant selection | P0 |
| Tenant admin cannot see other tenant's courses | RLS blocks; list shows only own tenant | P0 |
| Tenant admin can see global courses (read-only) | Visible but edit disabled | P1 |
| Status filter works | Filters by draft/active/archived | P1 |
| Search filter works | Filters by title/description | P1 |
| Pagination works | Shows correct page, total count | P1 |
| Edit course | Opens drawer with existing data; saves changes | P0 |
| Archive course | Sets status to archived; disappears from default view | P1 |

#### Requirements

| Test | Expected | Priority |
|------|----------|----------|
| Create requirement | Success; appears in list | P0 |
| Toggle active status | Persists on refresh | P0 |
| Delete requirement | Removed from list | P0 |
| Tenant admin cannot create global requirement | Blocked | P0 |

#### Paths

| Test | Expected | Priority |
|------|----------|----------|
| List shows real paths | No mock data | P0 |
| Tenant admin sees read-only view | Edit buttons disabled | P1 |
| System admin sees paths from all tenants | If scope filter = All | P1 |

#### Navigation

| Test | Expected | Priority |
|------|----------|----------|
| `/admin/learning/reports` does not 404 | Shows placeholder page | P0 |
| All nav links work | No broken links | P0 |

### 5.2 Automated Tests (If Repo Has Patterns)

Check for existing patterns in:
- `tests/admin/` directory
- `tests/e2e/` or `playwright/` tests

If patterns exist, add:

```typescript
// tests/admin/learning/courses.test.ts
describe('Learning Courses Admin', () => {
  it('tenant admin can list tenant courses', async () => { ... });
  it('tenant admin cannot create global course', async () => { ... });
  it('system admin can create global course', async () => { ... });
});
```

---

## 6. Risks & Rollback

### 6.1 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| RLS policies block tenant admin unexpectedly | Low | High | Test with real tenant admin user before merge |
| Content JSON editor is confusing for non-technical admins | Medium | Medium | Phase 2: Add visual content/quiz builder |
| Performance with large course lists | Low | Medium | Pagination is already planned |
| Scope confusion (tenant admin sees global courses they can't edit) | Medium | Medium | Clear visual indicators + disabled buttons |

### 6.2 Rollback Plan

1. **If server actions fail:** Revert `app/actions/learning-admin.ts` to empty file
2. **If UI breaks:** Revert to mock data implementation (keep old files as `*.backup`)
3. **If RLS issues:** Fix policies in new migration (additive, not destructive)

### 6.3 Feature Flags (Optional)

If repo has feature flag system, consider:
```typescript
const FEATURE_LEARNING_ADMIN_V2 = 'learning_admin_v2';
```

Show new UI only when flag is enabled during rollout.

---

## 7. Implementation Order

| Step | Task | Estimate | Dependencies |
|------|------|----------|--------------|
| 1 | Create `learning-admin.ts` with course CRUD | 2-3h | None |
| 2 | Create `CourseEditorDrawer.tsx` | 2h | Step 1 |
| 3 | Update `courses/page.tsx` with real data | 2h | Steps 1, 2 |
| 4 | Create `reports/page.tsx` placeholder | 15min | None |
| 5 | Update hub page (`learning/page.tsx`) | 30min | Step 4 |
| 6 | Add requirement list functions to `learning-admin.ts` | 1h | Step 1 |
| 7 | Update `requirements/page.tsx` with real data | 1.5h | Step 6 |
| 8 | Create `RequirementEditorDrawer.tsx` | 1.5h | Step 6 |
| 9 | Update `paths/page.tsx` read-only list | 1h | Step 1 |
| 10 | Manual testing | 2h | All steps |
| 11 | Update nav.ts (optional) | 15min | None |

**Total Estimate:** ~14 hours

---

## 8. Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | Initial Phase 1 implementation plan |
