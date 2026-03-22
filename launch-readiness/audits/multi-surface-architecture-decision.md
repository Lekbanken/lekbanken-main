# Multi-Surface Host Architecture — Decision Note

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-15
- Last updated: 2026-03-21
- Last validated: 2026-03-15

> Historical architecture analysis note. This was an analysis-only decision exploration and should not be treated as an active implementation or operating guide.

**Date:** 2025-07-18  
**Scope:** Analysis only — no implementation  
**Trigger:** GPT reframed the canonical-host question into a deeper architecture investigation

---

## Current Reality

### Route Structure (Already Separated)

The codebase already has clean route-level separation:

```
app/
├── (marketing)/        ← Public surface: Hero, pricing, features
│   ├── layout.tsx      ← Marketing shell (Header + Footer)
│   ├── page.tsx        ← Landing page
│   ├── pricing/        ← Pricing page
│   ├── enterprise/     ← B2B landing
│   ├── checkout/       ← Payment flow
│   ├── play/           ← Try-play demo
│   ├── auth/           ← Login/signup (guest-only)
│   └── gift/           ← Gift card flow
│
├── app/                ← Authenticated user surface
│   ├── layout.tsx      ← AppShell (SideNav + BottomNav + Header)
│   ├── browse/         ← Content discovery
│   ├── play/           ← Game sessions
│   ├── planner/        ← Lesson planning
│   ├── gamification/   ← Achievements, badges, points
│   └── profile/        ← User profile, settings
│
├── admin/              ← Admin surface
│   ├── layout.tsx      ← AdminShellV2 (collapsible sidebar, RBAC)
│   ├── (system)/       ← System admin only (audit logs, health)
│   └── tenant/[id]/    ← Tenant admin (content, users, settings)
│
├── demo/               ← Demo entry point
├── api/                ← 40+ API route directories
└── legal/, privacy/    ← Static legal pages
```

### Layout Isolation: Already Clean

| Surface | Layout Component | Auth Gate | Navigation |
|---------|-----------------|-----------|------------|
| Marketing | `MarketingLayoutContent` (Header + Footer) | None | Public nav |
| App | `AppShellContent` (SideNav + BottomNav) | User + Tenant | 5 nav items |
| Admin | `AdminShellV2` (collapsible sidebar) | system_admin or tenant admin | 30+ nav items, RBAC-filtered |

**Root layout** (`app/layout.tsx`) contains only: fonts, i18n provider, theme script, global CSS. No admin or app-specific imports.

### Bundle Separation: Mostly Clean, Two Leaks

Next.js App Router route-based code splitting means:
- A user on `/app/browse` does **NOT** load admin JavaScript
- A user on `/admin/tenant/x/users` does **NOT** load app navigation
- Marketing pages load neither app nor admin bundles

**This is already working.** The concern that "admin loads for all users" is incorrect.

#### Two cross-boundary import leaks found:

| Leak | Severity | Path | Impact |
|------|----------|------|--------|
| **BadgeIcon** | Medium | `features/gamification/components/BadgeIcon.tsx` → `features/admin/achievements/{data,assets,icon-utils}` | Admin achievement rendering utilities included in `/app/gamification/*` bundles |
| **CoachDiagramBuilder** | Medium | `features/tools/components/CoachDiagramBuilderV1.tsx` → `features/admin/library/coach-diagrams/{svg,courtBackgrounds}` | Admin diagram SVG/court utilities included in `/app/play/*` bundles |

**These are refactoring issues, not architecture issues.** The fix is moving shared utilities (themes, icon-utils, svg rendering) to `lib/` or `features/shared/` instead of importing from `features/admin/`. This takes ~1-2 hours and is independent of any host decision.

---

## Intended Model vs Reality

| Aspect | Intended | Actual |
|--------|----------|--------|
| `lekbanken.no` = marketing | ✅ `(marketing)` route group with own layout | But served on `www.lekbanken.no`, not bare domain |
| `app.lekbanken.no` = app | ✅ `/app/*` routes with AppShell | But broken TLS, traffic goes to `www.` |
| `admin.lekbanken.no` = admin | ❌ Never implemented — zero code references | Admin is route-gated at `/admin/*` |
| `demo.lekbanken.no` = demo | ✅ Fully implemented in proxy.ts + auth/demo | Fixed tenant ID, cross-origin redirect |

---

## Misconceptions Corrected

### ❌ "Admin code loads for regular users"

**False.** Next.js App Router uses route-based code splitting. The `/admin/*` chunk tree is separate from `/app/*`. They share:
- Root layout (fonts, i18n, theme — ~5 KB)
- `components/ui/` design system (tree-shaken per component)
- Two import leaks noted above (fixable without architecture changes)

### ❌ "Same deploy = everything loads everywhere"

**False.** Same deploy means same deployment artifact on Vercel, but the browser only downloads chunks for the routes it visits. Visiting `/app/browse` triggers `app/app/browse/page.tsx` chunk + its dependencies, not the admin tree.

### ❌ "Separate subdomains improve performance"

**False for this architecture.** Since all subdomains point to the same Next.js app, the same chunks are served regardless of hostname. There is actually a minor CDN penalty: Vercel caches by full URL including hostname, so `app.lekbanken.no/app/browse` and `www.lekbanken.no/app/browse` would be separate cache entries for identical content.

### ✅ "Separate subdomains improve product clarity"

**True.** Distinct hostnames make the product model visible to users, operators, and external integrations. This is a UX/branding decision, not a performance one.

---

## Three Architecture Models Compared

### Model 1: Route-Separated Single Host

```
www.lekbanken.no/          ← marketing
www.lekbanken.no/app/*     ← application
www.lekbanken.no/admin/*   ← admin
www.lekbanken.no/demo/*    ← demo (or demo.lekbanken.no)
```

| Dimension | Assessment |
|-----------|------------|
| **Bundle isolation** | ✅ Already works via route-based code splitting |
| **Auth/cookies** | ✅ Trivial — same origin, same cookies |
| **Deploy complexity** | ✅ One deploy, one domain, one cert |
| **CDN efficiency** | ✅ Single hostname = best cache utilization |
| **Product clarity** | ⚠️ All surfaces share one hostname — less distinct |
| **Origin isolation** | ❌ None — all surfaces are same-origin |
| **Migration effort** | ✅ Zero — this is the current state |
| **Future multi-tenant** | ✅ Tenant subdomains still work independently |

**Best for:** Simplicity-first, fast iteration, small team.

### Model 2: Host-Separated Single Deployment

```
lekbanken.no               ← marketing
app.lekbanken.no            ← application
admin.lekbanken.no          ← admin
demo.lekbanken.no           ← demo
{tenant}.lekbanken.no       ← tenant subdomains
```

All resolve to the same Vercel deployment, middleware routes by hostname.

| Dimension | Assessment |
|-----------|------------|
| **Bundle isolation** | ✅ Same as Model 1 — route splitting, not host splitting |
| **Auth/cookies** | ⚠️ Cross-subdomain cookies needed (already implemented with `.lekbanken.no`) |
| **Deploy complexity** | ⚠️ One deploy, 4+ domains, 4+ certs, cookie domain config |
| **CDN efficiency** | ⚠️ Separate cache per hostname for same content |
| **Product clarity** | ✅ Clear surface separation in URLs |
| **Origin isolation** | ⚠️ Partial — different origins but shared cookies negate most benefit |
| **Migration effort** | Medium — see implementation section below |
| **Future multi-tenant** | ✅ Already part of the model |

**Requires for correct implementation (details below):**
- Route gating per host in middleware (prevent `/admin/*` on `app.` host)
- TLS provisioning for all subdomains
- Supabase auth redirect URLs for each host
- Canonical URL / SEO metadata per host

**Best for:** Product clarity, future separation readiness, branding.

### Model 3: Fully Separated Multi-App

```
marketing-app (lekbanken.no)       ← separate Next.js project
platform-app (app.lekbanken.no)    ← separate Next.js project  
admin-app (admin.lekbanken.no)     ← separate Next.js project
demo-app (demo.lekbanken.no)       ← separate Next.js project
```

| Dimension | Assessment |
|-----------|------------|
| **Bundle isolation** | ✅✅ Complete — separate builds, separate trees |
| **Auth/cookies** | ❌ Hard — cross-app auth requires shared auth service or token relay |
| **Deploy complexity** | ❌ 4 separate deployments, CI pipelines, env configs |
| **CDN efficiency** | ✅ Each app has its own optimized bundle |
| **Product clarity** | ✅✅ Complete separation |
| **Origin isolation** | ✅✅ True origin isolation |
| **Migration effort** | ❌ Very high — monorepo restructure, shared lib extraction |
| **Future multi-tenant** | ⚠️ Tenant resolution per app, more complex |
| **Shared code** | ❌ Must extract to packages: `@lekbanken/ui`, `@lekbanken/auth`, etc. |

**Estimated effort:** 4-8 weeks of restructuring. Not justified for current team size and traffic.

**Best for:** Large teams, different release cadences, regulatory isolation requirements.

---

## Model 2 Implementation Requirements (if chosen)

### What middleware needs to do:

```
hostname → surface → allowed route prefixes
```

| Hostname | Surface | Allowed Routes | Blocked Routes |
|----------|---------|---------------|----------------|
| `lekbanken.no` | marketing | `/(marketing)/*`, `/api/public/*`, `/legal/*` | `/app/*`, `/admin/*` |
| `app.lekbanken.no` | app | `/app/*`, `/auth/*`, `/api/*`, `/demo/*` | `/admin/*` (redirect to admin host) |
| `admin.lekbanken.no` | admin | `/admin/*`, `/auth/*`, `/api/admin/*` | `/(marketing)/*` |
| `demo.lekbanken.no` | demo | `/app/*`, `/auth/*`, `/demo/*` | `/admin/*` |

### Middleware changes (~50 lines):

1. Add a `resolveSurface(hostname)` function mapping hostname → surface name
2. Add route gating: if path is outside allowed routes for surface, redirect/404
3. Set `x-surface` header for downstream layout awareness

### Vercel changes:

1. Add `app.lekbanken.no` domain → provision TLS
2. Add `admin.lekbanken.no` domain → provision TLS
3. Verify `demo.lekbanken.no` domain → provision TLS
4. All domains point to same deployment

### Supabase auth:

1. Add redirect URLs for all 4 hosts in Supabase dashboard
2. `NEXT_PUBLIC_SITE_URL` should be set per-host or use `requestUrl.origin` (auth callback already does this)

### Auth callback:

Already host-agnostic — uses `requestUrl.origin`. ✅ No change needed.

### Stripe webhook:

Choose one canonical webhook host (recommend `app.lekbanken.no`). Stripe doesn't need to know about other hosts.

### SEO/Canonical:

Marketing pages should set `<link rel="canonical" href="https://lekbanken.no/..." />` regardless of which host serves them.

---

## Recommendation

### For current launch state: **Model 1 with demo exception**

The codebase already provides route-level isolation. The immediate priority is launching and getting users, not restructuring hostnames. The two bundle leaks should be fixed regardless.

**Concrete actions now:**
1. Adopt `www.lekbanken.no` as the single production host (already the case)
2. Keep `demo.lekbanken.no` (genuinely useful, already implemented)
3. ~~Fix the two bundle leaks (move shared utils out of `features/admin/`)~~ ✅ **DONE** (2025-07-18)
4. Update `PLATFORM_PRIMARY_HOST` to `www.lekbanken.no`
5. Verify Supabase/Stripe dashboard configs

**Bundle leak fix details (2025-07-18):**
- Moved `types.ts`, `data.ts`, `assets.ts`, `icon-utils.ts` from `features/admin/achievements/` → `lib/achievements/`
- Moved `svg.ts`, `courtBackgrounds.ts` from `features/admin/library/coach-diagrams/` → `lib/coach-diagrams/`
- Original files replaced with re-export stubs for backward compatibility
- `BadgeIcon.tsx` (gamification) now imports directly from `@/lib/achievements/`
- `CoachDiagramBuilderV1.tsx` (tools) now imports directly from `@/lib/coach-diagrams/`
- Verification: 0 tsc errors, 1777 vitest tests pass, 0 ESLint errors

### For post-launch evolution: **Model 2 when it matters**

Model 2 (host-separated single deploy) is the right **next step** when:
- You have distinct user audiences that benefit from separate entry points
- You want marketing to feel separate from the app (different headers, footers, CTAs)
- You're preparing for enterprise customers who expect `admin.` as a distinct surface
- You want to A/B test separate landing experiences

**Model 2 prerequisites (do these first):**
1. Fix the two import leaks (shared code in `lib/`, not `features/admin/`)
2. Ensure middleware budget can handle surface resolution overhead (trivial — one string comparison)
3. Provision TLS for all subdomains on Vercel

**Model 3 is not recommended** for the foreseeable future. The team size, traffic level, and product maturity do not justify the engineering overhead of multi-app separation.

---

## Summary Table

| Question | Answer |
|----------|--------|
| Does admin code load for app users? | **No** — route-based splitting already works |
| Are there any bundle leaks? | ~~Yes, two~~ ✅ **Fixed** — shared utils moved to `lib/` |
| Can we do host separation in one deploy? | **Yes** — ~50 middleware lines + Vercel DNS/TLS |
| Should we do host separation now? | **No** — launch first, then evolve to Model 2 |
| Should we ever do multi-app separation? | **Unlikely** — Model 2 covers 90% of the benefit at 10% of the cost |
| What should we do right now? | ~~Fix bundle leaks~~, adopt `www.` as canonical, keep `demo.` |

**Decision status:** Model 1 adopted. Bundle leaks fixed. Awaiting owner decision on remaining items (canonical host constant, Supabase/Stripe config).
