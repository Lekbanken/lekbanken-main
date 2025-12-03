/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from '@/lib/supabase/client';

// Types
export interface ContentReport {
  id: string;
  tenant_id: string;
  reported_by_user_id: string;
  content_type: string;
  content_id: string;
  reason: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to_user_id: string | null;
  resolution_reason: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentFilterRule {
  id: string;
  tenant_id: string;
  pattern: string;
  rule_type: string;
  severity: string;
  categories: string[];
  is_active: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationAction {
  id: string;
  tenant_id: string;
  taken_by_user_id: string;
  action_type: string;
  target_user_id: string | null;
  target_content_id: string | null;
  reason: string;
  duration_minutes: number | null;
  severity: string;
  is_appealable: boolean;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserRestriction {
  id: string;
  tenant_id: string;
  user_id: string;
  restriction_type: string;
  reason: string;
  severity: string;
  active: boolean;
  active_until: string | null;
  appeal_count: number;
  can_appeal: boolean;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ModerationStats {
  total_reports: number;
  pending_reports: number;
  resolved_reports: number;
  actions_taken: number;
  users_warned: number;
  users_suspended: number;
  users_banned: number;
  average_resolution_time: number;
}

// Content Reports
export async function getContentReports(
  tenantId: string,
  filter?: { status?: string; priority?: string; limit?: number }
): Promise<ContentReport[] | null> {
  try {
    const query = supabase.from('content_reports' as any) as any;
    let q = query.select('*').eq('tenant_id', tenantId);

    if (filter?.status) q = q.eq('status', filter.status);
    if (filter?.priority) q = q.eq('priority', filter.priority);

    q = q.order('created_at', { ascending: false }).limit(filter?.limit || 50);

    const { data, error } = await q;

    if (error) {
      console.error('Error fetching reports:', error);
      return null;
    }

    return (data as ContentReport[]) || [];
  } catch (err) {
    console.error('Error fetching reports:', err);
    return null;
  }
}

export async function createContentReport(
  tenantId: string,
  userId: string,
  report: Omit<ContentReport, 'id' | 'tenant_id' | 'reported_by_user_id' | 'status' | 'assigned_to_user_id' | 'resolution_reason' | 'resolved_at' | 'created_at' | 'updated_at'>
): Promise<ContentReport | null> {
  try {
    const query = supabase.from('content_reports' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        reported_by_user_id: userId,
        ...report,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating report:', error);
      return null;
    }

    return data as ContentReport;
  } catch (err) {
    console.error('Error creating report:', err);
    return null;
  }
}

export async function updateContentReport(
  reportId: string,
  updates: Partial<ContentReport>
): Promise<ContentReport | null> {
  try {
    const query = supabase.from('content_reports' as any) as any;
    const { data, error } = await query
      .update(updates)
      .eq('id', reportId)
      .select()
      .single();

    if (error) {
      console.error('Error updating report:', error);
      return null;
    }

    return data as ContentReport;
  } catch (err) {
    console.error('Error updating report:', err);
    return null;
  }
}

// Content Filter Rules
export async function getContentFilterRules(
  tenantId: string,
  onlyActive: boolean = true
): Promise<ContentFilterRule[] | null> {
  try {
    const query = supabase.from('content_filter_rules' as any) as any;
    let q = query.select('*').eq('tenant_id', tenantId);

    if (onlyActive) q = q.eq('is_active', true);

    const { data, error } = await q;

    if (error) {
      console.error('Error fetching filter rules:', error);
      return null;
    }

    return (data as ContentFilterRule[]) || [];
  } catch (err) {
    console.error('Error fetching filter rules:', err);
    return null;
  }
}

export async function createFilterRule(
  tenantId: string,
  userId: string,
  rule: Omit<ContentFilterRule, 'id' | 'tenant_id' | 'created_by_user_id' | 'created_at' | 'updated_at'>
): Promise<ContentFilterRule | null> {
  try {
    const query = supabase.from('content_filter_rules' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        created_by_user_id: userId,
        ...rule,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating filter rule:', error);
      return null;
    }

    return data as ContentFilterRule;
  } catch (err) {
    console.error('Error creating filter rule:', err);
    return null;
  }
}

// Moderation Actions
export async function createModerationAction(
  tenantId: string,
  moderatorId: string,
  action: Omit<ModerationAction, 'id' | 'tenant_id' | 'taken_by_user_id' | 'created_at' | 'updated_at'>
): Promise<ModerationAction | null> {
  try {
    const query = supabase.from('moderation_actions' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        taken_by_user_id: moderatorId,
        ...action,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating moderation action:', error);
      return null;
    }

    return data as ModerationAction;
  } catch (err) {
    console.error('Error creating moderation action:', err);
    return null;
  }
}

export async function getModerationActions(
  tenantId: string,
  limit: number = 50
): Promise<ModerationAction[] | null> {
  try {
    const query = supabase.from('moderation_actions' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching moderation actions:', error);
      return null;
    }

    return (data as ModerationAction[]) || [];
  } catch (err) {
    console.error('Error fetching moderation actions:', err);
    return null;
  }
}

// User Restrictions
export async function getUserRestrictions(userId: string, tenantId: string): Promise<UserRestriction[] | null> {
  try {
    const query = supabase.from('user_restrictions' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .eq('active', true);

    if (error) {
      console.error('Error fetching user restrictions:', error);
      return null;
    }

    return (data as UserRestriction[]) || [];
  } catch (err) {
    console.error('Error fetching user restrictions:', err);
    return null;
  }
}

export async function addUserRestriction(
  tenantId: string,
  userId: string,
  moderatorId: string,
  restriction: Omit<UserRestriction, 'id' | 'tenant_id' | 'user_id' | 'active' | 'appeal_count' | 'created_by_user_id' | 'created_at' | 'updated_at'>
): Promise<UserRestriction | null> {
  try {
    const query = supabase.from('user_restrictions' as any) as any;
    const { data, error } = await query
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        created_by_user_id: moderatorId,
        ...restriction,
        active: true,
        appeal_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding restriction:', error);
      return null;
    }

    return data as UserRestriction;
  } catch (err) {
    console.error('Error adding restriction:', err);
    return null;
  }
}

export async function removeUserRestriction(restrictionId: string): Promise<boolean> {
  try {
    const query = supabase.from('user_restrictions' as any) as any;
    const { error } = await query.update({ active: false }).eq('id', restrictionId);

    if (error) {
      console.error('Error removing restriction:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error removing restriction:', err);
    return false;
  }
}

// Moderation Queue
export async function getModerationQueue(
  tenantId: string,
  status: string = 'pending'
): Promise<any | null> {
  try {
    const query = supabase.from('moderation_queue' as any) as any;
    const { data, error } = await query
      .select('*, content_reports(*)')
      .eq('tenant_id', tenantId)
      .eq('status', status)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching queue:', error);
      return null;
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching queue:', err);
    return null;
  }
}

export async function assignQueueItem(queueId: string, moderatorId: string): Promise<boolean> {
  try {
    const query = supabase.from('moderation_queue' as any) as any;
    const { error } = await query
      .update({
        assigned_to_user_id: moderatorId,
        status: 'in_progress',
        assigned_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (error) {
      console.error('Error assigning queue item:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error assigning queue item:', err);
    return false;
  }
}

export async function completeQueueItem(queueId: string): Promise<boolean> {
  try {
    const query = supabase.from('moderation_queue' as any) as any;
    const { error } = await query
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', queueId);

    if (error) {
      console.error('Error completing queue item:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error completing queue item:', err);
    return false;
  }
}

// Moderation Stats
export async function getModerationStats(tenantId: string, days: number = 30): Promise<ModerationStats | null> {
  try {
    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - days);

    const query = supabase.from('moderation_analytics' as any) as any;
    const { data, error } = await query
      .select('*')
      .eq('tenant_id', tenantId)
      .gte('date', fromDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching stats:', error);
      return null;
    }

    const totals: ModerationStats = {
      total_reports: 0,
      pending_reports: 0,
      resolved_reports: 0,
      actions_taken: 0,
      users_warned: 0,
      users_suspended: 0,
      users_banned: 0,
      average_resolution_time: 0,
    };

    let timeSum = 0;
    (data || []).forEach((stat: Record<string, unknown>) => {
      totals.total_reports += (stat.total_reports as number) || 0;
      totals.pending_reports += (stat.pending_reports as number) || 0;
      totals.resolved_reports += (stat.resolved_reports as number) || 0;
      totals.actions_taken += (stat.actions_taken as number) || 0;
      totals.users_warned += (stat.users_warned as number) || 0;
      totals.users_suspended += (stat.users_suspended as number) || 0;
      totals.users_banned += (stat.users_banned as number) || 0;
      timeSum += (stat.average_resolution_time_hours as number) || 0;
    });

    if (data && data.length > 0) {
      totals.average_resolution_time = timeSum / data.length;
    }

    return totals;
  } catch (err) {
    console.error('Error calculating stats:', err);
    return null;
  }
}
