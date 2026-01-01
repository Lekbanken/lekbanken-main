import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

// Type for version table row since TypeScript types aren't generated yet
type PlanVersionRow = {
  id: string
  plan_id: string
  version_number: number
  name: string
  description: string | null
  total_time_minutes: number
  published_at: string
  published_by: string
}

/**
 * GET /api/plans/[planId]/versions
 * 
 * Returns all published versions of a plan, ordered by version number descending.
 */
export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: { code: 'INVALID_ID', message: 'Invalid plan id' } }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } }, { status: 401 })
  }

  // Verify plan exists and user has access (RLS handles this)
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .select('id, name, current_version_id')
    .eq('id', planId)
    .maybeSingle()

  if (planError || !plan) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Plan not found or access denied' } },
      { status: 404 }
    )
  }

  // Fetch all versions
  const { data: versions, error: versionsError } = await supabase
    .from('plan_versions')
    .select(`
      id,
      plan_id,
      version_number,
      name,
      description,
      total_time_minutes,
      published_at,
      published_by
    `)
    .eq('plan_id', planId)
    .order('version_number', { ascending: false })

  if (versionsError) {
    console.error('[api/plans/:id/versions] fetch error', versionsError)
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch versions' } },
      { status: 500 }
    )
  }

  // Cast to correct type
  const typedVersions = (versions || []) as unknown as PlanVersionRow[]

  return NextResponse.json({
    versions: typedVersions.map((v) => ({
      id: v.id,
      planId: v.plan_id,
      versionNumber: v.version_number,
      name: v.name,
      description: v.description,
      totalTimeMinutes: v.total_time_minutes,
      publishedAt: v.published_at,
      publishedBy: v.published_by,
      isCurrent: v.id === plan.current_version_id,
    })),
    currentVersionId: plan.current_version_id,
  })
}
