-- =============================================================================
-- Batch 2: Fix process_scheduled_notifications() recipient source + demo exclusion
-- =============================================================================
-- The legacy function uses auth.users for scope='all' (20 rows including
-- 7 phantom/orphan auth entries) instead of public.users (13 real users).
-- It also lacks demo-user exclusion. This aligns it with the V2 contract.
--
-- Changes from baseline version:
--   1. scope='all': auth.users → public.users + demo exclusion
--   2. scope='tenant': added JOIN to public.users for demo exclusion
--   3. No other logic changes — job-run recording, FOR UPDATE SKIP LOCKED,
--      and status transitions are preserved exactly.
-- =============================================================================

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

  -- Create job run record
  INSERT INTO public.scheduled_job_runs (job_name, status, started_at)
  VALUES ('process_scheduled_notifications', 'running', v_start_time)
  RETURNING id INTO v_run_id;

  BEGIN
    -- Process each scheduled notification that is due
    FOR v_notification IN
      SELECT id, title, scope, tenant_id
      FROM public.notifications
      WHERE status = 'scheduled'
        AND (schedule_at IS NULL OR schedule_at <= now())
      ORDER BY schedule_at ASC NULLS FIRST
      FOR UPDATE SKIP LOCKED
    LOOP
      IF v_notification.scope = 'all' THEN
        -- All real users, excluding demo (was: auth.users without filter)
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, u.id, now()
        FROM public.users u
        WHERE u.is_demo_user IS NOT TRUE
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      ELSIF v_notification.scope = 'tenant' THEN
        -- Tenant members, excluding demo (was: no demo filter)
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

      -- Update notification status to sent
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

    -- Update job run record
    UPDATE public.scheduled_job_runs
    SET status = 'success',
        result = v_result,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;

  EXCEPTION WHEN OTHERS THEN
    -- Log error
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
