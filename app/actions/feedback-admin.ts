'use server';

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { revalidatePath } from 'next/cache';

// --------------------------------------------------
// Types
// --------------------------------------------------
export interface FeedbackRow {
  id: string;
  feedback_key: string | null;
  user_id: string;
  tenant_id: string | null;
  game_id: string | null;
  type: string;
  title: string;
  description: string | null;
  rating: number | null;
  is_anonymous: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface FeedbackWithUser extends FeedbackRow {
  user_email: string | null;
  tenant_name: string | null;
  game_title: string | null;
}

export interface FeedbackFilter {
  tenantId?: string;
  type?: string;
  status?: string;
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

async function requireFeedbackAccess(): Promise<{
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
// List feedback
// --------------------------------------------------
export async function listFeedback(
  filter: FeedbackFilter = {}
): Promise<{ success: boolean; data?: FeedbackWithUser[]; error?: string; total?: number }> {
  try {
    const { supabase, tenantScope } = await requireFeedbackAccess();
    const { tenantId, type, status, search, limit = 50, offset = 0 } = filter;

    // Build query
    let query = supabase
      .from('feedback')
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

    // Type filter
    if (type && type !== 'all') {
      query = query.eq('type', type as 'bug' | 'feature_request' | 'improvement' | 'other');
    }

    // Status filter
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    // Search
    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,feedback_key.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('listFeedback error:', error);
      return { success: false, error: error.message };
    }

    const formatted: FeedbackWithUser[] = (data ?? []).map((row: Record<string, unknown>) => {
      const users = row.users as Record<string, unknown> | null;
      const tenants = row.tenants as Record<string, unknown> | null;
      const games = row.games as Record<string, unknown> | null;

      return {
        id: row.id as string,
        feedback_key: row.feedback_key as string | null,
        user_id: row.user_id as string,
        tenant_id: row.tenant_id as string | null,
        game_id: row.game_id as string | null,
        type: row.type as string,
        title: row.title as string,
        description: row.description as string | null,
        rating: row.rating as number | null,
        is_anonymous: row.is_anonymous as boolean,
        status: row.status as string,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
        user_email: (users?.email as string) ?? null,
        tenant_name: (tenants?.name as string) ?? null,
        game_title: (games?.title as string) ?? null,
      };
    });

    return { success: true, data: formatted, total: count ?? 0 };
  } catch (err) {
    console.error('listFeedback error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Get single feedback
// --------------------------------------------------
export async function getFeedback(
  id: string
): Promise<{ success: boolean; data?: FeedbackWithUser; error?: string }> {
  try {
    const { supabase, tenantScope } = await requireFeedbackAccess();

    let query = supabase
      .from('feedback')
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
      console.error('getFeedback error:', error);
      return { success: false, error: error.message };
    }

    const users = data.users as Record<string, unknown> | null;
    const tenants = data.tenants as Record<string, unknown> | null;
    const games = data.games as Record<string, unknown> | null;

    const formatted: FeedbackWithUser = {
      id: data.id as string,
      feedback_key: data.feedback_key as string | null,
      user_id: data.user_id as string,
      tenant_id: data.tenant_id as string | null,
      game_id: data.game_id as string | null,
      type: data.type as string,
      title: data.title as string,
      description: data.description as string | null,
      rating: data.rating as number | null,
      is_anonymous: data.is_anonymous as boolean,
      status: data.status as string,
      created_at: data.created_at as string,
      updated_at: data.updated_at as string,
      user_email: (users?.email as string) ?? null,
      tenant_name: (tenants?.name as string) ?? null,
      game_title: (games?.title as string) ?? null,
    };

    return { success: true, data: formatted };
  } catch (err) {
    console.error('getFeedback error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Update feedback status
// --------------------------------------------------
export async function updateFeedbackStatus(
  id: string,
  status: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase, tenantScope } = await requireFeedbackAccess();

    let query = supabase
      .from('feedback')
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
      console.error('updateFeedbackStatus error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support/feedback');
    return { success: true };
  } catch (err) {
    console.error('updateFeedbackStatus error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Delete feedback (system admin only)
// --------------------------------------------------
export async function deleteFeedback(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { isSystem } = await getCurrentAdminUser();
    if (!isSystem) {
      return { success: false, error: 'Only system admins can delete feedback' };
    }

    const supabase = await createServiceRoleClient();

    const { error } = await supabase
      .from('feedback')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('deleteFeedback error:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/support/feedback');
    return { success: true };
  } catch (err) {
    console.error('deleteFeedback error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}

// --------------------------------------------------
// Get feedback stats
// --------------------------------------------------
export async function getFeedbackStats(
  tenantId?: string
): Promise<{
  success: boolean;
  data?: {
    total: number;
    feature_request: number;
    bug: number;
    improvement: number;
    other: number;
    averageRating: number | null;
  };
  error?: string;
}> {
  try {
    const { supabase, tenantScope } = await requireFeedbackAccess();

    const effectiveTenantId = tenantScope ?? tenantId;

    // Get all feedback for counting
    let query = supabase.from('feedback').select('type, rating');

    if (effectiveTenantId) {
      query = query.eq('tenant_id', effectiveTenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('getFeedbackStats error:', error);
      return { success: false, error: error.message };
    }

    const ratings = (data ?? []).filter((r) => r.rating != null).map((r) => r.rating as number);
    const avgRating = ratings.length > 0 ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : null;

    const stats = {
      total: data?.length ?? 0,
      feature_request: data?.filter((r) => r.type === 'feature_request').length ?? 0,
      bug: data?.filter((r) => r.type === 'bug').length ?? 0,
      improvement: data?.filter((r) => r.type === 'improvement').length ?? 0,
      other: data?.filter((r) => r.type === 'other').length ?? 0,
      averageRating: avgRating,
    };

    return { success: true, data: stats };
  } catch (err) {
    console.error('getFeedbackStats error:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
