-- RLS Security Audit Fixes (2025-03-17)
--
-- Issues found by comprehensive RLS audit on remote production:
--
-- CRITICAL-1: participants INSERT policy "Service role can create participants"
--   → Grants {public} with WITH CHECK (true) — any anonymous user can insert.
--   → Code only uses service_role (bypasses RLS), so policy is unnecessary.
--
-- CRITICAL-2: participant_activity_log INSERT policy "Service role can insert activity logs"
--   → Same pattern: {public} + WITH CHECK (true). Unnecessary and dangerous.
--   → 3 client-side inserts from useParticipants (host, authenticated) need a proper policy.
--
-- CRITICAL-3: session_commands_admin_select references auth.jwt()->'user_metadata'
--   → user_metadata is editable by end users — privilege escalation risk.
--   → Replace with is_system_admin() which checks app_metadata/database safely.
--
-- HIGH-1: participants SELECT "Participants can view themselves" USING (true)
--   → Any user (incl anonymous) can read ALL participants in ALL sessions.
--   → participants_select_anon already handles anon access (active sessions only).
--
-- WARN-1: 5 functions with mutable search_path (search_path injection risk).
--
-- NOTE: user_profiles_select has "OR true" making it always-true for authenticated.
--   This may be intentional (public profile directory). Flagged but NOT fixed here.
--
-- NOTE: Participant heartbeat (.update via anon) has no matching UPDATE policy,
--   so anonymous heartbeat writes silently fail. Pre-existing bug, separate fix needed.

BEGIN;

----------------------------------------------------------------------
-- CRITICAL-1: Drop dangerous public INSERT on participants
----------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role can create participants" ON public.participants;

----------------------------------------------------------------------
-- CRITICAL-2: Fix participant_activity_log INSERT policies
----------------------------------------------------------------------
-- Drop the dangerous public INSERT policy
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.participant_activity_log;

-- Replace the overly restrictive authenticated INSERT policy
-- Old: only is_system_admin() could insert
-- New: session hosts can log activity for their sessions, plus system admins
DROP POLICY IF EXISTS "participant_activity_log_insert" ON public.participant_activity_log;
CREATE POLICY "participant_activity_log_insert" ON public.participant_activity_log
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.participant_sessions ps
      WHERE ps.id = participant_activity_log.session_id
        AND ps.host_user_id = (SELECT auth.uid())
    )
    OR is_system_admin()
  );

----------------------------------------------------------------------
-- CRITICAL-3: Fix session_commands_admin_select (user_metadata → is_system_admin)
----------------------------------------------------------------------
DROP POLICY IF EXISTS "session_commands_admin_select" ON public.session_commands;
CREATE POLICY "session_commands_admin_select" ON public.session_commands
  FOR SELECT TO public
  USING (is_system_admin());

----------------------------------------------------------------------
-- HIGH-1: Drop overly broad participants SELECT USING (true)
----------------------------------------------------------------------
-- participants_select_anon already provides scoped anon access (active sessions only)
-- {public} "Hosts can view..." provides host access
-- {authenticated} "participants_select" provides authenticated access
DROP POLICY IF EXISTS "Participants can view themselves" ON public.participants;

----------------------------------------------------------------------
-- WARN-1: Fix function search_path (search_path injection prevention)
----------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_run_sessions_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_participant_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.participant_sessions
    SET participant_count = participant_count + 1,
        updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.participant_sessions
    SET participant_count = GREATEST(0, participant_count - 1),
        updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_product_slug_collision()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.categories
    WHERE slug = NEW.product_key
  ) THEN
    RAISE EXCEPTION 'Product product_key "%" collides with an existing category slug', NEW.product_key
      USING ERRCODE = 'unique_violation';
  END IF;
  RETURN NEW;
END;
$$;

-- calculate_quote_totals — only the overload WITHOUT search_path needs fixing
-- (the trigger overload already has SET search_path TO '')
CREATE OR REPLACE FUNCTION public.calculate_quote_totals(p_quote_id uuid)
  RETURNS TABLE(subtotal integer, total_amount integer)
  LANGUAGE plpgsql
  SET search_path = ''
AS $$
DECLARE
  v_subtotal INTEGER;
  v_discount INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COALESCE(SUM(total_price), 0) INTO v_subtotal
  FROM public.quote_line_items
  WHERE quote_id = p_quote_id;

  SELECT discount_amount INTO v_discount
  FROM public.quotes
  WHERE id = p_quote_id;

  v_total := v_subtotal - COALESCE(v_discount, 0);

  RETURN QUERY SELECT v_subtotal, v_total;
END;
$$;

COMMIT;
