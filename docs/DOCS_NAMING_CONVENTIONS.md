# Documentation Naming & Structure

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-18
- Last updated: 2026-03-22
- Last validated: 2026-03-22

> Active reference for documentation naming and structure conventions. Use together with `DOCUMENTATION_STANDARD.md` when moving or renaming docs.

Mål: göra dokumentationen mer översiktlig utan att skapa onödiga breaking changes.

## Grundprinciper

- Repo är source of truth för teknik, flöden och invariants.
- Filnamn är i praktiken stabila id:n för länkar, referenser i PR:ar och Notion-spegeln.
- Undvik mass-rename. Städa i små, avgränsade steg.
- Se [DOCUMENTATION_STANDARD.md](DOCUMENTATION_STANDARD.md) för hur dokument ska väljas och tolkas.

## Rekommenderad struktur

- `docs/*.md`
  - governance, tvärgående referenser och kvarvarande root-level canonical docs
  - root start page: `docs/README.md`
  - authoritative registry: `docs/INVENTORY.md`
  - lightweight entry map: `docs/DOCS_INDEX.md`
- `docs/<area>/*`
  - aktiva områdesdocs och sub-index per område, till exempel `docs/auth/*`, `docs/ops/*`, `docs/templates/*`
- `docs/<area>/history/*` eller `docs/<area>/archive/*`
  - äldre områdesdocs som inte ska vara det första en agent eller människa läser
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

- uppdatera `docs/INVENTORY.md`
- uppdatera `docs/DOCS_INDEX.md` bara om entrypoint-navigeringen ändras
- uppdatera `docs/NOTION.md` om Notion-spegeln påverkas
- sök och uppdatera interna markdown-länkar i repo
- kontrollera att `docs/README.md` fortfarande pekar rätt om det var en viktig ingångsfil
