"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  AcademicCapIcon,
  HeartIcon,
  TrophyIcon,
  HomeIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  UsersIcon,
  CalendarDaysIcon,
  GiftIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import type { ComponentType, SVGProps } from "react";

// =============================================================================
// Types
// =============================================================================

export type CategoryHubItem = {
  slug: string;
  name: string;
  description_short: string | null;
  icon_key: string | null;
  sort_order: number;
  bundle_product_id: string | null;
  product_count: number;
  game_count: number;
  bundle_price_yearly: {
    amount: number;
    currency: string;
    interval: string;
    billing_model: string | null;
  } | null;
};

// =============================================================================
// Icon + gradient registry (same as pricing-components)
// =============================================================================

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>;

const ICON_MAP: Record<string, HeroIcon> = {
  HeartIcon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  UsersIcon,
  HomeIcon,
  CalendarDaysIcon,
  GiftIcon,
  AcademicCapIcon,
  TrophyIcon,
  SparklesIcon,
};

const GRADIENT_MAP: Record<string, string> = {
  HeartIcon: "from-purple-400 to-violet-500",
  BriefcaseIcon: "from-slate-400 to-gray-600",
  ComputerDesktopIcon: "from-cyan-400 to-blue-500",
  UsersIcon: "from-orange-400 to-red-500",
  HomeIcon: "from-green-400 to-emerald-500",
  CalendarDaysIcon: "from-indigo-400 to-purple-500",
  GiftIcon: "from-pink-400 to-rose-500",
  AcademicCapIcon: "from-blue-400 to-indigo-500",
  TrophyIcon: "from-amber-400 to-orange-500",
  SparklesIcon: "from-primary to-[#00c7b0]",
};

function getGradient(iconKey: string | null): string {
  return (iconKey && GRADIENT_MAP[iconKey]) || "from-primary to-[#00c7b0]";
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
// Category Card
// =============================================================================

function CategoryCard({
  category,
  labels,
}: {
  category: CategoryHubItem;
  labels: {
    view: string;
    buyBundle: string;
    comingSoon: string;
    products: string;
    games: string;
    perYear: string;
  };
}) {
  const iconKey = category.icon_key;
  const IconComponent = (iconKey && ICON_MAP[iconKey]) || SparklesIcon;
  const gradient = getGradient(category.icon_key);

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg">
      {/* Icon + gradient header */}
      <div
        className={`flex items-center gap-4 bg-gradient-to-r ${gradient} p-5 text-white`}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          <IconComponent className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold">{category.name}</h3>
          {category.description_short && (
            <p className="mt-0.5 line-clamp-1 text-sm text-white/80">
              {category.description_short}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-5">
        {/* Meta counts */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="font-medium">
            {category.product_count} {labels.products}
          </span>
          <span className="text-border">·</span>
          {category.game_count > 0 ? (
            <span className="font-medium">
              {category.game_count} {labels.games}
            </span>
          ) : (
            <span className="italic text-muted-foreground/60">
              {labels.comingSoon}
            </span>
          )}
        </div>

        {/* Bundle price */}
        {category.bundle_price_yearly && (
          <div className="mt-3 text-sm">
            <span className="text-2xl font-bold text-foreground">
              {formatPrice(
                category.bundle_price_yearly.amount,
                category.bundle_price_yearly.currency
              )}
            </span>
            <span className="ml-1 text-muted-foreground">{labels.perYear}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* CTAs */}
        <div className="mt-5 flex flex-col gap-2">
          <Link
            href={`/pricing/${category.slug}`}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {labels.view}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
          {category.bundle_product_id && category.bundle_price_yearly && (
            <Link
              href={`/checkout/start?product=${category.bundle_product_id}`}
              className={`inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md`}
            >
              {labels.buyBundle}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// CategoryHub (main export)
// =============================================================================

export function CategoryHub({
  categories,
}: {
  categories: CategoryHubItem[];
}) {
  const t = useTranslations("marketing");

  const labels = {
    view: t("categoryHub.cta.view"),
    buyBundle: t("categoryHub.cta.buyBundle"),
    comingSoon: t("categoryHub.comingSoon"),
    products: t("categoryHub.meta.products"),
    games: t("categoryHub.meta.games"),
    perYear: t("categoryHub.meta.perYear"),
  };

  if (categories.length === 0) return null;

  return (
    <section
      id="categories"
      className="bg-background py-20 sm:py-28"
      aria-labelledby="category-hub-title"
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold text-primary">
            {t("categoryHub.tagline")}
          </p>
          <h2
            id="category-hub-title"
            className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {t("categoryHub.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            {t("categoryHub.subtitle")}
          </p>
        </div>

        {/* Grid — 1 col → 2 col → 3 col */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <CategoryCard key={cat.slug} category={cat} labels={labels} />
          ))}
        </div>

        {/* Footer CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            {t("categoryHub.cta.viewAll")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
