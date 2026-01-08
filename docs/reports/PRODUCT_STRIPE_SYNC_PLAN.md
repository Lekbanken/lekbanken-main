# Produktsynkronisering med Stripe - Teknisk Plan

**Datum:** 2026-01-08  
**Status:** Granskad och godkänd  
**Målgrupp:** Utvecklare  
**Granskad av:** ChatGPT (2026-01-08)

---

## Sammanfattning

Denna rapport beskriver hur produkter i Lekbanken admin ska synkroniseras med Stripe. Målet är att kunna hantera produktinformation i Lekbanken och sedan synkronisera till Stripe för betalning, samtidigt som vi upptäcker och hanterar eventuella avvikelser (drift).

### Viktiga beslut

| Beslut | Val | Motivering |
|--------|-----|------------|
| Source of Truth | **Lekbanken** | Stripe är bra på betalning, dålig på domänlogik |
| Stripe Product ID | **Egen (deterministisk)** | Enklare bootstrap, bättre felsökning |
| Bootstrap-strategi | **Inkludera draft** | Produkter kräver Stripe-koppling innan aktivering |
| Valutor | **NOK + SEK** (EUR senare) | Stegvis utrullning |
| Prisändringar | **Nya prisobjekt** | Stripe Prices är immutabla |

---

## Ordlista

| Term | Förklaring |
|------|------------|
| **Idempotens** | Att kunna köra samma operation flera gånger och få samma resultat utan dubletter. Om nätverket dör mitt i en synk kan man köra om utan problem. |
| **Drift** | När data i Lekbanken och Stripe inte längre matchar (t.ex. någon ändrat direkt i Stripe Dashboard) |
| **Bootstrap** | Initial synkronisering av alla produkter till Stripe (engångsoperation) |

---

## Nuläge

### Befintlig databasstruktur

**`products` (Lekbanken-produkter)**
```sql
- id              uuid PRIMARY KEY
- product_key     text UNIQUE       -- t.ex. "basket", "fotboll"
- name            text NOT NULL
- category        text NOT NULL
- description     text
- created_at      timestamptz
- updated_at      timestamptz
```

**`billing_products` (Faktureringsprodukter)**
```sql
- id                  uuid PRIMARY KEY
- billing_product_key text UNIQUE
- name                text NOT NULL
- type                text NOT NULL
- price_per_seat      numeric(10,2)
- currency            text DEFAULT 'NOK'
- seats_included      integer DEFAULT 1
- is_active           boolean DEFAULT true
```

### Saknade fält för Stripe-integration

Nuvarande schema saknar:
- `stripe_product_id` - Koppling till Stripe-produkt
- `stripe_default_price_id` - Standardpris i Stripe
- `stripe_metadata` - Synkroniserad metadata
- `last_synced_at` - Tidpunkt för senaste synk
- `sync_status` - Status för synkronisering

### Befintlig Stripe-integration

- ✅ Stripe-klient konfigurerad (`lib/stripe/config.ts`)
- ✅ Subscription-hantering fungerar
- ✅ Webhook-mottagning implementerad
- ❌ Ingen produkt-synkronisering
- ❌ Ingen prishantering från admin

---

## Förslag på lösning

### ✅ Valt: Alternativ A - Lekbanken som "Source of Truth"

> **ChatGPT-bedömning:** "Alternativ B bör inte ens vara aktuellt för Lekbanken."
> Stripe är utmärkt på betalning, medelmåttig på produktmodellering, dålig på domänlogik.

```
┌─────────────────┐         ┌─────────────────┐
│   LEKBANKEN     │  ───►   │     STRIPE      │
│   (Master)      │  Sync   │    (Slave)      │
└─────────────────┘         └─────────────────┘
     │                            │
     │ Admin skapar/              │ Används för
     │ redigerar produkt          │ betalning
     │                            │
     ▼                            ▼
┌─────────────────┐         ┌─────────────────┐
│  Supabase DB    │         │ Stripe Products │
│  products       │         │ & Prices        │
└─────────────────┘         └─────────────────┘
```

**Fördelar:**
- All produktdata hanteras i ett ställe
- Lekbanken-specifik data (capabilities, purposes, entitlements) stannar lokalt
- Endast nödvändig data skickas till Stripe
- Webhook = signal, inte kommando

**Varför inte Stripe som Source of Truth:**
- Begränsad metadata (max 50 nycklar, 500 tecken per värde)
- Capabilities, entitlements, purposes måste lagras separat ändå
- Mer komplext att hålla lokala tillägg synkade

---

## Rekommenderad implementation

### Fas 0: Bootstrap Sync (Initial synkronisering)

> **OBS:** Stripe sandbox har endast exempelprodukter. Bootstrap fyller Stripe med riktiga produkter från Lekbanken.

```
POST /api/admin/stripe/bootstrap-products
```

Detta endpoint:
1. Listar alla Lekbanken-produkter (inkl. draft)
2. För varje produkt: skapa/uppdatera Stripe Product
3. För varje pris: skapa Stripe Price
4. Spara `stripe_product_id` och `stripe_price_id` i DB
5. Kan köras flera gånger (idempotent)

### Fas 1: Schema-migration

Utöka `products`-tabellen:

```sql
ALTER TABLE products ADD COLUMN
  -- Stripe-koppling
  stripe_product_id text UNIQUE,           -- Format: lek_prod_<uuid>
  stripe_default_price_id text,
  stripe_sync_status text DEFAULT 'unsynced', -- Se enum nedan
  stripe_last_synced_at timestamptz,
  stripe_sync_error text,
  
  -- Fält som synkroniseras med Stripe
  internal_description text,     -- Admin-only beskrivning (synkas EJ)
  customer_description text,     -- Kundfacing beskrivning (-> Stripe description)
  status text DEFAULT 'draft',   -- 'draft', 'active', 'archived'
  product_type text DEFAULT 'license';

-- Status-värden för stripe_sync_status:
-- 'unsynced' - Aldrig synkad
-- 'synced'   - Synkad och matchande
-- 'drift'    - Avvikelse detekterad
-- 'error'    - Senaste synk misslyckades
-- 'locked'   - Legacy/migrering/under review (valfritt)
```

**Tillåtna värden för `product_type`:**
- `license` - Basåtkomst
- `addon` - Tillägg
- `consumable` - Förbrukningsprodukt
- `one_time` - Engångsköp
- `bundle` - Paket (framtida)

Skapa ny `product_prices`-tabell:

```sql
CREATE TABLE product_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stripe_price_id text UNIQUE,              -- Genereras av Stripe (kan EJ väljas)
  amount integer NOT NULL,                  -- I öre/cent
  currency text NOT NULL DEFAULT 'NOK',     -- 'NOK', 'SEK', 'EUR'
  interval text NOT NULL,                   -- 'month', 'year', 'one_time'
  interval_count integer DEFAULT 1,
  tax_behavior text DEFAULT 'exclusive',
  billing_model text DEFAULT 'per_seat',    -- Framtidssäkring
  nickname text,
  is_default boolean DEFAULT false,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraint: Endast en default per produkt + valuta + intervall
  UNIQUE (product_id, currency, interval, is_default) WHERE is_default = true
);
```

### Fas 2: Synkroniseringsfunktioner

#### 2.0 Stripe Product ID-strategi

> **Viktigt:** Stripe låter oss välja eget Product ID vid skapande, men Price ID genereras alltid av Stripe.

**Rekommenderat ID-format:**
```
lek_prod_<uuid>           // Produktion
lek_prod_<uuid>_test      // Test-miljö (om flera parallella)
lek_prod_<uuid>_sbx1      // Sandbox 1
```

**Varför egen ID (inte Stripes auto-genererade):**
- Deterministisk: samma ID vid varje bootstrap-körning
- Enklare felsökning och loggning
- Undviker dubletter vid retry/omstart
- Stripe rekommenderar detta för integrationer

#### 2.1 Push till Stripe (Lekbanken → Stripe)

```typescript
// lib/stripe/product-sync.ts

import { stripe } from '@/lib/stripe/config';

export async function pushProductToStripe(productId: string) {
  const product = await getProductFromDB(productId);
  
  // Generera deterministiskt Stripe Product ID
  const stripeProductId = `lek_prod_${product.id}`;
  
  // Idempotency-key för säker retry
  const idempotencyKey = `push_product_${product.id}_${product.updated_at}`;
  
  if (product.stripe_product_id) {
    // UPDATE befintlig Stripe-produkt
    await stripe.products.update(product.stripe_product_id, {
      name: product.name,
      description: product.customer_description,
      active: product.status === 'active',
      metadata: {
        lekbanken_id: product.id,
        product_key: product.product_key,
        category: product.category,
      },
    });
  } else {
    // CREATE ny Stripe-produkt med eget ID
    const stripeProduct = await stripe.products.create({
      id: stripeProductId,  // Egen deterministisk ID
      name: product.name,
      description: product.customer_description,
      active: product.status === 'active',
      metadata: {
        lekbanken_id: product.id,
        product_key: product.product_key,
        category: product.category,
      },
    }, {
      idempotencyKey,
    });
    
    // Spara stripe_product_id lokalt
    await updateProductStripeId(productId, stripeProduct.id);
  }
  
  // Uppdatera sync-status
  await updateSyncStatus(productId, 'synced');
}
```

#### 2.2 Prishantering (immutabla priser)

> **Viktigt:** Stripe Prices är immutabla. Vid prisändring skapar man nytt pris och arkiverar det gamla.

```typescript
export async function syncPriceToStripe(
  productId: string, 
  localPrice: ProductPrice
) {
  const product = await getProductFromDB(productId);
  
  if (!product.stripe_product_id) {
    throw new Error('Product must be synced to Stripe first');
  }
  
  if (localPrice.stripe_price_id) {
    // Pris redan skapat i Stripe - kan inte uppdateras
    // Om belopp ändrats: skapa nytt pris, arkivera detta
    const stripePrice = await stripe.prices.retrieve(localPrice.stripe_price_id);
    
    if (stripePrice.unit_amount !== localPrice.amount) {
      // Belopp ändrat -> skapa nytt pris
      await stripe.prices.update(localPrice.stripe_price_id, { active: false });
      await createNewStripePrice(product, localPrice);
    }
  } else {
    // CREATE nytt Stripe-pris
    await createNewStripePrice(product, localPrice);
  }
}

async function createNewStripePrice(product: Product, localPrice: ProductPrice) {
  const priceData: Stripe.PriceCreateParams = {
    product: product.stripe_product_id!,
    unit_amount: localPrice.amount,
    currency: localPrice.currency.toLowerCase(),
    nickname: localPrice.nickname,
    tax_behavior: localPrice.tax_behavior as Stripe.PriceCreateParams.TaxBehavior,
  };
  
  if (localPrice.interval !== 'one_time') {
    priceData.recurring = {
      interval: localPrice.interval as 'month' | 'year',
      interval_count: localPrice.interval_count,
    };
  }
  
  const stripePrice = await stripe.prices.create(priceData, {
    idempotencyKey: `price_${localPrice.id}_${localPrice.updated_at}`,
  });
  
  // Spara stripe_price_id lokalt
  await updateLocalPriceStripeId(localPrice.id, stripePrice.id);
}
```
```

#### 2.3 Pull från Stripe (Stripe → Lekbanken)

> **OBS:** Pull-funktionen är för inspektion och drift-detektion, INTE för automatisk synk.
> Lokala data ska aldrig automatiskt skrivas över vid pull.

```typescript
export async function pullProductFromStripe(productId: string) {
  const product = await getProductFromDB(productId);
  
  if (!product.stripe_product_id) {
    throw new Error('Product not linked to Stripe');
  }
  
  const stripeProduct = await stripe.products.retrieve(product.stripe_product_id);
  const stripePrices = await stripe.prices.list({ 
    product: product.stripe_product_id,
    active: true,
  });
  
  // Jämför och returnera diff (skriv INTE över lokalt automatiskt)
  return {
    drift_detected: detectDrift(product, stripeProduct).length > 0,
    drift_items: detectDrift(product, stripeProduct),
    stripe_data: stripeProduct,
    prices: stripePrices.data,
  };
}
```

#### 2.4 Drift-detektion med allvarlighetsgrad

```typescript
type DriftSeverity = 'info' | 'warning' | 'critical';

type DriftItem = {
  field: string;
  local_value: string | null;
  stripe_value: string | null;
  severity: DriftSeverity;
};

export function detectDrift(
  local: Product, 
  stripe: Stripe.Product
): DriftItem[] {
  const drifts: DriftItem[] = [];
  
  // CRITICAL: Aktiv-status påverkar fakturering
  const localActive = local.status === 'active';
  if (localActive !== stripe.active) {
    drifts.push({
      field: 'active',
      local_value: String(localActive),
      stripe_value: String(stripe.active),
      severity: 'critical',
    });
  }
  
  // WARNING: Namn visas för kunder
  if (local.name !== stripe.name) {
    drifts.push({
      field: 'name',
      local_value: local.name,
      stripe_value: stripe.name,
      severity: 'warning',
    });
  }
  
  // INFO: Beskrivning är mindre kritisk
  if (local.customer_description !== stripe.description) {
    drifts.push({
      field: 'description',
      local_value: local.customer_description,
      stripe_value: stripe.description,
      severity: 'info',
    });
  }
  
  return drifts;
}
```

### Fas 3: Admin UI-uppdateringar

#### 3.1 Produktredigering

Skapa `/admin/products/[productId]/edit` med:

- **Grundinformation:** Namn, product_key, kategori
- **Beskrivningar:** Intern (admin-only) + Kundbeskrivning (synkas till Stripe)
- **Status:** Draft → Active → Archived
- **Stripe-sektion:** Visa koppling, synk-status, senaste synk

#### 3.2 Prishantering

I produktdetalj-sidan, lägg till tab för priser:

**Prisvarianter (checkbox-val):**
- [ ] Månadsvis
- [ ] Årsvis  
- [ ] Engångsköp

**Per vald variant, ange pris i:**
- NOK (Norska kronor) ✅
- SEK (Svenska kronor) ✅
- EUR (Euro) - lägg till senare

**Regler:**
- Default-pris måste väljas per valuta + intervall
- Vid prisändring: nytt Stripe-pris skapas, gamla arkiveras
- Stripe Price ID visas (read-only)

#### 3.3 Synkroniseringskontroller

| Åtgärd | Beskrivning | När |
|--------|-------------|-----|
| **Synka till Stripe** | Push lokala ändringar till Stripe | Manuellt, eller automatiskt vid Draft→Active |
| **Hämta från Stripe** | Pull och visa Stripe-data (visar diff först) | Manuellt |
| **Lös konflikt** | Vid drift, välj vilken version som ska gälla | När drift detekteras |

#### 3.4 Aktiveringsregler

> **Policy:** Produkter i Lekbanken får inte bli `active` förrän:

1. ✅ `stripe_product_id` finns (produkt skapad i Stripe)
2. ✅ Minst ett aktivt pris finns per relevant valuta
3. ✅ Default-pris valt per variant/valuta
4. ✅ `stripe_sync_status === 'synced'`

### Fas 4: Webhook-integration

Lägg till webhook-hantering för Stripe-initierade ändringar:

```typescript
// app/api/billing/webhooks/stripe/route.ts

case 'product.updated':
case 'product.deleted':
  await handleProductWebhook(event);
  break;

case 'price.created':
case 'price.updated':
case 'price.deleted':
  await handlePriceWebhook(event);
  break;
```

---

## Fält som synkroniseras

### Lekbanken → Stripe

| Lekbanken-fält | Stripe-fält | Kommentar |
|----------------|-------------|-----------|
| `name` | `name` | Produktnamn |
| `customer_description` | `description` | Kundfacing text |
| `status === 'active'` | `active` | Aktiv/inaktiv |
| `product_key` | `metadata.product_key` | För sökning |
| `category` | `metadata.category` | Kategorisering |
| `id` | `metadata.lekbanken_id` | Koppling tillbaka |

### Stripe → Lekbanken (via priser)

| Stripe-fält | Lekbanken-fält | Kommentar |
|-------------|----------------|-----------|
| `price.id` | `stripe_price_id` | Pris-ID |
| `price.unit_amount` | `amount` | Belopp i öre |
| `price.currency` | `currency` | Valuta |
| `price.recurring.interval` | `interval` | Fakturaperiod |

### Endast i Lekbanken (synkas EJ)

- `internal_description` - Admin-anteckningar
- `purposes` - Lekbankens syfte-mappning
- `capabilities` - Feature-gating
- `entitlements` - Tenant-behörigheter
- `availability` - Vem som får köpa

---

## API-endpoints att skapa

```
# Produkthantering
POST   /api/admin/products                    # Skapa produkt
PATCH  /api/admin/products/[id]               # Uppdatera produkt
DELETE /api/admin/products/[id]               # Soft-delete (→ archived)

# Stripe-synkronisering
POST   /api/admin/stripe/bootstrap-products   # Initial bulk-synk (engångs)
POST   /api/admin/products/[id]/sync-stripe   # Push enskild produkt till Stripe
GET    /api/admin/products/[id]/stripe-status # Hämta Stripe-status + drift-check
POST   /api/admin/products/[id]/resolve-drift # Lös konflikt (välj winner)

# Prishantering
POST   /api/admin/products/[id]/prices        # Skapa pris (→ synka till Stripe)
PATCH  /api/admin/products/[id]/prices/[priceId]  # Uppdatera (skapar nytt i Stripe)
DELETE /api/admin/products/[id]/prices/[priceId]  # Arkivera (active=false)
```

---

## Uppskattad arbetsinsats

| Fas | Beskrivning | Tid |
|-----|-------------|-----|
| 0 | Bootstrap-endpoint + exists-hantering | 4-6h |
| 1 | Schema-migration | 2-4h |
| 2 | Synk-funktioner (push/pull/drift) | 8-12h |
| 3 | Admin UI (edit-page, priser) | 8-12h |
| 4 | Webhook-integration | 4-6h |
| 5 | Testning & edge-cases | 4-6h |
| **Totalt** | | **30-46h** |

---

## Risker och överväganden

### 1. Stripe-metadata begränsningar
- Max 50 nycklar per objekt
- Max 500 tecken per värde
- **Lösning:** Lagra rik data i Lekbanken, endast essentiell metadata i Stripe:
  - `lekbanken_id`
  - `product_key`
  - `category`

### 2. Synkroniseringsfel / Idempotens
- Nätverksfel kan orsaka inkonsistens
- **Lösning:** 
  - Idempotency-Key på alla create-requests
  - Retry-logik med exponential backoff
  - `sync_status`-flagga för spårning

### 3. Stripe Prices är immutabla
- Kan inte uppdatera belopp på befintligt pris
- **Lösning:** Vid prisändring → skapa nytt pris, arkivera gammalt

### 4. Webhook-säkerhet
- Signaturverifiering redan implementerad ✅
- Rate-limiting kan behövas för stora volymer

### 5. Concurrent updates
- Vad händer om admin A och admin B redigerar samtidigt?
- **Lösning:** Optimistic locking med `updated_at`

### 6. Stripe Product ID-kollisioner
- Egen ID måste vara unik per Stripe-konto/miljö
- **Lösning:** Format `lek_prod_<uuid>_<env>` för parallella miljöer

---

## Beslut (från ChatGPT-granskning)

### ✅ 1. Automatisk push vid "Aktivera" eller manuell synk?

**Beslut:** Båda.
- **Automatisk push** vid Draft → Active
- **Manuell synk-knapp** för senare ändringar

**Policy:** En produkt får inte bli aktiv utan Stripe-koppling.

### ✅ 2. Flera valutor per produkt?

**Beslut:** Ja i modellen, stegvis i UI.
- **Nu:** NOK + SEK
- **Senare:** EUR för övriga marknader

### ✅ 3. Arkiverade produkter – ta bort eller inaktivera i Stripe?

**Beslut:** ❌ Ta ALDRIG bort produkter i Stripe.
- Sätt `active = false` istället
- Historik, rapporter och befintliga subscriptions kräver detta

### ✅ 4. Befintliga Stripe-produkter utan Lekbanken-koppling?

**Beslut:** Manuellt import-flöde (ej aktuellt nu).
- Stripe sandbox har endast exempelprodukter
- Bootstrap synkar Lekbanken → Stripe

---

## Nästa steg

1. ✅ **Beslut:** Plan validerad med ChatGPT
2. ⬜ **Schema-migration:** Skapa och köra SQL-migration
3. ⬜ **Bootstrap:** Implementera `/api/admin/stripe/bootstrap-products`
4. ⬜ **Core sync:** Implementera `lib/stripe/product-sync.ts`
5. ⬜ **UI:** Bygga redigeringssida och prishantering
6. ⬜ **Test:** Köra bootstrap mot Stripe test-mode

---

## Referenser

- [Stripe Products API](https://docs.stripe.com/api/products)
- [Stripe Prices API](https://docs.stripe.com/api/prices)
- [Stripe Idempotent Requests](https://docs.stripe.com/api/idempotent_requests)
- [Stripe Webhooks](https://docs.stripe.com/webhooks)
- [Stripe Sandboxes](https://docs.stripe.com/sandboxes)

---

*Genererad av GitHub Copilot - 2026-01-08*  
*Granskad av ChatGPT - 2026-01-08*
