import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
import {
  getAutomationRules,
  toggleAutomationRule,
} from '@/lib/services/gamification-admin-dashboard.server'

/**
 * GET /api/admin/gamification/rules
 * List all automation rules with trigger stats.
 * 
 * Query params:
 * - tenantId: string (optional)
 */
export async function GET(request: Request) {
  try {
    const supabase = await createServerRlsClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId') || null

    // Verify admin access
    const { data: isAdmin } = await supabase.rpc('is_system_admin')
    if (!isAdmin && tenantId) {
      // Check owner role first, then admin
      const { data: isOwner } = await supabase.rpc('has_tenant_role', {
        p_tenant_id: tenantId,
        required_role: 'owner',
      })
      const { data: isAdminRole } = await supabase.rpc('has_tenant_role', {
        p_tenant_id: tenantId,
        required_role: 'admin',
      })
      if (!isOwner && !isAdminRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const rules = await getAutomationRules(tenantId)
    return NextResponse.json({ rules, generatedAt: new Date().toISOString() })
  } catch (error) {
    console.error('[GET /api/admin/gamification/rules] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/gamification/rules
 * Toggle rule active state.
 * 
 * Body: { ruleId: string, isActive: boolean }
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createServerRlsClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ruleId, isActive, tenantId } = body

    if (!ruleId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ruleId and isActive are required' },
        { status: 400 }
      )
    }

    // Verify admin access
    const { data: isAdminCheck } = await supabase.rpc('is_system_admin')
    if (!isAdminCheck && tenantId) {
      // Check owner role first, then admin
      const { data: isOwner } = await supabase.rpc('has_tenant_role', {
        p_tenant_id: tenantId,
        required_role: 'owner',
      })
      const { data: isAdminRole } = await supabase.rpc('has_tenant_role', {
        p_tenant_id: tenantId,
        required_role: 'admin',
      })
      if (!isOwner && !isAdminRole) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else if (!isAdminCheck) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const result = await toggleAutomationRule(ruleId, isActive)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, ruleId, isActive })
  } catch (error) {
    console.error('[PATCH /api/admin/gamification/rules] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
