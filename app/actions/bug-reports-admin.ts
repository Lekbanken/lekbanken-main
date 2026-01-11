'use server';

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { revalidatePath } from 'next/cache';

// --------------------------------------------------
// Types
// --------------------------------------------------
export interface BugReportRow {
  id: string;
  bug_report_key: string | null;
  user_id: string;
  tenant_id: string | null;
  game_id: string | null;
  title: string;
  description: string;
  error_message: string | null;
  steps_to_reproduce: string | null;
  browser_info: string | null;
  status: string;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BugReportWithUser extends BugReportRow {
  user_email: string | null;
  tenant_name: string | null;
  game_title: string | null;
}

export interface BugReportsFilter {
  tenantId?: string;
  status?: string;
  isResolved?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

// --------------------------------------------------
// Auth helpers
// --------------------------------------------------
async function getCurrentAdminUser() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, isSystem: false, error: 'Inte autentiserad' };
  }
  
  const isSystem = isSystemAdmin(user);
  return { user, isSystem, error: null };
}

async function getUserAdminTenantIds(userId: string): Promise<string[]> {
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'editor']);
  
  return (data || []).map(m => m.tenant_id).filter((id): id is string => !!id);
}

async function requireBugReportsAccess(): Promise<{
  supabase: Awaited<ReturnType<typeof createServiceRoleClient>>;
  tenantScope: string | null;
  userId: string;
}> {
  const { user, isSystem, error } = await getCurrentAdminUser();
  if (!user || error) {
    throw new Error('Unauthorized');
  }
  
  if (isSystem) {
    return { supabase: await createServiceRoleClient(), tenantScope: null, userId: user.id };
  }
  
  const tenantIds = await getUserAdminTenantIds(user.id);
  if (tenantIds.length > 0) {
    return { supabase: await createServiceRoleClient(), tenantScope: tenantIds[0], userId: user.id };
  }
  
  throw new Error('Unauthorized');
}

// --------------------------------------------------
// List bug reports
// --------------------------------------------------
export async function listBugReports(
  filter: BugReportsFilter = {}
): Promise<{ success: boolean; data?: BugReportWithUser[]; error?: string; total?: number }> {
  try {
    const { supabase, tenantScope } = await requireBugReportsAccess();
    const { tenantId, status, isResolved, search, limit = 50, offset = 0 } = filter;

    // Build query
    let query = supabase
      .from('bug_reports')
      .select(
        `
        *,
        users!inner(email),
        tenants(name),
        games(title)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Tenant scope for tenant admin
    if (tenantScope) {
      query = query.eq('tenant_id', tenantScope);
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Resolved filter
    if (isResolved !== undefined) {
      query = query.eq('is_resolved', isResolved);
    }

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,bug_report_key.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('listBugReports error:', error);
      return { success: false, error: error.message };
    }

    const formatted: BugReportWithUser[] = (data ?? []).map((row: Record<string, unknown>) => {
      const users = row.users as Record<string, unknown> | null;
      const tenants = row.tenants as Record<string, unknown> | null;
      const games = row.games as Record<string, unknown> | null;

      return {
        id: row.id as string,
        bug_report_key: row.bug_report_key as string | null,
        user_id: row.user_id as string,
        tenant_id: row.tenant_id as string | null,
        game_id: row.game_id as string | null,
        title: row.title as string,
        description: row.description as string,
        error_message: row.error_message as string | null,
        steps_to_reproduce: row.steps_to_reproduce as string | null,
        browser_info: row.browser_info as string | null,
        status: row.status as string,
        is_resolved: row.is_resolved as boolean,
        resolved_at: row.resolved_at as string | null,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        user_email: (users?.email as string) ?? null,
        tenant_name: (tenants?.name as string) ?? null,
        game_title: (games?.title as string) ?? null,
      };
    });

    return { success: true, data: formatted, total: count ?? 0 };
  } catch (err) {
    console.error('listBugReports error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Get single bug report
// --------------------------------------------------
export async function getBugReport(
  id: string
): Promise<{ success: boolean; data?: BugReportWithUser; error?: string }> {
  try {
    const { supabase, tenantScope } = await requireBugReportsAccess();

    let query = supabase
      .from('bug_reports')
      .select(
        `
        *,
        users!inner(email),
        tenants(name),
        games(title)
      `
      )
      .eq('id', id);

    if (tenantScope) {
      query = query.eq('tenant_id', tenantScope);
    }

    const { data, error } = await query.single();

    if (error) {
      console.error('getBugReport error:', error);
      return { success: false, error: error.message };
    }

    const users = data.users as Record<string, unknown> | null;
    const tenants = data.tenants as Record<string, unknown> | null;
    const games = data.games as Record<string, unknown> | null;

    const formatted: BugReportWithUser = {
      id: data.id as string,
      bug_report_key: data.bug_report_key as string | null,
      user_id: data.user_id as string,
      tenant_id: data.tenant_id as string | null,
      game_id: data.game_id as string | null,
      title: data.title as string,
      description: data.description as string,
      error_message: data.error_message as string | null,
      steps_to_reproduce: data.steps_to_reproduce as string | null,
      browser_info: data.browser_info as string | null,
      status: data.status as string,
      is_resolved: data.is_resolved as boolean,
      resolved_at: data.resolved_at as string | null,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      user_email: (users?.email as string) ?? null,
      tenant_name: (tenants?.name as string) ?? null,
      game_title: (games?.title as string) ?? null,
    };

    return { success: true, data: formatted };
  } catch (err) {
    console.error('getBugReport error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Update bug report status
// --------------------------------------------------
export async function updateBugReportStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, tenantScope } = await requireBugReportsAccess();

    // Build update
    let query = supabase
      .from('bug_reports')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (tenantScope) {
      query = query.eq('tenant_id', tenantScope);
    }

    const { error } = await query;

    if (error) {
      console.error('updateBugReportStatus error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support/bugs');
    return { success: true };
  } catch (err) {
    console.error('updateBugReportStatus error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Resolve bug report
// --------------------------------------------------
export async function resolveBugReport(
  id: string,
  resolved: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, tenantScope } = await requireBugReportsAccess();

    // Build update
    let query = supabase
      .from('bug_reports')
      .update({
        is_resolved: resolved,
        resolved_at: resolved ? new Date().toISOString() : null,
        status: resolved ? 'resolved' : 'investigating',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (tenantScope) {
      query = query.eq('tenant_id', tenantScope);
    }

    const { error } = await query;

    if (error) {
      console.error('resolveBugReport error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support/bugs');
    return { success: true };
  } catch (err) {
    console.error('resolveBugReport error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Delete bug report (system admin only)
// --------------------------------------------------
export async function deleteBugReport(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { isSystem } = await getCurrentAdminUser();
    if (!isSystem) {
      return { success: false, error: 'Only system admins can delete bug reports' };
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('bug_reports')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteBugReport error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support/bugs');
    return { success: true };
  } catch (err) {
    console.error('deleteBugReport error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Get bug report stats
// --------------------------------------------------
export async function getBugReportStats(
  tenantId?: string
): Promise<{
  success: boolean;
  data?: {
    total: number;
    open: number;
    investigating: number;
    resolved: number;
  };
  error?: string;
}> {
  try {
    const { supabase, tenantScope } = await requireBugReportsAccess();

    const effectiveTenantId = tenantScope ?? tenantId;

    // Get all bug reports for counting
    let query = supabase.from('bug_reports').select('status, is_resolved');

    if (effectiveTenantId) {
      query = query.eq('tenant_id', effectiveTenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getBugReportStats error:', error);
      return { success: false, error: error.message };
    }

    const stats = {
      total: data?.length ?? 0,
      open: data?.filter((r) => r.status === 'new' || r.status === 'open').length ?? 0,
      investigating: data?.filter((r) => r.status === 'investigating').length ?? 0,
      resolved: data?.filter((r) => r.is_resolved === true).length ?? 0,
    };

    return { success: true, data: stats };
  } catch (err) {
    console.error('getBugReportStats error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
