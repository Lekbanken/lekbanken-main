-- =========================================
-- ANALYTICS DOMAIN SCHEMA
-- Version 1.0
-- Date: 2025-11-29
-- =========================================
-- This migration adds analytics and tracking for user engagement, feature usage, and performance

-- =========================================
-- 1. PAGE VIEWS & SESSION TRACKING
-- =========================================

CREATE TABLE page_views (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_view_key       text UNIQUE,
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  page_path           text NOT NULL,
  page_title          text,
  referrer            text,
  duration_seconds    integer,
  device_type         text,
  browser_name        text,
  browser_version     text,
  os_name             text,
  os_version          text,
  ip_address          text,
  country_code        text,
  region              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX page_views_page_view_key_idx ON page_views (page_view_key);
CREATE INDEX page_views_user_idx ON page_views (user_id);
CREATE INDEX page_views_tenant_idx ON page_views (tenant_id);
CREATE INDEX page_views_page_path_idx ON page_views (page_path);
CREATE INDEX page_views_created_at_idx ON page_views (created_at DESC);

-- =========================================
-- 2. SESSION ANALYTICS
-- =========================================

CREATE TABLE session_analytics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key         text UNIQUE,
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  game_id             uuid REFERENCES games (id) ON DELETE SET NULL,
  session_duration    integer NOT NULL,
  pages_visited       integer NOT NULL DEFAULT 0,
  actions_count       integer NOT NULL DEFAULT 0,
  score               integer,
  completed           boolean NOT NULL DEFAULT false,
  exit_page           text,
  device_type         text,
  referrer            text,
  entry_point         text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  ended_at            timestamptz
);

CREATE INDEX session_analytics_session_key_idx ON session_analytics (session_key);
CREATE INDEX session_analytics_user_idx ON session_analytics (user_id);
CREATE INDEX session_analytics_tenant_idx ON session_analytics (tenant_id);
CREATE INDEX session_analytics_game_idx ON session_analytics (game_id);
CREATE INDEX session_analytics_completed_idx ON session_analytics (completed);
CREATE INDEX session_analytics_created_at_idx ON session_analytics (created_at DESC);

-- =========================================
-- 3. FEATURE USAGE TRACKING
-- =========================================

CREATE TABLE feature_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature_key         text UNIQUE,
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  feature_name        text NOT NULL,
  category            text,
  action_type         text NOT NULL,
  metadata            jsonb,
  duration_ms         integer,
  success             boolean DEFAULT true,
  error_message       text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feature_usage_feature_key_idx ON feature_usage (feature_key);
CREATE INDEX feature_usage_user_idx ON feature_usage (user_id);
CREATE INDEX feature_usage_tenant_idx ON feature_usage (tenant_id);
CREATE INDEX feature_usage_feature_name_idx ON feature_usage (feature_name);
CREATE INDEX feature_usage_action_type_idx ON feature_usage (action_type);
CREATE INDEX feature_usage_success_idx ON feature_usage (success);
CREATE INDEX feature_usage_created_at_idx ON feature_usage (created_at DESC);

-- =========================================
-- 4. TIME SERIES ANALYTICS (AGGREGATED)
-- =========================================

CREATE TABLE analytics_timeseries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timeseries_key      text UNIQUE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  metric_type         text NOT NULL,
  metric_name         text NOT NULL,
  value               numeric NOT NULL,
  count               integer NOT NULL DEFAULT 1,
  breakdown_by        text,
  breakdown_value     text,
  time_bucket         timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX analytics_timeseries_timeseries_key_idx ON analytics_timeseries (timeseries_key);
CREATE INDEX analytics_timeseries_tenant_idx ON analytics_timeseries (tenant_id);
CREATE INDEX analytics_timeseries_metric_idx ON analytics_timeseries (metric_type, metric_name);
CREATE INDEX analytics_timeseries_time_bucket_idx ON analytics_timeseries (time_bucket DESC);

-- =========================================
-- 5. FUNNEL ANALYTICS
-- =========================================

CREATE TABLE funnel_analytics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  funnel_key          text UNIQUE,
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  funnel_name         text NOT NULL,
  step_1              boolean NOT NULL DEFAULT false,
  step_2              boolean NOT NULL DEFAULT false,
  step_3              boolean NOT NULL DEFAULT false,
  step_4              boolean NOT NULL DEFAULT false,
  step_5              boolean NOT NULL DEFAULT false,
  completed           boolean NOT NULL DEFAULT false,
  abandoned_at_step   integer,
  duration_seconds    integer,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX funnel_analytics_funnel_key_idx ON funnel_analytics (funnel_key);
CREATE INDEX funnel_analytics_user_idx ON funnel_analytics (user_id);
CREATE INDEX funnel_analytics_tenant_idx ON funnel_analytics (tenant_id);
CREATE INDEX funnel_analytics_funnel_name_idx ON funnel_analytics (funnel_name);
CREATE INDEX funnel_analytics_completed_idx ON funnel_analytics (completed);
CREATE INDEX funnel_analytics_created_at_idx ON funnel_analytics (created_at DESC);

-- =========================================
-- 6. ERROR TRACKING
-- =========================================

CREATE TABLE error_tracking (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  error_key           text UNIQUE,
  user_id             uuid REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  error_type          text NOT NULL,
  error_message       text,
  stack_trace         text,
  page_path           text,
  severity            text DEFAULT 'warning',
  resolved             boolean NOT NULL DEFAULT false,
  occurrence_count    integer NOT NULL DEFAULT 1,
  last_occurred_at    timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX error_tracking_error_key_idx ON error_tracking (error_key);
CREATE INDEX error_tracking_user_idx ON error_tracking (user_id);
CREATE INDEX error_tracking_tenant_idx ON error_tracking (tenant_id);
CREATE INDEX error_tracking_error_type_idx ON error_tracking (error_type);
CREATE INDEX error_tracking_resolved_idx ON error_tracking (resolved);
CREATE INDEX error_tracking_created_at_idx ON error_tracking (created_at DESC);

-- =========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_timeseries ENABLE ROW LEVEL SECURITY;
ALTER TABLE funnel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_tracking ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 8. RLS POLICIES
-- =========================================

-- PAGE_VIEWS: Users can insert their own page views
CREATE POLICY "users_can_insert_page_views"
ON page_views FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- PAGE_VIEWS: Admins can select all page views
CREATE POLICY "admins_can_select_page_views"
ON page_views FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- SESSION_ANALYTICS: Users can insert their own sessions
CREATE POLICY "users_can_insert_sessions"
ON session_analytics FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- SESSION_ANALYTICS: Admins can select sessions
CREATE POLICY "admins_can_select_sessions"
ON session_analytics FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- FEATURE_USAGE: Users can insert their own feature usage
CREATE POLICY "users_can_insert_feature_usage"
ON feature_usage FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- FEATURE_USAGE: Admins can select feature usage
CREATE POLICY "admins_can_select_feature_usage"
ON feature_usage FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- ANALYTICS_TIMESERIES: Admins can select time series
CREATE POLICY "admins_can_select_timeseries"
ON analytics_timeseries FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- ANALYTICS_TIMESERIES: System can insert time series
CREATE POLICY "system_can_insert_timeseries"
ON analytics_timeseries FOR INSERT
WITH CHECK (true);

-- FUNNEL_ANALYTICS: Users can insert their own funnels
CREATE POLICY "users_can_insert_funnels"
ON funnel_analytics FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- FUNNEL_ANALYTICS: Admins can select funnels
CREATE POLICY "admins_can_select_funnels"
ON funnel_analytics FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- ERROR_TRACKING: Users can insert errors
CREATE POLICY "users_can_insert_errors"
ON error_tracking FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- ERROR_TRACKING: Admins can select errors
CREATE POLICY "admins_can_select_errors"
ON error_tracking FOR SELECT
USING (
  tenant_id = ANY(get_user_tenant_ids())
);

-- =========================================
-- 9. COMMENTS
-- =========================================

COMMENT ON TABLE page_views IS 'Tracks individual page views with device and geo info';
COMMENT ON TABLE session_analytics IS 'Session-level analytics with duration, completion, score';
COMMENT ON TABLE feature_usage IS 'Tracks feature adoption, action types, and performance';
COMMENT ON TABLE analytics_timeseries IS 'Aggregated time-series metrics for dashboard display';
COMMENT ON TABLE funnel_analytics IS 'Funnel conversion tracking with step-by-step progression';
COMMENT ON TABLE error_tracking IS 'Error logging and tracking with aggregation';

