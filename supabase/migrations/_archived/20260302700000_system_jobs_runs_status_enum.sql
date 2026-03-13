-- ============================================================================
-- system_jobs_runs: convert status from CHECK text to proper enum
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'system_job_run_status') THEN
    CREATE TYPE public.system_job_run_status AS ENUM ('running', 'ok', 'warn', 'fail');
  END IF;
END
$$;

-- Drop the CHECK constraint and partial index (references text comparison), convert column to enum
ALTER TABLE public.system_jobs_runs
  DROP CONSTRAINT IF EXISTS system_jobs_runs_status_check;

DROP INDEX IF EXISTS idx_system_jobs_runs_status;

ALTER TABLE public.system_jobs_runs
  ALTER COLUMN status DROP DEFAULT;

ALTER TABLE public.system_jobs_runs
  ALTER COLUMN status TYPE public.system_job_run_status
  USING status::public.system_job_run_status;

ALTER TABLE public.system_jobs_runs
  ALTER COLUMN status SET DEFAULT 'running'::public.system_job_run_status;

-- Recreate partial index with enum comparison
CREATE INDEX IF NOT EXISTS idx_system_jobs_runs_status
  ON public.system_jobs_runs (status) WHERE status != 'ok'::public.system_job_run_status;
