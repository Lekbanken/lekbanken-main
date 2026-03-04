'use client';

/**
 * useActiveRuns
 *
 * Fetches the current user's in-progress runs and provides a
 * planId → runId lookup. Used by PlanListItem and ScheduleCard
 * to show "Fortsätt" instead of "Starta".
 *
 * Re-fetches when `refetchKey` changes (e.g. after starting a new run).
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchActiveRuns, type ActiveRun } from '@/features/play/api';

export function useActiveRuns() {
  const [runs, setRuns] = useState<ActiveRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchActiveRuns();
      setRuns(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Map planId → most recent active run */
  const activeRunByPlanId = useMemo(() => {
    const map = new Map<string, ActiveRun>();
    for (const run of runs) {
      // If multiple active runs for same plan, keep the most recent
      if (!map.has(run.planId)) {
        map.set(run.planId, run);
      }
    }
    return map;
  }, [runs]);

  return {
    runs,
    isLoading,
    activeRunByPlanId,
    /** Get the active run for a specific plan, or undefined */
    getActiveRun: useCallback(
      (planId: string) => activeRunByPlanId.get(planId),
      [activeRunByPlanId]
    ),
    /** Refresh active runs (e.g. after completing/abandoning a run) */
    refetch: load,
  };
}
