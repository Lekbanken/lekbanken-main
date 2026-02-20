export class TimeoutError extends Error {
  readonly name = 'TimeoutError'
  readonly ms: number
  readonly label?: string

  constructor(ms: number, label?: string) {
    super(label ? `Timed out after ${ms}ms: ${label}` : `Timed out after ${ms}ms`)
    this.ms = ms
    this.label = label
  }
}

/**
 * Options for withTimeout.
 */
export interface WithTimeoutOptions {
  /**
   * External AbortSignal — if the caller aborts, the timeout is cancelled
   * and the promise rejects with an AbortError.
   *
   * On timeout, an internal AbortController (linked to this signal) is
   * aborted so the underlying HTTP request is actually cancelled.
   */
  signal?: AbortSignal
}

/**
 * Wrap a promise with a timeout.
 *
 * - On timeout → aborts internal controller → underlying fetch is cancelled.
 * - If caller's signal aborts → cleans up timeout, rejects immediately.
 *
 * **Important:** This utility does not cancel underlying work unless the
 * caller's promise respects the provided AbortSignal. For HTTP requests,
 * use `createFetchWithTimeout` which wires abort properly. Other async
 * work (e.g. CPU-bound) will continue running after the timeout rejects.
 *
 * Backwards-compatible: `withTimeout(promise, ms, label?)` still works.
 * New form: `withTimeout(promise, ms, label?, { signal })` or
 *           `withTimeout(promise, ms, { signal })`.
 */
export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  labelOrOptions?: string | WithTimeoutOptions,
  maybeOptions?: WithTimeoutOptions,
): Promise<T> {
  const label = typeof labelOrOptions === 'string' ? labelOrOptions : undefined
  const options = typeof labelOrOptions === 'object' ? labelOrOptions : maybeOptions
  const externalSignal = options?.signal

  // Already aborted before we even start
  if (externalSignal?.aborted) {
    return Promise.reject(externalSignal.reason ?? new DOMException('Aborted', 'AbortError'))
  }

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let removeAbortListener: (() => void) | null = null

  const cleanup = () => {
    if (timeoutId) { clearTimeout(timeoutId); timeoutId = null }
    if (removeAbortListener) { removeAbortListener(); removeAbortListener = null }
  }

  const racePromise = new Promise<T>((_, reject) => {
    // 1. Timeout fires → reject + abort underlying work
    timeoutId = setTimeout(() => {
      timeoutId = null
      reject(new TimeoutError(ms, label))
    }, ms)

    // 2. External signal aborts → clean up + reject
    if (externalSignal) {
      const onAbort = () => {
        cleanup()
        reject(externalSignal.reason ?? new DOMException('Aborted', 'AbortError'))
      }
      externalSignal.addEventListener('abort', onAbort, { once: true })
      removeAbortListener = () => externalSignal.removeEventListener('abort', onAbort)
    }
  })

  return Promise.race([promise, racePromise]).finally(cleanup)
}

