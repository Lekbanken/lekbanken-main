"use client";

import { useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { SparklesIcon } from "@heroicons/react/24/outline";
import { getCategoryVisuals, PricingCategorySection } from "./pricing-components";
import type { CategoryGroup } from "./pricing-components";

// =============================================================================
// Category Filter Tabs (Mobile)
// =============================================================================

function CategoryTabs({
  categories,
  activeCategory,
  onSelect,
  allLabel,
}: {
  categories: Array<{ name: string; slug: string; iconKey: string | null }>;
  activeCategory: string | null;
  onSelect: (slug: string | null) => void;
  allLabel: string;
}) {
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
          {allLabel}
        </button>
        {categories.map((cat) => {
          const { Icon } = getCategoryVisuals(cat.iconKey);
          return (
            <button
              key={cat.slug}
              onClick={() => onSelect(cat.slug)}
              className={`flex flex-shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.slug
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
// Client wrapper: filters + interactive state
// =============================================================================

export default function PricingCatalogClient({
  groups,
  labels,
}: {
  groups: CategoryGroup[];
  labels: {
    allCategories: string;
    viewAll: string;
    noProducts: string;
    noProductsDescription: string;
  };
}) {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get("category");
  const [activeCategory, setActiveCategory] = useState<string | null>(() => {
    if (initialCategory && groups.some((g) => g.slug === initialCategory)) {
      return initialCategory;
    }
    return null;
  });

  const categories = useMemo(
    () =>
      groups.map((g) => ({
        name: g.name,
        slug: g.slug,
        iconKey: g.iconKey,
      })),
    [groups]
  );

  const visibleGroups = useMemo(() => {
    if (activeCategory === null) return groups;
    return groups.filter((g) => g.slug === activeCategory);
  }, [groups, activeCategory]);

  return (
    <>
      {/* Category Filter (Mobile) */}
      {categories.length > 0 && (
        <div className="mt-6">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onSelect={setActiveCategory}
            allLabel={labels.allCategories}
          />
        </div>
      )}

      {/* Content */}
      <div className="mt-8">
        {visibleGroups.length > 0 ? (
          <div className="divide-y divide-border">
            {visibleGroups.map((group) => (
              <PricingCategorySection
                key={group.slug}
                group={group}
                viewAllLabel={labels.viewAll}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SparklesIcon className="h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">
              {labels.noProducts}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {labels.noProductsDescription}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
