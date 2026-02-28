import { createServerRlsClient } from "@/lib/supabase/server";
import CategoryDetail from "./category-detail";
import ProductDetailClient from "./product-detail-client";
import type { CrossSellData } from "./product-detail-client";

// =============================================================================
// Dynamic [slug] page — resolves to category or product detail
//
// 1. Check if slug matches a public category → render CategoryDetail (SSR)
// 2. Otherwise → render ProductDetailClient (CSR, existing behavior)
// =============================================================================

type PageProps = {
  params: Promise<{ slug: string }>;
};

// -----------------------------------------------------------------------------
// Helper: resolve cross-sell data for a product slug (server-side)
// -----------------------------------------------------------------------------

async function resolveCrossSell(
  productSlug: string
): Promise<CrossSellData | null> {
  const supabase = await createServerRlsClient();

  // 1. Find the product's category
  const { data: product } = await supabase
    .from("products")
    .select("id,category_slug")
    .eq("product_key", productSlug)
    .eq("status", "active")
    .eq("is_bundle", false)
    .maybeSingle();

  if (!product?.category_slug) return null;

  // 2. Find the category (must be public + have a bundle)
  const { data: category } = await supabase
    .from("categories")
    .select("slug,name,icon_key,bundle_product_id")
    .eq("slug", product.category_slug)
    .eq("is_public", true)
    .not("bundle_product_id", "is", null)
    .maybeSingle();

  if (!category?.bundle_product_id) return null;

  // 3. Bundle yearly price
  const { data: bundlePrice } = await supabase
    .from("product_prices")
    .select("amount,currency")
    .eq("product_id", category.bundle_product_id)
    .eq("active", true)
    .eq("currency", "SEK")
    .eq("interval", "year")
    .order("is_default", { ascending: false })
    .order("amount", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!bundlePrice) return null;

  // 4. Sum of individual yearly prices for ALL products in category
  const { data: catProducts } = await supabase
    .from("products")
    .select("id")
    .eq("category_slug", product.category_slug)
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false);

  if (!catProducts || catProducts.length === 0) return null;

  const { data: prices } = await supabase
    .from("product_prices")
    .select("product_id,amount")
    .eq("active", true)
    .eq("currency", "SEK")
    .eq("interval", "year")
    .in(
      "product_id",
      catProducts.map((p) => p.id)
    )
    .order("is_default", { ascending: false })
    .order("amount", { ascending: true });

  // Best yearly price per product
  const bestYearly = new Map<string, number>();
  for (const pr of prices ?? []) {
    if (!bestYearly.has(pr.product_id)) {
      bestYearly.set(pr.product_id, pr.amount);
    }
  }

  // Only show savings when ALL products have prices
  const allPriced = bestYearly.size === catProducts.length;
  let sum = 0;
  for (const amount of bestYearly.values()) sum += amount;

  const savingsPercent =
    allPriced && sum > 0 && bundlePrice.amount < sum
      ? Math.round((1 - bundlePrice.amount / sum) * 100)
      : null;

  const formatted = new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: bundlePrice.currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(bundlePrice.amount / 100);

  return {
    categoryName: category.name,
    categorySlug: category.slug,
    savingsPercent,
    bundlePriceFormatted: `${formatted}/år`,
    productCount: catProducts.length,
  };
}

export default async function PricingSlugPage({ params }: PageProps) {
  const { slug } = await params;

  // Try to resolve as a category first (cheap single-row lookup).
  // maybeSingle avoids a PostgREST 406 error when no row matches.
  const supabase = await createServerRlsClient();
  const { data: category } = await supabase
    .from("categories")
    .select("slug,name,description_short,icon_key,sort_order,bundle_product_id")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (category) {
    return <CategoryDetail category={category} />;
  }

  // Fall through to product detail (client-side lookup)
  const crossSell = await resolveCrossSell(slug);
  return <ProductDetailClient slug={slug} crossSell={crossSell} />;
}
