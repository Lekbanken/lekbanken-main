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

/** Subtle border-top / accent color per icon */
const ACCENT_BORDER_MAP: Record<string, string> = {
  HeartIcon: "border-t-purple-400",
  BriefcaseIcon: "border-t-slate-400",
  ComputerDesktopIcon: "border-t-cyan-400",
  UsersIcon: "border-t-orange-400",
  HomeIcon: "border-t-green-400",
  CalendarDaysIcon: "border-t-indigo-400",
  GiftIcon: "border-t-pink-400",
  AcademicCapIcon: "border-t-blue-400",
  TrophyIcon: "border-t-amber-400",
  SparklesIcon: "border-t-primary",
};

/** Icon text color (for icon rendered on light background) */
const ICON_COLOR_MAP: Record<string, string> = {
  HeartIcon: "text-purple-500",
  BriefcaseIcon: "text-slate-500",
  ComputerDesktopIcon: "text-cyan-500",
  UsersIcon: "text-orange-500",
  HomeIcon: "text-green-500",
  CalendarDaysIcon: "text-indigo-500",
  GiftIcon: "text-pink-500",
  AcademicCapIcon: "text-blue-500",
  TrophyIcon: "text-amber-500",
  SparklesIcon: "text-primary",
};

/** Soft tinted icon box background */
const ICON_BG_MAP: Record<string, string> = {
  HeartIcon: "bg-purple-100 dark:bg-purple-500/20",
  BriefcaseIcon: "bg-slate-100 dark:bg-slate-500/20",
  ComputerDesktopIcon: "bg-cyan-100 dark:bg-cyan-500/20",
  UsersIcon: "bg-orange-100 dark:bg-orange-500/20",
  HomeIcon: "bg-green-100 dark:bg-green-500/20",
  CalendarDaysIcon: "bg-indigo-100 dark:bg-indigo-500/20",
  GiftIcon: "bg-pink-100 dark:bg-pink-500/20",
  AcademicCapIcon: "bg-blue-100 dark:bg-blue-500/20",
  TrophyIcon: "bg-amber-100 dark:bg-amber-500/20",
  SparklesIcon: "bg-primary/10",
};

function getGradient(iconKey: string | null): string {
  return (iconKey && GRADIENT_MAP[iconKey]) || "from-primary to-[#00c7b0]";
}

function getAccentBorder(iconKey: string | null): string {
  return (iconKey && ACCENT_BORDER_MAP[iconKey]) || "border-t-primary";
}

function getIconColor(iconKey: string | null): string {
  return (iconKey && ICON_COLOR_MAP[iconKey]) || "text-primary";
}

function getIconBg(iconKey: string | null): string {
  return (iconKey && ICON_BG_MAP[iconKey]) || "bg-primary/10";
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
  const accentBorder = getAccentBorder(category.icon_key);
  const iconColor = getIconColor(category.icon_key);
  const iconBg = getIconBg(category.icon_key);

  return (
    <div className={`group relative flex flex-col overflow-hidden rounded-2xl border border-border border-t-[3px] ${accentBorder} bg-card shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg`}>
      {/* Header — white bg, colored icon box */}
      <div className="flex items-center gap-4 p-5">
        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
          <IconComponent className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">{category.name}</h3>
          {category.description_short && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {category.description_short}
            </p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col px-5 pb-5">
        {/* Bundle price */}
        {category.bundle_price_yearly && (
          <div className="text-sm">
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

        {/* Game count + View CTA on same row */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            {category.game_count > 0 ? (
              <span className="font-medium">
                {category.game_count} {labels.games}
              </span>
            ) : (
              <span className="italic text-muted-foreground/60">
                {labels.comingSoon}
              </span>
            )}
          </span>
          <Link
            href={`/pricing/${category.slug}`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
          >
            {labels.view}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Buy bundle CTA */}
        {category.bundle_product_id && category.bundle_price_yearly && (
          <div className="mt-2">
            <Link
              href={`/checkout/start?product=${category.bundle_product_id}`}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r ${gradient} px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:shadow-md`}
            >
              {labels.buyBundle}
            </Link>
          </div>
        )}
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
