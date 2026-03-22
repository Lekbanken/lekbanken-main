# Reports

## Metadata

> **Status:** draft
> **Owner:** -
> **Date:** 2025-12-18
> **Last updated:** 2026-03-21
> **Last validated:** -

Detta är en samling rapporter, analysdokument, checklistor och snapshots som i huvudsak används som historik- eller granskningsyta.

Syfte:
- Hålla repo-roten mer städad
- Behålla historik och kontext utan att blanda ihop rapportmaterial med kanoniska domändokument
- Samla bounded audits, undersökningar och färdiga plansnapshots som inte längre hör hemma i repo-roten

Regler:
- Om en rapport börjar bli source of truth ska den flyttas eller absorberas in i ett relevant dokument i `docs/`.
- Om en rapport är en sluten audit eller diagnostik, behandla den som snapshot om inte en nyare fil uttryckligen håller den aktiv.
- Checklistor och implementeringsplaner i denna mapp är inte automatiskt kanoniska bara för att de är mer nya än äldre root-dumpar.

Kluster i mappen:
- Admin och auth: `ADMIN_*`, `AUTHORIZATION_*`, `NAVIGATION_*`
- Stripe och produkter: `STRIPE_*`, `PRODUCT_*`
- Profil och timeout-diagnostik: `PROFILE_*`, `TIMEOUT_*`
- System och QA: `SYSTEM_STATUS_RISK_OVERVIEW.md`, `GOLDEN_PATH_QA_CHECKLIST.md`
- Generella snapshots: `CURRENCY_CONSISTENCY_REPORT.md`, `DEPENDENCY_AUDIT_2026-01-03.md`
