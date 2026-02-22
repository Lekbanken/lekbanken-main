'use client';

/**
 * ChipLane — Shared chip lane queue hook + view component
 *
 * Generic "notification chip" system used by both participant (TriggerLane)
 * and director (DirectorChipLane). Each side provides its own:
 * - Chip type taxonomy (string union)
 * - Color/dot mappings
 * - Max chips + TTL constants
 * - Clickable vs read-only behaviour
 *
 * This module provides:
 * - `useChipQueue<T>()` — generic queue with dedupe, FIFO, TTL, 2-phase exit
 * - `ChipLaneView<T>()` — generic render component using motion tokens
 */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  MOTION_CHIP_LANE_OPEN,
  MOTION_CHIP_LANE_CLOSED,
  MOTION_CHIP_BASE,
  MOTION_CHIP_ENTER,
  MOTION_CHIP_EXIT,
} from './motion-tokens';

// =============================================================================
// Types
// =============================================================================

export interface ChipItem<T extends string = string> {
  id: string;
  type: T;
  /** Optional detail text (e.g. signal channel, participant name) */
  detail?: string;
  createdAt: number;
  /** When true, chip is playing exit animation before removal */
  exiting?: boolean;
}

export interface ChipQueueConfig {
  /** Maximum chips visible at once */
  maxChips: number;
  /** Time-to-live per chip (ms) */
  ttlMs: number;
  /** Exit animation duration (ms) — must match CSS */
  exitMs: number;
}

export interface ChipLaneViewProps<T extends string> {
  chips: ChipItem<T>[];
  labels: Record<T, string>;
  /** Color class per chip type (border + text) */
  colors: Record<T, string>;
  /** Dot color class per chip type */
  dotColors: Record<T, string>;
  /** ARIA label for the lane container */
  ariaLabel?: string;
  /** Additional padding class (e.g. 'px-4' for director) */
  className?: string;
  /** Optional click handler per chip — makes chips `<button>` */
  onChipClick?: (chip: ChipItem<T>) => void;
  /** Render slot after the label (e.g. detail text) */
  renderDetail?: (chip: ChipItem<T>) => ReactNode;
}

// =============================================================================
// Hook: useChipQueue
// =============================================================================

/**
 * Generic chip queue with dedupe, FIFO eviction, TTL, and 2-phase exit.
 *
 * Usage:
 *   const { chips, pushChip } = useChipQueue<MyChipType>({ maxChips: 2, ttlMs: 8000, exitMs: 150 });
 *   pushChip('NEW_ARTIFACTS');
 */
export function useChipQueue<T extends string>(config: ChipQueueConfig) {
  const { maxChips, ttlMs, exitMs } = config;
  const [chips, setChips] = useState<ChipItem<T>[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Cleanup all timers on unmount
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, []);

  const removeChip = useCallback(
    (id: string) => {
      // Phase 1: mark as exiting → triggers exit animation
      setChips((prev) => prev.map((c) => (c.id === id ? { ...c, exiting: true } : c)));
      // Phase 2: remove from DOM after exit animation completes
      setTimeout(() => {
        setChips((prev) => prev.filter((c) => c.id !== id));
      }, exitMs);
      // Clean TTL timer ref
      const timer = timersRef.current.get(id);
      if (timer) {
        clearTimeout(timer);
        timersRef.current.delete(id);
      }
    },
    [exitMs],
  );

  const pushChip = useCallback(
    (type: T, detail?: string) => {
      setChips((prev) => {
        // Dedupe: remove existing chip of same type + clean its timer
        const deduped = prev.filter((c) => {
          if (c.type === type) {
            const t = timersRef.current.get(c.id);
            if (t) {
              clearTimeout(t);
              timersRef.current.delete(c.id);
            }
            return false;
          }
          return true;
        });

        // FIFO: keep only last (maxChips - 1) to make room for new one
        const evicted =
          deduped.length >= maxChips
            ? deduped.slice(0, deduped.length - (maxChips - 1))
            : [];
        for (const e of evicted) {
          const t = timersRef.current.get(e.id);
          if (t) {
            clearTimeout(t);
            timersRef.current.delete(e.id);
          }
        }
        const trimmed =
          deduped.length >= maxChips
            ? deduped.slice(deduped.length - (maxChips - 1))
            : deduped;

        const id = `${type}-${Date.now()}`;
        const chip: ChipItem<T> = { id, type, detail, createdAt: Date.now() };

        // Schedule auto-removal
        const timer = setTimeout(() => removeChip(id), ttlMs);
        timersRef.current.set(id, timer);

        return [...trimmed, chip];
      });
    },
    [maxChips, ttlMs, removeChip],
  );

  return { chips, pushChip, removeChip } as const;
}

// =============================================================================
// Component: ChipLaneView
// =============================================================================

export function ChipLaneView<T extends string>({
  chips,
  labels,
  colors,
  dotColors,
  ariaLabel = 'System notifications',
  className,
  onChipClick,
  renderDetail,
}: ChipLaneViewProps<T>) {
  const isOpen = chips.length > 0;
  const Tag = onChipClick ? 'button' : 'span';

  return (
    <div
      data-open={isOpen}
      className={`${isOpen ? MOTION_CHIP_LANE_OPEN : MOTION_CHIP_LANE_CLOSED}${className ? ` ${className}` : ''}`}
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      {chips.map((chip) => (
        <Tag
          key={chip.id}
          type={onChipClick ? 'button' : undefined}
          onClick={onChipClick ? () => onChipClick(chip) : undefined}
          className={`${MOTION_CHIP_BASE} ${
            chip.exiting ? MOTION_CHIP_EXIT : MOTION_CHIP_ENTER
          } ${colors[chip.type]}${onChipClick ? ' cursor-pointer' : ''}`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-1.5 w-1.5 rounded-full ${dotColors[chip.type]}`}
          />
          {labels[chip.type]}
          {renderDetail?.(chip)}
        </Tag>
      ))}
    </div>
  );
}
