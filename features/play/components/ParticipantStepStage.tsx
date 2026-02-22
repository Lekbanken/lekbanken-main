/**
 * ParticipantStepStage
 *
 * The "Stage" — a stable, always-visible area showing step content + timer.
 * Follows the "Stage cannot shift" guardrail: layout is fixed, only content transitions.
 * Follows the "One glance rule": understand current state in 1 second.
 *
 * Renders:
 * 1. Step progress indicator (dot bar)
 * 2. Current step: title, description (with display_mode support), media, materials, safety, note
 * 3. Board message (from host)
 * 4. Timer (traffic-light colours)
 * 5. Phase info (if phases exist)
 * 6. Session state: waiting / paused / ended / turn indicator
 *
 * Does NOT render: artifacts, decisions, chat, toolbelt, signals, role — those live in overlays.
 */

'use client';

import { useMemo, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import {
  ClockIcon,
  PauseCircleIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChatBubbleBottomCenterTextIcon,
} from '@heroicons/react/24/solid';
import { Card } from '@/components/ui/card';
import { TypewriterText } from '@/components/play';
import { ProgressDots } from '@/features/play/components/shared';
import { useLiveTimer } from '@/features/play/hooks/useLiveSession';
import { formatTime, getTrafficLightColor } from '@/lib/utils/timer-utils';
import type { TimerState, SessionRuntimeState } from '@/types/play-runtime';
import type { BoardTheme } from '@/types/games';

// =============================================================================
// Types
// =============================================================================

export interface StepData {
  id: string;
  title: string;
  description: string;
  durationMinutes?: number;
  media?: { type: string; url: string; altText?: string };
  materials?: string[];
  safety?: string;
  tag?: string;
  note?: string;
  display_mode?: 'instant' | 'typewriter' | 'dramatic';
}

export interface PhaseData {
  name: string;
  description?: string;
  duration?: number | null;
}

export interface ParticipantStepStageProps {
  /** Current step data (null when not started) */
  currentStep: StepData | null;
  /** Current step index (0-based, -1 = not started) */
  currentStepIndex: number;
  /** Total step count */
  totalSteps: number;

  /** Current phase data */
  currentPhase?: PhaseData | null;
  currentPhaseIndex?: number;
  totalPhases?: number;

  /** Timer state from realtime */
  timerState: TimerState | null;

  /** Session status */
  status: SessionRuntimeState['status'];

  /** Board message from host */
  boardMessage?: string;

  /** Turn indicator */
  isNextStarter?: boolean;

  /** Whether session has ended */
  isEnded?: boolean;

  /** Board theme for accent colours */
  boardTheme?: BoardTheme;

  /** Inline artifact callout (Decision B) — shown when new artifacts arrive mid-step */
  artifactsHighlight?: boolean;
  /** Callback to open the artifact drawer */
  onOpenArtifacts?: () => void;
  /** Suppresses callout when a blocking overlay (decision/story/countdown) is active */
  hasBlockingOverlay?: boolean;
}

// =============================================================================
// Theme helper
// =============================================================================

function getThemeAccentClasses(theme?: BoardTheme) {
  switch (theme) {
    case 'mystery':
      return { label: 'text-slate-200', badge: 'bg-slate-800 text-slate-50' };
    case 'party':
      return { label: 'text-pink-600', badge: 'bg-pink-600 text-white' };
    case 'sport':
      return { label: 'text-green-600', badge: 'bg-green-600 text-white' };
    case 'nature':
      return { label: 'text-emerald-700', badge: 'bg-emerald-700 text-white' };
    case 'neutral':
    default:
      return { label: 'text-primary', badge: 'bg-primary text-primary-foreground' };
  }
}

// =============================================================================
// Sub-components (extracted from monolith)
// =============================================================================

interface TimerDisplayProps {
  timerState: TimerState | null;
}

function TimerDisplay({ timerState }: TimerDisplayProps) {
  const t = useTranslations('play.participantView');
  const display = useLiveTimer({ timerState });

  if (!timerState) return null;

  const trafficColor = getTrafficLightColor(display);
  const isFinalMinute = trafficColor === 'red' && display.remaining > 0 && display.remaining <= 60;

  // Subtle accent — timer is a secondary "character", never the headline
  const accentClasses = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400',
  };

  const progressColorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  const borderClasses = {
    green: 'border-green-200 dark:border-green-800',
    yellow: 'border-yellow-200/70 dark:border-yellow-800/70',
    red: 'border-red-200 dark:border-red-800',
  };

  // Timer breath: yellow → subtle border pulse, paused → muted, red+final → border pulse
  const breathClass = display.isPaused
    ? 'opacity-80'
    : trafficColor === 'yellow'
      ? 'animate-pulse [animation-duration:3s]'
      : isFinalMinute
        ? 'animate-pulse [animation-duration:2s]'
        : '';

  return (
    <div className={`rounded-xl border px-3 py-2 bg-muted/30 ${borderClasses[trafficColor]} ${breathClass}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <ClockIcon className={`h-4 w-4 ${accentClasses[trafficColor]}`} />
          <span className="text-xs font-medium text-muted-foreground">
            {display.isPaused
              ? t('timer.paused')
              : display.isFinished
                ? t('timer.timeUp')
                : t('timer.timeRemaining')}
          </span>
        </div>
        <span className={`font-mono text-lg font-bold tabular-nums min-w-[5ch] text-right ${accentClasses[trafficColor]}`}>
          {formatTime(display.remaining)}
        </span>
      </div>

      {/* Thin progress track */}
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${progressColorClasses[trafficColor]}`}
          style={{ width: `${(1 - display.progress) * 100}%` }}
        />
      </div>

      {/* Final minute hint — quiet urgency, not alarm */}
      {isFinalMinute && !display.isPaused && (
        <p className="mt-1 text-[10px] text-muted-foreground/70 text-right animate-in fade-in duration-300">
          {t('timer.almostDone')}
        </p>
      )}
    </div>
  );
}

function BoardMessage({ message }: { message?: string }) {
  if (!message) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-start gap-3">
        <ChatBubbleBottomCenterTextIcon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </Card>
  );
}

/**
 * StepMediaSlot — image with skeleton loader, max-height constraint, and tap-to-expand.
 * Follows "media never pushes layout" rule: max-h-64 prevents image from dominating the stage.
 */
function StepMediaSlot({ url, alt }: { url: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const toggleExpand = useCallback(() => setExpanded((prev) => !prev), []);

  return (
    <>
      <button
        type="button"
        onClick={toggleExpand}
        className="group relative w-full select-none overflow-hidden rounded-xl border bg-muted/20 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={`${alt} — tap to expand`}
      >
        {/* Skeleton placeholder */}
        {!loaded && (
          <div className="flex h-40 items-center justify-center animate-pulse bg-muted/40">
            <div className="h-8 w-8 rounded-full bg-muted-foreground/10" />
          </div>
        )}

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          onLoad={handleLoad}
          className={`w-full max-h-64 object-cover transition-opacity duration-300 ${
            loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
        />

        {/* Expand hint — always visible on mobile, hover on desktop */}
        {loaded && (
          <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white opacity-70 sm:opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            Tap to expand
          </span>
        )}
      </button>

      {/* Expanded modal — full-screen image view */}
      {expanded && (
        <div
          role="dialog"
          aria-label={alt}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={toggleExpand}
          onKeyDown={(e) => e.key === 'Escape' && toggleExpand()}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
          />
          <button
            type="button"
            onClick={toggleExpand}
            className="absolute top-4 right-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ParticipantStepStage({
  currentStep,
  currentStepIndex,
  totalSteps,
  currentPhase,
  currentPhaseIndex = 0,
  totalPhases = 0,
  timerState,
  status,
  boardMessage,
  isNextStarter = false,
  isEnded = false,
  boardTheme,
  artifactsHighlight = false,
  onOpenArtifacts,
  hasBlockingOverlay = false,
}: ParticipantStepStageProps) {
  const t = useTranslations('play.participantView');
  const _themeAccent = useMemo(() => getThemeAccentClasses(boardTheme), [boardTheme]);

  const isPaused = status === 'paused';
  const stepNotStarted = currentStepIndex < 0;

  return (
    <div className="mx-auto w-full max-w-[42rem] space-y-3 px-4 pb-6 scroll-pt-4">
      {/* Board Message — host broadcast */}
      <BoardMessage message={boardMessage} />

      {/* Turn Indicator */}
      {isNextStarter && !isEnded && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-3">
          <p className="text-sm font-medium text-foreground text-center">
            {t('turnIndicator.youStartNext')}
          </p>
        </Card>
      )}

      {/* Phase — "chapter pill" for act/chapter navigation feel */}
      {currentPhase && !isEnded && (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('phases.phaseOf', { current: currentPhaseIndex + 1, total: totalPhases })}
          </span>
          <span className="text-sm font-semibold text-foreground truncate">{currentPhase.name}</span>
        </div>
      )}

      {/* Timer — prominent, always visible when active */}
      {!isEnded && <TimerDisplay timerState={timerState} />}

      {/* Pause Overlay — "frozen glass" feel: controlled pause, not an error */}
      {isPaused && (
        <Card className="relative overflow-hidden border border-yellow-200/60 p-8 text-center dark:border-yellow-800/40">
          <div className="absolute inset-0 bg-background/50 backdrop-blur-sm" />
          <div className="relative z-10">
            <PauseCircleIcon className="mx-auto h-12 w-12 text-yellow-500/80" />
            <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {t('stepStage.state.pausedTitle')}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {t('stepStage.state.pausedSub')}
            </p>
          </div>
        </Card>
      )}

      {/* Waiting for host to start */}
      {stepNotStarted && !isEnded && !isPaused && (
        <Card className="border-2 border-primary/20 bg-primary/5 p-6 text-center">
          <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
            <ClockIcon className="h-5 w-5 text-primary" />
          </div>
          <h2 className="mt-3 text-lg font-semibold text-foreground">
            {t('session.waitingForHost')}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('session.waitingDescription')}
          </p>
        </Card>
      )}

      {/* Ended — calm "closing card": session is over, everything settles */}
      {isEnded && (
        <Card className="border border-border bg-muted/30 p-8 text-center animate-in fade-in duration-500">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-muted-foreground/60" />
          <h2 className="mt-3 text-lg font-semibold tracking-tight text-foreground">
            {t('stepStage.state.endedTitle')}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {t('stepStage.state.endedSub')}
          </p>
        </Card>
      )}

      {/* Current Step */}
      {currentStep && !isEnded && (
        <Card
          key={`step-card-${currentStep.id}`}
          className="overflow-hidden will-change-transform animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          {/* Step body — reading rhythm: generous spacing, constrained line length */}
          <div className="p-5 space-y-4 will-change-transform">
            <h2 className="text-xl font-bold leading-tight tracking-[-0.01em] text-foreground animate-in fade-in slide-in-from-bottom-1 duration-200">
              {currentStep.title}
            </h2>

            {/* Description — paragraph-chunked for readability */}
            {currentStep.display_mode && currentStep.display_mode !== 'instant' ? (
              <TypewriterText
                key={`step-${currentStep.id}-${currentStepIndex}`}
                text={currentStep.description}
                speed={currentStep.display_mode === 'dramatic' ? 'dramatic' : 'normal'}
                variant="default"
                showProgress
                allowSkip
                allowParticipantSkip
                className="text-[15px] leading-relaxed text-muted-foreground"
              />
            ) : (
              <div className="space-y-3 animate-in fade-in slide-in-from-bottom-1 duration-200 delay-75">
                {currentStep.description.split('\n\n').map((paragraph, i) => (
                  <p
                    key={i}
                    className="text-[15px] leading-relaxed text-muted-foreground"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Media slot — skeleton → constrained image → tap to expand */}
            {currentStep.media?.url && (
              <div className="animate-in fade-in duration-200 delay-100">
                <StepMediaSlot
                  url={currentStep.media.url}
                  alt={currentStep.media.altText ?? currentStep.title}
                />
              </div>
            )}

            {/* Materials */}
            {currentStep.materials && currentStep.materials.length > 0 && (
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {t('stepStage.materials')}
                </p>
                <ul className="space-y-1 text-sm">
                  {currentStep.materials.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Safety */}
            {currentStep.safety && (
              <div className="rounded-xl bg-red-50 p-3 dark:bg-red-900/20">
                <div className="flex items-start gap-2">
                  <ExclamationTriangleIcon className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                      {t('safety.title')}
                    </p>
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                      {currentStep.safety}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Note */}
            {currentStep.note && (
              <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                💡 {currentStep.note}
              </p>
            )}

            {/* Inline artifact callout (Decision B) — appears when new artifacts arrive mid-step */}
            {/* Suppressed when: blocking overlay active, session paused, or ended */}
            {artifactsHighlight && onOpenArtifacts && !hasBlockingOverlay && !isPaused && (
              <button
                type="button"
                onClick={onOpenArtifacts}
                className="w-full select-none rounded-xl border-2 border-primary/30 bg-primary/5 p-3 text-left transition-all hover:bg-primary/10 active:scale-[0.98] animate-in fade-in slide-in-from-bottom-2 duration-300"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-lg">
                    📦
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{t('stepStage.newArtifactTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('stepStage.newArtifactHint')}</p>
                  </div>
                  <span className="flex h-3 w-3 shrink-0">
                    <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
                  </span>
                </div>
              </button>
            )}
          </div>
        </Card>
      )}

      {/* Step Progress Dots — shared ProgressDots */}
      {!isEnded && (
        <ProgressDots totalSteps={totalSteps} currentStepIndex={currentStepIndex} />
      )}
    </div>
  );
}
