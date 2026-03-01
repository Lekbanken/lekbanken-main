import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createServerRlsClient } from "@/lib/supabase/server";
import { PricingProductCard } from "../pricing-components";
import { getCategoryVisuals } from "../pricing-shared";
import type { ProductCard } from "../pricing-shared";
import StickyMobileCTA from "./sticky-mobile-cta";
import {
  ChevronRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
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

async function fetchIndividualYearlySum(
  categorySlug: string,
  currency: string
): Promise<{ sum: number; pricedCount: number }> {
  const supabase = await createServerRlsClient();

  const { data: products } = await supabase
    .from("products")
    .select("id")
    .eq("category_slug", categorySlug)
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false);

  if (!products || products.length === 0) return { sum: 0, pricedCount: 0 };

  const { data: prices } = await supabase
    .from("product_prices")
    .select("product_id,amount")
    .eq("active", true)
    .eq("currency", currency)
    .eq("interval", "year")
    .in(
      "product_id",
      products.map((p) => p.id)
    )
    .order("is_default", { ascending: false })
    .order("amount", { ascending: true });

  if (!prices || prices.length === 0) return { sum: 0, pricedCount: 0 };

  // Best yearly price per product (first hit = default-preferred, cheapest)
  const bestYearly = new Map<string, number>();
  for (const pr of prices) {
    if (!bestYearly.has(pr.product_id)) {
      bestYearly.set(pr.product_id, pr.amount);
    }
  }

  let sum = 0;
  for (const amount of bestYearly.values()) sum += amount;

  return { sum, pricedCount: bestYearly.size };
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

  const [products, bundlePrice, gameCount, individualSum] = await Promise.all([
    fetchCategoryProducts(category.slug, currency),
    category.bundle_product_id
      ? fetchBundlePrice(category.bundle_product_id, currency)
      : Promise.resolve(null),
    fetchGameCount(category.slug),
    category.bundle_product_id
      ? fetchIndividualYearlySum(category.slug, currency)
      : Promise.resolve({ sum: 0, pricedCount: 0 }),
  ]);

  // Calculate savings percentage
  // Only show when ALL products have yearly prices (prevents misleading partial data)
  const allProductsPriced = individualSum.pricedCount === products.length;
  const savingsPct =
    bundlePrice &&
    allProductsPriced &&
    individualSum.sum > 0 &&
    bundlePrice.amount < individualSum.sum
      ? Math.round((1 - bundlePrice.amount / individualSum.sum) * 100)
      : null;

  // Absolute savings in the same currency (amount in cents)
  const savingsAmount =
    savingsPct != null && savingsPct > 0
      ? individualSum.sum - bundlePrice!.amount
      : null;

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

      {/* Category Sales Hero */}
      <header className="mx-auto max-w-7xl px-4 pt-8 pb-10 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          {/* Left: Category info + stat chips */}
          <div className="flex-1">
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
                  <p className="mt-2 max-w-xl text-lg leading-relaxed text-muted-foreground">
                    {category.description_short}
                  </p>
                )}
              </div>
            </div>

            {/* Stat chips */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground">
                {products.length} {t("categoryPage.products")}
              </span>
              {gameCount > 0 ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3.5 py-1.5 text-sm font-medium text-foreground">
                  {gameCount} {t("categoryPage.games")}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted/60 px-3.5 py-1.5 text-sm italic text-muted-foreground">
                  {t("categoryPage.gamesComingSoon")}
                </span>
              )}
            </div>

            {/* Feature list (when bundle exists) */}
            {category.bundle_product_id && bundlePrice && (
              <ul className="mt-6 space-y-2">
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                  {t("categoryPage.bundleIncludes", {
                    count: products.length,
                  })}
                </li>
                {gameCount > 0 && (
                  <li className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                    {t("categoryPage.gamesIncluded", { count: gameCount })}
                  </li>
                )}
                <li className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircleIcon className="h-5 w-5 flex-shrink-0 text-primary" />
                  {t("categoryPage.singleLicense")}
                </li>
              </ul>
            )}
          </div>

          {/* Right: Bundle Sales Card */}
          {category.bundle_product_id && bundlePrice && (
            <div className="flex-shrink-0 overflow-hidden rounded-2xl border-2 border-primary/20 bg-card shadow-lg sm:min-w-[320px] lg:max-w-[380px]">
              {/* Savings badge banner */}
              {savingsPct != null && savingsPct > 0 && savingsAmount != null && (
                <div
                  className={`bg-gradient-to-r ${gradient} px-5 py-2.5 text-center`}
                >
                  <span className="text-sm font-bold tracking-wide text-white">
                    {t("categoryPage.saveAbsolute", {
                      amount: formatPrice(savingsAmount, bundlePrice!.currency),
                    })}
                  </span>
                </div>
              )}

              <div className="p-6">
                <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("categoryPage.bundleLabel")}
                </p>

                {/* Price display */}
                <div className="mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-foreground">
                      {formatPrice(
                        bundlePrice.amount,
                        bundlePrice.currency
                      )}
                    </span>
                    <span className="text-base text-muted-foreground">
                      {t("categoryPage.perYear")}
                    </span>
                  </div>

                  {/* Strikethrough individual sum — only when all products have prices */}
                  {allProductsPriced &&
                    individualSum.sum > 0 &&
                    individualSum.sum > bundlePrice.amount && (
                      <div className="mt-1.5">
                        <p className="text-sm text-muted-foreground">
                          <span className="line-through decoration-muted-foreground/50">
                            {formatPrice(
                              individualSum.sum,
                              bundlePrice.currency
                            )}
                          </span>{" "}
                          {t("categoryPage.individualTotal")}
                        </p>
                        {savingsAmount != null && (
                          <p className="mt-1 text-sm font-semibold text-green-600">
                            {t("categoryPage.saveAbsolute", {
                              amount: formatPrice(savingsAmount, bundlePrice.currency),
                            })}
                            {" "}
                            <span className="font-normal text-muted-foreground">
                              ({savingsPct}%)
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                </div>

                {/* Value snapshot */}
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                    {t("categoryPage.licensesIncluded", {
                      count: products.length,
                    })}
                  </li>
                  {gameCount > 0 && (
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                      {t("categoryPage.gamesIncluded", {
                        count: gameCount,
                      })}
                    </li>
                  )}
                  {savingsPct != null && savingsPct > 0 && savingsAmount != null && (
                    <li className="flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 flex-shrink-0 text-primary" />
                      {t("categoryPage.saveAbsolute", {
                        amount: formatPrice(savingsAmount, bundlePrice.currency),
                      })}
                    </li>
                  )}
                </ul>

                {/* Primary CTA */}
                <div id="sticky-sentinel">
                  <Link
                    href={`/checkout/start?product=${category.bundle_product_id}`}
                    className={`mt-5 flex w-full items-center justify-center rounded-xl bg-gradient-to-r ${gradient} px-5 py-3 text-base font-bold text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]`}
                  >
                    {t("categoryPage.buyBundle")}
                  </Link>
                </div>

                {/* Secondary CTA — scroll to grid */}
                <a
                  href="#licenses"
                  className="mt-2.5 flex w-full items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  {t("categoryPage.seeLicenses")}
                </a>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Product Grid */}
      <div
        id="licenses"
        className="mx-auto max-w-7xl scroll-mt-8 px-4 pb-16 sm:px-6 lg:px-8"
      >
        {products.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-5 pb-20 lg:pb-0 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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

      {/* Sticky mobile CTA (bundle only) */}
      {category.bundle_product_id && bundlePrice && (
        <StickyMobileCTA
          priceLabel={formatPrice(bundlePrice.amount, bundlePrice.currency)}
          savingsPercent={savingsPct}
          savingsLabel={
            savingsAmount != null
              ? t("categoryPage.saveAbsolute", {
                  amount: formatPrice(savingsAmount, bundlePrice.currency),
                })
              : undefined
          }
          ctaLabel={t("categoryPage.buyBundle")}
          ctaHref={`/checkout/start?product=${category.bundle_product_id}`}
          secondaryLabel={t("categoryPage.seeLicenses")}
          secondaryHref="#licenses"
          gradient={gradient}
        />
      )}
    </div>
  );
}
