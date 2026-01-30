'use server'

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
  /** Schedule for later (ISO string). If omitted, sends immediately. */
  scheduleAt?: string
}

export interface SendNotificationResult {
  success: boolean
  sentCount?: number
  error?: string
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
  
  // Validate params
  if (!params.title?.trim() || !params.message?.trim()) {
    return { success: false, error: 'Titel och meddelande krävs' }
  }
  
  // Global broadcast requires System Admin
  if (params.scope === 'global' && !isSystem) {
    return { success: false, error: 'Endast systemadministratörer kan skicka globala notifikationer' }
  }
  
  // Tenant/users scope requires tenantId
  if ((params.scope === 'tenant' || params.scope === 'users') && !params.tenantId) {
    return { success: false, error: 'Organisation måste anges' }
  }
  
  // Users scope requires userIds
  if (params.scope === 'users' && (!params.userIds || params.userIds.length === 0)) {
    return { success: false, error: 'Minst en användare måste väljas' }
  }
  
  // Check tenant access for non-system admins
  if (!isSystem && params.tenantId) {
    const hasAccess = await isTenantAdmin(params.tenantId, user.id)
    if (!hasAccess) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' }
    }
  }
  
  try {
    const supabase = await createServiceRoleClient()
    
    // Determine if this is scheduled or immediate send
    const isScheduled = !!params.scheduleAt
    const scheduleAt = params.scheduleAt ? new Date(params.scheduleAt) : null
    
    // Map scope to database scope ('all' for global, 'tenant' for tenant/users)
    const dbScope = params.scope === 'global' ? 'all' : 'tenant'
    
    // Build notification base with new scheduling fields
    // Note: Using type assertion due to generated types not having new columns yet
    const notificationBase = {
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type || 'info',
      category: params.category || 'system',
      action_url: params.actionUrl || null,
      action_label: params.actionLabel || null,
      scope: dbScope,
      status: isScheduled ? 'scheduled' : 'sent',
      schedule_at: scheduleAt?.toISOString() ?? null,
      sent_at: isScheduled ? null : new Date().toISOString(),
      created_by: user.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as Record<string, unknown>
    
    let sentCount = 0
    
    // For 'users' scope, we need to create individual deliveries
    // For 'tenant' and 'global', we create notification(s) and then generate deliveries
    
    switch (params.scope) {
      case 'global': {
        // Global broadcast: Create one notification with scope='all', tenant_id=NULL
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any)
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
        
        if (!isScheduled) {
          // Generate deliveries immediately for all users
          const { data: allUsers, error: usersError } = await supabase
            .from('users')
            .select('id')
          
          if (usersError) {
            console.error('sendAdminNotification fetch users error:', usersError)
            return { success: false, error: 'Kunde inte hämta användare' }
          }
          
          if (allUsers && allUsers.length > 0) {
            const deliveries = allUsers.map((u) => ({
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
            
            sentCount = allUsers.length
          }
        } else {
          sentCount = 1 // Scheduled
        }
        break
      }
      
      case 'tenant': {
        // Tenant broadcast: One notification for the tenant
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any)
          .insert({
            ...notificationBase,
            tenant_id: params.tenantId!,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }
        
        if (insertError || !notification) {
          console.error('sendAdminNotification tenant insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        if (!isScheduled) {
          // Generate deliveries for all users in tenant
          const { data: members, error: membersError } = await supabase
            .from('user_tenant_memberships')
            .select('user_id')
            .eq('tenant_id', params.tenantId!)
          
          if (membersError) {
            console.error('sendAdminNotification fetch members error:', membersError)
            return { success: false, error: 'Kunde inte hämta medlemmar' }
          }
          
          if (members && members.length > 0) {
            const deliveries = members.map((m) => ({
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
            
            sentCount = members.length
          }
        } else {
          sentCount = 1 // Scheduled
        }
        break
      }
      
      case 'users': {
        // Specific users: Create notification and deliveries only for selected users
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: notification, error: insertError } = await (supabase
          .from('notifications') as any)
          .insert({
            ...notificationBase,
            tenant_id: params.tenantId!,
          })
          .select('id')
          .single() as { data: { id: string } | null; error: Error | null }
        
        if (insertError || !notification) {
          console.error('sendAdminNotification users insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        // Always create deliveries for specific users (even if scheduled)
        const deliveries = params.userIds!.map((userId) => ({
          notification_id: notification.id,
          user_id: userId,
          delivered_at: isScheduled ? null : new Date().toISOString(),
        }))
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: deliveryError } = await (supabase as any)
          .from('notification_deliveries')
          .insert(deliveries)
        
        if (deliveryError) {
          console.error('sendAdminNotification user delivery insert error:', deliveryError)
          return { success: false, error: 'Kunde inte skicka notifikationer' }
        }
        
        sentCount = params.userIds!.length
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
