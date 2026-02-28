import { createServerRlsClient } from "@/lib/supabase/server";
import CategoryDetail from "./category-detail";
import ProductDetailClient from "./product-detail-client";

// =============================================================================
// Dynamic [slug] page — resolves to category or product detail
//
// 1. Check if slug matches a public category → render CategoryDetail (SSR)
// 2. Otherwise → render ProductDetailClient (CSR, existing behavior)
// =============================================================================

type PageProps = {
  params: Promise<{ slug: string }>;
};

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
  return <ProductDetailClient slug={slug} />;
}
