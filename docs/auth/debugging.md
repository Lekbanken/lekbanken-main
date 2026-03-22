# Auth/Tenant Debugging

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-15
- Last updated: 2026-03-21
- Last validated: 2026-03-21

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
- No tenant: check `lb_tenant` cookie validity and membership data; resolver should auto-select a valid tenant when memberships exist.
- Admin blocked: confirm JWT claim `system_admin` present or `global_role` persisted via consolidation migration.

## Validation checklist

- Debug steps above reference real routes/files that exist in this repo.
