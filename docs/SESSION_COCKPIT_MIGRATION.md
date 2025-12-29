# Session Cockpit Migration Guide

## Epic 7: Cleanup & Consolidation

This document describes the migration path from the legacy host shell architecture to the unified Session Cockpit.

---

## Current State

### Component Hierarchy (Before)

```
HostSessionWithPlay (features/play/components/HostSessionWithPlay.tsx)
├── SessionCockpit (NEW - not yet wired up)
├── HostPlayMode (legacy - 407 lines)
│   ├── FacilitatorDashboard (835 lines)
│   │   ├── NavigationControls
│   │   ├── TimerControl
│   │   └── ArtifactManager
│   ├── RoleAssignerContainer (DUPLICATE)
│   ├── Artifacts tab
│   ├── Decisions tab
│   ├── Outcomes tab
│   └── PropConfirmationManager
└── ActiveSessionShell
    └── ChatDrawer (per-view state)
```

### Issues

1. **SessionCockpit created but not used** - Exported but never imported
2. **RoleAssignerContainer duplicated** - In lobby AND in HostPlayMode
3. **ChatDrawer per-view** - Each view manages its own chat state
4. **HostPlayMode large and complex** - Could be replaced by SessionCockpit

---

## Target State

### Component Hierarchy (After)

```
HostSessionWithPlay
├── SessionCockpit (unified shell)
│   ├── DirectorModeDrawer (overlay for focused control)
│   │   ├── TriggerLivePanel
│   │   ├── SignalQuickPanel
│   │   ├── TimeBankLivePanel
│   │   └── LeaderScriptViewer
│   ├── StoryViewModal (participant perspective)
│   ├── ChatDrawer (session-scoped, lifted up)
│   ├── EventFeedPanel (observability)
│   └── Lobby/Play tabs with:
│       ├── Navigation (steps/phases)
│       ├── Participants (single RoleAssignerContainer)
│       ├── Artifacts
│       └── Preflight
```

---

## Migration Tasks

### Task 7.1: Wire Up SessionCockpit

**Status:** Ready to implement

**Steps:**
1. In `HostSessionWithPlay.tsx`, replace HostPlayMode with SessionCockpit
2. Pass required props to SessionCockpit
3. Test that all functionality works
4. Feature flag: `USE_SESSION_COCKPIT=true`

**Code change:**
```tsx
// Before (in HostSessionWithPlay)
return isSessionActive ? (
  <ActiveSessionShell>
    <HostPlayMode {...props} />
  </ActiveSessionShell>
) : (
  <LobbyView {...props} />
);

// After
return (
  <SessionCockpit
    sessionId={sessionId}
    gameId={gameId}
    isActive={isSessionActive}
    {...props}
  />
);
```

### Task 7.2: Remove RoleAssigner from HostPlayMode

**Status:** Ready after 7.1

**Steps:**
1. Remove "Roller" tab from HostPlayMode's manage zone
2. Keep only the lobby RoleAssignerContainer
3. SessionCockpit handles role assignment in its "Deltagare" tab

**Affected file:** `features/play/components/HostPlayMode.tsx`

### Task 7.3: Lift ChatDrawer to SessionCockpit

**Status:** Ready after 7.1

**Steps:**
1. Move ChatDrawer state to SessionCockpit level
2. Pass chat state down to child components
3. Remove ChatDrawer from ActiveSessionShell
4. Single chat instance for entire session

**Affected files:**
- `features/play/components/SessionCockpit.tsx`
- `features/play/components/ActiveSessionShell.tsx`
- `features/play/components/HostSessionWithPlay.tsx`

### Task 7.4: Deprecate HostPlayMode

**Status:** After 7.1, 7.2, 7.3

**Steps:**
1. Move any unique functionality to SessionCockpit/DirectorModeDrawer
2. Update all imports
3. Remove HostPlayMode.tsx
4. Remove unused FacilitatorDashboard if replaced

**Dependencies:**
- Ensure all features work in SessionCockpit
- Test all host workflows
- Test mobile UX

---

## Feature Flags

```env
# Enable new Session Cockpit (default: false during migration)
NEXT_PUBLIC_USE_SESSION_COCKPIT=true

# Keep legacy fallback
NEXT_PUBLIC_LEGACY_HOST_SHELL=false
```

---

## Testing Checklist

Before removing legacy components:

- [ ] Session creation and lobby works
- [ ] Participants can join
- [ ] Role assignment works (single location)
- [ ] Session start/pause/end works
- [ ] Step/phase navigation works
- [ ] Triggers fire correctly
- [ ] Artifacts reveal/hide works
- [ ] Chat works (session-scoped)
- [ ] Director Mode drawer opens/closes
- [ ] Story View modal shows participant perspective
- [ ] Kill switch works
- [ ] Event feed shows events
- [ ] Mobile layout works

---

## Files to Remove (After Migration)

Once SessionCockpit is fully adopted:

1. `features/play/components/HostPlayMode.tsx` (407 lines)
2. Possibly `features/play/components/FacilitatorDashboard.tsx` (835 lines) if functionality is in DirectorModeDrawer
3. Duplicate RoleAssigner usage

**Estimated reduction:** ~1,200 lines of code

---

## Rollback Plan

If issues are found:

1. Disable `NEXT_PUBLIC_USE_SESSION_COCKPIT`
2. Legacy HostPlayMode will be used
3. No data migration needed (same session format)

---

## Progress

| Task | Status | Notes |
|------|--------|-------|
| 7.1 Wire up SessionCockpit | ⬜ Not started | Requires integration testing |
| 7.2 Remove duplicate RoleAssigner | ⬜ Blocked by 7.1 | |
| 7.3 Lift ChatDrawer | ⬜ Blocked by 7.1 | |
| 7.4 Deprecate HostPlayMode | ⬜ Blocked by 7.1-7.3 | |

---

## Notes

Epic 7 is marked as analysis complete. The actual code removal should be done:
1. In a separate PR with thorough testing
2. Behind feature flags initially
3. With a rollback plan ready
4. After all automated and manual tests pass

The Session Cockpit architecture is complete and ready for integration.
