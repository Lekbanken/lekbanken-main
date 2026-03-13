# Architecture Core — Launch Readiness Audit

> **Auditor:** Claude  
> **Date:** 2026-03-10  
> **Status:** Complete  
> **Pass:** 1  

---

## Scope

This audit covers the **foundational architecture** of Lekbanken:

- Domain boundaries and component organization
- State management ownership
- Data access patterns (Supabase usage in components vs API)
- API route consistency (auth, validation, error format)
- Error boundaries and loading/empty states
- DTO/mapper layer
- Server actions vs API routes
- Cross-domain coupling
- Type definition duplication
- Middleware and routing

**Files analyzed:** All directories under `app/`, `features/`, `lib/`, `components/`, and sampled 12+ API routes across all domains.

---

## Summary

| Severity | Count |
|----------|-------|
| P0 | 0 |
| P1 | 4 |
| P2 | 7 |
| P3 | 4 |
| **Total** | **15** |

---

## Findings

### [ARCH-001] 90+ domain-specific components misplaced in global `components/`

- **Typ:** ARCH
- **Severity:** P3
- **Fil(er):** `components/play/` (40+ files), `components/admin/` (15+), `components/billing/` (8), `components/game/` (20+), `components/journey/` (8+), `components/demo/` (4)
- **Beskrivning:** Feature-scoped components live in global `components/` instead of their respective `features/{domain}/components/` directories. This violates the project convention (documented in copilot-instructions.md) and creates unclear ownership.
- **Bevis:** 
  - `components/play/SessionCard.tsx`, `components/play/Keypad.tsx`, `components/play/LobbyHub.tsx` etc. — all play-domain-specific
  - `components/admin/AdminShellV2.tsx`, `components/admin/AnalyticsDashboard.tsx` — admin-domain-specific
  - `components/billing/SubscriptionCheckout.tsx`, `components/billing/CartDrawer.tsx` — billing-domain-specific
  - `components/game/GameCard/`, `components/game/GameDetails/` — browse-domain-specific
  - `components/journey/JourneyScene.tsx`, `components/journey/JourneyProgress.tsx` — journey-domain-specific
- **Förslag:** Move in batches per domain. Use IDE refactoring or codemod to update all import paths. Recommended order: play → admin → billing → game → journey → demo.
- **Notering:** `components/ui/`, `components/icons/`, `components/auth/`, `components/navigation/`, `components/tenant/`, `components/cookie/`, `components/legal/` are correctly placed as genuinely shared components.

---

### [ARCH-002] Three parallel API auth patterns — inconsistent guard adoption

- **Typ:** AUTH
- **Severity:** P1
- **Fil(er):** All 261 API routes. Centralized guard: `lib/api/auth-guard.ts`
- **Beskrivning:** The project defines a robust auth-guard library (`requireAuth()`, `requireSystemAdmin()`, `requireTenantRole()`, `requireSessionHost()`, `requireCronOrAdmin()`) but only ~5 routes use it. Three competing patterns exist:
  1. **Inline auth** (most common) — ad-hoc `supabase.auth.getUser()` + manual 401 response
  2. **Imported `requireAuth()`** from `lib/api/auth-guard.ts` — only ~5 routes
  3. **Local duplicate `requireAuth()`** — reimplemented per-file (e.g., `app/api/admin/coach-diagrams/`)
- **Bevis:**
  - `app/api/games/route.ts` — inline auth check
  - `app/api/games/builder/route.ts` — uses imported `requireAuth()`
  - `app/api/admin/coach-diagrams/[diagramId]/route.ts` — has local `requireAuth()` copy
- **Förslag:** Migrate all routes to use `lib/api/auth-guard.ts`. Delete all local copies. This ensures consistent auth behavior and makes security audits tractable. Can be done incrementally per domain.
- **Kopplat till:** ARCH-003, ARCH-004

---

### [ARCH-003] Inconsistent API error response formats

- **Typ:** ARCH
- **Severity:** P1
- **Fil(er):** All API routes. Standard lib: `lib/api/errors.ts`
- **Beskrivning:** API routes return 4+ different error shapes despite `lib/api/errors.ts` defining a standard `ApiError` class and `errorResponse()` function. Only 1 route uses the standard.
- **Bevis:**
  - Pattern 1: `{ error: 'Unauthorized' }` — simple string
  - Pattern 2: `{ errors: validation.errors }` — validation array
  - Pattern 3: `{ error: 'Invalid payload', details: parsed.error.flatten() }` — with Zod details
  - Pattern 4: Various data shapes with no envelope
  - Standard (unused): `ApiError.badRequest(message, code, details)` → `errorResponse()`
- **Förslag:** Adopt `lib/api/errors.ts` standard across all routes. Define canonical response envelope: `{ data?, error?, code? }`. Frontend can then have a single error-handling pattern.
- **Kopplat till:** ARCH-002

---

### [ARCH-004] Mixed validation patterns — no standard for API input

- **Typ:** ARCH
- **Severity:** P1
- **Fil(er):** API routes across all domains
- **Beskrivning:** Three validation approaches coexist:
  1. **Zod schemas** (best) — used in `app/api/shop/`, `app/api/media/`, Planner
  2. **Custom validation functions** — `validateGamePayload()`, `validatePlanPayload()`
  3. **No validation** — many routes accept raw body without checking
- **Bevis:**
  - `app/api/shop/route.ts` — uses `getSchema.parse()`, `postSchema.parse()` ✅
  - `app/api/games/route.ts` — uses `validateGamePayload()` (custom, not Zod)
  - `app/api/sessions/route.ts` — no validation, relies on RLS
  - `app/api/tenants/[tenantId]/route.ts` — manual enum checks
- **Förslag:** Standardize on Zod for all mutation endpoints (POST, PUT, PATCH, DELETE). Read endpoints (GET) can rely on RLS but should still validate query params.

---

### [ARCH-005] DTO/mapper layer exists only in Planner — all other domains pass raw DB rows

- **Typ:** ARCH
- **Severity:** P2
- **Fil(er):** `lib/planner/dto.ts` (only DTO file). All other API routes transform inline.
- **Beskrivning:** Only the Planner domain has a proper DTO layer with Zod-validated response schemas. All other domains pass raw Supabase rows to the frontend with ad-hoc inline transformations and type casts.
- **Bevis:**
  - `lib/planner/dto.ts` — `PlanResponseSchema`, `PlannerGameSummarySchema`, etc. ✅
  - `app/api/sessions/route.ts` — manual `.map()` with `(row as { id: string }).id` type casts ❌
  - Most routes: `return NextResponse.json({ data })` with raw DB types
- **Förslag:** Create DTO files per domain following Planner's pattern. Priority: Play, Sessions, Games, Gamification. This prevents schema drift and makes API contracts explicit.
- **Kopplat till:** ARCH-003, ARCH-004

---

### [ARCH-006] ~~Direct Supabase calls in client components (data access violation)~~ ✅ RESOLVED (2026-03-13)

- **Typ:** ARCH
- **Severity:** ~~P1~~ → ✅ Resolved
- **Fil(er):** `features/admin/organisations/` — 6 components, 20+ direct Supabase mutation calls
- **Beskrivning:** Six admin organisation components directly imported browser `supabase` client and performed mutations (INSERT, UPDATE, DELETE, storage.upload) from client-side code, bypassing server-side auth enforcement.
- **Åtgärd (2026-03-13):** Created `organisationMutations.server.ts` with 11 server actions, each enforcing `requireSystemAdmin()` auth. Refactored all 6 components to call server actions instead of direct Supabase. Zero `supabase.from()` or `supabase.storage` calls remain in client components.
- **Filer ändrade:**
  - `organisationMutations.server.ts` — NEW — 11 server actions (createTenant, deleteTenant, updateTenantStatus, updateTenantDetails, updateTenantLocale, saveTenantBranding, uploadTenantLogo, toggleTenantFeature, addTenantDomain, removeTenantDomain, updateTenantDomainStatus)
  - `OrganisationBrandingSection.tsx` — logo upload + branding save → server actions
  - `OrganisationFeaturesSection.tsx` — feature toggle → server action
  - `OrganisationDomainsSection.tsx` — domain CRUD → server actions
  - `OrganisationLocaleSection.tsx` — locale update → server action
  - `OrganisationDetailPage.tsx` — status change + detail update → server actions
  - `OrganisationAdminPage.tsx` — tenant create/status/delete → server actions
- **Notering:** Realtime subscriptions in client components (e.g., Play's `createBrowserClient()`) are acceptable — it's mutations that need routing through server.

---

### [ARCH-007] 6+ duplicate `Participant` type definitions — no single source of truth

- **Typ:** ARCH
- **Severity:** P2
- **Fil(er):** 6 files with separate `Participant` type definitions
- **Beskrivning:** The `Participant` type is defined independently in 6+ locations with different shapes. Only one (`features/participants/hooks/useParticipants.ts`) correctly derives from the database schema.
- **Bevis:**
  - `app/sandbox/scenes/runtime-store.ts:32` — standalone type
  - `components/play/ParticipantRow.tsx:27` — inline local type
  - `components/play/ParticipantList.tsx:10` — inline local type
  - `features/admin/participants/ParticipantDetailPage.tsx:18` — inline local type
  - `features/participants/hooks/useParticipants.ts:14` — `Database['public']['Tables']['participants']['Row']` ✅
  - `lib/services/participants/participant-token.ts:13` — inline local type
- **Förslag:** Create `features/participants/types.ts` exporting the canonical `Participant` type derived from DB schema. All other files import from there.
- **Kopplat till:** ARCH-008

---

### [ARCH-008] Multiple `Game` type definitions across browse, service, and admin

- **Typ:** ARCH
- **Severity:** P2
- **Fil(er):** `features/browse/types.ts:41`, `lib/services/gameService.ts:11`, `lib/game-display/types.ts`, `lib/game-authoring/types.ts`, `features/admin/games/types.ts`
- **Beskrivning:** The `Game` type has at least 3 different base definitions plus domain-specific variants. The relationship between them is unclear.
- **Bevis:**
  - `features/browse/types.ts` — browse-specific `Game` type
  - `lib/services/gameService.ts` — `export type Game = Tables<'games'>`
  - `lib/game-display/types.ts` — display-specific type
  - `lib/game-authoring/types.ts` — builder-specific type
- **Förslag:** Use the DB-derived type (`Tables<'games'>`) as the canonical base. Domain-specific views (browse, display, authoring) should be explicitly named (`BrowseGame`, `GameDisplayData`, `AuthoringGame`) and documented as projections/transformations of the base.

---

### [ARCH-009] Only 4 error boundaries for the entire app

- **Typ:** UX
- **Severity:** P2
- **Fil(er):** `app/app/error.tsx`, `app/app/profile/error.tsx`, `app/app/games/[gameId]/error.tsx`, `app/demo/error.tsx`
- **Beskrivning:** Only 4 `error.tsx` files exist across the entire app. Many route segments (admin, planner, play, sessions, billing, calendar, participants) have no error boundary.
- **Bevis:** No error.tsx in: `app/admin/`, `app/app/planner/`, `app/app/play/`, `app/participants/`, `app/auth/`
- **Förslag:** Add error boundaries for high-risk route segments: admin, planner, play, and participants. These are critical user-facing flows that should degrade gracefully.

---

### [ARCH-010] Only 3 loading states for the entire app

- **Typ:** UX
- **Severity:** P2
- **Fil(er):** `app/app/profile/loading.tsx`, `app/app/games/[gameId]/loading.tsx`, `app/demo/loading.tsx`
- **Beskrivning:** Only 3 `loading.tsx` files exist. Most route transitions show nothing while server components fetch data, leading to jarring user experience.
- **Förslag:** Add `loading.tsx` for routes with significant data fetching: planner, play, admin, browse/library. Use skeleton UI matching the page layout.

---

### [ARCH-011] Server actions scattered across 3+ locations with inconsistent auth

- **Typ:** ARCH
- **Severity:** P2
- **Fil(er):** `app/actions/` (23 files), `features/admin/` (4 files), inline in pages (4 files)
- **Beskrivning:** 39 server actions across 3 locations. Most reinvent auth checks inline instead of using `lib/api/auth-guard.ts`. Only 1 of 39 uses the imported `requireAuth()`.
- **Bevis:**
  - `app/actions/notifications-user.ts` — uses imported `requireAuth()` ✅
  - `app/actions/design.ts` — custom local `requireSystemAdmin()` ❌
  - Inline in `app/app/select-tenant/page.tsx` — embedded in page ❌
- **Förslag:** Keep server actions in `app/actions/` as primary location (acceptable Next.js convention). Migrate all to use `lib/api/auth-guard.ts` for auth checks. Move feature-specific actions to `features/{domain}/actions/` for clarity.

---

### [ARCH-012] `CartContext` misplaced in `lib/cart/` instead of billing domain

- **Typ:** ARCH
- **Severity:** P3
- **Fil(er):** `lib/cart/CartContext.tsx`
- **Beskrivning:** Cart/checkout context lives in `lib/cart/` when it should be in `features/billing/context/`. The billing domain doesn't own its own state.
- **Förslag:** Move to `features/billing/context/CartContext.tsx`.

---

### [ARCH-013] Deprecated achievement builder store in global components

- **Typ:** ARCH
- **Severity:** P3
- **Fil(er):** `components/achievements/store.ts`
- **Beskrivning:** Zustand store marked with `@deprecated` header. Only used in sandbox/prototype code.
- **Förslag:** Delete if unused, or move to `app/sandbox/` if still needed for prototyping.

---

### [ARCH-014] Rate limiting applied to only ~7 routes (of 261)

- **Typ:** SEC
- **Severity:** P2
- **Fil(er):** `lib/utils/rate-limiter.ts`, ~7 API routes
- **Beskrivning:** Rate limiter exists and works (`lib/utils/rate-limiter.ts` with api/auth/strict tiers) but is only applied to ~7 routes, all in the play/participant domain. Other mutation-heavy endpoints (billing, admin, game authoring) have no rate limiting.
- **Bevis:** Applied to: `gamification/events`, `participants/sessions/create`, `participants/sessions/join`, `play/sessions`, `play/session/[code]`, `play/heartbeat`, `play/board/[code]`
- **Förslag:** Apply rate limiting as standard middleware. Consider a wrapper function that all mutation routes use. At minimum: auth routes, billing routes, and admin mutation routes.
- **Kopplat till:** ARCH-002

---

### [ARCH-015] Tools feature directly imports admin library internals

- **Typ:** ARCH
- **Severity:** P3
- **Fil(er):** `features/tools/components/CoachDiagramBuilderV1.tsx:14-15`
- **Beskrivning:** The tools feature directly imports SVG rendering and court background functions from `features/admin/library/coach-diagrams/`. This creates tight coupling between two features.
- **Bevis:** `import { diagramViewBox, renderDiagramSvg } from '@/features/admin/library/coach-diagrams/svg'`
- **Förslag:** Extract shared diagram utilities to `lib/diagrams/` or a dedicated shared module. Low priority.

---

## Quick Wins

1. **Delete deprecated store** — `components/achievements/store.ts` (ARCH-013)
2. **Move `CartContext`** — `lib/cart/` → `features/billing/context/` (ARCH-012)
3. **Add error boundaries** — 4 new `error.tsx` files for admin, planner, play, participants (ARCH-009)
4. **Add loading states** — 4 new `loading.tsx` files for same routes (ARCH-010)

## Systemic Issues

These share a **common root cause: no standardized API layer**.

| Finding | Root Cause |
|---------|-----------|
| ARCH-002 (auth patterns) | No enforced API wrapper |
| ARCH-003 (error formats) | No enforced API wrapper |
| ARCH-004 (validation) | No enforced API wrapper |
| ARCH-014 (rate limiting) | No enforced API wrapper |

**Systemic fix:** Create a standard API route wrapper function that enforces:
1. Auth guard (from `lib/api/auth-guard.ts`)
2. Input validation (Zod)
3. Rate limiting
4. Error response format (from `lib/api/errors.ts`)
5. Request logging

Example concept:
```typescript
// lib/api/route-handler.ts
export function apiHandler(config: {
  auth: 'public' | 'user' | 'admin' | 'system_admin';
  rateLimit?: 'api' | 'auth' | 'strict';
  input?: ZodSchema;
  handler: (ctx: { user, body, params }) => Promise<Response>;
}) { ... }
```

Then each route becomes:
```typescript
export const POST = apiHandler({
  auth: 'user',
  rateLimit: 'api',
  input: createGameSchema,
  handler: async ({ user, body }) => { ... }
})
```

## Test Gaps

| Area | Gap |
|------|-----|
| API auth coverage | No test verifies auth guards on all 261 routes |
| Error response format | No test verifies consistent response shape |
| Component import paths | No test prevents components from drifting back to global |
| Rate limiting | No test verifies rate limiter is applied to high-risk routes |

## Documentation Gaps

| Area | Gap |
|------|-----|
| API patterns | No doc defining the standard API route pattern |
| Component organization | copilot-instructions.md states the rule but no enforcement guide |
| Type ownership | No doc mapping which domain owns which types |
| Server actions vs API routes | No doc explaining when to use which |

## i18n Status

Not directly in scope for this architecture audit. i18n-specific issues will be covered in the dedicated i18n audit (#18 in queue).

## Recommendations — Prioritized

| Priority | Action | Findings Addressed | Effort |
|----------|--------|--------------------|--------|
| 1 | **Create standardized API route wrapper** | ARCH-002, 003, 004, 014 | 2-3 days |
| 2 | **Migrate all routes to use wrapper + auth-guard** | ARCH-002, 006, 011 | 3-5 days |
| 3 | **Add error boundaries + loading states** | ARCH-009, 010 | 1 day |
| 4 | **Consolidate type definitions** (Participant, Game) | ARCH-007, 008 | 1-2 days |
| ~~5~~ | ~~**Fix direct Supabase calls in components**~~ | ~~ARCH-006~~ | ✅ Done (2026-03-13) |
| 6 | **Consolidate server action auth** | ARCH-011 | 1 day |
| 7 | **Move CartContext + delete deprecated store** | ARCH-012, 013 | 2 hours |
| 8 | **Extract shared diagram utils** | ARCH-015 | 2 hours |
| Post-launch | **Create DTO layer per domain** (Planner pattern) | ARCH-005 | 3-5 days |
| Post-launch | **Move domain components to features/** | ARCH-001 | 2-3 days |

**Severity adjustment notes (GPT review 2026-03-10):**
- ARCH-001 demoted P2→P3: Moving 90+ components pre-launch risks breakage. TypeScript imports and feature-scoping are functionally working — this is org/DX debt, not user-facing risk.
- ARCH-005 demoted P1→P2: TypeScript types + Supabase's generated types provide adequate safety. A full DTO layer is valuable but not launch-blocking when DB types are already propagated.

**Root cause priority:** The standardized API wrapper (recommendation #1) resolves or mitigates 4 P1 findings. This is the most critical implementation task — it fixes the systemic root cause before proceeding to further audits.
