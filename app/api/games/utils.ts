import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type RlsClient = SupabaseClient<Database>
type BillingProduct = { billing_product_key: string | null }

export async function getAllowedProductIds(
  supabase: RlsClient,
  tenantId: string | null
): Promise<{ allowedProductIds: string[]; resolvedViaBillingKey: string[] }> {
  if (!tenantId) return { allowedProductIds: [], resolvedViaBillingKey: [] }

  // 1) Canonical: entitlements
  const productIds = new Set<string>()
  const nowIso = new Date().toISOString()

  const { data: entitlements, error: entError } = await supabase
    .from('tenant_product_entitlements')
    .select('product_id, status, valid_from, valid_to')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (entError) {
    console.error('[games/utils] entitlements lookup error', entError)
  } else {
    for (const e of entitlements ?? []) {
      if (!e.product_id) continue
      const startsOk = !e.valid_from || e.valid_from <= nowIso
      const endsOk = !e.valid_to || e.valid_to > nowIso
      if (startsOk && endsOk) productIds.add(e.product_id)
    }
  }

  // 2) Legacy fallback: billing subscription → billing_product_key → products.product_key
  // Keep this until the billing domain is fully migrated away.

  const { data: subs, error } = await supabase
    .from('tenant_subscriptions')
    .select(`billing_product:billing_products(id,billing_product_key)`) // billing_products table does not carry product_id
    .eq('tenant_id', tenantId)
    .in('status', ['active', 'trial', 'paused'])

  if (error) {
    console.error('[games/utils] billing fallback lookup error', error)
    return { allowedProductIds: Array.from(productIds), resolvedViaBillingKey: [] }
  }
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
