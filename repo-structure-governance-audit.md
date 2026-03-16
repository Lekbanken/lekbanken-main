# Repo Structure Governance Audit

> Generated 2026-03-16. All findings verified against actual file system and import analysis.

---

## 1. Auth Zones — `app/(marketing)/auth` vs `app/auth`

### Verdict: **Legitimate separation. NOT duplication.**

| Zone | Routes generated | Responsibility | Layout |
|------|-----------------|----------------|--------|
| `app/(marketing)/auth/` | `/auth/login`, `/auth/signup`, `/auth/reset-password` | **User-facing auth UI** (forms with marketing layout wrapper) | Marketing shell → `TenantProvider` → minimal `AuthLayoutContent` |
| `app/auth/` | `/auth/callback` (GET), `/auth/demo` (GET/POST), `/auth/mfa-challenge`, `/auth/recovery`, `/auth/signout` (POST) | **Server-side auth operations** (OAuth callback code exchange, MFA challenge page, password recovery, sign-out handler, demo endpoint) | None — these are Route Handlers + standalone pages |

**Evidence:**
- `app/(marketing)/auth/layout.tsx` wraps children in `TenantProvider` + `AuthLayoutContent` (simple bg wrapper)
- `app/auth/callback/route.ts` is a Route Handler that exchanges OAuth codes for sessions
- `app/auth/signout/route.ts` is a Route Handler that clears cookies server-side
- `app/auth/mfa-challenge/page.tsx` + `app/auth/recovery/page.tsx` are standalone pages (no marketing layout)

**Conclusion:** This is correct architecture. The `(marketing)` route group provides the visual login/signup pages under the marketing header/footer. The `app/auth/` directory provides server-side API endpoints and standalone challenge pages that don't need marketing chrome.

---

## 2. Shell & Navigation Layers

### Three distinct shell systems exist — verified as correct:

| Shell | Used by | Component tree |
|-------|---------|----------------|
| **Marketing shell** | `app/(marketing)/` | `MarketingLayoutContent` → `components/marketing/header` (dynamic) + `components/marketing/footer` |
| **App shell** | `app/app/` | `layout.tsx` → `layout-client.tsx` → `components/app/AppShell` (SideNav + BottomNav + app-topbar) |
| **Admin shell** | `app/admin/` | `layout.tsx` → `components/admin/AdminShellV2` (AdminSidebarV2 + AdminTopbarV2) |

**Shared navigation primitives** in `components/navigation/`:
- `LanguageSwitcher.tsx` — used by marketing header + auth pages
- `ProfileMenu.tsx` — used by marketing header + admin topbar
- `ThemeToggle.tsx` — used by marketing header + admin topbar + auth pages

**Verdict:** Clean separation. Each shell serves a distinct user context. Shared primitives (`ProfileMenu`, `LanguageSwitcher`, `ThemeToggle`) are correctly factored into `components/navigation/`.

### ⚠️ Orphaned components found:
- `app/(marketing)/components/marketing-header.tsx` — **never imported** by any file. Defines `MarketingHeader`, but the canonical header is `components/marketing/header.tsx` (`Header`), dynamically imported by `marketing-layout-content.tsx`.
- `app/(marketing)/components/marketing-footer.tsx` — **never imported** by any file. Canonical is `components/marketing/footer.tsx`.
- `components/layout/` — **empty directory**.

---

## 3. Components vs Features vs Lib Boundary

### Current state: Significant overlap

**Domain names appearing in multiple layers:**

| Domain | `components/` | `features/` | `lib/` | Overlap type |
|--------|--------------|-------------|--------|-------------|
| play | 38 components | 80+ components + 18 hooks + API | play engine, session-command, realtime | **CRITICAL — parallel disconnected trees** |
| admin | Shell + 14 shared primitives | 15 sub-domains, pages, server functions | admin utils | Correct layering (shared UI + domain pages) |
| journey | JourneyScene, JourneyStats, ParticleField | Dashboard page, API client | journey lib | Cross-layer dependency but logical |
| profile | ProfileNavigation | avatarPresets (single file) | profile service, types, cache | Thin features/ entry — should be in lib/ |
| gamification | — (via journey/) | Full domain (20 components, 6 hooks) | — | Clean |
| achievements | Badge builder UI | — | achievements lib | Clean |

### ⚠️ The `features/play/` vs `components/play/` Problem

This is the single biggest structural concern:

- **`features/play/`** (~80 components): Session-level orchestration (SessionCockpit, DirectorModePanel, StepViewer, facilitated/, artifacts/)
- **`components/play/`** (~38 components): Lower-level primitives (JoinSessionForm, SessionCard, Keypad, QRScanner, TilePuzzle, lobby/)
- **Zero imports between them.** They are parallel, disconnected component trees.
- Runtime risk: LOW (both work). Agent risk: **HIGH** (agent may edit wrong tree).

### ⚠️ Duplicate `GameCard`

- `features/browse/components/GameCard.tsx` — local copy
- `components/game/GameCard/` — shared canonical version
- `features/browse/BrowsePage.tsx` imports from `@/components/game/GameCard` — the shared one
- The local `features/browse/components/GameCard.tsx` may be dead code or an alternate version

### ⚠️ Trivially thin `features/` entries

| Module | Content | Recommendation |
|--------|---------|----------------|
| `features/profile/` | Single file: `avatarPresets.ts` | Move to `lib/profile/` |
| `features/play-participant/` | `api.ts` + `tokenStorage.ts` | Could be sub-module of `features/play/` |
| `features/conversation-cards/` | 2 dialog components + CSV util | Could be sub-module of `features/tools/` or `features/admin/` |

---

## 4. Script Sprawl

### Migration scripts: 14 implementations of the same operation

| Strategy | Count | Scripts |
|----------|-------|---------|
| Via `psql` CLI | 6 | `migrate.ps1`, `run_migrations.py`, `run_migrations_psql.py`, `run-migrations.py`, `run-migrations-simple.js`, `run-psql-migrations.ps1` |
| Via Supabase REST API | 5 | `migrate-rest.py`, `run_migrations_api.py`, `run-migrations-api.ps1`, `run-migrations-node.js`, `execute-migrations.js` |
| Via `psycopg2` direct | 1 | `migrate.py` |
| Via Supabase CLI | 1 | `run_migrations_cli.py` |
| Read-only dump | 1 | `show-migrations.py` |

**None are canonical.** `package.json` has zero references to any of them. The real migration path is `supabase db reset` (local) / `supabase db push` (remote) via Supabase CLI.

### Other duplication:

| Category | Count | Notes |
|----------|-------|-------|
| i18n key adder scripts | 6 | One-time per-locale scripts |
| Import test/debug scripts | 10+ | Ad-hoc debugging, likely stale |
| Verify scripts | 7 | Mix of CI-used and one-time |
| SQL diagnostic scripts | 7 | One-time, committed to repo |
| Seed scripts | 7 | Setup scripts, may still be useful |
| Inventory generators | 2 | v2 superseded by v3 |

---

## 5. Documentation Surface Problem — THREE parallel doc systems

### Quantitative overview

| Surface | Files | Purpose | Currency |
|---------|-------|---------|----------|
| **Root .md** | 56 | Active AI triplets + completed plans + reports | Mixed (2024–2026) |
| **docs/** | 289 | Domain reference, specs, runbooks, 37 archived | Mostly Dec 2025 – Jan 2026 |
| **launch-readiness/** | 79 | Security/quality audit trail, launch gates | Current (Mar 2026) |

### Topic duplication across surfaces

| Domain | Root files | docs/ files | launch-readiness/ | Risk |
|--------|-----------|-------------|-------------------|------|
| Planner | 3 (triplet) | 10 | 3 | **HIGH** — 16 planner docs across 3 surfaces |
| Play | 5 | 3 | 5 | **HIGH** — 13 play docs across 3 surfaces |
| Notifications | 5 (two triplets!) | 1 | 1 | **HIGH** — two separate triplets in root |
| Journey | 5 | 2 | 3 | MEDIUM |
| GameDetails | 5 + 2 .bak | 3 | 0 | MEDIUM |
| Games | 2 | 11 | 3 | MEDIUM |

### Governance gaps

- `copilot-instructions.md` only directs agents to Planner triplet + `PROJECT_CONTEXT.md`
- **No routing guidance** for any other domain — agents must guess which surface to trust
- `docs/` declares itself SSoT but most content is Dec 2025 vintage
- `launch-readiness/` is most current but not referenced in copilot-instructions.md
- **No archival has happened** — a cleanup audit identified 30 root + 130 docs/ files as archivable

---

## 6. Sandbox, Deprecated, Public

### `app/sandbox/` — 166 files shipping as production routes

Contains 41 subdirectories covering design system tests, component playgrounds, and dev tools. These **generate production routes** under `/sandbox/*`. No access control.

### `deprecated/` — Thin quarantine layer

Contains only `index.ts` (tripwire warning function), `README.md`, and `lib-db-removed.md`. Well-designed but currently empty of actual deprecated code (code was deleted in this conversation session).

### `public/` — Static assets

Mostly correct. Contains achievement SVGs, avatars, coach-diagram assets, SFX sounds, and standard Next.js images. No significant issues.

---

## 7. Summary of Structural Risks

### Scripts Governance Rule

> ✅ **LÖST (2026-03-16)** — 14 legacy migration scripts moved to `scripts/legacy/` with README. Rule added to `copilot-instructions.md`.

> **Canonical migration path:** `supabase db reset` (local) / `supabase db push` (remote).  
> **Never use** any of the 14 scripts in `scripts/` for migrations — all are legacy, none are in `package.json`.  
> **Before running any script**, verify it is referenced in `package.json` or `README.md`.  
> **This rule should be added to `copilot-instructions.md`** to prevent AI agents from using stale scripts.

### Runtime risks (could affect production)

| Risk | Severity | Location |
|------|----------|----------|
| Sandbox ships as production routes | MEDIUM | `app/sandbox/` — 166 files, no auth gate |
| Two notification triplets may cause out-of-sync changes | LOW | Root: `notifications-*` + `app-shell-notifications-*` |

### Agent risks (AI will make mistakes)

| Risk | Severity | Location |
|------|----------|----------|
| `features/play/` vs `components/play/` parallel trees | **HIGH** | 118+ components, zero cross-imports |
| 16 planner docs across 3 surfaces | **HIGH** | Root + docs/ + LR — agent reads wrong one |
| No doc routing in copilot-instructions.md for non-Planner | **HIGH** | `.github/copilot-instructions.md` |
| Completed plans still at root look like active work | **HIGH** | ~9 completed implementation docs in root |
| 14 migration scripts all look canonical | **MEDIUM** | `scripts/` — none are actually canonical |
| Orphaned marketing header/footer in route dir | LOW | `app/(marketing)/components/` |
| Duplicate GameCard | LOW | `features/browse/components/` vs `components/game/` |

### Docs/governance risks

| Risk | Severity | Location |
|------|----------|----------|
| Three documentation surfaces with no unified index | **HIGH** | Root + docs/ + launch-readiness/ |
| docs/ declares SSoT but is mostly 3+ months stale | MEDIUM | `docs/README.md` claim vs reality |
| No archival has been executed despite completed cleanup audit | MEDIUM | `launch-readiness/documentation-cleanup-audit.md` |
