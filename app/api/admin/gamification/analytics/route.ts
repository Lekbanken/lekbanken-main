import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createServerRlsClient, createServiceRoleClient } from '@/lib/supabase/server'
import { assertTenantAdminOrSystem } from '@/lib/utils/tenantAuth'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  tenantId: z.string().uuid(),
  windowDays: z.coerce.number().int().min(1).max(365).optional(),
})

/**
 * GET /api/admin/gamification/analytics
 * Minimal admin dashboard metrics (tenant scoped).
 *
 * - Requires tenant_admin or system_admin
 * - Reads via service role
 * - Computes top lists from a capped sample (for safety)
 */
export async function GET(request: Request) {
  const supabase = await createServerRlsClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const parsed = querySchema.safeParse({
    tenantId: url.searchParams.get('tenantId'),
    windowDays: url.searchParams.get('windowDays') ?? undefined,
  })

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid query', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tenantId, windowDays } = parsed.data

  const allowed = await assertTenantAdminOrSystem(tenantId, user)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createServiceRoleClient()

    const { data, error } = await admin.rpc('admin_get_gamification_analytics_v5', {
      p_tenant_id: tenantId,
      p_window_days: windowDays ?? 30,
    })

    if (error) {
      const msg = typeof error?.message === 'string' ? error.message : 'Unknown error'
      return NextResponse.json({ error: 'Failed to load analytics', details: msg }, { status: 500 })
    }

    const rows = Array.isArray(data) ? data : []
    const row = rows[0]
    if (!row) {
      return NextResponse.json({ error: 'No analytics result' }, { status: 500 })
    }

    const economy = (row.economy ?? {}) as Record<string, unknown>
    const events = (row.events ?? {}) as Record<string, unknown>
    const awards = (row.awards ?? {}) as Record<string, unknown>
    const shop = (row.shop ?? {}) as Record<string, unknown>
    const campaigns = (row.campaigns ?? {}) as Record<string, unknown>
    const automations = (row.automations ?? {}) as Record<string, unknown>
    const anomalies = (row.anomalies ?? {}) as Record<string, unknown>

    return NextResponse.json(
      {
        generatedAt: new Date().toISOString(),
        tenantId: row.tenant_id ?? tenantId,
        windowDays: row.window_days ?? windowDays ?? 30,
        since: row.since ?? null,
        economy: {
          earned: typeof economy.earned === 'number' ? economy.earned : Number(economy.earned ?? 0),
          spent: typeof economy.spent === 'number' ? economy.spent : Number(economy.spent ?? 0),
          net: typeof economy.net === 'number' ? economy.net : Number(economy.net ?? 0),
          transactionsCount:
            typeof economy.transactionsCount === 'number'
              ? economy.transactionsCount
              : Number(economy.transactionsCount ?? 0),
          usedRollup:
            typeof economy.usedRollup === 'boolean'
              ? economy.usedRollup
              : economy.usedRollup === 'true'
                ? true
                : false,
          isSampled: false,
          sampledRows: null,
        },
        events: {
          total: typeof events.total === 'number' ? events.total : Number(events.total ?? 0),
          isSampled: false,
          sampledRows: null,
          topTypes: Array.isArray(events.topTypes) ? events.topTypes : [],
        },
        awards: {
          awardsCount: typeof awards.awardsCount === 'number' ? awards.awardsCount : Number(awards.awardsCount ?? 0),
          totalAmount: typeof awards.totalAmount === 'number' ? awards.totalAmount : Number(awards.totalAmount ?? 0),
          isSampled: false,
          sampledRows: null,
        },
        shop: {
          purchasesCount:
            typeof shop.purchasesCount === 'number' ? shop.purchasesCount : Number(shop.purchasesCount ?? 0),
          totalSpent: typeof shop.totalSpent === 'number' ? shop.totalSpent : Number(shop.totalSpent ?? 0),
          isSampled: false,
          sampledRows: null,
          topItems: Array.isArray(shop.topItems) ? shop.topItems : [],
        },
        campaigns: {
          bonusTotalAmount:
            typeof campaigns.bonusTotalAmount === 'number'
              ? campaigns.bonusTotalAmount
              : Number(campaigns.bonusTotalAmount ?? 0),
          topCampaigns: Array.isArray(campaigns.topCampaigns) ? campaigns.topCampaigns : [],
        },
        automations: {
          rewardTotalAmount:
            typeof automations.rewardTotalAmount === 'number'
              ? automations.rewardTotalAmount
              : Number(automations.rewardTotalAmount ?? 0),
          topRules: Array.isArray(automations.topRules) ? automations.topRules : [],
        },
        anomalies: {
          items: Array.isArray(anomalies.items) ? anomalies.items : [],
        },
      },
      { status: 200 },
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: 'Server error', details: msg }, { status: 500 })
  }
}
