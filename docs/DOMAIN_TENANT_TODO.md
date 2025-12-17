# DOMAIN: TENANT – TODO & ROADMAP

> Canonical domain documentation (source of truth): **[TENANT_DOMAIN.md](TENANT_DOMAIN.md)**

_Last updated: 2025-12-09 (based on full implementation report)._

---

## 1. RLS & Security

### MUST
- [ ] Tighten RLS for:
  - `tenant_settings`
  - `tenant_branding`
  - `tenant_features`

  **Goal:** Only `system_admin` or `owner/admin` memberships can mutate. Align policies with current API role checks.

- [ ] Add demo-specific RLS guard or equivalent logic so that:
  - Demo tenants cannot be mutated by normal users.
  - Only `system_admin` can perform sensitive operations on demo tenants.

- [ ] Review all tenant-related tables to ensure:
  - `tenant_id` and `get_user_tenant_ids()` are consistently used.
  - No cross-tenant leakage is possible.

### SHOULD
- [ ] Introduce shared enums/constants for:
  - `tenant_type_enum`
  - `tenant_status_enum`
  - `tenant_role_enum`

  And ensure they are reused across:
  - API validation
  - UI
  - Docs.

---

## 2. API & Domain Logic

### MUST
- [ ] Confirm all tenant-related mutations go through `/api/tenants/*` endpoints.
- [ ] Ensure audit logging is called for:
  - All create/update/status operations
  - All membership role changes
  - All invitation create/accept actions.

### SHOULD
- [ ] Add endpoints for:
  - Listing tenant invitations
  - Revoking invitations
- [ ] Clarify rules for changing `owner` roles:
  - Ownership transfer flows
  - Prevent accidental loss of all owners.

### COULD
- [ ] Add API to fetch an “effective tenant config” (settings + features + branding) in one call, for easier use in other domains.

---

## 3. UI & UX

### MUST
- [ ] Replace manual tenantId input on `/admin/tenant` with:
  - Tenant switcher based on current user’s memberships.
- [ ] Improve validation/error handling on admin tenant page.

### SHOULD
- [ ] Add:
  - Members management UI (edit roles/status, not just list).
  - Audit log view with filters (date, actor, event_type).
- [ ] Make the admin tenant page SSR-based with client hydration instead of purely client-only fetches.

### COULD
- [ ] Add better branding editor:
  - Logo media picker from Media Domain
  - Color pickers linked to design tokens
  - Live preview of tenant theme.

---

## 4. Billing & Product Integration

### SHOULD
- [ ] Define how `tenant_settings.product_access` maps to:
  - Billing Domain licenses
  - Product Domain offerings.
- [ ] Introduce basic enforcement:
  - Max seat count per tenant
  - Product-specific feature availability (Planner, Gamification, AI, etc.).

### COULD
- [ ] Add hooks for:
  - Upgrades/downgrades of license tiers
  - Automatic seat reassignment suggestions.

---

## 5. Demo Tenant Behaviour

### SHOULD
- [ ] Define and implement a clear demo-tenant policy:
  - Which features are allowed?
  - Are there automatic resets (e.g., nightly cleanup)?
- [ ] Make sure Games/Planner/Media/Gamification respect demo limitations.

### COULD
- [ ] Implement scheduled job for demo cleanup (if supported by infra).
- [ ] Add special demo onboarding flows and banners in UI.

---

## 6. Documentation

### MUST
- [ ] Update Notion Tenant Domain page with:
  - Actual tables and enums.
  - Role model (owner/admin/editor/member).
  - Demo tenant behavior.
  - RLS policy overview.

- [ ] Keep this `DOMAIN_TENANT_TODO.md` synchronized with reality whenever:
  - Schema changes.
  - New APIs are added.
  - RLS policies are updated.

### COULD
- [ ] Add architecture diagrams showing:
  - Client → `/api/tenants/*` → Supabase (RLS)
  - Relations between tenants, memberships, settings, features, branding, invitations, audit logs.

---

## 7. Long-Term Roadmap (Future Extensions)
- [ ] Cross-tenant collaboration (shared plans/events between tenants).
- [ ] SSO (Azure AD / Feide / Google Workspace).
- [ ] Tenant-specific analytics dashboards and reports.
- [ ] API keys per tenant with proper scoping.
- [ ] Tenant-level gamification and shop controls.
- [ ] Full tenant export/import (backup/migration).
