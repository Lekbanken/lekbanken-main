"use client";

import { SparklesIcon } from "@heroicons/react/24/outline";
import { PricingCategoryCard } from "./pricing-components";
import type { CategoryGroup } from "./pricing-components";

// =============================================================================
// Client wrapper: renders category card grid
// =============================================================================

export default function PricingCatalogClient({
  groups,
  labels,
}: {
  groups: CategoryGroup[];
  labels: {
    noProducts: string;
    noProductsDescription: string;
    viewContent: string;
    comingSoon: string;
    games: string;
  };
}) {
  return (
    <div className="mt-10">
      {groups.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <PricingCategoryCard
              key={group.slug}
              group={group}
              labels={{
                viewContent: labels.viewContent,
                comingSoon: labels.comingSoon,
                games: labels.games,
              }}
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
  );
}
