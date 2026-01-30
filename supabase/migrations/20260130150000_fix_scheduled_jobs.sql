-- Fix: Scheduled jobs issues
-- 1. cleanup_demo_users references player_id but column is user_id
-- 2. get_scheduled_jobs_status doesn't include notification jobs in filter

-- =============================================================================
-- 1. Fix cleanup_demo_users function - use user_id instead of player_id
-- =============================================================================

CREATE OR REPLACE FUNCTION public.cleanup_demo_users()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_run_id uuid;
  v_start_time timestamptz;
  v_result jsonb;
  v_deleted_users int := 0;
  v_deleted_sessions int := 0;
  v_deleted_game_sessions int := 0;
  v_expiry_threshold timestamptz;
  v_user_ids uuid[];
BEGIN
  v_start_time := clock_timestamp();
  
  -- Skapa körningspost
  INSERT INTO public.scheduled_job_runs (job_name, status, started_at)
  VALUES ('cleanup_demo_users', 'running', v_start_time)
  RETURNING id INTO v_run_id;
  
  -- 24 timmar sedan
  v_expiry_threshold := now() - interval '24 hours';
  
  BEGIN
    -- Hitta alla ephemeral users äldre än 24h
    SELECT array_agg(id) INTO v_user_ids
    FROM public.users
    WHERE is_ephemeral = true
      AND created_at < v_expiry_threshold;
    
    -- Ta bort game_sessions för dessa användare
    -- FIX: Use user_id instead of player_id
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
      DELETE FROM public.game_sessions
      WHERE user_id = ANY(v_user_ids);
      GET DIAGNOSTICS v_deleted_game_sessions = ROW_COUNT;
    END IF;
    
    -- Ta bort demo_sessions äldre än 24h
    DELETE FROM public.demo_sessions
    WHERE created_at < v_expiry_threshold;
    GET DIAGNOSTICS v_deleted_sessions = ROW_COUNT;
    
    -- Ta bort ephemeral users äldre än 24h
    DELETE FROM public.users
    WHERE is_ephemeral = true
      AND created_at < v_expiry_threshold;
    GET DIAGNOSTICS v_deleted_users = ROW_COUNT;
    
    v_result := jsonb_build_object(
      'success', true,
      'deleted_users', v_deleted_users,
      'deleted_sessions', v_deleted_sessions,
      'deleted_game_sessions', v_deleted_game_sessions,
      'expiry_threshold', v_expiry_threshold
    );
    
    -- Uppdatera körningspost
    UPDATE public.scheduled_job_runs
    SET status = 'success',
        result = v_result,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
  EXCEPTION WHEN OTHERS THEN
    -- Logga fel
    UPDATE public.scheduled_job_runs
    SET status = 'error',
        error_message = SQLERRM,
        completed_at = clock_timestamp(),
        duration_ms = EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::int
    WHERE id = v_run_id;
    
    v_result := jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
  END;
  
  -- Rensa gamla körningsposter (behåll 7 dagar)
  DELETE FROM public.scheduled_job_runs
  WHERE started_at < now() - interval '7 days';
  
  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.cleanup_demo_users() IS 
'Cleanup expired demo/ephemeral users. Removes users with is_ephemeral=true older than 24h.';

-- =============================================================================
-- 2. Fix get_scheduled_jobs_status to include all job types
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_scheduled_jobs_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_result jsonb;
  v_jobs jsonb;
  v_runs jsonb;
BEGIN
  -- Kolla om användaren är system admin
  IF NOT public.is_system_admin() THEN
    RETURN jsonb_build_object('error', 'Unauthorized');
  END IF;

  -- Hämta cron-jobb (om pg_cron finns)
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT jsonb_agg(jsonb_build_object(
      'jobid', jobid,
      'jobname', jobname,
      'schedule', schedule,
      'command', command,
      'active', active
    ))
    INTO v_jobs
    FROM cron.job
    WHERE jobname LIKE 'cleanup%' 
       OR jobname LIKE 'demo%'
       OR jobname LIKE 'process%'
       OR jobname LIKE 'notification%';
  ELSE
    v_jobs := '[]'::jsonb;
  END IF;

  -- Hämta senaste körningar (max 20)
  SELECT jsonb_agg(jsonb_build_object(
    'id', id,
    'job_name', job_name,
    'status', status,
    'result', result,
    'error_message', error_message,
    'started_at', started_at,
    'completed_at', completed_at,
    'duration_ms', duration_ms
  ) ORDER BY started_at DESC)
  INTO v_runs
  FROM (
    SELECT * FROM public.scheduled_job_runs
    ORDER BY started_at DESC
    LIMIT 20
  ) sub;

  v_result := jsonb_build_object(
    'jobs', COALESCE(v_jobs, '[]'::jsonb),
    'recent_runs', COALESCE(v_runs, '[]'::jsonb),
    'fetched_at', now()
  );

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.get_scheduled_jobs_status() IS 
'Hämtar status för schemalagda jobb. Endast för system_admin. Inkluderar cleanup, demo, process, och notification jobb.';
