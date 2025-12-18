# Documentation naming & structure

MÃ¥l: gÃ¶ra dokumentationen mer Ã¶versiktlig utan att skapa onÃ¶diga breaking changes.

## Grundprinciper

- **Repo Ã¤r source of truth** fÃ¶r teknik, flÃ¶den och invariants.
- Filnamn Ã¤r i praktiken **stabila id:n** (lÃ¤nkar, referenser i PR:ar, Notion-spegel).
- Undvik mass-rename. StÃ¤da i **smÃ¥, avgrÃ¤nsade steg**.

## Rekommenderad struktur

- `docs/*.md`:
  - DomÃ¤ndokumentation och stabila referenser
  - Curated index: `docs/DOCS_INDEX.md`
  - Full inventory: `docs/INVENTORY.md`
- `docs/<area>/*`:
  - Sub-index per omrÃ¥de (t.ex. `docs/auth/*`, `docs/ops/*`, `docs/templates/*`)
- `docs/reports/*`:
  - Rapporter/analys/snapshots (historik). Inte source of truth.
- `sandbox/wiki/*`:
  - Human-wiki / onboarding-notes (lÃ¤ttvikt, lÃ¤nkande).

## Namnkonvention (framÃ¥t)

- Filnamn: `UPPER_SNAKE_CASE.md` Ã¤r ok fÃ¶r legacy.
- Nyare docs kan gÃ¤rna vara `kebab-case.md` **om** ni vill, men blanda inte i samma mapp.
- Viktigast: konsekvens inom en mapp.

## Vad Ã¤r vÃ¤rt att renama?

Bra kandidater:
- “Dump-filer” (REPORT/ANALYSIS) som bara ska arkiveras
- Dubbletter eller dokument som tydligt Ã¤r felplacerade

Undvik att renama:
- DomÃ¤ndocs (t.ex. `*_DOMAIN.md`)
- Referensdokument som redan Ã¤r lÃ¤nkade frÃ¥n mÃ¥nga stÃ¤llen

## Checklista vid flytt/rename

- Uppdatera `docs/DOCS_INDEX.md`
- Uppdatera `docs/INVENTORY.md`
- Uppdatera `docs/NOTION.md` (spegel-lÃ¤nkar)
- SÃ¶k och uppdatera interna markdown-lÃ¤nkar i repo
