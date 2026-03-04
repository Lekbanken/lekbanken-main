import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

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
export async function POST(
  _request: Request,
  context: { params: Promise<{ runId: string }> }
) {
  const params = await context.params
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

  const { error } = await supabase
    .from('runs')
    .update({ last_heartbeat_at: new Date().toISOString() })
    .eq('id', runId)
    .eq('user_id', user.id)
    .in('status', ['not_started', 'in_progress'])

  if (error) {
    console.warn('[runs/heartbeat] update error:', error.message)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to update heartbeat' } },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
