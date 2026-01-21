import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/supabase'

type RlsClient = SupabaseClient<Database>
type BillingProduct = { billing_product_key: string | null }

export async function getAllowedProductIds(
  supabase: RlsClient,
  tenantId: string | null,
  userId?: string | null
): Promise<{ allowedProductIds: string[]; resolvedViaBillingKey: string[] }> {
  if (!tenantId) return { allowedProductIds: [], resolvedViaBillingKey: [] }

  // 1) Canonical: entitlements
  const productIds = new Set<string>()
  const nowIso = new Date().toISOString()

  const { data: entitlements, error: entError } = await supabase
    .from('tenant_product_entitlements')
    .select('id, product_id, status, valid_from, valid_to')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')

  if (entError) {
    console.error('[games/utils] entitlements lookup error', entError)
  } else {
    const validEntitlements: Array<{ id: string; product_id: string }> = []

    for (const e of entitlements ?? []) {
      const entitlementId = (e as { id?: string | null }).id
      const productId = (e as { product_id?: string | null }).product_id
      const validFrom = (e as { valid_from?: string | null }).valid_from
      const validTo = (e as { valid_to?: string | null }).valid_to

      if (!entitlementId || !productId) continue
      const startsOk = !validFrom || validFrom <= nowIso
      const endsOk = !validTo || validTo > nowIso
      if (startsOk && endsOk) validEntitlements.push({ id: entitlementId, product_id: productId })
    }

    if (!userId) {
      // If tenant-scoped access is requested but no user is present, do not grant
      // entitlement-based access. (Public routes should omit tenantId.)
    } else if (validEntitlements.length > 0) {
      // Seat enforcement: user must hold an active seat assignment for the entitlement.
      const { data: seats, error: seatError } = await supabase
        .from('tenant_entitlement_seat_assignments')
        .select('entitlement_id, status')
        .eq('tenant_id', tenantId)
        .eq('user_id', userId)
        .eq('status', 'active')

      if (seatError) {
        console.error('[games/utils] seat assignment lookup error', seatError)
      } else {
        const entitled = new Set<string>()
        for (const s of seats ?? []) {
          const id = (s as { entitlement_id?: string | null }).entitlement_id
          if (id) entitled.add(id)
        }
        for (const e of validEntitlements) {
          if (entitled.has(e.id)) productIds.add(e.product_id)
        }
      }
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
