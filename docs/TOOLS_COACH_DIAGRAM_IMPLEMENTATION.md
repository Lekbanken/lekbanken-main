# Tool #2 — Träningsdiagram (Coach Diagram Builder)

## Metadata

- Status: draft
- Last updated: 2026-01-02
- Tool key: `coach_diagram`
- Asset type: `training_diagram` (MVP)

## 1) Syfte & use cases

Bygga ett verktyg som låter en tränare skapa en taktik-/övningsbild (plan + pluppar + boll + pilar) och spara den som en återanvändbar diagram-asset som kan användas som read-only instruktionsmedia i en aktivitet/lek.

MVP-fokus:

- SVG-baserad editor (inte canvas)
- Mobilkompatibel (funkar utan zoom/pan-krav)
- Library-first: list + skapa + öppna + spara
- Output används som read-only bild i Game Builder + Play

Icke-mål (MVP):

- Ingen real-time kollaboration
- Ingen multi-user editing
- Ingen avancerad animation
- Ingen spelmekanik kopplad till diagram

## 2) Canonical JSON-schema (MVP)

> Schema ska vara strikt och versionerat. Normaliserade koordinater i intervallet 0..1.

### DiagramDocument v1

Föreslagen struktur (kan justeras när vi sett befintliga “export”-mönster i repo):

- `schemaVersion`: `1`
- `id`: string (uuid)
- `title`: string
- `sportType`: `football | basketball | handball | custom`
- `fieldTemplateId`: string
- `objects`: Array<Object>
- `arrows`: Array<Arrow>
- `metadata`: Record<string, unknown> (valfritt)
- `createdAt`: ISO string
- `updatedAt`: ISO string

### Object v1

- `id`: string
- `type`: `player | ball | marker`
- `position`: `{ x: number, y: number }` (0..1)
- `style`: {
  - `color`: string
  - `size`: `sm | md | lg`
  - `label?`: string
}

Constraints (MVP):

- Max 1 `ball`

### Arrow v1

- `id`: string
- `from`: `{ x: number, y: number }`
- `to`: `{ x: number, y: number }`
- `style`: {
  - `color`: string
  - `pattern`: `solid | dashed`
  - `arrowhead`: boolean
}
- `label?`: string

## 3) UI-flöden (Admin / Library / Toolbelt / Game / Play)

### Admin → Tools

- Tools Library listar `coach_diagram` som tillgängligt verktyg.
- En enkel “Diagram Library”-yta behövs för list/create/edit.

### Library listing (MVP-minsta)

- Lista sparade diagram
- Search på titel
- “Skapa nytt” → öppna editor med nytt dokument
- Klick på list-item → öppna editor med laddat dokument

### Editor (MVP)

Måste stödja:

- Välj sport/plan-template
- Pluppar/spelare: add, drag&drop, duplicera, radera, färg + label
- Boll: 1 boll (add/move/delete)
- Pilar: draw mode (klick start → klick slut), drag endpoints, radera
- Save: manuell spara med saving state

### Game Builder (Admin)

- Välj sparat diagram via picker modal
- Spara referensen som read-only “instruktionsmedia” i aktivitet/step
- Preview i builder

### Play (MVP)

- När ett steg/aktivitet refererar ett diagram: rendera read-only SVG i Play (host + participant)

## 4) Routes & filer (uppdateras löpande)

> Uppdateras per delsteg.

## 5) Known limitations (MVP)

- Ingen real-time sync
- Ingen avancerad zoom/pan
- Ingen export till video/GIF

## 6) Test-checklista (manuell)

- Admin: Tools Library visar Coach Diagram tool
- Library: skapa nytt diagram → lägg till pluppar/boll/pilar → spara
- Library: lista visar sparat diagram, search funkar
- Library: öppna sparat diagram → redigera → spara igen
- Game Builder: välj diagram via picker → preview syns → spara
- Play: steg som refererar diagram renderar korrekt (host + participant)
