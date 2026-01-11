-- =========================================
-- SUPPORT AUTOMATION: SLA, ROUTING & TEMPLATES
-- Version 1.0
-- Date: 2026-01-11
-- =========================================
-- Adds:
-- 1. SLA escalation logic (RPC for cron job)
-- 2. Ticket routing rules table
-- 3. Notification templates table

-- =========================================
-- 1. TICKET ROUTING RULES TABLE
-- =========================================
-- Automatic assignment based on category, priority, or tenant

CREATE TABLE ticket_routing_rules (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_key            text UNIQUE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  -- Match conditions (all must match if set)
  match_category      text,                              -- Match ticket category (NULL = any)
  match_priority      ticket_priority_enum,              -- Match priority (NULL = any)
  match_tenant_id     uuid REFERENCES tenants (id),      -- Match specific tenant (NULL = any)
  -- Actions
  assign_to_user_id   uuid REFERENCES users (id) ON DELETE SET NULL,
  set_priority        ticket_priority_enum,              -- Override priority
  set_sla_hours       integer,                           -- Set SLA deadline (hours from creation)
  add_tags            jsonb DEFAULT '[]'::jsonb,         -- Tags to add
  -- Metadata
  is_active           boolean NOT NULL DEFAULT true,
  priority_order      integer NOT NULL DEFAULT 0,        -- Lower = higher priority (evaluated first)
  created_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX ticket_routing_rules_tenant_idx ON ticket_routing_rules (tenant_id);
CREATE INDEX ticket_routing_rules_active_idx ON ticket_routing_rules (is_active, priority_order);
CREATE INDEX ticket_routing_rules_category_idx ON ticket_routing_rules (match_category);

-- RLS
ALTER TABLE ticket_routing_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage routing rules
CREATE POLICY "admins_can_manage_routing_rules"
ON ticket_routing_rules FOR ALL
USING (
  public.is_system_admin()
  OR
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
);

-- =========================================
-- 2. NOTIFICATION TEMPLATES TABLE
-- =========================================
-- Reusable templates for common notifications

CREATE TABLE notification_templates (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key        text UNIQUE NOT NULL,              -- e.g., 'ticket_assigned', 'sla_warning'
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  name                text NOT NULL,
  description         text,
  -- Content (supports variables like {{ticket_title}}, {{user_name}})
  title_template      text NOT NULL,                     -- e.g., 'Nytt ärende: {{ticket_title}}'
  message_template    text NOT NULL,                     -- Markdown supported
  type                text NOT NULL DEFAULT 'info',      -- info, success, warning, error
  category            text NOT NULL DEFAULT 'support',   -- support, system, learning, etc.
  -- Default action
  action_url_template text,                              -- e.g., '/app/support/tickets/{{ticket_id}}'
  action_label        text,                              -- e.g., 'Visa ärende'
  -- Metadata
  is_active           boolean NOT NULL DEFAULT true,
  is_system           boolean NOT NULL DEFAULT false,    -- System templates can't be deleted
  created_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX notification_templates_tenant_idx ON notification_templates (tenant_id);
CREATE INDEX notification_templates_key_idx ON notification_templates (template_key);
CREATE INDEX notification_templates_category_idx ON notification_templates (category);

-- RLS
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates, all can read active templates
CREATE POLICY "anyone_can_read_active_templates"
ON notification_templates FOR SELECT
USING (
  is_active = true
  AND (tenant_id IS NULL OR tenant_id = ANY(get_user_tenant_ids()))
);

CREATE POLICY "admins_can_manage_templates"
ON notification_templates FOR ALL
USING (
  public.is_system_admin()
  OR
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
);

-- =========================================
-- 3. SLA ESCALATION COLUMNS
-- =========================================
-- Track escalation state on tickets

ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS escalation_level integer NOT NULL DEFAULT 0;

ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS last_escalated_at timestamptz;

ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS sla_breached boolean NOT NULL DEFAULT false;

-- Index for escalation queries
CREATE INDEX IF NOT EXISTS support_tickets_escalation_idx 
  ON support_tickets (sla_deadline, escalation_level, status)
  WHERE sla_deadline IS NOT NULL AND status IN ('open', 'in_progress');

-- =========================================
-- 4. SLA ESCALATION FUNCTION (for cron job)
-- =========================================
-- Called periodically to escalate overdue tickets

CREATE OR REPLACE FUNCTION escalate_overdue_tickets()
RETURNS TABLE(
  ticket_id uuid,
  old_priority text,
  new_priority text,
  old_escalation_level integer,
  new_escalation_level integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  WITH escalated AS (
    UPDATE support_tickets
    SET 
      -- Escalate priority: low -> medium -> high -> urgent
      priority = CASE 
        WHEN priority = 'low' THEN 'medium'::ticket_priority_enum
        WHEN priority = 'medium' THEN 'high'::ticket_priority_enum
        WHEN priority = 'high' THEN 'urgent'::ticket_priority_enum
        ELSE priority
      END,
      escalation_level = escalation_level + 1,
      last_escalated_at = now(),
      sla_breached = true,
      updated_at = now()
    WHERE 
      sla_deadline IS NOT NULL
      AND sla_deadline < now()
      AND status IN ('open', 'in_progress', 'waiting_for_user')
      AND priority != 'urgent'  -- Don't escalate already urgent
      -- Prevent re-escalation within 1 hour
      AND (last_escalated_at IS NULL OR last_escalated_at < now() - interval '1 hour')
    RETURNING 
      id,
      CASE 
        WHEN escalation_level = 1 THEN 'low'
        WHEN escalation_level = 2 THEN 'medium'
        WHEN escalation_level = 3 THEN 'high'
        ELSE 'low'
      END as old_priority_text,
      priority::text as new_priority_text,
      escalation_level - 1 as old_level,
      escalation_level as new_level
  )
  SELECT 
    e.id,
    e.old_priority_text,
    e.new_priority_text,
    e.old_level,
    e.new_level
  FROM escalated e;
END;
$$;

-- =========================================
-- 5. APPLY ROUTING RULES FUNCTION
-- =========================================
-- Called when a ticket is created to apply matching rules

CREATE OR REPLACE FUNCTION apply_ticket_routing_rules(p_ticket_id uuid)
RETURNS TABLE(
  rule_id uuid,
  rule_name text,
  action_taken text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_ticket RECORD;
  v_rule RECORD;
  v_actions_taken text[] := '{}';
BEGIN
  -- Get ticket details
  SELECT * INTO v_ticket FROM support_tickets WHERE id = p_ticket_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Find matching rules (first match wins per action type)
  FOR v_rule IN 
    SELECT * FROM ticket_routing_rules 
    WHERE is_active = true
      AND (tenant_id IS NULL OR tenant_id = v_ticket.tenant_id)
      AND (match_category IS NULL OR match_category = v_ticket.category)
      AND (match_priority IS NULL OR match_priority = v_ticket.priority)
      AND (match_tenant_id IS NULL OR match_tenant_id = v_ticket.tenant_id)
    ORDER BY priority_order ASC
    LIMIT 5  -- Safety limit
  LOOP
    -- Apply assignment if not already assigned
    IF v_rule.assign_to_user_id IS NOT NULL 
       AND v_ticket.assigned_to_user_id IS NULL 
       AND NOT 'assigned' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET assigned_to_user_id = v_rule.assign_to_user_id,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'assigned');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'assigned_to_user';
      RETURN NEXT;
    END IF;
    
    -- Apply SLA if not set
    IF v_rule.set_sla_hours IS NOT NULL 
       AND v_ticket.sla_deadline IS NULL
       AND NOT 'sla_set' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET sla_deadline = now() + (v_rule.set_sla_hours || ' hours')::interval,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'sla_set');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'sla_deadline_set';
      RETURN NEXT;
    END IF;
    
    -- Apply priority override
    IF v_rule.set_priority IS NOT NULL 
       AND NOT 'priority_set' = ANY(v_actions_taken) THEN
      UPDATE support_tickets 
      SET priority = v_rule.set_priority,
          updated_at = now()
      WHERE id = p_ticket_id;
      v_actions_taken := array_append(v_actions_taken, 'priority_set');
      
      rule_id := v_rule.id;
      rule_name := v_rule.name;
      action_taken := 'priority_overridden';
      RETURN NEXT;
    END IF;
  END LOOP;
END;
$$;

-- =========================================
-- 6. INSERT DEFAULT NOTIFICATION TEMPLATES
-- =========================================

INSERT INTO notification_templates (template_key, name, description, title_template, message_template, type, category, action_url_template, action_label, is_system) VALUES
  ('ticket_created', 'Ärende skapat', 'Skickas när användare skapar ett nytt ärende', 
   'Ärende mottaget', 'Vi har mottagit ditt ärende "{{ticket_title}}" och återkommer så snart vi kan.', 
   'success', 'support', '/app/support/tickets/{{ticket_id}}', 'Visa ärende', true),
  
  ('ticket_assigned', 'Ärende tilldelat', 'Skickas till admin när ett ärende tilldelas dem',
   'Nytt ärende tilldelat dig', 'Du har tilldelats ärendet "{{ticket_title}}" ({{ticket_key}}).', 
   'info', 'support', '/admin/tickets?selected={{ticket_id}}', 'Öppna ärende', true),
  
  ('ticket_reply', 'Svar på ärende', 'Skickas när admin svarar på ett ärende',
   'Nytt svar på ditt ärende', 'Du har fått ett svar på ärendet "{{ticket_title}}".', 
   'info', 'support', '/app/support/tickets/{{ticket_id}}', 'Visa ärende', true),
  
  ('ticket_resolved', 'Ärende löst', 'Skickas när ett ärende markeras som löst',
   'Ditt ärende har lösts', 'Ärendet "{{ticket_title}}" har markerats som löst. Tack för din feedback!', 
   'success', 'support', '/app/support/tickets/{{ticket_id}}', 'Visa ärende', true),
  
  ('ticket_closed', 'Ärende stängt', 'Skickas när ett ärende stängs',
   'Ärende stängt', 'Ärendet "{{ticket_title}}" har stängts.', 
   'info', 'support', '/app/support/tickets/{{ticket_id}}', 'Visa ärende', true),
  
  ('sla_warning', 'SLA-varning', 'Skickas till admin när SLA närmar sig deadline',
   'SLA-varning: {{ticket_title}}', 'Ärendet "{{ticket_title}}" har snart passerat SLA-deadline. Prioritet: {{ticket_priority}}.', 
   'warning', 'support', '/admin/tickets?selected={{ticket_id}}', 'Hantera nu', true),
  
  ('sla_breached', 'SLA överskriden', 'Skickas till admin när SLA-deadline passeras',
   'SLA överskriden: {{ticket_title}}', 'Ärendet "{{ticket_title}}" har passerat SLA-deadline och har eskalerats till {{ticket_priority}}.', 
   'error', 'support', '/admin/tickets?selected={{ticket_id}}', 'Hantera nu', true),
  
  ('ticket_escalated', 'Ärende eskalerat', 'Skickas vid automatisk eskalering',
   'Ärende eskalerat', 'Ärendet "{{ticket_title}}" har eskalerats från {{old_priority}} till {{new_priority}} pga passerad SLA.', 
   'warning', 'support', '/admin/tickets?selected={{ticket_id}}', 'Hantera nu', true)
ON CONFLICT (template_key) DO NOTHING;

-- =========================================
-- 7. COMMENTS
-- =========================================

COMMENT ON TABLE ticket_routing_rules IS 'Automatic ticket routing and assignment rules';
COMMENT ON TABLE notification_templates IS 'Reusable notification templates with variable substitution';
COMMENT ON FUNCTION escalate_overdue_tickets() IS 'Called by cron to escalate tickets past SLA deadline';
COMMENT ON FUNCTION apply_ticket_routing_rules(uuid) IS 'Apply matching routing rules to a new ticket';
COMMENT ON COLUMN support_tickets.escalation_level IS 'Number of times this ticket has been escalated';
COMMENT ON COLUMN support_tickets.sla_breached IS 'True if ticket has ever breached SLA deadline';
