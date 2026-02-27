"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard, GameCardSkeleton } from "@/components/game/GameCard";
import { mapSearchResultToSummary } from "@/lib/game-display";
import type { GameSummary } from "@/lib/game-display";
import { FilterSheetV2 } from "@/features/browse/components/FilterSheetV2";
import { useBrowseFilters } from "@/features/browse/hooks";
import type { BrowseFilters, PlayMode } from "@/features/browse/types";
import { AdjustmentsHorizontalIcon } from "@heroicons/react/24/outline";

type GameSearchResult = {
  id: string;
  slug?: string | null;
  name?: string | null;
  description?: string | null;
  time_estimate_min?: number | null;
  time_estimate_max?: number | null;
  energy_level?: string | null;
  play_mode?: string | null;
  image_url?: string | null;
  media?: Array<{ kind?: string | null; media?: { url?: string | null } | null }> | null;
  translations?: { title?: string | null; short_description?: string | null }[];
};

type GamePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (game: { id: string; title: string; duration: number | null }) => void;
  seedResults?: GameSearchResult[];
  initialQuery?: string;
  /** Tenant ID for scoped search */
  tenantId?: string | null;
  /** User's available play modes */
  userPlayModes?: PlayMode[];
};

function getGameTitle(game: GameSearchResult): string {
  return game.name || game.translations?.[0]?.title || game.slug || "Okänd lek";
}

/**
 * Converts GameSearchResult to GameSummary for picker variant
 */
function toSummary(game: GameSearchResult): GameSummary {
  return mapSearchResultToSummary(game);
}

/** Default empty filters */
const EMPTY_FILTERS: BrowseFilters = {
  products: [],
  mainPurposes: [],
  subPurposes: [],
  groupSizes: [],
  energyLevels: [],
  environment: null,
  minPlayers: null,
  maxPlayers: null,
  minTime: null,
  maxTime: null,
  minAge: null,
  maxAge: null,
};

export function GamePicker({
  open,
  onOpenChange,
  onSelect,
  seedResults,
  initialQuery,
  tenantId = null,
  userPlayModes = ['basic'],
}: GamePickerProps) {
  const t = useTranslations('planner');
  const locale = useLocale();
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [results, setResults] = React.useState<GameSearchResult[]>(seedResults ?? []);
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(Boolean(seedResults?.length));
  
  // Filter state
  const [filters, setFilters] = React.useState<BrowseFilters>(EMPTY_FILTERS);
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  
  // Get filter options and coverage from useBrowseFilters hook
  const { options, coverage: _coverage, visibleGroups, hasSuperFilters } = useBrowseFilters(
    tenantId,
    userPlayModes
  );

  // Count active filters for badge
  const activeFilterCount = React.useMemo(() => {
    let count = 0;
    if (filters.products.length) count += filters.products.length;
    if (filters.mainPurposes.length) count += filters.mainPurposes.length;
    if (filters.subPurposes.length) count += filters.subPurposes.length;
    if (filters.groupSizes.length) count += filters.groupSizes.length;
    if (filters.energyLevels.length) count += filters.energyLevels.length;
    if (filters.environment) count += 1;
    if (filters.minPlayers || filters.maxPlayers) count += 1;
    if (filters.minTime || filters.maxTime) count += 1;
    if (filters.minAge || filters.maxAge) count += 1;
    if (filters.categories?.length) count += filters.categories.length;
    if (filters.difficulty) count += 1;
    if (filters.playMode) count += 1;
    return count;
  }, [filters]);

  React.useEffect(() => {
    if (!open || !seedResults) return;
    setResults(seedResults);
    setHasSearched(seedResults.length > 0);
    if (typeof initialQuery === "string") {
      setQuery(initialQuery);
    }
  }, [open, seedResults, initialQuery]);

  const searchGames = React.useCallback(async (searchPage = 1, append = false) => {
    // Allow search with either query or active filters
    if (!query.trim() && activeFilterCount === 0) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const res = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: query || undefined,
          tenantId: tenantId ?? null,
          page: searchPage,
          pageSize: 20,
          // Spread all filter values
          products: filters.products,
          mainPurposes: filters.mainPurposes,
          subPurposes: filters.subPurposes,
          groupSizes: filters.groupSizes,
          energyLevels: filters.energyLevels,
          environment: filters.environment || undefined,
          minPlayers: filters.minPlayers || undefined,
          maxPlayers: filters.maxPlayers || undefined,
          minTime: filters.minTime || undefined,
          maxTime: filters.maxTime || undefined,
          minAge: filters.minAge || undefined,
          maxAge: filters.maxAge || undefined,
          playMode: filters.playMode || undefined,
          categories: filters.categories?.length ? filters.categories : undefined,
          difficulty: filters.difficulty || undefined,
          locale,
        }),
      });
      
      const data = (await res.json()) as { 
        games: GameSearchResult[]; 
        total?: number;
        hasMore?: boolean;
      };
      
      const newGames = data.games || [];
      setResults(append ? [...results, ...newGames] : newGames);
      setPage(searchPage);
      setHasMore(data.hasMore ?? (searchPage * 20 < (data.total ?? 0)));
    } catch (err) {
      console.error("Game search failed", err);
    } finally {
      setIsSearching(false);
    }
  }, [query, filters, tenantId, results, activeFilterCount, locale]);

  const loadMore = React.useCallback(() => {
    if (!isSearching && hasMore) {
      void searchGames(page + 1, true);
    }
  }, [isSearching, hasMore, page, searchGames]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void searchGames(1, false);
    }
  };

  const resetState = () => {
    if (seedResults) {
      setResults(seedResults);
      setHasSearched(seedResults.length > 0);
      setQuery(initialQuery ?? "");
      setFilters(EMPTY_FILTERS);
      setPage(1);
      setHasMore(false);
      return;
    }
    setQuery("");
    setResults([]);
    setHasSearched(false);
    setFilters(EMPTY_FILTERS);
    setPage(1);
    setHasMore(false);
  };

  // Handle filter changes from FilterSheetV2
  const handleFilterChange = React.useCallback((newFilters: BrowseFilters) => {
    setFilters(newFilters);
    setPage(1);
    // Auto-search when filters change (if we have query or filters)
  }, []);

  // Re-search when filters change
  React.useEffect(() => {
    if (open && (query.trim() || activeFilterCount > 0)) {
      void searchGames(1, false);
    }
    // Only trigger on filter changes, not on every searchGames recreation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, open]);

  const handleSelect = (game: GameSearchResult) => {
    onSelect({
      id: game.id,
      title: getGameTitle(game),
      duration: game.time_estimate_min ?? null,
    });
    onOpenChange(false);
    resetState();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{t('gamePicker.title')}</SheetTitle>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Search + Filter row */}
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('gamePicker.searchPlaceholder')}
                className="flex-1"
                autoFocus
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilterSheetOpen(true)}
                className="relative shrink-0 px-2"
                aria-label={t('gamePicker.openFilters')}
              >
                <AdjustmentsHorizontalIcon className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <Button
                onClick={() => void searchGames(1, false)}
                disabled={isSearching || (!query.trim() && activeFilterCount === 0)}
              >
                {isSearching ? t('gamePicker.searching') : t('gamePicker.search')}
              </Button>
            </div>

            {/* Active filter count indicator */}
            {activeFilterCount > 0 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {t('gamePicker.activeFilters', { count: activeFilterCount })}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="h-auto py-1 px-2 text-xs"
                >
                  {t('gamePicker.clearFilters')}
                </Button>
              </div>
            )}

            {/* Results list */}
            <div className="max-h-[calc(100vh-280px)] space-y-2 overflow-y-auto">
              {!hasSearched && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('gamePicker.emptyState')}
                </p>
              )}

              {hasSearched && results.length === 0 && !isSearching && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {t('gamePicker.noResults', { query })}
                </p>
              )}

              {isSearching && results.length === 0 && (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <GameCardSkeleton key={i} variant="picker" />
                  ))}
                </div>
              )}

              {results.map((game) => (
                <GameCard
                  key={game.id}
                  game={toSummary(game)}
                  variant="picker"
                  actions={{
                    onClick: () => handleSelect(game),
                  }}
                />
              ))}

              {/* Load more */}
              {hasMore && !isSearching && (
                <div className="pt-4 text-center">
                  <Button
                    variant="outline"
                    onClick={loadMore}
                    disabled={isSearching}
                  >
                    {t('gamePicker.loadMore')}
                  </Button>
                </div>
              )}

              {/* Loading more indicator */}
              {isSearching && results.length > 0 && (
                <div className="pt-4 text-center text-sm text-muted-foreground">
                  {t('gamePicker.searching')}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Filter Sheet - uses same component as Browse */}
      <FilterSheetV2
        open={filterSheetOpen}
        onOpenChange={setFilterSheetOpen}
        filters={filters}
        onApply={handleFilterChange}
        onClearAll={() => setFilters(EMPTY_FILTERS)}
        options={options}
        visibleGroups={visibleGroups}
        hasSuperFilters={hasSuperFilters}
      />
    </>
  );
}
