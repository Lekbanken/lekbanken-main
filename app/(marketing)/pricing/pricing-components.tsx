"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { getCategoryVisuals, ACCENT_BORDER_MAP } from "./pricing-shared";
import type { ProductCard, CategoryGroup } from "./pricing-shared";

// Re-export shared types and utilities for consumers
export { getCategoryVisuals };
export type { ProductCard, CategoryGroup };

// =============================================================================
// Helper: accent border lookup
// =============================================================================

function getAccentBorder(iconKey: string | null): string {
  return (iconKey && ACCENT_BORDER_MAP[iconKey]) || "border-t-primary";
}

// =============================================================================
// Mini Product Card (compact, for embedding inside category cards)
// =============================================================================

function MiniProductCard({ product }: { product: ProductCard }) {
  const { Icon, gradient } = getCategoryVisuals(null, product.categorySlug);

  return (
    <div className="relative flex h-36 w-28 flex-shrink-0 overflow-hidden rounded-xl shadow-sm">
      {/* Background — image or gradient */}
      <span aria-hidden="true" className="absolute inset-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="112px"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`}>
            <div className="flex h-full items-center justify-center">
              <Icon className="h-10 w-10 text-white/30" />
            </div>
          </div>
        )}
      </span>

      {/* Dark gradient overlay for text */}
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-gray-900/80 to-transparent"
      />

      {/* Product name */}
      <span className="relative mt-auto p-2">
        <span className="line-clamp-2 text-xs font-semibold leading-tight text-white drop-shadow-sm">
          {product.name}
        </span>
      </span>
    </div>
  );
}

// =============================================================================
// Category Card (hub-style card with embedded product swipe)
// =============================================================================

export function PricingCategoryCard({
  group,
  labels,
}: {
  group: CategoryGroup;
  labels: {
    viewContent: string;
    comingSoon: string;
    games: string;
  };
}) {
  const { Icon, iconColor, iconBg } = getCategoryVisuals(group.iconKey);
  const accentBorder = getAccentBorder(group.iconKey);

  return (
    <div
      className={`group flex flex-col overflow-hidden rounded-2xl border border-border border-t-[3px] ${accentBorder} bg-card shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg`}
    >
      {/* Header — icon + title + description */}
      <div className="flex items-center gap-4 p-5 pb-3">
        <div
          className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-foreground">
            {group.name}
          </h3>
          {group.descriptionShort && (
            <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
              {group.descriptionShort}
            </p>
          )}
        </div>
      </div>

      {/* Product Swipe */}
      {group.products.length > 0 && (
        <div className="px-5 py-2">
          <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
            {group.products.map((product) => (
              <MiniProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Footer — game count + "Se innehåll" CTA */}
      <div className="flex items-center justify-between gap-3 px-5 py-4">
        <span className="text-sm text-muted-foreground">
          {group.gameCount > 0 ? (
            <span className="font-medium">
              {group.gameCount} {labels.games}
            </span>
          ) : (
            <span className="italic text-muted-foreground/60">
              {labels.comingSoon}
            </span>
          )}
        </span>
        <Link
          href={`/pricing/${group.slug}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {labels.viewContent}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}
