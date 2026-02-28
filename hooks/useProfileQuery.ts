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
// HELPERS
// =============================================================================

/**
 * Create a promise that rejects when the given AbortSignal fires.
 * Used to let a reuser bail out of its await without creating a second
 * timeout timer (the owner's timer is the single source of truth).
 */
function raceAbort<T>(signal: AbortSignal): Promise<T> {
  return new Promise<T>((_, reject) => {
    if (signal.aborted) {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
      return
    }
    signal.addEventListener('abort', () => {
      reject(signal.reason ?? new DOMException('Aborted', 'AbortError'))
    }, { once: true })
  })
}

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
  // Track which requestKey the current own request was registered under,
  // so cleanup always targets the correct inFlightRequests entry even if
  // requestKey derivation changes between renders (e.g. userId changes).
  const activeRequestKeyRef = useRef<string | null>(null)
  const fetcherRef = useRef(fetcher)

  // Keep fetcher ref updated without triggering re-renders
  useEffect(() => {
    fetcherRef.current = fetcher
  }, [fetcher])

  // Compute depsKey from primitive values in deps
  // getDepsKey is a cheap pure function (string concatenation)
  const depsKey = getDepsKey(deps)
  
  // Memoize requestKey based on stable key + depsKey
  const requestKey = useMemo(() => `${key}::${depsKey}`, [key, depsKey])

  const executeQuery = useCallback(async () => {
    // Increment generation to invalidate previous requests
    const generation = ++requestGeneration.current

    // Abort any previous in-flight request owned by THIS component instance
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // Create new AbortController for THIS execution immediately.
    // This ensures cleanup can always cancel the current await — whether
    // we're in the reuse path or the fresh-fetch path.
    const abortController = new AbortController()
    abortControllerRef.current = abortController
    activeRequestKeyRef.current = requestKey

    // Check if there's already a global in-flight request for this key+deps
    const existing = inFlightRequests.get(requestKey)
    if (existing) {
      const isStale = Date.now() - existing.timestamp > MAX_INFLIGHT_AGE_MS
      // Check if the existing request's AbortController is already aborted or too old
      if (existing.abortController.signal.aborted || isStale) {
        // Clean up the stale entry
        inFlightRequests.delete(requestKey)
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[useProfileQuery] ${key}: cleaned stale entry (aborted=${existing.abortController.signal.aborted}, stale=${isStale})`)
        }
      } else {
        // Reuse the existing promise (single-flight dedup)
        if (process.env.NODE_ENV !== 'production') {
          console.debug(`[useProfileQuery] ${key}: reusing existing in-flight request`)
        }
        try {
          setStatus('loading')
          // NO second withTimeout here — the owner's promise already has
          // its own timeout timer. We only race against our own abort
          // signal so we can bail out immediately if we unmount.
          const result = await Promise.race([
            existing.promise as Promise<T>,
            raceAbort<T>(abortController.signal),
          ])
          // Only update if this is still the current generation
          if (requestGeneration.current === generation) {
            setData(result as T)
            setStatus('success')
            setError(null)
            if (process.env.NODE_ENV !== 'production') {
              console.debug(`[useProfileQuery] ${key}: reused request → success`)
            }
          }
          return // Reuse succeeded — done
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
              // GUARDRAIL A: AbortError during reuse. Two possible causes:
              // a) OUR cleanup aborted our signal → generation will mismatch
              //    on next check, but we're still here, so check explicitly.
              // b) The ORIGINAL owner's cleanup aborted the reused promise.
              // In both cases, clean up and fall through to start fresh
              // (unless our own generation is stale).
              if (abortController.signal.aborted) {
                // Our own cleanup fired — component unmounting. Just return.
                return
              }
              inFlightRequests.delete(requestKey)
              if (process.env.NODE_ENV !== 'production') {
                console.debug(`[useProfileQuery] ${key}: reused request aborted → starting fresh request`)
              }
              // fall through to create a new request below
            } else {
              setError(err instanceof Error ? err.message : 'Unknown error')
              setStatus('error')
              return
            }
          } else {
            return
          }
        }
      }
    }

    // Create the promise and register it.
    // The promise is wrapped with a self-cleaning .finally() so the
    // inFlightRequests entry is removed as soon as the underlying fetch
    // settles — regardless of which component instance created it or
    // whether that instance is still mounted. This prevents zombie
    // entries that could cause stale data reuse across user/tenant changes.
    const fetchPromise = fetcherRef.current(abortController.signal)
    const rawPromise = withTimeout(
      fetchPromise,
      timeout,
      `useProfileQuery(${key})`,
      { signal: abortController.signal }
    ).catch((err) => {
      if (err instanceof TimeoutError) {
        abortController.abort()
      }
      throw err
    })
    const selfCleaningPromise = rawPromise.finally(() => {
      if (inFlightRequests.get(requestKey)?.promise === selfCleaningPromise) {
        inFlightRequests.delete(requestKey)
      }
      // Clear active key if this instance's request just settled
      if (activeRequestKeyRef.current === requestKey) {
        activeRequestKeyRef.current = null
      }
      if (process.env.NODE_ENV === 'development') {
        console.info('[useProfileQuery] inFlight size', inFlightRequests.size)
      }
    })

    inFlightRequests.set(requestKey, { 
      promise: selfCleaningPromise as Promise<unknown>, 
      abortController,
      timestamp: Date.now()
    })

    setStatus('loading')
    setError(null)

    try {
      const result = await selfCleaningPromise

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
          // OWN request was aborted (user navigated away, new query started).
          // Silently ignore — no fallthrough needed since this was our own fetch.
        } else {
          setError(err instanceof Error ? err.message : 'Unknown error')
          setStatus('error')
        }
      }
    }
    // NOTE: No manual finally{} cleanup needed here — selfCleaningPromise
    // handles it via its own .finally() callback above.
  }, [key, requestKey, timeout])

  const retry = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    activeRequestKeyRef.current = null
    inFlightRequests.delete(requestKey)
    void executeQuery()
  }, [requestKey, executeQuery])

  useEffect(() => {
    if (skip) {
      setStatus('idle')
      return
    }

    void executeQuery()

    return () => {
      // GUARDRAIL B: Abort immediately (no 100ms delay) and clean up
      // the inFlightRequests entry IF this instance owns it.
      //
      // The old 100ms-delayed abort was a StrictMode workaround that
      // caused a race condition: the new mount's executeQuery() would
      // find a not-yet-aborted entry, reuse it, then get AbortError
      // 100ms later → stuck in 'loading'.
      //
      // Aborting immediately is safe:
      // - StrictMode: React unmounts and remounts. The immediate abort
      //   means the remount finds the entry already aborted → deletes
      //   it → starts a fresh request. Correct.
      // - Real unmount: the request is cancelled. Correct.
      // - Another instance reusing: if two instances share a requestKey,
      //   we only delete if WE own the AbortController.
      const ownController = abortControllerRef.current
      const ownKey = activeRequestKeyRef.current
      if (ownController) {
        abortControllerRef.current = null
        activeRequestKeyRef.current = null
        ownController.abort()

        // Only remove the inFlightRequests entry if it belongs to
        // this component instance (same AbortController reference).
        // Use activeRequestKeyRef (not closure requestKey) to ensure
        // we target the correct entry even if deps changed mid-render.
        if (ownKey) {
          const entry = inFlightRequests.get(ownKey)
          if (entry && entry.abortController === ownController) {
            inFlightRequests.delete(ownKey)
          }
        }
      }
    }
  }, [skip, executeQuery, requestKey])

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
