-- =============================================================================
-- RPC: sync_category_bundle — admin action to sync bundle_items for a category
-- =============================================================================
--
-- When a category has a bundle_product_id, this function syncs bundle_items
-- so the bundle contains all eligible products in that category.
--
-- Strategy: "Replace set" within a transaction.
--   - Removes bundle_items for products no longer in the category
--   - Adds bundle_items for new products in the category
--   - Skips the bundle product itself and nested bundles
--   - Only includes is_marketing_visible = true products
--
-- Usage:
--   SELECT * FROM public.sync_category_bundle('arbetsplatsen');
--
-- Returns: { added_count, removed_count, total_count }
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_category_bundle(p_category_slug text)
RETURNS TABLE(
  added_count   integer,
  removed_count integer,
  total_count   integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bundle_product_id uuid;
  v_added   integer := 0;
  v_removed integer := 0;
  v_total   integer := 0;
BEGIN
  -- ─────────────────────────────────────────────────────────────────────────
  -- 0. SQL-enforced admin check (defense in depth)
  -- ─────────────────────────────────────────────────────────────────────────
  IF NOT public.is_system_admin() THEN
    RAISE EXCEPTION 'sync_category_bundle requires system_admin role';
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 1. Resolve the bundle product for this category
  -- ─────────────────────────────────────────────────────────────────────────
  SELECT c.bundle_product_id INTO v_bundle_product_id
  FROM public.categories c
  WHERE c.slug = p_category_slug;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Category with slug "%" not found', p_category_slug;
  END IF;

  IF v_bundle_product_id IS NULL THEN
    RAISE EXCEPTION 'Category "%" has no bundle_product_id set', p_category_slug;
  END IF;

  -- Verify the bundle product actually exists and is a bundle
  IF NOT EXISTS (
    SELECT 1 FROM public.products
    WHERE id = v_bundle_product_id
      AND is_bundle = true
      AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Bundle product (%) is not active or is_bundle is false', v_bundle_product_id;
  END IF;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 2. Remove items that are no longer eligible
  -- ─────────────────────────────────────────────────────────────────────────
  -- Items where the child product is no longer in this category,
  -- or is no longer marketing-visible, or is itself a bundle.

  WITH removed AS (
    DELETE FROM public.bundle_items bi
    WHERE bi.bundle_product_id = v_bundle_product_id
      AND NOT EXISTS (
        SELECT 1 FROM public.products p
        WHERE p.id = bi.child_product_id
          AND p.category_slug = p_category_slug
          AND p.is_marketing_visible = true
          AND p.is_bundle = false
          AND p.status = 'active'
          AND p.id != v_bundle_product_id
      )
    RETURNING bi.id
  )
  SELECT count(*)::integer INTO v_removed FROM removed;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 3. Add new eligible items that aren't already in the bundle
  -- ─────────────────────────────────────────────────────────────────────────

  WITH eligible AS (
    SELECT p.id, ROW_NUMBER() OVER (ORDER BY p.name) AS rn
    FROM public.products p
    WHERE p.category_slug = p_category_slug
      AND p.is_marketing_visible = true
      AND p.is_bundle = false
      AND p.status = 'active'
      AND p.id != v_bundle_product_id
      AND NOT EXISTS (
        SELECT 1 FROM public.bundle_items bi2
        WHERE bi2.bundle_product_id = v_bundle_product_id
          AND bi2.child_product_id = p.id
      )
  ),
  inserted AS (
    INSERT INTO public.bundle_items (bundle_product_id, child_product_id, quantity, display_order)
    SELECT
      v_bundle_product_id,
      e.id,
      1,
      -- Offset display_order to come after existing items
      COALESCE((
        SELECT MAX(bi3.display_order) FROM public.bundle_items bi3
        WHERE bi3.bundle_product_id = v_bundle_product_id
      ), 0) + e.rn::integer
    FROM eligible e
    RETURNING id
  )
  SELECT count(*)::integer INTO v_added FROM inserted;

  -- ─────────────────────────────────────────────────────────────────────────
  -- 4. Count total items in bundle
  -- ─────────────────────────────────────────────────────────────────────────

  SELECT count(*)::integer INTO v_total
  FROM public.bundle_items
  WHERE bundle_product_id = v_bundle_product_id;

  RETURN QUERY SELECT v_added, v_removed, v_total;
END;
$$;

-- Only system admins should call this
REVOKE ALL ON FUNCTION public.sync_category_bundle(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_category_bundle(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.sync_category_bundle(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_category_bundle(text) TO service_role;

COMMENT ON FUNCTION public.sync_category_bundle IS
  'Admin RPC: syncs bundle_items for a category bundle product. Replace-set strategy.';
