# Roles & Permissions

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- `lib/auth/role.ts`
- `lib/auth/middleware-helpers.ts`
- `proxy.ts`
- `lib/auth/server-context.ts`
- `lib/supabase/auth.tsx`

- Global roles: `global_role_enum` (`system_admin`, `private_user`, `demo_private_user`, `member`).
- Legacy `users.role` is deprecated; migration `20251216000000_consolidate_roles.sql` maps legacy admin/superadmin → `system_admin`.
- Effective global role derivation (canonical): `lib/auth/role.ts`.
  - Precedence:
    1) `profile.global_role` (DB)
    2) JWT claims: `user.app_metadata.role` (`system_admin` OR legacy `admin|superadmin` → `system_admin`)
    3) JWT global role: `user.app_metadata.global_role` → `user.user_metadata.global_role`
    4) Legacy `profile.role` (`admin|superadmin` → `system_admin`)
    5) `null`
- Tenant roles: `tenant_role_enum` (`owner`, `admin`, `editor`, `member`, ...). Exposed via `TenantContext`.
- Admin gating:
  - Middleware: claims-based check for `system_admin` on `/admin/*`.
  - Client: `useRbac` uses `effectiveGlobalRole` + current tenant role.
  - AdminShell: `system_admin` only for global admin access.

## Validation checklist

- There is only one implementation of global role precedence: `lib/auth/role.ts`.
- Proxy uses claims via `lib/auth/middleware-helpers.ts` (no duplicated logic in `proxy.ts`).
- Server uses `lib/auth/server-context.ts` and client uses `lib/supabase/auth.tsx`, both importing the canonical helper.
- DB migration `20251216000000_consolidate_roles.sql` remains the source of truth for legacy role mapping.
