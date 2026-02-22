/**
 * DirectorChipLane v2 — Host-side System Cue Chips
 *
 * Thin wrapper over shared ChipLane primitives, providing
 * host-specific chip taxonomy, colors, and constants.
 *
 * Rules:
 * - Max 3 chips visible at once (host sees more events)
 * - TTL 6 seconds per chip
 * - Chips are <button> (clickable — opens signal inbox)
 */

'use client';

import {
  useChipQueue,
  ChipLaneView,
  type ChipItem,
} from '@/features/play/components/shared';

// =============================================================================
// Types
// =============================================================================

export type DirectorChipType =
  | 'SIGNAL_RECEIVED'
  | 'PARTICIPANT_JOINED'
  | 'TRIGGER_FIRED';

export type DirectorChip = ChipItem<DirectorChipType>;

export interface DirectorChipLaneProps {
  chips: DirectorChip[];
  labels: Record<DirectorChipType, string>;
  /** Optional click handler — e.g. open Signal Inbox */
  onChipClick?: (chip: DirectorChip) => void;
}

// =============================================================================
// Constants
// =============================================================================

export const DIRECTOR_MAX_CHIPS = 3;
export const DIRECTOR_CHIP_TTL_MS = 6_000;
export const DIRECTOR_CHIP_EXIT_MS = 150;

const CHIP_DOT_COLORS: Record<DirectorChipType, string> = {
  SIGNAL_RECEIVED: 'bg-orange-500',
  PARTICIPANT_JOINED: 'bg-green-500',
  TRIGGER_FIRED: 'bg-purple-500',
};

const CHIP_COLORS: Record<DirectorChipType, string> = {
  SIGNAL_RECEIVED: 'border-orange-500/30 text-foreground/80',
  PARTICIPANT_JOINED: 'border-green-500/30 text-foreground/80',
  TRIGGER_FIRED: 'border-purple-500/30 text-foreground/80',
};

// =============================================================================
// Component
// =============================================================================

export function DirectorChipLane({ chips, labels, onChipClick }: DirectorChipLaneProps) {
  return (
    <ChipLaneView<DirectorChipType>
      chips={chips}
      labels={labels}
      colors={CHIP_COLORS}
      dotColors={CHIP_DOT_COLORS}
      ariaLabel="Director notifications"
      className="px-4"
      onChipClick={onChipClick}
      renderDetail={(chip) =>
        chip.detail ? (
          <span className="text-[10px] text-muted-foreground/70 ml-0.5">
            {chip.detail}
          </span>
        ) : null
      }
    />
  );
}

// =============================================================================
// Hook: useDirectorChips — chip state management (delegates to useChipQueue)
// =============================================================================

export function useDirectorChips() {
  return useChipQueue<DirectorChipType>({
    maxChips: DIRECTOR_MAX_CHIPS,
    ttlMs: DIRECTOR_CHIP_TTL_MS,
    exitMs: DIRECTOR_CHIP_EXIT_MS,
  });
}
