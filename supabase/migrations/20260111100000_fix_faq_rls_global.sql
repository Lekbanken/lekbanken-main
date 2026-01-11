-- =========================================
-- FIX: FAQ RLS POLICIES FOR GLOBAL ENTRIES
-- Version 1.1
-- Date: 2026-01-11
-- =========================================
-- Problem: Original policies allowed ANY authenticated user to 
-- INSERT/UPDATE/DELETE global FAQs (tenant_id IS NULL).
-- Fix: Only system admins can manage global FAQs.

-- =========================================
-- 1. DROP EXISTING POLICIES
-- =========================================

DROP POLICY IF EXISTS "admins_can_create_faqs" ON support_faq_entries;
DROP POLICY IF EXISTS "admins_can_update_faqs" ON support_faq_entries;
DROP POLICY IF EXISTS "admins_can_delete_faqs" ON support_faq_entries;

-- =========================================
-- 2. CREATE FIXED POLICIES
-- =========================================

-- INSERT: Only admins/owners can create FAQs for their tenant
-- System admins can create global FAQs (tenant_id IS NULL)
CREATE POLICY "admins_can_create_faqs"
ON support_faq_entries FOR INSERT
WITH CHECK (
  -- Tenant-scoped: must be admin/owner of that tenant
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  -- Global: ONLY system admins
  (tenant_id IS NULL AND public.is_system_admin())
);

-- UPDATE: Only admins/owners can update FAQs for their tenant
-- System admins can update global FAQs
CREATE POLICY "admins_can_update_faqs"
ON support_faq_entries FOR UPDATE
USING (
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  (tenant_id IS NULL AND public.is_system_admin())
);

-- DELETE: Only admins/owners can delete FAQs for their tenant
-- System admins can delete global FAQs
CREATE POLICY "admins_can_delete_faqs"
ON support_faq_entries FOR DELETE
USING (
  (tenant_id IS NOT NULL AND public.has_tenant_role(tenant_id, ARRAY['admin', 'owner']::public.tenant_role_enum[]))
  OR
  (tenant_id IS NULL AND public.is_system_admin())
);

-- =========================================
-- 3. VERIFICATION
-- =========================================

COMMENT ON POLICY "admins_can_create_faqs" ON support_faq_entries IS 
  'Tenant admins can create tenant FAQs, system admins can create global FAQs';
COMMENT ON POLICY "admins_can_update_faqs" ON support_faq_entries IS 
  'Tenant admins can update tenant FAQs, system admins can update global FAQs';
COMMENT ON POLICY "admins_can_delete_faqs" ON support_faq_entries IS 
  'Tenant admins can delete tenant FAQs, system admins can delete global FAQs';
