# Notifications V2 — Batch 2: Scheduled Path Consolidation

## Metadata

**Date:** 2026-03-19  
**Last updated:** 2026-03-21  
**Status:** Spec — not started  
**Prerequisite:** Batch 1 (atomic write pipeline) ✅ KLAR (2026-03-19)  
**Scope:** `process_scheduled_notifications()` + admin scheduled-jobs surface  
**Canonical entrypoint:** `docs/notifications/README.md`

---

## 1. Problem Statement

`process_scheduled_notifications()` (defined in baseline, line ~12784) is the **last remaining notification path that bypasses the V2 contract**. It:

1. Duplicates fanout logic instead of calling `create_notification_v1()`
2. Uses `auth.users` for scope='all' instead of `public.users` — delivers to **20 auth rows** instead of **13 real users** (7 phantom/orphan auth entries)
3. Does not exclude demo users
4. Does not use `event_key` idempotency
5. Runs via **active pg_cron** daily at 02:00 UTC (jobid=3) — this is NOT dormant

### Impact

Any notification inserted with `status='scheduled'` will be processed by legacy code that:
- Delivers to wrong recipient set (auth.users vs public.users)
- Cannot protect against duplicate processing
- Skips demo-user exclusion

---

## 2. Current State (Verified 2026-03-19)

### Active Cron Jobs in Production

| jobid | schedule     | command                                       | active |
|-------|-------------|-----------------------------------------------|--------|
| 2     | `0 3 * * *` | `cleanup_demo_users()`                       | ✅ yes  |
| 3     | `0 2 * * *` | `process_scheduled_notifications()`          | ✅ yes  |

### Admin UI Surface

- **Route:** `/admin/scheduled-jobs` (system_admin only)
- **API:** `GET/POST /api/admin/scheduled-jobs`
- **Capabilities:** View job status, view run history, manually trigger jobs
- **Supported jobs:** `cleanup_demo_users`, `process_scheduled_notifications`
- **No `schedule_at` UI** — admin send-notification form does NOT have scheduling fields

### Recipient Source Discrepancy

| Path                               | scope='all' source | scope='tenant' source             | Demo exclusion |
|------------------------------------|--------------------|------------------------------------|----------------|
| `create_notification_v1()` (V2)   | `public.users`     | `user_tenant_memberships` + users | ✅ yes          |
| `process_scheduled_notifications()` (legacy) | `auth.users`      | `user_tenant_memberships`          | ❌ no           |

### Function Source (Summarized)

```sql
-- Iterates notifications WHERE status = 'scheduled' AND schedule_at <= now()
-- FOR UPDATE SKIP LOCKED (safe for concurrent workers)
-- Materializes deliveries directly (INSERT INTO notification_deliveries)
-- Updates status to 'sent'
-- Records job run in scheduled_job_runs
```

---

## 3. Proposed Fix

### Option A: Rewrite `process_scheduled_notifications()` to delegate to V2 (Recommended)

Replace the inline fanout with a call to `create_notification_v1()`. The function becomes a thin loop:

```sql
FOR v_notification IN
  SELECT * FROM notifications
  WHERE status = 'scheduled' AND (schedule_at IS NULL OR schedule_at <= now())
  FOR UPDATE SKIP LOCKED
LOOP
  -- Delegate to V2 atomic pipeline
  v_result := create_notification_v1(
    p_scope     := v_notification.scope,
    p_tenant_id := v_notification.tenant_id,
    p_title     := v_notification.title,
    p_message   := v_notification.message,
    ...
  );
END LOOP;
```

**Problem:** `create_notification_v1()` creates a NEW master row (INSERT). The scheduled row already exists. We need to either:
- a) Have `create_notification_v1` accept an optional `p_notification_id` to skip the INSERT and only do fanout
- b) Create a separate `materialize_notification_deliveries_v1(p_notification_id)` function
- c) Inline the corrected fanout logic (same as V2 but reading from existing row)

**Recommendation:** Option (c) — inline the corrected fanout logic. Simplest, no API change to `create_notification_v1`, and scheduled path is isolated:

```sql
-- Replace auth.users with public.users
-- Add demo-user exclusion  
-- Keep FOR UPDATE SKIP LOCKED pattern
-- Keep job-run recording
```

### Option B: Disable Scheduled Path Entirely

Since no admin UI creates scheduled notifications, and the cron job processes 0 notifications in normal operation (verified: `2026-03-19 02:00` run had `processed_notifications: 0`):

1. Drop the cron job: `SELECT cron.unschedule(3)`
2. Keep the function for potential future use
3. Document it as dormant

**Risk:** If someone creates a `status='scheduled'` row via direct DB access, it will never be processed.

---

## 4. Recommended Approach: Option A (Corrected Fanout)

### 4.1 Migration: `20260320XXXXXX_fix_process_scheduled_notifications.sql`

```sql
CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_run_id uuid;
  v_start_time timestamptz;
  v_result jsonb;
  v_processed_count int := 0;
  v_total_deliveries int := 0;
  v_notification RECORD;
  v_delivery_count int;
BEGIN
  v_start_time := clock_timestamp();
  
  INSERT INTO public.scheduled_job_runs (job_name, status, started_at)
  VALUES ('process_scheduled_notifications', 'running', v_start_time)
  RETURNING id INTO v_run_id;
  
  BEGIN
    FOR v_notification IN
      SELECT id, title, scope, tenant_id
      FROM public.notifications
      WHERE status = 'scheduled'
        AND (schedule_at IS NULL OR schedule_at <= now())
      ORDER BY schedule_at ASC NULLS FIRST
      FOR UPDATE SKIP LOCKED
    LOOP
      -- V2-aligned fanout: use public.users, exclude demo
      IF v_notification.scope = 'all' THEN
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, u.id, now()
        FROM public.users u
        WHERE u.is_demo_user IS NOT TRUE
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      ELSIF v_notification.scope = 'tenant' THEN
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, utm.user_id, now()
        FROM public.user_tenant_memberships utm
        JOIN public.users u ON u.id = utm.user_id
        WHERE utm.tenant_id = v_notification.tenant_id
          AND u.is_demo_user IS NOT TRUE
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      END IF;
      
      GET DIAGNOSTICS v_delivery_count = ROW_COUNT;
      v_total_deliveries := v_total_deliveries + v_delivery_count;
      
      UPDATE public.notifications
      SET status = 'sent', sent_at = now()
      WHERE id = v_notification.id;
      
      v_processed_count := v_processed_count + 1;
    END LOOP;
    
    v_result := jsonb_build_object(
      'success', true,
      'processed_notifications', v_processed_count,
      'total_deliveries', v_total_deliveries
    );
    
    UPDATE public.scheduled_job_runs
    SET status = 'success',
        result = v_result,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
  EXCEPTION WHEN OTHERS THEN
    UPDATE public.scheduled_job_runs
    SET status = 'error',
        error_message = SQLERRM,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'processed_before_error', v_processed_count
    );
  END;
  
  RETURN v_result;
END;
$function$;
```

### Changes from legacy:
1. `auth.users` → `public.users` (correct recipient source)
2. Added `WHERE u.is_demo_user IS NOT TRUE` (demo exclusion)
3. Added `JOIN public.users u ON u.id = utm.user_id` for tenant scope (demo filter)
4. `ON CONFLICT DO NOTHING` already present (idempotent re-delivery)

### 4.2 No TypeScript Changes Required

- Admin API route (`/api/admin/scheduled-jobs`) calls the function by name via RPC — no code change needed
- Admin UI (`/admin/scheduled-jobs`) displays results from the same RPC — no change needed

### 4.3 Testing

1. Create a `status='scheduled'` notification for tenant scope
2. Run `process_scheduled_notifications()` 
3. Verify deliveries go to `public.users` (13), not `auth.users` (20)
4. Verify demo users excluded
5. Verify job run recorded correctly
6. Trigger via admin UI "Run Now" button
7. Verify identical behavior

---

## 5. Out of Scope for Batch 2

- Adding `schedule_at` UI to admin notification form (future feature)
- Consolidating `process_scheduled_notifications` to call `create_notification_v1` (unnecessary complexity — the scheduled row already exists as master)
- Modifying cron schedule or adding new cron jobs
- Realtime/polling consolidation (separate concern)

---

## 6. Definition of Done

- [ ] New migration with corrected `process_scheduled_notifications()`
- [ ] `auth.users` → `public.users` for scope='all'
- [ ] Demo-user exclusion added for both scopes
- [ ] Applied to production via `supabase db push`
- [ ] Tested: scheduled tenant notification → correct delivery count
- [ ] Tested: manual trigger via admin UI → same result
- [ ] Tested: cron run at 02:00 UTC (monitor next day's job run)
- [ ] Documentation updated (this file marked KLAR)
