import { NextRequest, NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { supabase, user: null }
  return { supabase, user }
}

async function userTenantRole(supabase: Awaited<ReturnType<typeof createServerRlsClient>>, tenantId: string) {
  const { data, error } = await supabase
    .from('tenant_memberships')
    .select('role')
    .eq('tenant_id', tenantId)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id || '')
    .maybeSingle()
  if (error) {
    console.warn('[billing/seat] role lookup error', error)
    return null
  }
  return data?.role ?? null
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ tenantId: string; seatId: string }> }) {
  const { tenantId, seatId } = await params
  const { supabase, user } = await requireUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = await userTenantRole(supabase, tenantId)
  if (!role || (role !== 'owner' && role !== 'admin')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = (await request.json().catch(() => ({}))) as {
    status?: 'pending' | 'active' | 'released' | 'revoked'
  }

  if (!body.status) return NextResponse.json({ error: 'status is required' }, { status: 400 })

  const { data, error } = await supabase
    .from('tenant_seat_assignments')
    .update({ status: body.status, released_at: body.status === 'released' ? new Date().toISOString() : null })
    .eq('id', seatId)
    .eq('tenant_id', tenantId)
    .select('*, user:users(id,email,full_name), subscription:tenant_subscriptions(*), billing_product:billing_products(*)')
    .maybeSingle()

  if (error) {
    console.error('[billing/seat] patch error', error)
    return NextResponse.json({ error: 'Failed to update seat' }, { status: 500 })
  }

  return NextResponse.json({ seat: data })
}
