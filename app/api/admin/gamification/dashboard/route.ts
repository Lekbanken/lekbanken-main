import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'
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
export async function GET(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerRlsClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if system admin (for now, simple check)
    const { data: isAdmin } = await supabase.rpc('is_system_admin')
    if (!isAdmin) {
      // Check tenant admin if tenantId provided
      const url = new URL(request.url)
      const tenantId = url.searchParams.get('tenantId')
      
      if (tenantId) {
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
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    // Parse query params
    const url = new URL(request.url)
    const tenantId = url.searchParams.get('tenantId') || null
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
  } catch (error) {
    console.error('[GET /api/admin/gamification/dashboard] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
