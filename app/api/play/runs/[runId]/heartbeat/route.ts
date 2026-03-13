import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

/**
 * POST /api/play/runs/[runId]/heartbeat
 *
 * Lightweight endpoint to update `last_heartbeat_at` for a run.
 * Called periodically by the client to signal the run is still active.
 * Only the run owner can heartbeat their own run (RLS-enforced).
 */
export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, params }) => {
  const runId = normalizeId(params?.runId)
  if (!runId) {
    return NextResponse.json(
      { error: { code: 'INVALID_ID', message: 'Invalid run id' } },
      { status: 400 }
    )
  }

  // Virtual runs don't persist — noop
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    return NextResponse.json({ ok: true })
  }

  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const { error } = await supabase
    .from('runs')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('user_id', userId)
    .in('status', ['not_started', 'in_progress'])

  if (error) {
    console.warn('[runs/heartbeat] update error:', error.message)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update heartbeat' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
  },
})
