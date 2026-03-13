-- Migration: Bundle Items Table for Product Bundles
-- Purpose: Enable bundle purchases with automatic entitlement expansion
-- Created: 2026-01-27

-- Create bundle_items table to define which products are included in a bundle
CREATE TABLE IF NOT EXISTS public.bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The bundle product (must be a product with is_bundle = true)
  bundle_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- The child product included in the bundle
  child_product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Quantity of child product granted (e.g., 1 seat per bundle purchase)
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  
  -- Optional: Override entitlement duration for this child (in days, null = match parent)
  duration_days integer DEFAULT NULL CHECK (duration_days IS NULL OR duration_days > 0),
  
  -- Display order for UI
  display_order integer NOT NULL DEFAULT 0,
  
  -- Metadata
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  -- Prevent duplicate entries
  UNIQUE (bundle_product_id, child_product_id)
);

-- Add is_bundle flag to products if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'products' 
    AND column_name = 'is_bundle'
  ) THEN
    ALTER TABLE public.products 
    ADD COLUMN is_bundle boolean NOT NULL DEFAULT false;
  END IF;
END $$;

-- Create index for efficient bundle lookups
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_product_id 
ON public.bundle_items(bundle_product_id);

CREATE INDEX IF NOT EXISTS idx_bundle_items_child_product_id 
ON public.bundle_items(child_product_id);

CREATE INDEX IF NOT EXISTS idx_products_is_bundle 
ON public.products(is_bundle) WHERE is_bundle = true;

-- Updated at trigger
CREATE OR REPLACE FUNCTION public.bundle_items_update_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS bundle_items_updated_at ON public.bundle_items;
CREATE TRIGGER bundle_items_updated_at
  BEFORE UPDATE ON public.bundle_items
  FOR EACH ROW
  EXECUTE FUNCTION public.bundle_items_update_timestamp();

-- RLS Policies
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

-- Select: Public read for active bundles
CREATE POLICY "bundle_items_select_public"
ON public.bundle_items
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.products p 
    WHERE p.id = bundle_product_id 
    AND p.status = 'active'
    AND p.is_bundle = true
  )
);

-- Insert/Update/Delete: System admins only
CREATE POLICY "bundle_items_admin_insert"
ON public.bundle_items
FOR INSERT
TO authenticated
WITH CHECK (
  public.is_system_admin()
);

CREATE POLICY "bundle_items_admin_update"
ON public.bundle_items
FOR UPDATE
TO authenticated
USING (
  public.is_system_admin()
)
WITH CHECK (
  public.is_system_admin()
);

CREATE POLICY "bundle_items_admin_delete"
ON public.bundle_items
FOR DELETE
TO authenticated
USING (
  public.is_system_admin()
);

-- Function to expand bundle into child entitlements
CREATE OR REPLACE FUNCTION public.expand_bundle_entitlements(
  p_purchase_intent_id uuid,
  p_tenant_id uuid,
  p_bundle_product_id uuid,
  p_base_quantity integer DEFAULT 1,
  p_expires_at timestamptz DEFAULT NULL
)
RETURNS TABLE(
  child_product_id uuid,
  quantity_granted integer,
  entitlement_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
  v_entitlement_id uuid;
  v_child_expires_at timestamptz;
BEGIN
  -- Loop through all bundle items
  FOR v_item IN
    SELECT 
      bi.child_product_id,
      bi.quantity,
      bi.duration_days
    FROM public.bundle_items bi
    WHERE bi.bundle_product_id = p_bundle_product_id
    ORDER BY bi.display_order
  LOOP
    -- Calculate expiration for this child
    v_child_expires_at := CASE
      WHEN v_item.duration_days IS NOT NULL THEN now() + (v_item.duration_days || ' days')::interval
      ELSE p_expires_at
    END;
    
    -- Insert or update entitlement for child product
    INSERT INTO public.tenant_product_entitlements (
      tenant_id,
      product_id,
      purchase_intent_id,
      quantity,
      status,
      valid_from,
      valid_until
    )
    VALUES (
      p_tenant_id,
      v_item.child_product_id,
      p_purchase_intent_id,
      v_item.quantity * p_base_quantity,
      'active',
      now(),
      v_child_expires_at
    )
    ON CONFLICT (tenant_id, product_id) DO UPDATE SET
      quantity = EXCLUDED.quantity,
      status = 'active',
      valid_until = EXCLUDED.valid_until,
      updated_at = now()
    RETURNING id INTO v_entitlement_id;
    
    -- Return result
    child_product_id := v_item.child_product_id;
    quantity_granted := v_item.quantity * p_base_quantity;
    entitlement_id := v_entitlement_id;
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- Grant execute to authenticated users (will be called from webhook)
GRANT EXECUTE ON FUNCTION public.expand_bundle_entitlements TO authenticated;
GRANT EXECUTE ON FUNCTION public.expand_bundle_entitlements TO service_role;

-- Comment for documentation
COMMENT ON TABLE public.bundle_items IS 'Defines which products are included in a bundle product. When a bundle is purchased, all child products are granted as entitlements.';
COMMENT ON FUNCTION public.expand_bundle_entitlements IS 'Called during purchase completion to expand a bundle into individual child product entitlements.';
