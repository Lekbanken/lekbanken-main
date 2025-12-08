"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useTenant } from "@/lib/context/TenantContext";
import { FilterBar } from "./components/FilterBar";
import { FilterSheet } from "./components/FilterSheet";
import { GameCard } from "./components/GameCard";
import { SearchBar } from "./components/SearchBar";
import type { BrowseFilters, Game } from "./types";
import type { Tables } from "@/types/supabase";

type DbGame = Tables<"games"> & {
  media?: any[];
  product?: { name?: string | null } | null;
  main_purpose?: { name?: string | null } | null;
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
    return "either";
  };

  const purposeName = dbGame.main_purpose?.name || dbGame.category || "aktivitet";

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
    imageUrl: coverUrl,
    productName: dbGame.product?.name ?? null,
  };
}

const initialFilters: BrowseFilters = {
  ages: [],
  groupSizes: [],
  energyLevels: [],
  environments: [],
  purposes: [],
};

export function BrowsePage() {
  const [games, setGames] = useState<Game[]>([]);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<BrowseFilters>(initialFilters);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentTenant } = useTenant();

  const fetchGames = useCallback(
    async (params: { search?: string; energyLevel?: Game["energyLevel"]; tenantId?: string | null }) => {
      const response = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          search: params.search || undefined,
          energyLevel: params.energyLevel,
          tenantId: params.tenantId ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to load games");
      }

      const json = (await response.json()) as { games: DbGame[] };
      return json.games;
    },
    []
  );

  // Fetch games from database
  const loadGames = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Get energy level filter if set
      const energyFilter = filters.energyLevels.length === 1 
        ? filters.energyLevels[0] 
        : undefined;

      console.log("[BrowsePage] Loading games with tenantId:", currentTenant?.id ?? "null");
      
      const dbGames = await fetchGames({
        search: search || undefined,
        energyLevel: energyFilter,
        tenantId: currentTenant?.id ?? null,
      });

      console.log("[BrowsePage] Got", dbGames.length, "games from API");
      setGames(dbGames.map(mapDbGameToGame));
    } catch (err) {
      console.error("Failed to load games:", err);
      setError("Kunde inte ladda aktiviteter");
    } finally {
      setIsLoading(false);
    }
  }, [fetchGames, search, filters.energyLevels, currentTenant?.id]);

  // Load games on mount and when search/energy filter changes
  useEffect(() => {
    void loadGames();
  }, [loadGames]);

  // Client-side filter for group size, environment, purpose (not in DB query)
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesGroup =
        filters.groupSizes.length === 0 || filters.groupSizes.includes(game.groupSize);
      const matchesEnv =
        filters.environments.length === 0 || filters.environments.includes(game.environment);
      const matchesPurpose =
        filters.purposes.length === 0 || filters.purposes.includes(game.purpose);

      return matchesGroup && matchesEnv && matchesPurpose;
    });
  }, [games, filters.groupSizes, filters.environments, filters.purposes]);

  const handleApplyFilters = (next: BrowseFilters) => setFilters(next);
  const handleClearAll = () => setFilters(initialFilters);
  const handleClearSingle = (key: keyof BrowseFilters, value: string) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key].filter((item) => item !== value),
    }));
  };

  return (
    <div className="space-y-4">
      <header className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">Upptäck</p>
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Hitta rätt aktivitet</h1>
      </header>

      <SearchBar value={search} onChange={setSearch} onClear={() => setSearch("")} />
      <FilterBar filters={filters} onOpen={() => setSheetOpen(true)} onClearFilter={handleClearSingle} />
      <FilterSheet
        open={isSheetOpen}
        onOpenChange={setSheetOpen}
        filters={filters}
        onApply={handleApplyFilters}
        onClearAll={handleClearAll}
      />

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
      ) : filteredGames.length === 0 ? (
        <EmptyState
          title="Inga lekar matchar"
          description="Prova att ändra sökningen eller justera filtren."
          action={{ label: "Rensa filter", onClick: handleClearAll }}
        />
      ) : (
        <div className="space-y-4">
          {filteredGames.length > 0 && search === "" && Object.values(filters).every(arr => arr.length === 0) && (
            <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <svg className="h-4 w-4 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Använd filter för att hitta aktiviteter som passar din grupp.</span>
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


