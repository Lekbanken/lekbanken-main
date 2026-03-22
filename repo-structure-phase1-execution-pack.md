# Phase 1 Execution Pack — Repo Structure Cleanup

## Metadata

> ✅ **EXECUTED 2026-03-16.** All steps completed. tsc/lint/build pass.
> Short operational work card. No analysis — only actions.  
> Source: `repo-structure-consolidation-plan.md` + `repo-structure-agent-risk.md`  
> Generated 2026-03-16.

---

## 1. Scope Now

### Step 1 — DELETE dead files (D1–D17)

```
REMOVE:
  GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak
  GAMEDETAILS_SECTION_ANALYSIS.md.bak
  tsconfig.test.tsbuildinfo              (if exists)
  tsconfig.tsbuildinfo                   (if exists)
  components/layout/                     (empty dir)
  supabase/snippets/                     (empty dir)
  app/(marketing)/components/marketing-header.tsx
  app/(marketing)/components/marketing-footer.tsx
  app/(marketing)/components/            (empty after above)
  components/legal/CookieConsentBanner.tsx
  app/admin/gamification/levels/_legacy-page.tsx
  app/admin/leaderboard/_legacy-page.tsx
  app/admin/licenses/_legacy-page.tsx
  app/admin/marketplace/_legacy-page.tsx
  app/admin/media/_legacy-page.tsx          # ~~D15~~ RETAINED — imported by page.tsx
  app/admin/purposes/_legacy-page.tsx       # ~~D16~~ RETAINED — imported by page.tsx
  features/play/components/ParticipantPlayView.legacy.tsx
```

**Pre-checks before deleting:**
```powershell
grep -r "components/legal/CookieConsentBanner" --include="*.ts" --include="*.tsx"  # must return 0
grep -r "ParticipantPlayView.legacy" --include="*.ts" --include="*.tsx"            # must return 0
```

### Step 2 — ARCHIVE root docs (A1–A37)

Move 37 root `.md` files to organized destinations:

```
TO docs/archive/:
  ATLAS_EVOLUTION_IMPLEMENTATION.md
  BROWSE_SCALING_IMPLEMENTATION_PLAN.md
  GAMECARD_UNIFIED_IMPLEMENTATION.md
  LIBRARY_MASTER_IMPLEMENTATION.md
  MEDIA_DOMAIN_COMPLETE.md
  PERSONAL_LICENSE_IMPLEMENTATION.md
  PROJECT_COMPLETION_SUMMARY.md
  Journey_v2_Architecture.md
  Journey_v2_Audit.md
  Journey_v2_CHANGELOG.md
  Journey_v2_FinalReview.md
  Journey_v2_ImplementationPlan.md
  notifications-architecture.md
  notifications-e2e-audit.md
  notifications-implementation-plan.md
  summary.md

TO docs/play/:
  PARTICIPANT_PLAY_AUDIT.md
  PARTICIPANT_PLAY_UI_LAWS.md
  PLAY_IMPLEMENTATION_GUIDE_P0.md
  PLAY_MODE_UI_AUDIT.md
  PLAY_SYSTEM_DOCUMENTATION.md
  PLAY_UI_CONTRACT.md

TO docs/games/:
  GAME_INTEGRITY_REPORT.md
  GAMEDETAILS_CONTEXT_ARCHITECTURE.md
  GAMEDETAILS_CONTEXT_AUDIT.md
  GAMEDETAILS_CONTEXT_IMPLEMENTATION_PLAN.md
  GAMEDETAILS_IMPLEMENTATION_PLAN.md
  GAMEDETAILS_SECTION_ANALYSIS.md

TO docs/gamification/:
  GAMIFICATION_JOURNEY_AUDIT.md

TO docs/reports/:
  API_ROUTE_AUDIT.md
  GOLDEN_PATH_QA_CHECKLIST.md
  TIMEOUT_DIAGNOSTIC_REPORT.md
  SYSTEM_STATUS_RISK_OVERVIEW.md

TO docs/:
  ARTIFACT_COMPONENTS.md
  ARTIFACT_MATRIX.md
  ARTIFACT_UI_CONTRACT.md
  play/signals/SIGNALS_SPEC.md
```

### Step 3 — RELABEL / gitignore (R1–R3)

Append to `.gitignore`:
```
# Diagnostic dumps (local only)
dump.txt
lint-output.txt
play-lint.txt
play-lint.json
test-output.txt
schema_dump.txt
scripts/db-inventory-output.txt
2026-01-07/
```

### Step 4 — Move legacy scripts to `scripts/legacy/`

```
TO scripts/legacy/:
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
```
# Legacy Scripts
Historical migration scripts. Do not use.
Canonical path: `supabase db reset` (local) / `supabase db push` (remote).
```

### Step 5 — Update `.github/copilot-instructions.md`

Add these three blocks after "General Conventions":

```markdown
## Documentation Routing

When starting work on any domain:
1. Read `PROJECT_CONTEXT.md` — understand the product
2. Read `launch-readiness/launch-control.md` — current system state
3. Read the domain's canonical docs (see `repo-structure-agent-risk.md` for lookup table)

Do not read `docs/archive/` unless explicitly asked.

## Scripts Rule

Never use `scripts/*` for database migrations. All migration scripts in `scripts/legacy/`
are historical — none are canonical. Use `supabase db reset` (local) / `supabase db push` (remote).

Before running any script, verify it is referenced in `package.json` or `README.md`.

## Code Organization

- `components/` — reusable UI imported across multiple routes/features
- `features/` — domain-scoped modules (components + hooks + API) for one domain
- `lib/` — data layer, services, utilities (no UI)
- `hooks/` — cross-domain React hooks

Rule: if a component is only used within one `features/{domain}/`, it belongs there.
If shared across domains, it goes in `components/`.

## Do Not Touch Zones

Do not reorganize these areas without a dedicated audit:
- `features/play/` ↔ `components/play/` — ✅ audited 2026-03-16, deliberate layered architecture (see `docs/play/play-structure-audit.md`)
- `lib/services/` — catch-all but functional, decompose only when needed
- `app/sandbox/` — needs access policy decision, not deletion
```

---

## 2. Out of Scope Now

| Area | Why not now |
|------|-----------|
| `features/play/` vs `components/play/` | 118+ components, zero cross-imports. Needs full import graph audit. Wrong moves break runtime. |
| `lib/services/` decomposition | Works fine. Only decompose when a specific service needs refactoring. |
| `app/sandbox/` access control | Needs architecture decision (env-var gate vs middleware vs build exclusion). |
| `components/play/` → `features/play/` merge | Must first verify no external consumers exist. |
| Any code changes | Phase 1 is structural cleanup only — no behavior changes. |

**Agent rule:** If your current task touches `features/play/`, `components/play/`, or `lib/services/` — work within the existing structure. Do not reorganize.

---

## 3. Required Doc Updates

After completing Steps 1–5, update:

| Document | What to update |
|----------|---------------|
| `.github/copilot-instructions.md` | Add blocks from Step 5 above |
| `repo-structure-consolidation-plan.md` | Mark D1–D17, A1–A37, R1–R3 as ✅ KLAR with date |
| `repo-structure-governance-audit.md` | Mark script sprawl risk as ✅ LÖST if Step 4 is done |
| `repo-structure-agent-risk.md` | Remove orphaned files from DELETE table (they no longer exist) |

---

## 4. Execution Order

```
0. GIT SNAPSHOT    — branch + snapshot commit (safety net)
1. Pre-checks      — run grep commands for D10 and D17
2. DELETE           — remove D1–D17 (dead files)
3. ARCHIVE          — move A1–A37 (root docs to docs/)
4. RELABEL          — update .gitignore (R1–R3)
5. SCRIPTS          — move legacy scripts to scripts/legacy/
6. COPILOT-INST     — update copilot-instructions.md
7. VERIFY           — npx tsc --noEmit && npm run lint && npm run build
8. DOC-UPDATE       — mark completed items in governance docs
9. COMMIT           — single commit: "chore: phase 1 repo structure cleanup"
```

### Step 0 — Git snapshot

```bash
git checkout -b repo-structure-phase1
git add -A
git commit -m "snapshot before repo structure phase 1"
```

This makes the entire operation revertible with a single `git reset`.

### Step 7 — Full verification

Phase 1 must produce **zero change in build output**:
```bash
npx tsc --noEmit    # type check
npm run lint        # lint check
npm run build       # full build
```
If any fail → stop condition triggered.

Each step is independently safe and git-revertible. Stop and commit after Step 2 if preferred.

---

## 5. Stop Conditions

**Stop and re-audit if any of these occur:**

1. **grep returns imports** for D10 or D17 → the file is NOT orphaned, needs investigation
2. **Any deleted file is referenced by an import path** → file is NOT orphan. Example: `import CookieConsentBanner from '@/components/legal/...'` means the canonical replacement wasn't wired up. Stop and fix the import first.
3. **`npx tsc --noEmit` fails** after any step → something imported a moved/deleted file
4. **`npm run lint` or `npm run build` fails** → Phase 1 changed runtime behavior, which it must not
5. **A root .md file is referenced by code** (not just other docs) → it's not purely a doc, verify before moving
6. **Any file in DELETE or ARCHIVE list doesn't exist** → list is stale, re-verify against current state
7. **Work starts touching `features/play/` or `components/play/` imports** → stop, this is Phase 2 territory
8. **More than 5 unexpected import errors appear** → structural assumption was wrong, roll back and audit

**General rule:** If in doubt, commit what's done so far and stop. Phase 1 only does safe, verified actions.
