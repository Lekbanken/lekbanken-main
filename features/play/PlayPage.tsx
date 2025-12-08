"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionHeader } from "./components/SessionHeader";
import { StepViewer } from "./components/StepViewer";
import { NavigationControls } from "./components/NavigationControls";
import type { GameRun } from "./types";

type ApiGame = {
  id: string;
  name: string;
  description?: string | null;
  translations?: { locale: string; title: string; short_description: string; instructions: any }[];
  location_type?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  age_min?: number | null;
  age_max?: number | null;
};

function mapApiToGameRun(game: ApiGame | null, localeOrder: string[] = ["sv", "no", "en"]): GameRun | null {
  if (!game) return null;
  const translations = game.translations ?? [];
  const translation = localeOrder.map((l) => translations.find((t) => t.locale === l)).find(Boolean) || translations[0];

  const steps =
    Array.isArray(translation?.instructions)
      ? (translation?.instructions as { title?: string; description?: string; duration_minutes?: number }[]).map((s, i) => ({
          id: s.title || `step-${i + 1}`,
          title: s.title || `Steg ${i + 1}`,
          description: s.description || "",
          durationMinutes: s.duration_minutes ?? undefined,
        }))
      : [
          {
            id: "step-1",
            title: "Instruktioner",
            description: translation?.short_description || game.description || "",
          },
        ];

  const groupSize =
    game.min_players && game.max_players ? `${game.min_players}-${game.max_players} deltagare` : undefined;
  const ageRange = game.age_min && game.age_max ? `${game.age_min}-${game.age_max} år` : undefined;

  return {
    id: game.id,
    title: translation?.title || game.name,
    summary: translation?.short_description || game.description || "",
    steps,
    environment: game.location_type || undefined,
    groupSize,
    ageRange,
  };
}

export function PlayPage({ gameId }: { gameId?: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [game, setGame] = useState<GameRun | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/games/${gameId}/`, { method: "GET" });
        if (!res.ok) {
          throw new Error("Not found");
        }
        const json = (await res.json()) as { game: ApiGame };
        setGame(mapApiToGameRun(json.game));
      } catch (err) {
        console.error("Failed to load game", err);
        setError("Kunde inte ladda passet");
      } finally {
        setIsLoading(false);
        setCurrentStep(0);
      }
    };
    if (gameId) {
      void load();
    }
  }, [gameId]);

  const totalSteps = game?.steps.length ?? 0;
  const step = useMemo(() => game?.steps[currentStep], [game, currentStep]);

  const gotoPrev = () => setCurrentStep((i) => Math.max(0, i - 1));
  const gotoNext = () => setCurrentStep((i) => Math.min(Math.max(totalSteps - 1, 0), i + 1));
  const handleEnd = () => setCurrentStep(Math.max(totalSteps - 1, 0));

  if (error) {
    return (
      <ErrorState
        title="Kunde inte ladda passet"
        description="Kontrollera uppkoppling eller försök igen."
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (isLoading || !game || !step) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-xs" />
        </div>
        <div className="rounded-3xl border border-border/60 bg-card p-5 shadow-md">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-6 w-6 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-40" />
            </div>
            <Skeleton className="h-7 w-16 rounded-full" />
          </div>
          <div className="mt-5 space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-44">
      <SessionHeader
        title={game.title}
        summary={game.summary}
        meta={[
          { label: "Miljö", value: game.environment ?? "" },
          { label: "Grupp", value: game.groupSize ?? "" },
          { label: "Ålder", value: game.ageRange ?? "" },
        ].filter((m) => m.value)}
      />

      <StepViewer step={step} index={currentStep} total={totalSteps} />

      <details className="group rounded-2xl bg-muted/30 text-sm" open>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-foreground">
          <svg className="h-4 w-4 text-primary transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Tips för sessionen
        </summary>
        <ul className="space-y-1.5 px-4 pb-4 pl-10 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Skjut undan UI-krom när du läser upp instruktioner.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Planera 1-2 reservlekar i Planner och byt med ett tryck.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Behåll skärmen ljus och textstorlek stor utomhus.</span>
          </li>
        </ul>
      </details>

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-foreground" onClick={() => window.location.href = '/app/games'}>
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Byt lek
        </Button>
        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-foreground">
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          Pausa tid
        </Button>
      </div>

      <NavigationControls
        current={currentStep}
        total={totalSteps}
        onPrev={gotoPrev}
        onNext={gotoNext}
        onEnd={handleEnd}
        progress={totalSteps > 1 ? (currentStep + 1) / totalSteps : 1}
      />
    </div>
  );
}
