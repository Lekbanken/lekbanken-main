-- =============================================================================
-- Migration 012: Enable RLS on moderation domain tables
-- =============================================================================
-- Problem: The moderation_domain.sql migration created tables and policies
--          but NEVER called ENABLE ROW LEVEL SECURITY. This means the policies
--          are defined but not enforced - all data is accessible!
--
-- This is a CRITICAL security fix.
-- =============================================================================

-- Enable RLS on all moderation domain tables
ALTER TABLE public.content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_filter_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderation_analytics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- VERIFICATION COMMENTS
-- =============================================================================
-- After applying this migration, verify with:
--
-- SELECT tablename, rowsecurity FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN (
--   'content_reports', 'content_filter_rules', 'moderation_actions',
--   'user_restrictions', 'moderation_queue', 'moderation_analytics'
-- );
--
-- All should show rowsecurity = true
-- =============================================================================
