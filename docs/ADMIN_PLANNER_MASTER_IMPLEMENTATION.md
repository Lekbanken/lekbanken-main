# Admin Planner Master Implementation

## Goals and scope
- Replace the incorrect /admin/content "Content Planner" page with a real Admin Planner surface.
- Use existing Planner domain endpoints and capability rules.
- Keep Admin IA clean: add a Planner entry and retire /admin/content (redirect).
- No new business logic, no new data models, no new backend domains.

## Current state (inventory)
### Routes and pages
- /admin/content: app/admin/content/page.tsx
  - Redirects to /admin/planner.
- /admin/planner: app/admin/planner/page.tsx
  - List view with scope toggle (tenant/global), search, status/visibility filters, and sort.
  - Uses /api/plans/search; filters status/visibility client-side.
  - Actions gated by planner capabilities (publish, visibility, delete).
- /admin/planner/[planId]: app/admin/planner/[planId]/page.tsx
  - Detail view with status, visibility, metadata, blocks, and versions summary.
- /admin/planner/[planId]/versions: app/admin/planner/[planId]/versions/page.tsx
  - Versions list sourced from /api/plans/[planId]/versions.
- /admin/tenant/[tenantId]/content: app/admin/tenant/[tenantId]/content/page.tsx
  - Uses contentService.getContentItems for tenant library (read-only listing).
- /app/planner: app/app/planner/page.tsx -> features/planner/PlannerPage (full authoring UI).
- /app/planner/[planId]: app/app/planner/[planId]/page.tsx -> PlanOverview (read-only detail).

### Planner domain (UI + API)
- Features: features/planner/*
  - PlannerPage, PlanListPanel, PlanHeaderBar, PlanOverview, BlockList, VersionsDialog, etc.
- Types: types/planner.ts
- API routes:
  - /api/plans (create)
  - /api/plans/search (list + pagination + capabilities)
  - /api/plans/[planId] (get/update/delete + capabilities)
  - /api/plans/[planId]/publish
  - /api/plans/[planId]/visibility
  - /api/plans/[planId]/versions
  - /api/plans/[planId]/blocks/*, notes, play, progress

### Admin navigation and RBAC
- Admin nav:
  - app/admin/components/admin-nav-config.tsx includes /admin/planner under "Innehall" with permission admin.planner.list.
  - app/admin/components/admin-nav-items.tsx includes /admin/planner.
- RBAC:
  - features/admin/shared/hooks/useRbac.ts defines admin.content.* + admin.planner.list.
  - getNavPermission maps /admin/planner -> admin.planner.list.
- Admin guard:
  - app/admin/layout.tsx only allows system_admin or tenant owner/admin/editor.

### Sandbox
- app/sandbox/admin/content/page.tsx and app/sandbox/config/sandbox-modules.ts reference /admin/content.

## Target IA and routing (decision)
- /admin/planner: Admin Planner list view (library + governance).
- /admin/planner/[planId]: Admin Planner detail view (inspection + actions).
- /admin/planner/[planId]/versions: versions list.
- /admin/content: redirect to /admin/planner (keep old links working).

## Permissions / RBAC model
- system_admin:
  - Can see global and tenant scopes.
  - Can publish and set visibility public if capabilities allow.
- tenant_admin (owner/admin via membership):
  - Can see and manage tenant scope plans.
- tenant_editor:
  - Read-only or limited based on existing planner capabilities (no new rules).
- All actions must be gated by capabilities returned from planner APIs.

## Checklist / acceptance criteria
- [x] /admin/content no longer shows Content Planner; redirect to /admin/planner.
- [x] /admin/planner list view exists with search/filter/sort and empty/loading/error states.
- [x] /admin/planner/[planId] detail view exists with status, visibility, metadata, blocks, versions.
- [x] Actions are gated by planner capabilities and RBAC.
- [x] Admin nav includes Planner entry and removes Content entry.
- [x] Docs updated for routing, permissions, and decisions.

## Implementation plan (patch steps)
1) Add living spec updates (this file) after each routing/nav/auth/data change.
2) Replace /admin/content with a server redirect to /admin/planner.
3) Add /admin/planner list route and page shell.
   - Use /api/plans/search with tenantId/visibility filters.
   - Show tabs for Global vs Tenant (global only for system_admin).
4) Add /admin/planner/[planId] detail route.
   - Fetch /api/plans/[planId].
   - Reuse PlanOverview or create admin read-only panels (blocks, metadata, versions).
5) Add /admin/planner/[planId]/versions route using /api/plans/[planId]/versions.
6) Update admin nav and RBAC:
   - Replace /admin/content with /admin/planner.
   - Add planner permissions to useRbac + getNavPermission.
7) Update sandbox references to /admin/planner (optional but recommended).
8) Validate: typecheck + lint + manual admin flows.

## Change log
- 2026-01-03: Initial inventory and implementation plan drafted.
- 2026-01-03: Replaced /admin/content with redirect to /admin/planner.
- 2026-01-03: Added /admin/planner list/detail/versions routes and wired to planner APIs.
- 2026-01-03: Updated admin nav + RBAC to use admin.planner.list.

## Open questions / risks
- /api/plans/search behavior: global scope uses visibility=public; confirm if system_admin should see all plans vs public-only.
- Confirm whether tenant_editor should see planner admin list or read-only detail.
- Sandbox still references /admin/content (optional cleanup).
