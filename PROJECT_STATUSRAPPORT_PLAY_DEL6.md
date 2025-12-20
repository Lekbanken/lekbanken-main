# STATUSRAPPORT / CHANGELOG — Play (DEL 6)

Datum: 2025-12-20

## Levererat (DEL 1–DEL 4, nuvarande repo-läge)

### DEL 1 — DB/schema (Play Primitives)
- Finns migration för "Legendary Play Primitives v1" med:
  - `game_artifacts`, `game_artifact_variants`
  - `session_artifacts`, `session_artifact_variants`, `session_artifact_assignments`
  - `session_decisions`, `session_votes`
  - `session_outcomes`
- Ny kompatibilitets-migration tillagd:
  - Strikt constraint: **1 röst per (decision_id, participant_id)**
  - View: `session_artifact_state` som sammanfattar revealed/highlighted state på sessionsnivå

### DEL 2 — API
- Befintliga endpoints (implementation v1) för artifacts/decisions/votes/outcomes + public board.
- Kompatibilitets-endpoints tillagda för spec-liknande paths:
  - `POST /api/play/sessions/[id]/artifacts/snapshot` (alias till befintlig snapshot-POST)
  - `PATCH /api/play/sessions/[id]/decisions/[decisionId]` (host patch/open/close/reveal/update)
  - `PUT /api/play/sessions/[id]/outcome` (create/update outcome via PUT-semantik)

### DEL 3 — Realtime
- Broadcasts via Supabase Realtime channel `play:${sessionId}` event `play_event`.
- Primitives events används: `artifact_update`, `decision_update`, `outcome_update`.
- Vote broadcast skickar **ingen participant-identitet**.

### DEL 4 — UI
- Host UI: artifacts snapshot/reveal/highlight + decisions/outcomes hantering (v1).
- Participant UI: "Mina artefakter" samt beslut + röstning + resultat (revealed).
- Public board: `/board/[code]` visar revealed public artifacts + highlighted + revealed decision results + revealed outcomes.

## Ändringar i denna iteration
- DB:
  - `supabase/migrations/20251220090000_play_primitives_spec_compat.sql`
- API:
  - `app/api/play/sessions/[id]/artifacts/snapshot/route.ts`
  - `app/api/play/sessions/[id]/decisions/[decisionId]/route.ts`
  - `app/api/play/sessions/[id]/outcome/route.ts` (PUT)
  - `app/api/play/sessions/[id]/decisions/[decisionId]/vote/route.ts` (upsert)

### CSV-import (Admin)
- CSV-importen stödjer nu JSON-kolumnerna `artifacts_json`, `decisions_json`, `outcomes_json`.
- `artifacts_json` importeras till DB (author-time): `game_artifacts` och `game_artifact_variants`.
- `decisions_json` och `outcomes_json` **valideras**, men importeras inte till DB ännu (det finns inga author-time tabeller för detta i nuvarande schema).

#### `artifacts_json` — format
Accepterat format: antingen en array, eller ett objekt med nyckeln `artifacts`.

Alias som accepteras för kompatibilitet:
- artefakt: `order` → `artifact_order`
- varianter: `items` → `variants`
- variant: `order` → `variant_order`

Exempel:

```json
[
  {
    "artifact_order": 1,
    "locale": "sv-SE",
    "title": "Ledtrådskort",
    "description": "Kort som delas ut under leken",
    "artifact_type": "card",
    "tags": ["mystery"],
    "metadata": { "category": "clue" },
    "variants": [
      {
        "variant_order": 1,
        "visibility": "public",
        "title": "Kort A",
        "body": "Innehåll för kort A",
        "media_ref": null,
        "metadata": {}
      },
      {
        "variant_order": 2,
        "visibility": "role_private",
        "visible_to_role_order": 1,
        "title": "Kort B (privat)",
        "body": "Endast för roll #1"
      }
    ]
  }
]
```

`visibility` stöder: `public` | `leader_only` | `role_private`.
För `role_private` kan rollen anges via `visible_to_role_id` (UUID) eller alias `visible_to_role_order` / `visible_to_role_name`.

## Kända gap / öppna punkter (kräver att vi jämför mot din exakta grundspec)
- Game Builder UI saknar en dedikerad artefakt-editor (CRUD för `game_artifacts` / `game_artifact_variants`).
- Outcome-modellen är fortfarande **multi-row** i `session_outcomes` (inte en single-row-per-session). Om spec kräver single-row behöver vi en följdmigration + API/board-anpassning.
- `session_artifact_state` levereras som **view** (inte fysisk tabell). Om spec kräver tabell+triggers för sync behöver vi implementera det.

## Nästa steg
1) Klistra in/peka på den exakta DEL 0–DEL 4 grundspecen i repo (eller länka den filen) så kan jag:
   - göra en strikt checklista (pass/fail)
   - implementera eventuella kvarvarande DB/API/UI-bitar utan gissningar
2) (Valfritt) applicera nya migrationen i Supabase och köra verifieringsskript.
