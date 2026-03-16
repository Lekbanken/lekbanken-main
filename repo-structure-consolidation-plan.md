# Repo Structure Consolidation Plan

> Generated 2026-03-16. Prioritized by impact-to-effort ratio. All actions verified against actual file structure.

---

## Principle: Minimum Safe Path

This plan avoids large rewrites. Each action is scoped to be:
- **Verifiable** — you can check it worked
- **Reversible** — git revert covers it
- **Non-breaking** — no import paths change unless verified unused

---

## Action Lists by Type

### DELETE NOW — Zero risk, verified dead code

| # | File/Directory | Reason |
|---|---------------|--------|
| D1 | `GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak` | Editor artifact, zero references |
| D2 | `GAMEDETAILS_SECTION_ANALYSIS.md.bak` | Editor artifact, zero references |
| D3 | `tsconfig.test.tsbuildinfo` | Build cache artifact |
| D4 | `tsconfig.tsbuildinfo` | Build cache artifact |
| D5 | `components/layout/` | Empty directory |
| D6 | `supabase/snippets/` | Empty directory |
| D7 | `app/(marketing)/components/marketing-header.tsx` | Orphaned — verified zero imports. Canonical: `components/marketing/header.tsx` |
| D8 | `app/(marketing)/components/marketing-footer.tsx` | Orphaned — verified zero imports. Canonical: `components/marketing/footer.tsx` |
| D9 | `app/(marketing)/components/` directory | Empty after D7+D8 |
| D10 | `components/legal/CookieConsentBanner.tsx` | Orphaned duplicate — verified zero imports. Canonical: `components/cookie/CookieConsentBanner.tsx` |
| D11 | `app/admin/gamification/levels/_legacy-page.tsx` | Dead code — `page.tsx` exists, Next.js ignores `_` prefix |
| D12 | `app/admin/leaderboard/_legacy-page.tsx` | Dead code — `page.tsx` exists |
| D13 | `app/admin/licenses/_legacy-page.tsx` | Dead code — `page.tsx` exists |
| D14 | `app/admin/marketplace/_legacy-page.tsx` | Dead code — `page.tsx` exists |
| ~~D15~~ | ~~`app/admin/media/_legacy-page.tsx`~~ | **RETAINED** — imported by `page.tsx` |
| ~~D16~~ | ~~`app/admin/purposes/_legacy-page.tsx`~~ | **RETAINED** — imported by `page.tsx` |
| D17 | `features/play/components/ParticipantPlayView.legacy.tsx` | `.legacy.` suffix — verify zero imports first |

**Pre-check for D10:** `grep -r "components/legal/CookieConsentBanner"` → must return 0.  
**Pre-check for D17:** `grep -r "ParticipantPlayView.legacy"` → must return 0.

### ARCHIVE NOW — Move to `docs/archive/`, zero risk

Completed implementation docs still at root that look like active work to agents:

| # | File | Destination |
|---|------|------------|
| A1 | `ATLAS_EVOLUTION_IMPLEMENTATION.md` | `docs/archive/` |
| A2 | `BROWSE_SCALING_IMPLEMENTATION_PLAN.md` | `docs/archive/` |
| A3 | `GAMECARD_UNIFIED_IMPLEMENTATION.md` | `docs/archive/` |
| A4 | `LIBRARY_MASTER_IMPLEMENTATION.md` | `docs/archive/` |
| A5 | `MEDIA_DOMAIN_COMPLETE.md` | `docs/archive/` |
| A6 | `PERSONAL_LICENSE_IMPLEMENTATION.md` | `docs/archive/` |
| A7 | `PROJECT_COMPLETION_SUMMARY.md` | `docs/archive/` |
| A8 | `Journey_v2_Architecture.md` | `docs/archive/` |
| A9 | `Journey_v2_Audit.md` | `docs/archive/` |
| A10 | `Journey_v2_CHANGELOG.md` | `docs/archive/` |
| A11 | `Journey_v2_FinalReview.md` | `docs/archive/` |
| A12 | `Journey_v2_ImplementationPlan.md` | `docs/archive/` |
| A13 | `notifications-architecture.md` | `docs/archive/` (superseded by `app-shell-notifications-*` triplet) |
| A14 | `notifications-e2e-audit.md` | `docs/archive/` |
| A15 | `notifications-implementation-plan.md` | `docs/archive/` |

Domain analysis docs — move to `docs/` by domain:

| # | File | Destination |
|---|------|------------|
| A16 | `PARTICIPANT_PLAY_AUDIT.md` | `docs/play/` |
| A17 | `PARTICIPANT_PLAY_UI_LAWS.md` | `docs/play/` |
| A18 | `PLAY_IMPLEMENTATION_GUIDE_P0.md` | `docs/play/` |
| A19 | `PLAY_MODE_UI_AUDIT.md` | `docs/play/` |
| A20 | `PLAY_SYSTEM_DOCUMENTATION.md` | `docs/play/` |
| A21 | `PLAY_UI_CONTRACT.md` | `docs/play/` |
| A22 | `GAME_INTEGRITY_REPORT.md` | `docs/games/` |
| A23 | `GAMEDETAILS_CONTEXT_ARCHITECTURE.md` | `docs/games/` |
| A24 | `GAMEDETAILS_CONTEXT_AUDIT.md` | `docs/games/` |
| A25 | `GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md` | `docs/games/` |
| A26 | `GAMEDETAILS_IMPLEMENTATION_PLAN.md` | `docs/games/` |
| A27 | `GAMEDETAILS_SECTION_ANALYSIS.md` | `docs/games/` |
| A28 | `GAMIFICATION_JOURNEY_AUDIT.md` | `docs/gamification/` |
| A29 | `API_ROUTE_AUDIT.md` | `docs/reports/` |
| A30 | `GOLDEN_PATH_QA_CHECKLIST.md` | `docs/reports/` |
| A31 | `TIMEOUT_DIAGNOSTIC_REPORT.md` | `docs/reports/` |
| A32 | `SYSTEM_STATUS_RISK_OVERVIEW.md` | `docs/reports/` |
| A33 | `ARTIFACT_COMPONENTS.md` | `docs/` |
| A34 | `ARTIFACT_MATRIX.md` | `docs/` |
| A35 | `ARTIFACT_UI_CONTRACT.md` | `docs/` |
| A36 | `SIGNALS_SPEC.md` | `docs/` |
| A37 | `summary.md` | `docs/archive/` |

### RELABEL / DOCUMENT ONLY — Add markers, don't move

| # | File/Area | Action |
|---|-----------|--------|
| R1 | `dump.txt`, `lint-output.txt`, `play-lint.txt`, `play-lint.json`, `test-output.txt`, `schema_dump.txt` | Add to `.gitignore` — keep locally, stop tracking |
| R2 | `scripts/db-inventory-output.txt` | Add to `.gitignore` |
| R3 | `2026-01-07/` directory | Add to `.gitignore` or move to `scripts/diagnostics/` |
| R4 | `i18n-audit.json`, `i18n-audit.md` | Keep at root if CI references them; add comment header if kept |
| R5 | `INVENTORY_DECISIONS.md`, `INVENTORY_PLAYBOOK.md`, `INVENTORY_RULES.md`, `INVENTORY_SCHEMA.json` | Keep at root — part of inventory tooling, referenced by scripts |
| R6 | `inventory.json`, `inventory.claude.json` | Keep at root — generated artifacts |
| R7 | `PROJECT_STATUS.md` | Keep at root — actively maintained project status |

---

## Detailed Actions

### Gitignore diagnostic dumps (from R1–R3)

Add to `.gitignore`:
```
dump.txt
lint-output.txt
play-lint.txt
play-lint.json
test-output.txt
schema_dump.txt
db-inventory-output.txt
2026-01-07/
```

These are local diagnostic outputs that pollute root and waste agent context.

---

## Near-Term Consolidation (1–2 sessions)

### 8. Execute archive/move operations (from A1–A37 above)

See the ARCHIVE NOW list above. This is the **biggest single win** for agent clarity — removes 37 stale/completed docs from root.

### 9. Clean up `scripts/` — migration scripts

Move all 14 legacy migration scripts to `scripts/legacy/`:
```
scripts/legacy/
  migrate.ps1
  migrate.py
  migrate-rest.py
  run_migrations.py
  run_migrations_api.py
  run_migrations_cli.py
  run_migrations_psql.py
  run-migrations.py
  run-migrations-api.ps1
  run-migrations-node.js
  run-migrations-simple.js
  run-psql-migrations.ps1
  execute-migrations.js
  show-migrations.py
```

Add `scripts/legacy/README.md`:
```markdown
# Legacy Scripts
These scripts are historical attempts at running migrations.
The canonical migration path is `supabase db reset` (local) / `supabase db push` (remote).
Do not use. Kept for reference only.
```

### 10. Clean up `scripts/` — one-time scripts

**Note:** Items 8–10 replace old items 8–13 from the original plan.

Move to `scripts/one-time/`:
```
add-design-keys*.cjs (6 files)
add-game-builder-keys*.cjs (6 files)
diagnose_*.sql (3 files)
debug-scheduled-jobs.sql
roles-dump.sql
```

### 13. Scripts structure rule

Establish clear directory structure:
```
scripts/
  sql/            ← canonical SQL utilities
  legacy/         ← unused scripts kept for reference
  one-time/       ← scripts run once during setup/migration
  *.ts|*.mjs      ← active/reusable scripts
```

---

## Medium-Term Governance Rules (ongoing)

### 11. Expand `copilot-instructions.md` with doc routing

Add guidance for AI agents to find the right documentation surface:

```markdown
## Documentation Routing

| Surface | Purpose | When to read |
|---------|---------|-------------|
| Root triplets (`*-architecture.md`, `*-audit.md`, `*-implementation-plan.md`) | Active AI work plans | Working on that specific domain |
| `PROJECT_CONTEXT.md` | Product understanding | Starting any work session |
| `launch-readiness/launch-control.md` | Current system state | Checking domain health or launch status |
| `docs/{DOMAIN}_DOMAIN.md` | Domain reference | Understanding a domain's design decisions |
| `docs/archive/` | Historical | DO NOT read unless explicitly asked |
```

### 12. Clarify `components/` vs `features/` boundary

Establish and document in `copilot-instructions.md`:

```markdown
## Code Organization

- `components/` — reusable UI components imported by multiple routes/features
- `features/` — domain-scoped modules (components + hooks + API) for a single domain
- `lib/` — data layer, services, utilities (no UI)
- `hooks/` — cross-domain React hooks

Rule: if a component is only used within one `features/{domain}/`, it belongs there.
If it's used across multiple domains, it goes in `components/`.
```

### 13. ~~Address `features/play/` vs `components/play/` split~~ ✅ **AUDITED** (2026-03-16)

Audit completed — this is a **deliberate 4-layer architecture**, not a broken split:
- `components/play/` = shared UI primitives (puzzle modules, immersion, session UI)
- `features/play/` = domain orchestration (play modes, director, sessions)
- `features/play-participant/` = API client (join/create session)
- `lib/play/` = server utilities (guards, commands)

Dependencies flow one direction: `features/play` → `components/play` (6 cross-imports). Zero reverse.

**Action taken:** 3 orphaned files identified for deletion. No structural reorganization needed.
See: `play-structure-audit.md`, `play-structure-canonical-map.md`, `play-structure-consolidation-plan.md`.

### 14. Sandbox protection

Either:
- (A) Add authentication middleware to `/sandbox/*` routes, or
- (B) Use Next.js route configuration to exclude sandbox from production builds, or
- (C) Add a `NEXT_PUBLIC_ENABLE_SANDBOX=true` environment variable check in `app/sandbox/layout.tsx`

Option C is the simplest and most reversible.

### 15. Root `.md` file policy

Establish rule: **Root may only contain:**
- `README.md`
- `PROJECT_CONTEXT.md`
- Active domain triplets (max 3 at a time)
- Repo structure/governance docs

Everything else lives in `docs/` (organized by domain) or `launch-readiness/`.

---

## Do Not Touch Yet — Consolidation Deferred

These areas are **known risk zones** but must NOT be restructured without a dedicated consolidation audit first. Premature moves here will break imports and lose context.

| Area | Why it's a risk | Why to wait |
|------|----------------|-------------|
| ~~`features/play/` vs `components/play/`~~ | ✅ **AUDITED 2026-03-16** — deliberate layered architecture | See `play-structure-audit.md`. No reorganization needed. |
| `lib/services/` | Catch-all with 30+ files — unclear domain ownership | Low urgency. Works fine, just messy. Decompose when a specific service needs refactoring. |
| `app/sandbox/` access policy | 166 files shipping as production routes without auth gate | Must decide between env-var gate, middleware, or build exclusion. Don't delete sandbox — just protect it. |
| ~~`components/play/` → `features/play/` merge~~ | ✅ **REJECTED** — components/play is correctly shared across marketing, admin, sandbox | Merging would break consumers. Trees stay separate. |

**Rule for agents:** If your task touches `lib/services/`, complete it within the existing structure. For play zones, follow `play-structure-agent-risk.md`.

---

## What to Leave Alone

| Area | Reason |
|------|--------|
| `app/(marketing)/auth` vs `app/auth` | Verified correct architecture — different responsibilities |
| Shell hierarchy (marketing/app/admin) | Verified clean separation |
| `components/navigation/` | Correctly shared across surfaces |
| `hooks/` directory | All 11 files are actively used, no duplication |
| `lib/` structure (mostly) | Well-organized by domain. `lib/services/` could decompose later but not urgent |
| `deprecated/` directory | Well-designed quarantine pattern — keep the tripwire utility |
| `types/` directory | Clean type definitions, no issues |
| `supabase/` directory | Canonical infra — migrations, functions, seeds |
| `messages/` directory | i18n locale files — clean |
| `tests/` directory | Well-organized by type (e2e, unit, integration, rls) |

---

## Priority Matrix

| # | Action | Type | Risk | Effort | Impact |
|---|--------|------|------|--------|--------|
| D1–D17 | Delete dead code/orphans | DELETE | None | 15 min | MEDIUM | ✅ KLAR (2026-03-16) |
| A1–A37 | Archive/move root .md files | ARCHIVE | None | 20 min | **HIGH** | ✅ KLAR (2026-03-16) |
| R1–R7 | Gitignore dumps, label kept files | RELABEL | None | 10 min | MEDIUM | ✅ KLAR (2026-03-16) |
| 8 | Execute archive operations | ARCHIVE | None | 15 min | **HIGH** | ✅ KLAR (2026-03-16) |
| 9 | Move legacy migration scripts | ARCHIVE | None | 10 min | MEDIUM | ✅ KLAR (2026-03-16) |
| 10 | Move one-time scripts | ARCHIVE | None | 10 min | LOW |
| 11 | Expand copilot-instructions.md | RELABEL | None | 15 min | **HIGH** | ✅ KLAR (2026-03-16) |
| 12 | Document components/features boundary | RELABEL | None | 10 min | **HIGH** | ✅ KLAR (2026-03-16) |
| 13 | Resolve play component split | — | MEDIUM | 1+ hr | **HIGH** |
| 14 | Sandbox protection | — | Low | 15 min | MEDIUM |
| 15 | Root .md file policy | RELABEL | None | 5 min | **HIGH** |
