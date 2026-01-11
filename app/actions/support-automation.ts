'use server';

/**
 * Server Actions for Support Automation
 * 
 * Handles routing rules, notification templates, and SLA escalation.
 * 
 * Authorization:
 * - System admin: can manage global rules/templates
 * - Tenant admin/owner: can manage tenant-specific rules/templates
 */

import { revalidatePath } from 'next/cache';
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';

import type { Database } from '@/types/supabase';

type TicketPriorityEnum = Database['public']['Enums']['ticket_priority_enum'];

// ============================================
// TYPES
// ============================================

export interface RoutingRule {
  id: string;
  rule_key: string | null;
  tenant_id: string | null;
  name: string;
  description: string | null;
  match_category: string | null;
  match_priority: TicketPriorityEnum | null;
  match_tenant_id: string | null;
  assign_to_user_id: string | null;
  set_priority: TicketPriorityEnum | null;
  set_sla_hours: number | null;
  add_tags: string[];
  is_active: boolean;
  priority_order: number;
  created_at: string;
  updated_at: string;
  // Joined
  assign_to_user_email?: string | null;
  tenant_name?: string | null;
}

export interface CreateRoutingRuleInput {
  tenantId?: string | null;
  name: string;
  description?: string | null;
  matchCategory?: string | null;
  matchPriority?: TicketPriorityEnum | null;
  matchTenantId?: string | null;
  assignToUserId?: string | null;
  setPriority?: TicketPriorityEnum | null;
  setSlaHours?: number | null;
  priorityOrder?: number;
}

export interface NotificationTemplate {
  id: string;
  template_key: string;
  tenant_id: string | null;
  name: string;
  description: string | null;
  title_template: string;
  message_template: string;
  type: string;
  category: string;
  action_url_template: string | null;
  action_label: string | null;
  is_active: boolean;
  is_system: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateTemplateInput {
  templateKey: string;
  tenantId?: string | null;
  name: string;
  description?: string | null;
  titleTemplate: string;
  messageTemplate: string;
  type?: string;
  category?: string;
  actionUrlTemplate?: string | null;
  actionLabel?: string | null;
}

export interface EscalatedTicket {
  ticket_id: string;
  old_priority: string;
  new_priority: string;
  old_escalation_level: number;
  new_escalation_level: number;
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
// ROUTING RULES - LIST
// ============================================

export async function listRoutingRules(params: {
  tenantId?: string | null;
  activeOnly?: boolean;
} = {}): Promise<{
  success: boolean;
  data?: RoutingRule[];
  error?: string;
}> {
  const { tenantId, activeOnly = false } = params;
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = isSystem 
      ? await createServiceRoleClient()
      : await createServerRlsClient();

    let query = supabase
      .from('ticket_routing_rules')
      .select(`
        *,
        assign_to_user:users!ticket_routing_rules_assign_to_user_id_fkey(email),
        tenant:tenants(name)
      `)
      .order('priority_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    // Tenant filter
    if (!isSystem) {
      const userTenantIds = await getUserAdminTenantIds(user.id);
      if (userTenantIds.length === 0) {
        return { success: false, error: 'Ingen adminbehörighet' };
      }
      query = query.in('tenant_id', userTenantIds);
    } else if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing routing rules:', error);
      return { success: false, error: 'Kunde inte hämta routingregler' };
    }

    const rules: RoutingRule[] = (data || []).map((rule) => ({
      ...rule,
      add_tags: (rule.add_tags as string[]) || [],
      assign_to_user_email: (rule.assign_to_user as { email?: string } | null)?.email ?? null,
      tenant_name: (rule.tenant as { name?: string } | null)?.name ?? null,
    }));

    return { success: true, data: rules };
  } catch (err) {
    console.error('Error in listRoutingRules:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ROUTING RULES - CREATE
// ============================================

export async function createRoutingRule(input: CreateRoutingRuleInput): Promise<{
  success: boolean;
  data?: RoutingRule;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Authorization check
  if (input.tenantId) {
    const tenantIds = await getUserAdminTenantIds(user.id);
    if (!isSystem && !tenantIds.includes(input.tenantId)) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' };
    }
  } else if (!isSystem) {
    return { success: false, error: 'Endast systemadmin kan skapa globala regler' };
  }

  try {
    const supabase = createServiceRoleClient();

    const insertData = {
      tenant_id: input.tenantId || null,
      name: input.name,
      description: input.description || null,
      match_category: input.matchCategory || null,
      match_priority: input.matchPriority || null,
      match_tenant_id: input.matchTenantId || null,
      assign_to_user_id: input.assignToUserId || null,
      set_priority: input.setPriority || null,
      set_sla_hours: input.setSlaHours || null,
      priority_order: input.priorityOrder ?? 0,
      created_by: user.id,
    };

    const { data, error } = await supabase
      .from('ticket_routing_rules')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating routing rule:', error);
      return { success: false, error: 'Kunde inte skapa regel' };
    }

    revalidatePath('/admin/support/automation');
    return { 
      success: true, 
      data: { ...data, add_tags: [] } as RoutingRule 
    };
  } catch (err) {
    console.error('Error in createRoutingRule:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ROUTING RULES - UPDATE
// ============================================

export async function updateRoutingRule(
  ruleId: string,
  input: Partial<CreateRoutingRuleInput> & { isActive?: boolean }
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get existing rule to check permissions
    const { data: existing } = await supabase
      .from('ticket_routing_rules')
      .select('tenant_id')
      .eq('id', ruleId)
      .single();

    if (!existing) {
      return { success: false, error: 'Regel hittades inte' };
    }

    // Authorization check
    if (existing.tenant_id) {
      const tenantIds = await getUserAdminTenantIds(user.id);
      if (!isSystem && !tenantIds.includes(existing.tenant_id)) {
        return { success: false, error: 'Ingen åtkomst till denna regel' };
      }
    } else if (!isSystem) {
      return { success: false, error: 'Endast systemadmin kan ändra globala regler' };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.matchCategory !== undefined) updateData.match_category = input.matchCategory;
    if (input.matchPriority !== undefined) updateData.match_priority = input.matchPriority;
    if (input.assignToUserId !== undefined) updateData.assign_to_user_id = input.assignToUserId;
    if (input.setPriority !== undefined) updateData.set_priority = input.setPriority;
    if (input.setSlaHours !== undefined) updateData.set_sla_hours = input.setSlaHours;
    if (input.priorityOrder !== undefined) updateData.priority_order = input.priorityOrder;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { error } = await supabase
      .from('ticket_routing_rules')
      .update(updateData)
      .eq('id', ruleId);

    if (error) {
      console.error('Error updating routing rule:', error);
      return { success: false, error: 'Kunde inte uppdatera regel' };
    }

    revalidatePath('/admin/support/automation');
    return { success: true };
  } catch (err) {
    console.error('Error in updateRoutingRule:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ROUTING RULES - DELETE
// ============================================

export async function deleteRoutingRule(ruleId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get existing rule to check permissions
    const { data: existing } = await supabase
      .from('ticket_routing_rules')
      .select('tenant_id')
      .eq('id', ruleId)
      .single();

    if (!existing) {
      return { success: false, error: 'Regel hittades inte' };
    }

    // Authorization check
    if (existing.tenant_id) {
      const tenantIds = await getUserAdminTenantIds(user.id);
      if (!isSystem && !tenantIds.includes(existing.tenant_id)) {
        return { success: false, error: 'Ingen åtkomst till denna regel' };
      }
    } else if (!isSystem) {
      return { success: false, error: 'Endast systemadmin kan ta bort globala regler' };
    }

    const { error } = await supabase
      .from('ticket_routing_rules')
      .delete()
      .eq('id', ruleId);

    if (error) {
      console.error('Error deleting routing rule:', error);
      return { success: false, error: 'Kunde inte ta bort regel' };
    }

    revalidatePath('/admin/support/automation');
    return { success: true };
  } catch (err) {
    console.error('Error in deleteRoutingRule:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// ROUTING RULES - APPLY TO TICKET
// ============================================

export async function applyRoutingRulesToTicket(ticketId: string): Promise<{
  success: boolean;
  appliedRules?: Array<{ ruleId: string; ruleName: string; action: string }>;
  error?: string;
}> {
  const { user, isSystem: _isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Call the database function
    const { data, error } = await supabase.rpc('apply_ticket_routing_rules', {
      p_ticket_id: ticketId,
    });

    if (error) {
      console.error('Error applying routing rules:', error);
      return { success: false, error: 'Kunde inte tillämpa routingregler' };
    }

    const appliedRules = (data || []).map((r: { rule_id: string; rule_name: string; action_taken: string }) => ({
      ruleId: r.rule_id,
      ruleName: r.rule_name,
      action: r.action_taken,
    }));

    revalidatePath('/admin/tickets');
    return { success: true, appliedRules };
  } catch (err) {
    console.error('Error in applyRoutingRulesToTicket:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES - LIST
// ============================================

export async function listNotificationTemplates(params: {
  tenantId?: string | null;
  category?: string | null;
  includeSystem?: boolean;
} = {}): Promise<{
  success: boolean;
  data?: NotificationTemplate[];
  error?: string;
}> {
  const { tenantId, category, includeSystem = true } = params;
  const { user, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServerRlsClient();

    let query = supabase
      .from('notification_templates')
      .select('*')
      .eq('is_active', true)
      .order('is_system', { ascending: false })
      .order('name', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    if (tenantId) {
      // Show tenant-specific + global templates
      query = query.or(`tenant_id.eq.${tenantId},tenant_id.is.null`);
    } else if (!includeSystem) {
      query = query.not('tenant_id', 'is', null);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error listing notification templates:', error);
      return { success: false, error: 'Kunde inte hämta mallar' };
    }

    return { success: true, data: data as NotificationTemplate[] };
  } catch (err) {
    console.error('Error in listNotificationTemplates:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES - GET BY KEY
// ============================================

export async function getNotificationTemplate(templateKey: string, tenantId?: string | null): Promise<{
  success: boolean;
  data?: NotificationTemplate;
  error?: string;
}> {
  try {
    const supabase = await createServerRlsClient();

    // First try tenant-specific, then fall back to global
    const query = supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', templateKey)
      .eq('is_active', true);

    if (tenantId) {
      // Try tenant-specific first
      const { data: tenantTemplate } = await query.eq('tenant_id', tenantId).single();
      if (tenantTemplate) {
        return { success: true, data: tenantTemplate as NotificationTemplate };
      }
    }

    // Fall back to global template
    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('template_key', templateKey)
      .is('tenant_id', null)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return { success: false, error: 'Mall hittades inte' };
    }

    return { success: true, data: data as NotificationTemplate };
  } catch (err) {
    console.error('Error in getNotificationTemplate:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES - CREATE
// ============================================

export async function createNotificationTemplate(input: CreateTemplateInput): Promise<{
  success: boolean;
  data?: NotificationTemplate;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Authorization check
  if (input.tenantId) {
    const tenantIds = await getUserAdminTenantIds(user.id);
    if (!isSystem && !tenantIds.includes(input.tenantId)) {
      return { success: false, error: 'Ingen åtkomst till denna organisation' };
    }
  } else if (!isSystem) {
    return { success: false, error: 'Endast systemadmin kan skapa globala mallar' };
  }

  try {
    const supabase = await createServiceRoleClient();

    const { data, error } = await supabase
      .from('notification_templates')
      .insert({
        template_key: input.templateKey,
        tenant_id: input.tenantId || null,
        name: input.name,
        description: input.description || null,
        title_template: input.titleTemplate,
        message_template: input.messageTemplate,
        type: input.type || 'info',
        category: input.category || 'support',
        action_url_template: input.actionUrlTemplate || null,
        action_label: input.actionLabel || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating notification template:', error);
      if (error.code === '23505') {
        return { success: false, error: 'En mall med denna nyckel finns redan' };
      }
      return { success: false, error: 'Kunde inte skapa mall' };
    }

    revalidatePath('/admin/support/automation');
    return { success: true, data: data as NotificationTemplate };
  } catch (err) {
    console.error('Error in createNotificationTemplate:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES - UPDATE
// ============================================

export async function updateNotificationTemplate(
  templateId: string,
  input: Partial<CreateTemplateInput> & { isActive?: boolean }
): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get existing template to check permissions
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('tenant_id, is_system')
      .eq('id', templateId)
      .single();

    if (!existing) {
      return { success: false, error: 'Mall hittades inte' };
    }

    // System templates can only be updated by system admin
    if (existing.is_system && !isSystem) {
      return { success: false, error: 'Endast systemadmin kan ändra systemmallar' };
    }

    // Authorization check for tenant templates
    if (existing.tenant_id) {
      const tenantIds = await getUserAdminTenantIds(user.id);
      if (!isSystem && !tenantIds.includes(existing.tenant_id)) {
        return { success: false, error: 'Ingen åtkomst till denna mall' };
      }
    } else if (!isSystem) {
      return { success: false, error: 'Endast systemadmin kan ändra globala mallar' };
    }

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.titleTemplate !== undefined) updateData.title_template = input.titleTemplate;
    if (input.messageTemplate !== undefined) updateData.message_template = input.messageTemplate;
    if (input.type !== undefined) updateData.type = input.type;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.actionUrlTemplate !== undefined) updateData.action_url_template = input.actionUrlTemplate;
    if (input.actionLabel !== undefined) updateData.action_label = input.actionLabel;
    if (input.isActive !== undefined) updateData.is_active = input.isActive;

    const { error } = await supabase
      .from('notification_templates')
      .update(updateData)
      .eq('id', templateId);

    if (error) {
      console.error('Error updating notification template:', error);
      return { success: false, error: 'Kunde inte uppdatera mall' };
    }

    revalidatePath('/admin/support/automation');
    return { success: true };
  } catch (err) {
    console.error('Error in updateNotificationTemplate:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// NOTIFICATION TEMPLATES - DELETE
// ============================================

export async function deleteNotificationTemplate(templateId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Get existing template to check permissions
    const { data: existing } = await supabase
      .from('notification_templates')
      .select('tenant_id, is_system')
      .eq('id', templateId)
      .single();

    if (!existing) {
      return { success: false, error: 'Mall hittades inte' };
    }

    // System templates cannot be deleted
    if (existing.is_system) {
      return { success: false, error: 'Systemmallar kan inte tas bort' };
    }

    // Authorization check
    if (existing.tenant_id) {
      const tenantIds = await getUserAdminTenantIds(user.id);
      if (!isSystem && !tenantIds.includes(existing.tenant_id)) {
        return { success: false, error: 'Ingen åtkomst till denna mall' };
      }
    } else if (!isSystem) {
      return { success: false, error: 'Endast systemadmin kan ta bort globala mallar' };
    }

    const { error } = await supabase
      .from('notification_templates')
      .delete()
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting notification template:', error);
      return { success: false, error: 'Kunde inte ta bort mall' };
    }

    revalidatePath('/admin/support/automation');
    return { success: true };
  } catch (err) {
    console.error('Error in deleteNotificationTemplate:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// SLA ESCALATION - RUN ESCALATION
// ============================================

export async function runSlaEscalation(): Promise<{
  success: boolean;
  escalatedTickets?: EscalatedTicket[];
  error?: string;
}> {
  const { user, isSystem, error: authError } = await getCurrentAdminUser();
  
  if (!user) {
    return { success: false, error: authError || 'Inte autentiserad' };
  }

  // Only system admins can trigger escalation manually
  if (!isSystem) {
    return { success: false, error: 'Endast systemadmin kan köra eskalering' };
  }

  try {
    const supabase = await createServiceRoleClient();

    // Call the escalation function
    const { data, error } = await supabase.rpc('escalate_overdue_tickets');

    if (error) {
      console.error('Error running SLA escalation:', error);
      return { success: false, error: 'Kunde inte köra eskalering' };
    }

    const escalatedTickets: EscalatedTicket[] = (data || []).map((t: {
      ticket_id: string;
      old_priority: string;
      new_priority: string;
      old_escalation_level: number;
      new_escalation_level: number;
    }) => ({
      ticket_id: t.ticket_id,
      old_priority: t.old_priority,
      new_priority: t.new_priority,
      old_escalation_level: t.old_escalation_level,
      new_escalation_level: t.new_escalation_level,
    }));

    revalidatePath('/admin/tickets');
    return { success: true, escalatedTickets };
  } catch (err) {
    console.error('Error in runSlaEscalation:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// SLA - SET DEADLINE ON TICKET
// ============================================

export async function setTicketSlaDeadline(
  ticketId: string,
  slaDeadline: string | null  // ISO date string or null to clear
): Promise<{
  success: boolean;
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

    const { error } = await supabase
      .from('support_tickets')
      .update({
        sla_deadline: slaDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    if (error) {
      console.error('Error setting SLA deadline:', error);
      return { success: false, error: 'Kunde inte sätta SLA-deadline' };
    }

    revalidatePath('/admin/tickets');
    return { success: true };
  } catch (err) {
    console.error('Error in setTicketSlaDeadline:', err);
    return { success: false, error: 'Ett oväntat fel uppstod' };
  }
}

// ============================================
// HELPER: Render template with variables
// ============================================

export function renderTemplate(
  template: string,
  variables: Record<string, string | number | null | undefined>
): string {
  let result = template;
  
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    result = result.replaceAll(placeholder, String(value ?? ''));
  }
  
  return result;
}

/**
 * Get notification content from template
 */
export async function getNotificationFromTemplate(
  templateKey: string,
  variables: Record<string, string | number | null | undefined>,
  tenantId?: string | null
): Promise<{
  success: boolean;
  data?: {
    title: string;
    message: string;
    type: string;
    category: string;
    actionUrl?: string;
    actionLabel?: string;
  };
  error?: string;
}> {
  const templateResult = await getNotificationTemplate(templateKey, tenantId);
  
  if (!templateResult.success || !templateResult.data) {
    return { success: false, error: templateResult.error || 'Mall hittades inte' };
  }

  const template = templateResult.data;
  
  return {
    success: true,
    data: {
      title: renderTemplate(template.title_template, variables),
      message: renderTemplate(template.message_template, variables),
      type: template.type,
      category: template.category,
      actionUrl: template.action_url_template 
        ? renderTemplate(template.action_url_template, variables)
        : undefined,
      actionLabel: template.action_label || undefined,
    },
  };
}
