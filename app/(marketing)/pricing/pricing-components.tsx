"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
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
// Product Card (larger, for embedding inside category cards)
// =============================================================================

function SwipeProductCard({ product }: { product: ProductCard }) {
  const { Icon, gradient } = getCategoryVisuals(null, product.categorySlug);

  return (
    <div className="relative flex h-44 w-36 flex-shrink-0 overflow-hidden rounded-xl shadow-sm sm:h-48 sm:w-40">
      {/* Background — image or gradient */}
      <span aria-hidden="true" className="absolute inset-0">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
            sizes="160px"
          />
        ) : (
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`}>
            <div className="flex h-full items-center justify-center">
              <Icon className="h-12 w-12 text-white/30" />
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
      <span className="relative mt-auto p-3">
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-white drop-shadow-sm">
          {product.name}
        </span>
      </span>
    </div>
  );
}

// =============================================================================
// Product Carousel (arrow nav + page dots)
// =============================================================================

function ProductCarousel({ products }: { products: ProductCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [maxIndex, setMaxIndex] = useState(0);

  const updatePagination = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Each card is ~144px (w-36) or ~160px (sm:w-40) + 12px gap
    const cardWidth = el.querySelector<HTMLElement>(":scope > *")?.offsetWidth ?? 144;
    const gap = 12;
    const step = cardWidth + gap;
    const currentIndex = Math.round(el.scrollLeft / step);
    const visibleCards = Math.floor(el.clientWidth / step) || 1;
    const total = products.length;
    setActiveIndex(currentIndex);
    setMaxIndex(Math.max(0, total - visibleCards));
  }, [products.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updatePagination();
    el.addEventListener("scroll", updatePagination, { passive: true });
    const ro = new ResizeObserver(updatePagination);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updatePagination);
      ro.disconnect();
    };
  }, [updatePagination]);

  const scrollTo = useCallback((direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector<HTMLElement>(":scope > *")?.offsetWidth ?? 144;
    const gap = 12;
    const step = cardWidth + gap;
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  }, []);

  const canPrev = activeIndex > 0;
  const canNext = activeIndex < maxIndex;
  const totalDots = maxIndex + 1;

  return (
    <div className="relative">
      {/* Scroll container */}
      <div
        ref={scrollRef}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth scrollbar-hide"
      >
        {products.map((product) => (
          <div key={product.id} className="snap-start">
            <SwipeProductCard product={product} />
          </div>
        ))}
      </div>

      {/* Navigation: arrows + dots */}
      {totalDots > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            onClick={() => scrollTo("prev")}
            disabled={!canPrev}
            aria-label="Previous"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
          >
            <ChevronLeftIcon className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalDots }).map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${
                  i === activeIndex
                    ? "w-4 bg-foreground"
                    : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>

          <button
            onClick={() => scrollTo("next")}
            disabled={!canNext}
            aria-label="Next"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:bg-muted disabled:opacity-30 disabled:hover:bg-background"
          >
            <ChevronRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Category Card (hub-style card with embedded product carousel)
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

      {/* Product Carousel */}
      {group.products.length > 0 && (
        <div className="px-5 py-2">
          <ProductCarousel products={group.products} />
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
