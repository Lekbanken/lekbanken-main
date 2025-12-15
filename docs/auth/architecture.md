# Auth Architecture (Server-First)

- Server context: `lib/auth/server-context.ts` fetches user, profile, memberships, resolves tenant; used in layouts and server components.
- Proxy middleware: `proxy.ts` enforces auth for `/app` and `/admin`, guards guest-only auth routes, applies admin gate via JWT claims, sets `x-request-id`, refreshes signed httpOnly `lb_tenant`, and attaches `x-tenant-id` when known.
- Client provider: `lib/supabase/auth.tsx` accepts initial server data to avoid flicker; listens only for auth state changes.
- Tenant provider: `lib/context/TenantContext.tsx` can hydrate from server data and refresh on auth changes.
- Cookies/headers: auth via Supabase (`sb-*`), tenant via signed `lb_tenant`, header `x-tenant-id` for tenant-aware API calls.
