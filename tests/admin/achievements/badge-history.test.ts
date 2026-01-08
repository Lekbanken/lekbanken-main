/**
 * Tests for badge history management (undo/redo)
 * Tests the core logic of useBadgeHistory hook
 * 
 * Note: This tests the pure logic, not the React hook integration.
 * For hook testing, use @testing-library/react-hooks in a separate test file.
 */

import { describe, it, expect } from 'vitest';
import type { AchievementItem } from '@/features/admin/achievements/types';

// Extract the pure logic from the hook for testing
const MAX_HISTORY = 50;

type HistoryState = {
  past: AchievementItem[];
  present: AchievementItem;
  future: AchievementItem[];
};

function applySetState(
  current: HistoryState,
  next: AchievementItem | ((prev: AchievementItem) => AchievementItem)
): HistoryState {
  const newPresent = typeof next === 'function' ? next(current.present) : next;
  
  // Don't add to history if nothing changed
  if (JSON.stringify(newPresent) === JSON.stringify(current.present)) {
    return current;
  }

  return {
    past: [...current.past.slice(-MAX_HISTORY + 1), current.present],
    present: newPresent,
    future: [],
  };
}

function applyUndo(current: HistoryState): HistoryState {
  if (current.past.length === 0) return current;

  const previous = current.past[current.past.length - 1];
  const newPast = current.past.slice(0, -1);

  return {
    past: newPast,
    present: previous,
    future: [current.present, ...current.future],
  };
}

function applyRedo(current: HistoryState): HistoryState {
  if (current.future.length === 0) return current;

  const next = current.future[0];
  const newFuture = current.future.slice(1);

  return {
    past: [...current.past, current.present],
    present: next,
    future: newFuture,
  };
}

function applyReset(current: HistoryState, initial: AchievementItem): HistoryState {
  return {
    past: [...current.past, current.present],
    present: initial,
    future: [],
  };
}

function createInitialHistory(initial: AchievementItem): HistoryState {
  return {
    past: [],
    present: initial,
    future: [],
  };
}

// Test fixtures
const baseBadge: AchievementItem = {
  id: 'test-badge',
  title: 'Initial Badge',
  icon: {
    mode: 'theme',
    themeId: 'gold_default',
    base: { id: 'base_circle' },
    symbol: null,
    backgrounds: [],
    foregrounds: []
  }
};

describe('BadgeHistory core logic', () => {
  describe('setState', () => {
    it('should add current state to past when setting new state', () => {
      const initial = createInitialHistory(baseBadge);
      const newBadge = { ...baseBadge, title: 'Updated Badge' };
      
      const result = applySetState(initial, newBadge);
      
      expect(result.past).toHaveLength(1);
      expect(result.past[0]).toEqual(baseBadge);
      expect(result.present).toEqual(newBadge);
    });

    it('should clear future when setting new state', () => {
      const withFuture: HistoryState = {
        past: [],
        present: baseBadge,
        future: [{ ...baseBadge, title: 'Future Badge' }]
      };
      const newBadge = { ...baseBadge, title: 'Updated Badge' };
      
      const result = applySetState(withFuture, newBadge);
      
      expect(result.future).toHaveLength(0);
    });

    it('should not add to history if state unchanged', () => {
      const initial = createInitialHistory(baseBadge);
      const sameBadge = { ...baseBadge };
      
      const result = applySetState(initial, sameBadge);
      
      expect(result.past).toHaveLength(0);
      expect(result).toBe(initial); // Same reference
    });

    it('should support function updater', () => {
      const initial = createInitialHistory(baseBadge);
      
      const result = applySetState(initial, (prev) => ({
        ...prev,
        title: prev.title + ' - Modified'
      }));
      
      expect(result.present.title).toBe('Initial Badge - Modified');
    });

    it('should limit history to MAX_HISTORY states', () => {
      let history = createInitialHistory(baseBadge);
      
      // Add 60 states (more than MAX_HISTORY of 50)
      for (let i = 0; i < 60; i++) {
        history = applySetState(history, { ...baseBadge, title: `Badge ${i}` });
      }
      
      // Past should be capped at MAX_HISTORY - 1 (49) + current addition
      expect(history.past.length).toBeLessThanOrEqual(MAX_HISTORY);
    });

    it('should preserve order when trimming history', () => {
      let history = createInitialHistory(baseBadge);
      
      // Add states in order
      for (let i = 0; i < 60; i++) {
        history = applySetState(history, { ...baseBadge, title: `Badge ${i}` });
      }
      
      // Most recent states should be preserved
      expect(history.present.title).toBe('Badge 59');
      // Oldest states should be trimmed
      expect(history.past[0].title).not.toBe('Badge 0');
    });
  });

  describe('undo', () => {
    it('should restore previous state', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Updated' });
      
      const result = applyUndo(history);
      
      expect(result.present.title).toBe('Initial Badge');
    });

    it('should move current state to future', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Updated' });
      
      const result = applyUndo(history);
      
      expect(result.future).toHaveLength(1);
      expect(result.future[0].title).toBe('Updated');
    });

    it('should do nothing when past is empty', () => {
      const initial = createInitialHistory(baseBadge);
      
      const result = applyUndo(initial);
      
      expect(result).toBe(initial);
    });

    it('should support multiple undos', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'First' });
      history = applySetState(history, { ...baseBadge, title: 'Second' });
      history = applySetState(history, { ...baseBadge, title: 'Third' });
      
      history = applyUndo(history);
      expect(history.present.title).toBe('Second');
      
      history = applyUndo(history);
      expect(history.present.title).toBe('First');
      
      history = applyUndo(history);
      expect(history.present.title).toBe('Initial Badge');
    });
  });

  describe('redo', () => {
    it('should restore next state from future', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Updated' });
      history = applyUndo(history);
      
      const result = applyRedo(history);
      
      expect(result.present.title).toBe('Updated');
    });

    it('should move current state to past', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Updated' });
      history = applyUndo(history);
      
      const result = applyRedo(history);
      
      expect(result.past).toContainEqual(baseBadge);
    });

    it('should do nothing when future is empty', () => {
      const initial = createInitialHistory(baseBadge);
      
      const result = applyRedo(initial);
      
      expect(result).toBe(initial);
    });

    it('should support undo then redo cycle', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Modified' });
      
      history = applyUndo(history);
      expect(history.present.title).toBe('Initial Badge');
      
      history = applyRedo(history);
      expect(history.present.title).toBe('Modified');
    });

    it('should support multiple redos', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'First' });
      history = applySetState(history, { ...baseBadge, title: 'Second' });
      history = applySetState(history, { ...baseBadge, title: 'Third' });
      
      // Undo all
      history = applyUndo(history);
      history = applyUndo(history);
      history = applyUndo(history);
      expect(history.present.title).toBe('Initial Badge');
      
      // Redo all
      history = applyRedo(history);
      expect(history.present.title).toBe('First');
      
      history = applyRedo(history);
      expect(history.present.title).toBe('Second');
      
      history = applyRedo(history);
      expect(history.present.title).toBe('Third');
    });
  });

  describe('reset', () => {
    it('should restore to initial state', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Modified' });
      
      const result = applyReset(history, baseBadge);
      
      expect(result.present).toEqual(baseBadge);
    });

    it('should add current state to past', () => {
      let history = createInitialHistory(baseBadge);
      const modified = { ...baseBadge, title: 'Modified' };
      history = applySetState(history, modified);
      
      const result = applyReset(history, baseBadge);
      
      expect(result.past).toContainEqual(modified);
    });

    it('should clear future', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Modified' });
      history = applyUndo(history);
      
      const result = applyReset(history, baseBadge);
      
      expect(result.future).toHaveLength(0);
    });
  });

  describe('canUndo / canRedo flags', () => {
    it('should report canUndo correctly', () => {
      const initial = createInitialHistory(baseBadge);
      expect(initial.past.length > 0).toBe(false);
      
      const afterChange = applySetState(initial, { ...baseBadge, title: 'Changed' });
      expect(afterChange.past.length > 0).toBe(true);
    });

    it('should report canRedo correctly', () => {
      const initial = createInitialHistory(baseBadge);
      expect(initial.future.length > 0).toBe(false);
      
      let history = applySetState(initial, { ...baseBadge, title: 'Changed' });
      expect(history.future.length > 0).toBe(false);
      
      history = applyUndo(history);
      expect(history.future.length > 0).toBe(true);
    });
  });

  describe('complex scenarios', () => {
    it('should handle branching history (edit after undo)', () => {
      let history = createInitialHistory(baseBadge);
      history = applySetState(history, { ...baseBadge, title: 'Branch A' });
      history = applySetState(history, { ...baseBadge, title: 'Branch A - Step 2' });
      
      // Undo back to Branch A
      history = applyUndo(history);
      expect(history.present.title).toBe('Branch A');
      expect(history.future).toHaveLength(1);
      
      // Create new branch - should clear future
      history = applySetState(history, { ...baseBadge, title: 'Branch B' });
      expect(history.future).toHaveLength(0);
      expect(history.present.title).toBe('Branch B');
    });

    it('should handle rapid state changes', () => {
      let history = createInitialHistory(baseBadge);
      
      // Simulate rapid typing
      for (let i = 0; i < 10; i++) {
        history = applySetState(history, { ...baseBadge, title: `Title ${i}` });
      }
      
      expect(history.past).toHaveLength(10);
      expect(history.present.title).toBe('Title 9');
      
      // Undo half
      for (let i = 0; i < 5; i++) {
        history = applyUndo(history);
      }
      
      expect(history.present.title).toBe('Title 4');
      expect(history.future).toHaveLength(5);
    });

    it('should preserve icon changes in history', () => {
      let history = createInitialHistory(baseBadge);
      
      // Change icon
      history = applySetState(history, {
        ...baseBadge,
        icon: { ...baseBadge.icon, base: { id: 'base_shield' } }
      });
      
      // Undo should restore original icon
      history = applyUndo(history);
      expect(history.present.icon.base?.id).toBe('base_circle');
    });
  });
});
