# Batch A.1 — Host Architecture Verification

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-15
- Last updated: 2026-03-21
- Last validated: 2026-03-15

> Historical architecture-verification snapshot for the host-routing decision work. Use this as bounded decision history rather than an active operating guide.

**Date:** 2025-07-18  
**Scope:** Verification-only — no implementation in this deliverable  
**Directive:** GPT reframed A.1 from "choose A or B" to "verify architecture before deciding"

---

## 1. Current Host Architecture as Implemented

### Single-Deployment Multi-Subdomain Model

The entire platform is **one Next.js application** deployed once on Vercel. There are no separate deployments for admin, demo, or marketing. All behavioral differences between hosts are implemented in middleware (`proxy.ts`) via hostname inspection.

| Host | Code Status | Production Status | Middleware Behavior |
|------|------------|-------------------|-------------------|
| `www.lekbanken.no` | Excluded from RPC lookup (L511: `hostname !== 'www.lekbanken.no'`) | **Working — serves all traffic** | Platform primary, no tenant resolution |
| `app.lekbanken.no` | `PLATFORM_PRIMARY_HOST` constant (L16), excluded from RPC lookup | **Broken TLS** (DNS → Vercel IPs but ECONNRESET) | Identical behavior to `www.` — platform primary, no tenant resolution |
| `lekbanken.no` | Excluded from RPC lookup (L511) | Redirects to `www.lekbanken.no` | Platform primary, no tenant resolution |
| `demo.lekbanken.no` | `DEMO_SUBDOMAIN` constant (L17), fixed tenant ID (L503-508), demo redirect in `auth/demo/route.ts` L188 | **Unknown** (not tested — likely same TLS status as `app.`) | Fixed demo tenant ID, sets `x-demo-mode` header |
| `admin.lekbanken.no` | **Zero code references** in proxy.ts or any runtime code | **Not deployed** | Would be treated as a platform subdomain → RPC tenant lookup (likely fails) |
| `{tenant}.lekbanken.no` | RPC `get_tenant_id_by_hostname` (L511-530) | Not yet in use (no real tenants) | Tenant subdomain resolution |
| Custom domains | `tenant_domains` table lookup (L531-545) | Not yet in use | Custom domain tenant resolution |

### Cookie Architecture

- **Domain:** `.lekbanken.no` for all platform subdomains (`cookie-domain.ts`)
- **Effect:** Auth session cookies shared across `www.`, `app.`, `demo.`, and any `*.lekbanken.no`
- **Custom domains:** Host-only cookies (more restrictive, by design)
- **Tenant cookie:** `lb_tenant` (HMAC-signed), `lb_host_tenant` (5-min TTL cache, host-scoped)

### Auth Callback Handling

`app/auth/callback/route.ts` uses `requestUrl.origin` for all redirects — it adapts to whatever host the user arrived on. No hardcoded host. This means auth callbacks work correctly on any host that has valid TLS.

### `NEXT_PUBLIC_SITE_URL` Usage (3 locations)

| File | Usage | Impact |
|------|-------|--------|
| `features/admin/users/userActions.server.ts` L132 | Password reset `redirectTo` URL | Must match a working host |
| `features/admin/library/spatial-editor/lib/artifact-actions.ts` L144 | Artifact generation app URL | Must match a working host |
| `app/app/planner/[planId]/page.tsx` L21 | Server-to-self API fetch | Must resolve internally |

**This env var is set on Vercel** — its value determines which host these redirects go to. If set to `https://app.lekbanken.no`, password reset emails would produce broken links.

### Stripe Webhook

The route handler (`app/api/billing/webhooks/stripe/route.ts`) validates Stripe's webhook signature — no host-specific logic. But the webhook URL in the Stripe dashboard must point to a host with working TLS. If configured as `https://app.lekbanken.no/api/billing/webhooks/stripe`, webhooks would fail silently.

### Image Configuration

`next.config.ts` remote patterns include `www.lekbanken.no` and `lekbanken.no` but **NOT** `app.lekbanken.no` — confirming `www.` was already the assumed host for image assets.

---

## 2. Gaps Between Intended vs Actual Model

### Intended Model (from README.md and docs)

| Subdomain | Intended Purpose |
|-----------|-----------------|
| `lekbanken.no` | Marketing site |
| `app.lekbanken.no` | Application |
| `admin.lekbanken.no` | Admin panel |
| `demo.lekbanken.no` | Demo environment |

### Actual Implementation

| Subdomain | Reality |
|-----------|---------|
| `lekbanken.no` | Redirects to `www.lekbanken.no` — no separate marketing surface |
| `app.lekbanken.no` | Broken TLS. Functionally identical to `www.` in middleware — both are "platform primary" with no tenant resolution. No differentiated behavior. |
| `admin.lekbanken.no` | **Never implemented.** Zero code references. Admin is purely route-gated (`/admin/*`) with role checks in middleware (system_admin) and layout (system_admin OR tenant admin). |
| `demo.lekbanken.no` | **Fully implemented.** Fixed tenant ID in proxy.ts, dedicated auth flow in `auth/demo/route.ts` with cross-origin redirect. This is the only subdomain with unique behavior. |

### Key Gap Summary

1. **`admin.lekbanken.no` is vaporware** — admin isolation is role-based (route + layout guards), not host-based
2. **`app.lekbanken.no` adds zero functionality over `www.lekbanken.no`** — both resolve identically in middleware
3. **`PLATFORM_PRIMARY_HOST` constant is stale** — points to a host with broken TLS
4. **Documentation references `app.lekbanken.no` extensively** (first-deploy-runbook: 12+ refs, NOTION.md, PARTICIPANTS_DOMAIN_ARCHITECTURE.md) while production uses `www.`

---

## 3. Security Implications

### Current Model: No Security Benefit from app./admin. Separation

Separate subdomains for app and admin **would** provide origin isolation (different origins block cross-origin requests by default). However:

- **Same process:** Since it's a single Next.js deployment, both `/app/*` and `/admin/*` run in the same server process with the same environment variables, the same `supabaseAdmin` client, and the same service role key. Subdomain separation provides **zero server-side isolation**.
- **Cookie sharing:** The `.lekbanken.no` cookie domain means auth cookies are shared across ALL subdomains anyway, negating the main browser-side benefit of subdomain isolation (credential separation).
- **CSRF:** Same-site cookie attribute (set by Supabase SSR) protects against cross-site requests. Cross-subdomain CSRF is not a vector here because the cookies are `SameSite=Lax`.
- **Admin gating is role-based:** Middleware checks `effectiveRole === 'system_admin'` for `/admin/*` paths (excluding `/admin/tenant/*`). The admin layout double-checks with `getServerAuthContext`. This is the correct pattern — authorization should be server-side, not host-based.

### Demo Subdomain: Security Value is Real

`demo.lekbanken.no` provides genuine security value:
- **Tenant isolation:** Fixed tenant ID prevents demo users from accessing other tenants' data
- **Scope limitation:** `x-demo-mode` header enables downstream restrictions
- **Session containment:** Demo auth flow redirects to the demo subdomain, keeping demo traffic isolated from production user sessions

### Risk: Cookie Domain Breadth

The `.lekbanken.no` cookie domain means a compromised tenant subdomain (e.g., `evil-tenant.lekbanken.no`) could read/write auth cookies. This is an **accepted trade-off** documented in `cookie-domain.ts` — necessary for cross-subdomain session sharing. Mitigations:
- Tenant subdomains are controlled (provisioned by the platform, not user-chosen)
- Cookie values are HMAC-signed (tenant cookie) or JWT-based (auth cookies)

---

## 4. Performance Implications

### No Performance Difference Between Subdomains

Since all subdomains hit the same Vercel deployment and run through the same middleware:
- **Cold starts:** Same function, same region, no difference
- **CDN caching:** Vercel caches by full URL including hostname — separate subdomains mean separate cache entries for identical content. This is a minor **performance penalty**, not a benefit.
- **Bundle size:** Same Next.js build, same JavaScript bundles regardless of hostname
- **Middleware overhead:** `app.` and `www.` follow the exact same code path (both skip RPC lookup). Demo adds one hostname comparison. Negligible.

### Only Real Performance Consideration

Tenant subdomain resolution (`{tenant}.lekbanken.no`) does an RPC call to `get_tenant_id_by_hostname`, cached in a cookie for 5 minutes. This is the only performance-sensitive path, and it's unrelated to the app/www/admin question.

---

## 5. Recommended Host Model

### Option C: Consolidate on `www.lekbanken.no` + Keep `demo.lekbanken.no`

| Host | Action | Reason |
|------|--------|--------|
| `www.lekbanken.no` | **Adopt as canonical** | Already serves all traffic, has valid TLS, is in `next.config.ts` image patterns |
| `lekbanken.no` | Keep redirect to `www.` | Working correctly, standard practice |
| `demo.lekbanken.no` | **Keep** | Uniquely implemented, provides genuine tenant isolation for demo |
| `app.lekbanken.no` | **Retire** | Broken TLS, zero behavioral difference from `www.`, config drift source |
| `admin.lekbanken.no` | **Retire as a concept** | Never implemented, admin is route-gated, no security benefit in this architecture |
| `{tenant}.lekbanken.no` | Keep (future) | Multi-tenant subdomain architecture is implemented and valuable |

### Why NOT Option A (Provision TLS for `app.lekbanken.no`)

1. Adds a host that behaves identically to `www.` — zero functional value
2. Creates a "which host do I use?" confusion for users, operators, and AI agents
3. URL consistency problems (links shared between app. and www. would work but be confusing)
4. Additional Vercel domain to maintain for no benefit
5. The original intent (separate app from marketing) is moot — there IS no separate marketing site

### Why NOT Option B (Make `app.lekbanken.no` canonical, retire `www.`)

1. Requires provisioning TLS (same effort as Option A)
2. Breaks existing bookmarks, search engine indexing, and any external links to `www.`
3. Non-standard — `www.` is the conventional web host; `app.` implies a separate application surface that doesn't exist
4. `next.config.ts` already lists `www.` in image patterns; would need updating

### Why Option C

1. **Zero infrastructure changes** — `www.` already works
2. **Minimal code changes** — update `PLATFORM_PRIMARY_HOST` constant in proxy.ts, update docs
3. **Accurate** — reflects what's actually deployed and working
4. **Preserves the valuable parts** — demo subdomain isolation and future tenant subdomains remain intact
5. **Eliminates config drift** — the code matches production reality

---

## 6. Implementation Scope (if Option C is chosen)

### Code Changes (small, low-risk)

| File | Change |
|------|--------|
| `proxy.ts` L16 | `PLATFORM_PRIMARY_HOST = 'www.lekbanken.no'` |
| `next.config.ts` | No change needed (already has `www.lekbanken.no`) |
| `cookie-domain.ts` | No change needed (`.lekbanken.no` domain covers all subdomains) |

### Vercel Dashboard (manual, owner-only)

- Verify `NEXT_PUBLIC_SITE_URL` is set to `https://www.lekbanken.no`
- Optionally remove `app.lekbanken.no` domain (or leave it — it's inert with broken TLS)

### Supabase Dashboard (manual, owner-only — Batch A.2)

- Verify auth redirect URLs include `https://www.lekbanken.no/auth/callback`
- Verify redirect URLs include `https://demo.lekbanken.no/auth/callback` (for demo flow)

### Stripe Dashboard (manual, owner-only — Batch A.3)

- Verify webhook endpoint is `https://www.lekbanken.no/api/billing/webhooks/stripe`

### Documentation Updates (Batch B.3)

- `docs/ops/first-deploy-runbook.md` — 12+ refs to `app.lekbanken.no`
- `docs/NOTION.md` — 1 ref
- `docs/PARTICIPANTS_DOMAIN_ARCHITECTURE.md` — host panel URLs
- `docs/ops/prod-migration-workflow.md` — health check URL
- `README.md` — remove `admin.lekbanken.no` line
- Various launch-readiness docs

---

## Verdict

**Recommendation: Option C** — Consolidate on `www.lekbanken.no` as canonical, keep `demo.lekbanken.no` for demo isolation, retire `app.lekbanken.no` and `admin.lekbanken.no` as concepts.

This is not a simplification of the original architecture — it's an **alignment with reality**. The subdomain separation for admin and app was documented but never implemented. The codebase already treats `www.` and `app.` identically. Making this official eliminates config drift and removes a broken-TLS host from the system identity.

**Awaiting owner decision before any implementation.**
