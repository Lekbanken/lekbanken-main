-- Translation Enterprise Features
-- Phase 5 of i18n implementation: Missing key tracking + Audit log
-- 
-- Features:
-- - Runtime missing translation key tracking
-- - Translation change audit logging
-- - Tenant translation overrides (foundation)

-- ============================================================================
-- MISSING TRANSLATION KEY TRACKING
-- ============================================================================
-- Tracks keys that are requested but not found at runtime
-- Used for translation coverage reporting and prioritization

CREATE TABLE IF NOT EXISTS translation_missing_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  namespace TEXT,  -- e.g., 'admin', 'app', 'common'
  first_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  occurrence_count INTEGER NOT NULL DEFAULT 1,
  source_urls TEXT[],  -- Array of URLs where detected
  resolved_at TIMESTAMPTZ,  -- When the key was added
  resolved_by UUID REFERENCES users(id),
  
  UNIQUE(key, locale)
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_translation_missing_keys_locale 
  ON translation_missing_keys(locale);

CREATE INDEX IF NOT EXISTS idx_translation_missing_keys_namespace 
  ON translation_missing_keys(namespace);

CREATE INDEX IF NOT EXISTS idx_translation_missing_keys_unresolved 
  ON translation_missing_keys(resolved_at) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_translation_missing_keys_last_seen 
  ON translation_missing_keys(last_seen DESC);

-- ============================================================================
-- TRANSLATION AUDIT LOG
-- ============================================================================
-- Tracks all changes to translation tables for compliance and rollback

CREATE TABLE IF NOT EXISTS translation_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  table_name TEXT NOT NULL,  -- 'learning_course_translations', 'achievement_translations', etc.
  record_id UUID NOT NULL,
  locale TEXT,
  parent_id UUID,  -- The course_id, achievement_id, etc.
  old_value JSONB,
  new_value JSONB,
  changed_fields TEXT[],  -- List of field names that changed
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_translation_audit_log_table 
  ON translation_audit_log(table_name);

CREATE INDEX IF NOT EXISTS idx_translation_audit_log_record 
  ON translation_audit_log(record_id);

CREATE INDEX IF NOT EXISTS idx_translation_audit_log_user 
  ON translation_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_translation_audit_log_tenant 
  ON translation_audit_log(tenant_id);

CREATE INDEX IF NOT EXISTS idx_translation_audit_log_created 
  ON translation_audit_log(created_at DESC);

-- ============================================================================
-- TENANT TRANSLATION OVERRIDES (Foundation)
-- ============================================================================
-- Allows tenants to customize system strings for their organization

CREATE TABLE IF NOT EXISTS tenant_translation_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  key TEXT NOT NULL,           -- e.g., "admin.users.createUser"
  namespace TEXT,              -- e.g., "admin"
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  original_value TEXT,         -- The system default value
  override_value TEXT NOT NULL,-- The tenant's custom value
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE(tenant_id, key, locale)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tenant_translation_overrides_tenant 
  ON tenant_translation_overrides(tenant_id);

CREATE INDEX IF NOT EXISTS idx_tenant_translation_overrides_active 
  ON tenant_translation_overrides(tenant_id, locale) WHERE is_active = true;

-- Trigger for updated_at
CREATE TRIGGER update_tenant_translation_overrides_updated_at
  BEFORE UPDATE ON tenant_translation_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- AUDIT LOG TRIGGERS
-- ============================================================================

-- Generic audit function for translation tables
CREATE OR REPLACE FUNCTION log_translation_change()
RETURNS TRIGGER AS $$
DECLARE
  v_old_value JSONB;
  v_new_value JSONB;
  v_changed_fields TEXT[];
  v_locale TEXT;
  v_parent_id UUID;
  v_user_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Get current user
  v_user_id := (SELECT auth.uid());
  
  -- Determine action and values
  IF TG_OP = 'DELETE' THEN
    v_old_value := to_jsonb(OLD);
    v_new_value := NULL;
    v_locale := OLD.locale;
    
    -- Get parent_id based on table
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN OLD.course_id
      WHEN 'learning_path_translations' THEN OLD.path_id
      WHEN 'achievement_translations' THEN OLD.achievement_id
      WHEN 'shop_item_translations' THEN OLD.item_id
      WHEN 'notification_template_translations' THEN OLD.template_id
      ELSE NULL
    END;
    
  ELSIF TG_OP = 'INSERT' THEN
    v_old_value := NULL;
    v_new_value := to_jsonb(NEW);
    v_locale := NEW.locale;
    
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN NEW.course_id
      WHEN 'learning_path_translations' THEN NEW.path_id
      WHEN 'achievement_translations' THEN NEW.achievement_id
      WHEN 'shop_item_translations' THEN NEW.item_id
      WHEN 'notification_template_translations' THEN NEW.template_id
      ELSE NULL
    END;
    
  ELSE -- UPDATE
    v_old_value := to_jsonb(OLD);
    v_new_value := to_jsonb(NEW);
    v_locale := NEW.locale;
    
    v_parent_id := CASE TG_TABLE_NAME
      WHEN 'learning_course_translations' THEN NEW.course_id
      WHEN 'learning_path_translations' THEN NEW.path_id
      WHEN 'achievement_translations' THEN NEW.achievement_id
      WHEN 'shop_item_translations' THEN NEW.item_id
      WHEN 'notification_template_translations' THEN NEW.template_id
      ELSE NULL
    END;
    
    -- Calculate changed fields
    SELECT array_agg(key) INTO v_changed_fields
    FROM jsonb_each(v_new_value) n
    LEFT JOIN jsonb_each(v_old_value) o ON n.key = o.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at', 'updated_by');
  END IF;
  
  -- Insert audit log entry
  INSERT INTO translation_audit_log (
    action,
    table_name,
    record_id,
    locale,
    parent_id,
    old_value,
    new_value,
    changed_fields,
    user_id,
    tenant_id
  ) VALUES (
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    v_locale,
    v_parent_id,
    v_old_value,
    v_new_value,
    v_changed_fields,
    v_user_id,
    v_tenant_id
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Apply triggers to content translation tables
CREATE TRIGGER audit_learning_course_translations
  AFTER INSERT OR UPDATE OR DELETE ON learning_course_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_change();

CREATE TRIGGER audit_learning_path_translations
  AFTER INSERT OR UPDATE OR DELETE ON learning_path_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_change();

CREATE TRIGGER audit_achievement_translations
  AFTER INSERT OR UPDATE OR DELETE ON achievement_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_change();

CREATE TRIGGER audit_shop_item_translations
  AFTER INSERT OR UPDATE OR DELETE ON shop_item_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_change();

CREATE TRIGGER audit_notification_template_translations
  AFTER INSERT OR UPDATE OR DELETE ON notification_template_translations
  FOR EACH ROW EXECUTE FUNCTION log_translation_change();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Missing Keys - System admins can manage, all authenticated can report
ALTER TABLE translation_missing_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_missing_keys_select"
  ON translation_missing_keys FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

CREATE POLICY "translation_missing_keys_insert"
  ON translation_missing_keys FOR INSERT
  WITH CHECK (true);  -- Anyone can report missing keys

CREATE POLICY "translation_missing_keys_update"
  ON translation_missing_keys FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Audit Log - Read-only for system admins
ALTER TABLE translation_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "translation_audit_log_select"
  ON translation_audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Audit log inserts are done by triggers with SECURITY DEFINER

-- Tenant Overrides - Tenant admins manage their own
ALTER TABLE tenant_translation_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_translation_overrides_select"
  ON tenant_translation_overrides FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_translation_overrides.tenant_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tenant_translation_overrides_insert"
  ON tenant_translation_overrides FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_translation_overrides.tenant_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tenant_translation_overrides_update"
  ON tenant_translation_overrides FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_translation_overrides.tenant_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "tenant_translation_overrides_delete"
  ON tenant_translation_overrides FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM tenant_memberships tm
      WHERE tm.tenant_id = tenant_translation_overrides.tenant_id
      AND tm.user_id = (SELECT auth.uid())
      AND tm.role IN ('owner', 'admin')
    )
  );

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON translation_missing_keys TO authenticated;
GRANT SELECT ON translation_audit_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tenant_translation_overrides TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE translation_missing_keys IS 'Tracks translation keys that were requested but not found at runtime';
COMMENT ON TABLE translation_audit_log IS 'Audit trail for all content translation changes';
COMMENT ON TABLE tenant_translation_overrides IS 'Per-tenant customization of system translation strings';
COMMENT ON FUNCTION log_translation_change IS 'Trigger function to log all translation table changes to audit log';
