# Game Builder Documentation Index

## Metadata

- Owner: -
- Status: active
- Date: 2026-02-08
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active coordination hub for builder documentation. This cluster mixes active audits/contracts/plans with bounded historical snapshots, and this file is the routing entrypoint.

**Exekveringsstatus:** KOMPLETT AUDIT (inkl. V2 Pre-Import Hardening + Verification)

Aktiv ingång till builder-dokumentationen. Den här mappen är blandad: vissa filer är aktiva audit/plan/contract-referenser, andra är tidsbundna risk- eller sprintsnapshots.

---

## Tolkningsregel

- Läs denna fil först.
- Behandla `*_AUDIT*`, aktiva kontrakt och importspecar som nuvarande arbetsreferenser.
- Behandla äldre riskrapporter och sprintplaner som bounded snapshots om inte senare filer uttryckligen håller dem levande.

## Statuskarta

### Active

- `BUILDER_V2_AUDIT.md` — aktiv pre-import-härdningsaudit för V2-spåret
- `BUILDER_V2_AUDIT_VERIFICATION.md` — aktiv verifiering av V2-auditen
- `BUILDER_EVENT_MODEL.md` — aktiv referens för reducer-, history- och save-pipeline
- `BUILDER_IMPORT_COMPAT.md` — aktiv gap- och roundtripreferens för import/export-spåret
- `BUILDER_WIRING_VALIDATION_PLAN.md` — aktiv validerings- och wiringplan
- `IMPORT_ATOMICITY_PLAN.md` — aktiv implementeringsplan för atomicity-spåret
- `JSON_IMPORT_BLUEPRINT.md` — aktiv canonical importspecifikation
- `BUILDER_METADATA_CONTRACT_CANONICAL.md` — aktiv canonical contract-referens

### Frozen audits

- `BUILDER_AUDIT.md` — bred builder-audit snapshot före senare V2-fördjupning
- `BUILDER_INVENTORY.md` — fil- och riskinventering från samma auditbatch
- `BUILDER_METADATA_CONTRACT.md` — evidensbaserad contract-map som föregår den canonical versionen

### Historical snapshots

- `IMPORT_METADATA_RISK_REPORT.md` — tidigare riskunderlag för senare contract- och atomicityarbete
- `SPRINT2_WIRING_PLAN.md` — sprintbunden genomförandeplan

### Draft or active plans

- `SPRINT3_CONSOLIDATION_PLAN.md` — aktiv konsolideringsplan

## Dokumentöversikt

| Dokument | Innehåll | Storlek |
|----------|----------|---------|
| [BUILDER_V2_AUDIT.md](BUILDER_V2_AUDIT.md) | **PRE-IMPORT HARDENING** — V2-arkitektur, dataflöde, riskanalys | ~20KB |
| [BUILDER_V2_AUDIT_VERIFICATION.md](BUILDER_V2_AUDIT_VERIFICATION.md) | **VERIFICATION** — Claims matrix, evidence pack, gaps, do-not-touch | ~15KB |
| [BUILDER_METADATA_CONTRACT.md](BUILDER_METADATA_CONTRACT.md) | **METADATA CONTRACT** — Per artifact_type keys som Play läser | ~25KB |
| [BUILDER_METADATA_CONTRACT_CANONICAL.md](BUILDER_METADATA_CONTRACT_CANONICAL.md) | **CANONICAL** — Normaliserad key-struktur + klassificering | ~20KB |
| [IMPORT_METADATA_RISK_REPORT.md](IMPORT_METADATA_RISK_REPORT.md) | **RISK REPORT** — Kritiska valideringspunkter för import | ~10KB |
| [BUILDER_AUDIT.md](BUILDER_AUDIT.md) | Huvudaudit med alla 7 delar + 3 runtime traces | ~25KB |
| [BUILDER_INVENTORY.md](BUILDER_INVENTORY.md) | Fil-för-fil inventory med ansvar och risknivå | ~8KB |
| [BUILDER_EVENT_MODEL.md](BUILDER_EVENT_MODEL.md) | Event/state pipeline, actions, history | ~10KB |
| [BUILDER_IMPORT_COMPAT.md](BUILDER_IMPORT_COMPAT.md) | Import/export gap analysis + roundtrip | ~8KB |

---

## Quick Reference

### Entry Points

```
/admin/games/new         → Skapa ny lek
/admin/games/[id]/edit   → Redigera befintlig
```

### Kritiska Filer

| Fil | LOC | Risk |
|-----|-----|------|
| `GameBuilderPage.tsx` | ~1379 | 🔴 HIGH |
| `useGameBuilder.ts` | ~452 | 🔴 HIGH |
| `ArtifactEditor.tsx` | ~1400 | 🔴 HIGH |
| `TriggerEditor.tsx` | ~774 | 🔴 HIGH |
| `builder/[id]/route.ts` | ~816 | 🔴 HIGH |

### State Management

```
dispatch(action) → historyReducer → stateReducer → new state
                          ↓
                   past/present/future (undo/redo)
```

### Persistence

```
State change → isDirty → debounce 1500ms → PUT /api/games/builder/[id]
```

---

## Top 5 Risker (Action Required)

| # | Risk | Mitigation |
|---|------|------------|
| 1 | **Ingen beforeunload warning** | Lägg till `window.onbeforeunload` |
| 2 | **Last-write-wins** | Optimistic locking med `updated_at` |
| 3 | **Ingen delete confirmation** | Confirmation dialog |
| 4 | **Replace-all persistence** | Diffing eller soft-delete |
| 5 | **Preview ej implementerat** | Bygg preview-route |

---

## Relaterad Dokumentation

| Dokument | Syfte |
|----------|-------|
| [GAME_BUILDER_IMPLEMENTATION_TRACKER.md](../GAME_BUILDER_IMPLEMENTATION_TRACKER.md) | Implementation status |
| [GAME_BUILDER_INVENTORY_AND_ROADMAP.md](../GAME_BUILDER_INVENTORY_AND_ROADMAP.md) | Tidigare inventory (2026-01-24) |
| [GAME_BUILDER_UI_SPEC.md](../GAME_BUILDER_UI_SPEC.md) | UI specifikation |
| [GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md](../GAME_BUILDER_P2_IMPLEMENTATION_PLAN.md) | Historisk P2-plan för faser, roller och tavla |
| [GAME_CSV_IMPORT_EXPORT_PLAN.md](../GAME_CSV_IMPORT_EXPORT_PLAN.md) | Tidigare implementeringsplan för CSV import/export |
| [TESTPLAN_GAME_BUILDER_P0.md](../TESTPLAN_GAME_BUILDER_P0.md) | Testplan |

---

## Audit Checkpoints

### ✅ Pass A: Inventory (Komplett)
- [x] Routes/pages inventerade
- [x] Components katalogiserade
- [x] Hooks dokumenterade
- [x] API endpoints mappade
- [x] Types/schemas listade
- [x] Utils identifierade
- [x] Tests noterade
- [x] Risk-nivåer tilldelade

### ✅ Pass B: Trace (Komplett)
- [x] Flow 1: Öppna builder med existerande draft
- [x] Flow 2: Gör ändring som triggar autosave
- [x] Flow 3: Publish/preview/export

### ✅ Deliverables
- [x] BUILDER_AUDIT.md (7 delar)
- [x] BUILDER_INVENTORY.md (fil-för-fil)
- [x] BUILDER_EVENT_MODEL.md (event/state pipeline)
- [x] BUILDER_IMPORT_COMPAT.md (import/export gaps)

---

## Nästa Steg

1. **Prioritera risker** - Granska Top 5 med teamet
2. **Ingen refactor före review** - Inventering → Trace → Risk → FIX
3. **Skapa tickets** - Baserat på risklistan
4. **E2E tests** - Utöka `game-builder.spec.ts` med roundtrip tests
