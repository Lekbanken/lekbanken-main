import { NextResponse } from 'next/server'
import { apiHandler } from '@/lib/api/route-handler'
import { requireTenantRole } from '@/lib/api/auth-guard'
import {
  getDashboardSnapshot,
  getEconomyMetrics,
  getTopEarners,
  getSuspiciousActivities,
  getAutomationRules,
  type DashboardFilters,
} from '@/lib/services/gamification-admin-dashboard.server'

/**
 * GET /api/admin/gamification/dashboard
 * Get full dashboard snapshot or specific metrics.
 * 
 * Query params:
 * - tenantId: string (optional, filter by tenant)
 * - section: 'full' | 'economy' | 'earners' | 'suspicious' | 'rules' (default: full)
 * - topN: number (for earners, default: 10)
 * - riskThreshold: number (for suspicious, default: 50)
 */
export const GET = apiHandler({
  auth: 'user',
  handler: async ({ req }) => {
    const url = new URL(req.url)
    const tenantId = url.searchParams.get('tenantId') || null

    await requireTenantRole(['owner', 'admin'], tenantId)

    const section = url.searchParams.get('section') || 'full'
    const topN = parseInt(url.searchParams.get('topN') || '10', 10)
    const riskThreshold = parseInt(url.searchParams.get('riskThreshold') || '50', 10)

    // Return requested section
    switch (section) {
      case 'economy':
        const economy = await getEconomyMetrics(tenantId)
        return NextResponse.json({ economy, generatedAt: new Date().toISOString() })

      case 'earners':
        const earners = await getTopEarners(tenantId, topN)
        return NextResponse.json({ topEarners: earners, generatedAt: new Date().toISOString() })

      case 'suspicious':
        const suspicious = await getSuspiciousActivities(tenantId, riskThreshold)
        return NextResponse.json({ suspiciousActivities: suspicious, generatedAt: new Date().toISOString() })

      case 'rules':
        const rules = await getAutomationRules(tenantId)
        return NextResponse.json({ rules, generatedAt: new Date().toISOString() })

      case 'full':
      default:
        const filters: DashboardFilters = { tenantId, topN }
        const snapshot = await getDashboardSnapshot(filters)
        return NextResponse.json(snapshot)
    }
  },
})
