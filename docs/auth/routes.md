# Route Protection & Redirects

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-15
- Last updated: 2026-03-21
- Last validated: 2026-03-21

## Related code (source of truth)

- `proxy.ts`
- `lib/auth/middleware-helpers.ts`
- `lib/auth/role.ts`
- `lib/tenant/resolver.ts`
- `lib/utils/tenantCookie.ts`

## Validation checklist

- `proxy.ts` protects `/app/*` and `/admin/*` and redirects unauthenticated users to `/auth/login?redirect=...`.
- Authenticated users hitting guest-only auth routes are redirected to `/app` (with explicit exceptions like callback/signout/recovery).
- `/admin/*` requires `system_admin` (including legacy admin/superadmin mapping).
- Tenant resolution/redirect behavior matches `lib/tenant/resolver.ts`.

- Protected paths: `/app/*`, `/admin/*` (proxy redirects unauthenticated to `/auth/login?redirect=...`).
- Guest-only: `/auth/login`, `/auth/signup` (proxy redirects authenticated users to `/app`; excludes `/auth/callback`, `/auth/signout`, `/auth/recovery`).
- Admin: proxy checks JWT claims for `system_admin` (and legacy admin/superadmin); non-admins hitting `/admin/*` are redirected to `/app`.
- App tenant flow:
  - Path override `/app/t/[tenantId]/...` has highest priority and bypasses membership checks in middleware
  - Valid `lb_tenant` cookie or primary/single membership is reused when available
  - If no explicit tenant is selected but memberships exist, resolver auto-selects the first available tenant (preferring `is_primary`)
  - Zero memberships → `/app/no-access`
  - Path override `/app/t/[tenantId]/...` sets tenant cookie.
- Marketing: stays public; auth usage should never block rendering (use skeletons instead of full-page spinners).
