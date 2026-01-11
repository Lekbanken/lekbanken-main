'use server'

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

// ============================================================================
// TYPES
// ============================================================================

export interface FAQEntry {
  id: string
  faq_key: string | null
  tenant_id: string | null
  question: string
  answer_markdown: string
  category: string | null
  tags: string[]
  position: number
  is_published: boolean
  view_count: number
  helpful_count: number
  not_helpful_count: number
  created_at: string
  updated_at: string
  tenant_name?: string
}

export interface CreateFAQInput {
  tenantId?: string | null
  question: string
  answerMarkdown: string
  category?: string
  tags?: string[]
  isPublished?: boolean
  position?: number
}

export interface UpdateFAQInput {
  id: string
  question?: string
  answerMarkdown?: string
  category?: string
  tags?: string[]
  isPublished?: boolean
  position?: number
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

interface AdminUser {
  user: { id: string; email?: string; app_metadata?: Record<string, unknown> }
  isSystem: boolean
  error?: string
}

async function getCurrentAdminUser(): Promise<AdminUser> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { user: null as unknown as AdminUser['user'], isSystem: false, error: 'Ej inloggad' }
  }
  
  const isSystem = isSystemAdmin(user)
  return { user, isSystem }
}

async function assertAdminAccess(tenantId?: string | null): Promise<{
  user: AdminUser['user']
  isSystem: boolean
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  if (error) return { user, isSystem, error }
  
  // System admin has full access (including global FAQs)
  if (isSystem) return { user, isSystem }
  
  // For global FAQs (tenantId is null), only system admins
  if (tenantId === null) {
    return { user, isSystem, error: 'Endast systemadministratörer kan hantera globala FAQ' }
  }
  
  // Tenant admin needs specific tenant
  if (tenantId) {
    const hasTenantAccess = await isTenantAdmin(tenantId, user.id)
    if (!hasTenantAccess) {
      return { user, isSystem, error: 'Ingen åtkomst till denna organisation' }
    }
    return { user, isSystem }
  }
  
  return { user, isSystem }
}

// ============================================================================
// ADMIN: LIST FAQs
// ============================================================================

export async function listFAQEntries(params: {
  tenantId?: string
  includeUnpublished?: boolean
  category?: string
  search?: string
  limit?: number
  offset?: number
}): Promise<{ success: boolean; data?: FAQEntry[]; total?: number; error?: string }> {
  const { isSystem, error } = await getCurrentAdminUser()
  
  // If no admin access, only show published FAQs
  const isAdmin = !error
  
  try {
    const supabase = isSystem && !params.tenantId
      ? await createServiceRoleClient()
      : await createServerRlsClient()
    
    let query = supabase
      .from('support_faq_entries')
      .select(`
        id,
        faq_key,
        tenant_id,
        question,
        answer_markdown,
        category,
        tags,
        position,
        is_published,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at,
        tenants:tenant_id (name)
      `, { count: 'exact' })
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
    
    // Filter by tenant
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    // Filter by published status (admins can see all, users only published)
    if (!isAdmin || !params.includeUnpublished) {
      query = query.eq('is_published', true)
    }
    
    // Filter by category
    if (params.category) {
      query = query.eq('category', params.category)
    }
    
    // Search
    if (params.search) {
      query = query.ilike('question', `%${params.search}%`)
    }
    
    // Pagination
    const limit = params.limit ?? 50
    const offset = params.offset ?? 0
    query = query.range(offset, offset + limit - 1)
    
    const { data, count, error: queryError } = await query
    
    if (queryError) {
      console.error('listFAQEntries error:', queryError)
      return { success: false, error: 'Kunde inte hämta FAQ' }
    }
    
    const entries: FAQEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      faq_key: row.faq_key,
      tenant_id: row.tenant_id,
      question: row.question,
      answer_markdown: row.answer_markdown,
      category: row.category,
      tags: (row.tags as string[]) ?? [],
      position: row.position,
      is_published: row.is_published,
      view_count: row.view_count,
      helpful_count: row.helpful_count,
      not_helpful_count: row.not_helpful_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
      tenant_name: (row.tenants as { name?: string } | null)?.name ?? undefined,
    }))
    
    return { success: true, data: entries, total: count ?? 0 }
  } catch (err) {
    console.error('listFAQEntries error:', err)
    return { success: false, error: 'Kunde inte hämta FAQ' }
  }
}

// ============================================================================
// ADMIN: GET SINGLE FAQ
// ============================================================================

export async function getFAQEntry(id: string): Promise<{ success: boolean; data?: FAQEntry; error?: string }> {
  try {
    const supabase = await createServerRlsClient()
    
    const { data, error: queryError } = await supabase
      .from('support_faq_entries')
      .select(`
        id,
        faq_key,
        tenant_id,
        question,
        answer_markdown,
        category,
        tags,
        position,
        is_published,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at,
        tenants:tenant_id (name)
      `)
      .eq('id', id)
      .single()
    
    if (queryError) {
      console.error('getFAQEntry error:', queryError)
      return { success: false, error: 'Kunde inte hämta FAQ' }
    }
    
    const entry: FAQEntry = {
      id: data.id,
      faq_key: data.faq_key,
      tenant_id: data.tenant_id,
      question: data.question,
      answer_markdown: data.answer_markdown,
      category: data.category,
      tags: (data.tags as string[]) ?? [],
      position: data.position,
      is_published: data.is_published,
      view_count: data.view_count,
      helpful_count: data.helpful_count,
      not_helpful_count: data.not_helpful_count,
      created_at: data.created_at,
      updated_at: data.updated_at,
      tenant_name: (data.tenants as { name?: string } | null)?.name ?? undefined,
    }
    
    return { success: true, data: entry }
  } catch (err) {
    console.error('getFAQEntry error:', err)
    return { success: false, error: 'Kunde inte hämta FAQ' }
  }
}

// ============================================================================
// ADMIN: CREATE FAQ
// ============================================================================

export async function createFAQEntry(input: CreateFAQInput): Promise<{ success: boolean; data?: FAQEntry; error?: string }> {
  const { user, isSystem, error } = await assertAdminAccess(input.tenantId)
  if (error) return { success: false, error }
  
  // Only system admins can create global FAQs
  if (input.tenantId === null && !isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan skapa globala FAQ' }
  }
  
  try {
    const supabase = isSystem ? await createServiceRoleClient() : await createServerRlsClient()
    
    const { data, error: insertError } = await supabase
      .from('support_faq_entries')
      .insert({
        tenant_id: input.tenantId ?? null,
        question: input.question,
        answer_markdown: input.answerMarkdown,
        category: input.category ?? null,
        tags: input.tags ?? [],
        is_published: input.isPublished ?? false,
        position: input.position ?? 0,
        created_by: user.id,
        updated_by: user.id,
      })
      .select(`
        id,
        faq_key,
        tenant_id,
        question,
        answer_markdown,
        category,
        tags,
        position,
        is_published,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at
      `)
      .single()
    
    if (insertError) {
      console.error('createFAQEntry error:', insertError)
      return { success: false, error: 'Kunde inte skapa FAQ' }
    }
    
    return {
      success: true,
      data: {
        id: data.id,
        faq_key: data.faq_key,
        tenant_id: data.tenant_id,
        question: data.question,
        answer_markdown: data.answer_markdown,
        category: data.category,
        tags: (data.tags as string[]) ?? [],
        position: data.position,
        is_published: data.is_published,
        view_count: data.view_count,
        helpful_count: data.helpful_count,
        not_helpful_count: data.not_helpful_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    }
  } catch (err) {
    console.error('createFAQEntry error:', err)
    return { success: false, error: 'Kunde inte skapa FAQ' }
  }
}

// ============================================================================
// ADMIN: UPDATE FAQ
// ============================================================================

export async function updateFAQEntry(input: UpdateFAQInput): Promise<{ success: boolean; data?: FAQEntry; error?: string }> {
  // First get the FAQ to check tenant
  const existingResult = await getFAQEntry(input.id)
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: 'FAQ hittades inte' }
  }
  
  const { user, isSystem, error } = await assertAdminAccess(existingResult.data.tenant_id)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem ? await createServiceRoleClient() : await createServerRlsClient()
    
    const updateData: Record<string, unknown> = {
      updated_by: user.id,
    }
    
    if (input.question !== undefined) updateData.question = input.question
    if (input.answerMarkdown !== undefined) updateData.answer_markdown = input.answerMarkdown
    if (input.category !== undefined) updateData.category = input.category
    if (input.tags !== undefined) updateData.tags = input.tags
    if (input.isPublished !== undefined) updateData.is_published = input.isPublished
    if (input.position !== undefined) updateData.position = input.position
    
    const { data, error: updateError } = await supabase
      .from('support_faq_entries')
      .update(updateData)
      .eq('id', input.id)
      .select(`
        id,
        faq_key,
        tenant_id,
        question,
        answer_markdown,
        category,
        tags,
        position,
        is_published,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at
      `)
      .single()
    
    if (updateError) {
      console.error('updateFAQEntry error:', updateError)
      return { success: false, error: 'Kunde inte uppdatera FAQ' }
    }
    
    return {
      success: true,
      data: {
        id: data.id,
        faq_key: data.faq_key,
        tenant_id: data.tenant_id,
        question: data.question,
        answer_markdown: data.answer_markdown,
        category: data.category,
        tags: (data.tags as string[]) ?? [],
        position: data.position,
        is_published: data.is_published,
        view_count: data.view_count,
        helpful_count: data.helpful_count,
        not_helpful_count: data.not_helpful_count,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
    }
  } catch (err) {
    console.error('updateFAQEntry error:', err)
    return { success: false, error: 'Kunde inte uppdatera FAQ' }
  }
}

// ============================================================================
// ADMIN: DELETE FAQ
// ============================================================================

export async function deleteFAQEntry(id: string): Promise<{ success: boolean; error?: string }> {
  // First get the FAQ to check tenant
  const existingResult = await getFAQEntry(id)
  if (!existingResult.success || !existingResult.data) {
    return { success: false, error: 'FAQ hittades inte' }
  }
  
  const { isSystem, error } = await assertAdminAccess(existingResult.data.tenant_id)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem ? await createServiceRoleClient() : await createServerRlsClient()
    
    const { error: deleteError } = await supabase
      .from('support_faq_entries')
      .delete()
      .eq('id', id)
    
    if (deleteError) {
      console.error('deleteFAQEntry error:', deleteError)
      return { success: false, error: 'Kunde inte ta bort FAQ' }
    }
    
    return { success: true }
  } catch (err) {
    console.error('deleteFAQEntry error:', err)
    return { success: false, error: 'Kunde inte ta bort FAQ' }
  }
}

// ============================================================================
// USER: GET PUBLISHED FAQs (for /app/support)
// ============================================================================

export async function getPublishedFAQs(params?: {
  category?: string
  search?: string
  limit?: number
}): Promise<{ success: boolean; data?: FAQEntry[]; error?: string }> {
  try {
    const supabase = await createServerRlsClient()
    
    let query = supabase
      .from('support_faq_entries')
      .select(`
        id,
        faq_key,
        tenant_id,
        question,
        answer_markdown,
        category,
        tags,
        position,
        is_published,
        view_count,
        helpful_count,
        not_helpful_count,
        created_at,
        updated_at
      `)
      .eq('is_published', true)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(params?.limit ?? 50)
    
    if (params?.category) {
      query = query.eq('category', params.category)
    }
    
    if (params?.search) {
      query = query.ilike('question', `%${params.search}%`)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('getPublishedFAQs error:', queryError)
      return { success: false, error: 'Kunde inte hämta FAQ' }
    }
    
    const entries: FAQEntry[] = (data ?? []).map((row) => ({
      id: row.id,
      faq_key: row.faq_key,
      tenant_id: row.tenant_id,
      question: row.question,
      answer_markdown: row.answer_markdown,
      category: row.category,
      tags: (row.tags as string[]) ?? [],
      position: row.position,
      is_published: row.is_published,
      view_count: row.view_count,
      helpful_count: row.helpful_count,
      not_helpful_count: row.not_helpful_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
    
    return { success: true, data: entries }
  } catch (err) {
    console.error('getPublishedFAQs error:', err)
    return { success: false, error: 'Kunde inte hämta FAQ' }
  }
}

// ============================================================================
// USER: TRACK FAQ FEEDBACK
// ============================================================================

export async function trackFAQHelpful(params: {
  id: string
  helpful: boolean
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServerRlsClient()
    
    // Increment the appropriate counter
    const column = params.helpful ? 'helpful_count' : 'not_helpful_count'
    
    // Get current value and increment
    const { data: current } = await supabase
      .from('support_faq_entries')
      .select(column)
      .eq('id', params.id)
      .single()
    
    if (current) {
      const newValue = ((current as Record<string, number>)[column] ?? 0) + 1
      await supabase
        .from('support_faq_entries')
        .update({ [column]: newValue })
        .eq('id', params.id)
    }
    
    return { success: true }
  } catch (err) {
    console.error('trackFAQHelpful error:', err)
    return { success: false, error: 'Kunde inte registrera feedback' }
  }
}

// ============================================================================
// ADMIN: LIST FAQ CATEGORIES
// ============================================================================

export async function listFAQCategories(params: {
  tenantId?: string
}): Promise<{ success: boolean; data?: string[]; error?: string }> {
  try {
    const supabase = await createServerRlsClient()
    
    let query = supabase
      .from('support_faq_entries')
      .select('category')
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listFAQCategories error:', queryError)
      return { success: false, error: 'Kunde inte hämta kategorier' }
    }
    
    // Extract unique categories
    const categories = [...new Set(
      (data ?? [])
        .map((row) => row.category)
        .filter((c): c is string => c !== null)
    )].sort()
    
    return { success: true, data: categories }
  } catch (err) {
    console.error('listFAQCategories error:', err)
    return { success: false, error: 'Kunde inte hämta kategorier' }
  }
}
