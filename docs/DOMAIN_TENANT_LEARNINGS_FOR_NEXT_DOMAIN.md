# DOMAIN: TENANT – KEY LEARNINGS FOR NEXT DOMAINS

> Canonical Tenant domain documentation (source of truth): **[TENANT_DOMAIN.md](TENANT_DOMAIN.md)**

This document summarizes the main architectural and security learnings from the current TENANT domain implementation. It should be used as guidance when designing and implementing future domains in Lekbanken.

---

## 1. Tenant is the backbone of multi-tenancy

The Tenant Domain now provides:

- `tenants` and `user_tenant_memberships` with roles (owner/admin/editor/member).
- Note: `tenant_memberships` may exist as a compatibility view; prefer `user_tenant_memberships`.
- API-first operations under `/api/tenants/*` using `createServerRlsClient`.
- RLS driven by `get_user_tenant_ids()` and role checks.
- Demo-tenant protection in API-level logic.

**Guideline:**  
All new domains must treat Tenant & memberships as the canonical source of truth for:

- Access control
- Data isolation (`tenant_id` on tenant-scoped tables)
- Feature availability and product access (via settings/features).

Avoid per-domain “pseudo-tenant” systems.

---

## 2. API and RLS must align, not compensate for each other

Current state:

- APIs enforce admin/system roles for most mutations.
- RLS for `tenant_settings`, `tenant_branding`, and `tenant_features` still allows any tenant member to mutate, which is too permissive.

**Guideline:**

- Security must hold even if someone bypasses the API and talks directly to Supabase.
- When adding new tables:
  - Define RLS rules that match the same intention as the API’s role checks.
  - Use the API as a second layer of protection, not the only one.

---

## 3. Tenant settings, features, and branding should be reused

Existing tables:

- `tenant_settings`: modules, product_access, preferences (jsonb).
- `tenant_features`: per-tenant feature toggles (`feature_key`, `enabled`, `value`).
- `tenant_branding`: logo, colors, theme, brand name override.

**Guideline:**

- Other domains (Gamification, Planner, AI, Media, Shop, etc.) should:
  - Read and respect Tenant-level settings and features.
  - Avoid introducing new “flags” for configuration without passing through Tenant Domain.

Whenever enabling/disabling a module for a tenant, use `tenant_settings` or `tenant_features`.

---

## 4. Invitations and memberships are the standard pattern for access onboarding

Current pattern:

- `tenant_invitations` holds invite tokens, roles, and status.
- `POST /api/tenants/invitations/[token]/accept` upserts membership.
- Roles are validated; demo tenants have special rules.

**Guideline:**

- Future flows that “add people into something” (teams, shared plans, shared games) should:
  - Re-use or align with the tenant invitation + membership pattern.
  - Avoid inventing parallel invite systems with incompatible role semantics.

---

## 5. Demo tenants are a first-class concept

Current behavior:

- `demo_flag` / `type = demo` exists on tenants.
- APIs restrict demo mutations to `system_admin`.
- RLS does not yet enforce demo-specific restrictions.

**Guideline:**

- Demo vs real tenants must be considered for all future “dangerous” features:
  - Webhooks
  - Billing & payments
  - Permanent destructive changes (delete data)
- Consider demo guards in RLS and/or domain logic for any new domain:
  - Demo tenants may have:
    - Reduced capabilities
    - Limited persistence
    - Non-production integrations only.

---

## 6. Audit logging should become a global standard

Current state:

- `tenant_audit_logs` + `logTenantAuditEvent` helper used for:
  - Tenant create/update
  - Status changes
  - Settings/branding changes
  - Membership role changes
  - Invitation create/accept

**Guideline:**

- New admin/config domains (Billing, Product, Gamification, org-level Plans) should:
  - Reuse the audit logging pattern (or extend it).
  - Log key admin actions with:
    - tenant_id
    - actor_user_id
    - event_type
    - payload

This will later power Operations Domain and analytics use cases.

---

## 7. Patterns from Tenant Domain to reuse in other domains

1) API-first approach with `createServerRlsClient` and explicit role checks.  
2) `tenant_id` + RLS as the primary mechanism for data isolation.  
3) Role-based checks (`owner/admin/editor/member`) for mutations.  
4) Settings & features modeled via generic jsonb / key-value tables (`tenant_settings`, `tenant_features`).  
5) Branding stored as references to Media (`logo_media_id`) + colors + theme.  
6) Audit logging for all important admin-level actions.  
7) Demo tenant rules as a separate dimension from normal status (active/trial/suspended/archived).

These patterns should be considered the “multi-tenant standard” for future domains in Lekbanken.
