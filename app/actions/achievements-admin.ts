'use server';

/**
 * Server Actions for Achievements Admin
 * 
 * These actions handle CRUD operations and awarding for the achievements admin.
 * System admin only - validated via RLS and explicit checks.
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { z } from 'zod';

// ============================================
// TYPES
// ============================================

import type { Json } from '@/types/supabase';

export interface AchievementRow {
  id: string;
  achievement_key: string | null;
  name: string;
  description: string | null;
  icon_url: string | null;
  badge_color: string | null;
  icon_config: Json | null;
  condition_type: string;
  condition_value: number | null;
  scope: 'global' | 'tenant' | 'private';
  tenant_id: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  updated_by: string | null;
}

export interface AchievementListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  scope?: 'all' | 'global' | 'tenant' | 'private';
  status?: 'all' | 'draft' | 'active' | 'archived';
  tenantId?: string;
  sortBy?: 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface AchievementListResult {
  data: AchievementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const achievementCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional().nullable(),
  achievement_key: z.string().max(50).optional().nullable(),
  icon_url: z.string().url().optional().nullable(),
  badge_color: z.string().max(20).optional().nullable(),
  icon_config: z.any().optional().nullable(), // Json type
  condition_type: z.string().min(1, 'Condition type is required'),
  condition_value: z.number().int().optional().nullable(),
  scope: z.enum(['global', 'tenant', 'private']).default('global'),
  tenant_id: z.string().uuid().optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
});

const achievementUpdateSchema = achievementCreateSchema.partial().extend({
  id: z.string().uuid(),
});

const awardAchievementSchema = z.object({
  achievementId: z.string().uuid(),
  userIds: z.array(z.string().uuid()).min(1),
  message: z.string().max(1000).optional().nullable(),
  tenantId: z.string().uuid().optional().nullable(),
  idempotencyKey: z.string().min(8).optional(),
});

// ============================================
// LIST ACHIEVEMENTS
// ============================================

export async function listAchievements(
  params: AchievementListParams = {}
): Promise<AchievementListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    scope = 'all',
    status = 'all',
    tenantId,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    throw new Error('Forbidden: system_admin required');
  }

  // Build query
  let query = supabase
    .from('achievements')
    .select('*', { count: 'exact' });

  // Apply filters
  if (search) {
    query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,achievement_key.ilike.%${search}%`);
  }

  if (scope !== 'all') {
    query = query.eq('scope', scope);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (tenantId) {
    query = query.eq('tenant_id', tenantId);
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
    console.error('Error listing achievements:', error);
    throw new Error('Failed to list achievements');
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    data: (data || []) as AchievementRow[],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================
// GET SINGLE ACHIEVEMENT
// ============================================

export async function getAchievement(id: string): Promise<AchievementRow | null> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    throw new Error('Forbidden: system_admin required');
  }

  const { data, error } = await supabase
    .from('achievements')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting achievement:', error);
    throw new Error('Failed to get achievement');
  }

  return data as AchievementRow;
}

// ============================================
// CREATE ACHIEVEMENT
// ============================================

export async function createAchievement(
  input: z.infer<typeof achievementCreateSchema>
): Promise<{ success: boolean; data?: AchievementRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  // Validate input
  const parsed = achievementCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { scope, tenant_id, ...rest } = parsed.data;

  // Validate scope/tenant consistency
  if (scope === 'tenant' && !tenant_id) {
    return { success: false, error: 'Tenant ID required for tenant-scoped achievements' };
  }
  if (scope === 'global' && tenant_id) {
    return { success: false, error: 'Tenant ID not allowed for global achievements' };
  }

  // Use service role for insert to bypass any potential RLS issues
  const adminClient = createServiceRoleClient();

  const { data, error } = await adminClient
    .from('achievements')
    .insert({
      ...rest,
      scope,
      tenant_id: scope === 'tenant' ? tenant_id : null,
      created_by: user.id,
      updated_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating achievement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/achievements');
  return { success: true, data: data as AchievementRow };
}

// ============================================
// UPDATE ACHIEVEMENT
// ============================================

export async function updateAchievement(
  input: z.infer<typeof achievementUpdateSchema>
): Promise<{ success: boolean; data?: AchievementRow; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  // Validate input
  const parsed = achievementUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { id, scope, tenant_id, ...rest } = parsed.data;

  // Validate scope/tenant consistency if both provided
  if (scope === 'tenant' && tenant_id === null) {
    return { success: false, error: 'Tenant ID required for tenant-scoped achievements' };
  }
  if (scope === 'global' && tenant_id) {
    return { success: false, error: 'Tenant ID not allowed for global achievements' };
  }

  const adminClient = createServiceRoleClient();

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_by: user.id,
  };

  if (scope !== undefined) {
    updateData.scope = scope;
    updateData.tenant_id = scope === 'tenant' ? tenant_id : null;
  }

  const { data, error } = await adminClient
    .from('achievements')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating achievement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/achievements');
  return { success: true, data: data as AchievementRow };
}

// ============================================
// DELETE ACHIEVEMENT
// ============================================

export async function deleteAchievement(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  const adminClient = createServiceRoleClient();

  const { error } = await adminClient
    .from('achievements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting achievement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/achievements');
  return { success: true };
}

// ============================================
// ARCHIVE/UNARCHIVE ACHIEVEMENT
// ============================================

export async function setAchievementStatus(
  id: string,
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  const adminClient = createServiceRoleClient();

  const { error } = await adminClient
    .from('achievements')
    .update({ status, updated_by: user.id })
    .eq('id', id);

  if (error) {
    console.error('Error updating achievement status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/gamification/achievements');
  return { success: true };
}

// ============================================
// BULK ARCHIVE/UNARCHIVE
// ============================================

export async function bulkSetAchievementStatus(
  ids: string[],
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; count: number; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, count: 0, error: 'Forbidden: system_admin required' };
  }

  if (!ids.length) {
    return { success: false, count: 0, error: 'No IDs provided' };
  }

  const adminClient = createServiceRoleClient();

  const { error, count } = await adminClient
    .from('achievements')
    .update({ status, updated_by: user.id })
    .in('id', ids);

  if (error) {
    console.error('Error bulk updating achievements:', error);
    return { success: false, count: 0, error: error.message };
  }

  revalidatePath('/admin/gamification/achievements');
  return { success: true, count: count || ids.length };
}

// ============================================
// AWARD ACHIEVEMENT
// ============================================

export interface AwardResult {
  success: boolean;
  awardId?: string;
  insertedCount?: number;
  duplicateCount?: number;
  awardedUserIds?: string[];
  duplicateUserIds?: string[];
  error?: string;
}

export async function awardAchievement(
  input: z.infer<typeof awardAchievementSchema>
): Promise<AwardResult> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  // Validate input
  const parsed = awardAchievementSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation failed' };
  }

  const { achievementId, userIds, message, tenantId, idempotencyKey } = parsed.data;

  // Generate idempotency key if not provided
  const finalKey = idempotencyKey || crypto.randomUUID();

  // Call RPC
  const { data, error } = await supabase.rpc('admin_award_achievement_v1', {
    p_achievement_id: achievementId,
    p_user_ids: userIds,
    p_message: message ?? undefined,
    p_tenant_id: tenantId ?? undefined,
    p_idempotency_key: finalKey,
  });

  if (error) {
    console.error('Error awarding achievement:', error);
    return { success: false, error: error.message };
  }

  const result = data as {
    status: string;
    award_id?: string;
    inserted_count?: number;
    duplicate_count?: number;
    awarded_user_ids?: string[];
    duplicate_user_ids?: string[];
    message?: string;
  };

  if (result.status === 'duplicate') {
    return {
      success: true,
      awardId: result.award_id,
      insertedCount: 0,
      duplicateCount: 0,
      error: result.message,
    };
  }

  revalidatePath('/admin/gamification/achievements');

  return {
    success: true,
    awardId: result.award_id,
    insertedCount: result.inserted_count || 0,
    duplicateCount: result.duplicate_count || 0,
    awardedUserIds: result.awarded_user_ids || [],
    duplicateUserIds: result.duplicate_user_ids || [],
  };
}

// ============================================
// GET TENANT USERS FOR BULK AWARD
// ============================================

export async function getTenantUserIds(
  tenantId: string
): Promise<{ success: boolean; userIds?: string[]; error?: string }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { success: false, error: 'Forbidden: system_admin required' };
  }

  const { data, error } = await supabase.rpc('get_tenant_user_ids', {
    p_tenant_id: tenantId,
  });

  if (error) {
    console.error('Error getting tenant users:', error);
    return { success: false, error: error.message };
  }

  return { success: true, userIds: data || [] };
}

// ============================================
// LIST TENANTS (for selector)
// ============================================

export interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
}

export async function listTenantsForSelector(): Promise<{ tenants: TenantOption[] }> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return { tenants: [] };
  }

  const { data, error } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error listing tenants:', error);
    return { tenants: [] };
  }

  return { tenants: data || [] };
}

// ============================================
// SEARCH USERS FOR AWARD
// ============================================

export interface UserSearchResult {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function searchUsersForAward(
  query: string,
  tenantId?: string,
  limit = 20
): Promise<UserSearchResult[]> {
  const supabase = await createServerRlsClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSystemAdmin(user)) {
    return [];
  }

  if (!query || query.length < 2) {
    return [];
  }

  let dbQuery = supabase
    .from('users')
    .select('id, email, full_name, avatar_url')
    .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit);

  // If tenant specified, filter to tenant members
  if (tenantId) {
    const { data: memberIds } = await supabase
      .from('user_tenant_memberships')
      .select('user_id')
      .eq('tenant_id', tenantId)
      .eq('status', 'active');

    if (memberIds && memberIds.length > 0) {
      dbQuery = dbQuery.in('id', memberIds.map(m => m.user_id));
    } else {
      return [];
    }
  }

  const { data, error } = await dbQuery;

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return data || [];
}
