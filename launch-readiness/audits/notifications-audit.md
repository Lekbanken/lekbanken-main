# Notifications Audit (#13) — Domain

**Status:** ✅ GPT-calibrated  
**Date:** 2026-03-12  
**GPT Calibration:** 2026-03-12 — NOTIF-005 P2→P3. All other severities confirmed.  
**Scope:** Notification creation, delivery, read status, realtime subscriptions, preferences, broadcasts, input validation, client hooks  
**Method:** Static code analysis + subagent deep scan. Key files verified independently.

---

## Executive Summary

**8 findings (0 P0, 0 P1, 5 P2, 3 P3)**

| Severity | Count | Launch Impact |
|----------|-------|---------------|
| P0 | 0 | — |
| P1 | 0 | — |
| P2 | 5 | Post-launch hardening |
| P3 | 3 | Polish |

The notification system is **launch-ready with no blockers**. Architecture is clean: two creation paths (admin broadcast + ticket events), idempotent ticket notifications, tenant-scoped RLS, UNIQUE constraint on deliveries, user-scoped realtime channels with debounced refetch, circuit breaker, and exponential backoff. All notifications are **in-app only** (no email/push) — reducing blast radius considerably.

---

## Findings

### NOTIF-001 — Admin Broadcast No Idempotency (P2)

**File:** `app/actions/notifications-admin.ts` lines 159–350  
**Risk:** If admin clicks "Send" twice, two identical notifications are created. No request dedup key.

**Evidence:**
- `sendAdminNotification` inserts a new `notifications` row on each call
- No UNIQUE constraint on (title + message + scope + tenant_id + created_by) or similar
- Ticket notifications have idempotency via `event_key` — broadcasts do not

**Mitigating factors:**
- UNIQUE constraint on `notification_deliveries(notification_id, user_id)` prevents duplicate *deliveries* per notification
- Duplicate clicks = 2 notifications with separate delivery sets (user sees same message twice)
- Admin-only action — low frequency

**Recommendation:** Add client-side debounce + server-side dedup key (hash of scope + tenantId + title + message + 5-minute window).

---

### NOTIF-002 — No Rate Limiting on Admin Broadcast (P2)

**File:** `app/actions/notifications-admin.ts` line 159  
**Risk:** Server action not wrapped in `apiHandler` — no rate limiting. Admin could call repeatedly.

**Evidence:**
- `sendAdminNotification` is a `'use server'` action, not an HTTP route
- Server actions bypass `apiHandler` rate limiting infrastructure
- No inline rate limiting

**Mitigating factors:**
- Requires authenticated admin (system admin for global, tenant admin for tenant scope)
- Small admin user count in practice
- Each call creates at most 1 notification + N deliveries (bounded by tenant member count)

**Recommendation:** Add inline rate check (1 broadcast per admin per minute) or document as admin responsibility.

---

### NOTIF-003 — No Zod Validation on Broadcast Input (P2)

**File:** `app/actions/notifications-admin.ts` lines 164–165  
**Risk:** Validation is manual `.trim()` checks only. No length limits on title/message. No enum validation on type/category.

**Evidence:**
```typescript
if (!params.title?.trim() || !params.message?.trim()) {
  return { success: false, error: 'Titel och meddelande krävs' }
}
```
- `title` could be 1MB of text — DB column is TEXT (unlimited)
- `type` accepts any string (should be `info | success | warning | error | system`)
- `category` accepts any string (should be constrained)

**Mitigating factors:**
- Admin-only action — attacker must be authenticated admin
- No XSS risk: React renders title/message as text nodes, not raw HTML (verified in `NotificationBell.tsx` and `AdminNotificationsCenter.tsx`)
- DB constraints (VARCHAR(50) on type) provide some bounds

**Recommendation:** Add Zod schema:
```typescript
const SendNotificationSchema = z.object({
  scope: z.enum(['global', 'tenant', 'users']),
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  type: z.enum(['info', 'success', 'warning', 'error', 'system']).default('info'),
  category: z.string().max(50).default('system'),
  // ...
})
```

---

### NOTIF-004 — User Preferences Not Enforced on Send (P2)

**File:** `app/actions/notifications-admin.ts` — no reference to `notification_preferences`  
**Risk:** Admin broadcasts and ticket notifications ignore user's notification preferences entirely. Users who set `support_notifications = false` still receive ticket notifications.

**Evidence:**
- `sendAdminNotification`: delivers to all users in scope — no preference check
- `createTicketNotification`: delivers to affected user — no preference check
- `notification_preferences` table has category flags (`billing_notifications`, `support_notifications`, etc.) but they're never queried during send

**Mitigating factors:**
- All notifications are **in-app only** (no email/push) — so this is about badge count clutter, not unwanted emails
- Common product pattern: system/admin notifications bypass per-category preferences
- Preferences could be enforced on the display side (client filtering) but currently are not

**Recommendation:** Product decision needed: should admin broadcasts respect per-category preferences? For launch, document that broadcasts bypass preferences. Post-launch, add preference filtering either on send or display side.

---

### NOTIF-005 — Synchronous Batch Delivery for Global Broadcasts (P3)

**File:** `app/actions/notifications-admin.ts` lines 240–260  
**Risk:** Global broadcasts fetch ALL users into memory, map to deliveries array, and insert in one batch. Could timeout or OOM at scale.

**Evidence:**
```typescript
const { data: allUsers } = await supabase.from('users').select('id, is_demo_user')
const deliveries = filteredUsers.map((u) => ({ ... }))
await supabase.from('notification_deliveries').insert(deliveries)
```

**Mitigating factors:**
- Launch user count likely <10K — well within single-batch capacity
- Demo users excluded by default (reduces cardinality ~50%)
- Global broadcasts are rare operations
- Supabase handles bulk inserts efficiently via PostgREST

**Recommendation:** Acceptable for launch. Document as scale limitation. Post-launch: batch inserts in chunks of 1000, or migrate to async queue.

---

### NOTIF-006 — Preferences API Missing Validation (P2)

**File:** `app/api/accounts/profile/notifications/route.ts` lines 74–135  
**Risk:** PATCH endpoint uses manual `typeof` checks. No format validation on `dnd_start_time`/`dnd_end_time` (should be TIME format). No `rateLimit` on route.

**Evidence:**
- `apiHandler({ auth: 'user' })` — no `rateLimit` specified
- `digest_frequency` mapped but not validated against allowed values
- Time fields accept any string

**Mitigating factors:**
- Users can only modify their own preferences (RLS enforced)
- DB types provide some constraint
- Preference updating is a low-value target for abuse

**Recommendation:** Add Zod validation and `rateLimit: 'api'` to the route.

---

### NOTIF-007 — Scheduled Notifications No Processor (P3)

**File:** `app/actions/notifications-admin.ts` lines 196–199  
**Risk:** `schedule_at` field is stored but no background job processor found. Scheduled notifications sit in DB with `status: 'scheduled'` and never fire.

**Evidence:**
- Interface defines `scheduleAt?: string`
- Code sets `status: isScheduled ? 'scheduled' : 'sent'`
- No cron job, Edge Function, or scheduled task found that processes scheduled notifications
- Sandbox page shows scheduled notification UI (`app/sandbox/admin/notifications/page.tsx`)

**Mitigating factors:**
- Feature is incomplete/MVP — admin can still send immediately
- No user-facing documentation promises scheduled delivery
- Not a regression — feature was never working

**Recommendation:** Document as unfinished feature. Either remove from UI or implement processor post-launch.

---

### NOTIF-008 — Type/Category Fields Unvalidated (P3)

**File:** `app/actions/notifications-admin.ts`  
**Risk:** `type` and `category` accept arbitrary strings. Used for styling/filtering but not for logic.

**Evidence:**
- Admin form can submit any value for category
- Type used in notification badge color logic — unrecognized type defaults to gray

**Mitigating factors:**
- Admin-only input
- Non-functional: affects styling only, no logic branching on type
- DB column VARCHAR(50) prevents extreme values

**Recommendation:** Validate against enum values for consistency.

---

## Positive Findings

| # | Area | Detail |
|---|------|--------|
| P1 | Ticket Idempotency | Event-key based dedup prevents duplicate ticket notifications. Constraint violation (`23505`) gracefully handled. |
| P2 | Tenant Isolation | CHECK constraint ensures every notification belongs to a tenant. RLS policies prevent cross-tenant leaks. `isTenantAdmin()` checked before tenant broadcasts. |
| P3 | Delivery Dedup | UNIQUE constraint on `(notification_id, user_id)` prevents duplicate deliveries per user. |
| P4 | Realtime Scoping | Channel per user: `notif_deliveries_${user.id}` with RLS filter. No global listeners. No subscription storms. |
| P5 | Realtime Cleanup | `supabase.removeChannel()` on unmount. No leaks. |
| P6 | Debounced Refetch | 300ms debounce on rapid changes prevents thundering herd. |
| P7 | Fallback Polling | 30s poll with exponential backoff (max 120s). Circuit breaker after 6 failures. Resumes on visibility/focus. |
| P8 | RPC Cooldown | First RPC timeout activates 60s cooldown → direct query fallback. Backoff: 60s → 120s → 300s max. Auth errors don't trigger cooldown. |
| P9 | No XSS Risk | Notification title/message rendered as React text nodes (not `dangerouslySetInnerHTML`). HTML entities auto-escaped. |
| P10 | No External Dependencies | In-app only — no email/push providers. Zero external service risk at launch. |
| P11 | Spam Loop Prevention | No notification-triggered-notification patterns. Broadcast is terminal. Ticket notifications gated by specific events only. |
| P12 | Optimistic + Reconciliation | Mark-read uses optimistic UI → RPC → refetch on failure. Unread count eventually consistent within seconds. |
| P13 | AbortController | Every fetch has AbortController. Previous in-flight aborted on new fetch. No connection pool exhaustion. |
| P14 | Mark-All-Read Count | RPC returns `ROW_COUNT` via `GET DIAGNOSTICS`. Client reconciles unread count from server response. |
| P15 | Indexes | All critical query paths indexed: `(user_id, read_at) WHERE read_at IS NULL`, `(user_id)`, `(tenant_id)`, `(type)`, `(created_at)`. |
| P16 | Online/Visibility Gating | No fetches when tab hidden or offline. Conserves resources. |

---

## Severity Distribution

| ID | Finding | Severity | Launch Action |
|----|---------|----------|---------------|
| NOTIF-001 | Admin broadcast no idempotency | P2 | Post-launch — add dedup key |
| NOTIF-002 | No rate limit on admin broadcast | P2 | Post-launch — add inline limit |
| NOTIF-003 | No Zod validation on broadcast | P2 | Post-launch — add schema |
| NOTIF-004 | Preferences not enforced on send | P2 | Product decision — document for launch |
| NOTIF-005 | Synchronous batch delivery | P3 | Acceptable at launch scale — batch post-launch |
| NOTIF-006 | Preferences API missing validation | P2 | Post-launch — add Zod + rate limit |
| NOTIF-007 | Scheduled notifications no processor | P3 | Document as unfinished feature |
| NOTIF-008 | Type/category unvalidated | P3 | Post-launch polish |

---

## Remediation Milestones

### M1 — Input Hardening (Post-launch)

- [ ] Add Zod schema to `sendAdminNotification`
- [ ] Add Zod validation to preferences PATCH route
- [ ] Validate type/category against enum values

### M2 — Admin Broadcast Safety (Post-launch)

- [ ] Add client-side debounce on broadcast send button
- [ ] Add server-side dedup key (scope + title + message + 5-min window)
- [ ] Add inline rate limiting (1 broadcast/admin/minute)

### M3 — Preference Enforcement (Post-launch, product decision)

- [ ] Decide: should admin broadcasts respect user category preferences?
- [ ] If yes: filter deliveries against `notification_preferences` on send
- [ ] If no: document behavior for users

### M4 — Scale Preparation (Post-launch)

- [ ] Batch global broadcast deliveries in chunks of 1000
- [ ] Implement scheduled notification processor (cron or Edge Function)
- [ ] Add audit trail for admin broadcasts (who sent, when, how many)
