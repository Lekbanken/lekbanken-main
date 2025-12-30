"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SessionHeader } from "./components/SessionHeader";
import { StepViewer } from "./components/StepViewer";
import { NavigationControls } from "./components/NavigationControls";
import { startRun, updateRunProgress, fetchLegacyPlayView } from "./api";
import type { Step, Run, RunStep } from "./types";

const DEFAULT_STEP_DURATION_MINUTES = 5;
const STORAGE_PREFIX = "play-run:";
const PROGRESS_DEBOUNCE_MS = 800;

type ErrorCode = "not-found" | "network" | null;

/**
 * Convert RunStep to legacy Step format for StepViewer compatibility
 */
function runStepToStep(rs: RunStep): Step {
  return {
    id: rs.id,
    title: rs.title,
    description: rs.description,
    durationMinutes: rs.durationMinutes,
    materials: rs.materials,
    safety: rs.safety,
    tag: rs.tag,
    note: rs.note,
  };
}

function clampStep(index: number, total: number) {
  if (total <= 0) return 0;
  return Math.min(Math.max(index, 0), total - 1);
}

function getStepDurationSeconds(step?: Step | null) {
  const minutes = step?.durationMinutes ?? DEFAULT_STEP_DURATION_MINUTES;
  return Math.max(30, Math.round(minutes * 60));
}

export function PlayPlanPage({ planId }: { planId?: string }) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<ErrorCode>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [timerTotal, setTimerTotal] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const restoredTimerRef = useRef(false);
  const saveProgressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastProgressRef = useRef<string>("");

  const storageKey = run?.id ? `${STORAGE_PREFIX}${run.id}` : null;

  const totalSteps = run?.steps.length ?? 0;
  const step = useMemo(() => {
    if (!run || !run.steps[currentStep]) return null;
    return runStepToStep(run.steps[currentStep]);
  }, [run, currentStep]);

  /**
   * Start or resume a run for this plan.
   * Uses new Run API, falls back to legacy play view for unpublished plans.
   */
  const loadRun = useCallback(async () => {
    if (!planId) {
      setIsLoading(false);
      setErrorCode("not-found");
      return;
    }

    setIsLoading(true);
    setErrorCode(null);

    // Try new Run API first
    const result = await startRun(planId);

    if (result.success) {
      setRun(result.data.run);
      setCurrentStep(result.data.run.currentStepIndex);
      setErrorCode(null);
      restoredTimerRef.current = false;
      setIsLoading(false);
      return;
    }

    // Fallback for legacy plans or errors
    if (result.error.code === "NOT_FOUND" || result.error.code === "VALIDATION_ERROR") {
      // Try legacy API for backward compatibility
      const legacyResult = await fetchLegacyPlayView(planId);
      if (legacyResult.success && legacyResult.data.play) {
        const legacyRun = mapLegacyPlayToRun(legacyResult.data.play);
        if (legacyRun) {
          setRun(legacyRun);
          setCurrentStep(0);
          setErrorCode(null);
          restoredTimerRef.current = false;
          setIsLoading(false);
          return;
        }
      }
      setErrorCode("not-found");
    } else {
      setErrorCode("network");
    }
    
    setRun(null);
    setIsLoading(false);
  }, [planId]);

  // Legacy fallback: convert old play view to Run format
  function mapLegacyPlayToRun(play: {
    planId: string;
    name: string;
    totalDurationMinutes?: number | null;
    blocks: Array<{
      id: string;
      type: string;
      title: string;
      durationMinutes?: number | null;
      notes?: string | null;
      game?: {
        id: string;
        title: string;
        summary?: string | null;
        materials?: string[] | null;
        steps: Array<{ title: string; description?: string | null; durationMinutes?: number | null }>;
      } | null;
    }>;
  }): Run | null {
    const steps: RunStep[] = [];
    let stepIndex = 0;

    play.blocks.forEach((block) => {
      const tag = block.title || (block.type === "pause" ? "Paus" : "Moment");
      const baseDuration = block.durationMinutes ?? DEFAULT_STEP_DURATION_MINUTES;

      if (block.game?.steps && block.game.steps.length > 0) {
        const materials = (block.game.materials || []).filter((item): item is string => Boolean(item));
        block.game.steps.forEach((s, idx) => {
          steps.push({
            id: `${block.id}:${idx}`,
            index: stepIndex++,
            blockId: block.id,
            blockType: block.type as 'game' | 'pause' | 'preparation' | 'custom',
            title: s.title || `Steg ${idx + 1}`,
            description: s.description || "",
            durationMinutes: s.durationMinutes ?? baseDuration,
            materials: idx === 0 && materials.length > 0 ? materials : undefined,
            tag,
            note: idx === 0 ? block.notes || undefined : undefined,
            gameSnapshot: block.game ? { id: block.game.id, title: block.game.title } : null,
          });
        });
      } else {
        steps.push({
          id: `${block.id}:0`,
          index: stepIndex++,
          blockId: block.id,
          blockType: block.type as 'game' | 'pause' | 'preparation' | 'custom',
          title: tag,
          description: block.notes || "Fortsätt när gruppen är redo.",
          durationMinutes: baseDuration,
          tag,
          gameSnapshot: null,
        });
      }
    });

    if (steps.length === 0) return null;

    return {
      id: `legacy-${play.planId}`,
      planId: play.planId,
      planVersionId: "legacy",
      versionNumber: 0,
      name: play.name,
      status: "in_progress",
      steps,
      blockCount: play.blocks.length,
      totalDurationMinutes: play.totalDurationMinutes ?? steps.reduce((sum, s) => sum + s.durationMinutes, 0),
      currentStepIndex: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
    };
  }

  useEffect(() => {
    void loadRun();
  }, [loadRun]);

  // Restore progress from localStorage
  useEffect(() => {
    if (!run || !totalSteps) return;

    try {
      const raw = storageKey ? window.localStorage.getItem(storageKey) : null;
      const savedLocal = raw
        ? (JSON.parse(raw) as {
            stepIndex?: number;
            remainingSeconds?: number;
            timerTotalSeconds?: number;
            isRunning?: boolean;
          })
        : null;

      if (savedLocal) {
        const safeIndex = clampStep(savedLocal?.stepIndex ?? 0, totalSteps);
        const targetStep = run.steps[safeIndex] ? runStepToStep(run.steps[safeIndex]) : null;
        const defaultTotal = getStepDurationSeconds(targetStep);
        const savedTotal =
          savedLocal?.timerTotalSeconds && savedLocal.timerTotalSeconds > 0
            ? savedLocal.timerTotalSeconds
            : defaultTotal;
        const savedRemaining =
          savedLocal?.remainingSeconds && savedLocal.remainingSeconds > 0
            ? Math.min(savedLocal.remainingSeconds, savedTotal)
            : savedTotal;

        setCurrentStep(safeIndex);
        setTimerTotal(savedTotal);
        setTimerRemaining(savedRemaining);
        setIsTimerRunning(Boolean(savedLocal?.isRunning && savedRemaining > 0));
        restoredTimerRef.current = true;
      }
    } catch (err) {
      console.warn("Failed to restore play state", err);
      setCurrentStep(0);
      const targetStep = run.steps[0] ? runStepToStep(run.steps[0]) : null;
      const total = getStepDurationSeconds(targetStep);
      setTimerTotal(total);
      setTimerRemaining(total);
      setIsTimerRunning(false);
    }
  }, [run, totalSteps, storageKey]);

  // Save progress to localStorage and server
  useEffect(() => {
    if (!storageKey || !run || !totalSteps) return;
    
    const payload = {
      stepIndex: currentStep,
      remainingSeconds: timerRemaining,
      timerTotalSeconds: timerTotal,
      isRunning: isTimerRunning,
    };
    
    // Save to localStorage
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(payload));
    } catch (err) {
      console.warn("Failed to persist play state", err);
    }

    // Save to server (debounced)
    const progressPayload = {
      currentStepIndex: currentStep,
      status: "in_progress" as const,
      timerRemaining,
      timerTotal,
      isTimerRunning,
    };
    const serialized = JSON.stringify(progressPayload);
    if (serialized === lastProgressRef.current) return;
    lastProgressRef.current = serialized;

    if (saveProgressTimerRef.current) {
      clearTimeout(saveProgressTimerRef.current);
    }
    saveProgressTimerRef.current = setTimeout(() => {
      void updateRunProgress(run.id, progressPayload).catch(() => null);
    }, PROGRESS_DEBOUNCE_MS);
  }, [storageKey, run, totalSteps, currentStep, timerRemaining, timerTotal, isTimerRunning]);

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
  }, [step?.id, step]);

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

  const handleBack = () => router.push("/app/planner");
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

  if (!planId) {
    return (
      <ErrorState
        title="Ingen plan vald"
        description="Välj en plan att spela."
        onGoBack={handleBack}
      />
    );
  }

  if (errorCode === "not-found") {
    return (
      <ErrorState
        title="Planen kan inte spelas just nu"
        description="Planen saknas eller så har du inte behörighet."
        onGoBack={handleBack}
      />
    );
  }

  if (errorCode === "network") {
    return (
      <ErrorState
        title="Kunde inte ladda planen"
        description="Kontrollera uppkoppling eller försök igen."
        onRetry={loadRun}
        onGoBack={handleBack}
      />
    );
  }

  if (isLoading || !run || !step) {
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

  const meta = [
    { label: "Moment", value: `${run.blockCount} block` },
    run.totalDurationMinutes ? { label: "Längd", value: `${run.totalDurationMinutes} min` } : null,
  ].filter((m): m is { label: string; value: string } => Boolean(m?.value));

  return (
    <div className="space-y-4 pb-44">
      <SessionHeader
        title={run.name}
        summary="Planerat pass"
        meta={meta}
      />

      <StepViewer
        step={step}
        index={currentStep}
        total={totalSteps}
        timerSeconds={timerRemaining}
        timerTotalSeconds={timerTotal}
        timerRunning={isTimerRunning}
        formatTime={(seconds) => {
          const safe = Math.max(0, Math.floor(seconds));
          const minutes = Math.floor(safe / 60)
            .toString()
            .padStart(2, "0");
          const secs = (safe % 60).toString().padStart(2, "0");
          return `${minutes}:${secs}`;
        }}
      />

      <details className="group rounded-2xl bg-muted/30 text-sm" open>
        <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 font-medium text-foreground">
          <svg className="h-4 w-4 text-primary transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Tips för passet
        </summary>
        <ul className="space-y-1.5 px-4 pb-4 pl-10 text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Gå igenom varje steg innan du startar timern.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Justera planen på plats: hoppa över block eller korta steg vid behov.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" />
            <span>Håll koll på materialtaggar i första steget per lek.</span>
          </li>
        </ul>
      </details>

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleBack}
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
          </svg>
          Till planer
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
          variant="ghost"
          size="sm"
          className="flex-1 text-muted-foreground hover:text-foreground"
          onClick={handleResetTimer}
        >
          <svg className="mr-1.5 h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" />
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
