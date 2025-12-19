'use client';

import { useCallback, useRef, useState } from 'react';
import type { AchievementItem } from '../../types';

type HistoryState = {
  past: AchievementItem[];
  present: AchievementItem;
  future: AchievementItem[];
};

type UseBadgeHistoryReturn = {
  state: AchievementItem;
  setState: (next: AchievementItem | ((prev: AchievementItem) => AchievementItem)) => void;
  undo: () => void;
  redo: () => void;
  reset: () => void;
  canUndo: boolean;
  canRedo: boolean;
  historyLength: number;
};

const MAX_HISTORY = 50;

/**
 * Custom hook for managing badge editor state with undo/redo functionality.
 * Provides a complete history management system for the achievement builder.
 */
export function useBadgeHistory(initialState: AchievementItem): UseBadgeHistoryReturn {
  const initialRef = useRef(initialState);
  
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: initialState,
    future: [],
  });

  const setState = useCallback((next: AchievementItem | ((prev: AchievementItem) => AchievementItem)) => {
    setHistory((current) => {
      const newPresent = typeof next === 'function' ? next(current.present) : next;
      
      // Don't add to history if nothing changed (shallow comparison of key fields)
      if (JSON.stringify(newPresent) === JSON.stringify(current.present)) {
        return current;
      }

      return {
        past: [...current.past.slice(-MAX_HISTORY + 1), current.present],
        present: newPresent,
        future: [], // Clear future when new state is set
      };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, -1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture,
      };
    });
  }, []);

  const reset = useCallback(() => {
    setHistory((current) => ({
      past: [...current.past, current.present],
      present: initialRef.current,
      future: [],
    }));
  }, []);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    reset,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    historyLength: history.past.length,
  };
}
