# Tenant Resolution

- Resolver: `lib/tenant/resolver.ts`
  - Order: path override `/app/t/[tenantId]/...` → signed httpOnly `lb_tenant` → primary membership → single membership.
  - Redirects (when memberships known): multiple = `/app/select-tenant`, none = `/app/no-access`.
  - Middleware suppresses “no-access” when memberships are unknown (claims-only).
- Cookie: `lb_tenant` signed via `lib/utils/tenantCookie.ts`, httpOnly, set/cleared in middleware and server actions.
- Header: `x-tenant-id` added in middleware when tenant is resolved; client fetchers should include it for tenant-scoped APIs.
- Picker pages: `/app/select-tenant` (choose) and `/app/no-access` (no memberships).
