import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

/**
 * POST /api/play/runs/[runId]/abandon
 *
 * Marks an active run as 'abandoned'. Only the run owner can abandon.
 * Used by the "Avbryt körning" button in PlayPlanPage.
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

  // Virtual runs aren't persisted
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    return NextResponse.json({
      run: { id: runId, status: 'abandoned' },
    })
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

  const { data: run, error } = await supabase
    .from('runs')
    .update({
      status: 'abandoned',
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('user_id', user.id)
    .in('status', ['not_started', 'in_progress'])
    .select('id, status, completed_at')
    .single()

  if (error) {
    console.warn('[runs/abandon] update error:', error.message)
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Run not found or already finished' } },
      { status: 404 }
    )
  }

  console.info('[runs/abandon]', { runId: run.id, user: user.id })

  return NextResponse.json({ run })
}
