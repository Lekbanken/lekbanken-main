-- Cookie Consent System V2 - Enterprise Enhancement
-- Adds audit logging, policy versioning, and anonymous consent tracking

-- ============================================================================
-- 1. Cookie Consent Policy Versions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.consent_policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text UNIQUE NOT NULL,  -- e.g., "1.0", "1.1", "2.0"
  
  -- Policy content (localized)
  policy_text_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  
  -- Changes
  change_summary text,
  requires_reconsent boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  effective_date timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.consent_policy_versions IS 'Tracks versions of the cookie consent policy for compliance and re-consent';
COMMENT ON COLUMN public.consent_policy_versions.requires_reconsent IS 'If true, existing consents will be invalidated and users re-prompted';

CREATE INDEX IF NOT EXISTS idx_consent_policy_versions_effective ON public.consent_policy_versions (effective_date DESC);

-- ============================================================================
-- 2. Enhance cookie_catalog with translations
-- ============================================================================

ALTER TABLE public.cookie_catalog 
  ADD COLUMN IF NOT EXISTS purpose_translations jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.cookie_catalog.purpose_translations IS 'Localized purpose descriptions: {no: "...", sv: "...", en: "..."}';

-- Update existing entries with translations
UPDATE public.cookie_catalog SET
  purpose_translations = jsonb_build_object(
    'en', purpose,
    'no', CASE key
      WHEN 'necessary' THEN 'Essensielle informasjonskapsler som kreves for kjernefunksjonalitet.'
      WHEN 'functional' THEN 'Preferanser og forbedrede funksjoner.'
      WHEN 'analytics' THEN 'Anonym bruksanalyse.'
      WHEN 'marketing' THEN 'Markedsførings- og annonsesporing.'
      ELSE purpose
    END,
    'sv', CASE key
      WHEN 'necessary' THEN 'Nödvändiga cookies som krävs för kärnfunktionalitet.'
      WHEN 'functional' THEN 'Preferenser och förbättrade funktioner.'
      WHEN 'analytics' THEN 'Anonym användningsanalys.'
      WHEN 'marketing' THEN 'Marknadsförings- och annonsspårning.'
      ELSE purpose
    END
  ),
  sort_order = CASE key
    WHEN 'necessary' THEN 1
    WHEN 'functional' THEN 2
    WHEN 'analytics' THEN 3
    WHEN 'marketing' THEN 4
    ELSE 5
  END
WHERE purpose_translations = '{}'::jsonb;

-- ============================================================================
-- 3. Cookie Consent Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cookie_consent_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Consent identification
  consent_id text NOT NULL,  -- Unique ID stored in cookie
  user_id uuid NULL REFERENCES public.users(id) ON DELETE SET NULL,  -- NULL for anonymous
  
  -- Event
  event_type text NOT NULL CHECK (event_type IN ('granted', 'updated', 'withdrawn', 'expired', 'reprompted')),
  
  -- State changes
  previous_state jsonb,  -- {necessary: true, functional: false, ...}
  new_state jsonb,       -- {necessary: true, functional: true, ...}
  
  -- Consent metadata
  consent_version text NOT NULL,  -- Policy version at time of consent
  
  -- Context
  ip_address inet,
  user_agent text,
  page_url text,
  referrer text,
  locale text,
  dnt_enabled boolean NOT NULL DEFAULT false,
  gpc_enabled boolean NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cookie_consent_audit IS 'Immutable audit trail of all consent events for compliance';

CREATE INDEX IF NOT EXISTS idx_cookie_consent_audit_consent_id ON public.cookie_consent_audit (consent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_audit_user_id ON public.cookie_consent_audit (user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cookie_consent_audit_created ON public.cookie_consent_audit (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cookie_consent_audit_event_type ON public.cookie_consent_audit (event_type, created_at DESC);

-- ============================================================================
-- 4. Anonymous Consent Tracking (localStorage synced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.anonymous_cookie_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Identification
  consent_id text UNIQUE NOT NULL,  -- UUID stored in cookie
  
  -- Consent details
  necessary boolean NOT NULL DEFAULT true,
  functional boolean NOT NULL DEFAULT false,
  analytics boolean NOT NULL DEFAULT false,
  marketing boolean NOT NULL DEFAULT false,
  
  -- Metadata
  consent_version text NOT NULL,
  locale text NOT NULL,
  
  -- Timestamps
  granted_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  
  -- Context
  ip_address inet,
  user_agent text,
  dnt_enabled boolean NOT NULL DEFAULT false,
  gpc_enabled boolean NOT NULL DEFAULT false
);

COMMENT ON TABLE public.anonymous_cookie_consents IS 'Stores consent state for non-authenticated users';

CREATE INDEX IF NOT EXISTS idx_anonymous_cookie_consents_expires ON public.anonymous_cookie_consents (expires_at);
CREATE INDEX IF NOT EXISTS idx_anonymous_cookie_consents_consent_id ON public.anonymous_cookie_consents (consent_id);

-- ============================================================================
-- 5. Consent Statistics Materialized View
-- ============================================================================

CREATE OR REPLACE VIEW public.cookie_consent_statistics AS
SELECT
  date_trunc('day', created_at) AS date,
  event_type,
  consent_version,
  COUNT(*) AS event_count,
  COUNT(DISTINCT consent_id) AS unique_consents,
  SUM(CASE WHEN (new_state->>'functional')::boolean THEN 1 ELSE 0 END) AS functional_accepted,
  SUM(CASE WHEN (new_state->>'analytics')::boolean THEN 1 ELSE 0 END) AS analytics_accepted,
  SUM(CASE WHEN (new_state->>'marketing')::boolean THEN 1 ELSE 0 END) AS marketing_accepted,
  SUM(CASE WHEN dnt_enabled THEN 1 ELSE 0 END) AS dnt_count,
  SUM(CASE WHEN gpc_enabled THEN 1 ELSE 0 END) AS gpc_count
FROM public.cookie_consent_audit
WHERE created_at > now() - interval '90 days'
GROUP BY date_trunc('day', created_at), event_type, consent_version
ORDER BY date DESC;

COMMENT ON VIEW public.cookie_consent_statistics IS 'Aggregated consent statistics for admin dashboard';

-- ============================================================================
-- 6. RLS Policies
-- ============================================================================

ALTER TABLE public.consent_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consent_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_cookie_consents ENABLE ROW LEVEL SECURITY;

-- Policy versions: Public read, admin write
DROP POLICY IF EXISTS consent_policy_versions_public_read ON public.consent_policy_versions;
CREATE POLICY consent_policy_versions_public_read ON public.consent_policy_versions
  FOR SELECT TO anon, authenticated
  USING (effective_date <= now());

DROP POLICY IF EXISTS consent_policy_versions_admin_all ON public.consent_policy_versions;
CREATE POLICY consent_policy_versions_admin_all ON public.consent_policy_versions
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Audit log: Insert for all (via API), read for admins
DROP POLICY IF EXISTS cookie_consent_audit_insert ON public.cookie_consent_audit;
CREATE POLICY cookie_consent_audit_insert ON public.cookie_consent_audit
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS cookie_consent_audit_admin_read ON public.cookie_consent_audit;
CREATE POLICY cookie_consent_audit_admin_read ON public.cookie_consent_audit
  FOR SELECT TO authenticated
  USING (public.is_system_admin() OR user_id = auth.uid());

-- Anonymous consents: Insert/update for all, read for admins
DROP POLICY IF EXISTS anonymous_cookie_consents_upsert ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_upsert ON public.anonymous_cookie_consents
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS anonymous_cookie_consents_update ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_update ON public.anonymous_cookie_consents
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS anonymous_cookie_consents_admin_read ON public.anonymous_cookie_consents;
CREATE POLICY anonymous_cookie_consents_admin_read ON public.anonymous_cookie_consents
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

-- ============================================================================
-- 7. Seed initial policy version
-- ============================================================================

INSERT INTO public.consent_policy_versions (version, policy_text_translations, change_summary, requires_reconsent, effective_date)
VALUES (
  '1.0',
  jsonb_build_object(
    'en', 'Initial cookie consent policy version.',
    'no', 'Første versjon av informasjonskapselpolicy.',
    'sv', 'Första versionen av cookiepolicyn.'
  ),
  'Initial release',
  false,
  now()
)
ON CONFLICT (version) DO NOTHING;

-- ============================================================================
-- 8. Grants
-- ============================================================================

GRANT SELECT ON public.consent_policy_versions TO anon, authenticated;
GRANT SELECT, INSERT ON public.cookie_consent_audit TO anon, authenticated;
GRANT SELECT ON public.cookie_consent_statistics TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.anonymous_cookie_consents TO anon, authenticated;

-- Admin full access
GRANT ALL ON public.consent_policy_versions TO authenticated;
GRANT SELECT ON public.cookie_consent_audit TO authenticated;
GRANT ALL ON public.anonymous_cookie_consents TO authenticated;
