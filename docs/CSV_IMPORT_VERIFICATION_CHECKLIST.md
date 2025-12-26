# CSV Import Verification Checklist

> **Version:** 1.0  
> **Created:** 2025-12-26

## Pre-Import Verification

### 1. Golden CSV Validation

- [ ] Open `docs/examples/example-legendary-play-complete.csv` in VS Code or text editor
- [ ] Verify JSON cells are properly quoted with doubled quotes (`""`)
- [ ] Verify keypad `correctCode` is a string: `"0451"` (not `0451`)

### 2. Import UI Flow

- [ ] Navigate to Admin → Games → Click "Importera spel"
- [ ] Verify dialog shows updated description mentioning "Legendary Play: keypads, roller, faser"
- [ ] Select **CSV** format
- [ ] Verify "Välj fil" button works
- [ ] Paste or upload `example-legendary-play-complete.csv`
- [ ] Toggle "Upsert-läge" and verify help text explains behavior clearly

### 3. Validation Step

- [ ] Click "Validera"
- [ ] Verify validation completes without errors
- [ ] Verify "Valideringen lyckades" appears with green checkmark
- [ ] Verify game preview table shows:
  - game_key: `escape-room-001`
  - Name: `Escape Room: Det Hemliga Labbet`
  - Läge: `participants`
  - Status: `Utkast`
  - Steg: `4`

### 4. Warnings Check

- [ ] If warnings appear, verify they are informational (not blocking)
- [ ] Expected warnings might include:
  - `main_purpose_id saknas` (if not using valid UUID)

### 5. Import Execution

- [ ] Click "Importera 1 spel"
- [ ] Verify "Import slutförd!" success message
- [ ] Verify dialog closes automatically

---

## Post-Import Verification

### 6. Game Builder Inspection

- [ ] Open Admin → Games
- [ ] Find "Escape Room: Det Hemliga Labbet"
- [ ] Open in Game Builder
- [ ] Verify **4 phases** exist with correct order (Introduktion → Sök → Lås upp → Avslutning)
- [ ] Verify **3 roles** exist (Forskare, Ingenjör, Assistent)
- [ ] Verify **4 artifacts** exist

### 7. Keypad Artifact Check

- [ ] Find "Kassaskåpet" artifact
- [ ] Verify type is `keypad`
- [ ] Verify metadata contains:
  - `correctCode: "0451"` (string with leading zero)
  - `codeLength: 4`
  - `maxAttempts: 3`
  - `lockOnFail: true`

### 8. Role-Private Visibility Check

- [ ] Find "Forskarens hemliga dokument" artifact
- [ ] Verify variant has `visibility: role_private`
- [ ] Verify `visible_to_role_id` is set (or resolves via role_order)

### 9. Step/Phase Gating Check

- [ ] Verify variants have `step_index` and `phase_index` in metadata
- [ ] Check "Ledtråd 1" has `step_index: 0, phase_index: 0`
- [ ] Check "Ledtråd 2" has `step_index: 1, phase_index: 1`

---

## Runtime Verification

### 10. Session Start

- [ ] Start a session for the imported game
- [ ] Verify session creates successfully

### 11. Participant Join

- [ ] Join as participant via QR code or link
- [ ] Verify role assignment works
- [ ] Verify only public artifacts visible initially

### 12. Keypad Security

- [ ] As participant, verify keypad shows input UI
- [ ] Verify `correctCode` is NOT visible in browser DevTools / Network tab
- [ ] Try wrong code → Verify error message appears
- [ ] Try correct code (`0451`) → Verify success message

### 13. Role-Private Content

- [ ] As Forskare role → Verify "Forskarens hemliga dokument" visible
- [ ] As other role → Verify "Forskarens hemliga dokument" NOT visible

### 14. Gating Behavior

- [ ] At phase 0 → Verify only phase 0 artifacts visible
- [ ] Advance to phase 1 → Verify phase 1 artifacts appear

---

## Regression Check

### 15. Basic Game Import

- [ ] Import `docs/examples/example-basic-games.csv`
- [ ] Verify 3 games created with correct steps
- [ ] Verify no regression in simple imports

### 16. Re-Import (Upsert) - CRITICAL: Verify Complete Replacement

- [ ] Re-import `example-legendary-play-complete.csv` with Upsert enabled
- [ ] Verify game updates (not duplicated)
- [ ] Verify artifact count is still 4 (not doubled)
- [ ] **Query DB to verify NO orphaned data:**
  ```sql
  -- Should return 4 artifacts for this game
  SELECT COUNT(*) FROM game_artifacts WHERE game_id = '<game-id>';
  
  -- Should return 3 roles
  SELECT COUNT(*) FROM game_roles WHERE game_id = '<game-id>';
  
  -- Should return 4 phases
  SELECT COUNT(*) FROM game_phases WHERE game_id = '<game-id>';
  ```
- [ ] Modify CSV to remove 1 artifact, re-import, verify only 3 artifacts remain

### 16b. FK Violations Check (After Upsert)

- [ ] **Verify no orphaned variants reference deleted artifacts:**
  ```sql
  SELECT v.id, v.artifact_id
  FROM game_artifact_variants v
  LEFT JOIN game_artifacts a ON v.artifact_id = a.id
  WHERE a.id IS NULL;
  -- Should return 0 rows
  ```
- [ ] **Verify no stale role references in variants:**
  ```sql
  SELECT v.id, v.visible_to_role_id
  FROM game_artifact_variants v
  WHERE v.visible_to_role_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM game_roles r WHERE r.id = v.visible_to_role_id);
  -- Should return 0 rows
  ```
- [ ] **Verify cascade delete worked on session data (if applicable):**
  ```sql
  SELECT sa.id, sa.game_artifact_id
  FROM session_artifacts sa
  WHERE sa.game_artifact_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM game_artifacts ga WHERE ga.id = sa.game_artifact_id);
  -- Should return 0 rows (unless orphan protection exists)
  ```

### 17. Role Snapshot After Import

- [ ] Start new session for imported game
- [ ] Click "Kopiera roller från spel" (if applicable)
- [ ] Verify roles appear in session_roles
- [ ] Verify participants can be assigned roles
- [ ] **If roles don't appear:** Check network response for errors

---

## Edge Cases

### 18. Keypad Leading Zero - MUST FAIL

- [ ] Create test CSV with keypad `correctCode` as number: `"correctCode": 451` (no quotes around number)
- [ ] Import and verify **ERROR** (not warning) appears
- [ ] Verify import is **blocked** (not just warned)
- [ ] Error message should include: "Leading zeros kan ha gått förlorade"

### 19. role_private Without Role - MUST FAIL

- [ ] Create test CSV with `visibility: role_private` but no `visible_to_role_*`
- [ ] Import and verify **ERROR** (not warning) appears
- [ ] Verify that specific variant is **not imported**
- [ ] Error message should include: "saknar rollreferens"

### 20. Keypad Without correctCode - MUST FAIL

- [ ] Create test CSV with `artifact_type: keypad` but no `correctCode` in metadata
- [ ] Import and verify **ERROR** appears
- [ ] Verify keypad artifact is **not imported**

---

## Sign-off

| Check | Date | Tester |
|-------|------|--------|
| Pre-Import | | |
| Post-Import | | |
| Runtime | | |
| Regression | | |
| Edge Cases | | |

---

## Notes

- This checklist tests the full CSV import flow for Legendary Play features
- Estimated time: 20-30 minutes for complete verification
- For automated testing, see `tests/` directory (parser unit tests pending)
