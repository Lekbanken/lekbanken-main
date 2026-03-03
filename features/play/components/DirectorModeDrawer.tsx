/**
 * DirectorModeDrawer — DirectorFullscreenShell
 *
 * Full-screen overlay for Director Mode in two modes:
 *
 *   1. **Session mode** (`mode: 'session'`) — live session with realtime
 *      data, all action callbacks, haptic feedback, signal/event chip lane.
 *
 *   2. **Preview mode** (`mode: 'preview'`) — offline, no session.
 *      Game data only. Same fullscreen shell, keyboard shortcuts
 *      (Arrow Left/Right, Esc, F), swipe gestures, scroll lock.
 *      No session callbacks.
 *
 * Shell features (both modes):
 *   - Fullscreen viewport (mobile) / centred modal (desktop)
 *   - Safe area insets for notch + bottom bar
 *   - Backdrop + fade-in animation
 *   - Fullscreen API management
 *   - Keyboard shortcuts (Arrow Left/Right step nav, Escape close, F fullscreen)
 *   - Swipe gestures for mobile step navigation
 *   - Scroll lock when open
 *
 * Session-only features:
 *   - Haptic feedback on trigger fire
 *   - Reset double-click confirm (3s window)
 *   - Story View modal
 *   - Director chip lane (signal/trigger/participant cues)
 *   - Space for hint signal
 *
 * The actual UI is rendered by DirectorModePanel (shared core).
 */

'use client';

import { useEffect, useState, useCallback, useRef, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { hapticTap } from '../haptics';
import type {
  CockpitStep,
  CockpitPhase,
  CockpitTrigger,
  CockpitArtifact,
  ArtifactState,
  SessionEvent,
  Signal,
  SessionCockpitStatus,
  TriggerActionResult,
} from '@/types/session-cockpit';
import { StoryViewModal } from './StoryViewModal';
import { DirectorModePanel } from './DirectorModePanel';
import { PlaySurface } from './shared/PlaySurface';
import { useDirectorChips } from './DirectorChipLane';
import type { DirectorChipType } from './DirectorChipLane';
import { extractSignalMeta, getSignalChannelLabel, type SignalEventLike } from '@/features/play/utils/signalHelpers';

// =============================================================================
// Types — discriminated union
// =============================================================================

/** Shared props for both modes */
interface DirectorModeDrawerBase {
  /** Is the drawer open? */
  open: boolean;
  /** Called when user requests to close */
  onClose: () => void;
  /** Title displayed in the header */
  title: string;
  /** Steps */
  steps: CockpitStep[];
  /** Phases */
  phases: CockpitPhase[];
  /** Triggers */
  triggers: CockpitTrigger[];
  /** Artifacts for the artifacts tab */
  artifacts: CockpitArtifact[];
  /** Artifact states */
  artifactStates: Record<string, ArtifactState>;
  /** Optional class name */
  className?: string;
}

/** Session mode — live session with all callbacks */
export interface DirectorModeDrawerSessionProps extends DirectorModeDrawerBase {
  mode: 'session';
  /** Session code (kept for internal use) */
  sessionCode: string;
  /** Session status — the real session status, mirrors lobby */
  status: SessionCockpitStatus;
  /** Current step index */
  currentStepIndex: number;
  /** Current phase index */
  currentPhaseIndex: number;
  /** Recent signals */
  recentSignals: Signal[];
  /** Optional device signal presets */
  signalPresets?: Array<{
    id: string;
    name: string;
    type: 'torch' | 'audio' | 'vibration' | 'screen_flash' | 'notification';
    color?: string;
    disabled?: boolean;
    disabledReason?: string;
  }>;
  /** Recent events */
  events: SessionEvent[];
  /** Time bank balance (seconds) */
  timeBankBalance: number;
  /** Time bank paused? */
  timeBankPaused: boolean;
  /** Participant count */
  participantCount: number;
  // Actions
  onPause: () => Promise<void>;
  onResume: () => Promise<void>;
  onNextStep: () => Promise<void>;
  onPreviousStep: () => Promise<void>;
  onFireTrigger: (triggerId: string) => Promise<TriggerActionResult>;
  onArmTrigger?: (triggerId: string) => Promise<TriggerActionResult>;
  onDisableTrigger?: (triggerId: string) => Promise<TriggerActionResult>;
  onDisableAllTriggers: () => Promise<void>;
  onSendSignal: (channel: string, payload: unknown) => Promise<void>;
  onExecuteSignal?: (type: string, config: Record<string, unknown>) => Promise<void>;
  onTimeBankDelta: (delta: number, reason: string) => Promise<void>;
  /** Open the chat/message panel */
  onOpenChat?: () => void;
  /** Unread message count for chat badge */
  chatUnreadCount?: number;
  /** Artifact actions */
  onRevealArtifact?: (artifactId: string) => Promise<void>;
  onHideArtifact?: (artifactId: string) => Promise<void>;
  onResetArtifact?: (artifactId: string) => Promise<void>;
  onHighlightArtifact?: (artifactId: string) => Promise<void>;
  onUnhighlightArtifact?: (artifactId: string) => Promise<void>;
}

/** Preview mode — offline, no session, no callbacks */
export interface DirectorModeDrawerPreviewProps extends DirectorModeDrawerBase {
  mode: 'preview';
}

export type DirectorModeDrawerProps =
  | DirectorModeDrawerSessionProps
  | DirectorModeDrawerPreviewProps;

// =============================================================================
// Fullscreen helpers
// =============================================================================

async function requestFullscreen(): Promise<boolean> {
  try {
    const el = document.documentElement;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return true;
    } else if ((el as unknown as { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen) {
      (el as unknown as { webkitRequestFullscreen: () => void }).webkitRequestFullscreen();
      return true;
    }
  } catch {
    // Fullscreen not supported, denied, or requires user gesture
  }
  return false;
}

function exitFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if ((document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement) {
      (document as unknown as { webkitExitFullscreen: () => void }).webkitExitFullscreen();
    }
  } catch {
    // Silent
  }
}

function isFullscreenActive(): boolean {
  return !!(document.fullscreenElement ||
    (document as unknown as { webkitFullscreenElement?: Element }).webkitFullscreenElement);
}

// =============================================================================
// Swipe hook for mobile step navigation
// =============================================================================

function useSwipeGesture(
  ref: React.RefObject<HTMLElement | null>,
  { onSwipeLeft, onSwipeRight }: { onSwipeLeft?: () => void; onSwipeRight?: () => void }
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const dx = endX - startX;
      const dy = endY - startY;

      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
        if (dx > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [ref, onSwipeLeft, onSwipeRight]);
}

// =============================================================================
// Main Component
// =============================================================================

export function DirectorModeDrawer(props: DirectorModeDrawerProps) {
  const { open, onClose, title, steps, phases, triggers, artifacts, artifactStates, className } = props;
  const isSession = props.mode === 'session';

  const t = useTranslations('play.directorDrawer');
  const [showStoryView, setShowStoryView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetConfirmPending, setResetConfirmPending] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Preview-local step navigation ──────────────────────────────────────
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const currentStepIndex = isSession ? props.currentStepIndex : previewStepIndex;

  const previewNext = useCallback(() => {
    setPreviewStepIndex((prev) => Math.min(prev + 1, steps.length - 1));
  }, [steps.length]);

  const previewPrevious = useCallback(() => {
    setPreviewStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const onNextStep = isSession ? props.onNextStep : previewNext;
  const onPreviousStep = isSession ? props.onPreviousStep : previewPrevious;

  // ── Session-only derived values (safe defaults for preview) ────────────
  const status: SessionCockpitStatus = isSession ? props.status : 'draft';
  const currentPhaseIndex = isSession ? props.currentPhaseIndex : 0;
  const recentSignals = isSession ? props.recentSignals : [];
  const signalPresets = isSession ? props.signalPresets : undefined;
  const events: SessionEvent[] = isSession ? props.events : [];
  const timeBankBalance = isSession ? props.timeBankBalance : 0;
  const timeBankPaused = isSession ? props.timeBankPaused : false;
  const participantCount = isSession ? props.participantCount : 0;
  const chatUnreadCount = isSession ? (props.chatUnreadCount ?? 0) : 0;

  // Track when each step started (client-side) for per-step timer
  // Uses useSyncExternalStore to bridge ref (effect-writable) with render (readable)
  // without triggering set-state-in-effect or refs-during-render rules.
  const stepTimesRef = useRef(new Map<number, number>());
  const stepTimesListenersRef = useRef(new Set<() => void>());

  const subscribeStepTimes = useCallback((cb: () => void) => {
    stepTimesListenersRef.current.add(cb);
    return () => { stepTimesListenersRef.current.delete(cb); };
  }, []);
  const getStepTimesSnapshot = useCallback(() => stepTimesRef.current, []);
  const stepStartTimes = useSyncExternalStore(subscribeStepTimes, getStepTimesSnapshot);

  // Record step start time on step change (effect — Date.now is impure)
  useEffect(() => {
    if (open && currentStepIndex >= 0 && !stepTimesRef.current.has(currentStepIndex)) {
      const next = new Map(stepTimesRef.current);
      next.set(currentStepIndex, Date.now());
      stepTimesRef.current = next;
      stepTimesListenersRef.current.forEach(l => l());
    }
  }, [open, currentStepIndex]);

  // ── Session-only: Director chip lane ───────────────────────────────────
  const { chips: directorChips, pushChip: pushDirectorChip } = useDirectorChips();
  const prevEventsLenRef = useRef(events.length);

  // Wrap onSendSignal to push an immediate confirmation chip for the director.
  const handleSendSignal = useCallback((channel: string, payload: unknown) => {
    if (!isSession) return Promise.resolve();
    const label = getSignalChannelLabel(channel, (k) => t(`signalInbox.${k}`));
    pushDirectorChip('SIGNAL_RECEIVED', label);
    return props.onSendSignal(channel, payload);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSession, pushDirectorChip, t]);

  // Watch for new events → push chips (session-only)
  useEffect(() => {
    if (!open || !isSession) return;
    const prevLen = prevEventsLenRef.current;
    if (events.length > prevLen) {
      const newEvents = events.slice(0, events.length - prevLen);
      for (const evt of newEvents) {
        if (evt.type.includes('signal')) {
          const { channel } = extractSignalMeta(evt as SignalEventLike);
          const label = getSignalChannelLabel(channel, (k) => t(`signalInbox.${k}`));
          pushDirectorChip('SIGNAL_RECEIVED', label);
        } else if (evt.type.includes('trigger') && evt.type.includes('fire')) {
          pushDirectorChip('TRIGGER_FIRED');
        } else if (evt.type.includes('participant') && evt.type.includes('join')) {
          pushDirectorChip('PARTICIPANT_JOINED');
        }
      }
    }
    prevEventsLenRef.current = events.length;
  }, [open, isSession, events.length, events, pushDirectorChip, t]);

  // Director chip labels (i18n)
  const directorChipLabels: Record<DirectorChipType, string> = {
    SIGNAL_RECEIVED: t('chips.signalReceived'),
    PARTICIPANT_JOINED: t('chips.participantJoined'),
    TRIGGER_FIRED: t('chips.triggerFired'),
  };

  // --- Adjust state during render when `open` changes (avoids setState in effects) ---
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setIsFullscreen(false);
      setResetConfirmPending(false);
      // Reset preview step index when closing
      setPreviewStepIndex(0);
    }
  }

  // Fullscreen on open / exit on close (DOM side-effect only)
  useEffect(() => {
    if (open) {
      requestFullscreen().then(setIsFullscreen);
    } else {
      exitFullscreen();
    }
  }, [open]);

  // Track external fullscreen changes (user presses Esc in browser)
  useEffect(() => {
    if (!open) return;
    const handler = () => setIsFullscreen(isFullscreenActive());
    document.addEventListener('fullscreenchange', handler);
    document.addEventListener('webkitfullscreenchange', handler);
    return () => {
      document.removeEventListener('fullscreenchange', handler);
      document.removeEventListener('webkitfullscreenchange', handler);
    };
  }, [open]);

  // Lock body scroll when open; clear reset timer on close
  useEffect(() => {
    if (!open) {
      if (resetTimerRef.current) {
        clearTimeout(resetTimerRef.current);
        resetTimerRef.current = null;
      }
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleClose = useCallback(() => {
    exitFullscreen();
    setIsFullscreen(false);
    onClose();
  }, [onClose]);

  const handleToggleFullscreen = useCallback(() => {
    if (isFullscreenActive()) {
      exitFullscreen();
      setIsFullscreen(false);
    } else {
      requestFullscreen().then(setIsFullscreen);
    }
  }, []);

  // Reset with confirm in active sessions (session-only)
  const handleResetClick = useCallback(() => {
    if (!isSession) return;
    const sendSignal = props.onSendSignal;
    if (status === 'active' || status === 'paused') {
      if (resetConfirmPending) {
        sendSignal('reset', { message: 'Reset' });
        setResetConfirmPending(false);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      } else {
        setResetConfirmPending(true);
        resetTimerRef.current = setTimeout(() => {
          setResetConfirmPending(false);
        }, 3000);
      }
    } else {
      sendSignal('reset', { message: 'Reset' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSession, status, resetConfirmPending]);

  // Haptic-enhanced trigger fire (session-only)
  const handleFireTrigger = useCallback(async (triggerId: string) => {
    if (!isSession) return { ok: false, action: 'fire', triggerId, kind: 'request_failed', httpStatus: 0, errorCode: 'preview_mode', message: 'Cannot fire triggers in preview mode' } as TriggerActionResult;
    const result = await props.onFireTrigger(triggerId);
    hapticTap(50);
    return result;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSession]);

  // Keyboard shortcuts: Escape, Arrow Left/Right step nav, 1-6 tabs
  // Session-only: Space for hint
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (currentStepIndex > 0) onPreviousStep();
          break;
        case 'ArrowRight':
          e.preventDefault();
          if (currentStepIndex < steps.length - 1) onNextStep();
          break;
        case ' ':
          if (isSession) {
            e.preventDefault();
            handleSendSignal('hint', { message: t('quickActions.giveHint') });
          }
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose, currentStepIndex, steps.length, onPreviousStep, onNextStep, isSession, handleSendSignal, t]);

  // Exit fullscreen when component unmounts while open
  useEffect(() => {
    return () => {
      if (open) exitFullscreen();
    };
  }, [open]);

  // Swipe gestures for step navigation on mobile
  useSwipeGesture(swipeRef, {
    onSwipeLeft: () => {
      if (currentStepIndex < steps.length - 1) onNextStep();
    },
    onSwipeRight: () => {
      if (currentStepIndex > 0) onPreviousStep();
    },
  });

  return (
    <>
      {/* Backdrop — desktop only overlay dim */}
      <div
        className={cn(
          'fixed inset-0 z-50 transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
      >
        {/* Desktop backdrop */}
        <div className="hidden lg:block absolute inset-0 bg-black/40" onClick={handleClose} />

        {/* PlaySurface owns the single border — parity with ParticipantFullscreenShell */}
        <PlaySurface className={cn('lg:shadow-xl', className)}>
          <DirectorModePanel
          title={title}
          status={status}
          isPreview={!isSession}
          steps={steps}
          currentStepIndex={currentStepIndex}
          phases={phases}
          currentPhaseIndex={currentPhaseIndex}
          triggers={triggers}
          recentSignals={recentSignals}
          signalPresets={signalPresets}
          events={events}
          timeBankBalance={timeBankBalance}
          timeBankPaused={timeBankPaused}
          participantCount={participantCount}
          artifacts={artifacts}
          artifactStates={artifactStates}
          onNextStep={onNextStep}
          onPreviousStep={onPreviousStep}
          onFireTrigger={isSession ? handleFireTrigger : undefined}
          onArmTrigger={isSession ? props.onArmTrigger : undefined}
          onDisableTrigger={isSession ? props.onDisableTrigger : undefined}
          onDisableAllTriggers={isSession ? props.onDisableAllTriggers : undefined}
          onSendSignal={isSession ? handleSendSignal : undefined}
          onExecuteSignal={isSession ? props.onExecuteSignal : undefined}
          onTimeBankDelta={isSession ? props.onTimeBankDelta : undefined}
          onOpenChat={isSession ? props.onOpenChat : undefined}
          chatUnreadCount={chatUnreadCount}
          onClose={handleClose}
          onRevealArtifact={isSession ? props.onRevealArtifact : undefined}
          onHideArtifact={isSession ? props.onHideArtifact : undefined}
          onResetArtifact={isSession ? props.onResetArtifact : undefined}
          onHighlightArtifact={isSession ? props.onHighlightArtifact : undefined}
          onUnhighlightArtifact={isSession ? props.onUnhighlightArtifact : undefined}
          showFullscreenButton
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          stepStartTimes={stepStartTimes}
          swipeRef={swipeRef}
          resetConfirmPending={isSession ? resetConfirmPending : false}
          onResetClick={isSession ? handleResetClick : undefined}
          directorChips={isSession ? directorChips : []}
          directorChipLabels={directorChipLabels}
        />
        </PlaySurface>
      </div>

      {/* Story View Modal — session only */}
      {isSession && (
        <StoryViewModal
          open={showStoryView}
          onClose={() => setShowStoryView(false)}
          steps={steps}
          currentStepIndex={currentStepIndex}
          title={title}
        />
      )}
    </>
  );
}

export default DirectorModeDrawer;
