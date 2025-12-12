# LEKBANKEN /ADMIN REDESIGN – IMPLEMENTATION PLAN (REVISED)

**Version:** 1.1  
**Date:** 2025-12-12  
**Author:** Claude Opus 4.5 (revised by Codex)  
**Status:** APPROVED FOR IMPLEMENTATION

---

## Executive Summary
This plan is the single source of truth for redesigning `/admin`. The current admin is functional but inconsistent: several stubs, uneven data wiring, and unclear system-vs-tenant separation. Shell, RBAC, data tables, bulk actions, export, command palette, notifications, realtime, and virtual lists are already implemented. Remaining work is to finish domain coverage, clean navigation, and wire real data.

**Vision**
- Clear split: **System Admin** (platform-wide) vs **License/Tenant Admin** (scoped).
- Coverage for all documented domains (Games, Planner, Product, Gamification, Media, Participants, API, Operations, Platform, Tenant, Billing).
- Consistent UX patterns with full RBAC.

---

## Section 1: Current State (condensed)
- Core infrastructure: AdminShell, Sidebar (RBAC-filtered), Topbar, Acting-as banner, Breadcrumbs, PageHeader/Layout, StatCards, DataTable + selection/bulk actions, Export, ConfirmDialog, States, ActivityFeed, Notifications, Command Palette, Realtime hooks, Virtual list.
- RBAC: useRbac plus system/tenant layouts in place.
- Pages solid/partial: Dashboard, Users, Organisations, Products (UI partial), Achievements Admin (rich), Analytics (UI), System Health, Audit Logs.
- Stubs/partials: Billing (UI only), Media (basic), Licenses (mock), Leaderboard (mock), Moderation/Tickets/Support (UI partial), Marketplace (UI), Notifications (UI).
- Missing: Games Admin, Planner Admin, Feature Flags, API Keys/Webhooks, Incidents/Status/Release notes, Tenant Admin subpages (members/content/billing/settings), Tenant Gamification config, Tenant Media, Tenant Billing.
- Duplicates: `/admin/achievements-advanced` (should redirect to `/admin/achievements`), `/admin/support` overlaps `/admin/tickets`.

---

## Section 2: Information Architecture (target)
**System Admin**
- Overview: `/admin`
- Organisations: `/admin/organisations` (tenants)
- Users: `/admin/users`
- Products: `/admin/products`
- Licenses/Billing: `/admin/licenses`, `/admin/billing`, `/admin/billing/invoices`, `/admin/billing/subscriptions`
- Content: `/admin/content`
- Games: `/admin/games` (NEW)
- Planner/Sessions: `/admin/sessions` (NEW)
- Analytics: `/admin/analytics`, `/admin/analytics/errors`
- Moderation: `/admin/moderation`
- Notifications: `/admin/notifications`
- Tickets/Support: `/admin/tickets` (redirect `/admin/support` → `/admin/tickets`)
- Media: `/admin/media`
- Marketplace: `/admin/marketplace`
- Gamification: `/admin/achievements`, `/admin/leaderboard`, `/admin/personalization`
- Platform/Operations: `/admin/(system)/system-health`, `/admin/(system)/audit-logs`, `/admin/feature-flags` (NEW), `/admin/incidents` (NEW), `/admin/release-notes` (NEW)

**Tenant Admin**
- Dashboard: `/admin/tenant/[tenantId]`
- Members: `/admin/tenant/[tenantId]/members`
- Content/Library: `/admin/tenant/[tenantId]/content`
- Games (tenant visibility): `/admin/tenant/[tenantId]/games`
- Billing/Subscription: `/admin/tenant/[tenantId]/billing`
- Settings (incl. gamification config): `/admin/tenant/[tenantId]/settings`

---

## Section 3: Domain → Page Mapping (priority highlights)
| Domain | Page | URL | Role | Status |
| --- | --- | --- | --- | --- |
| Games/Product | Games Admin | /admin/games | System | Missing |
| Games/Product | Product Admin | /admin/products | System | Partial |
| Planner | Sessions Admin | /admin/sessions | System | Missing |
| Gamification | Achievements Admin | /admin/achievements | System | Exists (rich) |
| Gamification | Leaderboard | /admin/leaderboard | System | Stub |
| Gamification | Tenant config | /admin/tenant/[id]/settings | Tenant | Missing |
| Media | Media (global) | /admin/media | System | Partial |
| Media | Tenant Media | /admin/tenant/[id]/content | Tenant | Missing |
| API/Integration | API Keys | /admin/api-keys | System | Missing |
| API/Integration | Webhooks | /admin/webhooks | System | Missing |
| Platform | Feature Flags | /admin/feature-flags | System | Missing |
| Operations | Incidents/Status | /admin/incidents | System | Missing |
| Operations | Release Notes | /admin/release-notes | System | Missing |
| Tenant & Accounts | Organisations | /admin/organisations | System | Exists |
| Tenant & Accounts | Tenant admin subpages | /admin/tenant/[id]/… | Tenant | Missing |
| Billing | Billing (global) | /admin/billing | System | Partial |
| Billing | Tenant Billing | /admin/tenant/[id]/billing | Tenant | Missing |
| Moderation/Tickets | Moderation Queue | /admin/moderation | System | Stub |
| Moderation/Tickets | Tickets | /admin/tickets | System | Partial |
| Content | Library | /admin/content | System | Stub |

---

## Section 4: Gap Analysis
- **Implemented & solid:** Shell, shared components, RBAC layouts, Dashboard, Users, Organisations, Achievements Admin, Analytics (UI), System Health, Audit Logs.
- **Partial:** Billing, Media, Licenses, Leaderboard, Moderation/Tickets/Support, Marketplace, Notifications.
- **Missing:** Games Admin, Planner/Sessions, Feature Flags, API Keys/Webhooks, Incidents/Status/Release notes, Tenant Admin subpages, Tenant Gamification config, Tenant Media/Billing.
- **Duplicates:** `/admin/achievements-advanced` (redirect), `/admin/support` (redirect to tickets).

---

## Section 5: Roadmap (revised)
- **P5 – Nav/Redirect cleanup**
  - Redirect `/admin/achievements-advanced` → `/admin/achievements` (DONE)
  - Redirect `/admin/support` → `/admin/tickets`
  - Remove legacy sidebar/topbar components if unused.

- **P6 – Tenant Admin expansion**
  - Build `/admin/tenant/[id]/members`, `/content`, `/games`, `/billing`, `/settings` skeletons with RBAC guards, PageHeader + Breadcrumbs, DataTable/States placeholders.

- **P7 – New system domains (skeletons)**
  - `/admin/games`, `/admin/sessions`, `/admin/feature-flags`, `/admin/api-keys`, `/admin/webhooks`.

- **P8 – Ops & Platform**
  - `/admin/incidents`, `/admin/release-notes` skeletons.

- **P9 – Data wiring**
  - Billing (Stripe/backend), Media quotas, Licenses real data, Moderation/Tickets real data.

- **P10 – Polish**
  - Saved filters/views, better analytics charts, tenant gamification config, finalize tenant content/media flows.

**Page requirements (all new):** AdminPageLayout + AdminPageHeader + Breadcrumbs, RBAC check, loading/empty/error states, DataTable pattern, mock data allowed initially but flag TODO for backend wiring.

---

## Section 6: Risks & Trade-offs
- RBAC regression during rollout → keep system/tenant layouts strict; add route guards.
- Scope creep → stick to phased delivery; mock where backend is missing but mark TODO.
- Performance with large tables → keep virtual list/pagination pattern.

---

## Section 7: Claude Execution Prompt (handoff)
Use this prompt when handing to Claude for stepwise execution; after each step Claude must summarize changes/problems for follow-up:

1) **P5 Quick Nav Cleanup**
   - Redirect `/admin/achievements-advanced` → `/admin/achievements`.
   - Redirect `/admin/support` → `/admin/tickets`.
   - Remove unused legacy sidebar/topbar if no references remain.
   - Summary: list remaining duplicate routes or unused components.

2) **P6 Tenant Admin Skeletons**
   - Add `/admin/tenant/[id]/members`, `/content`, `/games`, `/billing`, `/settings`.
   - Use AdminPageLayout/Header/Breadcrumbs + RBAC; DataTable/States placeholders.
   - Summary: note missing APIs and any RBAC questions.

3) **P7 System Domain Skeletons**
   - Add `/admin/games`, `/admin/sessions`, `/admin/feature-flags`, `/admin/api-keys`, `/admin/webhooks`.
   - Same page pattern; mock data allowed with TODOs.
   - Summary: data/blockers list.

4) **P8 Ops & Platform**
   - Add `/admin/incidents`, `/admin/release-notes` (skeletons).
   - Summary: data/blockers list.

5) **P9 Data Wiring**
   - Billing/Stripe, Media quotas, Licenses, Moderation/Tickets real data.
   - Summary: what remains mocked.

6) **P10 Polish**
   - Saved filters/views, analytics charts, tenant gamification config, finalize tenant content/media flows.
   - Summary: remaining polish/perf/UX concerns.

Guidelines: keep PRs small, enforce RBAC in layout/nav, prefer server data + tenant scoping, stub clearly when blocked.

---

## Section 8: Quick Wins (status)
- Breadcrumbs, ConfirmDialog, Command Palette, Bulk Actions, Export, Realtime, Virtual lists, Acting-as banner, RBAC layouts: **Done**.
- Remaining easy wins: cleanup redirects (`achievements-advanced`, `support`), remove legacy sidebar/topbar if unused.

---

## Appendix: Navigation Config Targets
- System nav groups: Overview, Manage (orgs/users/products/games/content), Players (sessions/achievements/leaderboards), Operations (billing/moderation/tickets/audit), System (health/feature-flags/notifications/settings), Media/Marketplace.
- Tenant nav groups: Min organisation (dashboard/members/settings), Innehåll (games/content/media), Konto (billing/subscription), Aktivitet (sessions/achievements).
