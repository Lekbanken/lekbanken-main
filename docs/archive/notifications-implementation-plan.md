# Notifications Implementation Plan

## Metadata
- Status: archived
- Date: 2026-03-16
- Last updated: 2026-03-21
- Last validated: 2026-03-21
- Owner: notifications
- Scope: Archived notifications implementation plan

Superseded implementation-plan snapshot retained for provenance. Use the active notifications plan instead of this archived record for current execution status.

### Verification Status

| Layer | Status | Date | Notes |
|-------|--------|------|-------|
| **DB/RLS/RPC verification** | ✅ **Completed** | 2026-03-17 | 12/12 SQL-level tests passed (global visibility, tenant isolation, user-specific, unread count, mark read, mark all read, dismiss) |
| **Browser/UI verification** | ⏳ **Pending** | — | Blocked by local auth seed mismatch (now fixed, see below). Requires manual smoke-test. |

**Auth seed fix (2026-03-17):** Passwords in `supabase/seed.sql` aligned with `.env.local` test credentials (`Rapid$teel261`). System admin JWT now includes `global_role: system_admin` in both `app_metadata` and `user_metadata`.

---

## Target State

An admin can send notifications to:
1. **All users globally** (system admin only)
2. **All users in a specific organisation**
3. **Specific individual users**

Each recipient:
- Sees the notification in the **bell dropdown** (appshell topbar)
- Sees the notification in **`/app/notifications`** (full list view)
- Can mark as read, mark all as read, dismiss
- Gets realtime updates (with polling fallback)

---

## Assumptions

1. No email/push delivery — in-app only (unchanged)
2. We fix bugs and harden — no architectural rewrite
3. Admin UI already works (verified) — focus is on data flow + client correctness
4. Supabase Realtime is enabled for `notification_deliveries` (verified)
5. Service role is used for all server-side writes (correct, unchanged)
6. i18n strings exist for both admin and app notification pages (verified)

---

## Block A — E2E Functional Fix (Must-do)

**Goal:** Fix the critical RLS bug and ensure global broadcasts are visible to all users.

### A.1 — Fix `notifications` SELECT RLS policy ✅ KLAR (2026-03-17)

**What:** Add `scope = 'all'` case to the `notifications_select` policy so global broadcasts (where `tenant_id IS NULL`) are visible to authenticated users.

**Migration file:** `supabase/migrations/20260316200000_fix_notifications_global_rls.sql`

```sql
-- Fix notifications_select to include global broadcasts (scope='all', tenant_id IS NULL)
-- Previously missing: global broadcasts were invisible through direct PostgREST queries
-- RPC path (get_user_notifications) was unaffected since it's SECURITY DEFINER

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;

CREATE POLICY "notifications_select" ON public.notifications FOR SELECT
  USING (
    user_id = (SELECT auth.uid())
    OR (
      user_id IS NULL
      AND (
        scope = 'all'
        OR tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships
          WHERE user_id = (SELECT auth.uid())
        )
      )
    )
  );
```

**UPDATE policy intentionally NOT changed** — confirmed dead code. GPT constraint: "Ändra INTE `notifications_update`". The UPDATE policy was kept as-is per explicit instruction:
```sql
DROP POLICY IF EXISTS "notifications_update" ON public.notifications;

CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE
  USING (
    user_id = (SELECT auth.uid())
    OR (
      user_id IS NULL
      AND (
        scope = 'all'
        OR tenant_id IN (
          SELECT tenant_id FROM public.user_tenant_memberships
          WHERE user_id = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    user_id = (SELECT auth.uid())
  );
```

**Files changed:** 1 new migration file  
**Risk:** Low — additive change. Makes previously-hidden rows visible. No data changes.  
**Rollback:** `DROP POLICY` + recreate old policy.

### A.2 — Verify end-to-end flow manually

**Steps:**
1. Apply migration to dev/staging
2. Send a global broadcast from admin
3. Verify: bell shows unread badge
4. Verify: `/app/notifications` shows the notification
5. Verify: mark as read works
6. Verify: dismiss works
7. Verify: send tenant-scoped notification → only that tenant's users see it
8. Verify: send user-specific notification → only those users see it

**No code changes — verification only.**

---

## Block B — Admin Input Hardening (Should-do)

**Goal:** Add proper validation to the admin broadcast action and the preferences API.

### B.1 — Add Zod schema to `sendAdminNotification` ✅ KLAR (2026-03-17)

**File:** `app/actions/notifications-admin.ts`

Replaced manual validation with Zod schema:

```typescript
import { z } from 'zod'

const SendNotificationSchema = z.object({
  scope: z.enum(['global', 'tenant', 'users']),
  tenantId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  type: z.enum(['info', 'success', 'warning', 'error', 'system']).default('info'),
  category: z.string().max(50).default('system'),
  actionUrl: z.string().url().max(512).optional().or(z.literal('')),
  actionLabel: z.string().max(100).optional().or(z.literal('')),
  scheduleAt: z.string().datetime().optional(),
  excludeDemoUsers: z.boolean().default(true),
})
```

**What changes:**
- Parse `params` through `SendNotificationSchema.safeParse()` at the top of `sendAdminNotification`
- Return `{ success: false, error: result.error.issues[0].message }` on validation failure
- Remove the manual `trim()` checks (Zod handles min/max)
- Keep all existing auth checks unchanged

**Files changed:** 1 (`app/actions/notifications-admin.ts`)  
**Risk:** Low — validation-only change. Might reject previously-accepted edge cases (e.g., title > 255 chars that DB was truncating).

### B.2 — Add Zod validation to preferences PATCH ✅ KLAR (2026-03-17)

**File:** `app/api/accounts/profile/notifications/route.ts`

Added Zod schema for the PATCH body and `rateLimit: 'api'` to both GET and PATCH:

```typescript
const UpdatePreferencesSchema = z.object({
  settings: z.object({
    email_enabled: z.boolean().optional(),
    push_enabled: z.boolean().optional(),
    sms_enabled: z.boolean().optional(),
    inapp_enabled: z.boolean().optional(),
    dnd_enabled: z.boolean().optional(),
    dnd_start_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    dnd_end_time: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
    email_digest: z.enum(['real-time', 'hourly', 'daily', 'weekly', 'never']).optional(),
  }).optional(),
})
```

**What changes:**
- Validate request body with Zod before processing
- Add `rateLimit: 'api'` to the apiHandler config
- Remove the `typeof` checks (replaced by Zod output types)

**Files changed:** 1 (`app/api/accounts/profile/notifications/route.ts`)  
**Risk:** Low.

### B.3 — Add client-side debounce + server dedup key for admin broadcasts ✅ KLAR (2026-03-17)

**File:** `app/actions/notifications-admin.ts` (server) + `app/admin/notifications/page.tsx` (client)

**⚠️ Important:** The existing `UNIQUE(user_id, event_key) WHERE event_key IS NOT NULL` index does NOT prevent duplicate broadcasts because admin broadcasts set `user_id = NULL`, and `NULL != NULL` in PostgreSQL unique indexes. We need a query-based approach:

**Server-side dedup (query-based, no schema change):**
```typescript
// Generate dedup key from content hash
const dedupKey = `broadcast:${scope}:${tenantId ?? 'global'}:${sha256(title + message)}:${fiveMinuteWindow()}`

// Check if recent duplicate exists (query-based — works with NULL user_id)
const { data: existing } = await supabase
  .from('notifications')
  .select('id')
  .eq('event_key', dedupKey)
  .is('user_id', null)    // broadcasts have NULL user_id
  .maybeSingle()

if (existing) {
  return { success: false, error: 'En identisk notifikation skickades nyligen' }
}
```

Set `event_key = dedupKey` on the notification insert. Note: this is a best-effort check (not a constraint), but acceptable for the admin-only, low-volume broadcast use case.

**Client-side:** The `isSending` state already disables the button. Add explicit debounce to `handleSend`:
```typescript
const [lastSentAt, setLastSentAt] = useState(0);

const handleSend = async () => {
  if (Date.now() - lastSentAt < 5000) return; // 5s debounce
  setLastSentAt(Date.now());
  // ... existing send logic
};
```

**Files changed:** 2  
**Risk:** Low. Query-based dedup — no schema changes needed.

---

## Block C — UX / Data Consistency (Should-do)

**Goal:** Complete the user experience so bell and page form a cohesive notification system.

### C.1 — Make "View all" link always visible in bell dropdown footer ✅ KLAR (2026-03-17)

**File:** `components/app/NotificationBell.tsx`

The footer link already existed but was conditionally rendered only when `hasNotifications` was true. Removed the conditional gate so the link is always visible:

```tsx
{/* Footer */}
<div className="border-t border-border px-4 py-2">
  <button
    type="button"
    onClick={() => { setIsOpen(false); router.push('/app/notifications'); }}
    className="w-full text-center text-xs font-medium text-primary hover:underline"
  >
    {t('actions.viewAll')}
  </button>
</div>
```

**Files changed:** 1  
**i18n:** `actions.viewAll` already exists in `messages/sv.json`.

### C.2 — Back navigation on `/app/notifications` page

**File:** `app/app/notifications/page.tsx`

The screenshot shows a "Tillbaka" (back) button at the top. Verify this is wired up correctly in the app layout. The notification page should be wrapped with `canGoBack={true}` on the `AppTopbar`.

**Investigation needed:** Check if a sub-layout or the parent layout passes `canGoBack` to the topbar for this route. If not, add it.

### C.3 — Ensure empty state is clear (not spinner dead-end)

**File:** `app/app/notifications/page.tsx`

**Verified:** The page already handles `isLoading`, `error`, and empty states correctly:
- `isLoading=true` → spinner
- `error` → error card with retry button
- `notifications.length === 0` → proper empty state with bell icon

No changes needed — the current implementation handles all states correctly.

---

## Block D — Optional Post-Launch Follow-ups

These items are safe to defer. Listed for completeness.

### D.1 — Preference enforcement on send (product decision)
- Decide: should admin/system broadcasts respect `notification_preferences` category flags?
- If yes: filter deliveries against preferences in `sendAdminNotification`
- If no: document behavior explicitly

### D.2 — Batch inserts for large broadcasts
- For >1000 users: chunk delivery inserts into batches of 1000
- Currently: all deliveries inserted in one batch (fine for <10K users)

### D.3 — Connect or remove scheduled notification processor
- The `process_scheduled_notifications()` RPC function EXISTS in the baseline (line 12784)
- The `cron.schedule()` call is ONLY in the archived migration — never applied to baseline
- **The function exists but is never automatically called**
- Options:
  - A: Apply the cron schedule manually via Supabase SQL editor (requires `pg_cron` enabled)
  - B: Create a new migration that schedules the cron job
  - C: Remove the `schedule_at` field from the admin UI and mark scheduled notifications as unsupported
- Until resolved, any notification sent with `schedule_at` will have `status='scheduled'` and never be delivered

### D.4 — Add audit trail for admin broadcasts
- Log who sent what, when, to how many users
- Use existing `notification_log` table (currently unused)

### D.5 — Admin notification history view
- The sandbox page (`app/sandbox/admin/notifications/page.tsx`) has UI for listing sent notifications
- Connect to real data if admin needs to review sent broadcasts

---

## Files Affected (Complete List)

| File | Block | Change type |
|------|-------|-------------|
| `supabase/migrations/YYYYMMDDHHMMSS_fix_notifications_global_rls.sql` | A.1 | New migration |
| `app/actions/notifications-admin.ts` | B.1, B.3 | Edit — add Zod schema + dedup key |
| `app/api/accounts/profile/notifications/route.ts` | B.2 | Edit — add Zod + rate limit |
| `app/admin/notifications/page.tsx` | B.3 | Edit — add client debounce |
| `components/app/NotificationBell.tsx` | C.1 | Edit — add "View all" footer link |
| `app/app/notifications/page.tsx` | C.2 | Possibly edit — back navigation |

---

## Test Plan

### Manual Testing (Block A)

| # | Test case | Expected result |
|---|-----------|-----------------|
| 1 | Admin sends global broadcast | All non-demo users see it in bell + page |
| 2 | Admin sends tenant broadcast | Only that tenant's members see it |
| 3 | Admin sends to specific users | Only selected users see it |
| 4 | User clicks notification with actionUrl | Navigates to the URL |
| 5 | User marks single notification as read | Unread badge decrements, notification greys out |
| 6 | User marks all as read | All unread badges clear |
| 7 | User dismisses notification | Notification removed from list |
| 8 | Refresh page → notifications persist | Data loaded from DB |
| 9 | Open in two tabs → send notification | Both tabs update via realtime |
| 10 | Kill network → restore → check bell | Polling recovers, data refreshes |

### Validation Testing (Block B)

| # | Test case | Expected result |
|---|-----------|-----------------|
| 11 | Send with empty title | Zod rejects with clear error |
| 12 | Send with title > 255 chars | Zod rejects |
| 13 | Send with invalid type | Zod rejects |
| 14 | Double-click send button | Second call blocked by dedup |
| 15 | Send same content within 5 min | Server dedup rejects |

### UX Testing (Block C)

| # | Test case | Expected result |
|---|-----------|-----------------|
| 16 | Click "View all" in bell dropdown | Navigates to /app/notifications |
| 17 | No notifications exist | Empty state (bell icon + text), not spinner |
| 18 | Back button on /app/notifications | Returns to previous page |

---

## Acceptance Criteria

### Block A (E2E Fix) — Required
- [x] Global broadcasts are visible to all users via both RPC and direct query ✅ KLAR (2026-03-17)
- [ ] Tenant broadcasts visible only to that tenant's members (requires A.2 manual verification)
- [ ] User-specific notifications visible only to those users (requires A.2 manual verification)
- [ ] Bell unread count matches actual unread notifications (requires A.2 manual verification)
- [ ] `/app/notifications` renders the full list correctly (requires A.2 manual verification)
- [ ] Mark as read / mark all as read / dismiss all function correctly (requires A.2 manual verification)

### Block B (Input Hardening) — Should
- [x] `sendAdminNotification` validates inputs via Zod schema ✅ KLAR (2026-03-17)
- [x] Invalid inputs return clear error messages ✅ KLAR (2026-03-17)
- [x] Duplicate broadcasts within 5-minute window are rejected ✅ KLAR (2026-03-17)
- [x] Preferences PATCH validates inputs and has rate limiting ✅ KLAR (2026-03-17)

### Block C (UX Consistency) — Should
- [x] Bell dropdown has "View all" link to `/app/notifications` ✅ KLAR (2026-03-17)
- [ ] Notifications page shows proper empty state (not spinner) — already working, no change needed
- [ ] Back navigation works on notifications page (C.2 — deferred)

---

## Risk Assessment

### If we implement Block A incorrectly
**Risk:** Making *too many* notifications visible (e.g., cross-tenant leak).  
**Mitigation:** The fix is scoped to `notifications` SELECT policy only. `notification_deliveries` RLS (`user_id = auth.uid()`) remains the primary visibility gate. Even if `notifications` RLS is overly permissive, users can only see deliveries addressed to them.

### If we skip Block A
**Risk:** Global broadcasts silently fail for the direct query fallback path. Under load (RPC timeout), users may see no notifications at all.  
**Impact:** Feature appears broken to end users during high-traffic periods.

### If we implement Block B incorrectly
**Risk:** Overly strict validation rejects valid admin input.  
**Mitigation:** Test with real admin workflow before deploying. Zod errors are user-friendly.

### Rollback strategy
- **Block A:** Drop new policy, recreate old policy. One SQL command per policy.
- **Block B:** Revert file changes (git). No schema changes.
- **Block C:** Revert file changes (git). No schema changes.

---

## Browser/UI Smoke-test Checklist

Run in any environment where auth works correctly (local with fixed seed, staging, or preview).

| # | Step | Role | Expected |
|---|------|------|----------|
| 1 | Logga in som system admin | `test-system-admin@lekbanken.no` | Redirect till `/admin` eller `/app` |
| 2 | Skicka global notification | System admin → Admin → Notifications → Global | Bekräftelsemeddelande visas |
| 3 | Verifiera bell badge | Samma session (eller ny flik) | Bell visar unread badge (röd prick med siffra) |
| 4 | Verifiera `/app/notifications` | Klicka bell → "Visa alla" | Notifikationen visas i full lista |
| 5 | Mark read | Klicka på notifikationen | Badge decrementerar, notification greys out |
| 6 | Mark all read | Klicka "Markera alla som lästa" | Alla badges försvinner |
| 7 | Dismiss | Klicka dismiss-knappen | Notifikationen försvinner från listan |
| 8 | Skicka tenant-scoped notification | System admin → scope: tenant | Bara tenant-medlemmar ser den |
| 9 | Logga in som tenant user | `test-tenant-admin@lekbanken.no` | Ser tenant-notification, ser INTE notifications till andra tenants |
| 10 | Verifiera scope-isolation | Tenant user → `/app/notifications` | Ser global + egen tenant, inte andra tenants |

**Noteringar:**
- Steg 1-7 kan göras med valfri admin-user
- Steg 8-10 kräver minst två inloggningar (system admin + tenant user)
- Dedup: steg 2 med samma titel/meddelande inom 5 min → server avvisar duplicate
- Client debounce: dubbelklick på "Skicka" → andra klicket blockeras (5s cooldown)
