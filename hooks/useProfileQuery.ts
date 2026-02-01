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
 * IMPORTANT: Key stability rules
 * - `key` should be a stable string that uniquely identifies the query
 * - `deps` should ONLY contain serializable primitives (string, number, boolean, null)
 * - Do NOT put object references (services, clients) in deps - they cause key churn
 * - Services/clients should be accessed via closure in the fetcher function
 * 
 * Usage:
 * ```tsx
 * // ✅ CORRECT: Only primitives in deps, service in fetcher closure
 * const { data } = useProfileQuery(
 *   `organizations-${userId}`,
 *   async (signal) => profileService.getMemberships(userId),
 *   { userId },
 *   { skip: !userId }
 * );
 * 
 * // ❌ WRONG: Object in deps causes key churn
 * const { data } = useProfileQuery(
 *   `organizations-${userId}`,
 *   async (signal) => profileService.getMemberships(userId),
 *   { userId, profileService },  // DON'T DO THIS
 *   { skip: !userId }
 * );
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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
// STABLE KEY DERIVATION (primitives only)
// =============================================================================

/**
 * Track which dep keys have already warned to avoid console spam.
 * Key format: "depName:typeName" (e.g., "profileService:object")
 */
const warnedDepKeys = new Set<string>()

/**
 * Check if a value is a serializable primitive.
 * Only primitives are allowed in deps to ensure stable keys.
 */
function isSerializablePrimitive(value: unknown): boolean {
  if (value === null || value === undefined) return true
  const t = typeof value
  return t === 'string' || t === 'number' || t === 'boolean'
}

/**
 * Warn once per dep key about non-serializable values.
 */
function warnNonSerializable(depName: string, typeName: string): void {
  if (process.env.NODE_ENV === 'production') return
  
  const warnKey = `${depName}:${typeName}`
  if (warnedDepKeys.has(warnKey)) return
  
  warnedDepKeys.add(warnKey)
  console.warn(
    `[useProfileQuery] Non-serializable value in deps: "${depName}" is a ${typeName}. ` +
    `This will be ignored in the cache key. Move services/clients to the fetcher closure instead.`
  )
}

/**
 * Convert a primitive value to a stable string key.
 * Objects/functions are NOT supported and will trigger a one-time warning.
 */
function depToKey(key: string, value: unknown): string {
  if (value === null) return `${key}:null`
  if (value === undefined) return `${key}:undefined`
  
  const t = typeof value
  if (t === 'string') return `${key}:s:${value}`
  if (t === 'number') return `${key}:n:${value}`
  if (t === 'boolean') return `${key}:b:${value}`
  
  // Warn once per dep key (not per render)
  warnNonSerializable(key, t)
  
  // Return a constant so objects don't affect the key
  // Include dep name for debugging but not as identity
  return `${key}:__nonserializable(${t})__`
}

/**
 * Generate a stable deps key from a deps object.
 * Only serializable primitives contribute to the key.
 */
function getDepsKey(deps: Record<string, unknown>): string {
  const entries = Object.entries(deps)
    .filter(([, v]) => isSerializablePrimitive(v))
    .sort(([a], [b]) => a.localeCompare(b))
  
  return entries.map(([k, v]) => depToKey(k, v)).join('|')
}

// =============================================================================
// IN-FLIGHT TRACKING (Single-flight pattern)
// =============================================================================

// Track in-flight requests by key to prevent duplicate concurrent fetches
const inFlightRequests = new Map<string, {
  promise: Promise<unknown>
  abortController: AbortController
  timestamp: number
}>()

// Maximum age for an in-flight request entry (10 seconds)
const MAX_INFLIGHT_AGE_MS = 10000

// =============================================================================
// HOOK
// =============================================================================

export function useProfileQuery<T>(
  /** Unique key for this query (include userId, tenantId, etc.) */
  key: string,
  /** Fetcher function that receives an AbortSignal */
  fetcher: (signal: AbortSignal) => Promise<T>,
  /** Dependencies object - ONLY serializable primitives allowed */
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

  // Keep fetcher ref updated without triggering re-renders
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // Memoize depsKey to prevent recalculation on every render
  // This is the key fix: depsKey only changes when primitive values change
  const depsKey = useMemo(() => getDepsKey(deps), [
    // We manually list primitives to avoid object identity issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
    ...Object.entries(deps)
      .filter(([, v]) => isSerializablePrimitive(v))
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v)
  ])
  
  // Memoize requestKey based on stable key + depsKey
  const requestKey = useMemo(() => `${key}::${depsKey}`, [key, depsKey])

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
      const isStale = Date.now() - existing.timestamp > MAX_INFLIGHT_AGE_MS
      // Check if the existing request's AbortController is already aborted or too old
      if (existing.abortController.signal.aborted || isStale) {
        // Clean up the stale entry
        inFlightRequests.delete(requestKey)
      } else {
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
              inFlightRequests.delete(requestKey)
              return
            }
            setError(err instanceof Error ? err.message : 'Unknown error')
            setStatus('error')
          }
        }
        return
      }
    }

    // Create new AbortController
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    // Create the promise and register it
    const fetchPromise = fetcherRef.current(abortController.signal)
    const promise = withTimeout(fetchPromise, timeout, `useProfileQuery(${key})`).catch((err) => {
      if (err instanceof TimeoutError) {
        abortController.abort()
      }
      throw err
    })

    inFlightRequests.set(requestKey, { 
      promise: promise as Promise<unknown>, 
      abortController,
      timestamp: Date.now()
    })

    setStatus('loading')
    setError(null)

    try {
      const result = await promise

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
        } else if (err instanceof Error && err.name === 'AbortError') {
          // Silently ignore aborted requests
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setStatus('error')
        }
      }
    } finally {
      if (inFlightRequests.get(requestKey)?.promise === promise) {
        inFlightRequests.delete(requestKey)
      }
    }
  }, [key, requestKey, timeout])

  const retry = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    inFlightRequests.delete(requestKey)
    void executeQuery()
  }, [requestKey, executeQuery])

  // Track cleanup timeout for StrictMode handling
  const cleanupTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current)
      cleanupTimeoutRef.current = null
    }

    if (skip) {
      setStatus('idle')
      return
    }

    void executeQuery()

    return () => {
      const controllerToAbort = abortControllerRef.current
      if (controllerToAbort) {
        abortControllerRef.current = null
        cleanupTimeoutRef.current = setTimeout(() => {
          if (!controllerToAbort.signal.aborted) {
            controllerToAbort.abort()
          }
        }, 100)
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
