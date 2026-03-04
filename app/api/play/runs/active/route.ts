import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

/**
 * GET /api/play/runs/active
 *
 * Returns the current user's active runs (status = 'in_progress').
 * Used by PlanListItem and ScheduleCard to show "Fortsätt" instead of "Starta".
 *
 * Since `runs` has no `plan_id` column, we left-join through `plan_versions`
 * to get it (with metadata fallback). Runs with missing planId are filtered out.
 *
 * Stale-run filter (MS4.8): runs whose last_heartbeat_at is older than
 * STALE_THRESHOLD_HOURS are excluded. Runs with NULL heartbeat (legacy) are
 * kept for backward compatibility.
 *
 * Response: { runs: ActiveRun[], count: number }
 */

/** Runs without a heartbeat in this many hours are considered stale. */
const STALE_THRESHOLD_HOURS = 24

type ActiveRun = {
  id: string
  planId: string
  planVersionId: string
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
  currentStepIndex: number
  totalSteps: number
  startedAt: string
}

export async function GET() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } },
      { status: 401 }
    )
  }

  // Stale threshold: runs older than this are filtered out
  const staleThreshold = new Date(
    Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000
  ).toISOString()

  // Left join through plan_versions — use optional relation so runs with
  // deleted/broken versions are not silently dropped.
  //
  // Stale filter: last_heartbeat_at >= threshold OR last_heartbeat_at IS NULL (legacy runs).
  // Supabase doesn't support OR across columns in a single .or(), so we use
  // a raw or-filter string.
  const { data: runs, error } = await supabase
    .from('runs')
    .select(`
      id,
      plan_version_id,
      status,
      current_step,
      started_at,
      metadata,
      last_heartbeat_at,
      plan_versions(plan_id)
    `)
    .eq('user_id', user.id)
    .eq('status', 'in_progress')
    .or(`last_heartbeat_at.gte.${staleThreshold},last_heartbeat_at.is.null`)
    .order('started_at', { ascending: false })

  if (error) {
    // If runs table doesn't exist yet, return empty array
    console.warn('[runs/active] query error:', error.message)
    return NextResponse.json({ runs: [], count: 0 })
  }

  const activeRuns: ActiveRun[] = (runs ?? [])
    .map((r) => {
      // plan_versions is a left join — may be null if version was deleted
      const pv = r.plan_versions as { plan_id?: string } | null
      const meta = r.metadata as Record<string, unknown> | null

      const planId = pv?.plan_id ?? (meta?.planId as string | undefined)

      if (!planId) {
        console.warn('[runs/active] run missing planId, skipping', r.id)
        return null
      }

      return {
        id: r.id,
        planId,
        planVersionId: r.plan_version_id,
        status: r.status,
        currentStepIndex: r.current_step ?? 0,
        totalSteps: (meta?.stepsGenerated as number) ?? (meta?.steps as number) ?? 0,
        startedAt: r.started_at ?? new Date().toISOString(),
      }
    })
    .filter((r): r is ActiveRun => r !== null)

  console.info('[runs/active]', { user: user.id, count: activeRuns.length })

  return NextResponse.json({ runs: activeRuns, count: activeRuns.length })
}
