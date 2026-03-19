'use server'

import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { isSystemAdmin, isTenantAdmin } from '@/lib/utils/tenantAuth'

// ============================================================================
// TYPES
// ============================================================================

export interface SendNotificationParams {
  /** 'global' = all users across all tenants, 'tenant' = specific tenant, 'users' = specific users */
  scope: 'global' | 'tenant' | 'users'
  /** Required when scope is 'tenant' or 'users' */
  tenantId?: string
  /** Required when scope is 'users' */
  userIds?: string[]
  /** Notification content */
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'system'
  category?: string
  actionUrl?: string
  actionLabel?: string
  /** Exclude demo users from notification. Defaults to true. */
  excludeDemoUsers?: boolean
}

export interface SendNotificationResult {
  success: boolean
  sentCount?: number
  error?: string
}

// Zod schema for input validation (Block B.1)
const SendNotificationSchema = z.object({
  scope: z.enum(['global', 'tenant', 'users']),
  tenantId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).min(1).max(500).optional(),
  title: z.string().min(1, 'Titel krävs').max(255, 'Titel får vara max 255 tecken'),
  message: z.string().min(1, 'Meddelande krävs').max(5000, 'Meddelande får vara max 5000 tecken'),
  type: z.enum(['info', 'success', 'warning', 'error', 'system']).default('info'),
  category: z.string().max(50).default('system'),
  actionUrl: z.string().url('Ogiltig URL').max(512).optional().or(z.literal('')),
  actionLabel: z.string().max(100).optional().or(z.literal('')),
  excludeDemoUsers: z.boolean().default(true),
})

// Best-effort duplicate check window (Block B.3)
const DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

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

// ============================================================================
// LIST TENANTS (for System Admin)
// ============================================================================

export async function listTenantsForNotifications(): Promise<{
  success: boolean
  data?: Array<{ id: string; name: string; memberCount?: number }>
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  if (error) return { success: false, error }
  
  try {
    if (isSystem) {
      // System admin sees all tenants with member counts
      const supabase = await createServiceRoleClient()
      const { data, error: queryError } = await supabase
        .from('tenants')
        .select('id, name')
        .order('name')
        .limit(200)
      
      if (queryError) {
        console.error('listTenantsForNotifications error:', queryError)
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
    console.error('listTenantsForNotifications error:', err)
    return { success: false, error: 'Kunde inte hämta organisationer' }
  }
}

// ============================================================================
// LIST USERS IN TENANT (for user picker)
// ============================================================================

export async function listUsersInTenant(tenantId: string): Promise<{
  success: boolean
  data?: Array<{ id: string; email: string | null }>
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  if (error) return { success: false, error }
  
  // Check access
  if (!isSystem) {
    const hasAccess = await isTenantAdmin(tenantId, user.id)
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' }
    }
  }
  
  try {
    const supabase = isSystem ? await createServiceRoleClient() : await createServerRlsClient()
    
    const { data, error: queryError } = await supabase
      .from('user_tenant_memberships')
      .select('user_id, users:user_id (id, email)')
      .eq('tenant_id', tenantId)
      .limit(500)
    
    if (queryError) {
      console.error('listUsersInTenant error:', queryError)
      return { success: false, error: 'Kunde inte hämta användare' }
    }
    
    const users = (data ?? [])
      .map((m) => {
        const u = m.users as { id: string; email: string | null } | null
        return u ? { id: u.id, email: u.email } : null
      })
      .filter((u): u is { id: string; email: string | null } => u !== null)
    
    return { success: true, data: users }
  } catch (err) {
    console.error('listUsersInTenant error:', err)
    return { success: false, error: 'Kunde inte hämta användare' }
  }
}

// ============================================================================
// SEND NOTIFICATION (main action)
// ============================================================================

export async function sendAdminNotification(params: SendNotificationParams): Promise<SendNotificationResult> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser()
  if (authError) return { success: false, error: authError }
  
  // --- Zod validation (Block B.1) ---
  const parsed = SendNotificationSchema.safeParse(params)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validering misslyckades' }
  }
  const validParams = parsed.data
  
  // Global broadcast requires System Admin
  if (validParams.scope === 'global' && !isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan skicka globala notifikationer' }
  }
  
  // Tenant/users scope requires tenantId
  if ((validParams.scope === 'tenant' || validParams.scope === 'users') && !validParams.tenantId) {
    return { success: false, error: 'Organisation måste anges' }
  }
  
  // Users scope requires userIds
  if (validParams.scope === 'users' && (!validParams.userIds || validParams.userIds.length === 0)) {
    return { success: false, error: 'Minst en användare måste väljas' }
  }
  
  // Check tenant access for non-system admins
  if (!isSystem && validParams.tenantId) {
    const hasAccess = await isTenantAdmin(validParams.tenantId, user.id)
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' }
    }
  }
  
  try {
    const supabase = await createServiceRoleClient()
    
    // --- Best-effort duplicate check (Block B.3) ---
    const dbScope = validParams.scope === 'global' ? 'all' : 'tenant'
    const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    let dedupQuery = (supabase
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('notifications') as any)
      .select('id')
      .eq('title', validParams.title)
      .eq('message', validParams.message)
      .eq('scope', dbScope)
      .eq('created_by', user.id)
      .gte('created_at', dedupCutoff)
    
    if (validParams.scope === 'global') {
      dedupQuery = dedupQuery.is('tenant_id', null)
    } else {
      dedupQuery = dedupQuery.eq('tenant_id', validParams.tenantId!)
    }
    
    const { data: recentDuplicate } = await dedupQuery
      .limit(1)
      .maybeSingle()
    
    if (recentDuplicate) {
      return { success: false, error: 'En identisk notifikation skickades nyligen. Vänta några minuter.' }
    }
    
    // --- Single atomic RPC: create master + deliveries in one transaction ---
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: result, error: rpcError } = await (supabase.rpc as any)(
      'create_notification_v1',
      {
        p_scope: validParams.scope === 'global' ? 'all' : validParams.scope,
        p_tenant_id: validParams.tenantId ?? null,
        p_user_ids: validParams.userIds ?? null,
        p_title: validParams.title,
        p_message: validParams.message,
        p_type: validParams.type || 'info',
        p_category: validParams.category || 'system',
        p_action_url: validParams.actionUrl || null,
        p_action_label: validParams.actionLabel || null,
        p_created_by: user.id,
        p_exclude_demo: validParams.excludeDemoUsers !== false,
      }
    )
    
    if (rpcError) {
      console.error('sendAdminNotification RPC error:', rpcError)
      return { success: false, error: 'Kunde inte skicka notifikation' }
    }
    
    if (!result?.success) {
      if (result?.skipped) {
        return { success: false, error: 'En identisk notifikation skickades nyligen.' }
      }
      return { success: false, error: result?.error || 'Kunde inte skicka notifikation' }
    }
    
    return { success: true, sentCount: result.delivery_count ?? 0 }
  } catch (err) {
    console.error('sendAdminNotification error:', err)
    return { success: false, error: 'Ett oväntat fel uppstod' }
  }
}

// ============================================================================
// CHECK ADMIN ACCESS (for page guard)
// ============================================================================

export async function checkNotificationAdminAccess(): Promise<{
  hasAccess: boolean
  isSystemAdmin: boolean
  error?: string
}> {
  const { user, isSystem, error } = await getCurrentAdminUser()
  
  if (error) {
    return { hasAccess: false, isSystemAdmin: false, error }
  }
  
  // System admins always have access
  if (isSystem) {
    return { hasAccess: true, isSystemAdmin: true }
  }
  
  // Check if user is admin of any tenant
  const supabase = await createServerRlsClient()
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id, role')
    .eq('user_id', user.id)
    .in('role', ['owner', 'admin'])
  
  if (!memberships || memberships.length === 0) {
    return { hasAccess: false, isSystemAdmin: false, error: 'Ingen admin-åtkomst' }
  }
  
  return { hasAccess: true, isSystemAdmin: false }
}
