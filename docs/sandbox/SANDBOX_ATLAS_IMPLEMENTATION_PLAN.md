# Sandbox Atlas Implementation Plan

Date: 2026-01-10
Status: Draft (review before build)
Owner: TBD

## Context (observations from /sandbox)
- /sandbox is dev-only and gated by app/sandbox/layout.tsx (notFound in production).
- Sandbox UI uses SandboxShellV2 with ModuleNavV2 on the left and ContextPanel on the right.
- Module navigation is driven by app/sandbox/config/sandbox-modules.ts.
- Module notes are driven by app/sandbox/config/module-notes.ts.
- ViewportFrame inside SandboxShellV2 constrains the content area to max-w-5xl.
- Sandbox docs are rendered from sandbox/wiki and docs/ via /sandbox/docs/*.

## Goal
Build an enterprise-grade Atlas UI inside /sandbox that visualizes UX frames and system connections,
with filters, modes, and an inspector, while staying consistent with existing sandbox patterns.

## MVP Scope
- New route: /sandbox/atlas (dev-only, sandbox shell).
- Registry-driven data model for Frames, Components, Tables, Endpoints, and Edges.
- Filters: domain, role, route, table/view, status (derived).
- Modes: UX, Data, Quality (toggle how the graph is filtered and annotated).
- Inspector for selected node in the Sandbox ContextPanel (avoid double right panels).
- Review metadata per frame + global last system sync timestamp (stub).
- Search and keyboard shortcuts (/, esc, ?).

## Out of Scope (MVP)
- Auto-discovery of routes, endpoints, or DB schema.
- Full graph layout engine for thousands of nodes.
- Real-time sync with repo changes.
- Role-based access checks (sandbox is dev-only).

## Phase 0 Decisions (locked by GPT feedback)
1) Primary user
   - MVP primary user: Tech lead / product development.
   - Default mode: Data Mode.
   - Default filters: Domain = Admin + Games (for quick signal).
   - Default sort/priority: needs_review highest.
2) Frame definition
   - Frame = a route screen (1:1 with a route). Components are separate nodes.
   - Frames always require a route.
3) Review scope
   - Multi-flag review on Frame: ux_reviewed, data_linked, rls_checked.
   - Derived status:
     - complete = all true
     - partial = any true
     - missing = all false
   - Filter by derived status; Inspector shows all three flags.
4) Content width strategy
   - Add a full-width option to SandboxShellV2 for Atlas.

## Improvements (enterprise feel without extra complexity)
- Source-of-truth visibility: clearly separate Manual layer (notes/review flags) vs Auto layer (sync stamp).
- Soft node cap: show a focus CTA when too many nodes (suggest filters instead of a hard block).
- Edge legend + mode definitions: small legend popover in toolbar.
- Keyboard help: add ? to open a shortcuts/legend popover.
- fileRef on Frame: include fileRef for frames so Inspector is useful before auto-discovery.

## Information Model (MVP)
Entity types
- Frame: id, name, route, domain, roles[], components[], reads[], writes[], endpoints[], tags[], owner?, notes?, reviewFlags, lastReviewedAt?, fileRef?
- Component: id, name, fileRef?
- Table: id, name, schema?, description?
- Endpoint: id, method?, path, description?, fileRef?
- Edge: fromType, fromId, toType, toId, relation (navigates|reads|writes|uses|calls|emits)

Metadata
- Global: lastSystemSyncAt (localStorage or zustand persist), systemSyncSource (optional).
- Per frame: reviewFlags (ux_reviewed, data_linked, rls_checked), lastReviewedAt, notes.

## UX Layout (Atlas Page)
- Use SandboxShellV2 for left nav and right ContextPanel.
- Main content inside the page:
  - Left: Filter panel (collapsible on mobile).
  - Center: Graph canvas + mode toggle + search.
- Inspector renders inside the Sandbox ContextPanel to avoid a "right panel inside right panel".
- Add a full-width option for Atlas to prevent a cramped canvas.
- Mobile: filters and inspector accessible via collapsible/drawer behaviors.

## Technical Plan (Phases)

Phase 0 - Preflight decisions
- Confirm locked decisions above.
- Decide exact default filter values (Admin + Games) and domain list.

Phase 1 - Route and navigation registration
- Add /sandbox/atlas page scaffold.
- Register Atlas in app/sandbox/config/sandbox-modules.ts.
- Add module notes in app/sandbox/config/module-notes.ts.

Phase 2 - Registry and types
- Create app/sandbox/atlas/registry.ts with sample data (8-12 frames, 6-10 tables, 6-10 endpoints, 10-20 edges).
- Add app/sandbox/atlas/types.ts for strict types (no any).
- Add TODO markers for future automation hooks (route discovery, schema extraction).

Phase 3 - Atlas UI skeleton
- app/sandbox/atlas/page.tsx renders SandboxShellV2 with Atlas content.
- Create components:
  - AtlasToolbar (mode toggle, sync button, search, legend/help)
  - AtlasFilters
  - AtlasCanvas
  - AtlasInspector (renders in ContextPanel)
- Implement deterministic SVG layout:
  - Columns per node type (Frames, Components, Endpoints, Tables)
  - Y-position by sorted order
  - Edges as lines or simple bezier curves

Phase 4 - Interactions and state
- Selection state (click node -> inspector updates).
- Filter state (domain/role/route/table/status).
- Mode state (UX/Data/Quality).
- Keyboard shortcuts: / focuses search, esc clears selection, ? opens help.

Phase 5 - Persistence and review actions
- Add app/sandbox/atlas/store/atlas-store.ts using zustand + persist with versioning.
- Store: lastSystemSyncAt, review flags per frame, notes per frame.
- Add actions: markReviewed, toggleReviewFlag, addNote, syncSystemMap (stub).

Phase 6 - Performance and scale
- Memoize derived graph data.
- Soft cap for visible nodes; show warning + focus CTA when > 150 nodes.
- Use list virtualization for long filter lists (if needed).

Phase 7 - QA and polish
- Verify responsive layout and no crashes with empty registry.
- Confirm localStorage persistence works across reload.
- Confirm sandbox nav entry works and module notes render.

## Proposed File Map
- app/sandbox/atlas/page.tsx (new)
- app/sandbox/atlas/types.ts (new)
- app/sandbox/atlas/registry.ts (new)
- app/sandbox/atlas/store/atlas-store.ts (new)
- app/sandbox/atlas/components/AtlasToolbar.tsx (new)
- app/sandbox/atlas/components/AtlasFilters.tsx (new)
- app/sandbox/atlas/components/AtlasCanvas.tsx (new)
- app/sandbox/atlas/components/AtlasInspector.tsx (new; rendered in ContextPanel)
- app/sandbox/config/sandbox-modules.ts (add module entry)
- app/sandbox/config/module-notes.ts (add module notes)
- app/sandbox/components/shell/SandboxShellV2.tsx (add full-width option)
- app/sandbox/components/shell/ContextPanel.tsx (optional: allow custom context content)

## Testing Checklist (manual)
- /sandbox/atlas loads and appears in ModuleNavV2.
- Filters update the graph and inspector correctly.
- Mode toggles change visibility or annotations.
- Sync button updates lastSystemSyncAt.
- Review flags and notes persist after reload.
- Mobile layout remains usable (filters and inspector accessible).

## Risks and Mitigations
- Graph layout complexity: use deterministic SVG layout (column-based) for MVP.
- Canvas performance: limit active nodes and use memoization.
- Width constraints: add full-width option in SandboxShellV2 for Atlas.

## Open Questions
- Exact domain list for filters (suggest: Games, Planner, Media, Tenant, Product, Admin, Other).
- Should editors be treated as tenant_admin in role filters? (recommend yes for MVP).
- Where to place Atlas in sandbox nav (Docs & Wiki vs new category).

## Next Step
- Review this plan, confirm the remaining open questions, then proceed to implementation.
