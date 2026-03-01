import "server-only";
import { createServerRlsClient } from "@/lib/supabase/server";
import { PRODUCT_KEY_RE } from "@/lib/validation/products";

/**
 * Resolve the URL-safe product_key for a bundle product.
 *
 * Returns `null` when:
 * - the product doesn't exist or isn't an active bundle
 * - the product_key fails the slug regex (safety guard against mystery 404s)
 */
export async function fetchBundleSlug(
  bundleProductId: string
): Promise<string | null> {
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from("products")
    .select("product_key")
    .eq("id", bundleProductId)
    .eq("status", "active")
    .eq("is_bundle", true)
    .maybeSingle();

  const key = data?.product_key;
  if (!key || !PRODUCT_KEY_RE.test(key)) return null;
  return key;
}
