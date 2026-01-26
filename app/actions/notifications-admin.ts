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
    
    // Build notification base
    const notificationBase = {
      title: params.title.trim(),
      message: params.message.trim(),
      type: params.type || 'info',
      category: params.category || 'system',
      action_url: params.actionUrl || null,
      action_label: params.actionLabel || null,
    }
    
    let sentCount = 0
    
    switch (params.scope) {
      case 'global': {
        // Global broadcast: Create one notification per tenant with user_id = NULL
        // This way all members of each tenant can see it via RLS
        const { data: tenants, error: tenantError } = await supabase
          .from('tenants')
          .select('id')
        
        if (tenantError) {
          console.error('sendAdminNotification global tenant fetch error:', tenantError)
          return { success: false, error: 'Kunde inte hämta organisationer' }
        }
        
        if (!tenants || tenants.length === 0) {
          return { success: false, error: 'Inga organisationer hittades' }
        }
        
        // Insert one broadcast notification per tenant
        const notifications = tenants.map((t) => ({
          ...notificationBase,
          tenant_id: t.id,
          user_id: null, // NULL = broadcast to all in tenant
        }))
        
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
        
        if (insertError) {
          console.error('sendAdminNotification global insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikationer' }
        }
        
        sentCount = tenants.length
        break
      }
      
      case 'tenant': {
        // Tenant broadcast: One notification with user_id = NULL
        const { error: insertError } = await supabase
          .from('notifications')
          .insert({
            ...notificationBase,
            tenant_id: params.tenantId!,
            user_id: null, // NULL = broadcast to all in tenant
          })
        
        if (insertError) {
          console.error('sendAdminNotification tenant insert error:', insertError)
          return { success: false, error: 'Kunde inte skicka notifikation' }
        }
        
        sentCount = 1
        break
      }
      
      case 'users': {
        // Specific users: One notification per user
        const notifications = params.userIds!.map((userId) => ({
          ...notificationBase,
          tenant_id: params.tenantId!,
          user_id: userId,
        }))
        
        const { error: insertError } = await supabase
          .from('notifications')
          .insert(notifications)
        
        if (insertError) {
          console.error('sendAdminNotification users insert error:', insertError)
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
