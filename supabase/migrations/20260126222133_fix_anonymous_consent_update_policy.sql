-- ============================================================================
-- FIX: anonymous_cookie_consents UPDATE policy
-- Make USING clause more restrictive - only allow updates to non-expired consents
-- ============================================================================

DROP POLICY IF EXISTS anonymous_cookie_consents_update ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_update ON public.anonymous_cookie_consents
  FOR UPDATE TO anon, authenticated
  USING (
    -- Only allow updates to consents that haven't expired
    -- This prevents modification of historical consent records
    expires_at > now()
  )
  WITH CHECK (
    -- Require consent_id to remain valid
    consent_id IS NOT NULL AND length(consent_id) >= 32
  );
