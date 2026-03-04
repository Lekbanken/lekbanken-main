"use client";

import * as React from "react";
import { useTranslations, useLocale } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard, GameCardSkeleton } from "@/components/game/GameCard";
import { mapSearchResultToSummary } from "@/lib/game-display";
import { cn } from "@/lib/utils";
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

/** Enriched game selection payload for optimistic UI */
export type GamePickerSelection = {
  id: string;
  title: string;
  duration: number | null;
  shortDescription?: string | null;
  energyLevel?: string | null;
  locationType?: string | null;
  coverUrl?: string | null;
};

type GamePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (game: GamePickerSelection) => void;
  seedResults?: GameSearchResult[];
  initialQuery?: string;
  /** Tenant ID for scoped search */
  tenantId?: string | null;
  /** User's available play modes */
  userPlayModes?: PlayMode[];
  /** Pre-applied play mode filter (e.g. 'participants' for session games) */
  defaultPlayMode?: PlayMode;
};

function getGameTitle(game: GameSearchResult): string {
  return game.name || game.translations?.[0]?.title || game.slug || "?";
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
  defaultPlayMode,
}: GamePickerProps) {
  const t = useTranslations('planner');
  const locale = useLocale();
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [results, setResults] = React.useState<GameSearchResult[]>(seedResults ?? []);
  const [isSearching, setIsSearching] = React.useState(false);
  const [isSilentlyRefreshing, setIsSilentlyRefreshing] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(Boolean(seedResults?.length));
  
  // Filter state
  const [filters, setFilters] = React.useState<BrowseFilters>({
    ...EMPTY_FILTERS,
    ...(defaultPlayMode ? { playMode: defaultPlayMode } : {}),
  });
  const [filterSheetOpen, setFilterSheetOpen] = React.useState(false);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(false);
  const [totalCount, setTotalCount] = React.useState<number | null>(null);

  // Abort controller for preventing stale responses
  const abortRef = React.useRef<AbortController | null>(null);
  // Cache browse results for instant re-open (with timestamp for TTL)
  const browseCache = React.useRef<{ data: GameSearchResult[]; ts: number } | null>(null);
  const CACHE_TTL_MS = 90_000; // 90 seconds
  
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

  // Refs tracking live state for async intent-checking (avoids stale closures)
  const queryRef = React.useRef(query);
  queryRef.current = query;
  const activeFilterCountRef = React.useRef(activeFilterCount);
  activeFilterCountRef.current = activeFilterCount;

  React.useEffect(() => {
    if (!open || !seedResults) return;
    setResults(seedResults);
    setHasSearched(seedResults.length > 0);
    if (typeof initialQuery === "string") {
      setQuery(initialQuery);
    }
  }, [open, seedResults, initialQuery]);

  const searchGames = React.useCallback(async (searchPage = 1, append = false, browse = false, silent = false) => {
    // Allow browse mode (no query/filters needed) or with query/filters
    if (!browse && !query.trim() && activeFilterCount === 0) return;

    // Cancel any in-flight request to prevent stale responses
    abortRef.current?.abort();
    setIsSilentlyRefreshing(false); // Clear stale silent state from aborted request
    const controller = new AbortController();
    abortRef.current = controller;
    
    if (!silent) setIsSearching(true);
    else setIsSilentlyRefreshing(true);
    setHasSearched(true);
    
    try {
      const res = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          search: query || undefined,
          tenantId: tenantId ?? null,
          page: searchPage,
          pageSize: 20,
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
      
      if (controller.signal.aborted) return;

      const data = (await res.json()) as { 
        games: GameSearchResult[]; 
        total?: number;
        hasMore?: boolean;
      };
      
      const newGames = data.games || [];

      // Silent browse refresh: don't overwrite if user has started searching/filtering
      if (silent && (queryRef.current.trim() || activeFilterCountRef.current > 0)) {
        // User has interacted — update cache only, don't touch displayed results
        if (searchPage === 1) {
          browseCache.current = { data: newGames, ts: Date.now() };
        }
        return;
      }

      const combined = append ? [...results, ...newGames] : newGames;
      setResults(combined);
      setPage(searchPage);
      setTotalCount(data.total ?? null);
      setHasMore(data.hasMore ?? (searchPage * 20 < (data.total ?? 0)));

      // Cache pure browse results (no query, no filters) for instant re-open
      if (browse && !query.trim() && activeFilterCount === 0 && searchPage === 1) {
        browseCache.current = { data: newGames, ts: Date.now() };
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error("Game search failed", err);
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
        setIsSilentlyRefreshing(false);
      }
    }
  }, [query, filters, tenantId, results, activeFilterCount, locale]);

  const loadMore = React.useCallback(() => {
    if (!isSearching && hasMore) {
      void searchGames(page + 1, true, true);
    }
  }, [isSearching, hasMore, page, searchGames]);

  // Auto-browse: load games when picker opens, use cache for instant re-open
  const didAutoLoad = React.useRef(false);
  React.useEffect(() => {
    if (open && !didAutoLoad.current && !seedResults?.length) {
      didAutoLoad.current = true;
      // If user had active filters/query from a previous interaction, re-run that search
      if (queryRef.current.trim() || activeFilterCountRef.current > 0) {
        void searchGames(1, false);
      } else {
        const cache = browseCache.current;
        if (cache) {
          // Show cached results instantly
          setResults(cache.data);
          setHasSearched(true);
          // If stale (> TTL), silently refresh in the background
          if (Date.now() - cache.ts > CACHE_TTL_MS) {
            void searchGames(1, false, true, true);
          }
        } else {
          void searchGames(1, false, true);
        }
      }
    }
    if (!open) {
      didAutoLoad.current = false;
      // Cancel any in-flight request when closing
      abortRef.current?.abort();
    }
  }, [open, seedResults, searchGames]);

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
    const coverMedia = game.media?.find((m) => m.kind === 'cover');
    onSelect({
      id: game.id,
      title: getGameTitle(game),
      duration: game.time_estimate_min ?? null,
      shortDescription: game.translations?.[0]?.short_description ?? game.description ?? null,
      energyLevel: game.energy_level ?? null,
      locationType: null, // not available in search result
      coverUrl: coverMedia?.media?.url ?? game.image_url ?? null,
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
                onClick={() => void searchGames(1, false, true)}
                disabled={isSearching}
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

            {/* Quick filter chips for energy level and time */}
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {(['low', 'medium', 'high'] as const).map((level) => {
                  const isActive = filters.energyLevels.includes(level);
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        const next = isActive
                          ? filters.energyLevels.filter((e) => e !== level)
                          : [...filters.energyLevels, level];
                        setFilters({ ...filters, energyLevels: next });
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      {level === 'low' && '🟢'}
                      {level === 'medium' && '🟡'}
                      {level === 'high' && '🔴'}
                      {t(`gamePicker.energy.${level}`)}
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {([
                  { key: 'short', min: null, max: 10 },
                  { key: 'medium', min: 10, max: 20 },
                  { key: 'long', min: 20, max: null },
                ] as const).map(({ key, min, max }) => {
                  const isActive = filters.minTime === min && filters.maxTime === max;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setFilters({ ...filters, minTime: null, maxTime: null });
                        } else {
                          setFilters({ ...filters, minTime: min, maxTime: max });
                        }
                      }}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                    >
                      ⏱
                      {t(`gamePicker.time.${key}`)}
                    </button>
                  );
                })}
              </div>
              {/* Purpose-based suggestions from available options */}
              {options?.mainPurposes && options.mainPurposes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {options.mainPurposes.slice(0, 5).map((purpose) => {
                    const isActive = filters.mainPurposes.includes(purpose.id);
                    return (
                      <button
                        key={purpose.id}
                        type="button"
                        onClick={() => {
                          const next = isActive
                            ? filters.mainPurposes.filter((p) => p !== purpose.id)
                            : [...filters.mainPurposes, purpose.id];
                          setFilters({ ...filters, mainPurposes: next });
                        }}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        🎯 {purpose.name}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setFilterSheetOpen(true)}
                    className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
                  >
                    {t('gamePicker.moreFilters')}
                  </button>
                </div>
              )}
            </div>

            {/* Result count when filtering */}
            {hasSearched && !isSearching && results.length > 0 && (query.trim() || activeFilterCount > 0) && (
              <p className="text-xs text-muted-foreground">
                {t('gamePicker.resultCount', { count: totalCount ?? results.length })}
              </p>
            )}

            {/* Subtle updating indicator during silent background refresh */}
            {isSilentlyRefreshing && results.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('gamePicker.updating')}
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
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    {query.trim()
                      ? t('gamePicker.noResults', { query })
                      : t('gamePicker.noFilterResults')}
                  </p>
                  {activeFilterCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilters(EMPTY_FILTERS);
                        void searchGames(1, false, true);
                      }}
                      className="mt-2 text-xs"
                    >
                      {t('gamePicker.clearFilters')}
                    </Button>
                  )}
                </div>
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
