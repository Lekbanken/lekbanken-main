# Learning Module Implementation Guide

## 1. Vision & Scope

### Overview
The **Lekledarutbildning** (Game Leader Training) module provides enterprise-grade course training for game leaders within Lekbanken. It enables:

- Structured learning paths with prerequisite-based progression
- Text + quiz courses with automatic grading
- Reward integration (DiceCoin, XP, Achievements)
- Gating rules for activities and roles
- Multi-tenant isolation with RLS

### Target Users
- **Lekledare (Game Leaders)**: View learning journey, complete courses, earn rewards
- **Tenant Admins**: Assign mandatory training, view reports, manage requirements
- **System Admins**: Create global courses/paths, configure system-wide requirements

### Non-Goals (v1)
- Video/SCORM content
- Complex AND/OR unlock logic
- Certification/badge printing
- Full LMS features (assignments, discussions)

---

## 2. Data Model

### Tables Overview

```
┌─────────────────────┐     ┌─────────────────────┐
│  learning_courses   │◄────│  learning_path_nodes │
└─────────────────────┘     └─────────────────────┘
         ▲                           │
         │                           ▼
         │                  ┌─────────────────────┐
         │                  │   learning_paths    │
         │                  └─────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────────┐     ┌─────────────────────┐
│ learning_path_edges │     │learning_requirements│
└─────────────────────┘     └─────────────────────┘
         │
         ▼
┌─────────────────────┐     ┌─────────────────────┐
│learning_user_progress│◄───│learning_course_attempts│
└─────────────────────┘     └─────────────────────┘
```

### Table Definitions

#### `learning_courses`
Central content storage for courses.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid? | Null = global course |
| slug | text | URL-friendly identifier |
| title | text | Display name |
| description | text | Summary |
| status | enum | draft/active/archived |
| difficulty | enum | beginner/intermediate/advanced/expert |
| tags | jsonb | Array of tag strings |
| content_json | jsonb | Array of content sections |
| quiz_json | jsonb | Array of quiz questions |
| pass_score | int | Required percentage (0-100) |
| rewards_json | jsonb | DiceCoin/XP/Achievement rewards |
| duration_minutes | int | Estimated time |
| version | int | For future invalidation |

#### `learning_paths`
Container for course graphs.

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| tenant_id | uuid? | Null = global path |
| slug | text | URL-friendly identifier |
| title | text | Display name |
| kind | enum | onboarding/role/theme/compliance |
| status | enum | draft/active/archived |

#### `learning_path_nodes`
Links courses to paths with position.

| Column | Type | Description |
|--------|------|-------------|
| path_id | uuid | FK to learning_paths |
| course_id | uuid | FK to learning_courses |
| position_json | jsonb | {x, y} for graph layout |

#### `learning_path_edges`
Prerequisite connections.

| Column | Type | Description |
|--------|------|-------------|
| path_id | uuid | FK to learning_paths |
| from_course_id | uuid | Prerequisite course |
| to_course_id | uuid | Unlocked course |
| rule_json | jsonb | {type: "completed"} |

#### `learning_user_progress`
User's progress per course.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to users |
| tenant_id | uuid | FK to tenants |
| course_id | uuid | FK to learning_courses |
| status | enum | not_started/in_progress/completed/failed |
| best_score | int | Highest quiz score |
| attempts_count | int | Number of attempts |
| rewards_granted_at | timestamptz | Idempotency guard |

#### `learning_course_attempts`
Individual attempt logs.

| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | FK to users |
| course_id | uuid | FK to learning_courses |
| score | int | Quiz score |
| passed | bool | Met pass_score threshold |
| answers_json | jsonb | User's answers |

#### `learning_requirements`
Gating rules.

| Column | Type | Description |
|--------|------|-------------|
| tenant_id | uuid? | Null = global requirement |
| requirement_type | enum | role_unlock/activity_unlock/game_unlock/onboarding_required |
| target_ref | jsonb | {kind, id, name} |
| required_course_id | uuid | Course that must be completed |

---

## 3. Routes & Navigation

### Admin Routes
```
/admin/learning                   # Hub overview
/admin/learning/courses           # Course list
/admin/learning/courses/new       # Create course
/admin/learning/courses/[id]      # Edit course
/admin/learning/paths             # Path list
/admin/learning/paths/new         # Create path
/admin/learning/paths/[id]        # Edit path + node/edge builder
/admin/learning/requirements      # Requirement rules list
```

### Learner Routes (App)
```
/app/learning                     # My learning journey
/app/learning/path/[pathId]       # Path graph view
/app/learning/course/[courseId]   # Course runner
```

### Sandbox Routes (Development)
```
/sandbox/learning                 # Learning sandbox hub
/sandbox/learning/admin           # Admin UI preview
/sandbox/learning/learner         # Learner UI preview
```

---

## 4. Reward & Gating Flows

### Reward Payout Flow
```
1. User submits quiz
2. Server calculates score
3. If score >= pass_score:
   a. Update learning_user_progress.status = 'completed'
   b. Check rewards_granted_at (idempotency)
   c. If null:
      - Grant DiceCoin via ledger insert
      - Grant XP via ledger insert
      - Unlock achievement if specified
      - Set rewards_granted_at = now()
   d. Return success + rewards summary
4. If score < pass_score:
   a. Update status = 'failed'
   b. Allow retry
```

### Gating Check Flow
```
1. User attempts to start game/activity
2. Server calls learning_get_unsatisfied_requirements()
3. If any unsatisfied requirements:
   a. Return 403 with list of required courses
   b. UI shows "Complete X training first"
4. If all satisfied:
   a. Allow action to proceed
```

---

## 5. API/RPC Endpoints

### Courses
- `GET /api/learning/courses` - List courses (filtered by tenant)
- `POST /api/learning/courses` - Create course
- `PATCH /api/learning/courses/[id]` - Update course
- `DELETE /api/learning/courses/[id]` - Archive course

### Paths
- `GET /api/learning/paths` - List paths
- `POST /api/learning/paths` - Create path
- `PATCH /api/learning/paths/[id]` - Update path
- `POST /api/learning/paths/[id]/nodes` - Add node
- `POST /api/learning/paths/[id]/edges` - Add edge

### Progress
- `GET /api/learning/progress` - Get user's progress
- `POST /api/learning/courses/[id]/start` - Start attempt
- `POST /api/learning/courses/[id]/submit` - Submit quiz

### Requirements
- `GET /api/learning/requirements` - List requirements
- `POST /api/learning/requirements` - Create requirement
- `GET /api/learning/requirements/check` - Check if target is unlocked

### Supabase RPC Functions
- `learning_course_completed(user_id, tenant_id, course_id)` → boolean
- `learning_prerequisites_met(user_id, tenant_id, path_id, course_id)` → boolean
- `learning_requirement_satisfied(user_id, tenant_id, requirement_id)` → boolean
- `learning_get_unsatisfied_requirements(user_id, tenant_id, target_kind, target_id)` → table

---

## 6. Decisions Log (ADR-style)

### ADR-001: JSON Content Storage
**Decision**: Store course content and quiz as JSONB columns.
**Rationale**: Simpler than normalized tables for v1. Allows flexible schema evolution. Easy to migrate to artifacts later.
**Trade-offs**: Harder to query individual questions. No FK constraints on content.

### ADR-002: Simple Edge Rules
**Decision**: v1 uses only "completed" rule type for edges.
**Rationale**: Covers 90% of use cases. AND/OR logic adds complexity without immediate value.
**Future**: Add rule_json.type = "and" | "or" with nested conditions.

### ADR-003: Tenant-Scoped Progress
**Decision**: Progress is scoped to (user_id, tenant_id, course_id).
**Rationale**: Allows same user to have different progress in different tenants. Important for consultants/freelancers.

### ADR-004: Idempotent Rewards
**Decision**: Use rewards_granted_at timestamp to prevent double payouts.
**Rationale**: Simple and reliable. Alternative: separate rewards_ledger table with FK.

### ADR-005: Sandbox-First Development
**Decision**: Build UI in sandbox before connecting to live routes.
**Rationale**: Faster iteration with mock data. Easier to validate design patterns.

---

## 7. Test Plan

See `docs/LEARNING_TEST_PLAN.md` for detailed test cases.

### Key Acceptance Criteria
- [ ] System admin can create course with quiz
- [ ] System admin can create path with nodes and edges
- [ ] Learner sees unlocked/locked states in path view
- [ ] Learner completes quiz and receives rewards once
- [ ] Completion unlocks next course in path
- [ ] Requirement blocks starting restricted activity
- [ ] Multi-tenant isolation verified

---

## 8. TODO Backlog

### P0 - MVP
- [x] Database migration
- [x] TypeScript types
- [ ] Sandbox admin UI (courses list, editor)
- [ ] Sandbox learner UI (path view, course runner)
- [ ] API endpoints for CRUD
- [ ] Quiz grading logic
- [ ] Reward payout with idempotency

### P1 - Post-MVP
- [ ] Path graph visual editor (drag/drop)
- [ ] Bulk import courses from CSV
- [ ] Completion reports for tenant admins
- [ ] Email notifications on course unlock
- [ ] Course versioning with invalidation

### P2 - Future
- [ ] Video content sections
- [ ] AND/OR unlock rules
- [ ] Certificate generation
- [ ] SCORM import
- [ ] Mobile-optimized course runner

---

## File Inventory

### Created Files
- `supabase/migrations/20260104000000_learning_domain.sql`
- `types/learning.ts`
- `docs/LEARNING_MODULE_IMPLEMENTATION.md`
- `docs/LEARNING_TEST_PLAN.md`

### To Be Created
- `app/sandbox/learning/page.tsx`
- `app/sandbox/learning/admin/page.tsx`
- `app/sandbox/learning/learner/page.tsx`
- `components/sandbox/learning/*`
- `app/admin/learning/*`
- `app/app/learning/*`
- `lib/learning/*`
