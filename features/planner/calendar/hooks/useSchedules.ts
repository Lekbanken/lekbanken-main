'use client';

/**
 * useSchedules Hook
 * 
 * Manages CRUD operations for plan schedules.
 * Uses React state with useEffect for data fetching.
 */

import { useCallback, useState, useEffect } from 'react';
import type { 
  PlanSchedule, 
  CreateScheduleInput, 
  UpdateScheduleInput,
  ScheduleFilters,
  ScheduleDialogState,
} from '../types';

// =============================================================================
// API Functions
// =============================================================================

const API_BASE = '/api/plans/schedules';

async function fetchSchedules(filters: ScheduleFilters): Promise<PlanSchedule[]> {
  const params = new URLSearchParams({
    from: filters.from,
    to: filters.to,
  });
  
  if (filters.planId) params.set('planId', filters.planId);
  if (filters.status) params.set('status', filters.status);
  
  const response = await fetch(`${API_BASE}?${params}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch schedules');
  }
  
  return response.json();
}

async function createSchedule(input: CreateScheduleInput): Promise<PlanSchedule> {
  const response = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to create schedule');
  }
  
  return response.json();
}

async function updateSchedule(
  scheduleId: string, 
  input: UpdateScheduleInput
): Promise<PlanSchedule> {
  const response = await fetch(`${API_BASE}/${scheduleId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to update schedule');
  }
  
  return response.json();
}

async function deleteSchedule(scheduleId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/${scheduleId}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to delete schedule');
  }
}

async function markScheduleComplete(
  scheduleId: string, 
  notes?: string
): Promise<PlanSchedule> {
  return updateSchedule(scheduleId, {
    status: 'completed',
    notes,
  });
}

async function markScheduleSkipped(
  scheduleId: string, 
  notes?: string
): Promise<PlanSchedule> {
  return updateSchedule(scheduleId, {
    status: 'skipped',
    notes,
  });
}

// =============================================================================
// Hook
// =============================================================================

interface UseSchedulesOptions {
  filters: ScheduleFilters;
  enabled?: boolean;
}

interface UseSchedulesReturn {
  // Data
  schedules: PlanSchedule[];
  isLoading: boolean;
  error: Error | null;
  
  // CRUD operations
  create: (input: CreateScheduleInput) => Promise<PlanSchedule>;
  update: (scheduleId: string, input: UpdateScheduleInput) => Promise<PlanSchedule>;
  remove: (scheduleId: string) => Promise<void>;
  markComplete: (scheduleId: string, notes?: string) => Promise<PlanSchedule>;
  markSkipped: (scheduleId: string, notes?: string) => Promise<PlanSchedule>;
  
  // Refresh
  refresh: () => void;
  
  // Mutation state
  isMutating: boolean;
  mutationError: string | null;
  
  // Dialog state
  dialog: ScheduleDialogState;
  openCreateDialog: (selectedDate?: string) => void;
  openEditDialog: (schedule: PlanSchedule) => void;
  closeDialog: () => void;
}

export function useSchedules(options: UseSchedulesOptions): UseSchedulesReturn {
  const { filters, enabled = true } = options;
  
  const [schedules, setSchedules] = useState<PlanSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dialog, setDialog] = useState<ScheduleDialogState>({
    isOpen: false,
    mode: 'create',
  });

  // Fetch schedules with useEffect
  useEffect(() => {
    if (!enabled) {
      setSchedules([]);
      return;
    }

    let cancelled = false;

    async function loadSchedules() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchSchedules(filters);
        if (!cancelled) {
          setSchedules(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Failed to fetch schedules'));
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSchedules();

    return () => {
      cancelled = true;
    };
    // Using individual filter properties for stable dependencies instead of object reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.from, filters.to, filters.planId, filters.status, enabled, refreshKey]);

  // Refresh function
  const refresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // CRUD operations
  const create = useCallback(async (input: CreateScheduleInput) => {
    setIsMutating(true);
    setMutationError(null);
    
    try {
      const newSchedule = await createSchedule(input);
      refresh();
      return newSchedule;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create schedule';
      setMutationError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const update = useCallback(async (scheduleId: string, input: UpdateScheduleInput) => {
    setIsMutating(true);
    setMutationError(null);
    
    try {
      const updatedSchedule = await updateSchedule(scheduleId, input);
      refresh();
      return updatedSchedule;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update schedule';
      setMutationError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const remove = useCallback(async (scheduleId: string) => {
    setIsMutating(true);
    setMutationError(null);
    
    try {
      await deleteSchedule(scheduleId);
      refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete schedule';
      setMutationError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const markComplete = useCallback(async (scheduleId: string, notes?: string) => {
    setIsMutating(true);
    setMutationError(null);
    
    try {
      const updated = await markScheduleComplete(scheduleId, notes);
      refresh();
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark complete';
      setMutationError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  const markSkipped = useCallback(async (scheduleId: string, notes?: string) => {
    setIsMutating(true);
    setMutationError(null);
    
    try {
      const updated = await markScheduleSkipped(scheduleId, notes);
      refresh();
      return updated;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to mark skipped';
      setMutationError(message);
      throw err;
    } finally {
      setIsMutating(false);
    }
  }, [refresh]);

  // Dialog management
  const openCreateDialog = useCallback((selectedDate?: string) => {
    setDialog({
      isOpen: true,
      mode: 'create',
      selectedDate,
    });
  }, []);

  const openEditDialog = useCallback((schedule: PlanSchedule) => {
    setDialog({
      isOpen: true,
      mode: 'edit',
      schedule,
    });
  }, []);

  const closeDialog = useCallback(() => {
    setDialog(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    schedules,
    isLoading,
    error,
    create,
    update,
    remove,
    markComplete,
    markSkipped,
    refresh,
    isMutating,
    mutationError,
    dialog,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  };
}
