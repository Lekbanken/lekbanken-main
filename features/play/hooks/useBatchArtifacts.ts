/**
 * useBatchArtifacts Hook
 * 
 * Enables batch operations on multiple artifacts at once.
 * Useful for revealing/hiding groups, resetting puzzles, etc.
 * 
 * Backlog B.5: Batch artifact operations
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface ArtifactInfo {
  id: string;
  name: string;
  type: string;
  stepId?: string;
  phaseId?: string;
  visible: boolean;
  locked: boolean;
  solved?: boolean;
  tags?: string[];
}

export type BatchOperation =
  | 'reveal'
  | 'hide'
  | 'reset'
  | 'lock'
  | 'unlock'
  | 'solve';

export interface BatchOperationResult {
  operation: BatchOperation;
  successful: string[];
  failed: Array<{ id: string; error: string }>;
  timestamp: Date;
}

export interface UseBatchArtifactsOptions {
  /** All artifacts in the session */
  artifacts: ArtifactInfo[];
  /** Callback to perform operation on single artifact */
  onOperation: (artifactId: string, operation: BatchOperation) => Promise<boolean>;
  /** Callback when batch operation completes */
  onBatchComplete?: (result: BatchOperationResult) => void;
}

export interface UseBatchArtifactsReturn {
  /** Currently selected artifact IDs */
  selectedIds: Set<string>;
  /** Toggle selection of an artifact */
  toggleSelection: (id: string) => void;
  /** Select all artifacts */
  selectAll: () => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Select artifacts by filter */
  selectByFilter: (filter: ArtifactFilter) => void;
  /** Check if an artifact is selected */
  isSelected: (id: string) => boolean;
  /** Number of selected artifacts */
  selectedCount: number;
  /** Perform batch operation on selected */
  performBatchOperation: (operation: BatchOperation) => Promise<BatchOperationResult>;
  /** Whether a batch operation is in progress */
  isProcessing: boolean;
  /** Progress during batch operation (0-100) */
  progress: number;
  /** Last batch result */
  lastResult: BatchOperationResult | null;
  /** Filter options based on current artifacts */
  filterOptions: FilterOptions;
}

export interface ArtifactFilter {
  type?: 'type' | 'step' | 'phase' | 'visibility' | 'state' | 'tag';
  value?: string;
  predicate?: (artifact: ArtifactInfo) => boolean;
}

export interface FilterOptions {
  types: string[];
  steps: string[];
  phases: string[];
  tags: string[];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBatchArtifacts({
  artifacts,
  onOperation,
  onBatchComplete,
}: UseBatchArtifactsOptions): UseBatchArtifactsReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastResult, setLastResult] = useState<BatchOperationResult | null>(null);

  // ==========================================================================
  // Filter options
  // ==========================================================================
  
  const filterOptions = useMemo((): FilterOptions => {
    const types = new Set<string>();
    const steps = new Set<string>();
    const phases = new Set<string>();
    const tags = new Set<string>();

    for (const artifact of artifacts) {
      types.add(artifact.type);
      if (artifact.stepId) steps.add(artifact.stepId);
      if (artifact.phaseId) phases.add(artifact.phaseId);
      if (artifact.tags) {
        for (const tag of artifact.tags) {
          tags.add(tag);
        }
      }
    }

    return {
      types: Array.from(types).sort(),
      steps: Array.from(steps),
      phases: Array.from(phases),
      tags: Array.from(tags).sort(),
    };
  }, [artifacts]);

  // ==========================================================================
  // Selection management
  // ==========================================================================
  
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(artifacts.map((a) => a.id)));
  }, [artifacts]);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const selectByFilter = useCallback(
    (filter: ArtifactFilter) => {
      let filtered: ArtifactInfo[];

      if (filter.predicate) {
        filtered = artifacts.filter(filter.predicate);
      } else {
        switch (filter.type) {
          case 'type':
            filtered = artifacts.filter((a) => a.type === filter.value);
            break;
          case 'step':
            filtered = artifacts.filter((a) => a.stepId === filter.value);
            break;
          case 'phase':
            filtered = artifacts.filter((a) => a.phaseId === filter.value);
            break;
          case 'visibility':
            filtered = artifacts.filter((a) =>
              filter.value === 'visible' ? a.visible : !a.visible
            );
            break;
          case 'state':
            if (filter.value === 'locked') {
              filtered = artifacts.filter((a) => a.locked);
            } else if (filter.value === 'unlocked') {
              filtered = artifacts.filter((a) => !a.locked);
            } else if (filter.value === 'solved') {
              filtered = artifacts.filter((a) => a.solved);
            } else if (filter.value === 'unsolved') {
              filtered = artifacts.filter((a) => a.solved === false);
            } else {
              filtered = [];
            }
            break;
          case 'tag':
            filtered = artifacts.filter((a) => a.tags?.includes(filter.value || ''));
            break;
          default:
            filtered = [];
        }
      }

      setSelectedIds(new Set(filtered.map((a) => a.id)));
    },
    [artifacts]
  );

  const isSelected = useCallback(
    (id: string) => selectedIds.has(id),
    [selectedIds]
  );

  // ==========================================================================
  // Batch operation
  // ==========================================================================
  
  const performBatchOperation = useCallback(
    async (operation: BatchOperation): Promise<BatchOperationResult> => {
      if (selectedIds.size === 0) {
        const result: BatchOperationResult = {
          operation,
          successful: [],
          failed: [],
          timestamp: new Date(),
        };
        return result;
      }

      setIsProcessing(true);
      setProgress(0);

      const successful: string[] = [];
      const failed: Array<{ id: string; error: string }> = [];
      const ids = Array.from(selectedIds);
      const total = ids.length;

      for (let i = 0; i < ids.length; i++) {
        const id = ids[i];
        try {
          const success = await onOperation(id, operation);
          if (success) {
            successful.push(id);
          } else {
            failed.push({ id, error: 'Operation returned false' });
          }
        } catch (error) {
          failed.push({
            id,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        setProgress(Math.round(((i + 1) / total) * 100));
      }

      const result: BatchOperationResult = {
        operation,
        successful,
        failed,
        timestamp: new Date(),
      };

      setLastResult(result);
      setIsProcessing(false);
      onBatchComplete?.(result);

      return result;
    },
    [selectedIds, onOperation, onBatchComplete]
  );

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    selectByFilter,
    isSelected,
    selectedCount: selectedIds.size,
    performBatchOperation,
    isProcessing,
    progress,
    lastResult,
    filterOptions,
  };
}

// =============================================================================
// Preset Filters
// =============================================================================

export const PRESET_FILTERS: Array<{
  id: string;
  icon: string;
  filter: ArtifactFilter;
}> = [
  {
    id: 'all-hidden',
    icon: 'eye-off',
    filter: { type: 'visibility', value: 'hidden' },
  },
  {
    id: 'all-visible',
    icon: 'eye',
    filter: { type: 'visibility', value: 'visible' },
  },
  {
    id: 'all-locked',
    icon: 'lock',
    filter: { type: 'state', value: 'locked' },
  },
  {
    id: 'all-solved',
    icon: 'check-circle',
    filter: { type: 'state', value: 'solved' },
  },
  {
    id: 'all-unsolved',
    icon: 'circle',
    filter: { type: 'state', value: 'unsolved' },
  },
  {
    id: 'puzzles',
    icon: 'puzzle',
    filter: {
      predicate: (a) =>
        ['keypad', 'riddle', 'cipher', 'tile_puzzle', 'logic_grid'].includes(a.type),
    },
  },
  {
    id: 'content',
    icon: 'file-text',
    filter: {
      predicate: (a) =>
        ['card', 'document', 'image', 'audio'].includes(a.type),
    },
  },
];

// =============================================================================
// Operation Keys (for translation lookup under play.batchArtifactPanel.operations)
// =============================================================================

export const OPERATION_KEYS: Record<BatchOperation, string> = {
  reveal: 'reveal',
  hide: 'hide',
  reset: 'reset',
  lock: 'lock',
  unlock: 'unlock',
  solve: 'solve',
};

/** @deprecated Use OPERATION_KEYS with translations instead */
export const OPERATION_LABELS = OPERATION_KEYS;

export const OPERATION_ICONS: Record<BatchOperation, string> = {
  reveal: 'eye',
  hide: 'eye-off',
  reset: 'refresh-cw',
  lock: 'lock',
  unlock: 'unlock',
  solve: 'check-circle',
};
