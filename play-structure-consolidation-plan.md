# Play Structure Consolidation Plan

> Generated 2026-03-16. Prioritised action items for the play domain.  
> Prerequisite: Read `play-structure-audit.md` for context.

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-16

> Historical action-plan snapshot from the 2026-03-16 play structure audit. Use `play-structure-audit.md` and later play cluster docs as the current guidance.

---

## Verdict

The play domain split is **deliberate layered architecture** that works correctly.  
No structural reorganisation is needed. Actions are limited to hygiene.

---

## Phase 1 — Orphan Cleanup (Safe, immediate)

### DELETE (1 file)

| ID | File | Reason |
|----|------|--------|
| PD-1 | `components/play/SessionCard.tsx` | Zero consumers anywhere in codebase |

**Correction:** `SessionHeader.tsx` and `ParticipantStatusBadge.tsx` were initially classified as orphaned but are NOT:
- `SessionHeader.tsx` — imported via barrel by `app/app/play/sessions/[id]/client.tsx` and `features/play/components/HostSessionWithPlay.tsx`
- `ParticipantStatusBadge.tsx` — internal dependency of `ParticipantRow.tsx` (canonical component)

### UPDATE barrel export

| ID | File | Action |
|----|------|--------|
| PD-2 | `components/play/index.ts` | Remove barrel export for `SessionCard`, `SessionCardSkeleton` |

### Pre-check

```bash
# Must return 0 matches
git grep -l "SessionCard" -- ':!components/play/SessionCard.tsx' ':!components/play/index.ts'
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
| PD-3 | Add `components/play/README.md` — explain this is the shared UI primitives layer |
| PD-4 | Add `features/play/README.md` — explain this is the domain orchestration layer |
| PD-5 | Update `REPO_GOVERNANCE.md` § Do-Not-Touch Zones — ✅ DONE (2026-03-16) |
| PD-6 | Archive audit docs to `docs/play/` after GPT review |

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

- [x] Pre-check grep (PD-1 truly zero consumers) ✅
- [x] Delete 1 orphaned file ✅
- [x] Update `components/play/index.ts` barrel ✅
- [x] `npx tsc --noEmit` — 0 errors ✅
- [ ] `npx next lint` — 0 errors
- [ ] Add READMEs (PD-5/6)
- [ ] Update REPO_GOVERNANCE.md (PD-7)
- [ ] Git commit on `repo-structure-phase1` branch
- [ ] Present to GPT for review
