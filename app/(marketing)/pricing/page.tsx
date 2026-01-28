"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import {
  AcademicCapIcon,
  UserGroupIcon,
  SparklesIcon,
  HeartIcon,
  TrophyIcon,
  HomeIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  UsersIcon,
  CakeIcon,
  CalendarDaysIcon,
  GiftIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";

// =============================================================================
// Translation Helper Types
// =============================================================================

type TranslateFunction = ReturnType<typeof useTranslations<"marketing.pricing">>;

// =============================================================================
// Types
// =============================================================================

type PricingApiProduct = {
  id: string;
  name: string;
  description: string | null;
  product_key: string | null;
  product_type: string | null;
  category: string | null;
  image_url: string | null;
  prices: Array<{
    id: string;
    amount: number;
    currency: string;
    interval: string | null;
    interval_count: number | null;
    is_default: boolean;
  }>;
};

type PricingApiResponse = {
  currency: string;
  products: PricingApiProduct[];
};

type ProductCard = {
  id: string;
  slug: string;
  name: string;
  price: string;
  description: string;
  category: string;
  categoryKey: string; // Original category key for icon lookup
  imageUrl: string | null;
};

type CategoryGroup = {
  name: string;
  categoryKey: string; // Original category key
  products: ProductCard[];
};

// =============================================================================
// Category Icons & Colors (keyed by original database category)
// =============================================================================

const CATEGORY_CONFIG: Record<string, { icon: typeof AcademicCapIcon; gradient: string }> = {
  // Actual database category values from seed-product-taxonomy.ts
  "specialpedagog": { icon: HeartIcon, gradient: "from-purple-400 to-violet-500" },
  "arbetsplatsen": { icon: BriefcaseIcon, gradient: "from-slate-400 to-gray-600" },
  "digitala aktiviteter": { icon: ComputerDesktopIcon, gradient: "from-cyan-400 to-blue-500" },
  "ungdomsverksamhet": { icon: UsersIcon, gradient: "from-orange-400 to-red-500" },
  "föräldrar": { icon: HomeIcon, gradient: "from-green-400 to-emerald-500" },
  "event & högtider": { icon: CalendarDaysIcon, gradient: "from-indigo-400 to-purple-500" },
  "festligheter": { icon: GiftIcon, gradient: "from-pink-400 to-rose-500" },
  "pedagoger": { icon: AcademicCapIcon, gradient: "from-blue-400 to-indigo-500" },
  "tränare": { icon: TrophyIcon, gradient: "from-amber-400 to-orange-500" },
  // Familie shown on screenshot (Norwegian for Family)
  "familie": { icon: HomeIcon, gradient: "from-green-400 to-emerald-500" },
  // Legacy categories from initial_schema.sql seed data
  "sports": { icon: TrophyIcon, gradient: "from-amber-400 to-orange-500" },
  "education": { icon: AcademicCapIcon, gradient: "from-blue-400 to-indigo-500" },
  "family": { icon: HomeIcon, gradient: "from-green-400 to-emerald-500" },
  // Fallback
  "other": { icon: SparklesIcon, gradient: "from-primary to-[#00c7b0]" },
  "default": { icon: SparklesIcon, gradient: "from-primary to-[#00c7b0]" },
};

function getCategoryConfig(categoryKey: string) {
  const key = categoryKey.toLowerCase();
  return CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG["default"];
}

// =============================================================================
// Product Card Component
// =============================================================================

function ProductCard({ product }: { product: ProductCard }) {
  const config = getCategoryConfig(product.categoryKey);
  const Icon = config.icon;

  return (
    <Link
      href={`/pricing/${product.slug}`}
      className="group relative flex h-80 w-56 flex-shrink-0 flex-col overflow-hidden rounded-2xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl xl:w-auto"
    >
      {/* Background - Image or Gradient */}
      <span aria-hidden="true" className="absolute inset-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 224px, 280px"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${config.gradient}`}>
            <div className="flex h-full items-center justify-center">
              <Icon className="h-20 w-20 text-white/30" />
            </div>
          </div>
        )}
      </span>

      {/* Gradient overlay for text readability */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-transparent"
      />

      {/* Price badge */}
      {product.price && (
        <span className="absolute right-3 top-3 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-gray-900 shadow-sm backdrop-blur-sm">
          {product.price}
        </span>
      )}

      {/* Content */}
      <span className="relative mt-auto flex flex-col p-5">
        <span className="text-lg font-bold text-white drop-shadow-sm">
          {product.name}
        </span>
        {product.description && (
          <span className="mt-1 line-clamp-2 text-sm text-white/80">
            {product.description}
          </span>
        )}
      </span>
    </Link>
  );
}

// =============================================================================
// Category Section Component
// =============================================================================

function CategorySection({
  category,
  categoryKey,
  products,
  t,
}: {
  category: string;
  categoryKey: string;
  products: ProductCard[];
  t: ReturnType<typeof useTranslations<"marketing.pricing">>;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const config = getCategoryConfig(categoryKey);
  const Icon = config.icon;

  return (
    <section className="py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.gradient}`}>
            <Icon className="h-5 w-5 text-white" />
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {category}
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {products.length}
          </span>
        </div>
        <Link
          href={`#${category.toLowerCase().replace(/\s+/g, "-")}`}
          className="hidden text-sm font-semibold text-primary hover:text-primary/80 sm:flex sm:items-center"
        >
          {t("viewAll")}
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="mt-4 flow-root">
        <div className="-my-2">
          <div
            ref={scrollRef}
            className="box-content overflow-x-auto py-2 xl:overflow-visible"
          >
            {/* Mobile: horizontal scroll, Desktop: grid that wraps */}
            <div className="flex space-x-4 px-4 sm:px-6 lg:px-0 xl:grid xl:grid-cols-5 xl:gap-4 xl:space-x-0">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile "View All" link */}
      <div className="mt-4 px-4 sm:hidden">
        <Link
          href={`#${category.toLowerCase().replace(/\s+/g, "-")}`}
          className="flex items-center text-sm font-semibold text-primary hover:text-primary/80"
        >
          {t("viewAll")}
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

// =============================================================================
// Category Filter Tabs (Mobile)
// =============================================================================

function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
}: {
  categories: Array<{ name: string; categoryKey: string }>;
  activeCategory: string | null;
  onSelect: (category: string | null) => void;
}) {
  const t = useTranslations("marketing.pricing");

  return (
    <div className="sticky top-0 z-10 -mx-4 bg-background/95 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6 lg:hidden">
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        <button
          onClick={() => onSelect(null)}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          {t("allCategories")}
        </button>
        {categories.map((cat) => {
          const config = getCategoryConfig(cat.categoryKey);
          const Icon = config.icon;
          return (
            <button
              key={cat.name}
              onClick={() => onSelect(cat.name)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.name
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              <Icon className="h-4 w-4" />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-12">
      {[1, 2, 3].map((section) => (
        <div key={section} className="animate-pulse">
          <div className="flex items-center gap-3 px-4 sm:px-6 lg:px-0">
            <div className="h-10 w-10 rounded-xl bg-muted" />
            <div className="h-6 w-32 rounded bg-muted" />
          </div>
          <div className="mt-4 flex gap-4 overflow-hidden px-4 sm:px-6 lg:px-0">
            {[1, 2, 3, 4, 5].map((card) => (
              <div
                key={card}
                className="h-80 w-56 flex-shrink-0 rounded-2xl bg-muted xl:w-auto xl:flex-1"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Page Component
// =============================================================================

export default function PricingPage() {
  const t = useTranslations("marketing.pricing");
  const [pricing, setPricing] = useState<PricingApiResponse | null>(null);
  const [pricingError, setPricingError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        setIsLoading(true);
        const res = await fetch("/api/public/pricing?currency=SEK", {
          headers: { accept: "application/json" },
        });
        if (!res.ok) throw new Error(`pricing api failed: ${res.status}`);
        const json = (await res.json()) as PricingApiResponse;
        if (!active) return;
        setPricing(json);
      } catch (err) {
        if (!active) return;
        setPricingError(err instanceof Error ? err.message : "Failed to load pricing");
        setPricing(null);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  // Translation helper functions
  const getTranslatedProductName = useCallback((productKey: string | null, fallbackName: string): string => {
    if (!productKey) return fallbackName;
    try {
      // Try to get translated name, fall back to database name
      const translatedName = t(`products.${productKey}.name` as Parameters<typeof t>[0]);
      // next-intl returns the key path if translation not found
      if (translatedName.includes(`products.${productKey}`)) {
        return fallbackName;
      }
      return translatedName;
    } catch {
      return fallbackName;
    }
  }, [t]);

  const getTranslatedProductDescription = useCallback((productKey: string | null, fallbackDesc: string | null): string => {
    if (!productKey || !fallbackDesc) return fallbackDesc ?? "";
    try {
      const translatedDesc = t(`products.${productKey}.description` as Parameters<typeof t>[0]);
      if (translatedDesc.includes(`products.${productKey}`)) {
        return fallbackDesc;
      }
      return translatedDesc;
    } catch {
      return fallbackDesc;
    }
  }, [t]);

  const getTranslatedCategory = useCallback((category: string): string => {
    try {
      const translatedCategory = t(`categories.${category}` as Parameters<typeof t>[0]);
      // next-intl returns the key path if translation not found
      if (translatedCategory.includes(`categories.${category}`)) {
        return category;
      }
      return translatedCategory;
    } catch {
      return category;
    }
  }, [t]);

  // Transform products into cards and group by category
  const { categories, groupedProducts } = useMemo(() => {
    const products = pricing?.products ?? [];
    if (products.length === 0) return { categories: [], groupedProducts: [] };

    // Transform to ProductCard format with translations
    const cards: ProductCard[] = products.map((p) => {
      const defaultPrice = p.prices.find((pr) => pr.is_default) ?? p.prices[0] ?? null;
      const priceLabel = defaultPrice
        ? `${Math.round(defaultPrice.amount / 100)} ${defaultPrice.currency}` +
          (defaultPrice.interval ? `/${defaultPrice.interval}` : "")
        : "";
      const slug = p.product_key ?? p.name.toLowerCase().replace(/\s+/g, "-").replace(/[^\w-]/g, "");

      // Use translated name/description if available, otherwise use database value
      const translatedName = getTranslatedProductName(p.product_key, p.name);
      const translatedDescription = getTranslatedProductDescription(p.product_key, p.description);
      const rawCategory = p.category ?? "other";
      const translatedCategory = getTranslatedCategory(rawCategory);

      return {
        id: p.id,
        slug,
        name: translatedName,
        price: priceLabel,
        description: translatedDescription,
        category: translatedCategory,
        categoryKey: rawCategory, // Keep original key for icon lookup
        imageUrl: p.image_url,
      };
    });

    // Group by translated category name, keep track of original key
    const groupMap = new Map<string, { categoryKey: string; products: ProductCard[] }>();
    for (const card of cards) {
      if (!groupMap.has(card.category)) {
        groupMap.set(card.category, { categoryKey: card.categoryKey, products: [] });
      }
      groupMap.get(card.category)!.products.push(card);
    }

    // Convert to array and sort by category name
    const grouped: CategoryGroup[] = Array.from(groupMap.entries())
      .map(([name, data]) => ({ name, categoryKey: data.categoryKey, products: data.products }))
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    return {
      categories: grouped.map((g) => ({ name: g.name, categoryKey: g.categoryKey })),
      groupedProducts: grouped,
    };
  }, [pricing, getTranslatedProductName, getTranslatedProductDescription, getTranslatedCategory]);

  // Filter by active category on mobile
  const visibleGroups = useMemo(() => {
    if (activeCategory === null) return groupedProducts;
    return groupedProducts.filter((g) => g.name === activeCategory);
  }, [groupedProducts, activeCategory]);

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
          {pricingError && (
            <p className="text-sm text-destructive">{pricingError}</p>
          )}
        </header>

        {/* Category Filter (Mobile) */}
        {!isLoading && categories.length > 0 && (
          <div className="mt-6">
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
          </div>
        )}

        {/* Content */}
        <div className="mt-8">
          {isLoading ? (
            <LoadingSkeleton />
          ) : visibleGroups.length > 0 ? (
            <div className="divide-y divide-border">
              {visibleGroups.map((group) => (
                <CategorySection
                  key={group.name}
                  category={group.name}
                  categoryKey={group.categoryKey}
                  products={group.products}
                  t={t}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <SparklesIcon className="h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                {t("noProducts")}
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("noProductsDescription")}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
