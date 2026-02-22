/**
 * TriggerLane v2 — Participant System Cue Chips
 *
 * Thin wrapper over shared ChipLane primitives, providing
 * participant-specific chip taxonomy, colors, and constants.
 *
 * Rules:
 * - Max 2 chips visible at once (FIFO — oldest evicts first)
 * - TTL 8 seconds per chip, with type-based dedupe
 * - Chips are passive (read-only <span>), not clickable in v1
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

export type TriggerChipType =
  | 'NEW_ARTIFACTS'
  | 'DECISION_OPEN'
  | 'COUNTDOWN_STARTED'
  | 'STORY_SHOWN'
  | 'BOARD_UPDATED'
  | 'RECONNECTED';

export type TriggerChip = ChipItem<TriggerChipType>;

export interface TriggerLaneProps {
  /** Current chips to display (managed by parent via useTriggerLane) */
  chips: TriggerChip[];
  /** Labels for each chip type (i18n) */
  labels: Record<TriggerChipType, string>;
}

// =============================================================================
// Constants
// =============================================================================

/** Max chips visible at once */
export const MAX_CHIPS = 2;

/** Time-to-live per chip (ms) */
export const CHIP_TTL_MS = 8_000;

/** Exit animation duration (ms) — must match CSS duration-150 */
export const CHIP_EXIT_MS = 150;

/** Accent-dot color per chip type */
const CHIP_DOT_COLORS: Record<TriggerChipType, string> = {
  NEW_ARTIFACTS: 'bg-primary',
  DECISION_OPEN: 'bg-primary',
  COUNTDOWN_STARTED: 'bg-yellow-500',
  STORY_SHOWN: 'bg-purple-500',
  BOARD_UPDATED: 'bg-blue-500',
  RECONNECTED: 'bg-green-500',
};

/** Subtle chip border + muted text per type */
const CHIP_COLORS: Record<TriggerChipType, string> = {
  NEW_ARTIFACTS: 'border-primary/30 text-foreground/80',
  DECISION_OPEN: 'border-primary/30 text-foreground/80',
  COUNTDOWN_STARTED: 'border-yellow-500/30 text-foreground/80',
  STORY_SHOWN: 'border-purple-500/30 text-foreground/80',
  BOARD_UPDATED: 'border-blue-500/30 text-foreground/80',
  RECONNECTED: 'border-green-500/30 text-foreground/80',
};

// =============================================================================
// Component
// =============================================================================

export function TriggerLane({ chips, labels }: TriggerLaneProps) {
  return (
    <ChipLaneView<TriggerChipType>
      chips={chips}
      labels={labels}
      colors={CHIP_COLORS}
      dotColors={CHIP_DOT_COLORS}
      ariaLabel="System notifications"
    />
  );
}

// =============================================================================
// Hook: useTriggerLane — chip state management (delegates to useChipQueue)
// =============================================================================

export function useTriggerLane() {
  const { chips, pushChip: rawPush, removeChip } = useChipQueue<TriggerChipType>({
    maxChips: MAX_CHIPS,
    ttlMs: CHIP_TTL_MS,
    exitMs: CHIP_EXIT_MS,
  });

  // Keep the same signature (no detail param for participant chips)
  const pushChip = (type: TriggerChipType) => rawPush(type);

  return { chips, pushChip, removeChip } as const;
}
