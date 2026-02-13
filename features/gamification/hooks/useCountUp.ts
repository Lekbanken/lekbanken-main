"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

/**
 * Animates a number from 0 to `end` using requestAnimationFrame.
 * Respects `prefers-reduced-motion` — returns `end` immediately when active.
 *
 * Uses useSyncExternalStore to avoid the "setState inside effect" lint warning
 * while still driving the animation via requestAnimationFrame.
 */
export function useCountUp(end: number, durationMs = 800): number {
  // Store the current animated value in a ref (external store)
  const valueRef = useRef(end);
  const listenersRef = useRef(new Set<() => void>());
  const rafRef = useRef<number | null>(null);
  const prevEndRef = useRef(end);

  // Subscribe / getSnapshot for useSyncExternalStore
  const subscribe = (cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  };
  const getSnapshot = () => valueRef.current;

  // Notify React of external store change
  const emit = () => {
    listenersRef.current.forEach((cb) => cb());
  };

  useEffect(() => {
    // Respect reduced-motion preference
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Cancel any running animation when end changes
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (prefersReduced || end === 0 || end === prevEndRef.current) {
      // Skip animation — snap to final value
      prevEndRef.current = end;
      if (valueRef.current !== end) {
        valueRef.current = end;
        emit();
      }
      return;
    }

    prevEndRef.current = end;
    let start: number | null = null;

    const step = (timestamp: number) => {
      if (start === null) start = timestamp;
      const elapsed = timestamp - start;
      const progress = Math.min(elapsed / durationMs, 1);

      // ease-out cubic for natural deceleration
      const eased = 1 - Math.pow(1 - progress, 3);

      const next = Math.round(eased * end);
      if (next !== valueRef.current) {
        valueRef.current = next;
        emit();
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    // Start from 0
    valueRef.current = 0;
    emit();
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [end, durationMs]);

  return useSyncExternalStore(subscribe, getSnapshot, () => end);
}
