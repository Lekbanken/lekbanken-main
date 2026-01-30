-- Verify and fix scheduled jobs visibility
-- Run this in Supabase SQL Editor to debug

-- 1. Check what jobs exist in cron.job
SELECT jobid, jobname, schedule, active 
FROM cron.job 
ORDER BY jobname;

-- 2. Check if process-scheduled-notifications matches any filter
SELECT 
  'process-scheduled-notifications' LIKE 'process%' as matches_process,
  'process-scheduled-notifications' LIKE 'notification%' as matches_notification;

-- 3. Test the get_scheduled_jobs_status function
SELECT public.get_scheduled_jobs_status();
