'use server';

/**
 * Server Actions for Tenant Achievements Admin
 * 
 * These actions handle CRUD operations and awarding for tenant-scoped achievements.
 * Accessible to: system_admin OR tenant owner/admin/editor
 * 
 * All actions validate tenant access via assertTenantAdminOrSystem.
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient } from '@/lib/supabase/server';
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth';
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

export interface TenantAchievementRow {
  id: string;
  achievement_key: string | null;
  name: string;
  description: string | null;
  icon_url: string | null;
  badge_color: string | null;
  icon_config: Record<string, unknown> | null;
  condition_type: string;
  condition_value: number | null;
  scope: 'global' | 'tenant' | 'private';
  tenant_id: string;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface TenantAchievementListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'draft' | 'active' | 'archived';
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface TenantAchievementListResult {
  data: TenantAchievementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TenantMemberRow {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  role: string | null;
}

export interface AwardResult {
  success: boolean;
  awardId?: string;
  awardedCount?: number;
  duplicateCount?: number;
  error?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const tenantAchievementCreateSchema = z.object({
  name: z.string().min(1, 'Namn krävs').max(100),
  description: z.string().max(500).optional().nullable(),
  achievement_key: z.string().max(50).optional().nullable(),
  icon_url: z.string().url().optional().nullable(),
  badge_color: z.string().max(20).optional().nullable(),
  icon_config: z.record(z.unknown()).optional().nullable(),
  condition_type: z.string().min(1, 'Villkorstyp krävs').default('manual'),
  condition_value: z.number().int().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

const tenantAchievementUpdateSchema = tenantAchievementCreateSchema.partial();

const tenantAwardSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1, 'Välj minst en användare'),
  message: z.string().max(1000).optional().nullable(),
  idempotencyKey: z.string().min(8).optional(),
});

// ============================================
// LIST TENANT ACHIEVEMENTS
// ============================================

export async function listTenantAchievements(
  tenantId: string,
  params: TenantAchievementListParams = {}
): Promise<TenantAchievementListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    status = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Authorization check
  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad: kräver organisationsadmin eller systemadmin');
  }

  // Build query - only tenant-scoped achievements for this tenant
  let query = supabase
    .from('achievements')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId);

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,achievement_key.ilike.%${search}%`);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  // Apply sorting
  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  // Apply pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing tenant achievements:', error);
    throw new Error('Kunde inte ladda utmärkelser');
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: (data || []) as TenantAchievementRow[],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================
// GET SINGLE TENANT ACHIEVEMENT
// ============================================

export async function getTenantAchievement(
  tenantId: string,
  achievementId: string
): Promise<TenantAchievementRow | null> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad: kräver organisationsadmin eller systemadmin');
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', achievementId)
    .eq('tenant_id', tenantId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting tenant achievement:', error);
    throw new Error('Kunde inte ladda utmärkelsen');
  }

  return data as TenantAchievementRow;
}

// ============================================
// CREATE TENANT ACHIEVEMENT
// ============================================

export async function createTenantAchievement(
  tenantId: string,
  input: z.infer<typeof tenantAchievementCreateSchema>
): Promise<{ success: boolean; data?: TenantAchievementRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad: kräver organisationsadmin eller systemadmin' };
  }

  // Validate input
  const parsed = tenantAchievementCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { data, error } = await supabase
    .from('achievements')
    .insert({
      ...parsed.data,
      tenant_id: tenantId,
      scope: 'tenant',
      created_by: user?.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating tenant achievement:', error);
    if (error.code === '23505') {
      return { success: false, error: 'En utmärkelse med denna nyckel finns redan' };
    }
    return { success: false, error: 'Kunde inte skapa utmärkelsen' };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return { success: true, data: data as TenantAchievementRow };
}

// ============================================
// UPDATE TENANT ACHIEVEMENT
// ============================================

export async function updateTenantAchievement(
  tenantId: string,
  achievementId: string,
  input: z.infer<typeof tenantAchievementUpdateSchema>
): Promise<{ success: boolean; data?: TenantAchievementRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad: kräver organisationsadmin eller systemadmin' };
  }

  // Validate input
  const parsed = tenantAchievementUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  // Ensure we only update tenant's own achievement
  const { data, error } = await supabase
    .from('achievements')
    .update({
      ...parsed.data,
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', achievementId)
    .eq('tenant_id', tenantId)
    .select()
    .single();

  if (error) {
    console.error('Error updating tenant achievement:', error);
    if (error.code === 'PGRST116') {
      return { success: false, error: 'Utmärkelsen hittades inte' };
    }
    return { success: false, error: 'Kunde inte uppdatera utmärkelsen' };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return { success: true, data: data as TenantAchievementRow };
}

// ============================================
// SET TENANT ACHIEVEMENT STATUS
// ============================================

export async function setTenantAchievementStatus(
  tenantId: string,
  achievementId: string,
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  const { error } = await supabase
    .from('achievements')
    .update({ 
      status, 
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', achievementId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error setting achievement status:', error);
    return { success: false, error: 'Kunde inte ändra status' };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return { success: true };
}

// ============================================
// BULK SET TENANT ACHIEVEMENT STATUS
// ============================================

export async function bulkSetTenantAchievementStatus(
  tenantId: string,
  achievementIds: string[],
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; updatedCount: number; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, updatedCount: 0, error: 'Åtkomst nekad' };
  }

  const { data, error } = await supabase
    .from('achievements')
    .update({ 
      status, 
      updated_by: user?.id,
      updated_at: new Date().toISOString(),
    })
    .in('id', achievementIds)
    .eq('tenant_id', tenantId)
    .select('id');

  if (error) {
    console.error('Error bulk setting achievement status:', error);
    return { success: false, updatedCount: 0, error: 'Kunde inte ändra status' };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return { success: true, updatedCount: data?.length || 0 };
}

// ============================================
// DELETE TENANT ACHIEVEMENT
// ============================================

export async function deleteTenantAchievement(
  tenantId: string,
  achievementId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  const { error } = await supabase
    .from('achievements')
    .delete()
    .eq('id', achievementId)
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error deleting achievement:', error);
    return { success: false, error: 'Kunde inte ta bort utmärkelsen' };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return { success: true };
}

// ============================================
// LIST TENANT MEMBERS (for awarding)
// ============================================

export async function listTenantMembers(
  tenantId: string,
  search?: string
): Promise<TenantMemberRow[]> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad');
  }

  const query = supabase
    .from('user_tenant_memberships')
    .select(`
      id,
      user_id,
      role,
      user:users(id, email, full_name)
    `)
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .limit(100);

  const { data, error } = await query;

  if (error) {
    console.error('Error listing tenant members:', error);
    throw new Error('Kunde inte ladda medlemmar');
  }

  // Transform and filter by search
  const members = (data || []).map((row: { id: string; user_id: string; role: string | null; user: { id: string; email: string | null; full_name: string | null } | null }) => ({
    id: row.id,
    user_id: row.user_id,
    email: row.user?.email ?? null,
    full_name: row.user?.full_name ?? null,
    role: row.role,
  }));

  if (search) {
    const term = search.toLowerCase();
    return members.filter(
      (m) =>
        m.email?.toLowerCase().includes(term) ||
        m.full_name?.toLowerCase().includes(term)
    );
  }

  return members;
}

// ============================================
// AWARD TENANT ACHIEVEMENT
// Uses the tenant_award_achievement_v1 RPC
// ============================================

export async function awardTenantAchievement(
  tenantId: string,
  achievementId: string,
  input: z.infer<typeof tenantAwardSchema>
): Promise<AwardResult> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    return { success: false, error: 'Åtkomst nekad' };
  }

  // Validate input
  const parsed = tenantAwardSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  // Call the tenant-safe RPC
  const { data, error } = await supabase.rpc('tenant_award_achievement_v1', {
    p_tenant_id: tenantId,
    p_achievement_id: achievementId,
    p_user_ids: parsed.data.userIds,
    p_message: parsed.data.message || null,
    p_idempotency_key: parsed.data.idempotencyKey || null,
  });

  if (error) {
    console.error('Error awarding achievement:', error);
    // Parse the error message for user-friendly display
    const message = error.message || 'Kunde inte dela ut utmärkelsen';
    return { success: false, error: message };
  }

  const result = data as {
    status: string;
    award_id?: string;
    awarded_count?: number;
    duplicate_count?: number;
    message?: string;
  };

  if (result.status === 'duplicate') {
    return { 
      success: true, 
      awardId: result.award_id,
      awardedCount: 0,
      duplicateCount: 0,
      error: 'Denna utdelning har redan behandlats'
    };
  }

  revalidatePath(`/admin/tenant/${tenantId}/gamification/achievements`);

  return {
    success: true,
    awardId: result.award_id,
    awardedCount: result.awarded_count || 0,
    duplicateCount: result.duplicate_count || 0,
  };
}

// ============================================
// GET ACHIEVEMENT STATS
// ============================================

export async function getTenantAchievementStats(tenantId: string): Promise<{
  total: number;
  active: number;
  draft: number;
  archived: number;
}> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  const hasAccess = await assertTenantAdminOrSystem(tenantId, user);
  if (!hasAccess) {
    throw new Error('Åtkomst nekad');
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('status')
    .eq('tenant_id', tenantId);

  if (error) {
    console.error('Error getting achievement stats:', error);
    return { total: 0, active: 0, draft: 0, archived: 0 };
  }

  const stats = {
    total: data?.length || 0,
    active: 0,
    draft: 0,
    archived: 0,
  };

  for (const row of data || []) {
    if (row.status === 'active') stats.active++;
    else if (row.status === 'draft') stats.draft++;
    else if (row.status === 'archived') stats.archived++;
  }

  return stats;
}
