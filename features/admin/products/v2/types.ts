/**
 * Product Admin V2 Types
 *
 * Comprehensive type definitions for the refactored /admin/products system.
 * Supports billing integration, entitlements, tenant availability, and audit logging.
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export type ProductStatus = 'draft' | 'active' | 'archived';

export type ProductType =
  | 'license' // Base access license
  | 'module' // Feature module add-on
  | 'addon' // General add-on
  | 'usage_based' // Metered usage
  | 'one_time' // Single purchase
  | 'subscription'; // Recurring subscription

export type PriceInterval = 'month' | 'year' | 'one_time' | 'usage';

export type TaxBehavior = 'inclusive' | 'exclusive' | 'unspecified';

export type AvailabilityScope = 'global' | 'allowlist' | 'blocklist' | 'internal';

export type LicenseModel = 'per_tenant' | 'per_seat' | 'per_user';

export type UnitLabel = 'seat' | 'license' | 'user';

export type StripeLinkageStatus = 'connected' | 'missing' | 'drift';

export type HealthStatus = 'ok' | 'missing_fields' | 'stripe_drift' | 'availability_misconfig' | 'no_price';

// ============================================================================
// STRIPE INTEGRATION
// ============================================================================

export type ProductPrice = {
  id: string;
  product_id: string;
  stripe_price_id: string | null;
  amount: number;
  currency: string;
  interval: PriceInterval;
  interval_count: number;
  tax_behavior: TaxBehavior;
  billing_model: string;
  lookup_key: string | null;
  trial_period_days: number;
  active: boolean;
  is_default: boolean;
  nickname: string | null;
  created_at: string;
  updated_at: string;
};

export type StripeLinkage = {
  status: StripeLinkageStatus;
  stripe_product_id: string | null;
  stripe_product_name: string | null;
  last_synced_at: string | null;
  drift_details: StripeDriftItem[] | null;
  active_prices_count: number;
};

export type StripeDriftItem = {
  field: string;
  local_value: string | null;
  stripe_value: string | null;
};

// ============================================================================
// ENTITLEMENTS & FEATURE GATING
// ============================================================================

export type ProductEntitlement = {
  id: string;
  product_id: string;
  feature_key: string;
  feature_label: string;
  value: EntitlementValue;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type EntitlementValue = {
  type: 'boolean' | 'number' | 'string' | 'json';
  data: boolean | number | string | Record<string, unknown>;
};

export type ProductDependency = {
  id: string;
  product_id: string;
  dependency_type: 'requires' | 'excludes';
  target_product_id: string;
  target_product_name: string;
};

export type EffectiveAccessPreview = {
  tenant_id: string;
  tenant_name: string;
  current_features: string[];
  features_if_activated: string[];
  features_if_deactivated: string[];
  conflicts: string[];
};

// ============================================================================
// TENANT AVAILABILITY
// ============================================================================

export type TenantAssignment = {
  id: string;
  product_id: string;
  tenant_id: string;
  tenant_name: string;
  status: 'active' | 'pending' | 'revoked';
  assigned_at: string;
  assigned_by: string | null;
  has_stripe_customer: boolean;
  seat_count: number | null;
};

export type ProductAvailability = {
  scope: AvailabilityScope;
  license_model: LicenseModel;
  tenant_assignments: TenantAssignment[];
  total_assigned_tenants: number;
};

// ============================================================================
// LIFECYCLE & AUDIT
// ============================================================================

export type LifecycleState = {
  status: ProductStatus;
  can_activate: boolean;
  can_archive: boolean;
  activation_blockers: string[];
  archive_warnings: string[];
  soft_delete_policy: 'allowed' | 'blocked' | 'warning';
};

export type PublishChecklist = {
  has_valid_price: boolean;
  has_entitlements: boolean;
  availability_rules_valid: boolean;
  stripe_linkage_ok: boolean;
  all_passed: boolean;
  waived_items: string[];
};

export type AuditEvent = {
  id: string;
  product_id: string;
  event_type: AuditEventType;
  event_data?: Record<string, unknown>;
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
  // Legacy fields for backwards compatibility
  timestamp?: string; // Alias for created_at
  actor_name?: string; // Not used in new audit log
};

export type AuditEventType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'price_added'
  | 'price_updated'
  | 'price_removed'
  | 'entitlement_added'
  | 'entitlement_updated'
  | 'entitlement_removed'
  | 'availability_changed'
  | 'tenant_assigned'
  | 'tenant_unassigned'
  | 'stripe_synced'
  | 'archived'
  | 'restored';

// ============================================================================
// MAIN PRODUCT TYPE
// ============================================================================

export type ProductAdminRow = {
  // Core identifiers
  id: string;
  product_key: string | null;
  name: string;
  internal_description: string | null;
  customer_description: string | null;

  // Classification
  product_type: ProductType;
  category: string;
  tags: string[];
  status: ProductStatus;
  
  // Critical Stripe fields (Step 1)
  unit_label: UnitLabel;
  statement_descriptor: string | null;
  stripe_product_id: string | null;
  
  // Step 2: Product image
  image_url: string | null;
  
  // Step 3: Strategic fields
  target_audience: 'all' | 'schools' | 'kindergartens' | 'fritids' | 'enterprise';
  feature_tier: 'free' | 'standard' | 'premium' | 'enterprise';
  min_seats: number;
  max_seats: number;

  // Stripe linkage (computed)
  stripe_linkage: StripeLinkage;

  // Pricing summary (computed)
  primary_price: ProductPrice | null;
  prices_count: number;

  // Availability (computed)
  availability_scope: AvailabilityScope;
  assigned_tenants_count: number;

  // Health (computed)
  health_status: HealthStatus;
  health_issues: string[];

  // Metadata
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type ProductDetail = ProductAdminRow & {
  // Full pricing data
  prices: ProductPrice[];

  // Full entitlements data
  entitlements: ProductEntitlement[];
  dependencies: ProductDependency[];

  // Full availability data
  availability: ProductAvailability;

  // Lifecycle
  lifecycle: LifecycleState;
  publish_checklist: PublishChecklist;

  // Audit (recent events)
  recent_audit_events: AuditEvent[];
};

// ============================================================================
// FILTERS & PAGINATION
// ============================================================================

export type ProductFilters = {
  page: number;
  pageSize: number;
  sortBy: 'name' | 'status' | 'updated_at' | 'stripe_linkage' | 'health_status';
  sortOrder: 'asc' | 'desc';

  // Quick filters
  search?: string;
  statuses?: ProductStatus[];
  productTypes?: ProductType[];
  stripeLinkageStatuses?: StripeLinkageStatus[];
  healthStatuses?: HealthStatus[];
  availabilityScopes?: AvailabilityScope[];
};

export type ProductListResponse = {
  products: ProductAdminRow[];
  total: number;
  page: number;
  pageSize: number;
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export type BulkOperation =
  | 'activate'
  | 'archive'
  | 'set_availability'
  | 'export'
  | 'sync_stripe'
  | 'validate';

export type BulkOperationPayload = {
  operation: BulkOperation;
  product_ids: string[];
  params?: Record<string, unknown>;
};

export type BulkOperationResult = {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ product_id: string; error: string }>;
};

// ============================================================================
// SELECT OPTIONS
// ============================================================================

export type SelectOption = {
  value: string;
  label: string;
};

// ============================================================================
// PRODUCT CARD TABS
// ============================================================================

export type ProductCardTab =
  | 'overview'
  | 'pricing'
  | 'stripe'
  | 'settings'
  | 'entitlements'
  | 'availability'
  | 'lifecycle';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PRODUCT_STATUS_META: Record<ProductStatus, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  draft: { label: 'Utkast', color: '#6b7280', variant: 'outline' },
  active: { label: 'Aktiv', color: '#10b981', variant: 'default' },
  archived: { label: 'Arkiverad', color: '#ef4444', variant: 'destructive' },
};

export const PRODUCT_TYPE_META: Record<ProductType, { label: string; description: string }> = {
  license: { label: 'Licens', description: 'Baslicens för åtkomst' },
  module: { label: 'Modul', description: 'Funktionsmodul' },
  addon: { label: 'Tillägg', description: 'Generellt tillägg' },
  usage_based: { label: 'Användningsbaserad', description: 'Debiteras per användning' },
  one_time: { label: 'Engångsköp', description: 'Engångsbetalning' },
  subscription: { label: 'Prenumeration', description: 'Återkommande betalning' },
};

export const STRIPE_LINKAGE_META: Record<StripeLinkageStatus, { label: string; color: string; variant: 'default' | 'secondary' | 'destructive' | 'warning' }> = {
  connected: { label: 'Kopplad', color: '#10b981', variant: 'default' },
  missing: { label: 'Saknas', color: '#f59e0b', variant: 'warning' },
  drift: { label: 'Avvikelse', color: '#ef4444', variant: 'destructive' },
};

export const HEALTH_STATUS_META: Record<HealthStatus, { label: string; color: string; icon: string }> = {
  ok: { label: 'OK', color: '#10b981', icon: 'CheckCircle' },
  missing_fields: { label: 'Saknade fält', color: '#f59e0b', icon: 'ExclamationTriangle' },
  stripe_drift: { label: 'Stripe-avvikelse', color: '#ef4444', icon: 'ExclamationCircle' },
  availability_misconfig: { label: 'Tillgänglighetsfel', color: '#f59e0b', icon: 'ExclamationTriangle' },
  no_price: { label: 'Inget pris', color: '#ef4444', icon: 'CurrencyDollar' },
};

export const AVAILABILITY_SCOPE_META: Record<AvailabilityScope, { label: string; description: string }> = {
  global: { label: 'Global', description: 'Tillgänglig för alla' },
  allowlist: { label: 'Tillåtlista', description: 'Endast utvalda organisationer' },
  blocklist: { label: 'Blocklista', description: 'Alla utom blockerade' },
  internal: { label: 'Intern', description: 'Endast för internt bruk' },
};

export const PRICE_INTERVAL_META: Record<PriceInterval, { label: string; shortLabel: string }> = {
  month: { label: 'Per månad', shortLabel: '/mån' },
  year: { label: 'Per år', shortLabel: '/år' },
  one_time: { label: 'Engångsbetalning', shortLabel: '' },
  usage: { label: 'Per användning', shortLabel: '/användning' },
};

// ============================================================================
// AUDIT LOG TYPES
// ============================================================================

export type ProductAuditEventType =
  | 'created'
  | 'status_changed'
  | 'field_updated'
  | 'price_created'
  | 'price_updated'
  | 'price_deleted'
  | 'default_price_changed'
  | 'stripe_synced'
  | 'stripe_sync_failed'
  | 'archived'
  | 'restored';

export type ProductAuditEvent = {
  id: string;
  product_id: string;
  tenant_id?: string; // Optional - products are global
  event_type: ProductAuditEventType;
  event_data: {
    field?: string;
    old_value?: unknown;
    new_value?: unknown;
    price_id?: string;
    error?: string;
    stripe_product_id?: string;
    changes?: Record<string, { old: unknown; new: unknown }>;
    [key: string]: unknown;
  };
  actor_id: string | null;
  actor_email: string | null;
  created_at: string;
};

export const AUDIT_EVENT_META: Record<ProductAuditEventType, { label: string; icon: string; color: string }> = {
  created: { label: 'Skapad', icon: 'PlusCircle', color: '#10b981' },
  status_changed: { label: 'Status ändrad', icon: 'ArrowPath', color: '#3b82f6' },
  field_updated: { label: 'Fält uppdaterat', icon: 'PencilSquare', color: '#6b7280' },
  price_created: { label: 'Pris skapat', icon: 'CurrencyDollar', color: '#10b981' },
  price_updated: { label: 'Pris uppdaterat', icon: 'CurrencyDollar', color: '#f59e0b' },
  price_deleted: { label: 'Pris borttaget', icon: 'Trash', color: '#ef4444' },
  default_price_changed: { label: 'Standardpris ändrat', icon: 'Star', color: '#8b5cf6' },
  stripe_synced: { label: 'Synkad till Stripe', icon: 'CloudArrowUp', color: '#10b981' },
  stripe_sync_failed: { label: 'Synkfel', icon: 'ExclamationCircle', color: '#ef4444' },
  archived: { label: 'Arkiverad', icon: 'Archive', color: '#6b7280' },
  restored: { label: 'Återställd', icon: 'ArrowUturnLeft', color: '#10b981' },
};
