-- =========================================
-- SUPPORT TICKETS: SLA & WORKFLOW ENHANCEMENTS
-- Version 1.0
-- Date: 2026-01-11
-- =========================================
-- Adds fields for:
-- 1. First response tracking (SLA metric)
-- 2. SLA deadline for escalation
-- 3. Notification idempotency key

-- =========================================
-- 1. ADD SLA COLUMNS TO SUPPORT_TICKETS
-- =========================================

-- First response timestamp (set when admin first replies)
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz;

-- SLA deadline (optional, for escalation tracking)
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz;

-- Create index for SLA queries
CREATE INDEX IF NOT EXISTS support_tickets_first_response_idx 
  ON support_tickets (first_response_at);
CREATE INDEX IF NOT EXISTS support_tickets_sla_deadline_idx 
  ON support_tickets (sla_deadline);

-- Composite index for "needs first response" queries
CREATE INDEX IF NOT EXISTS support_tickets_needs_response_idx 
  ON support_tickets (status, first_response_at, created_at DESC)
  WHERE first_response_at IS NULL AND status IN ('open', 'in_progress');

-- =========================================
-- 2. ADD IDEMPOTENCY KEY TO NOTIFICATIONS
-- =========================================

-- Event key for deduplication (e.g., "ticket:uuid:status:resolved:2026-01-11")
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS event_key text;

-- Unique constraint to prevent duplicate notifications for same event
-- Note: We use a partial index to allow NULLs (old notifications)
CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_unique_idx 
  ON notifications (user_id, event_key) 
  WHERE event_key IS NOT NULL;

-- =========================================
-- 3. COMMENTS
-- =========================================

COMMENT ON COLUMN support_tickets.first_response_at IS 
  'Timestamp when admin first responded to ticket (for SLA tracking)';
COMMENT ON COLUMN support_tickets.sla_deadline IS 
  'Optional SLA deadline for escalation tracking';
COMMENT ON COLUMN notifications.event_key IS 
  'Idempotency key to prevent duplicate notifications (format: entity:id:event:value:date)';
