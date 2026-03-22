# Archive

## Metadata

- Owner: -
- Status: active
- Date: 2025-12-18
- Last updated: 2026-03-21
- Last validated: -

> Active sub-index for archived docs, prompts, briefs, and superseded versions. Files in this folder are low-trust historical material unless explicitly marked otherwise.

Samling av arkiverade prompts, implementation briefs, migreringsguider, äldre versioner och processartefakter som inte längre ska behandlas som aktiv dokumentation.

Syfte:
- Hålla `docs/` fokuserat på source of truth, kontrakt, runbooks och aktiva planer
- Bevara historik, prompts och engångsdokument med tydlig låg-trust-placering
- Göra det enkelt att förstå varför en fil arkiverades via manifestet i samma mapp

Regler:
- Filer i denna mapp är historik, engångsmaterial eller ersatta versioner om inget annat uttryckligen anges.
- Om ett arkiverat dokument fortfarande behövs operativt ska innehållet flyttas eller sammanfattas i en aktiv doc utanför `archive/`.
- För ursprunglig sökväg och arkivskäl, se `ARCHIVE_MANIFEST.md`.

Kluster i mappen:
- Prompts och AI-processmaterial
- Äldre implementation briefs och execution checklists
- Superseded versioner av tidigare canonical docs
- Engångsguider för migrering, cleanup och handover
