"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Toggle } from "@/components/ui/toggle";
import { useTenant } from "@/lib/context/TenantContext";
import { useAuth } from "@/lib/supabase/auth";
import { getUserPlayModesFromContext } from "@/lib/auth/playModeCapabilities";
import { FilterBar } from "./components/FilterBar";
import { FilterSheetV2 } from "./components/FilterSheetV2";
import { useBrowseFilters } from "./hooks/useBrowseFilters";
import { GameCard, GameCardSkeleton } from "@/components/game/GameCard";
import { SearchBar } from "./components/SearchBar";
import type { BrowseFilters, SortOption } from "./types";
import type { GameSummary } from "@/lib/game-display";
import { mapDbGameToSummary } from "@/lib/game-display";
import type { Tables } from "@/types/supabase";
import type { GameReactionMap } from "@/types/game-reaction";
import { cn } from "@/lib/utils";
import { PageTitleHeader } from "@/components/app/PageTitleHeader";
import { appNavItems } from "@/components/app/nav-items";

type GameMediaWithAsset = Tables<"game_media"> & { media?: Tables<"media"> | null };

type DbGame = Tables<"games"> & {
  media?: GameMediaWithAsset[];
  product?: { name?: string | null } | null;
  main_purpose?: { name?: string | null } | null;
  main_purpose_id: string | null;
  secondary_purposes?: Array<{ purpose?: { id?: string | null; name?: string | null; type?: string | null } | null }>;
  translations?: Array<{
    locale?: string | null;
    title?: string | null;
    short_description?: string | null;
    instructions?: unknown;
  }> | null;
};

/**
 * Adapter: Converts Browse API response to GameSummary
 * Uses the centralized mapper from lib/game-display
 */
function mapBrowseGameToSummary(dbGame: DbGame): GameSummary {
  // Extract purpose from main_purpose or secondary_purposes
  const purposeName =
    dbGame.main_purpose?.name ??
    dbGame.secondary_purposes?.map((p) => p?.purpose?.name).filter(Boolean)[0] ??
    dbGame.category ??
    undefined;

  // Use centralized mapper with type casting for Browse's DbGame shape
  const summary = mapDbGameToSummary(dbGame as Parameters<typeof mapDbGameToSummary>[0]);
  
  // Add purpose which isn't in standard mapper
  return {
    ...summary,
    purpose: purposeName ?? null,
    product: dbGame.product?.name ?? null,
  };
}

const initialFilters: BrowseFilters = {
  products: [],
  mainPurposes: [],
  subPurposes: [],
  groupSizes: [],
  energyLevels: [],
  environment: null,
  minPlayers: null,
  maxPlayers: null,
  minAge: null,
  maxAge: null,
  minTime: null,
  maxTime: null,
};

const pageSize = 12;

export function BrowsePage() {
  const locale = useLocale();
  const [games, setGames] = useState<GameSummary[]>([]);
  const [featuredGames, setFeaturedGames] = useState<GameSummary[]>([]);
  const [reactions, setReactions] = useState<GameReactionMap>({});
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<BrowseFilters>(initialFilters);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  
  // Auth and tenant context
  const { currentTenant, tenantRole } = useTenant();
  const { effectiveGlobalRole, userProfile } = useAuth();
  const tenantId = currentTenant?.id ?? null;
  
  // Derive user play modes from their role/context
  const userPlayModes = useMemo(() => {
    const isDemoUser = userProfile?.is_demo_user ?? false;
    return getUserPlayModesFromContext(effectiveGlobalRole, tenantRole, isDemoUser);
  }, [effectiveGlobalRole, tenantRole, userProfile?.is_demo_user]);
  
  // Use the new browse filters hook (replaces manual fetchFilters)
  const {
    options: filterOptions,
    visibleGroups,
    hasSuperFilters,
    isLoading: isLoadingFilters,
    error: filterError,
  } = useBrowseFilters(tenantId, userPlayModes);

  // Reset filters when tenant changes to avoid stale, disallowed selections
  useEffect(() => {
    setFilters(initialFilters);
    setPage(1);
    setGames([]);
    setHasMore(true);
  }, [tenantId]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  // Handle noAccess based on filterOptions (no products available)
  useEffect(() => {
    if (tenantId && filterOptions && filterOptions.products.length === 0) {
      setNoAccess(true);
    } else {
      setNoAccess(false);
    }
  }, [tenantId, filterOptions]);

  const fetchGames = useCallback(
    async (payload: {
      search?: string;
      tenantId?: string | null;
      filters: BrowseFilters;
        sort: SortOption;
        page: number;
    }) => {
      const response = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: payload.search || undefined,
          tenantId: payload.tenantId ?? null,
          products: payload.filters.products,
          mainPurposes: payload.filters.mainPurposes,
          subPurposes: payload.filters.subPurposes,
          groupSizes: payload.filters.groupSizes,
          energyLevels: payload.filters.energyLevels,
          environment: payload.filters.environment || undefined,
          minPlayers: payload.filters.minPlayers || undefined,
          maxPlayers: payload.filters.maxPlayers || undefined,
          minAge: payload.filters.minAge || undefined,
          maxAge: payload.filters.maxAge || undefined,
          minTime: payload.filters.minTime || undefined,
          maxTime: payload.filters.maxTime || undefined,
          showLiked: payload.filters.showLiked || undefined,
          sort: payload.sort,
          page: payload.page,
          pageSize,
          locale,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load games");
      }

      const json = (await response.json()) as {
        games: DbGame[];
        total: number;
        hasMore?: boolean;
        metadata?: { allowedProducts?: string[] };
      };

      if (tenantId && (json.metadata?.allowedProducts?.length ?? 0) === 0) {
        setNoAccess(true);
      } else {
        setNoAccess(false);
      }

      return {
        games: json.games,
        total: json.total ?? json.games.length,
        hasMore: json.hasMore ?? payload.page * pageSize < (json.total ?? json.games.length),
      };
    },
    [tenantId, locale]
  );

  // Fetch games from database
  const loadGames = useCallback(
    async (targetPage: number, append: boolean) => {
      if (append) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
        setGames([]);
      }
      setError(null);
      try {
        const { games: dbGames, total: dbTotal, hasMore: more } = await fetchGames({
          search: debouncedSearch || undefined,
          tenantId,
          filters,
          sort,
          page: targetPage,
        });

        const mapped = dbGames.map(mapBrowseGameToSummary);
        
        // Set games first, then fetch reactions in background
        setGames((prev) => (append ? [...prev, ...mapped] : mapped));
        setTotal(dbTotal);
        setHasMore(more);
        
        // Fetch reactions for these games (non-blocking)
        const gameIds = mapped.map((g) => g.id);
        if (gameIds.length > 0) {
          fetch('/api/game-reactions/batch', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameIds }),
          })
            .then((res) => res.json())
            .then((json: { success?: boolean; reactions?: GameReactionMap; error?: string }) => {
              if (!json?.success || !json.reactions) {
                console.warn('Failed to fetch reactions:', json?.error ?? 'Unknown error')
                return
              }
              const reactionMap = json.reactions
              setReactions((prev) => (append ? { ...prev, ...reactionMap } : reactionMap))
            })
            .catch((err) => {
              console.warn('Failed to fetch reactions:', err)
            })
        }
      } catch (err) {
        console.error("Failed to load games:", err);
        setError("Kunde inte ladda aktiviteter");
      } finally {
        if (append) {
          setIsLoadingMore(false);
        } else {
          setIsLoading(false);
        }
      }
    },
    [fetchGames, debouncedSearch, filters, tenantId, sort]
  );

  // Reset paging when inputs change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch, filters, sort, tenantId, locale]);

  // Load games on mount and when search/filter/sort changes
  useEffect(() => {
    void loadGames(page, page > 1);
  }, [loadGames, page]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await fetch(`/api/games/featured?limit=4${tenantId ? `&tenantId=${tenantId}` : ""}`);
        if (!res.ok) return;
        const json = (await res.json()) as { games: DbGame[] };
        setFeaturedGames((json.games ?? []).map(mapBrowseGameToSummary));
      } catch (err) {
        console.warn("[BrowsePage] featured fetch failed", err);
      }
    };
    void fetchFeatured();
  }, [tenantId]);

  const handleApplyFilters = (next: BrowseFilters) => {
    setFilters(next);
    setPage(1);
  };
  const handleClearAll = () => {
    setFilters(initialFilters);
    setPage(1);
  };
  const handleClearSingle = (key: keyof BrowseFilters, value: string) => {
    setFilters((prev) => {
      const current = prev[key];

      if (Array.isArray(current)) {
        return {
          ...prev,
          [key]: current.filter((item) => item !== value),
        } as BrowseFilters;
      }

      if (typeof current === "number" || current === null) {
        return { ...prev, [key]: null } as BrowseFilters;
      }

      // environment or other scalar
      return { ...prev, [key]: null } as BrowseFilters;
    });
    setPage(1);
  };


  const browseIcon = appNavItems.find((item) => item.href === "/app/browse")?.icon;
  const t = useTranslations("browse");

  return (
    <div className="space-y-4">
                  <PageTitleHeader
        icon={browseIcon}
        title={t("pageTitle")}
        subtitle={t("pageSubtitle")}
      />

      {featuredGames.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-card to-card px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">{t("featured.label")}</p>
              <h2 className="text-lg font-semibold text-foreground">{t("featured.title")}</h2>
            </div>
            <span className="text-xs text-muted-foreground">{t("featured.count", { count: featuredGames.length })}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredGames.map((game) => (
              <GameCard 
                key={game.id} 
                game={{ ...game, isFavorite: reactions[game.id] === 'like' }} 
                variant="list" 
              />
            ))}
          </div>
        </section>
      )}

      <SearchBar
        value={searchInput}
        onChange={(value) => {
          setSearchInput(value);
          setPage(1);
        }}
        onClear={() => {
          setSearchInput("");
          setPage(1);
        }}
      />
      <FilterBar
        filters={filters}
        options={filterOptions}
        sort={sort}
        view={view}
        total={total}
        onOpen={() => setSheetOpen(true)}
        onClearFilter={handleClearSingle}
        onSortChange={(value) => {
          setSort(value);
          setPage(1);
        }}
        onViewChange={setView}
      />
      <FilterSheetV2
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        options={filterOptions}
        visibleGroups={visibleGroups}
        hasSuperFilters={hasSuperFilters}
        onApply={handleApplyFilters}
        onClearAll={handleClearAll}
      />

      {noAccess && (
        <div className="rounded-xl border border-border/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t("noAccess")}
        </div>
      )}

      {error ? (
        <ErrorState
          title={t("error.title")}
          description={t("error.description")}
          onRetry={() => window.location.reload()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <GameCardSkeleton key={i} variant="grid" />
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState
          title={t("empty.title")}
          description={t("empty.description")}
          action={{ label: t("empty.clearFilters"), onClick: handleClearAll }}
        />
      ) : (
        <div key={locale} className="space-y-4">
          {games.length > 0 && debouncedSearch === "" && Object.values(filters).every((val) => Array.isArray(val) ? val.length === 0 : val === null) && (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{t("filterHint")}</span>
            </div>
          )}
          <div
            className={cn(
              "gap-4",
              view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "flex flex-col"
            )}
          >
            {games.map((game) => (
              <GameCard 
                key={game.id} 
                game={{ ...game, isFavorite: reactions[game.id] === 'like' }} 
                variant={view} 
              />
            ))}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
            <div className="font-medium text-foreground">{total} aktiviteter</div>
            <div className="flex items-center gap-2">
              <Toggle
                aria-label="Visa fler"
                disabled={!hasMore || isLoadingMore}
                pressed={false}
                onClick={() => setPage((p) => p + 1)}
              >
                {isLoadingMore ? "Laddar..." : hasMore ? "Visa fler" : "Slut på resultat"}
              </Toggle>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

