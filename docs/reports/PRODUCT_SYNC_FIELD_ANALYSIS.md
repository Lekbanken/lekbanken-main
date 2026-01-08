# Produktsynkronisering: Fältanalys & Utökningsförslag

**Datum:** 2026-01-08  
**Status:** Implementerad och verifierad ✅ | Granskad av ChatGPT ✅  
**Syfte:** Specifikation för vilka fält som ska synkroniseras till Stripe

---

## Sammanfattning

Vi har nu en fullt fungerande Stripe-synkronisering för produkter och priser. Denna rapport beskriver:
1. Hur synkroniseringen fungerar tekniskt
2. Vilka fält som synkroniseras idag
3. Vilka fält som är möjliga att lägga till
4. **Affärskritisk klassificering** (från ChatGPT-granskning)
5. Rekommendationer baserat på erfarenhet från implementationen

### Viktiga beslut från granskning

| Fält | Ursprunglig prioritet | Justerad prioritet | Motivering |
|------|----------------------|-------------------|------------|
| `tax_behavior` | ⭐ Rekommenderas | 🔴 **KRITISKT** | Måste vara korrekt innan EU-försäljning |
| `statement_descriptor` | 🔶 Valfritt | 🔴 **Semi-kritiskt** | Nordiska kunder granskar kontoutdrag |
| `unit_label` | ⭐ Rekommenderas | 🔴 **KRITISKT** | Tydlighet på faktura |
| `lookup_key` | ⭐ Rekommenderas | 🟡 Steg 2 | Formatet bör låsas hårt |

---

## 1. Teknisk arkitektur

### 1.1 Dataflöde

```
┌─────────────────────────────────────────────────────────────────┐
│                        LEKBANKEN ADMIN                          │
│  ┌─────────────┐     ┌──────────────┐     ┌─────────────────┐   │
│  │ ProductCard │ ──► │ API Endpoint │ ──► │ Supabase DB     │   │
│  │ (UI)        │     │ /products/   │     │ products +      │   │
│  │             │     │ /prices/     │     │ product_prices  │   │
│  └─────────────┘     └──────────────┘     └────────┬────────┘   │
└────────────────────────────────────────────────────┼────────────┘
                                                     │
                    ┌────────────────────────────────┼────────────┐
                    │              SYNC LAYER        ▼            │
                    │  ┌──────────────────────────────────────┐   │
                    │  │ lib/stripe/product-sync.ts           │   │
                    │  │ - pushProductToStripe()              │   │
                    │  │ - syncPriceToStripe()                │   │
                    │  │ - bootstrapProductsToStripe()        │   │
                    │  └──────────────────────────────────────┘   │
                    └─────────────────────────────────────────────┘
                                                     │
                                                     ▼
                    ┌─────────────────────────────────────────────┐
                    │                  STRIPE                     │
                    │  ┌─────────────────┐  ┌─────────────────┐   │
                    │  │ Products        │  │ Prices          │   │
                    │  │ - id            │  │ - id            │   │
                    │  │ - name          │  │ - unit_amount   │   │
                    │  │ - description   │  │ - currency      │   │
                    │  │ - active        │  │ - recurring     │   │
                    │  │ - metadata      │  │ - metadata      │   │
                    │  └─────────────────┘  └─────────────────┘   │
                    └─────────────────────────────────────────────┘
```

### 1.2 Synkroniseringsflöde

1. **Manuell synk:** Admin klickar "Synka Stripe" → `POST /api/admin/products/[id]/sync-stripe`
2. **Automatisk synk:** Vid Draft → Active (planerat, ej implementerat än)
3. **Prissynk:** Nya priser utan `stripe_price_id` synkas automatiskt vid produktsynk

### 1.3 Viktiga tekniska beslut

| Beslut | Implementation | Motivering |
|--------|----------------|------------|
| **Stripe Product ID** | `lek_prod_<uuid>` | Deterministiskt, idempotent, enkel felsökning |
| **Stripe Price ID** | Genereras av Stripe | Stripe tillåter ej eget ID för priser |
| **Database-klient** | Service Role Client | Kringgår RLS för admin-operationer |
| **Prisändringar** | Nytt pris + arkivera gammalt | Stripe Prices är immutabla |

---

## 2. Fält som synkroniseras idag

### 2.1 Produktfält (Lekbanken → Stripe Product)

| Lekbanken-fält | Stripe-fält | Beskrivning | Editeras i UI |
|----------------|-------------|-------------|---------------|
| `name` | `name` | Produktens namn | ✅ Ja |
| `customer_description` | `description` | Kundfacing beskrivning | ✅ Ja |
| `status === 'active'` | `active` | Om produkten är aktiv | ✅ Ja |
| `id` | `metadata.lekbanken_product_id` | Koppling tillbaka | ❌ Auto |
| `product_key` | `metadata.product_key` | Unik nyckel | ❌ Read-only |
| `category` | `metadata.category` | Kategorisering | ✅ Ja |

### 2.2 Prisfält (Lekbanken → Stripe Price)

| Lekbanken-fält | Stripe-fält | Beskrivning | Editeras i UI |
|----------------|-------------|-------------|---------------|
| `amount` | `unit_amount` | Belopp i öre/cents | ✅ Ja |
| `currency` | `currency` | Valutakod (NOK/SEK) | ✅ Ja |
| `interval` | `recurring.interval` | month/year/one_time | ✅ Ja |
| `interval_count` | `recurring.interval_count` | Antal perioder | ✅ Ja |
| `id` | `metadata.lekbanken_price_id` | Koppling tillbaka | ❌ Auto |
| `product_id` | `metadata.lekbanken_product_id` | Produkt-referens | ❌ Auto |
| `billing_model` | `metadata.billing_model` | per_seat/flat | ✅ Ja |

### 2.3 Metadata-strategi

Stripe metadata används för:
- **Koppling:** `lekbanken_product_id`, `lekbanken_price_id`
- **Sökbarhet:** `product_key`, `category`
- **Affärslogik:** `billing_model`, `source`

**Begränsningar:**
- Max 50 metadata-nycklar per objekt
- Max 500 tecken per värde
- Endast strängar (inga objekt/arrayer)

---

## 3. Affärskritisk klassificering (ChatGPT-granskning)

### 3.1 🔴 Affärs- och faktureringskritiska (MÅSTE vara korrekta)

Dessa fält har direkt påverkan på **intäkter, moms, kundförståelse och juridiskt underlag**.

#### Produktnivå

| Fält | Status | Kommentar |
|------|--------|-----------|
| `name` | ✅ Synkas | Produktnamn på faktura |
| `active` | ✅ Synkas | Styr om produkten kan köpas |
| `unit_label` | ✅ **Implementerat** | "3 seats × 299 kr" - tydlighet |
| `statement_descriptor` | ✅ **Implementerat** | Max 22 tecken, visas på kontoutdrag |

#### Prisnivå

| Fält | Status | Kommentar |
|------|--------|-----------|
| `unit_amount` | ✅ Synkas | Pris i öre/cents |
| `currency` | ✅ Synkas | NOK/SEK/EUR |
| `recurring.interval` | ✅ Synkas | month/year |
| `interval_count` | ✅ Synkas | Antal perioder |
| `tax_behavior` | ✅ **Implementerat** | inclusive/exclusive/unspecified |

> ⚠️ **Tax behavior är inte "nice to have"** när ni kör NOK + SEK + EUR.  
> Detta är ett MÅSTE innan ni öppnar bredare försäljning.

### 3.2 🟡 Affärsstyrande (påverkar conversion, ej bokföring)

| Fält | Påverkan | Prioritet |
|------|----------|-----------|
| `images` | Checkout-UX, kundfacing | Steg 2 |
| `nickname` | Admin-förståelse | Steg 2 |
| `lookup_key` | Intern kontroll, kod-referens | Steg 2 |
| `billing_model` | Metadata för affärslogik | ✅ Implementerat |
| `min_seats` / `max_seats` | Begränsningar | Steg 3 |

Dessa kan justeras utan ekonomisk katastrof.

### 3.3 🟢 Operativa / strategiska (Lekbanken-first, ej Stripe)

| Fält | Rekommendation |
|------|----------------|
| `target_audience` | Håll grov i Stripe, rik i Lekbanken |
| `feature_tier` | Lokal regelmotor, ej Stripe-beroende |
| `launch_date` | Endast metadata eller lokalt |
| `sunset_date` | Endast metadata eller lokalt |

> ✅ **Korrekt beslut:** Dessa ska aldrig bli beroenden i Stripe-flödet eller styra Checkout direkt.

---

## 4. Möjliga fält att lägga till

### 3.1 Stripe Product-fält (tillgängliga)

| Stripe-fält | Typ | Beskrivning | Rekommendation |
|-------------|-----|-------------|----------------|
| `images` | string[] | Produktbilder (max 8 URLs) | ⭐ Rekommenderas |
| `url` | string | Extern produkt-URL | 🔶 Valfritt |
| `shippable` | boolean | Fysisk produkt | ❌ Ej relevant |
| `unit_label` | string | Enhetsetikett (t.ex. "seat") | ⭐ Rekommenderas |
| `statement_descriptor` | string | Text på kontoutdrag | 🔶 Valfritt |
| `tax_code` | string | Skattekod | 🔶 Framtida |
| `default_price` | string | Standard-pris ID | ✅ Redan planerat |

### 3.2 Stripe Price-fält (tillgängliga)

| Stripe-fält | Typ | Beskrivning | Rekommendation |
|-------------|-----|-------------|----------------|
| `nickname` | string | Internt namn för priset | ⭐ Rekommenderas |
| `tax_behavior` | string | inclusive/exclusive/unspecified | ⭐ Rekommenderas |
| `billing_scheme` | string | per_unit/tiered | 🔶 Framtida |
| `tiers_mode` | string | graduated/volume | 🔶 Framtida |
| `tiers` | array | Prissättning per nivå | 🔶 Framtida |
| `lookup_key` | string | Sökbar nyckel | ⭐ Rekommenderas |
| `transform_quantity` | object | Kvantitetstransformering | ❌ Komplext |

### 3.3 Metadata-fält att överväga

| Fält | Användning | Rekommendation |
|------|------------|----------------|
| `target_audience` | "school", "club", "individual" | ⭐ Användbart |
| `feature_tier` | "basic", "pro", "enterprise" | ⭐ Användbart |
| `trial_days` | Antal provdagar | 🔶 Valfritt |
| `min_seats` | Minsta antal platser | ⭐ Användbart |
| `max_seats` | Högsta antal platser | ⭐ Användbart |
| `launch_date` | Lanseringsdatum | 🔶 Valfritt |
| `sunset_date` | Avvecklingsdatum | 🔶 Valfritt |

---

## 4. Rekommenderade utökningar

### 4.1 Prioritet 1: Bör implementeras

#### A) Produktbilder (`images`)

```typescript
// Nytt fält i products-tabellen
image_url text;  // Primär produktbild

// Synkronisering
await stripe.products.update(stripeProductId, {
  images: product.image_url ? [product.image_url] : [],
});
```

**Motivering:** Produktbilder visas i Stripe Checkout och kundfakturor.

#### B) Unit Label (`unit_label`)

```typescript
// Nytt fält i products-tabellen
unit_label text DEFAULT 'seat';  -- 'seat', 'license', 'user'

// Synkronisering
await stripe.products.update(stripeProductId, {
  unit_label: product.unit_label,
});
```

**Motivering:** Tydliggör vad kunden betalar för ("3 seats × 299 kr").

#### C) Prisens Nickname (`nickname`)

```typescript
// Redan i product_prices
nickname text;  -- t.ex. "Månadsplan Standard"

// Synkronisering (redan implementerat men ej i UI)
priceData.nickname = localPrice.nickname;
```

**Motivering:** Hjälper admin identifiera priser i Stripe Dashboard.

#### D) Tax Behavior

```typescript
// Nytt fält i product_prices
tax_behavior text DEFAULT 'exclusive';  -- 'inclusive', 'exclusive', 'unspecified'
```

**Motivering:** Viktigt för korrekt momshantering i olika marknader.

### 4.2 Prioritet 2: Bra att ha

#### A) Statement Descriptor

```typescript
// Nytt fält i products-tabellen  
statement_descriptor text;  -- Max 22 tecken

// Synkronisering
await stripe.products.update(stripeProductId, {
  statement_descriptor: product.statement_descriptor,
});
```

**Motivering:** Hjälper kunder känna igen köpet på kontoutdrag.

#### B) Lookup Key för priser

```typescript
// Formaliserat format (ChatGPT-rekommendation)
// <product_key>:<currency>:<interval>:<interval_count?>
lookup_key: `${product.product_key}:${price.currency}:${price.interval}:${price.interval_count}`

// Exempel:
// basket:nok:month:1
// basket:sek:year:1
// basket:eur:one_time
```

**Motivering:** 
- Tydligare än underscore-separator
- Mindre risk för kollisioner
- Enklare att generera deterministiskt
- Kan parsas tillbaka till komponenter

### 4.3 Prioritet 3: Framtida

- **Tiered Pricing:** Volymrabatter (t.ex. 1-10 seats: 299 kr, 11-50: 249 kr)
- **Metered Billing:** Användningsbaserad fakturering
- **Tax Codes:** Automatisk skattehantering per region

---

## 5. Förslag på utökat produktkort

### 5.1 Nuvarande fält i ProductDetailPage

```
┌─────────────────────────────────────────────────────────────┐
│ Produkt: Basket                                             │
├─────────────────────────────────────────────────────────────┤
│ Grundinformation                                            │
│ ├─ Namn: Basket                                             │
│ ├─ Produktnyckel: basket (read-only)                        │
│ ├─ Kategori: sport                                          │
│ └─ Status: active                                           │
├─────────────────────────────────────────────────────────────┤
│ Beskrivningar                                               │
│ ├─ Intern beskrivning: (ej synkad till Stripe)              │
│ └─ Kundbeskrivning: (→ Stripe description)                  │
├─────────────────────────────────────────────────────────────┤
│ Priser                                                      │
│ ├─ 299 NOK/månad (synkad ✓)                                 │
│ └─ 2990 NOK/år (synkad ✓)                                   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Föreslaget utökat produktkort

```
┌─────────────────────────────────────────────────────────────┐
│ Produkt: Basket                                     [Synka] │
├─────────────────────────────────────────────────────────────┤
│ GRUNDINFORMATION                                            │
│ ├─ Namn*: Basket                                            │
│ ├─ Produktnyckel: basket (read-only)                        │
│ ├─ Kategori*: sport                                         │
│ ├─ Status*: active | draft | archived                       │
│ └─ Produkttyp*: license | addon | consumable                │
├─────────────────────────────────────────────────────────────┤
│ VISUELLT                                          [NYTT]    │
│ ├─ Produktbild: [Ladda upp] eller [URL]                     │
│ └─ Unit Label: seat | license | user                        │
├─────────────────────────────────────────────────────────────┤
│ BESKRIVNINGAR                                               │
│ ├─ Intern beskrivning: (endast admin, ej synkad)            │
│ ├─ Kundbeskrivning*: (→ Stripe description)                 │
│ └─ Kontoutdragstext: LEKBANKEN BASKET (max 22 tecken)       │
├─────────────────────────────────────────────────────────────┤
│ MÅLGRUPP & BEGRÄNSNINGAR                          [NYTT]    │
│ ├─ Målgrupp: school | club | individual                     │
│ ├─ Feature Tier: basic | pro | enterprise                   │
│ ├─ Min antal platser: 1                                     │
│ └─ Max antal platser: 100                                   │
├─────────────────────────────────────────────────────────────┤
│ PRISER                                                      │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 299 NOK/månad                                           │ │
│ │ ├─ Nickname: Standard Månadsplan                        │ │
│ │ ├─ Moms: Exklusive                                      │ │
│ │ ├─ Lookup Key: basket_nok_month                         │ │
│ │ └─ Stripe ID: price_1Abc... ✓                           │ │
│ └─────────────────────────────────────────────────────────┘ │
│ [+ Lägg till pris]                                          │
├─────────────────────────────────────────────────────────────┤
│ STRIPE-KOPPLING                                             │
│ ├─ Stripe Product ID: lek_prod_abc123...                    │
│ ├─ Synk-status: ✓ Synkad                                    │
│ └─ Senast synkad: 2026-01-08 14:32                          │
└─────────────────────────────────────────────────────────────┘

* = Synkroniseras till Stripe
```

---

## 7. Riskanalys: Klassiska enterprise-fallgropar

### Risk 1: Stripe blir "sekundär admin"

**Problem:** Någon "fixar bilden snabbt i Stripe Dashboard" → drift ni inte vill felsöka.

**Motmedel:**
- ❌ Inga fält ska vara primärt editerbara i Stripe
- ✅ Stripe Dashboard = observability, inte konfiguration
- ✅ All konfiguration sker i Lekbanken Admin

### Risk 2: Prislogik sprids

**Problem:** Prisregler hamnar delvis i Stripe, delvis i Lekbanken.

**Motmedel:**
- ✅ Alla prisregler definieras i Lekbanken
- ✅ Stripe Prices = tekniska artefakter
- ✅ Ni är helt rätt här redan

### Risk 3: Otydlig koppling produkt → entitlement

**Problem:** Stripe börjar "veta" vad en produkt ger tillgång till.

**Motmedel (framtida):**
- Koppla `product_key` / `feature_tier` till internt entitlement-lager
- Stripe ska aldrig veta vad en produkt ger tillgång till
- Entitlements = Lekbankens domän, inte Stripes

### Risk 4: Metadata-budget tar slut

**Varning:** Stripe metadata är en begränsad resurs (max 50 nycklar).

**Motmedel:**
- ❌ Lägg aldrig "framtidsfält" i metadata "för säkerhets skull"
- ✅ Varje nytt metadatafält ska ha en ägare och ett use-case
- ✅ Håll metadata minimalt: koppling + sökbarhet

---

## 8. Svar på öppna frågor (ChatGPT-validerade)

### 1. Vilka fält är affärskritiska?

**Svar:** `amount`, `currency`, `interval`, `tax_behavior`, `active`, `unit_label`, `statement_descriptor`

Allt annat är stödjande.

### 2. Målgrupp-segmentering – hur detaljerad?

**Rekommendation:**
- **Stripe:** Håll den grov (metadata `target_audience = club` eller utelämna helt)
- **Lekbanken:** Gör den rik med full regelmotor (tenant type, org size, region)

### 3. Tiered pricing / metered billing?

**Rekommendation:**
- ❌ Inte nu
- ✅ Förbered datamodellen (ni har redan gjort det)
- 🚦 **Trigger:** När ni har faktiska kundcase

Tiered pricing är en produktstrategisk fråga, inte teknisk.

### 4. Multi-valuta: EUR?

**Rekommendation:** Ja, men **inför som "supported but hidden"**

Låt EUR finnas i modellen, men inte i UI förrän:
- Momslogik är klar
- Juridiska texter finns
- Supportprocesser är redo

### 5. Produktbilder – var ska de lagras?

**Tydlig rekommendation:** Supabase Storage + CDN

```
Lekbanken Admin → Supabase Storage → CDN URL → Stripe (images[])
```

**Fördelar:**
- Versionering
- Åtkomstkontroll
- White-label i framtiden
- Stripe får bara URL (read-only spegling)

### 6. Trial days – per produkt eller per pris?

**Enterprise-best practice:** Per pris, inte per produkt

**Varför:**
- Olika billing-intervall kan kräva olika trial
- Kampanjer blir enklare
- Mindre specialfall i subscriptions

---

## 9. Erfarenheter från implementationen

### 6.1 Vad fungerade bra

1. **Deterministiska Product IDs:** `lek_prod_<uuid>` gör synken idempotent
2. **Service Role Client:** Undviker RLS-problem för admin-operationer
3. **Separata priser-tabell:** Renare datamodell, enklare hantering
4. **Metadata-strategi:** Koppling via `lekbanken_*_id` fungerar utmärkt

### 6.2 Utmaningar vi löste

| Problem | Lösning |
|---------|---------|
| RLS blockerade admin | Bytte till Service Role Client |
| Priser visades inte | Uppdaterade API att hämta priser separat |
| "Redan synkad" för osynkade priser | Lade till check för `!stripe_price_id` |
| Route-konflikt [id] vs [productId] | Konsekvent namngivning i alla routes |

### 6.3 Rekommendationer för framtida fält

1. **Lägg alltid till i DB först** - Schema-migration före synk-logik
2. **Undvik beroenden mellan fält** - Synka fält oberoende av varandra
3. **Validera på båda sidor** - Lekbanken validerar innan push
4. **Metadata för Lekbanken-specifikt** - Stripe-fält för standard, metadata för custom
5. **Testa i Sandbox först** - Alltid verifiera mot Stripe Sandbox

---

## 10. Prioriterad implementationsordning (justerad)

### Steg 1: NU – Innan bred lansering ✅ KOMPLETT

| Fält | Typ | Status | Beskrivning |
|------|-----|--------|-------------|
| Grundläggande synk | - | ✅ KLAR | Produkt + priser synkas |
| `tax_behavior` | Price | ✅ KLAR | inclusive/exclusive/unspecified |
| `unit_label` | Product | ✅ KLAR | "seat", "license", "user" |
| `statement_descriptor` | Product | ✅ KLAR | Text på kontoutdrag (max 22 tecken) |
| `lookup_key` | Price | ✅ KLAR | Genereras automatiskt: `product_key:currency:interval:count` |

**Implementerat 2026-01-08:**
- Databas-migration med nya kolumner och constraints
- Inställningar-flik i ProductDetailPage för unit_label, statement_descriptor
- Tax behavior dropdown i PriceManager
- Automatisk `stripe_sync_status = 'unsynced'` vid fältändringar
- Synk-endpoint kopplad till `pushProductToStripe()`

### Steg 2: UX & Admin-kvalitet ✅ KOMPLETT

| Fält | Typ | Status | Beskrivning |
|------|-----|--------|-------------|
| Produktbilder (`images`) | Product | ✅ KLAR | URL till bild, synkas till Stripe images[] |
| `nickname` | Price | ✅ KLAR | Finns i formulär och synkas till Stripe |
| Visa `lookup_key` i UI | Price | ✅ KLAR | Read-only visning med 🔑-ikon |

**Implementerat 2026-01-08:**
- Databas-migration: `20260108140000_add_product_images.sql`
- Bild-URL fält i SettingsTab med förhandsvisning
- `image_url` synkas till Stripe `images[]`
- Lookup key visas som badge i PriceRow

### Steg 3: Strategiskt 🟢

| Fält | Typ | Beskrivning |
|------|-----|-------------|
| Målgrupp / feature tier | Metadata | Segmentering |
| Trial logic | Price | `trial_period_days` |
| EUR-exponering | - | UI-stöd för EUR |
| `min_seats` / `max_seats` | Metadata | Platsbegränsningar |

---

## 11. Tekniska filer (referens)

| Fil | Syfte |
|-----|-------|
| `lib/stripe/product-sync.ts` | Synk-logik |
| `app/api/admin/products/[productId]/sync-stripe/route.ts` | Synk-endpoint |
| `app/api/admin/products/[productId]/prices/route.ts` | Pris-CRUD |
| `features/admin/products/v2/PriceManager.tsx` | Pris-UI |
| `supabase/migrations/20260108100000_product_stripe_sync.sql` | Schema |

---

## 12. Schema-ändringar för Steg 1

### Migration: Lägg till kritiska fält

```sql
-- Migration: 20260108120000_add_critical_stripe_fields.sql

-- Produktnivå
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS unit_label text DEFAULT 'seat',
  ADD COLUMN IF NOT EXISTS statement_descriptor text;

-- Validering: statement_descriptor max 22 tecken
ALTER TABLE products
  ADD CONSTRAINT statement_descriptor_length 
  CHECK (statement_descriptor IS NULL OR length(statement_descriptor) <= 22);

-- Prisnivå  
ALTER TABLE product_prices
  ADD COLUMN IF NOT EXISTS tax_behavior text DEFAULT 'exclusive',
  ADD COLUMN IF NOT EXISTS lookup_key text UNIQUE;

-- Validering: tax_behavior måste vara giltig
ALTER TABLE product_prices
  ADD CONSTRAINT tax_behavior_valid 
  CHECK (tax_behavior IN ('inclusive', 'exclusive', 'unspecified'));

-- Index för lookup_key
CREATE INDEX IF NOT EXISTS idx_product_prices_lookup_key 
  ON product_prices(lookup_key) WHERE lookup_key IS NOT NULL;
```

### TypeScript-typer att uppdatera

```typescript
// types/product.ts - utöka ProductPrice
interface ProductPrice {
  // ... befintliga fält
  tax_behavior: 'inclusive' | 'exclusive' | 'unspecified';
  lookup_key?: string;
}

// types/product.ts - utöka Product
interface Product {
  // ... befintliga fält
  unit_label?: 'seat' | 'license' | 'user';
  statement_descriptor?: string; // max 22 chars
}
```

---

*Genererad av GitHub Copilot - 2026-01-08*  
*Granskad av ChatGPT - 2026-01-08*
