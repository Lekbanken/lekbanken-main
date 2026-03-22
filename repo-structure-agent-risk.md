# Repo Structure Agent Risk Assessment

> Generated 2026-03-16. For AI coding agents working in this repo.

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Frozen agent-risk snapshot. Use `.github/copilot-instructions.md`, `REPO_GOVERNANCE.md`, and `docs/DOCUMENTATION_STANDARD.md` as the current source of working rules.

---

## Canonical Doc Entrypoint — Agent Start Path

When starting work on this repo, read documents in this exact order:

```
1. PROJECT_CONTEXT.md                              ← What is this product?
2. launch-readiness/launch-control.md              ← Current system state
3. Domain-specific canonical doc (see table below)  ← Your domain
```

### Domain document selection

| Domain | Canonical source | Then check |
|--------|-----------------|------------|
| Planner | Root `planner-architecture.md` → `planner-audit.md` → `planner-implementation-plan.md` | `docs/planner/PLANNER_DOMAIN.md` |
| Notifications | `docs/notifications/app-shell-notifications-architecture.md` → `*-audit.md` → `*-implementation-plan.md` | `docs/notifications/NOTIFICATIONS_DOMAIN.md` |
| Journey | `docs/journey/journey-activation-architecture.md` → `*-audit.md` → `*-implementation-plan.md` | `docs/journey/JOURNEY_DOMAIN.md` |
| Play | `launch-readiness/audits/play-*.md` | `docs/play/PLAY_DOMAIN.md` |
| Games | `docs/games/GAMES_DOMAIN.md` | `docs/builder/` |
| Admin | `docs/admin/archive/ADMIN_OVERVIEW_REPORT.md` | `docs/admin/` |
| Auth | `docs/AUTH_SYSTEM_ANALYSIS.md` | `docs/auth/` |
| Gamification | `docs/gamification/GAMIFICATION_DOMAIN.md` | `docs/gamification/` |
| Any security question | `launch-readiness/audits/` | — |
| System overview/launch status | `launch-readiness/launch-control.md` | — |

### Document surface priority

| Priority | Surface | Trust |
|----------|---------|-------|
| 1 (highest) | Root triplets for active domain | Current — maintained by AI agents |
| 2 | `launch-readiness/` audits | Current — most recent system state |
| 3 | `docs/*_DOMAIN.md` | Stable reference — may be 3+ months old |
| 4 (lowest) | Root completed `.md` files | **Stale** — historical, do not treat as active |
| SKIP | `docs/archive/` | **Never read** unless explicitly asked |

---

## Agent Rules — Quick Reference

### Where runtime code lives

| Surface | Layout | Route prefix | Shell component |
|---------|--------|-------------|-----------------|
| Marketing | `app/(marketing)/layout.tsx` | `/` (root pages) | `components/marketing/header` + `footer` |
| Auth UI | `app/(marketing)/auth/layout.tsx` | `/auth/login`, `/auth/signup`, `/auth/reset-password` | Marketing shell + TenantProvider |
| Auth Operations | `app/auth/` (no layout) | `/auth/callback`, `/auth/signout`, `/auth/demo`, `/auth/mfa-challenge`, `/auth/recovery` | None (Route Handlers + standalone pages) |
| App | `app/app/layout.tsx` | `/app/*` | `components/app/AppShell` (SideNav + BottomNav) |
| Admin | `app/admin/layout.tsx` | `/admin/*` | `components/admin/AdminShellV2` |
| Sandbox | `app/sandbox/layout.tsx` | `/sandbox/*` | **Dev only — not production canonical** |

### Where shared UI lives

| Need | Look in | NOT in |
|------|---------|--------|
| Buttons, Cards, Dialogs | `components/ui/` | — |
| App shell (SideNav, BottomNav, NotificationBell) | `components/app/` | — |
| Admin shell (Sidebar, Topbar) | `components/admin/` | — |
| Marketing (Header, Footer, Hero) | `components/marketing/` | ~~`app/(marketing)/components/`~~ (orphaned) |
| Navigation primitives (ProfileMenu, LanguageSwitcher, ThemeToggle) | `components/navigation/` | — |
| MFA components | `components/auth/` | — |
| Cookie consent | `components/cookie/` | ~~`components/legal/CookieConsentBanner.tsx`~~ (orphaned duplicate) |

### Where domain features live

| Need | Look in |
|------|---------|
| Play session orchestration | `features/play/` |
| Play join/lobby/primitives | `components/play/` ⚠️ |
| Game browsing | `features/browse/` |
| Planner | `features/planner/` |
| Admin pages | `features/admin/{sub-domain}/` |
| Gamification | `features/gamification/` |
| Participant management (host-side) | `features/participants/` |

### Where data/service layer lives

| Need | Look in |
|------|---------|
| Supabase client | `lib/supabase/` |
| Auth helpers | `lib/auth/` |
| Tenant context | `lib/context/TenantContext` |
| Play engine | `lib/play/` |
| Feature flags | `lib/features/` (NOT `features/`) |
| Any domain data | `lib/{domain}/` |

### How to verify if a file is canonical

1. **Search for imports**: `grep -r "from.*{file-path}"` — if 0 results, it may be orphaned
2. **Check for `_` prefix**: Files like `_legacy-page.tsx` are not routed by Next.js
3. **Check for `.legacy.` in name**: Indicates deprecated version
4. **Check `deprecated/`**: If referenced there, it's queued for removal
5. **Verify layout chain**: Follow `layout.tsx` → parent directory → until `app/layout.tsx`

### When you MUST verify imports before editing

- Any file in `components/play/` — parallel tree exists in `features/play/`
- Any file in `components/legal/` — may be orphaned duplicate
- Any file in `app/(marketing)/components/` — orphaned files exist
- Any admin `_legacy-page.tsx` — old version, check if `page.tsx` exists
- Any migration script in `scripts/` — none are canonical
- Any file named `GameCard` — exists in both `features/browse/components/` and `components/game/`

---

## Route Surface Map

Complete map of all public route surfaces and their auth requirements.

### Marketing (public, no auth)

| Route | Source | Purpose |
|-------|--------|--------|
| `/` | `app/(marketing)/page.tsx` | Landing page |
| `/pricing` | `app/(marketing)/pricing/` | Pricing page |
| `/enterprise` | `app/(marketing)/enterprise/` | Enterprise landing |
| `/checkout/*` | `app/(marketing)/checkout/` | Public checkout |
| `/gift/*` | `app/(marketing)/gift/` | Gift purchase flow |
| `/play/*` | `app/(marketing)/play/` | Public play entry points |

### Auth UI (public, marketing layout)

| Route | Source | Purpose |
|-------|--------|--------|
| `/auth/login` | `app/(marketing)/auth/login/page.tsx` | Login form |
| `/auth/signup` | `app/(marketing)/auth/signup/page.tsx` | Signup form |
| `/auth/reset-password` | `app/(marketing)/auth/reset-password/page.tsx` | Password reset form |

### Auth Operations (server-side, no layout)

| Route | Source | Type | Purpose |
|-------|--------|------|--------|
| `/auth/callback` | `app/auth/callback/route.ts` | GET Route Handler | OAuth code exchange |
| `/auth/signout` | `app/auth/signout/route.ts` | POST Route Handler | Server-side sign out |
| `/auth/demo` | `app/auth/demo/route.ts` | GET/POST Route Handler | Demo session creation |
| `/auth/mfa-challenge` | `app/auth/mfa-challenge/page.tsx` | Page | MFA challenge (standalone) |
| `/auth/recovery` | `app/auth/recovery/page.tsx` | Page | Password recovery (standalone) |

### App (authenticated, app shell)

| Route | Purpose |
|-------|--------|
| `/app` | Dashboard |
| `/app/browse` | Game browsing |
| `/app/planner` | Planner |
| `/app/play` | Play sessions |
| `/app/profile` | User profile |
| `/app/notifications` | Notifications |
| `/app/gamification` | Gamification features |
| `/app/journey` | Player journey |
| `/app/shop` | In-app shop |
| `/app/subscription` | Subscription management |
| `/app/preferences` | User preferences |
| `/app/leaderboard` | Leaderboard |
| `/app/challenges` | Challenges |
| `/app/events` | Events |
| `/app/learning` | Learning modules |
| `/app/invoices` | Invoices |
| `/app/games/*` | Game views |
| `/app/support` | Support |
| `/app/select-tenant` | Tenant selection |
| `/app/no-access` | Access denied fallback |

### Admin (role-gated: owner/admin/editor/system_admin)

| Route | Purpose |
|-------|--------|
| `/admin` | Admin dashboard |
| `/admin/games` | Game management |
| `/admin/participants` | Participant management |
| `/admin/sessions` | Session management |
| `/admin/organisations` | Organization management |
| `/admin/users` | User management |
| `/admin/achievements` | Achievement management |
| `/admin/gamification` | Gamification settings |
| `/admin/billing` | Billing |
| `/admin/licenses` | License management |
| `/admin/design` | Design system |
| `/admin/media` | Media management |
| `/admin/planner` | Admin planner |
| `/admin/products` | Product management |
| `/admin/settings` | Settings |
| `/admin/translations` | Translation management |
| `/admin/play` | Play management |
| `/admin/(system)/*` | System-admin-only routes |
| ... and 25+ more | See `app/admin/` directory |

### API (server-side Route Handlers)

34 API domains: `/api/accounts`, `/api/admin`, `/api/billing`, `/api/browse`, `/api/checkout`, `/api/games`, `/api/gamification`, `/api/gdpr`, `/api/health`, `/api/journey`, `/api/media`, `/api/participants`, `/api/play`, `/api/sessions`, `/api/shop`, `/api/tenants`, and more.

### Sandbox (dev-only, **NO auth gate**)

39 subdirectories under `/sandbox/*` with 166 files. **Not production canonical.**

### Other public routes

| Route | Source | Purpose |
|-------|--------|--------|
| `/board/*` | `app/board/` | Board/game display |
| `/demo` | `app/demo/` | Demo mode landing |
| `/demo-expired` | `app/demo-expired/` | Expired demo |
| `/legal/*` | `app/legal/` | Legal document acceptance |
| `/participants/*` | `app/participants/` | Anonymous participant entry |
| `/terms` | `app/terms/` | Terms of service |
| `/privacy` | `app/privacy/` | Privacy policy |
| `/playground` | `app/playground/` | Dev playground (should be sandbox) |

---

## Files/Directories Easily Mistaken for Canonical

### Orphaned files (verified zero imports)

| File | Why it looks canonical | Actual status |
|------|----------------------|---------------|
| `app/(marketing)/components/marketing-header.tsx` | Located next to marketing routes | **Orphaned** — canonical is `components/marketing/header.tsx` |
| `app/(marketing)/components/marketing-footer.tsx` | Located next to marketing routes | **Orphaned** — canonical is `components/marketing/footer.tsx` |
| `components/legal/CookieConsentBanner.tsx` | Name matches canonical import | **Orphaned** — canonical is `components/cookie/CookieConsentBanner.tsx` |
| `features/browse/components/GameCard.tsx` | Located in feature dir | **Possibly dead** — `BrowsePage.tsx` imports from `components/game/GameCard` |

### Files that look active but aren't

| File | Appearance | Reality |
|------|-----------|---------|
| 6× `app/admin/*/_legacy-page.tsx` | Looks like route pages | Next.js ignores `_`-prefixed files. All have active `page.tsx` replacements. |
| `features/play/components/ParticipantPlayView.legacy.tsx` | Listed in features/play | `.legacy.` suffix = deprecated |
| `features/journey/JourneyPage.tsx` | Looks like the journey page | Contains hardcoded Swedish strings, mock data — likely a placeholder |

---

## Duplicate / Near-Duplicate Names

| Name | Location 1 | Location 2 | Risk |
|------|-----------|-----------|------|
| `CookieConsentBanner` | `components/cookie/CookieConsentBanner.tsx` ✅ | `components/legal/CookieConsentBanner.tsx` ❌ | Agent edits wrong copy |
| `GameCard` | `components/game/GameCard/` ✅ | `features/browse/components/GameCard.tsx` ❓ | Agent patches dead code |
| marketing `Header` | `components/marketing/header.tsx` ✅ | `app/(marketing)/components/marketing-header.tsx` ❌ | Agent imports orphan |
| marketing `Footer` | `components/marketing/footer.tsx` ✅ | `app/(marketing)/components/marketing-footer.tsx` ❌ | Agent imports orphan |
| `ColorControls` | `features/play/components/shared/ColorControls.tsx` | `features/play/components/artifacts/ColorControls.tsx` | Same domain — lower risk |

---

## Name Collisions Across `features/` and `components/`

The `play` domain has **118+ components** split across two disconnected trees:

| Tree | Contents | Role |
|------|----------|------|
| `features/play/` | SessionCockpit, DirectorModePanel, StepViewer, facilitated/, artifacts/, shared/ | Session orchestration (host-side runtime) |
| `components/play/` | JoinSessionForm, SessionCard, Keypad, QRScanner, TilePuzzle, lobby/, reactions/ | Player-facing primitives |

**Zero imports between them.** An agent working on "play" must know which tree to edit. Rule of thumb:
- Editing session host experience → `features/play/`
- Editing join/lobby/participant UI → `components/play/`

---

## Documentation Surfaces — What to Trust

### ⚠️ THREE doc surfaces exist with overlapping topics

| Surface | Role | Currency | Trust level |
|---------|------|----------|-------------|
| Root `.md` triplets | Active AI work plans | Current for active domains | **HIGH** — but only for actively maintained triplets |
| Root completed `.md` | Historical implementation docs | Stale (Dec 2024 – Feb 2026) | **LOW** — completed work, not current state |
| `docs/*_DOMAIN.md` | Domain reference | Dec 2025 – Jan 2026 | **MEDIUM** — stable reference but may be outdated |
| `docs/archive/` | Archived docs | Various | **DO NOT READ** unless asked |
| `launch-readiness/` | Current system state, security audits | March 2026 | **HIGH** — most current |
| `launch-readiness/launch-control.md` | Launch program tracker | March 2026 | **HIGH** — master status |

### Which docs to read per domain

| Domain | Start here | Then check |
|--------|-----------|-----------|
| Planner | Root triplet (`planner-architecture/audit/implementation-plan.md`) | `docs/planner/PLANNER_DOMAIN.md` |
| Play | `launch-readiness/audits/play-*.md` | Root `PLAY_SYSTEM_DOCUMENTATION.md` |
| Notifications | `docs/notifications/app-shell-notifications-*.md` | `docs/notifications/NOTIFICATIONS_DOMAIN.md` |
| Journey | `docs/journey/journey-activation-*.md` | `docs/journey/JOURNEY_DOMAIN.md` |
| Games | `docs/games/GAMES_DOMAIN.md` | `docs/builder/` |
| Any security question | `launch-readiness/audits/` | — |
| System overview | `PROJECT_CONTEXT.md` → `launch-readiness/launch-control.md` | — |

### Docs that risk being misread

| Document | Risk | Correct interpretation |
|----------|------|----------------------|
| `ATLAS_EVOLUTION_IMPLEMENTATION.md` | Looks like active work | **COMPLETED** — this is historical |
| `GAMECARD_UNIFIED_IMPLEMENTATION.md` | Looks like active work | **COMPLETED** — historical |
| `LIBRARY_MASTER_IMPLEMENTATION.md` | Looks like active work | **COMPLETED** — historical |
| `MEDIA_DOMAIN_COMPLETE.md` | Looks like "complete" status | **COMPLETED** — the word "complete" is in the title |
| `PROJECT_COMPLETION_SUMMARY.md` | Looks like project is done | Summary of a completed phase, not the whole project |
| `notifications-architecture.md` vs `docs/notifications/app-shell-notifications-architecture.md` | Two arch docs for same domain | The `app-shell-notifications-*` set in `docs/notifications/` is **newer and canonical** |
| `docs/planner/PLANNER_TARGET_ARCHITECTURE.md` | Looks like the architecture doc | Root `planner-architecture.md` is canonical per copilot-instructions.md |

---

## Scripts — Do NOT Use These

### ❌ Legacy migration scripts (14 files, all dead)

None of these are wired into `package.json`. The canonical migration path is:
- **Local:** `supabase db reset`
- **Remote:** `supabase db push`

| Script group | Files |
|-------------|-------|
| psql-based | `migrate.ps1`, `run_migrations.py`, `run_migrations_psql.py`, `run-migrations.py`, `run-migrations-simple.js`, `run-psql-migrations.ps1` |
| API-based | `migrate-rest.py`, `run_migrations_api.py`, `run-migrations-api.ps1`, `run-migrations-node.js`, `execute-migrations.js` |
| Direct PG | `migrate.py` |
| Supabase CLI | `run_migrations_cli.py` |
| Read-only | `show-migrations.py` |

### ✅ Canonical scripts (referenced in `package.json`)

- `scripts/i18n-audit.mjs` — i18n coverage check
- `scripts/regenerate-types.ps1` — type generation (via `db:types`)
- `scripts/generate-inventory-v3.ps1` — inventory generation

### ⚠️ One-time scripts (probably stale)

Most `test-*.ts`, `verify-*.mjs`, `seed-*.ts`, `debug-*.ts`, and `diagnose_*.sql` scripts are one-time utilities from specific debugging sessions. Don't run them without reading them first.

---

## Sandbox vs Production

`app/sandbox/` contains **166 files across 41 subdirectories** that generate real production routes under `/sandbox/*`. There is no auth gate or build-time exclusion.

**Rule for agents:** Never edit sandbox files when asked to fix or build production features. Sandbox is for UI experimentation only.

Sandbox-related code also exists in:
- `components/sandbox/` — sandbox-only components
- `public/sandbox/` — sandbox assets
- `sandbox/` (root) — sandbox documentation/wiki

---

## Scripts Governance

### Canonical script paths

| Task | Canonical method | NOT these |
|------|-----------------|----------|
| Run migrations (local) | `supabase db reset` | Any `scripts/migrate*` or `scripts/run*migration*` |
| Run migrations (remote/staging) | `supabase db push` | Any `scripts/migrate*` or `scripts/run*migration*` |
| Generate DB types | `npm run db:types` / `npm run db:types:remote` | — |
| i18n audit | `npm run i18n:audit` → `scripts/i18n-audit.mjs` | — |
| Generate inventory | `npm run inventory` → `scripts/generate-inventory-v3.ps1` | `scripts/generate-inventory-v2.ps1` |
| Lint | `npm run lint` | — |
| Typecheck | `npm run typecheck` / `npx tsc --noEmit` | — |

### Governance rule (for copilot-instructions.md)

> **Never use `scripts/*` for database migrations.** All 14 migration scripts in `scripts/` are legacy — historical attempts at running migrations via different strategies (psql, REST API, Python, Node.js, PowerShell). None are referenced by `package.json`. The canonical migration path is **`supabase db reset`** (local) and **`supabase db push`** (remote). If a script is not referenced in `package.json` scripts section or in `README.md`, assume it is a one-time utility and verify before running.

### Script classification

| Category | Status | Files |
|----------|--------|-------|
| CI/build scripts | **Canonical** | Referenced in `package.json` |
| Migration scripts (14) | **Legacy** — never use | `migrate*`, `run*migration*`, `execute-migrations*`, `show-migrations*` |
| Seed scripts (7) | **One-time setup** | `seed-*.ts`, `seed-*.sql` |
| Test/debug scripts (10+) | **One-time diagnostic** | `test-*.ts`, `debug-*.ts`, `diagnose_*.sql` |
| Verify scripts (7) | **Mixed** | Some CI-used, some one-time |
| i18n key adders (6) | **One-time** | `add-design-keys*.cjs`, `add-game-builder-keys*.cjs` |

---

## Orphaned Files — Delete vs Retain

### Orphaned — DELETE (verified zero imports, safe to remove)

> ✅ **Phase 1 cleanup executed 2026-03-16.** Files below have been deleted (D15/D16 retained — actually imported by `page.tsx`).

| File | Canonical replacement | Status |
|------|----------------------|
| `app/(marketing)/components/marketing-header.tsx` | `components/marketing/header.tsx` |
| `app/(marketing)/components/marketing-footer.tsx` | `components/marketing/footer.tsx` |
| `components/legal/CookieConsentBanner.tsx` | `components/cookie/CookieConsentBanner.tsx` |
| 6× `app/admin/*/_legacy-page.tsx` | Active `page.tsx` in same directory |
| `features/play/components/ParticipantPlayView.legacy.tsx` | Verify zero imports, then delete |
| `GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak` | `GAMEDETAILS_IMPLEMENTATION_PLAN.md` |
| `GAMEDETAILS_SECTION_ANALYSIS.md.bak` | `GAMEDETAILS_SECTION_ANALYSIS.md` |

### Orphaned — INTENTIONALLY RETAINED (keep for now, may need later)

| File | Why retained |
|------|-------------|
| `features/browse/components/GameCard.tsx` | May be an alternate browse-specific card layout. Verify usage before deleting — `BrowsePage.tsx` imports from `@/components/game/GameCard` but this local version may serve a different purpose. |
| `features/journey/JourneyPage.tsx` | Placeholder/mock with hardcoded Swedish. May be design reference for future real implementation. Mark as `// TODO: replace with i18n version` rather than delete. |
| `deprecated/index.ts` | Tripwire utility — intentionally kept as quarantine infrastructure. |
| `deprecated/README.md` | Documents the quarantine pattern. |
| `deprecated/lib-db-removed.md` | Historical record of removed code. |

---

## Summary: Top 5 Agent Traps

1. **Editing `components/play/` when you should edit `features/play/`** (or vice versa) — 118+ components split across two trees with zero cross-imports
2. **Reading completed root `.md` as active work** — 9+ completed implementation docs still at root
3. **Using any `scripts/` migration script** — all 14 are legacy, none are canonical
4. **Importing from orphaned duplicates** — `components/legal/CookieConsentBanner`, `app/(marketing)/components/marketing-header`, `features/browse/components/GameCard`
5. **Reading old notification triplet** — `notifications-*.md` vs `docs/notifications/app-shell-notifications-*.md` — the latter is canonical
