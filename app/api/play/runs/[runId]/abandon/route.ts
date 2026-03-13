import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'

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

  // Virtual runs aren't persisted
  if (runId.startsWith('draft-') || runId.startsWith('virtual-')) {
    return NextResponse.json({
      run: { id: runId, status: 'abandoned' },
    })
  }

  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const { data: run, error } = await supabase
    .from('runs')
    .update({
      status: 'abandoned',
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId)
    .eq('user_id', userId)
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

  console.info('[runs/abandon]', { runId: run.id, user: userId })

  return NextResponse.json({ run })
  },
})
