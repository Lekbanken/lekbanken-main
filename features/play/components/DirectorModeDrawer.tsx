/**
 * DirectorModeDrawer → DirectorFullscreenShell
 *
 * Full-screen overlay for Director Mode during active sessions.
 * Now a proper fullscreen shell (parity with ParticipantFullscreenShell):
 *   - Fullscreen viewport (mobile) / centred modal (desktop)
 *   - Safe area insets for notch + bottom bar
 *   - Backdrop + fade-in animation (no slide-in-right)
 *   - Fullscreen API management
 *   - Keyboard shortcuts (←/→, Space, Escape)
 *   - Swipe gestures for mobile step navigation
 *   - Haptic feedback on trigger fire
 *   - Scroll lock when open
 *   - Reset double-click confirm (3s window)
 *   - Story View modal
 *
 * The actual UI is rendered by DirectorModePanel (shared with
 * the Director Preview page).
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
// Types
// =============================================================================

export interface DirectorModeDrawerProps {
  /** Is the drawer open? */
  open: boolean;
  /** Called when user requests to close */
  onClose: () => void;
  
  /** Session display name */
  sessionName: string;
  /** Session code (kept for internal use, not displayed in header) */
  sessionCode: string;
  /** Session status â€” the real session status, mirrors lobby */
  status: SessionCockpitStatus;
  
  /** Steps */
  steps: CockpitStep[];
  /** Current step index */
  currentStepIndex: number;
  /** Phases */
  phases: CockpitPhase[];
  /** Current phase index */
  currentPhaseIndex: number;
  
  /** Triggers */
  triggers: CockpitTrigger[];
  
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
  
  /** Artifacts for the artifacts tab */
  artifacts: CockpitArtifact[];
  /** Artifact states */
  artifactStates: Record<string, ArtifactState>;
  
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
  
  /** Optional class name */
  className?: string;
}

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

export function DirectorModeDrawer({
  open,
  onClose,
  sessionName,
  sessionCode: _sessionCode,
  status,
  steps,
  currentStepIndex,
  phases,
  currentPhaseIndex,
  triggers,
  recentSignals,
  signalPresets,
  events,
  timeBankBalance,
  timeBankPaused,
  participantCount,
  artifacts,
  artifactStates,
  onPause: _onPause,
  onResume: _onResume,
  onNextStep,
  onPreviousStep,
  onFireTrigger,
  onArmTrigger,
  onDisableTrigger,
  onDisableAllTriggers,
  onSendSignal,
  onExecuteSignal,
  onTimeBankDelta,
  onOpenChat,
  chatUnreadCount = 0,
  onRevealArtifact,
  onHideArtifact,
  onResetArtifact,
  onHighlightArtifact,
  onUnhighlightArtifact,
  className,
}: DirectorModeDrawerProps) {
  const t = useTranslations('play.directorDrawer');
  const [showStoryView, setShowStoryView] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [resetConfirmPending, setResetConfirmPending] = useState(false);
  const swipeRef = useRef<HTMLDivElement>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track when each step started (client-side) for per-step timer
  const [stepStartTimes, setStepStartTimes] = useState<Map<number, number>>(() => new Map());

  // Director chip lane — host-side system cues
  const { chips: directorChips, pushChip: pushDirectorChip } = useDirectorChips();
  const prevEventsLenRef = useRef(events.length);

  // Wrap onSendSignal to push an immediate confirmation chip for the director.
  // The audit event chip (from the events-watcher below) is deduped by useDirectorChips.
  const handleSendSignal = useCallback((channel: string, payload: unknown) => {
    const label = getSignalChannelLabel(channel, (k) => t(`signalInbox.${k}`));
    pushDirectorChip('SIGNAL_RECEIVED', label);
    onSendSignal(channel, payload);
  }, [onSendSignal, pushDirectorChip, t]);

  // Watch for new events → push chips (single source of truth — events array)
  // NOTE: recentSignals watcher removed to prevent duplicate SIGNAL_RECEIVED chips.
  // Signal events already appear in the events array via realtime broadcast.
  useEffect(() => {
    if (!open) return;
    const prevLen = prevEventsLenRef.current;
    if (events.length > prevLen) {
      // Check latest events for chip-worthy types
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
  }, [open, events.length, events, pushDirectorChip]);

  // Director chip labels (i18n)
  const directorChipLabels: Record<DirectorChipType, string> = {
    SIGNAL_RECEIVED: t('chips.signalReceived'),
    PARTICIPANT_JOINED: t('chips.participantJoined'),
    TRIGGER_FIRED: t('chips.triggerFired'),
  };

  // Record step start time when step changes
  useEffect(() => {
    if (open && currentStepIndex >= 0) {
      setStepStartTimes((prev) => {
        if (prev.has(currentStepIndex)) return prev;
        const next = new Map(prev);
        next.set(currentStepIndex, Date.now());
        return next;
      });
    }
  }, [open, currentStepIndex]);

  // Fullscreen on open / exit on close
  useEffect(() => {
    if (open) {
      requestFullscreen().then(setIsFullscreen);
    } else {
      exitFullscreen();
      setIsFullscreen(false);
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
      setResetConfirmPending(false);
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

  // Reset with confirm in active sessions
  const handleResetClick = useCallback(() => {
    if (status === 'active' || status === 'paused') {
      if (resetConfirmPending) {
        onSendSignal('reset', { message: 'Reset' });
        setResetConfirmPending(false);
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
      } else {
        setResetConfirmPending(true);
        resetTimerRef.current = setTimeout(() => {
          setResetConfirmPending(false);
        }, 3000);
      }
    } else {
      onSendSignal('reset', { message: 'Reset' });
    }
  }, [status, resetConfirmPending, onSendSignal]);

  // Haptic-enhanced trigger fire
  const handleFireTrigger = useCallback(async (triggerId: string) => {
    const result = await onFireTrigger(triggerId);
    hapticTap(50);
    return result;
  }, [onFireTrigger]);

  // Keyboard shortcuts: Escape, â†/â†’ step nav, 1-6 tabs, Space for hint
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
          e.preventDefault();
          onSendSignal('hint', { message: t('quickActions.giveHint') });
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose, currentStepIndex, steps.length, onPreviousStep, onNextStep, onSendSignal, t]);

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
          title={sessionName}
          status={status}
          isPreview={false}
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
          onFireTrigger={handleFireTrigger}
          onArmTrigger={onArmTrigger}
          onDisableTrigger={onDisableTrigger}
          onDisableAllTriggers={onDisableAllTriggers}
          onSendSignal={handleSendSignal}
          onExecuteSignal={onExecuteSignal}
          onTimeBankDelta={onTimeBankDelta}
          onOpenChat={onOpenChat}
          chatUnreadCount={chatUnreadCount}
          onClose={handleClose}
          onRevealArtifact={onRevealArtifact}
          onHideArtifact={onHideArtifact}
          onResetArtifact={onResetArtifact}
          onHighlightArtifact={onHighlightArtifact}
          onUnhighlightArtifact={onUnhighlightArtifact}
          showFullscreenButton
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          stepStartTimes={stepStartTimes}
          swipeRef={swipeRef}
          resetConfirmPending={resetConfirmPending}
          onResetClick={handleResetClick}
          directorChips={directorChips}
          directorChipLabels={directorChipLabels}
        />
        </PlaySurface>
      </div>

      {/* Story View Modal */}
      <StoryViewModal
        open={showStoryView}
        onClose={() => setShowStoryView(false)}
        steps={steps}
        currentStepIndex={currentStepIndex}
        title={sessionName}
      />
    </>
  );
}

export default DirectorModeDrawer;
