/**
 * useActionFeedback - Action-level feedback hook for Planner
 *
 * Replaces the global error state pattern with per-action feedback.
 * Provides pending state tracking and toast notifications.
 */

'use client'

import { useState, useCallback } from 'react'
import { useToast } from '@/components/ui/toast'

export interface ActionFeedbackOptions {
  /** Message to show on success (optional, no toast if omitted) */
  successMessage?: string
  /** Message to show on error (defaults to generic message) */
  errorMessage?: string
  /** Whether to show error details from exception */
  showErrorDetails?: boolean
}

export interface ActionFeedbackResult<T> {
  data: T | null
  error: Error | null
}

/**
 * Hook for managing action-level feedback in Planner.
 *
 * Usage:
 * ```tsx
 * const { isPending, withFeedback } = useActionFeedback()
 *
 * const handleSave = () => withFeedback(
 *   'save-plan',
 *   () => savePlan(data),
 *   { successMessage: 'Plan sparad!' }
 * )
 *
 * return <Button disabled={isPending('save-plan')}>Spara</Button>
 * ```
 */
export function useActionFeedback() {
  const [pending, setPending] = useState<Set<string>>(new Set())
  const toast = useToast()

  /**
   * Check if a specific action is pending.
   */
  const isPending = useCallback(
    (actionId: string): boolean => pending.has(actionId),
    [pending]
  )

  /**
   * Check if any action is pending.
   */
  const isAnyPending = useCallback((): boolean => pending.size > 0, [pending])

  /**
   * Execute an async action with feedback.
   * Shows loading state and toast notifications.
   */
  const withFeedback = useCallback(
    async <T>(
      actionId: string,
      action: () => Promise<T>,
      options?: ActionFeedbackOptions
    ): Promise<ActionFeedbackResult<T>> => {
      // Add to pending set
      setPending((prev) => {
        const next = new Set(prev)
        next.add(actionId)
        return next
      })

      try {
        const result = await action()

        // Show success toast if message provided
        if (options?.successMessage) {
          toast.success(options.successMessage)
        }

        return { data: result, error: null }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))

        // Build error message
        const baseMessage = options?.errorMessage ?? 'Något gick fel'
        const detailMessage =
          options?.showErrorDetails && error.message ? error.message : undefined

        toast.error(detailMessage ?? baseMessage, detailMessage ? baseMessage : undefined)

        return { data: null, error }
      } finally {
        // Remove from pending set
        setPending((prev) => {
          const next = new Set(prev)
          next.delete(actionId)
          return next
        })
      }
    },
    [toast]
  )

  /**
   * Execute an async action silently (no toast on success).
   * Useful for auto-save operations.
   */
  const withSilentFeedback = useCallback(
    async <T>(
      actionId: string,
      action: () => Promise<T>,
      options?: Omit<ActionFeedbackOptions, 'successMessage'>
    ): Promise<ActionFeedbackResult<T>> => {
      return withFeedback(actionId, action, { ...options, successMessage: undefined })
    },
    [withFeedback]
  )

  return {
    /** Set of currently pending action IDs */
    pending,
    /** Check if a specific action is pending */
    isPending,
    /** Check if any action is pending */
    isAnyPending,
    /** Execute action with full feedback */
    withFeedback,
    /** Execute action with error-only feedback (for auto-save) */
    withSilentFeedback,
  }
}

// -----------------------------------------------------------------------------
// Saving State Hook - For debounced auto-save with inline indicators
// -----------------------------------------------------------------------------

export type SavingStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseSavingStateOptions {
  /** How long to show "saved" indicator before returning to idle */
  savedDuration?: number
}

/**
 * Hook for managing inline saving state indicators.
 *
 * Usage:
 * ```tsx
 * const { status, setSaving, setSaved, setError, reset } = useSavingState()
 *
 * return (
 *   <div>
 *     <input onChange={handleChange} />
 *     {status === 'saving' && <span>Sparar...</span>}
 *     {status === 'saved' && <span>Sparat!</span>}
 *   </div>
 * )
 * ```
 */
export function useSavingState(options?: UseSavingStateOptions) {
  const { savedDuration = 2000 } = options ?? {}
  const [status, setStatus] = useState<SavingStatus>('idle')

  const setSaving = useCallback(() => {
    setStatus('saving')
  }, [])

  const setSaved = useCallback(() => {
    setStatus('saved')
    // Auto-reset to idle after duration
    setTimeout(() => {
      setStatus((current) => (current === 'saved' ? 'idle' : current))
    }, savedDuration)
  }, [savedDuration])

  const setError = useCallback(() => {
    setStatus('error')
  }, [])

  const reset = useCallback(() => {
    setStatus('idle')
  }, [])

  return {
    status,
    setSaving,
    setSaved,
    setError,
    reset,
    isSaving: status === 'saving',
    isSaved: status === 'saved',
    isError: status === 'error',
  }
}

// -----------------------------------------------------------------------------
// Combined Hook for Field-Level Auto-Save
// -----------------------------------------------------------------------------

export interface UseAutoSaveOptions {
  /** Debounce delay in ms */
  debounceMs?: number
  /** Callback to save the value */
  onSave: (value: string) => Promise<void>
  /** Initial value */
  initialValue?: string
}

/**
 * Hook for managing debounced auto-save with status indicators.
 *
 * Usage:
 * ```tsx
 * const { value, onChange, status } = useAutoSave({
 *   initialValue: plan.name,
 *   onSave: (v) => updatePlan({ name: v }),
 *   debounceMs: 500,
 * })
 *
 * return (
 *   <div>
 *     <input value={value} onChange={(e) => onChange(e.target.value)} />
 *     <SavingIndicator status={status} />
 *   </div>
 * )
 * ```
 */
export function useAutoSave(options: UseAutoSaveOptions) {
  const { debounceMs = 500, onSave, initialValue = '' } = options
  const [value, setValue] = useState(initialValue)
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null)
  const { status, setSaving, setSaved, setError } = useSavingState()

  const onChange = useCallback(
    (newValue: string) => {
      setValue(newValue)

      // Clear existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      // Set new debounced save
      const id = setTimeout(async () => {
        setSaving()
        try {
          await onSave(newValue)
          setSaved()
        } catch {
          setError()
        }
      }, debounceMs)

      setTimeoutId(id)
    },
    [debounceMs, onSave, timeoutId, setSaving, setSaved, setError]
  )

  // Sync with external value changes
  const setValueFromExternal = useCallback((newValue: string) => {
    setValue(newValue)
  }, [])

  return {
    value,
    onChange,
    status,
    setValueFromExternal,
  }
}
