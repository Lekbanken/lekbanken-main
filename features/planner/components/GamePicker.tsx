"use client";

import * as React from "react";
import Image from "next/image";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GameSearchResult = {
  id: string;
  slug?: string | null;
  time_estimate_min?: number | null;
  time_estimate_max?: number | null;
  image_url?: string | null;
  translations?: { title?: string | null; short_description?: string | null }[];
};

type GamePickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (game: { id: string; title: string; duration: number | null }) => void;
  seedResults?: GameSearchResult[];
  initialQuery?: string;
};

function getGameTitle(game: GameSearchResult): string {
  return game.translations?.[0]?.title || game.slug || "Okänd lek";
}

function getGameDescription(game: GameSearchResult): string {
  return game.translations?.[0]?.short_description || "";
}

export function GamePicker({
  open,
  onOpenChange,
  onSelect,
  seedResults,
  initialQuery,
}: GamePickerProps) {
  const [query, setQuery] = React.useState(initialQuery ?? "");
  const [results, setResults] = React.useState<GameSearchResult[]>(seedResults ?? []);
  const [isSearching, setIsSearching] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(Boolean(seedResults?.length));

  React.useEffect(() => {
    if (!open || !seedResults) return;
    setResults(seedResults);
    setHasSearched(seedResults.length > 0);
    if (typeof initialQuery === "string") {
      setQuery(initialQuery);
    }
  }, [open, seedResults, initialQuery]);

  const searchGames = React.useCallback(async () => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch("/api/games/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ search: query, page: 1, pageSize: 20 }),
      });
      const data = (await res.json()) as { games: GameSearchResult[] };
      setResults(data.games || []);
    } catch (err) {
      console.error("Game search failed", err);
    } finally {
      setIsSearching(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      void searchGames();
    }
  };

  const resetState = () => {
    if (seedResults) {
      setResults(seedResults);
      setHasSearched(seedResults.length > 0);
      setQuery(initialQuery ?? "");
      return;
    }
    setQuery("");
    setResults([]);
    setHasSearched(false);
  };

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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Lägg till lek</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Sök efter lek..."
              className="flex-1"
              autoFocus
            />
            <Button
              onClick={() => void searchGames()}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? "Söker..." : "Sök"}
            </Button>
          </div>

          <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto">
            {!hasSearched && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sök efter en lek för att lägga till i din plan
              </p>
            )}

            {hasSearched && results.length === 0 && !isSearching && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Inga lekar hittades för &quot;{query}&quot;
              </p>
            )}

            {isSearching && (
              <div className="flex items-center justify-center py-8">
                <svg
                  className="h-5 w-5 animate-spin text-primary"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
            )}

            {results.map((game) => (
              <button
                key={game.id}
                type="button"
                onClick={() => handleSelect(game)}
                className="flex w-full items-start gap-3 rounded-xl border border-border/60 bg-card p-3 text-left transition hover:border-primary/40 hover:bg-muted/50"
              >
                {game.image_url ? (
                  <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                    <Image
                      src={game.image_url}
                      alt={getGameTitle(game)}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-muted">
                    <svg
                      className="h-6 w-6 text-muted-foreground"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {getGameTitle(game)}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                    {getGameDescription(game)}
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    {game.time_estimate_min ?? 0} min
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
