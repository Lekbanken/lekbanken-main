# Phase 0: Architecture & Reality Analysis — Learning Admin

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-01-10
- Last updated: 2026-03-21
- Last validated: 2026-01-10

> Historical Phase 0 analysis. Keep for context, but re-validate against current learning/admin code before using it as active guidance.

**Document Status:** Complete  
**Feature Area:** `/admin/learning` (inkl. alla undersidor)  
**Purpose:** READ-ONLY ANALYSIS — Surface facts, risks, and constraints before Phase 1/2

---

## Executive Summary

Learning (Lekledarutbildning) is a **hybrid-scoped** feature designed to support both global courses (system-wide) and tenant-specific courses. Unlike Shop Rewards (tenant-only) and similar to Achievements, learning content can exist at both levels.

### Key Findings

| Aspect | Current State | Risk Level |
|--------|---------------|------------|
| Admin UI | Functional hub + mock data on list pages | 🟡 Medium |
| Database Schema | Complete, production-ready | 🟢 Low |
| Server Actions | Partial (participant progress only) | 🟡 Medium |
| Admin CRUD Actions | **None exist** | 🔴 High |
| API Routes | Single submit endpoint (participant) | 🟡 Medium |
| RLS Policies | Well-designed, tenant+global hybrid | 🟢 Low |
| Participant Flow | Sandbox prototype, not production | 🟡 Medium |
| Gamification Integration | Complete (DiceCoin, XP, Achievements) | 🟢 Low |
| Status Lifecycle | Full draft/active/archived | 🟢 Low |

---

## Section A — Routes & Access Model

### A.1 Route Inventory

| File Path | Generated URL | Type | Audience | Guard | Tenant-aware | Status |
|-----------|---------------|------|----------|-------|--------------|--------|
| [app/admin/learning/page.tsx](app/admin/learning/page.tsx) | `/admin/learning` | Client | System Admin + Tenant Admin | Layout auth | ❌ No | ✅ Functional hub |
| [app/admin/learning/courses/page.tsx](app/admin/learning/courses/page.tsx) | `/admin/learning/courses` | Client | System Admin + Tenant Admin | Layout auth | ❌ No | 🟡 Mock data |
| [app/admin/learning/paths/page.tsx](app/admin/learning/paths/page.tsx) | `/admin/learning/paths` | Client | System Admin + Tenant Admin | Layout auth | ❌ No | 🟡 Mock data |
| [app/admin/learning/requirements/page.tsx](app/admin/learning/requirements/page.tsx) | `/admin/learning/requirements` | Client | System Admin + Tenant Admin | Layout auth | ❌ No | 🟡 Mock data |
| [app/app/learning/page.tsx](app/app/learning/page.tsx) | `/app/learning` | Client | Authenticated Users | App layout | ❌ No | 🟡 Mock data |
| [app/app/learning/course/[slug]/page.tsx](app/app/learning/course/[slug]/page.tsx) | `/app/learning/course/[slug]` | Client | Authenticated Users | App layout | ❌ No | 🟡 Mock data |
| [app/api/learning/courses/[courseId]/submit/route.ts](app/api/learning/courses/[courseId]/submit/route.ts) | `POST /api/learning/courses/[id]/submit` | API | Participants | User auth + RLS | ✅ Yes (body) | ✅ Functional |
| [app/sandbox/learning/page.tsx](app/sandbox/learning/page.tsx) | `/sandbox/learning` | Client | Developers | None | ❌ No | ✅ Sandbox |
| [app/sandbox/learning/admin/page.tsx](app/sandbox/learning/admin/page.tsx) | `/sandbox/learning/admin` | Client | Developers | None | ❌ No | ✅ Prototype |
| [app/sandbox/learning/learner/page.tsx](app/sandbox/learning/learner/page.tsx) | `/sandbox/learning/learner` | Client | Developers | None | ❌ No | ✅ Prototype |

### A.2 Admin Layout Access Control

From [app/admin/layout.tsx](app/admin/layout.tsx):

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

**Evidence:** The admin layout allows both system_admin AND tenant owner/admin/editor.

### A.3 Route Truth Table

| Role | `/admin/learning` | `/admin/learning/courses` | `/admin/learning/paths` | `/admin/learning/requirements` | `/app/learning` |
|------|-------------------|---------------------------|-------------------------|-------------------------------|-----------------|
| system_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| tenant_owner | ✅ | ✅ | ✅ | ✅ | ✅ |
| tenant_admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| editor | ✅ | ✅ | ✅ | ✅ | ✅ |
| member | ❌ | ❌ | ❌ | ❌ | ✅ |

### A.4 Scope Question — CRITICAL FINDING

**Is `/admin/learning` system-admin-only?**

**NO.** The route is accessible to tenant admins (owner/admin/editor) per the layout check. However, the current UI implementation:
- Does NOT use `currentTenant` for filtering
- Displays hardcoded mock data
- Has no real CRUD operations

**Is there a tenant-scoped variant?**

**NO.** There is only one route. The design intent (per [LEARNING_MODULE_IMPLEMENTATION.md](learning/LEARNING_MODULE_IMPLEMENTATION.md)) is:
- System admins create **global** courses (tenant_id = null)
- Tenant admins create **tenant-specific** courses (tenant_id = their tenant)

**Is this feature global, tenant-scoped, or mixed?**

**HYBRID (like Achievements).** Unlike shop_items:
- `learning_courses.tenant_id` is **NULLABLE**
- `NULL` = global course visible to all tenants
- Non-NULL = tenant-specific course
- Same pattern for `learning_paths` and `learning_requirements`

---

## Section B — Navigation & IA

### B.1 Navigation Configuration

From [lib/admin/nav.ts](lib/admin/nav.ts) lines 110-117:

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
  ],
},
```

**Observations:**
- ✅ Learning is a top-level nav group (like Gamification)
- ⚠️ No `permission` key defined on any items
- ⚠️ No `systemAdminOnly` or `tenantOnly` flag
- ✅ All items visible to all admin users

### B.2 Hub Landing Page

From [app/admin/learning/page.tsx](app/admin/learning/page.tsx):

The hub page displays 4 module cards:
- **Kurser** — status: `partial`
- **Lärstigar** — status: `planned`
- **Krav & Grind** — status: `planned`
- **Rapporter** — status: `planned` (no route exists yet)

**⚠️ FINDING:** The Reports module (`/admin/learning/reports`) is linked in the hub but **no route file exists**.

### B.3 Dead Navigation Check

| Navigation Element | Status | Notes |
|--------------------|--------|-------|
| Nav sidebar → Översikt | ✅ Works | Links to hub |
| Nav sidebar → Kurser | ✅ Works | Links to mock list |
| Nav sidebar → Lärstigar | ✅ Works | Links to mock list |
| Nav sidebar → Krav & Grind | ✅ Works | Links to mock list |
| Hub → Reports card | ❌ Dead | No route file |
| Hub → Sandbox link | ✅ Works | Links to sandbox |

---

## Section C — Domain & Data Model

### C.1 Core Tables Inventory

**Migration:** [20260104000000_learning_domain.sql](supabase/migrations/20260104000000_learning_domain.sql)

#### Table: `learning_courses`

| Column | Type | Nullable | Scope | Notes |
|--------|------|----------|-------|-------|
| `id` | UUID | NO | — | Primary key |
| `tenant_id` | UUID | **YES** | Hybrid | NULL = global course |
| `slug` | TEXT | NO | — | Unique per tenant |
| `title` | TEXT | NO | — | Display name |
| `description` | TEXT | YES | — | Summary |
| `status` | TEXT | NO | — | `draft`, `active`, `archived` |
| `difficulty` | TEXT | YES | — | `beginner`, `intermediate`, `advanced`, `expert` |
| `tags` | JSONB | YES | — | Array of strings |
| `content_json` | JSONB | YES | — | Array of content sections |
| `quiz_json` | JSONB | YES | — | Array of quiz questions |
| `pass_score` | INTEGER | YES | — | Required percentage (0-100) |
| `rewards_json` | JSONB | YES | — | DiceCoin/XP/Achievement rewards |
| `duration_minutes` | INTEGER | YES | — | Estimated time |
| `version` | INTEGER | YES | — | For future invalidation |
| `created_by` | UUID | YES | — | FK to users |
| `created_at` | TIMESTAMPTZ | YES | — | |
| `updated_at` | TIMESTAMPTZ | YES | — | |

**✅ Full status lifecycle** — Unlike shop_items, courses have proper `draft/active/archived` status.

#### Table: `learning_paths`

| Column | Type | Nullable | Notes |
|--------|------|----------|-------|
| `tenant_id` | UUID | **YES** | NULL = global path |
| `slug` | TEXT | NO | Unique per tenant |
| `title` | TEXT | NO | Display name |
| `status` | TEXT | NO | `draft`, `active`, `archived` |
| `kind` | TEXT | NO | `onboarding`, `role`, `theme`, `compliance` |

#### Table: `learning_path_nodes`

Links courses to paths with position data for graph layout.

| Column | Type | Notes |
|--------|------|-------|
| `path_id` | UUID NOT NULL | FK to learning_paths |
| `course_id` | UUID NOT NULL | FK to learning_courses |
| `position_json` | JSONB | `{x, y}` for graph UI |

#### Table: `learning_path_edges`

Prerequisite connections between courses.

| Column | Type | Notes |
|--------|------|-------|
| `path_id` | UUID NOT NULL | FK to learning_paths |
| `from_course_id` | UUID NOT NULL | Prerequisite course |
| `to_course_id` | UUID NOT NULL | Unlocked course |
| `rule_json` | JSONB | `{type: "completed"}` |

#### Table: `learning_user_progress`

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID NOT NULL | FK to users |
| `tenant_id` | UUID NOT NULL | Always required (progress is tenant-scoped) |
| `course_id` | UUID NOT NULL | FK to learning_courses |
| `status` | TEXT | `not_started`, `in_progress`, `completed`, `failed` |
| `best_score` | INTEGER | Highest quiz score |
| `last_score` | INTEGER | Most recent score |
| `attempts_count` | INTEGER | Number of attempts |
| `rewards_granted_at` | TIMESTAMPTZ | **Idempotency guard** ✅ |

**⚠️ KEY DESIGN:** Progress is always tenant-scoped (`tenant_id NOT NULL`) even for global courses.

#### Table: `learning_course_attempts`

Detailed log of each quiz attempt with answers.

| Column | Type | Notes |
|--------|------|-------|
| `user_id` | UUID NOT NULL | |
| `tenant_id` | UUID NOT NULL | |
| `course_id` | UUID NOT NULL | |
| `score` | INTEGER | Quiz score |
| `passed` | BOOLEAN | Met pass_score threshold |
| `answers_json` | JSONB | User's answers |

#### Table: `learning_requirements`

Gating rules requiring course completion.

| Column | Type | Notes |
|--------|------|-------|
| `tenant_id` | UUID | **NULLABLE** — NULL = global requirement |
| `requirement_type` | TEXT | `role_unlock`, `activity_unlock`, `game_unlock`, `onboarding_required` |
| `target_ref` | JSONB | `{kind, id, name}` |
| `required_course_id` | UUID NOT NULL | Course that must be completed |
| `is_active` | BOOLEAN | Active flag |

### C.2 Scope Architecture Summary

| Table | tenant_id | Can be global? | Notes |
|-------|-----------|----------------|-------|
| `learning_courses` | NULLABLE | ✅ Yes | NULL = visible to all tenants |
| `learning_paths` | NULLABLE | ✅ Yes | NULL = visible to all tenants |
| `learning_requirements` | NULLABLE | ✅ Yes | NULL = applies to all tenants |
| `learning_user_progress` | **NOT NULL** | ❌ No | Progress is always per-tenant |
| `learning_course_attempts` | **NOT NULL** | ❌ No | Attempts are always per-tenant |
| `learning_path_nodes` | Via path | Inherits | Follows path scope |
| `learning_path_edges` | Via path | Inherits | Follows path scope |

### C.3 RLS Policies Summary

From the migration:

| Table | SELECT Policy | WRITE Policy |
|-------|--------------|--------------|
| `learning_courses` | Global visible to all; tenant-scoped visible to tenant members | System admin: all; Tenant admin: own tenant |
| `learning_paths` | Same as courses | Same as courses |
| `learning_path_nodes` | Via path relationship | System admin only |
| `learning_path_edges` | Via path relationship | System admin only |
| `learning_user_progress` | Own user OR tenant admin | Own user |
| `learning_course_attempts` | Own user OR tenant admin | Own user |
| `learning_requirements` | Global visible to all; tenant visible to tenant | System admin: all; Tenant admin: own tenant |

**✅ Well-designed hybrid RLS** — Global content visible everywhere; writes restricted by role.

### C.4 Helper Functions

| Function | Purpose | Security |
|----------|---------|----------|
| `learning_course_completed(user, tenant, course)` | Check if course is completed | SECURITY DEFINER |
| `learning_prerequisites_met(user, tenant, path, course)` | Check if prerequisites satisfied | SECURITY DEFINER |
| `learning_requirement_satisfied(user, tenant, requirement)` | Check single requirement | SECURITY DEFINER |
| `learning_get_unsatisfied_requirements(user, tenant, target_kind, target_id)` | List missing courses for gating | SECURITY DEFINER |
| `learning_grant_course_rewards_v1(user, tenant, course, attempt)` | Grant DiceCoin/XP/Achievement | SECURITY DEFINER |

---

## Section D — APIs & Server Actions

### D.1 API Routes Inventory

| File | Method | Purpose | Auth Model | Tenant Validation | Status |
|------|--------|---------|------------|-------------------|--------|
| [app/api/learning/courses/[courseId]/submit/route.ts](app/api/learning/courses/[courseId]/submit/route.ts) | POST | Submit quiz answers | User auth + RLS | ✅ In body | ✅ Functional |
| [app/api/learning/courses/[courseId]/submit/route.ts](app/api/learning/courses/[courseId]/submit/route.ts) | GET | Get user progress | User auth + RLS | ✅ Query param | ✅ Functional |

**⚠️ MISSING APIs:**
- `GET /api/learning/courses` — List courses
- `POST /api/learning/courses` — Create course
- `PATCH /api/learning/courses/[id]` — Update course
- `DELETE /api/learning/courses/[id]` — Archive course
- All path CRUD endpoints
- All requirement CRUD endpoints

### D.2 Server Actions Inventory

#### File: [app/actions/learning.ts](app/actions/learning.ts) (324 lines)

| Function | Purpose | Admin CRUD? |
|----------|---------|-------------|
| `startCourseAttempt` | Create new attempt | ❌ Participant |
| `submitQuizAnswers` | Submit and grade quiz | ❌ Participant |
| `getCourseProgress` | Get user's course progress | ❌ Participant |
| `getAllCourseProgress` | Get all progress for user | ❌ Participant |
| `checkPrerequisites` | Check if course prerequisites met | ❌ Participant |

#### File: [app/actions/learning-requirements.ts](app/actions/learning-requirements.ts) (214 lines)

| Function | Purpose | Admin CRUD? |
|----------|---------|-------------|
| `checkRequirements` | Check if target is unlocked | ❌ Gating check |
| `getRequirementsForTarget` | Get requirements for target | ❌ Read |
| `createRequirement` | Create new requirement | ✅ Admin |
| `deleteRequirement` | Delete requirement | ✅ Admin |
| `toggleRequirementActive` | Toggle active status | ✅ Admin |

### D.3 Server Actions Status

**⚠️ NO ADMIN CRUD SERVER ACTIONS FOR COURSES/PATHS**

Achievements has:
- `app/actions/achievements-admin.ts` (594 lines)
- `app/actions/tenant-achievements-admin.ts` (568 lines)

Learning has:
- `app/actions/learning.ts` — **Participant actions only**
- `app/actions/learning-requirements.ts` — Partial admin (requirements only)

**Missing admin actions:**
- `createCourse`, `updateCourse`, `deleteCourse`, `listCourses`
- `createPath`, `updatePath`, `deletePath`, `listPaths`
- `addPathNode`, `removePathNode`, `updatePathNode`
- `addPathEdge`, `removePathEdge`

---

## Section E — Admin UI Reality

### E.1 Hub Page (`/admin/learning`)

| Feature | Implemented | Real data | Tenant-aware | Notes |
|---------|-------------|-----------|--------------|-------|
| Module cards | ✅ Yes | ❌ No (hardcoded) | ❌ No | Static status badges |
| Quick stats | ✅ Yes | ❌ No (hardcoded) | ❌ No | Hardcoded numbers |
| Sandbox link | ✅ Yes | N/A | N/A | Works |

**Status:** Functional UI shell with no database connection.

### E.2 Courses Page (`/admin/learning/courses`)

| Feature | Implemented | Real data | Notes |
|---------|-------------|-----------|-------|
| Course list | ✅ Yes | ❌ Mock | 3 hardcoded courses |
| Stats row | ✅ Yes | ❌ Mock | Calculated from mock |
| Status badges | ✅ Yes | ❌ Mock | draft/published/archived |
| Create button | ✅ Yes | ❌ No handler | `onClick: none` |
| Edit button | ✅ Yes | ❌ No handler | Icon only |
| Delete button | ✅ Yes | ❌ No handler | Icon only |
| CRUD drawer | ❌ No | — | Missing entirely |
| Pagination | ❌ No | — | Mock data |
| Search | ❌ No | — | Not implemented |
| Tenant filter | ❌ No | — | No useTenant hook |

### E.3 Paths Page (`/admin/learning/paths`)

| Feature | Implemented | Real data | Notes |
|---------|-------------|-----------|-------|
| Path list | ✅ Yes | ❌ Mock | 2 hardcoded paths |
| Course flow visualization | ✅ Yes | ❌ Mock | Nice inline chips |
| Stats cards | ✅ Yes | ❌ Mock | Calculated from mock |
| Create button | ✅ Yes | ❌ No handler | |
| Edit button | ✅ Yes | ❌ No handler | |
| Delete button | ✅ Yes | ❌ No handler | |
| Graph editor | ❌ No | — | Critical missing feature |

### E.4 Requirements Page (`/admin/learning/requirements`)

| Feature | Implemented | Real data | Notes |
|---------|-------------|-----------|-------|
| Requirements list | ✅ Yes | ❌ Mock | 3 hardcoded requirements |
| Type badges | ✅ Yes | ❌ Mock | game_access, role_requirement, activity_gate |
| Active toggle | ✅ Yes | ⚠️ Local state | Works but no persistence |
| Delete button | ✅ Yes | ⚠️ Local state | Works but no persistence |
| Create button | ✅ Yes | ❌ No handler | |
| Info card | ✅ Yes | N/A | Nice explainer |

### E.5 UX Gaps vs Achievements Admin

| Pattern | Achievements | Learning | Gap |
|---------|--------------|----------|-----|
| Real data | ✅ Server actions | ❌ Mock data | 🔴 Critical |
| CRUD drawer | ✅ `AchievementEditorDrawer` | ❌ None | 🔴 Critical |
| Status workflow | ✅ draft/active/archived | ✅ Schema ready | 🟢 OK |
| Tenant selector | ✅ System admin can filter | ❌ Not implemented | 🟡 Missing |
| Pagination | ✅ Server-side | ❌ None (mock) | 🔴 Critical |
| Server actions | ✅ 2 files (1162 lines) | ⚠️ Partial (requirements only) | 🔴 Critical |
| Scope toggle | ✅ Global vs tenant | ❌ Not implemented | 🟡 Missing |

---

## Section F — Participant Learning Flow

### F.1 Current Implementation Status

| Feature | Status | Evidence |
|---------|--------|----------|
| Dashboard page | 🟡 Mock | `/app/learning` uses hardcoded data |
| Course runner | 🟡 Mock | `/app/learning/course/[slug]` uses hardcoded course |
| Quiz submission | ✅ API ready | `POST /api/learning/courses/[id]/submit` |
| Progress tracking | ✅ Server actions ready | `startCourseAttempt`, `submitQuizAnswers` |
| Reward payout | ✅ RPC ready | `learning_grant_course_rewards_v1` |
| Gating hook | ✅ Ready | `useRequirementGate` in lib/learning |
| Gating modal | ✅ Ready | `TrainingRequiredModal` component |

### F.2 Sandbox Prototypes

| Page | Purpose | Status |
|------|---------|--------|
| `/sandbox/learning/admin` | Admin UI prototype | ✅ Functional with mock CRUD |
| `/sandbox/learning/learner` | Learner UI prototype | ✅ Functional course runner |

**✅ The sandbox is MORE complete than production UI** — has working mock CRUD and course runner.

### F.3 Entry Points to Learning

| Source | Link | Status |
|--------|------|--------|
| App dashboard | `/app/learning` | 🟡 Mock data |
| Admin hub | `/admin/learning` | ✅ Static hub |
| Gamification page | No direct link | ❌ Missing |

### F.4 Gamification Integration

From [20260104100000_learning_rewards_v1.sql](supabase/migrations/20260104100000_learning_rewards_v1.sql):

| Reward Type | Integration | Status |
|-------------|-------------|--------|
| DiceCoin | `apply_coin_transaction_v1` | ✅ Ready |
| XP | `apply_xp_transaction_v1` | ✅ Ready |
| Achievements | Insert into `user_achievements` | ✅ Ready |
| Level Up | Calculated in XP function | ✅ Ready |

**✅ Full gamification integration is in place** — courses can reward all currencies.

---

## Section G — Cross-Domain Dependencies

### G.1 Dependencies FROM Learning

| Domain | Dependency | Type | Notes |
|--------|------------|------|-------|
| **Users** | `users.id` | FK | Created_by, user progress |
| **Tenants** | `tenants.id` | FK | Tenant scoping |
| **Gamification/Coins** | `apply_coin_transaction_v1` | RPC | Reward payout |
| **Gamification/XP** | `apply_xp_transaction_v1` | RPC | Reward payout |
| **Achievements** | `user_achievements` | Table | Achievement unlock |
| **Gamification/Levels** | `gamification_level_definitions` | Table | Level-up thresholds |
| **User Progress** | `user_progress` | Table | XP storage |

### G.2 Dependencies TO Learning

| Domain | Uses Learning | How |
|--------|---------------|-----|
| **Games** | Game gating | `learning_requirements.requirement_type = 'game_unlock'` |
| **Activities** | Activity gating | `learning_requirements.requirement_type = 'activity_unlock'` |
| **Roles** | Role prerequisites | `learning_requirements.requirement_type = 'role_unlock'` |
| **Sessions** | Onboarding | `learning_requirements.requirement_type = 'onboarding_required'` |

### G.3 Circular Dependencies

**None detected.** Learning is a leaf dependency — it consumes gamification services but is not consumed by them.

### G.4 Integration Status

| Integration | Schema Ready | Code Ready | Production |
|-------------|--------------|------------|------------|
| Course → DiceCoin reward | ✅ | ✅ | ✅ |
| Course → XP reward | ✅ | ✅ | ✅ |
| Course → Achievement unlock | ✅ | ✅ | ✅ |
| Game gating → Course requirement | ✅ | ✅ | ❌ No UI |
| Role gating → Course requirement | ✅ | ✅ | ❌ No UI |

---

## Section H — Risk & Decision Matrix

### Option A: Global Courses Only (System Admin Creates)

**Description:** Only system admin can create courses. All tenants see the same catalog.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟢 Low — Centralized control |
| Complexity | 🟢 Low — No tenant filtering in admin |
| Alignment with schema | 🔴 Low — Schema supports tenant courses |
| Migration impact | 🟡 Medium — Would waste nullable tenant_id |

**Pros:**
- Simplest admin UI
- Consistent training across tenants
- No scope confusion

**Cons:**
- Tenants can't customize training
- Doesn't use schema's hybrid capability
- May not fit all business models

### Option B: Tenant Courses Only (No Global)

**Description:** Each tenant creates and manages their own courses. No global catalog.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟢 Low — RLS enforces isolation |
| Complexity | 🟡 Medium — Admin must filter by tenant |
| Alignment with schema | 🟡 Medium — Would ignore nullable tenant_id |
| Migration impact | 🟢 Low — No schema change needed |

**Pros:**
- Full tenant autonomy
- No scope confusion
- Simple RLS

**Cons:**
- Duplicated effort across tenants
- No shared best practices
- Each tenant starts from scratch

### Option C: Hybrid (Recommended by Schema)

**Description:** System admin creates global courses (tenant_id = null); tenant admins can create tenant-specific courses. Tenants see both.

| Factor | Assessment |
|--------|------------|
| Security Risk | 🟡 Medium — Need careful global vs tenant UX |
| Complexity | 🟡 Medium — Admin needs scope toggle |
| Alignment with schema | 🟢 High — Exactly what schema supports |
| Migration impact | 🟢 None — Schema already designed for this |

**Pros:**
- Matches schema design
- Global templates + tenant customization
- Flexible for different business models

**Cons:**
- More complex admin UI
- Potential scope confusion
- Need clear visual distinction

### Recommendation

**Option C (Hybrid)** is the clear choice:
- Schema is already designed for hybrid
- Matches Achievements pattern
- Provides most flexibility
- Aligns with LEARNING_MODULE_IMPLEMENTATION.md

---

## Section I — Phase 1 Constraints Contract

### MUST NOT Change

| Item | Reason |
|------|--------|
| `learning_courses.tenant_id` nullable | Intentional hybrid design |
| `learning_user_progress.tenant_id` NOT NULL | Progress must be tenant-scoped |
| Quiz grading logic in API | Working, battle-tested |
| Reward payout RPC | Working, idempotent |
| RLS policies on learning tables | Already correct |
| Gating hook (`useRequirementGate`) | Working component |

### CAN Be Changed (No Migration)

| Item | Scope |
|------|-------|
| Admin UI (all pages) | Full rewrite allowed |
| Mock data removal | Required |
| Add admin server actions | New file(s) |
| Navigation labels | Cosmetic changes |
| Sandbox content | Development only |

### REQUIRES Migration

| Item | Impact | Priority |
|------|--------|----------|
| None identified | — | — |

**✅ Schema is production-ready** — No migrations needed for Phase 1.

### REQUIRES Product Decision

| Decision | Options | Blocker For |
|----------|---------|-------------|
| Course editor scope | Global only vs hybrid | Admin UI design |
| Tenant selector visibility | System admin only vs all admins | Navigation logic |
| Path graph editor | Drag-drop vs form-based | Paths page |
| Reports page | Build vs defer | Navigation |
| Certificates | Implement vs defer | Phase 2+ |
| Video content | Support vs text-only | Course editor |

---

## Appendix: File References

### Admin UI
- [app/admin/learning/page.tsx](app/admin/learning/page.tsx) — Hub page
- [app/admin/learning/courses/page.tsx](app/admin/learning/courses/page.tsx) — Courses list (mock)
- [app/admin/learning/paths/page.tsx](app/admin/learning/paths/page.tsx) — Paths list (mock)
- [app/admin/learning/requirements/page.tsx](app/admin/learning/requirements/page.tsx) — Requirements list (mock)

### Participant UI
- [app/app/learning/page.tsx](app/app/learning/page.tsx) — Learning dashboard (mock)
- [app/app/learning/course/[slug]/page.tsx](app/app/learning/course/[slug]/page.tsx) — Course runner (mock)

### APIs
- [app/api/learning/courses/[courseId]/submit/route.ts](app/api/learning/courses/[courseId]/submit/route.ts) — Quiz submission

### Server Actions
- [app/actions/learning.ts](app/actions/learning.ts) — Participant progress actions
- [app/actions/learning-requirements.ts](app/actions/learning-requirements.ts) — Gating + partial admin

### Database
- [supabase/migrations/20260104000000_learning_domain.sql](supabase/migrations/20260104000000_learning_domain.sql) — Core schema
- [supabase/migrations/20260104100000_learning_rewards_v1.sql](supabase/migrations/20260104100000_learning_rewards_v1.sql) — Reward integration

### Types
- [types/learning.ts](types/learning.ts) — TypeScript types

### Library
- [lib/learning/index.ts](lib/learning/index.ts) — Module exports
- [lib/learning/useRequirementGate.ts](lib/learning/useRequirementGate.ts) — Gating hook
- [components/learning/TrainingRequired.tsx](components/learning/TrainingRequired.tsx) — Gating modal

### Navigation
- [lib/admin/nav.ts](lib/admin/nav.ts) — Nav config

### Documentation
- [docs/learning/LEARNING_MODULE_IMPLEMENTATION.md](docs/learning/LEARNING_MODULE_IMPLEMENTATION.md) — Design doc
- [docs/learning/LEARNING_TEST_PLAN.md](docs/learning/LEARNING_TEST_PLAN.md) — Test plan

### Comparable Feature (Achievements)
- [app/actions/achievements-admin.ts](app/actions/achievements-admin.ts) — Admin CRUD pattern

---

## Summary: "What risks if we build now?"

### 🔴 High Risk — Cementing Wrong Patterns

1. **Admin CRUD without server actions**: If we build admin UI with direct API calls (like legacy shop), we'll create technical debt.
   - **Action:** Create `app/actions/learning-admin.ts` following achievements pattern FIRST.

2. **Ignoring hybrid scope in UI**: If we build without tenant selector, system admin features will be inaccessible.
   - **Action:** Implement scope toggle in course editor before building CRUD.

3. **Mock data as placeholder**: If we ship mock data to production, users will see fake courses.
   - **Action:** Replace mock data with real DB queries before any production deployment.

### 🟡 Medium Risk — Incomplete Features

1. **Reports page**: Hub links to non-existent route. Users will see 404.
   - **Action:** Either create placeholder or remove from hub.

2. **Path graph editor**: Complex feature with no implementation. Could become scope creep.
   - **Action:** Define MVP (form-based) vs future (drag-drop) before starting.

3. **Participant UI uses mock data**: `/app/learning` shows hardcoded courses.
   - **Action:** Decide if participant UI is in Phase 1 scope.

### 🟢 Low Risk — Already Solid

1. **Database schema**: Complete and matches design docs.
2. **RLS policies**: Properly configured for hybrid scope.
3. **Gamification integration**: Reward payout is production-ready.
4. **Gating system**: Hook and modal are ready to use.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-10 | Initial Phase 0 analysis |
