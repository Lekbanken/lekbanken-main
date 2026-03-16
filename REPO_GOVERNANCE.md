# Repo Governance

> Canonical structural rules for the Lekbanken repository.  
> Read this before making structural changes. Updated 2026-03-16.

---

## 1. Repo Zones

| Directory | Purpose | Ownership |
|-----------|---------|-----------|
| `app/` | Next.js App Router — routes, layouts, API handlers | Route definitions only, no business logic |
| `components/` | Shared UI imported by multiple routes/features | No domain logic — pure presentation |
| `features/` | Domain-scoped modules (components + hooks + API) | Each subdirectory owned by one domain |
| `hooks/` | Cross-domain React hooks | Shared across features |
| `lib/` | Data layer, services, utilities | No UI — server/client logic only |
| `types/` | Shared TypeScript type definitions | Global types |
| `tests/` | Test suites (e2e, unit, integration, rls) | Mirrors source structure |
| `supabase/` | Migrations, edge functions, seeds, config | Database infrastructure |
| `messages/` | i18n locale files (sv, en, no) | UI strings only |
| `docs/` | Domain reference docs, organized by subdirectory | Stable reference — may be months old |
| `launch-readiness/` | Current system state audits | Most recent operational truth |
| `scripts/` | Build/CI utilities, diagnostics | Only `package.json`-referenced scripts are canonical |
| `sandbox/` (via `app/sandbox/`) | Dev playground | **Not production canonical. No auth gate.** |
| `deprecated/` | Quarantine zone with tripwire utility | Do not delete — intentional pattern |

---

## 2. Ownership Rules

### Where runtime routes live

| Surface | Directory | Layout | Auth |
|---------|-----------|--------|------|
| Marketing | `app/(marketing)/` | Marketing header/footer | None |
| Auth UI | `app/(marketing)/auth/` | Marketing shell | None |
| Auth Operations | `app/auth/` | No layout | Server-side handlers |
| App | `app/app/` | AppShell (SideNav + BottomNav) | Required |
| Admin | `app/admin/` | AdminShellV2 | Role-gated |
| API | `app/api/` | None | Mixed |
| Sandbox | `app/sandbox/` | None | **None (risk)** |

### Where shared UI lives

| UI type | Canonical location |
|---------|--------------------|
| Design system (buttons, cards, dialogs) | `components/ui/` |
| App shell (SideNav, BottomNav, NotificationBell) | `components/app/` |
| Admin shell (Sidebar, Topbar) | `components/admin/` |
| Marketing (Header, Footer, Hero) | `components/marketing/` |
| Navigation primitives (ProfileMenu, ThemeToggle) | `components/navigation/` |
| Auth components (MFA) | `components/auth/` |
| Cookie consent | `components/cookie/` |

### Where domain features live

| Domain | Location |
|--------|----------|
| Play sessions | `features/play/` |
| Game browsing | `features/browse/` |
| Planner | `features/planner/` |
| Admin sub-domains | `features/admin/{sub-domain}/` |
| Gamification | `features/gamification/` |
| Participants (host-side) | `features/participants/` |

### Where data/infra lives

| Need | Location |
|------|----------|
| Supabase client | `lib/supabase/` |
| Auth helpers | `lib/auth/` |
| Tenant context | `lib/context/TenantContext` |
| Play engine | `lib/play/` |
| Feature flags | `lib/features/` |
| Domain data access | `lib/{domain}/` |

### Component placement rule

If a component is only used within one `features/{domain}/` — it belongs there.  
If shared across domains — it goes in `components/`.

---

## 3. Documentation Entrypoint

### Agent start path

```
1. PROJECT_CONTEXT.md              ← What is this product?
2. launch-readiness/launch-control.md  ← Current system state
3. Domain canonical doc            ← Your specific domain
```

### Domain document lookup

| Domain | Start with |
|--------|-----------|
| Planner | `planner-architecture.md` → `planner-audit.md` → `planner-implementation-plan.md` |
| Notifications | `app-shell-notifications-architecture.md` → `*-audit.md` → `*-implementation-plan.md` |
| Journey | `journey-activation-architecture.md` → `*-audit.md` → `*-implementation-plan.md` |
| Play | `launch-readiness/audits/play-*.md` |
| Games | `docs/GAMES_DOMAIN.md` |
| Admin | `docs/ADMIN_OVERVIEW_REPORT.md` |
| Auth | `docs/AUTH_SYSTEM_ANALYSIS.md` |
| Gamification | `docs/GAMIFICATION_DOMAIN.md` |
| Security | `launch-readiness/audits/` |

### Document trust hierarchy

| Priority | Surface | Trust level |
|----------|---------|-------------|
| 1 | Root domain triplets | Current |
| 2 | `launch-readiness/` audits | Current |
| 3 | `docs/*_DOMAIN.md` | Stable but may be old |
| 4 | Other root `.md` | Stale — treat as historical |
| SKIP | `docs/archive/` | Never read unless asked |

---

## 4. Scripts Governance

| Task | Canonical method |
|------|-----------------|
| Migration (local) | `supabase db reset` |
| Migration (remote) | `supabase db push` |
| Generate DB types | `npm run db:types` |
| Lint | `npm run lint` |
| Typecheck | `npx tsc --noEmit` |

**Never use `scripts/*` for database migrations.** All migration scripts in `scripts/legacy/` are historical. None are in `package.json`.

**Before running any script**, verify it is referenced in `package.json` or `README.md`.

---

## 5. Do-Not-Touch Zones

These areas must NOT be restructured without a dedicated audit:

| Zone | Risk | Rule |
|------|------|------|
| `features/play/` ↔ `components/play/` | 118+ components in parallel trees | Work within existing structure. Do not move files between them. |
| `lib/services/` | Catch-all with 30+ files | Decompose only when a specific service needs refactoring. |
| `app/sandbox/` | No auth gate in production | Needs policy decision before changes. Do not delete. |

**If your task touches these areas — complete it within the existing structure.**

---

## 6. Safe Cleanup Rules

### Before deleting any file

1. `grep -r "from.*{file-path}"` — must return 0 import references
2. Check for `_` prefix (not routed by Next.js but may be imported)
3. Check for `.legacy.` suffix (deprecated but may still be imported)

### Action categories

| Type | Meaning | Pre-check |
|------|---------|-----------|
| DELETE | Remove file permanently | Verified zero imports |
| ARCHIVE | Move to `docs/archive/` or `docs/{domain}/` | Not referenced by code |
| RELABEL | Add to `.gitignore`, add comment headers | No file moves |

### Stop conditions for structural cleanup

Stop and re-audit if:
- Any deleted file is referenced by an import path
- `npx tsc --noEmit` fails after a change
- `npm run build` fails after a change
- Work starts touching a do-not-touch zone

---

## 7. Agent Rules

1. **Verify imports before deleting** — `grep` first, delete second
2. **Verify runtime wiring before structural claims** — follow `layout.tsx` chains
3. **Distinguish fact from inference** — mark unverified claims clearly
4. **Use canonical surfaces** — never import from orphaned or legacy files
5. **Follow doc entrypoint** — read governance docs before starting domain work
6. **Update docs after structural changes** — mark items ✅ KLAR with date

---

## 8. Root File Policy

Root may only contain:
- `README.md`, `PROJECT_CONTEXT.md`
- Active domain triplets (max 3 at a time)
- Repo governance docs (`REPO_GOVERNANCE.md`, `repo-structure-*.md`)
- Config files (`package.json`, `tsconfig.json`, `next.config.ts`, etc.)
- Inventory tooling (`INVENTORY_*.md`, `inventory.json`)

Everything else lives in `docs/` (by domain) or `launch-readiness/`.

---

## Related Documents

| Document | Purpose |
|----------|---------|
| `repo-structure-governance-audit.md` | Full structural analysis with findings |
| `repo-structure-canonical-map.md` | Every directory classified |
| `repo-structure-consolidation-plan.md` | Prioritized action plan with status |
| `repo-structure-agent-risk.md` | Agent traps, route map, orphaned file list |
| `repo-structure-phase1-execution-pack.md` | Phase 1 work card (completed 2026-03-16) |
