'use server';

/**
 * Server Actions for User Ticket Operations
 * 
 * Allows authenticated users to create and view their own support tickets.
 * Uses RLS for security - users can only see/create tickets for themselves.
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient } from '@/lib/supabase/server';

import type { Database } from '@/types/supabase';

type SupportTicketRow = Database['public']['Tables']['support_tickets']['Row'];
type TicketMessageRow = Database['public']['Tables']['ticket_messages']['Row'];
type TicketPriorityEnum = Database['public']['Enums']['ticket_priority_enum'];

// ============================================
// TYPES
// ============================================

export interface UserTicketRow extends SupportTicketRow {
  message_count?: number;
}

export interface CreateTicketInput {
  title: string;
  description: string;
  category?: string;
  priority?: TicketPriorityEnum;
  tenantId?: string | null;
  initialMessage?: string;
}

export interface CreateTicketResult {
  success: boolean;
  data?: {
    ticket: SupportTicketRow;
    message?: TicketMessageRow;
  };
  error?: string;
}

export interface ListUserTicketsResult {
  success: boolean;
  data?: UserTicketRow[];
  error?: string;
}

export interface AddUserMessageInput {
  ticketId: string;
  message: string;
}

// ============================================
// HELPER: Get current user
// ============================================

async function getCurrentUser() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, error: 'Inte inloggad' };
  }
  
  return { user, error: null };
}

// ============================================
// CREATE TICKET
// ============================================

export async function createUserTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
  const { title, description, category, priority = 'medium', tenantId, initialMessage } = input;
  
  const { user, error: authError } = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: authError || 'Du måste vara inloggad för att skicka ett ärende' };
  }

  if (!title.trim()) {
    return { success: false, error: 'Titel krävs' };
  }

  if (!description.trim()) {
    return { success: false, error: 'Beskrivning krävs' };
  }

  try {
    const supabase = await createServerRlsClient();

    // If tenantId provided, verify user is member
    if (tenantId) {
      const { data: membership } = await supabase
        .from('user_tenant_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .maybeSingle();

      if (!membership) {
        return { success: false, error: 'Du har inte tillgång till denna organisation' };
      }
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: user.id,
        tenant_id: tenantId || null,
        title: title.trim(),
        description: description.trim(),
        category: category?.trim() || null,
        priority,
        status: 'open',
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error('Error creating ticket:', ticketError);
      return { success: false, error: 'Kunde inte skapa ärende. Försök igen.' };
    }

    // Create initial message if provided
    let message: TicketMessageRow | undefined;
    const messageText = initialMessage?.trim() || description.trim();
    
    const { data: msgData, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        user_id: user.id,
        message: messageText,
        is_internal: false,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error creating initial message:', msgError);
      // Don't fail the whole operation, ticket was created
    } else {
      message = msgData;
    }

    revalidatePath('/app/support');
    return { 
      success: true, 
      data: { ticket, message } 
    };
  } catch (err) {
    console.error('Error in createUserTicket:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// LIST USER'S TICKETS
// ============================================

export async function listUserTickets(): Promise<ListUserTicketsResult> {
  const { user, error: authError } = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte inloggad' };
  }

  try {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        ticket_messages(count)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error listing user tickets:', error);
      return { success: false, error: 'Kunde inte hämta dina ärenden' };
    }

    const tickets: UserTicketRow[] = (data || []).map(t => ({
      ...t,
      message_count: Array.isArray(t.ticket_messages) 
        ? t.ticket_messages.length 
        : (t.ticket_messages as { count: number } | null)?.count ?? 0,
    }));

    return { success: true, data: tickets };
  } catch (err) {
    console.error('Error in listUserTickets:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// GET USER'S TICKET
// ============================================

export async function getUserTicket(ticketId: string): Promise<{
  success: boolean;
  data?: SupportTicketRow;
  error?: string;
}> {
  const { user, error: authError } = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte inloggad' };
  }

  try {
    const supabase = await createServerRlsClient();

    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .eq('user_id', user.id) // RLS + explicit check
      .single();

    if (error || !data) {
      return { success: false, error: 'Ärende hittades inte' };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Error in getUserTicket:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// LIST USER'S TICKET MESSAGES
// ============================================

export async function listUserTicketMessages(ticketId: string): Promise<{
  success: boolean;
  data?: TicketMessageRow[];
  error?: string;
}> {
  const { user, error: authError } = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte inloggad' };
  }

  try {
    const supabase = await createServerRlsClient();

    // Verify user owns the ticket
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (!ticket) {
      return { success: false, error: 'Ärende hittades inte' };
    }

    // Get messages (excluding internal notes for users)
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .eq('is_internal', false) // Users don't see internal notes
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error listing user ticket messages:', error);
      return { success: false, error: 'Kunde inte hämta meddelanden' };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    console.error('Error in listUserTicketMessages:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ADD USER MESSAGE
// ============================================

export async function addUserTicketMessage(input: AddUserMessageInput): Promise<{
  success: boolean;
  data?: TicketMessageRow;
  error?: string;
}> {
  const { ticketId, message } = input;
  const { user, error: authError } = await getCurrentUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte inloggad' };
  }

  if (!message.trim()) {
    return { success: false, error: 'Meddelande krävs' };
  }

  try {
    const supabase = await createServerRlsClient();

    // Verify user owns the ticket
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .eq('user_id', user.id)
      .single();

    if (!ticket) {
      return { success: false, error: 'Ärende hittades inte' };
    }

    if (ticket.status === 'closed') {
      return { success: false, error: 'Ärendet är stängt och kan inte få nya meddelanden' };
    }

    // Insert message
    const { data: msgData, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_internal: false, // User messages are never internal
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error adding user message:', msgError);
      return { success: false, error: 'Kunde inte skicka meddelande' };
    }

    // Update ticket's updated_at and potentially status
    const updateData: { updated_at: string; status?: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed' } = {
      updated_at: new Date().toISOString(),
    };
    
    // If ticket was waiting for user, move to open
    if (ticket.status === 'waiting_for_user') {
      updateData.status = 'open';
    }

    await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId);

    revalidatePath('/app/support');
    return { success: true, data: msgData };
  } catch (err) {
    console.error('Error in addUserTicketMessage:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}
