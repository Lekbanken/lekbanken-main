import { useMemo, useState } from "react";
import Link from "next/link";
import {
  PlayIcon,
  ClockIcon,
  Squares2X2Icon,
  BookmarkIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AddGameButton } from "./AddGameButton";
import { GameRow } from "./GameRow";
import type { GameItem, Session } from "../types";

type SessionEditorProps = {
  session: Session;
  onUpdate: (session: Session) => void;
};

const suggestedGames: GameItem[] = [
  { id: "g-1", title: "Bollkull", durationMinutes: 10, energy: "high", environment: "either" },
  { id: "g-2", title: "Samarbetspussel", durationMinutes: 15, energy: "medium", environment: "indoor" },
  { id: "g-3", title: "Andningslek", durationMinutes: 8, energy: "low", environment: "either" },
];

export function SessionEditor({ session, onUpdate }: SessionEditorProps) {
  const [localSession, setLocalSession] = useState<Session>(session);

  const totalDuration = useMemo(
    () => localSession.games.reduce((sum, g) => sum + g.durationMinutes, 0),
    [localSession.games],
  );

  const updateSession = (next: Session) => {
    setLocalSession(next);
    onUpdate(next);
  };

  const moveGame = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= localSession.games.length) return;
    const nextGames = [...localSession.games];
    const [item] = nextGames.splice(index, 1);
    nextGames.splice(target, 0, item);
    updateSession({ ...localSession, games: nextGames });
  };

  const removeGame = (id: string) => {
    updateSession({ ...localSession, games: localSession.games.filter((g) => g.id !== id) });
  };

  const addGame = (game: GameItem) => {
    updateSession({ ...localSession, games: [...localSession.games, game] });
  };

  const handleTitleChange = (value: string) => {
    updateSession({ ...localSession, title: value });
  };

  const handleNotesChange = (value: string) => {
    updateSession({ ...localSession, notes: value });
  };

  return (
    <div className="space-y-6">
      {/* Title & Notes Section */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 shadow-sm">
        <div className="space-y-4">
          {/* Title input - underline style */}
          <div>
            <Input
              value={localSession.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Sessionstitel..."
              className="border-0 border-b-2 border-transparent bg-transparent px-0 text-xl font-semibold placeholder:text-muted-foreground/50 focus:border-primary focus:ring-0 focus-visible:ring-0"
            />
          </div>

          {/* Notes */}
          <div>
            <Textarea
              value={localSession.notes ?? ""}
              onChange={(e) => handleNotesChange(e.target.value)}
              rows={2}
              placeholder="Anteckningar: syfte, mål, material..."
              className="min-h-[60px] resize-none rounded-xl border-0 bg-muted/30 placeholder:text-muted-foreground/50"
            />
          </div>
        </div>
      </div>

      {/* Games Section */}
      <div className="space-y-3">
        {/* Section header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Squares2X2Icon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">Lekar i sessionen</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Total duration badge */}
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
              <ClockIcon className="h-3.5 w-3.5" />
              {totalDuration} min
            </div>
          </div>
        </div>

        {/* Games list */}
        {localSession.games.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/20 p-8 text-center">
            <Squares2X2Icon className="mb-2 h-10 w-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Inga lekar ännu</p>
            <p className="mb-4 text-xs text-muted-foreground/70">
              Lägg till lekar för att bygga din session.
            </p>
            <Link
              href="/app/browse"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
            >
              <MagnifyingGlassIcon className="h-4 w-4" />
              Bläddra i lekbiblioteket
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {localSession.games.map((game, index) => (
              <GameRow
                key={game.id}
                game={game}
                index={index}
                total={localSession.games.length}
                onMoveUp={() => moveGame(index, -1)}
                onMoveDown={() => moveGame(index, 1)}
                onRemove={() => removeGame(game.id)}
              />
            ))}
          </div>
        )}

        {/* Add game button */}
        <AddGameButton onAdd={() => addGame(suggestedGames[0])} />
      </div>

      {/* Sticky CTA Section */}
      <div className="sticky bottom-20 z-10 rounded-2xl border border-border/50 bg-background/80 p-3 shadow-xl backdrop-blur-xl">
        <div className="flex gap-2">
          <Button
            href={localSession.games[0] ? `/app/play/${localSession.games[0].id}` : undefined}
            className="h-12 flex-1 gap-2 bg-gradient-to-br from-primary to-primary/80 text-base font-semibold"
            disabled={!localSession.games[0]}
          >
            <PlayIcon className="h-5 w-5" />
            Starta session
            {totalDuration > 0 && (
              <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-sm">
                {totalDuration} min
              </span>
            )}
          </Button>
          <Button variant="outline" className="h-12 gap-2">
            <BookmarkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Spara</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
