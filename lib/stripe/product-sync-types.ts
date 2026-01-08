/**
 * Product Stripe Sync Types
 * 
 * Type definitions for syncing products between Lekbanken and Stripe.
 * Lekbanken is the Source of Truth - all changes originate here.
 * 
 * @see docs/reports/PRODUCT_STRIPE_SYNC_PLAN.md
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const STRIPE_SYNC_STATUS = {
  UNSYNCED: 'unsynced',
  SYNCED: 'synced',
  DRIFT: 'drift',
  ERROR: 'error',
  LOCKED: 'locked', // Prevent further updates until manually resolved
} as const;

export type StripeSyncStatus = typeof STRIPE_SYNC_STATUS[keyof typeof STRIPE_SYNC_STATUS];

export const PRODUCT_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
} as const;

export type ProductStatus = typeof PRODUCT_STATUS[keyof typeof PRODUCT_STATUS];

export const PRODUCT_TYPE = {
  LICENSE: 'license',
  ADDON: 'addon',
  CONSUMABLE: 'consumable',
  ONE_TIME: 'one_time',
  BUNDLE: 'bundle',
} as const;

export type ProductType = typeof PRODUCT_TYPE[keyof typeof PRODUCT_TYPE];

export const PRICE_INTERVAL = {
  MONTH: 'month',
  YEAR: 'year',
  ONE_TIME: 'one_time',
} as const;

export type PriceInterval = typeof PRICE_INTERVAL[keyof typeof PRICE_INTERVAL];

export const TAX_BEHAVIOR = {
  INCLUSIVE: 'inclusive',
  EXCLUSIVE: 'exclusive',
  UNSPECIFIED: 'unspecified',
} as const;

export type TaxBehavior = typeof TAX_BEHAVIOR[keyof typeof TAX_BEHAVIOR];

export const BILLING_MODEL = {
  PER_SEAT: 'per_seat',
  PER_TENANT: 'per_tenant',
  PER_USER: 'per_user',
  FLAT: 'flat',
} as const;

export type BillingModel = typeof BILLING_MODEL[keyof typeof BILLING_MODEL];

export const UNIT_LABEL = {
  SEAT: 'seat',
  LICENSE: 'license',
  USER: 'user',
} as const;

export type UnitLabel = typeof UNIT_LABEL[keyof typeof UNIT_LABEL];

export const SUPPORTED_CURRENCIES = ['NOK', 'SEK', 'EUR'] as const;
export type SupportedCurrency = typeof SUPPORTED_CURRENCIES[number];

export const DRIFT_SEVERITY = {
  CRITICAL: 'critical', // name, metadata mismatch
  WARNING: 'warning',   // description mismatch  
  INFO: 'info',         // minor differences
} as const;

export type DriftSeverity = typeof DRIFT_SEVERITY[keyof typeof DRIFT_SEVERITY];

// =============================================================================
// DATABASE TYPES
// =============================================================================

/**
 * Product record from database (extended with Stripe fields)
 */
export interface DbProduct {
  id: string;
  product_key: string;
  name: string;
  category: string | null;
  description: string | null;
  
  // Stripe sync fields
  stripe_product_id: string | null;
  stripe_default_price_id: string | null;
  stripe_sync_status: StripeSyncStatus;
  stripe_last_synced_at: string | null;
  stripe_sync_error: string | null;
  
  // Extended fields
  internal_description: string | null;
  customer_description: string | null;
  status: ProductStatus;
  product_type: ProductType;
  
  // Critical Stripe fields (Step 1)
  // Note: unit_label defaults to 'seat' in DB, but may be null before migration
  unit_label: UnitLabel | null;
  statement_descriptor: string | null;
  
  // Step 2: Product image
  image_url: string | null;
  
  // Step 3: Strategic fields
  target_audience: 'all' | 'school' | 'club' | 'individual' | 'enterprise';
  feature_tier: 'free' | 'basic' | 'standard' | 'pro' | 'enterprise';
  min_seats: number;
  max_seats: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Product price record from database
 */
export interface DbProductPrice {
  id: string;
  product_id: string;
  stripe_price_id: string | null;
  amount: number; // In smallest currency unit (øre/cent)
  currency: SupportedCurrency;
  interval: PriceInterval;
  interval_count: number;
  tax_behavior: TaxBehavior;
  billing_model: BillingModel;
  nickname: string | null;
  lookup_key: string | null;
  trial_period_days: number;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Product with prices (for UI/API responses)
 */
export interface ProductWithPrices extends DbProduct {
  prices: DbProductPrice[];
}

// =============================================================================
// STRIPE ID GENERATION
// =============================================================================

/**
 * Generate deterministic Stripe Product ID from Lekbanken product ID.
 * Format: lek_prod_<uuid> (replaces hyphens with underscores for Stripe compatibility)
 * 
 * This ensures idempotency - same product always gets same Stripe ID.
 */
export function generateStripeProductId(productId: string): string {
  // Remove hyphens and prefix with lek_prod_
  const cleanId = productId.replace(/-/g, '');
  return `lek_prod_${cleanId}`;
}

/**
 * Extract Lekbanken product ID from Stripe Product ID.
 * Reverses generateStripeProductId().
 */
export function extractProductIdFromStripeId(stripeProductId: string): string | null {
  if (!stripeProductId.startsWith('lek_prod_')) {
    return null;
  }
  
  const cleanId = stripeProductId.replace('lek_prod_', '');
  
  // Reconstruct UUID format: 8-4-4-4-12
  if (cleanId.length !== 32) {
    return null;
  }
  
  return [
    cleanId.slice(0, 8),
    cleanId.slice(8, 12),
    cleanId.slice(12, 16),
    cleanId.slice(16, 20),
    cleanId.slice(20, 32),
  ].join('-');
}

// =============================================================================
// IDEMPOTENCY
// =============================================================================

/**
 * Generate idempotency key for Stripe API calls.
 * Format: lekbanken_<operation>_<identifier>_<timestamp>
 * 
 * @param operation - The operation type (create_product, update_product, etc.)
 * @param identifier - Unique identifier (product ID, price ID, etc.)
 * @param timestamp - Optional timestamp for time-based uniqueness
 */
export function generateIdempotencyKey(
  operation: string,
  identifier: string,
  timestamp?: number
): string {
  const ts = timestamp ?? Date.now();
  return `lekbanken_${operation}_${identifier}_${ts}`;
}

// =============================================================================
// DRIFT DETECTION TYPES
// =============================================================================

/**
 * Single drift field with details
 */
export interface DriftField {
  field: string;
  lekbankenValue: unknown;
  stripeValue: unknown;
  severity: DriftSeverity;
  message: string;
}

/**
 * Complete drift detection result
 */
export interface DriftResult {
  productId: string;
  stripeProductId: string;
  hasDrift: boolean;
  overallSeverity: DriftSeverity | null;
  fields: DriftField[];
  detectedAt: string;
}

// =============================================================================
// SYNC OPERATION TYPES
// =============================================================================

/**
 * Result of syncing a single product to Stripe
 */
export interface SyncProductResult {
  success: boolean;
  productId: string;
  stripeProductId: string | null;
  operation: 'created' | 'updated' | 'skipped' | 'failed';
  error?: string;
  driftDetected?: boolean;
  timestamp: string;
}

/**
 * Result of bulk bootstrap operation
 */
export interface BootstrapResult {
  success: boolean;
  totalProducts: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: Array<{
    productId: string;
    error: string;
  }>;
  duration: number; // milliseconds
  timestamp: string;
}

/**
 * Options for sync operations
 */
export interface SyncOptions {
  /** Force sync even if already synced */
  force?: boolean;
  /** Skip drift detection */
  skipDriftDetection?: boolean;
  /** Dry run - don't actually make Stripe API calls */
  dryRun?: boolean;
  /** Custom idempotency key prefix */
  idempotencyPrefix?: string;
}

/**
 * Options for bootstrap operation
 */
export interface BootstrapOptions extends SyncOptions {
  /** Only sync products matching these statuses */
  statuses?: ProductStatus[];
  /** Maximum products to sync in one batch */
  batchSize?: number;
  /** Delay between batches in ms (to avoid rate limits) */
  batchDelay?: number;
}

// =============================================================================
// STRIPE METADATA
// =============================================================================

/**
 * Metadata stored on Stripe Product
 */
export interface StripeProductMetadata {
  lekbanken_id: string;
  product_key: string;
  product_type: ProductType;
  billing_model: BillingModel;
  source: 'lekbanken';
  version: string; // Schema version for future migrations
}

/**
 * Metadata stored on Stripe Price
 */
export interface StripePriceMetadata {
  lekbanken_price_id: string;
  lekbanken_product_id: string;
  billing_model: BillingModel;
  source: 'lekbanken';
}

// Current metadata schema version
export const METADATA_VERSION = '1.0';

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Request body for sync-product endpoint
 */
export interface SyncProductRequest {
  productId: string;
  options?: SyncOptions;
}

/**
 * Request body for bootstrap-products endpoint
 */
export interface BootstrapProductsRequest {
  options?: BootstrapOptions;
}

/**
 * Response for sync endpoints
 */
export interface SyncResponse {
  success: boolean;
  data?: SyncProductResult | BootstrapResult;
  error?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Convert Lekbanken interval to Stripe recurring interval
 */
export function toStripeInterval(interval: PriceInterval): 'month' | 'year' | null {
  if (interval === 'one_time') return null;
  return interval;
}

/**
 * Check if price is recurring
 */
export function isRecurringPrice(interval: PriceInterval): boolean {
  return interval !== 'one_time';
}

/**
 * Format amount for display (convert from smallest unit)
 */
export function formatAmount(amount: number, currency: SupportedCurrency): string {
  const majorUnit = amount / 100;
  return new Intl.NumberFormat('nb-NO', {
    style: 'currency',
    currency: currency,
  }).format(majorUnit);
}

/**
 * Get severity color for UI
 */
export function getDriftSeverityColor(severity: DriftSeverity): string {
  switch (severity) {
    case DRIFT_SEVERITY.CRITICAL:
      return 'red';
    case DRIFT_SEVERITY.WARNING:
      return 'yellow';
    case DRIFT_SEVERITY.INFO:
      return 'blue';
    default:
      return 'gray';
  }
}

/**
 * Get sync status display info
 */
export function getSyncStatusInfo(status: StripeSyncStatus): {
  label: string;
  color: string;
  icon: string;
} {
  switch (status) {
    case STRIPE_SYNC_STATUS.SYNCED:
      return { label: 'Synkroniserad', color: 'green', icon: 'check' };
    case STRIPE_SYNC_STATUS.UNSYNCED:
      return { label: 'Ej synkad', color: 'gray', icon: 'clock' };
    case STRIPE_SYNC_STATUS.DRIFT:
      return { label: 'Drift upptäckt', color: 'yellow', icon: 'warning' };
    case STRIPE_SYNC_STATUS.ERROR:
      return { label: 'Fel', color: 'red', icon: 'error' };
    case STRIPE_SYNC_STATUS.LOCKED:
      return { label: 'Låst', color: 'purple', icon: 'lock' };
    default:
      return { label: 'Okänd', color: 'gray', icon: 'question' };
  }
}
