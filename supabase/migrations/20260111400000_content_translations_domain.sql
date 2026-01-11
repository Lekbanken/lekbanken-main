-- Content Translations Domain
-- Phase 4 of i18n implementation: Database-driven content translations
-- 
-- Creates translation tables for dynamic content across domains:
-- - Learning courses
-- - Achievements  
-- - Shop items
-- - Notification templates

-- ============================================================================
-- LOCALES ENUM (if not exists - uses existing language patterns)
-- ============================================================================
-- Note: We use TEXT for locale to match existing game_translations pattern
-- Valid values: 'sv', 'en', 'no' (lowercase ISO 639-1)

-- ============================================================================
-- LEARNING COURSE TRANSLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_course_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES learning_courses(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  title TEXT NOT NULL,
  description TEXT,
  content_json JSONB,  -- Translated content blocks
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  -- One translation per locale per course
  UNIQUE (course_id, locale)
);

-- Index for efficient locale lookups
CREATE INDEX IF NOT EXISTS idx_learning_course_translations_course_locale 
  ON learning_course_translations(course_id, locale);

-- Trigger for updated_at
CREATE TRIGGER update_learning_course_translations_updated_at
  BEFORE UPDATE ON learning_course_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- LEARNING PATH TRANSLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS learning_path_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path_id UUID NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE (path_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_learning_path_translations_path_locale 
  ON learning_path_translations(path_id, locale);

CREATE TRIGGER update_learning_path_translations_updated_at
  BEFORE UPDATE ON learning_path_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ACHIEVEMENT TRANSLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS achievement_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  achievement_id UUID NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  name TEXT NOT NULL,
  description TEXT,
  hint_text TEXT,  -- Translated hint for earning the achievement
  criteria_text TEXT,  -- Human-readable criteria description
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE (achievement_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_achievement_translations_achievement_locale 
  ON achievement_translations(achievement_id, locale);

CREATE TRIGGER update_achievement_translations_updated_at
  BEFORE UPDATE ON achievement_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SHOP ITEM TRANSLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS shop_item_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE (item_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_shop_item_translations_item_locale 
  ON shop_item_translations(item_id, locale);

CREATE TRIGGER update_shop_item_translations_updated_at
  BEFORE UPDATE ON shop_item_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- NOTIFICATION TEMPLATE TRANSLATIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notification_template_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES notification_templates(id) ON DELETE CASCADE,
  locale TEXT NOT NULL CHECK (locale IN ('sv', 'en', 'no')),
  title_template TEXT NOT NULL,
  message_template TEXT NOT NULL,
  action_label TEXT,  -- Translated CTA button text
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  
  UNIQUE (template_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_notification_template_translations_template_locale 
  ON notification_template_translations(template_id, locale);

CREATE TRIGGER update_notification_template_translations_updated_at
  BEFORE UPDATE ON notification_template_translations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Learning Course Translations
ALTER TABLE learning_course_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_course_translations_select"
  ON learning_course_translations FOR SELECT
  USING (true);  -- Published content readable by all authenticated

CREATE POLICY "learning_course_translations_admin_all"
  ON learning_course_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Learning Path Translations
ALTER TABLE learning_path_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learning_path_translations_select"
  ON learning_path_translations FOR SELECT
  USING (true);

CREATE POLICY "learning_path_translations_admin_all"
  ON learning_path_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Achievement Translations
ALTER TABLE achievement_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "achievement_translations_select"
  ON achievement_translations FOR SELECT
  USING (true);

CREATE POLICY "achievement_translations_admin_all"
  ON achievement_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Shop Item Translations
ALTER TABLE shop_item_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop_item_translations_select"
  ON shop_item_translations FOR SELECT
  USING (true);

CREATE POLICY "shop_item_translations_admin_all"
  ON shop_item_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- Notification Template Translations (tenant-scoped)
ALTER TABLE notification_template_translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_template_translations_select"
  ON notification_template_translations FOR SELECT
  USING (true);

CREATE POLICY "notification_template_translations_admin_all"
  ON notification_template_translations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = (SELECT auth.uid())
      AND u.global_role = 'system_admin'
    )
  );

-- ============================================================================
-- HELPER FUNCTION: Get translated content with fallback
-- ============================================================================
CREATE OR REPLACE FUNCTION get_translated_content(
  p_table_name TEXT,
  p_parent_id UUID,
  p_locale TEXT,
  p_fallback_locale TEXT DEFAULT 'sv'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_query TEXT;
BEGIN
  -- Try requested locale first
  v_query := format(
    'SELECT row_to_json(t.*)::jsonb FROM %I t WHERE %I = $1 AND locale = $2 LIMIT 1',
    p_table_name,
    CASE p_table_name
      WHEN 'learning_course_translations' THEN 'course_id'
      WHEN 'learning_path_translations' THEN 'path_id'
      WHEN 'achievement_translations' THEN 'achievement_id'
      WHEN 'shop_item_translations' THEN 'item_id'
      WHEN 'notification_template_translations' THEN 'template_id'
      ELSE 'id'
    END
  );
  
  EXECUTE v_query INTO v_result USING p_parent_id, p_locale;
  
  -- Fallback to default locale if not found
  IF v_result IS NULL AND p_locale != p_fallback_locale THEN
    EXECUTE v_query INTO v_result USING p_parent_id, p_fallback_locale;
  END IF;
  
  RETURN v_result;
END;
$$;

-- ============================================================================
-- GRANTS
-- ============================================================================
GRANT SELECT ON learning_course_translations TO authenticated;
GRANT SELECT ON learning_path_translations TO authenticated;
GRANT SELECT ON achievement_translations TO authenticated;
GRANT SELECT ON shop_item_translations TO authenticated;
GRANT SELECT ON notification_template_translations TO authenticated;

-- Admin full access (handled by RLS policies)
GRANT ALL ON learning_course_translations TO authenticated;
GRANT ALL ON learning_path_translations TO authenticated;
GRANT ALL ON achievement_translations TO authenticated;
GRANT ALL ON shop_item_translations TO authenticated;
GRANT ALL ON notification_template_translations TO authenticated;

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE learning_course_translations IS 'Locale-specific translations for learning courses (title, description, content)';
COMMENT ON TABLE learning_path_translations IS 'Locale-specific translations for learning paths';
COMMENT ON TABLE achievement_translations IS 'Locale-specific translations for achievements (name, description, hints)';
COMMENT ON TABLE shop_item_translations IS 'Locale-specific translations for shop items';
COMMENT ON TABLE notification_template_translations IS 'Locale-specific translations for notification templates';
COMMENT ON FUNCTION get_translated_content IS 'Generic helper to fetch translated content with locale fallback';
