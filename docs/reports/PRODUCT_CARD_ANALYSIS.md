# Produktkort Analys - Komplett Fältinventering

**Datum:** 2025-01-08  
**Status:** ✅ Komplett

---

## Sammanfattning

Produktkortet (`ProductDetailPage.tsx`) har analyserats mot databasschemat och API:et. Alla tre steg i implementationen är klara och fälten är korrekt mappade.

---

## 1. Databas → API → UI Fältmappning

### Products Table (Supabase)

| DB-kolumn | API Response | UI Component | Status |
|-----------|--------------|--------------|--------|
| `id` | ✅ `id` | OverviewTab header | ✅ |
| `product_key` | ✅ `product_key` | OverviewTab med CopyButton | ✅ |
| `name` | ✅ `name` | AdminPageHeader titel | ✅ |
| `internal_description` | ✅ `internal_description` | OverviewTab | ✅ |
| `customer_description` | ✅ `customer_description` | SettingsTab input | ✅ |
| `category` | ✅ `category` | OverviewTab badge | ✅ |
| `product_type` | ✅ `product_type` | OverviewTab badge | ✅ |
| `status` | ✅ `status` | StatusBadge + StatusActions | ✅ |
| `stripe_product_id` | ✅ `stripe_product_id` | StripeBadge + CopyButton | ✅ |
| `stripe_sync_status` | ✅ `stripe_sync_status` | SyncStatusBadge | ✅ |
| `stripe_last_synced_at` | ✅ via stripe_linkage | DriftWarning | ✅ |
| `unit_label` | ✅ `unit_label` | SettingsTab select | ✅ |
| `statement_descriptor` | ✅ `statement_descriptor` | SettingsTab input | ✅ |
| `image_url` | ✅ `image_url` | SettingsTab URL + preview | ✅ |
| `target_audience` | ✅ `target_audience` | SettingsTab select | ✅ |
| `feature_tier` | ✅ `feature_tier` | SettingsTab select | ✅ |
| `min_seats` | ✅ `min_seats` | SettingsTab number input | ✅ |
| `max_seats` | ✅ `max_seats` | SettingsTab number input | ✅ |
| `created_at` | ✅ `created_at` | OverviewTab/LifecycleTab | ✅ |
| `updated_at` | ✅ `updated_at` | OverviewTab/LifecycleTab | ✅ |

### Product_Prices Table

| DB-kolumn | API Response | UI Component | Status |
|-----------|--------------|--------------|--------|
| `id` | ✅ `prices[].id` | PriceManager | ✅ |
| `product_id` | ✅ `prices[].product_id` | Implicit | ✅ |
| `stripe_price_id` | ✅ `prices[].stripe_price_id` | PriceRow badge | ✅ |
| `amount` | ✅ `prices[].amount` | PriceRow formatCurrency | ✅ |
| `currency` | ✅ `prices[].currency` | PriceRow + AddPriceForm | ✅ |
| `interval` | ✅ `prices[].interval` | PriceRow label | ✅ |
| `interval_count` | ✅ `prices[].interval_count` | PriceRow | ✅ |
| `tax_behavior` | ✅ `prices[].tax_behavior` | PriceRow badge + AddPriceForm | ✅ |
| `billing_model` | ✅ `prices[].billing_model` | AddPriceForm (default) | ✅ |
| `lookup_key` | ✅ `prices[].lookup_key` | PriceRow 🔑 badge | ✅ |
| `trial_period_days` | ✅ `prices[].trial_period_days` | PriceRow 🎁 badge + AddPriceForm | ✅ |
| `nickname` | ✅ `prices[].nickname` | PriceRow italic text | ✅ |
| `is_default` | ✅ `prices[].is_default` | PriceRow ⭐ star button | ✅ |
| `active` | ✅ `prices[].active` | Implicit (filter) | ✅ |
| `created_at` | ✅ `prices[].created_at` | - | ✅ |
| `updated_at` | ✅ `prices[].updated_at` | - | ✅ |

---

## 2. Stripe Sync Fält

### Produktfält som synkas till Stripe:

| Fält | Stripe Motsvarighet | Status |
|------|---------------------|--------|
| `name` | `product.name` | ✅ |
| `customer_description` | `product.description` | ✅ |
| `image_url` | `product.images[0]` | ✅ |
| `unit_label` | `product.unit_label` | ✅ |
| `statement_descriptor` | `product.statement_descriptor` | ✅ |
| `target_audience` | `metadata.target_audience` | ✅ |
| `feature_tier` | `metadata.feature_tier` | ✅ |
| `min_seats` | `metadata.min_seats` | ✅ |
| `max_seats` | `metadata.max_seats` | ✅ |

### Prisfält som synkas till Stripe:

| Fält | Stripe Motsvarighet | Status |
|------|---------------------|--------|
| `amount` | `price.unit_amount` | ✅ |
| `currency` | `price.currency` | ✅ |
| `interval` | `price.recurring.interval` | ✅ |
| `interval_count` | `price.recurring.interval_count` | ✅ |
| `tax_behavior` | `price.tax_behavior` | ✅ |
| `nickname` | `price.nickname` | ✅ |
| `lookup_key` | `price.lookup_key` | ✅ |
| `billing_model` | `metadata.billing_model` | ✅ |
| `trial_period_days` | `metadata.trial_period_days` | ✅ |

---

## 3. UI Tabs Status

| Tab | Funktion | Status |
|-----|----------|--------|
| **Översikt** | Visar produktinfo, status, Stripe-länkning | ✅ Komplett |
| **Prissättning** | PriceManager med prislista, lägg till pris | ✅ Komplett |
| **Inställningar** | Stripe-synkade fält, strategiska metadata | ✅ Komplett |
| **Entitlements** | Placeholder (future feature) | ⏳ Planerad |
| **Tillgänglighet** | Placeholder (future feature) | ⏳ Planerad |
| **Livscykel** | Placeholder (future feature) | ⏳ Planerad |
| **Logg** | Placeholder (future feature) | ⏳ Planerad |

---

## 4. API Endpoints

| Endpoint | Metod | Funktion | Status |
|----------|-------|----------|--------|
| `/api/admin/products/[productId]` | GET | Hämta produktdetaljer inkl. priser | ✅ |
| `/api/admin/products/[productId]` | PATCH | Uppdatera produktfält | ✅ |
| `/api/admin/products/[productId]/sync-stripe` | POST | Pusha produkt till Stripe | ✅ |
| `/api/admin/products/[productId]/prices` | GET | Lista priser för produkt | ✅ |
| `/api/admin/products/[productId]/prices` | POST | Skapa nytt pris (synka till Stripe) | ✅ |
| `/api/admin/products/[productId]/prices/[priceId]` | PATCH | Uppdatera pris | ✅ |
| `/api/admin/products/[productId]/prices/[priceId]` | DELETE | Ta bort pris | ✅ |
| `/api/admin/products/[productId]/status` | PATCH | Ändra produktstatus | ✅ |

---

## 5. Saknade/Framtida Funktioner

### Ej implementerade (Planned):

1. **Entitlements** - Feature gates per produkt
2. **Produkttillgänglighet** - Tenant allowlist/blocklist
3. **Livscykelhantering** - Publiceringsflöde
4. **Audit Log** - Ändringslogg

### Potentiella förbättringar:

1. **Multipla bilder** - Stripe stödjer upp till 8 bilder
2. **Produktberoenden** - requires/excludes mellan produkter
3. **Tidsbaserade erbjudanden** - Kampanjpriser
4. **Stripewebhooks** - Realtidssynk från Stripe ändringar

---

## 6. Validering & CHECK Constraints

### Products:

- `stripe_sync_status`: `unsynced | synced | drift | error | locked`
- `status`: `draft | active | archived`
- `product_type`: `license | addon | consumable | one_time | bundle`
- `unit_label`: `seat | license | user`
- `target_audience`: `all | school | club | individual | enterprise`
- `feature_tier`: `free | basic | standard | pro | enterprise`
- `statement_descriptor`: max 22 tecken
- `min_seats >= 1`, `max_seats >= min_seats`

### Product_Prices:

- `currency`: `NOK | SEK | EUR`
- `interval`: `month | year | one_time`
- `tax_behavior`: `inclusive | exclusive | unspecified`
- `billing_model`: `per_seat | per_tenant | per_user | flat`
- `trial_period_days >= 0`

---

## Slutsats

**Produktkortet är funktionellt komplett för nuvarande krav.** Alla tre implementationssteg (kritiska fält, UX-förbättringar, strategiska metadata) är genomförda och verifierade.

### Verifierade flöden:

1. ✅ Skapa produkt → Synka till Stripe
2. ✅ Ändra inställningar → Spara → Synka Stripe
3. ✅ Lägg till pris → Auto-synka med lookup_key
4. ✅ Trial period visas i UI och synkas till Stripe metadata
5. ✅ Strategiska fält synkas till Stripe metadata

---

*Genererad av GitHub Copilot - 2025-01-08*
