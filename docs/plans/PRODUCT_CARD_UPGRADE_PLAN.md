# ProductCard IA/UX/UI + Stripe Governance Upgrade Plan

## Metadata

- Owner: -
- Status: draft
- Date: 2026-01-08
- Last updated: 2026-03-21
- Last validated: -

> Draft upgrade plan for ProductCard IA, UX, UI, and Stripe governance.

**Datum:** 2026-01-08  
**Status:** 🔄 Pågående (Sprint 1-4 klart)  
**Prioritet:** Hög

---

## Översikt

Komplett omdesign av Produktkortet (`ProductDetailPage`) för enterprise-kvalitet med fokus på:
- Tydlig separation mellan Lekbanken-domän och Stripe-synk
- Robust governance med readiness checks och audit trail
- Skalbar UX för tusentals produkter/priser

---

## Sprint 1: Shared Components & Grundstruktur ✅ KLAR

### TODO 1.1: Extrahera shared components
- [x] Flytta `StatusBadge` → `components/admin/shared/StatusBadges.tsx`
- [x] Flytta `CopyButton` → `components/ui/copy-button.tsx`
- [x] Skapa `components/admin/shared/FieldComponents.tsx` (FieldLabel, ReadOnlyField, FieldGroup, InfoBox)
- [x] Skapa `components/admin/shared/DiffView.tsx` för drift visualization
- [x] Uppdatera imports i ProductDetailPage

### TODO 1.2: Centralisera constants
- [x] Skapa `lib/constants/billing.ts` med UNIT_LABELS, CURRENCIES, INTERVALS, TAX_BEHAVIORS
- [x] Ta bort duplicerade constants från PriceManager.tsx
- [x] Exportera alla typer: UnitLabelType, TargetAudienceType, FeatureTierType, etc.

### TODO 1.3: Rensa PriceManager duplicerad typ
- [x] PriceManager använder nu centraliserade constants
- [x] Importerar typer från billing.ts

---

## Sprint 2: Ny Flikstruktur (IA) ✅ KLAR

### TODO 2.1: Skapa ny Stripe-flik
- [x] Skapa `features/admin/products/v2/StripeTab.tsx`
- [x] Flytta synk-fält: image_url, unit_label, statement_descriptor
- [x] Flytta metadata-fält: target_audience, feature_tier
- [x] Lägg till synk-status display (SyncStatusBanner)
- [x] Lägg till "Spara lokalt" + "Synka till Stripe" knappar

### TODO 2.2: Refaktorera SettingsTab
- [x] Ta bort Stripe-fält (nu i StripeTab)
- [x] Behåll endast: customer_description, min_seats, max_seats
- [x] Förenklade formulär

### TODO 2.3: Förbättra AvailabilityTab
- [x] Visa min_seats, max_seats info
- [x] Förbättrad tenant assignments display
- [x] Info-kort om tillgänglighetstyper

### TODO 2.4: Uppdatera flikordning
- [x] Ny ordning: overview, pricing, stripe, settings, availability, entitlements, lifecycle
- [x] Uppdaterat ProductCardTab type

---

## Sprint 3: Stripe Governance ✅ KLAR

### TODO 3.1: Diff View komponent
- [x] Skapa `components/admin/shared/DiffView.tsx`
- [x] Props: diffs array med localValue, remoteValue, fieldName
- [x] Visa sida-vid-sida jämförelse
- [x] Action buttons: "Använd lokalt" (synkar till Stripe)

### TODO 3.2: Implementera drift detection
- [x] StripeTab visar DiffView när status === 'drift'
- [x] Integrerat med stripe_linkage.drift_details

### TODO 3.3: Synk-status banner
- [x] SyncStatusBanner komponent i StripeTab
- [x] Visar: connected (grön), drift (amber), missing (grå), error (röd)
- [x] Visar timestamp och Stripe Product ID

---

## Sprint 4: Readiness & Governance ✅ KLAR

### TODO 4.1: Readiness checks hook
- [x] Skapa `hooks/useProductReadiness.ts`
- [x] Checks: name, price, unit_label, synced status
- [x] Returns: isReady, blockers, warnings

### TODO 4.2: Readiness banner
- [x] Visa i OverviewTab med färgkodning
- [x] Grönt för "Redo för publicering"
- [x] Amber för "Ej redo" med länk till checklista

### TODO 4.3: Status transition actions
- [x] LifecycleTab har aktivera/inaktivera/arkivera knappar
- [x] Readiness summary med checklista
- [x] Integrerad audit log i LifecycleTab

### TODO 4.4: Quick actions i OverviewTab
- [x] Snabbåtgärder: Hantera priser, Stripe-inställningar, Entitlements, Livscykel
- [x] Stripe-status kort med koppling och synk-info
- [ ] Disable "Aktivera" knapp om blockers finns
- [ ] Tooltip på knappen visar varför

### TODO 4.3: Status transition validation
- [ ] `draft → active`: Kräver isReady === true
- [ ] Bekräftelse-modal vid statusändring
- [ ] Visa vad som kommer hända (t.ex. "Produkten blir synlig för kunder")

---

## Sprint 5: Pris UX Förbättringar ✅ KLAR

### TODO 5.1: Pris-gruppering per valuta
- [x] Gruppera priser i PriceManager efter currency
- [x] Collapsible sections per valuta
- [x] "Lägg till pris" inom varje valuta-grupp

### TODO 5.2: Default-pris bekräftelse
- [x] Modal vid "Set default" om det finns befintlig default
- [x] Visa vilken som är nuvarande default
- [x] Bekräfta byte

### TODO 5.3: Tax behavior varning
- [x] Visa varningstext vid ändring av tax_behavior
- [x] "⚠️ Kan inte ändras efter Stripe-sync" tooltip
- [x] Disable för priser med stripe_price_id

### TODO 5.4: Trial period validering
- [x] Disable trial_period_days för one_time priser
- [x] Visuell indikation att trial är disabled

---

## Sprint 6: Audit Log & Database ✅ KLAR

### TODO 6.1: Database migration
- [x] Skapa `product_audit_log` tabell (20260108160000_product_audit_log.sql)
- [x] Kolumner: id, product_id, event_type, event_data (jsonb), actor_id, actor_email, created_at
- [x] Index på (product_id, created_at DESC)
- [x] RLS policies för system_admin access

### TODO 6.2: Audit logging i API
- [x] lib/services/productAudit.server.ts skapad
- [x] Logga statusändringar (status/route.ts)
- [x] Logga fältändringar (route.ts PATCH)
- [x] Logga Stripe-synk resultat (sync-stripe/route.ts)
- [x] Logga prisändringar (prices/route.ts, prices/[priceId]/route.ts)

### TODO 6.3: Timeline UI
- [x] AUDIT_EVENT_META i types.ts med label, icon, color
- [x] EventDetails komponent i ProductDetailPage.tsx
- [x] Visar ändrade fält, status-övergångar, prisinfo, fel

### TODO 6.4: Integrera i Livscykel-flik
- [x] Hämta audit log för produkt (via product.recent_audit_events)
- [x] Visa event timeline i LifecycleTab
- [x] /api/admin/products/[productId]/audit endpoint med pagination

---

## Sprint 7: Cleanup & Polish ✅ KLAR

### TODO 7.1: Ta bort gammal kod
- [x] AuditEvent typ uppdaterad med nya fält (created_at, event_data)
- [x] AuditEventRow i ProductCardDrawer använder AUDIT_EVENT_META
- [x] AuditTab i ProductDetailPage uppdaterad

### TODO 7.2: TypeScript strictness
- [x] Fixa alla type errors i StripeTab
- [x] Korrekta typer för select handlers
- [x] Alla props typade, inga TS-fel

### TODO 7.3: Playwright E2E tester
- [ ] Test: Skapa produkt → Lägg till pris → Synka Stripe
- [ ] Test: Ändra status draft → active
- [ ] Test: Edit Stripe-fält → Synka
- [ ] Test: Drift detection och resolution

---

## Fältägarskap (Reference)

| Fält | Ägare | Flik | Editbar | Release Blocker |
|------|-------|------|---------|-----------------|
| id | System | Produkt | ❌ | - |
| product_key | System | Produkt | ❌ | - |
| name | Lekbanken | Produkt | ✅ | ✅ |
| internal_description | Lekbanken | Produkt | ✅ | - |
| customer_description | Lekbanken | Produkt | ✅ | - |
| category | Lekbanken | Produkt | ✅ | - |
| product_type | Lekbanken | Produkt | ✅ | - |
| status | Lekbanken | Produkt | ✅ Actions | - |
| image_url | Stripe-sync | Stripe | ✅ | - |
| unit_label | Stripe-sync | Stripe | ✅ | ✅ |
| statement_descriptor | Stripe-sync | Stripe | ✅ | ⚠️ |
| target_audience | Metadata | Stripe | ✅ | - |
| feature_tier | Metadata | Stripe | ✅ | - |
| min_seats | Tillgång | Tillgång | ✅ | - |
| max_seats | Tillgång | Tillgång | ✅ | - |
| stripe_product_id | Stripe | Stripe | ❌ | - |
| stripe_sync_status | System | Banner | ❌ | - |

---

## State Machine (Reference)

### Produktstatus
```
draft ──(aktivera)──► active ──(arkivera)──► archived
  ▲                      │                      │
  └──────(återställ)─────┴──────(återställ)─────┘
```

### Stripe Sync Status
```
unsynced ──(push)──► synced
    ▲                   │
    │                   ▼
    └──(local edit)── drift ──(push/resolve)──► synced
                        │
                        ▼
                     error ──(retry)──► synced/drift
                        │
                        ▼
                     locked (admin intervention)
```

---

## Risker & Mitigation

| Risk | Sannolikhet | Impact | Mitigation |
|------|-------------|--------|------------|
| Breaking Stripe sync | Medium | Hög | Dry-run mode, staging test |
| UI regression | Medium | Medium | Playwright E2E |
| Data loss vid migration | Låg | Hög | Backup före migration |
| Type mismatches | Medium | Låg | Strict TypeScript |

---

## Acceptance Criteria

- [ ] Admin kan tydligt se vad som är lokalt vs Stripe
- [ ] Admin kan inte aktivera produkt utan att uppfylla krav
- [ ] Alla Stripe-synk har bekräftelse och resultat-feedback
- [ ] Audit trail visar vem ändrade vad och när
- [ ] Inga TypeScript errors
- [ ] E2E tester passerar

---

*Plan skapad av GitHub Copilot - 2026-01-08*
