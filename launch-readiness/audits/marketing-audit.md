# Marketing & Landing Audit (#16)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-13
- Last updated: 2026-03-21
- Last validated: 2026-03-13

> Closed launch-readiness audit for the marketing and landing domain. Treat this as the bounded audit snapshot behind later SEO and polish work.

> **Scope:** Public-facing pages, SEO metadata, indexing, static/dynamic rendering, images, analytics, cookie consent  
> **Auditor:** Claude (automated, independently verified)  
> **Status:** ✅ Complete — GPT-calibrated (2026-03-12)  
> **Date:** 2026-03-12  

---

## Executive Summary

**7 findings (0 P0, 0 P1, 2 P2, 5 P3)**

| Severity | Count | Launch Impact |
|----------|-------|--------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 2 | Post-launch SEO hardening |
| P3 | 5 | Polish |

The marketing domain has a **solid foundation**: marketing layout exports proper metadata (title + description), pricing is a server component with SSR data fetching, features page has dedicated metadata, `next/font` (Geist) is used, cookie consent system exists with audit logging, and the enterprise quote endpoint has rate limiting + honeypot + Zod validation (fixed in ABUSE-001).

Main gaps are missing `robots.txt`/`sitemap.xml`, no OpenGraph/Twitter metadata, and the homepage being fully `'use client'` (preventing SSR metadata and static generation). No security issues found — all public forms are already hardened.

---

## Findings

### MKT-001 — No `robots.txt` or `sitemap.xml` (P2)

**Location:** `public/` directory — neither `robots.txt` nor `sitemap.xml` exist. No `app/robots.ts` or `app/sitemap.ts` either.

**Description:** Without `robots.txt`, search engines will crawl all accessible paths including `/app/`, `/admin/`, `/auth/`, and `/sandbox/`. While these routes are auth-gated (server-side redirects in layouts), crawlers still generate request load and may index login/redirect pages.

Without a sitemap, search engines must discover pages via link crawling, which misses orphaned pages and slows indexing.

**Risk:** Auth-gated routes leak URL structure to crawlers. No sitemap means slower SEO indexing. Standard pre-launch SEO requirement.

**Remediation:**
1. Create `app/robots.ts` blocking `/app/`, `/admin/`, `/sandbox/`, `/auth/`, `/api/`
2. Create `app/sitemap.ts` listing `/`, `/pricing`, `/features`, `/enterprise`

---

### MKT-002 — No OpenGraph / Twitter / Canonical Metadata (P2)

**Location:** `app/(marketing)/layout.tsx` L5–9 — only `title` and `description` set.

**Description:** The marketing layout metadata has:
```typescript
export const metadata: Metadata = {
  title: "Lekbanken - Gör planeringen lekfull, snabb och delbar",
  description: "Bygg, anpassa och dela aktiviteter...",
};
```

Missing from all marketing pages:
- `openGraph` (title, description, image, url)
- `twitter` (card, title, description, image)
- `alternates.canonical`
- Structured data (JSON-LD)

The only page with OpenGraph is `app/app/games/[gameId]/page.tsx` (authed game detail page) — no marketing pages have it.

**Risk:** Social sharing (Slack, Teams, Facebook, LinkedIn) shows no preview image or description. Canonicalization issues if pages are accessible via multiple URLs. Reduced SEO effectiveness.

**Remediation:** Add OpenGraph and Twitter metadata to the marketing layout, with page-specific overrides for pricing and features.

---

### MKT-003 — Root Layout Has Dev Metadata (P3)

**Location:** `app/layout.tsx` L44–47

**Description:** The root layout (parent of ALL routes) exports:
```typescript
export const metadata: Metadata = {
  title: "Lekbanken - Frontend Architecture",
  description: "Separata UI-världar för Marketing, App och Admin...",
};
```

This is clearly development placeholder text. The marketing layout overrides it with proper copy, but any route WITHOUT its own metadata (e.g., `/app/`, `/admin/`) inherits "Frontend Architecture" as its title.

**Risk:** If Google somehow indexes an authed page, it shows dev text. Also visible in browser tabs for authenticated users. Unprofessional but not visible to public users thanks to the marketing layout override.

**Remediation:** Change to a proper default title (`"Lekbanken"`) and generic description.

---

### MKT-004 — Homepage Is Fully Client-Rendered (P3)

**Location:** `app/(marketing)/page.tsx` L1 — `'use client'`

**Description:** The homepage is a client component that imports `useAuth`, `useRouter`, and `useSearchParams`. This prevents it from exporting its own `metadata` and from being statically generated. The redirect-on-`?redirect=` logic requires client-side rendering.

However, the marketing layout's metadata (`title`, `description`) IS applied to the homepage since metadata is inherited from server-component layouts regardless of whether the page itself is a client component.

**Risk:** Homepage cannot be statically generated (SSG). Every visit does full client-side render. No page-specific metadata (e.g., different description for homepage vs. subpages). But layout metadata does cover the basics.

**Remediation:** Extract the redirect logic into a small client component wrapper and make the page itself a server component, or accept the trade-off (functional as-is).

---

### MKT-005 — Testimonials Use Raw `<img>` Instead of `next/image` (P3)

**Location:** `components/marketing/testimonials.tsx` L1 — `/* eslint-disable @next/next/no-img-element */`

**Description:** The testimonials component uses raw `<img>` tags (3 instances at L151, L160, L186) for avatar images sourced from Unsplash CDN URLs. The ESLint rule is explicitly disabled. All `alt` attributes are empty (`alt=""`).

Images are small (256×256 facearea crops from Unsplash, 10×10 w/h in UI) and externally hosted, so the practical performance impact is low.

**Risk:** No Next.js image optimization (lazy loading, srcset, format conversion). Minor CLS risk. Empty `alt=""` is acceptable for decorative images but the avatar images aren't purely decorative.

**Remediation:** Replace with `next/image` and add Unsplash to `next.config.ts` `images.remotePatterns`. Add meaningful alt text.

---

### MKT-006 — Enterprise and Gift Pages Are `'use client'` Without Own Metadata (P3)

**Location:** `app/(marketing)/enterprise/page.tsx` L1, `app/(marketing)/gift/page.tsx` L1

**Description:** These pages are `'use client'` and can't export metadata. They inherit the marketing layout's generic metadata. Enterprise page should have conversion-focused metadata for SEO (e.g., "Enterprise pricing for Lekbanken — contact sales").

**Risk:** Generic metadata on conversion-critical pages. Minor SEO issue — these pages are less important for organic search (enterprise is typically direct/referral traffic).

**Remediation:** Wrap in a server-component page that exports metadata and renders the client component as a child.

---

### MKT-007 — Pricing Page Missing Own Metadata (P3)

**Location:** `app/(marketing)/pricing/page.tsx` — no `metadata` or `generateMetadata` export

**Description:** The pricing page is a server component but doesn't export its own metadata. It inherits the marketing layout's generic title "Lekbanken - Gör planeringen lekfull, snabb och delbar". The `/pricing/[slug]` sub-page also lacks metadata.

Compare with `/features` which has dedicated metadata: `title: 'Funktioner | Lekbanken'`.

**Risk:** Pricing page shows generic title in browser tabs and search results instead of something like "Priser | Lekbanken". The `/features` page sets the pattern but pricing doesn't follow it.

**Remediation:** Add `export const metadata: Metadata = { title: 'Priser | Lekbanken', description: '...' }`.

---

## Cross-References (Already Tracked)

| Issue | Tracked In | Finding ID | Status |
|-------|-----------|------------|--------|
| Enterprise quote spam | abuse-privacy-audit.md | ABUSE-001 (P0) | ✅ Fixed — `apiHandler + strict rate limit + honeypot` |
| Cookie consent system | api-consistency-remediation.md | — | ✅ Implemented — Zod + rate limiting |

---

## Positive Findings

| # | Finding | Details |
|---|---------|---------|
| P1 | Marketing layout metadata | `title` + `description` set at layout level — all marketing pages inherit |
| P2 | Features page has dedicated metadata | `title: 'Funktioner | Lekbanken'` + description |
| P3 | Pricing is SSR server component | Server-side data fetching with `createServerRlsClient()`, proper `Promise.all` for categories + products |
| P4 | `next/font` used properly | Geist + Geist_Mono loaded via `next/font/google` in root layout |
| P5 | Cookie consent system complete | `CookieConsentBanner`, `cookie-consent-manager.ts`, audit logging, granular controls |
| P6 | Enterprise quote secured | `apiHandler({ auth: 'public', rateLimit: 'strict' })` + honeypot field + Zod validation |
| P7 | Play session page has `generateMetadata` | Dynamic metadata for session code pages |
| P8 | Auth routes properly `force-dynamic` | Login, signup, reset-password use `force-dynamic` — auth state must be fresh |
| P9 | `Suspense` boundaries on client pages | Homepage wraps `MarketingContent` in `Suspense` (handles `useSearchParams`) |
| P10 | SEO canonical redirects in pricing | `/pricing?category=slug` → `/pricing/slug` via `permanentRedirect()` |
| P11 | No third-party analytics SDKs | No GA4, no tracking pixels — avoids blocking scripts and third-party cookie issues |
| P12 | Server components used where possible | `StepsTimeline`, `LoginCta`, `Testimonials` are server components (no `'use client'`) |
| P13 | Sandbox gated in production | `app/sandbox/layout.tsx` returns `notFound()` when `NODE_ENV === 'production'` |
| P14 | i18n throughout marketing | Components use `useTranslations('marketing')` for all UI text |

---

## Severity Distribution

| Finding | Category | Severity | Remediation |
|---------|----------|----------|-------------|
| MKT-001 | SEO / Indexing | P2 | Create `robots.ts` + `sitemap.ts` |
| MKT-002 | Social / SEO | P2 | Add OpenGraph + Twitter metadata |
| MKT-003 | Metadata | P3 | Replace dev text in root layout |
| MKT-004 | Rendering | P3 | Accept or refactor homepage to server component |
| MKT-005 | Images | P3 | Replace `<img>` with `next/image` in testimonials |
| MKT-006 | Metadata | P3 | Add metadata wrappers for enterprise/gift pages |
| MKT-007 | Metadata | P3 | Add dedicated pricing page metadata |

---

## Remediation Milestones

### M1 — SEO Foundation (MKT-001) — Post-launch
- [x] Create `app/robots.ts` blocking `/app/`, `/admin/`, `/sandbox/`, `/auth/`, `/api/` ✅ KLAR (2026-03-12)
- [x] Create `app/sitemap.ts` with marketing page URLs ✅ KLAR (2026-03-12)

**Noteringar:** GPT-recommended minimal fix applied. `robots.ts` blocks `/app`, `/admin`, `/sandbox`. `sitemap.ts` lists `/`, `/pricing`, `/features`.

### M2 — Social Sharing (MKT-002) — Post-launch
- [ ] Add OpenGraph + Twitter metadata to marketing layout
- [ ] Add OG image (static or dynamic)
- [ ] Add canonical URLs

### M3 — Polish (MKT-003, MKT-004, MKT-005, MKT-006, MKT-007) — Post-launch
- [ ] Replace dev metadata in root layout
- [ ] Evaluate homepage SSR refactor
- [ ] Replace `<img>` with `next/image` in testimonials
- [ ] Add metadata wrappers to enterprise/gift pages
- [ ] Add pricing page metadata

---

## Files Examined

- `app/layout.tsx` — Root layout with dev metadata
- `app/(marketing)/layout.tsx` — Marketing layout with proper metadata
- `app/(marketing)/marketing-layout-content.tsx` — Client wrapper
- `app/(marketing)/page.tsx` — Homepage (`'use client'`)
- `app/(marketing)/pricing/page.tsx` — Pricing (SSR server component)
- `app/(marketing)/pricing/[slug]/page.tsx` — Category detail (SSR)
- `app/(marketing)/pricing/pricing-catalog-client.tsx` — Client catalog
- `app/(marketing)/features/page.tsx` — Features with metadata
- `app/(marketing)/enterprise/page.tsx` — Enterprise form
- `app/(marketing)/gift/page.tsx` — Gift page
- `app/(marketing)/auth/login/page.tsx` — Login (force-dynamic)
- `app/(marketing)/auth/signup/page.tsx` — Signup (force-dynamic)
- `app/(marketing)/play/page.tsx` — Play with metadata
- `app/(marketing)/play/session/[code]/page.tsx` — Session with generateMetadata
- `app/app/layout.tsx` — App layout (auth-gated, no noindex metadata)
- `app/sandbox/layout.tsx` — Sandbox (production-gated)
- `components/marketing/testimonials.tsx` — Raw `<img>` usage
- `components/marketing/hero-v2.tsx` — Uses `next/image`
- `components/marketing/header.tsx` — Uses `next/image`
- `components/marketing/footer.tsx` — Uses `next/image`
- `public/` — No robots.txt or sitemap.xml
