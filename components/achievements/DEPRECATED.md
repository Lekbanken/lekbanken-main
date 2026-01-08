# ⚠️ DEPRECATED - Sandbox Badge Builder

**Status:** Deprecated as of 2026-01-08  
**Reason:** Consolidation with production admin builder

## What is this?

This folder contains a **prototype/sandbox** badge builder that was used during early development.
It uses a different architecture (Zustand store, local state) and a different type system
(`types/achievements-builder.ts`) than the production admin builder.

## Production System Location

The canonical, production-grade badge builder is located at:

```
features/admin/achievements/
├── types.ts                    # Canonical type definitions
├── icon-utils.ts              # normalizeIconConfig, getEffectiveColor
├── assets.ts                  # Asset registry
├── editor/                    # Wizard-based editor
│   ├── AchievementEditor.tsx
│   ├── AchievementEditorWizard.tsx
│   └── components/
└── components/                # Library grid/cards
```

## Do NOT Use This For:

- ❌ Any new admin features
- ❌ Production badge creation/editing
- ❌ API integrations
- ❌ Importing types into production code

## Safe to Use For:

- ✅ Standalone sandbox/demo pages (non-production)
- ✅ Visual experimentation
- ✅ Reference during migration

## Migration Path

If you need functionality from this folder:

1. Check if it already exists in `features/admin/achievements/`
2. If not, port the logic to the production system
3. Never import from this folder into `features/admin/` or `app/admin/`

## Files in This Folder

| File | Purpose | Production Equivalent |
|------|---------|----------------------|
| `store.ts` | Zustand local state | N/A (uses prop drilling + useBadgeHistory) |
| `AchievementBuilder.tsx` | Builder UI | `AchievementEditorWizard.tsx` |
| `AchievementPreview.tsx` | Preview | `BadgePreviewEnhanced.tsx` |
| `themes.ts` | Theme data | `features/admin/achievements/data.ts` |
| `ElementSelector.tsx` | Layer pickers | `LayerDropdownSelector.tsx` |

## Removal Timeline

This folder will be removed in a future cleanup sprint once:
1. All sandbox pages are migrated or removed
2. No imports reference this folder
3. QA confirms no regressions

---

*Last updated: 2026-01-08*
