'use server';

/**
 * Server Actions for Tickets Admin
 * 
 * CRUD operations for support tickets with proper authorization.
 * Follows Learning Admin patterns for consistency.
 * 
 * Authorization:
 * - System admin: can view/manage all tickets, cross-tenant
 * - Tenant admin/owner: can view/manage tickets for their tenant only
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin, assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth';
import { createTicketNotification } from '@/app/actions/notifications-user';

import type { Database } from '@/types/supabase';

// ============================================
// TYPES
// ============================================

type SupportTicketRow = Database['public']['Tables']['support_tickets']['Row'];
type TicketMessageRow = Database['public']['Tables']['ticket_messages']['Row'];
type TicketStatusEnum = Database['public']['Enums']['ticket_status_enum'];
type TicketPriorityEnum = Database['public']['Enums']['ticket_priority_enum'];

export interface TicketRow extends SupportTicketRow {
  user_email?: string | null;
  assigned_user_email?: string | null;
  tenant_name?: string | null;
}

export interface TicketMessageRowWithUser extends TicketMessageRow {
  user_email?: string | null;
}

export interface ListTicketsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: TicketStatusEnum | 'all';
  priority?: TicketPriorityEnum | 'all';
  tenantId?: string | null;  // For system admin cross-tenant filter
  assignedToMe?: boolean;    // Filter to tickets assigned to current user
  unassigned?: boolean;      // Filter to unassigned tickets
  needsFirstResponse?: boolean; // Filter to tickets without first_response_at
  sortBy?: 'created_at' | 'updated_at' | 'priority' | 'sla_deadline';
  sortOrder?: 'asc' | 'desc';
}

export interface ListTicketsResult {
  success: boolean;
  data?: {
    tickets: TicketRow[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  error?: string;
}

export interface TicketStatsResult {
  success: boolean;
  data?: {
    totalTickets: number;
    openTickets: number;
    inProgressTickets: number;
    waitingTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    avgResolutionTimeMinutes: number | null;
  };
  error?: string;
}

export interface UpdateTicketStatusInput {
  ticketId: string;
  status: TicketStatusEnum;
}

export interface UpdateTicketPriorityInput {
  ticketId: string;
  priority: TicketPriorityEnum;
}

export interface AssignTicketInput {
  ticketId: string;
  assignedToUserId: string | null;
}

export interface AddMessageInput {
  ticketId: string;
  message: string;
  isInternal: boolean;
}

export interface TenantOption {
  id: string;
  name: string;
  slug: string | null;
}

// ============================================
// HELPER: Get current user with admin check
// ============================================

async function getCurrentAdminUser() {
  const supabase = await createServerRlsClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return { user: null, isSystem: false, error: 'Inte autentiserad' };
  }
  
  const isSystem = isSystemAdmin(user);
  return { user, isSystem, error: null };
}

/**
 * Get tenant IDs where user has admin role
 */
async function getUserAdminTenantIds(userId: string): Promise<string[]> {
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from('user_tenant_memberships')
    .select('tenant_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'editor']);
  
  return (data || []).map(m => m.tenant_id).filter((id): id is string => !!id);
}

// ============================================
// CHECK ADMIN ACCESS
// ============================================

export async function checkIsSystemAdmin(): Promise<boolean> {
  const { isSystem } = await getCurrentAdminUser();
  return isSystem;
}

export async function checkHasAdminAccess(): Promise<{
  hasAccess: boolean;
  isSystemAdmin: boolean;
  tenantIds: string[];
}> {
  const { user, isSystem } = await getCurrentAdminUser();
  
  if (!user) {
    return { hasAccess: false, isSystemAdmin: false, tenantIds: [] };
  }
  
  if (isSystem) {
    return { hasAccess: true, isSystemAdmin: true, tenantIds: [] };
  }
  
  const tenantIds = await getUserAdminTenantIds(user.id);
  return {
    hasAccess: tenantIds.length > 0,
    isSystemAdmin: false,
    tenantIds,
  };
}

// ============================================
// LIST TENANTS FOR ADMIN
// ============================================

export async function listTenantsForTicketsAdmin(): Promise<TenantOption[]> {
  const { user, isSystem, error } = await getCurrentAdminUser();
  
  if (!user || error) return [];
  
  const supabase = await createServerRlsClient();
  
  if (isSystem) {
    // System admin can see all tenants
    const { data } = await supabase
      .from('tenants')
      .select('id, name, slug')
      .order('name');
    return (data || []) as TenantOption[];
  }
  
  // Tenant admin sees only their tenants
  const { data: memberships } = await supabase
    .from('user_tenant_memberships')
    .select('tenant:tenants(id, name, slug)')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'editor']);
  
  return (memberships || [])
    .map(m => m.tenant as TenantOption | null)
    .filter((t): t is TenantOption => !!t);
}

// ============================================
// LIST TICKETS
// ============================================

export async function listTickets(params: ListTicketsParams = {}): Promise<ListTicketsResult> {
  const {
    page = 1,
    pageSize = 50,
    search,
    status = 'all',
    priority = 'all',
    tenantId,
    assignedToMe = false,
    unassigned = false,
    needsFirstResponse = false,
    sortBy = 'created_at',
    sortOrder = 'desc',
  } = params;

  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    // System admins can use service role for cross-tenant, others use RLS
    const supabase = isSystem 
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    // Build base query
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        user:users!support_tickets_user_id_fkey(email),
        assigned_user:users!support_tickets_assigned_to_user_id_fkey(email),
        tenant:tenants(name)
      `, { count: 'exact' });

    // Apply tenant filter
    if (isSystem) {
      // System admin can filter by tenant or see all
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
      // If no tenantId, show all
    } else {
      // Non-system admin: must have tenant access
      const userTenantIds = await getUserAdminTenantIds(user.id);
      
      if (userTenantIds.length === 0) {
        return { success: false, error: 'Ingen adminbehörighet för någon organisation' };
      }
      
      if (tenantId) {
        // Verify access to requested tenant
        if (!userTenantIds.includes(tenantId)) {
          return { success: false, error: 'Ingen åtkomst till denna organisation' };
        }
        query = query.eq('tenant_id', tenantId);
      } else {
        // Filter to user's tenants
        query = query.in('tenant_id', userTenantIds);
      }
    }

    // Apply filters
    if (status !== 'all') {
      query = query.eq('status', status);
    }
    if (priority !== 'all') {
      query = query.eq('priority', priority);
    }
    if (search) {
      query = query.or(`title.ilike.%${search}%,ticket_key.ilike.%${search}%,description.ilike.%${search}%`);
    }
    
    // Assignment filters
    if (assignedToMe) {
      query = query.eq('assigned_to_user_id', user.id);
    }
    if (unassigned) {
      query = query.is('assigned_to_user_id', null);
    }
    
    // SLA filter: needs first response
    if (needsFirstResponse) {
      query = query.is('first_response_at', null);
      // Only show open/in_progress tickets that need response
      query = query.in('status', ['open', 'in_progress']);
    }

    // Apply sorting
    const ascending = sortOrder === 'asc';
    if (sortBy === 'priority') {
      // Priority order: urgent > high > medium > low
      query = query.order('priority', { ascending: !ascending });
    }
    query = query.order(sortBy === 'priority' ? 'created_at' : sortBy, { ascending });

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing tickets:', error);
      return { success: false, error: 'Kunde inte hämta ärenden' };
    }

    // Transform data to flatten joins
    const tickets: TicketRow[] = (data || []).map((ticket) => ({
      ...ticket,
      user_email: (ticket.user as { email?: string } | null)?.email ?? null,
      assigned_user_email: (ticket.assigned_user as { email?: string } | null)?.email ?? null,
      tenant_name: (ticket.tenant as { name?: string } | null)?.name ?? null,
      // Remove nested objects
      user: undefined,
      assigned_user: undefined,
      tenant: undefined,
    })) as TicketRow[];

    const totalCount = count ?? 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return {
      success: true,
      data: {
        tickets,
        totalCount,
        page,
        pageSize,
        totalPages,
      },
    };
  } catch (err) {
    console.error('Error in listTickets:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// GET SINGLE TICKET
// ============================================

export async function getTicket(ticketId: string): Promise<{
  success: boolean;
  data?: TicketRow;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        user:users!support_tickets_user_id_fkey(email),
        assigned_user:users!support_tickets_assigned_to_user_id_fkey(email),
        tenant:tenants(name)
      `)
      .eq('id', ticketId)
      .single();

    if (error || !data) {
      return { success: false, error: 'Ärende hittades inte' };
    }

    // For non-system admin, verify tenant access
    if (!isSystem && data.tenant_id) {
      const hasAccess = await assertTenantAdminOrSystem(data.tenant_id, user);
      if (!hasAccess) {
        return { success: false, error: 'Ingen åtkomst till detta ärende' };
      }
    }

    const ticket: TicketRow = {
      ...data,
      user_email: (data.user as { email?: string } | null)?.email ?? null,
      assigned_user_email: (data.assigned_user as { email?: string } | null)?.email ?? null,
      tenant_name: (data.tenant as { name?: string } | null)?.name ?? null,
    };

    return { success: true, data: ticket };
  } catch (err) {
    console.error('Error in getTicket:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// LIST TICKET MESSAGES
// ============================================

export async function listTicketMessages(ticketId: string): Promise<{
  success: boolean;
  data?: TicketMessageRowWithUser[];
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    // First verify access to the ticket
    const ticketResult = await getTicket(ticketId);
    if (!ticketResult.success) {
      return { success: false, error: ticketResult.error };
    }

    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    const { data, error } = await supabase
      .from('ticket_messages')
      .select(`
        *,
        user:users(email)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error listing messages:', error);
      return { success: false, error: 'Kunde inte hämta meddelanden' };
    }

    const messages: TicketMessageRowWithUser[] = (data || []).map((msg) => ({
      ...msg,
      user_email: (msg.user as { email?: string } | null)?.email ?? null,
    }));

    return { success: true, data: messages };
  } catch (err) {
    console.error('Error in listTicketMessages:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// UPDATE TICKET STATUS
// ============================================

export async function updateTicketStatus(input: UpdateTicketStatusInput): Promise<{
  success: boolean;
  data?: TicketRow;
  error?: string;
}> {
  const { ticketId, status } = input;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    // Verify access first
    const ticketResult = await getTicket(ticketId);
    if (!ticketResult.success) {
      return { success: false, error: ticketResult.error };
    }

    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    const updateData: Partial<SupportTicketRow> = {
      status,
      updated_at: new Date().toISOString(),
    };

    // Set resolved_at if status is resolved
    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    } else if (status !== 'closed') {
      updateData.resolved_at = null;
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket status:', error);
      return { success: false, error: 'Kunde inte uppdatera status' };
    }

    // =====================================================================
    // NOTIFICATION TRIGGER: Status change → User notification
    // =====================================================================
    // SAFETY: This function is only callable by admins (getCurrentAdminUser guard above).
    // Global tickets (tenant_id IS NULL) cannot trigger notifications because
    // notifications.tenant_id is NOT NULL. This is intentional - see Risk 1 in Phase 2.
    // Future decision (Phase 3): Either forbid global tickets or require explicit
    // tenant context for notifications.
    // =====================================================================
    const ticket = ticketResult.data;
    if (ticket && ticket.user_id && ticket.tenant_id) {
      await createTicketNotification({
        userId: ticket.user_id,
        tenantId: ticket.tenant_id,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        eventType: 'status_change',
        newStatus: status,
      });
    }

    revalidatePath('/admin/tickets');
    return { success: true, data: data as TicketRow };
  } catch (err) {
    console.error('Error in updateTicketStatus:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// UPDATE TICKET PRIORITY
// ============================================

export async function updateTicketPriority(input: UpdateTicketPriorityInput): Promise<{
  success: boolean;
  data?: TicketRow;
  error?: string;
}> {
  const { ticketId, priority } = input;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    // Verify access first
    const ticketResult = await getTicket(ticketId);
    if (!ticketResult.success) {
      return { success: false, error: ticketResult.error };
    }

    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ticket priority:', error);
      return { success: false, error: 'Kunde inte uppdatera prioritet' };
    }

    revalidatePath('/admin/tickets');
    return { success: true, data: data as TicketRow };
  } catch (err) {
    console.error('Error in updateTicketPriority:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ASSIGN TICKET
// ============================================

export async function assignTicket(input: AssignTicketInput): Promise<{
  success: boolean;
  data?: TicketRow;
  error?: string;
}> {
  const { ticketId, assignedToUserId } = input;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    // Verify access first
    const ticketResult = await getTicket(ticketId);
    if (!ticketResult.success) {
      return { success: false, error: ticketResult.error };
    }

    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

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
      return { success: false, error: 'Kunde inte tilldela ärende' };
    }

    revalidatePath('/admin/tickets');
    return { success: true, data: data as TicketRow };
  } catch (err) {
    console.error('Error in assignTicket:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ADD MESSAGE
// ============================================

export async function addTicketMessage(input: AddMessageInput): Promise<{
  success: boolean;
  data?: TicketMessageRowWithUser;
  error?: string;
}> {
  const { ticketId, message, isInternal } = input;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  if (!message.trim()) {
    return { success: false, error: 'Meddelande krävs' };
  }

  try {
    // Verify access first
    const ticketResult = await getTicket(ticketId);
    if (!ticketResult.success) {
      return { success: false, error: ticketResult.error };
    }

    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    // Insert message
    const { data: msgData, error: msgError } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: user.id,
        message: message.trim(),
        is_internal: isInternal,
      })
      .select()
      .single();

    if (msgError) {
      console.error('Error adding message:', msgError);
      return { success: false, error: 'Kunde inte lägga till meddelande' };
    }

    // Update ticket's updated_at AND set first_response_at if this is first admin reply
    const ticket = ticketResult.data;
    const isFirstAdminReply = !isInternal && ticket && !ticket.first_response_at && user.id !== ticket.user_id;
    
    const ticketUpdateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (isFirstAdminReply) {
      ticketUpdateData.first_response_at = new Date().toISOString();
    }
    
    await supabase
      .from('support_tickets')
      .update(ticketUpdateData)
      .eq('id', ticketId);

    // Get user email for response
    const { data: userData } = await supabase
      .from('users')
      .select('email')
      .eq('id', user.id)
      .single();

    const result: TicketMessageRowWithUser = {
      ...msgData,
      user_email: userData?.email ?? null,
    };

    // =====================================================================
    // NOTIFICATION TRIGGER: Admin reply → User notification
    // =====================================================================
    // SAFETY: This function is only callable by admins (getCurrentAdminUser guard above).
    // We explicitly verify admin context before triggering user notifications.
    // - Only non-internal messages trigger notifications (internal = admin notes)
    // - Only if ticket has a tenant_id (global tickets cannot trigger notifications
    //   because notifications.tenant_id is NOT NULL - see Risk 1 in Phase 2 review)
    // - Only if the message sender is different from ticket owner (no self-notification)
    // - Uses messageId for idempotency (prevents duplicate notifications)
    // =====================================================================
    const isAdminContext = isSystem || (user && user.id !== ticket?.user_id);
    
    if (!isInternal && isAdminContext && ticket && ticket.user_id && ticket.tenant_id && ticket.user_id !== user.id) {
      await createTicketNotification({
        userId: ticket.user_id,
        tenantId: ticket.tenant_id,
        ticketId: ticket.id,
        ticketTitle: ticket.title,
        eventType: 'admin_reply',
        messageId: msgData.id, // For idempotency - prevents duplicate notifications
      });
    }

    revalidatePath('/admin/tickets');
    return { success: true, data: result };
  } catch (err) {
    console.error('Error in addTicketMessage:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// GET TICKET STATS
// ============================================

export async function getTicketStats(tenantId?: string | null): Promise<TicketStatsResult> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    let query = supabase
      .from('support_tickets')
      .select('status, created_at, resolved_at');

    // Apply tenant filter
    if (isSystem) {
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }
    } else {
      const userTenantIds = await getUserAdminTenantIds(user.id);
      if (userTenantIds.length === 0) {
        return { success: false, error: 'Ingen adminbehörighet' };
      }
      if (tenantId) {
        if (!userTenantIds.includes(tenantId)) {
          return { success: false, error: 'Ingen åtkomst till denna organisation' };
        }
        query = query.eq('tenant_id', tenantId);
      } else {
        query = query.in('tenant_id', userTenantIds);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching stats:', error);
      return { success: false, error: 'Kunde inte hämta statistik' };
    }

    const tickets = data || [];
    const totalTickets = tickets.length;
    const openTickets = tickets.filter(t => t.status === 'open').length;
    const inProgressTickets = tickets.filter(t => t.status === 'in_progress').length;
    const waitingTickets = tickets.filter(t => t.status === 'waiting_for_user').length;
    const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;
    const closedTickets = tickets.filter(t => t.status === 'closed').length;

    // Calculate average resolution time for resolved/closed tickets
    let avgResolutionTimeMinutes: number | null = null;
    const resolvedWithTime = tickets.filter(t => 
      (t.status === 'resolved' || t.status === 'closed') && t.resolved_at
    );
    if (resolvedWithTime.length > 0) {
      const totalMinutes = resolvedWithTime.reduce((acc, t) => {
        const created = new Date(t.created_at).getTime();
        const resolved = new Date(t.resolved_at!).getTime();
        return acc + (resolved - created) / 1000 / 60;
      }, 0);
      avgResolutionTimeMinutes = Math.round(totalMinutes / resolvedWithTime.length);
    }

    return {
      success: true,
      data: {
        totalTickets,
        openTickets,
        inProgressTickets,
        waitingTickets,
        resolvedTickets,
        closedTickets,
        avgResolutionTimeMinutes,
      },
    };
  } catch (err) {
    console.error('Error in getTicketStats:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// GET ASSIGNABLE USERS (for dropdown)
// ============================================

export async function getAssignableUsers(tenantId?: string | null): Promise<{
  success: boolean;
  data?: Array<{ id: string; email: string | null }>;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = isSystem
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    // Get users who are admins in the relevant tenant(s)
    let query = supabase
      .from('user_tenant_memberships')
      .select('user_id, users(id, email)')
      .eq('status', 'active')
      .in('role', ['owner', 'admin', 'editor']);

    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    } else if (!isSystem) {
      const userTenantIds = await getUserAdminTenantIds(user.id);
      query = query.in('tenant_id', userTenantIds);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching assignable users:', error);
      return { success: false, error: 'Kunde inte hämta användare' };
    }

    // Deduplicate users and extract info
    const userMap = new Map<string, { id: string; email: string | null }>();
    (data || []).forEach(m => {
      const u = m.users as { id: string; email: string | null } | null;
      if (u && !userMap.has(u.id)) {
        userMap.set(u.id, { id: u.id, email: u.email });
      }
    });

    return { success: true, data: Array.from(userMap.values()) };
  } catch (err) {
    console.error('Error in getAssignableUsers:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}
