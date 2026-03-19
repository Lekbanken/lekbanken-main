# App Shell / Navigation / Notifications Surface — Audit

**Date:** 2026-03-16  
**Scope:** App-zone shell, navigation components, and notification surfaces  
**Method:** Static analysis of imports, exports, route wiring, and component composition  

---

## 1. Executive Summary

The app-zone shell has **one clean canonical chain** — this is good. However, there are **4 orphaned components** and **1 dead duplicate** that create confusion and risk for AI agents and humans alike. The notifications surface is **structurally sound**: bell and page share the same hook and data flow. The core hypothesis of "two parallel component families" is **partially confirmed**: a dead `bottom-nav.tsx` duplicate exists, but it is not causing runtime bugs. The real notification issues are hook/state-level, not structural.

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
                    ├── header={<AppTopbar>}     ← app/app/components/app-topbar.tsx
                    │     └── <NotificationBell> ← components/app/NotificationBell.tsx
                    ├── <main>{children}</main>
                    └── <BottomNav>             ← components/app/BottomNav.tsx (mobile: <lg)
```

### Canonical Files (RUNTIME-ACTIVE)

| File | Role | Imported By | Status |
|------|------|-------------|--------|
| `components/app/AppShell.tsx` | Root layout shell | `app/app/layout-client.tsx` | ✅ **Canonical** |
| `app/app/components/app-topbar.tsx` | Topbar (back, logo, bell) | `app/app/layout-client.tsx` | ✅ **Canonical** |
| `components/app/NotificationBell.tsx` | Bell icon + dropdown | `app/app/components/app-topbar.tsx` | ✅ **Canonical** |
| `components/app/BottomNav.tsx` | Mobile bottom nav | `components/app/AppShell.tsx` | ✅ **Canonical** |
| `components/app/SideNav.tsx` | Desktop side nav | `components/app/AppShell.tsx` | ✅ **Canonical** |
| `components/app/ProfileModal.tsx` | Quick profile actions | `BottomNav.tsx`, `SideNav.tsx` | ✅ **Canonical** |
| `components/app/nav-items.tsx` | Nav item definitions | `BottomNav.tsx`, `SideNav.tsx`, 6+ feature pages | ✅ **Canonical** |
| `components/app/PageTitleHeader.tsx` | Page-level title block | 11 pages across app/features | ✅ **Canonical** |
| `hooks/useAppNotifications.ts` | Notification data hook | `NotificationBell.tsx`, `app/app/notifications/page.tsx` | ✅ **Canonical** |
| `app/app/notifications/page.tsx` | Full notifications page | Route (auto-wired) | ✅ **Canonical** |
| `app/app/layout-client.tsx` | Client shell wrapper | `app/app/layout.tsx` | ✅ **Canonical** |

---

## 3. Dead / Orphaned Components

### 3.1. `app/app/components/bottom-nav.tsx` — ❌ DEAD DUPLICATE

- **Content:** Minimal rounded-pill bottom nav with hardcoded Swedish labels
- **Imports:** Zero. Not imported anywhere in the codebase.
- **Shadowed by:** `components/app/BottomNav.tsx` (the actual runtime component)
- **Risk:** An agent asked to "fix the bottom nav" may edit this file instead of the canonical one
- **Naming collision:** Same export name `BottomNav` as the canonical component
- **Confirmed dead via:** No `import` statement referencing this file path exists

**Classification:** 🗑️ **Candidate for deletion**

### 3.2. `components/app/PageHeader.tsx` — ⚠️ NEAR-LEGACY

- **Content:** Simple sticky header with title + eyebrow + rightSlot
- **Imports:** Exactly 1 — from `features/journey/JourneyPage.tsx`
- **JourneyPage status:** Per `docs/JOURNEY_DOMAIN.md`, this is a "Legacy placeholder"
- **Active alternative:** `PageTitleHeader.tsx` (11 import sites) serves the same purpose with richer API
- **Risk:** An agent looking for "page header" may choose this over `PageTitleHeader`

**Classification:** ⚠️ **Legacy — remove when JourneyPage is cleaned up**

### 3.3. `components/admin/AdminNotificationsCenter.tsx` — ❌ ORPHANED

- **Content:** Admin bell icon + dropdown component
- **Imports:** Zero runtime imports. Only type-imported by `useRealAdminNotifications.ts`
- **Why orphaned:** `AdminTopbarV2.tsx` has explicit comment: `"Notifications removed from admin - admin only creates, app consumes"`
- **Risk:** Agent might wire this into admin topbar thinking it should be there

**Classification:** 🗑️ **Candidate for deletion** (with `useRealAdminNotifications.ts`)

### 3.4. `components/admin/useRealAdminNotifications.ts` — ❌ ORPHANED

- **Content:** Hook wrapping `useAppNotifications` and mapping to `AdminNotification` type
- **Imports:** Zero. Not imported by any component.
- **Risk:** Creates false appearance that admin has notification consumption. It doesn't.

**Classification:** 🗑️ **Candidate for deletion** (with `AdminNotificationsCenter.tsx`)

### 3.5. `components/app/TenantSwitcher.tsx` — ❌ ORPHANED

- **Content:** Dropdown for switching between tenants
- **Imports:** Zero. Referenced only in docs (`USER_PROFILE_CURRENT_STATE_ANALYSIS.md`)
- **Risk:** Agent may try to wire this in thinking it's needed

**Classification:** 🗑️ **Candidate for deletion** (or keep if planned for future use)

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

### RISK 1: Two-folder split (`app/app/components/` vs `components/app/`)

| Aspect | Finding |
|--------|---------|
| **Severity** | MEDIUM (causes confusion, not runtime bugs) |
| **Pattern** | `app/app/components/` has 2 files; `components/app/` has 9 files |
| **Runtime impact** | None — the dead duplicate is never imported |
| **Agent risk** | HIGH — AI agents given "fix bottom nav" will find both files |
| **Root cause** | `app-topbar.tsx` was placed in route-local `app/app/components/` while it could live in `components/app/` |

### RISK 2: Naming confusion

| File A | File B | Confusion |
|--------|--------|-----------|
| `app/app/components/bottom-nav.tsx` (kebab-case) | `components/app/BottomNav.tsx` (PascalCase) | Same `BottomNav` export name |
| `components/app/PageHeader.tsx` | `components/app/PageTitleHeader.tsx` | "PageHeader" vs "PageTitleHeader" — which is current? |

### RISK 3: Orphaned code creating false architecture signals

The 4 orphaned files create a false impression of:
- An admin notification consumption system (doesn't exist)
- A tenant switching UI (doesn't exist)
- A second bottom nav (doesn't exist)
- An older page header API (legacy)

An agent reading the codebase will waste time understanding dead components and may try to integrate them.

### RISK 4: `app-topbar.tsx` placement

`app-topbar.tsx` lives in `app/app/components/` but imports from `components/app/`:
```
app/app/components/app-topbar.tsx
  → import { NotificationBell } from "@/components/app/NotificationBell"
```

This cross-folder import is the **only reason** `app/app/components/` exists as a folder. The topbar could live in `components/app/` alongside its peers.

---

## 6. File Classification Summary

### ✅ Canonical Runtime Components

| File | Role |
|------|------|
| `components/app/AppShell.tsx` | Root shell |
| `components/app/BottomNav.tsx` | Mobile nav |
| `components/app/SideNav.tsx` | Desktop nav |
| `components/app/NotificationBell.tsx` | Bell + dropdown |
| `components/app/ProfileModal.tsx` | Profile quick actions |
| `components/app/PageTitleHeader.tsx` | Page title block |
| `components/app/nav-items.tsx` | Nav definitions |
| `app/app/components/app-topbar.tsx` | Topbar (back/logo/bell) |
| `app/app/layout-client.tsx` | Client layout wrapper |
| `hooks/useAppNotifications.ts` | Notification hook |
| `app/app/notifications/page.tsx` | Notifications full page |

### 🗑️ Candidates for Deletion

| File | Reason |
|------|--------|
| `app/app/components/bottom-nav.tsx` | Dead duplicate, zero imports |
| `components/admin/AdminNotificationsCenter.tsx` | Orphaned, admin removed notifications |
| `components/admin/useRealAdminNotifications.ts` | Orphaned, zero imports |
| `components/app/TenantSwitcher.tsx` | Orphaned, zero imports |

### ⚠️ Legacy (Monitor)

| File | Reason |
|------|--------|
| `components/app/PageHeader.tsx` | 1 import from legacy `JourneyPage.tsx` |

---

## 7. Conclusion

**The hypothesis was partially right, partially wrong:**

✅ There IS a dead duplicate (`bottom-nav.tsx`) — confirmed  
✅ There IS naming confusion between folders — confirmed  
✅ There ARE orphaned components creating false signals — confirmed  
❌ There is NOT a parallel component family causing notification bugs — refuted  
❌ The bell and page ARE part of the same coherent shell — confirmed sound  
❌ The notification issues are NOT structural routing problems — they were hook-level state bugs  

**The app-shell architecture is fundamentally sound.** The cleanup needed is:
1. Delete ~4 dead files
2. Optionally consolidate `app-topbar.tsx` location
3. Continue with hook-level notification fixes

This is a **small cleanup**, not a rewrite.
