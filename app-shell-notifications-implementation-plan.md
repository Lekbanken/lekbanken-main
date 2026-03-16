# App Shell / Notifications — Implementation Plan

**Date:** 2026-03-16  
**Prerequisite:** Read `app-shell-notifications-audit.md` first  
**Goal:** Eliminate structural confusion with minimal, safe changes  
**Approach:** Small consolidation — NOT a rewrite  

---

## Milestone 1: Delete Dead Code (Safe, No Runtime Impact)

**Risk level:** NONE — these files have zero imports  
**Verification:** `grep -r "filename" --include="*.ts" --include="*.tsx"` confirms zero import references

### 1.1 Delete `app/app/components/bottom-nav.tsx`

- [x] Delete file ✅ KLAR (2026-03-16)
- [x] Verify: `app/app/components/` now contains only `app-topbar.tsx` ✅ KLAR (2026-03-16)
- [x] Run `npx tsc --noEmit` — 0 errors ✅ KLAR (2026-03-16)

**Rationale:** Dead duplicate of `components/app/BottomNav.tsx`. Same export name, never imported. Creates naming confusion for agents.

### 1.2 Delete `components/admin/AdminNotificationsCenter.tsx`

- [x] Delete file ✅ KLAR (2026-03-16)
- [x] Run `npx tsc --noEmit` — verified ✅ KLAR (2026-03-16)
- [x] Proceed to 1.3 ✅ KLAR (2026-03-16)

**Rationale:** Orphaned component. Admin topbar explicitly removed notification consumption.

### 1.3 Delete `components/admin/useRealAdminNotifications.ts`

- [x] Delete file ✅ KLAR (2026-03-16)
- [x] Run `npx tsc --noEmit` — 0 errors ✅ KLAR (2026-03-16)

**Rationale:** Orphaned hook. Zero imports.

### 1.4 Delete `components/app/TenantSwitcher.tsx`

- [x] Delete file ✅ KLAR (2026-03-16)
- [x] Run `npx tsc --noEmit` — 0 errors ✅ KLAR (2026-03-16)

**Rationale:** Orphaned. Zero imports. If tenant switching is needed later, it can be rebuilt with current architecture knowledge.

### Milestone 1 Verification

```bash
npx tsc --noEmit          # 0 errors
npm run build             # successful build (optional, extra safety)
```

**Noteringar:** After this milestone, the codebase has 4 fewer files and zero runtime changes.

---

## Milestone 2: Legacy Monitoring (No Action Now)

### 2.1 `components/app/PageHeader.tsx` — Keep for now

**Do not delete.** It has 1 active import from `features/journey/JourneyPage.tsx`.

- [ ] When `JourneyPage.tsx` is replaced or removed, delete `PageHeader.tsx` at that time
- [ ] All new pages must use `PageTitleHeader.tsx`

### 2.2 `app/app/components/app-topbar.tsx` — Optional relocation

The topbar could be moved to `components/app/AppTopbar.tsx` to eliminate the `app/app/components/` folder entirely. This is **optional** and low priority.

**If relocated:**
- [ ] Move `app/app/components/app-topbar.tsx` → `components/app/AppTopbar.tsx`
- [ ] Update import in `app/app/layout-client.tsx`:  
  `import { AppTopbar } from "@/components/app/AppTopbar"`
- [ ] Delete now-empty `app/app/components/` directory
- [ ] Run `npx tsc --noEmit`

**Decision:** Defer unless `app/app/components/` is actively causing confusion.

---

## Milestone 3: Resume Notification Hook Work

After structural cleanup is done, the notification focus returns to the hook level:

### 3.1 Verify shared store behavior in browser

- [x] Reset test notification data ✅ KLAR (2026-03-16)
- [x] Run the 7 verification scenarios — **7/7 PASS** ✅ KLAR (2026-03-16)
  1. ✅ Bell alone — badge + dropdown
  2. ✅ Bell + page — consistent state
  3. ✅ Mark read from bell → page updates
  4. ✅ Mark read from page → bell updates
  5. ✅ Mark all read → badge=0
  6. ✅ Dismiss → both views update
  7. ✅ Initial load-race → no stuck spinner

**Noteringar:** Notifications now use **shared canonical client state per user** via `NotificationStore` class (singleton per `userId` in `storesByUser` Map) with `useSyncExternalStore`. Both the bell dropdown (`NotificationBell`) and the full page (`/app/notifications`) subscribe to the same store instance. Mark-read, mark-all, and dismiss operations from either surface immediately propagate to the other. Badge count is derived from the single shared `notifications` array.

### 3.2 Address known hook risks

These are state/logic issues in `hooks/useAppNotifications.ts`, not structural:

| Risk | Description | Priority |
|------|-------------|----------|
| Dedup logic | Two fetchers (limit=20 and limit=100) may have a last-write race | Medium |
| Initial spinner | Page may briefly show spinner before store hydrates | Low |
| Re-subscription | `storeInstance` state + `storeRef` pattern needs browser validation | Medium |
| Error propagation | Store error state shared — one fetch error affects both consumers | Low |

---

## What This Plan Does NOT Do

- **No component rewrites.** The app-shell is architecturally sound.
- **No folder restructuring.** The two-folder split (`components/app/` and `app/app/components/`) is acceptable with dead code removed.
- **No notification UX changes.** The bell/page consumer pattern is correct.
- **No admin zone changes.** Admin shell is separate by design.

---

## Summary: Files to Keep vs Remove

### Keep (Canonical)

| File | Role |
|------|------|
| `components/app/AppShell.tsx` | Root shell |
| `components/app/BottomNav.tsx` | Mobile nav |
| `components/app/SideNav.tsx` | Desktop nav |
| `components/app/NotificationBell.tsx` | Bell + dropdown |
| `components/app/ProfileModal.tsx` | Profile quick actions |
| `components/app/PageTitleHeader.tsx` | Page title (active) |
| `components/app/nav-items.tsx` | Nav definitions |
| `app/app/components/app-topbar.tsx` | Topbar |
| `hooks/useAppNotifications.ts` | Notification hook |
| `app/app/notifications/page.tsx` | Full notification page |

### Remove (Milestone 1)

| File | Reason |
|------|--------|
| `app/app/components/bottom-nav.tsx` | Dead duplicate |
| `components/admin/AdminNotificationsCenter.tsx` | Orphaned |
| `components/admin/useRealAdminNotifications.ts` | Orphaned |
| `components/app/TenantSwitcher.tsx` | Orphaned |

### Monitor (Milestone 2)

| File | Action |
|------|--------|
| `components/app/PageHeader.tsx` | Delete when `JourneyPage.tsx` is removed |
| `app/app/components/app-topbar.tsx` | Optionally relocate to `components/app/` |

---

## Execution Order

1. ✅ Read audit → understand findings (this doc)
2. ✅ Milestone 1: Delete 4 dead files — KLAR (2026-03-16)
3. Milestone 2: No action now (monitoring only)
4. ✅ Milestone 3: Notification shared-store verified 7/7 — KLAR (2026-03-16)

---

## Tech Debt: Limit Superset Rule

**Status:** Open  
**Priority:** Low  
**Created:** 2026-03-16

The `NotificationStore` dedup logic uses last-write-wins when two consumers fetch with different `limit` values (bell: limit=20, page: limit=100). This works today because the larger fetch is a superset of the smaller one, and the store correctly reuses in-flight requests when `newLimit >= existingLimit`.

However, this is an implicit invariant — there is no explicit rule enforcing that the store always keeps the max-fetched superset.

**Recommendation:** Evaluate replacing last-write-wins with an explicit "store keeps max-fetched superset" rule, where the store never shrinks its `notifications` array when a smaller-limit fetch completes. This would make the invariant explicit and protect against future changes where a third consumer with a different limit is added.
