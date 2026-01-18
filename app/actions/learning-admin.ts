'use server';

/**
 * Server Actions for Learning Admin
 * 
 * CRUD operations for courses, paths (read-only Phase 1), and requirements.
 * Supports hybrid content model: global (tenant_id = null) + tenant-scoped.
 * 
 * Authorization:
 * - Global content: system_admin only
 * - Tenant content: system_admin OR tenant admin for that tenant
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin, assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth';
import { z } from 'zod';

import type { Json } from '@/types/supabase';

// ============================================
// TYPES
// ============================================

export interface LearningCourseRow {
  id: string;
  tenant_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  tags: Json;
  content_json: Json;
  quiz_json: Json;
  pass_score: number;
  rewards_json: Json;
  duration_minutes: number | null;
  cover_image_url: string | null;
  version: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  tenant_name?: string;
}

export interface LearningCourseListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'draft' | 'active' | 'archived';
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
  sortBy?: 'title' | 'created_at' | 'updated_at' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface LearningCourseListResult {
  data: LearningCourseRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    draft: number;
    archived: number;
  };
}

export interface LearningPathRow {
  id: string;
  tenant_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  kind: 'onboarding' | 'role' | 'theme' | 'compliance';
  cover_image_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  tenant_name?: string;
  node_count?: number;
}

export interface LearningPathListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'all' | 'draft' | 'active' | 'archived';
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
  sortBy?: 'title' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface LearningPathListResult {
  data: LearningPathRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface LearningRequirementRow {
  id: string;
  tenant_id: string | null;
  requirement_type: 'role_unlock' | 'activity_unlock' | 'game_unlock' | 'onboarding_required';
  target_ref: Json;
  required_course_id: string;
  required_status: string;
  priority: number;
  is_active: boolean;
  metadata: Json;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  course_title?: string;
  course_slug?: string;
  tenant_name?: string;
}

export interface LearningRequirementListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
  isActive?: boolean | 'all';
  sortBy?: 'created_at' | 'requirement_type';
  sortOrder?: 'asc' | 'desc';
}

export interface LearningRequirementListResult {
  data: LearningRequirementRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats: {
    total: number;
    active: number;
    inactive: number;
  };
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================

const courseCreateSchema = z.object({
  title: z.string().min(1, 'Titel krävs').max(100),
  slug: z.string().min(1, 'Slug krävs').max(100).regex(/^[a-z0-9-]+$/, 'Slug får bara innehålla gemener, siffror och bindestreck'),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  content_json: z.any().optional().default([]),
  quiz_json: z.any().optional().default([]),
  pass_score: z.number().int().min(0).max(100).default(70),
  rewards_json: z.any().optional().default({}),
  duration_minutes: z.number().int().positive().optional().nullable(),
  cover_image_url: z.string().url().optional().nullable(),
  scope: z.enum(['global', 'tenant']).default('tenant'),
  tenant_id: z.string().uuid().optional().nullable(),
});

const courseUpdateSchema = courseCreateSchema.partial().extend({
  id: z.string().uuid(),
});

const requirementCreateSchema = z.object({
  requirement_type: z.enum(['role_unlock', 'activity_unlock', 'game_unlock', 'onboarding_required']),
  target_ref: z.object({
    kind: z.enum(['game', 'role', 'activity', 'feature']),
    id: z.string().min(1),
    name: z.string().optional(),
  }),
  required_course_id: z.string().uuid(),
  required_status: z.enum(['completed', 'in_progress']).default('completed'),
  priority: z.number().int().default(0),
  is_active: z.boolean().default(true),
  scope: z.enum(['global', 'tenant']).default('tenant'),
  tenant_id: z.string().uuid().optional().nullable(),
});

// ============================================
// HELPER: Get current user with admin check
// ============================================

async function getCurrentAdminUser() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, isSystem: false, error: 'Inte autentiserad' };
  }
  
  const isSystem = isSystemAdmin(user);
  return { user, isSystem, error: null };
}

// ============================================
// COURSES - LIST
// ============================================

export async function listCourses(
  params: LearningCourseListParams = {}
): Promise<LearningCourseListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    status = 'all',
    scope = 'all',
    tenantId,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  // For non-system admins, we need to get their tenant(s)
  const supabase = await createServerRlsClient();
  
  // If not system admin, they must have a specific tenant context
  // For simplicity in Phase 1, require system admin for full list
  // Tenant admins will be handled via context in future
  if (!isSystem) {
    // Get user's admin tenants
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    
    if (!memberships || memberships.length === 0) {
      throw new Error('Ingen adminbehörighet');
    }
    
    // For now, use first admin tenant if no tenantId specified
    const effectiveTenantId = tenantId || memberships[0].tenant_id;
    
    // Verify they have access to requested tenant
    if (tenantId && !memberships.some(m => m.tenant_id === tenantId)) {
      throw new Error('Ingen åtkomst till denna organisation');
    }
    
    // Build query for tenant admin - they see global + their tenant
    let query = supabase
      .from('learning_courses')
      .select('*', { count: 'exact' });

    // Tenant admin sees global courses + their tenant's courses
    query = query.or(`tenant_id.is.null,tenant_id.eq.${effectiveTenantId}`);

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const ascending = sortOrder === 'asc';
    query = query.order(sortBy, { ascending });

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing courses:', error);
      throw new Error('Kunde inte hämta kurser');
    }

    // Get stats for this tenant
    const { data: allCourses } = await supabase
      .from('learning_courses')
      .select('status')
      .or(`tenant_id.is.null,tenant_id.eq.${effectiveTenantId}`);

    const stats = {
      total: allCourses?.length || 0,
      active: allCourses?.filter(c => c.status === 'active').length || 0,
      draft: allCourses?.filter(c => c.status === 'draft').length || 0,
      archived: allCourses?.filter(c => c.status === 'archived').length || 0,
    };

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      data: (data || []) as LearningCourseRow[],
      totalCount,
      page,
      pageSize,
      totalPages,
      stats,
    };
  }

  // System admin: full access
  let query = supabase
    .from('learning_courses')
    .select(`
      *,
      tenant:tenants(name)
    `, { count: 'exact' });

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  if (scope === 'global') {
    query = query.is('tenant_id', null);
  } else if (scope === 'tenant') {
    query = query.not('tenant_id', 'is', null);
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
  } else if (tenantId) {
    // scope = 'all' but with tenant filter
    query = query.eq('tenant_id', tenantId);
  }

  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing courses:', error);
    throw new Error('Kunde inte hämta kurser');
  }

  // Get stats (system admin sees all by default)
  let statsQuery = supabase.from('learning_courses').select('status');
  if (scope === 'global') {
    statsQuery = statsQuery.is('tenant_id', null);
  } else if (scope === 'tenant' && tenantId) {
    statsQuery = statsQuery.eq('tenant_id', tenantId);
  } else if (tenantId) {
    statsQuery = statsQuery.eq('tenant_id', tenantId);
  }
  
  const { data: allCourses } = await statsQuery;

  const stats = {
    total: allCourses?.length || 0,
    active: allCourses?.filter(c => c.status === 'active').length || 0,
    draft: allCourses?.filter(c => c.status === 'draft').length || 0,
    archived: allCourses?.filter(c => c.status === 'archived').length || 0,
  };

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform to include tenant_name
  const transformedData = (data || []).map((course) => {
    const c = course as LearningCourseRow & { tenant?: { name: string } | null };
    return {
      ...c,
      tenant_name: c.tenant?.name || null,
      tenant: undefined,
    } as LearningCourseRow;
  });

  return {
    data: transformedData as LearningCourseRow[],
    totalCount,
    page,
    pageSize,
    totalPages,
    stats,
  };
}

// ============================================
// COURSES - GET SINGLE
// ============================================

export async function getCourse(id: string): Promise<LearningCourseRow | null> {
  const { user, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from('learning_courses')
    .select(`
      *,
      tenant:tenants(name)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting course:', error);
    throw new Error('Kunde inte hämta kurs');
  }

  return {
    ...data,
    tenant_name: data.tenant?.name || null,
  } as LearningCourseRow;
}

// ============================================
// COURSES - CREATE
// ============================================

export async function createCourse(
  input: z.infer<typeof courseCreateSchema>
): Promise<{ success: boolean; data?: LearningCourseRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Validate input
  const parsed = courseCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { scope, tenant_id, ...rest } = parsed.data;

  // Determine effective tenant_id
  const effectiveTenantId = scope === 'global' ? null : tenant_id;

  // Authorization checks
  if (scope === 'global') {
    // Only system admin can create global courses
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan skapa globala kurser' };
    }
  } else {
    // Tenant-scoped: check tenant admin access
    if (!effectiveTenantId) {
      return { success: false, error: 'Organisation krävs för organisationskurser' };
    }
    
    const hasAccess = await assertTenantAdminOrSystem(effectiveTenantId, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' };
    }
  }

  // Use service role for global, RLS client for tenant
  const client = scope === 'global' ? createServiceRoleClient() : await createServerRlsClient();

  const { data, error } = await client
    .from('learning_courses')
    .insert({
      ...rest,
      tenant_id: effectiveTenantId,
      tags: rest.tags || [],
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating course:', error);
    if (error.code === '23505') {
      return { success: false, error: 'En kurs med denna slug finns redan' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/courses');
  return { success: true, data: data as LearningCourseRow };
}

// ============================================
// COURSES - UPDATE
// ============================================

export async function updateCourse(
  input: z.infer<typeof courseUpdateSchema>
): Promise<{ success: boolean; data?: LearningCourseRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Validate input
  const parsed = courseUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { id, scope, tenant_id, ...rest } = parsed.data;

  // First, get the existing course to check permissions
  const supabase = await createServerRlsClient();
  const { data: existing, error: fetchError } = await supabase
    .from('learning_courses')
    .select('tenant_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Kursen hittades inte' };
  }

  // Check current scope and new scope
  const currentlyGlobal = existing.tenant_id === null;
  const newScope = scope || (currentlyGlobal ? 'global' : 'tenant');
  const newTenantId = newScope === 'global' ? null : (tenant_id ?? existing.tenant_id);

  // Authorization
  if (currentlyGlobal || newScope === 'global') {
    // Modifying global course or changing to global: system admin only
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan redigera globala kurser' };
    }
  } else {
    // Tenant course: check access
    const checkTenantId = newTenantId || existing.tenant_id;
    if (checkTenantId) {
      const hasAccess = await assertTenantAdminOrSystem(checkTenantId, user);
      if (!hasAccess) {
        return { success: false, error: 'Ingen åtkomst till denna organisation' };
      }
    }
  }

  // Use appropriate client
  const client = (currentlyGlobal || newScope === 'global') ? createServiceRoleClient() : supabase;

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };

  // Only update tenant_id if scope was explicitly provided
  if (scope !== undefined) {
    updateData.tenant_id = newTenantId;
  }

  const { data, error } = await client
    .from('learning_courses')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating course:', error);
    if (error.code === '23505') {
      return { success: false, error: 'En kurs med denna slug finns redan' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/courses');
  return { success: true, data: data as LearningCourseRow };
}

// ============================================
// COURSES - SET STATUS
// ============================================

export async function setCourseStatus(
  courseId: string,
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  const supabase = await createServerRlsClient();
  
  // Get course to check permissions
  const { data: course, error: fetchError } = await supabase
    .from('learning_courses')
    .select('tenant_id')
    .eq('id', courseId)
    .single();

  if (fetchError || !course) {
    return { success: false, error: 'Kursen hittades inte' };
  }

  // Authorization
  if (course.tenant_id === null) {
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan ändra globala kurser' };
    }
  } else {
    const hasAccess = await assertTenantAdminOrSystem(course.tenant_id, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst' };
    }
  }

  const client = course.tenant_id === null ? createServiceRoleClient() : supabase;

  const { error } = await client
    .from('learning_courses')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', courseId);

  if (error) {
    console.error('Error updating course status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/courses');
  return { success: true };
}

// ============================================
// COURSES - DELETE (soft delete = archive)
// ============================================

export async function deleteCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  // Soft delete = set status to archived
  return setCourseStatus(courseId, 'archived');
}

// ============================================
// PATHS - LIST (Phase 1: Read-only)
// ============================================

export async function listPaths(
  params: LearningPathListParams = {}
): Promise<LearningPathListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    status = 'all',
    scope = 'all',
    tenantId,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  let query = supabase
    .from('learning_paths')
    .select(`
      *,
      tenant:tenants(name),
      nodes:learning_path_nodes(count)
    `, { count: 'exact' });

  if (!isSystem) {
    // Tenant admin: see global + their tenant
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    
    if (!memberships || memberships.length === 0) {
      throw new Error('Ingen adminbehörighet');
    }
    
    const tenantIds = memberships.map(m => m.tenant_id);
    query = query.or(`tenant_id.is.null,tenant_id.in.(${tenantIds.join(',')})`);
  } else {
    // System admin filters
    if (scope === 'global') {
      query = query.is('tenant_id', null);
    } else if (scope === 'tenant') {
      query = query.not('tenant_id', 'is', null);
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
  }

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
  }

  if (status !== 'all') {
    query = query.eq('status', status);
  }

  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing paths:', error);
    throw new Error('Kunde inte hämta lärstigar');
  }

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform data
  const transformedData = (data || []).map((path) => {
    const p = path as LearningPathRow & { tenant?: { name: string } | null; nodes?: { count: number }[] };
    return {
      ...p,
      tenant_name: p.tenant?.name || null,
      node_count: p.nodes?.[0]?.count || 0,
      tenant: undefined,
      nodes: undefined,
    } as LearningPathRow;
  });

  return {
    data: transformedData as LearningPathRow[],
    totalCount,
    page,
    pageSize,
    totalPages,
  };
}

// ============================================
// PATHS - GET SINGLE
// ============================================

export async function getPath(id: string): Promise<LearningPathRow | null> {
  const { user, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from('learning_paths')
    .select(`
      *,
      tenant:tenants(name),
      nodes:learning_path_nodes(
        id,
        course:learning_courses(id, title, slug)
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting path:', error);
    throw new Error('Kunde inte hämta lärstig');
  }

  return {
    ...data,
    tenant_name: data.tenant?.name || null,
    node_count: data.nodes?.length || 0,
  } as LearningPathRow;
}

// ============================================
// REQUIREMENTS - LIST
// ============================================

export async function listRequirements(
  params: LearningRequirementListParams = {}
): Promise<LearningRequirementListResult> {
  const {
    page = 1,
    pageSize = 20,
    search,
    scope = 'all',
    tenantId,
    isActive = 'all',
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  let query = supabase
    .from('learning_requirements')
    .select(`
      *,
      tenant:tenants(name),
      course:learning_courses(title, slug)
    `, { count: 'exact' });

  if (!isSystem) {
    // Tenant admin: see global + their tenant
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    
    if (!memberships || memberships.length === 0) {
      throw new Error('Ingen adminbehörighet');
    }
    
    const tenantIds = memberships.map(m => m.tenant_id);
    query = query.or(`tenant_id.is.null,tenant_id.in.(${tenantIds.join(',')})`);
  } else {
    // System admin filters
    if (scope === 'global') {
      query = query.is('tenant_id', null);
    } else if (scope === 'tenant') {
      query = query.not('tenant_id', 'is', null);
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
  }

  if (search) {
    query = query.or(`target_ref->>name.ilike.%${search}%,target_ref->>id.ilike.%${search}%`);
  }

  if (isActive !== 'all') {
    query = query.eq('is_active', isActive);
  }

  const ascending = sortOrder === 'asc';
  query = query.order(sortBy, { ascending });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;

  if (error) {
    console.error('Error listing requirements:', error);
    throw new Error('Kunde inte hämta krav');
  }

  // Get stats
  let statsQuery = supabase.from('learning_requirements').select('is_active');
  if (!isSystem) {
    // Same tenant filter as above
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    
    if (memberships && memberships.length > 0) {
      const tenantIds = memberships.map(m => m.tenant_id);
      statsQuery = statsQuery.or(`tenant_id.is.null,tenant_id.in.(${tenantIds.join(',')})`);
    }
  } else if (scope === 'global') {
    statsQuery = statsQuery.is('tenant_id', null);
  } else if (scope === 'tenant' && tenantId) {
    statsQuery = statsQuery.eq('tenant_id', tenantId);
  }

  const { data: allReqs } = await statsQuery;
  const stats = {
    total: allReqs?.length || 0,
    active: allReqs?.filter(r => r.is_active).length || 0,
    inactive: allReqs?.filter(r => !r.is_active).length || 0,
  };

  const totalCount = count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform data
  const transformedData = (data || []).map((req) => {
    const r = req as LearningRequirementRow & { tenant?: { name: string } | null; course?: { title: string; slug: string } | null };
    return {
      ...r,
      tenant_name: r.tenant?.name || null,
      course_title: r.course?.title || null,
      course_slug: r.course?.slug || null,
      tenant: undefined,
      course: undefined,
    } as LearningRequirementRow;
  });

  return {
    data: transformedData as LearningRequirementRow[],
    totalCount,
    page,
    pageSize,
    totalPages,
    stats,
  };
}

// ============================================
// REQUIREMENTS - GET SINGLE
// ============================================

export async function getRequirement(id: string): Promise<LearningRequirementRow | null> {
  const { user, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from('learning_requirements')
    .select(`
      *,
      tenant:tenants(name),
      course:learning_courses(title, slug)
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('Error getting requirement:', error);
    throw new Error('Kunde inte hämta krav');
  }

  return {
    ...data,
    tenant_name: data.tenant?.name || null,
    course_title: data.course?.title || null,
    course_slug: data.course?.slug || null,
  } as LearningRequirementRow;
}

// ============================================
// REQUIREMENTS - CREATE
// ============================================

export async function createRequirementAdmin(
  input: z.infer<typeof requirementCreateSchema>
): Promise<{ success: boolean; data?: LearningRequirementRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Validate input
  const parsed = requirementCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { scope, tenant_id, ...rest } = parsed.data;
  const effectiveTenantId = scope === 'global' ? null : tenant_id;

  // Authorization
  if (scope === 'global') {
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan skapa globala krav' };
    }
  } else {
    if (!effectiveTenantId) {
      return { success: false, error: 'Organisation krävs för organisationskrav' };
    }
    
    const hasAccess = await assertTenantAdminOrSystem(effectiveTenantId, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' };
    }
  }

  const client = scope === 'global' ? createServiceRoleClient() : await createServerRlsClient();

  const { data, error } = await client
    .from('learning_requirements')
    .insert({
      ...rest,
      tenant_id: effectiveTenantId,
      created_by: user.id,
    })
    .select(`
      *,
      course:learning_courses(title, slug)
    `)
    .single();

  if (error) {
    console.error('Error creating requirement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/requirements');
  return { 
    success: true, 
    data: {
      ...data,
      course_title: data.course?.title,
      course_slug: data.course?.slug,
    } as LearningRequirementRow 
  };
}

// ============================================
// REQUIREMENTS - TOGGLE ACTIVE
// ============================================

export async function toggleRequirementActiveAdmin(
  requirementId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  const supabase = await createServerRlsClient();
  
  // Get requirement to check permissions
  const { data: req, error: fetchError } = await supabase
    .from('learning_requirements')
    .select('tenant_id')
    .eq('id', requirementId)
    .single();

  if (fetchError || !req) {
    return { success: false, error: 'Kravet hittades inte' };
  }

  // Authorization
  if (req.tenant_id === null) {
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan ändra globala krav' };
    }
  } else {
    const hasAccess = await assertTenantAdminOrSystem(req.tenant_id, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst' };
    }
  }

  const client = req.tenant_id === null ? createServiceRoleClient() : supabase;

  const { error } = await client
    .from('learning_requirements')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', requirementId);

  if (error) {
    console.error('Error toggling requirement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/requirements');
  return { success: true };
}

// ============================================
// REQUIREMENTS - DELETE
// ============================================

export async function deleteRequirementAdmin(
  requirementId: string
): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  const supabase = await createServerRlsClient();
  
  // Get requirement to check permissions
  const { data: req, error: fetchError } = await supabase
    .from('learning_requirements')
    .select('tenant_id')
    .eq('id', requirementId)
    .single();

  if (fetchError || !req) {
    return { success: false, error: 'Kravet hittades inte' };
  }

  // Authorization
  if (req.tenant_id === null) {
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan ta bort globala krav' };
    }
  } else {
    const hasAccess = await assertTenantAdminOrSystem(req.tenant_id, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst' };
    }
  }

  const client = req.tenant_id === null ? createServiceRoleClient() : supabase;

  const { error } = await client
    .from('learning_requirements')
    .delete()
    .eq('id', requirementId);

  if (error) {
    console.error('Error deleting requirement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/requirements');
  return { success: true };
}

// ============================================
// TENANTS - LIST FOR SELECTOR
// ============================================

export async function listTenantsForLearningAdmin(): Promise<{ tenants: TenantOption[] }> {
  const { user, isSystem, error: _authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { tenants: [] };
  }

  const supabase = await createServerRlsClient();

  if (isSystem) {
    // System admin sees all tenants
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

  // Non-system admin: return their admin tenants
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant:tenants(id, name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  if (!memberships) {
    return { tenants: [] };
  }

  const tenants = memberships
    .map(m => m.tenant)
    .filter((t): t is TenantOption => t !== null);

  return { tenants };
}

// ============================================
// COURSES - LIST FOR SELECTOR (for requirements)
// ============================================

export async function listCoursesForSelector(
  tenantId?: string | null
): Promise<{ courses: Array<{ id: string; title: string; slug: string; tenant_id: string | null }> }> {
  const { user, isSystem, error: _authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { courses: [] };
  }

  const supabase = await createServerRlsClient();

  let query = supabase
    .from('learning_courses')
    .select('id, title, slug, tenant_id')
    .in('status', ['draft', 'active'])
    .order('title');

  if (!isSystem) {
    // Tenant admin: global + their tenants
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    
    if (!memberships || memberships.length === 0) {
      return { courses: [] };
    }
    
    const tenantIds = memberships.map(m => m.tenant_id);
    query = query.or(`tenant_id.is.null,tenant_id.in.(${tenantIds.join(',')})`);
  } else if (tenantId) {
    // System admin with tenant filter
    query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing courses for selector:', error);
    return { courses: [] };
  }

  return { courses: data || [] };
}

// ============================================
// HELPER: Check if user is system admin (for UI)
// ============================================

export async function checkIsSystemAdmin(): Promise<boolean> {
  const { isSystem } = await getCurrentAdminUser();
  return isSystem;
}

// ============================================
// HELPER: Get user's admin tenant IDs
// ============================================

export async function getUserAdminTenantIds(): Promise<string[]> {
  const { user } = await getCurrentAdminUser();
  
  if (!user) {
    return [];
  }

  const supabase = await createServerRlsClient();
  
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin']);

  return memberships?.map(m => m.tenant_id) || [];
}

// ============================================
// PHASE 2: HUB STATS
// ============================================

export interface LearningHubStats {
  courses: { total: number; active: number; draft: number; archived: number };
  paths: { total: number; active: number };
  requirements: { total: number; active: number };
}

export async function getLearningHubStats(params: {
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
} = {}): Promise<LearningHubStats> {
  const { scope = 'all', tenantId } = params;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  // Build scope filter - takes a query that has already had .select() called
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buildScopeFilter = <T extends { or: any; is: any; eq: any }>(queryBuilder: T, tenantIds?: string[]): T => {
    if (!isSystem && tenantIds) {
      // Tenant admin: global + their tenants
      return queryBuilder.or(`tenant_id.is.null,tenant_id.in.(${tenantIds.join(',')})`);
    }
    if (scope === 'global') {
      return queryBuilder.is('tenant_id', null);
    }
    if (scope === 'tenant' && tenantId) {
      return queryBuilder.eq('tenant_id', tenantId);
    }
    return queryBuilder;
  };

  // Get tenant IDs for tenant admin
  let tenantIds: string[] | undefined;
  if (!isSystem) {
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin']);
    tenantIds = memberships?.map(m => m.tenant_id);
    if (!tenantIds || tenantIds.length === 0) {
      throw new Error('Ingen adminbehörighet');
    }
  }

  // Courses stats
  let coursesQuery = supabase.from('learning_courses').select('status');
  coursesQuery = buildScopeFilter(coursesQuery, tenantIds);
  const { data: courses } = await coursesQuery;
  
  const courseStats = {
    total: courses?.length || 0,
    active: courses?.filter(c => c.status === 'active').length || 0,
    draft: courses?.filter(c => c.status === 'draft').length || 0,
    archived: courses?.filter(c => c.status === 'archived').length || 0,
  };

  // Paths stats
  let pathsQuery = supabase.from('learning_paths').select('status');
  pathsQuery = buildScopeFilter(pathsQuery, tenantIds);
  const { data: paths } = await pathsQuery;
  
  const pathStats = {
    total: paths?.length || 0,
    active: paths?.filter(p => p.status === 'active').length || 0,
  };

  // Requirements stats
  let reqsQuery = supabase.from('learning_requirements').select('is_active');
  reqsQuery = buildScopeFilter(reqsQuery, tenantIds);
  const { data: reqs } = await reqsQuery;
  
  const reqStats = {
    total: reqs?.length || 0,
    active: reqs?.filter(r => r.is_active).length || 0,
  };

  return {
    courses: courseStats,
    paths: pathStats,
    requirements: reqStats,
  };
}

// ============================================
// PHASE 2: PATHS CRUD (System Admin Only)
// ============================================

const pathCreateSchema = z.object({
  title: z.string().min(1, 'Titel krävs').max(100),
  slug: z.string().min(1, 'Slug krävs').max(100).regex(/^[a-z0-9-]+$/, 'Slug får bara innehålla gemener, siffror och bindestreck'),
  description: z.string().max(500).optional().nullable(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  kind: z.enum(['onboarding', 'role', 'theme', 'compliance']).default('theme'),
  cover_image_url: z.string().url().optional().nullable(),
  scope: z.enum(['global', 'tenant']).default('global'),
  tenant_id: z.string().uuid().optional().nullable(),
});

const pathUpdateSchema = pathCreateSchema.partial().extend({
  id: z.string().uuid(),
});

export async function createPath(
  input: z.infer<typeof pathCreateSchema>
): Promise<{ success: boolean; data?: LearningPathRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // System admin only for path creation
  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan skapa lärstigar' };
  }

  const parsed = pathCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { scope, tenant_id, ...rest } = parsed.data;
  const effectiveTenantId = scope === 'global' ? null : tenant_id;

  // Use service role for all path writes (system admin only)
  const client = createServiceRoleClient();

  const { data, error } = await client
    .from('learning_paths')
    .insert({
      ...rest,
      tenant_id: effectiveTenantId,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating path:', error);
    if (error.code === '23505') {
      return { success: false, error: 'En lärstig med denna slug finns redan' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true, data: data as LearningPathRow };
}

export async function updatePath(
  input: z.infer<typeof pathUpdateSchema>
): Promise<{ success: boolean; data?: LearningPathRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan redigera lärstigar' };
  }

  const parsed = pathUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { id, scope, tenant_id, ...rest } = parsed.data;
  const client = createServiceRoleClient();

  const updateData: Record<string, unknown> = {
    ...rest,
    updated_at: new Date().toISOString(),
  };

  if (scope !== undefined) {
    updateData.tenant_id = scope === 'global' ? null : tenant_id;
  }

  const { data, error } = await client
    .from('learning_paths')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating path:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true, data: data as LearningPathRow };
}

export async function setPathStatus(
  pathId: string,
  status: 'draft' | 'active' | 'archived'
): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan ändra lärstigar' };
  }

  const client = createServiceRoleClient();

  const { error } = await client
    .from('learning_paths')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', pathId);

  if (error) {
    console.error('Error updating path status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true };
}

export async function deletePath(pathId: string): Promise<{ success: boolean; error?: string }> {
  return setPathStatus(pathId, 'archived');
}

// ============================================
// PHASE 2: PATH NODES MANAGEMENT
// ============================================

export interface LearningPathNodeRow {
  id: string;
  path_id: string;
  course_id: string;
  position_json: { x: number; y: number };
  metadata: Json;
  created_at: string;
  course_title?: string;
  course_slug?: string;
}

export async function listPathNodes(pathId: string): Promise<LearningPathNodeRow[]> {
  const { user, error: authError } = await getCurrentAdminUser();

  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from('learning_path_nodes')
    .select(`
      *,
      course:learning_courses(title, slug)
    `)
    .eq('path_id', pathId)
    .order('created_at');

  if (error) {
    console.error('Error listing path nodes:', error);
    throw new Error('Kunde inte hämta noderna');
  }

  return (data || []).map((node) => {
    const n = node as LearningPathNodeRow & { course?: { title: string; slug: string } | null };
    return {
      ...n,
      course_title: n.course?.title,
      course_slug: n.course?.slug,
      course: undefined,
    } as LearningPathNodeRow;
  });
}

const nodeAddSchema = z.object({
  path_id: z.string().uuid(),
  course_id: z.string().uuid(),
  position_x: z.number().default(0),
  position_y: z.number().default(0),
});

export async function addPathNode(
  input: z.infer<typeof nodeAddSchema>
): Promise<{ success: boolean; data?: LearningPathNodeRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan lägga till noder' };
  }

  const parsed = nodeAddSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { path_id, course_id, position_x, position_y } = parsed.data;
  const client = createServiceRoleClient();

  const { data, error } = await client
    .from('learning_path_nodes')
    .insert({
      path_id,
      course_id,
      position_json: { x: position_x, y: position_y },
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding path node:', error);
    if (error.code === '23505') {
      return { success: false, error: 'Denna kurs finns redan i lärstigen' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true, data: data as LearningPathNodeRow };
}

export async function updatePathNode(
  nodeId: string,
  position: { x: number; y: number }
): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan uppdatera noder' };
  }

  const client = createServiceRoleClient();

  const { error } = await client
    .from('learning_path_nodes')
    .update({ position_json: position })
    .eq('id', nodeId);

  if (error) {
    console.error('Error updating path node:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true };
}

export async function removePathNode(nodeId: string): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan ta bort noder' };
  }

  const client = createServiceRoleClient();

  const { error } = await client
    .from('learning_path_nodes')
    .delete()
    .eq('id', nodeId);

  if (error) {
    console.error('Error removing path node:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true };
}

// ============================================
// PHASE 2: PATH EDGES MANAGEMENT
// ============================================

export interface LearningPathEdgeRow {
  id: string;
  path_id: string;
  from_course_id: string;
  to_course_id: string;
  rule_json: Json;
  metadata: Json;
  created_at: string;
  from_course_title?: string;
  to_course_title?: string;
}

export async function listPathEdges(pathId: string): Promise<LearningPathEdgeRow[]> {
  const { user, error: authError } = await getCurrentAdminUser();

  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();

  const { data, error } = await supabase
    .from('learning_path_edges')
    .select(`
      *,
      from_course:learning_courses!learning_path_edges_from_course_id_fkey(title),
      to_course:learning_courses!learning_path_edges_to_course_id_fkey(title)
    `)
    .eq('path_id', pathId)
    .order('created_at');

  if (error) {
    console.error('Error listing path edges:', error);
    throw new Error('Kunde inte hämta kanterna');
  }

  return (data || []).map((edge: LearningPathEdgeRow & { from_course?: { title: string } | null; to_course?: { title: string } | null }) => ({
    ...edge,
    from_course_title: edge.from_course?.title,
    to_course_title: edge.to_course?.title,
    from_course: undefined,
    to_course: undefined,
  }));
}

const edgeAddSchema = z.object({
  path_id: z.string().uuid(),
  from_course_id: z.string().uuid(),
  to_course_id: z.string().uuid(),
  rule_type: z.enum(['completed']).default('completed'),
});

export async function addPathEdge(
  input: z.infer<typeof edgeAddSchema>
): Promise<{ success: boolean; data?: LearningPathEdgeRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan lägga till kanter' };
  }

  const parsed = edgeAddSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { path_id, from_course_id, to_course_id, rule_type } = parsed.data;

  if (from_course_id === to_course_id) {
    return { success: false, error: 'En kurs kan inte vara förutsättning för sig själv' };
  }

  const client = createServiceRoleClient();

  const { data, error } = await client
    .from('learning_path_edges')
    .insert({
      path_id,
      from_course_id,
      to_course_id,
      rule_json: { type: rule_type },
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding path edge:', error);
    if (error.code === '23505') {
      return { success: false, error: 'Denna förutsättning finns redan' };
    }
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true, data: data as LearningPathEdgeRow };
}

export async function removePathEdge(edgeId: string): Promise<{ success: boolean; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan ta bort kanter' };
  }

  const client = createServiceRoleClient();

  const { error } = await client
    .from('learning_path_edges')
    .delete()
    .eq('id', edgeId);

  if (error) {
    console.error('Error removing path edge:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/paths');
  return { success: true };
}

// ============================================
// PHASE 2: REQUIREMENTS UPDATE
// ============================================

const requirementUpdateSchema = z.object({
  id: z.string().uuid(),
  requirement_type: z.enum(['role_unlock', 'activity_unlock', 'game_unlock', 'onboarding_required']).optional(),
  target_ref: z.object({
    kind: z.enum(['game', 'role', 'activity', 'feature']),
    id: z.string().min(1),
    name: z.string().optional(),
  }).optional(),
  required_course_id: z.string().uuid().optional(),
  required_status: z.enum(['completed', 'in_progress']).optional(),
  priority: z.number().int().optional(),
  is_active: z.boolean().optional(),
});

export async function updateRequirementAdmin(
  input: z.infer<typeof requirementUpdateSchema>
): Promise<{ success: boolean; data?: LearningRequirementRow; error?: string }> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  const parsed = requirementUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Valideringsfel' };
  }

  const { id, ...updates } = parsed.data;

  // Get existing requirement to check permissions
  const supabase = await createServerRlsClient();
  const { data: existing, error: fetchError } = await supabase
    .from('learning_requirements')
    .select('tenant_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return { success: false, error: 'Kravet hittades inte' };
  }

  // Authorization
  if (existing.tenant_id === null) {
    if (!isSystem) {
      return { success: false, error: 'Endast systemadministratörer kan redigera globala krav' };
    }
  } else {
    const hasAccess = await assertTenantAdminOrSystem(existing.tenant_id, user);
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst' };
    }
  }

  const client = existing.tenant_id === null ? createServiceRoleClient() : supabase;

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (updates.requirement_type !== undefined) updateData.requirement_type = updates.requirement_type;
  if (updates.target_ref !== undefined) updateData.target_ref = updates.target_ref;
  if (updates.required_course_id !== undefined) updateData.required_course_id = updates.required_course_id;
  if (updates.required_status !== undefined) updateData.required_status = updates.required_status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.is_active !== undefined) updateData.is_active = updates.is_active;

  const { data, error } = await client
    .from('learning_requirements')
    .update(updateData)
    .eq('id', id)
    .select(`
      *,
      course:learning_courses(title, slug)
    `)
    .single();

  if (error) {
    console.error('Error updating requirement:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin/learning/requirements');
  return {
    success: true,
    data: {
      ...data,
      course_title: data.course?.title,
      course_slug: data.course?.slug,
    } as LearningRequirementRow,
  };
}

// ============================================
// PHASE 2: REPORTS
// ============================================

export interface LearningReportStats {
  activeParticipants: number;
  completedCourses: number;
  averageScore: number | null;
  topCourses: Array<{
    course_id: string;
    title: string;
    completions: number;
  }>;
}

export interface LearningReportCourseRow {
  course_id: string;
  title: string;
  scope: 'global' | 'tenant';
  tenant_name?: string;
  completions_30d: number;
  avg_score_30d: number | null;
  fail_rate_30d: number | null;
}

export interface LearningReportsResult {
  stats: LearningReportStats;
  courses: LearningReportCourseRow[];
}

export async function getLearningReports(params: {
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
  days?: number;
} = {}): Promise<LearningReportsResult> {
  const { scope = 'all', tenantId, days = 30 } = params;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();

  if (!user) {
    throw new Error(authError || 'Inte autentiserad');
  }

  const supabase = await createServerRlsClient();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceISO = since.toISOString();

  // Get tenant filter for tenant admin
  let tenantFilter: string | null = null;
  if (!isSystem) {
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .in('role', ['owner', 'admin'])
      .limit(1);
    
    if (!memberships || memberships.length === 0) {
      throw new Error('Ingen adminbehörighet');
    }
    tenantFilter = memberships[0].tenant_id;
  } else if (scope === 'tenant' && tenantId) {
    tenantFilter = tenantId;
  }

  // Get progress data for stats
  let progressQuery = supabase
    .from('learning_user_progress')
    .select('user_id, status, last_score, completed_at')
    .gte('updated_at', sinceISO);
  
  if (tenantFilter) {
    progressQuery = progressQuery.eq('tenant_id', tenantFilter);
  }

  const { data: progressData } = await progressQuery;

  // Calculate stats
  const uniqueUsers = new Set(progressData?.filter(p => p.status === 'in_progress' || p.status === 'completed').map(p => p.user_id));
  const completed = progressData?.filter(prog => prog.status === 'completed') || [];
  const scores = completed.map(prog => prog.last_score).filter((s): s is number => s !== null);
  const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  // Get top courses by completions
  const courseCompletions: Record<string, number> = {};

  // Re-query with course_id for proper stats
  let progressWithCourseQuery = supabase
    .from('learning_user_progress')
    .select('course_id, status, last_score')
    .eq('status', 'completed')
    .gte('completed_at', sinceISO);
  
  if (tenantFilter) {
    progressWithCourseQuery = progressWithCourseQuery.eq('tenant_id', tenantFilter);
  }

  const { data: completedProgress } = await progressWithCourseQuery;

  completedProgress?.forEach(p => {
    courseCompletions[p.course_id] = (courseCompletions[p.course_id] || 0) + 1;
  });

  // Get course titles for top courses
  const topCourseIds = Object.entries(courseCompletions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  let topCoursesData: Array<{ course_id: string; title: string; completions: number }> = [];
  if (topCourseIds.length > 0) {
    const { data: courseTitles } = await supabase
      .from('learning_courses')
      .select('id, title')
      .in('id', topCourseIds);

    topCoursesData = topCourseIds.map(id => ({
      course_id: id,
      title: courseTitles?.find(c => c.id === id)?.title || 'Okänd kurs',
      completions: courseCompletions[id],
    }));
  }

  const stats: LearningReportStats = {
    activeParticipants: uniqueUsers.size,
    completedCourses: completed.length,
    averageScore: avgScore,
    topCourses: topCoursesData,
  };

  // Get per-course stats
  let coursesQuery = supabase
    .from('learning_courses')
    .select(`
      id,
      title,
      tenant_id,
      tenant:tenants(name)
    `)
    .in('status', ['active', 'draft']);

  // Apply scope filter for courses
  if (!isSystem && tenantFilter) {
    coursesQuery = coursesQuery.or(`tenant_id.is.null,tenant_id.eq.${tenantFilter}`);
  } else if (scope === 'global') {
    coursesQuery = coursesQuery.is('tenant_id', null);
  } else if (scope === 'tenant' && tenantId) {
    coursesQuery = coursesQuery.eq('tenant_id', tenantId);
  }

  const { data: coursesData } = await coursesQuery;

  // Get attempt data for per-course stats
  let attemptsQuery = supabase
    .from('learning_course_attempts')
    .select('course_id, score, passed, submitted_at')
    .not('submitted_at', 'is', null)
    .gte('submitted_at', sinceISO);

  if (tenantFilter) {
    attemptsQuery = attemptsQuery.eq('tenant_id', tenantFilter);
  }

  const { data: attemptsData } = await attemptsQuery;

  // Build per-course stats
  const courseStats: Record<string, { completions: number; scores: number[]; fails: number; attempts: number }> = {};
  attemptsData?.forEach(a => {
    if (!courseStats[a.course_id]) {
      courseStats[a.course_id] = { completions: 0, scores: [], fails: 0, attempts: 0 };
    }
    courseStats[a.course_id].attempts++;
    if (a.passed === true) {
      courseStats[a.course_id].completions++;
    } else if (a.passed === false) {
      courseStats[a.course_id].fails++;
    }
    if (a.score !== null) {
      courseStats[a.course_id].scores.push(a.score);
    }
  });

  // Also count completions from progress table
  completedProgress?.forEach(p => {
    if (!courseStats[p.course_id]) {
      courseStats[p.course_id] = { completions: 0, scores: [], fails: 0, attempts: 0 };
    }
    // Use progress completions as authoritative
  });

  const courses: LearningReportCourseRow[] = (coursesData || []).map((course: { id: string; title: string; tenant_id: string | null; tenant?: { name: string } | null }) => {
    const stats = courseStats[course.id] || { completions: 0, scores: [], fails: 0, attempts: 0 };
    const avgCourseScore = stats.scores.length > 0 
      ? Math.round(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) 
      : null;
    const failRate = stats.attempts > 0 ? Math.round((stats.fails / stats.attempts) * 100) : null;

    return {
      course_id: course.id,
      title: course.title,
      scope: course.tenant_id === null ? 'global' as const : 'tenant' as const,
      tenant_name: course.tenant?.name,
      completions_30d: courseCompletions[course.id] || 0,
      avg_score_30d: avgCourseScore,
      fail_rate_30d: failRate,
    };
  });

  // Sort by completions desc
  courses.sort((a, b) => b.completions_30d - a.completions_30d);

  return { stats, courses };
}

// ============================================
// PHASE 2: COURSES FOR PATH EDITOR
// ============================================

export async function listCoursesForPathEditor(params: {
  scope?: 'all' | 'global' | 'tenant';
  tenantId?: string;
} = {}): Promise<{ courses: Array<{ id: string; title: string; slug: string; tenant_id: string | null }> }> {
  const { scope = 'all', tenantId } = params;
  const { user, isSystem, error: _authError } = await getCurrentAdminUser();

  if (!user) {
    return { courses: [] };
  }

  // System admin only for path editing
  if (!isSystem) {
    return { courses: [] };
  }

  const supabase = await createServerRlsClient();

  let query = supabase
    .from('learning_courses')
    .select('id, title, slug, tenant_id')
    .in('status', ['draft', 'active'])
    .order('title');

  if (scope === 'global') {
    query = query.is('tenant_id', null);
  } else if (scope === 'tenant' && tenantId) {
    query = query.or(`tenant_id.is.null,tenant_id.eq.${tenantId}`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error listing courses for path editor:', error);
    return { courses: [] };
  }

  return { courses: data || [] };
}
