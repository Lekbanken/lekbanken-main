import { supabase } from '@/lib/supabase/client';

// =========================================
// TYPES & INTERFACES
// =========================================

export interface PageView {
  id: string;
  page_view_key: string;
  user_id: string | null;
  tenant_id: string | null;
  page_path: string;
  page_title: string | null;
  referrer: string | null;
  duration_seconds: number | null;
  device_type: string | null;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  ip_address: string | null;
  country_code: string | null;
  region: string | null;
  created_at: string;
}

export interface SessionAnalytics {
  id: string;
  session_key: string;
  user_id: string | null;
  tenant_id: string | null;
  game_id: string | null;
  session_duration: number;
  pages_visited: number;
  actions_count: number;
  score: number | null;
  completed: boolean;
  exit_page: string | null;
  device_type: string | null;
  referrer: string | null;
  entry_point: string | null;
  created_at: string;
  ended_at: string | null;
}

export interface FeatureUsage {
  id: string;
  feature_key: string;
  user_id: string | null;
  tenant_id: string | null;
  feature_name: string;
  category: string | null;
  action_type: string;
  metadata: Record<string, unknown> | null;
  duration_ms: number | null;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export interface AnalyticsTimeseries {
  id: string;
  timeseries_key: string;
  tenant_id: string | null;
  metric_type: string;
  metric_name: string;
  value: number;
  count: number;
  breakdown_by: string | null;
  breakdown_value: string | null;
  time_bucket: string;
  created_at: string;
}

export interface FunnelAnalytics {
  id: string;
  funnel_key: string;
  user_id: string | null;
  tenant_id: string | null;
  funnel_name: string;
  step_1: boolean;
  step_2: boolean;
  step_3: boolean;
  step_4: boolean;
  step_5: boolean;
  completed: boolean;
  abandoned_at_step: number | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface ErrorTracking {
  id: string;
  error_key: string;
  user_id: string | null;
  tenant_id: string | null;
  error_type: string;
  error_message: string | null;
  stack_trace: string | null;
  page_path: string | null;
  severity: string;
  resolved: boolean;
  occurrence_count: number;
  last_occurred_at: string | null;
  created_at: string;
}

export interface PageViewParams {
  userId?: string | null;
  tenantId?: string | null;
  pagePath: string;
  pageTitle?: string;
  referrer?: string;
  durationSeconds?: number;
  deviceType?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  ipAddress?: string;
  countryCode?: string;
  region?: string;
}

export interface SessionAnalyticsParams {
  userId?: string | null;
  tenantId?: string | null;
  gameId?: string | null;
  sessionDuration: number;
  pagesVisited?: number;
  actionsCount?: number;
  score?: number;
  completed?: boolean;
  exitPage?: string;
  deviceType?: string;
  referrer?: string;
  entryPoint?: string;
}

export interface FeatureUsageParams {
  userId?: string | null;
  tenantId?: string | null;
  featureName: string;
  category?: string;
  actionType: string;
  metadata?: Record<string, unknown>;
  durationMs?: number;
  success?: boolean;
  errorMessage?: string;
}

// =========================================
// PAGE VIEW FUNCTIONS
// =========================================

export async function trackPageView(params: PageViewParams): Promise<PageView | null> {
  try {
    const { data, error } = await supabase
      .from('page_views')
      .insert({
        user_id: params.userId || null,
        tenant_id: params.tenantId || null,
        page_path: params.pagePath,
        page_title: params.pageTitle || null,
        referrer: params.referrer || null,
        duration_seconds: params.durationSeconds || null,
        device_type: params.deviceType || null,
        browser_name: params.browserName || null,
        browser_version: params.browserVersion || null,
        os_name: params.osName || null,
        os_version: params.osVersion || null,
        ip_address: params.ipAddress || null,
        country_code: params.countryCode || null,
        region: params.region || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking page view:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error tracking page view:', err);
    return null;
  }
}

export async function getPageViewStats(
  tenantId: string | null,
  startDate: string,
  endDate: string
): Promise<{ total: number; unique: number; avgDuration: number } | null> {
  try {
    const query = tenantId
      ? supabase
          .from('page_views')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      : supabase
          .from('page_views')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching page view stats:', error);
      return null;
    }

    const views = data || [];
    const uniqueUsers = new Set(views.map((v) => v.user_id)).size;
    const totalDuration = views.reduce((sum, v) => sum + (v.duration_seconds || 0), 0);
    const avgDuration = views.length > 0 ? totalDuration / views.length : 0;

    return {
      total: views.length,
      unique: uniqueUsers,
      avgDuration: Math.round(avgDuration),
    };
  } catch (err) {
    console.error('Error fetching page view stats:', err);
    return null;
  }
}

export async function getTopPages(
  tenantId: string | null,
  limit = 10
): Promise<Array<{ path: string; views: number; avgDuration: number }> | null> {
  try {
    const query = tenantId
      ? supabase.from('page_views').select('*').eq('tenant_id', tenantId)
      : supabase.from('page_views').select('*');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching top pages:', error);
      return null;
    }

    const views = data || [];
    const pageStats = views.reduce(
      (acc, view) => {
        const path = view.page_path;
        if (!acc[path]) {
          acc[path] = { views: 0, totalDuration: 0 };
        }
        acc[path].views += 1;
        acc[path].totalDuration += view.duration_seconds || 0;
        return acc;
      },
      {} as Record<string, { views: number; totalDuration: number }>
    );

    return Object.entries(pageStats)
      .map(([path, stats]) => ({
        path,
        views: stats.views,
        avgDuration: Math.round(stats.totalDuration / stats.views),
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, limit);
  } catch (err) {
    console.error('Error fetching top pages:', err);
    return null;
  }
}

// =========================================
// SESSION ANALYTICS FUNCTIONS
// =========================================

export async function trackSession(params: SessionAnalyticsParams): Promise<SessionAnalytics | null> {
  try {
    const { data, error } = await supabase
      .from('session_analytics')
      .insert({
        user_id: params.userId || null,
        tenant_id: params.tenantId || null,
        game_id: params.gameId || null,
        session_duration: params.sessionDuration,
        pages_visited: params.pagesVisited || 0,
        actions_count: params.actionsCount || 0,
        score: params.score || null,
        completed: params.completed || false,
        exit_page: params.exitPage || null,
        device_type: params.deviceType || null,
        referrer: params.referrer || null,
        entry_point: params.entryPoint || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking session:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error tracking session:', err);
    return null;
  }
}

export async function getSessionStats(
  tenantId: string | null,
  startDate: string,
  endDate: string
): Promise<{
  totalSessions: number;
  completedSessions: number;
  avgDuration: number;
  avgScore: number;
} | null> {
  try {
    const query = tenantId
      ? supabase
          .from('session_analytics')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      : supabase
          .from('session_analytics')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching session stats:', error);
      return null;
    }

    const sessions = data || [];
    const completedCount = sessions.filter((s) => s.completed).length;
    const totalDuration = sessions.reduce((sum, s) => sum + s.session_duration, 0);
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);

    return {
      totalSessions: sessions.length,
      completedSessions: completedCount,
      avgDuration: sessions.length > 0 ? Math.round(totalDuration / sessions.length) : 0,
      avgScore: completedCount > 0 ? Math.round(totalScore / completedCount) : 0,
    };
  } catch (err) {
    console.error('Error fetching session stats:', err);
    return null;
  }
}

export async function getGameSessionStats(
  tenantId: string | null,
  gameId: string,
  startDate: string,
  endDate: string
): Promise<{
  plays: number;
  completionRate: number;
  avgScore: number;
} | null> {
  try {
    const query = supabase
      .from('session_analytics')
      .select('*')
      .eq('game_id', gameId)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (tenantId) {
      query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching game session stats:', error);
      return null;
    }

    const sessions = data || [];
    const completedCount = sessions.filter((s) => s.completed).length;
    const totalScore = sessions.reduce((sum, s) => sum + (s.score || 0), 0);

    return {
      plays: sessions.length,
      completionRate: sessions.length > 0 ? Math.round((completedCount / sessions.length) * 100) : 0,
      avgScore: completedCount > 0 ? Math.round(totalScore / completedCount) : 0,
    };
  } catch (err) {
    console.error('Error fetching game session stats:', err);
    return null;
  }
}

// =========================================
// FEATURE USAGE FUNCTIONS
// =========================================

export async function trackFeatureUsage(params: FeatureUsageParams): Promise<FeatureUsage | null> {
  try {
    const { data, error } = await supabase
      .from('feature_usage')
      .insert({
        user_id: params.userId || null,
        tenant_id: params.tenantId || null,
        feature_name: params.featureName,
        category: params.category || null,
        action_type: params.actionType,
        metadata: params.metadata || null,
        duration_ms: params.durationMs || null,
        success: params.success !== false,
        error_message: params.errorMessage || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking feature usage:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error tracking feature usage:', err);
    return null;
  }
}

export async function getFeatureUsageStats(
  tenantId: string | null,
  featureName: string,
  startDate: string,
  endDate: string
): Promise<{
  totalUsage: number;
  successRate: number;
  avgDuration: number;
  uniqueUsers: number;
} | null> {
  try {
    const query = supabase
      .from('feature_usage')
      .select('*')
      .eq('feature_name', featureName)
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (tenantId) {
      query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feature usage stats:', error);
      return null;
    }

    const usage = data || [];
    const successCount = usage.filter((u) => u.success).length;
    const totalDuration = usage.reduce((sum, u) => sum + (u.duration_ms || 0), 0);
    const uniqueUsers = new Set(usage.map((u) => u.user_id)).size;

    return {
      totalUsage: usage.length,
      successRate: usage.length > 0 ? Math.round((successCount / usage.length) * 100) : 0,
      avgDuration: usage.length > 0 ? Math.round(totalDuration / usage.length) : 0,
      uniqueUsers,
    };
  } catch (err) {
    console.error('Error fetching feature usage stats:', err);
    return null;
  }
}

export async function getTopFeatures(
  tenantId: string | null,
  limit = 10
): Promise<Array<{ name: string; usage: number; successRate: number }> | null> {
  try {
    const query = tenantId
      ? supabase.from('feature_usage').select('*').eq('tenant_id', tenantId)
      : supabase.from('feature_usage').select('*');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching top features:', error);
      return null;
    }

    const usage = data || [];
    const featureStats = usage.reduce(
      (acc, use) => {
        const name = use.feature_name;
        if (!acc[name]) {
          acc[name] = { usage: 0, successCount: 0 };
        }
        acc[name].usage += 1;
        if (use.success) acc[name].successCount += 1;
        return acc;
      },
      {} as Record<string, { usage: number; successCount: number }>
    );

    return Object.entries(featureStats)
      .map(([name, stats]) => ({
        name,
        usage: stats.usage,
        successRate: Math.round((stats.successCount / stats.usage) * 100),
      }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, limit);
  } catch (err) {
    console.error('Error fetching top features:', err);
    return null;
  }
}

// =========================================
// ERROR TRACKING FUNCTIONS
// =========================================

export async function trackError(
  userId: string | null,
  tenantId: string | null,
  errorType: string,
  errorMessage: string,
  stackTrace?: string,
  pagePath?: string
): Promise<ErrorTracking | null> {
  try {
    const { data, error } = await supabase
      .from('error_tracking')
      .insert({
        user_id: userId,
        tenant_id: tenantId,
        error_type: errorType,
        error_message: errorMessage,
        stack_trace: stackTrace || null,
        page_path: pagePath || null,
        severity: 'warning',
        resolved: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error tracking error:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error tracking error:', err);
    return null;
  }
}

export async function getErrorStats(
  tenantId: string | null,
  startDate: string,
  endDate: string
): Promise<{ totalErrors: number; uniqueTypes: number; unresolvedCount: number } | null> {
  try {
    const query = tenantId
      ? supabase
          .from('error_tracking')
          .select('*')
          .eq('tenant_id', tenantId)
          .gte('created_at', startDate)
          .lte('created_at', endDate)
      : supabase
          .from('error_tracking')
          .select('*')
          .gte('created_at', startDate)
          .lte('created_at', endDate);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching error stats:', error);
      return null;
    }

    const errors = data || [];
    const uniqueTypes = new Set(errors.map((e) => e.error_type)).size;
    const unresolvedCount = errors.filter((e) => !e.resolved).length;

    return {
      totalErrors: errors.length,
      uniqueTypes,
      unresolvedCount,
    };
  } catch (err) {
    console.error('Error fetching error stats:', err);
    return null;
  }
}

export async function getTopErrors(
  tenantId: string | null,
  limit = 10
): Promise<Array<{ type: string; message: string; count: number }> | null> {
  try {
    const query = tenantId
      ? supabase.from('error_tracking').select('*').eq('tenant_id', tenantId)
      : supabase.from('error_tracking').select('*');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching top errors:', error);
      return null;
    }

    const errors = data || [];
    const errorMap = errors.reduce(
      (acc, err) => {
        const key = `${err.error_type}:${err.error_message}`;
        if (!acc[key]) {
          acc[key] = { type: err.error_type, message: err.error_message, count: 0 };
        }
        acc[key].count += 1;
        return acc;
      },
      {} as Record<string, { type: string; message: string; count: number }>
    );

    return Object.values(errorMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (err) {
    console.error('Error fetching top errors:', err);
    return null;
  }
}

// =========================================
// FUNNEL ANALYTICS FUNCTIONS
// =========================================

export async function trackFunnelStep(
  userId: string | null,
  tenantId: string | null,
  funnelName: string,
  step: 1 | 2 | 3 | 4 | 5
): Promise<FunnelAnalytics | null> {
  try {
    // Get or create funnel entry
    const { data: existing } = await supabase
      .from('funnel_analytics')
      .select('*')
      .eq('funnel_name', funnelName)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Update existing funnel
      const updateData: Record<string, unknown> = {};
      updateData[`step_${step}`] = true;

      // Check if all steps completed
      const allStepsComplete =
        existing.step_1 &&
        existing.step_2 &&
        existing.step_3 &&
        existing.step_4 &&
        existing.step_5;
      if (allStepsComplete) {
        updateData.completed = true;
      }

      const { data, error } = await supabase
        .from('funnel_analytics')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating funnel:', error);
        return null;
      }
      return data;
    } else {
      // Create new funnel
      const insertData: Record<string, unknown> = {
        user_id: userId,
        tenant_id: tenantId,
        funnel_name: funnelName,
        step_1: step === 1,
        step_2: step === 2,
        step_3: step === 3,
        step_4: step === 4,
        step_5: step === 5,
        completed: step === 5,
      };

      const { data, error } = await supabase
        .from('funnel_analytics')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Error creating funnel:', error);
        return null;
      }
      return data;
    }
  } catch (err) {
    console.error('Error tracking funnel step:', err);
    return null;
  }
}

export async function getFunnelStats(
  tenantId: string | null,
  funnelName: string
): Promise<{
  totalEntries: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  completionRate: number;
} | null> {
  try {
    const query = supabase.from('funnel_analytics').select('*').eq('funnel_name', funnelName);

    if (tenantId) {
      query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching funnel stats:', error);
      return null;
    }

    const funnels = data || [];

    return {
      totalEntries: funnels.length,
      step1: funnels.filter((f) => f.step_1).length,
      step2: funnels.filter((f) => f.step_2).length,
      step3: funnels.filter((f) => f.step_3).length,
      step4: funnels.filter((f) => f.step_4).length,
      step5: funnels.filter((f) => f.step_5).length,
      completionRate: funnels.length > 0 ? Math.round((funnels.filter((f) => f.completed).length / funnels.length) * 100) : 0,
    };
  } catch (err) {
    console.error('Error fetching funnel stats:', err);
    return null;
  }
}
