# App Shell / Navigation / Notifications — Architecture

## Metadata

**Date:** 2026-03-16  
**Last updated:** 2026-03-21  
**Last validated:** 2026-03-21  
**Status:** Verified against codebase — reflects actual runtime wiring  
**Scope:** App-zone only (`/app/*`). Admin zone has its own shell (`AdminShellV2`).
**Canonical entrypoint:** `docs/notifications/README.md`

---

## 1. High-Level Component Map

```
┌──────────────────────────────────────────────────────────────┐
│  app/app/layout.tsx (Server)                                 │
│  ├── Auth check (getServerAuthContext)                       │
│  ├── Legal check (getPendingLegalDocuments)                  │
│  └── <TenantProvider>                                        │
│        └── app/app/layout-client.tsx (Client)                │
│              ├── <CartProvider>                               │
│              ├── <ToastProvider>                              │
│              ├── <DemoBanner>                                 │
│              └── <AppShell>          [components/app/]        │
│                    ├── <SideNav>     [components/app/] (lg+)  │
│                    ├── <AppTopbar>   [components/app/]        │
│                    │     ├── Back button (conditional)        │
│                    │     ├── Logo (→ /app)                    │
│                    │     └── <NotificationBell>               │
│                    │           [components/app/]              │
│                    ├── <main>{children}</main>                │
│                    └── <BottomNav>   [components/app/] (<lg)  │
│                          └── <ProfileModal> (on tap)         │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. Canonical File Locations

### Rule: Where App Components Live

```
components/app/          ← Shared app-zone UI components
  AppShell.tsx            ← Root shell (layout + nav + header slot)
  AppTopbar.tsx           ← Topbar (back + logo + bell)
  BottomNav.tsx           ← Mobile bottom navigation
  SideNav.tsx             ← Desktop side navigation
  NotificationBell.tsx    ← Bell icon + notification dropdown
  ProfileModal.tsx        ← Quick profile action sheet
  PageTitleHeader.tsx     ← Standard page title block (icon + eyebrow + h1)
  nav-items.tsx           ← Navigation item definitions (shared by BottomNav + SideNav)

hooks/                   ← Shared hooks
  useAppNotifications.ts ← Notification data management (shared store pattern)
```

### Import Path Rules

| Component Type | Canonical Path | Import Alias |
|---------------|---------------|--------------|
| App shell components | `components/app/*.tsx` | `@/components/app/*` |
| Shared hooks | `hooks/*.ts` | `@/hooks/*` |
| Feature components | `features/{domain}/*.tsx` | `@/features/{domain}/*` |

### Current Placement Rule

All active app-shell components now live in `components/app/`. Do not recreate `app/app/components/` for app-shell code unless a future route-local layout concern cannot be expressed cleanly in the shared shell.

---

## 3. Navigation Architecture

### Bottom Nav (Mobile, `< lg`)

```
components/app/BottomNav.tsx
  ├── Reads nav items from nav-items.tsx
  ├── Profile tab → opens ProfileModal (not navigation)
  ├── Play tab → hero button (elevated design)
  ├── Other tabs → standard Link navigation
  └── Hidden on desktop (lg:hidden)
```

**5 tabs:** Browse → DiceCoin → Play (hero) → Planera → Profil

### Side Nav (Desktop, `≥ lg`)

```
components/app/SideNav.tsx
  ├── Same nav items from nav-items.tsx
  ├── Profile tab → opens ProfileModal
  ├── Logo + "Lekbanken" branding
  └── Visible only on desktop (hidden lg:flex)
```

### Topbar

```
components/app/AppTopbar.tsx
  ├── Left:   Back button (conditional via canGoBack prop)
  ├── Center: Dice logo (→ /app)
  └── Right:  <NotificationBell />
```

The topbar is **always rendered** — it's passed as the `header` prop to `AppShell`.

---

## 4. Notifications Architecture

### Two Consumer Surfaces, One Store

```
                     ┌─────────────────────────┐
                     │  NotificationStore       │
                     │  (per-user singleton)    │
                     │  ├── notifications[]     │
                     │  ├── unreadCount         │
                     │  └── isLoading / error   │
                     └────────┬────────────────┘
                              │
              useSyncExternalStore
                              │
               ┌──────────────┴──────────────┐
               │                             │
    useAppNotifications()         useAppNotifications(100)
    limit=20 (default)            limit=100
               │                             │
    NotificationBell.tsx          notifications/page.tsx
    (topbar dropdown)             (full page list)
```

### Entry Points

| Surface | URL | Trigger | Bell Visible? |
|---------|-----|---------|---------------|
| Bell dropdown | Any `/app/*` page | Click bell in topbar | Yes (always) |
| Bell "View all" link | — | Click footer link in dropdown | Navigates to full page |
| Full page | `/app/notifications` | Direct nav or "View all" | Yes (in topbar above) |

### Data Flow

1. **Fetch:** `get_user_notifications` RPC → returns ordered, limited notifications
2. **Store:** `NotificationStore` holds canonical list (largest fetch wins)
3. **Subscribe:** `useSyncExternalStore` delivers per-instance sliced view
4. **Mutate:** `markAsRead`, `markAllAsRead`, `dismiss` → optimistic update + RPC call
5. **Poll:** Visibility-change + focus + online handlers trigger background refresh

### Admin Zone (Separate)

The admin zone (`/admin/*`) has its own shell:
- `AdminShellV2` → `AdminTopbarV2` → **No notification bell**
- Admin creates notifications via `/admin/notifications` send page
- Admin does NOT consume notifications (intentional design decision)

---

## 5. Page Header Pattern

### Active: `PageTitleHeader`

```tsx
<PageTitleHeader
  icon={<BellIcon className="h-5 w-5" />}
  title="SECTION"           // Eyebrow text (uppercase)
  subtitle="Page Title"     // h1 text
  rightSlot={<Button>...</Button>}
/>
```

**Used by:** 11 pages (browse, gamification, planner, play, profile, dashboard, legal)

### Legacy: `PageHeader`

```tsx
<PageHeader title="Din lekresa" />
```

**Used by:** 1 file (`features/journey/JourneyPage.tsx` — legacy placeholder)

**Rule:** New pages must use `PageTitleHeader`, not `PageHeader`.

---

## 6. Separation of Concerns

```
┌─────────────────────┐    ┌──────────────────────┐
│  APP ZONE (/app/*)  │    │  ADMIN ZONE (/admin/*)│
├─────────────────────┤    ├──────────────────────┤
│  AppShell            │    │  AdminShellV2         │
│  AppTopbar           │    │  AdminTopbarV2        │
│  BottomNav           │    │  AdminSidebarV2       │
│  SideNav             │    │  AdminCommandPalette  │
│  NotificationBell    │    │  (no bell)            │
│  ProfileModal        │    │  ProfileMenu          │
│  PageTitleHeader     │    │  AdminPageHeader      │
├─────────────────────┤    ├──────────────────────┤
│  Consumes notifs     │    │  Sends notifs         │
│  useAppNotifications │    │  /admin/notifications │
└─────────────────────┘    └──────────────────────┘
```

These are **fully independent shells** sharing no layout components. This is correct by design.

---

## 7. Rules for AI Agents

### DO

- Edit `components/app/BottomNav.tsx` for bottom nav changes
- Edit `components/app/NotificationBell.tsx` for bell behavior
- Edit `hooks/useAppNotifications.ts` for notification data/state logic
- Edit `app/app/notifications/page.tsx` for notification page UI
- Edit `components/app/AppTopbar.tsx` for topbar layout changes
- Use `PageTitleHeader` for new page headers

### DO NOT

- Touch `app/app/components/bottom-nav.tsx` — it is dead code
- Touch `components/app/PageHeader.tsx` — it is legacy
- Touch `components/admin/AdminNotificationsCenter.tsx` — it is orphaned
- Touch `components/admin/useRealAdminNotifications.ts` — it is orphaned
- Recreate `app/app/components/` for app-shell code without a verified route-local need
- Assume admin zone has notification consumption — it does not
