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
    
    // Map scope to database scope ('all' for global, 'tenant' for tenant/users)
    const dbScope = validParams.scope === 'global' ? 'all' : 'tenant'
    
    // --- Best-effort duplicate check (Block B.3) ---
    // Scoped to same admin user + tenant + scope to avoid cross-tenant false positives
    const dedupCutoff = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString()
    let dedupQuery = (supabase
      .from('notifications') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
      .select('id')
      .eq('title', validParams.title)
      .eq('message', validParams.message)
      .eq('scope', dbScope)
      .eq('created_by', user.id)
      .gte('created_at', dedupCutoff)
    
    // Scope dedup to the same tenant (or NULL for global)
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
    
    // Build notification base
    // Note: Using type assertion due to generated types not having new columns yet
    // scheduleAt is not accepted — UI has no schedule field; scheduled sends are unsupported
    const notificationBase = {
      title: validParams.title,
      message: validParams.message,
      type: validParams.type || 'info',
      category: validParams.category || 'system',
      action_url: validParams.actionUrl || null,
      action_label: validParams.actionLabel || null,
      scope: dbScope,
      status: 'sent',
      schedule_at: null,
      sent_at: new Date().toISOString(),
      created_by: user.id,
    } as Record<string, unknown>
    
    let sentCount = 0
    
    // For 'users' scope, we need to create individual deliveries
    // For 'tenant' and 'global', we create notification(s) and then generate deliveries
    
    switch (validParams.scope) {
      case 'global': {
        // Global broadcast: Create one notification with scope='all', tenant_id=NULL
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .insert({
            ...notificationBase,
            tenant_id: null,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }
        
        if (insertError || !notification) {
          console.error('sendAdminNotification global insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        // Generate deliveries immediately for all users
        // Optionally exclude demo users (default: true)
        const excludeDemo = validParams.excludeDemoUsers !== false
          
          const usersQuery = supabase.from('users').select('id, is_demo_user')
          const { data: allUsers, error: usersError } = await usersQuery
          
          if (usersError) {
            console.error('sendAdminNotification fetch users error:', usersError)
            return { success: false, error: 'Kunde inte hämta användare' }
          }
          
          // Filter out demo users if excludeDemo is true
          const filteredUsers = excludeDemo
            ? (allUsers || []).filter((u) => !u.is_demo_user)
            : allUsers || []
          
          if (filteredUsers.length > 0) {
            const deliveries = filteredUsers.map((u) => ({
              notification_id: notification.id,
              user_id: u.id,
              delivered_at: new Date().toISOString(),
            }))
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: deliveryError } = await (supabase as any)
              .from('notification_deliveries')
              .insert(deliveries)
            
            if (deliveryError) {
              console.error('sendAdminNotification delivery insert error:', deliveryError)
              // Don't fail completely, notification is created
            }
            
            sentCount = filteredUsers.length
          }
        break
      }
      
      case 'tenant': {
        // Tenant broadcast: One notification for the tenant
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .insert({
            ...notificationBase,
            tenant_id: validParams.tenantId!,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }
        
        if (insertError || !notification) {
          console.error('sendAdminNotification tenant insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        // Generate deliveries for all users in tenant
        // Optionally exclude demo users (default: true)
        const excludeDemo = validParams.excludeDemoUsers !== false
          
          const { data: members, error: membersError } = await supabase
            .from('user_tenant_memberships')
            .select('user_id, users:user_id (is_demo_user)')
            .eq('tenant_id', validParams.tenantId!)
          
          if (membersError) {
            console.error('sendAdminNotification fetch members error:', membersError)
            return { success: false, error: 'Kunde inte hämta medlemmar' }
          }
          
          // Filter out demo users if excludeDemo is true
          const filteredMembers = excludeDemo
            ? (members || []).filter((m) => {
                const userInfo = m.users as { is_demo_user: boolean | null } | null
                return !userInfo?.is_demo_user
              })
            : members || []
          
          if (filteredMembers.length > 0) {
            const deliveries = filteredMembers.map((m) => ({
              notification_id: notification.id,
              user_id: m.user_id,
              delivered_at: new Date().toISOString(),
            }))
            
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: deliveryError } = await (supabase as any)
              .from('notification_deliveries')
              .insert(deliveries)
            
            if (deliveryError) {
              console.error('sendAdminNotification delivery insert error:', deliveryError)
            }
            
            sentCount = filteredMembers.length
          }
        break
      }
      
      case 'users': {
        // Specific users: Create notification and deliveries only for selected users
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any) // eslint-disable-line @typescript-eslint/no-explicit-any
          .insert({
            ...notificationBase,
            tenant_id: validParams.tenantId!,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }
        
        if (insertError || !notification) {
          console.error('sendAdminNotification users insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        // Create deliveries for selected users
        const now = new Date().toISOString()
        const deliveries = validParams.userIds!.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
          delivered_at: now,
        }))
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deliveryError } = await (supabase as any)
          .from('notification_deliveries')
          .insert(deliveries)
        
        if (deliveryError) {
          console.error('sendAdminNotification user delivery insert error:', deliveryError)
          return { success: false, error: 'Kunde inte skicka notifikationer' }
        }
        
        sentCount = validParams.userIds!.length
        break
      }
    }
    
    return { success: true, sentCount }
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
