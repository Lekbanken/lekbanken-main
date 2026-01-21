# Lekbanken – Licensing & Product Sales Execution Plan (Enterprise)

## Metadata
- **Status:** In progress (DB schema + types synced; core flows pending re-apply)
- **Audience:** Product/Tech/Admin
- **Goal:** Ship a conversion-safe, admin-manageable shop + licensing system where organisations/tenants are provisioned only after Stripe payment confirmation.

## Progress log
- **2026-01-21:** Synced DB schema/types for licensing work: pushed remote migration(s) and regenerated `types/supabase.ts` from the linked Supabase project.
- **2026-01-21:** Prepared Phase 4 DB support for entitlement-based seat assignments (capacity enforced at DB layer).
- **2026-01-21:** Restored Phase 1 purchase-first flow: signup no longer creates orgs; checkout creates `purchase_intents`; Stripe webhook provisions tenant + entitlement on `checkout.session.completed`.
- **2026-01-21:** Restored Phase 2 public pricing: `GET /api/public/pricing` + marketing pricing renders DB-backed products/prices.
- **2026-01-21:** Restored Phase 3 entitlements-first gating for games (with legacy billing fallback).
- **2026-01-21:** Implemented Phase 4 seat allocation UI directly on tenant members admin page + a dedicated licenses overview page.
- **2026-01-21:** Implemented Phase 5 system-admin entitlement grants/revokes in organisation detail.

---

## 0) Executive summary

### Non‑negotiable requirement
- **No org/tenant must be created before Stripe payment confirmation (“green light”).**

### Canonical model
- **Catalog:** `products` + `product_prices` (published/pricing)
- **Access control:** `tenant_product_entitlements` (single source of truth)
- **Seat capacity:** `tenant_product_entitlements.quantity_seats`
- **Seat allocation:** `tenant_entitlement_seat_assignments` (assign seats to users)

---

## 1) Guardrails
- **Idempotency:** Webhook provisioning must be safe on retries.
- **Security:** No client-side Stripe secrets; RLS must be correct for anon marketing reads.
- **Auditability:** Admin grants/seat assignments must be traceable.

---

## 2) Phased roadmap

### Phase 1 — Stop the leak (purchase-first provisioning)
**Goal:** No org tenant created before Stripe payment confirmation.

**TODO**
- [x] Remove org creation from marketing signup (or gate it behind purchase intent state).
- [x] Introduce `purchase_intents` state machine + server endpoint to start checkout.
- [x] Stripe webhook provisions tenant + entitlements only after verified success.

**Acceptance criteria**
- [x] End-user signup flow cannot provision a tenant without a paid + provisioned purchase intent (“green light”).

---

### Phase 2 — Make pricing page real (sellable + administrable)
**Goal:** Marketing pricing displays real products/prices.

**TODO**
- [x] Public endpoint `GET /api/public/pricing` backed by `products/product_prices`.
- [x] Ensure anon RLS allows only published products/prices.

---

### Phase 3 — Entitlements (single source of truth for access)
**Goal:** Access gating uses entitlements, not billing-product-key mapping.

**TODO**
- [x] Ensure tenant members can read their entitlements for gating.
- [x] Update game gating to prefer `tenant_product_entitlements`.

---

### Phase 4 — Seat allocation UX
**Goal:** Tenant owners/admins can allocate purchased seats to users.

**Done (DB)**
- [x] Add entitlement-based seat assignment table + RLS + capacity enforcement (`tenant_entitlement_seat_assignments`).

**TODO**
- [x] Admin/tenant-admin UI: list members, assign/release seats.
- [x] Verify capacity enforcement end-to-end (DB trigger prevents over-allocation).

---

### Phase 5 — System admin grants (free licences/products)
**Goal:** Support can grant free access without Stripe.

**TODO**
- [x] System-admin endpoints/UI to grant/revoke entitlements.

---

## 3) Concrete next steps
- Enforce seats in runtime gating (require an active seat assignment for non-elevated users).
- Auto-assign a seat to the purchaser/owner at provisioning time.
- Re-run: `npm run type-check`.
- Recommended checks before merge:
  - `npm run lint`
  - `npm test`
  - `npm run smoke:licensing` (after setting `.env.local` Supabase keys)
