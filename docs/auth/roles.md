# Roles & Permissions

- Global roles: `global_role_enum` (`system_admin`, `private_user`, `demo_private_user`, `member`).
- Legacy `users.role` is deprecated; migration `20251216000000_consolidate_roles.sql` maps legacy admin/superadmin → `system_admin`.
- Effective role derivation: `deriveEffectiveGlobalRole` prioritises `profile.global_role` → JWT `app_metadata.role === system_admin` → legacy `profile.role` → `null`.
- Tenant roles: `tenant_role_enum` (`owner`, `admin`, `editor`, `member`, ...). Exposed via `TenantContext`.
- Admin gating:
  - Middleware: claims-based check for `system_admin` on `/admin/*`.
  - Client: `useRbac` uses `effectiveGlobalRole` + current tenant role.
  - AdminShell: `system_admin` only for global admin access.
