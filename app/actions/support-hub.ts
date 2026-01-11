'use server'

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

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

async function assertAdminAccess(tenantId?: string): Promise<{
  user: AdminUser['user']
  isSystem: boolean
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  if (error) return { user, isSystem, error }
  
  // System admin has full access
  if (isSystem) return { user, isSystem }
  
  // Tenant admin needs specific tenant
  if (tenantId) {
    const hasTenantAccess = await isTenantAdmin(tenantId, user.id)
    if (!hasTenantAccess) {
      return { user, isSystem, error: 'Ingen åtkomst till denna organisation' }
    }
    return { user, isSystem }
  }
  
  // No tenant specified, check if user is admin of any tenant
  const supabase = await createServerRlsClient()
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
  
  if (!memberships || memberships.length === 0) {
    return { user, isSystem, error: 'Ingen admin-åtkomst' }
  }
  
  return { user, isSystem }
}

// ============================================================================
// HUB STATS
// ============================================================================

export interface SupportHubStats {
  total_open: number
  in_progress: number
  waiting_for_user: number
  resolved_last_30d: number
  urgent_count: number
  unread_feedback: number
  open_bugs: number
  avg_first_response_hours: number | null
}

export async function getSupportHubStats(params: {
  tenantId?: string
}): Promise<{ success: boolean; data?: SupportHubStats; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    // Use service role for system admin cross-tenant, RLS for tenant admin
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    // Build base query conditions
    const tenantFilter = params.tenantId ? { tenant_id: params.tenantId } : {}
    
    // Count open tickets
    const { count: totalOpen } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .match(tenantFilter)
    
    // Count in_progress tickets
    const { count: inProgress } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'in_progress')
      .match(tenantFilter)
    
    // Count waiting_for_user tickets
    const { count: waitingForUser } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'waiting_for_user')
      .match(tenantFilter)
    
    // Count urgent tickets
    const { count: urgentCount } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('priority', 'urgent')
      .in('status', ['open', 'in_progress', 'waiting_for_user'])
      .match(tenantFilter)
    
    // Count resolved in last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    const { count: resolvedLast30d } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'resolved')
      .gte('resolved_at', thirtyDaysAgo.toISOString())
      .match(tenantFilter)
    
    // Count unread feedback (status = 'received')
    const { count: unreadFeedback } = await supabase
      .from('feedback')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'received')
      .match(tenantFilter)
    
    // Count open bugs
    const { count: openBugs } = await supabase
      .from('bug_reports')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false)
      .match(tenantFilter)
    
    return {
      success: true,
      data: {
        total_open: totalOpen ?? 0,
        in_progress: inProgress ?? 0,
        waiting_for_user: waitingForUser ?? 0,
        resolved_last_30d: resolvedLast30d ?? 0,
        urgent_count: urgentCount ?? 0,
        unread_feedback: unreadFeedback ?? 0,
        open_bugs: openBugs ?? 0,
        avg_first_response_hours: null, // Would require more complex query
      },
    }
  } catch (err) {
    console.error('getSupportHubStats error:', err)
    return { success: false, error: 'Kunde inte hämta statistik' }
  }
}

// ============================================================================
// MY ASSIGNED TICKETS
// ============================================================================

export interface AssignedTicket {
  id: string
  ticket_key: string | null
  title: string
  status: string
  priority: string
  created_at: string
  tenant_name?: string
}

export async function listMyAssignedTickets(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: AssignedTicket[]; error?: string }> {
  const { user, isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        ticket_key,
        title,
        status,
        priority,
        created_at,
        tenants:tenant_id (name)
      `)
      .eq('assigned_to_user_id', user.id)
      .in('status', ['open', 'in_progress', 'waiting_for_user'])
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 10)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listMyAssignedTickets error:', queryError)
      return { success: false, error: 'Kunde inte hämta tilldelade ärenden' }
    }
    
    const tickets: AssignedTicket[] = (data ?? []).map((row) => ({
      id: row.id,
      ticket_key: row.ticket_key,
      title: row.title,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      tenant_name: (row.tenants as { name?: string } | null)?.name,
    }))
    
    return { success: true, data: tickets }
  } catch (err) {
    console.error('listMyAssignedTickets error:', err)
    return { success: false, error: 'Kunde inte hämta tilldelade ärenden' }
  }
}

// ============================================================================
// RECENT TICKETS
// ============================================================================

export interface RecentTicket {
  id: string
  ticket_key: string | null
  title: string
  status: string
  priority: string
  created_at: string
  user_email?: string
  tenant_name?: string
}

export async function listRecentTickets(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: RecentTicket[]; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        ticket_key,
        title,
        status,
        priority,
        created_at,
        users:user_id (email),
        tenants:tenant_id (name)
      `)
      .in('status', ['open', 'in_progress', 'waiting_for_user'])
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 10)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listRecentTickets error:', queryError)
      return { success: false, error: 'Kunde inte hämta senaste ärenden' }
    }
    
    const tickets: RecentTicket[] = (data ?? []).map((row) => ({
      id: row.id,
      ticket_key: row.ticket_key,
      title: row.title,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      user_email: (row.users as { email?: string } | null)?.email,
      tenant_name: (row.tenants as { name?: string } | null)?.name,
    }))
    
    return { success: true, data: tickets }
  } catch (err) {
    console.error('listRecentTickets error:', err)
    return { success: false, error: 'Kunde inte hämta senaste ärenden' }
  }
}

// ============================================================================
// URGENT TICKETS
// ============================================================================

export async function listUrgentTickets(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: RecentTicket[]; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('support_tickets')
      .select(`
        id,
        ticket_key,
        title,
        status,
        priority,
        created_at,
        users:user_id (email),
        tenants:tenant_id (name)
      `)
      .eq('priority', 'urgent')
      .in('status', ['open', 'in_progress', 'waiting_for_user'])
      .order('created_at', { ascending: true }) // Oldest first for urgent
      .limit(params.limit ?? 5)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listUrgentTickets error:', queryError)
      return { success: false, error: 'Kunde inte hämta brådskande ärenden' }
    }
    
    const tickets: RecentTicket[] = (data ?? []).map((row) => ({
      id: row.id,
      ticket_key: row.ticket_key,
      title: row.title,
      status: row.status,
      priority: row.priority,
      created_at: row.created_at,
      user_email: (row.users as { email?: string } | null)?.email,
      tenant_name: (row.tenants as { name?: string } | null)?.name,
    }))
    
    return { success: true, data: tickets }
  } catch (err) {
    console.error('listUrgentTickets error:', err)
    return { success: false, error: 'Kunde inte hämta brådskande ärenden' }
  }
}

// ============================================================================
// RECENT FEEDBACK
// ============================================================================

export interface RecentFeedback {
  id: string
  title: string
  type: string
  status: string
  rating: number | null
  created_at: string
  user_email?: string
  tenant_name?: string
}

export async function listRecentFeedback(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: RecentFeedback[]; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('feedback')
      .select(`
        id,
        title,
        type,
        status,
        rating,
        created_at,
        users:user_id (email),
        tenants:tenant_id (name)
      `)
      .eq('status', 'received')
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 5)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listRecentFeedback error:', queryError)
      return { success: false, error: 'Kunde inte hämta feedback' }
    }
    
    const items: RecentFeedback[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      type: row.type,
      status: row.status,
      rating: row.rating,
      created_at: row.created_at,
      user_email: (row.users as { email?: string } | null)?.email,
      tenant_name: (row.tenants as { name?: string } | null)?.name,
    }))
    
    return { success: true, data: items }
  } catch (err) {
    console.error('listRecentFeedback error:', err)
    return { success: false, error: 'Kunde inte hämta feedback' }
  }
}

// ============================================================================
// RECENT BUG REPORTS
// ============================================================================

export interface RecentBugReport {
  id: string
  title: string
  status: string
  is_resolved: boolean
  created_at: string
  user_email?: string
  tenant_name?: string
}

export async function listRecentBugReports(params: {
  tenantId?: string
  limit?: number
}): Promise<{ success: boolean; data?: RecentBugReport[]; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('bug_reports')
      .select(`
        id,
        title,
        status,
        is_resolved,
        created_at,
        users:user_id (email),
        tenants:tenant_id (name)
      `)
      .eq('is_resolved', false)
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 5)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listRecentBugReports error:', queryError)
      return { success: false, error: 'Kunde inte hämta buggrapporter' }
    }
    
    const items: RecentBugReport[] = (data ?? []).map((row) => ({
      id: row.id,
      title: row.title,
      status: row.status,
      is_resolved: row.is_resolved,
      created_at: row.created_at,
      user_email: (row.users as { email?: string } | null)?.email,
      tenant_name: (row.tenants as { name?: string } | null)?.name,
    }))
    
    return { success: true, data: items }
  } catch (err) {
    console.error('listRecentBugReports error:', err)
    return { success: false, error: 'Kunde inte hämta buggrapporter' }
  }
}

// ============================================================================
// ACCESS CHECK (for UI)
// ============================================================================

export async function checkSupportHubAccess(): Promise<{
  hasAccess: boolean
  isSystemAdmin: boolean
  tenantIds: string[]
  error?: string
}> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return { hasAccess: false, isSystemAdmin: false, tenantIds: [], error: 'Ej inloggad' }
  }
  
  const isSystem = isSystemAdmin(user)
  
  if (isSystem) {
    return { hasAccess: true, isSystemAdmin: true, tenantIds: [] }
  }
  
  // Check tenant admin access
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
  
  if (!memberships || memberships.length === 0) {
    return { hasAccess: false, isSystemAdmin: false, tenantIds: [], error: 'Ingen admin-åtkomst' }
  }
  
  const tenantIds = memberships.map((m) => m.tenant_id)
  return { hasAccess: true, isSystemAdmin: false, tenantIds }
}

// ============================================================================
// TENANT LIST FOR FILTER
// ============================================================================

export async function listTenantsForSupportHub(): Promise<{
  success: boolean
  data?: Array<{ id: string; name: string }>
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  if (error) return { success: false, error }
  
  try {
    if (isSystem) {
      // System admin sees all tenants
      const supabase = await createServiceRoleClient()
      const { data, error: queryError } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name')
        .limit(100)
      
      if (queryError) {
        return { success: false, error: 'Kunde inte hämta organisationer' }
      }
      
      return { success: true, data: data ?? [] }
    } else {
      // Tenant admin sees only their tenants
      const supabase = await createServerRlsClient()
      const { data: memberships } = await supabase
        .from('user_tenant_memberships')
        .select('tenant_id, tenants:tenant_id (id, name)')
        .eq('user_id', user.id)
        .in('role', ['owner', 'admin'])
      
      const tenants = (memberships ?? [])
        .map((m) => m.tenants as { id: string; name: string } | null)
        .filter((t): t is { id: string; name: string } => t !== null)
      
      return { success: true, data: tenants }
    }
  } catch (err) {
    console.error('listTenantsForSupportHub error:', err)
    return { success: false, error: 'Kunde inte hämta organisationer' }
  }
}

// ============================================================================
// NOTIFICATION HISTORY (for admin troubleshooting)
// ============================================================================

export interface NotificationHistoryItem {
  id: string
  user_id: string | null
  user_email?: string | null
  tenant_id: string
  tenant_name?: string | null
  title: string
  message: string
  type: string
  category: string | null
  is_read: boolean | null
  action_url: string | null
  event_key: string | null
  created_at: string | null
}

export async function listRecentNotifications(params: {
  tenantId?: string
  limit?: number
  category?: string
}): Promise<{ success: boolean; data?: NotificationHistoryItem[]; error?: string }> {
  const { isSystem, error } = await assertAdminAccess(params.tenantId)
  if (error) return { success: false, error }
  
  try {
    const supabase = isSystem && !params.tenantId 
      ? await createServiceRoleClient() 
      : await createServerRlsClient()
    
    let query = supabase
      .from('notifications')
      .select(`
        id,
        user_id,
        tenant_id,
        title,
        message,
        type,
        category,
        is_read,
        action_url,
        event_key,
        created_at,
        users:user_id (email),
        tenants:tenant_id (name)
      `)
      .order('created_at', { ascending: false })
      .limit(params.limit ?? 100)
    
    if (params.tenantId) {
      query = query.eq('tenant_id', params.tenantId)
    }
    
    if (params.category) {
      query = query.eq('category', params.category)
    }
    
    // Only show recent (last 7 days)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    query = query.gte('created_at', sevenDaysAgo.toISOString())
    
    const { data, error: queryError } = await query
    
    if (queryError) {
      console.error('listRecentNotifications error:', queryError)
      return { success: false, error: 'Kunde inte hämta notifikationer' }
    }
    
    const items: NotificationHistoryItem[] = (data ?? []).map((row) => ({
      id: row.id,
      user_id: row.user_id,
      user_email: (row.users as { email?: string } | null)?.email ?? null,
      tenant_id: row.tenant_id,
      tenant_name: (row.tenants as { name?: string } | null)?.name ?? null,
      title: row.title,
      message: row.message,
      type: row.type,
      category: row.category,
      is_read: row.is_read,
      action_url: row.action_url,
      event_key: row.event_key,
      created_at: row.created_at,
    }))
    
    return { success: true, data: items }
  } catch (err) {
    console.error('listRecentNotifications error:', err)
    return { success: false, error: 'Kunde inte hämta notifikationer' }
  }
}
