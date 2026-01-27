import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe/config'
import { supabaseAdmin } from '@/lib/supabase/server'
import { requireSystemAdmin, AuthError } from '@/lib/api/auth-guard'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface RevenueMetrics {
  mrr: number
  arr: number
  totalRevenue: number
  activeSubscriptions: number
  churnedSubscriptions: number
  newSubscriptions: number
  upgrades: number
  downgrades: number
  netRevenue: number
  avgRevenuePerUser: number
  revenueByProduct: Array<{
    productId: string
    productName: string
    revenue: number
    subscriptions: number
  }>
  revenueByMonth: Array<{
    month: string
    revenue: number
    newMrr: number
    churned: number
  }>
}

export async function GET(request: Request) {
  try {
    await requireSystemAdmin()
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ error: e.message }, { status: e.status })
    }
    throw e
  }

  const url = new URL(request.url)
  const period = url.searchParams.get('period') || '30d' // 7d, 30d, 90d, 12m

  try {
    // Calculate date range based on period
    const now = new Date()
    let startDate: Date
    switch (period) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      case '12m':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
        break
      default: // 30d
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    }

    // Fetch active subscriptions from Stripe
    const subscriptions = await stripe.subscriptions.list({
      status: 'all',
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      limit: 100,
      expand: ['data.items.data.price.product'],
    })

    // Also get all active subscriptions for MRR
    const activeSubscriptions = await stripe.subscriptions.list({
      status: 'active',
      limit: 100,
    })

    // Calculate MRR from active subscriptions
    let mrr = 0
    for (const sub of activeSubscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price
        const quantity = item.quantity || 1
        const amount = price.unit_amount || 0

        if (price.recurring?.interval === 'month') {
          mrr += amount * quantity
        } else if (price.recurring?.interval === 'year') {
          mrr += (amount * quantity) / 12
        }
      }
    }

    // Fetch invoices for revenue calculation
    const invoices = await stripe.invoices.list({
      created: { gte: Math.floor(startDate.getTime() / 1000) },
      status: 'paid',
      limit: 100,
    })

    const totalRevenue = invoices.data.reduce((sum, inv) => sum + (inv.amount_paid || 0), 0)

    // Calculate metrics by product
    const productMap = new Map<string, { name: string; revenue: number; subscriptions: number }>()

    for (const inv of invoices.data) {
      if (!inv.lines?.data) continue
      for (const line of inv.lines.data) {
        const priceObj = line.price
        if (!priceObj) continue
        
        const productId = typeof priceObj.product === 'string' ? priceObj.product : priceObj.product?.id
        const productName = typeof priceObj.product === 'object' && 'name' in priceObj.product && priceObj.product.name 
          ? priceObj.product.name 
          : productId || 'Unknown'

        if (!productId) continue

        const existing = productMap.get(productId) || { name: String(productName) || 'Unknown', revenue: 0, subscriptions: 0 }
        existing.revenue += line.amount || 0
        existing.subscriptions += 1
        productMap.set(productId, existing)
      }
    }

    const revenueByProduct = Array.from(productMap.entries()).map(([productId, data]) => ({
      productId,
      productName: data.name,
      revenue: data.revenue,
      subscriptions: data.subscriptions,
    }))

    // Group revenue by month
    const monthMap = new Map<string, { revenue: number; newMrr: number; churned: number }>()
    for (const inv of invoices.data) {
      const date = new Date(inv.created * 1000)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const existing = monthMap.get(monthKey) || { revenue: 0, newMrr: 0, churned: 0 }
      existing.revenue += inv.amount_paid || 0
      monthMap.set(monthKey, existing)
    }

    // Count new and churned subscriptions
    let newSubscriptions = 0
    let churnedSubscriptions = 0
    for (const sub of subscriptions.data) {
      if (sub.status === 'active' || sub.status === 'trialing') {
        newSubscriptions++
      } else if (sub.status === 'canceled') {
        churnedSubscriptions++
      }
    }

    // Fetch upgrade/downgrade counts from Supabase (if tracked)
    const { data: upgrades } = await supabaseAdmin
      .from('purchase_intents')
      .select('id', { count: 'exact' })
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString())

    const revenueByMonth = Array.from(monthMap.entries())
      .map(([month, data]) => ({
        month,
        revenue: data.revenue,
        newMrr: data.newMrr,
        churned: data.churned,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))

    const activeCount = activeSubscriptions.data.length
    const avgRevenuePerUser = activeCount > 0 ? mrr / activeCount : 0

    const metrics: RevenueMetrics = {
      mrr: Math.round(mrr),
      arr: Math.round(mrr * 12),
      totalRevenue: Math.round(totalRevenue),
      activeSubscriptions: activeCount,
      churnedSubscriptions,
      newSubscriptions,
      upgrades: upgrades?.length || 0,
      downgrades: 0, // Would need tracking in webhook
      netRevenue: Math.round(totalRevenue),
      avgRevenuePerUser: Math.round(avgRevenuePerUser),
      revenueByProduct,
      revenueByMonth,
    }

    return NextResponse.json(metrics)
  } catch (error) {
    console.error('[billing/analytics] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
