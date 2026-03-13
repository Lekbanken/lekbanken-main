import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
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
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId') || null

    await requireTenantRole(['owner', 'admin'], tenantId)

    const rules = await getAutomationRules(tenantId)
    return NextResponse.json({ rules, generatedAt: new Date().toISOString() })
  },
})

/**
 * PATCH /api/admin/gamification/rules
 * Toggle rule active state.
 * 
 * Body: { ruleId: string, isActive: boolean }
 */
export const PATCH = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const body = await req.json()
    const { ruleId, isActive, tenantId } = body

    if (!ruleId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'ruleId and isActive are required' },
        { status: 400 }
      )
    }

    await requireTenantRole(['owner', 'admin'], tenantId)

    const result = await toggleAutomationRule(ruleId, isActive)

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, ruleId, isActive })
  },
})
