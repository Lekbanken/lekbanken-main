import { supabase } from '@/lib/supabase/client';

// =========================================
// TYPES & INTERFACES
// =========================================

// Use Supabase generated types for type safety
import type { Database } from '@/types/supabase';

export type Feedback = Database['public']['Tables']['feedback']['Row'];
export type FeedbackInsert = Database['public']['Tables']['feedback']['Insert'];

export type SupportTicket = Database['public']['Tables']['support_tickets']['Row'];
export type SupportTicketInsert = Database['public']['Tables']['support_tickets']['Insert'];

export type TicketMessage = Database['public']['Tables']['ticket_messages']['Row'];
export type TicketMessageInsert = Database['public']['Tables']['ticket_messages']['Insert'];

export type BugReport = Database['public']['Tables']['bug_reports']['Row'];
export type BugReportInsert = Database['public']['Tables']['bug_reports']['Insert'];

export interface SupportStats {
  totalTickets: number;
  openTickets: number;
  avgResolutionTime: number | null;
  satisfactionScore: number | null;
}

export interface FeedbackSubmitParams {
  userId: string;
  tenantId: string | null;
  gameId?: string | null;
  type: 'bug' | 'feature_request' | 'improvement' | 'other';
  title: string;
  description: string;
  rating?: number;
  isAnonymous?: boolean;
}

export interface TicketCreateParams {
  userId: string;
  tenantId: string | null;
  title: string;
  description: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface TicketMessageParams {
  ticketId: string;
  userId: string;
  message: string;
  isInternal?: boolean;
}

export interface BugReportParams {
  userId: string;
  tenantId: string | null;
  gameId?: string | null;
  title: string;
  description: string;
  errorMessage?: string;
  stepsToReproduce?: string;
  browserInfo?: string;
}

// =========================================
// FEEDBACK FUNCTIONS
// =========================================

export async function submitFeedback(params: FeedbackSubmitParams): Promise<Feedback | null> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .insert({
        user_id: params.userId,
        tenant_id: params.tenantId,
        game_id: params.gameId || null,
        type: params.type,
        title: params.title,
        description: params.description,
        rating: params.rating || null,
        is_anonymous: params.isAnonymous || false,
        status: 'received',
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting feedback:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error submitting feedback:', err);
    return null;
  }
}

export async function getUserFeedback(
  userId: string,
  limit = 10,
  offset = 0
): Promise<Feedback[] | null> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user feedback:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user feedback:', err);
    return null;
  }
}

export async function getFeedbackById(id: string): Promise<Feedback | null> {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching feedback:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching feedback:', err);
    return null;
  }
}

// =========================================
// SUPPORT TICKET FUNCTIONS
// =========================================

export async function createTicket(params: TicketCreateParams): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: params.userId,
        tenant_id: params.tenantId,
        title: params.title,
        description: params.description,
        category: params.category || null,
        priority: params.priority || 'medium',
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating ticket:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error creating ticket:', err);
    return null;
  }
}

export async function getUserTickets(
  userId: string,
  status?: SupportTicket['status'],
  limit = 20,
  offset = 0
): Promise<SupportTicket[] | null> {
  try {
    let query = supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user tickets:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user tickets:', err);
    return null;
  }
}

export async function getTicketById(id: string): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching ticket:', err);
    return null;
  }
}

export async function updateTicketStatus(
  ticketId: string,
  status: 'open' | 'in_progress' | 'waiting_for_user' | 'resolved' | 'closed'
): Promise<SupportTicket | null> {
  try {
    const resolvedAt = status === 'resolved' ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        status,
        resolved_at: resolvedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket status:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error updating ticket status:', err);
    return null;
  }
}

export async function updateTicketPriority(
  ticketId: string,
  priority: 'low' | 'medium' | 'high' | 'urgent'
): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({ priority, updated_at: new Date().toISOString() })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket priority:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error updating ticket priority:', err);
    return null;
  }
}

export async function assignTicket(
  ticketId: string,
  assignedToUserId: string
): Promise<SupportTicket | null> {
  try {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to_user_id: assignedToUserId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error assigning ticket:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error assigning ticket:', err);
    return null;
  }
}

// =========================================
// TICKET MESSAGE FUNCTIONS
// =========================================

export async function addTicketMessage(params: TicketMessageParams): Promise<TicketMessage | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: params.ticketId,
        user_id: params.userId,
        message: params.message,
        is_internal: params.isInternal || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding ticket message:', error);
      return null;
    }

    // Update ticket's updated_at timestamp
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.ticketId);

    return data;
  } catch (err) {
    console.error('Error adding ticket message:', err);
    return null;
  }
}

export async function getTicketMessages(
  ticketId: string,
  limit = 50,
  offset = 0
): Promise<TicketMessage[] | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching ticket messages:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching ticket messages:', err);
    return null;
  }
}

// =========================================
// BUG REPORT FUNCTIONS
// =========================================

export async function submitBugReport(params: BugReportParams): Promise<BugReport | null> {
  try {
    const { data, error } = await supabase
      .from('bug_reports')
      .insert({
        user_id: params.userId,
        tenant_id: params.tenantId,
        game_id: params.gameId || null,
        title: params.title,
        description: params.description,
        error_message: params.errorMessage || null,
        steps_to_reproduce: params.stepsToReproduce || null,
        browser_info: params.browserInfo || null,
        status: 'new',
        is_resolved: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error submitting bug report:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error submitting bug report:', err);
    return null;
  }
}

export async function getUserBugReports(
  userId: string,
  limit = 10,
  offset = 0
): Promise<BugReport[] | null> {
  try {
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching user bug reports:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching user bug reports:', err);
    return null;
  }
}

export async function getBugReportById(id: string): Promise<BugReport | null> {
  try {
    const { data, error } = await supabase
      .from('bug_reports')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching bug report:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching bug report:', err);
    return null;
  }
}

export async function updateBugReportStatus(
  id: string,
  status: string,
  isResolved: boolean
): Promise<BugReport | null> {
  try {
    const resolvedAt = isResolved ? new Date().toISOString() : null;

    const { data, error } = await supabase
      .from('bug_reports')
      .update({
        status,
        is_resolved: isResolved,
        resolved_at: resolvedAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating bug report status:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error updating bug report status:', err);
    return null;
  }
}

// =========================================
// ADMIN STATISTICS FUNCTIONS
// =========================================

export async function getAdminTickets(
  tenantId: string | null,
  status?: SupportTicket['status'],
  priority?: SupportTicket['priority'],
  limit = 50,
  offset = 0
): Promise<SupportTicket[] | null> {
  try {
    let query = supabase.from('support_tickets').select('*');

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    const { data, error } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching admin tickets:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Error fetching admin tickets:', err);
    return null;
  }
}

export async function getTicketStats(tenantId: string | null): Promise<SupportStats | null> {
  try {
    const query = tenantId
      ? supabase.from('support_tickets').select('*').eq('tenant_id', tenantId)
      : supabase.from('support_tickets').select('*');

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ticket stats:', error);
      return null;
    }

    const tickets = data || [];
    const openTickets = tickets.filter((t) => t.status === 'open').length;
    const resolvedTickets = tickets.filter((t) => t.status === 'resolved');

    let avgResolutionTime = null;
    if (resolvedTickets.length > 0) {
      const totalTime = resolvedTickets.reduce((acc, ticket) => {
        const created = new Date(ticket.created_at).getTime();
        const resolved = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : created;
        return acc + (resolved - created);
      }, 0);
      avgResolutionTime = Math.round(totalTime / resolvedTickets.length / 1000 / 60); // in minutes
    }

    return {
      totalTickets: tickets.length,
      openTickets,
      avgResolutionTime,
      satisfactionScore: null, // Could be calculated from feedback ratings
    };
  } catch (err) {
    console.error('Error calculating ticket stats:', err);
    return null;
  }
}
