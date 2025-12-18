# Admin Audit (/admin)

> Scope: Current state inventory + root problems to address in the admin redesign.
> 
> Ground truth sources: route files under `app/admin/**`, current layout/auth gate in `app/admin/layout.tsx`, current shell in `components/admin/*`, and RBAC model in `features/admin/shared/hooks/useRbac.ts`.

## Executive Summary

- `/admin` is **currently hard-gated to `system_admin` only** at the route layout level. This blocks tenant-admin workflows even though the RBAC hook and several pages are written as if tenant roles should work.
- There are **two parallel/competing admin shells & nav models**:
  - Active: `app/admin/layout.tsx` → `components/admin/AdminShell` → `components/admin/AdminSidebar` (RBAC-aware; uses `app/admin/components/admin-nav-config.tsx`).
  - Likely legacy/unwired: `app/admin/layout-client.tsx` → `app/admin/components/sidebar.tsx` + `admin-nav-items.tsx`.
- Tenant routes exist at `/admin/tenant/[tenantId]/**`, but **the `[tenantId]` param is not consistently used to set tenant context** (pages read tenant from `TenantProvider`, not from the route param).

## Current Access Model (Ground Truth)

### Route gate
- `app/admin/layout.tsx`:
  - If no user → redirect to `/auth/login?redirect=/admin`
  - If `effectiveGlobalRole !== 'system_admin'` → redirect to `/app`

This means: tenant roles (`owner/admin/editor`) do not reach `/admin` today, regardless of what RBAC permits.

### Client-side RBAC (present but partially unreachable)
- `features/admin/shared/hooks/useRbac.ts` defines:
  - `AdminPermission` matrix
  - `can(permission)` based on `effectiveGlobalRole` + `TenantContext.currentTenant.membership.role`

### Tenant context
- `TenantProvider` is mounted in `app/admin/layout.tsx` using `authContext.activeTenant` / memberships.
- Many tenant pages under `/admin/tenant/[tenantId]/**` **ignore the route param** and rely on `currentTenant` from context.

## Route Inventory

Legend
- **Scope**: `System` (global/system admin), `Tenant` (tenant-scoped), `Mixed` (page contains tenant-aware logic but is currently only reachable by system admins).
- **Implementation**: feature module vs inline page.
- **Data**: best-effort based on quick scan; `TBD` means needs confirmation in the feature module.

| Route | File | Scope | Implementation | Data / Side Effects | Notes |
|---|---|---:|---|---|---|
| `/admin` | `app/admin/page.tsx` | System | `AdminDashboardPage` | TBD | Landing dashboard |
| `/admin/achievements` | `app/admin/achievements/page.tsx` | System | `AchievementAdminPage` | TBD | Gamification |
| `/admin/achievements-advanced` | `app/admin/achievements-advanced/page.tsx` | System | inline | TBD | Advanced achievements UI |
| `/admin/analytics` | `app/admin/analytics/page.tsx` | System | inline | TBD | Analytics overview |
| `/admin/analytics/errors` | `app/admin/analytics/errors/page.tsx` | System | inline | TBD | Error analytics |
| `/admin/api-keys` | `app/admin/api-keys/page.tsx` | System | inline | TBD | System tooling |
| `/admin/audit-logs` | `app/admin/(system)/audit-logs/page.tsx` | System | inline | TBD | System audit logs |
| `/admin/billing` | `app/admin/billing/page.tsx` | System | inline | TBD | Billing overview |
| `/admin/billing/invoices` | `app/admin/billing/invoices/page.tsx` | System | inline | TBD | Invoice listing |
| `/admin/billing/subscriptions` | `app/admin/billing/subscriptions/page.tsx` | System | inline | TBD | Subscription listing |
| `/admin/content` | `app/admin/content/page.tsx` | Mixed | inline (`use client`) | Supabase query `games` + calls `/api/games*` | Contains tenant-aware filtering logic, but route gate blocks tenant admins today |
| `/admin/feature-flags` | `app/admin/feature-flags/page.tsx` | System | inline | TBD | Feature flag management |
| `/admin/games` | `app/admin/games/page.tsx` | System | `GameAdminPage` | TBD | Game admin (global) |
| `/admin/games/new` | `app/admin/games/new/page.tsx` | System | inline | TBD | New game flow |
| `/admin/games/[gameId]` | `app/admin/games/[gameId]/page.tsx` | System | `GameDetailPage` | TBD | Game detail |
| `/admin/games/[gameId]/edit` | `app/admin/games/[gameId]/edit/page.tsx` | System | inline | TBD | Game edit |
| `/admin/incidents` | `app/admin/incidents/page.tsx` | System | inline | TBD | Incident tracking |
| `/admin/leaderboard` | `app/admin/leaderboard/page.tsx` | System | inline | TBD | Gamification |
| `/admin/licenses` | `app/admin/licenses/page.tsx` | System | inline | TBD | License mgmt |
| `/admin/marketplace` | `app/admin/marketplace/page.tsx` | System | inline | TBD | Marketplace / store |
| `/admin/media` | `app/admin/media/page.tsx` | System | inline (imports feature components) | likely `/api/media` + storage | Media bank + standard images |
| `/admin/moderation` | `app/admin/moderation/page.tsx` | System | inline | TBD | Moderation tooling |
| `/admin/notifications` | `app/admin/notifications/page.tsx` | System | inline | TBD | Notifications center |
| `/admin/organisations` | `app/admin/organisations/page.tsx` | System | `OrganisationAdminPage` | TBD | Tenant/org admin |
| `/admin/participants` | `app/admin/participants/page.tsx` | System | `ParticipantsPage` | TBD | Participant listing |
| `/admin/participants/[participantId]` | `app/admin/participants/[participantId]/page.tsx` | System | `ParticipantDetailPage` | TBD | Participant detail |
| `/admin/personalization` | `app/admin/personalization/page.tsx` | System | inline | TBD | Personalization |
| `/admin/play/sessions` | `app/admin/play/sessions/page.tsx` | System | inline | TBD | Play session tooling |
| `/admin/products` | `app/admin/products/page.tsx` | System | `ProductAdminPage` | TBD | Product catalog |
| `/admin/purposes` | `app/admin/purposes/page.tsx` | System | inline (`use client`) | Supabase + RBAC | Purposes/admin taxonomy |
| `/admin/release-notes` | `app/admin/release-notes/page.tsx` | System | inline | TBD | Release notes |
| `/admin/sessions` | `app/admin/sessions/page.tsx` | Mixed | `SessionsPage` | TBD | Might be tenant-aware via context in feature module |
| `/admin/sessions/[sessionId]` | `app/admin/sessions/[sessionId]/page.tsx` | Mixed | `SessionDetailPage` | TBD | Might be tenant-aware |
| `/admin/settings` | `app/admin/settings/page.tsx` | System | inline | TBD | System settings |
| `/admin/support` | `app/admin/support/page.tsx` | System | inline | TBD | Support hub |
| `/admin/system-health` | `app/admin/(system)/system-health/page.tsx` | System | inline | TBD | Health dashboard |
| `/admin/tickets` | `app/admin/tickets/page.tsx` | System | inline | TBD | Ticketing |
| `/admin/users` | `app/admin/users/page.tsx` | System | `UserAdminPage` | TBD | User admin |
| `/admin/webhooks` | `app/admin/webhooks/page.tsx` | System | inline | TBD | Webhooks |
| `/admin/tenant/[tenantId]` | `app/admin/tenant/[tenantId]/page.tsx` | Tenant (intended) | inline | placeholder UI | Does not use `tenantId` param to set tenant context |
| `/admin/tenant/[tenantId]/analytics` | `app/admin/tenant/[tenantId]/analytics/page.tsx` | Tenant | inline | TBD | Tenant analytics |
| `/admin/tenant/[tenantId]/billing` | `app/admin/tenant/[tenantId]/billing/page.tsx` | Tenant | inline | TBD | Tenant billing |
| `/admin/tenant/[tenantId]/content` | `app/admin/tenant/[tenantId]/content/page.tsx` | Tenant | inline | TBD | Tenant content |
| `/admin/tenant/[tenantId]/games` | `app/admin/tenant/[tenantId]/games/page.tsx` | Tenant | inline | TBD | Tenant games |
| `/admin/tenant/[tenantId]/members` | `app/admin/tenant/[tenantId]/members/page.tsx` | Tenant | inline (`use client`) | Supabase `user_tenant_memberships` | Uses `TenantContext.currentTenant`, not route param |
| `/admin/tenant/[tenantId]/participants` | `app/admin/tenant/[tenantId]/participants/page.tsx` | Tenant | `ParticipantsPage` | TBD | Tenant participant listing |
| `/admin/tenant/[tenantId]/participants/[participantId]` | `app/admin/tenant/[tenantId]/participants/[participantId]/page.tsx` | Tenant | `ParticipantDetailPage` | TBD | Tenant participant detail |
| `/admin/tenant/[tenantId]/sessions` | `app/admin/tenant/[tenantId]/sessions/page.tsx` | Tenant | `SessionsPage` | TBD | Tenant sessions |
| `/admin/tenant/[tenantId]/settings` | `app/admin/tenant/[tenantId]/settings/page.tsx` | Tenant | inline | TBD | Tenant settings |
| `/admin/tenant/[tenantId]/subscription` | `app/admin/tenant/[tenantId]/subscription/page.tsx` | Tenant | inline | TBD | Tenant subscription |

### Related (admin-ish) but outside `/admin`
- `/app/admin/tenant` exists at `app/app/admin/tenant/page.tsx` (outside this audit’s primary scope).

## Navigation Model (Current)

### Active sidebar (used)
- `components/admin/AdminSidebar.tsx` is RBAC-aware and uses config in `app/admin/components/admin-nav-config.tsx`.

### Config reality
- `app/admin/components/admin-nav-config.tsx` already contains:
  - `adminNavConfig` (System groups)
  - `tenantAdminNavConfig` (Tenant groups)

Gaps:
- Several labels have encoding/ASCII fallbacks (`Anvandare`, `Innehall`, `Installningar`, `Arenden`, etc).
- Tenant config items have **no `permission` fields**, so filtering is less strict than System config.

### Legacy/unwired nav
- `app/admin/layout-client.tsx` + `app/admin/components/sidebar.tsx` + `admin-nav-items.tsx` likely represent an older shell. This duplicates nav structure and can drift.

## Key Problems (UX + Architecture)

1) **Tenant admin mode is impossible today**
- Root cause: server layout gate redirects non-`system_admin` to `/app`.
- Symptom: RBAC and tenant routes exist but are dead for tenant roles.

2) **Tenant selection & URL are not coherent**
- Routes are `/admin/tenant/[tenantId]/**`, but tenant pages frequently read tenant from `TenantContext` instead of `params.tenantId`.
- Risk: URL can say tenant A while context is tenant B.

3) **Dual sources of truth for shell/nav**
- There is a modern shell under `components/admin/*` and a separate legacy shell under `app/admin/*`.
- Risk: design drift and bugs when engineers update the wrong path.

4) **Mixed-scope pages hide unclear product intent**
- Example: `/admin/content` contains tenant-aware filtering logic but lives as a global route.
- Needs explicit product decision: “global library” vs “tenant library” vs both.

5) **Inconsistent information architecture**
- Current grouping mixes domains (e.g., system tools alongside content & gamification) and lacks a clear System/Tenant mental model.

## Recommendations (Phase 1 conclusions)

- Make System vs Tenant a first-class concept:
  - Always-visible mode toggle (System ↔ Tenant)
  - Tenant context selector where applicable
- Unify nav source of truth:
  - Keep `admin-nav-config` as canonical; migrate legacy `admin-nav-items` usage away.
- Align URL and tenant context:
  - Add a tenant-scoped layout for `/admin/tenant/[tenantId]/**` that sets active tenant from route.
- Fix access mismatch:
  - Update server gate so tenant admins can access tenant-mode routes (while still protecting system routes).

---

Next: see `docs/ADMIN_IA_PROPOSAL.md` for the proposed new IA + mapping (no route disappears).
