import "server-only";
import { createServerRlsClient } from "@/lib/supabase/server";
import { PRODUCT_KEY_RE } from "@/lib/validation/products";

/** Currency preference order — try each until data exists */
const CURRENCY_PRIORITY = ["SEK", "NOK", "EUR"] as const;

/**
 * Detect which currency to use by checking what prices actually exist
 * for the given product. Returns the first currency from CURRENCY_PRIORITY
 * that has at least one active price, or "SEK" as final fallback.
 */
export async function detectCurrency(
  productId: string | null
): Promise<string> {
  if (!productId) return "SEK";
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from("product_prices")
    .select("currency")
    .eq("product_id", productId)
    .eq("active", true);

  if (!data || data.length === 0) return "SEK";
  const available = new Set(data.map((r) => r.currency));
  for (const c of CURRENCY_PRIORITY) {
    if (available.has(c)) return c;
  }
  return data[0].currency;
}

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
