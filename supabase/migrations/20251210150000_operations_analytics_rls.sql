-- Operations Domain: RLS policies for analytics tables
-- This migration adds Row Level Security policies to analytics tables to prevent unauthorized data access

-- =========================================
-- ERROR_TRACKING RLS POLICIES
-- =========================================

-- Enable RLS if not already enabled
ALTER TABLE public.error_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS error_tracking_select ON public.error_tracking;
DROP POLICY IF EXISTS error_tracking_insert ON public.error_tracking;

-- SELECT: System admins can see all errors, tenant admins can see their tenant's errors
CREATE POLICY error_tracking_select ON public.error_tracking
  FOR SELECT
  USING (
    -- System admins see everything
    is_system_admin()
    OR
    -- Tenant admins see their tenant's errors
    (
      tenant_id IS NOT NULL 
      AND is_tenant_admin(tenant_id, auth.uid())
    )
    OR
    -- Users can see their own errors
    (auth.uid() = user_id)
  );

-- INSERT: Service role can insert errors (for server-side tracking)
CREATE POLICY error_tracking_insert ON public.error_tracking
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (controlled by service role)

-- =========================================
-- PAGE_VIEWS RLS POLICIES
-- =========================================

-- Enable RLS if not already enabled
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS page_views_select ON public.page_views;
DROP POLICY IF EXISTS page_views_insert ON public.page_views;

-- SELECT: System admins can see all page views, tenant admins can see their tenant's views
CREATE POLICY page_views_select ON public.page_views
  FOR SELECT
  USING (
    -- System admins see everything
    is_system_admin()
    OR
    -- Tenant admins see their tenant's page views
    (
      tenant_id IS NOT NULL 
      AND is_tenant_admin(tenant_id, auth.uid())
    )
    OR
    -- Users can see their own page views
    (auth.uid() = user_id)
  );

-- INSERT: Service role can insert page views (for analytics tracking)
CREATE POLICY page_views_insert ON public.page_views
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (controlled by service role)

-- =========================================
-- FEATURE_USAGE RLS POLICIES
-- =========================================

-- Enable RLS if not already enabled
ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS feature_usage_select ON public.feature_usage;
DROP POLICY IF EXISTS feature_usage_insert ON public.feature_usage;

-- SELECT: System admins can see all feature usage, tenant admins can see their tenant's usage
CREATE POLICY feature_usage_select ON public.feature_usage
  FOR SELECT
  USING (
    -- System admins see everything
    is_system_admin()
    OR
    -- Tenant admins see their tenant's feature usage
    (
      tenant_id IS NOT NULL 
      AND is_tenant_admin(tenant_id, auth.uid())
    )
    OR
    -- Users can see their own feature usage
    (auth.uid() = user_id)
  );

-- INSERT: Service role can insert feature usage (for analytics tracking)
CREATE POLICY feature_usage_insert ON public.feature_usage
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (controlled by service role)

-- =========================================
-- SESSION_ANALYTICS RLS POLICIES
-- =========================================

-- Enable RLS if not already enabled
ALTER TABLE public.session_analytics ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS session_analytics_select ON public.session_analytics;
DROP POLICY IF EXISTS session_analytics_insert ON public.session_analytics;

-- SELECT: System admins can see all sessions, tenant admins can see their tenant's sessions
CREATE POLICY session_analytics_select ON public.session_analytics
  FOR SELECT
  USING (
    -- System admins see everything
    is_system_admin()
    OR
    -- Tenant admins see their tenant's sessions
    (
      tenant_id IS NOT NULL 
      AND is_tenant_admin(tenant_id, auth.uid())
    )
    OR
    -- Users can see their own sessions
    (auth.uid() = user_id)
  );

-- INSERT: Service role can insert sessions (for analytics tracking)
CREATE POLICY session_analytics_insert ON public.session_analytics
  FOR INSERT
  WITH CHECK (true); -- Allow all inserts (controlled by service role)

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON POLICY error_tracking_select ON public.error_tracking IS 
  'Allow system admins to see all errors, tenant admins to see their tenant errors, users to see their own errors';

COMMENT ON POLICY page_views_select ON public.page_views IS 
  'Allow system admins to see all page views, tenant admins to see their tenant views, users to see their own views';

COMMENT ON POLICY feature_usage_select ON public.feature_usage IS 
  'Allow system admins to see all feature usage, tenant admins to see their tenant usage, users to see their own usage';

COMMENT ON POLICY session_analytics_select ON public.session_analytics IS 
  'Allow system admins to see all sessions, tenant admins to see their tenant sessions, users to see their own sessions';
