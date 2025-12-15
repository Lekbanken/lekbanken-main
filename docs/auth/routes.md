# Route Protection & Redirects

- Protected paths: `/app/*`, `/admin/*` (middleware redirects unauthenticated to `/auth/login?redirect=...`).
- Guest-only: `/auth/login`, `/auth/signup` (middleware redirects authenticated users to `/app`; excludes `/auth/callback`, `/auth/signout`, `/auth/recovery`).
- Admin: middleware checks JWT claims for `system_admin`; non-admins hitting `/admin/*` are redirected to `/app`.
- App tenant flow:
  - Multiple memberships and no tenant → `/app/select-tenant`
  - Zero memberships → `/app/no-access`
  - Path override `/app/t/[tenantId]/...` sets tenant cookie.
- Marketing: stays public; auth usage should never block rendering (use skeletons instead of full-page spinners).
