# App Shell / Navigation / Notifications Surface — Audit

## Metadata

**Date:** 2026-03-16  
**Last updated:** 2026-03-21  
**Last validated:** 2026-03-21  
**Scope:** App-zone shell, navigation components, and notification surfaces  
**Method:** Static analysis of imports, exports, route wiring, and component composition  
**Status:** Active audit
**Canonical entrypoint:** `docs/notifications/README.md`

---

## 1. Executive Summary

The app-zone shell has **one clean canonical chain**. The previous dead duplicate and orphaned notification-adjacent files have been removed, and the topbar now lives with the rest of the active shell under `components/app/`. The notifications surface is **structurally sound**: bell and page share the same hook and data flow. Remaining work is hook/state-level and scheduled-path cleanup, not shell architecture cleanup.

### Update 2026-03-19: Notifications V2 Batch 1 Stabilized

**DB layer consolidated.** Atomic write pipeline (`create_notification_v1`), delivery-based admin history (`get_notification_history_v1`), tightened RLS, and scoped `event_key` idempotency are all live and tested.

**New discovery:** pg_cron IS active in production (previously documented as "unverified"). `process_scheduled_notifications()` runs daily at 02:00 UTC. It uses legacy fanout (`auth.users` instead of `public.users`, no demo exclusion). **Batch 2 spec written:** see `app-shell-notifications-batch2-spec.md`.

---

## 2. Runtime Component Chain (Verified)

### App-Zone Layout Stack

```
app/app/layout.tsx (Server Component)
  └── getServerAuthContext() → auth check
  └── <TenantProvider>
        └── app/app/layout-client.tsx (Client Component)
              └── <CartProvider>
              └── <ToastProvider>
              └── <DemoBanner>
              └── <AppShell>                    ← components/app/AppShell.tsx
                    ├── <SideNav>               ← components/app/SideNav.tsx (desktop: lg+)
                    ├── header={<AppTopbar>}     ← components/app/AppTopbar.tsx
                    │     └── <NotificationBell> ← components/app/NotificationBell.tsx
                    ├── <main>{children}</main>
                    └── <BottomNav>             ← components/app/BottomNav.tsx (mobile: <lg)
```

### Canonical Files (RUNTIME-ACTIVE)

| File | Role | Imported By | Status |
|------|------|-------------|--------|
| `components/app/AppShell.tsx` | Root layout shell | `app/app/layout-client.tsx` | ✅ **Canonical** |
| `components/app/AppTopbar.tsx` | Topbar (back, logo, bell) | `app/app/layout-client.tsx` | ✅ **Canonical** |
| `components/app/NotificationBell.tsx` | Bell icon + dropdown | `components/app/AppTopbar.tsx` | ✅ **Canonical** |
| `components/app/BottomNav.tsx` | Mobile bottom nav | `components/app/AppShell.tsx` | ✅ **Canonical** |
| `components/app/SideNav.tsx` | Desktop side nav | `components/app/AppShell.tsx` | ✅ **Canonical** |
| `components/app/ProfileModal.tsx` | Quick profile actions | `BottomNav.tsx`, `SideNav.tsx` | ✅ **Canonical** |
| `components/app/nav-items.tsx` | Nav item definitions | `BottomNav.tsx`, `SideNav.tsx`, 6+ feature pages | ✅ **Canonical** |
| `components/app/PageTitleHeader.tsx` | Page-level title block | 11 pages across app/features | ✅ **Canonical** |
| `hooks/useAppNotifications.ts` | Notification data hook | `NotificationBell.tsx`, `app/app/notifications/page.tsx` | ✅ **Canonical** |
| `app/app/notifications/page.tsx` | Full notifications page | Route (auto-wired) | ✅ **Canonical** |
| `app/app/layout-client.tsx` | Client shell wrapper | `app/app/layout.tsx` | ✅ **Canonical** |

---

## 3. Removed Structural Noise / Remaining Legacy

### 3.1. Removed in cleanup batch

- `app/app/components/bottom-nav.tsx` — removed
- `components/admin/AdminNotificationsCenter.tsx` — removed
- `components/admin/useRealAdminNotifications.ts` — removed
- `components/app/TenantSwitcher.tsx` — removed

These files were the main source of false structural signals in the earlier audit. They no longer exist in the active codebase.

### 3.2. `components/app/PageHeader.tsx` — ⚠️ NEAR-LEGACY

- **Content:** Simple sticky header with title + eyebrow + rightSlot
- **Imports:** Exactly 1 — from `features/journey/JourneyPage.tsx`
- **JourneyPage status:** Per `docs/journey/JOURNEY_DOMAIN.md`, this is a "Legacy placeholder"
- **Active alternative:** `PageTitleHeader.tsx` (11 import sites) serves the same purpose with richer API
- **Risk:** An agent looking for "page header" may choose this over `PageTitleHeader`

**Classification:** ⚠️ **Legacy — remove when JourneyPage is cleaned up**

---

## 4. Notifications Surface Integrity

### 4.1. Entry Points

| Surface | Component | Hook Call | Limit | Where Rendered |
|---------|-----------|-----------|-------|----------------|
| **Bell (topbar)** | `NotificationBell` | `useAppNotifications()` | 20 (default) | Every app page via `AppTopbar` |
| **Full page** | `app/app/notifications/page.tsx` | `useAppNotifications(100)` | 100 | Route `/app/notifications` |
| **Admin (removed)** | `AdminNotificationsCenter` | N/A | N/A | Not rendered anywhere |

### 4.2. Shared Architecture Assessment

**Are bell and page part of the same app-shell?** ✅ YES
- Both render inside the same `<AppShell>` via `layout-client.tsx`
- Bell is in the topbar (always visible)
- Page is a child route (rendered in `<main>`)
- Both use the same hook from `hooks/useAppNotifications.ts`
- The shared store pattern (implemented in previous session) ensures data consistency

**Parallel entry surface risk?** ❌ NO
- Only one bell component exists and it's imported from one place
- No secondary notification popup, toast system, or sidebar notification panel
- Admin zone intentionally does not consume notifications

### 4.3. Data Flow

```
Supabase RPC: get_user_notifications(limit)
  ↓
hooks/useAppNotifications.ts
  ├── NotificationStore (shared per user, singleton)
  │     ├── notifications[]
  │     ├── unreadCount
  │     └── isLoading
  ├── useSyncExternalStore (subscription)
  └── .slice(0, limit) per instance
        ├── NotificationBell (limit=20)
        └── NotificationsPage (limit=100)
```

### 4.4. Assessment

The notifications surface is **architecturally clean**:
- One hook, one store, two consumers
- No parallel component families
- No risk of patching the wrong file for notification behavior
- The hook itself had state-sharing bugs (addressed in previous session), but the wiring/routing/composition is correct

---

## 5. Structural Risk Analysis

### RISK 1: Legacy docs can still imply the old two-folder split

| Aspect | Finding |
|--------|---------|
| **Severity** | LOW |
| **Pattern** | Active shell components are now consolidated under `components/app/` |
| **Runtime impact** | None |
| **Agent risk** | Medium if agents read stale docs instead of current code |
| **Root cause** | Documentation lag after the completed topbar consolidation |

### RISK 2: Naming confusion

| File A | File B | Confusion |
|--------|--------|-----------|
| `components/app/PageHeader.tsx` | `components/app/PageTitleHeader.tsx` | "PageHeader" vs "PageTitleHeader" — which is current? |

### RISK 3: Legacy `PageHeader` still creates a mild API-choice trap

`components/app/PageHeader.tsx` still exists for one legacy journey page, while `PageTitleHeader.tsx` is the active standard everywhere else. An agent scanning by filename can still pick the wrong header primitive.

### RISK 4: Notification issues are no longer structural

The remaining meaningful risks sit in `hooks/useAppNotifications.ts` and the scheduled notification path, not in app-shell composition.

---

## 6. File Classification Summary

### ✅ Canonical Runtime Components

| File | Role |
|------|------|
| `components/app/AppShell.tsx` | Root shell |
| `components/app/BottomNav.tsx` | Mobile nav |
| `components/app/SideNav.tsx` | Desktop nav |
| `components/app/AppTopbar.tsx` | Topbar (back/logo/bell) |
| `components/app/NotificationBell.tsx` | Bell + dropdown |
| `components/app/ProfileModal.tsx` | Profile quick actions |
| `components/app/PageTitleHeader.tsx` | Page title block |
| `components/app/nav-items.tsx` | Nav definitions |
| `app/app/layout-client.tsx` | Client layout wrapper |
| `hooks/useAppNotifications.ts` | Notification hook |
| `app/app/notifications/page.tsx` | Notifications full page |

### ✅ Removed from Active Codebase

| File | Reason |
|------|--------|
| `app/app/components/bottom-nav.tsx` | Dead duplicate removed |
| `components/admin/AdminNotificationsCenter.tsx` | Orphaned admin consumer removed |
| `components/admin/useRealAdminNotifications.ts` | Orphaned hook removed |
| `components/app/TenantSwitcher.tsx` | Orphaned switcher removed |

### ⚠️ Legacy (Monitor)

| File | Reason |
|------|--------|
| `components/app/PageHeader.tsx` | 1 import from legacy `JourneyPage.tsx` |

---

## 7. Conclusion

**Current conclusion:**

✅ The app-shell now has one canonical component family under `components/app/`  
✅ The removed duplicate/orphan files are no longer part of the active architecture  
✅ The bell and page remain part of the same coherent shell  
✅ The notification issues are not shell-routing problems  
⚠️ The remaining structural ambiguity is limited to legacy `PageHeader` usage and stale documentation risk  

**The app-shell architecture is sound.** Remaining work is:
1. Keep active docs synchronized with the completed shell cleanup
2. Continue hook-level notification hardening
3. Execute Batch 2 scheduled-path consolidation
