# Admin IA Proposal (System ↔ Tenant)

> Goal: a scalable admin information architecture where **every existing admin page remains reachable** and the sidebar stays at **max 2 levels**.

## Principles

- **Two modes, one URL space**: everything stays under `/admin`.
- **Always-visible System/Tenant toggle** in the sidebar.
- **Sidebar depth ≤ 2**:
  - Level 1: groups (domain)
  - Level 2: pages
  - Anything deeper becomes **tabs on a hub page** (or a section switcher inside the page).
- **No route disappears**: we can regroup in the menu without moving routes initially.

## Proposed Mode Behavior

### System mode
- Audience: `system_admin`
- Default landing: `/admin`
- Sidebar shows global/system domains.

### Tenant mode
- Audience: tenant `owner/admin/editor` (and `system_admin` when “acting as tenant”)
- Default landing: `/admin/tenant/[tenantId]`
- Sidebar shows tenant-scoped domains.

## Proposed Sitemap (Sidebar)

### System mode sidebar

- **Overview**
  - Dashboard → `/admin`

- **Accounts**
  - Organisationer → `/admin/organisations`
  - Användare → `/admin/users`
  - Licenser → `/admin/licenses`

- **Catalog**
  - Spel → `/admin/games`
  - Produkter → `/admin/products`
  - Syften → `/admin/purposes`
  - Innehåll → `/admin/content`
  - Media → `/admin/media`

- **Operations**
  - Moderering → `/admin/moderation`
  - Ärenden → `/admin/tickets`
  - Notifieringar → `/admin/notifications`
  - Support → `/admin/support`

- **Billing**
  - Översikt → `/admin/billing`
  - Prenumerationer → `/admin/billing/subscriptions`
  - Fakturor → `/admin/billing/invoices`

- **Insights**
  - Analys → `/admin/analytics`
  - Fel → `/admin/analytics/errors`

- **System**
  - System Health → `/admin/system-health`
  - Audit Logs → `/admin/audit-logs`
  - Feature Flags → `/admin/feature-flags`
  - API Keys → `/admin/api-keys`
  - Webhooks → `/admin/webhooks`
  - Incidenter → `/admin/incidents`
  - Release Notes → `/admin/release-notes`
  - Inställningar → `/admin/settings`

- **Gamification**
  - Achievements → `/admin/achievements`
  - Achievements (advanced) → `/admin/achievements-advanced`
  - Leaderboard → `/admin/leaderboard`
  - Personalisering → `/admin/personalization`
  - Butik → `/admin/marketplace`

- **(Hidden / utility)**
  - Play sessions → `/admin/play/sessions` (kept reachable; not in main nav unless needed)

### Tenant mode sidebar

- **Overview**
  - Organisationsöversikt → `/admin/tenant/[tenantId]`

- **People**
  - Medlemmar → `/admin/tenant/[tenantId]/members`
  - Deltagare → `/admin/tenant/[tenantId]/participants`
  - Sessioner → `/admin/tenant/[tenantId]/sessions`

- **Content**
  - Spel → `/admin/tenant/[tenantId]/games`
  - Material → `/admin/tenant/[tenantId]/content`

- **Account**
  - Prenumeration → `/admin/tenant/[tenantId]/subscription`
  - Billing → `/admin/tenant/[tenantId]/billing`
  - Statistik → `/admin/tenant/[tenantId]/analytics`
  - Inställningar → `/admin/tenant/[tenantId]/settings`

## Before → After Mapping (No Route Disappears)

| Existing route | Mode | New group | Notes |
|---|---:|---|---|
| `/admin` | System | Overview | — |
| `/admin/organisations` | System | Accounts | — |
| `/admin/users` | System | Accounts | — |
| `/admin/licenses` | System | Accounts | — |
| `/admin/content` | System | Catalog | Explicitly “global library”; tenant library remains under `/admin/tenant/...` |
| `/admin/media` | System | Catalog | — |
| `/admin/games` | System | Catalog | Detail/edit/new remain as subroutes (not extra sidebar levels) |
| `/admin/products` | System | Catalog | — |
| `/admin/purposes` | System | Catalog | — |
| `/admin/analytics` | System | Insights | — |
| `/admin/analytics/errors` | System | Insights | Tab or secondary nav inside analytics |
| `/admin/billing` | System | Billing | — |
| `/admin/billing/subscriptions` | System | Billing | Tab inside billing hub (preferred) |
| `/admin/billing/invoices` | System | Billing | Tab inside billing hub (preferred) |
| `/admin/moderation` | System | Operations | — |
| `/admin/tickets` | System | Operations | — |
| `/admin/notifications` | System | Operations | — |
| `/admin/support` | System | Operations | — |
| `/admin/system-health` | System | System | — |
| `/admin/audit-logs` | System | System | — |
| `/admin/feature-flags` | System | System | — |
| `/admin/api-keys` | System | System | — |
| `/admin/webhooks` | System | System | — |
| `/admin/incidents` | System | System | — |
| `/admin/release-notes` | System | System | — |
| `/admin/settings` | System | System | — |
| `/admin/achievements` | System | Gamification | — |
| `/admin/achievements-advanced` | System | Gamification | — |
| `/admin/leaderboard` | System | Gamification | — |
| `/admin/personalization` | System | Gamification | — |
| `/admin/marketplace` | System | Gamification | — |
| `/admin/play/sessions` | System | Utility | Keep reachable; decide later if it belongs under Operations |
| `/admin/tenant/[tenantId]` | Tenant | Overview | Tenant landing |
| `/admin/tenant/[tenantId]/members` | Tenant | People | — |
| `/admin/tenant/[tenantId]/participants` | Tenant | People | Detail route stays as subroute |
| `/admin/tenant/[tenantId]/participants/[participantId]` | Tenant | People | Not a sidebar level; accessed from list |
| `/admin/tenant/[tenantId]/sessions` | Tenant | People | Detail pages TBD (today detail is at `/admin/sessions/[sessionId]`) |
| `/admin/tenant/[tenantId]/games` | Tenant | Content | — |
| `/admin/tenant/[tenantId]/content` | Tenant | Content | — |
| `/admin/tenant/[tenantId]/subscription` | Tenant | Account | — |
| `/admin/tenant/[tenantId]/billing` | Tenant | Account | — |
| `/admin/tenant/[tenantId]/analytics` | Tenant | Account | — |
| `/admin/tenant/[tenantId]/settings` | Tenant | Account | — |

## Implementation Notes (Phase 4 readiness)

- The sidebar already supports two configs (`adminNavConfig` and `tenantAdminNavConfig`). The missing piece is:
  - a visible mode toggle
  - correct server-side access gating per mode
  - correct tenant context derived from the `/admin/tenant/[tenantId]` segment

- Recommended incremental steps (no route moves):
  1) Add mode toggle UI + persist last mode.
  2) Update `app/admin/layout.tsx` to allow tenant admins into tenant-mode pages.
  3) Add a layout under `/admin/tenant/[tenantId]/**` that sets active tenant from `params.tenantId`.
  4) Convert the 3rd-level pages (billing subpages, analytics/errors) into hub pages with tabs.

