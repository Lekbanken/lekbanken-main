# Play Structure Consolidation Plan

> Generated 2026-03-16. Prioritised action items for the play domain.  
> Prerequisite: Read `play-structure-audit.md` for context.

---

## Verdict

The play domain split is **deliberate layered architecture** that works correctly.  
No structural reorganisation is needed. Actions are limited to hygiene.

---

## Phase 1 — Orphan Cleanup (Safe, immediate)

### DELETE (3 files)

| ID | File | Reason |
|----|------|--------|
| PD-1 | `components/play/SessionHeader.tsx` | Superseded by `features/play/SessionHeader.tsx` — zero consumers |
| PD-2 | `components/play/SessionCard.tsx` | Zero consumers anywhere in codebase |
| PD-3 | `components/play/ParticipantStatusBadge.tsx` | Zero consumers anywhere in codebase |

### UPDATE barrel export

| ID | File | Action |
|----|------|--------|
| PD-4 | `components/play/index.ts` | Remove barrel exports for PD-1, PD-2, PD-3 |

### Pre-check

```bash
# Must return 0 matches for each deleted component
git grep -l "SessionHeader" -- ':!components/play/SessionHeader.tsx' ':!components/play/index.ts'
git grep -l "SessionCard" -- ':!components/play/SessionCard.tsx' ':!components/play/index.ts'
git grep -l "ParticipantStatusBadge" -- ':!components/play/ParticipantStatusBadge.tsx' ':!components/play/index.ts'
```

### Post-check

```bash
npx tsc --noEmit
npx next lint
```

---

## Phase 2 — Documentation (No code changes)

| ID | Action |
|----|--------|
| PD-5 | Add `components/play/README.md` — explain this is the shared UI primitives layer |
| PD-6 | Add `features/play/README.md` — explain this is the domain orchestration layer |
| PD-7 | Update `REPO_GOVERNANCE.md` § Do-Not-Touch Zones — replace "features/play/ ↔ components/play/ — largest structural risk" with "Audited 2026-03-16. Layered architecture — see play-structure-audit.md" |
| PD-8 | Archive audit docs to `docs/play/` after GPT review |

---

## DO NOT DO

These actions were considered and explicitly rejected:

| Anti-action | Why rejected |
|-------------|-------------|
| Move `components/play/` into `features/play/` | components/play is correctly shared across marketing, admin, sandbox, and features/play. Moving would create circular deps or break consumers. |
| Create a single `play/` monolith | The 4-layer separation (UI → orchestration → API client → server utils) is clean and intentional. |
| Rename `components/play/` to `components/play-primitives/` | Would require updating 50+ import paths for cosmetic gain. Not worth the churn. |
| Split `features/play/` into sub-features | 134 files is large but internally coherent. Sub-features would create artificial boundaries. |

---

## Execution Checklist

- [ ] Pre-check grep (PD-1/2/3 truly zero consumers)
- [ ] Delete 3 orphaned files
- [ ] Update `components/play/index.ts` barrel
- [ ] `npx tsc --noEmit` — 0 errors
- [ ] `npx next lint` — 0 errors
- [ ] Add READMEs (PD-5/6)
- [ ] Update REPO_GOVERNANCE.md (PD-7)
- [ ] Git commit on `repo-structure-phase1` branch
- [ ] Present to GPT for review
