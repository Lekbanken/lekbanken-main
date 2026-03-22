# Documentation Naming & Structure

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-18
- Last updated: 2026-03-21
- Last validated: 2026-03-21

> Active reference for documentation naming and structure conventions. Use together with `DOCUMENTATION_STANDARD.md` when moving or renaming docs.

Mål: göra dokumentationen mer översiktlig utan att skapa onödiga breaking changes.

## Grundprinciper

- Repo är source of truth för teknik, flöden och invariants.
- Filnamn är i praktiken stabila id:n för länkar, referenser i PR:ar och Notion-spegeln.
- Undvik mass-rename. Städa i små, avgränsade steg.
- Se [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) för hur dokument ska väljas och tolkas.

## Rekommenderad struktur

- `docs/*.md`
  - domändokumentation och stabila referenser
  - curated index: `docs/DOCS_INDEX.md`
  - full inventory: `docs/INVENTORY.md`
- `docs/<area>/*`
  - sub-index per område, till exempel `docs/auth/*`, `docs/ops/*`, `docs/templates/*`
- `docs/reports/*`
  - rapporter, analys, snapshots och historik
  - inte source of truth
- `sandbox/wiki/*`
  - human wiki och onboarding-notes
  - lättviktigt och länkande, inte primär implementation truth

## Namnkonvention framåt

- Filnamn i `UPPER_SNAKE_CASE.md` är ok för legacy.
- Nyare docs kan använda `kebab-case.md` om ni vill.
- Blanda inte stilar i samma mapp utan tydlig anledning.
- Viktigast är konsekvens inom en mapp.

## Vad är värt att renama?

Bra kandidater:

- dump-filer eller engångsrapporter som bara ska arkiveras
- dubbletter
- dokument som tydligt ligger i fel mapp

Undvik att renama:

- domändocs som `*_DOMAIN.md`
- referensdokument som redan är länkade från många ställen
- filer som fungerar som etablerade ingångar för agenter eller människor

## Checklista vid flytt eller rename

- uppdatera `docs/DOCS_INDEX.md`
- uppdatera `docs/INVENTORY.md`
- uppdatera `docs/NOTION.md` om Notion-spegeln påverkas
- sök och uppdatera interna markdown-länkar i repo
- kontrollera att `docs/README.md` fortfarande pekar rätt om det var en viktig ingångsfil
