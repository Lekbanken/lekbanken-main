# Repo Structure Canonical Map

> Generated 2026-03-16. Classifications based on import analysis, route wiring, and layout hierarchy verification.

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Frozen structural classification snapshot from the 2026-03-16 repo audit. Use current governance docs for working rules, not this map alone.

Legend:
- **CR** = Canonical Runtime (part of production app)
- **SUI** = Shared UI (imported by multiple surfaces)
- **RL** = Route-Local (co-located with a single route)
- **DF** = Domain Feature (self-contained feature module)
- **IDL** = Infra / Data Layer
- **DOC** = Docs / Reference
- **SB** = Sandbox-only
- **DEP** = Deprecated
- **ORP** = Orphaned (no imports)
- **NC** = Needs Consolidation

---

## App Routes — `app/`

| Path | Classification | Notes |
|------|---------------|-------|
| `app/layout.tsx` | CR | Root layout, wraps all routes |
| `app/providers.tsx` | CR | Global providers (auth, i18n, cookie banner) |
| `app/server-providers.tsx` | CR | Server-side message provider |
| `app/globals.css` | CR | Global styles |
| `app/sitemap.ts` | CR | SEO sitemap generator |
| `app/robots.ts` | CR | SEO robots.txt |
| `app/(marketing)/` | CR | Marketing landing pages + auth forms |
| `app/(marketing)/layout.tsx` | CR | Marketing shell (Header + Footer) |
| `app/(marketing)/auth/` | CR | Login, signup, reset-password (UI pages) |
| `app/(marketing)/auth/layout.tsx` | CR | TenantProvider + minimal auth wrapper |
| `app/(marketing)/components/` | **ORP** | 2 files (marketing-header, marketing-footer) — never imported |
| `app/(marketing)/features/page.tsx` | CR | Features marketing page |
| `app/(marketing)/checkout/` | CR | Public checkout flow |
| `app/(marketing)/play/` | CR | Public play entry points |
| `app/(marketing)/pricing/` | CR | Pricing page |
| `app/(marketing)/enterprise/` | CR | Enterprise landing |
| `app/(marketing)/gift/` | CR | Gift purchase flow |
| `app/auth/` | CR | Server-side auth handlers (Route Handlers) |
| `app/auth/callback/route.ts` | CR | OAuth code exchange |
| `app/auth/demo/route.ts` | CR | Demo session creation |
| `app/auth/mfa-challenge/` | CR | MFA challenge page |
| `app/auth/recovery/` | CR | Password recovery page |
| `app/auth/signout/route.ts` | CR | Sign-out handler |
| `app/app/` | CR | Authenticated app shell |
| `app/app/layout.tsx` | CR | App shell (auth check, tenant provider, legal gate) |
| `app/app/layout-client.tsx` | CR | Client-side app shell (CartProvider, DemoBanner) |
| `app/app/components/app-topbar.tsx` | RL | App topbar (NotificationBell, breadcrumbs) |
| `app/app/browse/` | CR | Game browsing |
| `app/app/planner/` | CR | Planner domain |
| `app/app/play/` | CR | Play sessions |
| `app/app/profile/` | CR | User profile |
| `app/app/notifications/` | CR | Notifications page |
| `app/app/gamification/` | CR | Gamification features |
| `app/app/journey/` | CR | Player journey |
| `app/app/shop/` | CR | In-app shop |
| `app/app/subscription/` | CR | Subscription management |
| `app/app/preferences/` | CR | User preferences |
| `app/app/select-tenant/` | CR | Tenant selection |
| `app/app/no-access/` | CR | Access denied fallback |
| `app/admin/` | CR | Admin panel |
| `app/admin/layout.tsx` | CR | Admin shell (auth + role check + AdminShellV2) |
| `app/admin/components/admin-nav-config.tsx` | RL | Admin navigation configuration |
| `app/admin/*/page.tsx` | CR | Individual admin pages |
| `app/admin/*/_legacy-page.tsx` | **DEP** | 6 legacy pages (all have active replacements): gamification/levels, leaderboard, licenses, marketplace, media, purposes |
| `app/admin/(system)/` | CR | System-admin pages with separate layout |
| `app/api/` | CR | API Route Handlers |
| `app/board/` | CR | Board/game display routes |
| `app/demo/` | CR | Demo mode landing |
| `app/demo-expired/` | CR | Expired demo page |
| `app/legal/` | CR | Legal document acceptance |
| `app/participants/` | CR | Anonymous participant entry |
| `app/playground/` | **SB** | Dev playground (should be in sandbox) |
| `app/sandbox/` | **SB** | 166 files — dev-only but ships as production routes |

---

## Components — `components/`

| Path | Classification | Notes |
|------|---------------|-------|
| `components/ui/` | **SUI** | Shared UI primitives (Button, Card, Dialog, Input, etc.) |
| `components/app/` | **SUI** | App shell primitives (AppShell, SideNav, BottomNav, NotificationBell, PageHeader, PageTitleHeader, ProfileModal) |
| `components/admin/` | **SUI** | Admin shell (AdminShellV2, AdminSidebarV2, AdminTopbarV2) + admin shared UI (AdminPageHeader, AdminCard via `shared/`) |
| `components/navigation/` | **SUI** | Cross-surface nav primitives (LanguageSwitcher, ProfileMenu, ThemeToggle) |
| `components/marketing/` | **SUI** | Marketing header, footer, hero, feature grid, pricing CTA, etc. |
| `components/auth/` | **SUI** | MFA components (MFAChallenge, MFACodeInput, MFARecoveryInput, TrustDeviceCheckbox) |
| `components/game/` | **SUI** | Game display components (GameCard, GameDetailsView, etc.) |
| `components/play/` | **SUI** | 44 shared play UI primitives — ✅ audited 2026-03-16, deliberate shared layer (see `play-structure-audit.md`) |
| `components/journey/` | **SUI** | Journey visualization (JourneyScene, JourneyStats, ParticleField) — imported by features/gamification |
| `components/achievements/` | **SUI** | Badge builder and display |
| `components/billing/` | **SUI** | Billing/payment UI |
| `components/coach-diagram/` | **SUI** | Coach diagram viewer |
| `components/cookie/` | **SUI** | Cookie consent (canonical CookieConsentBanner) |
| `components/demo/` | **SUI** | Demo mode banner |
| `components/icons/` | **SUI** | Custom icon components |
| `components/learning/` | **SUI** | Learning module UI |
| `components/legal/` | **NC** | Legal components — contains **orphaned** duplicate `CookieConsentBanner.tsx` |
| `components/profile/` | **SUI** | ProfileNavigation |
| `components/tenant/` | **SUI** | Tenant management UI |
| `components/sandbox/` | **SB** | Sandbox-only components |
| `components/layout/` | **ORP** | **Empty directory** |

---

## Features — `features/`

| Path | Classification | Size | Notes |
|------|---------------|------|-------|
| `features/admin/` | **DF** | 15 sub-domains | Full admin domain pages. Imports from `components/admin/shared/` for UI primitives |
| `features/browse/` | **DF** | ~10 files | Game browsing. Has local GameCard that may be dead (imports shared one) |
| `features/gamification/` | **DF** | ~30 files | Achievements, XP, badges, cosmetics, streaks |
| `features/play/` | **DF** | **134 files**, 17 hooks, API layer | Session orchestration. Imports from `components/play/` (layered, not parallel) |
| `features/planner/` | **DF** | 27+ components, calendar module, wizard | Plan creation and scheduling |
| `features/participants/` | **DF** | 6 components, 7 hooks | Host-side session participant management |
| `features/journey/` | **DF** | ~5 files | Player journey. Has mock `JourneyPage.tsx` with hardcoded Swedish |
| `features/tools/` | **DF** | ~8 files | In-session tools (dice, coach diagram, conversation cards) |
| `features/profile-overview/` | **DF** | 5 components | Profile page cards |
| `features/conversation-cards/` | **NC** | 3 files | Thin — could merge into features/tools or features/admin |
| `features/profile/` | **NC** | 1 file (`avatarPresets.ts`) | Trivially thin — should be in `lib/profile/` |
| `features/play-participant/` | **NC** | 2 files (`api.ts`, `tokenStorage.ts`) | Thin — could be sub-module of features/play |

---

## Lib — `lib/`

| Path | Classification | Notes |
|------|---------------|-------|
| `lib/supabase/` | **IDL** | Supabase client wrappers (client, server, middleware, auth) |
| `lib/auth/` | **IDL** | Auth helpers (capabilities, ephemeral-users, MFA, server-context, roles) |
| `lib/context/` | **IDL** | React contexts (TenantContext, PreferencesContext) |
| `lib/play/` | **IDL** | Play engine (session-command, realtime, UI state) |
| `lib/games/` | **IDL** | Game data access and types |
| `lib/planner/` | **IDL** | Planner data layer |
| `lib/profile/` | **IDL** | Profile service, types, cache |
| `lib/tenant/` | **IDL** | Tenant service and types |
| `lib/i18n/` | **IDL** | Internationalization |
| `lib/stripe/` | **IDL** | Stripe integration |
| `lib/config/` | **IDL** | App configuration |
| `lib/utils/` | **IDL** | Shared utility functions |
| `lib/validation/` | **IDL** | Input validation |
| `lib/rate-limit/` | **IDL** | Rate limiting |
| `lib/crypto/` | **IDL** | Crypto utilities |
| `lib/realtime/` | **IDL** | Supabase realtime integration |
| `lib/services/` | **NC** | **Catch-all** — 30+ files for various service functions |
| `lib/features/` | **IDL** | Feature flag system (NOT the same as `features/`) |
| `lib/domain/` | **IDL** | Domain logic |
| `lib/design/` | **IDL** | Design system config |
| `lib/analytics/` | **IDL** | Analytics |
| `lib/achievements/` | **IDL** | Achievement engine |
| `lib/ai/` | **IDL** | AI/LLM integration |
| `lib/builder/` | **IDL** | Game builder logic |
| `lib/cart/` | **IDL** | Cart state |
| `lib/consent/` | **IDL** | Cookie consent logic |
| `lib/demo/` | **IDL** | Demo mode helpers |
| `lib/game-authoring/` | **IDL** | Game creation logic |
| `lib/game-display/` | **IDL** | Game display types/helpers |
| `lib/gdpr/` | **IDL** | GDPR compliance |
| `lib/import/` | **IDL** | Import engine |
| `lib/journey/` | **IDL** | Journey data layer |
| `lib/learning/` | **IDL** | Learning module |
| `lib/legal/` | **IDL** | Legal document management |
| `lib/marketing/` | **IDL** | Marketing helpers |
| `lib/media/` | **IDL** | Media upload/management |
| `lib/shop/` | **IDL** | Shop logic |

---

## Hooks — `hooks/`

| File | Classification | Notes |
|------|---------------|-------|
| `useAppNotifications.ts` | **SUI** | Shared notification hook (recently rewritten with shared store) |
| `useGameBuilder.ts` | **SUI** | Game builder hook |
| `useGameReaction.ts` | **SUI** | Game reaction hook |
| `useSubscription.ts` | **SUI** | Subscription management |
| `useProfileQuery.ts` | **SUI** | Profile data hook |
| `useBrowserSupabase.ts` | **SUI** | Client-side Supabase hook |
| `useIsDemo.ts` | **SUI** | Demo mode detection |
| `useMFAChallenge.ts` | **SUI** | MFA challenge flow |
| `useAchievementProgress.ts` | **SUI** | Achievement progress tracking |
| `useSessionCapabilities.ts` | **SUI** | Session capability detection |
| `useLatestRef.ts` | **SUI** | Utility ref hook |

---

## Infrastructure

| Path | Classification | Notes |
|------|---------------|-------|
| `supabase/migrations/` | **IDL** | SQL migrations (canonical) |
| `supabase/functions/` | **IDL** | Edge Functions |
| `supabase/seeds/` | **IDL** | Seed data |
| `supabase/config.toml` | **IDL** | Supabase config |
| `tests/` | **IDL** | Test suites (e2e, unit, integration, RLS) |
| `scripts/` | **NC** | Mix of canonical + 14 legacy migration scripts + ad-hoc tools |
| `messages/` | **IDL** | i18n locale files (sv, en, no) |
| `types/` | **IDL** | TypeScript type definitions |
| `eslint-rules/` | **IDL** | Custom ESLint rules |

---

## Documentation Surfaces

| Path | Classification | Notes |
|------|---------------|-------|
| `README.md` | **DOC** | Project README — should stay at root |
| `PROJECT_CONTEXT.md` | **DOC** | Product context for AI agents — should stay at root |
| Root `*-architecture/audit/implementation-plan.md` | **DOC** | Active AI triplets (planner, app-shell-notifications, journey-activation) |
| Root completed implementation docs (~9 files) | **NC** | Should move to `docs/archive/` |
| Root analysis/audit docs (~11 files) | **NC** | Should move to `docs/` by domain |
| `docs/` | **DOC** | Domain reference docs (289 files, 18 subdirs) |
| `docs/archive/` | **DOC** | Archived/obsolete docs (37 files) |
| `launch-readiness/` | **DOC** | Active launch program — most current system state |
| `.bak` files (3) | **DEP** | Dead — safe to delete |

---

## Compact Route Surface Map

| Surface | Prefix | Auth | Shell/Layout | Route count |
|---------|--------|------|-------------|-------------|
| Marketing | `/`, `/pricing`, `/enterprise`, `/checkout`, `/gift`, `/play` | None | `(marketing)/layout` | 7 zones |
| Auth UI | `/auth/login`, `/auth/signup`, `/auth/reset-password` | None | `(marketing)/layout` | 3 pages |
| Auth Ops | `/auth/callback`, `/auth/signout`, `/auth/demo`, `/auth/mfa-challenge`, `/auth/recovery` | Server-side | No layout | 5 endpoints |
| App | `/app/*` | Required | `app/layout-client` | 20 routes |
| Admin | `/admin/*` | Role-gated | `admin/layout` | 44 routes |
| API | `/api/*` | Mixed | None (Route Handlers) | 34 domains |
| Sandbox | `/sandbox/*` | **None (risk!)** | None | 39 dirs / 166 files |
| Other public | `/board`, `/demo`, `/legal`, `/participants`, `/terms`, `/privacy`, `/playground` | None/Mixed | Varies | 9 routes |

**Key safety rules:**
- `/auth/login` ≠ `/auth/callback` — different groups, different concerns (UI vs server ops)
- `/sandbox/*` has **no auth gate** — do not put production code there
- `/playground` at top-level should be under `/sandbox/` — misplaced route

---

## Specifically Requested Classifications

| Path | Classification | Reason |
|------|---------------|--------|
| `app/(marketing)/auth` | **CR** | User-facing auth UI pages under marketing layout |
| `app/auth` | **CR** | Server-side auth operations (Route Handlers + standalone pages) |
| `app/app` | **CR** | Authenticated app surface with its own shell |
| `app/admin` | **CR** | Admin panel with role-gated shell |
| `components/app` | **SUI** | App shell primitives used by `app/app/layout-client.tsx` |
| `components/layout` | **ORP** | Empty directory — delete |
| `components/navigation` | **SUI** | Cross-surface nav primitives (3 files, all actively imported) |
| `components/marketing` | **SUI** | Marketing page components (header, footer, hero, etc.) |
| `components/admin` | **SUI** | Admin shell + shared admin UI primitives |
| `sandbox` | **SB** | Dev playground — not gated in production |
| `deprecated` | **DEP** | Thin quarantine layer — currently contains tripwire utility only |
