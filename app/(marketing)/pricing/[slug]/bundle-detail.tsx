import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createServerRlsClient } from "@/lib/supabase/server";
import { detectCurrency } from "../pricing-server";
import { PricingProductCard } from "../pricing-components";
import { getCategoryVisuals } from "../pricing-shared";
import type { ProductCard } from "../pricing-shared";
import StickyMobileCTA from "./sticky-mobile-cta";
import {
  ChevronRightIcon,
  ArrowLeftIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  SparklesIcon,
  UsersIcon,
  CubeTransparentIcon,
  ClockIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";

// Cache for 5 minutes
export const revalidate = 300;

// =============================================================================
// Types
// =============================================================================

type BundlePageProps = {
  bundle: {
    id: string;
    name: string;
    description: string | null;
    customer_description: string | null;
    product_key: string;
    category_slug: string | null;
  };
  category: {
    slug: string;
    name: string;
    icon_key: string | null;
    bundle_product_id: string | null;
  };
};

// =============================================================================
// Data fetching (SSR)
// =============================================================================

async function fetchIncludedProducts(
  categorySlug: string,
  currency: string
): Promise<ProductCard[]> {
  const supabase = await createServerRlsClient();

  const { data: products, error } = await supabase
    .from("products")
    .select("id,name,description,product_key,image_url,is_bundle")
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false)
    .eq("category_slug", categorySlug)
    .order("name", { ascending: true });

  if (error || !products || products.length === 0) return [];

  const productIds = products.map((p) => p.id);

  const { data: prices } = await supabase
    .from("product_prices")
    .select("id,product_id,amount,currency,interval,interval_count,is_default")
    .eq("active", true)
    .eq("currency", currency)
    .in("product_id", productIds);

  const bestPrice = new Map<
    string,
    { amount: number; currency: string; interval: string | null }
  >();
  for (const pr of prices ?? []) {
    const existing = bestPrice.get(pr.product_id);
    if (
      !existing ||
      (pr.is_default && !existing) ||
      pr.amount < existing.amount
    ) {
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
        (price.interval
          ? `/${price.interval === "year" ? "år" : "mån"}`
          : "")
      : "";

    return {
      id: p.id,
      slug: p.product_key,
      name: p.name,
      price: priceLabel,
      description: p.description ?? "",
      category: categorySlug,
      categorySlug,
      imageUrl: p.image_url,
    };
  });
}

async function fetchBundleYearlyPrice(
  bundleProductId: string,
  currency: string
): Promise<{ amount: number; currency: string } | null> {
  const supabase = await createServerRlsClient();
  const { data } = await supabase
    .from("product_prices")
    .select("amount,currency")
    .eq("product_id", bundleProductId)
    .eq("active", true)
    .eq("currency", currency)
    .eq("interval", "year")
    .order("is_default", { ascending: false })
    .order("amount", { ascending: true })
    .limit(1)
    .single();

  return data ?? null;
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

async function fetchGameCount(categorySlug: string): Promise<number> {
  const supabase = await createServerRlsClient();

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
    .in(
      "product_id",
      products.map((p) => p.id)
    )
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

export default async function BundleDetail({
  bundle,
  category,
}: BundlePageProps) {
  const currency = await detectCurrency(bundle.id);
  const t = await getTranslations("marketing.pricing");

  const [products, bundlePrice, individualSum, gameCount] = await Promise.all([
    fetchIncludedProducts(category.slug, currency),
    fetchBundleYearlyPrice(bundle.id, currency),
    fetchIndividualYearlySum(category.slug, currency),
    fetchGameCount(category.slug),
  ]);

  // Calculate savings
  const allProductsPriced =
    products.length > 0 && individualSum.pricedCount === products.length;
  const savingsPct =
    bundlePrice &&
    allProductsPriced &&
    individualSum.sum > 0 &&
    bundlePrice.amount < individualSum.sum
      ? Math.round((1 - bundlePrice.amount / individualSum.sum) * 100)
      : null;
  const savingsAmount =
    savingsPct != null && savingsPct > 0
      ? individualSum.sum - bundlePrice!.amount
      : null;

  const { Icon, gradient } = getCategoryVisuals(category.icon_key);

  const checkoutHref = `/checkout/start?product=${bundle.id}`;

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
            <Link
              href={`/pricing/${category.slug}`}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {category.name}
            </Link>
          </li>
          <ChevronRightIcon className="h-4 w-4 text-muted-foreground/50" />
          <li>
            <span className="font-medium text-foreground">{bundle.name}</span>
          </li>
        </ol>
      </nav>

      {/* ================================================================= */}
      {/* Hero Section — full-width gradient banner                         */}
      {/* ================================================================= */}
      <header className="mt-6">
        <div
          className={`bg-gradient-to-br ${gradient} mx-4 rounded-3xl px-6 py-12 sm:mx-6 sm:px-10 sm:py-16 lg:mx-8`}
        >
          <div className="mx-auto max-w-5xl">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              {/* Left: Bundle info */}
              <div className="flex-1 text-white">
                {/* Category badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-sm font-medium backdrop-blur-sm">
                  <Icon className="h-4 w-4" />
                  {category.name}
                </span>

                <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
                  {bundle.name}
                </h1>

                {bundle.customer_description && (
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90">
                    {bundle.customer_description}
                  </p>
                )}
                {!bundle.customer_description && bundle.description && (
                  <p className="mt-4 max-w-xl text-lg leading-relaxed text-white/90">
                    {bundle.description}
                  </p>
                )}

                {/* Stat pills */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                    <CubeTransparentIcon className="h-4 w-4" />
                    {products.length} {t("bundlePage.licenses")}
                  </span>
                  {gameCount > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                      <SparklesIcon className="h-4 w-4" />
                      {gameCount} {t("bundlePage.games")}
                    </span>
                  )}
                  {savingsPct != null && savingsPct > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white/30 px-3 py-1.5 text-sm font-bold backdrop-blur-sm">
                      {t("categoryPage.saveBadge", { percent: savingsPct })}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Price card */}
              {bundlePrice && (
                <div className="flex-shrink-0 rounded-2xl bg-white/95 p-6 shadow-2xl backdrop-blur-sm sm:min-w-[300px] lg:max-w-[360px]">
                  <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("bundlePage.bundlePrice")}
                  </p>

                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-foreground">
                      {formatPrice(bundlePrice.amount, bundlePrice.currency)}
                    </span>
                    <span className="text-base text-muted-foreground">
                      {t("categoryPage.perYear")}
                    </span>
                  </div>

                  {/* Value snapshot */}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {products.length} {t("bundlePage.licenses")}
                    {gameCount > 0 && (
                      <> &bull; {gameCount} {t("bundlePage.games")}</>
                    )}
                    {savingsAmount != null && (
                      <> &bull; {t("categoryPage.saveAbsolute", {
                        amount: formatPrice(savingsAmount, bundlePrice.currency),
                        period: t("categoryPage.perYear"),
                      })}</>
                    )}
                  </p>

                  {/* Strikethrough + absolute savings */}
                  {allProductsPriced &&
                    individualSum.sum > bundlePrice.amount && (
                      <div className="mt-2">
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
                              amount: formatPrice(
                                savingsAmount,
                                bundlePrice.currency
                              ),
                              period: t("categoryPage.perYear"),
                            })}
                            {" "}
                            <span className="font-normal text-muted-foreground">
                              ({savingsPct}%)
                            </span>
                          </p>
                        )}
                      </div>
                    )}

                  {/* CTA */}
                  <div id="sticky-sentinel" className="mt-5 space-y-2.5">
                    <Link
                      href={checkoutHref}
                      className={`flex w-full flex-col items-center justify-center rounded-xl bg-gradient-to-r ${gradient} px-5 py-3 text-white shadow-md transition-all hover:shadow-lg hover:scale-[1.02]`}
                    >
                      <span className="text-base font-bold">{t("bundlePage.buyNow")}</span>
                      <span className="text-xs font-normal text-white/80">
                        {t("bundlePage.ctaSubtext")}
                      </span>
                    </Link>
                    <a
                      href="#whats-included"
                      className="flex w-full items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      {t("bundlePage.seeContents")}
                    </a>
                  </div>

                  {/* Trust pills */}
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <ShieldCheckIcon aria-hidden="true" className="h-3.5 w-3.5" />
                      {t("bundlePage.guarantee")}
                    </span>
                    <span aria-hidden="true" className="text-border">|</span>
                    <span className="inline-flex items-center gap-1">
                      <ClockIcon aria-hidden="true" className="h-3.5 w-3.5" />
                      {t("bundlePage.noCommitment")}
                    </span>
                    <span aria-hidden="true" className="text-border">|</span>
                    <span className="inline-flex items-center gap-1">
                      <BoltIcon aria-hidden="true" className="h-3.5 w-3.5" />
                      {t("bundlePage.instantAccess")}
                    </span>
                  </div>

                  {/* Pricing clarification */}
                  <p className="mt-2 text-center text-[11px] text-muted-foreground/70">
                    {t("bundlePage.pricingNote")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ================================================================= */}
      {/* Proof Block — quick-scan summary directly below hero              */}
      {/* ================================================================= */}
      <section className="mx-auto mt-8 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-foreground">{products.length}</p>
            <p className="text-xs text-muted-foreground">{t("bundlePage.proofLicenses")}</p>
          </div>
          {gameCount > 0 && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
              <p className="text-2xl font-extrabold text-foreground">{gameCount}</p>
              <p className="text-xs text-muted-foreground">{t("bundlePage.proofGames")}</p>
            </div>
          )}
          {savingsAmount != null && bundlePrice && (
            <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-2xl font-extrabold text-green-700">
                {formatPrice(savingsAmount, bundlePrice.currency)}
              </p>
              <p className="text-xs text-green-600">{t("bundlePage.proofSavings")}</p>
            </div>
          )}
          <div className="rounded-xl border border-border bg-card px-4 py-3 text-center">
            <p className="text-2xl font-extrabold text-foreground">1</p>
            <p className="text-xs text-muted-foreground">{t("bundlePage.proofSubscription")}</p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Savings Breakdown (expandable)                                    */}
      {/* ================================================================= */}
      {allProductsPriced &&
        bundlePrice &&
        individualSum.sum > bundlePrice.amount && (
          <section className="mx-auto mt-10 max-w-7xl px-4 sm:px-6 lg:px-8">
            <details className="group rounded-2xl border border-border bg-card p-5">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
                <ChevronRightIcon className="h-4 w-4 transition-transform group-open:rotate-90" />
                {t("bundlePage.savingsBreakdownTitle")}
              </summary>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                  <span className="text-muted-foreground">
                    {t("bundlePage.individualPrice", {
                      count: products.length,
                    })}
                  </span>
                  <span className="font-medium line-through decoration-muted-foreground/50">
                    {formatPrice(individualSum.sum, bundlePrice.currency)}
                    {t("categoryPage.perYear")}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                  <span className="text-muted-foreground">
                    {t("bundlePage.bundlePriceLabel")}
                  </span>
                  <span className="font-bold text-foreground">
                    {formatPrice(bundlePrice.amount, bundlePrice.currency)}
                    {t("categoryPage.perYear")}
                  </span>
                </div>
                {savingsAmount != null && (
                  <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-2.5">
                    <span className="font-semibold text-green-700">
                      {t("bundlePage.youSave")}
                    </span>
                    <span className="font-bold text-green-700">
                      {formatPrice(savingsAmount, bundlePrice.currency)}
                      {t("categoryPage.perYear")} ({savingsPct}%)
                    </span>
                  </div>
                )}
              </div>
            </details>
          </section>
        )}

      {/* ================================================================= */}
      {/* What's Included                                                   */}
      {/* ================================================================= */}
      <section id="whats-included" className="mx-auto mt-12 max-w-7xl scroll-mt-24 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-foreground">
            {t("bundlePage.whatsIncluded")}
          </h2>
          <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-sm font-medium text-primary">
            {products.length} {t("bundlePage.licenses")}
          </span>
        </div>
        <p className="mt-2 text-muted-foreground">
          {t("bundlePage.whatsIncludedDescription", {
            category: category.name,
          })}
        </p>

        {products.length > 0 ? (
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {products.map((product) => (
              <PricingProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 text-center">
            <CubeTransparentIcon className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-3 text-sm text-muted-foreground">
              {t("noProducts")}
            </p>
          </div>
        )}
      </section>

      {/* ================================================================= */}
      {/* Value Props                                                       */}
      {/* ================================================================= */}
      <section className="mx-auto mt-16 max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-6">
            <div
              className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-2.5`}
            >
              <CubeTransparentIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {t("bundlePage.valueProp1Title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("bundlePage.valueProp1Description", {
                count: products.length,
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div
              className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-2.5`}
            >
              <UsersIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {t("bundlePage.valueProp2Title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("bundlePage.valueProp2Description")}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <div
              className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${gradient} p-2.5`}
            >
              <CheckCircleIcon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              {t("bundlePage.valueProp3Title")}
            </h3>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {t("bundlePage.valueProp3Description")}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================================= */}
      {/* Bottom CTA                                                        */}
      {/* ================================================================= */}
      {bundlePrice && (
        <section className="mx-auto mt-16 max-w-3xl px-4 pb-24 text-center sm:px-6 lg:px-8 lg:pb-16">
          <h2 className="text-2xl font-bold text-foreground">
            {t("bundlePage.bottomCtaTitle")}
          </h2>
          {savingsAmount != null && (
            <p className="mt-2 text-lg text-green-600 font-semibold">
              {t("categoryPage.saveAbsolute", {
                amount: formatPrice(savingsAmount, bundlePrice.currency),
                period: t("categoryPage.perYear"),
              })}
            </p>
          )}
          <Link
            href={checkoutHref}
            className={`mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r ${gradient} px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:shadow-xl hover:scale-[1.02]`}
          >
            {t("bundlePage.buyNow")} –{" "}
            {formatPrice(bundlePrice.amount, bundlePrice.currency)}
            {t("categoryPage.perYear")}
          </Link>
        </section>
      )}

      {/* Back link */}
      <div className="mx-auto max-w-7xl border-t border-border px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={`/pricing/${category.slug}#licenses`}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          {t("bundlePage.backToCategory", { category: category.name })}
        </Link>
      </div>

      {/* Sticky mobile CTA */}
      {bundlePrice && (
        <StickyMobileCTA
          priceLabel={formatPrice(bundlePrice.amount, bundlePrice.currency)}
          savingsPercent={savingsPct}
          savingsLabel={
            savingsAmount != null
              ? t("categoryPage.saveAbsolute", {
                  amount: formatPrice(savingsAmount, bundlePrice.currency),
                  period: t("categoryPage.perYear"),
                })
              : undefined
          }
          ctaLabel={t("bundlePage.buyNow")}
          ctaHref={checkoutHref}
          secondaryLabel={t("bundlePage.seeContents")}
          secondaryHref="#whats-included"
          gradient={gradient}
        />
      )}
    </div>
  );
}
