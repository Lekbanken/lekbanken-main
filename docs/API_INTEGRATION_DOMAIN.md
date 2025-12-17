# API / INTEGRATION DOMAIN

## Metadata
- **Status:** active
- **Last updated:** 2025-12-17
- **Owner:** -

## Scope
This domain documents the **internal API surface** used by the Lekbanken app:
- Next.js App Router route handlers under `app/api/**/route.ts`
- Domain/BFF endpoints (e.g. Gamification snapshot, Journey snapshot/feed)
- Integration endpoints such as Stripe webhooks

Non-goals (for now):
- A stable, public 3rd‑party API with versioning, tokens, and rate limiting

## Runtime & primitives
- **Framework:** Next.js App Router route handlers (`export async function GET/POST/...`).
- **DB + auth:** Supabase.
- **Access control:** RLS-first. User-scoped endpoints should use the request-scoped RLS client.

Key helpers:
- RLS server client: `createServerRlsClient()` in `lib/supabase/server.ts`
- Service role (admin/background only): `createServiceRoleClient()` in `lib/supabase/server.ts`
- Tenant header helper: `getRequestTenantId()` in `lib/supabase/server.ts`
- Tenant/system admin checks: `lib/utils/tenantAuth.ts`
- Optional MFA gate: `lib/utils/mfaGuard.ts`

## Conventions (as implemented)

### Auth
Most authenticated endpoints follow this pattern:
1) `const supabase = await createServerRlsClient()`
2) `const { data: { user } } = await supabase.auth.getUser()`
3) If missing user: return `401` JSON `{ error: 'Unauthorized' }`

### Tenancy
Tenancy is enforced primarily by DB RLS policies. Some routes also accept:
- `tenantId` as a route param (e.g. `/api/tenants/[tenantId]/...`)
- `x-tenant-id` header via `getRequestTenantId()` for request scoping

Tenant admin checks (when needed) are done via `assertTenantAdminOrSystem()`.

### Caching
Many endpoints set `export const dynamic = 'force-dynamic'` to avoid caching user-scoped responses.

### Errors
Responses commonly use `NextResponse.json({ error: string }, { status })`.
There is not (yet) a single standardized error envelope across all endpoints.

### Pagination
Patterns vary by endpoint:
- Cursor/limit (Journey feed): `cursor` as ISO datetime + `limit`
- Search endpoints (e.g. games/plans): query-driven pagination depends on route

## API surface map (high-level)

Route handlers live in `app/api/*` and are grouped by domain:
- **Accounts/Auth:** `app/api/accounts/*` (profile, sessions, devices, MFA)
- **Tenants:** `app/api/tenants/*` (members, invitations, settings, branding, audit logs)
- **Browse:** `app/api/browse/*` (filters)
- **Games:** `app/api/games/*` (CRUD/read, search, featured, related, publish, builder, csv import/export)
- **Play:** `app/api/play/*` (sessions, join/rejoin, heartbeat, state/roles/participants)
- **Plans/Planner:** `app/api/plans/*` (plans CRUD, blocks, notes, progress, play)
- **Participants:** `app/api/participants/*` (participants, session flows, tokens, progress)
- **Media:** `app/api/media/*` (media CRUD, upload/confirm, templates, fallback)
- **Billing:** `app/api/billing/*` (products, subscription create, tenant billing views, Stripe webhooks)
- **Gamification (BFF):** `app/api/gamification/route.ts`
- **Journey (BFF/read):** `app/api/journey/snapshot/route.ts`, `app/api/journey/feed/route.ts`
- **System/Health:** `app/api/system/metrics/route.ts`, `app/api/health/route.ts`

## BFF boundaries
Some “read/composition” endpoints exist to provide stable UI contracts without spreading cross-domain composition into clients:
- **Gamification snapshot:** `GET /api/gamification`
- **Journey snapshot/feed:** `GET /api/journey/snapshot`, `GET /api/journey/feed`

Rule of thumb:
- Composition belongs in a BFF endpoint.
- Source-of-truth writes remain in their owning domain (via RLS + domain services).

## Validation checklist
- All user-scoped endpoints: use `createServerRlsClient()` and enforce `401` when unauthenticated.
- Service role usage: limited to webhooks/background/admin paths.
- Tenant-sensitive endpoints: verify tenant scoping in RLS and (where relevant) explicit admin checks.
