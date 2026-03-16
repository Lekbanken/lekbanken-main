# Notifications Architecture

**Date:** 2026-03-16  
**Updated:** 2026-03-17 — Sharpened after second verification pass  
**Scope:** Canonical architecture for the Notifications domain in Lekbanken  
**Approach:** Minimal-invasion design that formalises the existing architecture rather than proposing a rewrite

---

## Design Principles

1. **Deliveries are the source of truth for user visibility** — a user only sees a notification if a `notification_deliveries` row exists with their `user_id`.
2. **Notifications are templates** — the `notifications` table holds content and metadata. It's what was *sent*. Deliveries track who *received* it and their interaction state.
3. **SECURITY DEFINER RPCs are the primary read path** — they bypass RLS for clean, performant queries. Direct PostgREST queries are a fallback and must have correct RLS.
4. **In-app only** — no email, push, or SMS. This simplifies the architecture significantly.
5. **Tenant-bound except when explicitly global** — the `scope` column + `tenant_id` control audience. Global broadcasts (`scope='all'`) are the exception.

---

## Data Model

### Canonical Schema

```
┌──────────────────────────────────┐     ┌──────────────────────────────────┐
│          notifications           │     │     notification_deliveries      │
├──────────────────────────────────┤     ├──────────────────────────────────┤
│ id          UUID PK              │◄───│ notification_id  UUID FK         │
│ tenant_id   UUID FK (nullable)   │     │ user_id          UUID FK         │
│ user_id     UUID FK (nullable)   │     │ id               UUID PK         │
│ title       VARCHAR(255)         │     │ delivered_at     TIMESTAMP       │
│ message     TEXT                 │     │ read_at          TIMESTAMP?      │
│ type        VARCHAR(50)          │     │ dismissed_at     TIMESTAMP?      │
│ category    VARCHAR(50)          │     │ created_at       TIMESTAMP       │
│ action_url  VARCHAR(512)         │     │                                  │
│ action_label VARCHAR(100)        │     │ UNIQUE(notification_id, user_id) │
│ scope       TEXT (all|tenant)    │     └──────────────────────────────────┘
│ status      TEXT                 │
│ schedule_at TIMESTAMP?           │     ┌──────────────────────────────────┐
│ sent_at     TIMESTAMP?           │     │   notification_preferences       │
│ created_by  UUID FK              │     ├──────────────────────────────────┤
│ event_key   TEXT (idempotent)    │     │ id          UUID PK              │
│ related_entity_id UUID?          │     │ user_id     UUID FK              │
│ related_entity_type VARCHAR?     │     │ tenant_id   UUID FK (nullable)   │
│ created_at  TIMESTAMP            │     │ email_enabled   BOOLEAN          │
│ updated_at  TIMESTAMP            │     │ push_enabled    BOOLEAN          │
│                                  │     │ in_app_enabled  BOOLEAN          │
│ CHECK(scope IN ('all','tenant')) │     │ category flags...                │
│ CHECK(scope='tenant' →           │     │ quiet_hours...                   │
│       tenant_id IS NOT NULL)     │     │ UNIQUE(user_id, tenant_id)       │
│ CHECK(scope='all' →              │     └──────────────────────────────────┘
│       tenant_id IS NULL)         │
└──────────────────────────────────┘
```

### Key Constraints

| Constraint | Purpose |
|-----------|---------|
| `notifications.scope CHECK` | Enforces `all`/`tenant` as valid values |
| `notification_scope_tenant_check` | `scope='tenant'` → `tenant_id NOT NULL`; `scope='all'` → `tenant_id IS NULL` |
| `UNIQUE(notification_id, user_id)` on deliveries | One delivery per user per notification |
| `UNIQUE(user_id, event_key) WHERE event_key IS NOT NULL` on notifications | Idempotency for ticket events |

### Column Semantics

#### `notifications.user_id`
- Set for **direct notifications** (e.g., ticket events → targeted at one user)
- `NULL` for **broadcasts** (global or tenant-scoped)
- This field does NOT control visibility — deliveries do

#### `notifications.tenant_id`
- Set for **tenant-scoped** notifications (`scope='tenant'`)
- `NULL` for **global** broadcasts (`scope='all'`)
- Enforced by CHECK constraint

#### `notification_deliveries.read_at`
- `NULL` = unread
- Set to `now()` when user marks as read
- Used for unread count: `COUNT(*) WHERE read_at IS NULL AND dismissed_at IS NULL`

#### `notification_deliveries.dismissed_at`
- `NULL` = visible
- Set to `now()` when user dismisses
- Dismissed notifications are excluded from all queries (both RPC and direct)

---

## Write Model

### Two Write Paths

```
                    ┌──────────────────┐
                    │  Write Triggers   │
                    └────────┬─────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                                  ▼
   ┌────────────────┐              ┌─────────────────────┐
   │ Admin Broadcast │              │ Ticket Notification  │
   │ (server action) │              │ (server action)      │
   └────────┬───────┘              └──────────┬──────────┘
            │                                  │
            │  createServiceRoleClient()       │  createServiceRoleClient()
            │  (bypasses RLS)                  │  (bypasses RLS)
            ▼                                  ▼
   ┌────────────────┐              ┌─────────────────────┐
   │ 1. INSERT       │              │ 1. INSERT            │
   │    notification  │              │    notification       │
   │    (scope, etc.) │              │    (event_key for     │
   │                  │              │     idempotency)      │
   │ 2. Resolve       │              │                       │
   │    recipients    │              │ 2. INSERT delivery    │
   │    (all users /  │              │    (single user)      │
   │     tenant /     │              │                       │
   │     specific)    │              │ On 23505 constraint   │
   │                  │              │ violation → skip      │
   │ 3. INSERT        │              │ (idempotent)          │
   │    deliveries    │              └─────────────────────┘
   │    (per user)    │
   └────────────────┘
```

### Recipient Resolution (Admin Broadcasts)

| Scope | Source table | Filter | Notes |
|-------|-------------|--------|-------|
| `global` | `users` | `is_demo_user = false` (optional) | All users across all tenants |
| `tenant` | `user_tenant_memberships` | `tenant_id = <selected>` | Members of one organisation |
| `users` | `userIds[]` (explicit list) | None — explicit list | Must be members of selected tenant |

### Global Broadcast: Materialised Deliveries

**Design decision:** Global broadcasts are materialised as individual `notification_deliveries` rows, one per user. This is chosen over an alternative "virtual" approach (showing notifications without deliveries) because:

1. **Consistent read model** — every notification a user can see has a delivery row. No branching in query logic.
2. **Per-user state** — each user can independently mark as read/dismissed. This requires per-user rows.
3. **Unread count** — computed from `notification_deliveries WHERE read_at IS NULL`. Without delivery rows, we'd need a separate tracking mechanism.
4. **Realtime** — Supabase Realtime filters by `user_id=eq.${userId}` on `notification_deliveries`. Without delivery rows, realtime wouldn't trigger.

**Trade-off:** Storage cost scales linearly with user count per broadcast. At <10K users, this is negligible. At 100K+, batch inserts in chunks would be needed.

---

## Read Model

### Source of Truth

| Data | Source of Truth | Why |
|------|----------------|-----|
| Unread count | `notification_deliveries WHERE user_id = auth.uid() AND read_at IS NULL AND dismissed_at IS NULL` | Deliveries are per-user state |
| Notification list (bell) | `get_user_notifications(limit=20)` RPC | SECURITY DEFINER, bypasses RLS, fast |
| Notification list (page) | `get_user_notifications(limit=100)` RPC | Same RPC, larger limit |
| Notification content | `notifications` table (joined via delivery) | Content is shared across deliveries |

### Read Path Architecture

```
  ┌─────────────────────────────────────────┐
  │          useAppNotifications(limit)      │
  │                                          │
  │  1. Check session (localStorage, no net) │
  │  2. Single-flight dedup check            │
  │  3. Strategy 1: RPC                      │
  │     └── get_user_notifications(p_limit)  │
  │         (SECURITY DEFINER, fast)         │
  │  4. On failure → Strategy 2: Direct      │
  │     └── PostgREST: deliveries + JOIN     │
  │         (goes through RLS)               │
  │  5. Map rows → AppNotification[]         │
  │  6. Cache in module-level Map            │
  │  7. Notify all hook instances via React  │
  └─────────────────────────────────────────┘
```

### RPC: `get_user_notifications`

```sql
SELECT nd.id, nd.notification_id, nd.delivered_at, nd.read_at, nd.dismissed_at,
       n.title, n.message, n.type, n.category, n.action_url, n.action_label
FROM notification_deliveries nd
JOIN notifications n ON n.id = nd.notification_id
WHERE nd.user_id = auth.uid()
  AND nd.dismissed_at IS NULL
ORDER BY nd.delivered_at DESC
LIMIT p_limit;
```

- `SECURITY DEFINER` — runs as function owner, bypasses RLS
- Scoped by `auth.uid()` — cannot leak cross-user
- Excludes dismissed — clean feed

### Direct Query Fallback

```typescript
supabase
  .from('notification_deliveries')
  .select(`id, notification_id, delivered_at, read_at, dismissed_at,
           notifications!inner (title, message, type, category, action_url, action_label)`)
  .is('dismissed_at', null)
  .order('delivered_at', { ascending: false })
  .limit(fetchLimit)
```

- `!inner` join — only returns deliveries where the notification row is also visible via RLS
- RLS on `notification_deliveries`: `user_id = auth.uid()` (correct)
- RLS on `notifications`: must allow `scope='all'` (see E2E-001 fix)

---

## Realtime / Polling

### Architecture

```
┌─────────────────────────────────────────────────┐
│                  Data Freshness                  │
│                                                  │
│  Priority 1: Supabase Realtime                  │
│  ├── Channel: notif_deliveries_${userId}        │
│  ├── Events: INSERT, UPDATE, DELETE             │
│  ├── Filter: user_id=eq.${userId}              │
│  ├── Debounce: 300ms                            │
│  └── Triggers: fetchNotifications()             │
│                                                  │
│  Priority 2: Fallback Polling                   │
│  ├── Interval: 30s (base)                       │
│  ├── Backoff: 2x after 2 failures              │
│  ├── Max backoff: 120s                           │
│  ├── Circuit breaker: 6 failures → stop         │
│  ├── Resume: on tab focus/visibility             │
│  └── Gated: only when tab visible + online      │
│                                                  │
│  Priority 3: User Action Triggers               │
│  ├── Tab becomes visible (visibilitychange)     │
│  ├── Window gains focus                          │
│  ├── Goes online (online event)                  │
│  └── Cooldown: 2s between triggers              │
└─────────────────────────────────────────────────┘
```

### Realtime Publication

`notification_deliveries` is added to the `supabase_realtime` publication. Events on this table trigger channel messages to subscribed clients. The channel is user-scoped: `notif_deliveries_${userId}`.

**Important:** Realtime events bypass RLS (they are emitted by the DB server). The client-side filter (`user_id=eq.${userId}`) is enforced by Supabase Realtime's built-in filtering. This means even if `notifications` RLS is broken, realtime events for deliveries still fire correctly.

---

## Read/Unread, Mark All Read, Optimistic UI

### State Machine

```
Delivery states:
  UNREAD:    read_at IS NULL, dismissed_at IS NULL    → visible, highlighted
  READ:      read_at IS NOT NULL, dismissed_at IS NULL → visible, normal
  DISMISSED: dismissed_at IS NOT NULL                  → hidden from all queries
```

### Optimistic UI Pattern

All user actions (mark read, mark all read, dismiss) follow this pattern:

```
1. Update React state immediately (optimistic)
   - mark-read: set readAt = new Date()
   - mark-all: set readAt = new Date() for all unread
   - dismiss: remove from array
2. Fire RPC in background
   - mark_notification_read(delivery_id)
   - mark_all_notifications_read()
   - dismiss_notification(delivery_id)
3. On RPC success: no action needed (state already correct)
4. On RPC failure: trigger full refetch to reconcile
```

### Unread Count

Computed client-side from the `notifications[]` array:
```typescript
unreadCount = notifications.filter(n => !n.readAt).length
```

This is eventually consistent:
- Optimistic updates change the count immediately
- Full refetches correct any drift
- No separate RPC call for unread count (computed from the fetched list)

---

## Scope Modelling

### How Scopes Map to Data

The admin UI exposes three scope options; the DB stores only two. The mapping (at `notifications-admin.ts:199`):
```typescript
const dbScope = params.scope === 'global' ? 'all' : 'tenant'
```

| UI Scope | DB `scope` | `tenant_id` | `user_id` on notification | Recipients | Delivery creation |
|----------|-----------|-------------|--------------------------|------------|-------------------|
| Global | `all` | `NULL` | `NULL` | All users (via deliveries) | All non-demo users |
| Organisation | `tenant` | `<tenant_id>` | `NULL` | Tenant members (via deliveries) | All members of tenant |
| Specific users | `tenant` | `<tenant_id>` | `NULL` | Selected users (via deliveries) | Only specified `userIds[]` |
| Ticket event | `tenant` | `<tenant_id>` | `<target_user_id>` | Single user (via delivery) | One delivery row |

**Key insight:** "Specific users" is NOT a separate DB scope. It uses `scope='tenant'` with `tenant_id` set. The audience narrowing happens in the delivery creation logic (only selected user IDs get delivery rows), not in the scope column.

### Tenant Safety

1. **Tenant admin cannot cross tenants** — `isTenantAdmin(tenantId, userId)` verified before send
2. **System admin can do anything** — `isSystemAdmin(user)` checked, allows global scope
3. **RLS enforces on read** — deliveries filtered by `user_id = auth.uid()`, notifications filtered by scope + tenant membership
4. **Deliveries are the gate** — even if notifications RLS were misconfigured, a user only sees notifications they have deliveries for

### Read Path Security Model

**Verified:** Users ONLY ever read `notification_deliveries`, never `notifications` directly.

| Read path | Table read | Client type | RLS applies? |
|-----------|-----------|-------------|-------------|
| RPC `get_user_notifications` | `notification_deliveries` JOIN `notifications` | SECURITY DEFINER | No — bypasses RLS |
| Direct query fallback | `notification_deliveries` with `!inner` JOIN | Browser client | Yes — both tables |
| Admin `listRecentNotifications()` | `notifications` only | Service role | No — bypasses RLS |

The `notifications` RLS SELECT policy only matters for the `!inner` join in the direct query fallback. The `notification_deliveries` RLS (`user_id = auth.uid()`) is the primary security gate.

### UPDATE Policy: Dead Code

No application code (client or server action) ever UPDATEs the `notifications` table through an RLS-bound path. The only UPDATEs happen in SECURITY DEFINER RPCs (`process_scheduled_notifications`, `generate_notification_deliveries`). The `notifications_update` policy is dead code.

---

## Idempotency Model

### `event_key` Semantics

```sql
CREATE UNIQUE INDEX notifications_event_key_unique_idx
  ON public.notifications USING btree (user_id, event_key)
  WHERE (event_key IS NOT NULL);
```

| Scenario | `user_id` | `event_key` | Index prevents dupes? |
|----------|----------|-------------|----------------------|
| Ticket notification | `<target_user_id>` | `ticket:123:new_reply:...` | ✅ Yes — same user+key rejected |
| Admin broadcast (global) | `NULL` | `NULL` (not set) | ❌ No — WHERE clause excludes NULLs |
| Admin broadcast (with dedup key) | `NULL` | `broadcast:global:...` | ❌ No — `NULL != NULL` in btree index |

**Implication:** Ticket notifications have DB-enforced idempotency. Admin broadcasts do NOT — duplicate broadcasts create duplicate notification + delivery rows. The `isSending` UI state provides only client-side protection.

---

## How Preferences Should Relate to Admin/System Notifications

### Current State
Preferences (`notification_preferences`) are stored but not enforced during send or display. All broadcasts go to all eligible users regardless of their preference settings.

### Recommended Architecture

**Admin/system broadcasts should bypass preferences.** Reasoning:

1. In-app only — no external delivery channel to control
2. Admin broadcasts are rare and intentional
3. System notifications (maintenance, policy changes) must reach all users
4. This is standard industry practice (Slack, GitHub, etc.)

**Category-based preferences should be enforced for automated notifications:**
- Ticket notifications: respect `support_notifications` flag
- Achievement notifications: respect `achievement_notifications` flag
- Billing notifications: respect `billing_notifications` flag

**Implementation approach:** Add preference check in `createTicketNotification` before creating delivery:
```typescript
const { data: prefs } = await supabase
  .from('notification_preferences')
  .select('support_notifications')
  .eq('user_id', params.userId)
  .maybeSingle()

if (prefs?.support_notifications === false) {
  return { success: true, skipped: true }
}
```

**This is a post-launch enhancement.** For launch, all notifications are delivered regardless of preferences.

---

## Component Map

```
┌── Server Layer ──────────────────────────────────────┐
│                                                       │
│  app/actions/notifications-admin.ts                  │
│  ├── sendAdminNotification()                          │
│  ├── checkNotificationAdminAccess()                  │
│  ├── listTenantsForNotifications()                   │
│  └── listUsersInTenant()                             │
│                                                       │
│  app/actions/notifications-user.ts                   │
│  └── createTicketNotification()                      │
│                                                       │
│  app/api/accounts/profile/notifications/route.ts     │
│  ├── GET (fetch preferences)                         │
│  └── PATCH (update preferences)                      │
│                                                       │
├── Database Layer ────────────────────────────────────┤
│                                                       │
│  Tables: notifications, notification_deliveries,     │
│          notification_preferences, notification_log   │
│                                                       │
│  RPCs: get_user_notifications,                       │
│         mark_notification_read,                       │
│         mark_all_notifications_read,                  │
│         dismiss_notification,                         │
│         get_unread_notification_count,                │
│         generate_notification_deliveries,             │
│         process_scheduled_notifications               │
│                                                       │
├── Client Hook Layer ─────────────────────────────────┤
│                                                       │
│  hooks/useAppNotifications.ts                        │
│  └── useAppNotifications(limit)                      │
│      ├── Single-flight dedup (module-level)          │
│      ├── RPC + direct query fallback                 │
│      ├── Realtime subscription                        │
│      ├── Polling with backoff                         │
│      ├── Circuit breaker                              │
│      └── Optimistic actions                           │
│                                                       │
│  components/admin/useRealAdminNotifications.ts       │
│  └── Maps useAppNotifications → AdminNotification    │
│                                                       │
├── UI Layer ──────────────────────────────────────────┤
│                                                       │
│  components/app/NotificationBell.tsx                 │
│  ├── Bell icon (webp + SVG fallback)                 │
│  ├── Unread badge                                     │
│  ├── Dropdown with recent notifications              │
│  └── Mark read / dismiss actions                     │
│                                                       │
│  app/app/notifications/page.tsx                      │
│  ├── Full notification list                           │
│  ├── Filter tabs (all / unread / read)               │
│  ├── Mark read / mark all / dismiss                  │
│  └── Loading / error / empty states                  │
│                                                       │
│  components/admin/AdminNotificationsCenter.tsx       │
│  └── Admin bell dropdown (wraps real data)           │
│                                                       │
│  app/admin/notifications/page.tsx                    │
│  ├── Scope selector (global / tenant / users)        │
│  ├── Recipient picker                                 │
│  ├── Notification form                                │
│  └── Send action                                      │
│                                                       │
│  app/app/components/app-topbar.tsx                   │
│  └── Renders NotificationBell in topbar              │
│                                                       │
└──────────────────────────────────────────────────────┘
```

---

## Invariants

These must always hold true:

1. **Every visible notification has a delivery row** — no notification without a delivery is ever shown to a user
2. **Deliveries are scoped to one user** — `user_id` on deliveries is NOT NULL and matches `auth.uid()` for all queries
3. **Notifications are immutable after send** — content is never modified after creation (only status can change)
4. **Unread count = count of deliveries where `read_at IS NULL AND dismissed_at IS NULL`** — no separate counter table
5. **Dismissed = soft-deleted** — `dismissed_at IS NOT NULL` hides from all views, but row persists for analytics
6. **Tenant-scoped notifications have non-null tenant_id** — enforced by CHECK constraint
7. **Global notifications have null tenant_id** — enforced by CHECK constraint
8. **Service role is used for all writes** — notifications are created server-side only, never from the browser
9. **RPC is the primary read path** — `SECURITY DEFINER` RPCs are faster and avoid RLS complexity
10. **Direct query is the fallback** — must produce identical results to RPC (requires correct RLS)

---

## Scheduled Notifications: Disconnected

The `process_scheduled_notifications()` RPC function exists in the baseline (line 12784). It processes notifications with `status = 'scheduled'` and `schedule_at <= now()`, generates deliveries, and sets `status = 'sent'`.

**However:** The `cron.schedule()` call that would run this function automatically at `02:00 UTC` daily is ONLY in the archived migration (`20260130110000_notification_worker.sql:124`) — it was never applied to the baseline. The function is defined but never called.

**Current behavior:** Admin sets `schedule_at` → notification stored with `status = 'scheduled'` → nothing picks it up → notification is never delivered.

**This is a known gap, not a bug.** The admin UI always offers immediate send as the primary option.
