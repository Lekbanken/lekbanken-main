import { withTimeout, TimeoutError } from '@/lib/utils/withTimeout'

export type ServerActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; isTimeout?: boolean }

/**
 * Wraps a server action with timeout for UI responsiveness.
 *
 * NOTE: This provides UI-level timeout only. It cannot abort
 * an already-running Postgres query. For DB-level timeout,
 * use statement_timeout in critical RPCs.
 *
 * @example
 * ```ts
 * export async function resolveTenantAction() {
 *   return withServerActionTimeout(async () => {
 *     const supabase = await createServerRlsClient()
 *     // ... existing logic
 *     return { tenant, memberships }
 *   }, 8000, 'resolveTenantAction')
 * }
 *
 * // In component:
 * const result = await resolveTenantAction()
 * if (!result.success) {
 *   toast.error(result.error)
 *   if (result.isTimeout) {
 *     // Show retry UI
 *   }
 *   return
 * }
 * const { tenant, memberships } = result.data
 * ```
 */
export async function withServerActionTimeout<T>(
  action: () => Promise<T>,
  timeoutMs = 10000,
  label = 'server action'
): Promise<ServerActionResult<T>> {
  const start = Date.now()

  try {
    const data = await withTimeout(action(), timeoutMs, label)

    // Log for P95/P99 monitoring in development
    if (process.env.NODE_ENV === 'development') {
      const elapsed = Date.now() - start
      if (elapsed > timeoutMs * 0.8) {
        console.warn(`[${label}] Slow execution: ${elapsed}ms (limit: ${timeoutMs}ms)`)
      }
    }

    return { success: true, data }
  } catch (err) {
    const elapsed = Date.now() - start

    if (err instanceof TimeoutError) {
      console.error(`[${label}] Timeout after ${elapsed}ms (limit: ${timeoutMs}ms)`)
      return {
        success: false,
        error: 'Åtgärden tog för lång tid. Försök igen.',
        isTimeout: true,
      }
    }

    const message = err instanceof Error ? err.message : 'Okänt fel'
    console.error(`[${label}] Error after ${elapsed}ms:`, err)
    return { success: false, error: message }
  }
}
