"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GameCard, GameCardSkeleton } from "@/components/game/GameCard";
import { mapSearchResultToSummary } from "@/lib/game-display";
import type { GameSummary } from "@/lib/game-display";

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

export function GamePicker({
  open,
  onOpenChange,
  onSelect,
  seedResults,
  initialQuery,
}: GamePickerProps) {
  const t = useTranslations('planner');
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
          <SheetTitle>{t('gamePicker.title')}</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
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
              onClick={() => void searchGames()}
              disabled={isSearching || !query.trim()}
            >
              {isSearching ? t('gamePicker.searching') : t('gamePicker.search')}
            </Button>
          </div>

          <div className="max-h-[calc(100vh-200px)] space-y-2 overflow-y-auto">
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

            {isSearching && (
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
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
