# Golden Example: Legendary Play Complete CSV

> **File:** `example-legendary-play-complete.csv`
> **Version:** 1.0
> **Created:** 2025-12-26

## Purpose

This is the **canonical example CSV** for Legendary Play imports. It demonstrates:

1. ✅ **Keypad artifact** with leading-zero code (`"0451"`)
2. ✅ **Step/phase gating** (`step_index`, `phase_index` on variants)
3. ✅ **Role-private visibility** (`visible_to_role_order: 1`)
4. ✅ **Public artifacts** with different gating points
5. ✅ **Complete Legendary Play structure** (phases, roles, board_config)

## What This Example Contains

### Game: "Escape Room: Det Hemliga Labbet"

A collaborative escape room where participants solve puzzles and crack codes.

### Roles (3)

| Role | Icon | Description |
|------|------|-------------|
| Forskare | 🔬 | Has access to secret documents |
| Ingenjör | 🔧 | Can see technical blueprints |
| Assistent | 📋 | Helps coordinate information |

### Phases (4)

1. **Introduktion** (intro) - 3 min
2. **Sök ledtrådar** (round) - 10 min  
3. **Lås upp kassaskåpet** (round) - 5 min
4. **Avslutning** (finale) - 2 min

### Artifacts (4)

| Artifact | Type | Visibility | Gating |
|----------|------|------------|--------|
| Ledtråd 1 | card | public | step_index: 0, phase_index: 0 |
| Forskarens hemliga dokument | card | role_private (Forskare) | step_index: 1, phase_index: 1 |
| Kassaskåpet | **keypad** | public (after unlock) | step_index: 2, phase_index: 2 |
| Ledtråd 2 | card | public | step_index: 1, phase_index: 1 |

## Keypad Details

```json
{
  "correctCode": "0451",       // ← Leading zero preserved as string!
  "codeLength": 4,
  "maxAttempts": 3,
  "lockOnFail": true,
  "successMessage": "Kassaskåpet öppnas! Ni hittar det hemliga dokumentet!",
  "failMessage": "Fel kod. Försök igen.",
  "lockedMessage": "LARM! Kassaskåpet är nu permanent låst."
}
```

## Security Notes

- **correctCode is NEVER exposed to participants** - validated server-side only
- Keypad state is **session-global** (one unlock affects all participants)
- The atomic RPC `attempt_keypad_unlock` prevents race conditions

## Import Instructions

1. Open Admin → Games → Importera spel
2. Select **CSV** format
3. Upload or paste `example-legendary-play-complete.csv`
4. Enable **Upsert-läge** if you want to update existing
5. Click **Validera**
6. Review warnings (if any) and click **Importera**

## After Import Verification

1. Open the imported game in Game Builder
2. Verify 4 phases exist with correct order
3. Verify 3 roles with private instructions
4. Verify 4 artifacts including keypad
5. Start a session and confirm:
   - Keypad requires code input
   - Role-private artifacts only visible to assigned role
   - Gated artifacts appear at correct step/phase
