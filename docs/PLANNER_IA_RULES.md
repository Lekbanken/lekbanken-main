# Planner Information Architecture — Rules & Principles

**Created:** 2026-01-25  
**Version:** 1.0  
**Status:** ✅ Active

---

## 1. Route Structure

### Canonical Routes

| Route | Purpose | Component |
|-------|---------|-----------|
| `/app/planner` | Redirect to plans | → `/app/planner/plans` |
| `/app/planner/plans` | Plan library (list view) | `PlanLibraryPage` |
| `/app/planner/plan/[planId]` | Edit wizard (5 steps) | `PlanWizardPage` |
| `/app/planner/plan/[planId]?step=X` | Wizard at specific step | `PlanWizardPage` |
| `/app/planner/calendar` | Calendar view | `PlanCalendarPage` |
| `/app/planner/[planId]` | Share link handler | Permission-based redirect |

### URL State Encoding

```
/app/planner/plan/{planId}?step={grund|bygg|anteckningar|granska|kor}
```

- `planId` is a UUID
- `step` is optional, defaults to `grund`
- The URL is the **source of truth** for wizard state

---

## 2. Tab Navigation

Three tabs at the planner level:

| Tab | Route | Description |
|-----|-------|-------------|
| **Mina planer** | `/app/planner/plans` | Library view with filter/sort |
| **Planera** | `/app/planner/plan/[planId]` | Active when editing a plan |
| **Kalender** | `/app/planner/calendar` | Schedule/calendar view |

### Rules:
- "Planera" tab is disabled if no plan is selected
- "Planera" tab shows truncated plan name when active
- Tabs are rendered by `<PlannerTabs>` component

---

## 3. Wizard Steps

The plan editing wizard has **exactly 5 steps**:

| Step | ID | Purpose |
|------|----|---------|
| 1 | `grund` | Name, description, visibility |
| 2 | `bygg` | Add/reorder/delete blocks |
| 3 | `anteckningar` | Private & tenant notes |
| 4 | `granska` | Preview, versions, publish |
| 5 | `kor` | Start play session |

### Step Navigation Rules:
- URL query param `?step=X` determines current step
- Navigation updates URL, not local state
- Browser back/forward works correctly
- Deep links to specific steps are supported

---

## 4. Permission Model

### Share Link Behavior (`/app/planner/[planId]`)

| User Permission | Action |
|-----------------|--------|
| Can edit (owner/tenant admin) | Redirect → `/app/planner/plan/[planId]` |
| Can view (tenant member/public) | Show read-only `PlanOverview` |
| No access | Show 404 |

### Capability Derivation

Capabilities are derived server-side via `derivePlanCapabilities()` and returned with plan data via `_capabilities` field.

```typescript
interface PlanCapabilities {
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canPublish: boolean;
  canSetVisibilityPublic: boolean;
  canCreateTemplate: boolean;
  canStartRun: boolean;
}
```

---

## 5. State Management

### State Ownership

| State Type | Owner | Persistence |
|------------|-------|-------------|
| Selected plan | URL (`[planId]`) | ✅ URL |
| Wizard step | URL (`?step=...`) | ✅ URL |
| Plan data | API (per-page fetch) | ✅ Server |
| Library filters | URL query params | ✅ URL |
| Form dirty state | Component state | ❌ Transient |
| Dialog open state | Component state | ❌ Transient |

### Refresh Safety

All user-visible state is encoded in the URL. Refreshing the page restores:
- Which plan is being edited
- Which wizard step is active
- Library filter/sort preferences

---

## 6. Component Organization

### Directory Structure

```
features/planner/
├── api.ts                      # All API functions
├── hooks/
│   └── useActionFeedback.ts    # Action-level feedback
├── components/
│   ├── PlannerTabs.tsx         # Tab navigation
│   ├── PlanListPanel.tsx       # Library list
│   ├── CreatePlanDialog.tsx    # Create plan dialog
│   ├── BlockList.tsx           # Block management
│   └── ...                     # Other components
└── wizard/
    ├── index.ts                # Module exports
    ├── types.ts                # WizardStep type
    ├── PlanWizard.tsx          # Wizard container
    ├── WizardStepNav.tsx       # Step indicator
    ├── hooks/
    │   └── usePlanWizard.ts    # Step navigation
    └── steps/
        ├── StepGrund.tsx       # Step 1
        ├── StepByggPlan.tsx    # Step 2
        ├── StepAnteckningar.tsx # Step 3
        ├── StepGranska.tsx     # Step 4
        └── StepKor.tsx         # Step 5
```

---

## 7. Anti-Patterns to Avoid

### ❌ DON'T

- Don't store wizard step in React state (use URL)
- Don't mix library view with edit view in same component
- Don't derive capabilities client-side (use API response)
- Don't create multiple PlannerPage-style monolithic components
- Don't use global error state (use `useActionFeedback`)

### ✅ DO

- Use URL as source of truth for navigation state
- Separate concerns: library, wizard, calendar
- Get capabilities from API `_capabilities` field
- Keep step components focused (<250 LOC)
- Use `useActionFeedback` for per-action feedback

---

## 8. API Contract

### Required API Responses

All plan endpoints should return:

```typescript
{
  plan: PlannerPlan;
  _capabilities: PlanCapabilities; // Derived for current user
}
```

### Key API Functions

| Function | Purpose |
|----------|---------|
| `fetchPlan(id)` | Get plan with capabilities |
| `fetchPlans()` | Get user's plan list |
| `createPlan(data)` | Create new plan |
| `updatePlan(id, data)` | Update plan metadata |
| `updateVisibility(id, data)` | Change visibility |
| `addBlock(planId, data)` | Add block to plan |
| `updateBlock(planId, blockId, data)` | Update block |
| `deleteBlock(planId, blockId)` | Remove block |
| `reorderBlocks(planId, blockIds)` | Reorder blocks |
| `publishPlan(id)` | Publish plan version |

---

## 9. Testing Strategy

### E2E Test Scenarios

1. **Library Navigation**
   - View plan list
   - Filter by status
   - Search by name
   - Create new plan

2. **Wizard Flow**
   - Complete all 5 steps
   - Navigate between steps via URL
   - Refresh preserves step
   - Deep link to specific step

3. **Permission Handling**
   - Owner sees wizard
   - Viewer sees read-only
   - Non-member gets 404

4. **Share Links**
   - Editor redirects to wizard
   - Viewer sees overview
   - Public plan accessible

---

## 10. Migration Notes

### Deprecated Components

The following should be removed after migration:
- `features/planner/PlannerPage.tsx` (826-line monolith)

### Breaking Changes

- `/app/planner` now redirects to `/app/planner/plans`
- Plan editing URL changed from `/app/planner` to `/app/planner/plan/[planId]`
- Share links now permission-aware

---

*Last updated: 2026-01-25*
