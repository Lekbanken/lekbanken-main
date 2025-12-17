# Route Protection & Redirects

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

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
  - Multiple memberships and no tenant → `/app/select-tenant`
  - Zero memberships → `/app/no-access`
  - Path override `/app/t/[tenantId]/...` sets tenant cookie.
- Marketing: stays public; auth usage should never block rendering (use skeletons instead of full-page spinners).
