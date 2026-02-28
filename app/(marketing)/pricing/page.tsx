import { getTranslations } from "next-intl/server";
import { permanentRedirect } from "next/navigation";
import { createServerRlsClient } from "@/lib/supabase/server";
import PricingCatalogClient from "./pricing-catalog-client";
import type { ProductCard, CategoryGroup } from "./pricing-components";

// =============================================================================
// Types for API/DB data
// =============================================================================

type PricingProduct = {
  id: string;
  name: string;
  description: string | null;
  product_key: string;
  product_type: string | null;
  category: string | null;
  category_slug: string | null;
  image_url: string | null;
  is_marketing_visible: boolean;
  is_bundle: boolean;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    interval: string | null;
    interval_count: number | null;
    is_default: boolean;
  }>;
};

type CategoryRow = {
  slug: string;
  name: string;
  description_short: string | null;
  icon_key: string | null;
  sort_order: number;
  bundle_product_id: string | null;
};

// =============================================================================
// Data fetching (server-side) — with pre-migration fallbacks
// =============================================================================

// Legacy fallback: synthesize CategoryRow from product.category text
const LEGACY_CATEGORY_META: Record<string, { slug: string; iconKey: string; sortOrder: number }> = {
  "specialpedagog": { slug: "specialpedagog", iconKey: "HeartIcon", sortOrder: 1 },
  "arbetsplatsen": { slug: "arbetsplatsen", iconKey: "BriefcaseIcon", sortOrder: 2 },
  "digitala aktiviteter": { slug: "digitala-aktiviteter", iconKey: "ComputerDesktopIcon", sortOrder: 3 },
  "ungdomsverksamhet": { slug: "ungdomsverksamhet", iconKey: "UsersIcon", sortOrder: 4 },
  "föräldrar": { slug: "foraldrar", iconKey: "HomeIcon", sortOrder: 5 },
  "event & högtider": { slug: "event-och-hogtider", iconKey: "CalendarDaysIcon", sortOrder: 6 },
  "festligheter": { slug: "festligheter", iconKey: "GiftIcon", sortOrder: 7 },
  "pedagoger": { slug: "pedagoger", iconKey: "AcademicCapIcon", sortOrder: 8 },
  "tränare": { slug: "tranare", iconKey: "TrophyIcon", sortOrder: 9 },
};

// Hidden legacy categories
const LEGACY_HIDDEN = new Set(["sports", "education", "family", "familie"]);

async function fetchCategories(): Promise<CategoryRow[]> {
  const supabase = await createServerRlsClient();
  const { data, error } = await supabase
    .from("categories")
    .select("slug,name,description_short,icon_key,sort_order,bundle_product_id")
    .eq("is_public", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (!error && data && data.length > 0) {
    return data as CategoryRow[];
  }

  // Pre-migration fallback: return empty (products will be grouped by legacy path)
  if (error) {
    console.warn("[pricing] categories table not available yet, using legacy fallback");
  }
  return [];
}

async function fetchProducts(currency: string) {
  const supabase = await createServerRlsClient();

  // Try new columns first; fall back to old query if they don't exist
  let { data: products, error: prodError } = await supabase
    .from("products")
    .select(
      "id,name,description,product_key,product_type,category,category_slug,image_url,is_marketing_visible,is_bundle,status"
    )
    .eq("status", "active")
    .eq("is_marketing_visible", true)
    .eq("is_bundle", false)
    .order("name", { ascending: true });

  // If the query failed (new columns don't exist yet), fall back to old query
  if (prodError) {
    console.warn("[pricing] new columns not available, using legacy product query");
    const legacy = await supabase
      .from("products")
      .select("id,name,description,product_key,product_type,category,image_url,is_bundle,status")
      .eq("status", "active")
      .eq("is_bundle", false)
      .order("name", { ascending: true });

    prodError = legacy.error;
    // Add missing fields with defaults
    products = (legacy.data ?? []).map((p) => ({
      ...p,
      category_slug: null as string | null,
      is_marketing_visible: true,
    })) as typeof products;
  }

  if (prodError) {
    console.error("[pricing] products query error", prodError);
    return [];
  }

  const productIds = (products ?? []).map((p) => p.id);

  if (productIds.length === 0) return [];

  const { data: prices, error: priceError } = await supabase
    .from("product_prices")
    .select("id,product_id,amount,currency,interval,interval_count,active,is_default")
    .eq("active", true)
    .eq("currency", currency)
    .in("product_id", productIds);

  if (priceError) {
    console.error("[pricing] prices query error", priceError);
  }

  // Map prices to products
  const pricesByProduct = new Map<string, PricingProduct["prices"]>();
  for (const pr of prices ?? []) {
    if (!pricesByProduct.has(pr.product_id)) pricesByProduct.set(pr.product_id, []);
    pricesByProduct.get(pr.product_id)!.push({
      id: pr.id,
      amount: pr.amount,
      currency: pr.currency,
      interval: pr.interval,
      interval_count: pr.interval_count,
      is_default: Boolean(pr.is_default),
    });
  }

  // Sort: default first, then cheapest
  for (const list of pricesByProduct.values()) {
    list.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.amount - b.amount;
    });
  }

  return (products ?? []).map((p) => ({
    ...p,
    prices: pricesByProduct.get(p.id) ?? [],
  })) as PricingProduct[];
}

// =============================================================================
// Translation helpers
// =============================================================================

function translateProductName(
  t: Awaited<ReturnType<typeof getTranslations<"marketing.pricing">>>,
  productKey: string | null,
  fallback: string
): string {
  if (!productKey) return fallback;
  try {
    const translated = t(`products.${productKey}.name` as Parameters<typeof t>[0]);
    if (translated.includes(`products.${productKey}`)) return fallback;
    return translated;
  } catch {
    return fallback;
  }
}

function translateProductDescription(
  t: Awaited<ReturnType<typeof getTranslations<"marketing.pricing">>>,
  productKey: string | null,
  fallback: string | null
): string {
  if (!productKey || !fallback) return fallback ?? "";
  try {
    const translated = t(`products.${productKey}.description` as Parameters<typeof t>[0]);
    if (translated.includes(`products.${productKey}`)) return fallback;
    return translated;
  } catch {
    return fallback;
  }
}

// =============================================================================
// Server Component
// =============================================================================

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // ── SEO canonical redirect: /pricing?category=<slug> → /pricing/<slug> ──
  const params = await searchParams;
  const categoryParam = typeof params.category === "string" ? params.category.trim() : null;
  if (categoryParam) {
    const supabase = await createServerRlsClient();
    const { data: match } = await supabase
      .from("categories")
      .select("slug")
      .eq("slug", categoryParam)
      .eq("is_public", true)
      .maybeSingle();
    if (match) {
      permanentRedirect(`/pricing/${match.slug}`);
    }
  }

  const currency = "SEK";
  const t = await getTranslations("marketing.pricing");

  const [categories, products] = await Promise.all([
    fetchCategories(),
    fetchProducts(currency),
  ]);

  const useLegacyGrouping = categories.length === 0;

  // Build a slug → category map from DB categories
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

  // Group products by category
  const groupMap = new Map<string, { category: CategoryRow; products: ProductCard[] }>();

  // Helper: translate category text to display name via i18n
  function translateCategory(categoryText: string): string {
    try {
      const translated = t(`categories.${categoryText}` as Parameters<typeof t>[0]);
      if (translated.includes(`categories.${categoryText}`)) return categoryText;
      return translated;
    } catch {
      return categoryText;
    }
  }

  for (const p of products) {
    let cat: CategoryRow | undefined;
    let groupKey: string;

    if (!useLegacyGrouping && p.category_slug) {
      // Post-migration: use category_slug FK
      cat = categoryBySlug.get(p.category_slug);
      if (!cat) continue;
      groupKey = cat.slug;
    } else if (useLegacyGrouping && p.category) {
      // Pre-migration fallback: synthesize category from product.category text
      const rawCat = p.category as string;
      const key = rawCat.toLowerCase();

      // Skip hidden legacy categories
      if (LEGACY_HIDDEN.has(key)) continue;

      const meta = LEGACY_CATEGORY_META[key];
      groupKey = meta?.slug ?? key.replace(/\s+/g, "-").replace(/[^\w-]/g, "");

      if (!groupMap.has(groupKey)) {
        cat = {
          slug: groupKey,
          name: translateCategory(rawCat),
          description_short: null,
          icon_key: meta?.iconKey ?? null,
          sort_order: meta?.sortOrder ?? 99,
          bundle_product_id: null,
        };
      } else {
        cat = groupMap.get(groupKey)!.category;
      }
    } else {
      continue; // No category info at all
    }

    if (!groupMap.has(groupKey!)) {
      groupMap.set(groupKey!, { category: cat!, products: [] });
    }

    const defaultPrice = p.prices.find((pr) => pr.is_default) ?? p.prices[0] ?? null;
    const priceLabel = defaultPrice
      ? `${Math.round(defaultPrice.amount / 100)} ${defaultPrice.currency}` +
        (defaultPrice.interval ? `/${defaultPrice.interval}` : "")
      : "";

    const productSlug = p.product_key;

    groupMap.get(groupKey!)!.products.push({
      id: p.id,
      slug: productSlug,
      name: translateProductName(t, p.product_key, p.name),
      price: priceLabel,
      description: translateProductDescription(t, p.product_key, p.description),
      category: cat!.name,
      categorySlug: groupKey!,
      imageUrl: p.image_url,
    });
  }

  // Convert to sorted array, ordered by category sort_order
  const groups: CategoryGroup[] = Array.from(groupMap.values())
    .sort((a, b) => a.category.sort_order - b.category.sort_order)
    .map(({ category, products: prods }) => ({
      name: category.name,
      slug: category.slug,
      iconKey: category.icon_key,
      productCount: prods.length,
      gameCount: 0, // Will be populated when games exist
      products: prods,
    }));

  return (
    <div className="bg-background">
      <div className="py-8 sm:py-12 xl:mx-auto xl:max-w-7xl xl:px-8">
        {/* Header */}
        <header className="space-y-4 px-4 sm:px-6 lg:px-8 xl:px-0">
          <p className="text-sm font-semibold uppercase tracking-[0.15em] text-primary">
            {t("badge")}
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {t("title")}
          </h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            {t("description")}
          </p>
        </header>

        {/* Client-side interactive catalog */}
        <PricingCatalogClient
          groups={groups}
          labels={{
            allCategories: t("allCategories"),
            viewAll: t("viewAll"),
            noProducts: t("noProducts"),
            noProductsDescription: t("noProductsDescription"),
          }}
        />
      </div>
    </div>
  );
}
