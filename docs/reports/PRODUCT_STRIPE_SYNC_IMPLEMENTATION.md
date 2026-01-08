# Produktsynkronisering med Stripe - Implementeringsplan

**Datum:** 2026-01-08  
**Baserat på:** [PRODUCT_STRIPE_SYNC_PLAN.md](./PRODUCT_STRIPE_SYNC_PLAN.md)  
**Uppskattad tid:** 30-46 timmar  
**Prioritet:** Hög

---

## Översikt

Denna plan beskriver steg-för-steg hur Stripe-produktsynkronisering ska implementeras. Varje fas har tydliga uppgifter, acceptanskriterier och beroenden.

```
┌─────────────────────────────────────────────────────────────────┐
│  FAS 1          FAS 2          FAS 3          FAS 4          FAS 5  │
│  Schema    →   Bootstrap  →   Sync API   →   Admin UI   →   Test    │
│  (2-4h)        (4-6h)         (8-12h)        (8-12h)        (4-6h)   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Fas 1: Schema-migration (2-4 timmar)

### 1.1 Skapa migrationsfil

**Fil:** `supabase/migrations/YYYYMMDDHHMMSS_product_stripe_sync.sql`

```sql
-- ============================================================================
-- PRODUCT STRIPE SYNC MIGRATION
-- Adds Stripe integration fields to products table and creates product_prices
-- ============================================================================

-- 1. Add Stripe fields to products table
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS stripe_product_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_default_price_id text,
  ADD COLUMN IF NOT EXISTS stripe_sync_status text DEFAULT 'unsynced',
  ADD COLUMN IF NOT EXISTS stripe_last_synced_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_sync_error text,
  ADD COLUMN IF NOT EXISTS internal_description text,
  ADD COLUMN IF NOT EXISTS customer_description text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS product_type text DEFAULT 'license';

-- 2. Add check constraints for enum-like fields
ALTER TABLE products 
  ADD CONSTRAINT products_stripe_sync_status_check 
  CHECK (stripe_sync_status IN ('unsynced', 'synced', 'drift', 'error', 'locked'));

ALTER TABLE products 
  ADD CONSTRAINT products_status_check 
  CHECK (status IN ('draft', 'active', 'archived'));

ALTER TABLE products 
  ADD CONSTRAINT products_product_type_check 
  CHECK (product_type IN ('license', 'addon', 'consumable', 'one_time', 'bundle'));

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS products_stripe_product_id_idx ON products (stripe_product_id);
CREATE INDEX IF NOT EXISTS products_stripe_sync_status_idx ON products (stripe_sync_status);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);

-- 4. Create product_prices table
CREATE TABLE IF NOT EXISTS product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stripe_price_id text UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL DEFAULT 'NOK',
  interval text NOT NULL,
  interval_count integer DEFAULT 1,
  tax_behavior text DEFAULT 'exclusive',
  billing_model text DEFAULT 'per_seat',
  nickname text,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT product_prices_currency_check 
    CHECK (currency IN ('NOK', 'SEK', 'EUR')),
  CONSTRAINT product_prices_interval_check 
    CHECK (interval IN ('month', 'year', 'one_time')),
  CONSTRAINT product_prices_tax_behavior_check 
    CHECK (tax_behavior IN ('inclusive', 'exclusive', 'unspecified')),
  CONSTRAINT product_prices_billing_model_check 
    CHECK (billing_model IN ('per_seat', 'per_tenant', 'per_user', 'flat'))
);

-- 5. Create indexes for product_prices
CREATE INDEX IF NOT EXISTS product_prices_product_id_idx ON product_prices (product_id);
CREATE INDEX IF NOT EXISTS product_prices_stripe_price_id_idx ON product_prices (stripe_price_id);
CREATE INDEX IF NOT EXISTS product_prices_active_idx ON product_prices (active);
CREATE INDEX IF NOT EXISTS product_prices_currency_idx ON product_prices (currency);

-- 6. Partial unique index: only one default per product+currency+interval
CREATE UNIQUE INDEX IF NOT EXISTS product_prices_default_unique_idx 
  ON product_prices (product_id, currency, interval) 
  WHERE is_default = true;

-- 7. Updated_at trigger for product_prices
CREATE OR REPLACE FUNCTION update_product_prices_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER product_prices_updated_at
  BEFORE UPDATE ON product_prices
  FOR EACH ROW
  EXECUTE FUNCTION update_product_prices_updated_at();

-- 8. Migrate existing description to customer_description
UPDATE products 
SET customer_description = description 
WHERE customer_description IS NULL AND description IS NOT NULL;

-- 9. Set existing products to 'active' status (de har redan data)
UPDATE products 
SET status = 'active' 
WHERE status IS NULL OR status = 'draft';
```

### 1.2 Acceptanskriterier

- [ ] Migration körs utan fel i lokal miljö
- [ ] Migration körs utan fel i staging
- [ ] `products`-tabellen har alla nya kolumner
- [ ] `product_prices`-tabellen skapas korrekt
- [ ] Alla constraints fungerar (testa med felaktiga värden)
- [ ] Befintliga produkter har `status = 'active'` och `customer_description` ifyllt

### 1.3 Körning

```bash
# Lokal körning
npx supabase db push

# Eller via Supabase Dashboard
# SQL Editor → Kör migrationsfilen
```

---

## Fas 2: Bootstrap Sync (4-6 timmar)

### 2.1 Skapa TypeScript-typer

**Fil:** `lib/stripe/product-sync-types.ts`

```typescript
import type Stripe from 'stripe';

// ============================================================================
// DATABASE TYPES
// ============================================================================

export type StripeSyncStatus = 'unsynced' | 'synced' | 'drift' | 'error' | 'locked';
export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductType = 'license' | 'addon' | 'consumable' | 'one_time' | 'bundle';
export type PriceInterval = 'month' | 'year' | 'one_time';
export type PriceCurrency = 'NOK' | 'SEK' | 'EUR';
export type TaxBehavior = 'inclusive' | 'exclusive' | 'unspecified';
export type BillingModel = 'per_seat' | 'per_tenant' | 'per_user' | 'flat';

export interface ProductWithStripe {
  id: string;
  product_key: string | null;
  name: string;
  category: string;
  description: string | null;
  internal_description: string | null;
  customer_description: string | null;
  status: ProductStatus;
  product_type: ProductType;
  stripe_product_id: string | null;
  stripe_default_price_id: string | null;
  stripe_sync_status: StripeSyncStatus;
  stripe_last_synced_at: string | null;
  stripe_sync_error: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  stripe_price_id: string | null;
  amount: number;
  currency: PriceCurrency;
  interval: PriceInterval;
  interval_count: number;
  tax_behavior: TaxBehavior;
  billing_model: BillingModel;
  nickname: string | null;
  is_default: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// SYNC TYPES
// ============================================================================

export type DriftSeverity = 'info' | 'warning' | 'critical';

export interface DriftItem {
  field: string;
  local_value: string | null;
  stripe_value: string | null;
  severity: DriftSeverity;
}

export interface SyncResult {
  success: boolean;
  product_id: string;
  stripe_product_id: string | null;
  action: 'created' | 'updated' | 'skipped' | 'error';
  error?: string;
  prices_synced?: number;
}

export interface BootstrapResult {
  total_products: number;
  synced: number;
  errors: number;
  results: SyncResult[];
}

export interface PullResult {
  drift_detected: boolean;
  drift_items: DriftItem[];
  stripe_data: Stripe.Product;
  prices: Stripe.Price[];
}
```

### 2.2 Skapa sync-funktioner

**Fil:** `lib/stripe/product-sync.ts`

```typescript
import { stripe } from '@/lib/stripe/config';
import { createServerRlsClient } from '@/lib/supabase/server';
import type {
  ProductWithStripe,
  ProductPrice,
  SyncResult,
  BootstrapResult,
  DriftItem,
  PullResult,
} from './product-sync-types';
import type Stripe from 'stripe';

// ============================================================================
// STRIPE PRODUCT ID GENERATION
// ============================================================================

/**
 * Generates a deterministic Stripe Product ID
 * Format: lek_prod_<uuid>
 */
export function generateStripeProductId(productId: string): string {
  return `lek_prod_${productId}`;
}

// ============================================================================
// PUSH TO STRIPE
// ============================================================================

/**
 * Push a single product to Stripe (create or update)
 */
export async function pushProductToStripe(productId: string): Promise<SyncResult> {
  const supabase = await createServerRlsClient();
  
  // Fetch product from database
  const { data: product, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (fetchError || !product) {
    return {
      success: false,
      product_id: productId,
      stripe_product_id: null,
      action: 'error',
      error: fetchError?.message || 'Product not found',
    };
  }

  const typedProduct = product as ProductWithStripe;
  const stripeProductId = generateStripeProductId(productId);
  const idempotencyKey = `push_product_${productId}_${typedProduct.updated_at}`;

  try {
    let stripeProduct: Stripe.Product;

    if (typedProduct.stripe_product_id) {
      // UPDATE existing Stripe product
      stripeProduct = await stripe.products.update(typedProduct.stripe_product_id, {
        name: typedProduct.name,
        description: typedProduct.customer_description || undefined,
        active: typedProduct.status === 'active',
        metadata: {
          lekbanken_id: typedProduct.id,
          product_key: typedProduct.product_key || '',
          category: typedProduct.category,
        },
      });

      // Update sync status
      await supabase
        .from('products')
        .update({
          stripe_sync_status: 'synced',
          stripe_last_synced_at: new Date().toISOString(),
          stripe_sync_error: null,
        })
        .eq('id', productId);

      return {
        success: true,
        product_id: productId,
        stripe_product_id: stripeProduct.id,
        action: 'updated',
      };
    } else {
      // CREATE new Stripe product with deterministic ID
      try {
        stripeProduct = await stripe.products.create(
          {
            id: stripeProductId,
            name: typedProduct.name,
            description: typedProduct.customer_description || undefined,
            active: typedProduct.status === 'active',
            metadata: {
              lekbanken_id: typedProduct.id,
              product_key: typedProduct.product_key || '',
              category: typedProduct.category,
            },
          },
          { idempotencyKey }
        );
      } catch (createError) {
        // If product already exists (idempotency or retry), try to retrieve it
        if ((createError as Stripe.StripeAPIError).code === 'resource_already_exists') {
          stripeProduct = await stripe.products.retrieve(stripeProductId);
        } else {
          throw createError;
        }
      }

      // Save Stripe product ID and update sync status
      await supabase
        .from('products')
        .update({
          stripe_product_id: stripeProduct.id,
          stripe_sync_status: 'synced',
          stripe_last_synced_at: new Date().toISOString(),
          stripe_sync_error: null,
        })
        .eq('id', productId);

      return {
        success: true,
        product_id: productId,
        stripe_product_id: stripeProduct.id,
        action: 'created',
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Update sync status to error
    await supabase
      .from('products')
      .update({
        stripe_sync_status: 'error',
        stripe_sync_error: errorMessage,
      })
      .eq('id', productId);

    return {
      success: false,
      product_id: productId,
      stripe_product_id: typedProduct.stripe_product_id,
      action: 'error',
      error: errorMessage,
    };
  }
}

// ============================================================================
// BOOTSTRAP ALL PRODUCTS
// ============================================================================

/**
 * Bootstrap sync: push all products to Stripe
 * Can be run multiple times (idempotent)
 */
export async function bootstrapProductsToStripe(): Promise<BootstrapResult> {
  const supabase = await createServerRlsClient();
  
  // Fetch all products (including draft)
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    throw new Error(`Failed to fetch products: ${fetchError.message}`);
  }

  const results: SyncResult[] = [];
  let synced = 0;
  let errors = 0;

  for (const product of products || []) {
    const result = await pushProductToStripe(product.id);
    results.push(result);
    
    if (result.success) {
      synced++;
    } else {
      errors++;
    }

    // Small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return {
    total_products: products?.length || 0,
    synced,
    errors,
    results,
  };
}

// ============================================================================
// PULL FROM STRIPE (for inspection)
// ============================================================================

/**
 * Pull product data from Stripe for comparison
 * Does NOT automatically update local data
 */
export async function pullProductFromStripe(productId: string): Promise<PullResult> {
  const supabase = await createServerRlsClient();
  
  const { data: product, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', productId)
    .single();

  if (error || !product) {
    throw new Error('Product not found');
  }

  const typedProduct = product as ProductWithStripe;

  if (!typedProduct.stripe_product_id) {
    throw new Error('Product not linked to Stripe');
  }

  const stripeProduct = await stripe.products.retrieve(typedProduct.stripe_product_id);
  const stripePrices = await stripe.prices.list({
    product: typedProduct.stripe_product_id,
    active: true,
    limit: 100,
  });

  const driftItems = detectDrift(typedProduct, stripeProduct);

  // Update drift status if drift detected
  if (driftItems.length > 0) {
    await supabase
      .from('products')
      .update({ stripe_sync_status: 'drift' })
      .eq('id', productId);
  }

  return {
    drift_detected: driftItems.length > 0,
    drift_items: driftItems,
    stripe_data: stripeProduct,
    prices: stripePrices.data,
  };
}

// ============================================================================
// DRIFT DETECTION
// ============================================================================

/**
 * Detect differences between local and Stripe data
 */
export function detectDrift(
  local: ProductWithStripe,
  stripeProduct: Stripe.Product
): DriftItem[] {
  const drifts: DriftItem[] = [];

  // CRITICAL: Active status affects billing
  const localActive = local.status === 'active';
  if (localActive !== stripeProduct.active) {
    drifts.push({
      field: 'active',
      local_value: String(localActive),
      stripe_value: String(stripeProduct.active),
      severity: 'critical',
    });
  }

  // WARNING: Name is customer-facing
  if (local.name !== stripeProduct.name) {
    drifts.push({
      field: 'name',
      local_value: local.name,
      stripe_value: stripeProduct.name,
      severity: 'warning',
    });
  }

  // INFO: Description is less critical
  const localDescription = local.customer_description || null;
  const stripeDescription = stripeProduct.description || null;
  if (localDescription !== stripeDescription) {
    drifts.push({
      field: 'description',
      local_value: localDescription,
      stripe_value: stripeDescription,
      severity: 'info',
    });
  }

  return drifts;
}

// ============================================================================
// RESOLVE DRIFT
// ============================================================================

/**
 * Resolve drift by pushing local data to Stripe
 */
export async function resolveDriftToStripe(productId: string): Promise<SyncResult> {
  return pushProductToStripe(productId);
}

/**
 * Resolve drift by pulling Stripe data to local
 */
export async function resolveDriftToLocal(productId: string): Promise<void> {
  const supabase = await createServerRlsClient();
  
  const { data: product } = await supabase
    .from('products')
    .select('stripe_product_id')
    .eq('id', productId)
    .single();

  if (!product?.stripe_product_id) {
    throw new Error('Product not linked to Stripe');
  }

  const stripeProduct = await stripe.products.retrieve(product.stripe_product_id);

  await supabase
    .from('products')
    .update({
      name: stripeProduct.name,
      customer_description: stripeProduct.description,
      status: stripeProduct.active ? 'active' : 'archived',
      stripe_sync_status: 'synced',
      stripe_last_synced_at: new Date().toISOString(),
      stripe_sync_error: null,
    })
    .eq('id', productId);
}
```

### 2.3 Skapa Bootstrap API-endpoint

**Fil:** `app/api/admin/stripe/bootstrap-products/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { bootstrapProductsToStripe } from '@/lib/stripe/product-sync';

export async function POST() {
  const supabase = await createServerRlsClient();

  // Auth check - system admin only
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  try {
    const result = await bootstrapProductsToStripe();
    
    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('[Bootstrap Products] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bootstrap failed' },
      { status: 500 }
    );
  }
}
```

### 2.4 Acceptanskriterier

- [ ] `lib/stripe/product-sync-types.ts` skapad med alla typer
- [ ] `lib/stripe/product-sync.ts` skapad med alla funktioner
- [ ] Bootstrap-endpoint fungerar och kräver system_admin
- [ ] Alla Lekbanken-produkter skapas i Stripe test-mode
- [ ] `stripe_product_id` sparas korrekt i databasen
- [ ] Endpoint kan köras flera gånger utan dubletter (idempotent)
- [ ] Stripe Dashboard visar produkterna med rätt metadata

---

## Fas 3: Sync API-endpoints (8-12 timmar)

### 3.1 Uppdatera befintlig sync-stripe endpoint

**Fil:** `app/api/admin/products/[productId]/sync-stripe/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { pushProductToStripe } from '@/lib/stripe/product-sync';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  try {
    const result = await pushProductToStripe(productId);
    
    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('[Sync Stripe] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync failed' },
      { status: 500 }
    );
  }
}
```

### 3.2 Skapa stripe-status endpoint

**Fil:** `app/api/admin/products/[productId]/stripe-status/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { pullProductFromStripe } from '@/lib/stripe/product-sync';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  try {
    const result = await pullProductFromStripe(productId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[Stripe Status] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
```

### 3.3 Skapa resolve-drift endpoint

**Fil:** `app/api/admin/products/[productId]/resolve-drift/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { createServerRlsClient } from '@/lib/supabase/server';
import { isSystemAdmin } from '@/lib/utils/tenantAuth';
import { resolveDriftToStripe, resolveDriftToLocal } from '@/lib/stripe/product-sync';

type RouteParams = {
  params: Promise<{ productId: string }>;
};

export async function POST(request: Request, { params }: RouteParams) {
  const { productId } = await params;
  const supabase = await createServerRlsClient();

  // Auth check
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isSystemAdmin(user)) {
    return NextResponse.json({ error: 'Forbidden - system_admin required' }, { status: 403 });
  }

  const body = await request.json();
  const { winner } = body as { winner: 'lekbanken' | 'stripe' };

  if (!winner || !['lekbanken', 'stripe'].includes(winner)) {
    return NextResponse.json(
      { error: 'Invalid winner. Must be "lekbanken" or "stripe"' },
      { status: 400 }
    );
  }

  try {
    if (winner === 'lekbanken') {
      const result = await resolveDriftToStripe(productId);
      return NextResponse.json({ resolved: true, action: 'pushed_to_stripe', ...result });
    } else {
      await resolveDriftToLocal(productId);
      return NextResponse.json({ resolved: true, action: 'pulled_from_stripe' });
    }
  } catch (error) {
    console.error('[Resolve Drift] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to resolve drift' },
      { status: 500 }
    );
  }
}
```

### 3.4 Skapa/uppdatera produkt-PATCH endpoint

**Fil:** `app/api/admin/products/[productId]/route.ts` (uppdatera befintlig)

Lägg till automatisk synkronisering vid statusändring till 'active':

```typescript
// I PATCH-handler, efter lyckad uppdatering:
if (updates.status === 'active' && previousStatus !== 'active') {
  // Auto-sync to Stripe when activating
  const syncResult = await pushProductToStripe(productId);
  if (!syncResult.success) {
    // Rollback status change if sync fails
    await supabase
      .from('products')
      .update({ status: previousStatus })
      .eq('id', productId);
    
    return NextResponse.json(
      { error: `Cannot activate: Stripe sync failed - ${syncResult.error}` },
      { status: 400 }
    );
  }
}
```

### 3.5 Acceptanskriterier

- [ ] `POST /api/admin/products/[id]/sync-stripe` fungerar
- [ ] `GET /api/admin/products/[id]/stripe-status` returnerar drift-info
- [ ] `POST /api/admin/products/[id]/resolve-drift` löser konflikter
- [ ] Statusändring till 'active' triggar automatisk Stripe-synk
- [ ] Alla endpoints kräver system_admin
- [ ] Felhantering fungerar korrekt

---

## Fas 4: Admin UI (8-12 timmar)

### 4.1 Uppdatera ProductDetailPage med Stripe-info

**Fil:** `features/admin/products/v2/ProductDetailPage.tsx`

Lägg till Stripe-sektion i Overview-tab:

```typescript
// Stripe Status Card
<Card>
  <CardHeader>
    <CardTitle className="flex items-center gap-2">
      <LinkIcon className="h-5 w-5" />
      Stripe-koppling
    </CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Sync Status Badge */}
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">Synkstatus</span>
      <StripeSyncBadge status={product.stripe_sync_status} />
    </div>
    
    {/* Stripe Product ID */}
    {product.stripe_product_id && (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Stripe Product ID</span>
        <code className="text-xs bg-muted px-2 py-1 rounded">
          {product.stripe_product_id}
        </code>
      </div>
    )}
    
    {/* Last Synced */}
    {product.stripe_last_synced_at && (
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Senast synkad</span>
        <span className="text-sm">
          {new Date(product.stripe_last_synced_at).toLocaleString('sv-SE')}
        </span>
      </div>
    )}
    
    {/* Sync Error */}
    {product.stripe_sync_error && (
      <div className="p-3 bg-destructive/10 rounded-md">
        <p className="text-sm text-destructive">{product.stripe_sync_error}</p>
      </div>
    )}
    
    {/* Drift Warning */}
    {product.stripe_sync_status === 'drift' && (
      <div className="p-3 bg-yellow-500/10 rounded-md">
        <p className="text-sm text-yellow-600">
          Avvikelse detekterad mellan Lekbanken och Stripe
        </p>
        <Button size="sm" variant="outline" className="mt-2">
          Visa avvikelser
        </Button>
      </div>
    )}
    
    {/* Sync Button */}
    <Button 
      variant="outline" 
      className="w-full"
      onClick={handleSyncStripe}
      disabled={syncing}
    >
      <ArrowPathIcon className="h-4 w-4 mr-2" />
      {syncing ? 'Synkroniserar...' : 'Synka till Stripe'}
    </Button>
  </CardContent>
</Card>
```

### 4.2 Skapa StripeSyncBadge-komponent

**Fil:** `features/admin/products/v2/components/StripeSyncBadge.tsx`

```typescript
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon,
  ClockIcon,
  LockClosedIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG = {
  unsynced: {
    label: 'Ej synkad',
    variant: 'secondary' as const,
    icon: ClockIcon,
  },
  synced: {
    label: 'Synkad',
    variant: 'default' as const,
    icon: CheckCircleIcon,
  },
  drift: {
    label: 'Avvikelse',
    variant: 'warning' as const,
    icon: ExclamationTriangleIcon,
  },
  error: {
    label: 'Fel',
    variant: 'destructive' as const,
    icon: XCircleIcon,
  },
  locked: {
    label: 'Låst',
    variant: 'outline' as const,
    icon: LockClosedIcon,
  },
};

export function StripeSyncBadge({ status }: { status: string }) {
  const config = STATUS_CONFIG[status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.unsynced;
  const Icon = config.icon;
  
  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
```

### 4.3 Skapa DriftResolutionDialog

**Fil:** `features/admin/products/v2/components/DriftResolutionDialog.tsx`

Dialogruta för att visa och lösa drift mellan systemen.

### 4.4 Acceptanskriterier

- [ ] Produktdetaljsidan visar Stripe-kopplingssektion
- [ ] Synk-status visas korrekt (badge)
- [ ] "Synka till Stripe"-knapp fungerar
- [ ] Drift-varning visas när status är 'drift'
- [ ] Drift-resolution dialog låter användaren välja vinnare
- [ ] Senaste synk-tid visas korrekt
- [ ] Fel visas tydligt vid sync_error

---

## Fas 5: Prishantering (tillägg till Fas 3-4)

### 5.1 API-endpoints för priser

**Filer att skapa:**
- `app/api/admin/products/[productId]/prices/route.ts` (GET, POST)
- `app/api/admin/products/[productId]/prices/[priceId]/route.ts` (PATCH, DELETE)

### 5.2 Prissynkronisering

**Lägg till i:** `lib/stripe/product-sync.ts`

```typescript
export async function syncPriceToStripe(
  productId: string,
  priceId: string
): Promise<{ success: boolean; stripe_price_id?: string; error?: string }> {
  // Implementation enligt PRODUCT_STRIPE_SYNC_PLAN.md
}
```

### 5.3 UI för prishantering

Lägg till Pricing-tab i ProductDetailPage med:
- Lista över priser per valuta/intervall
- Formulär för att skapa nytt pris
- Möjlighet att sätta default-pris
- Arkivera gamla priser

---

## Fas 6: Webhook-integration (4-6 timmar)

### 6.1 Uppdatera webhook-handler

**Fil:** `app/api/billing/webhooks/stripe/route.ts`

Lägg till hantering för:
- `product.updated`
- `product.deleted`
- `price.created`
- `price.updated`
- `price.deleted`

```typescript
case 'product.updated':
  await handleProductUpdatedWebhook(event.data.object as Stripe.Product);
  break;
  
case 'product.deleted':
  await handleProductDeletedWebhook(event.data.object as Stripe.Product);
  break;
```

### 6.2 Webhook-handlers

**Fil:** `lib/stripe/product-webhooks.ts`

```typescript
export async function handleProductUpdatedWebhook(stripeProduct: Stripe.Product) {
  const supabase = await createServerRlsClient();
  
  // Find local product by stripe_product_id
  const { data: product } = await supabase
    .from('products')
    .select('id, name, customer_description, status')
    .eq('stripe_product_id', stripeProduct.id)
    .single();
    
  if (!product) {
    console.warn(`[Webhook] Unknown Stripe product: ${stripeProduct.id}`);
    return;
  }
  
  // Check for drift
  const localActive = product.status === 'active';
  const hasDrift = 
    product.name !== stripeProduct.name ||
    product.customer_description !== stripeProduct.description ||
    localActive !== stripeProduct.active;
    
  if (hasDrift) {
    await supabase
      .from('products')
      .update({ stripe_sync_status: 'drift' })
      .eq('id', product.id);
  }
}
```

### 6.3 Acceptanskriterier

- [ ] Webhook tar emot product.updated events
- [ ] Drift detekteras när någon ändrar i Stripe Dashboard
- [ ] stripe_sync_status uppdateras till 'drift'
- [ ] Loggning fungerar för debugging

---

## Fas 7: Testning (4-6 timmar)

### 7.1 Manuella tester

| Test | Förväntat resultat |
|------|-------------------|
| Kör bootstrap med tomma produkter | Inga fel, 0 synkade |
| Kör bootstrap med 25+ produkter | Alla synkas, ingen rate limit |
| Kör bootstrap två gånger | Samma resultat, inga dubletter |
| Synka enskild produkt | stripe_product_id sparas |
| Ändra produkt i Stripe Dashboard | Drift detekteras |
| Lös drift med "Lekbanken wins" | Stripe uppdateras |
| Lös drift med "Stripe wins" | Lokal data uppdateras |
| Aktivera produkt utan Stripe-koppling | Fel: måste synkas först |
| Aktivera produkt med Stripe-koppling | Lyckas + auto-synk |

### 7.2 Playwright E2E-tester

**Fil:** `tests/admin/products-stripe-sync.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('Product Stripe Sync', () => {
  test('shows sync status on product detail page', async ({ page }) => {
    await page.goto('/admin/products/[product-id]');
    await expect(page.getByText('Stripe-koppling')).toBeVisible();
    await expect(page.getByText('Synkstatus')).toBeVisible();
  });
  
  test('sync button triggers Stripe sync', async ({ page }) => {
    await page.goto('/admin/products/[product-id]');
    await page.getByRole('button', { name: 'Synka till Stripe' }).click();
    await expect(page.getByText('Synkad')).toBeVisible();
  });
});
```

---

## Checklista för lansering

### Före produktion

- [ ] Alla migrations körda i staging
- [ ] Bootstrap körd i staging mot Stripe test-mode
- [ ] Manuella tester godkända
- [ ] E2E-tester passerar
- [ ] Webhook-endpoint konfigurerad i Stripe Dashboard
- [ ] Dokumentation uppdaterad

### Vid produktion

1. [ ] Kör migration i produktion
2. [ ] Verifiera schema-ändringar
3. [ ] Kör bootstrap mot Stripe live-mode (försiktigt!)
4. [ ] Verifiera produkter i Stripe Dashboard
5. [ ] Testa en synk manuellt
6. [ ] Aktivera webhooks i produktion

### Efter produktion

- [ ] Övervaka sync_status för fel
- [ ] Kontrollera Stripe Dashboard för korrekt data
- [ ] Verifiera att webhooks tas emot

---

## Tidslinje (rekommenderad ordning)

```
Vecka 1:
├── Dag 1-2: Fas 1 (Schema) + Fas 2 (Bootstrap)
├── Dag 3-4: Fas 3 (API-endpoints)
└── Dag 5: Test bootstrap i staging

Vecka 2:
├── Dag 1-2: Fas 4 (Admin UI)
├── Dag 3: Fas 5 (Prishantering - grundläggande)
├── Dag 4: Fas 6 (Webhooks)
└── Dag 5: Fas 7 (Testning)

Vecka 3:
├── Dag 1: Slutlig testning + bugfixar
├── Dag 2: Dokumentation
└── Dag 3: Produktion-deploy
```

---

*Genererad av GitHub Copilot - 2026-01-08*
