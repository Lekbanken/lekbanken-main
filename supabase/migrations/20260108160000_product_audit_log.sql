-- Product Audit Log
-- Sprint 6: Audit Log & Database
-- Tracks all product lifecycle events for compliance and debugging

-- Create audit log table
-- Note: Products are global (not tenant-specific), so we don't require tenant_id
CREATE TABLE IF NOT EXISTS product_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'created',
        'status_changed',
        'field_updated',
        'price_created',
        'price_updated',
        'price_deleted',
        'default_price_changed',
        'stripe_synced',
        'stripe_sync_failed',
        'archived',
        'restored'
    )),
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_email TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Comment on table
COMMENT ON TABLE product_audit_log IS 'Audit log for product lifecycle events';
COMMENT ON COLUMN product_audit_log.event_type IS 'Type of event: created, status_changed, field_updated, price_created, etc.';
COMMENT ON COLUMN product_audit_log.event_data IS 'JSON payload with event-specific details (old_value, new_value, error, etc.)';
COMMENT ON COLUMN product_audit_log.actor_id IS 'User who performed the action';
COMMENT ON COLUMN product_audit_log.actor_email IS 'Denormalized email for easier querying';

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_product_audit_log_product_created 
    ON product_audit_log(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_audit_log_event_type 
    ON product_audit_log(event_type);

CREATE INDEX IF NOT EXISTS idx_product_audit_log_actor 
    ON product_audit_log(actor_id) WHERE actor_id IS NOT NULL;

-- Enable RLS
ALTER TABLE product_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only system admins can read/write product audit logs (products are global)
CREATE POLICY "product_audit_log_system_admin_select"
    ON product_audit_log
    FOR SELECT
    TO authenticated
    USING (is_system_admin());

-- Insert policy for system admins
CREATE POLICY "product_audit_log_system_admin_insert"
    ON product_audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (is_system_admin());

-- No update or delete - audit logs are immutable
-- Service role can always access via bypass

-- Grant permissions
GRANT SELECT, INSERT ON product_audit_log TO authenticated;
GRANT ALL ON product_audit_log TO service_role;

-- Helper function to log product events (SECURITY DEFINER for internal use)
CREATE OR REPLACE FUNCTION log_product_event(
    p_product_id UUID,
    p_event_type TEXT,
    p_event_data JSONB DEFAULT '{}'::jsonb,
    p_actor_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor_email TEXT;
    v_log_id UUID;
BEGIN
    -- Check product exists
    IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id) THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    -- Get actor email if actor_id provided
    IF p_actor_id IS NOT NULL THEN
        SELECT email INTO v_actor_email
        FROM users
        WHERE id = p_actor_id;
    END IF;
    
    -- Insert audit log
    INSERT INTO product_audit_log (
        product_id,
        event_type,
        event_data,
        actor_id,
        actor_email
    ) VALUES (
        p_product_id,
        p_event_type,
        p_event_data,
        p_actor_id,
        v_actor_email
    )
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION log_product_event IS 'Helper function to log product lifecycle events';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION log_product_event TO authenticated;
GRANT EXECUTE ON FUNCTION log_product_event TO service_role;
