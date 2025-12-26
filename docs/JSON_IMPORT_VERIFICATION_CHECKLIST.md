# JSON Import Verification Checklist

> **Version:** 1.0  
> **Skapad:** 2025-12-26  
> **Syfte:** Systematisk verifiering av JSON-import för Legendary Play

---

## Förutsättningar

- [ ] Supabase-instans körs (lokalt eller remote)
- [ ] Testfiler finns i `docs/examples/`:
  - `example-legendary-play-import.json` (v1)
  - `example-legendary-play-import-v2.json` (v2 för upsert)
- [ ] Admin-användare inloggad

---

## Del A: Positiv path (Ny import)

### A1. Validering (dry-run)

- [ ] Öppna Admin → Spel → "Importera spel"
- [ ] Välj **JSON** format
- [ ] Klistra in innehållet från `example-legendary-play-import.json`
- [ ] Klicka "Validera"
- [ ] Verifiera:
  - [ ] "Valideringen lyckades" visas
  - [ ] Inga errors (error_count = 0)
  - [ ] Förhandsvisning visar:
    - game_key: `notodden-escape-nb`
    - Namn: innehåller "Notodden Escape"
    - play_mode: `participants`
    - Steg: 6

### A2. Import

- [ ] Klicka "Importera 1 spel"
- [ ] Verifiera "Import slutförd!" visas
- [ ] Dialog stängs automatiskt

### A3. DB-verifiering

```sql
-- Kör i Supabase SQL Editor:
SELECT id, game_key, name, play_mode, locale
FROM games WHERE game_key = 'notodden-escape-nb';
```

- [ ] Spel finns med korrekta värden
- [ ] `locale` = `nb-NO`
- [ ] `play_mode` = `participants`

```sql
SELECT 
  (SELECT COUNT(*) FROM game_steps WHERE game_id = g.id) as steps,
  (SELECT COUNT(*) FROM game_phases WHERE game_id = g.id) as phases,
  (SELECT COUNT(*) FROM game_roles WHERE game_id = g.id) as roles,
  (SELECT COUNT(*) FROM game_artifacts WHERE game_id = g.id) as artifacts
FROM games g WHERE game_key = 'notodden-escape-nb';
```

- [ ] steps = 6
- [ ] phases = 3
- [ ] roles = 4
- [ ] artifacts = 4

### A4. Keypad-verifiering

```sql
SELECT title, metadata->>'correctCode' as code, 
       metadata->>'maxAttempts' as attempts,
       metadata->>'lockOnFail' as lock_on_fail
FROM game_artifacts
WHERE game_id = (SELECT id FROM games WHERE game_key = 'notodden-escape-nb')
  AND artifact_type = 'keypad';
```

- [ ] title = "Laboratoriesafen"
- [ ] code = "0451" (sträng med leading zero!)
- [ ] attempts = 3
- [ ] lock_on_fail = true

### A5. role_private-verifiering

```sql
SELECT a.title, v.visibility, gr.name as role_name
FROM game_artifact_variants v
JOIN game_artifacts a ON v.artifact_id = a.id
JOIN game_roles gr ON v.visible_to_role_id = gr.id
WHERE a.game_id = (SELECT id FROM games WHERE game_key = 'notodden-escape-nb')
  AND v.visibility = 'role_private';
```

- [ ] "Detektivens hemmelige notat" → visibility='role_private' → role="Detektiven"

---

## Del B: Upsert path (Uppdatering)

### B1. Upsert-import

- [ ] Öppna Import-dialogen igen
- [ ] Klistra in `example-legendary-play-import-v2.json`
- [ ] Verifiera upsert-läge är aktiverat
- [ ] Klicka "Validera" → Inga errors
- [ ] Klicka "Importera"

### B2. Verifiera ersättning

```sql
SELECT name, short_description
FROM games WHERE game_key = 'notodden-escape-nb';
```

- [ ] Namn innehåller "(Versjon 2)"
- [ ] Beskrivning är uppdaterad

```sql
SELECT 
  (SELECT COUNT(*) FROM game_steps WHERE game_id = g.id) as steps,
  (SELECT COUNT(*) FROM game_phases WHERE game_id = g.id) as phases,
  (SELECT COUNT(*) FROM game_roles WHERE game_id = g.id) as roles,
  (SELECT COUNT(*) FROM game_artifacts WHERE game_id = g.id) as artifacts
FROM games g WHERE game_key = 'notodden-escape-nb';
```

- [ ] steps = 6 (samma antal, ny data)
- [ ] phases = 3 (samma)
- [ ] roles = **5** (en ny roll: "Vitnet")
- [ ] artifacts = **3** (en borttagen, inte gammal data kvar)

### B3. Keypad med ny kod

```sql
SELECT metadata->>'correctCode' as code
FROM game_artifacts
WHERE game_id = (SELECT id FROM games WHERE game_key = 'notodden-escape-nb')
  AND artifact_type = 'keypad';
```

- [ ] code = "1984" (ny kod, inte gammal "0451")

### B4. Inga orphans

```sql
-- Inga orphan variants
SELECT COUNT(*) as orphan_variants
FROM game_artifact_variants v
LEFT JOIN game_artifacts a ON v.artifact_id = a.id
WHERE a.id IS NULL;
```

- [ ] orphan_variants = 0

```sql
-- Inga stale role-referenser
SELECT COUNT(*) as stale_refs
FROM game_artifact_variants v
WHERE v.visible_to_role_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM game_roles r WHERE r.id = v.visible_to_role_id);
```

- [ ] stale_refs = 0

---

## Del C: Negativ path (Validering)

### C1. Keypad med numerisk correctCode - MÅSTE MISSLYCKAS

Skapa test-JSON med:
```json
{
  "artifacts": [{
    "artifact_type": "keypad",
    "metadata": {
      "correctCode": 451
    }
  }]
}
```

- [ ] Validering ger **ERROR** (inte warning)
- [ ] Felmeddelande nämner "correctCode är ett tal"
- [ ] Import-knappen är **inaktiverad**

### C2. role_private utan rollreferens - MÅSTE MISSLYCKAS

Skapa test-JSON med:
```json
{
  "artifacts": [{
    "variants": [{
      "visibility": "role_private"
    }]
  }]
}
```

- [ ] Validering ger **ERROR**
- [ ] Felmeddelande nämner "saknar rollreferens"
- [ ] Import-knappen är **inaktiverad**

### C3. Saknar obligatoriska fält - MÅSTE MISSLYCKAS

```json
[{
  "game_key": "test-fail",
  "play_mode": "participants"
}]
```

- [ ] Error: "Namn saknas"
- [ ] Error: "Kort beskrivning saknas"
- [ ] Error: "Minst ett steg krävs"

---

## Del D: Legendary Play Runtime

### D1. Skapa session

- [ ] Öppna det importerade spelet i Admin
- [ ] Klicka "Spela" eller "Starta session"
- [ ] Session skapas framgångsrikt

### D2. Kopiera roller

- [ ] I Host-vyn, gå till Roller-fliken
- [ ] Klicka "Kopiera roller från spel"
- [ ] Verifiera:
  - [ ] "X roller kopierade till sessionen" visas
  - [ ] Roller visas i listan

```sql
SELECT name, role_order
FROM session_roles
WHERE session_id = '<session-id>'
ORDER BY role_order;
```

- [ ] 5 roller (om v2 importerades)
- [ ] Rätt ordning

### D3. Keypad-säkerhet

- [ ] Öppna DevTools → Network
- [ ] Gå till participant-vy eller hämta artifacts
- [ ] Sök efter `artifacts` response
- [ ] Verifiera att `correctCode` **INTE** finns i response

### D4. Keypad-funktionalitet

- [ ] Som deltagare, försök skriva in fel kod
- [ ] Verifiera felmeddelande visas
- [ ] Försök skriva in rätt kod ("1984" för v2)
- [ ] Verifiera success-meddelande
- [ ] Verifiera att `keypadState.isUnlocked = true` i DB:

```sql
SELECT metadata->'keypadState'->>'isUnlocked' as unlocked
FROM session_artifacts
WHERE artifact_type = 'keypad'
  AND session_id = '<session-id>';
```

### D5. role_private-synlighet

- [ ] Logga in som deltagare med roll "Sjefsdetektiven" (role_order: 1)
- [ ] Verifiera att "Sjefsdetektivens dossier" är synlig
- [ ] Logga in som deltagare med annan roll
- [ ] Verifiera att "Sjefsdetektivens dossier" **INTE** är synlig

---

## Del E: AC-verifiering

### AC1: play_mode = participants fungerar

- [ ] Session startar som Legendary Play (inte basic fallback)
- [ ] Host ser roller i Roller-fliken
- [ ] Deltagare kan tilldelas roller

### AC2: Snapshot-flöde fungerar

- [ ] "Kopiera roller från spel" skapar session_roles
- [ ] Rollerna är synliga i UI utan manuell DB-manipulation

---

## Signering

| Del | Datum | Testare | Status |
|-----|-------|---------|--------|
| A: Positiv path | | | |
| B: Upsert path | | | |
| C: Negativ path | | | |
| D: Runtime | | | |
| E: AC | | | |

---

## Kända begränsningar

1. **Decisions/Outcomes** stöds EJ – endast runtime-tabeller finns
2. **Triggers** stöds EJ ännu
3. **Export inkluderar EJ artifacts** – round-trip är lossy för CSV

---

## Relaterade dokument

- [JSON_IMPORT_FIELD_REFERENCE.md](JSON_IMPORT_FIELD_REFERENCE.md) - Fältreferens
- [CSV_IMPORT_FIELD_REFERENCE.md](CSV_IMPORT_FIELD_REFERENCE.md) - CSV-guide
- [CSV_IMPORT_VERIFICATION_CHECKLIST.md](CSV_IMPORT_VERIFICATION_CHECKLIST.md) - CSV-checklista
