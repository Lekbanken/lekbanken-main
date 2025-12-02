import { AdjustmentsHorizontalIcon, XMarkIcon } from "@heroicons/react/24/outline";
import type { BrowseFilters } from "../types";

type FilterBarProps = {
  filters: BrowseFilters;
  onOpen: () => void;
  onClearFilter: (key: keyof BrowseFilters, value: string) => void;
};

const filterLabels: Record<string, string> = {
  small: "2-6 pers",
  medium: "6-14 pers",
  large: "15+ pers",
  low: "Låg energi",
  high: "Hög energi",
  indoor: "Inne",
  outdoor: "Ute",
  either: "Inne/Ute",
};

export function FilterBar({ filters, onOpen, onClearFilter }: FilterBarProps) {
  const activeFilters = [
    ...filters.ages.map((value) => ({ key: "ages" as const, value, label: `${value} år` })),
    ...filters.groupSizes.map((value) => ({ key: "groupSizes" as const, value, label: filterLabels[value] || value })),
    ...filters.energyLevels.map((value) => ({ key: "energyLevels" as const, value, label: filterLabels[value] || value })),
    ...filters.environments.map((value) => ({ key: "environments" as const, value, label: filterLabels[value] || value })),
    ...filters.purposes.map((value) => ({ key: "purposes" as const, value, label: value })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3.5 py-2 text-sm font-medium text-foreground shadow-sm transition-all hover:shadow-md hover:border-border active:scale-95"
      >
        <AdjustmentsHorizontalIcon className="h-4 w-4" aria-hidden />
        Filter
        {activeFilters.length > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {activeFilters.length}
          </span>
        )}
      </button>

      <div className="flex flex-wrap gap-1.5">
        {activeFilters.map((filter) => (
          <button
            key={`${filter.key}-${filter.value}`}
            type="button"
            onClick={() => onClearFilter(filter.key, filter.value)}
            className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20 transition-all hover:bg-primary/15 hover:ring-primary/30 active:scale-95"
          >
            <span className="capitalize">{filter.label}</span>
            <XMarkIcon className="h-3.5 w-3.5 text-primary/60 transition-colors group-hover:text-primary" />
          </button>
        ))}
      </div>
    </div>
  );
}
