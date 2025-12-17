# Tenant Resolution

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

## Related code (source of truth)

- `lib/tenant/resolver.ts`
- `lib/utils/tenantCookie.ts`
- `lib/utils/tenantAuth.ts`
- `proxy.ts`

- Resolver: `lib/tenant/resolver.ts`
  - Order: path override `/app/t/[tenantId]/...` → signed httpOnly `lb_tenant` → primary membership → single membership.
  - Redirects (when memberships known): multiple = `/app/select-tenant`, none = `/app/no-access`.
  - Middleware suppresses “no-access” when memberships are unknown (claims-only).
- Cookie: `lb_tenant` signed via `lib/utils/tenantCookie.ts`, httpOnly, set/cleared in middleware and server actions.
- Header: `x-tenant-id` added in proxy when tenant is resolved; client fetchers should include it for tenant-scoped APIs.
- Picker pages: `/app/select-tenant` (choose) and `/app/no-access` (no memberships).

## Membership data

- Canonical source: `public.user_tenant_memberships` (used by server context, client auth, and APIs).
- Compatibility layer: `public.tenant_memberships` may exist as a view forwarding to `user_tenant_memberships` (see `supabase/migrations/20251209120000_accounts_domain.sql`).
- Rule of thumb: prefer `user_tenant_memberships` in code + docs; treat `tenant_memberships` as legacy/compat only.
