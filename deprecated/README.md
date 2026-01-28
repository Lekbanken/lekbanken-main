# Deprecated / Quarantined Code

This folder contains code scheduled for removal.

## Purpose

Before deleting code, we quarantine it here to:
1. Detect unexpected runtime usage via tripwire warnings
2. Allow a review period before permanent deletion
3. Maintain clear documentation of what was deprecated and why

## Rules

1. **All files here MUST call `deprecatedImportWarning()` at import**
2. **If you see warnings in dev** → the code is still used → do NOT delete
3. **After one full dev cycle with no warnings** → safe to delete
4. **All items here MUST have an entry in `/.atlas/annotations.json`**

## File Format

All quarantined files must start with:

```typescript
import { deprecatedImportWarning } from './index';
deprecatedImportWarning('<module-name>');

// Original code below...
```

## Process

1. Move file to `/deprecated/`
2. Add tripwire import at top of file
3. Add annotation to `/.atlas/annotations.json`
4. Wait for approval (human must set `approved_for_deletion: true`)
5. Delete only after approval AND no tripwire warnings observed

## Annotation Schema

```json
{
  "node_id": "original/path/to/file.ts",
  "status": "LEGACY",
  "approved_for_deletion": false,
  "rationale": "Replaced by X in commit abc123",
  "date": "YYYY-MM-DD"
}
```

## Current Quarantined Items

| File | Original Location | Rationale | Status |
|------|-------------------|-----------|--------|
| (none yet) | — | — | — |

---

*Last updated: 2026-01-28*
