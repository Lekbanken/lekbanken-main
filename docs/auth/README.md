# Auth docs

## Metadata

- Owner: -
- Status: active
- Last validated: 2025-12-17

Scope: Auth, RBAC, tenant-access och routing.

## Start here (current)

- [roles.md](roles.md) — global roles + tenant roles, admin gating (canonical helper: `lib/auth/role.ts`)
- [tenant.md](tenant.md) — tenant resolution + cookie/header behavior
- [routes.md](routes.md) — route protection + redirects (proxy)
- [architecture.md](architecture.md) — server-first auth architecture
- [debugging.md](debugging.md) — practical debugging checklist

## DB reference

- [AUTH_DATABASE_SCHEMA.md](../AUTH_DATABASE_SCHEMA.md) — DB schema overview (migrations + generated types are canonical)

## Historical

- [AUTH_SYSTEM_ANALYSIS.md](../AUTH_SYSTEM_ANALYSIS.md) — historical/archived analysis; do not treat as source of truth

## Validation checklist

- Global role derivation matches `lib/auth/role.ts` (no duplicated logic).
- Tenant resolution behavior matches `lib/tenant/resolver.ts` + `lb_tenant` cookie helpers.
- Proxy rules in `proxy.ts` match `routes.md` (protected paths, guest-only routes, admin gate).
- DB enums/functions match migrations + `lib/supabase/database.types.ts`.
