# TENANT DOMAIN

## Metadata
- **Status:** Active
- **Last updated:** 2025-12-17
- **Source of truth:** Repo code + `supabase/migrations/*` (schema) + `types/supabase.ts` (generated)

## Scope
Tenant Domain is the backbone of multi-tenancy in Lekbanken.

It owns:
- Tenants (orgs) and tenant lifecycle/state
- Tenant-scoped access via memberships (roles + status)
- Onboarding via invitations
- Tenant-level configuration (settings, features, branding)
- Audit logging for admin actions in the tenant domain

Non-goals:
- Per-feature authorization rules inside other domains (they should consume tenant + memberships)
- Billing enforcement (may read from tenant settings/features, but belongs elsewhere)

## Related code
- API routes (App Router):
  - `app/api/tenants/route.ts`
  - `app/api/tenants/[tenantId]/route.ts`
  - `app/api/tenants/[tenantId]/status/route.ts`
  - `app/api/tenants/[tenantId]/settings/route.ts`
  - `app/api/tenants/[tenantId]/branding/route.ts`
  - `app/api/tenants/[tenantId]/members/route.ts`
  - `app/api/tenants/[tenantId]/members/[userId]/route.ts`
  - `app/api/tenants/[tenantId]/invitations/route.ts`
  - `app/api/tenants/invitations/[token]/route.ts`
  - `app/api/tenants/invitations/[token]/accept/route.ts`
  - `app/api/tenants/[tenantId]/audit-logs/route.ts`
- Auth helpers:
  - `lib/utils/tenantAuth.ts`
  - `lib/tenant/resolver.ts`
  - `lib/utils/tenantCookie` (cookie read/write)
- Audit logging:
  - `lib/services/tenantAudit.server.ts`
- Supabase server client (RLS-aware):
  - `lib/supabase/server`

## Core concepts

### Tenant
A tenant represents an organization/workspace boundary for data isolation.

Key properties used in code today:
- `id`, `name`
- `type` (includes `demo`)
- `status` (includes `active`, `suspended`, `trial`, `demo`, `archived`)
- `demo_flag` (additional demo indicator)

### Membership
Memberships connect users to tenants with a role and status.

Canonical table used in code:
- `user_tenant_memberships`

Note:
- `tenant_memberships` may exist as a compatibility view; prefer `user_tenant_memberships`.

Role model (as enforced in API validation today):
- Core roles: `owner`, `admin`, `editor`, `member`
- Additional roles appear in code paths (treated as allowed values in some endpoints):
  - `organisation_admin`, `organisation_user`, `demo_org_admin`, `demo_org_user`

### Invitation
Invitations are the standard onboarding mechanism.
- Token-based acceptance flow
- Invitation stores email, role, expiry, status
- Accept creates/updates membership and marks invitation accepted

### Demo tenants
Demo tenants are treated as a first-class concept.

Current enforcement is primarily API-level:
- Many tenant mutations are blocked unless `system_admin` when tenant is demo (`type === 'demo'` or `demo_flag === true`).

Important: some RLS policies may still be permissive (see the roadmap doc).

## Data model (tables)
This section is intentionally minimal and anchored to usage in code. For full details, rely on `supabase/migrations/*` and generated types.

- `tenants`
  - Used by: tenant CRUD and status changes.
- `user_tenant_memberships`
  - Columns used by code: `tenant_id`, `user_id`, `role`, `status`, `is_primary`, `seat_assignment_id`, `created_at`, `updated_at`.
- `tenant_invitations`
  - Columns used by code: `tenant_id`, `email`, `role`, `token`, `invited_by`, `expires_at`, `status`, `accepted_at`.
- `tenant_settings`
  - Key json fields: `modules`, `product_access`, `preferences`.
- `tenant_branding`
  - Used fields: `logo_media_id`, `primary_color`, `secondary_color`, `accent_color`, `theme`, `brand_name_override`.
- `tenant_audit_logs`
  - Used fields: `tenant_id`, `actor_user_id`, `event_type`, `payload`, `created_at`.

## API surface
All endpoints are implemented as Next.js App Router route handlers.

### `/api/tenants`
- `GET /api/tenants`
  - If `system_admin`: returns up to 200 tenants (`id`, `name`).
  - If not `system_admin`: returns either the active tenant (from cookie) if role is elevated (`admin|owner`), else an empty list.
  - Implementation: `app/api/tenants/route.ts`

- `POST /api/tenants`
  - System-admin only.
  - Creates a tenant and writes an audit event `tenant_created`.
  - Implementation: `app/api/tenants/route.ts`

### `/api/tenants/:tenantId`
- `GET /api/tenants/:tenantId`
  - Loads a tenant by id.
  - Implementation: `app/api/tenants/[tenantId]/route.ts`

- `PATCH /api/tenants/:tenantId`
  - Allowed for `system_admin` or tenant admin (`owner|admin`).
  - Demo guard: if tenant is demo, only `system_admin`.
  - Writes audit event `tenant_updated`.
  - Implementation: `app/api/tenants/[tenantId]/route.ts`

### Tenant status
- `POST /api/tenants/:tenantId/status`
  - Allowed for `system_admin` or tenant admin.
  - Demo guard: only `system_admin`.
  - Writes audit event `tenant_status_changed`.
  - Implementation: `app/api/tenants/[tenantId]/status/route.ts`

### Tenant settings
- `GET /api/tenants/:tenantId/settings`
- `PATCH /api/tenants/:tenantId/settings`
  - Admin/system only; demo guard.
  - Upserts by `tenant_id`.
  - Writes audit event `settings_updated`.
  - Implementation: `app/api/tenants/[tenantId]/settings/route.ts`

### Tenant branding
- `GET /api/tenants/:tenantId/branding`
- `PATCH /api/tenants/:tenantId/branding`
  - Admin/system only; demo guard.
  - Upserts by `tenant_id`.
  - Writes audit event `branding_updated`.
  - Implementation: `app/api/tenants/[tenantId]/branding/route.ts`

### Memberships
- `GET /api/tenants/:tenantId/members`
  - Lists membership rows for the tenant.
  - Implementation: `app/api/tenants/[tenantId]/members/route.ts`

- `POST /api/tenants/:tenantId/members`
  - Admin/system only; requires MFA if enabled.
  - Inserts a membership; demo guard.
  - Writes audit event `member_added`.
  - Implementation: `app/api/tenants/[tenantId]/members/route.ts`

- `PATCH /api/tenants/:tenantId/members/:userId`
  - Admin/system only; requires MFA if enabled.
  - Updates membership fields; demo guard.
  - Writes audit event `member_updated`.
  - Implementation: `app/api/tenants/[tenantId]/members/[userId]/route.ts`

### Invitations
- `POST /api/tenants/:tenantId/invitations`
  - Admin/system only.
  - Creates invitation with random UUID token; demo guard.
  - Writes audit event `invitation_created`.
  - Implementation: `app/api/tenants/[tenantId]/invitations/route.ts`

- `GET /api/tenants/invitations/:token`
  - Fetch invitation “public” fields by token.
  - Implementation: `app/api/tenants/invitations/[token]/route.ts`

- `POST /api/tenants/invitations/:token/accept`
  - Requires logged-in user.
  - Rejects if expired or not pending.
  - Demo guard: demo tenants cannot accept invites unless `system_admin`.
  - Upserts membership (`tenant_id,user_id`) and marks invite accepted.
  - Writes audit event `invitation_accepted`.
  - Implementation: `app/api/tenants/invitations/[token]/accept/route.ts`

### Audit logs
- `GET /api/tenants/:tenantId/audit-logs`
  - Admin/system only.
  - Returns latest 200 audit events.
  - Implementation: `app/api/tenants/[tenantId]/audit-logs/route.ts`

## Security model

### API role checks
Most mutations require:
- `system_admin`, OR
- tenant admin (`owner|admin`) via `isTenantAdmin(tenantId, user.id)`.

Reference implementation:
- `lib/utils/tenantAuth.ts`

### RLS alignment
The tenant domain intends to use Supabase RLS as the primary safety net.

Known drift (per roadmap docs):
- Some tables may still allow overly-broad mutation via RLS (`tenant_settings`, `tenant_branding`, `tenant_features`).

See supporting roadmap docs:
- `docs/DOMAIN_TENANT_TODO.md`

## Validation checklist
- `npm run type-check`
- `npm test`
- Spot-check endpoints (dev):
  - Create tenant as system admin: `POST /api/tenants`
  - Update tenant as owner/admin: `PATCH /api/tenants/:tenantId`
  - Create invitation then accept as normal user: `POST /api/tenants/:tenantId/invitations` → `POST /api/tenants/invitations/:token/accept`
  - Ensure demo tenant guards trigger as expected

## Supporting docs
- Roadmap / known gaps: `docs/DOMAIN_TENANT_TODO.md`
- Cross-domain learnings: `docs/DOMAIN_TENANT_LEARNINGS_FOR_NEXT_DOMAIN.md`
