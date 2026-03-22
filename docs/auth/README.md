# Auth docs

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-17
- Last updated: 2026-03-22
- Last validated: 2026-03-22

Scope: Auth, RBAC, tenant-access och routing.

## Start here (current)

- [ACCOUNTS_DOMAIN.md](ACCOUNTS_DOMAIN.md) — broader accounts domain boundary for identity, sessions, and authorization primitives
- [roles.md](roles.md) — global roles + tenant roles, admin gating (canonical helper: `lib/auth/role.ts`)
- [tenant.md](tenant.md) — tenant resolution + cookie/header behavior
- [routes.md](routes.md) — route protection + redirects (proxy)
- [architecture.md](architecture.md) — server-first auth architecture
- [MFA_SECURITY.md](MFA_SECURITY.md) — MFA threat model, mitigations, and security review checklist
- [MFA_TECHNICAL_SPEC.md](MFA_TECHNICAL_SPEC.md) — MFA schema, policy, API, and Supabase integration design
- [debugging.md](debugging.md) — practical debugging checklist

## DB reference

- [AUTH_DATABASE_SCHEMA.md](AUTH_DATABASE_SCHEMA.md) — DB schema overview (migrations + generated types are canonical)

## Draft redesign and backlog

- [AUTH_ARCHITECTURE_REDESIGN.md](AUTH_ARCHITECTURE_REDESIGN.md) — draft redesign proposal for server-first auth, tenant resolution, and role handling across surfaces
- [AUTH_IMPLEMENTATION_TODO.md](AUTH_IMPLEMENTATION_TODO.md) — draft auth/tenant backlog tied to the redesign work

## Historical

- [AUTH_SYSTEM_ANALYSIS.md](../AUTH_SYSTEM_ANALYSIS.md) — historical/archived analysis; do not treat as source of truth
- [archive/MFA_CURRENT_STATE_ANALYSIS.md](archive/MFA_CURRENT_STATE_ANALYSIS.md) — historical MFA rollout snapshot
- [archive/MFA_IMPLEMENTATION_PLAN.md](archive/MFA_IMPLEMENTATION_PLAN.md) — historical MFA sprint plan

## Validation checklist

- Global role derivation matches `lib/auth/role.ts` (no duplicated logic).
- Tenant resolution behavior matches `lib/tenant/resolver.ts` + `lb_tenant` cookie helpers.
- Proxy rules in `proxy.ts` match `routes.md` (protected paths, guest-only routes, admin gate).
- DB enums/functions match migrations + `lib/supabase/database.types.ts`.
