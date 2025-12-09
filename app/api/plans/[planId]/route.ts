import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import { validatePlanPayload } from '@/lib/validation/plans'
import { fetchPlanWithRelations } from '@/lib/services/planner.server'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }
  const { plan } = await fetchPlanWithRelations(planId)
  if (!plan) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ plan })
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ planId: string }> }
) {
  const params = await context.params
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }

  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    name?: string
    description?: string | null
    metadata?: Record<string, unknown> | null
  }

  // Cast to any to satisfy Json typing for metadata during validation
  const validation = validatePlanPayload(body as any, { mode: 'update' })
  if (!validation.ok) {
    return NextResponse.json({ errors: validation.errors }, { status: 400 })
  }

  const { error } = await supabase
    .from('plans')
    .update({
      name: body.name,
      description: body.description,
      metadata: (body.metadata ?? undefined) as any,
      updated_at: new Date().toISOString(),
      updated_by: user.id,
    })
    .eq('id', planId)

  if (error) {
    console.error('[api/plans/:id] update error', error)
    return NextResponse.json({ error: 'Failed to update plan' }, { status: 500 })
  }

  const { plan } = await fetchPlanWithRelations(planId)
  return NextResponse.json({ plan })
}
