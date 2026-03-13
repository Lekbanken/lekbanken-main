-- GDPR Compliance Tables
-- Migration for Svenska Kyrkan Enterprise Compliance
-- Generated: 2026-01-13

-- =============================================================================
-- 1. Extended Consent Management
-- =============================================================================

-- User Consents (GDPR Art. 6, 7, 9)
CREATE TABLE IF NOT EXISTS public.user_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Consent Details
  consent_type text NOT NULL CHECK (consent_type IN (
    'essential',        -- Always required
    'functional',       -- Preferences
    'analytics',        -- Usage analytics
    'marketing',        -- Marketing communications
    'special_category', -- GDPR Art. 9 (religion, health, etc.)
    'parental'          -- GDPR Art. 8 (children)
  )),
  purpose text NOT NULL,
  
  -- Consent State
  granted boolean NOT NULL,
  
  -- Versioning
  policy_version text NOT NULL,
  
  -- Timestamps
  granted_at timestamptz,
  withdrawn_at timestamptz,
  expires_at timestamptz,
  
  -- Context (for accountability)
  ip_address inet,
  user_agent text,
  
  -- Parental Consent (for children under 18)
  parental_consent boolean DEFAULT false,
  parent_user_id uuid REFERENCES public.users(id),
  verified_at timestamptz,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Ensure one active consent per type per user per version
  UNIQUE(user_id, consent_type, purpose, policy_version)
);

-- Indexes for user_consents
CREATE INDEX IF NOT EXISTS idx_user_consents_user ON public.user_consents(user_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_user_consents_tenant ON public.user_consents(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_consents_granted ON public.user_consents(user_id) WHERE granted = true;

-- =============================================================================
-- 2. Data Access Logging (GDPR Art. 30 - Accountability)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.data_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who accessed
  accessor_user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  accessor_role text,
  accessor_ip inet,
  accessor_user_agent text,
  
  -- What was accessed
  subject_user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  data_category text NOT NULL,
  fields_accessed text[], -- Specific fields accessed
  operation text NOT NULL CHECK (operation IN (
    'read', 'create', 'update', 'delete', 'export', 'bulk_read'
  )),
  
  -- Context
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  request_path text,
  request_method text,
  
  -- Legal basis
  legal_basis text CHECK (legal_basis IN (
    'consent', 'contract', 'legal_obligation', 
    'vital_interest', 'public_task', 'legitimate_interest'
  )),
  purpose text,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for data_access_log
CREATE INDEX IF NOT EXISTS idx_data_access_log_subject ON public.data_access_log(subject_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_accessor ON public.data_access_log(accessor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_tenant ON public.data_access_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_access_log_operation ON public.data_access_log(operation, created_at DESC);

-- =============================================================================
-- 3. GDPR Requests Tracking (Art. 12 - Response within 30 days)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.gdpr_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE SET NULL,
  
  -- Request Type (GDPR Articles)
  request_type text NOT NULL CHECK (request_type IN (
    'access',       -- Art. 15 - Right of access
    'rectification', -- Art. 16 - Right to rectification
    'erasure',      -- Art. 17 - Right to erasure
    'restriction',  -- Art. 18 - Right to restriction
    'portability',  -- Art. 20 - Right to data portability
    'objection'     -- Art. 21 - Right to object
  )),
  
  -- Status
  status text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',      -- Awaiting processing
    'in_progress',  -- Being processed
    'completed',    -- Successfully completed
    'rejected',     -- Rejected with reason
    'cancelled'     -- Cancelled by user
  )),
  
  -- Details
  request_details jsonb,
  response_details jsonb,
  rejection_reason text,
  
  -- Handling
  handled_by uuid REFERENCES public.users(id),
  
  -- Timestamps
  requested_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  completed_at timestamptz,
  
  -- GDPR Compliance: 30-day deadline
  response_deadline timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for gdpr_requests
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_user ON public.gdpr_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_deadline ON public.gdpr_requests(response_deadline) 
  WHERE status IN ('pending', 'in_progress');
CREATE INDEX IF NOT EXISTS idx_gdpr_requests_handler ON public.gdpr_requests(handled_by) 
  WHERE status = 'in_progress';

-- =============================================================================
-- 4. Data Retention Policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,
  
  -- Policy Definition
  data_category text NOT NULL,
  table_name text, -- Specific table if applicable
  
  -- Retention Rules
  retention_period interval NOT NULL,
  rationale text NOT NULL,
  legal_basis text,
  
  -- Actions
  action_on_expiry text NOT NULL CHECK (action_on_expiry IN (
    'delete',     -- Hard delete
    'anonymize',  -- Remove PII, keep aggregate
    'archive'     -- Move to archive storage
  )),
  
  -- Scheduling
  is_active boolean NOT NULL DEFAULT true,
  last_executed_at timestamptz,
  next_execution_at timestamptz,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id)
);

-- One policy per category per tenant (null = global)
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_retention_policies_unique 
  ON public.data_retention_policies(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), data_category);

-- =============================================================================
-- 5. Data Breach Notifications (GDPR Art. 33, 34)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.data_breach_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Incident Reference
  incident_id text NOT NULL UNIQUE,
  
  -- Breach Details
  breach_type text NOT NULL,
  description text NOT NULL,
  discovered_at timestamptz NOT NULL,
  occurred_at timestamptz,
  
  -- Impact Assessment
  affected_users_count int,
  affected_tenants jsonb, -- Array of tenant IDs
  data_categories_affected text[],
  risk_assessment text CHECK (risk_assessment IN ('low', 'medium', 'high', 'critical')),
  
  -- Notifications
  dpa_notified boolean NOT NULL DEFAULT false,
  dpa_notified_at timestamptz,
  dpa_notification_deadline timestamptz, -- 72 hours
  
  users_notified boolean NOT NULL DEFAULT false,
  users_notified_at timestamptz,
  users_notification_required boolean,
  
  -- Remediation
  remediation_steps text[],
  preventive_measures text[],
  
  -- Status
  status text NOT NULL DEFAULT 'open' CHECK (status IN (
    'open', 'investigating', 'contained', 'resolved', 'closed'
  )),
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  closed_at timestamptz,
  closed_by uuid REFERENCES public.users(id)
);

-- =============================================================================
-- 6. RLS Policies
-- =============================================================================

ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gdpr_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_breach_notifications ENABLE ROW LEVEL SECURITY;

-- User Consents: Users can manage their own consents
DROP POLICY IF EXISTS user_consents_owner ON public.user_consents;
CREATE POLICY user_consents_owner ON public.user_consents
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- User Consents: System admins can view all
DROP POLICY IF EXISTS user_consents_admin ON public.user_consents;
CREATE POLICY user_consents_admin ON public.user_consents
  FOR SELECT TO authenticated
  USING (public.is_system_admin());

-- Data Access Log: Users can see their own access history
DROP POLICY IF EXISTS data_access_log_subject ON public.data_access_log;
CREATE POLICY data_access_log_subject ON public.data_access_log
  FOR SELECT TO authenticated
  USING (subject_user_id = (SELECT auth.uid()));

-- Data Access Log: Admins can see tenant access log
DROP POLICY IF EXISTS data_access_log_tenant_admin ON public.data_access_log;
CREATE POLICY data_access_log_tenant_admin ON public.data_access_log
  FOR SELECT TO authenticated
  USING (
    tenant_id IS NOT NULL AND
    public.has_tenant_role(tenant_id, ARRAY['owner', 'admin']::public.tenant_role_enum[])
  );

-- Data Access Log: System admins can see all
DROP POLICY IF EXISTS data_access_log_system_admin ON public.data_access_log;
CREATE POLICY data_access_log_system_admin ON public.data_access_log
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- GDPR Requests: Users can manage their own requests
DROP POLICY IF EXISTS gdpr_requests_owner ON public.gdpr_requests;
CREATE POLICY gdpr_requests_owner ON public.gdpr_requests
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- GDPR Requests: System admins can manage all
DROP POLICY IF EXISTS gdpr_requests_admin ON public.gdpr_requests;
CREATE POLICY gdpr_requests_admin ON public.gdpr_requests
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Data Retention Policies: System admins only
DROP POLICY IF EXISTS data_retention_policies_admin ON public.data_retention_policies;
CREATE POLICY data_retention_policies_admin ON public.data_retention_policies
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- Data Breach Notifications: System admins only
DROP POLICY IF EXISTS data_breach_notifications_admin ON public.data_breach_notifications;
CREATE POLICY data_breach_notifications_admin ON public.data_breach_notifications
  FOR ALL TO authenticated
  USING (public.is_system_admin())
  WITH CHECK (public.is_system_admin());

-- =============================================================================
-- 7. Helper Functions
-- =============================================================================

-- Function to log data access automatically
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_subject_user_id uuid,
  p_data_category text,
  p_operation text,
  p_fields_accessed text[] DEFAULT NULL,
  p_legal_basis text DEFAULT 'contract',
  p_purpose text DEFAULT 'service_delivery'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.data_access_log (
    accessor_user_id,
    subject_user_id,
    data_category,
    fields_accessed,
    operation,
    tenant_id,
    legal_basis,
    purpose
  ) VALUES (
    auth.uid(),
    p_subject_user_id,
    p_data_category,
    p_fields_accessed,
    p_operation,
    NULL, -- Can be enhanced to detect tenant
    p_legal_basis,
    p_purpose
  );
END;
$$;

-- Function to check GDPR request deadline compliance
CREATE OR REPLACE FUNCTION public.check_gdpr_deadlines()
RETURNS TABLE (
  request_id uuid,
  user_id uuid,
  request_type text,
  days_remaining int,
  is_overdue boolean
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT 
    id as request_id,
    user_id,
    request_type,
    EXTRACT(DAY FROM (response_deadline - now()))::int as days_remaining,
    now() > response_deadline as is_overdue
  FROM public.gdpr_requests
  WHERE status IN ('pending', 'in_progress')
  ORDER BY response_deadline ASC;
$$;

-- =============================================================================
-- 8. Seed Default Retention Policies
-- =============================================================================

INSERT INTO public.data_retention_policies (
  tenant_id, data_category, retention_period, rationale, legal_basis, action_on_expiry
) VALUES
  (NULL, 'user_profile', interval '2 years', 'Account data retained while active + 2 years after deletion', 'contract', 'anonymize'),
  (NULL, 'user_activity', interval '2 years', 'Activity history for service improvement', 'legitimate_interest', 'anonymize'),
  (NULL, 'session_data', interval '90 days', 'Session data for debugging and support', 'contract', 'delete'),
  (NULL, 'audit_logs', interval '7 years', 'Legal requirement for financial records', 'legal_obligation', 'archive'),
  (NULL, 'consent_records', interval '7 years', 'Proof of consent for GDPR compliance', 'legal_obligation', 'archive'),
  (NULL, 'gdpr_requests', interval '7 years', 'Documentation of GDPR request handling', 'legal_obligation', 'archive'),
  (NULL, 'payment_data', interval '7 years', 'Swedish accounting law (Bokföringslagen)', 'legal_obligation', 'archive'),
  (NULL, 'marketing_data', interval '30 days', 'Marketing preferences after consent withdrawal', 'consent', 'delete')
ON CONFLICT DO NOTHING;

-- =============================================================================
-- 9. Triggers for Updated At
-- =============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_consents_updated_at ON public.user_consents;
CREATE TRIGGER user_consents_updated_at
  BEFORE UPDATE ON public.user_consents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS gdpr_requests_updated_at ON public.gdpr_requests;
CREATE TRIGGER gdpr_requests_updated_at
  BEFORE UPDATE ON public.gdpr_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS data_retention_policies_updated_at ON public.data_retention_policies;
CREATE TRIGGER data_retention_policies_updated_at
  BEFORE UPDATE ON public.data_retention_policies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS data_breach_notifications_updated_at ON public.data_breach_notifications;
CREATE TRIGGER data_breach_notifications_updated_at
  BEFORE UPDATE ON public.data_breach_notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Migration Complete
-- =============================================================================
