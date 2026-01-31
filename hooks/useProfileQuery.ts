'use client'

/**
 * useProfileQuery Hook
 * 
 * A standardized hook for profile data fetching with:
 * - Single-flight pattern (no duplicate concurrent requests)
 * - AbortController cancellation on dependency change
 * - State machine (no stuck "loading forever" state)
 * - Timeout detection
 * - StrictMode-safe (ignores stale responses)
 * 
 * Usage:
 * ```tsx
 * const { data, status, error, retry } = useProfileQuery(
 *   `notifications-${userId}`,
 *   async (signal) => profileService.getNotificationSettings(userId),
 *   { userId, supabase }
 * );
 * ```
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { TimeoutError, withTimeout } from '@/lib/utils/withTimeout'

// =============================================================================
// TYPES
// =============================================================================

export type QueryStatus = 'idle' | 'loading' | 'success' | 'error' | 'timeout'

export interface UseProfileQueryOptions {
  /** Timeout in ms before marking as "timeout" (default: 10000) */
  timeout?: number
  /** Whether to skip fetching (e.g., auth not ready) */
  skip?: boolean
  /** Initial data to use before fetching */
  initialData?: unknown
}

export interface UseProfileQueryResult<T> {
  /** The fetched data, or null */
  data: T | null
  /** Current status of the query */
  status: QueryStatus
  /** Error message if status is 'error' or 'timeout' */
  error: string | null
  /** Whether currently loading */
  isLoading: boolean
  /** Whether the query has completed successfully */
  isSuccess: boolean
  /** Whether the query failed */
  isError: boolean
  /** Whether the query timed out */
  isTimeout: boolean
  /** Retry the query */
  retry: () => void
}

// =============================================================================
// IN-FLIGHT TRACKING (Single-flight pattern)
// =============================================================================

const objectIds = new WeakMap<object, number>()
let objectIdSeq = 1

function depToKey(dep: unknown): string {
  if (dep === null) return 'null'
  const t = typeof dep
  if (t === 'undefined') return 'undefined'
  if (t === 'string') return `string:${dep}`
  if (t === 'number') return `number:${dep}`
  if (t === 'boolean') return `boolean:${dep}`
  if (t === 'bigint') return `bigint:${String(dep)}`
  if (t === 'symbol') return `symbol:${String(dep)}`

  if (dep instanceof Date) return `date:${dep.toISOString()}`

  if (t === 'function' || t === 'object') {
    const obj = dep as object
    const existing = objectIds.get(obj)
    if (existing) return `ref:${existing}`
    const id = objectIdSeq++
    objectIds.set(obj, id)
    return `ref:${id}`
  }

  return `unknown:${String(dep)}`
}

function getDepsKey(deps: Record<string, unknown>): string {
  const entries = Object.entries(deps).sort(([a], [b]) => a.localeCompare(b))
  return entries.map(([k, v]) => `${k}:${depToKey(v)}`).join('|')
}

// Track in-flight requests by key to prevent duplicate concurrent fetches
const inFlightRequests = new Map<string, {
  promise: Promise<unknown>
  abortController: AbortController
}>()

// =============================================================================
// HOOK
// =============================================================================

export function useProfileQuery<T>(
  /** Unique key for this query (include userId, tenantId, etc.) */
  key: string,
  /** Fetcher function that receives an AbortSignal */
  fetcher: (signal: AbortSignal) => Promise<T>,
  /** Dependencies object - refetch when this changes */
  deps: Record<string, unknown>,
  /** Options */
  options: UseProfileQueryOptions = {}
): UseProfileQueryResult<T> {
  const { timeout = 10000, skip = false, initialData } = options

  const [data, setData] = useState<T | null>((initialData as T) ?? null)
  const [status, setStatus] = useState<QueryStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  // Track request generation to ignore stale responses
  const requestGeneration = useRef(0)
  const abortControllerRef = useRef<AbortController | null>(null)
  const fetcherRef = useRef(fetcher)

  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  const depsKey = getDepsKey(deps)
  const requestKey = `${key}::${depsKey}`

  const executeQuery = useCallback(async () => {
    // Increment generation to invalidate previous requests
    const generation = ++requestGeneration.current

    // Abort any previous in-flight request for this component
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Check if there's already a global in-flight request for this key+deps
    const existing = inFlightRequests.get(requestKey)
    if (existing) {
      // Reuse the existing promise (single-flight)
      try {
        setStatus('loading')
        const result = await withTimeout(
          existing.promise as Promise<T>,
          timeout,
          `useProfileQuery(${key})`
        )
        // Only update if this is still the current generation
        if (requestGeneration.current === generation) {
          setData(result as T)
          setStatus('success')
          setError(null)
        }
      } catch (err) {
        if (requestGeneration.current === generation) {
          if (err instanceof TimeoutError) {
            existing.abortController.abort()
            inFlightRequests.delete(requestKey)
            setError(err.message)
            setStatus('timeout')
            return
          }
          if (err instanceof Error && err.name === 'AbortError') {
            // Silently ignore aborted requests
            return
          }
          setError(err instanceof Error ? err.message : 'Unknown error')
          setStatus('error')
        }
      }
      return
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Create the promise and register it (wrapped with timeout so it always settles)
    const fetchPromise = fetcherRef.current(abortController.signal)
    const promise = withTimeout(fetchPromise, timeout, `useProfileQuery(${key})`).catch((err) => {
      if (err instanceof TimeoutError) {
        abortController.abort()
      }
      throw err
    })

    inFlightRequests.set(requestKey, { promise: promise as Promise<unknown>, abortController })

    setStatus('loading')
    setError(null)

    try {
      const result = await promise

      // Only update if this is still the current generation
      if (requestGeneration.current === generation) {
        setData(result)
        setStatus('success')
        setError(null)
      }
    } catch (err) {
      if (requestGeneration.current === generation) {
        if (err instanceof TimeoutError) {
          setError(err.message)
          setStatus('timeout')
          return
        }
        if (err instanceof Error && err.name === 'AbortError') {
          // Silently ignore aborted requests (dependency change / unmount)
          return
        }
        setError(err instanceof Error ? err.message : 'Unknown error')
        setStatus('error')
      }
    } finally {
      // Clean up in-flight tracking
      if (inFlightRequests.get(requestKey)?.promise === promise) {
        inFlightRequests.delete(requestKey)
      }
    }
  }, [key, requestKey, timeout])

  const retry = useCallback(() => {
    // Abort any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    // Clear the in-flight tracking for this key+deps
    inFlightRequests.delete(requestKey)
    // Re-execute
    void executeQuery()
  }, [requestKey, executeQuery])

  useEffect(() => {
    // Skip if dependencies aren't ready
    if (skip) {
      setStatus('idle')
      return
    }

    void executeQuery()

    // Cleanup on unmount or deps change
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [skip, executeQuery])

  return {
    data,
    status,
    error,
    isLoading: status === 'loading',
    isSuccess: status === 'success',
    isError: status === 'error',
    isTimeout: status === 'timeout',
    retry,
  }
}
