-- =============================================================================
-- Fix: Grant SELECT on products and product_prices to anon + authenticated
-- =============================================================================
--
-- The products table had RLS policies allowing anon SELECT but was missing
-- the table-level GRANT, causing "permission denied for table products" (42501).
-- This migration ensures the GRANT exists so RLS policies can take effect.
-- =============================================================================

GRANT SELECT ON public.products       TO anon, authenticated;
GRANT SELECT ON public.product_prices TO anon, authenticated;
