"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionHeader } from "./components/SessionHeader";
import { StepViewer } from "./components/StepViewer";
import { NavigationControls } from "./components/NavigationControls";
import type { GameRun } from "./types";

const mockGames: Record<string, GameRun> = {
  "demo-1": {
    id: "demo-1",
    title: "Stafett med hinder",
    summary: "Snabb stafett med enkla hinder. Passar för uppvärmning eller tempo.",
    environment: "Inne/ute",
    groupSize: "6-14 deltagare",
    ageRange: "8-14 år",
    steps: [
      {
        id: "step-1",
        title: "Förbered bana",
        description: "Placera ut 4-6 hinder i en rak linje. Dela gruppen i två lag.",
        durationMinutes: 3,
        materials: ["4-6 koner eller liknande", "En boll per lag"],
      },
      {
        id: "step-2",
        title: "Förklara regler",
        description:
          "Varje lag springer stafett, en i taget. Varje deltagare ska runda hindren och tillbaka. Växla genom att ge bollen.",
        durationMinutes: 2,
        safety: "Se till att avståndet mellan hindren är säkert. Värm upp innan ni börjar springa.",
      },
      {
        id: "step-3",
        title: "Kör 2-3 rundor",
        description: "Starta runda ett. Byt ordning eller lägg till fler hinder för runda två och tre.",
        durationMinutes: 8,
      },
    ],
  },
  "demo-2": {
    id: "demo-2",
    title: "Andningslek",
    summary: "Kort mindfulness-övning med andning och rörelse för att samla fokus.",
    environment: "Inne/ute",
    groupSize: "2-10 deltagare",
    ageRange: "6-12 år",
    steps: [
      {
        id: "step-1",
        title: "Samla gruppen",
        description: "Be alla stå i en cirkel, fötterna axelbrett. Förklara att ni ska göra lugna andetag.",
        durationMinutes: 2,
      },
      {
        id: "step-2",
        title: "Guidad andning",
        description: "Räkna 4 in, håll 2, räkna 4 ut. Upprepa 5 gånger. Lägg till armrörelser om ni vill.",
        durationMinutes: 5,
        safety: "Avsluta om någon känner obehag.",
      },
      {
        id: "step-3",
        title: "Reflektion",
        description: "Fråga hur kroppen känns. Uppmuntra kort delning, håll tempot lugnt.",
        durationMinutes: 3,
      },
    ],
  },
};

export function PlayPage({ gameId }: { gameId?: string }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading] = useState(false);
  const [error] = useState<string | null>(null);

  const game = useMemo(() => mockGames[gameId ?? "demo-1"], [gameId]);
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

      {/* Tips block - subtle and collapsible feel */}
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

      {/* Secondary actions - smaller and grouped */}
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground hover:text-foreground">
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
