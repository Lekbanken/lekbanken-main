# ACCOUNTS DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
Accounts Domain is responsible for identity, authentication, sessions, and global authorization primitives.

It owns:
- Users and profiles
- Authentication/session lifecycle (Supabase)
- Global roles (e.g. system admin) and how they are derived
- Tenant membership primitives (consumed heavily by Tenant/Billing/etc)
- Route-level auth gating and redirects (app/admin vs guest-only routes)

Non-goals:
- Tenant lifecycle (Tenant Domain)
- Per-domain authorization rules (other domains consume `user` + effective roles + tenant role)

## Start here (canonical)
The detailed, repo-anchored auth documentation lives under `docs/auth/*`:
- `docs/auth/README.md` (start here)
- `docs/auth/roles.md` (global roles + tenant roles)
- `docs/auth/routes.md` (route protection + redirects)
- `docs/auth/tenant.md` (tenant resolution + cookie/header)
- `docs/auth/architecture.md` (server-first architecture)
- `docs/auth/debugging.md` (runbook)

## Related code (source of truth)

### Route protection
- `proxy.ts` (auth gates for `/app` + `/admin`, guest-only routes, admin gate)

### Server auth context (preferred aggregation point)
- `lib/auth/server-context.ts`
- `lib/auth/role.ts` (canonical effective global role derivation)
- `lib/auth/middleware-helpers.ts`

### Supabase clients
- `lib/supabase/server.ts` (`createServerRlsClient()`)
- `lib/supabase/client.ts`
- `lib/supabase/auth.tsx` (client provider + hooks)

### Tenant membership helpers (consumed across domains)
- `lib/tenant/resolver.ts`
- `lib/utils/tenantCookie.ts`
- `lib/utils/tenantAuth.ts`

## Core concepts

### User vs profile
- **Auth user** is provided by Supabase Auth (`supabase.auth.getUser()`).
- **Profile** is the app-level row linked to the user id (names, preferences, etc).

### Session + cookies
- Auth cookies are managed by Supabase.
- Tenant selection is persisted separately via a signed `lb_tenant` cookie and optionally propagated via `x-tenant-id` header.

### Global roles (effective role)
Global role derivation is centralized in `lib/auth/role.ts`.

Rule of thumb:
- Do not re-implement “is system admin” checks in routes/pages; reuse the canonical helper.

### Tenant roles
Tenant roles live in `user_tenant_memberships` and are used as the primary authorization input for tenant-scoped APIs.

## Data model (high level)
See `docs/auth/README.md` and `docs/AUTH_DATABASE_SCHEMA.md` for the DB reference.

Tables commonly involved:
- `users` (Supabase Auth)
- `profiles`
- `user_tenant_memberships`
- `tenants`
- `tenant_invitations`

## Validation checklist
- Global role derivation matches `lib/auth/role.ts` and is not duplicated.
- Route protection rules match `proxy.ts` and `docs/auth/routes.md`.
- Tenant resolution behavior matches `lib/tenant/resolver.ts` + `lib/utils/tenantCookie.ts`.
- All auth-related DB enums/functions match `supabase/migrations/*` + `types/supabase.ts`.
