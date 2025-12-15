# Route Protection & Redirects

- Protected paths: `/app/*`, `/admin/*` (proxy redirects unauthenticated to `/auth/login?redirect=...`).
- Guest-only: `/auth/login`, `/auth/signup` (proxy redirects authenticated users to `/app`; excludes `/auth/callback`, `/auth/signout`, `/auth/recovery`).
- Admin: proxy checks JWT claims for `system_admin` (and legacy admin/superadmin); non-admins hitting `/admin/*` are redirected to `/app`.
- App tenant flow:
  - Multiple memberships and no tenant → `/app/select-tenant`
  - Zero memberships → `/app/no-access`
  - Path override `/app/t/[tenantId]/...` sets tenant cookie.
- Marketing: stays public; auth usage should never block rendering (use skeletons instead of full-page spinners).
