-- ============================================================================
-- Migration: Fix Supabase Database Linter Security Issues
-- Created: 2026-01-13
-- 
-- Fixes:
-- 1. SECURITY DEFINER views -> SECURITY INVOKER (ERROR level)
-- 2. Function mutable search_path -> SET search_path = '' (WARN level)
-- 3. RLS policy always true -> Restrict to authenticated users (WARN level)
-- ============================================================================

-- ============================================================================
-- 1. FIX SECURITY DEFINER VIEWS
-- ============================================================================
-- Views with SECURITY DEFINER use the view creator's permissions, which can
-- bypass RLS policies. We recreate them with SECURITY INVOKER.

-- Fix v_gamification_daily_economy
DROP VIEW IF EXISTS public.v_gamification_daily_economy;

CREATE VIEW public.v_gamification_daily_economy 
WITH (security_invoker = true)
AS
SELECT
  ct.tenant_id,
  date_trunc('day', ct.created_at)::date AS day,
  sum(CASE WHEN ct.type = 'earn' THEN ct.amount ELSE 0 END) AS coins_minted,
  sum(CASE WHEN ct.type = 'spend' THEN ct.amount ELSE 0 END) AS coins_burned,
  sum(CASE WHEN ct.type = 'earn' THEN ct.amount ELSE 0 END) -
    sum(CASE WHEN ct.type = 'spend' THEN ct.amount ELSE 0 END) AS net_flow,
  count(*) FILTER (WHERE ct.type = 'earn') AS mint_tx_count,
  count(*) FILTER (WHERE ct.type = 'spend') AS burn_tx_count
FROM public.coin_transactions ct
GROUP BY ct.tenant_id, date_trunc('day', ct.created_at)::date;

COMMENT ON VIEW public.v_gamification_daily_economy IS 'Daily coin mint/burn rates per tenant for admin dashboard';

-- Fix v_gamification_leaderboard
DROP VIEW IF EXISTS public.v_gamification_leaderboard;

CREATE VIEW public.v_gamification_leaderboard 
WITH (security_invoker = true)
AS
SELECT
  uc.tenant_id,
  uc.user_id,
  u.email,
  uc.balance,
  uc.total_earned,
  uc.total_spent,
  up.level,
  up.current_xp,
  us.current_streak_days,
  us.best_streak_days,
  rank() OVER (PARTITION BY uc.tenant_id ORDER BY uc.total_earned DESC) AS rank_by_earned,
  rank() OVER (PARTITION BY uc.tenant_id ORDER BY up.current_xp DESC) AS rank_by_xp
FROM public.user_coins uc
JOIN public.users u ON u.id = uc.user_id
LEFT JOIN public.user_progress up ON up.user_id = uc.user_id AND up.tenant_id IS NOT DISTINCT FROM uc.tenant_id
LEFT JOIN public.user_streaks us ON us.user_id = uc.user_id AND us.tenant_id IS NOT DISTINCT FROM uc.tenant_id
LEFT JOIN public.user_gamification_preferences gp ON gp.user_id = uc.user_id AND gp.tenant_id IS NOT DISTINCT FROM uc.tenant_id
WHERE COALESCE(gp.leaderboard_visible, true) = true;

COMMENT ON VIEW public.v_gamification_leaderboard IS 'Top earners leaderboard (respects opt-out preferences)';

-- ============================================================================
-- 2. FIX MUTABLE SEARCH_PATH ON FUNCTIONS
-- ============================================================================
-- Functions without explicit search_path can be exploited via search_path
-- manipulation attacks. We set search_path = '' to prevent this.

-- Fix achievements_set_updated_at
CREATE OR REPLACE FUNCTION public.achievements_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Fix update_support_faq_entries_updated_at
CREATE OR REPLACE FUNCTION public.update_support_faq_entries_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- 3. FIX OVERLY PERMISSIVE RLS POLICY
-- ============================================================================
-- The translation_missing_keys_insert policy allows anyone to insert.
-- We restrict it to authenticated users only (still allows reporting missing
-- keys, but prevents anonymous abuse).

DROP POLICY IF EXISTS "translation_missing_keys_insert" ON public.translation_missing_keys;

CREATE POLICY "translation_missing_keys_insert"
  ON public.translation_missing_keys FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Authenticated users can report missing keys

COMMENT ON POLICY "translation_missing_keys_insert" ON public.translation_missing_keys 
  IS 'Allow authenticated users to report missing translation keys';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- Run the following to verify fixes were applied:
-- 
-- Check views are SECURITY INVOKER:
--   SELECT viewname, definition FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'v_gamification%';
--
-- Check functions have immutable search_path:
--   SELECT proname, prosecdef, proconfig FROM pg_proc 
--   WHERE proname IN ('achievements_set_updated_at', 'update_support_faq_entries_updated_at');
--
-- Check RLS policy:
--   SELECT * FROM pg_policies WHERE tablename = 'translation_missing_keys';
