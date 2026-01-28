-- ============================================================================
-- DEMO USER CLEANUP via pg_cron
-- ============================================================================
-- Ersätter edge function cleanup-demo-data med en säkrare pg_cron-lösning.
-- Körs nattligen 03:00 UTC (04:00 svensk vintertid, 05:00 sommartid).
-- ============================================================================

-- 1. Skapa tabell för körhistorik (för admin-översikt)
CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error', 'running')),
  result jsonb,
  error_message text,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  duration_ms int,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_scheduled_job_runs_name_date 
ON scheduled_job_runs(job_name, started_at DESC);

-- Index för att snabbt hitta gamla poster vid cleanup (partial index fungerar ej med now())
CREATE INDEX idx_scheduled_job_runs_started_at
ON scheduled_job_runs(started_at);

COMMENT ON TABLE scheduled_job_runs IS 'Historik för schemalagda jobb (pg_cron). Används för admin-översikt.';
COMMENT ON COLUMN scheduled_job_runs.job_name IS 'Namn på jobbet, t.ex. cleanup_demo_users';
COMMENT ON COLUMN scheduled_job_runs.status IS 'Status: success, error, running';
COMMENT ON COLUMN scheduled_job_runs.result IS 'JSON-resultat från körningen';
COMMENT ON COLUMN scheduled_job_runs.duration_ms IS 'Körtid i millisekunder';

-- 2. RLS för scheduled_job_runs (endast system_admin kan läsa)
ALTER TABLE scheduled_job_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "system_admin_select_job_runs" ON scheduled_job_runs;
CREATE POLICY "system_admin_select_job_runs"
ON scheduled_job_runs FOR SELECT
USING (public.is_system_admin());

-- 3. Skapa cleanup-funktion
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
    IF v_user_ids IS NOT NULL AND array_length(v_user_ids, 1) > 0 THEN
      DELETE FROM public.game_sessions
      WHERE player_id = ANY(v_user_ids);
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
'Rensar demo-användare och deras data efter 24 timmar. Körs nattligen via pg_cron.';

-- 4. Aktivera pg_cron och schemalägg jobbet
-- OBS: pg_cron måste vara aktiverat i Supabase Dashboard först
DO $schedule_block$
BEGIN
  -- Kolla om cron extension finns
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Ta bort eventuellt gammalt jobb (ignorera fel om det inte finns)
    BEGIN
      PERFORM cron.unschedule('cleanup-demo-users');
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Jobbet finns inte, det är OK
    END;
    
    -- Schemalägg nytt jobb: 03:00 UTC varje dag
    PERFORM cron.schedule(
      'cleanup-demo-users',
      '0 3 * * *',
      'SELECT public.cleanup_demo_users()'
    );
    
    RAISE NOTICE 'pg_cron job cleanup-demo-users scheduled at 03:00 UTC daily';
  ELSE
    RAISE NOTICE 'pg_cron extension not installed. Enable it in Supabase Dashboard first.';
  END IF;
END $schedule_block$;

-- 5. Funktion för att hämta jobb-status (för admin API)
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
    WHERE jobname LIKE 'cleanup%' OR jobname LIKE 'demo%';
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
'Hämtar status för schemalagda jobb. Endast för system_admin.';
