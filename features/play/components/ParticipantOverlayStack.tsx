/**
 * ParticipantOverlayStack
 *
 * Manages overlay priority for the participant play experience.
 * Only ONE blocking overlay at a time; non-blocking overlays stack behind.
 *
 * Priority order (highest first):
 * 1. DecisionModal — auto-opens when host pushes an open decision (blocking)
 * 2. StoryOverlay — auto-opens when host triggers story text (blocking)
 * 3. CountdownOverlay — auto-opens when host triggers countdown (blocking)
 * 4. ArtifactDrawer — user-triggered (non-blocking)
 * 5. DecisionsDrawer — user-triggered (non-blocking)
 * 6. RoleSection — user-triggered (non-blocking)
 * 7. ToolbeltDrawer — user-triggered (non-blocking)
 *
 * Guardrails:
 * - "No auto-open except blocking server events" — only decisions/story/countdown auto-open.
 * - Lazy-load all overlay content via dynamic imports.
 * - Stage stays visible but dimmed behind blocking overlays.
 * - **Single activeBlockingOverlay** — highest-priority wins, lower queues.
 * - **isEnded guard** — all blocking overlays auto-dismiss on session end.
 * - **Artifact highlight** — badge pulses when new artifacts arrive.
 */

'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { SignalIcon } from '@heroicons/react/24/solid';
import { isFeatureEnabled } from '@/lib/config/env';
import { DrawerOverlay } from '@/features/play/components/shared';
import type { TypewriterSpeed } from '@/components/play';


// Lazy-loaded overlays
const CountdownOverlay = dynamic(
  () => import('@/components/play').then((m) => ({ default: m.CountdownOverlay })),
  { ssr: false },
);
const StoryOverlay = dynamic(
  () => import('@/components/play').then((m) => ({ default: m.StoryOverlay })),
  { ssr: false },
);

// =============================================================================
// Types
// =============================================================================

/** Which drawer is currently visible (non-blocking, user-triggered) */
export type ActiveDrawer = 'artifacts' | 'decisions' | 'role' | 'toolbelt' | null;

export interface OverlayState {
  /** Countdown overlay */
  countdown: {
    open: boolean;
    duration: number;
    message?: string;
    variant: 'default' | 'dramatic';
  };
  /** Story overlay */
  story: {
    open: boolean;
    text: string;
    title?: string;
    speed: TypewriterSpeed;
    theme: 'dark' | 'light' | 'dramatic';
    showProgress: boolean;
    allowSkip: boolean;
    allowParticipantSkip: boolean;
    allowClose: boolean;
  };
  /** Signal toast */
  signalToast: {
    id: string;
    channel: string;
    message: string;
    createdAt: string;
  } | null;
}

/** Blocking overlay type for priority arbiter */
export type BlockingOverlayType = 'decision' | 'story' | 'countdown' | null;

export interface ParticipantOverlayStackProps {
  /** Overlay state (managed by parent — driven by realtime events) */
  overlayState: OverlayState;

  /** Whether a blocking decision modal should show */
  hasBlockingDecision: boolean;

  /** Callbacks to close overlays */
  onCloseCountdown: () => void;
  onCloseStory: () => void;

  /** Currently active non-blocking drawer */
  activeDrawer: ActiveDrawer;
  /** Toggle a drawer (user-triggered) */
  onToggleDrawer: (drawer: ActiveDrawer) => void;

  /** Artifact count (for badge) */
  artifactCount?: number;
  /** Open decision count (for badge) */
  openDecisionCount?: number;
  /** Whether artifacts have been updated since last drawer open */
  artifactsHighlight?: boolean;

  /** Whether we have a participant token */
  hasToken: boolean;
  /** Whether session has ended */
  isEnded: boolean;
  /** Session ID */
  sessionId: string;
  /** Participant token */
  participantToken?: string;
  /** Whether role is available */
  hasRole: boolean;

  /** Render props: each drawer renders its content via a render prop */
  renderArtifactDrawer?: () => React.ReactNode;
  renderDecisionDrawer?: () => React.ReactNode;
  renderRoleSection?: () => React.ReactNode;
  renderDecisionModal?: () => React.ReactNode;
  renderSignalMicroUI?: () => React.ReactNode;
  renderToolbelt?: () => React.ReactNode;
}

// =============================================================================
// Component
// =============================================================================

export function ParticipantOverlayStack({
  overlayState,
  hasBlockingDecision,
  onCloseCountdown,
  onCloseStory,
  activeDrawer,
  onToggleDrawer,
  artifactCount = 0,
  openDecisionCount = 0,
  artifactsHighlight = false,
  hasToken,
  isEnded,
  hasRole,
  renderArtifactDrawer,
  renderDecisionDrawer,
  renderRoleSection,
  renderDecisionModal,
  renderSignalMicroUI,
  renderToolbelt,
}: ParticipantOverlayStackProps) {
  const t = useTranslations('play.participantView');

  // ---------------------------------------------------------------------------
  // Overlay Priority Arbiter
  // Deterministic: only ONE blocking overlay is active at a time.
  // Priority: decision > story > countdown.
  // Lower-priority overlays stay queued (state remains open) and resume when
  // the higher-priority overlay closes.
  // isEnded guard: no blocking overlays when session is over.
  // ---------------------------------------------------------------------------
  const activeBlockingOverlay: BlockingOverlayType = useMemo(() => {
    if (isEnded) return null;
    if (hasBlockingDecision) return 'decision';
    if (overlayState.story.open) return 'story';
    if (overlayState.countdown.open) return 'countdown';
    return null;
  }, [isEnded, hasBlockingDecision, overlayState.story.open, overlayState.countdown.open]);

  return (
    <>
      {/* ================================================================== */}
      {/* Action bar — non-blocking drawer toggles                           */}
      {/* Positioned below stage, above overlays. Always visible.            */}
      {/* ================================================================== */}
      {!isEnded && hasToken && (
        <div className="flex items-center gap-2 flex-wrap py-2">
          <Button
            type="button"
            size="sm"
            variant={activeDrawer === 'artifacts' ? 'default' : 'outline'}
            onClick={() => onToggleDrawer(activeDrawer === 'artifacts' ? null : 'artifacts')}
            className="gap-1 h-8 text-xs relative"
          >
            📦 {t('header.artifacts')}
            {artifactCount > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-primary text-[10px]">
                {artifactCount}
              </span>
            )}
            {/* Highlight pulse when new artifacts arrive */}
            {artifactsHighlight && activeDrawer !== 'artifacts' && (
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
            )}
          </Button>

          <Button
            type="button"
            size="sm"
            variant={activeDrawer === 'decisions' ? 'default' : 'outline'}
            onClick={() => onToggleDrawer(activeDrawer === 'decisions' ? null : 'decisions')}
            className="gap-1 h-8 text-xs"
          >
            🗳️ {t('header.decisions')}
            {openDecisionCount > 0 && (
              <span className="rounded-full bg-destructive/10 px-1.5 text-destructive text-[10px]">
                {openDecisionCount}
              </span>
            )}
          </Button>

          {hasRole && (
            <Button
              type="button"
              size="sm"
              variant={activeDrawer === 'role' ? 'default' : 'outline'}
              onClick={() => onToggleDrawer(activeDrawer === 'role' ? null : 'role')}
              className="gap-1 h-8 text-xs"
            >
              🎭 {t('header.role')}
            </Button>
          )}

          {/* Toolbelt slot */}
          {renderToolbelt?.()}
        </div>
      )}

      {/* ================================================================== */}
      {/* Signal micro UI (1-tap signals)                                    */}
      {/* ================================================================== */}
      {!isEnded && hasToken && isFeatureEnabled('signals') && renderSignalMicroUI?.()}

      {/* ================================================================== */}
      {/* Signal toast (floating notification)                               */}
      {/* ================================================================== */}
      {overlayState.signalToast && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[min(90%,420px)] -translate-x-1/2 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="flex items-center gap-2 border border-primary/20 bg-card/95 p-3 shadow-lg backdrop-blur-sm">
            <SignalIcon className="h-4 w-4 text-primary" />
            <Badge variant="secondary" size="sm">
              {overlayState.signalToast.channel}
            </Badge>
            <span className="text-sm text-foreground">{overlayState.signalToast.message}</span>
          </Card>
        </div>
      )}

      {/* ================================================================== */}
      {/* Non-blocking drawers (user-triggered, one at a time)               */}
      {/* Responsive: bottom sheet on mobile, centered modal on desktop.     */}
      {/* ================================================================== */}
      <DrawerOverlay
        open={activeDrawer != null}
        onClose={() => onToggleDrawer(null)}
        size="sm"
      >
        {activeDrawer === 'artifacts' && renderArtifactDrawer?.()}
        {activeDrawer === 'decisions' && renderDecisionDrawer?.()}
        {activeDrawer === 'role' && renderRoleSection?.()}
      </DrawerOverlay>

      {/* ================================================================== */}
      {/* Blocking overlays (auto-triggered by server events)                */}
      {/* Only the activeBlockingOverlay renders — priority arbiter ensures  */}
      {/* deterministic behaviour. Lower-priority overlays stay queued and   */}
      {/* resume when the higher-priority one closes.                        */}
      {/* ================================================================== */}

      {/* Decision modal — highest priority */}
      {activeBlockingOverlay === 'decision' && (
        <div className="animate-in fade-in duration-200">
          {renderDecisionModal?.()}
        </div>
      )}

      {/* Story Overlay — medium priority */}
      <StoryOverlay
        isOpen={activeBlockingOverlay === 'story'}
        text={overlayState.story.text}
        title={overlayState.story.title}
        speed={overlayState.story.speed}
        theme={overlayState.story.theme}
        showProgress={overlayState.story.showProgress}
        allowSkip={overlayState.story.allowSkip}
        allowParticipantSkip={overlayState.story.allowParticipantSkip}
        allowClose={overlayState.story.allowClose}
        isHost={false}
        onClose={onCloseStory}
        onSkip={onCloseStory}
        onComplete={() => undefined}
      />

      {/* Countdown Overlay — lowest priority */}
      <CountdownOverlay
        duration={overlayState.countdown.duration}
        message={overlayState.countdown.message}
        variant={overlayState.countdown.variant}
        isOpen={activeBlockingOverlay === 'countdown'}
        onComplete={onCloseCountdown}
        onSkip={onCloseCountdown}
      />
    </>
  );
}
