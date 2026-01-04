# Admin AppShell Architecture

This document describes the Admin panel's shell architecture, context separation, and navigation system.

## Overview

The Admin AppShell provides the layout structure for the `/admin/*` routes. It features:

- **Collapsible category-based sidebar navigation**
- **Clear separation between System Admin and Organisation Admin contexts**
- **Organisation switcher for tenant-scoped administration**
- **Responsive design with mobile drawer support**

## Context Separation

### System Admin Mode

When operating as a **System Admin** (platform administrator):

- Full access to all platform-wide settings
- Can view and manage all organisations
- Can switch to Organisation mode to administer specific tenants
- No "acting as" indicator shown (they ARE the system admin)
- Routes: `/admin`, `/admin/users`, `/admin/organisations`, etc.

### Organisation Admin Mode

When operating as an **Organisation Admin** (tenant administrator):

- Access limited to selected organisation's resources
- Organisation switcher visible in sidebar
- Organisation name shown in topbar
- Routes: `/admin/tenant/[tenantId]/*`

## How Context is Derived

1. **User's `effectiveGlobalRole`** is checked in `app/admin/layout.tsx`
2. If `system_admin`, user can switch between System and Organisation modes
3. If not system admin, user is restricted to their tenant memberships
4. The `useAdminMode` hook (localStorage-persisted) tracks current mode

```typescript
// Mode is stored in localStorage
const STORAGE_KEY = 'lekbanken_admin_mode'

// Derived from role
const isSystemAdmin = effectiveGlobalRole === 'system_admin'
const mode = isSystemAdmin ? storedMode : 'tenant'
```

## Navigation Structure

Navigation is defined in `lib/admin/nav.ts`:

```typescript
export const ADMIN_NAV: AdminNavConfig = {
  system: [/* System admin categories */],
  organisation: [/* Tenant admin categories */],
}
```

### Categories

Each category contains:
- `id`: Unique identifier
- `label`: Display name
- `icon`: Icon key from `navIcons`
- `items`: Array of nav items

### Items

Each item contains:
- `id`: Unique identifier
- `label`: Display name
- `href`: Route path (supports `[tenantId]` placeholder)
- `icon`: Optional icon key
- `permission`: Optional RBAC permission check
- `systemAdminOnly`: Only show for system admins
- `tenantOnly`: Only show when tenant is selected

## Organisation Switcher

The `AdminOrgSwitcher` component:

1. Lists all tenants where user has admin-level role (`owner`, `admin`, `editor`)
2. Allows switching between organisations
3. Updates the tenant cookie via `selectTenant` server action
4. Navigates to the new tenant's admin dashboard

Only visible in Organisation Admin mode.

## Key Components

| Component | Path | Purpose |
|-----------|------|---------|
| `AdminShellV2` | `components/admin/AdminShellV2.tsx` | Main shell wrapper |
| `AdminSidebarV2` | `components/admin/AdminSidebarV2.tsx` | Collapsible sidebar |
| `AdminTopbarV2` | `components/admin/AdminTopbarV2.tsx` | Top navigation bar |
| `AdminOrgSwitcher` | `components/admin/AdminOrgSwitcher.tsx` | Tenant switcher |

## Legacy Components

The following components are deprecated but kept for backwards compatibility:

- `AdminShell` - Old shell (replaced by V2)
- `AdminSidebar` - Old sidebar (replaced by V2)
- `AdminTopbar` - Old topbar (replaced by V2)
- `ActingAsTenantBanner` - Removed from main shell (context shown in topbar instead)

## Responsive Behavior

- **Desktop (lg+)**: Fixed sidebar, collapsible to icons only
- **Mobile**: Hidden sidebar, opens as sheet/drawer on menu button tap
- Collapsed state persisted in component state (could be moved to localStorage)

## Styling

The admin shell uses:
- Dark theme sidebar (`bg-slate-900`)
- Light/dark adaptive main content area
- Primary color accents for active states
- Consistent with shadcn/ui design tokens

## Adding New Routes

1. Add the route to `lib/admin/nav.ts` in the appropriate category
2. Ensure RBAC permission is defined if needed
3. Create the page component in `app/admin/[path]/page.tsx`
