/**
 * GET /api/play/runs/dashboard
 *
 * Returns the current user's runs enriched with run_session + participant_session data
 * for the Active Sessions Dashboard (MS7).
 *
 * Query params:
 *   scope: 'active' (default) | 'all' — active filters out completed/abandoned & stale
 *
 * Response: { rows: DashboardRunRow[], count: number }
 */

import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import type { DashboardRunRow, DashboardSessionInfo, RunStatus, RunSessionStatus } from '@/features/play/types'

/** Runs without a heartbeat in this many hours are considered stale. */
const STALE_THRESHOLD_HOURS = 24

export const GET = apiHandler({
  auth: 'user',
  handler: async ({ auth, req }) => {
    const userId = auth!.user!.id
    const supabase = await createServerRlsClient()

    const scope = new URL(req.url).searchParams.get('scope') ?? 'active'
  const staleThreshold = new Date(
    Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000
  ).toISOString()

  // ── 1) Fetch runs ──────────────────────────────────────────────────────────
  let query = supabase
    .from('runs')
    .select(`
      id,
      plan_id,
      plan_version_id,
      status,
      current_step_index,
      started_at,
      last_heartbeat_at,
      metadata,
      plan_versions(name, plans(name))
    `)
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50)

  if (scope === 'active') {
    query = query
      .eq('status', 'in_progress')
      .or(`last_heartbeat_at.gte.${staleThreshold},last_heartbeat_at.is.null`)
  }

  const { data: runs, error: runsError } = await query

  if (runsError) {
    console.warn('[runs/dashboard] query error:', runsError.message)
    return NextResponse.json({ rows: [], count: 0 })
  }

  if (!runs || runs.length === 0) {
    return NextResponse.json({ rows: [], count: 0 })
  }

  // ── 2) Fetch run_sessions for these runs ───────────────────────────────────
  const runIds = runs.map((r) => r.id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TEMP: remove after supabase gen
  const { data: runSessions } = await (supabase as any)
    .from('run_sessions')
    .select('id, run_id, step_index, session_id, status')
    .in('run_id', runIds)

  // ── 3) Fetch participant_sessions for linked sessions ──────────────────────
  const sessionIds = (runSessions ?? [])
    .map((rs: { session_id: string | null }) => rs.session_id)
    .filter((id: string | null): id is string => id != null)

  let participantSessions: Record<
    string,
    {
      id: string
      session_code: string
      display_name: string
      status: string
      participant_count: number
    }
  > = {}

  if (sessionIds.length > 0) {
    const { data: ps } = await supabase
      .from('participant_sessions')
      .select('id, session_code, display_name, status, participant_count')
      .in('id', sessionIds)

    if (ps) {
      participantSessions = Object.fromEntries(ps.map((p) => [p.id, p]))
    }
  }

  // ── 4) Build rows ─────────────────────────────────────────────────────────
  const rows: DashboardRunRow[] = runs
    .map((r) => {
      const pv = r.plan_versions as {
        name?: string
        plans?: { name?: string } | null
      } | null
      const meta = r.metadata as Record<string, unknown> | null

      const planId = r.plan_id ?? (meta?.planId as string | undefined)
      if (!planId) return null

      // Robust plan name: plan name (SSoT) → version name → metadata fallback → default
      const planName =
        pv?.plans?.name ??
        pv?.name ??
        (meta?.planName as string | undefined) ??
        (meta?.name as string | undefined) ??
        'Okänd plan'
      const totalSteps =
        (meta?.stepsGenerated as number) ?? (meta?.steps as number) ?? 0

      const isStale =
        r.last_heartbeat_at != null &&
        new Date(r.last_heartbeat_at).getTime() <
          Date.now() - STALE_THRESHOLD_HOURS * 60 * 60 * 1000

      // Attach run_sessions
      const sessions: DashboardSessionInfo[] = (runSessions ?? [])
        .filter((rs: { run_id: string }) => rs.run_id === r.id)
        .map(
          (rs: {
            id: string
            run_id: string
            step_index: number
            session_id: string | null
            status: string
          }) => {
            const ps = rs.session_id
              ? participantSessions[rs.session_id]
              : null
            return {
              runSessionId: rs.id,
              stepIndex: rs.step_index,
              runSessionStatus: rs.status as RunSessionStatus,
              participantSession: ps
                ? {
                    id: ps.id,
                    sessionCode: ps.session_code,
                    displayName: ps.display_name,
                    status: ps.status,
                    participantCount: ps.participant_count,
                  }
                : null,
            }
          }
        )

      return {
        id: r.id,
        planId,
        planName,
        runStatus: r.status as RunStatus,
        currentStepIndex: r.current_step_index ?? 0,
        totalSteps,
        startedAt: r.started_at ?? new Date().toISOString(),
        lastHeartbeatAt: r.last_heartbeat_at,
        isStale,
        sessions,
      }
    })
    .filter((r): r is DashboardRunRow => r !== null)

  return NextResponse.json({ rows, count: rows.length })
  },
})
