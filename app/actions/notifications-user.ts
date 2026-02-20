'use server'

/**
 * Notification User Actions
 *
 * This file contains `createTicketNotification` — the only active notification
 * write function. All read/mark-as-read operations are handled exclusively via
 * the `get_user_notifications`, `mark_notification_read`, `mark_all_notifications_read`,
 * and `dismiss_notification` RPCs through the `useAppNotifications` hook.
 */

import { createServiceRoleClient } from '@/lib/supabase/server'
import { requireAuth } from '@/lib/api/auth-guard'

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
    await requireAuth()
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
    
    const { data: inserted, error: insertError } = await supabase
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
        scope: 'tenant',
        status: 'sent',
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()
    
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

    // Create delivery row so the notification shows in the app bell / page
    if (inserted?.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: deliveryError } = await (supabase as any)
        .from('notification_deliveries')
        .insert({
          notification_id: inserted.id,
          user_id: params.userId,
          delivered_at: new Date().toISOString(),
        })

      if (deliveryError) {
        console.error('createTicketNotification delivery error:', deliveryError)
        // Don't fail — the notification itself was created
      }
    }
    
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
