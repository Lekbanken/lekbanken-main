# PRODUCT DOMAIN – KEY LEARNINGS FOR FUTURE DOMAINS

This document summarises the architectural, structural and behavioural learnings from the current Product Domain implementation. It should be used as a guidance layer when designing or implementing future domains in Lekbanken.

---

## 1. Products & Purposes are Global Metadata
The Product Domain is global and not tenant-scoped. Products, purposes and mappings are shared for all tenants.

**Implications for future domains:**
- Games, Browse, Planner and Billing must treat these as **global taxonomies**.
- No tenant-level filtering or overrides should be assumed unless explicitly added.
- Any domain needing category/purpose terminology must reference Product Domain, not duplicate lists.

---

## 2. Real Implementation Is Much Simpler Than Intended Spec
Intended structure in Notion:
- product_categories_lb
- products_lb
- main_purposes
- sub_purposes
- product_purpose_map
- translations
- category → product → main → sub hierarchy

Actual implementation:
- Single `products` table (global)
~- Single `purposes` table (flat, with optional parent_id)~  (correct: the purposes table is flat with optional parent_id)
- Mapping table `product_purposes`
- Very limited seeds
- No translations
- No categories table (products use free-text category)

**Learning:** Future domain implementations must verify actual DB schema, not rely on old Notion specs.

---

## 3. API-First Exists but Is Not Consumed by Other Domains Yet
Products & purposes have proper API routes:
- `/api/products`
- `/api/purposes`
- `/api/products/[productId]/purposes`

BUT:
- Games, Browse, Planner still perform **direct Supabase queries**
- UIs often use **hardcoded lists**
- No central method for purpose hierarchy or translation

**Learning:** New domains must use API-first patterns and avoid direct Supabase queries for metadata.

---

## 4. Missing Hierarchies → Purpose Logic Weak
Purposes are stored in one table with a `type (main|sub)` and `parent_id`, but:
- Only one sub-purpose exists in seeds
- No enforced product → main → sub chain
- UI never exposes purpose selection

**Learning:** When hierarchical metadata is required, it must be modeled, seeded and validated end-to-end.

---

## 5. Product–Billing–Tenant Access Not Connected
Billing Domain has its own `billing_products` table. Tenant Domain has a free-form JSON field: `tenant_settings.product_access`.

But:
- No linkage between billing products ↔ domain products
- No enforcement of product access anywhere
- No shared concept of "what a user may see"

**Learning:** Future domains handling access/visibility must not create ad-hoc logic — they must integrate with Product Domain and Billing Domain formally.

---

## 6. Product Domain Is Critical for UX (Browse, Games, Planner)
Despite high importance, Product Domain:
- Is not exposed in filters
- Not used in selection flows
- Not visible in Planner
- Not surfaced in Marketing

**Learning:** When building experience layers (UI/UX), Product Domain must be treated as foundational, not optional.

---

## 7. Seeds Drive the Platform Experience
Because the product/purpose seeds are incomplete:
- Games are created with null/empty product_id and purpose_id
- Browse loses significant filtering capability
- Planner cannot show meaningful structure

**Learning:** Metadata domains (Product, Purposes, Categories) must always ship with complete seed data.

---

## 8. No Translation Layer Yet
Products & purposes appear only in one language.

**Learning:** All global taxonomies must support NO/SE/EN from day 1; otherwise the rest of the system becomes inconsistent (Games has translations; Product does not).

---

## 9. Hardcoded UI Structures Must Be Eliminated
Current UI has multiple hardcoded lists for product names, capabilities, licensing filters, metrics.

**Learning:** Future domain UIs should consume structured data from APIs, never local constants.

---

## 10. Product Domain Must Become the “Single Source of Truth”
All domains requiring classification, filtering, or metadata must use Product Domain structures, not duplicate logic.

**Learning for future domains:**
- Centralize product → purpose → subpurpose definitions.
- Use server APIs, not direct queries.
- Prepare for translations, billing integration, and tenant-level access.
