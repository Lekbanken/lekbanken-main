"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionHeader } from "./components/SessionHeader";
import { StepViewer } from "./components/StepViewer";
import { NavigationControls } from "./components/NavigationControls";
import type { GameRun, Step } from "./types";

const DEFAULT_STEP_DURATION_MINUTES = 5;
const STORAGE_PREFIX = "play-session:";

type ApiGame = {
  id: string;
  name: string;
  description?: string | null;
  translations?: {
    locale: string;
    title: string;
    short_description: string;
    instructions: unknown;
    materials?: string[] | null;
  }[];
  location_type?: string | null;
  min_players?: number | null;
  max_players?: number | null;
  age_min?: number | null;
  age_max?: number | null;
};

type InstructionStep = {
  title?: string;
  description?: string;
  duration_minutes?: number;
  materials?: string[];
  safety?: string;
};

type ErrorCode = "not-found" | "network" | null;

function clampStep(index: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

function mapApiToGameRun(game: ApiGame | null, localeOrder: string[] = ["sv", "no", "en"]): GameRun | null {
  if (!game) return null;
  const translations = game.translations ?? [];
  const translation = localeOrder.map((l) => translations.find((t) => t.locale === l)).find(Boolean) || translations[0];

  const mappedSteps = Array.isArray(translation?.instructions)
    ? (translation?.instructions as InstructionStep[]).map((s, i) => ({
        id: s.title || `step-${i + 1}`,
        title: s.title || `Steg ${i + 1}`,
        description: s.description || "",
        durationMinutes: s.duration_minutes ?? undefined,
        materials: s.materials?.filter((item): item is string => Boolean(item)),
        safety: s.safety,
      }))
    : [
        {
          id: "step-1",
          title: "Instruktioner",
          description: translation?.short_description || game.description || "",
        },
      ];

  const materials = (translation?.materials || []).filter((item): item is string => Boolean(item));
  if (materials.length > 0 && mappedSteps[0]) {
    mappedSteps[0] = { ...mappedSteps[0], materials };
  }

  const groupSize =
    game.min_players && game.max_players ? `${game.min_players}-${game.max_players} deltagare` : undefined;
  const ageRange = game.age_min && game.age_max ? `${game.age_min}-${game.age_max} år` : undefined;

  return {
    id: game.id,
    title: translation?.title || game.name,
    summary: translation?.short_description || game.description || "",
    steps: mappedSteps,
    environment: game.location_type || undefined,
    groupSize,
    ageRange,
  };
}

function formatSeconds(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const secs = (safe % 60).toString().padStart(2, "0");
  return `${minutes}:${secs}`;
}

function getStepDurationSeconds(step?: Step | null) {
  const minutes = step?.durationMinutes ?? DEFAULT_STEP_DURATION_MINUTES;
  return Math.max(30, Math.round(minutes * 60));
}

export function PlayPage({ gameId }: { gameId?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<ErrorCode>(null);
  const [game, setGame] = useState<GameRun | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const restoredTimerRef = useRef(false);

  const storageKey = gameId ? `${STORAGE_PREFIX}${gameId}` : null;

  const totalSteps = game?.steps.length ?? 0;
  const step = useMemo(() => game?.steps[currentStep], [game, currentStep]);

  const loadGame = async () => {
    if (!gameId) {
      setIsLoading(false);
      setErrorCode("not-found");
      return;
    }

    setIsLoading(true);
    setErrorCode(null);
    try {
      const res = await fetch(`/api/games/${gameId}`);

      if (res.status === 404) {
        setGame(null);
        setErrorCode("not-found");
        return;
      }

      if (!res.ok) {
        setGame(null);
        setErrorCode("network");
        return;
      }

      const json = (await res.json()) as { game: ApiGame };
      const mapped = mapApiToGameRun(json.game);
      if (!mapped || mapped.steps.length === 0) {
        setGame(null);
        setErrorCode("not-found");
        return;
      }

      setGame(mapped);
      setCurrentStep(0);
      setErrorCode(null);
      restoredTimerRef.current = false;
    } catch (err) {
      console.error("Failed to load game", err);
      setGame(null);
      setErrorCode("network");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadGame();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !game || !totalSteps) return;

    try {
      const raw = storageKey ? window.localStorage.getItem(storageKey) : null;
      const saved = raw ? (JSON.parse(raw) as {
        stepIndex?: number;
        remainingSeconds?: number;
        timerTotalSeconds?: number;
        isRunning?: boolean;
      }) : null;

      const safeIndex = clampStep(saved?.stepIndex ?? 0, totalSteps);
      const targetStep = game.steps[safeIndex];
      const defaultTotal = getStepDurationSeconds(targetStep);
      const savedTotal = saved?.timerTotalSeconds && saved.timerTotalSeconds > 0 ? saved.timerTotalSeconds : defaultTotal;
      const savedRemaining = saved?.remainingSeconds && saved.remainingSeconds > 0
        ? Math.min(saved.remainingSeconds, savedTotal)
        : savedTotal;

      setCurrentStep(safeIndex);
      setTimerTotal(savedTotal);
      setTimerRemaining(savedRemaining);
      setIsTimerRunning(Boolean(saved?.isRunning && savedRemaining > 0));
      restoredTimerRef.current = true;
    } catch (err) {
      console.warn("Failed to restore play state", err);
      setCurrentStep(0);
      const targetStep = game.steps[0];
      const total = getStepDurationSeconds(targetStep);
      setTimerTotal(total);
      setTimerRemaining(total);
      setIsTimerRunning(false);
    }
  }, [gameId, game, totalSteps, storageKey]);

  useEffect(() => {
    if (!storageKey || !game || !totalSteps) return;
    const payload = {
      stepIndex: currentStep,
      remainingSeconds: timerRemaining,
      timerTotalSeconds: timerTotal,
      isRunning: isTimerRunning,
    };
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist play state", err);
    }
  }, [storageKey, game, totalSteps, currentStep, timerRemaining, timerTotal, isTimerRunning]);

  useEffect(() => {
    if (!step) return;
    if (restoredTimerRef.current) {
      restoredTimerRef.current = false;
      return;
    }
    const total = getStepDurationSeconds(step);
    setTimerTotal(total);
    setTimerRemaining(total);
    setIsTimerRunning(false);
  }, [step]);

  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = window.setInterval(() => {
      setTimerRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isTimerRunning]);

  useEffect(() => {
    if (timerRemaining === 0 && isTimerRunning) {
      setIsTimerRunning(false);
    }
  }, [timerRemaining, isTimerRunning]);

  const gotoPrev = () => setCurrentStep((i) => clampStep(i - 1, totalSteps));
  const gotoNext = () => setCurrentStep((i) => clampStep(i + 1, totalSteps));
  const handleEnd = () => setCurrentStep(Math.max(totalSteps - 1, 0));

  const handleBackToGames = () => router.push("/app/games");
  const handleToggleTimer = () => {
    if (!step) return;
    if (timerTotal === 0 || timerRemaining === 0) {
      const total = getStepDurationSeconds(step);
      setTimerTotal(total);
      setTimerRemaining(total);
    }
    setIsTimerRunning((running) => !running);
  };
  const handleResetTimer = () => {
    if (!step) return;
    const total = getStepDurationSeconds(step);
    setTimerTotal(total);
    setTimerRemaining(total);
    setIsTimerRunning(false);
  };

  const timerLabel = (() => {
    if (isTimerRunning) return "Pausa tid";
    if (timerRemaining > 0 && timerRemaining < timerTotal) return "Fortsätt";
    return "Starta tid";
  })();

  if (!gameId) {
    return (
      <ErrorState
        title="Ingen lek vald"
        description="Välj en lek att spela."
        onGoBack={handleBackToGames}
      />
    );
  }

  if (errorCode === "not-found") {
    return (
      <ErrorState
        title="Denna lek kan inte spelas just nu"
        description="Spelet är antingen inte publicerat eller så saknas behörighet."
        onGoBack={handleBackToGames}
      />
    );
  }

  if (errorCode === "network") {
    return (
      <ErrorState
        title="Kunde inte ladda passet"
        description="Kontrollera uppkoppling eller försök igen."
        onRetry={loadGame}
        onGoBack={handleBackToGames}
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

      <StepViewer
        step={step}
        index={currentStep}
        total={totalSteps}
        timerSeconds={timerRemaining}
        timerTotalSeconds={timerTotal}
        timerRunning={isTimerRunning}
        formatTime={formatSeconds}
      />

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
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleBackToGames}
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Byt lek
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleToggleTimer}
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
          </svg>
          {timerLabel}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleResetTimer}
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l3 3" />
          </svg>
          Nollställ
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
