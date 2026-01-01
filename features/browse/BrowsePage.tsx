"use client";

import { useCallback, useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { Toggle } from "@/components/ui/toggle";
import { useTenant } from "@/lib/context/TenantContext";
import { FilterBar } from "./components/FilterBar";
import { FilterSheet } from "./components/FilterSheet";
import { GameCard } from "./components/GameCard";
import { SearchBar } from "./components/SearchBar";
import type { BrowseFilters, FilterOptions, Game, SortOption } from "./types";
import type { Tables } from "@/types/supabase";
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
};

function mapDbGameToGame(dbGame: DbGame): Game {
  const media = dbGame.media ?? [];
  const cover = media.find((m) => m.kind === "cover") ?? media[0];
  const coverUrl = cover?.media?.url ?? null;

  const getGroupSize = (min: number | null, max: number | null): Game["groupSize"] => {
    const avgPlayers = ((min ?? 2) + (max ?? 10)) / 2;
    if (avgPlayers <= 6) return "small";
    if (avgPlayers <= 14) return "medium";
    return "large";
  };

  const getEnvironment = (locationType: string | null): Game["environment"] => {
    if (locationType === "indoor") return "indoor";
    if (locationType === "outdoor") return "outdoor";
    return "both";
  };

  const purposeName =
    dbGame.main_purpose?.name ||
    dbGame.secondary_purposes?.map((p) => p?.purpose?.name).filter(Boolean)[0] ||
    dbGame.category ||
    "aktivitet";
  const playMode =
    dbGame.play_mode === "participants" || dbGame.play_mode === "facilitated" || dbGame.play_mode === "basic"
      ? dbGame.play_mode
      : "basic";

  return {
    id: dbGame.id,
    title: dbGame.name,
    description: dbGame.description ?? "",
    durationMinutes: dbGame.time_estimate_min ?? 15,
    groupSize: getGroupSize(dbGame.min_players, dbGame.max_players),
    ageRange:
      dbGame.age_min && dbGame.age_max
        ? `${dbGame.age_min}-${dbGame.age_max}`
        : "Alla åldrar",
    energyLevel: (dbGame.energy_level as Game["energyLevel"]) ?? "medium",
    environment: getEnvironment(dbGame.location_type),
    purpose: purposeName,
    playMode,
    imageUrl: coverUrl,
    productName: dbGame.product?.name ?? null,
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
  const [games, setGames] = useState<Game[]>([]);
  const [featuredGames, setFeaturedGames] = useState<Game[]>([]);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<BrowseFilters>(initialFilters);
  const [sort, setSort] = useState<SortOption>("relevance");
  const [page, setPage] = useState(1);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(null);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccess, setNoAccess] = useState(false);
  const { currentTenant } = useTenant();

  const tenantId = currentTenant?.id ?? null;

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

  const fetchFilters = useCallback(async () => {
    try {
      const res = await fetch(`/api/browse/filters${tenantId ? `?tenantId=${tenantId}` : ""}`);
      if (!res.ok) throw new Error("Failed to load filters");
      const json = (await res.json()) as {
        products: { id: string; name: string | null }[];
        purposes: { id: string; name: string | null }[];
        subPurposes: { id: string; name: string | null; parent_id?: string | null }[];
        metadata?: { allowedProducts?: string[] };
      };
      setFilterOptions({
        products: json.products ?? [],
        mainPurposes: json.purposes ?? [],
        subPurposes: json.subPurposes ?? [],
      });
      if (tenantId && (json.metadata?.allowedProducts?.length ?? 0) === 0) {
        setNoAccess(true);
      } else {
        setNoAccess(false);
      }
    } catch (err) {
      console.error("[BrowsePage] filter fetch failed", err);
      setFilterOptions({ products: [], mainPurposes: [], subPurposes: [] });
    }
  }, [tenantId]);

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
          sort: payload.sort,
          page: payload.page,
          pageSize,
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
    [tenantId]
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

        const mapped = dbGames.map(mapDbGameToGame);
        setGames((prev) => (append ? [...prev, ...mapped] : mapped));
        setTotal(dbTotal);
        setHasMore(more);
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

  // Fetch filter options on mount/tenant change
  useEffect(() => {
    void fetchFilters();
  }, [fetchFilters]);

  // Reset paging when inputs change
  useEffect(() => {
    setPage(1);
    setHasMore(true);
  }, [debouncedSearch, filters, sort, tenantId]);

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
        setFeaturedGames((json.games ?? []).map(mapDbGameToGame));
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

  return (
    <div className="space-y-4">
                  <PageTitleHeader
        icon={browseIcon}
        title="UPPTÄCK"
        subtitle="Hitta rätt aktivitet"
      />

      {featuredGames.length > 0 && (
        <section className="rounded-2xl border border-border/60 bg-gradient-to-r from-primary/5 via-card to-card px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Utvalda</p>
              <h2 className="text-lg font-semibold text-foreground">Tips från redaktionen</h2>
            </div>
            <span className="text-xs text-muted-foreground">{featuredGames.length} aktiviteter</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {featuredGames.map((game) => (
              <GameCard key={game.id} game={game} layout="list" />
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
      <FilterSheet
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        options={filterOptions}
        onApply={handleApplyFilters}
        onClearAll={handleClearAll}
      />

      {noAccess && (
        <div className="rounded-xl border border-border/60 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Du saknar tillgång till produkter i denna tenant. Kontakta admin eller välj annan tenant.
        </div>
      )}

      {error ? (
        <ErrorState
          title="Kunde inte ladda aktiviteter"
          description="Prova att uppdatera sidan eller försök igen senare."
          onRetry={() => window.location.reload()}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/60 bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/5" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-7 w-16 rounded-lg" />
                <Skeleton className="h-7 w-14 rounded-lg" />
                <Skeleton className="h-7 w-14 rounded-lg" />
              </div>
              <div className="mt-3 flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : games.length === 0 ? (
        <EmptyState
          title="Inga lekar matchar"
          description="Prova att ändra sökningen eller justera filtren."
          action={{ label: "Rensa filter", onClick: handleClearAll }}
        />
      ) : (
        <div className="space-y-4">
          {games.length > 0 && debouncedSearch === "" && Object.values(filters).every((val) => Array.isArray(val) ? val.length === 0 : val === null) && (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Använd filter för att hitta aktiviteter som passar din grupp.</span>
            </div>
          )}
          <div
            className={cn(
              "gap-4",
              view === "grid" ? "grid grid-cols-1 sm:grid-cols-2" : "flex flex-col"
            )}
          >
            {games.map((game) => (
              <GameCard key={game.id} game={game} layout={view} />
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

