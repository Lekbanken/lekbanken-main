import { redirect, notFound } from "next/navigation";
import { createServerRlsClient } from "@/lib/supabase/server";
import CategoryDetail from "./category-detail";

// =============================================================================
// Dynamic [slug] page — canonical page is the category detail.
//
// 1. slug matches a public category → render CategoryDetail (SSR)
// 2. slug matches a bundle product → 308 redirect to /pricing/[category.slug]
// 3. slug matches an individual product → 308 redirect to /pricing/[category.slug]
// 4. No match → 404
// =============================================================================

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PricingSlugPage({ params }: PageProps) {
  const { slug } = await params;

  const supabase = await createServerRlsClient();

  // 1. Try to resolve as a category (cheapest check)
  const { data: category } = await supabase
    .from("categories")
    .select("slug,name,description_short,icon_key,sort_order,bundle_product_id")
    .eq("slug", slug)
    .eq("is_public", true)
    .maybeSingle();

  if (category) {
    return <CategoryDetail category={category} />;
  }

  // 2. Try to resolve as a bundle product → redirect to its category
  const { data: bundleProduct } = await supabase
    .from("products")
    .select("category_slug")
    .eq("product_key", slug)
    .eq("is_bundle", true)
    .eq("status", "active")
    .maybeSingle();

  if (bundleProduct?.category_slug) {
    redirect(`/pricing/${bundleProduct.category_slug}`);
  }

  // 3. Try to resolve as an individual product → redirect to its category
  const { data: product } = await supabase
    .from("products")
    .select("category_slug")
    .eq("product_key", slug)
    .eq("is_bundle", false)
    .eq("status", "active")
    .maybeSingle();

  if (product?.category_slug) {
    redirect(`/pricing/${product.category_slug}`);
  }

  // 4. No match — Next.js will render the not-found page
  notFound();
}
