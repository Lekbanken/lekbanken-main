import { NextResponse } from 'next/server'
import { createServerRlsClient, getRequestTenantId } from '@/lib/supabase/server'
import { apiHandler } from '@/lib/api/route-handler'
import { assertTenantMembership } from '@/lib/planner/require-plan-access'

function normalizeId(value: string | string[] | undefined) {
  const id = Array.isArray(value) ? value?.[0] : value
  return id?.trim() || null
}

export const POST = apiHandler({
  auth: 'user',
  handler: async ({ auth, req, params }) => {
  const planId = normalizeId(params?.planId)
  if (!planId) {
    return NextResponse.json({ error: 'Invalid plan id' }, { status: 400 })
  }
  const userId = auth!.user!.id
  const supabase = await createServerRlsClient()

  const body = (await req.json().catch(() => ({}))) as {
    content?: string
    tenant_id?: string | null
  }
  const headerTenant = await getRequestTenantId()
  const tenantId = body.tenant_id ?? headerTenant

  if (!tenantId) {
    return NextResponse.json({ errors: ['tenant_id is required for tenant notes'] }, { status: 400 })
  }

  // Validate tenant membership — never trust client tenant input
  const tenantCheck = await assertTenantMembership(supabase, auth!.user!, tenantId)
  if (!tenantCheck.allowed) return tenantCheck.response

  if (!body.content || body.content.trim().length === 0) {
    return NextResponse.json({ errors: ['content is required'] }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('plan_notes_tenant')
    .upsert(
      {
        content: body.content.trim(),
        plan_id: planId,
        tenant_id: tenantId,
        created_by: userId,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'plan_id,tenant_id' }
    )
    .select()
    .single()

  if (error) {
    console.error('[api/plans/:id/notes/tenant] upsert error', error)
    return NextResponse.json({ error: 'Failed to save tenant note' }, { status: 500 })
  }

  return NextResponse.json({ note: data })
  },
})
