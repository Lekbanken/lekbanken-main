# Planner IA Refactor — Implementation Plan

**Created:** 2026-01-25  
**Status:** ✅ All Phases Complete  
**Owner:** Refactor Sprint

---

## Implementation Progress Tracker

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase A** | Plan the refactor | ✅ Complete |
| **Phase B** | Implement new IA | ✅ Complete |
| **Cleanup** | Remove dead code | ✅ Complete |
| **Docs** | Update documentation | ✅ Complete |

### Cleanup Phase (Completed)

| Task | File(s) | Status |
|------|---------|--------|
| Delete `features/planner/PlannerPage.tsx` | Deleted | ✅ |
| Add i18n keys for wizard step text | `messages/sv.json`, `messages/en.json` | ✅ |
| Add E2E tests for new routes | `tests/e2e/planner.spec.ts` | ✅ |
| Update navigation links across app | N/A - handled by route redirects | ✅ |

### Phase B Details

| Task | File(s) | Status |
|------|---------|--------|
| Create wizard types | `features/planner/wizard/types.ts` | ✅ |
| Create usePlanWizard hook | `features/planner/wizard/hooks/usePlanWizard.ts` | ✅ |
| Create WizardStepNav | `features/planner/wizard/WizardStepNav.tsx` | ✅ |
| Create PlannerTabs | `features/planner/components/PlannerTabs.tsx` | ✅ |
| Create PlanWizard container | `features/planner/wizard/PlanWizard.tsx` | ✅ |
| Create StepGrund (1) | `features/planner/wizard/steps/StepGrund.tsx` | ✅ |
| Create StepByggPlan (2) | `features/planner/wizard/steps/StepByggPlan.tsx` | ✅ |
| Create StepAnteckningar (3) | `features/planner/wizard/steps/StepAnteckningar.tsx` | ✅ |
| Create StepGranska (4) | `features/planner/wizard/steps/StepGranska.tsx` | ✅ |
| Create StepKor (5) | `features/planner/wizard/steps/StepKor.tsx` | ✅ |
| Create wizard index | `features/planner/wizard/index.ts` | ✅ |
| Create CreatePlanDialog | `features/planner/components/CreatePlanDialog.tsx` | ✅ |
| Create library route | `app/app/planner/plans/page.tsx` | ✅ |
| Create wizard route | `app/app/planner/plan/[planId]/page.tsx` | ✅ |
| Create calendar route | `app/app/planner/calendar/page.tsx` | ✅ |
| Update share link handler | `app/app/planner/[planId]/page.tsx` | ✅ |
| Update root redirect | `app/app/planner/page.tsx` | ✅ |
| Update fetchPlan to return capabilities | `features/planner/api.ts` | ✅ |

---

## Phase A — Implementation Plan

### Product Decisions (Locked)

| Decision | Choice |
|----------|--------|
| Share link behavior | Editor → Wizard, Non-editor → Read-only |
| Wizard steps | 5 steps: Grund, Bygg plan, Anteckningar, Granska & Publicera, Kör |
| Tab structure | Mina planer, Planera, Kalender |

---

## 1. Proposed Route Structure

### Current Structure (Problematic)

```
/app/planner                    → PlannerPage (mixed: list + edit + execute)
/app/planner/[planId]           → PlanOverview (read-only, orphaned)
```

### New Structure (Proposed)

```
/app/planner                    → Redirect to /app/planner/plans
│
├── /app/planner/plans          → "Mina planer" tab (library/listing)
│   └── page.tsx                → PlanLibraryPage
│
├── /app/planner/plan/[planId]  → "Planera" tab (wizard, permission-guarded)
│   └── page.tsx                → PlanWizardPage
│   └── ?step=grund|bygg|anteckningar|granska|kor
│
├── /app/planner/calendar       → "Kalender" tab (future)
│   └── page.tsx                → PlanCalendarPage (placeholder initially)
│
└── /app/planner/[planId]       → Read-only view (non-editors)
    └── page.tsx                → PlanReadOnlyPage (uses PlanOverview)
```

### URL Parameters

| Route | URL State | Purpose |
|-------|-----------|---------|
| `/app/planner/plans` | `?status=...&search=...&sort=...` | Filter/search persistence |
| `/app/planner/plan/[planId]` | `?step=grund\|bygg\|anteckningar\|granska\|kor` | Wizard step persistence |
| `/app/planner/[planId]` | None | Read-only, no state needed |

### Tab Navigation Component

```tsx
// Tabs render at /app/planner/* level
<PlannerTabs>
  <Tab href="/app/planner/plans" active={pathname === '/app/planner/plans'}>
    Mina planer
  </Tab>
  <Tab href="/app/planner/plan/..." active={pathname.startsWith('/app/planner/plan/')}>
    Planera
  </Tab>
  <Tab href="/app/planner/calendar" active={pathname === '/app/planner/calendar'}>
    Kalender
  </Tab>
</PlannerTabs>
```

### Deep Link Behavior

| Link | Behavior |
|------|----------|
| `/app/planner` | Redirect → `/app/planner/plans` |
| `/app/planner/plans` | Show library |
| `/app/planner/plan/abc123` | Wizard step 1 (grund) |
| `/app/planner/plan/abc123?step=bygg` | Wizard step 2 |
| `/app/planner/abc123` | Read-only view (or redirect to wizard if editor) |
| `/app/planner/calendar` | Calendar view |

---

## 2. State Ownership Approach

### Principle: Single Source of Truth

| State Type | Owner | Persistence |
|------------|-------|-------------|
| **Selected plan ID** | URL (`[planId]`) | ✅ Refresh-safe |
| **Wizard step** | URL (`?step=...`) | ✅ Refresh-safe |
| **Plan data** | Server (fetched per page) | ✅ Server-authoritative |
| **Library filters** | URL params | ✅ Refresh-safe |
| **Form dirty state** | Local component state | ❌ Transient |
| **Dialog open state** | Local component state | ❌ Transient |
| **Pending mutations** | `useActionFeedback` hook | ❌ Transient |

### Wizard State Machine

```typescript
type WizardStep = 'grund' | 'bygg' | 'anteckningar' | 'granska' | 'kor';

const WIZARD_STEPS: WizardStep[] = [
  'grund',
  'bygg', 
  'anteckningar',
  'granska',
  'kor'
];

// URL is source of truth
// ?step=bygg → step index 1
// Missing ?step → default to 'grund'
```

### State Flow Diagram

```
URL: /app/planner/plan/[planId]?step=bygg
         │
         ▼
   ┌─────────────────┐
   │  PlanWizardPage │ ← Fetches plan data from API
   └────────┬────────┘
            │
            ▼
   ┌─────────────────┐
   │  WizardProvider │ ← Provides: planId, step, navigation helpers
   └────────┬────────┘
            │
   ┌────────┴────────┐
   │                 │
   ▼                 ▼
┌──────────┐   ┌──────────┐
│ StepNav  │   │ StepView │ ← Renders step-specific content
└──────────┘   └──────────┘
```

### How Step Changes Work

```tsx
// Navigation updates URL, not local state
function goToStep(step: WizardStep) {
  router.push(`/app/planner/plan/${planId}?step=${step}`);
}

// URL change triggers re-render with new step
// Plan data persists (cached or refetched)
```

### Form State Strategy

Each wizard step manages its own form state locally. On blur/submit:
1. Call API to persist
2. Optimistic update if needed
3. Navigate to next step (updates URL)

```tsx
// Step 1: Grund
const [name, setName] = useState(plan.name);
const [description, setDescription] = useState(plan.description);

// On save → API call → navigate to next step
async function handleSaveAndContinue() {
  await updatePlan(planId, { name, description });
  router.push(`/app/planner/plan/${planId}?step=bygg`);
}
```

---

## 3. Reuse vs Replace Map

### Components to REUSE (with minor adjustments)

| Component | Current Location | Adjustments |
|-----------|------------------|-------------|
| `PlanListPanel` | `features/planner/components/` | Extract as standalone, use `usePlanFilters` hook |
| `PlanListItem` | `features/planner/components/` | Reuse as-is |
| `BlockList` | `features/planner/components/` | Reuse as-is |
| `BlockRow` | `features/planner/components/` | Reuse as-is |
| `BlockDetailDrawer` | `features/planner/components/` | Reuse as-is |
| `AddGameButton` | `features/planner/components/` | Reuse as-is |
| `GamePicker` | `features/planner/components/` | Reuse as-is |
| `PreviewDialog` | `features/planner/components/` | Move to Step 4 |
| `VersionsDialog` | `features/planner/components/` | Move to Step 4 |
| `ShareDialog` | `features/planner/components/` | Reuse as-is |
| `StatusBadge` | `features/planner/components/` | Reuse as-is |
| `PlanOverview` | `features/planner/components/` | Use for read-only route |
| `ActionBar` | `features/planner/components/` | Move to Step 5 |

### Components to CREATE

| Component | Purpose | Location |
|-----------|---------|----------|
| `PlannerTabs` | Tab navigation | `features/planner/components/` |
| `PlanWizard` | Wizard container + step nav | `features/planner/wizard/` |
| `WizardStepNav` | Step indicator + navigation | `features/planner/wizard/` |
| `StepGrund` | Step 1: title, description, visibility | `features/planner/wizard/steps/` |
| `StepByggPlan` | Step 2: blocks, games, reorder | `features/planner/wizard/steps/` |
| `StepAnteckningar` | Step 3: notes | `features/planner/wizard/steps/` |
| `StepGranska` | Step 4: preview, versions, publish | `features/planner/wizard/steps/` |
| `StepKor` | Step 5: start run | `features/planner/wizard/steps/` |
| `PlanLibraryPage` | Plans listing page | `app/app/planner/plans/` |
| `PlanWizardPage` | Wizard page wrapper | `app/app/planner/plan/[planId]/` |
| `PlanReadOnlyPage` | Read-only with permission check | `app/app/planner/[planId]/` |
| `PlanCalendarPage` | Calendar placeholder | `app/app/planner/calendar/` |
| `usePlanWizard` | Wizard state hook | `features/planner/wizard/hooks/` |

### Components to BREAK UP

| Current | Target |
|---------|--------|
| `PlannerPage.tsx` (826 lines) | Split into wizard steps + library page |
| `PlanHeaderBar.tsx` (349 lines) | Extract actions into step-specific components |

### Hooks to ACTIVATE (currently unused)

| Hook | Location | New Usage |
|------|----------|-----------|
| `usePlanFilters` | `lib/planner/hooks/` | Use in `PlanLibraryPage` |
| `useBulkActions` | `lib/planner/hooks/` | Optional: bulk operations in library |

---

## 4. Deletion List

### Files to DELETE after migration

| File | Reason |
|------|--------|
| `features/planner/PlannerPage.tsx` | Replaced by modular wizard + library pages |
| `features/planner/types.ts` | Unnecessary re-export indirection |
| `app/sandbox/app/planner/page.tsx` | Sandbox duplicate (if exists) |

### Code to REMOVE within files

| File | What to Remove | Reason |
|------|----------------|--------|
| `features/planner/api.ts` | `fetchLegacyPlayView` comment reference | Already deprecated |
| `lib/planner/index.ts` | Unused exports after cleanup | Dead code |

### Files to KEEP but MODIFY

| File | Modification |
|------|--------------|
| `app/app/planner/page.tsx` | Change to redirect to `/app/planner/plans` |
| `app/app/planner/[planId]/page.tsx` | Add permission check, keep read-only for non-editors |

---

## 5. Share Link Migration

### Current Behavior

```
/app/planner/[planId] → PlanOverview (read-only for everyone)
```

### New Behavior (B Locked)

```
/app/planner/[planId]
    │
    ├── User has edit permission? 
    │   └── YES → Redirect to /app/planner/plan/[planId]?step=bygg (wizard)
    │
    └── NO → Show PlanOverview (read-only)
```

### Implementation

```tsx
// app/app/planner/[planId]/page.tsx

export default async function PlanSharePage({ params }) {
  const { planId } = await params;
  const plan = await fetchPlan(planId);
  
  if (!plan) {
    notFound();
  }
  
  // Check capabilities
  const capabilities = await getPlanCapabilities(planId);
  
  if (capabilities.canUpdate) {
    // Editor → redirect to wizard
    redirect(`/app/planner/plan/${planId}?step=bygg`);
  }
  
  // Non-editor → read-only view
  return <PlanReadOnlyView plan={plan} />;
}
```

### Backward Compatibility

| Old Link | New Behavior |
|----------|--------------|
| `/app/planner` | Redirect → `/app/planner/plans` |
| `/app/planner/abc123` | Permission check → wizard or read-only |
| Bookmarked plan links | Continue to work via permission check |

### ShareDialog Update

```tsx
// ShareDialog generates:
// - Editors see: /app/planner/plan/{id} (direct wizard link)
// - Share URL for others: /app/planner/{id} (permission-checked)
```

---

## 6. Migration Steps (Phase B)

### Step-by-step implementation order:

| # | Task | Dependencies |
|---|------|--------------|
| 1 | Create new route structure (empty pages) | None |
| 2 | Create `PlannerTabs` component | Routes exist |
| 3 | Create `PlanLibraryPage` (extract from PlannerPage) | Tabs |
| 4 | Create wizard shell (`PlanWizard`, `WizardStepNav`) | Routes |
| 5 | Create `StepGrund` (Step 1) | Wizard shell |
| 6 | Create `StepByggPlan` (Step 2) | Wizard shell |
| 7 | Create `StepAnteckningar` (Step 3) | Wizard shell |
| 8 | Create `StepGranska` (Step 4) | Wizard shell |
| 9 | Create `StepKor` (Step 5) | Wizard shell |
| 10 | Update `/app/planner/[planId]` with permission check | Steps 1-9 |
| 11 | Create `PlanCalendarPage` placeholder | Routes |
| 12 | Update root redirect | All pages done |
| 13 | Delete old `PlannerPage.tsx` | Migration complete |
| 14 | Update docs | All done |

---

## 7. Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking existing bookmarks | Permission-checked redirect preserves access |
| Losing edit state on refresh | URL encodes planId + step |
| Breaking Play flow | Play continues to use `/api/play/` routes unchanged |
| Breaking Admin planner | Admin routes untouched (`/admin/planner/*`) |
| RLS bypass | All data fetched via existing API routes with RLS |

---

## 8. Acceptance Criteria Checklist

| Criteria | Status |
|----------|--------|
| Clear separation: listing vs wizard vs calendar | ⬜ |
| Refresh preserves selected plan + wizard step | ⬜ |
| Share links: editor→wizard, non-editor→read-only | ⬜ |
| Publish/play flows unbroken | ⬜ |
| Mobile layout coherent | ⬜ |
| No file > 300 lines (unless justified) | ⬜ |

---

## Phase B Implementation Log

*(To be filled during implementation)*

| Date | Task | Status | Notes |
|------|------|--------|-------|
| | | | |

---

## Appendix: File Structure After Refactor

```
app/app/planner/
├── page.tsx                    # Redirect to /plans
├── layout.tsx                  # Shared layout with tabs (optional)
├── plans/
│   └── page.tsx                # PlanLibraryPage
├── plan/
│   └── [planId]/
│       └── page.tsx            # PlanWizardPage
├── calendar/
│   └── page.tsx                # PlanCalendarPage
└── [planId]/
    └── page.tsx                # PlanReadOnlyPage (permission check)

features/planner/
├── api.ts                      # API functions (keep)
├── components/                 # Reusable components
│   ├── PlanListPanel.tsx
│   ├── PlanListItem.tsx
│   ├── PlanOverview.tsx
│   ├── PlannerTabs.tsx         # NEW
│   ├── BlockList.tsx
│   ├── BlockRow.tsx
│   ├── BlockDetailDrawer.tsx
│   ├── AddGameButton.tsx
│   ├── GamePicker.tsx
│   ├── PreviewDialog.tsx
│   ├── VersionsDialog.tsx
│   ├── ShareDialog.tsx
│   ├── StatusBadge.tsx
│   └── ActionBar.tsx
├── wizard/                     # NEW: Wizard module
│   ├── PlanWizard.tsx
│   ├── WizardStepNav.tsx
│   ├── hooks/
│   │   └── usePlanWizard.ts
│   └── steps/
│       ├── StepGrund.tsx
│       ├── StepByggPlan.tsx
│       ├── StepAnteckningar.tsx
│       ├── StepGranska.tsx
│       └── StepKor.tsx
└── hooks/
    └── useActionFeedback.ts
```

---

**⏸️ AWAITING APPROVAL FOR PHASE B**

Please review this implementation plan and confirm to proceed with Phase B.
