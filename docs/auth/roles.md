# Roles & Permissions

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-06-25

## Overview

This system has **two distinct role systems** that serve different purposes:

1. **Global Role (`global_role_enum`)** - System-wide permissions
2. **Tenant Role (`tenant_role_enum`)** - Organisation/tenant-specific permissions

### Understanding the Difference

| Aspect | Global Role | Tenant Role |
|--------|-------------|-------------|
| **Scope** | Entire system | Per organisation/tenant |
| **Storage** | `users.global_role` column | `user_tenant_memberships.role` column |
| **Purpose** | Platform administration | Organisation management |
| **Who gets it** | System admins, private users | All users with memberships |

---

## Global Roles (`global_role_enum`)

**Database:** `users.global_role` column

| Role | Description | Admin Access |
|------|-------------|--------------|
| `system_admin` | Full system administrator | ✅ Full /admin access |
| `private_user` | Private/individual user | ❌ No admin access |
| `demo_private_user` | Demo private user | ❌ No admin access |
| `member` | **DEFAULT** - Standard user | ❌ No admin access |

### Important: `member` is NOT a system role

The global role `member` is the **default** value for all regular users. It does **NOT** grant any special system privileges. Only `system_admin` grants access to the /admin section.

**In the Admin UI:**
- Users with `system_admin` show a "Systemadmin" badge
- Users with `member`, `private_user`, or `demo_private_user` show no system role badge (they're "Standard" users)

---

## Tenant Roles (`tenant_role_enum`)

**Database:** `user_tenant_memberships.role` column

Each user can be a member of multiple tenants (organisations), with a specific role in each.

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `owner` | Organisation owner | Full control, billing, delete org |
| `admin` | Organisation administrator | Manage users, content, settings |
| `editor` | Content editor | Create/edit content, sessions |
| `member` | Regular member | View, participate in sessions |
| `organisation_admin` | Legacy admin role | (Deprecated) |
| `organisation_user` | Legacy user role | (Deprecated) |
| `demo_org_admin` | Demo organisation admin | Demo purposes |
| `demo_org_user` | Demo organisation user | Demo purposes |

### Membership Properties

Each `user_tenant_memberships` record contains:
- `user_id` - The user
- `tenant_id` - The organisation
- `role` - The tenant role (from enum above)
- `status` - active, invited, pending, etc.
- `is_primary` - Whether this is the user's primary tenant

---

## Related code (source of truth)

- `lib/auth/role.ts` - Canonical global role derivation
- `lib/auth/middleware-helpers.ts` - Middleware role checks
- `proxy.ts` - Proxy authentication
- `lib/auth/server-context.ts` - Server-side auth context
- `lib/supabase/auth.tsx` - Client-side auth context

### Role Derivation Priority

The effective global role is derived with this precedence (see `lib/auth/role.ts`):

1. `profile.global_role` (DB column)
2. JWT claims: `user.app_metadata.role` (maps legacy `admin|superadmin` → `system_admin`)
3. JWT: `user.app_metadata.global_role` → `user.user_metadata.global_role`
4. Legacy: `profile.role` (maps `admin|superadmin` → `system_admin`)
5. `null` (no role)

---

## Admin Access Gating

### Middleware (Server)
- Claims-based check for `system_admin` on `/admin/*` routes
- Uses `lib/auth/middleware-helpers.ts`

### Client Components
- `useRbac` hook uses `effectiveGlobalRole` + current tenant role
- `AdminShell` requires `system_admin` for global admin access

### Database
- Migration `20251216000000_consolidate_roles.sql` maps legacy roles:
  - `admin` → `system_admin`
  - `superadmin` → `system_admin`

---

## Validation Checklist

- ✅ Only one implementation of global role precedence: `lib/auth/role.ts`
- ✅ Proxy uses claims via `lib/auth/middleware-helpers.ts`
- ✅ Server uses `lib/auth/server-context.ts`
- ✅ Client uses `lib/supabase/auth.tsx`
- ✅ Both import the canonical helper from `lib/auth/role.ts`
- ✅ DB migration remains source of truth for legacy role mapping

---

## Common Mistakes

### ❌ Showing "Medlem" as a system role
The `member` global role is the DEFAULT, not a special system role. Don't display it as if it grants special access.

### ❌ Confusing global and tenant roles
- Global role = system-wide (system_admin has /admin access)
- Tenant role = per-organisation (owner/admin manages that org)

### ❌ Checking wrong role for admin access
Always check `global_role === 'system_admin'` for /admin access, not tenant roles.
