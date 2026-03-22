# Legal docs

## Metadata

- Owner: -
- Status: active
- Date: 2026-03-22
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Entry point for legal, policy, and GDPR-adjacent documentation. Active contract templates live here; historical implementation snapshots live under `archive/`.

## Purpose

Use this cluster for legal/public-policy documents, enterprise contract templates, and historical rollout records for legal and cookie-consent work.

## Read order

1. [DPA_TEMPLATE.md](DPA_TEMPLATE.md)
2. [SLA.md](SLA.md)
3. [archive/LEGAL_IMPLEMENTATION_STATUS.md](archive/LEGAL_IMPLEMENTATION_STATUS.md) when historical rollout context is needed
4. [archive/COOKIE_CONSENT_CURRENT_STATE.md](archive/COOKIE_CONSENT_CURRENT_STATE.md) when cookie-consent gap analysis is needed

## Active docs

- [DPA_TEMPLATE.md](DPA_TEMPLATE.md) — enterprise DPA template
- [SLA.md](SLA.md) — service level agreement draft

## Historical docs

- [archive/LEGAL_IMPLEMENTATION_STATUS.md](archive/LEGAL_IMPLEMENTATION_STATUS.md) — historical legal/GDPR implementation status snapshot
- [archive/COOKIE_CONSENT_CURRENT_STATE.md](archive/COOKIE_CONSENT_CURRENT_STATE.md) — cookie consent current-state and gap analysis snapshot

## Related docs

- [../gdpr/tenant-anonymization.md](../gdpr/tenant-anonymization.md) — tenant anonymization workflow
- Verify legal runtime behavior against `app/legal/**`, `components/legal/**`, `lib/legal/**`, and `lib/gdpr/**` before treating historical docs as current truth.

## Placement rule

- Keep active legal templates and policy docs in `docs/legal/`.
- Keep implementation snapshots and gap analyses in `docs/legal/archive/`.
- Do not add legal rollout snapshots back to root `docs/`.