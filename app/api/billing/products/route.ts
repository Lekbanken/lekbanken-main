import { NextResponse } from 'next/server'
import { createServerRlsClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerRlsClient()

  const { data, error } = await supabase
    .from('billing_products')
    .select('id,billing_product_key,name,type,price_per_seat,currency,seats_included,is_active,created_at,updated_at,billing_product_features(id,feature_key,label,description)')
    .eq('is_active', true)
    .order('price_per_seat', { ascending: true })

  if (error) {
    console.error('[billing/products] select error', error)
    return NextResponse.json({ error: 'Failed to load products' }, { status: 500 })
  }

  return NextResponse.json({ products: data ?? [] })
}
