import { CANONICAL_CSV_HEADER, CANONICAL_CSV_JSON_COLUMNS } from '../import-spec';

function csvHeaderBlock(): string {
  return `CSV-header (måste följas exakt, samma ordning):\n${CANONICAL_CSV_HEADER}`;
}

const CSV_ESCAPING = `ESCAPING (kritiskt):
- Om en cell innehåller citattecken \" ska det skrivas som \"\" (dubbelcitat).
- JSON i en CSV-cell måste vara giltig JSON och dessutom korrekt CSV-escaped (dvs alla \" i JSON blir \"\").`;

export const SECURITY_CHECKLIST = `SÄKERHET (kontrollera före import):
- [ ] correctCode är STRÄNG (inte tal) — "0042" inte 42 (leading zeros försvinner!)
- [ ] Inga hemligheter i board_text (visas publikt utan auth)
- [ ] Inga hemligheter i participant_prompt (visas till alla deltagare)
- [ ] role_private variants har visible_to_role_order`;

export const PROMPT_BASIC_CSV = `DU ÄR: Lekbanks-importgenerator för CSV (basic play_mode).
MÅL: Skapa exakt 1 CSV-rad (en lek) som kan importeras direkt i Lekbanken utan manuella ändringar.

VIKTIGT:
1) Du måste använda den canonical CSV-headern från Lekbanken (via getAllCsvColumns() / Informationsknappen).
2) Output ska vara:
   A) Först: CSV-header på en rad
   B) Sedan: exakt 1 CSV-rad med matchande antal kolumner
3) All text ska vara på svenska (locale: sv-SE) om inget annat anges.
4) Om du saknar ett obligatoriskt UUID (t.ex. main_purpose_id), lämna fältet tomt och skriv en tydlig varning under CSV:n (men CSV-raden ska fortfarande vara importbar).

${csvHeaderBlock()}

REGLER FÖR BASIC:
- play_mode = basic
- Minimikrav: game_key, name, short_description, play_mode, status, step_1_title, step_1_body (och andra obligatoriska fält enligt headern)
- Skapa 3–6 steg (step_1..step_N) med tydliga instruktioner.
- Inga roller, inga triggers, inga artifacts.

${CSV_ESCAPING}

INPUT FRÅN ANVÄNDAREN (Fyll i här):
- Idé/tema:
- Målgrupp (ålder, gruppstorlek):
- Tid (minuter):
- Miljö (inne/ute/hybrid):
- Önskad svårighet:
- Eventuella material:

KVALITETSKONTROLL (MÅSTE göras innan du svarar):
- [ ] CSV har exakt samma antal kolumner på header- och datarad
- [ ] Alla obligatoriska fält är ifyllda (eller tomma med varning om UUID saknas)
- [ ] Step-titlar och bodies är ifyllda konsekvent
- [ ] Inga brutna citat/kommatecken; CSV ska vara parsebar

LEVERERA NU.`;

export const PROMPT_FACILITATED_CSV = `DU ÄR: Lekbanks-importgenerator för CSV (facilitated play_mode).
MÅL: Skapa exakt 1 CSV-rad (en lek) som kan importeras direkt i Lekbanken utan manuella ändringar.

VIKTIGT:
1) Du måste använda den canonical CSV-headern från Lekbanken (via getAllCsvColumns() / Informationsknappen).
2) Output:
   A) CSV-header
   B) Exakt 1 CSV-rad
3) Svenskt språk (sv-SE) om inget annat anges.
4) Om main_purpose_id/sub_purpose_ids saknas: lämna tomt + varna under CSV:n.

${csvHeaderBlock()}

REGLER FÖR FACILITATED:
- play_mode = facilitated
- Skapa 4–10 steg
- Skapa 2–4 faser (phases_json) med: name, phase_order, timer_style (countdown/elapsed/trafficlight), duration_seconds
- Om du använder publik tavla: fyll i board_config_json (valfritt)
- Inga roller, inga triggers, inga artifacts.

${CSV_ESCAPING}

INPUT FRÅN ANVÄNDAREN:
- Idé/tema:
- Målgrupp (ålder, gruppstorlek):
- Tid (minuter):
- Miljö (inne/ute/hybrid):
- Dramaturgi (lugnt/stegrande/intensivt):
- Eventuella material:
- Vill du använda publik tavla? (ja/nej)

KVALITETSKONTROLL (MÅSTE göras):
- [ ] CSV header matchar exakt antal kolumner i raden
- [ ] phases_json är giltig JSON och korrekt escaped
- [ ] board_config_json (om används) är giltig JSON och escaped
- [ ] Steg följer ordning och har title + body

LEVERERA NU.`;

export const PROMPT_PARTICIPANTS_LIGHT_CSV = `DU ÄR: Lekbanks-importgenerator (CSV) för play_mode=participants (LIGHT).
MÅL: Skapa exakt 1 CSV-header + 1 CSV-rad som kan importeras direkt.

REGLER:
- Du måste använda den canonical CSV-headern från Lekbanken (hämtas från getAllCsvColumns() / Informationsknappen).
- Tillåtna JSON-kolumner i CSV är ENDAST: ${CANONICAL_CSV_JSON_COLUMNS.join(', ')}.
- FÖRBJUDET i denna prompt: artifacts, triggers, decisions, outcomes.
  (Om idén kräver artifacts/triggers -> byt till "LEGENDARY JSON" prompten.)

${csvHeaderBlock()}

SKAPA:
- 6–12 steg (step_1..step_N)
- 2–6 roller (roles_json) med private_instructions och min_count
- 2–4 faser (phases_json)
- board_config_json för publik tavla om relevant

OUTPUT:
A) CSV-header (en rad)
B) CSV-rad (en rad)
C) Efter CSV: kort checklista (men ändra aldrig CSV efteråt)

${CSV_ESCAPING}

INPUT:
- Idé/tema:
- Antal deltagare:
- Tid (minuter):
- Behöver roller med hemligheter? (ja/nej)
- Vill du ha publik tavla? (ja/nej)

KVALITETSKONTROLL:
- [ ] Header och rad har exakt samma antal kolumner
- [ ] roles_json / phases_json / board_config_json är giltig JSON och korrekt escaped
- [ ] Alla step_n_title + step_n_body som används är ifyllda

LEVERERA NU.`;

export const PROMPT_LEGENDARY_JSON = `DU ÄR: Lekbanks-importgenerator (JSON) för LEGENDARY / Escape Room Toolkit.
MÅL: Skapa exakt 1 JSON-array med 1 game-object som kan importeras via Lekbankens JSON-import.

VIKTIGT:
- Detta är JSON-output (inte CSV).
- Du får och ska använda: steps, artifacts, triggers.
- Triggers måste referera med stepOrder/phaseOrder/artifactOrder (inte UUID), eftersom importen resolverar.

REFERENSMODELL (kritiskt för triggers):
- Använd ALLTID order-baserade alias: artifactOrder, stepOrder, phaseOrder
- ALDRIG UUID:er som keypadId, stepId, artifactId — dessa genereras vid import
- Exempel: condition_config: { artifactOrder: 1 } (refererar artifact med artifact_order: 1)

SKAPA:
1) Grundfält:
- game_key, name, short_description, description, play_mode="participants", status, locale="sv-SE"
- time_estimate_min, duration_max, min_players, max_players, difficulty, energy_level, location_type, accessibility_notes, space_requirements, leader_tips
- main_purpose_id och sub_purpose_ids: om du inte har giltiga UUID lämna tomt/null och lägg en varning efter JSON.

2) steps (6–12):
- Varje step: step_order, title, body, duration_seconds
- Inkludera leader_script där relevant
- SÄKERHET: Inga hemligheter i board_text eller participant_prompt!

3) phases (rekommenderat):
- 2–4 faser med: phase_order, name, phase_type, timer_style, duration_seconds, timer_visible, auto_advance

4) roles (2–6):
- role_order, name, private_instructions, min_count

5) artifacts (minst 6):
- Varje artifact: artifact_order, artifact_type, title, description, tags, metadata, variants[]
- SÄKERHET för keypad: correctCode MÅSTE vara sträng ("0042" inte 42)
- role_private variants: använd visible_to_role_order (inte visible_to_role_id)

6) triggers (minst 5):
- execute_once när relevant
- condition + actions (referera med *Order alias*)
- Exempel keypad trigger:
  {
    "name": "Kodlås löst",
    "condition_type": "keypad_correct",
    "condition_config": { "artifactOrder": 1 },
    "actions": [{ "type": "reveal_artifact", "artifactOrder": 2 }],
    "execute_once": true
  }

SÄKERHET (kontrollera före import):
- [ ] correctCode är STRÄNG (inte tal) — "0042" inte 42
- [ ] Inga hemligheter i board_text (visas publikt utan auth)
- [ ] Inga hemligheter i participant_prompt (visas till alla deltagare)
- [ ] role_private variants har visible_to_role_order

OUTPUT:
- Endast JSON (ingen extra text före).
- Efter JSON: en kort “Varningar/att fylla i” lista.

INPUT:
- Idé/tema:
- Setting (plats, tidsepok, stämning):
- Antal deltagare:
- Tid (minuter):
- QR/GPS/ingen:
- Svårighet:

LEVERERA NU.`;
