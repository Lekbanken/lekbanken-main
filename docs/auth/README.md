# Auth docs

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-21
- Last validated: 2026-03-21

Scope: Auth, RBAC, tenant-access och routing.

## Start here (current)

- [roles.md](roles.md) — global roles + tenant roles, admin gating (canonical helper: `lib/auth/role.ts`)
- [tenant.md](tenant.md) — tenant resolution + cookie/header behavior
- [routes.md](routes.md) — route protection + redirects (proxy)
- [architecture.md](architecture.md) — server-first auth architecture
- [MFA_SECURITY.md](MFA_SECURITY.md) — MFA threat model, mitigations, and security review checklist
- [MFA_TECHNICAL_SPEC.md](MFA_TECHNICAL_SPEC.md) — MFA schema, policy, API, and Supabase integration design
- [debugging.md](debugging.md) — practical debugging checklist

## DB reference

- [AUTH_DATABASE_SCHEMA.md](../AUTH_DATABASE_SCHEMA.md) — DB schema overview (migrations + generated types are canonical)

## Historical

- [AUTH_SYSTEM_ANALYSIS.md](../AUTH_SYSTEM_ANALYSIS.md) — historical/archived analysis; do not treat as source of truth
- [archive/MFA_CURRENT_STATE_ANALYSIS.md](archive/MFA_CURRENT_STATE_ANALYSIS.md) — historical MFA rollout snapshot
- [archive/MFA_IMPLEMENTATION_PLAN.md](archive/MFA_IMPLEMENTATION_PLAN.md) — historical MFA sprint plan

## Validation checklist

- Global role derivation matches `lib/auth/role.ts` (no duplicated logic).
- Tenant resolution behavior matches `lib/tenant/resolver.ts` + `lb_tenant` cookie helpers.
- Proxy rules in `proxy.ts` match `routes.md` (protected paths, guest-only routes, admin gate).
- DB enums/functions match migrations + `lib/supabase/database.types.ts`.
