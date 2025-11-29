-- =========================================
-- SUPPORT DOMAIN SCHEMA
-- Version 1.0
-- Date: 2025-11-29
-- =========================================
-- This migration adds feedback, support tickets, and bug reports for the Support Domain

-- =========================================
-- 1. ENUM TYPES
-- =========================================

CREATE TYPE ticket_status_enum AS ENUM (
  'open',
  'in_progress',
  'waiting_for_user',
  'resolved',
  'closed'
);

CREATE TYPE ticket_priority_enum AS ENUM (
  'low',
  'medium',
  'high',
  'urgent'
);

CREATE TYPE feedback_type_enum AS ENUM (
  'bug',
  'feature_request',
  'improvement',
  'other'
);

-- =========================================
-- 2. FEEDBACK TABLE
-- =========================================

CREATE TABLE feedback (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feedback_key        text UNIQUE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  game_id             uuid REFERENCES games (id) ON DELETE SET NULL,
  type                feedback_type_enum NOT NULL DEFAULT 'other',
  title               text NOT NULL,
  description         text,
  rating              integer CHECK (rating >= 1 AND rating <= 5),
  is_anonymous        boolean NOT NULL DEFAULT false,
  status              text NOT NULL DEFAULT 'received',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX feedback_feedback_key_idx ON feedback (feedback_key);
CREATE INDEX feedback_user_idx ON feedback (user_id);
CREATE INDEX feedback_tenant_idx ON feedback (tenant_id);
CREATE INDEX feedback_game_idx ON feedback (game_id);
CREATE INDEX feedback_type_idx ON feedback (type);
CREATE INDEX feedback_status_idx ON feedback (status);
CREATE INDEX feedback_created_at_idx ON feedback (created_at DESC);

-- =========================================
-- 3. SUPPORT TICKETS TABLE
-- =========================================

CREATE TABLE support_tickets (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_key          text UNIQUE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  assigned_to_user_id uuid REFERENCES users (id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text,
  category            text,
  status              ticket_status_enum NOT NULL DEFAULT 'open',
  priority            ticket_priority_enum NOT NULL DEFAULT 'medium',
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_tickets_ticket_key_idx ON support_tickets (ticket_key);
CREATE INDEX support_tickets_user_idx ON support_tickets (user_id);
CREATE INDEX support_tickets_tenant_idx ON support_tickets (tenant_id);
CREATE INDEX support_tickets_assigned_to_idx ON support_tickets (assigned_to_user_id);
CREATE INDEX support_tickets_status_idx ON support_tickets (status);
CREATE INDEX support_tickets_priority_idx ON support_tickets (priority);
CREATE INDEX support_tickets_created_at_idx ON support_tickets (created_at DESC);

-- =========================================
-- 4. TICKET MESSAGES/COMMENTS TABLE
-- =========================================

CREATE TABLE ticket_messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_key         text UNIQUE,
  ticket_id           uuid NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  message             text NOT NULL,
  is_internal         boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ticket_messages_message_key_idx ON ticket_messages (message_key);
CREATE INDEX ticket_messages_ticket_idx ON ticket_messages (ticket_id);
CREATE INDEX ticket_messages_user_idx ON ticket_messages (user_id);
CREATE INDEX ticket_messages_created_at_idx ON ticket_messages (created_at);

-- =========================================
-- 5. SUPPORT STATS/REPORTS TABLE
-- =========================================

CREATE TABLE support_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_key          text UNIQUE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  total_tickets       integer NOT NULL DEFAULT 0,
  open_tickets        integer NOT NULL DEFAULT 0,
  avg_resolution_time integer,
  satisfaction_score  numeric(3,2),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX support_reports_report_key_idx ON support_reports (report_key);
CREATE INDEX support_reports_tenant_idx ON support_reports (tenant_id);
CREATE INDEX support_reports_created_at_idx ON support_reports (created_at DESC);

-- =========================================
-- 6. BUG REPORTS TABLE
-- =========================================

CREATE TABLE bug_reports (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bug_report_key      text UNIQUE,
  user_id             uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  game_id             uuid REFERENCES games (id) ON DELETE SET NULL,
  title               text NOT NULL,
  description         text NOT NULL,
  error_message       text,
  steps_to_reproduce  text,
  browser_info        text,
  status              text NOT NULL DEFAULT 'new',
  is_resolved         boolean NOT NULL DEFAULT false,
  resolved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX bug_reports_bug_report_key_idx ON bug_reports (bug_report_key);
CREATE INDEX bug_reports_user_idx ON bug_reports (user_id);
CREATE INDEX bug_reports_tenant_idx ON bug_reports (tenant_id);
CREATE INDEX bug_reports_game_idx ON bug_reports (game_id);
CREATE INDEX bug_reports_status_idx ON bug_reports (status);
CREATE INDEX bug_reports_is_resolved_idx ON bug_reports (is_resolved);
CREATE INDEX bug_reports_created_at_idx ON bug_reports (created_at DESC);

-- =========================================
-- 7. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 8. RLS POLICIES
-- =========================================

-- FEEDBACK: Users can select their own feedback and tenant staff can see tenant feedback
CREATE POLICY "users_can_select_own_feedback"
ON feedback FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- FEEDBACK: Users can insert their own feedback
CREATE POLICY "users_can_insert_feedback"
ON feedback FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- FEEDBACK: Users can update their own feedback
CREATE POLICY "users_can_update_own_feedback"
ON feedback FOR UPDATE
USING (user_id = auth.uid());

-- SUPPORT_TICKETS: Users can select their own tickets and admins can see all
CREATE POLICY "users_can_select_own_tickets"
ON support_tickets FOR SELECT
USING (
  user_id = auth.uid()
  OR assigned_to_user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- SUPPORT_TICKETS: Users can insert their own tickets
CREATE POLICY "users_can_insert_tickets"
ON support_tickets FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- SUPPORT_TICKETS: Admins can update tickets for their tenant
CREATE POLICY "admins_can_update_tickets"
ON support_tickets FOR UPDATE
USING (
  tenant_id IN (SELECT get_user_tenant_ids())
  AND (has_tenant_role(tenant_id, 'admin') OR has_tenant_role(tenant_id, 'owner'))
);

-- TICKET_MESSAGES: Users can select messages on their tickets
CREATE POLICY "users_can_select_ticket_messages"
ON ticket_messages FOR SELECT
USING (
  ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
       OR assigned_to_user_id = auth.uid()
       OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- TICKET_MESSAGES: Users can insert messages on their tickets
CREATE POLICY "users_can_insert_ticket_messages"
ON ticket_messages FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND ticket_id IN (
    SELECT id FROM support_tickets
    WHERE user_id = auth.uid()
       OR assigned_to_user_id = auth.uid()
  )
);

-- SUPPORT_REPORTS: Tenant members can select their tenant reports
CREATE POLICY "tenant_members_can_select_reports"
ON support_reports FOR SELECT
USING (
  tenant_id IN (SELECT get_user_tenant_ids())
);

-- BUG_REPORTS: Users can select their own bug reports
CREATE POLICY "users_can_select_own_bug_reports"
ON bug_reports FOR SELECT
USING (
  user_id = auth.uid()
  OR tenant_id IN (SELECT get_user_tenant_ids())
);

-- BUG_REPORTS: Users can insert their own bug reports
CREATE POLICY "users_can_insert_bug_reports"
ON bug_reports FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND (
    tenant_id IS NULL
    OR tenant_id IN (SELECT get_user_tenant_ids())
  )
);

-- =========================================
-- 9. COMMENTS
-- =========================================

COMMENT ON TABLE feedback IS 'User feedback, feature requests, and bug reports';
COMMENT ON TABLE support_tickets IS 'Support tickets and help requests';
COMMENT ON TABLE ticket_messages IS 'Conversation messages on support tickets';
COMMENT ON TABLE support_reports IS 'Support team performance metrics and statistics';
COMMENT ON TABLE bug_reports IS 'Detailed bug reports with reproduction steps';
