"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { getCategoryVisuals } from "./pricing-shared";
import type { ProductCard, CategoryGroup } from "./pricing-shared";

// Re-export shared types and utilities for consumers
export { getCategoryVisuals };
export type { ProductCard, CategoryGroup };

// =============================================================================
// Product Card Component
// =============================================================================

export function PricingProductCard({ product }: { product: ProductCard }) {
  const { Icon, gradient } = getCategoryVisuals(null, product.categorySlug);

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
          <div className={`h-full w-full bg-gradient-to-br ${gradient}`}>
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

export function PricingCategorySection({
  group,
  viewAllLabel,
}: {
  group: CategoryGroup;
  viewAllLabel: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { Icon, gradient } = getCategoryVisuals(group.iconKey);

  return (
    <section className="py-8">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-0">
        <div className="flex items-center gap-3">
          <span
            className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${gradient}`}
          >
            <Icon className="h-5 w-5 text-white" />
          </span>
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {group.name}
          </h2>
          <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {group.productCount}
          </span>
        </div>
        <Link
          href={`/pricing/${group.slug}`}
          className="hidden text-sm font-semibold text-primary hover:text-primary/80 sm:flex sm:items-center"
        >
          {viewAllLabel}
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
              {group.products.map((product) => (
                <PricingProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile "View All" link */}
      <div className="mt-4 px-4 sm:hidden">
        <Link
          href={`/pricing/${group.slug}`}
          className="flex items-center text-sm font-semibold text-primary hover:text-primary/80"
        >
          {viewAllLabel}
          <ArrowRightIcon className="ml-1 h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
