import { TimeoutError } from '@/lib/utils/withTimeout'

type TimeoutConfig = {
  defaultMs: number
  restMs: number
  authMs: number
  functionsMs: number
  storageMs: number
}

export type FetchWithTimeoutOptions = Partial<TimeoutConfig> & {
  /**
   * When true, logs start/end/timeout in development.
   * Defaults to `process.env.NODE_ENV === 'development'`.
   */
  log?: boolean
  /**
   * Prefix used for console logs.
   */
  logPrefix?: string
}

const defaultTimeouts: TimeoutConfig = {
  // Keep a reasonable ceiling to avoid “infinite loading” when network/DB hangs.
  defaultMs: 30_000,
  // Normal PostgREST queries should be fast; if they aren’t, we want to surface it.
  restMs: 15_000,
  // Auth endpoints can be slower during token refresh but should not hang.
  authMs: 15_000,
  // Edge functions may do more work.
  functionsMs: 30_000,
  // Upload/download can be larger; allow longer.
  storageMs: 60_000,
}

function nowMs(): number {
  // eslint-disable-next-line no-restricted-globals
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function safeUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function pickTimeoutMs(url: string, timeouts: TimeoutConfig): number {
  try {
    const parsed = new URL(url)
    const path = parsed.pathname

    if (path.startsWith('/rest/v1/')) return timeouts.restMs
    if (path.startsWith('/auth/v1/')) return timeouts.authMs
    if (path.startsWith('/functions/v1/')) return timeouts.functionsMs
    if (path.startsWith('/storage/v1/')) return timeouts.storageMs

    return timeouts.defaultMs
  } catch {
    return timeouts.defaultMs
  }
}

function attachAbortListener(
  external: AbortSignal,
  controller: AbortController
): (() => void) | null {
  if (external.aborted) {
    controller.abort()
    return null
  }

  const onAbort = () => controller.abort()
  external.addEventListener('abort', onAbort, { once: true })
  return () => external.removeEventListener('abort', onAbort)
}

/**
 * Wrap a `fetch` implementation with timeouts + (optional) development logging.
 *
 * Why:
 * - Prevent “hung forever” requests from leaving the UI in an infinite loading state.
 * - Make it obvious (in dev) which Supabase endpoint is slow/hanging.
 */
export function createFetchWithTimeout(
  baseFetch: typeof fetch,
  options: FetchWithTimeoutOptions = {}
): typeof fetch {
  const timeouts: TimeoutConfig = { ...defaultTimeouts, ...options }
  const logEnabled = options.log ?? process.env.NODE_ENV === 'development'
  const logPrefix = options.logPrefix ?? '[supabase fetch]'

  // Track request counts per URL (dev-only) to detect duplicates
  const requestCounts = new Map<string, number>()

  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = safeUrlString(input)
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const timeoutMs = pickTimeoutMs(url, timeouts)

    // Dev-only: Track and log duplicate requests with call stack
    if (logEnabled && process.env.NODE_ENV !== 'production') {
      const urlKey = `${method}:${url}`
      const count = (requestCounts.get(urlKey) || 0) + 1
      requestCounts.set(urlKey, count)
      
      // For bootstrap endpoints, log stack trace to identify call sites
      const isBootstrapUrl = url.includes('/auth/v1/user') || 
                             url.includes('/rest/v1/users?') ||
                             url.includes('/rest/v1/user_tenant_memberships')
      
      if (isBootstrapUrl) {
        const stack = new Error().stack?.split('\n').slice(2, 10).join('\n') || ''
        console.info(`${logPrefix} TRACE #${count}`, { 
          method, 
          url: url.replace(/https:\/\/[^/]+/, ''), // Strip domain for readability
          requestNum: count,
          stack 
        })
      }
    }

    const controller = new AbortController()
    const removeAbortListeners: Array<() => void> = []

    if (init?.signal) {
      const remove = attachAbortListener(init.signal, controller)
      if (remove) removeAbortListeners.push(remove)
    }

    if (input instanceof Request && input.signal) {
      const remove = attachAbortListener(input.signal, controller)
      if (remove) removeAbortListeners.push(remove)
    }

    let didTimeout = false
    const startedAt = nowMs()
    const timeoutId = setTimeout(() => {
      didTimeout = true
      controller.abort()
    }, timeoutMs)

    try {
      if (logEnabled) {
        // Avoid logging headers/bodies; URL + timing is usually enough.
        console.info(`${logPrefix} start`, { method, url, timeoutMs })
      }

      const response = await baseFetch(input as RequestInfo, {
        ...init,
        signal: controller.signal,
      })

      if (logEnabled) {
        const elapsedMs = Math.round(nowMs() - startedAt)
        console.info(`${logPrefix} done`, {
          method,
          url,
          status: response.status,
          elapsedMs,
        })
      }

      return response
    } catch (err) {
      if (didTimeout) {
        const timeoutError = new TimeoutError(timeoutMs, `Supabase ${method} ${url}`)
        if (logEnabled) {
          console.warn(`${logPrefix} timeout`, { method, url, timeoutMs })
        }
        throw timeoutError
      }
      if (logEnabled) {
        console.warn(`${logPrefix} error`, { method, url, err })
      }
      throw err
    } finally {
      clearTimeout(timeoutId)
      removeAbortListeners.forEach((fn) => fn())
    }
  }
}

