'use server'

import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'

// ============================================================================
// TYPES
// ============================================================================

export interface UserNotification {
  id: string
  tenant_id: string
  user_id: string | null
  title: string
  message: string
  type: string
  category: string | null
  related_entity_id: string | null
  related_entity_type: string | null
  action_url: string | null
  action_label: string | null
  is_read: boolean
  read_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
}

// ============================================================================
// USER: GET NOTIFICATIONS
// ============================================================================

export async function getUserNotifications(params?: {
  limit?: number
  offset?: number
  unreadOnly?: boolean
}): Promise<{ success: boolean; data?: UserNotification[]; total?: number; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    // Get user's tenant memberships for broadcast notifications
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
    
    const tenantIds = (memberships ?? []).map((m) => m.tenant_id).filter(Boolean)
    
    // Build query to get both personal AND broadcast notifications
    // Personal: user_id = current user
    // Broadcast: user_id IS NULL AND tenant_id in user's tenants
    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .or(`user_id.eq.${user.id}${tenantIds.length > 0 ? `,and(user_id.is.null,tenant_id.in.(${tenantIds.join(',')}))` : ''}`)
      .order('created_at', { ascending: false })
    
    // Note: unreadOnly filter is handled after we merge with read_status
    
    const limit = params?.limit ?? 50
    const offset = params?.offset ?? 0
    query = query.range(offset, offset + limit - 1)
    
    const { data, count, error: queryError } = await query
    
    if (queryError) {
      console.error('getUserNotifications error:', queryError)
      return { success: false, error: 'Kunde inte hämta notifikationer' }
    }
    
    // Get read status for broadcast notifications
    const broadcastNotificationIds = (data ?? [])
      .filter((n) => n.user_id === null)
      .map((n) => n.id)
    
    let readStatusMap = new Map<string, boolean>()
    
    if (broadcastNotificationIds.length > 0) {
      const { data: readStatuses } = await supabase
        .from('notification_read_status')
        .select('notification_id')
        .eq('user_id', user.id)
        .in('notification_id', broadcastNotificationIds)
      
      readStatuses?.forEach((rs) => {
        readStatusMap.set(rs.notification_id, true)
      })
    }
    
    // Map notifications with correct is_read status
    let notifications: UserNotification[] = (data ?? []).map((n) => {
      // For broadcast notifications, check the read_status table
      const isRead = n.user_id === null 
        ? readStatusMap.has(n.id)
        : n.is_read ?? false
      
      return {
        ...n,
        is_read: isRead,
        tenant_id: n.tenant_id ?? '',
        created_at: n.created_at ?? new Date().toISOString(),
        updated_at: n.updated_at ?? new Date().toISOString(),
      }
    })
    
    // Apply unreadOnly filter after merging
    if (params?.unreadOnly) {
      notifications = notifications.filter((n) => !n.is_read)
    }
    
    return { success: true, data: notifications, total: count ?? 0 }
  } catch (err) {
    console.error('getUserNotifications error:', err)
    return { success: false, error: 'Kunde inte hämta notifikationer' }
  }
}

// ============================================================================
// USER: GET UNREAD COUNT
// ============================================================================

export async function getUnreadNotificationCount(): Promise<{ success: boolean; count?: number; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    // Get user's tenant memberships for broadcast notifications
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
    
    const tenantIds = (memberships ?? []).map((m) => m.tenant_id).filter(Boolean)
    
    // Count personal unread notifications
    const { count: personalCount, error: personalError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (personalError) {
      console.error('getUnreadNotificationCount personal error:', personalError)
      return { success: false, error: 'Kunde inte hämta antal' }
    }
    
    // Count broadcast unread notifications (not in read_status table)
    let broadcastUnreadCount = 0
    
    if (tenantIds.length > 0) {
      // Get all broadcast notifications for user's tenants
      const { data: broadcastNotifs } = await supabase
        .from('notifications')
        .select('id')
        .is('user_id', null)
        .in('tenant_id', tenantIds)
      
      const broadcastIds = (broadcastNotifs ?? []).map((n) => n.id)
      
      if (broadcastIds.length > 0) {
        // Get which ones user has already read
        const { data: readStatuses } = await supabase
          .from('notification_read_status')
          .select('notification_id')
          .eq('user_id', user.id)
          .in('notification_id', broadcastIds)
        
        const readIds = new Set((readStatuses ?? []).map((rs) => rs.notification_id))
        broadcastUnreadCount = broadcastIds.filter((id) => !readIds.has(id)).length
      }
    }
    
    return { success: true, count: (personalCount ?? 0) + broadcastUnreadCount }
  } catch (err) {
    console.error('getUnreadNotificationCount error:', err)
    return { success: false, error: 'Kunde inte hämta antal' }
  }
}

// ============================================================================
// USER: MARK AS READ
// ============================================================================

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    // First check if this is a personal or broadcast notification
    const { data: notification, error: fetchError } = await supabase
      .from('notifications')
      .select('id, user_id')
      .eq('id', notificationId)
      .single()
    
    if (fetchError || !notification) {
      return { success: false, error: 'Notifikation hittades inte' }
    }
    
    if (notification.user_id === user.id) {
      // Personal notification - update is_read directly
      const { error: updateError } = await supabase
        .from('notifications')
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', notificationId)
        .eq('user_id', user.id)
      
      if (updateError) {
        console.error('markNotificationAsRead error:', updateError)
        return { success: false, error: 'Kunde inte markera som läst' }
      }
    } else {
      // Broadcast notification (user_id is NULL) - insert into read_status table
      const { error: insertError } = await supabase
        .from('notification_read_status')
        .upsert({
          notification_id: notificationId,
          user_id: user.id,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'notification_id,user_id',
        })
      
      if (insertError) {
        console.error('markNotificationAsRead (broadcast) error:', insertError)
        return { success: false, error: 'Kunde inte markera som läst' }
      }
    }
    
    return { success: true }
  } catch (err) {
    console.error('markNotificationAsRead error:', err)
    return { success: false, error: 'Kunde inte markera som läst' }
  }
}

// ============================================================================
// USER: MARK ALL AS READ
// ============================================================================

export async function markAllNotificationsAsRead(): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    // 1. Mark personal notifications as read
    const { error: updateError } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (updateError) {
      console.error('markAllNotificationsAsRead personal error:', updateError)
    }
    
    // 2. Get user's tenant memberships for broadcast notifications
    const { data: memberships } = await supabase
      .from('user_tenant_memberships')
      .select('tenant_id')
      .eq('user_id', user.id)
    
    const tenantIds = (memberships ?? []).map((m) => m.tenant_id).filter(Boolean)
    
    if (tenantIds.length > 0) {
      // 3. Get unread broadcast notifications (user_id IS NULL) for user's tenants
      const { data: broadcastNotifications } = await supabase
        .from('notifications')
        .select('id')
        .is('user_id', null)
        .in('tenant_id', tenantIds)
      
      if (broadcastNotifications && broadcastNotifications.length > 0) {
        // 4. Get already read broadcast notification IDs
        const { data: alreadyRead } = await supabase
          .from('notification_read_status')
          .select('notification_id')
          .eq('user_id', user.id)
          .in('notification_id', broadcastNotifications.map((n) => n.id))
        
        const alreadyReadIds = new Set((alreadyRead ?? []).map((r) => r.notification_id))
        
        // 5. Insert read status for unread broadcast notifications
        const toInsert = broadcastNotifications
          .filter((n) => !alreadyReadIds.has(n.id))
          .map((n) => ({
            notification_id: n.id,
            user_id: user.id,
            read_at: new Date().toISOString(),
          }))
        
        if (toInsert.length > 0) {
          const { error: insertError } = await supabase
            .from('notification_read_status')
            .insert(toInsert)
          
          if (insertError) {
            console.error('markAllNotificationsAsRead broadcast error:', insertError)
          }
        }
      }
    }
    
    return { success: true }
  } catch (err) {
    console.error('markAllNotificationsAsRead error:', err)
    return { success: false, error: 'Kunde inte markera som läst' }
  }
}

// ============================================================================
// USER: DELETE NOTIFICATION
// ============================================================================

export async function deleteNotification(notificationId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    const { error: deleteError } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id)
    
    if (deleteError) {
      console.error('deleteNotification error:', deleteError)
      return { success: false, error: 'Kunde inte ta bort notifikation' }
    }
    
    return { success: true }
  } catch (err) {
    console.error('deleteNotification error:', err)
    return { success: false, error: 'Kunde inte ta bort notifikation' }
  }
}

// ============================================================================
// INTERNAL: CREATE NOTIFICATION (for ticket events)
// ============================================================================

export async function createTicketNotification(params: {
  userId: string
  tenantId: string
  ticketId: string
  ticketTitle: string
  eventType: 'admin_reply' | 'status_change' | 'ticket_created'
  newStatus?: string
  messageId?: string // For admin_reply deduplication
}): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
  try {
    const supabase = await createServiceRoleClient()
    
    // Generate idempotency key to prevent duplicate notifications
    // Format: ticket:{id}:{event}:{detail}:{date}
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    let eventKey: string
    
    switch (params.eventType) {
      case 'admin_reply':
        // Use messageId for exact deduplication, or date for daily limit
        eventKey = params.messageId 
          ? `ticket:${params.ticketId}:reply:${params.messageId}`
          : `ticket:${params.ticketId}:reply:${today}`
        break
      case 'status_change':
        eventKey = `ticket:${params.ticketId}:status:${params.newStatus}:${today}`
        break
      case 'ticket_created':
        eventKey = `ticket:${params.ticketId}:created`
        break
      default:
        eventKey = `ticket:${params.ticketId}:update:${today}`
    }
    
    let title: string
    let message: string
    let type = 'info'
    
    switch (params.eventType) {
      case 'admin_reply':
        title = 'Nytt svar på ditt ärende'
        message = `Du har fått ett svar på ärendet "${params.ticketTitle}".`
        type = 'info'
        break
      case 'status_change':
        title = 'Ärendestatus uppdaterad'
        message = `Ärendet "${params.ticketTitle}" har ändrats till ${getStatusLabel(params.newStatus ?? '')}.`
        type = params.newStatus === 'resolved' ? 'success' : 'info'
        break
      case 'ticket_created':
        title = 'Ärende mottaget'
        message = `Vi har mottagit ditt ärende "${params.ticketTitle}" och återkommer så snart vi kan.`
        type = 'success'
        break
      default:
        title = 'Uppdatering på ärende'
        message = `Det har skett en uppdatering på ärendet "${params.ticketTitle}".`
    }
    
    const { error: insertError } = await supabase
      .from('notifications')
      .insert({
        tenant_id: params.tenantId,
        user_id: params.userId,
        title,
        message,
        type,
        category: 'support',
        related_entity_id: params.ticketId,
        related_entity_type: 'ticket',
        action_url: `/app/support/tickets/${params.ticketId}`,
        action_label: 'Visa ärende',
        event_key: eventKey, // Idempotency key for deduplication
      })
    
    if (insertError) {
      // Check if it's a duplicate key error (unique constraint violation)
      if (insertError.code === '23505' && insertError.message?.includes('event_key')) {
        // Duplicate notification - this is expected and OK
        console.log(`Skipped duplicate notification: ${eventKey}`)
        return { success: true, skipped: true }
      }
      console.error('createTicketNotification error:', insertError)
      return { success: false, error: 'Kunde inte skapa notifikation' }
    }
    
    // Log the notification delivery
    // Note: notification_log expects a notification_id, but we don't have it
    // For now, skip logging - can be enhanced later
    
    return { success: true }
  } catch (err) {
    console.error('createTicketNotification error:', err)
    return { success: false, error: 'Kunde inte skapa notifikation' }
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'open':
      return 'Öppen'
    case 'in_progress':
      return 'Pågår'
    case 'waiting_for_user':
      return 'Väntar på svar'
    case 'resolved':
      return 'Löst'
    case 'closed':
      return 'Stängd'
    default:
      return status
  }
}

// ============================================================================
// USER: GET NOTIFICATION PREFERENCES
// ============================================================================

export interface NotificationPreferences {
  email_enabled: boolean
  push_enabled: boolean
  in_app_enabled: boolean
  support_notifications: boolean
  achievement_notifications: boolean
  system_notifications: boolean
  digest_frequency: string
}

export async function getNotificationPreferences(): Promise<{ success: boolean; data?: NotificationPreferences; error?: string }> {
  const supabase = await createServerRlsClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { success: false, error: 'Ej inloggad' }
  }
  
  try {
    const { data, error: queryError } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    
    if (queryError) {
      console.error('getNotificationPreferences error:', queryError)
      return { success: false, error: 'Kunde inte hämta inställningar' }
    }
    
    // Return defaults if no preferences exist
    if (!data) {
      return {
        success: true,
        data: {
          email_enabled: true,
          push_enabled: true,
          in_app_enabled: true,
          support_notifications: true,
          achievement_notifications: true,
          system_notifications: true,
          digest_frequency: 'realtime',
        },
      }
    }
    
    return {
      success: true,
      data: {
        email_enabled: data.email_enabled ?? true,
        push_enabled: data.push_enabled ?? true,
        in_app_enabled: data.in_app_enabled ?? true,
        support_notifications: data.support_notifications ?? true,
        achievement_notifications: data.achievement_notifications ?? true,
        system_notifications: data.system_notifications ?? true,
        digest_frequency: data.digest_frequency ?? 'realtime',
      },
    }
  } catch (err) {
    console.error('getNotificationPreferences error:', err)
    return { success: false, error: 'Kunde inte hämta inställningar' }
  }
}
