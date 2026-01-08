"use client";

import { useState, useCallback } from "react";

type BulkAction = "archive" | "restore" | "delete" | "publish";

type BulkResult = {
  success: boolean;
  planId: string;
  error?: string;
};

type BulkResponse = {
  results: BulkResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
};

type UseBulkActionsOptions = {
  onSuccess?: (response: BulkResponse) => void;
  onError?: (error: Error) => void;
  onComplete?: (response: BulkResponse) => void;
};

type UseBulkActionsResult = {
  /** Currently selected plan IDs */
  selectedIds: Set<string>;
  /** Select a plan by ID */
  select: (planId: string) => void;
  /** Deselect a plan by ID */
  deselect: (planId: string) => void;
  /** Toggle selection of a plan */
  toggle: (planId: string) => void;
  /** Select all plans from a list of IDs */
  selectAll: (planIds: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if a plan is selected */
  isSelected: (planId: string) => boolean;
  /** Number of selected plans */
  selectedCount: number;
  /** Execute a bulk action on selected plans */
  executeBulkAction: (action: BulkAction) => Promise<BulkResponse | null>;
  /** Whether a bulk action is currently in progress */
  isExecuting: boolean;
  /** Last bulk action result */
  lastResult: BulkResponse | null;
};

/**
 * Hook for managing bulk plan selections and actions
 * 
 * @example
 * ```tsx
 * const { selectedIds, toggle, executeBulkAction, isExecuting } = useBulkActions({
 *   onSuccess: (response) => {
 *     toast.success(`${response.summary.success} plans updated`);
 *   }
 * });
 * 
 * // In render:
 * <Checkbox checked={isSelected(plan.id)} onChange={() => toggle(plan.id)} />
 * <Button onClick={() => executeBulkAction('archive')} disabled={isExecuting}>
 *   Archive Selected ({selectedCount})
 * </Button>
 * ```
 */
export function useBulkActions(
  options: UseBulkActionsOptions = {}
): UseBulkActionsResult {
  const { onSuccess, onError, onComplete } = options;
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isExecuting, setIsExecuting] = useState(false);
  const [lastResult, setLastResult] = useState<BulkResponse | null>(null);

  const select = useCallback((planId: string) => {
    setSelectedIds((prev) => new Set(prev).add(planId));
  }, []);

  const deselect = useCallback((planId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(planId);
      return next;
    });
  }, []);

  const toggle = useCallback((planId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(planId)) {
        next.delete(planId);
      } else {
        next.add(planId);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback((planIds: string[]) => {
    setSelectedIds(new Set(planIds));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const isSelected = useCallback(
    (planId: string) => selectedIds.has(planId),
    [selectedIds]
  );

  const executeBulkAction = useCallback(
    async (action: BulkAction): Promise<BulkResponse | null> => {
      if (selectedIds.size === 0) {
        return null;
      }

      setIsExecuting(true);
      setLastResult(null);

      try {
        const response = await fetch("/api/plans/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planIds: Array.from(selectedIds),
            action,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message ?? "Bulk action failed");
        }

        const data: BulkResponse = await response.json();
        setLastResult(data);

        if (data.summary.failed === 0) {
          onSuccess?.(data);
        }

        onComplete?.(data);

        // Clear selection for successfully processed items
        if (data.summary.success > 0) {
          const successfulIds = new Set(
            data.results.filter((r) => r.success).map((r) => r.planId)
          );
          setSelectedIds((prev) => {
            const next = new Set(prev);
            for (const id of successfulIds) {
              next.delete(id);
            }
            return next;
          });
        }

        return data;
      } catch (err) {
        const error =
          err instanceof Error ? err : new Error("Unknown error");
        onError?.(error);
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [selectedIds, onSuccess, onError, onComplete]
  );

  return {
    selectedIds,
    select,
    deselect,
    toggle,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount: selectedIds.size,
    executeBulkAction,
    isExecuting,
    lastResult,
  };
}
