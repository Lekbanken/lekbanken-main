# Auth/Tenant Debugging

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- `proxy.ts`
- `lib/auth/server-context.ts`
- `lib/supabase/auth.tsx`
- `lib/tenant/resolver.ts`
- `lib/utils/tenantCookie.ts`

## Checklist

- Check proxy: verify redirects for `/app`/`/admin`, and that `x-request-id`/`x-tenant-id` headers are set when authenticated.
- Inspect cookies: `sb-*` (Supabase session), `lb_tenant` (signed, httpOnly). Use tenant cookie helpers to clear/set in server actions if needed.
- Server context: `getServerAuthContext()` returns user, profile, memberships, effectiveGlobalRole, activeTenant.
- Client context: use `/sandbox/auth-demo` and `AuthDebugPanel` to inspect `useAuth`/`useTenant` state.

## Common issues

- No profile/role: ensure migration `20251215000000_fix_profile_sync_on_update.sql` applied.
- No tenant: check `lb_tenant` cookie validity; use `/app/select-tenant`.
- Admin blocked: confirm JWT claim `system_admin` present or `global_role` persisted via consolidation migration.

## Validation checklist

- Debug steps above reference real routes/files that exist in this repo.
