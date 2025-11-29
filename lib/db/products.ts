/**
 * Products Queries
 *
 * Database queries for products and purposes (use categories).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'

type Product = Database['public']['Tables']['products']['Row']
type Purpose = Database['public']['Tables']['purposes']['Row']

/**
 * Get all products (with purposes)
 */
export async function getAllProducts(
  supabase: SupabaseClient<Database>
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select(`*,purposes:product_purposes(purpose:purposes(*))`)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get product by ID
 */
export async function getProductById(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`*,purposes:product_purposes(purpose:purposes(*))`)
    .eq('id', productId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null // No rows
    throw error
  }

  return data
}

/**
 * Get product by key (e.g., 'TRAINER', 'PEDAGOG', 'PARENT')
 */
export async function getProductByKey(
  supabase: SupabaseClient<Database>,
  productKey: string
): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products')
    .select(`*,purposes:product_purposes(purpose:purposes(*))`)
    .eq('product_key', productKey)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Create product
 */
export async function createProduct(
  supabase: SupabaseClient<Database>,
  product: {
    name: string
    category: string
    product_key?: string
    description?: string
  }
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update product
 */
export async function updateProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  updates: {
    name?: string
    category?: string
    description?: string
  }
): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', productId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Get all purposes
 */
export async function getAllPurposes(
  supabase: SupabaseClient<Database>
): Promise<Purpose[]> {
  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get main purposes (root level, no parent_id)
 */
export async function getMainPurposes(
  supabase: SupabaseClient<Database>
): Promise<Purpose[]> {
  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .is('parent_id', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Get purpose by ID
 */
export async function getPurposeById(
  supabase: SupabaseClient<Database>,
  purposeId: string
): Promise<Purpose | null> {
  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .eq('id', purposeId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data
}

/**
 * Get sub-purposes for a main purpose
 */
export async function getSubPurposes(
  supabase: SupabaseClient<Database>,
  parentPurposeId: string
): Promise<Purpose[]> {
  const { data, error } = await supabase
    .from('purposes')
    .select('*')
    .eq('parent_id', parentPurposeId)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data || []
}

/**
 * Create purpose
 */
export async function createPurpose(
  supabase: SupabaseClient<Database>,
  purpose: {
    name: string
    type: 'main' | 'sub'
    purpose_key?: string
    parent_id?: string | null
  }
): Promise<Purpose> {
  const { data, error } = await supabase
    .from('purposes')
    .insert([purpose])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Update purpose
 */
export async function updatePurpose(
  supabase: SupabaseClient<Database>,
  purposeId: string,
  updates: {
    name?: string
  }
): Promise<Purpose> {
  const { data, error } = await supabase
    .from('purposes')
    .update(updates)
    .eq('id', purposeId)
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Add purpose to product
 */
export async function addPurposeToProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  purposeId: string
) {
  const { data, error } = await supabase
    .from('product_purposes')
    .insert([
      {
        product_id: productId,
        purpose_id: purposeId,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return data
}

/**
 * Remove purpose from product
 */
export async function removePurposeFromProduct(
  supabase: SupabaseClient<Database>,
  productId: string,
  purposeId: string
) {
  const { error } = await supabase
    .from('product_purposes')
    .delete()
    .eq('product_id', productId)
    .eq('purpose_id', purposeId)

  if (error) throw error
}

/**
 * Get products for purpose
 */
export async function getProductsForPurpose(
  supabase: SupabaseClient<Database>,
  purposeId: string
): Promise<Product[]> {
  const { data, error } = await supabase
    .from('product_purposes')
    .select(`product:products(*)`)
    .eq('purpose_id', purposeId)

  if (error) throw error

  return (
    data
      ?.map((item) => {
        const product = item.product as Product | null
        return product
      })
      .filter((p): p is Product => p !== null) || []
  )
}

/**
 * Get purposes for product
 */
export async function getPurposesForProduct(
  supabase: SupabaseClient<Database>,
  productId: string
): Promise<Purpose[]> {
  const { data, error } = await supabase
    .from('product_purposes')
    .select(`purpose:purposes(*)`)
    .eq('product_id', productId)

  if (error) throw error

  return (
    data
      ?.map((item) => {
        const purpose = item.purpose as Purpose | null
        return purpose
      })
      .filter((p): p is Purpose => p !== null) || []
  )
}
