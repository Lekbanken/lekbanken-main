-- ============================================================================
-- NOTIFICATION WORKER via pg_cron
-- ============================================================================
-- Processes scheduled notifications and generates deliveries.
-- Runs nightly at 02:00 UTC (03:00 Swedish winter time, 04:00 summer time).
-- ============================================================================

-- 1. Create worker function that processes all due scheduled notifications
CREATE OR REPLACE FUNCTION public.process_scheduled_notifications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
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
      FOR UPDATE SKIP LOCKED  -- Skip if another worker is processing
    LOOP
      -- Generate deliveries for this notification
      IF v_notification.scope = 'all' THEN
        -- All users
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, u.id, now()
        FROM auth.users u
        ON CONFLICT (notification_id, user_id) DO NOTHING;
      ELSIF v_notification.scope = 'tenant' THEN
        -- Users in specific tenant
        INSERT INTO public.notification_deliveries (notification_id, user_id, delivered_at)
        SELECT v_notification.id, utm.user_id, now()
        FROM public.user_tenant_memberships utm
        WHERE utm.tenant_id = v_notification.tenant_id
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
$$;

COMMENT ON FUNCTION public.process_scheduled_notifications() IS 
'Processes all scheduled notifications that are due and generates deliveries. Runs nightly via pg_cron.';

-- Grant to service_role for manual API calls
GRANT EXECUTE ON FUNCTION public.process_scheduled_notifications() TO service_role;

-- 2. Schedule pg_cron job (02:00 UTC daily)
DO $schedule_block$
BEGIN
  -- Check if cron extension exists
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove old job if exists
    BEGIN
      PERFORM cron.unschedule('process-scheduled-notifications');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Job doesn't exist, that's OK
    END;
    
    -- Schedule new job: 02:00 UTC daily (before demo cleanup at 03:00)
    PERFORM cron.schedule(
      'process-scheduled-notifications',
      '0 2 * * *',
      'SELECT public.process_scheduled_notifications()'
    );
    
    RAISE NOTICE 'pg_cron job process-scheduled-notifications scheduled at 02:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron extension not installed. Enable it in Supabase Dashboard first.';
  END IF;
END $schedule_block$;
