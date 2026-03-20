DROP POLICY IF EXISTS "Hosts can view activity for their sessions" ON public.participant_activity_log;
DROP POLICY IF EXISTS "hosts_can_read_session_progress" ON public.participant_game_progress;
DROP POLICY IF EXISTS "hosts_can_read_session_unlocks" ON public.participant_achievement_unlocks;
DROP POLICY IF EXISTS "hosts_can_read_session_stats" ON public.session_statistics;