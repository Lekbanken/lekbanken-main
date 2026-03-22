# STRIPE INTEGRATION - INVENTERINGSRAPPORT

## Metadata

- Owner: -
- Status: historical snapshot
- Date: 2025-12-10
- Last updated: 2026-03-21
- Last validated: -

> Historisk inventeringsrapport för Stripe-integrationen. Behåll som tidigare nulägesbild, inte som aktuell integrationsoöversikt.

*Datum: 2025-12-10*

## ✅ VAD SOM FINNS IMPLEMENTERAT

### 1. STRIPE SDK & KONFIGURATION
- **Paket**: `stripe@^16.6.0` (senaste version)
- **API Version**: `2024-06-20`
- **Initiering**: Sker per endpoint (INTE centraliserat)
- **Keys i .env.local**:
  - `STRIPE_SECRET_KEY` - Dubblerad! Både test OCH live key
  - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Dubblerad! Både test OCH live key  
  - `STRIPE_WEBHOOK_SECRET` - En key (okänd om test/live)

### 2. BACKEND ENDPOINTS

#### Implementerade API Routes:
1. **`POST /api/billing/tenants/[tenantId]/stripe-customer`**
   - Skapar Stripe Customer
   - Sparar customer_id i `billing_accounts` tabell
   - **Status**: ✅ Fungerande men saknar Tax setup

2. **`POST /api/billing/tenants/[tenantId]/invoices/stripe`**
   - Skapar Stripe Invoice med `send_invoice` (B2B-faktura)
   - Använder `invoiceItems` + `invoices.create`
   - **Status**: ✅ Fungerande för faktura-flow

3. **`POST /api/billing/webhooks/stripe`**
   - Hanterar webhooks från Stripe
   - Verifierar signatur
   - Loggar alla events till `billing_events`
   - Hanterar: `invoice.paid`, `invoice.payment_failed`, `invoice.payment_succeeded`
   - **Status**: ⚠️ Partiellt - saknar subscription events

#### SAKNAS:
- ❌ **Subscription Creation Endpoint** - Ingen endpoint för att skapa Stripe Subscriptions
- ❌ **Payment Intent Endpoint** - Ingen endpoint för Payment Element (client_secret)
- ❌ **Setup Intent Endpoint** - Ingen endpoint för att spara betalkort
- ❌ **Customer Portal** - Ingen länk till Stripe Customer Portal
- ❌ **Tax Configuration** - Ingen Stripe Tax aktivering

### 3. DATABASE SCHEMA

#### Tabeller med Stripe-koppling:
1. **`billing_accounts`**
   - `provider_customer_id` - Stripe Customer ID
   - `tenant_id` - Koppling till tenant
   - **Status**: ✅ Korrekt design

2. **`subscriptions`** (gammal tabell?)
   - `stripe_subscription_id`
   - `stripe_customer_id`
   - **Status**: ⚠️ Används INTE i koden - eventuellt legacy

3. **`tenant_subscriptions`** (ny tabell)
   - `billing_product_id`
   - `status` - Enum: subscription_status_enum
   - `renewal_date`, `cancelled_at`
   - **Status**: ⚠️ SAKNAR `stripe_subscription_id` kolumn!

4. **`invoices`**
   - `stripe_invoice_id` - Koppling till Stripe Invoice
   - **Status**: ✅ Korrekt

5. **`billing_events`**
   - Loggar alla Stripe webhooks
   - **Status**: ✅ Korrekt

#### DATABASPROBLEM:
- ❌ `tenant_subscriptions` saknar `stripe_subscription_id` kolumn
- ⚠️ Två subscription-tabeller: `subscriptions` och `tenant_subscriptions`
- ❌ Ingen `payment_methods` tabell för sparade kort

### 4. FRONTEND KOMPONENTER
**RESULTAT**: ❌ INGA STRIPE KOMPONENTER HITTADE
- Ingen Payment Element implementation
- Ingen Stripe.js / @stripe/react-stripe-js användning
- Ingen checkout/betalningssida

### 5. ENV-PROBLEM

**.env.local har KRITISKA PROBLEM:**
```env
# DUBBLERADE KEYS - Sista värdet vinner!
STRIPE_SECRET_KEY=sk_test_... 
STRIPE_SECRET_KEY=sk_live_...  ❌ Skriver över test-key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... ❌ Skriver över test-key
```

**SAKNAS:**
- ❌ Ingen `NODE_ENV`-baserad key-selector
- ❌ Ingen `STRIPE_TEST_*` / `STRIPE_LIVE_*` separation
- ❌ Ingen validation av keys vid start
- ❌ Feature flag `STRIPE_ENABLED` används men inte satt

---

## 🔴 KRITISKA PROBLEM

### 1. NYCKLAR
- **Live-nycklar aktiva i dev!** - Farligt!
- Ingen miljö-baserad key-switching
- Publishable key exponerad i client (korrekt) men ingen test/live-logik

### 2. SUBSCRIPTION FLOW
- **Ingen Stripe Subscription-hantering**
- Ingen Payment Element för kort-betalning
- Ingen automatisk förnyelse
- Webhook hanterar inte `customer.subscription.*` events

### 3. TAX
- **Stripe Tax INTE aktiverat**
- Ingen `automatic_tax: { enabled: true }` på invoices/subscriptions
- Ingen `tax_id_collection` för B2B

### 4. ARKITEKTUR
- Stripe initieras på 3 ställen (DRY-problem)
- Ingen central `stripeClient.ts`
- Ingen error-handling utility
- Ingen retry-logik

### 5. SÄKERHET
- Webhook secret delas mellan test/live (troligen test-secret)
- Ingen IP-whitelist validation

---

## ✅ DATABAS-MODELL (Föreslagen)

### Befintliga Tabeller (bra):
- ✅ `billing_accounts` - Stripe Customer koppling
- ✅ `invoices` - Stripe Invoice koppling
- ✅ `billing_events` - Webhook log
- ✅ `payments` - Betalningshistorik

### Behöver Migration:
```sql
-- Lägg till Stripe subscription ID i tenant_subscriptions
ALTER TABLE tenant_subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

-- Skapa index
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_stripe 
ON tenant_subscriptions(stripe_subscription_id);

-- Ny tabell för Payment Methods (sparade kort)
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'card', 'sepa_debit', etc
  last4 TEXT,
  brand TEXT, -- 'visa', 'mastercard', etc
  exp_month INTEGER,
  exp_year INTEGER,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📋 IMPLEMENTATIONSPLAN

### FAS 1: FOUNDATION (Kritisk)
1. ✅ Centralisera Stripe-klient
2. ✅ Fixa env-variabler (test/live separation)
3. ✅ Lägg till defensiva checks
4. ✅ Skapa Payment Methods tabell
5. ✅ Lägg till stripe_subscription_id i tenant_subscriptions

### FAS 2: SUBSCRIPTION FLOW
1. ✅ Skapa `POST /api/billing/create-subscription`
2. ✅ Aktivera Stripe Tax
3. ✅ Implementera Payment Element frontend
4. ✅ Hantera subscription webhooks

### FAS 3: CLEANUP
1. ✅ Ta bort gammal `subscriptions` tabell (om oanvänd)
2. ✅ Dokumentera i docs/stripe.md
3. ✅ Lägg till tester

---

## 🎯 NÄSTA STEG
Se `STRIPE_IMPLEMENTATION.md` för detaljerad implementationsplan.
