# Tenant Resolution

## Metadata

- Owner: -
- Status: active
- Last validated: 2026-01-03

## Related code (source of truth)

- `proxy.ts` (hostname resolution + middleware)
- `lib/tenant/resolver.ts` (path/cookie/membership resolution)
- `lib/utils/tenantCookie.ts` (lb_tenant signed cookie)
- `lib/utils/tenantAuth.ts`

## Resolution Order (Priority)

Tenant is resolved in the following order. Priority depends on whether user is logged in:

### When user is logged in (on `/app` paths):

1. **Path override**: `/app/t/[tenantId]/...` (highest priority)
   - Extracted directly in `proxy.ts` via regex, no membership check in middleware
   - RLS and API layer enforce access control
   - Allows users to navigate to any tenant URL (access denied at data layer if unauthorized)

2. **Hostname** (custom domain or platform subdomain)
   - Custom domain: `custom.example.com` -> lookup in `tenant_domains` table
   - Platform subdomain: `tenant.lekbanken.no` -> RPC `get_tenant_id_by_hostname`

3. **Signed cookie**: `lb_tenant` httpOnly cookie
   - Persisted from previous session
   - Validated against user's memberships by resolver

4. **Membership fallback**:
   - Primary membership (`is_primary = true`)
   - Single membership (auto-select if only one)

5. **Redirects** (when memberships known):
   - Multiple memberships, no selection -> `/app/select-tenant`
   - No memberships -> `/app/no-access`

### Hostname resolution applies to:

- Protected paths only: `/app/*` and `/admin/*`
- Non-protected paths (e.g., `/auth/*`, `/`) skip hostname resolution

## Hostname Resolution Details

### Trusted Hosts Policy

For security, only trusted hosts can access protected paths (`/app`, `/admin`):

- **Built-in trusted**: `localhost`, `127.0.0.1`, `lekbanken.no`, `*.lekbanken.no`
- **Custom domains**: Must have active record in `tenant_domains` table

Untrusted hosts on protected paths receive HTTP 404.

### Header Priority

Hostname is extracted from request headers:

1. `x-forwarded-host` (only if `x-forwarded-proto` is also present)
2. `host` header (fallback)

Malformed headers (containing commas, whitespace, or invalid characters) are rejected.

### Cookie Domain Behavior

- **Platform domains** (`*.lekbanken.no`): Cookie domain set to `.lekbanken.no` (shared across subdomains)
- **Custom domains**: Host-only cookie (no domain attribute, more secure)
- **Localhost**: Host-only, non-secure cookie

## Cookie Details

- Name: `lb_tenant`
- Signed via `lib/utils/tenantCookie.ts` using HMAC-SHA256
- httpOnly, SameSite=Lax, Secure (in production)
- Set/cleared in `proxy.ts` middleware and server actions
- Max age: 30 days

## Header

- `x-tenant-id`: Added in proxy when tenant is resolved
- Client fetchers should include it for tenant-scoped APIs

## Picker Pages

- `/app/select-tenant`: Choose between multiple tenants
- `/app/no-access`: No memberships found

## Membership Data

- Canonical source: `public.user_tenant_memberships` (used by server context, client auth, and APIs).
- Compatibility layer: `public.tenant_memberships` may exist as a view forwarding to `user_tenant_memberships`.
- Rule of thumb: prefer `user_tenant_memberships` in code + docs; treat `tenant_memberships` as legacy/compat only.

## Database Tables

### `tenant_domains`

Stores custom domain mappings for tenants:

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid | Primary key |
| `tenant_id` | uuid | FK to tenants |
| `hostname` | text | The custom domain (e.g., `app.customer.com`) |
| `status` | text | `pending`, `active`, `suspended` |
| `verified_at` | timestamptz | When DNS verification passed |
| `created_at` | timestamptz | Creation timestamp |

RLS: Only system admins can manage; all authenticated users can read active domains.
