# Repo Structure Findings — Full Analysis

**Generated:** 2026-03-16  
**Companion:** `repo-file-structure-full.md` (tree map), `repo-structure-recommendations.md` (action plan)

## Metadata

- Owner: -
- Status: frozen audit
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Frozen findings snapshot from the 2026-03-16 repo structure audit. Use later governance and cleanup docs for current operating guidance.

---

## A. Structural Risks

### A1. Root directory document sprawl — HIGH

**53 markdown files** live directly in root. These span 8+ domains (notifications, gamedetails, journey, planner, play, browse, artifacts, cross-cutting). Most follow the triplet pattern `*-architecture.md` / `*-audit.md` / `*-implementation-plan.md`, but they sit alongside config files, README, and diagnostic dumps.

**Impact:** AI agents treat root-level files as high-authority context. With 53 .md files competing for attention, agents frequently read the wrong document or assume a root-level file is the canonical source for a domain when it's actually an older audit or superseded plan.

### A2. Documentation exists in 4+ parallel locations — HIGH

Architecture/audit/plan documents live in at least four places:
1. **Root** — 53 .md files (notifications, planner, gamedetails, journey, play, etc.)
2. **`docs/`** — 289 .md files across 18 subdirectories 
3. **`launch-readiness/`** — 79 .md files (audits + implementation plans)
4. **`.github/copilot-instructions.md`** — Agent-facing instructions

For the same domain (e.g., "planner"), documents exist in:
- `planner-architecture.md` (root)
- `planner-audit.md` (root)
- `planner-implementation-plan.md` (root)
- `docs/PLANNER_DOMAIN.md`
- `docs/PLANNER_ANALYSIS_REPORT.md`
- `docs/PLANNER_IA_RULES.md`
- `docs/PLANNER_IMPROVEMENT_TODO.md`
- `docs/PLANNER_INVENTORY_GAP_ANALYSIS.md`
- `docs/PLANNER_REFACTOR_IMPLEMENTATION.md`
- `docs/PLANNER_TARGET_ARCHITECTURE.md`
- `docs/PLANNER_UI_UPGRADE_PLAN.md`
- `docs/ADMIN_PLANNER_MASTER_IMPLEMENTATION.md`
- `launch-readiness/audits/planner-launch-audit.md`
- `launch-readiness/audits/planner-regression-audit.md`

**14+ documents for one domain**, with no clear canonical pointer.

### A3. Sandbox routes embedded in production app — MEDIUM

`app/sandbox/` contains **166 files** — an enormous dev playground that ships as production routes. These are Next.js pages that will be served if accessed. Includes test components, design system demos, stripe test pages, auth demos, spatial editors, and more.

Additionally, `components/sandbox/AuthDebugPanel.tsx` exists as a sandbox component in the shared components directory.

### A4. `_legacy-page.tsx` pattern without cleanup timeline — MEDIUM

Six admin routes contain `_legacy-page.tsx` alongside the current `page.tsx`:
- `app/admin/gamification/levels/`
- `app/admin/leaderboard/`
- `app/admin/licenses/`
- `app/admin/marketplace/`
- `app/admin/media/`
- `app/admin/purposes/`

These are not imported or routed to (Next.js ignores `_`-prefixed files), but they create confusion for agents trying to understand the canonical implementation.

### A5. Feature code lives in both `features/` and `components/` — MEDIUM

The repo has a `features/` directory (493 files) for domain-specific feature modules, but domain-specific components also live in `components/` under domain names:
- `components/play/` (47+ files) alongside `features/play/`
- `components/journey/` (9 files) alongside `features/journey/`
- `components/billing/` (8 files) — no features/billing
- `components/achievements/` (14 files) — no features/achievements (but `features/gamification/` exists)
- `components/marketing/` (15 files) — no features/marketing
- `components/demo/` (4 files) — no features/demo

**The boundary between `components/{domain}/` and `features/{domain}/` is unclear.** Some domains use both, some use only one.

### A6. `lib/services/` is a catch-all — LOW-MEDIUM

`lib/services/` contains **30+ service files** spanning gamification, billing, content, games, achievements, moderation, sessions, social, support, webhooks, and more. This is a growing monolith of server-side business logic without clear domain boundaries.

### A7. Duplicate `CookieConsentBanner.tsx` — LOW

The same-named component exists in two locations:
- `components/cookie/CookieConsentBanner.tsx`
- `components/legal/CookieConsentBanner.tsx`

Both are importable. This creates ambiguity about which is canonical.

### A8. `app/admin/` route-local components — LOW

Several admin routes embed client components directly in their route directory:
- `app/admin/cosmetics/` — 3 client components (CosmeticEditorDrawer, CosmeticGrantDialog, CosmeticsAdminClient)
- `app/admin/demo/components/`
- `app/admin/cookies/components/`
- `app/admin/design/components/`

This is inconsistent with the pattern where admin feature code lives in `features/admin/`.

---

## B. Root-Specific Risks

### B1. Signal-to-noise ratio in root — CRITICAL

Root contains:
- 53 .md architecture/audit/plan documents
- 6 diagnostic/dump files (`dump.txt`, `lint-output.txt`, `schema_dump.txt`, `test-output.txt`, `play-lint.txt`, `play-lint.json`)
- 4 inventory/audit data files (`i18n-audit.json`, `inventory.json`, `inventory.claude.json`, `INVENTORY_SCHEMA.json`)
- 3 `.bak` backup files
- 1 date-named directory (`2026-01-07/`) with CSV snapshots
- Standard config files (package.json, tsconfig, etc.)

**An agent scanning root has to parse 80+ files** before finding what it needs. The actual code-relevant files (config, proxy.ts) are buried.

### B2. Inconsistent naming conventions in root docs

Some files use `SCREAMING_SNAKE_CASE.md` (e.g., `GAME_INTEGRITY_REPORT.md`), others use `kebab-case.md` (e.g., `planner-architecture.md`), and some use `PascalCase_v2.md` (e.g., `Journey_v2_Architecture.md`). This makes it harder to programmatically categorize or sort them.

### B3. `.bak` files in root and admin

Three `.bak` files exist:
- `GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak`
- `GAMEDETAILS_SECTION_ANALYSIS.md.bak`
- `app/admin/tickets/page.tsx.bak`

These serve no purpose in version-controlled repos — git history preserves old versions.

### B4. Diagnostic dumps committed to repo

Temporary diagnostic files are committed:
- `dump.txt`, `schema_dump.txt` — DB dumps
- `lint-output.txt`, `play-lint.txt`, `play-lint.json` — lint captures
- `test-output.txt` — test output
- `2026-01-07/` — a full directory of 14 CSV performance snapshots

These should be in `.gitignore` or moved to a `reports/` directory.

---

## C. Classification

### Canonical (core runtime — do not reorganize without strong reason)
| Area | Files | Notes |
|------|-------|-------|
| `app/app/` | ~150 | User-facing authenticated routes |
| `app/admin/` | ~300 | Admin panel routes |
| `app/api/` | ~292 | API route handlers |
| `app/(marketing)/` | ~30 | Public marketing pages |
| `app/auth/` | ~15 | Auth flow routes |
| `components/ui/` | 38 | Design system primitives |
| `components/app/` | 8 | App shell (AppShell, SideNav, BottomNav, NotificationBell, etc.) |
| `components/admin/` | 14 | Admin shell (AdminShellV2, AdminSidebarV2, etc.) |
| `hooks/` | 11 | Global React hooks |
| `lib/supabase/` | 8 | Supabase client factory |
| `lib/auth/` | 8 | Auth system |
| `lib/i18n/` | 9 | Internationalization |
| `lib/tenant/` | 4 | Tenant resolution |
| `features/play/` | ~60 | Play system feature module |
| `features/planner/` | ~40 | Planner feature module |
| `features/browse/` | 7 | Browse/discovery |
| `types/` | 30 | Shared TypeScript types |
| `messages/` | 3 | i18n translation files |
| `supabase/migrations/` | 12 | DB migrations |

### Shared (used by multiple domains)
| Area | Files | Notes |
|------|-------|-------|
| `lib/services/` | 30+ | Server service layer — shared but overgrown |
| `lib/play/` | 5 | Play runtime logic |
| `lib/design/` | 5 | Design system resolution |
| `lib/utils/` | 14 | General utilities |
| `lib/validation/` | 7 | Validation schemas |
| `components/game/` | 5 | Game display (GameCard, GameDetails) |
| `components/play/` | 47 | Play session components |
| `components/billing/` | 8 | Purchase/cart UI |

### Route-local (code that could/should be colocated with its route)
| Area | Notes |
|------|-------|
| `app/admin/cosmetics/*.tsx` | 3 client components in route dir |
| `app/admin/demo/components/` | Demo admin components |
| `app/admin/cookies/components/` | Cookie admin components |
| `app/admin/design/components/` | Design admin components |
| `app/app/components/app-topbar.tsx` | Topbar (canonical but in sub-dir of app/) |

### Sandbox-only (dev/test — not production)
| Area | Files | Notes |
|------|-------|-------|
| `app/sandbox/` | 166 | Dev playground routes — ships as production routes |
| `sandbox/` | 9 | Top-level sandbox directory (mostly empty) |
| `components/sandbox/` | 1 | AuthDebugPanel |
| `public/sandbox/` | 5 | Sandbox test assets |
| `app/playground/` | 1 | Playground page |

### Deprecated / Orphaned
| Area | Files | Notes |
|------|-------|-------|
| `deprecated/` | 3 | Explicitly deprecated (index.ts, lib-db-removed.md, README) |
| `components/achievements/` | 14 | Self-marked `DEPRECATED.md` — badge builder |
| `components/layout/` | 0 | Empty directory |
| `supabase/snippets/` | 0 | Empty directory |
| 6× `_legacy-page.tsx` | 6 | Unused legacy admin pages |
| 3× `.bak` files | 3 | Backup files |
| `features/play/components/ParticipantPlayView.legacy.tsx` | 1 | Legacy play view |

### Needs consolidation
| Area | Notes |
|------|-------|
| Root .md files (53) | Should move to `docs/` with domain subdirs |
| Root diagnostic files (6) | Should be .gitignored or in `reports/` |
| `docs/` + root + `launch-readiness/` | Three parallel doc locations |
| `components/cookie/` vs `components/legal/` | Duplicate CookieConsentBanner |
| `components/{domain}/` vs `features/{domain}/` | Unclear boundary |

---

## D. Agent-Risk Analysis

### D1. Files easily edited by mistake — HIGH

| File / Pattern | Risk |
|----------------|------|
| Root .md files (53) | Agent may update wrong doc thinking it's canonical for a domain |
| `components/cookie/CookieConsentBanner.tsx` vs `components/legal/CookieConsentBanner.tsx` | Agent may edit wrong copy |
| `app/admin/media/page.tsx` vs `app/admin/media/_legacy-page.tsx` | Agent may read legacy and use it as reference |
| Multiple planner docs (14+) | Agent may read outdated planner doc and implement based on old plan |

### D2. Names that recur in confusing ways — MEDIUM

| Name | Locations | Confusion risk |
|------|-----------|---------------|
| `CookieConsentBanner` | `components/cookie/`, `components/legal/` | Identical name, different paths |
| `page.tsx` + `_legacy-page.tsx` | 6 admin routes | Legacy version sits next to canonical |
| `page.tsx.bak` | `app/admin/tickets/` | Backup in route dir |
| `api.ts` | `features/play/api.ts`, `features/gamification/api.ts`, `features/planner/api.ts`, `features/journey/api.ts`, `features/tools/api.ts`, `features/play-participant/api.ts`, `lib/marketing/api.ts` | Same filename, different domains |
| `index.ts` | 40+ locations | Barrel exports — normal but adds noise |
| planner docs | 14+ files across root, docs/, launch-readiness/ | Agent doesn't know which is current |

### D3. Directories where canonical ownership is unclear — MEDIUM

| Directory | Issue |
|-----------|-------|
| `components/play/` vs `features/play/components/` | Both contain play-domain components. Which is canonical? |
| `components/game/` vs `features/browse/components/` | GameCard lives in components/game but browse uses its own components |
| `lib/services/` | Catch-all for 30+ services — no clear domain ownership |
| `components/marketing/` vs `app/(marketing)/components/` | Marketing components in two places |
| `app/app/components/` vs `components/app/` | The topbar lives in app/app/components/ but the shell lives in components/app/ |

### D4. Stale documentation risk — HIGH

With **53 root .md + 289 docs/ .md + 79 launch-readiness/ .md = 421 markdown documents**, the probability that any given doc is current is low. Agents will:
- Read an old audit and try to fix already-resolved issues
- Follow an implementation plan that was superseded
- Reference architecture decisions that changed

The `copilot-instructions.md` in `.github/` only covers Planner domain documentation sync. No equivalent rule exists for other domains.
