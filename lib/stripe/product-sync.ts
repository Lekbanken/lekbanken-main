/**
 * Product Stripe Sync Functions
 * 
 * Handles synchronization of products between Lekbanken and Stripe.
 * Lekbanken is the Source of Truth - all changes originate here.
 * 
 * Key functions:
 * - pushProductToStripe: Push single product to Stripe
 * - pullProductFromStripe: Fetch current Stripe state (read-only)
 * - detectDrift: Compare Lekbanken vs Stripe state
 * - bootstrapProductsToStripe: Bulk sync all products
 * 
 * @see docs/reports/PRODUCT_STRIPE_SYNC_PLAN.md
 */

import { stripe } from './config'
import type Stripe from 'stripe'
import { createServiceRoleClient } from '@/lib/supabase/server'
import {
  type DbProduct,
  type DbProductPrice,
  type DriftResult,
  type DriftField,
  type DriftSeverity,
  type SyncProductResult,
  type BootstrapResult,
  type SyncOptions,
  type BootstrapOptions,
  type ProductWithPrices,
  STRIPE_SYNC_STATUS,
  PRODUCT_STATUS,
  DRIFT_SEVERITY,
  METADATA_VERSION,
  generateStripeProductId,
  generateIdempotencyKey,
  toStripeInterval,
  isRecurringPrice,
} from './product-sync-types'

// =============================================================================
// DATABASE HELPERS
// =============================================================================

/**
 * Fetch product with prices from database
 * Uses service role client to bypass RLS for admin operations
 */
async function getProductWithPrices(productId: string): Promise<ProductWithPrices | null> {
  const supabase = createServiceRoleClient()
  
  const { data: product, error: productError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single()
  
  if (productError || !product) {
    console.error('Failed to fetch product:', productError)
    return null
  }
  
  const { data: prices, error: pricesError } = await supabase
    .from('product_prices')
    .select('*')
    .eq('product_id', productId)
    .eq('active', true)
    .order('is_default', { ascending: false })
  
  if (pricesError) {
    console.error('Failed to fetch prices:', pricesError)
    // Return product without prices - we can still sync the product itself
  }
  
  // Type assertion for new fields that may not exist in Supabase types yet
  const productWithNewFields = product as unknown as {
    unit_label?: string | null;
    statement_descriptor?: string | null;
    image_url?: string | null;
    target_audience?: string | null;
    feature_tier?: string | null;
    min_seats?: number | null;
    max_seats?: number | null;
    [key: string]: unknown;
  }
  
  return {
    ...product,
    // Default values for new fields until migration runs
    unit_label: productWithNewFields.unit_label ?? 'seat',
    statement_descriptor: productWithNewFields.statement_descriptor ?? null,
    image_url: productWithNewFields.image_url ?? null,
    // Step 3 fields
    target_audience: productWithNewFields.target_audience ?? 'all',
    feature_tier: productWithNewFields.feature_tier ?? 'standard',
    min_seats: productWithNewFields.min_seats ?? 1,
    max_seats: productWithNewFields.max_seats ?? 100,
    prices: (prices || []).map(p => {
      const priceWithNewFields = p as unknown as { 
        lookup_key?: string | null;
        trial_period_days?: number | null;
      };
      return {
        ...p,
        lookup_key: priceWithNewFields.lookup_key ?? null,
        trial_period_days: priceWithNewFields.trial_period_days ?? 0,
      };
    }),
  } as unknown as ProductWithPrices
}

/**
 * Update product sync status in database
 */
async function updateSyncStatus(
  productId: string,
  status: typeof STRIPE_SYNC_STATUS[keyof typeof STRIPE_SYNC_STATUS],
  stripeProductId?: string,
  error?: string
): Promise<void> {
  const supabase = createServiceRoleClient()
  
  const updateData: Record<string, unknown> = {
    stripe_sync_status: status,
    stripe_last_synced_at: status === STRIPE_SYNC_STATUS.SYNCED ? new Date().toISOString() : undefined,
    stripe_sync_error: error || null,
  }
  
  if (stripeProductId) {
    updateData.stripe_product_id = stripeProductId
  }
  
  const { error: updateError } = await supabase
    .from('products')
    .update(updateData)
    .eq('id', productId)
  
  if (updateError) {
    console.error('Failed to update sync status:', updateError)
  }
}

/**
 * Update price with Stripe price ID and lookup_key
 */
async function updatePriceStripeId(
  priceId: string,
  stripePriceId: string,
  lookupKey?: string
): Promise<void> {
  const supabase = createServiceRoleClient()
  
  const updateData: Record<string, string> = { stripe_price_id: stripePriceId }
  if (lookupKey) {
    updateData.lookup_key = lookupKey
  }
  
  const { error } = await supabase
    .from('product_prices')
    .update(updateData)
    .eq('id', priceId)
  
  if (error) {
    console.error('Failed to update price stripe_id:', error)
  }
}

/**
 * Update product's default price ID
 */
async function updateDefaultPriceId(
  productId: string,
  stripePriceId: string
): Promise<void> {
  const supabase = createServiceRoleClient()
  
  const { error } = await supabase
    .from('products')
    .update({ stripe_default_price_id: stripePriceId })
    .eq('id', productId)
  
  if (error) {
    console.error('Failed to update default price:', error)
  }
}

// =============================================================================
// STRIPE METADATA BUILDERS
// =============================================================================

/**
 * Build metadata for Stripe Product
 * Returns Record<string, string> for Stripe compatibility
 */
function buildProductMetadata(product: DbProduct): Record<string, string> {
  const metadata: Record<string, string> = {
    lekbanken_id: product.id,
    product_key: product.product_key,
    product_type: product.product_type,
    billing_model: 'per_seat', // Default, could be enhanced later
    source: 'lekbanken',
    version: METADATA_VERSION,
  };
  
  // Step 3: Strategic metadata (only add if not default values)
  if (product.category) {
    metadata.category = product.category;
  }
  if (product.feature_tier && product.feature_tier !== 'standard') {
    metadata.feature_tier = product.feature_tier;
  }
  if (product.min_seats && product.min_seats !== 1) {
    metadata.min_seats = String(product.min_seats);
  }
  if (product.max_seats && product.max_seats !== 100) {
    metadata.max_seats = String(product.max_seats);
  }
  
  return metadata;
}

/**
 * Build metadata for Stripe Price
 * Returns Record<string, string> for Stripe compatibility
 */
function buildPriceMetadata(price: DbProductPrice): Record<string, string> {
  const metadata: Record<string, string> = {
    lekbanken_price_id: price.id,
    lekbanken_product_id: price.product_id,
    billing_model: price.billing_model,
    source: 'lekbanken',
  };
  
  // Step 3: Trial period (stored in metadata, applied at subscription creation)
  if (price.trial_period_days && price.trial_period_days > 0) {
    metadata.trial_period_days = String(price.trial_period_days);
  }
  
  return metadata;
}

// =============================================================================
// CORE SYNC FUNCTIONS
// =============================================================================

/**
 * Push a single product to Stripe (create or update).
 * 
 * Uses deterministic Stripe Product ID (lek_prod_<uuid>) for idempotency.
 * This means calling this function multiple times is safe.
 */
export async function pushProductToStripe(
  productId: string,
  options: SyncOptions = {}
): Promise<SyncProductResult> {
  const timestamp = new Date().toISOString()
  const { force = false, dryRun = false, idempotencyPrefix = '' } = options
  
  try {
    // 1. Fetch product from database
    const product = await getProductWithPrices(productId)
    
    if (!product) {
      return {
        success: false,
        productId,
        stripeProductId: null,
        operation: 'failed',
        error: 'Product not found',
        timestamp,
      }
    }
    
    // 2. Check if we should skip (already synced, not forced, AND no unsynced prices)
    const unsyncedPrices = product.prices.filter(p => !p.stripe_price_id)
    const hasUnsyncedPrices = unsyncedPrices.length > 0
    
    if (
      product.stripe_sync_status === STRIPE_SYNC_STATUS.SYNCED && 
      !force &&
      product.stripe_product_id &&
      !hasUnsyncedPrices
    ) {
      return {
        success: true,
        productId,
        stripeProductId: product.stripe_product_id,
        operation: 'skipped',
        timestamp,
      }
    }
    
    // If product is synced but has unsynced prices, we still need to sync those
    
    // 3. Skip draft products unless forced
    if (product.status === PRODUCT_STATUS.DRAFT && !force) {
      return {
        success: true,
        productId,
        stripeProductId: null,
        operation: 'skipped',
        timestamp,
      }
    }
    
    // 4. Generate deterministic Stripe Product ID
    const stripeProductId = generateStripeProductId(product.id)
    
    // 5. Check if product exists in Stripe
    let existingProduct: Stripe.Product | null = null
    try {
      existingProduct = await stripe.products.retrieve(stripeProductId)
    } catch {
      // Product doesn't exist - will create new
    }
    
    // 6. Build product data
    const productData: Stripe.ProductCreateParams | Stripe.ProductUpdateParams = {
      name: product.name,
      description: product.customer_description || product.description || undefined,
      active: product.status === PRODUCT_STATUS.ACTIVE,
      // Critical Stripe fields (Step 1)
      unit_label: product.unit_label || 'seat',
      statement_descriptor: product.statement_descriptor || undefined,
      // Step 2: Product images
      images: product.image_url ? [product.image_url] : [],
      metadata: buildProductMetadata(product),
    }
    
    if (dryRun) {
      console.log('DRY RUN: Would sync product', { stripeProductId, productData })
      return {
        success: true,
        productId,
        stripeProductId,
        operation: existingProduct ? 'updated' : 'created',
        timestamp,
      }
    }
    
    // 7. Create or update product in Stripe
    let stripeProduct: Stripe.Product
    const idempotencyKey = generateIdempotencyKey(
      existingProduct ? 'update_product' : 'create_product',
      productId,
      Date.now()
    )
    
    if (existingProduct) {
      // Update existing product
      stripeProduct = await stripe.products.update(
        stripeProductId,
        productData as Stripe.ProductUpdateParams
      )
    } else {
      // Create new product with deterministic ID
      stripeProduct = await stripe.products.create(
        {
          id: stripeProductId,
          ...productData as Stripe.ProductCreateParams,
        },
        { idempotencyKey: `${idempotencyPrefix}${idempotencyKey}` }
      )
    }
    
    // 8. Sync prices (if any)
    let defaultStripePriceId: string | null = null
    
    for (const price of product.prices) {
      if (price.stripe_price_id) {
        // Price already exists in Stripe - skip (Stripe prices are immutable)
        if (price.is_default) {
          defaultStripePriceId = price.stripe_price_id
        }
        continue
      }
      
      // Create new price in Stripe
      // Generate deterministic lookup_key: product_key:currency:interval:interval_count
      const lookupKey = `${product.product_key}:${price.currency.toLowerCase()}:${price.interval}:${price.interval_count}`;
      
      const priceData: Stripe.PriceCreateParams = {
        product: stripeProductId,
        unit_amount: price.amount,
        currency: price.currency.toLowerCase(),
        tax_behavior: price.tax_behavior,
        nickname: price.nickname || undefined,
        lookup_key: lookupKey,
        metadata: buildPriceMetadata(price),
      }
      
      if (isRecurringPrice(price.interval)) {
        priceData.recurring = {
          interval: toStripeInterval(price.interval)!,
          interval_count: price.interval_count,
        }
      }
      
      const stripePrice = await stripe.prices.create(
        priceData,
        {
          idempotencyKey: generateIdempotencyKey('create_price', price.id, Date.now()),
        }
      )
      
      // Store Stripe price ID and lookup_key in our database
      await updatePriceStripeId(price.id, stripePrice.id, lookupKey)
      
      if (price.is_default) {
        defaultStripePriceId = stripePrice.id
      }
    }
    
    // 9. Set default price on product if we have one
    if (defaultStripePriceId && stripeProduct.default_price !== defaultStripePriceId) {
      await stripe.products.update(stripeProductId, {
        default_price: defaultStripePriceId,
      })
      await updateDefaultPriceId(productId, defaultStripePriceId)
    }
    
    // 10. Update sync status in database
    await updateSyncStatus(productId, STRIPE_SYNC_STATUS.SYNCED, stripeProductId)
    
    return {
      success: true,
      productId,
      stripeProductId,
      operation: existingProduct ? 'updated' : 'created',
      timestamp,
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Failed to sync product:', productId, error)
    
    // Update sync status to error
    await updateSyncStatus(productId, STRIPE_SYNC_STATUS.ERROR, undefined, errorMessage)
    
    return {
      success: false,
      productId,
      stripeProductId: null,
      operation: 'failed',
      error: errorMessage,
      timestamp,
    }
  }
}

/**
 * Pull product data from Stripe (read-only, for drift detection)
 */
export async function pullProductFromStripe(
  stripeProductId: string
): Promise<{
  product: Stripe.Product | null
  prices: Stripe.Price[]
  error?: string
}> {
  try {
    const product = await stripe.products.retrieve(stripeProductId)
    
    // Fetch all prices for this product
    const pricesResponse = await stripe.prices.list({
      product: stripeProductId,
      active: true,
      limit: 100,
    })
    
    return {
      product,
      prices: pricesResponse.data,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      product: null,
      prices: [],
      error: errorMessage,
    }
  }
}

/**
 * Detect drift between Lekbanken and Stripe product data.
 * 
 * Compares key fields and returns detailed drift information
 * with severity levels (CRITICAL, WARNING, INFO).
 */
export async function detectDrift(productId: string): Promise<DriftResult | null> {
  // Fetch product from our database
  const product = await getProductWithPrices(productId)
  
  if (!product || !product.stripe_product_id) {
    return null // Can't detect drift if not synced
  }
  
  // Fetch from Stripe
  const stripeData = await pullProductFromStripe(product.stripe_product_id)
  
  if (!stripeData.product) {
    // Product exists in DB but not in Stripe - critical drift!
    return {
      productId,
      stripeProductId: product.stripe_product_id,
      hasDrift: true,
      overallSeverity: DRIFT_SEVERITY.CRITICAL,
      fields: [{
        field: 'product',
        lekbankenValue: product.name,
        stripeValue: null,
        severity: DRIFT_SEVERITY.CRITICAL,
        message: 'Produkt finns i Lekbanken men saknas i Stripe',
      }],
      detectedAt: new Date().toISOString(),
    }
  }
  
  const driftFields: DriftField[] = []
  
  // Check name (CRITICAL)
  if (product.name !== stripeData.product.name) {
    driftFields.push({
      field: 'name',
      lekbankenValue: product.name,
      stripeValue: stripeData.product.name,
      severity: DRIFT_SEVERITY.CRITICAL,
      message: `Namn skiljer sig: "${product.name}" vs "${stripeData.product.name}"`,
    })
  }
  
  // Check active status (CRITICAL)
  const expectedActive = product.status === PRODUCT_STATUS.ACTIVE
  if (expectedActive !== stripeData.product.active) {
    driftFields.push({
      field: 'active',
      lekbankenValue: expectedActive,
      stripeValue: stripeData.product.active,
      severity: DRIFT_SEVERITY.CRITICAL,
      message: `Aktiv-status skiljer sig: ${expectedActive} vs ${stripeData.product.active}`,
    })
  }
  
  // Check description (WARNING)
  const lekDescription = product.customer_description || product.description || ''
  const stripeDescription = stripeData.product.description || ''
  if (lekDescription !== stripeDescription) {
    driftFields.push({
      field: 'description',
      lekbankenValue: lekDescription,
      stripeValue: stripeDescription,
      severity: DRIFT_SEVERITY.WARNING,
      message: 'Beskrivning skiljer sig',
    })
  }
  
  // Check metadata (CRITICAL for lekbanken_id)
  const stripeMetadata = stripeData.product.metadata || {}
  if (stripeMetadata.lekbanken_id !== product.id) {
    driftFields.push({
      field: 'metadata.lekbanken_id',
      lekbankenValue: product.id,
      stripeValue: stripeMetadata.lekbanken_id,
      severity: DRIFT_SEVERITY.CRITICAL,
      message: 'Lekbanken ID i metadata stämmer inte',
    })
  }
  
  // Determine overall severity (highest severity wins)
  let overallSeverity: DriftSeverity | null = null
  for (const field of driftFields) {
    if (field.severity === DRIFT_SEVERITY.CRITICAL) {
      overallSeverity = DRIFT_SEVERITY.CRITICAL
      break // Critical is highest, no need to check further
    } else if (field.severity === DRIFT_SEVERITY.WARNING) {
      overallSeverity = DRIFT_SEVERITY.WARNING
      // Continue checking for potential CRITICAL
    } else if (field.severity === DRIFT_SEVERITY.INFO && overallSeverity === null) {
      overallSeverity = DRIFT_SEVERITY.INFO
    }
  }
  
  const hasDrift = driftFields.length > 0
  
  // Update sync status if drift detected
  if (hasDrift) {
    await updateSyncStatus(productId, STRIPE_SYNC_STATUS.DRIFT)
  }
  
  return {
    productId,
    stripeProductId: product.stripe_product_id,
    hasDrift,
    overallSeverity,
    fields: driftFields,
    detectedAt: new Date().toISOString(),
  }
}

/**
 * Bootstrap all products to Stripe.
 * 
 * Syncs all active products that haven't been synced yet.
 * Includes rate limiting and batch processing.
 */
export async function bootstrapProductsToStripe(
  options: BootstrapOptions = {}
): Promise<BootstrapResult> {
  const startTime = Date.now()
  const {
    statuses = [PRODUCT_STATUS.ACTIVE],
    batchSize = 10,
    batchDelay = 500, // 500ms between batches to avoid rate limits
    dryRun = false,
    force = false,
  } = options
  
  const result: BootstrapResult = {
    success: true,
    totalProducts: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    duration: 0,
    timestamp: new Date().toISOString(),
  }
  
  try {
    // Fetch all products matching criteria
    const supabase = createServiceRoleClient()
    
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, status, stripe_sync_status')
      .in('status', statuses)
      .order('created_at', { ascending: true })
    
    if (error || !products) {
      throw new Error(`Failed to fetch products: ${error?.message}`)
    }
    
    result.totalProducts = products.length
    
    // Process in batches
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize)
      
      // Process batch sequentially to respect rate limits
      for (const product of batch) {
        const syncResult = await pushProductToStripe(product.id, { force, dryRun })
        
        switch (syncResult.operation) {
          case 'created':
            result.created++
            break
          case 'updated':
            result.updated++
            break
          case 'skipped':
            result.skipped++
            break
          case 'failed':
            result.failed++
            result.errors.push({
              productId: product.id,
              error: syncResult.error || 'Unknown error',
            })
            break
        }
      }
      
      // Delay between batches (unless last batch)
      if (i + batchSize < products.length && !dryRun) {
        await new Promise(resolve => setTimeout(resolve, batchDelay))
      }
    }
    
    result.success = result.failed === 0
    
  } catch (error) {
    result.success = false
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    result.errors.push({
      productId: 'bootstrap',
      error: errorMessage,
    })
  }
  
  result.duration = Date.now() - startTime
  
  return result
}

/**
 * Force re-sync a product, overwriting Stripe data with Lekbanken data.
 * 
 * Use this to resolve drift when Lekbanken is confirmed as the correct source.
 */
export async function forceSyncProduct(productId: string): Promise<SyncProductResult> {
  return pushProductToStripe(productId, { force: true })
}

/**
 * Archive a product in both Lekbanken and Stripe.
 * 
 * Sets product as inactive in Stripe and archived in Lekbanken.
 */
export async function archiveProduct(productId: string): Promise<SyncProductResult> {
  const timestamp = new Date().toISOString()
  
  try {
    const supabase = createServiceRoleClient()
    
    // Update status in Lekbanken first
    const { data: product, error } = await supabase
      .from('products')
      .update({ status: PRODUCT_STATUS.ARCHIVED })
      .eq('id', productId)
      .select('stripe_product_id')
      .single()
    
    if (error || !product) {
      throw new Error(`Failed to archive in database: ${error?.message}`)
    }
    
    // Archive in Stripe if synced
    if (product.stripe_product_id) {
      await stripe.products.update(product.stripe_product_id, {
        active: false,
      })
    }
    
    await updateSyncStatus(productId, STRIPE_SYNC_STATUS.SYNCED)
    
    return {
      success: true,
      productId,
      stripeProductId: product.stripe_product_id,
      operation: 'updated',
      timestamp,
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return {
      success: false,
      productId,
      stripeProductId: null,
      operation: 'failed',
      error: errorMessage,
      timestamp,
    }
  }
}

/**
 * Get sync status summary for all products.
 * Useful for admin dashboard overview.
 */
export async function getSyncStatusSummary(): Promise<{
  total: number
  synced: number
  unsynced: number
  drift: number
  error: number
  locked: number
}> {
  const supabase = createServiceRoleClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('stripe_sync_status')
  
  if (error || !data) {
    return { total: 0, synced: 0, unsynced: 0, drift: 0, error: 0, locked: 0 }
  }
  
  const summary = {
    total: data.length,
    synced: 0,
    unsynced: 0,
    drift: 0,
    error: 0,
    locked: 0,
  }
  
  for (const row of data) {
    switch (row.stripe_sync_status) {
      case STRIPE_SYNC_STATUS.SYNCED:
        summary.synced++
        break
      case STRIPE_SYNC_STATUS.UNSYNCED:
        summary.unsynced++
        break
      case STRIPE_SYNC_STATUS.DRIFT:
        summary.drift++
        break
      case STRIPE_SYNC_STATUS.ERROR:
        summary.error++
        break
      case STRIPE_SYNC_STATUS.LOCKED:
        summary.locked++
        break
    }
  }
  
  return summary
}
