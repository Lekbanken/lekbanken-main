import { AdjustmentsHorizontalIcon, Squares2X2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { ListBulletIcon } from "@heroicons/react/24/solid";
import { cn } from "@/lib/utils";
import type { BrowseFilters, FilterOptions, SortOption } from "../types";

type FilterBarProps = {
  filters: BrowseFilters;
  options: FilterOptions | null;
  sort: SortOption;
  view: "grid" | "list";
  total: number;
  onOpen: () => void;
  onClearFilter: (key: keyof BrowseFilters, value: string) => void;
  onSortChange: (value: SortOption) => void;
  onViewChange: (value: "grid" | "list") => void;
};

const filterLabels: Record<string, string> = {
  small: "2-6 pers",
  medium: "6-14 pers",
  large: "15+ pers",
  low: "Låg energi",
  medium_energy: "Medel energi",
  high: "Hög energi",
  indoor: "Inne",
  outdoor: "Ute",
  both: "Inne/Ute",
};

const sortLabels: Record<SortOption, string> = {
  relevance: "Relevans",
  newest: "Nyast",
  name: "Namn",
  duration: "Tid",
  popular: "Populär",
  rating: "Betyg",
};

export function FilterBar({ filters, options, sort, view, total, onOpen, onClearFilter, onSortChange, onViewChange }: FilterBarProps) {
  const activeFilters = [
    ...filters.products.map((value) => ({ key: "products" as const, value, label: options?.products.find((p) => p.id === value)?.name || "Produkt" })),
    ...filters.mainPurposes.map((value) => ({ key: "mainPurposes" as const, value, label: options?.mainPurposes.find((p) => p.id === value)?.name || "Syfte" })),
    ...filters.subPurposes.map((value) => ({ key: "subPurposes" as const, value, label: options?.subPurposes.find((p) => p.id === value)?.name || "Del-syfte" })),
    ...filters.groupSizes.map((value) => ({ key: "groupSizes" as const, value, label: filterLabels[value] || value })),
    ...filters.energyLevels.map((value) => ({ key: "energyLevels" as const, value, label: filterLabels[value] || value })),
    ...(filters.environment
      ? [{ key: "environment" as const, value: filters.environment, label: filterLabels[filters.environment] || filters.environment }]
      : []),
    ...(filters.minPlayers !== null
      ? [{ key: "minPlayers" as const, value: String(filters.minPlayers), label: `Min ${filters.minPlayers} spelare` }]
      : []),
    ...(filters.maxPlayers !== null
      ? [{ key: "maxPlayers" as const, value: String(filters.maxPlayers), label: `Max ${filters.maxPlayers} spelare` }]
      : []),
    ...(filters.minAge !== null
      ? [{ key: "minAge" as const, value: String(filters.minAge), label: `Min ålder ${filters.minAge}` }]
      : []),
    ...(filters.maxAge !== null
      ? [{ key: "maxAge" as const, value: String(filters.maxAge), label: `Max ålder ${filters.maxAge}` }]
      : []),
    ...(filters.minTime !== null
      ? [{ key: "minTime" as const, value: String(filters.minTime), label: `Min tid ${filters.minTime} min` }]
      : []),
    ...(filters.maxTime !== null
      ? [{ key: "maxTime" as const, value: String(filters.maxTime), label: `Max tid ${filters.maxTime} min` }]
      : []),
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

      <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
        <span className="hidden sm:inline">{total} aktiviteter</span>
        <label className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">Sortera</span>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            className="rounded-lg border border-border/60 bg-card px-2 py-1 text-xs text-foreground"
          >
            {Object.entries(sortLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center rounded-full border border-border/60 bg-card">
          <button
            type="button"
            onClick={() => onViewChange("grid")}
            className={cn(
              "rounded-full p-1.5 text-muted-foreground transition-colors",
              view === "grid" && "bg-primary/10 text-primary"
            )}
            aria-label="Rutnätsvy"
          >
            <Squares2X2Icon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewChange("list")}
            className={cn(
              "rounded-full p-1.5 text-muted-foreground transition-colors",
              view === "list" && "bg-primary/10 text-primary"
            )}
            aria-label="Listvy"
          >
            <ListBulletIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
