import "server-only";
import { createServerRlsClient } from "@/lib/supabase/server";

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
