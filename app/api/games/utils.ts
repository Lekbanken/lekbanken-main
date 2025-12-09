import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type RlsClient = SupabaseClient<Database>
type BillingProduct = { billing_product_key: string | null }

export async function getAllowedProductIds(
  supabase: RlsClient,
  tenantId: string | null
): Promise<{ allowedProductIds: string[]; resolvedViaBillingKey: string[] }> {
  if (!tenantId) return { allowedProductIds: [], resolvedViaBillingKey: [] }

  const { data: subs, error } = await supabase
    .from('tenant_subscriptions')
    .select(`billing_product:billing_products(id,billing_product_key)`) // billing_products table does not carry product_id
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trial', 'paused'])

  if (error) {
    console.error('[games/utils] entitlement lookup error', error)
    return { allowedProductIds: [], resolvedViaBillingKey: [] }
  }

  const productIds = new Set<string>()
  const billingKeys: string[] = []

  for (const sub of subs ?? []) {
    const bp = (sub as { billing_product: BillingProduct | null }).billing_product
    if (bp?.billing_product_key) billingKeys.push(bp.billing_product_key)
  }

  if (billingKeys.length) {
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, product_key')
      .in('product_key', billingKeys.filter(Boolean))

    if (prodErr) {
      console.warn('[games/utils] product_key resolution failed', prodErr)
    } else {
      for (const p of products ?? []) {
        if (p.id) productIds.add(p.id)
      }
    }
  }

  return { allowedProductIds: Array.from(productIds), resolvedViaBillingKey: billingKeys }
}
