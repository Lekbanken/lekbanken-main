'use client';

import type { PlayMode } from '@/features/admin/games/v2/types';
import { useAdaptivePlayMode } from '@/hooks/useAdaptivePlayMode';
import { SimplePlayView } from './SimplePlayView';
import { FacilitatedPlayView } from './FacilitatedPlayView';
import { ParticipantPlayMode } from './ParticipantPlayMode';
import type { Run } from '@/features/play/types';

// ============================================================================
// TYPES
// ============================================================================

export interface PlaySessionViewProps {
  /** The active run data */
  run: Run;
  /** The play mode from the game configuration */
  playMode: PlayMode | null;
  /** Optional session code for facilitated/participant modes */
  sessionCode?: string;
  /** Optional participant count */
  participantCount?: number;
  /** Participant token (for participant mode) */
  participantToken?: string;
  /** Called when the session is completed */
  onComplete?: () => void;
  /** Called when navigating back */
  onBack?: () => void;
  /** Called when step/phase changes (for persistence) */
  onProgressChange?: (stepIndex: number) => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * PlaySessionView - Adaptive play session router
 *
 * Selects the appropriate play view component based on the game's play_mode.
 * Acts as an adapter that routes to:
 * - SimplePlayView for 'basic' mode
 * - FacilitatedPlayView for 'facilitated' mode
 * - ParticipantPlayView for 'participants' mode
 */
export function PlaySessionView({
  run,
  playMode,
  sessionCode = 'DEMO',
  participantCount = 0,
  participantToken,
  onComplete,
  onBack,
  onProgressChange,
}: PlaySessionViewProps) {
  const { isSimple, isFacilitated, isParticipant } = useAdaptivePlayMode(playMode);

  // Basic mode - simple step-by-step view
  if (isSimple) {
    return (
      <SimplePlayView
        run={run}
        onComplete={onComplete}
        onStepChange={onProgressChange}
        onBack={onBack}
      />
    );
  }

  // Facilitated mode - phase-based view with timer and board
  if (isFacilitated) {
    return (
      <FacilitatedPlayView
        run={run}
        sessionCode={sessionCode}
        participantCount={participantCount}
        onComplete={onComplete}
        onPhaseChange={onProgressChange}
        onBack={onBack}
      />
    );
  }

  // Participants mode - full interactive view with teams, artifacts, etc.
  // Uses ParticipantPlayMode which handles its own data fetching
  if (isParticipant && participantToken) {
    return (
      <ParticipantPlayMode
        sessionCode={sessionCode}
        participantToken={participantToken}
      />
    );
  }

  // Fallback to simple view (or if participant mode lacks token)
  return (
    <SimplePlayView
      run={run}
      onComplete={onComplete}
      onStepChange={onProgressChange}
      onBack={onBack}
    />
  );
}
