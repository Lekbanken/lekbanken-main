# Notifications E2E Audit

## Metadata
- Status: archived
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: notifications
- Scope: Archived notifications end-to-end audit

Superseded audit snapshot retained for provenance. Use the active notifications audit instead of this archived record for current risk and verification status.

---

## Executive Summary

**The notifications system is architecturally sound but has one critical RLS bug that silently breaks global broadcasts for the direct-query fallback path.** The RPC path (`get_user_notifications`, `SECURITY DEFINER`) works correctly for all scopes because it bypasses RLS. The direct PostgREST query path fails silently for global broadcasts due to a missing `scope = 'all'` case in the `notifications` SELECT policy.

### Spinner Root Cause — Definitively Proven

**The hook cannot produce a permanent spinner.** Every code path in `fetchNotifications()` terminates with `setIsLoading(false)`:

| Code path | Sets `isLoading(false)` at | Condition |
|-----------|---------------------------|-----------|
| Circuit breaker (6+ failures) | Line 501 | `!hasLoadedOnce` |
| No session | Line 346 (`finishWithoutSession`) | Always |
| Session read error | Line 534 | `!hasLoadedOnce` |
| Dedup reuse success | Line 334 (`applyNotifications`) | Always |
| Dedup reuse failure | Line 565 (finally) | `mounted && !hasLoadedOnce` |
| Main fetch success | Line 636 (`applyNotifications`) | Always |
| Main fetch failure | Line 653 (finally) | `mounted && !hasLoadedOnce` |
| Master timeout abort | Catch → `ac.signal.aborted` → early return, finally still runs → Line 653 | `mounted && !hasLoadedOnce` |

**Worst case:** The master timeout is 20s (page) or 12s (bell). During this window, the spinner is shown on first load only. After first successful load, stale-while-revalidate shows old data.

**If the page shows a spinner**, it means one of:
1. The master timeout (20s) hasn't elapsed yet — resolves itself
2. No notifications exist → spinner resolves to empty state (not stuck)
3. Component unmounted before fetch completed (correct: no state update needed)

### Delivery-Only Read Model — Verified

**Users only ever read `notification_deliveries`, never `notifications` directly.** The sole direct `notifications` SELECT is `listRecentNotifications()` in `app/actions/support-hub.ts` — admin-only, service role. The RLS bug on `notifications` only manifests through the `!inner` join fallback in `useAppNotifications`.

### UPDATE Policy — Dead Code

No client code, server action, or API route ever UPDATEs the `notifications` table. Only two SECURITY DEFINER RPCs do: `process_scheduled_notifications` and `generate_notification_deliveries`. The `notifications_update` RLS policy is effectively dead code. Fixing it is defensive-only.

### Scheduled Processor — Not Connected

The `process_scheduled_notifications()` RPC function exists in the baseline. But the `cron.schedule()` call that would run it automatically is **only in an archived migration** — it was never applied to the baseline. The function exists but is never called. `pg_cron` may or may not be enabled.

### Finding Summary

| ID | Finding | Severity | Status vs Audit #13 |
|----|---------|----------|---------------------|
| E2E-001 | ~~**RLS policy missing `scope='all'` case**~~ | ~~**P1**~~ | ✅ **LÖST** — Migration `20260316200000` |
| E2E-002 | ~~Admin broadcast has no Zod validation~~ | ~~P2~~ | ✅ **LÖST** — Zod schema in `notifications-admin.ts` |
| E2E-003 | ~~Admin broadcast has no idempotency~~ | ~~P2~~ | ✅ **LÖST** — Best-effort dedup (query + client debounce) |
| E2E-004 | Admin broadcast has no rate limit | P3 | Confirms NOTIF-002, downgraded |
| E2E-005 | Preferences not enforced on send | P3 | Confirms NOTIF-004, downgraded |
| E2E-006 | ~~Preferences API missing Zod + rate limit~~ | ~~P2~~ | ✅ **LÖST** — Zod + rateLimit in route.ts |
| E2E-007 | Scheduled notifications no processor | P3 | Confirms NOTIF-007 |
| E2E-008 | `notifications` INSERT policy too restrictive | P2 | **NEW** |
| E2E-009 | ~~Bell dropdown "View all" link missing~~ | ~~P3~~ | ✅ **LÖST** — Always visible in bell |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        ADMIN LAYER                                   │
│                                                                      │
│  /admin/notifications (page.tsx)                                     │
│  └─► sendAdminNotification() (server action)                        │
│      └─► createServiceRoleClient() (bypasses RLS)                   │
│          ├─► INSERT into notifications (scope, tenant_id, ...)      │
│          └─► INSERT into notification_deliveries (per user)         │
│                                                                      │
│  /app/actions/notifications-user.ts                                  │
│  └─► createTicketNotification() (server action)                     │
│      └─► createServiceRoleClient()                                  │
│          ├─► INSERT notification (event_key for idempotency)        │
│          └─► INSERT delivery (one per affected user)                │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       DATABASE LAYER                                 │
│                                                                      │
│  notifications                    notification_deliveries            │
│  ┌────────────────────┐          ┌──────────────────────────┐       │
│  │ id (PK)            │◄────────│ notification_id (FK)      │       │
│  │ tenant_id (nullable)│         │ user_id (FK, NOT NULL)    │       │
│  │ user_id (nullable)  │         │ delivered_at              │       │
│  │ scope (all|tenant)  │         │ read_at (nullable)        │       │
│  │ status              │         │ dismissed_at (nullable)   │       │
│  │ title, message, ... │         │ UNIQUE(notif_id, user_id) │       │
│  └────────────────────┘          └──────────────────────────┘       │
│                                                                      │
│  RLS: notifications_select                                           │
│  ├── user_id = auth.uid()                                           │
│  └── user_id IS NULL AND tenant_id IN (user's tenants)              │
│      ⚠️ MISSING: scope = 'all' AND tenant_id IS NULL                │
│                                                                      │
│  RLS: notification_deliveries_select                                │
│  └── user_id = auth.uid()  ✅ correct                               │
│                                                                      │
│  RPCs (SECURITY DEFINER — bypass RLS):                              │
│  ├── get_user_notifications(p_limit)  ✅                            │
│  ├── mark_notification_read(p_delivery_id) ✅                       │
│  ├── mark_all_notifications_read() ✅                               │
│  └── dismiss_notification(p_delivery_id) ✅                         │
└─────────────────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       CLIENT LAYER                                   │
│                                                                      │
│  useAppNotifications(limit)                                          │
│  ├── Strategy 1: RPC get_user_notifications (SECURITY DEFINER)      │
│  │   └── Bypasses RLS → works for all scopes ✅                     │
│  ├── Strategy 2: Direct PostgREST query (through RLS)               │
│  │   └── notifications!inner join → RLS blocks global ⚠️            │
│  ├── Realtime: channel per user_id on notification_deliveries       │
│  ├── Polling: 30s fallback with backoff + circuit breaker           │
│  └── Visibility/online gating                                       │
│                                                                      │
│  Consumers:                                                          │
│  ├── NotificationBell (limit=20, timeout=12s)                       │
│  ├── /app/notifications page (limit=100, timeout=20s)               │
│  └── useRealAdminNotifications (limit=20)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Detailed Findings

### E2E-001 — `notifications` RLS Missing Global Scope (P1) — **NEW, CRITICAL**

**File:** `supabase/migrations/00000000000000_baseline.sql` line 16510  
**Impact:** Global broadcasts (`scope='all'`, `tenant_id=NULL`) are **invisible** to users via the direct PostgREST query fallback.

**Current policy:**
```sql
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
USING (
  user_id = auth.uid()
  OR (
    user_id IS NULL
    AND tenant_id IN (
      SELECT tenant_id FROM user_tenant_memberships
      WHERE user_id = auth.uid()
    )
  )
);
```

**Bug:** When a global broadcast is created:
- `notifications.user_id = NULL` → first condition fails
- `notifications.tenant_id = NULL` → `NULL IN (...)` always evaluates to `NULL`/false → second condition fails
- **Result:** RLS blocks this row. The `!inner` join in the direct query drops the entire delivery row silently.

**Why RPC still works:** `get_user_notifications` is `SECURITY DEFINER` — it reads the tables as the function owner (bypasses RLS). So the primary fetch path works. The bug only manifests when:
1. RPC times out and falls back to direct query, OR
2. A future refactor removes the RPC path

**Required fix:**
```sql
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
USING (
  user_id = (SELECT auth.uid())
  OR (
    user_id IS NULL
    AND (
      scope = 'all'
      OR tenant_id IN (
        SELECT tenant_id FROM user_tenant_memberships
        WHERE user_id = (SELECT auth.uid())
      )
    )
  )
);
```

**Severity justification:** P1 because:
- It's a latent data-visibility bug
- Under load (RPC timeout), users lose all global notifications
- The fallback path is specifically designed for resilience — if it's broken, the resilience story collapses
- An attempted fix was archived but still had the same bug

---

### E2E-002 — No Zod Validation on Admin Broadcast Input (P2)

**File:** `app/actions/notifications-admin.ts` lines 168–170  
**Status:** Confirms NOTIF-003 from audit #13.

**Fact (verified in code):** Validation is manual `.trim()` checks:
```typescript
if (!params.title?.trim() || !params.message?.trim()) {
  return { success: false, error: 'Titel och meddelande krävs' }
}
```

No length limits (title could be arbitrary length — DB column is `VARCHAR(255)` so it will truncate/error). No enum validation on `type` or `category`.

**Risk:** Low actual risk since admin-only + DB constraints provide some bounds. But lacks defense-in-depth and will produce confusing DB errors instead of user-friendly validation messages.

---

### E2E-003 — Admin Broadcast No Idempotency (P2)

**File:** `app/actions/notifications-admin.ts` lines 160–398  
**Status:** Confirms NOTIF-001 from audit #13.

**Fact:** Each call to `sendAdminNotification` creates a new `notifications` row + N delivery rows. No dedup key. The `UNIQUE(notification_id, user_id)` on deliveries prevents duplicate deliveries *per notification*, but double-clicking creates two separate notifications.

**Mitigating factors:** Admin-only, low frequency. Client-side debounce on the button partially mitigates (the `isSending` state disables the button during send).

---

### E2E-004 — No Rate Limit on Admin Broadcast (P3)

**File:** `app/actions/notifications-admin.ts`  
**Status:** Downgraded from P2 in audit #13 to P3.

**Reasoning:** Server actions are not accessible via public API endpoints. They require authentication + CSRF. The `isSending` state in the admin UI prevents rapid re-clicks. Admin user count is small. The risk of abuse is very low in practice.

---

### E2E-005 — User Preferences Not Enforced on Send (P3)

**File:** `app/actions/notifications-admin.ts` — no reference to `notification_preferences`  
**Status:** Downgraded from P2 to P3. This is a product decision, not a bug.

**Fact:** All notifications are in-app only. No email/push. The impact of ignoring preferences is limited to badge count clutter. System/admin broadcasts typically bypass per-category preferences in most products.

---

### E2E-006 — Preferences API Missing Validation (P2)

**File:** `app/api/accounts/profile/notifications/route.ts`  
**Status:** Confirms NOTIF-006.

**Verified:** The PATCH endpoint uses `typeof` checks. No length/format validation on time fields. No rate limit specified (though `apiHandler` provides basic auth). Uses `createServiceRoleClient()` (service key) for reads — this is intentional since user might not have an RLS-visible row yet.

---

### E2E-007 — Scheduled Notifications: Processor Exists But Not Connected (P3)

**Files:** 
- `app/actions/notifications-admin.ts` lines 196–199 (sets `status: 'scheduled'`)
- Baseline migration line 12784: `process_scheduled_notifications()` RPC exists
- Archived migration `20260130110000_notification_worker.sql`: contains `cron.schedule()` call

**Verified finding:** The processor RPC **exists in the baseline** (line 12784), but the `cron.schedule()` call is **only in the archived migration** — it was never incorporated into the baseline. This means:
1. The function exists in the database but is never automatically executed
2. The `cron.schedule('process-scheduled-notifications', '0 2 * * *', ...)` call at archived line 124 was not applied
3. Even if manually called, it's unclear whether `pg_cron` is enabled in production
4. The admin UI allows setting `schedule_at` but the scheduled notification will never be processed

**Impact:** Scheduled notifications are silently lost. The admin can set a schedule date, the status is stored as `'scheduled'`, but no cron job picks it up. Manual immediate sends (`status: 'sent'`) work correctly.

**This is P3 because scheduled notifications are an undocumented/untested feature and the admin can always send immediately.**

---

### E2E-008 — `notifications` INSERT Policy Too Restrictive (P2) — **NEW**

**File:** `supabase/migrations/00000000000000_baseline.sql` line 16514  
**Current policy:**
```sql
CREATE POLICY "notifications_service_insert" ON public.notifications FOR INSERT
  WITH CHECK (public.is_system_admin());
```

**Issue:** This requires the inserting user to be a system admin. Currently not a problem because `createServiceRoleClient()` bypasses RLS entirely. But if code is ever refactored to use RLS client, or if a tenant admin tries to send via an RLS-bound path, inserts will fail silently.

**Recommendation:** Keep using service role for inserts (current approach is correct). Document this as an architectural decision — notifications are always created server-side with elevated privileges.

---

### E2E-009 — Bell Dropdown Missing "View All" Link (P3) — **NEW**

**File:** `components/app/NotificationBell.tsx`  
**Issue:** The bell dropdown shows notifications and has mark-as-read/dismiss buttons, but there's no "View all notifications" link to `/app/notifications`. Users must find the page via another route.

**UI impact:** Low — the page exists and is accessible. But adding a "Se alla" link in the bell footer would complete the UX loop.

---

## Verified Positive Findings

All positive findings from audit #13 were re-verified against current code:

| # | Claim | Verified? | Evidence |
|---|-------|-----------|----------|
| P1 | Ticket idempotency via event_key | ✅ | `notifications-user.ts:44-55` — generates unique event keys, handles `23505` |
| P2 | Tenant isolation via RLS | ⚠️ Partial | `notification_deliveries`: ✅ (`user_id = auth.uid()`). `notifications`: ⚠️ Missing global scope case |
| P3 | Delivery dedup UNIQUE constraint | ✅ | `UNIQUE(notification_id, user_id)` confirmed in baseline |
| P4 | User-scoped realtime channels | ✅ | `useAppNotifications.ts:805` — channel `notif_deliveries_${user.id}` |
| P5 | Realtime cleanup on unmount | ✅ | `supabase.removeChannel(channel)` in cleanup |
| P6 | Debounced refetch (300ms) | ✅ | `REALTIME_DEBOUNCE_MS = 300` |
| P7 | Fallback polling with backoff | ✅ | 30s → exponential → max 120s, circuit breaker at 6 failures |
| P8 | RPC cooldown with backoff | ✅ | 60s → 120s → 300s max |
| P9 | No XSS risk | ✅ | All title/message rendered as text nodes |
| P10 | No external dependencies | ✅ | In-app only |
| P11 | No spam loop | ✅ | No notification-triggered-notifications |
| P12 | Optimistic + reconciliation | ✅ | `markAsRead`, `markAllAsRead`, `dismiss` all use optimistic + refetch on error |
| P13 | AbortController | ✅ | Every fetch has AC, in-flight abort on new fetch |
| P14 | Mark-all-read count | ✅ | RPC returns `ROW_COUNT` |
| P15 | Indexes | ✅ | All critical paths indexed |
| P16 | Visibility/online gating | ✅ | No fetches when tab hidden or offline |

---

## Scope Model Verification

### DB Scope vs UI Scope

The admin UI has three scope options (`global`, `tenant`, `users`). The DB has only two scope values (`all`, `tenant`). Mapping is at `notifications-admin.ts:199`:

```typescript
const dbScope = params.scope === 'global' ? 'all' : 'tenant'
```

| UI Scope | DB `scope` | `tenant_id` | `user_id` on notification | Deliveries created for |
|----------|-----------|-------------|--------------------------|----------------------|
| `global` | `all` | `NULL` | `NULL` | All non-demo users |
| `tenant` | `tenant` | `<selected>` | `NULL` | All members of tenant |
| `users` | `tenant` | `<selected>` | `NULL` | Only selected user IDs |

**Key insight:** "Specific users" is NOT a separate DB scope. It stores `scope='tenant'` with `tenant_id` set, but only creates delivery rows for the selected user IDs (not all tenant members). The scope model is audience-selection logic, not a DB concept.

---

## event_key / Dedup Verification

### Partial Index Behavior

The unique index on `event_key` is:
```sql
CREATE UNIQUE INDEX notifications_event_key_unique_idx
  ON public.notifications USING btree (user_id, event_key)
  WHERE (event_key IS NOT NULL);
```

**Implication for admin broadcasts:**
- Admin broadcasts set `user_id = NULL` on the notification row
- PostgreSQL: `NULL != NULL` in unique indexes → the constraint **does not prevent** duplicate broadcasts
- An admin can send the same title+message globally twice → two notification rows, two full sets of delivery rows
- The current code has `isSending` state to prevent double-clicks, but nothing prevents intentional re-sends

**Implication for ticket notifications:**
- Ticket notifications set `user_id = <target_user_id>` → the unique index works correctly
- `event_key` pattern: `ticket:{id}:{event}:{detail}:{date}`
- On duplicate `23505` → caught gracefully, no-op ✅

### Dedup Key Proposal Update

The B.3 dedup key proposal in the implementation plan should NOT rely on the existing `UNIQUE(user_id, event_key)` index for broadcast dedup, because `user_id` is NULL for broadcasts. Instead, a separate approach is needed:
- Option A: Add a new unique index `UNIQUE(event_key) WHERE event_key IS NOT NULL AND user_id IS NULL`
- Option B: Use a time-window check query (no schema change) as proposed in B.3

---

## Admin-Only `notifications` Read: `listRecentNotifications()`

**File:** `app/actions/support-hub.ts` line 632  
**Client:** Service role (bypasses RLS)  
**Access:** Admin-guarded (`assertAdminAccess()`)

This function reads `notifications` directly (not through deliveries) for the admin support hub. It shows `is_read` from the `notifications` table — but this field is stale/unreliable since actual read state is tracked per-user in `notification_deliveries.read_at`. Minor display issue, admin-facing only.

---

## UPDATE Policy on `notifications`: Dead Code

No code in the application ever UPDATEs the `notifications` table through an RLS-bound client:

| UPDATE operation | Location | Client type | RLS applies? |
|------------------|----------|-------------|-------------|
| `SET status='sent', sent_at=now()` | `process_scheduled_notifications` RPC (baseline:12836) | SECURITY DEFINER | No |
| `SET status='sent', sent_at=now()` | `generate_notification_deliveries` RPC (baseline:11253) | SECURITY DEFINER | No |

**Conclusion:** The `notifications_update` RLS policy is dead code. No client-side code ever triggers it. Fixing it is purely defensive and low priority.

---

## Root Cause Analysis: Why `/app/notifications` Shows Spinner

### Definitive Answer: No Permanent Spinner Possible

After tracing every `setIsLoading` call site (8 total) in `useAppNotifications.ts`, **the hook cannot get stuck in `isLoading=true` for a mounted component.** Every exit path resolves `isLoading` to `false`.

The initial state is `isLoading=true` (line 299). After the first successful load, `hasLoadedOnce` is set to `true`, and subsequent fetches use stale-while-revalidate (old data stays visible during refresh).

**If a spinner is observed, it is one of:**

1. **The master timeout is in-flight** (20s for page, 12s for bell) — this resolves itself
2. **No notifications exist** — the spinner resolves to the empty state card ("Inga notifikationer") after the fetch completes. This is correct behavior, not a bug
3. **The screenshot captured a brief loading state** — normal transient state during initial page render

### The RLS Bug's Actual Impact

The RLS bug (E2E-001) does **not** cause spinners. It causes **silently missing data** in the direct query fallback:
1. RPC succeeds → correct data shown (global broadcasts included) ✅
2. RPC fails → fallback direct query → `!inner` join on `notifications` → RLS blocks global broadcasts → returns `[]` for those → user sees empty state instead of their global notifications ❌
3. RPC fails → fallback direct query → tenant broadcasts → RLS allows (tenant_id matches) ✅

**Bottom line:** The spinner is not a bug. The missing data is.

---

## Data Flow Verification — End to End

### Admin → Global Broadcast
```
1. Admin clicks "Send" in /admin/notifications
2. handleSend() → sendAdminNotification({ scope: 'global', ... })
3. Server action (createServiceRoleClient, bypasses RLS):
   a. INSERT notifications (scope='all', tenant_id=NULL, status='sent')
   b. SELECT all users from users table
   c. Filter out demo users (if excludeDemoUsers=true)
   d. INSERT notification_deliveries for each user
4. Realtime triggers for each user's channel
5. debounced refetch (300ms) → RPC get_user_notifications
6. Bell updates unread count, page shows notification
```
**Verified:** ✅ Working end-to-end via RPC path.  
**Risk:** If RPC fails, direct query fallback will silently return [] for global broadcasts due to E2E-001.

### Admin → Tenant Broadcast
```
Same as above, except:
- scope='tenant', tenant_id=<selected>
- Deliveries only for members of that tenant
- RLS direct query fallback: ✅ Works (tenant_id IN user's tenants)
```
**Verified:** ✅ Working end-to-end via both paths.

### Admin → Specific Users
```
Same as above, except:
- scope='tenant', tenant_id=<selected>
- Deliveries only for specified userIds
```
**Verified:** ✅ Working.

### Ticket → Notification
```
1. Support action triggers createTicketNotification()
2. Inserts notification with event_key (idempotent)
3. Inserts delivery for affected user
4. Realtime → bell updates
```
**Verified:** ✅ Working. Idempotency via event_key confirmed.

---

## Bell vs Page — Data Consistency

| Aspect | Bell | Page | Consistent? |
|--------|------|------|-------------|
| Hook | `useAppNotifications(20)` | `useAppNotifications(100)` | ✅ Same source |
| Master timeout | 12s | 20s | ✅ Appropriate |
| RPC path | `SECURITY DEFINER` | `SECURITY DEFINER` | ✅ Same |
| Direct fallback | Same query | Same query | ✅ Same |
| Realtime | Same channel | Same channel | ✅ Shared via refcount |
| Unread count | Computed from notifications[] | Computed from notifications[] | ✅ Same logic |
| Module-level dedup | Shared `inFlightRequests` Map | Shared `inFlightRequests` Map | ✅ Superset-aware |

**No data consistency issues between bell and page.** Both read from the same hook, which shares module-level state. The only difference is limit (bell=20, page=100), which the superset-aware dedup handles correctly.

---

## Priority Matrix

### Must Fix Now (before this feature is "complete")
1. **E2E-001** — Fix `notifications` RLS to include `scope='all'` case
2. **E2E-002** — Add Zod validation to `sendAdminNotification`

### Should Fix Soon (hardening)
3. **E2E-003** — Add client debounce + server dedup key for broadcasts
4. **E2E-006** — Add Zod + rate limit to preferences API
5. **E2E-009** — Add "View all" link in bell dropdown

### Can Wait (post-launch polish)
6. **E2E-004** — Rate limiting on admin actions
7. **E2E-005** — Preference enforcement on send (product decision)
8. **E2E-007** — Verify scheduled notification processor is active
9. **E2E-008** — Document INSERT policy architecture decision
