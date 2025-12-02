"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { FilterBar } from "./components/FilterBar";
import { FilterSheet } from "./components/FilterSheet";
import { GameCard } from "./components/GameCard";
import { SearchBar } from "./components/SearchBar";
import type { BrowseFilters, Game } from "./types";

const mockGames: Game[] = [
  {
    id: "1",
    title: "Bollkull",
    description: "Klassisk kullek med mjuk boll. Perfekt för uppvärmning och energi.",
    durationMinutes: 10,
    groupSize: "medium",
    ageRange: "7-12",
    energyLevel: "high",
    environment: "either",
    purpose: "uppvärmning",
  },
  {
    id: "2",
    title: "Samarbetspussel",
    description: "Lös ett pussel tillsammans under tidspress. Tränar samarbete och fokus.",
    durationMinutes: 15,
    groupSize: "small",
    ageRange: "8-14",
    energyLevel: "medium",
    environment: "indoor",
    purpose: "samarbete",
  },
  {
    id: "3",
    title: "Stafett med hinder",
    description: "Snabb stafett med enkla hinder. Passar ute eller inne med yta.",
    durationMinutes: 20,
    groupSize: "large",
    ageRange: "10-15",
    energyLevel: "high",
    environment: "outdoor",
    purpose: "fokus",
  },
  {
    id: "4",
    title: "Andningslek",
    description: "Kort mindfulness-övning med andning och rörelse, bra för nedvarvning.",
    durationMinutes: 8,
    groupSize: "small",
    ageRange: "6-12",
    energyLevel: "low",
    environment: "either",
    purpose: "trygghet",
  },
];

const initialFilters: BrowseFilters = {
  ages: [],
  groupSizes: [],
  energyLevels: [],
  environments: [],
  purposes: [],
};

export function BrowsePage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<BrowseFilters>(initialFilters);
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const filteredGames = useMemo(() => {
    return mockGames.filter((game) => {
      const matchesSearch =
        !search ||
        game.title.toLowerCase().includes(search.toLowerCase()) ||
        game.description.toLowerCase().includes(search.toLowerCase());

      const matchesAge = filters.ages.length === 0 || filters.ages.includes(game.ageRange);
      const matchesGroup =
        filters.groupSizes.length === 0 || filters.groupSizes.includes(game.groupSize);
      const matchesEnergy =
        filters.energyLevels.length === 0 || filters.energyLevels.includes(game.energyLevel);
      const matchesEnv =
        filters.environments.length === 0 || filters.environments.includes(game.environment);
      const matchesPurpose =
        filters.purposes.length === 0 || filters.purposes.includes(game.purpose);

      return matchesSearch && matchesAge && matchesGroup && matchesEnergy && matchesEnv && matchesPurpose;
    });
  }, [filters, search]);

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
