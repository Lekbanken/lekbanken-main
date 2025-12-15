# Auth/Tenant Debugging

- Check proxy: verify redirects for `/app`/`/admin`, and that `x-request-id`/`x-tenant-id` headers are set when authenticated.
- Inspect cookies: `sb-*` (Supabase session), `lb_tenant` (signed, httpOnly). Use `tenantCookie` helpers to clear/set in server actions if needed.
- Server context: `getServerAuthContext()` returns user, profile, memberships, effectiveGlobalRole, activeTenant. Log this in layouts for diagnostics.
- Client context: use `/sandbox/auth-demo` and `AuthDebugPanel` to inspect `useAuth`/`useTenant` state.
- Common issues:
  - No profile/role: ensure migration `20251215000000_fix_profile_sync_on_update.sql` applied.
  - No tenant: check `lb_tenant` cookie validity; use `/app/select-tenant`.
  - Admin blocked: confirm JWT claim `system_admin` present or `global_role` persisted via consolidation migration.
