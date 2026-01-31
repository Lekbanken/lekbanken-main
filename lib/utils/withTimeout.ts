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
 * Wrap a promise with a timeout.
 * Useful for preventing infinite loading spinners when a request hangs.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label?: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new TimeoutError(ms, label)), ms)
  })

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId)
  })
}

