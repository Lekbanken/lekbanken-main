# 🏛️ LEKBANKEN /ADMIN REDESIGN – COMPLETE IMPLEMENTATION PLAN

**Version:** 1.0  
**Date:** 2025-12-12  
**Author:** Claude Opus 4.5  
**Status:** APPROVED FOR IMPLEMENTATION

---

## Executive Summary

This document provides a **brutally honest, opinionated, and practical** redesign plan for the entire `/admin` area of Lekbanken. The current admin is functional but fragmented – a mix of placeholder pages, inconsistent patterns, and unclear role separation.

**The Vision:** Transform `/admin` into a serious, modern, professional SaaS backoffice that:
- Clearly separates **System Admin** (platform-wide) from **License Admin** (tenant-scoped)
- Aligns with the 11 documented domains
- Provides world-class UX with consistent patterns
- Enables RBAC enforcement at every layer

---

## Table of Contents

1. [Current /admin State – Overview](#section-1-current-admin-state--overview)
2. [Target Vision – Admin Domain](#section-2-target-vision--admin-domain)
3. [Information Architecture](#section-3-information-architecture)
4. [Domain → Admin Page Mapping](#section-4-domain--admin-page-mapping)
5. [UX / UI System for Admin](#section-5-ux--ui-system-for-admin)
6. [Technical Architecture](#section-6-technical-architecture)
7. [Gap Analysis (Current vs Target)](#section-7-gap-analysis-current-vs-target)
8. [Refactoring Roadmap](#section-8-refactoring-roadmap)
9. [Risks & Trade-offs](#section-9-risks--trade-offs)
10. [Quick Wins (<1 day fixes)](#section-10-quick-wins-1-day-fixes)

---

## Section 1: Current /admin State – Overview

### 1.1 File Inventory

| Category | Count | Location |
|----------|-------|----------|
| **Route Pages** | 21 | `app/admin/*/page.tsx` |
| **Feature Modules** | 6 | `features/admin/` |
| **Shell Components** | 3 | `components/admin/` |
| **Shared Components** | 6 | `components/admin/shared/` |
| **Navigation Items** | 16 | `app/admin/components/admin-nav-items.tsx` |

### 1.2 Current Admin Pages (21 routes)

| Route | Domain | Implementation | Status |
|-------|--------|----------------|--------|
| `/admin` | Dashboard | `features/admin/dashboard/` | ✅ Complete |
| `/admin/achievements` | Gamification | Basic page | ⚠️ Minimal |
| `/admin/achievements-advanced` | Gamification | Placeholder | ❌ Stub only |
| `/admin/analytics` | Operations | Placeholder | ❌ Stub only |
| `/admin/audit-logs` | Operations | Placeholder | ❌ Stub only |
| `/admin/billing` | Billing | Partial with stats | ⚠️ UI only |
| `/admin/content` | Content | Placeholder | ❌ Stub only |
| `/admin/leaderboard` | Gamification | Placeholder | ❌ Stub only |
| `/admin/licenses` | Tenant | Placeholder | ❌ Stub only |
| `/admin/marketplace` | Products | Placeholder | ❌ Stub only |
| `/admin/media` | Media | Placeholder | ❌ Stub only |
| `/admin/moderation` | Operations | Placeholder | ❌ Stub only |
| `/admin/notifications` | Platform | Placeholder | ❌ Stub only |
| `/admin/organisations` | Tenant | `features/admin/organisations/` | ⚠️ Partial |
| `/admin/personalization` | Gamification | Placeholder | ❌ Stub only |
| `/admin/products` | Products | `features/admin/products/` | ⚠️ Partial |
| `/admin/settings` | Platform | Working inline | ⚠️ Tenant-scoped only |
| `/admin/support` | Operations | Placeholder | ❌ Stub only |
| `/admin/system-health` | Platform | Working | ✅ Complete |
| `/admin/tickets` | Operations | Placeholder | ❌ Stub only |
| `/admin/users` | Accounts | `features/admin/users/` | ✅ Complete |

**Summary:** Only 3 pages fully complete, 5 partial, 13 are stubs/placeholders.

### 1.3 Current Navigation Structure

```
📁 Main (adminMainNavItems)
├── Dashboard      → /admin
├── Organisationer → /admin/organisations
├── Användare      → /admin/users
├── Licenser       → /admin/licenses
└── Innehåll       → /admin/content

📁 Verktyg (adminSecondaryNavItems)
├── Analys         → /admin/analytics
├── Fakturering    → /admin/billing
├── Moderering     → /admin/moderation    [badge: 3]
├── Notifikationer → /admin/notifications
├── Support        → /admin/support       [badge: 5]
└── Ärenden        → /admin/tickets

📁 System (adminSettingsNavItems)
├── Leaderboard    → /admin/leaderboard
├── Achievements   → /admin/achievements-advanced
├── Personalisering→ /admin/personalization
├── Butik          → /admin/marketplace
└── Inställningar  → /admin/settings
```

### 1.4 Current RBAC Implementation

**Discovered Patterns:**

```typescript
// lib/utils/tenantAuth.ts
export function isSystemAdmin(user: UserLike | null | undefined) {
  const role = user?.app_metadata?.role
  return role === 'system_admin'
}

// lib/utils/authRoles.ts
export const permissionMatrix = {
  global: {
    system_admin: ['*'],           // Full access
    private_user: ['self'],
    demo_private_user: ['demo'],
  },
  tenant: {
    owner: ['admin', 'editor', 'member'],
    admin: ['admin', 'editor', 'member'],
    editor: ['editor', 'member'],
    member: ['member'],
  },
}
```

**Database Functions:**
- `is_system_admin()` – RLS function checking JWT role
- `is_global_admin()` – Similar, checks users.global_role
- `has_tenant_role(tenant_id, role[])` – Tenant-scoped role check

**Current Enforcement:**
- `AdminShell` checks `userRole === "admin" || userRole === "superadmin"`
- No per-page RBAC enforcement
- No distinction between system_admin and license_admin in UI

### 1.5 Component Architecture

```
components/admin/
├── AdminShell.tsx      # Main layout wrapper with auth checks
├── AdminSidebar.tsx    # Left sidebar navigation
├── AdminTopbar.tsx     # Top header with user menu
└── shared/
    ├── AdminPageHeader.tsx    # Page title + breadcrumbs
    ├── AdminPageLayout.tsx    # Content wrapper with max-width
    ├── AdminStatCard.tsx      # Stat card component
    ├── AdminDataTable.tsx     # Table component
    └── AdminStates.tsx        # Empty/Error/Loading states

features/admin/
├── dashboard/          # Dashboard page + components
├── users/              # Full user management (8 files)
├── organisations/      # Organisation management
├── products/           # Product management
├── achievements/       # Achievement types + data
└── media/              # Media utilities
```

### 1.6 Critical Issues Identified

| Issue | Severity | Impact |
|-------|----------|--------|
| **No RBAC per page** | 🔴 Critical | Any admin can access all pages |
| **13 placeholder pages** | 🟠 High | Poor admin experience |
| **Mixed patterns** | 🟠 High | Some pages inline, some use features/ |
| **No system vs tenant split** | 🟠 High | Confusing for license admins |
| **Hardcoded nav badges** | 🟡 Medium | Not dynamic |
| **No breadcrumbs** | 🟡 Medium | Navigation unclear |
| **No command palette** | 🟡 Medium | Power users frustrated |

---

## Section 2: Target Vision – Admin Domain

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ADMIN ROLE HIERARCHY                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   SYSTEM ADMIN (system_admin)                                          │
│   ─────────────────────────────                                        │
│   • Global access to ALL tenants                                       │
│   • Platform configuration (health, metrics, feature flags)            │
│   • User management across all tenants                                 │
│   • Billing & subscription management                                   │
│   • Audit logs, moderation queue                                       │
│   • Product catalog management                                          │
│                                                                         │
│   LICENSE ADMIN (tenant owner/admin)                                    │
│   ─────────────────────────────────                                    │
│   • Scoped to their tenant(s) only                                     │
│   • Tenant settings, branding                                          │
│   • Member management within tenant                                     │
│   • Content moderation for tenant                                       │
│   • View tenant analytics                                               │
│   • Cannot see platform-level data                                      │
│                                                                         │
│   FUTURE ROLES                                                          │
│   ────────────                                                         │
│   • support_agent: Read-only access to tickets, limited user lookup    │
│   • content_moderator: Moderation queue only                           │
│   • finance_admin: Billing only                                         │
│   • marketing_admin: Analytics + promotions                             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Admin Area Separation

```
/admin/                      ← System Admin area (requires system_admin)
├── dashboard/
├── tenants/                 ← All tenants list + management
├── users/                   ← All users across platform
├── products/                ← Product catalog
├── billing/                 ← Stripe dashboard, subscriptions
├── platform/                ← Health, metrics, feature flags
├── moderation/              ← Platform-wide moderation
├── audit/                   ← Audit logs
└── support/                 ← Support tickets

/admin/tenant/[tenantId]/   ← License Admin area (requires tenant admin)
├── dashboard/
├── members/                 ← Tenant members
├── settings/                ← Tenant branding, config
├── content/                 ← Tenant's games, plans
├── analytics/               ← Tenant usage stats
└── billing/                 ← Tenant's subscription details
```

### 2.3 Target Navigation (System Admin View)

```
📁 ÖVERSIKT
├── 🏠 Dashboard            → /admin
└── 📊 Analytics            → /admin/analytics

📁 HANTERA
├── 🏢 Organisationer       → /admin/tenants
├── 👥 Användare           → /admin/users
├── 📦 Produkter           → /admin/products
├── 🎮 Spel                → /admin/games
└── 📝 Innehåll            → /admin/content

📁 SPELARE
├── 🎯 Sessioner           → /admin/sessions
├── 🏆 Achievements        → /admin/achievements
└── 📈 Leaderboards        → /admin/leaderboards

📁 DRIFT
├── 💳 Fakturering         → /admin/billing
├── 🛡️ Moderering         → /admin/moderation     [count]
├── 🎫 Supportärenden      → /admin/tickets        [count]
└── 📋 Audit Logs          → /admin/audit

📁 SYSTEM
├── ❤️ System Health       → /admin/system/health
├── ⚙️ Feature Flags       → /admin/system/features
├── 🔔 Notifikationer      → /admin/notifications
└── 🔧 Inställningar       → /admin/settings
```

### 2.4 Target Navigation (License Admin View)

```
📁 MIN ORGANISATION
├── 🏠 Dashboard            → /admin/tenant/[id]
├── 👥 Medlemmar           → /admin/tenant/[id]/members
├── 🎨 Inställningar       → /admin/tenant/[id]/settings
└── 📊 Statistik           → /admin/tenant/[id]/analytics

📁 INNEHÅLL
├── 🎮 Våra spel           → /admin/tenant/[id]/games
├── 📝 Våra planer         → /admin/tenant/[id]/plans
└── 🖼️ Media              → /admin/tenant/[id]/media

📁 AKTIVITET
├── 🎯 Sessioner           → /admin/tenant/[id]/sessions
└── 🏆 Achievements        → /admin/tenant/[id]/achievements

📁 KONTO
├── 💳 Prenumeration       → /admin/tenant/[id]/subscription
└── 📄 Fakturor            → /admin/tenant/[id]/invoices
```

---

## Section 3: Information Architecture

### 3.1 Complete URL Structure

```
/admin/
│
├── (dashboard)
│   └── page.tsx                     # System dashboard
│
├── analytics/
│   ├── page.tsx                     # Platform analytics overview
│   ├── users/page.tsx              # User engagement metrics
│   └── revenue/page.tsx            # Revenue analytics
│
├── tenants/
│   ├── page.tsx                     # Tenant list
│   ├── [tenantId]/
│   │   ├── page.tsx                # Tenant detail
│   │   ├── members/page.tsx        # Tenant members
│   │   ├── settings/page.tsx       # Tenant settings
│   │   └── billing/page.tsx        # Tenant subscription
│   └── create/page.tsx             # Create tenant wizard
│
├── users/
│   ├── page.tsx                     # All users list
│   ├── [userId]/
│   │   └── page.tsx                # User detail
│   └── invites/page.tsx            # Pending invitations
│
├── products/
│   ├── page.tsx                     # Product catalog
│   ├── [productId]/page.tsx        # Product detail
│   └── create/page.tsx             # Create product
│
├── games/
│   ├── page.tsx                     # All games
│   └── [gameId]/page.tsx           # Game detail
│
├── content/
│   ├── page.tsx                     # Content overview
│   ├── templates/page.tsx          # Game templates
│   └── purposes/page.tsx           # Educational purposes
│
├── sessions/
│   ├── page.tsx                     # Active sessions
│   └── [sessionId]/page.tsx        # Session detail
│
├── achievements/
│   ├── page.tsx                     # Achievement catalog
│   ├── [achievementId]/page.tsx    # Achievement detail
│   └── builder/page.tsx            # Badge builder
│
├── leaderboards/
│   └── page.tsx                     # Leaderboard management
│
├── billing/
│   ├── page.tsx                     # Billing overview
│   ├── subscriptions/page.tsx      # All subscriptions
│   ├── invoices/page.tsx           # All invoices
│   └── products/page.tsx           # Stripe products
│
├── moderation/
│   ├── page.tsx                     # Moderation queue
│   └── rules/page.tsx              # Filter rules
│
├── tickets/
│   ├── page.tsx                     # Support tickets
│   └── [ticketId]/page.tsx         # Ticket detail
│
├── audit/
│   └── page.tsx                     # Audit log viewer
│
├── system/
│   ├── health/page.tsx             # System health
│   ├── features/page.tsx           # Feature flags
│   └── metrics/page.tsx            # Detailed metrics
│
├── notifications/
│   ├── page.tsx                     # Notification templates
│   └── send/page.tsx               # Broadcast notification
│
└── settings/
    ├── page.tsx                     # Platform settings
    ├── branding/page.tsx           # Platform branding
    └── integrations/page.tsx       # API keys, webhooks
```

### 3.2 Breadcrumb Structure

Every admin page should display breadcrumbs:

```tsx
// Example: /admin/tenants/[tenantId]/members
<AdminBreadcrumbs items={[
  { label: 'Admin', href: '/admin' },
  { label: 'Organisationer', href: '/admin/tenants' },
  { label: tenant.name, href: `/admin/tenants/${tenantId}` },
  { label: 'Medlemmar' }  // Current page, no href
]} />
```

### 3.3 Command Palette

Implement `⌘K` / `Ctrl+K` command palette:

```typescript
const adminCommands = [
  // Navigation
  { id: 'go-dashboard', label: 'Go to Dashboard', action: () => router.push('/admin') },
  { id: 'go-users', label: 'Go to Users', action: () => router.push('/admin/users') },
  
  // Actions
  { id: 'create-tenant', label: 'Create New Tenant', action: () => openModal('create-tenant') },
  { id: 'invite-user', label: 'Invite User', action: () => openModal('invite-user') },
  
  // Search
  { id: 'search-users', label: 'Search Users...', action: (query) => searchUsers(query) },
  { id: 'search-tenants', label: 'Search Tenants...', action: (query) => searchTenants(query) },
]
```

---

## Section 4: Domain → Admin Page Mapping

### 4.1 Domain Coverage Matrix

| Domain | Primary Admin Pages | License Admin | System Admin |
|--------|---------------------|---------------|--------------|
| **Accounts** | `/admin/users`, `/admin/users/[id]` | ❌ | ✅ |
| **Billing** | `/admin/billing/*` | View only | ✅ Full |
| **Gamification** | `/admin/achievements/*`, `/admin/leaderboards` | ❌ | ✅ |
| **Games** | `/admin/games/*` | Via tenant | ✅ |
| **Media** | `/admin/content/media` | Via tenant | ✅ |
| **Operations** | `/admin/moderation`, `/admin/audit`, `/admin/tickets` | ❌ | ✅ |
| **Participants** | `/admin/sessions/*` | Via tenant | ✅ |
| **Planner** | Via Games admin | Via tenant | ✅ |
| **Platform** | `/admin/system/*`, `/admin/settings` | ❌ | ✅ |
| **Products** | `/admin/products/*` | ❌ | ✅ |
| **Tenant** | `/admin/tenants/*` | Own tenant | ✅ All |

### 4.2 Missing Admin Pages (Current Gaps)

| Domain | Missing Pages | Priority |
|--------|---------------|----------|
| **Games** | No dedicated games admin (only via content) | 🔴 High |
| **Participants** | No session management | 🔴 High |
| **Planner** | No plan templates admin | 🟠 Medium |
| **API/Integration** | No API keys / webhooks admin | 🟠 Medium |
| **Feature Flags** | No feature flag management | 🟡 Low |

### 4.3 Redundant/Confusing Pages

| Page | Issue | Recommendation |
|------|-------|----------------|
| `/admin/achievements` vs `/admin/achievements-advanced` | Duplicate | Merge into one |
| `/admin/support` vs `/admin/tickets` | Overlap | Keep tickets, remove support |
| `/admin/marketplace` | Unclear purpose | Rename to `/admin/products/catalog` |
| `/admin/personalization` | Orphaned | Move to `/admin/achievements/builder` |
| `/admin/licenses` | Confusing (is it Stripe or tenant?) | Rename to `/admin/tenants/subscriptions` |

---

## Section 5: UX / UI System for Admin

### 5.1 Global Layout

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 🔵 Lekbanken Admin                    [Search...] [🔔] [👤 Admin Name] │
├────────────┬────────────────────────────────────────────────────────────┤
│            │  📍 Admin > Tenants > Acme Corp > Members                  │
│  SIDEBAR   │ ───────────────────────────────────────────────────────── │
│            │                                                            │
│  🏠 Dashboard │  ┌──────────────────────────────────────────────────┐  │
│  📊 Analytics  │  │                  PAGE CONTENT                    │  │
│            │  │                                                    │  │
│  ─────────│  │  [Header with title + actions]                    │  │
│  HANTERA  │  │                                                    │  │
│  🏢 Orgs  │  │  [Stats cards row]                                │  │
│  👥 Users │  │                                                    │  │
│  📦 Prods │  │  [Data table with filters]                        │  │
│            │  │                                                    │  │
│  ─────────│  │                                                    │  │
│  DRIFT    │  │                                                    │  │
│  💳 Billing│  │                                                    │  │
│  🛡️ Mod   │  │                                                    │  │
│            │  └──────────────────────────────────────────────────┘  │
│            │                                                            │
│  ─────────│  ┌──────────────────────────────────────────────────────┐  │
│  [⚙️ Settings]│                        FOOTER                         │  │
│  [← Appen]    │  │  © 2025 Lekbanken • Version 1.0.0                     │
└────────────┴────────────────────────────────────────────────────────────┘
```

### 5.2 Page Patterns

#### Pattern A: List Page (e.g., Users, Tenants)

```tsx
<AdminPageLayout>
  <AdminPageHeader
    title="Användare"
    description="Hantera alla användare i systemet"
    actions={
      <Button onClick={() => openInviteDialog()}>
        <PlusIcon /> Bjud in användare
      </Button>
    }
    breadcrumbs={[
      { label: 'Admin', href: '/admin' },
      { label: 'Användare' }
    ]}
  />
  
  <AdminStatGrid>
    <AdminStatCard label="Totalt" value={stats.total} />
    <AdminStatCard label="Aktiva" value={stats.active} trend="up" />
    <AdminStatCard label="Nya denna vecka" value={stats.newThisWeek} />
  </AdminStatGrid>
  
  <AdminSection title="Alla användare">
    <AdminTableToolbar
      search={search}
      onSearchChange={setSearch}
      filters={[
        { id: 'status', options: ['all', 'active', 'invited', 'disabled'] },
        { id: 'role', options: ['all', 'admin', 'editor', 'member'] },
      ]}
    />
    <AdminDataTable columns={columns} data={users} />
    <AdminPagination page={page} total={total} pageSize={20} />
  </AdminSection>
</AdminPageLayout>
```

#### Pattern B: Detail Page (e.g., User Detail, Tenant Detail)

```tsx
<AdminPageLayout>
  <AdminPageHeader
    title={user.name}
    subtitle={user.email}
    avatar={user.avatar_url}
    actions={
      <>
        <Button variant="outline" onClick={handleEdit}>Redigera</Button>
        <Button variant="destructive" onClick={handleDelete}>Ta bort</Button>
      </>
    }
    breadcrumbs={[...]}
  />
  
  <AdminTabs defaultValue="overview">
    <AdminTabsList>
      <AdminTabsTrigger value="overview">Översikt</AdminTabsTrigger>
      <AdminTabsTrigger value="activity">Aktivitet</AdminTabsTrigger>
      <AdminTabsTrigger value="permissions">Behörigheter</AdminTabsTrigger>
    </AdminTabsList>
    
    <AdminTabsContent value="overview">
      <AdminGrid cols={2}>
        <AdminCard title="Profilinformation">...</AdminCard>
        <AdminCard title="Organisationer">...</AdminCard>
      </AdminGrid>
    </AdminTabsContent>
    
    <AdminTabsContent value="activity">
      <ActivityTimeline userId={user.id} />
    </AdminTabsContent>
  </AdminTabs>
</AdminPageLayout>
```

#### Pattern C: Settings Page

```tsx
<AdminPageLayout maxWidth="4xl">
  <AdminPageHeader
    title="Inställningar"
    description="Konfigurera plattformens grundinställningar"
  />
  
  <AdminSettingsNav>
    <AdminSettingsNavItem href="/admin/settings" active>Allmänt</AdminSettingsNavItem>
    <AdminSettingsNavItem href="/admin/settings/branding">Branding</AdminSettingsNavItem>
    <AdminSettingsNavItem href="/admin/settings/integrations">Integrationer</AdminSettingsNavItem>
  </AdminSettingsNav>
  
  <AdminSettingsSection title="Plattformsnamn">
    <Input value={name} onChange={...} />
    <p className="text-sm text-muted-foreground">
      Detta namn visas i e-post och notifikationer.
    </p>
  </AdminSettingsSection>
  
  <AdminSettingsSection title="Standardspråk">
    <Select value={locale} options={locales} />
  </AdminSettingsSection>
  
  <AdminSettingsFooter>
    <Button variant="outline">Avbryt</Button>
    <Button>Spara ändringar</Button>
  </AdminSettingsFooter>
</AdminPageLayout>
```

#### Pattern D: Wizard Page (e.g., Create Tenant)

```tsx
<AdminPageLayout maxWidth="2xl">
  <AdminWizard
    title="Skapa ny organisation"
    steps={[
      { id: 'basics', label: 'Grundinfo' },
      { id: 'plan', label: 'Prenumeration' },
      { id: 'members', label: 'Medlemmar' },
      { id: 'confirm', label: 'Bekräfta' },
    ]}
    currentStep={step}
  >
    {step === 'basics' && <TenantBasicsForm />}
    {step === 'plan' && <TenantPlanSelector />}
    {step === 'members' && <TenantMembersInvite />}
    {step === 'confirm' && <TenantConfirmation />}
  </AdminWizard>
</AdminPageLayout>
```

### 5.3 Component Library Additions

**New components needed:**

| Component | Purpose | Priority |
|-----------|---------|----------|
| `AdminBreadcrumbs` | Navigation breadcrumbs | 🔴 P0 |
| `AdminCommandPalette` | ⌘K quick actions | 🟠 P1 |
| `AdminTabs` | Tab navigation in detail pages | 🟠 P1 |
| `AdminWizard` | Multi-step forms | 🟠 P1 |
| `AdminSettingsNav` | Settings sub-navigation | 🟡 P2 |
| `AdminActivityTimeline` | Activity/audit display | 🟡 P2 |
| `AdminConfirmDialog` | Destructive action confirmation | 🔴 P0 |
| `AdminBulkActions` | Multi-select actions | 🟡 P2 |

### 5.4 Responsive Strategy

**Breakpoints:**
- `< 768px`: Mobile (sidebar hidden, hamburger menu)
- `768px - 1024px`: Tablet (collapsed sidebar)
- `> 1024px`: Desktop (full sidebar)

**Mobile Adaptations:**
- Tables become card lists
- Stats grid becomes single column
- Wizard steps become stepper dots
- Actions move to bottom sheet

---

## Section 6: Technical Architecture

### 6.1 Folder Structure (Target)

```
app/admin/
├── layout.tsx                    # AdminLayout with RBAC gate
├── page.tsx                      # Dashboard
├── (system)/                     # System admin only routes
│   ├── layout.tsx               # System admin RBAC check
│   ├── tenants/
│   │   ├── page.tsx
│   │   └── [tenantId]/
│   │       ├── page.tsx
│   │       └── members/page.tsx
│   ├── users/
│   ├── products/
│   ├── billing/
│   ├── moderation/
│   ├── audit/
│   └── system/
│       ├── health/page.tsx
│       └── features/page.tsx
└── tenant/[tenantId]/           # License admin routes (tenant-scoped)
    ├── layout.tsx               # Tenant admin RBAC check
    ├── page.tsx
    ├── members/page.tsx
    ├── settings/page.tsx
    └── analytics/page.tsx

features/admin/
├── shared/                       # Shared admin utilities
│   ├── hooks/
│   │   ├── useAdminData.ts
│   │   ├── useAdminTable.ts
│   │   └── useRbac.ts
│   ├── types/
│   │   └── admin.types.ts
│   └── utils/
│       └── adminHelpers.ts
├── dashboard/
│   ├── AdminDashboardPage.tsx
│   ├── components/
│   └── types.ts
├── tenants/
│   ├── TenantListPage.tsx
│   ├── TenantDetailPage.tsx
│   ├── TenantMembersPage.tsx
│   ├── components/
│   │   ├── TenantTable.tsx
│   │   ├── TenantForm.tsx
│   │   └── MemberList.tsx
│   ├── hooks/
│   │   └── useTenants.ts
│   └── types.ts
├── users/
│   ├── UserListPage.tsx
│   ├── UserDetailPage.tsx
│   ├── components/
│   ├── hooks/
│   └── types.ts
└── [other domains...]

components/admin/
├── AdminShell.tsx               # Main layout shell
├── AdminSidebar.tsx             # Left navigation
├── AdminTopbar.tsx              # Top header
├── AdminCommandPalette.tsx      # ⌘K modal
└── shared/
    ├── AdminBreadcrumbs.tsx
    ├── AdminConfirmDialog.tsx
    ├── AdminDataTable.tsx
    ├── AdminPageHeader.tsx
    ├── AdminPageLayout.tsx
    ├── AdminStatCard.tsx
    ├── AdminTabs.tsx
    ├── AdminWizard.tsx
    └── index.ts
```

### 6.2 RBAC Implementation

#### Route-Level Protection

```tsx
// app/admin/(system)/layout.tsx
import { redirect } from 'next/navigation'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isSystemAdmin } from '@/lib/utils/authRoles'

export default async function SystemAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/admin')
  }
  
  const { data: profile } = await supabase
    .from('users')
    .select('global_role')
    .eq('id', user.id)
    .single()
  
  if (!isSystemAdmin(user, profile?.global_role)) {
    redirect('/admin?error=unauthorized')
  }
  
  return <>{children}</>
}
```

#### Tenant-Scoped Protection

```tsx
// app/admin/tenant/[tenantId]/layout.tsx
import { redirect, notFound } from 'next/navigation'
import { createServerRlsClient } from '@/lib/supabase/server'
import { isTenantAdmin } from '@/lib/utils/tenantAuth'

export default async function TenantAdminLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params
  const supabase = await createServerRlsClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login?redirect=/admin')
  }
  
  // Check user has admin role in this specific tenant
  const hasAccess = await isTenantAdmin(tenantId, user.id)
  if (!hasAccess) {
    redirect('/admin?error=no_tenant_access')
  }
  
  return <>{children}</>
}
```

#### Component-Level RBAC Hook

```tsx
// features/admin/shared/hooks/useRbac.ts
import { useAuth } from '@/lib/supabase/auth'
import { useTenant } from '@/lib/context/TenantContext'

type Permission = 
  | 'admin.tenants.list' 
  | 'admin.tenants.create'
  | 'admin.users.list'
  | 'admin.users.create'
  | 'admin.billing.view'
  | 'admin.billing.manage'
  | 'admin.system.view'
  // ... more permissions

const permissionMap: Record<Permission, (role: string, tenantRole?: string) => boolean> = {
  'admin.tenants.list': (role) => role === 'system_admin',
  'admin.tenants.create': (role) => role === 'system_admin',
  'admin.users.list': (role) => role === 'system_admin',
  'admin.billing.view': (role, tenantRole) => 
    role === 'system_admin' || tenantRole === 'owner',
  'admin.billing.manage': (role) => role === 'system_admin',
  'admin.system.view': (role) => role === 'system_admin',
}

export function useRbac() {
  const { user, userRole } = useAuth()
  const { currentTenant, userTenantRole } = useTenant()
  
  const globalRole = user?.app_metadata?.role as string ?? userRole
  
  const can = (permission: Permission): boolean => {
    const check = permissionMap[permission]
    if (!check) return false
    return check(globalRole, userTenantRole ?? undefined)
  }
  
  const isSystemAdmin = globalRole === 'system_admin'
  const isTenantAdmin = userTenantRole === 'owner' || userTenantRole === 'admin'
  
  return {
    can,
    isSystemAdmin,
    isTenantAdmin,
    canAccessSystemAdmin: isSystemAdmin,
    canAccessTenantAdmin: isTenantAdmin,
  }
}

// Usage in component:
function SomeAdminButton() {
  const { can } = useRbac()
  
  if (!can('admin.tenants.create')) return null
  
  return <Button>Create Tenant</Button>
}
```

### 6.3 Data Access Patterns

```tsx
// features/admin/tenants/hooks/useTenants.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useRbac } from '@/features/admin/shared/hooks/useRbac'
import type { Tenant, TenantWithStats } from '../types'

interface UseTenantOptions {
  page?: number
  pageSize?: number
  search?: string
  status?: 'all' | 'active' | 'suspended'
}

export function useTenants(options: UseTenantOptions = {}) {
  const { page = 1, pageSize = 20, search, status = 'all' } = options
  const { isSystemAdmin } = useRbac()
  
  const [tenants, setTenants] = useState<TenantWithStats[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    if (!isSystemAdmin) {
      setError('Unauthorized')
      setIsLoading(false)
      return
    }
    
    const loadTenants = async () => {
      setIsLoading(true)
      
      let query = supabase
        .from('tenants')
        .select(`
          *,
          member_count:user_tenant_memberships(count),
          game_count:games(count)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1)
      
      if (search) {
        query = query.ilike('name', `%${search}%`)
      }
      
      if (status !== 'all') {
        query = query.eq('subscription_status', status)
      }
      
      const { data, count, error: queryError } = await query
      
      if (queryError) {
        setError(queryError.message)
      } else {
        setTenants(data ?? [])
        setTotal(count ?? 0)
      }
      
      setIsLoading(false)
    }
    
    loadTenants()
  }, [isSystemAdmin, page, pageSize, search, status])
  
  return { tenants, total, isLoading, error }
}
```

### 6.4 Type Definitions

```typescript
// features/admin/shared/types/admin.types.ts

// Base admin types
export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  global_role: GlobalRole
  created_at: string
  last_sign_in_at: string | null
}

export type GlobalRole = 'system_admin' | 'private_user' | 'demo_private_user' | 'member'

export interface AdminTenant {
  id: string
  name: string
  slug: string
  logo_url: string | null
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
  created_at: string
}

export type SubscriptionTier = 'free' | 'starter' | 'professional' | 'enterprise'
export type SubscriptionStatus = 'active' | 'past_due' | 'canceled' | 'trialing'

// Table/list types
export interface AdminTableColumn<T> {
  id: string
  header: string
  accessorKey?: keyof T
  accessorFn?: (row: T) => React.ReactNode
  sortable?: boolean
  width?: string
}

export interface AdminTableFilter {
  id: string
  label: string
  options: { value: string; label: string }[]
}

// Page component props
export interface AdminListPageProps<T> {
  data: T[]
  columns: AdminTableColumn<T>[]
  filters?: AdminTableFilter[]
  searchPlaceholder?: string
  createHref?: string
  createLabel?: string
}
```

---

## Section 7: Gap Analysis (Current vs Target)

### 7.1 Page Coverage Gaps

| Target Page | Current Status | Gap Type | Effort |
|-------------|----------------|----------|--------|
| `/admin` (dashboard) | ✅ Exists | None | - |
| `/admin/analytics` | ⚠️ Placeholder | **Needs implementation** | 5d |
| `/admin/tenants` | `/admin/organisations` exists | **Rename + enhance** | 2d |
| `/admin/tenants/[id]` | ❌ Missing | **New page** | 3d |
| `/admin/tenants/[id]/members` | ❌ Missing | **New page** | 2d |
| `/admin/users` | ✅ Complete | Minor polish | 1d |
| `/admin/users/[id]` | ❌ Missing | **New page** | 2d |
| `/admin/products` | ⚠️ Partial | Needs enhancement | 2d |
| `/admin/products/[id]` | ❌ Missing | **New page** | 2d |
| `/admin/games` | ❌ Missing | **New page** | 3d |
| `/admin/sessions` | ❌ Missing | **New page** | 3d |
| `/admin/achievements` | ⚠️ Placeholder | Merge two pages | 3d |
| `/admin/billing` | ⚠️ Partial | Needs Stripe integration | 5d |
| `/admin/moderation` | ⚠️ Placeholder | **Needs implementation** | 4d |
| `/admin/tickets` | ⚠️ Placeholder | **Needs implementation** | 3d |
| `/admin/audit` | `/admin/audit-logs` exists | Rename + implement | 3d |
| `/admin/system/health` | ✅ Complete | None | - |
| `/admin/system/features` | ❌ Missing | **New page** | 2d |
| `/admin/notifications` | ⚠️ Placeholder | **Needs implementation** | 3d |
| `/admin/settings` | ⚠️ Tenant-only | Add platform settings | 2d |
| `/admin/tenant/[id]/*` | ❌ Missing entirely | **New section (6 pages)** | 10d |

### 7.2 Component Gaps

| Component | Current | Target | Gap |
|-----------|---------|--------|-----|
| Breadcrumbs | ❌ None | Required on all pages | **Add** |
| Command Palette | ❌ None | ⌘K functionality | **Add** |
| Tabs | ❌ None | For detail pages | **Add** |
| Wizard | ❌ None | For create flows | **Add** |
| Activity Timeline | ❌ None | For audit display | **Add** |
| Confirm Dialog | ❌ None | For destructive actions | **Add** |

### 7.3 RBAC Gaps

| Area | Current | Target | Gap |
|------|---------|--------|-----|
| Route protection | Shell-level only | Per-route group | **Implement layouts** |
| UI visibility | None | Button/section hiding | **Add useRbac hook** |
| API enforcement | Exists (isSystemAdmin) | Already good | ✅ |
| Database RLS | Complete | Already good | ✅ |

### 7.4 UX Gaps

| Issue | Current | Target | Priority |
|-------|---------|--------|----------|
| No breadcrumbs | Lost in hierarchy | Clear navigation | 🔴 P0 |
| Hardcoded badges | Static "3", "5" | Dynamic counts | 🟠 P1 |
| No bulk actions | One-by-one | Multi-select | 🟡 P2 |
| No keyboard nav | Mouse only | ⌘K, arrow keys | 🟠 P1 |
| No empty states | Broken-looking | Helpful guidance | 🔴 P0 |
| Inconsistent density | Varies | Consistent padding | 🟡 P2 |

---

## Section 8: Refactoring Roadmap

### Phase 0: Quick Wins (1 week)

**Goal:** Immediate improvements with minimal effort.

| Task | Effort | Impact |
|------|--------|--------|
| Add `AdminBreadcrumbs` component | 2h | 🟢 High |
| Add `AdminConfirmDialog` component | 2h | 🟢 High |
| Fix empty states on placeholder pages | 4h | 🟢 High |
| Dynamic nav badges (fetch counts) | 4h | 🟢 Medium |
| Merge achievements pages | 2h | 🟢 Medium |
| Remove `/admin/support` (keep `/admin/tickets`) | 1h | 🟢 Low |
| Rename `/admin/organisations` → `/admin/tenants` | 2h | 🟢 Medium |

**Deliverable:** Cleaner navigation, working breadcrumbs, no more confusing duplicates.

---

### Phase 1: Core Structure (2-3 weeks)

**Goal:** Establish proper route structure and RBAC.

**Week 1:**
- [ ] Create `app/admin/(system)/layout.tsx` with system_admin check
- [ ] Create `app/admin/tenant/[tenantId]/layout.tsx` with tenant admin check
- [ ] Implement `useRbac` hook
- [ ] Move existing pages to proper locations

**Week 2:**
- [ ] Build `/admin/tenants` list page (proper table, filters)
- [ ] Build `/admin/tenants/[id]` detail page with tabs
- [ ] Build `/admin/tenants/[id]/members` page
- [ ] Build `/admin/users/[id]` detail page

**Week 3:**
- [ ] Build `/admin/tenant/[tenantId]` dashboard for license admins
- [ ] Build `/admin/tenant/[tenantId]/members` for license admins
- [ ] Build `/admin/tenant/[tenantId]/settings` for license admins
- [ ] Test RBAC thoroughly

**Deliverable:** Clear system vs tenant admin separation, working RBAC, proper URL structure.

---

### Phase 2: Domain Completion (3-4 weeks)

**Goal:** Fill in missing admin pages for all domains.

**Week 1: Games & Sessions**
- [ ] `/admin/games` list page
- [ ] `/admin/games/[id]` detail page
- [ ] `/admin/sessions` active sessions list
- [ ] `/admin/sessions/[id]` session detail (participants, scores)

**Week 2: Gamification**
- [ ] Redesign `/admin/achievements` with full CRUD
- [ ] Add achievement builder wizard
- [ ] `/admin/leaderboards` configuration

**Week 3: Operations**
- [ ] `/admin/moderation` queue with actions
- [ ] `/admin/tickets` with status workflow
- [ ] `/admin/audit` log viewer with filters

**Week 4: Platform**
- [ ] `/admin/system/features` feature flag management
- [ ] `/admin/notifications` templates + broadcast
- [ ] `/admin/settings` platform-wide settings

**Deliverable:** Complete admin coverage for all domains.

---

### Phase 3: Polish & Power Features (2 weeks)

**Goal:** Make admin world-class.

**Week 1:**
- [ ] Implement command palette (⌘K)
- [ ] Add keyboard navigation throughout
- [ ] Implement bulk actions on tables
- [ ] Add export functionality (CSV, Excel)

**Week 2:**
- [ ] Add real-time updates (subscriptions)
- [ ] Implement admin activity feed
- [ ] Add admin notifications (in-app)
- [ ] Performance optimization (pagination, virtual lists)

**Deliverable:** Professional, efficient admin experience.

---

### Phase 4: Advanced Features (Ongoing)

**Future enhancements:**
- [ ] AI-powered moderation suggestions
- [ ] Anomaly detection alerts
- [ ] Custom report builder
- [ ] Admin action scheduling
- [ ] White-label admin for enterprise tenants

---

## Section 9: Risks & Trade-offs

### 9.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **RBAC regression** | Medium | High | Add route tests, manual QA checklist |
| **Breaking existing admin users** | Low | Medium | Feature flag new admin, gradual rollout |
| **Performance with large tables** | Medium | Medium | Virtual scrolling, server pagination |
| **State sync issues** | Low | Low | Use React Query / SWR for caching |

### 9.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep** | High | Medium | Strict phase gates, MVP mindset |
| **Over-engineering** | Medium | Low | Start simple, add complexity when needed |
| **User confusion during transition** | Medium | Medium | Clear communication, documentation |

### 9.3 Trade-off Decisions

| Decision | Trade-off | Rationale |
|----------|-----------|-----------|
| **Separate routes for system vs tenant admin** | More complexity | Cleaner RBAC, better mental model |
| **Server components where possible** | Less interactivity | Better performance, simpler auth |
| **Feature folders over domain folders** | Deviation from DDD | Admin is cross-cutting, needs own structure |
| **Keep existing AdminShell** | Some refactoring needed | Avoid rewriting working code |

---

## Section 10: Quick Wins (<1 day fixes)

### Immediate Actions (Today)

1. **Add AdminBreadcrumbs** (2 hours)
   ```tsx
   // components/admin/shared/AdminBreadcrumbs.tsx
   export function AdminBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
     return (
       <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
         {items.map((item, i) => (
           <Fragment key={item.label}>
             {i > 0 && <ChevronRightIcon className="h-4 w-4" />}
             {item.href ? (
               <Link href={item.href} className="hover:text-foreground">
                 {item.label}
               </Link>
             ) : (
               <span className="text-foreground font-medium">{item.label}</span>
             )}
           </Fragment>
         ))}
       </nav>
     )
   }
   ```

2. **Fix placeholder pages** (4 hours)
   - Add proper `AdminEmptyState` to all stub pages
   - Include "Coming Soon" messaging with expected timeline

3. **Dynamic nav badges** (3 hours)
   - Create `/api/admin/nav-counts` endpoint
   - Return moderation queue count, open tickets count
   - Fetch in sidebar, update badges

---

## Section 11: Execution Handoff to Claude (step-by-step prompt)

Use this prompt for Claude. After each step, Claude must produce a short summary of findings/problems to hand back for fixes.

**Prompt to Claude**

You are now the executor for the Lekbanken admin redesign plan (see ADMIN_REDESIGN_PLAN.md). Work in small, verifiable steps. After each step, write a short summary of what changed, issues found, and what to fix next. That summary will be handed to another engineer for follow-up fixes.

Follow these steps:
1) **P0 Quick Wins**
   - Add AdminBreadcrumbs and “acting as tenant” banner to current /admin layout.
   - Add role-filtered nav badges and active states.
   - Fill placeholders with meaningful empty states; merge duplicate achievement/admin pages if present.
   - Add AdminConfirmDialog and reuse for destructive actions.
   - Run eslint; fix easy issues in admin/sandbox (type-only imports, obvious any/unused vars); clean up unused eslint-disables (LogoLockup or move to next/image + loader).
   - Summary: note remaining lint errors or blockers.
2) **P1 Core Structure**
   - Implement new `/admin/(shell)/layout` with AdminShell (sidebar, topbar, breadcrumbs, command palette placeholder, notifications placeholder, tenant switcher for system_admin, “acting as” banner).
   - Add nav config with allowedRoles; routes for system_admin `/admin/*` and license_admin `/admin/tenant/[tenantId]/*`.
   - Move two domains into new shell to prove pattern: Tenants & Accounts (list + detail) and GamificationConfig (global + tenant).
   - Summary: gaps, missing data models, or auth/RBAC questions.
3) **P2 Domain Migration (iterative)**
   - Migrate remaining domains to new IA (games/product, planner, gamification details, media, API/webhooks, billing/licenses, support, ops/platform).
   - Standardize patterns: index table, detail with tabs, settings sections, wizards.
   - Add shared table + filters + form components in `features/admin/shared`.
   - Summary: list pages still using old shell, data/typing gaps, blockers.
4) **P3 Polish**
   - Implement command palette (Cmd+K), bulk actions/export, saved views, admin notifications center.
   - Add guard rails for destructive actions, keyboard shortcuts, advanced ops views (logs/incidents/releases/feature flags).
   - Summary: remaining polish items, performance/UX concerns.

General guidelines:
- Keep changes small and commit-ready; avoid massive PRs.
- Enforce RBAC in layout and nav; filter UI by role.
- Prefer server data fetching and tenant scoping; avoid heavy client-only fetches.
- When blocked by missing API/data, stub clearly and report in the summary.

4. **Merge achievements pages** (1 hour)
   - Delete `/admin/achievements-advanced`
   - Rename `/admin/achievements` to handle both
   - Update navigation

5. **Add AdminConfirmDialog** (2 hours)
   - Generic dialog for delete/dangerous actions
   - Require typing confirmation for critical actions

### This Week Priorities

| Priority | Task | Owner | Deadline |
|----------|------|-------|----------|
| 🔴 P0 | Add breadcrumbs to all pages | Dev 1 | Day 1 |
| 🔴 P0 | Fix empty states | Dev 1 | Day 2 |
| 🟠 P1 | Dynamic nav badges | Dev 2 | Day 2 |
| 🟠 P1 | Merge achievements | Dev 1 | Day 2 |
| 🟠 P1 | Add confirm dialog | Dev 2 | Day 3 |
| 🟡 P2 | Rename orgs → tenants | Dev 1 | Day 3 |

---

## Appendix A: Navigation Configuration (Target)

```typescript
// app/admin/components/admin-nav-config.ts

export type NavGroup = {
  id: string
  label: string
  items: NavItem[]
  requiredRole?: 'system_admin' | 'tenant_admin'
}

export type NavItem = {
  id: string
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: () => Promise<number | null>
  requiredRole?: 'system_admin' | 'tenant_admin'
}

export const adminNavGroups: NavGroup[] = [
  {
    id: 'overview',
    label: 'Översikt',
    items: [
      { id: 'dashboard', href: '/admin', label: 'Dashboard', icon: HomeIcon },
      { id: 'analytics', href: '/admin/analytics', label: 'Analytics', icon: ChartBarIcon },
    ],
  },
  {
    id: 'manage',
    label: 'Hantera',
    requiredRole: 'system_admin',
    items: [
      { id: 'tenants', href: '/admin/tenants', label: 'Organisationer', icon: BuildingOfficeIcon },
      { id: 'users', href: '/admin/users', label: 'Användare', icon: UsersIcon },
      { id: 'products', href: '/admin/products', label: 'Produkter', icon: CubeIcon },
      { id: 'games', href: '/admin/games', label: 'Spel', icon: PuzzlePieceIcon },
    ],
  },
  {
    id: 'players',
    label: 'Spelare',
    items: [
      { id: 'sessions', href: '/admin/sessions', label: 'Sessioner', icon: PlayIcon },
      { id: 'achievements', href: '/admin/achievements', label: 'Achievements', icon: TrophyIcon },
      { id: 'leaderboards', href: '/admin/leaderboards', label: 'Leaderboards', icon: ChartBarIcon },
    ],
  },
  {
    id: 'operations',
    label: 'Drift',
    requiredRole: 'system_admin',
    items: [
      { id: 'billing', href: '/admin/billing', label: 'Fakturering', icon: CreditCardIcon },
      { id: 'moderation', href: '/admin/moderation', label: 'Moderering', icon: ShieldCheckIcon, 
        badge: async () => fetch('/api/admin/moderation/count').then(r => r.json()) },
      { id: 'tickets', href: '/admin/tickets', label: 'Ärenden', icon: TicketIcon,
        badge: async () => fetch('/api/admin/tickets/count').then(r => r.json()) },
      { id: 'audit', href: '/admin/audit', label: 'Audit Logs', icon: DocumentMagnifyingGlassIcon },
    ],
  },
  {
    id: 'system',
    label: 'System',
    requiredRole: 'system_admin',
    items: [
      { id: 'health', href: '/admin/system/health', label: 'System Health', icon: HeartIcon },
      { id: 'features', href: '/admin/system/features', label: 'Feature Flags', icon: FlagIcon },
      { id: 'notifications', href: '/admin/notifications', label: 'Notifikationer', icon: BellIcon },
      { id: 'settings', href: '/admin/settings', label: 'Inställningar', icon: CogIcon },
    ],
  },
]

// For license admins, show tenant-scoped navigation
export const tenantNavGroups: NavGroup[] = [
  {
    id: 'tenant-overview',
    label: 'Min Organisation',
    items: [
      { id: 'tenant-dashboard', href: '/admin/tenant/[id]', label: 'Dashboard', icon: HomeIcon },
      { id: 'tenant-members', href: '/admin/tenant/[id]/members', label: 'Medlemmar', icon: UsersIcon },
      { id: 'tenant-settings', href: '/admin/tenant/[id]/settings', label: 'Inställningar', icon: CogIcon },
    ],
  },
  // ... more groups
]
```

---

## Appendix B: Example RBAC Middleware

```typescript
// middleware.ts (add to existing)

const SYSTEM_ADMIN_ROUTES = [
  '/admin/tenants',
  '/admin/users',
  '/admin/products',
  '/admin/billing',
  '/admin/moderation',
  '/admin/audit',
  '/admin/system',
]

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  if (pathname.startsWith('/admin')) {
    const supabase = createMiddlewareClient({ req: request, res: NextResponse.next() })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.redirect(new URL('/auth/login?redirect=/admin', request.url))
    }
    
    const role = session.user.app_metadata?.role
    const isSystemAdmin = role === 'system_admin'
    
    // Check if accessing system admin only routes
    const isSystemRoute = SYSTEM_ADMIN_ROUTES.some(r => pathname.startsWith(r))
    
    if (isSystemRoute && !isSystemAdmin) {
      return NextResponse.redirect(new URL('/admin?error=unauthorized', request.url))
    }
    
    // Check tenant routes
    if (pathname.match(/^\/admin\/tenant\/([^\/]+)/)) {
      const tenantId = pathname.split('/')[3]
      // Verify user has access to this tenant (via RLS or additional check)
    }
  }
  
  return NextResponse.next()
}
```

---

## Document Changelog

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-12-12 | Claude Opus 4.5 | Initial comprehensive analysis and plan |

---

**Next Steps:**
1. Review this document with the team
2. Prioritize Phase 0 quick wins
3. Create Jira/Linear tickets for Phase 1
4. Schedule design review for new components
5. Begin implementation 🚀
