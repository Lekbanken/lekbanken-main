import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createServerRlsClient } from "@/lib/supabase/server";
import { PricingProductCard } from "../pricing-components";
import { getCategoryVisuals } from "../pricing-shared";
import type { ProductCard } from "../pricing-shared";
import {
  ChevronRightIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";

// Cache category pages for 5 minutes (same as /api/public/categories)
export const revalidate = 300;

// =============================================================================
// Types
// =============================================================================

type CategoryRow = {
  slug: string;
  name: string;
  description_short: string | null;
  icon_key: string | null;
  sort_order: number;
  bundle_product_id: string | null;
};

type BundlePrice = {
  id: string;
  amount: number;
  currency: string;
  interval: string;
};

// =============================================================================
// Data fetching
// =============================================================================

async function fetchCategoryProducts(
  categorySlug: string,
  currency: string
): Promise<ProductCard[]> {
  const supabase = await createServerRlsClient();

  const { data: products, error: prodError } = await supabase
    .from("products")
    .select("id,name,description,product_key,image_url,is_bundle")
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false)
    .eq("category_slug", categorySlug)
    .order("name", { ascending: true });

  if (prodError || !products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const { data: prices } = await supabase
    .from("product_prices")
    .select("id,product_id,amount,currency,interval,interval_count,is_default")
    .eq("active", true)
    .eq("currency", currency)
    .in("product_id", productIds);

  // Best price per product
  const bestPrice = new Map<string, { amount: number; currency: string; interval: string | null }>();
  for (const pr of prices ?? []) {
    const existing = bestPrice.get(pr.product_id);
    if (!existing || (pr.is_default && !existing) || pr.amount < existing.amount) {
      bestPrice.set(pr.product_id, {
        amount: pr.amount,
        currency: pr.currency,
        interval: pr.interval,
      });
    }
  }

  return products.map((p) => {
    const price = bestPrice.get(p.id);
    const priceLabel = price
      ? `${Math.round(price.amount / 100)} ${price.currency}` +
        (price.interval ? `/${price.interval === "year" ? "år" : "mån"}` : "")
      : "";

    const productSlug = p.product_key;

    return {
      id: p.id,
      slug: productSlug,
      name: p.name,
      price: priceLabel,
      description: p.description ?? "",
      category: categorySlug,
      categorySlug,
      imageUrl: p.image_url,
    };
  });
}

async function fetchBundlePrice(
  bundleProductId: string,
  currency: string
): Promise<BundlePrice | null> {
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from("product_prices")
    .select("id,amount,currency,interval")
    .eq("product_id", bundleProductId)
    .eq("active", true)
    .eq("currency", currency)
    .eq("interval", "year")
    .order("is_default", { ascending: false })
    .order("amount", { ascending: true })
    .limit(1)
    .single();

  if (!data) return null;
  return data as BundlePrice;
}

async function fetchGameCount(categorySlug: string): Promise<number> {
  const supabase = await createServerRlsClient();

  // Get product IDs in this category
  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("category_slug", categorySlug)
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false);

  if (!products || products.length === 0) return 0;

  const { data: games } = await supabase
    .from("games")
    .select("id")
    .in("product_id", products.map((p) => p.id))
    .eq("status", "published");

  return games?.length ?? 0;
}

// =============================================================================
// Price formatter
// =============================================================================

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount / 100);
}

// =============================================================================
// Server Component
// =============================================================================

export default async function CategoryDetail({
  category,
}: {
  category: CategoryRow;
}) {
  const currency = "SEK";
  const t = await getTranslations("marketing.pricing");

  const [products, bundlePrice, gameCount] = await Promise.all([
    fetchCategoryProducts(category.slug, currency),
    category.bundle_product_id
      ? fetchBundlePrice(category.bundle_product_id, currency)
      : Promise.resolve(null),
    fetchGameCount(category.slug),
  ]);

  const { Icon, gradient } = getCategoryVisuals(category.icon_key);

  return (
    <div className="bg-background">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8"
      >
        <ol role="list" className="flex items-center space-x-2 text-sm">
          <li>
            <Link
              href="/pricing"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {t("badge")}
            </Link>
          </li>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
          <li>
            <span className="font-medium text-foreground">{category.name}</span>
          </li>
        </ol>
      </nav>

      {/* Category Hero */}
      <header className="mx-auto max-w-7xl px-4 pt-8 pb-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div
              className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-lg`}
            >
              <Icon className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                {category.name}
              </h1>
              {category.description_short && (
                <p className="mt-2 max-w-2xl text-base text-muted-foreground">
                  {category.description_short}
                </p>
              )}
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="font-medium">
                  {products.length} {t("categoryPage.products")}
                </span>
                <span className="text-border">·</span>
                {gameCount > 0 ? (
                  <span className="font-medium">
                    {gameCount} {t("categoryPage.games")}
                  </span>
                ) : (
                  <span className="italic text-muted-foreground/60">
                    {t("categoryPage.gamesComingSoon")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Bundle CTA */}
          {category.bundle_product_id && bundlePrice && (
            <div className="flex-shrink-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:min-w-[280px]">
              <p className="text-sm font-medium text-muted-foreground">
                {t("categoryPage.bundleLabel")}
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">
                  {formatPrice(bundlePrice.amount, bundlePrice.currency)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t("categoryPage.perYear")}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("categoryPage.bundleIncludes", { count: products.length })}
              </p>
              <Link
                href={`/checkout/start?product=${category.bundle_product_id}`}
                className={`mt-4 flex w-full items-center justify-center rounded-lg bg-gradient-to-r ${gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md`}
              >
                {t("categoryPage.buyBundle")}
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Product Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <PricingProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-16 flex flex-col items-center justify-center py-20 text-center">
            <Icon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {t("noProducts")}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("noProductsDescription")}
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-12 border-t border-border pt-8">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t("categoryPage.backToAll")}
          </Link>
        </div>
      </div>
    </div>
  );
}
