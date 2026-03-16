# Repo Structure Recommendations

**Generated:** 2026-03-16  
**Companion:** `repo-file-structure-full.md` (tree map), `repo-structure-findings-full.md` (analysis)

---

## Guiding Principles

1. **No big rewrites.** Structure rules + small moves > folder reorganization projects.
2. **Reduce agent confusion first.** The highest-value changes make it harder for AI agents to read wrong files or edit wrong copies.
3. **Delete before moving.** It's safer and cheaper to remove dead code than to reorganize live code.
4. **Document canonical locations.** When something can't be moved, label it clearly.

---

## Immediate Cleanup (zero runtime risk, do now)

### 1. Delete `.bak` files

```
GAMEDETAILS_IMPLEMENTATION_PLAN.md.bak
GAMEDETAILS_SECTION_ANALYSIS.md.bak
app/admin/tickets/page.tsx.bak
```

**Why:** Version control already preserves history. `.bak` files add noise and may be read by agents.

### 2. Delete empty directories

```
components/layout/           # Empty, zero purpose
supabase/snippets/           # Empty
```

### 3. Delete or `.gitignore` diagnostic dumps

These are temporary outputs that don't belong in source control:

```
dump.txt
schema_dump.txt
lint-output.txt
play-lint.txt
play-lint.json
test-output.txt
```

**Option A (preferred):** Delete files and add to `.gitignore`.  
**Option B:** Move to `.reports/` (gitignored directory).

### 4. Move or `.gitignore` the `2026-01-07/` directory

A date-named directory of CSV performance snapshots in root is noise. Either:
- Delete if no longer needed
- Move to `docs/reports/2026-01-07/` if archival is needed
- Add `2026-01-07/` to `.gitignore`

### 5. Resolve duplicate `CookieConsentBanner.tsx`

Two files with same name:
- `components/cookie/CookieConsentBanner.tsx`
- `components/legal/CookieConsentBanner.tsx`

**Action:** Verify which is imported, delete the unused one. If both are imported, consolidate to one location.

### 6. Delete `_legacy-page.tsx` files (6 total)

```
app/admin/gamification/levels/_legacy-page.tsx
app/admin/leaderboard/_legacy-page.tsx
app/admin/licenses/_legacy-page.tsx
app/admin/marketplace/_legacy-page.tsx
app/admin/media/_legacy-page.tsx
app/admin/purposes/_legacy-page.tsx
```

**Prerequisite:** Verify each has zero imports (Next.js ignores `_`-prefixed files, so they're already dead routes). Keep if actively referenced for migration guidance; otherwise delete.

### 7. Evaluate `ParticipantPlayView.legacy.tsx`

`features/play/components/ParticipantPlayView.legacy.tsx` — check if any import references it. If zero imports, delete.

---

## Near-Term Consolidation (low risk, plan within weeks)

### 8. Move root .md documents into `docs/`

The 53 root .md files should move into `docs/` under domain subdirectories. Suggested mapping:

| Root files | Target |
|-----------|--------|
| `planner-*.md` (3 files) | `docs/planner/` |
| `notifications-*.md` + `app-shell-notifications-*.md` (6 files) | `docs/notifications/` |
| `GAMEDETAILS_*.md` (5 files) | `docs/game-details/` |
| `Journey_v2_*.md` + `journey-activation-*.md` (8 files) | `docs/journey/` |
| `PLAY_*.md` + `PARTICIPANT_PLAY_*.md` (6 files) | Already have `docs/play/` |
| `GAMIFICATION_*.md` (1 file) | `docs/gamification/` |
| `BROWSE_*.md` + `GAMECARD_*.md` + `LIBRARY_*.md` (3 files) | `docs/browse/` or `docs/games/` |
| `ARTIFACT_*.md` + `ATLAS_*.md` + `SIGNALS_SPEC.md` (4 files) | `docs/platform/` |
| `API_ROUTE_AUDIT.md` | `docs/api/` |
| `GOLDEN_PATH_QA_CHECKLIST.md` | `docs/qa/` |
| `i18n-audit.md` | `docs/` (already has i18n docs) |
| `PERSONAL_LICENSE_IMPLEMENTATION.md` | `docs/billing/` or `docs/legal/` |
| `MEDIA_DOMAIN_COMPLETE.md` | `docs/` |
| `INVENTORY_*.md` (3 files) | `docs/inventory/` or `.inventory/` |
| `TIMEOUT_DIAGNOSTIC_REPORT.md` | `docs/reports/` |

**Keep in root:**
- `README.md`
- `PROJECT_CONTEXT.md` (project-wide context — referenced by copilot-instructions.md)
- `PROJECT_STATUS.md` (if actively maintained)
- `summary.md` (if actively used)
- `PROJECT_COMPLETION_SUMMARY.md` (if actively used)
- `SYSTEM_STATUS_RISK_OVERVIEW.md` (if actively maintained as high-level status)

**After move:** Update any references in `.github/copilot-instructions.md`.

### 9. Clarify `components/` vs `features/` boundary

Establish a documented convention:

| Directory | Should contain | Should NOT contain |
|-----------|---------------|-------------------|
| `components/ui/` | Design system primitives (button, dialog, etc.) | Domain logic |
| `components/app/` | App shell components (AppShell, SideNav, etc.) | Feature-specific UI |
| `components/admin/` | Admin shell components (AdminShellV2, etc.) | Feature-specific admin UI |
| `components/{domain}/` | **Shared presentational components** used by multiple features | Feature-specific logic, API calls, state management |
| `features/{domain}/` | **Feature modules** — pages, hooks, API calls, domain-specific components | Shell/layout components, design system |

**Current violations** (document now, fix opportunistically):
- `components/play/` has 47 files — many could move to `features/play/components/`
- `components/marketing/` has 15 files — could move to `features/marketing/` or stay if truly shared

### 10. Sandbox protection

**Option A (minimal):** Add a `README.md` or `_SANDBOX_ONLY.md` to `app/sandbox/` clearly marking it as non-production:
```
# ⚠️ SANDBOX — Not Production Code
This directory contains development-only test pages.
Do NOT use these as reference implementations.
Do NOT import from sandbox/* in production code.
```

**Option B (stronger):** Add middleware or environment check to `app/sandbox/layout.tsx` that blocks access in production.

**Option C (ideal, long-term):** Move sandbox functionality to Storybook or a separate dev app.

### 11. Consolidate `launch-readiness/` with `docs/`

`launch-readiness/` has 79 files covering audits and implementation plans. These overlap with `docs/` content. Options:

- **Merge into `docs/`**: Move `launch-readiness/audits/` → `docs/audits/` and `launch-readiness/implementation/` → `docs/implementation/`
- **Keep separate but cross-reference**: Add a `docs/LAUNCH_READINESS.md` that points to the directory
- **Archive**: If launch is complete, move to `docs/archive/launch-readiness/`

---

## Long-Term Structure Rules (establish as team conventions)

### 12. Root document policy

**Rule:** Only these files should live in root:
- Config files (package.json, tsconfig, eslint, etc.)
- `README.md`
- `PROJECT_CONTEXT.md`
- `proxy.ts` (dev infrastructure)

All other documentation goes in `docs/` under domain subdirectories. Add to `.github/copilot-instructions.md`:

```markdown
## Documentation Location Rules
- Config files → root
- Domain docs → `docs/{domain}/`
- Audit/architecture/plan triplets → `docs/{domain}/`
- Diagnostic outputs → `.gitignore` (never committed)
- Project-wide status → root (README, PROJECT_CONTEXT only)
```

### 13. Agent documentation sync rule — expand beyond Planner

Currently `.github/copilot-instructions.md` only covers Planner domain docs. Extend the pattern:

```markdown
## Documentation Sync Rule (All Domains)

When making architectural changes to any domain, update the corresponding 
documents in `docs/{domain}/`. If no docs exist for that domain, create them
only if the change is structural.

Priority domains for doc maintenance:
- Planner: `docs/planner/`
- Notifications: `docs/notifications/`
- Play: `docs/play/`
- Journey: `docs/journey/`
- Browse: `docs/browse/`
```

### 14. `features/` as the default for new domain code

New feature work should default to `features/{domain}/` with this structure:

```
features/{domain}/
├── components/        # Feature-specific UI
├── hooks/             # Feature-specific hooks  
├── api.ts             # Feature API helpers
├── types.ts           # Feature types
└── index.ts           # Public API (barrel export)
```

Code only goes in `components/` if it's truly shared UI (design system level or used by 3+ domains).

### 15. `lib/services/` decomposition (future)

Over time, break `lib/services/` (~30 files) into domain-aligned modules:

```
lib/services/gamification/     # gamification-*.server.ts
lib/services/games/            # games.server.ts, gameService.ts
lib/services/billing/          # billingService.ts
lib/services/sessions/         # sessionService.ts
...
```

This is cosmetic — only do it when touching these files for other reasons.

---

## Summary: Priority Ranking

| # | Action | Risk | Effort | Impact |
|---|--------|------|--------|--------|
| 1 | Delete .bak files | None | 1 min | Low noise |
| 2 | Delete empty dirs | None | 1 min | Low noise |
| 3 | Gitignore diagnostic dumps | None | 5 min | Medium (agent clarity) |
| 4 | Handle `2026-01-07/` | None | 2 min | Low noise |
| 5 | Resolve CookieConsentBanner dupe | Low | 10 min | Medium (agent safety) |
| 6 | Delete `_legacy-page.tsx` files | Low | 10 min | Medium (agent clarity) |
| 7 | Evaluate legacy.tsx files | Low | 5 min | Low |
| 8 | Move root .md → `docs/` | Low | 30 min | **HIGH (biggest agent clarity win)** |
| 9 | Document components/features boundary | None | 15 min | Medium (convention) |
| 10 | Sandbox protection | Low | 10 min | Medium (safety) |
| 11 | Consolidate launch-readiness | Low | 20 min | Medium |
| 12 | Root document policy | None | 5 min | **HIGH (prevents future sprawl)** |
| 13 | Expand doc sync rule | None | 10 min | High (prevents stale docs) |
| 14 | features/ convention | None | 5 min | Medium (prevents future confusion) |
| 15 | lib/services decomposition | Low | Ongoing | Low (cosmetic) |

**Recommended execution order:** 1–4 (immediate, < 10 min total) → 5–7 (same session, verify imports first) → 8 (biggest win, schedule dedicated time) → 9, 12–14 (conventions, add to copilot-instructions.md) → 10–11, 15 (opportunistic)
