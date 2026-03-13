-- =========================================
-- SUPPORT FAQ ENTRIES TABLE
-- Version 1.0
-- Date: 2026-01-11
-- =========================================
-- This migration adds FAQ entries for the Knowledge Base feature

-- =========================================
-- 1. FAQ ENTRIES TABLE
-- =========================================

CREATE TABLE support_faq_entries (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  faq_key             text UNIQUE,
  tenant_id           uuid REFERENCES tenants (id) ON DELETE CASCADE,
  question            text NOT NULL,
  answer_markdown     text NOT NULL,
  category            text,
  tags                jsonb DEFAULT '[]'::jsonb,
  position            integer NOT NULL DEFAULT 0,
  is_published        boolean NOT NULL DEFAULT false,
  view_count          integer NOT NULL DEFAULT 0,
  helpful_count       integer NOT NULL DEFAULT 0,
  not_helpful_count   integer NOT NULL DEFAULT 0,
  created_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_by          uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- =========================================
-- 2. INDEXES
-- =========================================

CREATE INDEX support_faq_entries_faq_key_idx ON support_faq_entries (faq_key);
CREATE INDEX support_faq_entries_tenant_idx ON support_faq_entries (tenant_id);
CREATE INDEX support_faq_entries_category_idx ON support_faq_entries (category);
CREATE INDEX support_faq_entries_is_published_idx ON support_faq_entries (is_published);
CREATE INDEX support_faq_entries_position_idx ON support_faq_entries (position);
CREATE INDEX support_faq_entries_created_at_idx ON support_faq_entries (created_at DESC);

-- Full-text search index on question
CREATE INDEX support_faq_entries_question_search_idx ON support_faq_entries 
  USING GIN (to_tsvector('swedish', question));

-- =========================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =========================================

ALTER TABLE support_faq_entries ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 4. RLS POLICIES
-- =========================================

-- SELECT: Anyone can read published FAQs (global or their tenant)
-- Admins can read all FAQs for their tenant (including unpublished)
CREATE POLICY "anyone_can_read_published_faqs"
ON support_faq_entries FOR SELECT
USING (
  -- Published global FAQs (tenant_id IS NULL)
  (is_published = true AND tenant_id IS NULL)
  OR
  -- Published tenant FAQs for user's tenants
  (is_published = true AND tenant_id = ANY(get_user_tenant_ids()))
  OR
  -- Admins/owners can see all FAQs for their tenant
  (tenant_id = ANY(get_user_tenant_ids()) AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
);

-- INSERT: Only admins/owners can create FAQs for their tenant
-- System admins can create global FAQs (tenant_id IS NULL)
CREATE POLICY "admins_can_create_faqs"
ON support_faq_entries FOR INSERT
WITH CHECK (
  -- Tenant-scoped: must be admin/owner of that tenant
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  -- Global: only system admins (checked at application level for NULL tenant_id)
  (tenant_id IS NULL)
);

-- UPDATE: Only admins/owners can update FAQs for their tenant
CREATE POLICY "admins_can_update_faqs"
ON support_faq_entries FOR UPDATE
USING (
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  (tenant_id IS NULL)
);

-- DELETE: Only admins/owners can delete FAQs for their tenant
CREATE POLICY "admins_can_delete_faqs"
ON support_faq_entries FOR DELETE
USING (
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  (tenant_id IS NULL)
);

-- =========================================
-- 5. TRIGGERS FOR UPDATED_AT
-- =========================================

CREATE OR REPLACE FUNCTION update_support_faq_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_support_faq_entries_updated_at
  BEFORE UPDATE ON support_faq_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_support_faq_entries_updated_at();

-- =========================================
-- 6. COMMENTS
-- =========================================

COMMENT ON TABLE support_faq_entries IS 'FAQ entries for the support knowledge base';
COMMENT ON COLUMN support_faq_entries.tenant_id IS 'NULL = global FAQ visible to all, otherwise tenant-specific';
COMMENT ON COLUMN support_faq_entries.is_published IS 'Only published FAQs are visible to regular users';
COMMENT ON COLUMN support_faq_entries.position IS 'Sort order within category';
