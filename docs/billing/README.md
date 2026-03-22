# Billing docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for the billing, licensing, and purchase-flow documentation cluster. The active billing domain reference lives at this level; rollout plans and status records live under `archive/`.

## Purpose

Use this cluster for billing/licensing domain truth, purchase-flow history, and licensing rollout records so they no longer sit as standalone root documents.

## Read order

1. [BILLING_LICENSING_DOMAIN.md](BILLING_LICENSING_DOMAIN.md)
2. [../STRIPE.md](../STRIPE.md)
3. [archive/PURCHASE_FLOW_STATUS_REPORT.md](archive/PURCHASE_FLOW_STATUS_REPORT.md) when historical purchase-flow context is needed
4. [archive/PURCHASE_FLOW_IMPLEMENTATION.md](archive/PURCHASE_FLOW_IMPLEMENTATION.md) for completion history
5. [archive/LICENSING_SALES_EXECUTION_PLAN.md](archive/LICENSING_SALES_EXECUTION_PLAN.md) for sales-rollout history

## Active docs

- [BILLING_LICENSING_DOMAIN.md](BILLING_LICENSING_DOMAIN.md) — current billing/licensing domain reference

## Historical docs

- [archive/PURCHASE_FLOW_STATUS_REPORT.md](archive/PURCHASE_FLOW_STATUS_REPORT.md) — purchase-flow status snapshot
- [archive/PURCHASE_FLOW_IMPLEMENTATION.md](archive/PURCHASE_FLOW_IMPLEMENTATION.md) — purchase-flow implementation snapshot
- [archive/LICENSING_SALES_EXECUTION_PLAN.md](archive/LICENSING_SALES_EXECUTION_PLAN.md) — licensing and product sales rollout snapshot

## Related docs

- [../STRIPE.md](../STRIPE.md) — Stripe integration details
- [../admin/ADMIN_DESIGN_SYSTEM.md](../admin/ADMIN_DESIGN_SYSTEM.md) — admin UX patterns referenced by billing/admin surfaces

## Placement rule

- Keep active billing and licensing docs in `docs/billing/`.
- Keep rollout plans, status reports, and sales execution history in `docs/billing/archive/`.
- Do not add billing rollout snapshots back to root `docs/`.