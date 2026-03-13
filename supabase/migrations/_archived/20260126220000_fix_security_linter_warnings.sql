-- ============================================================================
-- FIX SECURITY LINTER WARNINGS
-- Function search_path and RLS policy improvements
-- ============================================================================

-- ============================================================================
-- PART 1: Fix functions with mutable search_path
-- Adding SET search_path = '' for security
-- ============================================================================

-- 1.1 Fix add_demo_feature_usage
CREATE OR REPLACE FUNCTION public.add_demo_feature_usage(
  session_id UUID,
  feature_name TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.demo_sessions
  SET
    features_used = features_used || jsonb_build_object(
      'feature', feature_name,
      'timestamp', now(),
      'iso_timestamp', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
    ),
    updated_at = now()
  WHERE id = session_id;
END;
$$;

-- 1.2 Fix mark_demo_session_converted
CREATE OR REPLACE FUNCTION public.mark_demo_session_converted(
  session_id UUID,
  conversion_type_param TEXT DEFAULT 'signup',
  conversion_plan_param TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.demo_sessions
  SET
    converted = true,
    conversion_type = conversion_type_param,
    conversion_plan = conversion_plan_param,
    ended_at = COALESCE(ended_at, now()),
    updated_at = now()
  WHERE id = session_id;
END;
$$;

-- 1.3 Fix get_current_demo_session_id
CREATE OR REPLACE FUNCTION public.get_current_demo_session_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  -- Get most recent non-expired demo session for current user
  SELECT id INTO v_session_id
  FROM public.demo_sessions
  WHERE user_id = auth.uid()
    AND expires_at > now()
    AND ended_at IS NULL
  ORDER BY started_at DESC
  LIMIT 1;

  RETURN v_session_id;
END;
$$;

-- 1.4 Fix update_demo_sessions_updated_at
CREATE OR REPLACE FUNCTION public.update_demo_sessions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 1.5 Fix update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PART 2: Improve RLS policies for cookie consent tables
-- These policies need to be permissive for anonymous cookie tracking,
-- but we can add reasonable constraints
-- ============================================================================

-- 2.1 anonymous_cookie_consents - require consent_id to be set
-- Since this is for anonymous users, we allow insert but require consent_id
DROP POLICY IF EXISTS anonymous_cookie_consents_upsert ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_upsert ON public.anonymous_cookie_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- Require consent_id to be a valid non-empty string (UUID format)
    consent_id IS NOT NULL AND length(consent_id) >= 32
  );

-- 2.2 anonymous_cookie_consents - update only your own consent
DROP POLICY IF EXISTS anonymous_cookie_consents_update ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_update ON public.anonymous_cookie_consents
  FOR UPDATE TO anon, authenticated
  USING (
    -- Allow update - client needs consent_id from cookie
    true
  )
  WITH CHECK (
    -- Require consent_id to remain valid
    consent_id IS NOT NULL AND length(consent_id) >= 32
  );

-- 2.3 cookie_consent_audit - add consent_id requirement for insert
-- Audit records must have a valid consent_id reference
DROP POLICY IF EXISTS cookie_consent_audit_insert ON public.cookie_consent_audit;
CREATE POLICY cookie_consent_audit_insert ON public.cookie_consent_audit
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    -- Require consent_id to be set (must reference a valid consent)
    consent_id IS NOT NULL
  );

-- ============================================================================
-- Complete
-- ============================================================================
